from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


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


def apply_style_number_overlay(image_path: Path, style_number: str) -> None:
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
