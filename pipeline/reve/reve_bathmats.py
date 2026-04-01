#!/usr/bin/env python3
import base64
import argparse
import logging
import os
import shutil
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageStat

from image_rescaler import SUPPORTED_IMAGE_EXTS, prepare_reference_images

load_dotenv()

try:
    import pytesseract
except ImportError:
    pytesseract = None

MAX_PROMPT_CHARS = 2560
SAFE_ZONE_GUIDANCE = (
    "Composition rule: keep one image corner or bottom edge visually calm with low texture, "
    "minimal detail, and no object overlap, suitable for a small style-number label."
)
COLOR_FIDELITY_GUIDANCE = (
    "Strict requirement: preserve the exact original product color tones and hues with no recoloring, "
    "no tint shift, and no saturation change."
)

SHOT_REQUIREMENTS = {
    1: "Shot 1 - LIFESTYLE BATHROOM (FRONT-LEANING VIEW): Strictly preserve the original bathmat design, shape, tufting texture, color, and motif. Absolute design fidelity required. Keep the bathmat laid horizontally in frame. Compose the shot from a slightly front-facing perspective at roughly a 30-degree viewing angle, while still showing tasteful bathroom background context. Place the mat flat on a clean light-toned bathroom floor in front of a freestanding bathtub or bath area. Include minimal, tasteful bathroom props such as a wicker basket with rolled white towels, a small potted plant, and neutral slippers beside the mat — no prop may overlap or obscure the mat. Use warm natural lighting. Maintain premium editorial home décor photography quality.",
    2: "Shot 2 - STYLED TOP VIEW (HIGH ANGLE): Strictly preserve the original bathmat design, shape, tufting texture, color, and motif. Absolute design fidelity required. Keep the bathmat laid horizontally in frame. Compose the shot from a high-angle near-top view around 60 degrees, with the environment still visible as soft background context. Place the mat flat on a clean light-toned bathroom floor in front of a freestanding bathtub or bath area. Add one or two props for variety, for example a folded towel and soap dish or a trailing green plant, while ensuring no prop overlaps the mat. Use soft, even premium lighting and maintain clean editorial styling.",
    3: "Shot 3 - FLAT LAY STYLED: Strictly preserve the original bathmat design, shape, tufting texture, color, and motif. Absolute design fidelity required. Create a top-down flat lay shot of the mat laid on a light-toned wooden or hexagonal tile floor. Surround the mat with minimal complementary lifestyle props such as a folded white towel, a small soap dish, and a green trailing plant — all placed around the mat without overlapping it. Use soft even lighting with no harsh shadows. Maintain clean, premium home décor editorial photography quality.",
    4: "Shot 4 - LOW ANGLE DEPTH HERO: Strictly preserve the original bathmat design, shape, tufting texture, color, and motif. Absolute design fidelity required. Place the bathmat flat on a premium bathroom floor (stone, terrazzo, or matte tile). Compose from a low angle around 10–20 degrees to create depth and dimension, with the mat in sharp foreground focus and background softly blurred. Include a freestanding bathtub edge or vanity in the background, softly out of focus. Use directional natural light (window light) to create soft shadows and highlight pile depth. Keep props minimal and distant (e.g., a towel or plant in background only, not near edges). Maintain a premium editorial, slightly cinematic feel.",
    5: "Shot 5 - MACRO TEXTURE DETAIL: Strictly preserve the original bathmat design, shape, tufting texture, color, and motif. Absolute design fidelity required. Create a close-up crop-style composition (while still keeping the full mat visible within frame) where one section of the mat is closer to camera, emphasizing tufted pile height, softness, and fiber detail. Use a shallow depth of field with front area crisp and background gently softened. Lighting should be soft directional light to enhance texture without harsh contrast. No props overlapping; optional very minimal blurred background context only. Maintain hyper-realistic material fidelity and premium textile photography quality.",
    6: "Shot 6 - IN-USE FOOT INTERACTION: Strictly preserve the original bathmat design, shape, tufting texture, color, and motif. Absolute design fidelity required. Place the mat flat on a clean bathroom floor beside a bathtub or shower area. Include a single human element: one bare foot gently stepping onto the mat from edge or corner, showing softness and scale. Ensure the foot does not obscure key design elements. Keep the rest of the scene minimal with soft lifestyle context (e.g., towel on tub, subtle plant). Use natural daylight with soft shadows. Maintain premium, hygienic, aspirational bathroom styling.",
    7: "Shot 7 - MINIMAL SPA SETTING: Strictly preserve the original bathmat design, shape, tufting texture, color, and motif. Absolute design fidelity required. Place the mat in a serene, spa-like bathroom setting with a very clean, minimal composition. Use neutral tones (warm whites, beige, soft stone textures). Include 1–2 refined props such as rolled white towels, a candle, or a small ceramic vase—placed far from the mat with no overlap. Emphasize negative space and calm composition. Use soft diffused lighting with almost no harsh shadows.Ensure the color of the product stays same as in the reference image, and is not affected by the lighting. Compose the shot from a 3/4 oblique angle (~45°), showing both length and width with natural depth perspective while keeping the full bathmat clearly visible. The overall mood should feel premium, airy, and high-end."
}
ACTIVE_SHOT_IDS = (1, 2, 7)


