#!/usr/bin/env python3
import base64
import json
import mimetypes
import os
import tempfile
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image

from ..logger import JsonLogger
from .image_gen_with_KYC import load_prompt, with_context

load_dotenv()

DEFAULT_BATCH_TEXT_MODEL = "gpt-4.1-mini"
DEFAULT_BATCH_IMAGE_MODEL = "gpt-image-1.5"
DEFAULT_BATCH_COMPLETION_WINDOW = "24h"
DEFAULT_BATCH_POLL_INTERVAL_SECONDS = 20
DEFAULT_BATCH_TIMEOUT_SECONDS = 1800
EXTENSION_MIME_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def _preprocess_image(input_path: Path, output_path: Path, max_long_side: int) -> Path:
    with Image.open(input_path) as image:
        image = image.convert("RGBA")
        width, height = image.size
        long_side = max(width, height)
        if long_side > max_long_side:
            scale = max_long_side / long_side
            resized = (
                max(1, int(round(width * scale))),
                max(1, int(round(height * scale))),
            )
            image = image.resize(resized, Image.Resampling.LANCZOS)
        image.save(output_path, format="PNG")
    return output_path


def _build_reference_sheet(
    image_paths: list[Path], output_path: Path, max_long_side: int = 1024
) -> Path:
    """Build a reference sheet collage from multiple input images.

    Layouts:
    - 1 image: single image, resized to fit
    - 2 images: 2x1 horizontal
    - 3 images: 2 rows (3 on top, 1 on bottom)
    - 4 images: 2x2 grid
    - 5 images: 2 rows (3 on top, 2 on bottom)

    Uses thumbnail() to scale down without cropping, preserves aspect ratio.
    """
    if len(image_paths) == 0:
        raise ValueError("No images provided for reference sheet")

    if len(image_paths) == 1:
        _preprocess_image(image_paths[0], output_path, max_long_side)
        return output_path

    processed_images: list[Image.Image] = []
    try:
        for image_path in image_paths:
            temp_path = output_path.parent / f"tmp_{image_path.stem}.png"
            _preprocess_image(image_path, temp_path, max_long_side)
            with Image.open(temp_path) as image:
                processed_images.append(image.convert("RGBA").copy())
            temp_path.unlink(missing_ok=True)

        n = len(processed_images)
        canvas = Image.new("RGBA", (2048, 2048), "white")

        if n == 2:
            slots = [
                (0, 0, 1024, 2048),
                (1024, 0, 2048, 2048),
            ]
        elif n == 3:
            slots = [
                (0, 0, 1366, 1024),
                (1366, 0, 2048, 1024),
                (682, 1024, 1366, 2048),
            ]
        elif n == 4:
            slots = [
                (40, 40, 1320, 2008),
                (1360, 40, 2008, 648),
                (1360, 700, 2008, 1308),
                (1360, 1360, 2008, 1968),
            ]
        elif n == 5:
            slots = [
                (0, 0, 1366, 1024),
                (1366, 0, 2048, 1024),
                (683, 1024, 1366, 2048),
                (1366, 1024, 2048, 2048),
            ]
        else:
            raise ValueError(f"Unsupported image count: {n}. Supported: 1-5 images.")

        for image, slot in zip(processed_images, slots):
            fitted = image.copy()
            slot_w = slot[2] - slot[0]
            slot_h = slot[3] - slot[1]
            fitted.thumbnail((slot_w - 20, slot_h - 20), Image.Resampling.LANCZOS)
            x = slot[0] + (slot_w - fitted.width) // 2
            y = slot[1] + (slot_h - fitted.height) // 2
            canvas.alpha_composite(fitted, (x, y))

        canvas.save(output_path, format="PNG")
        return output_path
    finally:
        for image in processed_images:
            image.close()


def _to_data_url(image_path: Path) -> str:
    mime_type = mimetypes.guess_type(str(image_path))[0]
    if not mime_type or mime_type == "application/octet-stream":
        mime_type = EXTENSION_MIME_MAP.get(image_path.suffix.lower(), "image/png")
    encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


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
        if not prompt:
            continue
        normalized.append({"key": key, "label": label, "prompt": prompt})
    return normalized


