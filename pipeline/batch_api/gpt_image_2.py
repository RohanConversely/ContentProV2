from __future__ import annotations

import base64
import json
import logging
import os
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.request import urlopen

from dotenv import load_dotenv
import openai
from openai import OpenAI
from PIL import Image

# Set this before running.
REFERENCE_IMAGES_FOLDER = "/home/anhad/edxso/contentpro/spunkies/white_stripe_shirt"

MODEL = "gpt-image-1.5"
SIZE = "1024x1024"
QUALITY = "medium"
OUTPUT_IMAGE_COUNT = 4
COMPLETION_WINDOW = "24h"
POLL_INTERVAL_SECONDS = 15
TIMEOUT_SECONDS = 60 * 60
SDK_TIMEOUT_SECONDS = 900.0
SDK_MAX_RETRIES = 5
NETWORK_MAX_ATTEMPTS = 6
NETWORK_RETRY_BASE_SECONDS = 2
OUTPUT_FILE_GRACE_SECONDS = 90
OUTPUT_FILE_RECHECK_INTERVAL_SECONDS = 5

SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

PROMPT = (
    "You are a professional Amazon A+ content image specialist for India marketplace listings, "
    "specializing in kid's apparel such as ethnic, western, and fusion wear. "
    "Create a photorealistic, premium ecommerce product image of the exact same garment shown in the reference images "
    "with absolute design fidelity. Preserve the exact silhouette, proportions, stitching, seams, embroidery, prints, "
    "fabric texture, color, and detailing without any deviation. "
    "Do not change structure, fit, drape, folds, or garment construction. "
    "Do not alter surface finish such as fabric weave, embellishments, or natural imperfections. "
    "Single product only; NO DUPLICATION, NO COLLAGE, NO GRIDS,no split panel, no contact sheet, no multi-view composite, no text, no watermark, no branding overlays. "
    "Remove dust, unwanted artifacts, and camera imperfections while preserving natural fabric texture and realistic drape. "
    "Maintain accurate color reproduction, sharp focus, controlled lighting, and high-end commercial finish. "
    "Keep the entire product fully visible in frame with all edges, layers, and details clearly defined. "
    "Place the product in a subtle, premium fashion or lifestyle setting that enhances presentation without overpowering the product. "
    "Ensure the styling reflects authentic high-end apparel presentation standards used in ecommerce and catalog photography."
)

SHOT_PROMPTS = [
    "Create a premium front-angle hero composition on a clean studio background. Keep the full garment visible, proportionally accurate, and absolutely faithful to the original shape, fabric, and detailing.",
    "Create a premium lifestyle composition with the garment styled in a realistic setting with elegant props relevant to its use. Keep the product fully visible and strictly unchanged in material, texture, and design.",
    "Create a clear front view shot showing the garment worn or displayed. Ensure fit, proportions, and detailing are exactly faithful to the original product.",
    "Create a natural wearable scene showing the garment on a model or in real use. Keep the product clearly visible, naturally styled, and strictly identical to the reference product.",
]


def _configure_logger(log_file: Path) -> logging.Logger:
    logger = logging.getLogger("gpt_image2_batch")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)

    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    return logger


def _utc_run_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    model_dump = getattr(value, "model_dump", None)
    if callable(model_dump):
        return _json_safe(model_dump())
    return str(value)


def _to_data_url(image_path: Path) -> str:
    suffix = image_path.suffix.lower()
    mime = "image/png"
    if suffix in {".jpg", ".jpeg"}:
        mime = "image/jpeg"
    elif suffix == ".webp":
        mime = "image/webp"

    encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _load_reference_images(folder_path: str) -> list[Path]:
    folder = Path(folder_path).expanduser().resolve()
    if not folder.exists() or not folder.is_dir():
        raise ValueError(f"REFERENCE_IMAGES_FOLDER is invalid: {folder}")

    images = [
        path
        for path in sorted(folder.iterdir())
        if path.is_file() and path.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS
    ]

    if len(images) < 1:
        raise ValueError(f"Expected at least 1 reference image in {folder}, found {len(images)}")

    return images[:1]


def _build_prompt(base_prompt: str, shot_prompts: list[str]) -> str:
    shot_lines = [
        f"Image {index}: {shot.strip()}"
        for index, shot in enumerate(shot_prompts, start=1)
    ]
    ordered_block = "\n".join(shot_lines)
    return (
        f"{base_prompt.strip()}\n\n"
        "Generate exactly 4 images in one request. "
        "Follow the ordered shot mapping strictly."
        "\n"
        "Ordered shot mapping:\n"
        f"{ordered_block}\n\n"
        "Do not mix or merge shots across outputs. "
        "Output Image 1 must follow Image 1 instruction, Image 2 must follow Image 2 instruction, "
        "Image 3 must follow Image 3 instruction, and Image 4 must follow Image 4 instruction."
    )


