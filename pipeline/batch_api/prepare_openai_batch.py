import argparse
import base64
import csv
import hashlib
import json
import math
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image


DEFAULT_BATCH_MODEL = "gpt-4.1-mini"
DEFAULT_IMAGE_MODEL = "gpt-image-1.5"
DEFAULT_ANALYSIS_MODEL = "gpt-4.1-mini"
DEFAULT_SIZE = "1024x1024"
DEFAULT_QUALITY = "low"
DEFAULT_IMAGE_COUNT = 1
DEFAULT_MAX_LONG_SIDE = 1024
MAX_REFERENCE_IMAGES = 4
SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
PRICING_BASIS_DATE = "2026-04-05"
BATCH_DISCOUNT_FACTOR = 0.5

TEXT_TOKEN_PRICING_PER_MILLION = {
    "gpt-4.1-mini": {
        "input": 0.80,
        "cached_input": 0.20,
        "output": 3.20,
    },
}

IMAGE_GENERATION_PRICING_PER_IMAGE = {
    "gpt-image-1.5": {
        "low": {
            "1024x1024": 0.009,
            "1024x1536": 0.013,
            "1536x1024": 0.013,
        },
        "medium": {
            "1024x1024": 0.034,
            "1024x1536": 0.050,
            "1536x1024": 0.050,
        },
        "high": {
            "1024x1024": 0.133,
            "1024x1536": 0.200,
            "1536x1024": 0.200,
        },
    },
}

BASE_PRODUCT_PROMPT = """
Photorealistic premium Amazon A+ lifestyle image of a single product.

PRIMARY REQUIREMENT: Full product must be completely visible with margin. Any cropped output is invalid.

INPUT IMAGE = STRICT GEOMETRY + TEXTURE SOURCE

--- CRITICAL DESIGN FIDELITY (ABSOLUTE) ---
- Reconstruct the product EXACTLY from the reference image before rendering
- Preserve exact silhouette, proportions, and dimensions
- Maintain precise edge shape, border stitching, and contour (including subtle irregularities)
- Preserve full tufted chenille loop structure (no smoothing or blending)
- Maintain exact stripe pattern, spacing, segmentation, and randomness
- Preserve original color tones exactly (no hue shift, no brightness or contrast alteration)
- Maintain pile height variation and loop density

--- SCENE SETUP ---
- Surrounding must look natural, slightly textured, non-reflective
- Add subtle grounding shadow beneath product (soft, diffused, realistic)

--- CAMERA (STRICT — DIRECTIONAL CONTROL) ---
- 3/4 oblique viewing angle
- Camera tilt: 25-30 degrees downward
- ORIENTATION (CRITICAL):
  - Follow the explicit orientation instruction provided later in this prompt
- Camera aligned along the long edge of the mat
- Perspective behavior:
  - Maintain natural perspective (no distortion)
- Lens: 50-70mm equivalent
- No rotation ambiguity (DO NOT flip orientation)

--- FRAMING (ABSOLUTE – DO NOT VIOLATE) ---
- Entire product MUST be fully visible within frame
- Maintain 10% empty margin on all sides (minimum 8%)
- Product must NOT touch frame edges
- All four corners must be clearly visible and intact
- Product occupies 60-65% of frame (never exceed 70%)
- Camera distance must ensure full product visibility (no zoom-in framing)
- Do NOT crop, zoom, or partially frame the product
- Full product visibility takes priority over texture detail

--- ENVIRONMENT ---
- Minimal, modern  setting
- Neutral palette (beige / off-white / soft stone)
- Optional props: folded white towel OR small soap dish (very subtle, non-distracting)
- Background must remain soft and secondary

--- LIGHTING ---
- Soft natural daylight (window-style)
- Diffused shadows only (no harsh edges)
- Gentle directional light to enhance texture depth of chenille loops
- Physically accurate material response (no gloss, no artificial shine)

--- MATERIAL REALISM ---
- Ultra-detailed chenille loops clearly visible
- Micro-shadows between fibers
- Natural fabric softness with depth
- No plastic-like rendering, no over-sharpening

--- NEGATIVE CONSTRAINTS (STRICT) ---
- No redesign, reinterpretation, or pattern alteration
- No color grading or enhancement
- No additional textures or stylization
- No cropping or zooming
- No duplicate products
- No text, watermark, or branding
- No unrealistic shadows or reflections
""".strip()


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")


def to_data_url(image_path: Path) -> str:
    mime = "image/png"
    suffix = image_path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        mime = "image/jpeg"
    elif suffix == ".webp":
        mime = "image/webp"
    encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


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


def canonical_model_name(model_name: str) -> str:
    value = (model_name or "").strip()
    for prefix in (*TEXT_TOKEN_PRICING_PER_MILLION.keys(), *IMAGE_GENERATION_PRICING_PER_IMAGE.keys()):
        if value == prefix or value.startswith(f"{prefix}-"):
            return prefix
    return value


def normalize_usage(usage: Any) -> dict[str, Any]:
    if usage is None:
        return {
            "input_tokens": 0,
            "cached_input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
        }
    if hasattr(usage, "model_dump"):
        raw = usage.model_dump()
    elif hasattr(usage, "dict"):
        raw = usage.dict()
    elif isinstance(usage, dict):
        raw = usage
    else:
        raw = {}

    input_details = raw.get("input_tokens_details") or {}
    cached_input_tokens = int(input_details.get("cached_tokens") or 0)
    return {
        "input_tokens": int(raw.get("input_tokens") or 0),
        "cached_input_tokens": cached_input_tokens,
        "output_tokens": int(raw.get("output_tokens") or 0),
        "total_tokens": int(raw.get("total_tokens") or 0),
    }