def _selected_shot_prompts(
    shot_prompts: list[dict[str, str]] | None, num_images: int
) -> list[dict[str, str]]:
    normalized = _normalize_shot_prompts(shot_prompts)
    if not normalized:
        return []
    selected = normalized[: max(1, num_images)]
    while len(selected) < max(1, num_images):
        selected.append(selected[-1])
    return selected


def _extract_image_results_from_response_body(body: dict[str, Any]) -> list[str]:
    outputs = body.get("output", [])
    if not isinstance(outputs, list):
        return []

    image_results: list[str] = []
    for item in outputs:
        if not isinstance(item, dict):
            continue
        if item.get("type") != "image_generation_call":
            continue
        result = item.get("result")
        if isinstance(result, str) and result:
            image_results.append(result)
        elif isinstance(result, list):
            for entry in result:
                if isinstance(entry, str) and entry:
                    image_results.append(entry)
    return image_results


def _build_request_text(
    *,
    base_prompt: str,
    shot_prompt: dict[str, str] | None,
    additional_description: str | None,
    regeneration_only_inputs: bool,
) -> str:
    if regeneration_only_inputs:
        if not additional_description or not additional_description.strip():
            raise ValueError(
                "additional_description is required for regeneration-only image generation."
            )
        return additional_description.strip()

    request_text = base_prompt
    if shot_prompt:
        request_text += (
            "\n\nUse this shot instruction:\n"
            f"{shot_prompt['label']} - {shot_prompt['prompt']}"
        )
    if additional_description:
        request_text += (
            "\n\nRefinement instructions for this regeneration:\n"
            f"{additional_description.strip()}"
        )
    return request_text


