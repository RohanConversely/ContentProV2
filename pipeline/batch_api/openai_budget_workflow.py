import argparse
import base64
import hashlib
import json
import os
import traceback
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image


DEFAULT_DRAFT_MODEL = "gpt-image-1-mini"
DEFAULT_FINAL_MODEL = "gpt-image-1-mini"
DEFAULT_ANALYSIS_MODEL = "gpt-4.1-mini"
DEFAULT_SIZE = "1024x1024"
DEFAULT_DRAFT_QUALITY = "low"
DEFAULT_FINAL_QUALITY = "low"
DEFAULT_FINAL_COUNT = 1
DEFAULT_DRAFT_COUNT = 4
SUPPORTED_INPUT_EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Cost-optimized draft-to-final workflow for GPT Image models."
    )
    parser.add_argument("--input", required=True, help="Source product image path.")
    parser.add_argument(
        "--prompt",
        required=True,
        help="Editing prompt used for both draft and final passes.",
    )
    parser.add_argument(
        "--draft-count",
        type=int,
        default=DEFAULT_DRAFT_COUNT,
        help="Number of low-cost draft options to generate.",
    )
    parser.add_argument(
        "--draft-model",
        default=DEFAULT_DRAFT_MODEL,
        help=f"Draft model. Default: {DEFAULT_DRAFT_MODEL}",
    )
    parser.add_argument(
        "--final-model",
        default=DEFAULT_FINAL_MODEL,
        help=f"Final model. Default: {DEFAULT_FINAL_MODEL}",
    )
    parser.add_argument(
        "--draft-quality",
        default=DEFAULT_DRAFT_QUALITY,
        choices=("low", "medium", "high", "auto"),
        help="Draft render quality.",
    )
    parser.add_argument(
        "--final-quality",
        default=DEFAULT_FINAL_QUALITY,
        choices=("low", "medium", "high", "auto"),
        help="Final render quality.",
    )
    parser.add_argument(
        "--final-count",
        type=int,
        default=DEFAULT_FINAL_COUNT,
        help="Number of final images to generate.",
    )
    parser.add_argument(
        "--size",
        default=DEFAULT_SIZE,
        choices=("1024x1024", "1024x1536", "1536x1024", "auto"),
        help="Image output size.",
    )
    parser.add_argument(
        "--selected-draft",
        type=int,
        default=1,
        help="Which draft number to treat as the selected concept in logs.",
    )
    parser.add_argument(
        "--max-long-side",
        type=int,
        default=1024,
        help="Resize source image to this long-side dimension before upload.",
    )
    parser.add_argument(
        "--output-dir",
        default="output/openai_budget",
        help="Directory for processed input, drafts, finals, and logs.",
    )
    return parser.parse_args()