def _setup_logger(pipeline_dir: Path) -> logging.Logger:
    storage_dir = pipeline_dir / "storage"
    storage_dir.mkdir(parents=True, exist_ok=True)

    log_file = storage_dir / f"reve_bathmats_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    logger = logging.getLogger("reve_bathmats")
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


def _build_iteration_prompt(base_prompt: str, shot_instruction: str, logger: logging.Logger) -> str:
    prompt = (
        f"{base_prompt}\n\n{shot_instruction}\n\n{SAFE_ZONE_GUIDANCE}\n\n{COLOR_FIDELITY_GUIDANCE}"
    ).strip()
    if len(prompt) > MAX_PROMPT_CHARS:
        logger.warning(
            "Composed prompt exceeded %d chars (%d). Truncating.",
            MAX_PROMPT_CHARS,
            len(prompt),
        )
        prompt = prompt[:MAX_PROMPT_CHARS]
    return prompt


def _style_no_for_product(product_index: int) -> str:
    return f"KSC- 26-H{product_index}"


def _load_bold_font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("DejaVuSans-Bold.ttf", size)
    except OSError:
        return ImageFont.load_default()


def _load_montserrat_semibold(size: int) -> ImageFont.ImageFont:
    candidates = [
        "Montserrat-SemiBold.ttf",
        "/usr/share/fonts/truetype/montserrat/Montserrat-SemiBold.ttf",
        "/usr/local/share/fonts/Montserrat-SemiBold.ttf",
        str(Path(__file__).parent / "Montserrat-SemiBold.ttf"),
        str(Path(__file__).parent / "fonts" / "Montserrat-SemiBold.ttf"),
    ]
    for font_path in candidates:
        try:
            return ImageFont.truetype(font_path, size)
        except OSError:
            continue
    return _load_bold_font(size)


def _normalize_text(text: str) -> str:
    return "".join(ch for ch in text.upper() if ch.isalnum())


def _text_match_score(expected: str, observed: str) -> float:
    exp = _normalize_text(expected)
    obs = _normalize_text(observed)
    if not exp:
        return 0.0
    common = sum(1 for ch in exp if ch in obs)
    return common / max(1, len(exp))


def _ocr_label_text(image: Image.Image, label_bbox: tuple[int, int, int, int]) -> tuple[bool, str]:
    if pytesseract is None:
        return False, ""
    patch = image.crop(label_bbox).convert("L")
    try:
        recognized = pytesseract.image_to_string(
            patch,
            config="--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:- ",
        )
    except Exception:
        return False, ""
    return True, recognized.strip()


def _edge_density_score(image: Image.Image, region_bbox: tuple[int, int, int, int]) -> float:
    region = image.crop(region_bbox).convert("L")
    edges = region.filter(ImageFilter.FIND_EDGES)
    stat = ImageStat.Stat(edges)
    mean_edge = stat.mean[0]
    std_edge = stat.stddev[0] if stat.stddev else 0.0
    return float(mean_edge + 0.35 * std_edge)


def _region_luminance(image: Image.Image, region_bbox: tuple[int, int, int, int]) -> float:
    region = image.crop(region_bbox).convert("L")
    return float(ImageStat.Stat(region).mean[0])


