#!/usr/bin/env python3
import base64
import os
import random
import time
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

from ...logger import JsonLogger
from .image_rescaler import prepare_reference_images

load_dotenv()

MAX_PROMPT_CHARS = 2560
REVE_ENDPOINT = "https://api.reve.com/v1/image/remix"
REVE_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


def with_context(base: dict[str, Any] | None, extra: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base or {})
    merged.update(extra)
    return merged


def load_prompt(prompt_file: str) -> str:
    direct_path = Path(prompt_file)
    if direct_path.is_absolute() and direct_path.exists():
        return direct_path.read_text(encoding="utf-8").strip()

    prompts_dir = Path(__file__).resolve().parents[2] / "prompts"
    direct = prompts_dir / prompt_file
    if direct.exists():
        return direct.read_text(encoding="utf-8").strip()

    target_lower = prompt_file.lower()
    for prompt_path in prompts_dir.iterdir():
        if prompt_path.is_file() and prompt_path.name.lower() == target_lower:
            return prompt_path.read_text(encoding="utf-8").strip()

    raise FileNotFoundError(f"Prompt file not found: {prompt_file}. Looked in {prompts_dir}.")


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


def _normalize_shot_prompts(raw_value: Any) -> list[dict[str, str]]:
    if not isinstance(raw_value, list):
        return []

    normalized: list[dict[str, str]] = []
    for index, entry in enumerate(raw_value, start=1):
        if not isinstance(entry, dict):
            continue
        key = str(entry.get("key") or f"shot_{index}").strip().lower()
        label = str(entry.get("label") or key.replace("_", " ").title()).strip()
        prompt = str(entry.get("prompt") or "").strip()
        normalized.append({"key": key, "label": label, "prompt": prompt})
    return normalized


def _selected_shot_prompts(shot_prompts: list[dict[str, str]] | None, num_images: int) -> list[dict[str, str]]:
    capped = max(1, num_images)
    normalized = _normalize_shot_prompts(shot_prompts)
    if not normalized:
        return [{"key": f"shot_{index}", "label": f"Shot {index}", "prompt": ""} for index in range(1, capped + 1)]
    selected = normalized[:capped]
    while len(selected) < capped:
        selected.append(selected[-1])
    return selected


def _selected_regeneration_shot_prompts(
    shot_prompts: list[dict[str, str]] | None,
    shot_types: list[str] | None,
    num_images: int,
) -> list[dict[str, str]]:
    normalized = _normalize_shot_prompts(shot_prompts)
    shot_prompt_map = {entry["key"]: entry for entry in normalized}
    normalized_shot_types = [shot.strip().lower() for shot in (shot_types or []) if shot and shot.strip()]
    invalid_shots = [shot for shot in normalized_shot_types if shot not in shot_prompt_map]
    if invalid_shots:
        raise ValueError(f"Invalid shot type(s) for REVE regeneration: {', '.join(invalid_shots)}")
    if len(normalized_shot_types) < 1 or len(normalized_shot_types) > 2:
        raise ValueError("Select at least 1 and at most 2 shot types for REVE regeneration.")

    selected = [shot_prompt_map[normalized_shot_types[0]]]
    if len(normalized_shot_types) == 2:
        selected.append(shot_prompt_map[normalized_shot_types[1]])
    else:
        selected.append(shot_prompt_map[normalized_shot_types[0]])

    capped = max(1, num_images)
    selected = selected[:capped]
    while len(selected) < capped:
        selected.append(selected[-1])
    return selected


def _build_iteration_prompt(base_prompt: str, shot_instruction: str) -> str:
    prompt = f"{base_prompt}\n\n{shot_instruction}".strip() if shot_instruction else base_prompt.strip()
    return prompt[:MAX_PROMPT_CHARS]


def _shot_slug(shot_prompt: dict[str, str], fallback_index: int) -> str:
    key = str(shot_prompt.get("key") or f"shot_{fallback_index}").strip().lower()
    slug = "_".join(key.replace("/", " ").replace("-", " ").split())
    return slug or f"shot_{fallback_index}"


def _retry_delay_seconds(base_seconds: float, attempt: int) -> float:
    exponential = base_seconds * (2 ** max(0, attempt - 1))
    jitter = random.uniform(0, base_seconds)
    return exponential + jitter