def _make_request(custom_id: str, prompt: str, reference_images: list[Path]) -> dict[str, Any]:
    input_images = [{"image_url": _to_data_url(path)} for path in reference_images]
    return {
        "custom_id": custom_id,
        "method": "POST",
        "url": "/v1/images/edits",
        "body": {
            "model": MODEL,
            "prompt": prompt,
            "size": SIZE,
            "quality": QUALITY,
            "n": OUTPUT_IMAGE_COUNT,
            "images": input_images,
            "input_fidelity": "high",
        },
    }


def _build_reference_sheet(source_images: list[Path], destination: Path) -> Path:
    if len(source_images) < 3:
        raise ValueError("At least 3 source images are required to build a reference sheet.")

    chosen = source_images[:3]
    with Image.open(chosen[0]) as image_1, Image.open(chosen[1]) as image_2, Image.open(chosen[2]) as image_3:
        frames = [image_1.convert("RGB"), image_2.convert("RGB"), image_3.convert("RGB")]
        thumb_size = (1024, 1024)
        processed_frames: list[Image.Image] = []
        for frame in frames:
            frame.thumbnail(thumb_size, Image.Resampling.LANCZOS)
            canvas = Image.new("RGB", thumb_size, (245, 245, 245))
            offset_x = (thumb_size[0] - frame.width) // 2
            offset_y = (thumb_size[1] - frame.height) // 2
            canvas.paste(frame, (offset_x, offset_y))
            processed_frames.append(canvas)

        gap = 24
        sheet_width = thumb_size[0] * 3 + gap * 2
        sheet_height = thumb_size[1]
        sheet = Image.new("RGB", (sheet_width, sheet_height), (255, 255, 255))
        for index, frame in enumerate(processed_frames):
            x = index * (thumb_size[0] + gap)
            sheet.paste(frame, (x, 0))

        sheet.save(destination, format="PNG")
    return destination


def _write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(_json_safe(payload), indent=2, ensure_ascii=False), encoding="utf-8")


def _write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as file_obj:
        for row in rows:
            file_obj.write(json.dumps(row, ensure_ascii=False) + "\n")


def _call_with_retries(
    operation_name: str,
    logger: logging.Logger,
    fn,
):
    last_error: Exception | None = None
    for attempt in range(1, NETWORK_MAX_ATTEMPTS + 1):
        try:
            return fn()
        except (openai.APITimeoutError, openai.APIConnectionError, openai.RateLimitError) as exc:
            last_error = exc
            if attempt >= NETWORK_MAX_ATTEMPTS:
                break
            sleep_seconds = NETWORK_RETRY_BASE_SECONDS ** (attempt - 1)
            logger.warning(
                "%s failed (attempt %s/%s): %s. Retrying in %ss",
                operation_name,
                attempt,
                NETWORK_MAX_ATTEMPTS,
                exc,
                sleep_seconds,
            )
            time.sleep(sleep_seconds)
        except openai.APIStatusError as exc:
            last_error = exc
            retryable = exc.status_code in {408, 409, 429} or exc.status_code >= 500
            if not retryable or attempt >= NETWORK_MAX_ATTEMPTS:
                break
            sleep_seconds = NETWORK_RETRY_BASE_SECONDS ** (attempt - 1)
            logger.warning(
                "%s returned status %s (attempt %s/%s). Retrying in %ss",
                operation_name,
                exc.status_code,
                attempt,
                NETWORK_MAX_ATTEMPTS,
                sleep_seconds,
            )
            time.sleep(sleep_seconds)

    if last_error is not None:
        raise last_error
    raise RuntimeError(f"{operation_name} failed unexpectedly without error details")


def _parse_output_lines(text: str) -> list[dict[str, Any]]:
    parsed: list[dict[str, Any]] = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        parsed.append(json.loads(line))
    return parsed


def _download_error_file(
    client: OpenAI,
    logger: logging.Logger,
    debug_dir: Path,
    error_file_id: str | None,
    *,
    file_name: str,
) -> Path | None:
    if not error_file_id:
        return None
    logger.info("Downloading error_file_id=%s", error_file_id)
    error_text = _call_with_retries(
        "files.content(error)",
        logger,
        lambda: client.files.content(error_file_id).text,
    )
    error_path = debug_dir / file_name
    error_path.write_text(error_text, encoding="utf-8")
    return error_path


