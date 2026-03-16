import csv
import base64
import json
import os
import time
from datetime import datetime, UTC
from pathlib import Path

import requests
from dotenv import load_dotenv
from PIL import Image, ImageFilter


GENERATED_IMAGES = 4
MAX_REFERENCE_IMAGES = 4
SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
SUPPORTED_KYC_EXTS = {".txt", ".md"}
FINAL_SIZE = (2000, 2000)
INPUT_DIR_NAME = "input"
GENERATED_DIR_NAME = "generated"
SELECTED_DIR_NAME = "selected"
SPEND_LOG_NAME = "spend_log.csv"
RUN_SUMMARIES_DIR_NAME = "run_summaries"
API_LOGS_DIR_NAME = "api_logs"

BFL_BASE_URL = "https://api.bfl.ai/v1"



BASE_PROMPT = """
You are a professional Amazon A+ Content creator and product visual specialist, experienced in creating high-conversion, policy-compliant product images for Amazon India listings.

You will receive:

1. Product Image (reference image file)
2. Product KYC (JSON)

Your task is to generate FOUR separate photorealistic product images using the reference image as the single source of truth.

CRITICAL PRODUCT LOCK RULE (STRICT)

The uploaded product image is the single source of truth.

The product must remain IDENTICAL to the reference image with zero changes.

Do NOT modify:
• shape
• proportions
• color tones
• material finish
• branding
• logos
• engravings
• surface textures
• reflections
• shadows on the product
• geometry
• stone placement
• chain structure
• manufacturing details

The product must appear as the SAME physical object photographed again in different environments.

Only the following may change:
• background
• environment
• lighting
• camera angle
• context
• depth of field


IMAGE STYLE REQUIREMENTS

Images must look like professional DSLR photography.

No AI-art style, illustration, CGI, or stylization.

Use:
• natural lighting
• realistic reflections
• real-world textures
• shallow depth of field where appropriate
• premium commercial product photography style

ENVIRONMENT RULES

All scenes must follow Indian lifestyle context or theme defined in the Product KYC.

Possible scenarios:
• modern Indian home
• festive setting
• dressing table
• jewellery styling
• fashion lifestyle
• premium studio setting

IMAGE GENERATION REQUIREMENT

Generate one photorealistic image per request using the same locked product identity.
Across multiple requests, create varied premium outputs that still preserve the
same product exactly.

HANDMADE REALISM (IF APPLICABLE)

If the product is handcrafted:


IMAGE SIZE COMPLIANCE

Output resolution must be exactly:

2000 × 2000 pixels

Metadata DPI:

300 DPI

Do not crop, resize, stretch, pad, or alter aspect ratio.

Each image must be delivered as a single standalone image — NOT a grid.

AMAZON STYLE GUIDELINES

Images must look:
• premium
• clean
• trustworthy
• conversion focused
• Amazon A+ content ready

Backgrounds must be realistic photography environments.

INPUT

You will receive:

1. Product Image
2. Product KYC JSON

Follow the KYC strictly when selecting environment, styling, and scene direction.


PRODUCT IDENTITY LOCK (STRICT)s:
- The product in the references is the single source of truth.
- Reproduce the exact same jewellery design with zero redesign.
- Do not redesign, simplify, restyle, merge, reinterpret, or approximate the jewellery.
- Do not change gemstone count, gemstone shape, gemstone color, gemstone placement,
  floral motif count, petal count, bead count, drop count, chain pattern,
  pendant structure, metal structure, or proportions.
- Preserve necklace details and earring details separately when the product is a
  necklace-and-earring set.
- Do not copy necklace design elements into the earrings unless they already exist there.
- Do not copy earring design elements into the necklace unless they already exist there.
- If zoom images are provided, use them only to preserve fine detail such as
  gemstone placement, petal count, bead sequence, links, drops, metal texture,
  carved bead shape, and structure of that exact component.
- The result must look like the same physical product photographed in a new setting,
  not a newly designed matching set.

NEVER:
- Do not invent missing parts
- Do not simplify complex details
- Do not reduce the number of hanging drops
- Do not change floral motif geometry
- Do not replace carved beads with round beads
- Do not alter pendant structure
- Do not create a new inspired version

ALLOWED CHANGES:
- background
- environment
- camera angle
- lighting
- context

QUALITY RULES:
- Images must look photorealistic and premium
- Do not stylize the product.
- Do not make the jewellery look AI-generated.

OUTPUT

Generate one final photorealistic image per request.

Never combine multiple images into one frame.
Never produce a grid of images.
Each generated image must show the identical product from the reference images
with zero design modifications.
""".strip()