def _candidate_chips(width: int, height: int, chip_w: int, chip_h: int, margin: int) -> list[tuple[int, int]]:
    return [
        (margin, height - chip_h - margin),
        (width - chip_w - margin, height - chip_h - margin),
        (margin, margin),
        (width - chip_w - margin, margin),
        ((width - chip_w) // 2, height - chip_h - margin),
    ]


def _choose_chip_style(image: Image.Image, bbox: tuple[int, int, int, int]) -> tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]:
    luminance = _region_luminance(image, bbox)
    if luminance >= 140:
        bg = (28, 28, 28)
        fg = (245, 245, 245)
        stroke = (235, 235, 235)
    else:
        bg = (245, 245, 245)
        fg = (20, 20, 20)
        stroke = (35, 35, 35)
    return bg, fg, stroke


def _render_chip(
    image: Image.Image,
    label_text: str,
    font_size: int,
    x: int,
    y: int,
    chip_w: int,
    chip_h: int,
    apply_blur_backing: bool,
) -> tuple[Image.Image, tuple[int, int, int, int]]:
    working = image.copy()
    draw = ImageDraw.Draw(working)
    bbox = (x, y, x + chip_w, y + chip_h)
    bg, fg, stroke = _choose_chip_style(working, bbox)

    if apply_blur_backing:
        patch = working.crop(bbox).filter(ImageFilter.GaussianBlur(radius=4.0))
        working.paste(patch, (x, y))

    radius = max(8, chip_h // 4)
    draw.rounded_rectangle(bbox, radius=radius, fill=bg, outline=stroke, width=2)
    font = _load_bold_font(font_size)
    text_x = x + max(12, int(chip_w * 0.05))
    text_y = y + chip_h // 2
    draw.text(
        (text_x, text_y),
        label_text,
        fill=fg,
        font=font,
        anchor="lm",
        stroke_width=1,
        stroke_fill=stroke,
    )
    return working, bbox


def _draw_style_number(image_path: Path, style_number: str) -> None:
    with Image.open(image_path) as image:
        rendered = image.convert("RGB")
        draw = ImageDraw.Draw(rendered)
        label_text = f"STYLE NO : {style_number}"
        w, h = rendered.size

        font_size = max(22, h // 28)
        font = _load_montserrat_semibold(font_size)
        letter_spacing = max(1, int(round(font_size * 0.03)))
        fill_color = (58, 58, 58)

        x = max(20, int(w * 0.03))
        baseline_y = h - max(20, int(h * 0.035))

        cursor_x = x
        for ch in label_text:
            draw.text((cursor_x, baseline_y), ch, fill=fill_color, font=font, anchor="ls")
            ch_bbox = draw.textbbox((cursor_x, baseline_y), ch, font=font, anchor="ls")
            ch_width = max(1, ch_bbox[2] - ch_bbox[0])
            cursor_x += ch_width + letter_spacing

        rendered.save(image_path, format="PNG", optimize=True)


def _prepare_single_reference_image(image_path: Path, temp_root: Path, logger: logging.Logger) -> list[str]:
    if image_path.suffix.lower() not in SUPPORTED_IMAGE_EXTS:
        return []

    temp_product_dir = temp_root / image_path.stem
    temp_product_dir.mkdir(parents=True, exist_ok=True)
    temp_image_path = temp_product_dir / image_path.name
    shutil.copy2(image_path, temp_image_path)
    return prepare_reference_images(temp_product_dir, logger, max_images=1)


def _save_raw_image_png(source_image: Path, destination_path: Path) -> None:
    with Image.open(source_image) as image:
        image.convert("RGB").save(destination_path, format="PNG", optimize=True)


def run_reve_generation(limit: int | None = None) -> None:
    pipeline_dir = Path(__file__).parent
    logger = _setup_logger(pipeline_dir)

    prompt_file = pipeline_dir / "bathmats_prompt.txt"
    image_folder = pipeline_dir / "sample_bathmats"
    run_stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = pipeline_dir / "generated_images_reve" / f"bathmats_run_{run_stamp}"
    temp_ref_root = pipeline_dir / "storage" / f"bathmats_refs_{run_stamp}"
    output_dir.mkdir(parents=True, exist_ok=True)
    temp_ref_root.mkdir(parents=True, exist_ok=True)
    logger.info("Output directory: %s", output_dir.resolve())

    if not prompt_file.exists():
        logger.error("Prompt file not found at %s", prompt_file)
        return

    with prompt_file.open("r", encoding="utf-8") as handle:
        base_prompt = handle.read().strip()
    logger.info("Base prompt loaded from %s (%d chars)", prompt_file, len(base_prompt))

    if not image_folder.exists():
        logger.error("Input image folder not found: %s", image_folder)
        return

    source_images = sorted(
        p for p in image_folder.iterdir() if p.is_file() and p.suffix.lower() in SUPPORTED_IMAGE_EXTS
    )
    if not source_images:
        logger.error("No supported images found in %s", image_folder)
        return
    if limit is not None:
        source_images = source_images[: max(0, limit)]
        if not source_images:
            logger.error("No images selected after applying limit=%s", limit)
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

    total_products = len(source_images)
    active_shots = [(shot_id, SHOT_REQUIREMENTS[shot_id]) for shot_id in ACTIVE_SHOT_IDS if shot_id in SHOT_REQUIREMENTS]
    logger.info("Starting generation for %d products and %d shots each", total_products, len(active_shots))

    for product_index, source_image in enumerate(source_images, start=1):
        style_number = _style_no_for_product(product_index)
        logger.info("Product %d/%d | %s | Style %s", product_index, total_products, source_image.name, style_number)

        encoded_images = _prepare_single_reference_image(source_image, temp_ref_root, logger)
        if not encoded_images:
            logger.error("Skipping %s: failed to prepare reference image", source_image.name)
            continue

        product_output_dir = output_dir / f"H{product_index:02d}_{source_image.stem}"
        raw_image_dir = product_output_dir / "Raw Image"
        generated_images_dir = product_output_dir / "Generated Images"
        raw_image_dir.mkdir(parents=True, exist_ok=True)
        generated_images_dir.mkdir(parents=True, exist_ok=True)

        raw_image_path = raw_image_dir / "Image_1.png"
        try:
            _save_raw_image_png(source_image, raw_image_path)
            logger.info("Saved raw image %s", raw_image_path.resolve())
        except Exception as exc:  # pylint: disable=broad-exception-caught
            logger.error("Failed to save raw image for %s: %s", source_image.name, exc)

        generated_image_index = 1
        for shot_index, shot_instruction in active_shots:
            full_prompt = _build_iteration_prompt(base_prompt, shot_instruction, logger)
            payload = {
                "prompt": full_prompt,
                "reference_images": encoded_images,
                "aspect_ratio": "1:1",
                "version": "latest",
                "postprocessing": [{"process": "upscale", "upscale_factor": 2}],
            }

            logger.info(
                "Product %d/%d | Shot %d/%d | Sending request",
                product_index,
                total_products,
                shot_index,
                len(active_shots),
            )

            try:
                response = requests.post(url, headers=headers, json=payload, timeout=120)
                response.raise_for_status()
            except requests.RequestException as exc:
                body = ""
                if getattr(exc, "response", None) is not None:
                    body = exc.response.text
                logger.error("Product %s shot %d failed: %s", source_image.name, shot_index, exc)
                if body:
                    logger.error("Product %s shot %d response body: %s", source_image.name, shot_index, body)
                continue

            try:
                response_data = response.json()
            except ValueError:
                logger.error("Product %s shot %d: invalid JSON response", source_image.name, shot_index)
                continue

            decoded_images = _extract_base64_images(response_data)
            if not decoded_images or not decoded_images[0]:
                logger.error("Product %s shot %d: no image payload", source_image.name, shot_index)
                continue

            output_path = generated_images_dir / f"Image_{generated_image_index}.png"
            try:
                output_path.write_bytes(base64.b64decode(decoded_images[0]))
                _draw_style_number(output_path, style_number)
                logger.info("Saved %s", output_path.resolve())
                generated_image_index += 1
            except Exception as exc:  # pylint: disable=broad-exception-caught
                logger.error("Product %s shot %d: save/post-process failed: %s", source_image.name, shot_index, exc)

    logger.info("Bathmats generation run completed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run REVE generation for bathmats.")
    parser.add_argument("--limit", type=int, default=None, help="Process only first N images.")
    cli_args = parser.parse_args()
    run_reve_generation(limit=cli_args.limit)