def generate_images(
    brand_name: str,
    kyc_path: str,
    image_paths: list[str] | None = None,
    image_path: str | None = None,
    num_images: int = 4,
    temperature: float = 0.1,
    output_dir: str = "generated_images",
    prompt_file: str = "ImageWithKYCTesting.txt",
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
    del shot_types

    stage_logger = logger_obj or JsonLogger()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY not found in environment. Please set it in .env file."
        )

    client = OpenAI(api_key=api_key)

    output_path = Path(output_dir).resolve()
    output_path.mkdir(parents=True, exist_ok=True)

    resolved_image_paths = [
        str(Path(path).resolve())
        for path in (image_paths or ([image_path] if image_path else []))
    ]
    if not resolved_image_paths:
        raise ValueError(
            "At least one product image is required for batch image generation."
        )

    text_model = os.getenv("OPENAI_BATCH_TEXT_MODEL", DEFAULT_BATCH_TEXT_MODEL)
    image_model = os.getenv("OPENAI_BATCH_IMAGE_MODEL", DEFAULT_BATCH_IMAGE_MODEL)
    image_size = os.getenv("OPENAI_BATCH_IMAGE_SIZE", "1024x1024")
    image_quality = os.getenv("OPENAI_BATCH_IMAGE_QUALITY", "low")
    input_fidelity = os.getenv("OPENAI_BATCH_INPUT_FIDELITY", "high")
    completion_window = os.getenv(
        "OPENAI_BATCH_COMPLETION_WINDOW", DEFAULT_BATCH_COMPLETION_WINDOW
    )
    poll_interval_seconds = int(
        os.getenv(
            "OPENAI_BATCH_POLL_INTERVAL_SECONDS",
            str(DEFAULT_BATCH_POLL_INTERVAL_SECONDS),
        )
    )
    timeout_seconds = int(
        os.getenv("OPENAI_BATCH_TIMEOUT_SECONDS", str(DEFAULT_BATCH_TIMEOUT_SECONDS))
    )

    base_prompt_template = (
        prompt_text.strip() if prompt_text else load_prompt(prompt_file)
    )
    base_prompt = (
        "Generate A+ content images based on the attached product image and the instructions below.\n"
        f"Brand Name: {brand_name}\n\n"
        f"{base_prompt_template}"
    )
    selected_shots = _selected_shot_prompts(shot_prompts, num_images)

    reference_image_urls = [_to_data_url(Path(path)) for path in resolved_image_paths[:5]]

    requests: list[dict[str, Any]] = []
    for index in range(1, max(1, num_images) + 1):
        shot_prompt = selected_shots[index - 1] if selected_shots else None
        request_text = _build_request_text(
            base_prompt=base_prompt,
            shot_prompt=shot_prompt,
            additional_description=additional_description,
            regeneration_only_inputs=regeneration_only_inputs,
        )
        content_items: list[dict[str, Any]] = [
            {"type": "input_text", "text": request_text}
        ]
        for reference_image_url in reference_image_urls:
            content_items.append(
                {
                    "type": "input_image",
                    "image_url": reference_image_url,
                    "detail": "low",
                }
            )

        requests.append(
            {
                "custom_id": f"image_{index}",
                "method": "POST",
                "url": "/v1/responses",
                "body": {
                    "model": text_model,
                    "tool_choice": {"type": "image_generation"},
                    "input": [{"role": "user", "content": content_items}],
                    "tools": [
                        {
                            "type": "image_generation",
                            "model": image_model,
                            "size": image_size,
                            "quality": image_quality,
                            "input_fidelity": input_fidelity,
                        }
                    ],
                },
            }
        )

    stage_logger.info(
        "Submitting OpenAI Batch image generation job.",
        with_context(
            log_context,
            {
                "provider": "openai_batch",
                "text_model": text_model,
                "image_model": image_model,
                "image_size": image_size,
                "image_quality": image_quality,
                "input_fidelity": input_fidelity,
                "num_requests": len(requests),
                "completion_window": completion_window,
                "image_paths": resolved_image_paths,
            },
        ),
    )

    with tempfile.TemporaryDirectory(prefix="openai_batch_") as temp_dir:
        requests_path = Path(temp_dir) / "requests.jsonl"
        with requests_path.open("w", encoding="utf-8") as f:
            for request in requests:
                f.write(json.dumps(request, ensure_ascii=True) + "\n")

        with requests_path.open("rb") as file_obj:
            batch_file = client.files.create(file=file_obj, purpose="batch")

        batch = client.batches.create(
            input_file_id=batch_file.id,
            endpoint="/v1/responses",
            completion_window=completion_window,
        )

        start_time = time.time()
        while True:
            current = client.batches.retrieve(batch.id)
            status = str(current.status)
            if status == "completed":
                batch = current
                break
            if status in {"failed", "expired", "cancelled"}:
                raise RuntimeError(
                    f"OpenAI batch failed with status={status} (batch_id={current.id})"
                )
            if time.time() - start_time > timeout_seconds:
                raise RuntimeError(
                    f"OpenAI batch timed out after {timeout_seconds}s (batch_id={current.id}, status={status})"
                )
            time.sleep(max(5, poll_interval_seconds))

        output_file_id = getattr(batch, "output_file_id", None)
        if not output_file_id:
            raise RuntimeError(
                f"OpenAI batch completed without output_file_id (batch_id={batch.id})"
            )

        file_content = client.files.content(output_file_id)
        if hasattr(file_content, "text"):
            text_attr = getattr(file_content, "text")
            if callable(text_attr):
                jsonl_text = text_attr()
            else:
                jsonl_text = str(text_attr)
        elif hasattr(file_content, "read"):
            raw = file_content.read()
            jsonl_text = raw.decode("utf-8") if isinstance(raw, bytes) else str(raw)
        else:
            jsonl_text = str(file_content)

    input_image_name = Path(resolved_image_paths[0]).stem
    generated_files: list[str] = []
    for line in jsonl_text.splitlines():
        line = line.strip()
        if not line:
            continue
        row = json.loads(line)
        response_block = row.get("response", {})
        if not isinstance(response_block, dict):
            continue
        body = response_block.get("body", {})
        if not isinstance(body, dict):
            continue

        for image_b64 in _extract_image_results_from_response_body(body):
            output_index = len(generated_files) + 1
            output_filename = f"{brand_name}_{input_image_name}_{output_index}.png"
            output_filepath = output_path / output_filename
            output_filepath.write_bytes(base64.b64decode(image_b64))
            generated_files.append(str(output_filepath.resolve()))

    if not generated_files:
        raise ValueError("OpenAI Batch image generation returned no images.")

    stage_logger.info(
        "OpenAI Batch image generation completed.",
        with_context(
            log_context,
            {
                "provider": "openai_batch",
                "generated_count": len(generated_files),
                "batch_id": getattr(batch, "id", None),
            },
        ),
    )

    return {
        "ok": True,
        "generated_images": generated_files,
        "count": len(generated_files),
        "image_paths": resolved_image_paths,
        "kyc_path": None,
        "batch_id": getattr(batch, "id", None),
        "additional_description": additional_description.strip()
        if additional_description
        else None,
    }
