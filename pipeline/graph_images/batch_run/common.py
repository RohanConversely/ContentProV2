from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


GRAPH_IMAGES_DIR = Path(__file__).resolve().parents[1]
BATCH_RUN_DIR = Path(__file__).resolve().parent


def normalize_header(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip().lower()
    for char in ('\n', '\r', '\t'):
        text = text.replace(char, " ")
    while "  " in text:
        text = text.replace("  ", " ")
    return text


def is_truthy_adjustable(value: Any) -> bool:
    if value is None:
        return False
    text = str(value).strip().lower()
    return text in {"yes", "y", "true", "1", "adjustable"}


def safe_slug(value: str) -> str:
    cleaned = "".join(char if char.isalnum() or char in {"-", "_"} else "_" for char in value.strip())
    while "__" in cleaned:
        cleaned = cleaned.replace("__", "_")
    return cleaned.strip("_") or "item"


@dataclass
class RowData:
    row_index: int
    sku: str
    product_name: str
    category: str
    hero_image_url: str
    motif_width_mm: float | None
    overall_width_mm: float | None
    overall_height_mm: float | None
    chain_length_cm: float | None
    earring_width_mm: float | None
    earring_height_mm: float | None
    adjustable: bool
    raw: dict[str, Any]


@dataclass
class LeftoverItem:
    row_index: int
    sku: str
    product_name: str
    category: str
    reason: str
