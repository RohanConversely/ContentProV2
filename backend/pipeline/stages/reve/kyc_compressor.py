#!/usr/bin/env python3
import json
from pathlib import Path
from typing import Any

from ...logger import JsonLogger


def with_context(base: dict[str, Any] | None, extra: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base or {})
    merged.update(extra)
    return merged


def _safe_get(data: dict, *keys: str) -> str:
    current = data
    for key in keys:
        if not isinstance(current, dict):
            return ""
        current = current.get(key)
    if isinstance(current, list):
        return ", ".join(str(item) for item in current[:3])
    return str(current).strip() if current is not None else ""


def build_compressed_kyc(
    kyc_file: Path,
    output_file: Path,
    logger: JsonLogger,
    min_chars: int = 400,
    max_chars: int = 600,
    log_context: dict[str, Any] | None = None,
) -> str:
    if not kyc_file.exists():
        logger.error("KYC file not found.", with_context(log_context, {"kyc_file": str(kyc_file)}))
        return ""

    try:
        with kyc_file.open("r", encoding="utf-8") as handle:
            kyc_data = json.load(handle)
    except (OSError, ValueError) as exc:
        logger.error(
            "Failed to load KYC json.",
            with_context(log_context, {"kyc_file": str(kyc_file), "error": str(exc)}),
        )
        return ""

    pb = kyc_data.get("product_basic_kyc", {})
    rc = kyc_data.get("requirement_criteria_for_image_generation", {})
    ict = kyc_data.get("indian_context_product_theme", {})
    ig = kyc_data.get("image_generation_guidance", {})

    segments = [
        f"Product: {_safe_get(pb, 'product_name')}",
        f"Category: {_safe_get(pb, 'product_category')}",
        f"Audience: {_safe_get(pb, 'target_audience')}",
        f"Use case: {_safe_get(pb, 'primary_use_case')}",
        f"Theme: {_safe_get(ict, 'lifestyle_theme')}",
        f"Lock: {_safe_get(rc, 'product_constraints')}",
        f"Lighting: {_safe_get(rc, 'lighting_requirements')}",
        f"A+ look: {_safe_get(rc, 'amazon_a_plus_look')}",
    ]

    optional_segments = [
        f"Indian use: {_safe_get(ict, 'how_indian_customer_uses_product')}",
        f"Avoid: {_safe_get(ig, 'what_must_be_avoided')}",
    ]

    summary_parts = []
    current_length = 0

    for segment in segments + optional_segments:
        clean_segment = " ".join(segment.split())
        if not clean_segment or clean_segment.endswith(":"):
            continue

        projected = current_length + len(clean_segment) + (3 if summary_parts else 0)
        if projected > max_chars:
            continue
        summary_parts.append(clean_segment)
        current_length = projected

    summary = " | ".join(summary_parts)

    if len(summary) < min_chars:
        fallback_text = _safe_get(pb, "occasion_based_usage")
        if fallback_text:
            padding = f" | Context: {' '.join(fallback_text.split())}"
            allowed = max_chars - len(summary)
            summary += padding[:allowed]

    summary = summary[:max_chars].strip(" |")

    output_payload = {
        "kyc_summary": summary,
        "char_count": len(summary),
        "source_file": kyc_file.name,
    }

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with output_file.open("w", encoding="utf-8") as handle:
        json.dump(output_payload, handle, ensure_ascii=False, indent=2)

    logger.info(
        "Compressed KYC written.",
        with_context(
            log_context,
            {
                "output_file": str(output_file),
                "char_count": len(summary),
                "source_file": kyc_file.name,
            },
        ),
    )
    return summary
