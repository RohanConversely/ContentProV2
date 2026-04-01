import re
from pathlib import Path

from reportlab.platypus import SimpleDocTemplate, Image, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet

styles = getSampleStyleSheet()

# -------- TEMPLATE 1: HERO + 2 SUPPORTING --------
def template_hero_layout(pdf_path, product_name, img1, img2, img3):
    doc = SimpleDocTemplate(pdf_path, pagesize=A4)
    elements = []

    elements.append(Paragraph(f"<b>{product_name}</b>", styles['Title']))
    elements.append(Spacer(1, 10))

    hero = Image(img1, width=400, height=250)
    side1 = Image(img2, width=190, height=120)
    side2 = Image(img3, width=190, height=120)

    table = Table([
        [hero],
        [side1, side2]
    ])

    elements.append(table)
    doc.build(elements)


# -------- TEMPLATE 2: GRID STYLE --------
def template_grid(pdf_path, product_name, images):
    doc = SimpleDocTemplate(pdf_path, pagesize=A4)
    elements = []

    elements.append(Paragraph(f"<b>{product_name}</b>", styles['Title']))
    elements.append(Spacer(1, 10))

    imgs = [Image(img, width=180, height=180) for img in images]

    table = Table([
        imgs
    ])

    elements.append(table)
    doc.build(elements)


# -------- TEMPLATE 3: LUXURY MINIMAL --------
def template_minimal(pdf_path, product_name, img_main):
    doc = SimpleDocTemplate(pdf_path, pagesize=A4)
    elements = []

    elements.append(Spacer(1, 100))
    elements.append(Paragraph(f"<b>{product_name}</b>", styles['Heading1']))
    elements.append(Spacer(1, 40))

    main_img = Image(img_main, width=350, height=220)
    elements.append(main_img)

    doc.build(elements)


# -------- TEMPLATE 4: FEATURE STRIP --------
def template_feature_strip(pdf_path, product_name, img1, img2, img3):
    doc = SimpleDocTemplate(pdf_path, pagesize=A4)
    elements = []

    elements.append(Paragraph(f"<b>{product_name}</b>", styles['Title']))
    elements.append(Spacer(1, 20))

    imgs = [
        Image(img1, width=150, height=150),
        Image(img2, width=150, height=150),
        Image(img3, width=150, height=150)
    ]

    table = Table([imgs])
    table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey)
    ]))

    elements.append(table)
    doc.build(elements)


# -------- TEMPLATE 5: STORY FLOW --------
def template_story(pdf_path, product_name, img1, img2, img3):
    doc = SimpleDocTemplate(pdf_path, pagesize=A4)
    elements = []

    elements.append(Paragraph(f"<b>{product_name}</b>", styles['Title']))
    elements.append(Spacer(1, 20))

    elements.append(Paragraph("Lifestyle View", styles['Heading3']))
    elements.append(Image(img1, width=350, height=200))

    elements.append(Spacer(1, 20))

    elements.append(Paragraph("Top View", styles['Heading3']))
    elements.append(Image(img2, width=350, height=200))

    elements.append(Spacer(1, 20))

    elements.append(Paragraph("Detail View", styles['Heading3']))
    elements.append(Image(img3, width=350, height=200))

    doc.build(elements)


def _extract_index(image_path: Path) -> int:
    match = re.search(r"Image_(\d+)", image_path.stem)
    return int(match.group(1)) if match else 9999


def _collect_three_images(product_dir: Path) -> list[Path]:
    generated_dir_candidates = [
        product_dir / "Generated Images",
        product_dir / "Generated Image",
    ]
    generated_dir = next((path for path in generated_dir_candidates if path.exists()), None)
    if not generated_dir:
        return []

    images = sorted(generated_dir.glob("Image_*.png"), key=_extract_index)
    if len(images) < 3:
        return []
    return images[:3]


def build_templates_for_run(run_dir: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    product_dirs = sorted(path for path in run_dir.iterdir() if path.is_dir())

    for product_dir in product_dirs:
        selected_images = _collect_three_images(product_dir)
        if len(selected_images) < 3:
            print(f"Skipping {product_dir.name}: could not find 3 generated images")
            continue

        product_name = f"Bathmat {product_dir.name}"
        product_output_dir = output_dir / product_dir.name
        product_output_dir.mkdir(parents=True, exist_ok=True)

        img1, img2, img3 = (str(path) for path in selected_images)

        template_hero_layout(str(product_output_dir / "template_hero.pdf"), product_name, img1, img2, img3)
        template_grid(str(product_output_dir / "template_grid.pdf"), product_name, [img1, img2, img3])
        template_feature_strip(str(product_output_dir / "template_strip.pdf"), product_name, img1, img2, img3)
        template_story(str(product_output_dir / "template_story.pdf"), product_name, img1, img2, img3)
        template_minimal(str(product_output_dir / "template_minimal.pdf"), product_name, img1)

        print(f"Generated templates for {product_dir.name}")


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent
    run_name = "bathmats_run_20260401_124900"
    run_dir = base_dir / "generated_images_reve" / run_name
    output_dir = base_dir / "generated_templates" / run_name

    if not run_dir.exists():
        raise FileNotFoundError(f"Run folder not found: {run_dir}")

    build_templates_for_run(run_dir, output_dir)
    print(f"All templates saved under: {output_dir}")
