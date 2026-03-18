#!/usr/bin/env python3
import base64
import json
import os
import time
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

from ..logger import JsonLogger

load_dotenv()

BFL_BASE_URL = "https://api.bfl.ai/v1"


def load_prompt(prompt_file: str) -> str:
    prompts_dir = Path(__file__).parent.parent / "prompts"
    prompt_path = prompts_dir / prompt_file
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


def with_context(base: dict[str, Any] | None, extra: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base or {})
    merged.update(extra)
    return merged


def current_mode_config() -> dict[str, object]:
    return {
        "model": os.getenv("BFL_MODEL", "flux-2-pro"),
        "size": os.getenv("FLUX_OUTPUT_SIZE", "1024x1024"),
        "prompt_upsampling": os.getenv("BFL_PROMPT_UPSAMPLING", "false").strip().lower()
        in {"1", "true", "yes", "on"},
    }


def headers() -> dict[str, str]:
    api_key = os.getenv("BFL_API_KEY")
    if not api_key:
        raise ValueError("BFL_API_KEY not found in environment. Please set it in .env file.")
    return {
        "accept": "application/json",
        "x-key": api_key,
    }


def poll_result(polling_url: str) -> dict[str, Any]:
    started_at = time.time()
    while True:
        response = requests.get(polling_url, headers=headers(), timeout=120)
        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            raise RuntimeError(
                f"BFL polling failed with status {response.status_code}: {response.text}"
            ) from exc
        payload = response.json()
        status = payload.get("status")
        if status in {"Ready", "Error", "Failed"}:
            return payload
        if time.time() - started_at > 900:
            raise TimeoutError("Timed out waiting for BFL generation result.")
        time.sleep(3)


def submit_edit_request(
    *,
    prompt: str,
    reference_images: list[str],
    mode_config: dict[str, object],
) -> tuple[dict[str, Any], dict[str, Any]]:
    width_str, height_str = str(mode_config["size"]).lower().split("x", maxsplit=1)
    request_payload = {
        "prompt": prompt,
        "model": mode_config["model"],
        "width": int(width_str),
        "height": int(height_str),
        "prompt_upsampling": mode_config["prompt_upsampling"],
        "reference_count": len(reference_images),
        "output_format": "png",
    }

    json_payload: dict[str, Any] = {
        "prompt": prompt,
        "width": int(width_str),
        "height": int(height_str),
        "prompt_upsampling": bool(mode_config["prompt_upsampling"]),
        "output_format": "png",
    }

    for index, path in enumerate(reference_images, start=1):
        encoded = base64.b64encode(Path(path).read_bytes()).decode("ascii")
        key = "input_image" if index == 1 else f"input_image_{index}"
        json_payload[key] = encoded

    response = requests.post(
        f"{BFL_BASE_URL}/{mode_config['model']}",
        headers={**headers(), "Content-Type": "application/json"},
        json=json_payload,
        timeout=120,
    )
    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        raise RuntimeError(
            f"BFL submit failed with status {response.status_code}: {response.text}"
        ) from exc

    return response.json(), request_payload


def download_result_image(url: str) -> bytes:
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    return response.content


