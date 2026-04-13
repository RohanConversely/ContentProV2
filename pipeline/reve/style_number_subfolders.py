#!/usr/bin/env python3
import argparse
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
STYLE_PREFIX = "KACP27- "
DEFAULT_INPUT_FOLDER = Path("/home/anhad/edxso/contentpro/bathmats/selected_results")
OUTPUT_ROOT_NAME = "styled_number_outputs"


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


def _draw_style_number(source_image_path: Path, output_image_path: Path, style_number: str) -> None:
    with Image.open(source_image_path) as image:
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

        output_image_path.parent.mkdir(parents=True, exist_ok=True)
        rendered.save(output_image_path, format="PNG", optimize=True)


def _create_run_output_folder(root_folder: Path) -> Path:
    run_stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    output_root = root_folder.parent / OUTPUT_ROOT_NAME
    output_dir = output_root / f"run_{run_stamp}"
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def _iter_subfolders(root_folder: Path) -> list[Path]:
    return sorted([p for p in root_folder.iterdir() if p.is_dir()], key=lambda p: p.name.lower())


def _iter_images(folder: Path) -> list[Path]:
    return sorted(
        [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in SUPPORTED_IMAGE_EXTS],
        key=lambda p: p.name.lower(),
    )


def apply_style_numbers(root_folder: Path) -> None:
    if not root_folder.exists() or not root_folder.is_dir():
        raise ValueError(f"Input folder does not exist or is not a directory: {root_folder}")

    subfolders = _iter_subfolders(root_folder)
    output_dir = _create_run_output_folder(root_folder)
    print(f"Output folder: {output_dir}")

    if not subfolders:
        images = _iter_images(root_folder)
        if not images:
            print(f"No subfolders and no supported images found in: {root_folder}")
            return

        total_processed = 0
        for index, image_path in enumerate(images, start=1):
            style_number = f"{STYLE_PREFIX}{index:03d}"
            output_image_path = output_dir / root_folder.name / f"{image_path.stem}.png"
            _draw_style_number(image_path, output_image_path, style_number)
            total_processed += 1

        print(
            f"{root_folder.name}: applied sequential style numbers from "
            f"{STYLE_PREFIX}001 to {STYLE_PREFIX}{len(images):03d} across {len(images)} image(s)"
        )
        print(f"Done. Processed {total_processed} image(s).")
        print(f"Saved styled images to: {output_dir}")
        return

    total_processed = 0
    for index, subfolder in enumerate(subfolders, start=1):
        style_number = f"{STYLE_PREFIX}{index:03d}"
        images = _iter_images(subfolder)

        if not images:
            print(f"Skipping {subfolder.name}: no supported images")
            continue

        for image_path in images:
            output_image_path = output_dir / subfolder.name / f"{image_path.stem}.png"
            _draw_style_number(image_path, output_image_path, style_number)
            total_processed += 1

        print(f"{subfolder.name}: applied {style_number} to {len(images)} image(s)")

    print(f"Done. Processed {total_processed} image(s).")
    print(f"Saved styled images to: {output_dir}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Apply style numbers to images in each subfolder. "
        "Each subfolder gets one style number for all its images."
    )
    parser.add_argument(
        "input_folder",
        nargs="?",
        type=Path,
        default=DEFAULT_INPUT_FOLDER,
        help="Folder containing subfolders of images (optional if DEFAULT_INPUT_FOLDER is set)",
    )
    args = parser.parse_args()
    apply_style_numbers(args.input_folder.resolve())


if __name__ == "__main__":
    main()