def compute_text_token_cost(
    usage: dict[str, Any],
    *,
    model_name: str,
    apply_batch_discount: bool,
) -> dict[str, Any]:
    canonical_name = canonical_model_name(model_name)
    pricing = TEXT_TOKEN_PRICING_PER_MILLION.get(canonical_name)
    if not pricing:
        return {
            "model": canonical_name,
            "pricing_available": False,
            "input_cost_usd": 0.0,
            "cached_input_cost_usd": 0.0,
            "output_cost_usd": 0.0,
            "total_cost_usd": 0.0,
        }

    multiplier = BATCH_DISCOUNT_FACTOR if apply_batch_discount else 1.0
    cached_input_tokens = min(int(usage.get("cached_input_tokens") or 0), int(usage.get("input_tokens") or 0))
    uncached_input_tokens = max(0, int(usage.get("input_tokens") or 0) - cached_input_tokens)
    output_tokens = int(usage.get("output_tokens") or 0)

    input_cost = uncached_input_tokens / 1_000_000 * pricing["input"] * multiplier
    cached_input_cost = cached_input_tokens / 1_000_000 * pricing["cached_input"] * multiplier
    output_cost = output_tokens / 1_000_000 * pricing["output"] * multiplier
    total_cost = input_cost + cached_input_cost + output_cost

    return {
        "model": canonical_name,
        "pricing_available": True,
        "input_tokens": uncached_input_tokens,
        "cached_input_tokens": cached_input_tokens,
        "output_tokens": output_tokens,
        "input_cost_usd": round(input_cost, 6),
        "cached_input_cost_usd": round(cached_input_cost, 6),
        "output_cost_usd": round(output_cost, 6),
        "total_cost_usd": round(total_cost, 6),
    }


def compute_image_generation_cost(
    *,
    model_name: str,
    quality: str,
    size: str,
    image_count: int,
    apply_batch_discount: bool,
) -> dict[str, Any]:
    canonical_name = canonical_model_name(model_name)
    base_price = (
        IMAGE_GENERATION_PRICING_PER_IMAGE.get(canonical_name, {})
        .get((quality or "").strip().lower(), {})
        .get((size or "").strip(), None)
    )
    if base_price is None:
        return {
            "model": canonical_name,
            "pricing_available": False,
            "image_count": int(image_count),
            "per_image_cost_usd": 0.0,
            "total_cost_usd": 0.0,
        }

    multiplier = BATCH_DISCOUNT_FACTOR if apply_batch_discount else 1.0
    per_image_cost = base_price * multiplier
    total_cost = per_image_cost * int(image_count)
    return {
        "model": canonical_name,
        "pricing_available": True,
        "image_count": int(image_count),
        "per_image_cost_usd": round(per_image_cost, 6),
        "total_cost_usd": round(total_cost, 6),
        "quality": quality,
        "size": size,
    }


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
                            '"pattern_details": string, "distinguishing_details": string, '
                            '"usage_context": string}. '
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
    usage = normalize_usage(getattr(response, "usage", None))
    resolved_model = str(getattr(response, "model", analysis_model) or analysis_model)
    return {
        "kyc": extract_json_object(response.output_text),
        "usage": usage,
        "model": resolved_model,
        "cost": compute_text_token_cost(
            usage,
            model_name=resolved_model,
            apply_batch_discount=False,
        ),
    }


def build_kyc_prompt_block(kyc: dict[str, Any]) -> str:
    material = ", ".join(kyc.get("materials", [])) or "product materials"
    colors = ", ".join(kyc.get("colors", [])) or "original product colors"
    shape = kyc.get("shape_and_structure") or "original product shape and structure"
    pattern = kyc.get("pattern_details") or "original visible pattern details"
    category = kyc.get("product_type") or "product"
    distinguishing = kyc.get("distinguishing_details") or "preserve all visible product details"
    usage_context = kyc.get("usage_context") or "product in normal intended use"
    return (
        f"Auto-generated product KYC: category={category}; materials={material}; colors={colors}; "
        f"shape_and_structure={shape}; pattern_details={pattern}; "
        f"distinguishing_details={distinguishing}; usage_context={usage_context}."
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare low-cost OpenAI Batch API requests for product image generation."
    )
    parser.add_argument(
        "--manifest",
        default="batch_manifest_template.csv",
        help="CSV manifest exported from Excel.",
    )
    parser.add_argument(
        "--input-root",
        default="",
        help=(
            "Optional root folder to auto-build a manifest. "
            "If subfolders exist, each subfolder becomes one product. "
            "If only image files exist, each image becomes one product."
        ),
    )
    parser.add_argument(
        "--scene-brief",
        default="Create a premium ecommerce-style product image with a clean premium background.",
        help="Default scene brief used when building a manifest from a folder.",
    )
    parser.add_argument(
        "--output-dir",
        default="output/openai_batch",
        help="Directory for prepared batch files and resized inputs.",
    )
    parser.add_argument(
        "--submit",
        action="store_true",
        help="Upload the JSONL file and create the batch job.",
    )
    parser.add_argument(
        "--completion-window",
        default="24h",
        help="Batch completion window.",
    )
    parser.add_argument(
        "--download-batch-id",
        default="",
        help="If set, download results for this completed batch into --output-dir.",
    )
    return parser.parse_args()


