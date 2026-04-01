#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

from category_logic import run_row
from common import BATCH_RUN_DIR, LeftoverItem, RowData, safe_slug
from drive_download import download_google_drive_image
from excel_loader import load_rows


def _download_name(row: RowData) -> str:
    return f"{row.row_index:03d}_{safe_slug(row.sku)}"


def _write_leftovers(leftovers: list[LeftoverItem], report_path: Path) -> None:
    payload = [
        {
            "row_index": item.row_index,
            "sku": item.sku,
            "product_name": item.product_name,
            "category": item.category,
            "reason": item.reason,
        }
        for item in leftovers
    ]
    report_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run graph image batch automation from Excel sheet.")
    parser.add_argument("--excel", required=True, help="Path to the Excel file")
    parser.add_argument("--output-dir", default=None, help="Optional output directory")
    parser.add_argument("--rows", default=None, help="Optional comma-separated Excel row numbers to process")
    args = parser.parse_args()

    excel_path = Path(args.excel).resolve()
    if not excel_path.exists():
        raise SystemExit(f"Excel file not found: {excel_path}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    batch_root = Path(args.output_dir).resolve() if args.output_dir else (BATCH_RUN_DIR / f"run_{timestamp}")
    downloads_dir = batch_root / "downloads"
    outputs_dir = batch_root / "outputs"
    batch_root.mkdir(parents=True, exist_ok=True)
    downloads_dir.mkdir(parents=True, exist_ok=True)
    outputs_dir.mkdir(parents=True, exist_ok=True)

    rows = load_rows(excel_path)
    if args.rows:
        selected_rows = {
            int(part.strip())
            for part in args.rows.split(",")
            if part.strip()
        }
        rows = [row for row in rows if row.row_index in selected_rows]
    leftovers: list[LeftoverItem] = []
    processed = 0

    for row in rows:
        if not row.hero_image_url:
            leftovers.append(
                LeftoverItem(
                    row_index=row.row_index,
                    sku=row.sku,
                    product_name=row.product_name,
                    category=row.category,
                    reason="Missing hero image hyperlink.",
                )
            )
            continue

        try:
            downloaded_image = download_google_drive_image(row.hero_image_url, downloads_dir, _download_name(row))
        except Exception as exc:
            leftovers.append(
                LeftoverItem(
                    row_index=row.row_index,
                    sku=row.sku,
                    product_name=row.product_name,
                    category=row.category,
                    reason=f"Hero image download failed: {exc}",
                )
            )
            continue

        leftover = run_row(row, downloaded_image, outputs_dir)
        if leftover is not None:
            leftovers.append(leftover)
            continue

        processed += 1

    leftovers_path = batch_root / "leftovers.json"
    _write_leftovers(leftovers, leftovers_path)

    print(f"Processed rows successfully: {processed}")
    print(f"Leftover rows: {len(leftovers)}")
    print(f"Outputs directory: {outputs_dir}")
    print(f"Leftovers report: {leftovers_path}")
    if leftovers:
        print("Leftover products:")
        for item in leftovers:
            print(f"- Row {item.row_index} | {item.sku} | {item.product_name} | {item.category} | {item.reason}")


if __name__ == "__main__":
    main()