def generate_images(
    brand_name: str,
    kyc_path: str,
    image_paths: list[str] | None = None,
    image_path: str | None = None,
    num_images: int = 6,
    temperature: float = 0.1,
    output_dir: str = "generated_images",
    prompt_file: str = "ImageWithKYCTesting.txt",
    additional_description: str | None = None,
    regeneration_only_inputs: bool = False,
    logger_obj: JsonLogger | None = None,
    log_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    del regeneration_only_inputs
    stage_logger = logger_obj or JsonLogger()
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    resolved_image_paths = [str(Path(path).resolve()) for path in (image_paths or ([image_path] if image_path else []))]
    if not resolved_image_paths:
        raise ValueError("At least one product image is required for image generation.")
    if len(resolved_image_paths) > 4:
        raise ValueError("Flux supports at most 4 reference images.")
    if not kyc_path or not Path(kyc_path).exists():
        raise ValueError(f"KYC JSON file not found: {kyc_path}")

    prompt_template = load_prompt(prompt_file)
    kyc_data = json.loads(Path(kyc_path).read_text(encoding="utf-8"))
    kyc_text = json.dumps(kyc_data, indent=2)

    user_message = (
        "Generate A+ content images based on the attached product images, the attached KYC JSON file, and the instructions below.\n"
        f"Brand Name: {brand_name}\n\n"
        f"{prompt_template}\n\n"
        "### PRODUCT KYC DATA (STRICT REFERENCE):\n"
        f"{kyc_text}"
    )
    if additional_description:
        user_message += (
            "\n\nRefinement instructions for this regeneration:\n"
            f"{additional_description.strip()}"
        )

    mode_config = current_mode_config()
    stage_logger.info(
        "Requesting image generation with KYC.",
        with_context(
            log_context,
            {
                "model": mode_config["model"],
                "image_paths": resolved_image_paths,
                "brand_name": brand_name,
                "kyc_path": str(Path(kyc_path).resolve()),
                "num_images": num_images,
                "temperature": temperature,
                "output_dir": str(output_path.resolve()),
                "prompt_file": prompt_file,
                "additional_description": additional_description.strip() if additional_description else None,
                "provider": "bfl_flux",
            },
        ),
    )

    base_name = Path(resolved_image_paths[0]).stem
    generated_files: list[str] = []
    total_cost = 0.0

    for output_index in range(1, num_images + 1):
        submit_payload, request_payload = submit_edit_request(
            prompt=user_message,
            reference_images=resolved_image_paths,
            mode_config=mode_config,
        )
        polling_url = submit_payload.get("polling_url")
        if not polling_url:
            raise RuntimeError(f"BFL response did not include polling_url: {submit_payload}")
        total_cost += float(submit_payload.get("cost", 0.0) or 0.0)

        stage_logger.info(
            "Flux request submitted.",
            with_context(
                log_context,
                {
                    "operation": "flux_image_generation",
                    "request_payload": {
                        "model": request_payload.get("model"),
                        "width": request_payload.get("width"),
                        "height": request_payload.get("height"),
                        "prompt_upsampling": request_payload.get("prompt_upsampling"),
                        "reference_count": request_payload.get("reference_count"),
                        "output_format": request_payload.get("output_format"),
                    },
                    "submit_response": {
                        "id": submit_payload.get("id"),
                        "polling_url": submit_payload.get("polling_url"),
                        "status": submit_payload.get("status"),
                        "cost": submit_payload.get("cost"),
                    },
                    "image_index": output_index,
                },
            ),
        )

        result_payload = poll_result(str(polling_url))
        if result_payload.get("status") != "Ready":
            raise RuntimeError(f"BFL generation failed: {result_payload}")
        sample_url = result_payload.get("result", {}).get("sample")
        if not sample_url:
            raise RuntimeError(f"BFL result did not include sample URL: {result_payload}")

        image_data = download_result_image(str(sample_url))
        output_filename = f"{brand_name}_{base_name}_{output_index}.png"
        output_filepath = output_path / output_filename
        with open(output_filepath, "wb") as f:
            f.write(image_data)
        abs_output_file = str(output_filepath.resolve())
        generated_files.append(abs_output_file)

        stage_logger.info(
            "Flux usage",
            with_context(
                log_context,
                {
                    "operation": "flux_image_generation",
                    "model": mode_config["model"],
                    "cost_usd": float(submit_payload.get("cost", 0.0) or 0.0),
                    "image_index": output_index,
                },
            ),
        )
        stage_logger.info(
            "Image generated.",
            with_context(log_context, {"output_file": abs_output_file}),
        )

    if not generated_files:
        raise ValueError("Image generation returned no images.")

    return {
        "ok": True,
        "generated_images": generated_files,
        "count": len(generated_files),
        "image_paths": resolved_image_paths,
        "kyc_path": str(Path(kyc_path).resolve()),
        "additional_description": additional_description.strip() if additional_description else None,
        "provider": "bfl_flux",
        "stage_2_cost_usd": round(total_cost, 6),
    }