def sanitize_filename(name: str) -> str:
    return Path(name).name.replace(" ", "_")


def ensure_supported_image(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")
    if path.suffix.lower() not in SUPPORTED_IMAGE_EXTS:
        raise ValueError(f"Unsupported image type: {path.suffix}")


def collect_reference_images(folder_path: Path) -> list[Path]:
    if not folder_path.exists():
        raise FileNotFoundError(f"Image folder not found: {folder_path}")
    if not folder_path.is_dir():
        raise ValueError(f"Image folder is not a directory: {folder_path}")
    images = sorted(
        path
        for path in folder_path.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_IMAGE_EXTS
    )
    if not images:
        raise ValueError(f"No supported images found in: {folder_path}")
    return images[:MAX_REFERENCE_IMAGES]


def collect_reference_images_for_row(row: dict[str, str]) -> list[Path]:
    folder_path = Path(row["image_folder"]).expanduser()
    images = collect_reference_images(folder_path)
    primary_image_name = (row.get("primary_image_name", "") or "").strip()
    if not primary_image_name:
        return images

    primary_matches = [path for path in images if path.name == primary_image_name]
    if primary_matches:
        primary = primary_matches[0]
        remainder = [path for path in images if path != primary]
        return [primary, *remainder][:MAX_REFERENCE_IMAGES]

    full_folder_images = sorted(
        path
        for path in folder_path.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_IMAGE_EXTS
    )
    primary_candidates = [path for path in full_folder_images if path.name == primary_image_name]
    if not primary_candidates:
        return images

    primary = primary_candidates[0]
    remainder = [path for path in full_folder_images if path != primary][: MAX_REFERENCE_IMAGES - 1]
    return [primary, *remainder]


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


def build_reference_sheet(image_paths: list[Path], output_path: Path, max_long_side: int) -> Path:
    processed_images: list[Image.Image] = []
    try:
        for image_path in image_paths:
            temp_path = output_path.parent / f"tmp_{image_path.stem}.png"
            preprocess_image(image_path, temp_path, max_long_side)
            with Image.open(temp_path) as image:
                processed_images.append(image.convert("RGBA").copy())
            temp_path.unlink(missing_ok=True)

        if len(processed_images) == 1:
            processed_images[0].save(output_path, format="PNG")
            return output_path

        canvas = Image.new("RGBA", (2048, 2048), "white")
        slots = [
            (40, 40, 1320, 2008),
            (1360, 40, 2008, 648),
            (1360, 700, 2008, 1308),
            (1360, 1360, 2008, 1968),
        ]

        for image, slot in zip(processed_images, slots):
            fitted = image.copy()
            fitted.thumbnail((slot[2] - slot[0], slot[3] - slot[1]), Image.Resampling.LANCZOS)
            x = slot[0] + ((slot[2] - slot[0]) - fitted.width) // 2
            y = slot[1] + ((slot[3] - slot[1]) - fitted.height) // 2
            canvas.alpha_composite(fitted, (x, y))

        canvas.save(output_path, format="PNG")
        return output_path
    finally:
        for image in processed_images:
            image.close()


def image_to_data_url(path: Path) -> str:
    image_bytes = path.read_bytes()
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def load_manifest(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file_obj:
        reader = csv.DictReader(file_obj)
        rows = [dict(row) for row in reader]
    if not rows:
        raise ValueError("Manifest is empty.")
    return rows


def load_optional_kyc_text(folder_path: Path) -> str:
    candidates = sorted(
        path
        for path in folder_path.iterdir()
        if path.is_file() and path.suffix.lower() in {".txt", ".md"}
    )
    if not candidates:
        return ""
    return candidates[0].read_text(encoding="utf-8").strip()


def sanitize_id(value: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in value.strip())
    return safe.strip("_") or "product"


def build_flat_image_rows(
    folder_path: Path,
    scene_brief: str,
    *,
    extra_instructions: str = "",
) -> list[dict[str, str]]:
    flat_images = sorted(
        path
        for path in folder_path.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_IMAGE_EXTS
    )
    if not flat_images:
        return []

    rows: list[dict[str, str]] = []
    for image_path in flat_images:
        rows.append(
            {
                "product_id": sanitize_id(image_path.stem),
                "image_folder": str(image_path.parent),
                "primary_image_name": image_path.name,
                "product_name": image_path.stem.replace("_", " ").strip(),
                "brand_name": "",
                "product_category": "product",
                "target_audience": "",
                "scene_brief": scene_brief,
                "product_details": "",
                "preserve_details": "",
                "extra_instructions": extra_instructions,
                "max_long_side": str(DEFAULT_MAX_LONG_SIDE),
            }
        )
    return rows


def build_manifest_rows_from_input_root(input_root: Path, scene_brief: str) -> list[dict[str, str]]:
    if not input_root.exists():
        raise FileNotFoundError(f"Input root not found: {input_root}")
    if not input_root.is_dir():
        raise ValueError(f"Input root is not a directory: {input_root}")

    child_dirs = sorted(path for path in input_root.iterdir() if path.is_dir())
    rows: list[dict[str, str]] = []

    # Browser folder uploads often arrive under one wrapper directory.
    # If that directory only contains flat image files, treat each image as its own row.
    if len(child_dirs) == 1:
        wrapper_dir = child_dirs[0]
        wrapper_child_dirs = [path for path in wrapper_dir.iterdir() if path.is_dir()]
        wrapper_rows = build_flat_image_rows(
            wrapper_dir,
            scene_brief,
            extra_instructions=load_optional_kyc_text(wrapper_dir),
        )
        if wrapper_rows and not wrapper_child_dirs:
            return wrapper_rows

    if child_dirs:
        for folder_path in child_dirs:
            images = [
                path
                for path in folder_path.iterdir()
                if path.is_file() and path.suffix.lower() in SUPPORTED_IMAGE_EXTS
            ]
            if not images:
                continue
            kyc_text = load_optional_kyc_text(folder_path)
            rows.append(
                {
                    "product_id": sanitize_id(folder_path.name),
                    "image_folder": str(folder_path),
                    "product_name": folder_path.name.replace("_", " ").strip(),
                    "brand_name": "",
                    "product_category": "product",
                    "target_audience": "",
                    "scene_brief": scene_brief,
                    "product_details": "",
                    "preserve_details": "",
                    "extra_instructions": kyc_text,
                    "max_long_side": str(DEFAULT_MAX_LONG_SIDE),
                }
            )
        if rows:
            return rows

    rows = build_flat_image_rows(
        input_root,
        scene_brief,
        extra_instructions=load_optional_kyc_text(input_root),
    )
    if not rows:
        raise ValueError(f"No supported images found in: {input_root}")
    return rows


def orientation_instruction(variant: str) -> str:
    if variant == "ltr":
        return (
            "ORIENTATION OVERRIDE: left edge of product closer to camera, right edge farther, "
            "perspective rises from LEFT to RIGHT, camera positioned toward the LEFT FRONT corner."
        )
    return (
        "ORIENTATION OVERRIDE: right edge of product closer to camera, left edge farther, "
        "perspective rises from RIGHT to LEFT, camera positioned toward the RIGHT FRONT corner."
    )


def parse_orientation_variants() -> list[str]:
    raw_value = env_or_default("OPENAI_BATCH_ORIENTATION_VARIANTS", "rtl,ltr").lower()
    requested = [item.strip() for item in raw_value.split(",") if item.strip()]
    allowed = {"rtl", "ltr"}
    selected = [item for item in requested if item in allowed]
    return selected or ["rtl", "ltr"]


def build_prompt(row: dict[str, str], orientation_variant: str, product_kyc: dict[str, Any] | None) -> str:
    product_name = row.get("product_name", "").strip() or "product"
    category = row.get("product_category", "").strip() or "product"
    scene_brief = row.get("scene_brief", "").strip() or "Create a clean premium ecommerce scene."
    product_details = row.get("product_details", "").strip()
    preserve_details = row.get("preserve_details", "").strip()
    brand_name = row.get("brand_name", "").strip()
    audience = row.get("target_audience", "").strip()
    extra = row.get("extra_instructions", "").strip()

    parts = [
        BASE_PRODUCT_PROMPT,
        f"Product name: {product_name}.",
        f"Category: {category}.",
        orientation_instruction(orientation_variant),
        f"Scene direction: {scene_brief}",
        f"Use the uploaded reference image as the strict source of truth for this {category}.",
        f"Keep the exact same {product_name}.",
    ]
    if product_kyc:
        parts.append(build_kyc_prompt_block(product_kyc))
    if brand_name:
        parts.append(f"Preserve visible brand cues for {brand_name}.")
    if audience:
        parts.append(f"Target audience context: {audience}.")
    if product_details:
        parts.append(f"Product details: {product_details}.")
    if preserve_details:
        parts.append(f"Must preserve: {preserve_details}.")
    if extra:
        parts.append(extra)
    return " ".join(parts)


def int_or_default(value: str, default: int) -> int:
    value = (value or "").strip()
    return int(value) if value else default


def text_or_default(value: str, default: str) -> str:
    value = (value or "").strip()
    return value or default


def env_or_default(name: str, default: str) -> str:
    value = os.getenv(name, "").strip()
    return value or default


def env_int_or_default(name: str, default: int) -> int:
    value = os.getenv(name, "").strip()
    return int(value) if value else default


def make_batch_request(
    *,
    row: dict[str, str],
    processed_image_path: Path,
    orientation_variant: str,
    product_kyc: dict[str, Any] | None,
    input_fidelity_override: str | None = None,
) -> dict[str, object]:
    product_id = row.get("product_id", "").strip() or processed_image_path.stem
    prompt = build_prompt(row, orientation_variant, product_kyc)
    size = env_or_default("OPENAI_BATCH_IMAGE_SIZE", DEFAULT_SIZE)
    quality = env_or_default("OPENAI_BATCH_IMAGE_QUALITY", DEFAULT_QUALITY)
    image_model = env_or_default("OPENAI_BATCH_IMAGE_MODEL", DEFAULT_IMAGE_MODEL)
    batch_model = env_or_default("OPENAI_BATCH_TEXT_MODEL", DEFAULT_BATCH_MODEL)
    input_fidelity = (input_fidelity_override or "").strip() or env_or_default("OPENAI_BATCH_INPUT_FIDELITY", "low")

    return {
        "custom_id": f"{product_id}__{orientation_variant}",
        "method": "POST",
        "url": "/v1/responses",
        "body": {
            "model": batch_model,
            "tool_choice": {"type": "image_generation"},
            "input": [
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {
                            "type": "input_image",
                            "image_url": image_to_data_url(processed_image_path),
                            "detail": "low",
                        },
                    ],
                }
            ],
            "tools": [
                {
                    "type": "image_generation",
                    "model": image_model,
                    "size": size,
                    "quality": quality,
                    "input_fidelity": input_fidelity,
                }
            ],
        },
    }