def ensure_supported_input(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Input image not found: {path}")
    if path.suffix.lower() not in SUPPORTED_INPUT_EXTS:
        raise ValueError(f"Unsupported input format: {path.suffix}")


def make_run_dirs(base_dir: Path) -> dict[str, Path]:
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    run_dir = base_dir / timestamp
    dirs = {
        "run": run_dir,
        "processed": run_dir / "processed",
        "drafts": run_dir / "drafts",
        "final": run_dir / "final",
        "logs": run_dir / "logs",
    }
    for path in dirs.values():
        path.mkdir(parents=True, exist_ok=True)
    return dirs


def preprocess_image(input_path: Path, output_path: Path, max_long_side: int) -> Path:
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


def save_b64_image(image_b64: str, destination: Path) -> None:
    destination.write_bytes(base64.b64decode(image_b64))


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")


def log_error(logs_dir: Path, payload: object) -> None:
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    write_json(logs_dir / f"{timestamp}_error.json", payload)


def to_data_url(image_path: Path) -> str:
    mime = "image/png"
    suffix = image_path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        mime = "image/jpeg"
    elif suffix == ".webp":
        mime = "image/webp"
    encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def to_jsonable(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {str(key): to_jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_jsonable(item) for item in value]
    if hasattr(value, "model_dump"):
        return to_jsonable(value.model_dump())
    if hasattr(value, "dict"):
        return to_jsonable(value.dict())
    return str(value)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file_obj:
        for chunk in iter(lambda: file_obj.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_cached_kyc(cache_dir: Path, image_hash: str) -> dict[str, Any] | None:
    cache_path = cache_dir / f"{image_hash}.json"
    if not cache_path.exists():
        return None
    return json.loads(cache_path.read_text(encoding="utf-8"))


def save_cached_kyc(cache_dir: Path, image_hash: str, kyc: dict[str, Any]) -> Path:
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_path = cache_dir / f"{image_hash}.json"
    write_json(cache_path, kyc)
    return cache_path


def extract_json_object(text: str) -> dict[str, Any]:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Model did not return a JSON object.")
    return json.loads(text[start : end + 1])


def build_product_prompt(kyc: dict[str, Any], scene_brief: str | None) -> str:
    material = ", ".join(kyc.get("materials", [])) or "product materials"
    colors = ", ".join(kyc.get("colors", [])) or "original product colors"
    shape = kyc.get("shape_and_structure") or "original product shape and structure"
    pattern = kyc.get("pattern_details") or "original visible pattern details"
    category = kyc.get("product_type") or "product"
    distinguishing = kyc.get("distinguishing_details") or "preserve all visible product details"
    scene = (scene_brief or "Create a clean premium lifestyle scene around the product.").strip()
    return (
        f"{scene} Keep the exact same {category} from the reference image. "
        f"Preserve the exact shape and structure: {shape}. "
        f"Preserve the exact materials: {material}. "
        f"Preserve the exact colors: {colors}. "
        f"Preserve the exact pattern and texture details: {pattern}. "
        f"Preserve these distinguishing details: {distinguishing}. "
        "Do not redesign, recolor, reshape, simplify, add extra products, crop out key product parts, "
        "or alter the visible geometry. Keep the product as the clear hero. "
        "Photorealistic premium ecommerce quality."
    )


def analyze_product_image(
    client: OpenAI,
    *,
    image_path: Path,
    analysis_model: str,
    detail: str = "low",
) -> dict[str, Any]:
    response = client.responses.create(
        model=analysis_model,
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "Analyze this product image and return only valid JSON. "
                            "Extract a compact KYC-style product summary for image generation. "
                            'Use this schema: {"product_type": string, "materials": [string], '
                            '"colors": [string], "shape_and_structure": string, '
                            '"pattern_details": string, "distinguishing_details": string}. '
                            "Be concise, factual, and only describe what is visible."
                        ),
                    },
                    {
                        "type": "input_image",
                        "image_url": to_data_url(image_path),
                        "detail": detail,
                    },
                ],
            }
        ],
    )
    return extract_json_object(response.output_text)


def generate_edit(
    client: OpenAI,
    *,
    model: str,
    image_path: Path,
    prompt: str,
    size: str,
    quality: str,
    n: int = 1,
):
    with image_path.open("rb") as image_file:
        return client.images.edit(
            model=model,
            image=image_file,
            prompt=prompt,
            size=size,
            quality=quality,
            n=n,
        )


