from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from common import GRAPH_IMAGES_DIR, LeftoverItem, RowData, safe_slug


def _script_path(name: str) -> Path:
    return GRAPH_IMAGES_DIR / name


def _base_output_name(row: RowData) -> str:
    return f"{row.row_index:03d}_{safe_slug(row.sku)}_{safe_slug(row.product_name)}"


def _run_command(command: list[str]) -> None:
    subprocess.run(command, check=True)


def _leftover(row: RowData, reason: str) -> LeftoverItem:
    return LeftoverItem(
        row_index=row.row_index,
        sku=row.sku,
        product_name=row.product_name,
        category=row.category,
        reason=reason,
    )


def _earring_command(row: RowData, image_path: Path, output_dir: Path) -> list[str] | LeftoverItem:
    if row.overall_width_mm is None or row.overall_height_mm is None:
        return _leftover(row, "Earring row missing overall width or overall height.")

    command = [
        sys.executable,
        str(_script_path("jewel_scale_earrings.py")),
        "--ref",
        str(_script_path("reference.png")),
        "--input",
        str(image_path),
        "--width",
        str(row.overall_width_mm),
        "--height",
        str(row.overall_height_mm),
        "--output",
        str(output_dir / f"{_base_output_name(row)}.png"),
    ]
    if row.adjustable:
        command.append("--adjustable")
    return command


def _ring_command(row: RowData, image_path: Path, output_dir: Path) -> list[str] | LeftoverItem:
    if row.overall_width_mm is None or row.overall_height_mm is None:
        return _leftover(row, "Ring row missing overall width or overall height.")

    command = [
        sys.executable,
        str(_script_path("jewel_scale_ring.py")),
        "--ref",
        str(_script_path("reference.png")),
        "--input",
        str(image_path),
        "--width",
        str(row.overall_width_mm),
        "--height",
        str(row.overall_height_mm),
        "--output",
        str(output_dir / f"{_base_output_name(row)}.png"),
    ]
    if row.adjustable:
        command.append("--adjustable")
    return command


def _bracelet_chain_length_cm(row: RowData) -> float | None:
    if row.chain_length_cm is not None:
        return row.chain_length_cm
    if row.overall_width_mm is None or row.overall_height_mm is None:
        return None

    diameter_mm = (row.overall_width_mm + row.overall_height_mm) / 2.0
    return (diameter_mm / 10.0) * 3.14


def _bracelet_command(
    row: RowData, image_path: Path, output_dir: Path, *, label_mode: str = "bracelet"
) -> list[str] | LeftoverItem:
    chain_length_cm = _bracelet_chain_length_cm(row)
    if chain_length_cm is None:
        return _leftover(row, "Bracelet/Bangle row missing chain length and fallback width/height.")

    command = [
        sys.executable,
        str(_script_path("jewel_scale_bracelet.py")),
        "--input",
        str(image_path),
        "--chain-length",
        str(chain_length_cm),
        "--label-mode",
        label_mode,
        "--output",
        str(output_dir / f"{_base_output_name(row)}.png"),
    ]
    if row.adjustable:
        command.append("--adjustable")
    return command


def _anklet_command(row: RowData, image_path: Path, output_dir: Path) -> list[str] | LeftoverItem:
    if row.motif_width_mm is None or row.overall_width_mm is None or row.chain_length_cm is None:
        return _leftover(row, "Anklet row missing motif width, overall width, or chain length.")

    command = [
        sys.executable,
        str(_script_path("jewel_scale_anklet.py")),
        "--input",
        str(image_path),
        "--motif-width",
        str(row.motif_width_mm),
        "--overall-width",
        str(row.overall_width_mm),
        "--chain-length",
        str(row.chain_length_cm),
        "--output",
        str(output_dir / f"{_base_output_name(row)}.png"),
    ]
    if row.adjustable:
        command.append("--adjustable")
    return command


def _necklace_command(row: RowData, image_path: Path, output_dir: Path) -> list[str] | LeftoverItem:
    if row.motif_width_mm is None or row.overall_height_mm is None or row.chain_length_cm is None:
        return _leftover(row, "Necklace row missing motif width, overall height, or chain length.")

    command = [
        sys.executable,
        str(_script_path("jewel_scale_anklet.py")),
        "--input",
        str(image_path),
        "--motif-width",
        str(row.motif_width_mm),
        "--overall-height",
        str(row.overall_height_mm),
        "--chain-length",
        str(row.chain_length_cm),
        "--label-mode",
        "necklace",
        "--output",
        str(output_dir / f"{_base_output_name(row)}.png"),
    ]
    if row.adjustable:
        command.append("--adjustable")
    return command


def build_command(row: RowData, image_path: Path, output_dir: Path) -> list[str] | LeftoverItem:
    category = row.category.strip().lower()
    if category in {"earring", "earrings"}:
        return _earring_command(row, image_path, output_dir)
    if category in {"ring", "toe ring"}:
        return _ring_command(row, image_path, output_dir)
    if category == "bracelet":
        return _bracelet_command(row, image_path, output_dir, label_mode="bracelet")
    if category == "bangle":
        return _bracelet_command(row, image_path, output_dir, label_mode="bangle")
    if category == "anklet":
        return _anklet_command(row, image_path, output_dir)
    if category == "necklace":
        return _necklace_command(row, image_path, output_dir)
    return _leftover(row, f"Unsupported category: {row.category}")


def run_row(row: RowData, image_path: Path, output_dir: Path) -> LeftoverItem | None:
    command_or_leftover = build_command(row, image_path, output_dir)
    if isinstance(command_or_leftover, LeftoverItem):
        return command_or_leftover

    try:
        _run_command(command_or_leftover)
        return None
    except subprocess.CalledProcessError as exc:
        return _leftover(row, f"Category script failed with exit code {exc.returncode}.")
