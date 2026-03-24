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


def find_ruler_geometry(gray):
    h, w = gray.shape

    best_row = 0
    best_count = 0
    for y in range(h // 3, h):
        count = (gray[y, :] < 200).sum()
        if count > best_count:
            best_count = count
            best_row = y

    h_ruler_rows = []
    for y in range(max(0, best_row - 30), min(h, best_row + 30)):
        if (gray[y, :] < 253).sum() > w * 0.3:
            h_ruler_rows.append(y)

    if not h_ruler_rows:
        h_ruler_rows = [best_row]

    h_ruler_top = min(h_ruler_rows)

    ruler_row = gray[best_row, :]
    dark_xs = np.where(ruler_row < 200)[0]
    if len(dark_xs) == 0:
        dark_xs = np.where(ruler_row < 253)[0]

    h_ruler_left = int(dark_xs.min()) if len(dark_xs) > 0 else w // 6
    h_ruler_right = int(dark_xs.max()) if len(dark_xs) > 0 else w * 5 // 6

    h_ruler_span = h_ruler_right - h_ruler_left
    px_per_cm = h_ruler_span / 4.0

    search_left = max(0, h_ruler_left)
    search_right = min(w - 1, h_ruler_left + max(8, int(px_per_cm * 1.1)))
    y_top = max(0, best_row - max(10, int(px_per_cm * 4.5)))
    y_bottom = best_row + 1

    col_dark_counts = []
    for x in range(search_left, search_right + 1):
        col_dark_counts.append(int((gray[y_top:y_bottom, x] < 200).sum()))

    if col_dark_counts:
        max_count = max(col_dark_counts)
        if max_count > 0:
            strong_cols = [
                search_left + idx
                for idx, count in enumerate(col_dark_counts)
                if count >= max(3, int(max_count * 0.9))
            ]
            v_intersection_x = max(strong_cols) if strong_cols else h_ruler_left
        else:
            v_intersection_x = h_ruler_left
    else:
        v_intersection_x = h_ruler_left

    vertical_shift_dx = max(0, v_intersection_x - h_ruler_left)

    return {
        "origin_x": h_ruler_left,
        "origin_y": h_ruler_top,
        "px_per_cm": px_per_cm,
        "h_ruler_right": h_ruler_right,
        "v_intersection_x": v_intersection_x,
        "vertical_shift_dx": vertical_shift_dx,
    }


def find_dim_text_top(gray):
    h, w = gray.shape
    start = int(h * 0.85)
    for y in range(start, h):
        if (gray[y, :] < 200).sum() > 10:
            return y - 5
    return int(h * 0.90)


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


def build_dim_text(args):
    if args.dim_text:
        return args.dim_text

    parts = []
    if args.diameter:
        if "-" in args.diameter:
            lo, hi = args.diameter.split("-")
            mid = (float(lo) + float(hi)) / 2
            parts.append(f"Dimensions : {mid / 10:.1f} cm")
        else:
            d = float(args.diameter)
            parts.append(f"Dimensions : {d / 10:.1f} cm")
    elif args.width and args.height:
        parts.append(f"Dimensions : {args.width / 10:.1f} x {args.height / 10:.1f} cm")
    elif args.width:
        parts.append(f"Dimensions : {args.width / 10:.1f} cm")
    elif args.height:
        parts.append(f"Dimensions : {args.height / 10:.1f} cm")

    if args.adjustable:
        parts.append("+ Adjustable")

    return " ".join(parts)


def get_size_px(args, px_per_cm):
    if args.diameter:
        if "-" in args.diameter:
            lo, hi = args.diameter.split("-")
            d = (float(lo) + float(hi)) / 2
        else:
            d = float(args.diameter)
        s = (d / 10.0) * px_per_cm
        return s, s

    w = args.width or args.height or 15
    h = args.height or args.width or 15
    return (w / 10.0) * px_per_cm, (h / 10.0) * px_per_cm


def main():
    parser = argparse.ArgumentParser(description="Swap jewelry in a ruler scale image")

    parser.add_argument("--ref", "-r", required=True, help="Reference template image with ruler")
    parser.add_argument("--input", "-i", required=True, help="New jewelry image")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--diameter", "-d", help="Diameter in mm, e.g. 16 or 12-15")
    parser.add_argument("--width", "-W", type=float, help="Width in mm")
    parser.add_argument("--height", "-H", type=float, help="Height in mm")
    parser.add_argument("--adjustable", "-a", action="store_true")
    parser.add_argument("--coverage", "-c", type=float, default=0.87)
    parser.add_argument("--dim-text", help="Custom dimension text")
    parser.add_argument("--bg-thresh", type=int, default=242)

    args = parser.parse_args()

    for path, label in [(args.ref, "Reference"), (args.input, "Input")]:
        if not os.path.exists(path):
            print(f"Error: {label} not found: {path}")
            sys.exit(1)

    if not args.diameter and not args.width and not args.height:
        print("Error: provide --diameter or --width/--height")
        sys.exit(1)

    template = Image.open(args.ref).convert("RGBA")
    tw, th = template.size
    jewelry = Image.open(args.input).convert("RGBA")

    gray = np.array(template.convert("L")).astype(float)
    ruler = find_ruler_geometry(gray)

    jewelry_clean = remove_background(jewelry, threshold=args.bg_thresh)
    jewelry_clean = trim_transparent_bounds(jewelry_clean)

    target_w, target_h = get_size_px(args, ruler["px_per_cm"])
    ow, oh = jewelry_clean.size
    aspect = oh / ow
    img_w = int(target_w / args.coverage)
    img_h = int(img_w * aspect)
    jewelry_resized = jewelry_clean.resize((img_w, img_h), Image.LANCZOS)

    # Shift product by distance from horizontal-left edge to ruler intersection point
    ring_x = int(ruler["origin_x"] + ruler["vertical_shift_dx"])
    ring_y = ruler["origin_y"] - img_h

    template.paste(jewelry_resized, (ring_x, ring_y), jewelry_resized)

    dim_text = build_dim_text(args)

    final = Image.new("RGB", (tw, th), (255, 255, 255))
    final.paste(template, (0, 0), template)

    font = load_bold_font(max(14, th // 45))
    draw_final = ImageDraw.Draw(final)
    bbox = draw_final.textbbox((0, 0), dim_text, font=font)
    text_w = bbox[2] - bbox[0]
    draw_final.text((max(20, int(tw * 0.08)), int(th * 0.93)), dim_text, fill=(50, 50, 50), font=font)

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