def _save_generated_image(entry: dict[str, Any], output_dir: Path, logger: logging.Logger) -> list[str]:
    saved_paths: list[str] = []
    custom_id = str(entry.get("custom_id") or "unknown")
    response = entry.get("response") if isinstance(entry.get("response"), dict) else {}
    body = response.get("body") if isinstance(response.get("body"), dict) else {}
    data_items = body.get("data") if isinstance(body.get("data"), list) else []

    if not data_items:
        logger.warning("No image data for custom_id=%s", custom_id)
        return saved_paths

    for index, item in enumerate(data_items, start=1):
        if not isinstance(item, dict):
            continue
        b64_json = item.get("b64_json")
        image_url = item.get("url")

        file_name = f"{custom_id}_{index}.png"
        destination = output_dir / file_name

        try:
            if isinstance(b64_json, str) and b64_json:
                destination.write_bytes(base64.b64decode(b64_json))
                saved_paths.append(str(destination))
                continue

            if isinstance(image_url, str) and image_url:
                with urlopen(image_url) as response_obj:
                    destination.write_bytes(response_obj.read())
                saved_paths.append(str(destination))
                continue

            logger.warning("No b64_json/url in data item for custom_id=%s index=%s", custom_id, index)
        except Exception as exc:
            logger.exception("Failed saving image for custom_id=%s index=%s: %s", custom_id, index, exc)

    return saved_paths