MODE_CONFIG = {
    "draft": {
        "model": "flux-2-pro",
        "size": "1024x1024",
        "prompt_upsampling": False,
    },
    "strict": {
        "model": "flux-2-pro",
        "size": "1024x1024",
        "prompt_upsampling": False,
    },
}


def current_run_mode() -> str:
    return os.getenv("FLUX_RUN_MODE", "strict").lower()


def current_mode_config() -> dict[str, object]:
    default_config = MODE_CONFIG["strict"]
    mode_config = MODE_CONFIG.get(current_run_mode(), default_config).copy()

    if os.getenv("BFL_MODEL"):
        mode_config["model"] = os.getenv("BFL_MODEL", str(mode_config["model"]))
    if os.getenv("FLUX_OUTPUT_SIZE"):
        mode_config["size"] = os.getenv("FLUX_OUTPUT_SIZE", str(mode_config["size"]))
    if os.getenv("BFL_PROMPT_UPSAMPLING"):
        raw_value = os.getenv("BFL_PROMPT_UPSAMPLING", "false").strip().lower()
        mode_config["prompt_upsampling"] = raw_value in {"1", "true", "yes", "on"}

    return mode_config


def to_serializable(value: object) -> object:
    if isinstance(value, dict):
        return {key: to_serializable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [to_serializable(item) for item in value]
    return value


def write_json(path: Path, payload: object) -> None:
    path.write_text(
        json.dumps(to_serializable(payload), indent=2, ensure_ascii=True),
        encoding="utf-8",
    )


def sum_total_spend(spend_log_path: Path) -> float:
    if not spend_log_path.exists():
        return 0.0

    total = 0.0
    with spend_log_path.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            value = row.get("total_estimated_cost_usd", "0") or "0"
            try:
                total += float(value)
            except ValueError:
                continue
    return round(total, 6)


def build_api_log_paths(api_logs_dir: Path) -> dict[str, Path]:
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    return {
        "request": api_logs_dir / f"{timestamp}_request.json",
        "response": api_logs_dir / f"{timestamp}_response.json",
        "error": api_logs_dir / f"{timestamp}_error.json",
    }


def log_request(
    request_log_path: Path,
    prompt: str,
    reference_images: list[Path],
    kyc_path: Path | None,
    request_payload: dict[str, object],
) -> None:
    payload = {
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "backend": "bfl_flux_api",
        "mode": current_run_mode(),
        "model": current_mode_config()["model"],
        "prompt": prompt,
        "reference_images": [path.name for path in reference_images],
        "reference_image_count": len(reference_images),
        "kyc_file": kyc_path.name if kyc_path else None,
        "request_payload": request_payload,
    }
    write_json(request_log_path, payload)


def log_response(response_log_path: Path, payload: dict[str, object]) -> None:
    write_json(response_log_path, payload)


def log_error(error_log_path: Path, payload: dict[str, object]) -> None:
    write_json(error_log_path, payload)


def collect_reference_images(input_dir: Path) -> list[Path]:
    files = sorted(
        path
        for path in input_dir.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_IMAGE_EXTS
    )
    return files[:MAX_REFERENCE_IMAGES]


def collect_kyc_document(input_dir: Path) -> Path | None:
    docs = sorted(
        path
        for path in input_dir.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_KYC_EXTS
    )
    return docs[0] if docs else None


def build_prompt(kyc_path: Path | None) -> str:
    if not kyc_path:
        return BASE_PROMPT

    kyc_text = kyc_path.read_text(encoding="utf-8").strip()
    if not kyc_text:
        return BASE_PROMPT

    return f"{BASE_PROMPT}\n\nKYC / product documentation:\n{kyc_text}"


def save_generated_image(image_bytes: bytes, generated_dir: Path, shot_name: str) -> Path:
    output_path = generated_dir / f"{shot_name}.png"
    output_path.write_bytes(image_bytes)
    print(f"Generated {output_path}")
    return output_path


def create_sharpened_final(image_path: Path, final_dir: Path) -> Path:
    with Image.open(image_path) as img:
        working = img.convert("RGB")
        final_img = working.resize(FINAL_SIZE, Image.Resampling.LANCZOS)
        final_img = final_img.filter(
            ImageFilter.UnsharpMask(radius=1.8, percent=165, threshold=2)
        )

        final_path = final_dir / f"{image_path.stem}_final.png"
        final_img.save(final_path, format="PNG", optimize=True)
        print(f"Saved {final_path}")
        return final_path


def headers() -> dict[str, str]:
    api_key = os.getenv("BFL_API_KEY")
    if not api_key:
        raise RuntimeError("BFL_API_KEY is not set in .env")
    return {
        "accept": "application/json",
        "x-key": api_key,
    }


def submit_edit_request(
    prompt: str,
    reference_images: list[Path],
    mode_config: dict[str, object],
) -> tuple[dict[str, object], dict[str, object]]:
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

    json_payload = {
        "prompt": prompt,
        "width": int(width_str),
        "height": int(height_str),
        "prompt_upsampling": bool(mode_config["prompt_upsampling"]),
        "output_format": "png",
    }

    for index, path in enumerate(reference_images, start=1):
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
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


def poll_result(polling_url: str) -> dict[str, object]:
    started_at = time.time()
    while True:
        response = requests.get(
            polling_url,
            headers=headers(),
            timeout=120,
        )
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


def download_result_image(url: str) -> bytes:
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    return response.content


def estimate_cost(request_costs: list[float]) -> dict[str, float]:
    total = round(sum(request_costs), 6)
    return {
        "text_input_cost_usd": 0.0,
        "image_input_cost_usd": 0.0,
        "image_output_cost_usd": total,
        "total_estimated_cost_usd": total,
    }


def log_spend(
    spend_log_path: Path,
    run_summary_path: Path,
    reference_images: list[Path],
    kyc_path: Path | None,
    generated_paths: list[Path],
    runtime_seconds: float,
    cost_breakdown: dict[str, float],
) -> dict[str, object]:
    mode_config = current_mode_config()
    row = {
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "backend": "bfl_flux_api",
        "mode": current_run_mode(),
        "model": mode_config["model"],
        "reference_image_count": len(reference_images),
        "reference_images": json.dumps([path.name for path in reference_images]),
        "kyc_file": kyc_path.name if kyc_path else "",
        "generated_image_count": len(generated_paths),
        "runtime_seconds": round(runtime_seconds, 3),
        **cost_breakdown,
    }

    fieldnames = list(row.keys())
    file_exists = spend_log_path.exists()

    with spend_log_path.open("a", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(row)

    total_lifetime_spend_usd = sum_total_spend(spend_log_path)
    run_summary = {
        **row,
        "generated_paths": [str(path) for path in generated_paths],
        "total_lifetime_spend_usd": total_lifetime_spend_usd,
    }
    write_json(run_summary_path, run_summary)

    print(f"Logged run to {spend_log_path}")
    print(f"Saved run summary to {run_summary_path}")
    print(f"Estimated total cost: ${cost_breakdown['total_estimated_cost_usd']:.6f}")
    return run_summary


def generate_images_from_references(
    prompt: str,
    reference_images: list[Path],
    generated_dir: Path,
    spend_log_path: Path,
    run_summaries_dir: Path,
    api_logs_dir: Path,
    kyc_path: Path | None,
) -> list[Path]:
    if not reference_images:
        raise RuntimeError("No reference images found in the input folder.")

    mode_config = current_mode_config()
    run_timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    run_summary_path = run_summaries_dir / f"{run_timestamp}_summary.json"
    generated_paths: list[Path] = []
    request_costs: list[float] = []
    started_at = time.perf_counter()

    for image_index in range(1, GENERATED_IMAGES + 1):
        shot_name = f"image_{image_index}"
        full_prompt = prompt
        log_paths = build_api_log_paths(api_logs_dir)

        try:
            submit_payload, request_payload = submit_edit_request(
                full_prompt,
                reference_images,
                mode_config,
            )
            log_request(
                log_paths["request"],
                full_prompt,
                reference_images,
                kyc_path,
                request_payload | {"submit_response": submit_payload},
            )

            request_id = submit_payload.get("id")
            polling_url = submit_payload.get("polling_url")
            if not request_id:
                raise RuntimeError(f"BFL response did not include an id: {submit_payload}")
            if not polling_url:
                raise RuntimeError(f"BFL response did not include polling_url: {submit_payload}")
            request_costs.append(float(submit_payload.get("cost", 0.0) or 0.0))

            result_payload = poll_result(str(polling_url))
            log_response(log_paths["response"], result_payload)

            if result_payload.get("status") != "Ready":
                raise RuntimeError(f"BFL generation failed: {result_payload}")

            sample = result_payload.get("result", {}).get("sample")
            if not sample:
                raise RuntimeError(f"BFL result did not include sample URL: {result_payload}")

            image_bytes = download_result_image(str(sample))
            generated_paths.append(save_generated_image(image_bytes, generated_dir, shot_name))
        except Exception as exc:
            log_error(
                log_paths["error"],
                {
                    "timestamp_utc": datetime.now(UTC).isoformat(),
                    "backend": "bfl_flux_api",
                    "mode": current_run_mode(),
                    "model": mode_config["model"],
                    "shot_type": shot_name,
                    "error_type": exc.__class__.__name__,
                    "error_message": str(exc),
                },
            )
            raise

    runtime_seconds = time.perf_counter() - started_at
    cost_breakdown = estimate_cost(request_costs)
    log_spend(
        spend_log_path=spend_log_path,
        run_summary_path=run_summary_path,
        reference_images=reference_images,
        kyc_path=kyc_path,
        generated_paths=generated_paths,
        runtime_seconds=runtime_seconds,
        cost_breakdown=cost_breakdown,
    )
    return generated_paths


def process_image(image_path: Path, upscaled_dir: Path, final_dir: Path) -> None:
    with Image.open(image_path) as img:
        print(f"Processing {image_path.name} | original: {img.size}")

        upscaled = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)
        upscaled_path = upscaled_dir / f"{image_path.stem}_2x.png"
        upscaled.save(upscaled_path)

        print(f"Saved {upscaled_path}")
    create_sharpened_final(upscaled_path, final_dir)


def collect_selected_images(selected_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in selected_dir.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_IMAGE_EXTS
    )


def run_generation_pipeline(project_dir: Path) -> dict[str, object]:
    input_dir = project_dir / INPUT_DIR_NAME
    output_dir = project_dir / "output"
    generated_dir = output_dir / GENERATED_DIR_NAME
    selected_dir = output_dir / SELECTED_DIR_NAME
    upscaled_dir = output_dir / "upscaled"
    final_dir = output_dir / "final"
    spend_log_path = output_dir / SPEND_LOG_NAME
    run_summaries_dir = output_dir / RUN_SUMMARIES_DIR_NAME
    api_logs_dir = output_dir / API_LOGS_DIR_NAME

    input_dir.mkdir(parents=True, exist_ok=True)
    generated_dir.mkdir(parents=True, exist_ok=True)
    selected_dir.mkdir(parents=True, exist_ok=True)
    upscaled_dir.mkdir(parents=True, exist_ok=True)
    final_dir.mkdir(parents=True, exist_ok=True)
    run_summaries_dir.mkdir(parents=True, exist_ok=True)
    api_logs_dir.mkdir(parents=True, exist_ok=True)

    reference_images = collect_reference_images(input_dir)
    kyc_path = collect_kyc_document(input_dir)
    prompt = build_prompt(kyc_path)

    if not reference_images:
        raise RuntimeError(
            f"No supported reference images found in {input_dir}. "
            "Add up to 4 files with extensions: .png, .jpg, .jpeg, .webp"
        )

    print(f"Using {len(reference_images)} reference image(s).")
    if kyc_path:
        print(f"Using KYC document: {kyc_path.name}")
    else:
        print("No KYC document found. Continuing with BASE_PROMPT only.")

    generated_images = generate_images_from_references(
        prompt=prompt,
        reference_images=reference_images,
        generated_dir=generated_dir,
        spend_log_path=spend_log_path,
        run_summaries_dir=run_summaries_dir,
        api_logs_dir=api_logs_dir,
        kyc_path=kyc_path,
    )

    auto_final_paths: list[str] = []
    for image_path in generated_images:
        try:
            auto_final_paths.append(str(create_sharpened_final(image_path, final_dir)))
        except Exception as exc:
            print(f"Failed to auto-create final image for {image_path.name}: {exc}")

    mode_config = current_mode_config()
    print(
        f"Generated {len(generated_images)} image(s) at {mode_config['size']} "
        f"using mode={current_run_mode()}, model={mode_config['model']}."
    )
    print(f"Review generated images in {generated_dir}")
    print(f"Copy only the images you want into {selected_dir}")

    selected_images = collect_selected_images(selected_dir)
    if not selected_images:
        print("No selected images found for upscaling. Skipping upscale step.")
        return {
            "backend": "bfl_flux_api",
            "mode": current_run_mode(),
            "model": mode_config["model"],
            "size": mode_config["size"],
            "generated_images": [str(path) for path in generated_images],
            "auto_final_images": auto_final_paths,
            "selected_images": [],
            "upscaled_count": 0,
            "generated_dir": str(generated_dir),
            "selected_dir": str(selected_dir),
            "upscaled_dir": str(upscaled_dir),
            "final_dir": str(final_dir),
            "spend_log": str(spend_log_path),
        }

    upscaled_count = 0
    for image_path in selected_images:
        try:
            process_image(image_path, upscaled_dir, final_dir)
            upscaled_count += 1
        except Exception as exc:
            print(f"Failed on {image_path.name}: {exc}")

    print(f"Upscaled {upscaled_count} selected image(s).")
    return {
        "backend": "bfl_flux_api",
        "mode": current_run_mode(),
        "model": mode_config["model"],
        "size": mode_config["size"],
        "generated_images": [str(path) for path in generated_images],
        "auto_final_images": auto_final_paths,
        "selected_images": [str(path) for path in selected_images],
        "upscaled_count": upscaled_count,
        "generated_dir": str(generated_dir),
        "selected_dir": str(selected_dir),
        "upscaled_dir": str(upscaled_dir),
        "final_dir": str(final_dir),
        "spend_log": str(spend_log_path),
    }


def main() -> None:
    project_dir = Path(__file__).resolve().parent
    load_dotenv(project_dir / ".env")
    run_generation_pipeline(project_dir)


if __name__ == "__main__":
    main()
