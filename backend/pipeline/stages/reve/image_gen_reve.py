#!/usr/bin/env python3
import base64
import os
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

from ...logger import JsonLogger
from .image_rescaler import prepare_reference_images
from .kyc_compressor import build_compressed_kyc

load_dotenv()

MAX_PROMPT_CHARS = 2560
REVE_ENDPOINT = "https://api.reve.com/v1/image/remix"

SHOT_REQUIREMENTS = (
    "Shot 1 - HERO: clean studio hero shot, premium balanced lighting, product centered, pure ecommerce clarity.",
    "Shot 2 - LIFESTYLE: modern Indian lifestyle setting, natural context, believable usage styling, product remains unchanged.",
    "Shot 3 - STORY: emotional storytelling moment in an Indian urban scenario, confidence and elegance, realistic human context.",
    "Shot 4 - ZOOM DETAIL: macro close-up of craftsmanship, chain texture, stone/pearl shine, crisp fine-detail rendering.",
    "Shot 5 - AMAZON READY: clear enhanced premium studio view optimized for listing quality with clean minimal background.",
    "Shot 6 - CLOSE DETAIL: alternate tight close-up angle showing finishing, materials, and reflections without design change.",
)


def with_context(base: dict[str, Any] | None, extra: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base or {})
    merged.update(extra)
    return merged


def load_prompt(prompt_file: str) -> str:
    prompts_dir = Path(__file__).resolve().parents[2] / "prompts"
    direct = prompts_dir / prompt_file
    if direct.exists():
        return direct.read_text(encoding="utf-8").strip()

    target_lower = prompt_file.lower()
    for prompt_path in prompts_dir.iterdir():
        if prompt_path.is_file() and prompt_path.name.lower() == target_lower:
            return prompt_path.read_text(encoding="utf-8").strip()

    raise FileNotFoundError(
        f"Prompt file not found: {prompt_file}. Looked in {prompts_dir}."
    )


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

    decoded_images: list[str] = []
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


def _build_iteration_prompt(base_prompt: str, kyc_summary: str, shot_instruction: str) -> str:
    prompt = (
        f"{base_prompt}\n\n"
        f"Product KYC Summary (strict guidance): {kyc_summary}\n\n"
        f"{shot_instruction}"
    ).strip()
    return prompt[:MAX_PROMPT_CHARS]


def _shot_instructions_for_count(num_images: int) -> list[str]:
    capped = max(1, num_images)
    if capped <= len(SHOT_REQUIREMENTS):
        return list(SHOT_REQUIREMENTS[:capped])

    repeated: list[str] = []
    while len(repeated) < capped:
        repeated.extend(SHOT_REQUIREMENTS)
    return repeated[:capped]


def generate_images(
    brand_name: str,
    kyc_path: str,
    image_paths: list[str] | None = None,
    image_path: str | None = None,
    num_images: int = 6,
    temperature: float = 0.1,
    output_dir: str = "generated_images",
    prompt_file: str = "imageGen.txt",
    additional_description: str | None = None,
    logger_obj: JsonLogger | None = None,
    log_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    del temperature

    stage_logger = logger_obj or JsonLogger()
    output_path = Path(output_dir).resolve()
    output_path.mkdir(parents=True, exist_ok=True)

    resolved_image_paths = [str(Path(path).resolve()) for path in (image_paths or ([image_path] if image_path else []))]
    if not resolved_image_paths:
        raise ValueError("At least one product image is required for REVE generation.")

    resolved_kyc_path = Path(kyc_path).resolve()
    if not resolved_kyc_path.exists():
        raise ValueError(f"KYC JSON file not found: {resolved_kyc_path}")

    api_key = os.getenv("REVE_API_KEY")
    if not api_key:
        raise ValueError("REVE_API_KEY missing from environment")

    base_prompt = load_prompt(prompt_file)
    compressed_kyc_file = output_path / "compressed_kyc.json"
    kyc_summary = build_compressed_kyc(
        resolved_kyc_path,
        compressed_kyc_file,
        stage_logger,
        min_chars=400,
        max_chars=600,
        log_context=log_context,
    )
    if not kyc_summary:
        raise ValueError("Failed to build compressed KYC summary for REVE.")

    encoded_images = prepare_reference_images(
        resolved_image_paths,
        stage_logger,
        max_images=6,
        log_context=log_context,
    )
    if not encoded_images:
        raise ValueError("No valid reference images could be prepared for REVE.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    shot_instructions = _shot_instructions_for_count(num_images)
    generated_files: list[str] = []

    stage_logger.info(
        "Requesting image generation with REVE.",
        with_context(
            log_context,
            {
                "provider": "reve",
                "brand_name": brand_name,
                "num_images_requested": num_images,
                "shot_count": len(shot_instructions),
                "image_paths": resolved_image_paths,
                "kyc_path": str(resolved_kyc_path),
                "prompt_file": prompt_file,
                "output_dir": str(output_path),
                "additional_description": additional_description.strip() if additional_description else None,
            },
        ),
    )

    for iteration, shot_instruction in enumerate(shot_instructions, start=1):
        prompt = _build_iteration_prompt(base_prompt, kyc_summary, shot_instruction)
        if additional_description:
            merged = f"{prompt}\n\nRefinement instructions: {additional_description.strip()}"
            prompt = merged[:MAX_PROMPT_CHARS]

        payload = {
            "prompt": prompt,
            "reference_images": encoded_images,
            "aspect_ratio": "1:1",
            "version": "latest",
        }

        stage_logger.info(
            "REVE request submitted.",
            with_context(
                log_context,
                {
                    "operation": "reve_image_generation",
                    "image_index": iteration,
                    "prompt_length": len(prompt),
                },
            ),
        )

        try:
            response = requests.post(REVE_ENDPOINT, headers=headers, json=payload, timeout=120)
            response.raise_for_status()
        except requests.RequestException as exc:
            body = ""
            if getattr(exc, "response", None) is not None and exc.response is not None:
                body = exc.response.text
            raise RuntimeError(f"REVE request failed at image {iteration}: {exc}. Response: {body}") from exc

        try:
            response_data = response.json()
        except ValueError as exc:
            raise RuntimeError(f"REVE returned non-JSON response at image {iteration}") from exc

        decoded_images = _extract_base64_images(response_data)
        if not decoded_images or not decoded_images[0]:
            raise RuntimeError(f"REVE response missing image payload at image {iteration}: {response_data}")

        output_file = output_path / f"{brand_name}_reve_{iteration}.png"
        output_file.write_bytes(base64.b64decode(decoded_images[0]))
        generated_files.append(str(output_file.resolve()))

        stage_logger.info(
            "Image generated.",
            with_context(
                log_context,
                {
                    "provider": "reve",
                    "operation": "reve_image_generation",
                    "image_index": iteration,
                    "output_file": str(output_file.resolve()),
                },
            ),
        )

    return {
        "ok": True,
        "generated_images": generated_files,
        "count": len(generated_files),
        "image_paths": resolved_image_paths,
        "kyc_path": str(resolved_kyc_path),
        "provider": "reve",
        "additional_description": additional_description.strip() if additional_description else None,
    }