def run() -> dict[str, Any]:
    load_dotenv()
    if not REFERENCE_IMAGES_FOLDER.strip():
        raise ValueError("Set REFERENCE_IMAGES_FOLDER at the top of this file before running.")

    if len(SHOT_PROMPTS) != OUTPUT_IMAGE_COUNT:
        raise ValueError(
            f"SHOT_PROMPTS must have exactly {OUTPUT_IMAGE_COUNT} entries; found {len(SHOT_PROMPTS)}"
        )

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")

    script_dir = Path(__file__).resolve().parent
    results_root = script_dir / "gpt_image2_results"
    run_dir = results_root / _utc_run_id()
    inputs_dir = run_dir / "inputs"
    outputs_dir = run_dir / "outputs"
    debug_dir = run_dir / "debug"

    outputs_dir.mkdir(parents=True, exist_ok=True)
    inputs_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    logger = _configure_logger(run_dir / "run.log")
    logger.info("Starting GPT Image 2 batch run.")

    reference_images = _load_reference_images(REFERENCE_IMAGES_FOLDER)
    logger.info("Using first reference image only: %s", [str(path) for path in reference_images])

    prompt_text = _build_prompt(PROMPT, SHOT_PROMPTS)
    requests: list[dict[str, Any]] = [
        _make_request("img-set-1", prompt_text, reference_images)
    ]

    requests_jsonl = inputs_dir / "requests.jsonl"
    _write_jsonl(requests_jsonl, requests)

    preview_rows = []
    for request in requests:
        body = request.get("body", {})
        preview_rows.append(
            {
                "custom_id": request.get("custom_id"),
                "method": request.get("method"),
                "url": request.get("url"),
                "model": body.get("model"),
                "size": body.get("size"),
                "quality": body.get("quality"),
                "n": body.get("n"),
                "images_count": len(body.get("images", [])) if isinstance(body.get("images"), list) else 0,
                "input_fidelity": body.get("input_fidelity"),
                "source_reference_images": [str(path) for path in reference_images],
                "prompt_preview": str(body.get("prompt", ""))[:400],
            }
        )
    _write_json(debug_dir / "request_preview.json", preview_rows)

    client = OpenAI(
        api_key=api_key,
        timeout=SDK_TIMEOUT_SECONDS,
        max_retries=SDK_MAX_RETRIES,
    )

    logger.info("Uploading requests JSONL to Files API.")
    with requests_jsonl.open("rb") as file_obj:
        batch_file = _call_with_retries(
            "files.create(batch)",
            logger,
            lambda: client.files.create(file=file_obj, purpose="batch"),
        )

    _write_json(debug_dir / "uploaded_file.json", batch_file)
    logger.info("Uploaded batch input file_id=%s", batch_file.id)

    logger.info("Creating batch for endpoint /v1/images/edits")
    batch = _call_with_retries(
        "batches.create",
        logger,
        lambda: client.batches.create(
            input_file_id=batch_file.id,
            endpoint="/v1/images/edits",
            completion_window=COMPLETION_WINDOW,
        ),
    )
    _write_json(debug_dir / "batch_created.json", batch)

    batch_id = batch.id
    logger.info("Batch created: id=%s status=%s", batch_id, batch.status)

    started = time.time()
    while True:
        current = _call_with_retries(
            "batches.retrieve",
            logger,
            lambda: client.batches.retrieve(batch_id),
        )
        _write_json(debug_dir / "batch_latest.json", current)
        status = str(current.status)
        logger.info("Batch status: %s", status)

        if status == "completed":
            batch = current
            break
        if status in {"failed", "expired", "cancelled"}:
            batch = current
            _write_json(debug_dir / "batch_failed.json", batch)
            failed_error_file_id = getattr(batch, "error_file_id", None)
            if failed_error_file_id:
                logger.info("Downloading failed-batch error_file_id=%s", failed_error_file_id)
                failed_error_text = _call_with_retries(
                    "files.content(failed_error)",
                    logger,
                    lambda: client.files.content(failed_error_file_id).text,
                )
                failed_error_path = debug_dir / "batch_failed_errors.jsonl"
                failed_error_path.write_text(failed_error_text, encoding="utf-8")
                raise RuntimeError(
                    f"Batch ended with status={status} batch_id={batch_id}. "
                    f"Validation/runtime errors saved at {failed_error_path}"
                )
            raise RuntimeError(
                f"Batch ended with status={status} batch_id={batch_id}. "
                "No error_file_id returned; see debug/batch_failed.json for details."
            )
        if time.time() - started > TIMEOUT_SECONDS:
            raise TimeoutError(f"Timed out waiting for batch completion. batch_id={batch_id}")
        time.sleep(max(5, POLL_INTERVAL_SECONDS))

    output_file_id = getattr(batch, "output_file_id", None)
    error_file_id = getattr(batch, "error_file_id", None)

    if not output_file_id:
        logger.warning(
            "Batch is completed but output_file_id is missing; waiting up to %ss for attachment.",
            OUTPUT_FILE_GRACE_SECONDS,
        )
        wait_started = time.time()
        while time.time() - wait_started < OUTPUT_FILE_GRACE_SECONDS:
            refreshed = _call_with_retries(
                "batches.retrieve(output_file_id_wait)",
                logger,
                lambda: client.batches.retrieve(batch_id),
            )
            batch = refreshed
            _write_json(debug_dir / "batch_latest.json", batch)
            output_file_id = getattr(batch, "output_file_id", None)
            error_file_id = getattr(batch, "error_file_id", None)
            if output_file_id:
                logger.info("output_file_id became available: %s", output_file_id)
                break
            time.sleep(OUTPUT_FILE_RECHECK_INTERVAL_SECONDS)

    if not output_file_id:
        _write_json(debug_dir / "batch_completed_no_output.json", batch)
        completed_error_path = _download_error_file(
            client,
            logger,
            debug_dir,
            error_file_id,
            file_name="batch_completed_no_output_errors.jsonl",
        )
        if completed_error_path is not None:
            raise RuntimeError(
                f"Batch completed but output_file_id is missing. "
                f"Batch errors are saved at {completed_error_path}"
            )
        raise RuntimeError(
            "Batch completed but output_file_id is missing and no error_file_id was returned. "
            "See debug/batch_completed_no_output.json for details."
        )

    logger.info("Downloading output_file_id=%s", output_file_id)
    output_text = _call_with_retries(
        "files.content(output)",
        logger,
        lambda: client.files.content(output_file_id).text,
    )
    output_jsonl_path = debug_dir / "batch_output.jsonl"
    output_jsonl_path.write_text(output_text, encoding="utf-8")
    output_entries = _parse_output_lines(output_text)
    _write_json(debug_dir / "batch_output_parsed.json", output_entries)

    if error_file_id:
        _download_error_file(
            client,
            logger,
            debug_dir,
            error_file_id,
            file_name="batch_errors.jsonl",
        )

    saved_images: list[str] = []
    for entry in output_entries:
        if not isinstance(entry, dict):
            continue
        error = entry.get("error")
        if error:
            logger.error("Request error for custom_id=%s: %s", entry.get("custom_id"), error)
            continue
        saved_images.extend(_save_generated_image(entry, outputs_dir, logger))

    summary = {
        "run_dir": str(run_dir),
        "batch_id": batch_id,
        "input_file_id": batch_file.id,
        "output_file_id": output_file_id,
        "error_file_id": error_file_id,
        "requested_images": OUTPUT_IMAGE_COUNT,
        "saved_images_count": len(saved_images),
        "saved_images": saved_images,
        "references_used": [str(path) for path in reference_images],
        "model": MODEL,
        "endpoint": "/v1/images/edits",
    }
    _write_json(run_dir / "summary.json", summary)
    logger.info("Run completed. saved_images=%s run_dir=%s", len(saved_images), run_dir)
    return summary


if __name__ == "__main__":
    result = run()
    print(json.dumps(result, indent=2, ensure_ascii=False))