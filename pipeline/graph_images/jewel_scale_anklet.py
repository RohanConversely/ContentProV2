#!/usr/bin/env python3

import argparse
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT_PATHS = [
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/noto/NotoSans-Regular.ttf",
]

BOLD_FONT_PATHS = [
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/noto/NotoSans-Bold.ttf",
]


def find_font():
    for p in FONT_PATHS:
        if os.path.exists(p):
            return p
    return None


def load_font(size):
    path = find_font()
    if path:
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def load_bold_font(size):
    for path in BOLD_FONT_PATHS:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return load_font(size)


def remove_background(img, threshold=242):
    img = img.convert("RGBA")
    data = np.array(img)
    r = data[:, :, 0].astype(float)
    g = data[:, :, 1].astype(float)
    b = data[:, :, 2].astype(float)
    lum = (r + g + b) / 3.0

    cutoff = threshold - 17
    alpha = np.where(
        lum > threshold, 0,
        np.where(lum > cutoff,
                 np.clip((threshold + 6 - lum) * 11, 0, 255).astype(np.uint8),
                 255)
    )
    data[:, :, 3] = alpha.astype(np.uint8)
    result = Image.fromarray(data)

    channels = list(result.split())
    channels[3] = channels[3].filter(ImageFilter.GaussianBlur(radius=0.4))
    return Image.merge("RGBA", channels)


def trim_transparent_bounds(img, alpha_threshold=8):
    alpha = np.array(img.getchannel("A"))
    ys, xs = np.where(alpha > alpha_threshold)
    if len(xs) == 0 or len(ys) == 0:
        return img

    left = int(xs.min())
    top = int(ys.min())
    right = int(xs.max()) + 1
    bottom = int(ys.max()) + 1
    return img.crop((left, top, right, bottom))


def format_cm(value_mm):
    value_cm = float(value_mm) / 10.0
    return f"{value_cm:.2f}".rstrip("0").rstrip(".")


def format_plain_cm(value_cm):
    return f"{float(value_cm):.2f}".rstrip("0").rstrip(".")


def build_text_lines(args):
    if args.label_mode == "necklace":
        chain_line = f"Chain Length: {format_plain_cm(args.chain_length)} cm"
        if args.adjustable:
            chain_line += " + Adjustable"
        lines = [chain_line]
        if args.overall_height is not None and args.motif_width is not None:
            lines.append(f"Pendant: {format_cm(args.overall_height)} x {format_cm(args.motif_width)} cm")
        return lines
    if args.label_mode == "necklace_set":
        lines = [f"Length of Chain: {format_plain_cm(args.chain_length)} cm"]
        if (
            args.overall_width is not None
            and args.overall_height is not None
            and args.earring_width is not None
            and args.earring_height is not None
        ):
            lines.append(
                f"Motif: {format_cm(args.overall_width)} x {format_cm(args.overall_height)} cm, "
                f"Earring: {format_cm(args.earring_width)} x {format_cm(args.earring_height)} cm"
            )
        return lines

    chain_line = f"Length of Chain: {format_plain_cm(args.chain_length)} cm"
    if args.adjustable:
        chain_line += " + Adjustable"
    lines = [chain_line]
    if args.motif_width is not None and args.overall_width is not None:
        lines.append(f"Charm: {format_cm(args.motif_width)} x {format_cm(args.overall_width)} cm")
    return lines


def compute_resize_dimensions(src_w, src_h, target_w, target_h, coverage):
    if src_w <= 0 or src_h <= 0:
        raise ValueError("Source image dimensions must be positive.")

    fit_scale = min(target_w / src_w, target_h / src_h)
    applied_scale = fit_scale * coverage
    img_w = max(1, int(round(src_w * applied_scale)))
    img_h = max(1, int(round(src_h * applied_scale)))
    return img_w, img_h


def main():
    parser = argparse.ArgumentParser(description="Center anklet on fixed reference image")

    parser.add_argument("--input", "-i", required=True, help="New jewelry image")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--motif-width", type=float, help="Motif width in mm")
    parser.add_argument("--overall-width", type=float, help="Overall width in mm")
    parser.add_argument("--overall-height", type=float, help="Overall height in mm")
    parser.add_argument("--earring-width", type=float, help="Earring width in mm")
    parser.add_argument("--earring-height", type=float, help="Earring height in mm")
    parser.add_argument("--chain-length", type=float, required=True, help="Chain length in cm")
    parser.add_argument("--adjustable", "-a", action="store_true")
    parser.add_argument("--label-mode", choices=["anklet", "necklace", "necklace_set"], default="anklet")
    parser.add_argument("--coverage", "-c", type=float, default=0.85)
    parser.add_argument("--bg-thresh", type=int, default=242)

    args = parser.parse_args()
    if args.label_mode not in {"anklet", "necklace", "necklace_set"}:
        print("Error: invalid --label-mode")
        sys.exit(1)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ref_path = os.path.join(script_dir, "ref_anklet.png")

    for path, label in [(ref_path, "Reference"), (args.input, "Input")]:
        if not os.path.exists(path):
            print(f"Error: {label} not found: {path}")
            sys.exit(1)

    template = Image.open(ref_path).convert("RGBA")
    tw, th = template.size
    jewelry = Image.open(args.input).convert("RGBA")

    jewelry_clean = remove_background(jewelry, threshold=args.bg_thresh)
    jewelry_clean = trim_transparent_bounds(jewelry_clean)

    ow, oh = jewelry_clean.size
    target_w = tw * args.coverage
    target_h = th * args.coverage
    img_w, img_h = compute_resize_dimensions(ow, oh, target_w, target_h, 1.0)
    jewelry_resized = jewelry_clean.resize((img_w, img_h), Image.LANCZOS)

    ring_x = (tw - img_w) // 2
    ring_y = (th - img_h) // 2 + max(10, int(th * 0.02))

    template.paste(jewelry_resized, (ring_x, ring_y), jewelry_resized)

    text_lines = build_text_lines(args)

    final = Image.new("RGB", (tw, th), (255, 255, 255))
    final.paste(template, (0, 0), template)

    font = load_bold_font(max(14, th // 45))
    draw_final = ImageDraw.Draw(final)
    text_x = max(20, int(tw * 0.08))
    text_y = int(th * 0.90)
    line_gap = max(6, int(font.size * 0.35))
    current_y = text_y
    for line in text_lines:
        draw_final.text((text_x, current_y), line, fill=(50, 50, 50), font=font)
        bbox = draw_final.textbbox((text_x, current_y), line, font=font)
        current_y += (bbox[3] - bbox[1]) + line_gap

    if args.output:
        out_path = args.output
    else:
        base = os.path.splitext(os.path.basename(args.input))[0]
        out_dir = os.path.dirname(os.path.abspath(args.input))
        out_path = os.path.join(out_dir, f"{base}_scaled.png")

    final.save(out_path, "PNG", quality=95)
    print(f"Saved: {out_path}")


if __name__ == "__main__":
    main()