def generate_images(
    brand_name: str,
    kyc_path: str,
    image_paths: list[str] | None = None,
    image_path: str | None = None,
    num_images: int = 4,
    temperature: float = 0.1,
    output_dir: str = "generated_images",
    prompt_file: str = "imageGen.txt",
    prompt_text: str | None = None,
    shot_prompts: list[dict[str, str]] | None = None,
    additional_description: str | None = None,
    regeneration_only_inputs: bool = False,
    shot_types: list[str] | None = None,
    logger_obj: JsonLogger | None = None,
    log_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    del temperature
    del kyc_path

    stage_logger = logger_obj or JsonLogger()
    output_path = Path(output_dir).resolve()
    output_path.mkdir(parents=True, exist_ok=True)

    resolved_image_paths = [str(Path(path).resolve()) for path in (image_paths or ([image_path] if image_path else []))]
    if not resolved_image_paths:
        raise ValueError("At least one product image is required for REVE generation.")

    api_key = os.getenv("REVE_API_KEY")
    if not api_key:
        raise ValueError("REVE_API_KEY missing from environment")
    if regeneration_only_inputs and (not additional_description or not additional_description.strip()):
        raise ValueError("additional_description is required for REVE regeneration.")

    base_prompt = prompt_text.strip() if prompt_text else load_prompt(prompt_file)
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
        "Connection": "close",
    }
    max_retries = max(0, int(os.getenv("REVE_REQUEST_MAX_RETRIES", "4")))
    base_backoff = max(0.1, float(os.getenv("REVE_RETRY_BASE_SECONDS", "1.0")))

    if regeneration_only_inputs:
        selected_prompts = _selected_regeneration_shot_prompts(shot_prompts, shot_types, num_images)
    else:
        selected_prompts = _selected_shot_prompts(shot_prompts, num_images)

    generated_files: list[str] = []
    stage_logger.info(
        "Requesting image generation with REVE.",
        with_context(
            log_context,
            {
                "provider": "reve",
                "brand_name": brand_name,
                "num_images_requested": num_images,
                "shot_count": len(selected_prompts),
                "image_paths": resolved_image_paths,
                "prompt_file": prompt_file,
                "output_dir": str(output_path),
                "additional_description": additional_description.strip() if additional_description else None,
                "regeneration_only_inputs": regeneration_only_inputs,
                "shot_types": shot_types or [],
            },
        ),
    )

    for iteration, shot_prompt in enumerate(selected_prompts, start=1):
        shot_instruction = str(shot_prompt.get("prompt") or "").strip()
        shot_slug = _shot_slug(shot_prompt, iteration)
        prompt = _build_iteration_prompt(base_prompt, shot_instruction)
        if additional_description:
            prompt = f"{prompt}\n\nRefinement instructions: {additional_description.strip()}".strip()[:MAX_PROMPT_CHARS]

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
                    "shot": shot_slug,
                    "prompt_length": len(prompt),
                },
            ),
        )

        response_data: dict[str, Any] | None = None
        last_error: Exception | None = None
        for attempt in range(1, max_retries + 2):
            try:
                response = requests.post(REVE_ENDPOINT, headers=headers, json=payload, timeout=(15, 180))
                status_code = response.status_code
                if status_code in REVE_RETRYABLE_STATUS_CODES and attempt <= max_retries:
                    delay = _retry_delay_seconds(base_backoff, attempt)
                    stage_logger.warning(
                        "REVE request got retryable status.",
                        with_context(
                            log_context,
                            {
                                "operation": "reve_image_generation",
                                "image_index": iteration,
                                "shot": shot_slug,
                                "attempt": attempt,
                                "max_retries": max_retries,
                                "status_code": status_code,
                                "retry_after_seconds": round(delay, 2),
                            },
                        ),
                    )
                    time.sleep(delay)
                    continue

                response.raise_for_status()
                try:
                    response_data = response.json()
                except ValueError as exc:
                    if attempt <= max_retries:
                        delay = _retry_delay_seconds(base_backoff, attempt)
                        stage_logger.warning(
                            "REVE returned non-JSON payload, retrying.",
                            with_context(
                                log_context,
                                {
                                    "operation": "reve_image_generation",
                                    "image_index": iteration,
                                    "shot": shot_slug,
                                    "attempt": attempt,
                                    "max_retries": max_retries,
                                    "retry_after_seconds": round(delay, 2),
                                },
                            ),
                        )
                        time.sleep(delay)
                        continue
                    raise RuntimeError(f"REVE returned non-JSON response at image {iteration}") from exc
                break
            except requests.RequestException as exc:
                last_error = exc
                body = ""
                if getattr(exc, "response", None) is not None and exc.response is not None:
                    body = exc.response.text
                if attempt <= max_retries:
                    delay = _retry_delay_seconds(base_backoff, attempt)
                    stage_logger.warning(
                        "REVE request failed with transport/provider error, retrying.",
                        with_context(
                            log_context,
                            {
                                "operation": "reve_image_generation",
                                "image_index": iteration,
                                "shot": shot_slug,
                                "attempt": attempt,
                                "max_retries": max_retries,
                                "error": str(exc),
                                "response_body": body[:500] if body else "",
                                "retry_after_seconds": round(delay, 2),
                            },
                        ),
                    )
                    time.sleep(delay)
                    continue
                raise RuntimeError(f"REVE request failed at image {iteration}: {exc}. Response: {body}") from exc

        if response_data is None:
            raise RuntimeError(f"REVE request failed at image {iteration} after retries: {last_error or 'unknown error'}")

        decoded_images = _extract_base64_images(response_data)
        if not decoded_images or not decoded_images[0]:
            raise RuntimeError(f"REVE response missing image payload at image {iteration}: {response_data}")

        output_file = output_path / f"{brand_name}_reve_{iteration}_{shot_slug}.png"
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
                    "shot": shot_slug,
                    "output_file": str(output_file.resolve()),
                },
            ),
        )

    return {
        "ok": True,
        "generated_images": generated_files,
        "count": len(generated_files),
        "image_paths": resolved_image_paths,
        "kyc_path": None,
        "provider": "reve",
        "additional_description": additional_description.strip() if additional_description else None,
    }