def run_budget_workflow(
    *,
    input_path: Path,
    prompt: str | None = None,
    scene_brief: str | None = None,
    draft_count: int = DEFAULT_DRAFT_COUNT,
    draft_model: str = DEFAULT_DRAFT_MODEL,
    final_model: str = DEFAULT_FINAL_MODEL,
    analysis_model: str = DEFAULT_ANALYSIS_MODEL,
    draft_quality: str = DEFAULT_DRAFT_QUALITY,
    final_quality: str = DEFAULT_FINAL_QUALITY,
    final_count: int = DEFAULT_FINAL_COUNT,
    size: str = DEFAULT_SIZE,
    selected_draft: int = 1,
    max_long_side: int = 1024,
    output_dir: str | Path = "output/openai_budget",
    api_key: str | None = None,
) -> dict[str, Any]:
    resolved_api_key = api_key or os.getenv("OPENAI_API_KEY")
    if not resolved_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")

    ensure_supported_input(input_path)

    if draft_count < 1:
        raise ValueError("draft_count must be at least 1.")
    if final_count < 1:
        raise ValueError("final_count must be at least 1.")
    if selected_draft < 1 or selected_draft > draft_count:
        raise ValueError("selected_draft must be between 1 and draft_count.")

    base_dir = Path(output_dir).expanduser()
    dirs = make_run_dirs(base_dir)
    kyc_cache_dir = base_dir / "kyc_cache"
    processed_path = dirs["processed"] / f"{input_path.stem}_1024.png"
    request_log = {
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "backend": "openai_gpt_image",
        "source_image": str(input_path),
        "processed_image": str(processed_path),
        "analysis_model": analysis_model,
        "scene_brief": scene_brief,
        "prompt_override": prompt,
        "draft_model": draft_model,
        "draft_quality": draft_quality,
        "draft_count": draft_count,
        "selected_draft_number": selected_draft,
        "final_model": final_model,
        "final_quality": final_quality,
        "final_count": final_count,
        "size": size,
        "max_long_side": max_long_side,
        "run_dir": str(dirs["run"]),
    }
    write_json(dirs["logs"] / "request.json", request_log)

    try:
        preprocess_image(input_path, processed_path, max_long_side)

        client = OpenAI(api_key=resolved_api_key)
        image_hash = file_sha256(processed_path)
        cached_kyc = load_cached_kyc(kyc_cache_dir, image_hash)
        kyc_cache_path = kyc_cache_dir / f"{image_hash}.json"
        if cached_kyc is not None:
            product_kyc = cached_kyc
            kyc_cache_hit = True
        else:
            product_kyc = analyze_product_image(
                client,
                image_path=processed_path,
                analysis_model=analysis_model,
                detail="low",
            )
            save_cached_kyc(kyc_cache_dir, image_hash, product_kyc)
            kyc_cache_hit = False
        effective_prompt = prompt.strip() if prompt else build_product_prompt(product_kyc, scene_brief)

        draft_paths: list[str] = []
        draft_usage: list[dict[str, object] | None] = []

        draft_response = generate_edit(
            client,
            model=draft_model,
            image_path=processed_path,
            prompt=effective_prompt,
            size=size,
            quality=draft_quality,
            n=draft_count,
        )

        for draft_index, image_data in enumerate(draft_response.data, start=1):
            output_path = dirs["drafts"] / f"draft_{draft_index}.png"
            save_b64_image(image_data.b64_json, output_path)
            draft_paths.append(str(output_path))
        draft_usage.append(to_jsonable(getattr(draft_response, "usage", None)))

        final_response = generate_edit(
            client,
            model=final_model,
            image_path=processed_path,
            prompt=effective_prompt,
            size=size,
            quality=final_quality,
            n=final_count,
        )
        final_paths: list[str] = []
        for final_index, image_data in enumerate(final_response.data, start=1):
            final_path = dirs["final"] / f"final_{final_index}.png"
            save_b64_image(image_data.b64_json, final_path)
            final_paths.append(str(final_path))

        result = {
            "backend": "openai_gpt_image",
            "timestamp_utc": datetime.now(UTC).isoformat(),
            "source_image": str(input_path),
            "processed_image": str(processed_path),
            "analysis_model": analysis_model,
            "product_kyc": product_kyc,
            "kyc_cache_hit": kyc_cache_hit,
            "kyc_cache_path": str(kyc_cache_path),
            "scene_brief": scene_brief,
            "draft_model": draft_model,
            "draft_quality": draft_quality,
            "draft_count": draft_count,
            "drafts": draft_paths,
            "drafts_dir": str(dirs["drafts"]),
            "selected_draft_number": selected_draft,
            "final_model": final_model,
            "final_quality": final_quality,
            "final_count": final_count,
            "final_images": final_paths,
            "final_image": final_paths[0],
            "final_dir": str(dirs["final"]),
            "size": size,
            "prompt": effective_prompt,
            "draft_usage": draft_usage,
            "final_usage": to_jsonable(getattr(final_response, "usage", None)),
            "run_dir": str(dirs["run"]),
            "logs_dir": str(dirs["logs"]),
            "request_log": str(dirs["logs"] / "request.json"),
            "run_log": str(dirs["logs"] / "run.json"),
        }

        write_json(dirs["logs"] / "run.json", result)
        return result
    except Exception as exc:
        error_payload = {
            "timestamp_utc": datetime.now(UTC).isoformat(),
            "backend": "openai_gpt_image",
            "source_image": str(input_path),
            "processed_image": str(processed_path),
            "run_dir": str(dirs["run"]),
            "logs_dir": str(dirs["logs"]),
            "error_type": exc.__class__.__name__,
            "error_message": str(exc),
            "traceback": traceback.format_exc(),
        }
        log_error(dirs["logs"], error_payload)
        raise


def main() -> None:
    load_dotenv()
    args = parse_args()

    input_path = Path(args.input).expanduser().resolve()

    result = run_budget_workflow(
        input_path=input_path,
        prompt=args.prompt,
        draft_count=args.draft_count,
        draft_model=args.draft_model,
        final_model=args.final_model,
        draft_quality=args.draft_quality,
        final_quality=args.final_quality,
        final_count=args.final_count,
        size=args.size,
        selected_draft=args.selected_draft,
        max_long_side=args.max_long_side,
        output_dir=args.output_dir,
    )

    print(f"Processed input: {result['processed_image']}")
    print("Drafts:")
    for draft_path in result["drafts"]:
        print(f"  - {draft_path}")
    print(f"Final: {result['final_image']}")
    print(f"Log: {Path(result['logs_dir']) / 'run.json'}")


if __name__ == "__main__":
    main()
