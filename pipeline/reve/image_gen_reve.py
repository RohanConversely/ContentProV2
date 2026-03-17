#!/usr/bin/env python3
import base64
import logging
import os
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

from image_rescaler import prepare_reference_images
from kyc_compressor import build_compressed_kyc

load_dotenv()


MAX_PROMPT_CHARS = 2560

SHOT_REQUIREMENTS = {
    1: "Shot 1 - HERO: clean studio hero shot, premium balanced lighting, product centered, pure ecommerce clarity.",
    2: "Shot 2 - LIFESTYLE: modern Indian lifestyle setting, natural context, believable usage styling, product remains unchanged.",
    3: "Shot 3 - STORY: emotional storytelling moment in an Indian urban scenario, confidence and elegance, realistic human context.",
    4: "Shot 4 - ZOOM DETAIL: macro close-up of craftsmanship, chain texture, stone/pearl shine, crisp fine-detail rendering.",
    5: "Shot 5 - AMAZON READY: clear enhanced premium studio view optimized for listing quality with clean minimal background.",
    6: "Shot 6 - CLOSE DETAIL: alternate tight close-up angle showing finishing, materials, and reflections without design change.",
}


def _setup_logger(pipeline_dir: Path) -> logging.Logger:
    storage_dir = pipeline_dir / "storage"
    storage_dir.mkdir(parents=True, exist_ok=True)

    log_file = storage_dir / f"reve_generation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    logger = logging.getLogger("reve_generation")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    console_handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    logger.propagate = False
    logger.info("Logging initialized. Log file: %s", log_file.resolve())
    return logger


def _extract_base64_images(response_data: dict) -> list[str]:
    raw_results = (
        response_data.get("result")
        or response_data.get("results")
        or response_data.get("data")
        or response_data
    )

    if isinstance(raw_results, dict):
        raw_results = [raw_results]
    elif not isinstance(raw_results, list):
        raw_results = []

    decoded_images = []
    for entry in raw_results:
        if isinstance(entry, (str, bytes)):
            decoded_images.append(entry.decode("utf-8") if isinstance(entry, bytes) else entry)
            continue

        if not isinstance(entry, dict):
            continue

        image_base64 = (
            entry.get("image")
            or entry.get("image_base64")
            or entry.get("b64_json")
            or entry.get("base64")
        )
        if image_base64:
            decoded_images.append(image_base64)

    return decoded_images


def _build_iteration_prompt(base_prompt: str, kyc_summary: str, shot_instruction: str, logger: logging.Logger) -> str:
    prompt = (
        f"{base_prompt}\n\n"
        f"Product KYC Summary (strict guidance): {kyc_summary}\n\n"
        f"{shot_instruction}"
    ).strip()

    if len(prompt) > MAX_PROMPT_CHARS:
        logger.warning(
            "Composed prompt exceeded %d chars (%d). Truncating.",
            MAX_PROMPT_CHARS,
            len(prompt),
        )
        prompt = prompt[:MAX_PROMPT_CHARS]

    return prompt


def run_reve_generation() -> None:
    pipeline_dir = Path(__file__).parent
    logger = _setup_logger(pipeline_dir)

    prompt_file = pipeline_dir / "imageGen.txt"
    kyc_file = next(iter(sorted(pipeline_dir.glob("*_kyc.json"))), None)
    image_folder = pipeline_dir / "Raw_images"
    output_dir = pipeline_dir / "generated_images_reve"
    compressed_kyc_file = pipeline_dir / "storage" / "compressed_kyc.json"
    output_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Output directory: %s", output_dir.resolve())

    if not prompt_file.exists():
        logger.error("Prompt file not found at %s", prompt_file)
        return

    logger.info("Reading prompt from %s", prompt_file)
    with prompt_file.open("r", encoding="utf-8") as f:
        base_prompt = f.read().strip()
    logger.info("Base prompt loaded (%d characters)", len(base_prompt))

    if kyc_file is None:
        logger.error("No KYC json file found in %s", pipeline_dir)
        return
    logger.info("Using KYC file: %s", kyc_file)

    kyc_summary = build_compressed_kyc(kyc_file, compressed_kyc_file, logger, min_chars=400, max_chars=600)
    if not kyc_summary:
        logger.error("Failed to build compressed KYC summary")
        return

    if not (400 <= len(kyc_summary) <= 600):
        logger.warning("Compressed KYC summary length is %d; target is 400-600", len(kyc_summary))

    encoded_images = prepare_reference_images(image_folder, logger, max_images=6)
    if not encoded_images:
        logger.error("No valid reference images could be prepared")
        return

    api_key = os.getenv("REVE_API_KEY")
    if not api_key:
        logger.error("REVE_API_KEY missing from environment")
        return

    url = "https://api.reve.com/v1/image/remix"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    logger.info("Starting generation loop for %d iterations", len(SHOT_REQUIREMENTS))

    for iteration, shot_instruction in SHOT_REQUIREMENTS.items():
        full_prompt = _build_iteration_prompt(base_prompt, kyc_summary, shot_instruction, logger)
        logger.info("Iteration %d prompt length: %d", iteration, len(full_prompt))

        payload = {
            "prompt": full_prompt,
            "reference_images": encoded_images,
            "aspect_ratio": "1:1",
            "version": "latest",
            "postprocessing": [{ "process": "upscale", "upscale_factor": 2 }],
        }
        logger.info("Iteration %d/%d: Sending request to REVE", iteration, len(SHOT_REQUIREMENTS))

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=120)
            response.raise_for_status()
        except requests.RequestException as exc:
            body = ""
            if getattr(exc, "response", None) is not None:
                body = exc.response.text
            logger.error("Iteration %d failed: %s", iteration, exc)
            if body:
                logger.error("Iteration %d response body: %s", iteration, body)
            continue

        try:
            response_data = response.json()
        except ValueError:
            logger.error("Iteration %d: Response did not contain valid JSON", iteration)
            continue

        decoded_images = _extract_base64_images(response_data)
        if not decoded_images:
            logger.error("Iteration %d: No image data found in response", iteration)
            logger.error("Iteration %d response payload: %s", iteration, response_data)
            continue

        first_image = decoded_images[0]
        if not first_image:
            logger.error("Iteration %d: Empty image payload", iteration)
            continue

        try:
            output_path = output_dir / f"reve_output_{iteration}.png"
            output_path.write_bytes(base64.b64decode(first_image))
            logger.info("Iteration %d: Saved %s", iteration, output_path.resolve())
        except Exception as exc:  # pylint: disable=broad-exception-caught
            logger.error("Iteration %d: Failed to save image: %s", iteration, exc)

    logger.info("Generation run completed")


if __name__ == "__main__":
    run_reve_generation()