def write_manifest(rows: list[dict[str, str]], path: Path) -> Path:
    if not rows:
        raise ValueError("Cannot write an empty manifest.")
    fieldnames: list[str] = []
    for row in rows:
        for key in row.keys():
            if key not in fieldnames:
                fieldnames.append(key)
    with path.open("w", encoding="utf-8", newline="") as file_obj:
        writer = csv.DictWriter(file_obj, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    return path


def prepare_batch(manifest_path: Path, output_dir: Path) -> dict[str, str]:
    return prepare_batch_with_options(manifest_path, output_dir)


def prepare_batch_with_options(
    manifest_path: Path,
    output_dir: Path,
    *,
    input_fidelity: str | None = None,
) -> dict[str, str]:
    load_dotenv()
    rows = load_manifest(manifest_path)
    run_dir = output_dir
    processed_dir = run_dir / "processed_inputs"
    processed_dir.mkdir(parents=True, exist_ok=True)
    kyc_cache_dir = output_dir.parent / "kyc_cache"
    requests_path = run_dir / "requests.jsonl"
    preview_path = run_dir / "preview.json"
    config_path = run_dir / "batch_config.json"
    cost_summary_path = run_dir / "cost_summary.json"

    requests: list[dict[str, object]] = []
    preview_rows: list[dict[str, object]] = []
    preparation_cost_records: list[dict[str, Any]] = []
    orientation_variants = parse_orientation_variants()
    use_image_kyc = env_or_default("OPENAI_BATCH_USE_IMAGE_KYC", "true").lower() in {"1", "true", "yes", "on"}
    analysis_model = env_or_default("OPENAI_BATCH_ANALYSIS_MODEL", DEFAULT_ANALYSIS_MODEL)
    analysis_detail = env_or_default("OPENAI_BATCH_ANALYSIS_DETAIL", "low")
    client: OpenAI | None = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if use_image_kyc else None

    for row in rows:
        image_folder = Path(row["image_folder"]).expanduser()
        reference_images = collect_reference_images_for_row(row)
        product_id = row.get("product_id", "").strip() or image_folder.name
        max_long_side = int_or_default(row.get("max_long_side", ""), DEFAULT_MAX_LONG_SIDE)
        processed_image_path = processed_dir / f"{sanitize_filename(product_id)}.png"
        build_reference_sheet(reference_images, processed_image_path, max_long_side)
        product_kyc: dict[str, Any] | None = None
        kyc_cache_hit = False
        kyc_cache_path = ""

        if use_image_kyc:
            primary_reference = reference_images[0]
            image_hash = file_sha256(primary_reference)
            cached_kyc = load_cached_kyc(kyc_cache_dir, image_hash)
            if cached_kyc is not None:
                product_kyc = cached_kyc
                kyc_cache_hit = True
                kyc_cache_path = str(kyc_cache_dir / f"{image_hash}.json")
                preparation_cost_records.append(
                    {
                        "product_id": product_id,
                        "type": "image_kyc",
                        "cache_hit": True,
                        "model": canonical_model_name(analysis_model),
                        "usage": normalize_usage(None),
                        "cost": {
                            "model": canonical_model_name(analysis_model),
                            "pricing_available": True,
                            "input_cost_usd": 0.0,
                            "cached_input_cost_usd": 0.0,
                            "output_cost_usd": 0.0,
                            "total_cost_usd": 0.0,
                        },
                    }
                )
            else:
                if client is None:
                    raise RuntimeError("OPENAI_API_KEY is required when OPENAI_BATCH_USE_IMAGE_KYC=true")
                analysis_result = analyze_product_image(
                    client,
                    image_path=primary_reference,
                    analysis_model=analysis_model,
                    detail=analysis_detail,
                )
                product_kyc = analysis_result["kyc"]
                cache_path = save_cached_kyc(kyc_cache_dir, image_hash, product_kyc)
                kyc_cache_path = str(cache_path)
                preparation_cost_records.append(
                    {
                        "product_id": product_id,
                        "type": "image_kyc",
                        "cache_hit": False,
                        "model": analysis_result["model"],
                        "usage": analysis_result["usage"],
                        "cost": analysis_result["cost"],
                    }
                )

        for orientation_variant in orientation_variants:
            request = make_batch_request(
                row=row,
                processed_image_path=processed_image_path,
                orientation_variant=orientation_variant,
                product_kyc=product_kyc,
                input_fidelity_override=input_fidelity,
            )
            requests.append(request)
            preview_rows.append(
                {
                    "product_id": product_id,
                    "custom_id": request["custom_id"],
                    "orientation_variant": orientation_variant,
                    "reference_images": [str(path) for path in reference_images],
                    "processed_image": str(processed_image_path),
                    "product_kyc": product_kyc,
                    "kyc_cache_hit": kyc_cache_hit,
                    "kyc_cache_path": kyc_cache_path,
                    "prompt_preview": request["body"]["input"][0]["content"][0]["text"],
                    "image_model": request["body"]["tools"][0]["model"],
                    "quality": request["body"]["tools"][0]["quality"],
                    "size": request["body"]["tools"][0]["size"],
                    "image_count": 1,
                }
            )

    preparation_total_cost = round(
        sum(float(record["cost"].get("total_cost_usd", 0.0)) for record in preparation_cost_records),
        6,
    )
    cost_summary = {
        "pricing_basis_date": PRICING_BASIS_DATE,
        "preparation": {
            "actual_cost_usd": preparation_total_cost,
            "records": preparation_cost_records,
            "cache_hits": sum(1 for record in preparation_cost_records if record.get("cache_hit")),
            "cache_misses": sum(1 for record in preparation_cost_records if not record.get("cache_hit")),
        },
    }

    with requests_path.open("w", encoding="utf-8") as file_obj:
        for request in requests:
            file_obj.write(json.dumps(request, ensure_ascii=True) + "\n")

    preview_path.write_text(
        json.dumps(preview_rows, indent=2, ensure_ascii=True),
        encoding="utf-8",
    )
    config_path.write_text(
        json.dumps(
            {
                "OPENAI_BATCH_TEXT_MODEL": env_or_default("OPENAI_BATCH_TEXT_MODEL", DEFAULT_BATCH_MODEL),
                "OPENAI_BATCH_IMAGE_MODEL": env_or_default("OPENAI_BATCH_IMAGE_MODEL", DEFAULT_IMAGE_MODEL),
                "OPENAI_BATCH_IMAGE_SIZE": env_or_default("OPENAI_BATCH_IMAGE_SIZE", DEFAULT_SIZE),
                "OPENAI_BATCH_IMAGE_QUALITY": env_or_default("OPENAI_BATCH_IMAGE_QUALITY", DEFAULT_QUALITY),
                "OPENAI_BATCH_IMAGE_COUNT": 1,
                "OPENAI_BATCH_INPUT_FIDELITY": (input_fidelity or "").strip()
                or env_or_default("OPENAI_BATCH_INPUT_FIDELITY", "low"),
                "OPENAI_BATCH_ORIENTATION_VARIANTS": orientation_variants,
                "OPENAI_BATCH_USE_IMAGE_KYC": use_image_kyc,
                "OPENAI_BATCH_ANALYSIS_MODEL": analysis_model,
                "OPENAI_BATCH_ANALYSIS_DETAIL": analysis_detail,
                "KYC_CACHE_DIR": str(kyc_cache_dir),
            },
            indent=2,
            ensure_ascii=True,
        ),
        encoding="utf-8",
    )
    cost_summary_path.write_text(
        json.dumps(cost_summary, indent=2, ensure_ascii=True),
        encoding="utf-8",
    )

    return {
        "manifest": str(manifest_path),
        "requests_jsonl": str(requests_path),
        "preview_json": str(preview_path),
        "config": str(config_path),
        "cost_summary_json": str(cost_summary_path),
        "cost_summary": cost_summary,
        "processed_inputs_dir": str(processed_dir),
        "row_count": str(len(rows)),
    }


def submit_batch(requests_path: Path, completion_window: str) -> dict[str, str]:
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")

    client = OpenAI(api_key=api_key)
    with requests_path.open("rb") as file_obj:
        batch_file = client.files.create(file=file_obj, purpose="batch")

    batch = client.batches.create(
        input_file_id=batch_file.id,
        endpoint="/v1/responses",
        completion_window=completion_window,
    )
    return {
        "input_file_id": batch_file.id,
        "batch_id": batch.id,
        "status": str(batch.status),
    }


def extract_image_results_from_response_body(body: dict[str, object]) -> list[tuple[str | None, str]]:
    outputs = body.get("output", [])
    if not isinstance(outputs, list):
        return []

    image_results: list[tuple[str | None, str]] = []
    for item in outputs:
        if not isinstance(item, dict):
            continue
        if item.get("type") != "image_generation_call":
            continue
        result = item.get("result")
        image_id = item.get("id")
        if isinstance(result, str) and result:
            image_results.append((str(image_id) if image_id else None, result))
        elif isinstance(result, list):
            for entry in result:
                if isinstance(entry, str) and entry:
                    image_results.append((str(image_id) if image_id else None, entry))
    return image_results


def estimate_background_rgb(image: Image.Image) -> tuple[float, float, float]:
    rgb = image.convert("RGB")
    width, height = rgb.size
    sample_points = [
        (0, 0),
        (width - 1, 0),
        (0, height - 1),
        (width - 1, height - 1),
        (width // 2, 0),
        (width // 2, height - 1),
        (0, height // 2),
        (width - 1, height // 2),
    ]
    pixels = [rgb.getpixel((x, y)) for (x, y) in sample_points]
    r = sum(pixel[0] for pixel in pixels) / len(pixels)
    g = sum(pixel[1] for pixel in pixels) / len(pixels)
    b = sum(pixel[2] for pixel in pixels) / len(pixels)
    return (r, g, b)


def build_foreground_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    rgb = image.convert("RGB")
    width, height = rgb.size
    bg = estimate_background_rgb(rgb)
    threshold = 38.0
    min_x, min_y = width, height
    max_x, max_y = -1, -1

    for y in range(height):
        for x in range(width):
            px = rgb.getpixel((x, y))
            distance = abs(px[0] - bg[0]) + abs(px[1] - bg[1]) + abs(px[2] - bg[2])
            if distance >= threshold:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if max_x < min_x or max_y < min_y:
        return None
    return (min_x, min_y, max_x, max_y)


def compute_orientation_slope(image_path: Path) -> dict[str, object]:
    image = Image.open(image_path)
    bbox = build_foreground_bbox(image)
    if bbox is None:
        return {"ok": False, "reason": "foreground_not_found"}

    rgb = image.convert("RGB")
    bg = estimate_background_rgb(rgb)
    threshold = 38.0
    min_x, min_y, max_x, max_y = bbox
    points: list[tuple[float, float]] = []

    for x in range(min_x, max_x + 1):
        top_y: int | None = None
        bottom_y: int | None = None
        for y in range(min_y, max_y + 1):
            px = rgb.getpixel((x, y))
            distance = abs(px[0] - bg[0]) + abs(px[1] - bg[1]) + abs(px[2] - bg[2])
            if distance >= threshold:
                if top_y is None:
                    top_y = y
                bottom_y = y
        if top_y is not None and bottom_y is not None:
            points.append((float(x), (top_y + bottom_y) / 2.0))

    if len(points) < 20:
        return {"ok": False, "reason": "insufficient_foreground_points", "bbox": bbox}

    mean_x = sum(point[0] for point in points) / len(points)
    mean_y = sum(point[1] for point in points) / len(points)
    denom = sum((point[0] - mean_x) ** 2 for point in points)
    if denom <= 1e-6:
        return {"ok": False, "reason": "degenerate_axis", "bbox": bbox}

    slope = sum((point[0] - mean_x) * (point[1] - mean_y) for point in points) / denom
    angle_degrees = math.degrees(math.atan(slope))
    orientation = "ltr_like" if slope > 0 else "rtl_like"
    return {
        "ok": True,
        "bbox": bbox,
        "slope": slope,
        "angle_degrees": angle_degrees,
        "orientation": orientation,
    }


def expected_detected_orientation(variant: str) -> str:
    return "ltr_like" if variant == "ltr" else "rtl_like"


def correct_simple_orientation(image_path: Path, expected_variant: str, destination: Path) -> dict[str, object]:
    before = compute_orientation_slope(image_path)
    image = Image.open(image_path)

    if not before.get("ok"):
        image.save(destination)
        return {
            "source": str(image_path),
            "output": str(destination),
            "transformation": "copied_unchecked",
            "analysis_before": before,
        }

    expected = expected_detected_orientation(expected_variant)
    if before.get("orientation") == expected:
        image.save(destination)
        return {
            "source": str(image_path),
            "output": str(destination),
            "transformation": "none",
            "analysis_before": before,
        }

    flipped = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    flipped.save(destination)
    after = compute_orientation_slope(destination)
    return {
        "source": str(image_path),
        "output": str(destination),
        "transformation": "horizontal_flip",
        "analysis_before": before,
        "analysis_after": after,
    }


def postprocess_orientation_variants(results_dir: Path, output_dir: Path) -> dict[str, object]:
    selected_dir = output_dir / "selected_results"
    selected_dir.mkdir(parents=True, exist_ok=True)
    review_records: list[dict[str, object]] = []
    grouped: dict[str, dict[str, Path]] = {}

    for variant_dir in sorted(results_dir.iterdir()):
        if not variant_dir.is_dir() or "__" not in variant_dir.name:
            continue
        product_id, variant = variant_dir.name.rsplit("__", 1)
        image_path = variant_dir / "image_1.png"
        if image_path.exists():
            grouped.setdefault(product_id, {})[variant] = image_path

    for product_id, variants in grouped.items():
        product_dir = selected_dir / sanitize_filename(product_id)
        product_dir.mkdir(parents=True, exist_ok=True)
        record: dict[str, object] = {"product_id": product_id, "variants": {}}

        for variant, image_path in variants.items():
            corrected_path = product_dir / f"{variant}.png"
            result = correct_simple_orientation(image_path, variant, corrected_path)
            record["variants"][variant] = result

        review_records.append(record)

    summary = {
        "selected_dir": str(selected_dir),
        "products": review_records,
    }
    write_json(output_dir / "orientation_review.json", summary)
    return summary


def read_file_content_text(client: OpenAI, file_id: str) -> str:
    response = client.files.content(file_id)

    if hasattr(response, "text"):
        text_attr = getattr(response, "text")
        if callable(text_attr):
            return text_attr()
        if isinstance(text_attr, str):
            return text_attr

    if hasattr(response, "read"):
        content = response.read()
        if isinstance(content, bytes):
            return content.decode("utf-8")
        if isinstance(content, str):
            return content

    if isinstance(response, bytes):
        return response.decode("utf-8")
    return str(response)


def download_batch_results(batch_id: str, output_dir: Path) -> dict[str, object]:
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")

    client = OpenAI(api_key=api_key)
    batch = client.batches.retrieve(batch_id)
    if str(batch.status) != "completed":
        raise RuntimeError(f"Batch {batch_id} is not completed. Current status: {batch.status}")

    output_file_id = getattr(batch, "output_file_id", None)
    if not output_file_id:
        raise RuntimeError(f"Batch {batch_id} has no output_file_id.")

    output_dir.mkdir(parents=True, exist_ok=True)
    results_dir = output_dir / "results"
    results_dir.mkdir(parents=True, exist_ok=True)
    output_jsonl_path = output_dir / "batch_output.jsonl"

    jsonl_text = read_file_content_text(client, output_file_id)
    output_jsonl_path.write_text(jsonl_text, encoding="utf-8")

    saved_images: list[str] = []
    saved_records: list[dict[str, object]] = []
    cost_records: list[dict[str, Any]] = []

    for line in jsonl_text.splitlines():
        line = line.strip()
        if not line:
            continue
        row = json.loads(line)
        custom_id = str(row.get("custom_id") or "unknown")
        response_block = row.get("response", {})
        if not isinstance(response_block, dict):
            continue
        body = response_block.get("body", {})
        if not isinstance(body, dict):
            continue

        image_results = extract_image_results_from_response_body(body)
        if not image_results:
            continue

        usage = normalize_usage(body.get("usage"))
        response_model = str(body.get("model") or DEFAULT_BATCH_MODEL)
        text_cost = compute_text_token_cost(
            usage,
            model_name=response_model,
            apply_batch_discount=True,
        )
        tool_model = DEFAULT_IMAGE_MODEL
        tool_quality = DEFAULT_QUALITY
        tool_size = DEFAULT_SIZE
        for tool in body.get("tools", []):
            if isinstance(tool, dict) and tool.get("type") == "image_generation":
                tool_model = str(tool.get("model") or tool_model)
                tool_quality = str(tool.get("quality") or tool_quality)
                tool_size = str(tool.get("size") or tool_size)
                break
        image_cost = compute_image_generation_cost(
            model_name=tool_model,
            quality=tool_quality,
            size=tool_size,
            image_count=len(image_results),
            apply_batch_discount=True,
        )

        product_dir = results_dir / sanitize_filename(custom_id)
        product_dir.mkdir(parents=True, exist_ok=True)

        image_paths: list[str] = []
        for index, (_, image_b64) in enumerate(image_results, start=1):
            destination = product_dir / f"image_{index}.png"
            destination.write_bytes(base64.b64decode(image_b64))
            image_paths.append(str(destination))
            saved_images.append(str(destination))

        saved_records.append(
            {
                "custom_id": custom_id,
                "images": image_paths,
            }
        )
        cost_records.append(
            {
                "custom_id": custom_id,
                "response_model": canonical_model_name(response_model),
                "usage": usage,
                "text_cost": text_cost,
                "image_generation_cost": image_cost,
                "total_cost_usd": round(
                    float(text_cost.get("total_cost_usd", 0.0)) + float(image_cost.get("total_cost_usd", 0.0)),
                    6,
                ),
            }
        )

    actual_batch_cost_usd = round(sum(float(record["total_cost_usd"]) for record in cost_records), 6)
    actual_text_cost_usd = round(
        sum(float(record["text_cost"].get("total_cost_usd", 0.0)) for record in cost_records),
        6,
    )
    actual_image_generation_cost_usd = round(
        sum(float(record["image_generation_cost"].get("total_cost_usd", 0.0)) for record in cost_records),
        6,
    )

    summary = {
        "batch_id": batch_id,
        "status": str(batch.status),
        "output_file_id": output_file_id,
        "output_jsonl": str(output_jsonl_path),
        "results_dir": str(results_dir),
        "saved_count": len(saved_images),
        "records": saved_records,
        "cost_summary": {
            "pricing_basis_date": PRICING_BASIS_DATE,
            "batch_discount_applied": True,
            "actual_cost_usd": actual_batch_cost_usd,
            "actual_text_cost_usd": actual_text_cost_usd,
            "actual_image_generation_cost_usd": actual_image_generation_cost_usd,
            "records": cost_records,
        },
    }
    summary["orientation_postprocess"] = postprocess_orientation_variants(results_dir, output_dir)
    write_json(output_dir / "download_summary.json", summary)
    return summary


def get_batch_status(batch_id: str) -> dict[str, object]:
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")

    client = OpenAI(api_key=api_key)
    batch = client.batches.retrieve(batch_id)

    request_counts = getattr(batch, "request_counts", None)
    if hasattr(request_counts, "model_dump"):
        request_counts = request_counts.model_dump()
    elif hasattr(request_counts, "dict"):
        request_counts = request_counts.dict()

    return {
        "batch_id": batch.id,
        "status": str(batch.status),
        "input_file_id": getattr(batch, "input_file_id", None),
        "output_file_id": getattr(batch, "output_file_id", None),
        "error_file_id": getattr(batch, "error_file_id", None),
        "created_at": getattr(batch, "created_at", None),
        "in_progress_at": getattr(batch, "in_progress_at", None),
        "completed_at": getattr(batch, "completed_at", None),
        "failed_at": getattr(batch, "failed_at", None),
        "request_counts": request_counts,
    }


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path: Path

    if args.download_batch_id:
        result = download_batch_results(args.download_batch_id, output_dir)
        print(json.dumps({"downloaded": result}, indent=2, ensure_ascii=True))
        return

    if args.input_root:
        input_root = Path(args.input_root).expanduser().resolve()
        run_dir = output_dir
        manifest_path = run_dir / "auto_manifest.csv"
        rows = build_manifest_rows_from_input_root(input_root, args.scene_brief)
        write_manifest(rows, manifest_path)
    else:
        manifest_path = Path(args.manifest).expanduser().resolve()

    result = prepare_batch(manifest_path, output_dir)
    print(json.dumps({"prepared": result}, indent=2, ensure_ascii=True))

    if args.submit:
        submission = submit_batch(Path(result["requests_jsonl"]), args.completion_window)
        print(json.dumps({"submitted": submission}, indent=2, ensure_ascii=True))


if __name__ == "__main__":
    main()
