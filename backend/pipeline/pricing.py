#!/usr/bin/env python3
import argparse
import json
from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any


DECIMAL_QUANT = Decimal("0.000001")
TOKEN_SCALE = Decimal("1000000")

OPERATION_TO_STEP = {
    "product_kyc": "step_1_product_kyc",
    "image_gen_with_kyc": "step_2_image_generation",
    "video_prompt_generation": "step_3_video_prompt_generation",
}

STEP_TO_MODEL = {
    "step_1_product_kyc": "gpt-4.1-mini",
    "step_2_image_generation": "gpt-4.1",
    "step_3_video_prompt_generation": "gpt-4.1-mini",
}

MODEL_PRICING = {
    "gpt-4.1-mini": {
        "input_per_million": Decimal("0.40"),
        "cached_input_per_million": Decimal("0.10"),
        "output_per_million": Decimal("1.60"),
    },
    "gpt-4.1": {
        "input_per_million": Decimal("2.00"),
        "cached_input_per_million": Decimal("0.50"),
        "output_per_million": Decimal("8.00"),
    },
}

VEO_PRICING = {
    "veo-3.1-fast-generate-preview": {
        "no_audio_per_second": Decimal("0.15"),
        "with_audio_per_second": Decimal("0.15"),
    }
}


@dataclass
class TokenAggregate:
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cached_tokens: int = 0
    usage_events: int = 0


def _to_int(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _to_decimal(value: int) -> Decimal:
    return Decimal(value)


def _q6(value: Decimal) -> Decimal:
    return value.quantize(DECIMAL_QUANT, rounding=ROUND_HALF_UP)


def _decimal_to_float(value: Decimal) -> float:
    return float(_q6(value))


def _load_json_lines(path: Path) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    with open(path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                parsed = json.loads(stripped)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON log line {line_no}: {exc}") from exc
            if isinstance(parsed, dict):
                entries.append(parsed)
    return entries


def _extract_job_meta(entries: list[dict[str, Any]], job_dir: Path) -> dict[str, Any]:
    for entry in entries:
        if entry.get("message") in {"Job initialized.", "Image pipeline initialized."}:
            context = entry.get("context") or {}
            return {
                "job_id": context.get("job_id"),
                "brand_name": context.get("brand_name"),
                "brand_website": context.get("brand_website"),
                "product_name": context.get("product_name"),
                "product_category": context.get("product_category"),
                "job_dir": str(job_dir.resolve()),
            }
    return {"job_id": job_dir.name, "job_dir": str(job_dir.resolve())}


def _aggregate_tokens(entries: list[dict[str, Any]]) -> dict[str, TokenAggregate]:
    per_step: dict[str, TokenAggregate] = defaultdict(TokenAggregate)
    for entry in entries:
        if entry.get("message") != "Token usage":
            continue
        context = entry.get("context") or {}
        operation = context.get("operation")
        if operation not in OPERATION_TO_STEP:
            continue
        step = OPERATION_TO_STEP[operation]
        agg = per_step[step]
        agg.input_tokens += _to_int(context.get("input_tokens"))
        agg.output_tokens += _to_int(context.get("output_tokens"))
        agg.total_tokens += _to_int(context.get("total_tokens"))
        agg.cached_tokens += _to_int(context.get("cached_tokens"))
        agg.usage_events += 1
    return per_step


def _aggregate_flux_stage2_cost(entries: list[dict[str, Any]]) -> tuple[Decimal, int, str]:
    total_cost = Decimal("0")
    usage_events = 0
    model = "flux-2-pro"
    for entry in entries:
        if entry.get("message") != "Flux usage":
            continue
        context = entry.get("context") or {}
        if context.get("operation") != "flux_image_generation":
            continue
        usage_events += 1
        raw_cost = context.get("cost_usd", 0)
        try:
            total_cost += Decimal(str(raw_cost))
        except Exception:
            continue
        if context.get("model"):
            model = str(context.get("model"))
    return total_cost, usage_events, model


def _compute_step_cost(
    step: str,
    agg: TokenAggregate,
    *,
    override_cost_total: Decimal | None = None,
    override_model: str | None = None,
    override_usage_events: int | None = None,
) -> dict[str, Any]:
    model = STEP_TO_MODEL[step]
    pricing = MODEL_PRICING[model]

    billable_input_tokens = max(agg.input_tokens - agg.cached_tokens, 0)
    billable_cached_tokens = max(agg.cached_tokens, 0)
    billable_output_tokens = max(agg.output_tokens, 0)

    input_cost = (_to_decimal(billable_input_tokens) / TOKEN_SCALE) * pricing["input_per_million"]
    cached_cost = (_to_decimal(billable_cached_tokens) / TOKEN_SCALE) * pricing[
        "cached_input_per_million"
    ]
    output_cost = (_to_decimal(billable_output_tokens) / TOKEN_SCALE) * pricing["output_per_million"]
    total_cost = input_cost + cached_cost + output_cost

    report = {
        "step": step,
        "model": model,
        "usage_events": agg.usage_events,
        "usage": {
            "input_tokens": agg.input_tokens,
            "output_tokens": agg.output_tokens,
            "total_tokens": agg.total_tokens,
            "cached_tokens": agg.cached_tokens,
            "billable_input_tokens": billable_input_tokens,
            "billable_cached_tokens": billable_cached_tokens,
            "billable_output_tokens": billable_output_tokens,
        },
        "rates": {
            "input_per_million": _decimal_to_float(pricing["input_per_million"]),
            "cached_input_per_million": _decimal_to_float(pricing["cached_input_per_million"]),
            "output_per_million": _decimal_to_float(pricing["output_per_million"]),
        },
        "cost": {
            "input": _decimal_to_float(input_cost),
            "cached_input": _decimal_to_float(cached_cost),
            "output": _decimal_to_float(output_cost),
            "total": _decimal_to_float(total_cost),
        },
    }
    if override_cost_total is not None:
        report["rates"] = {
            "input_per_million": 0.0,
            "cached_input_per_million": 0.0,
            "output_per_million": 0.0,
        }
        report["cost"] = {
            "input": 0.0,
            "cached_input": 0.0,
            "output": _decimal_to_float(override_cost_total),
            "total": _decimal_to_float(override_cost_total),
        }
    if override_model is not None:
        report["model"] = override_model
    if override_usage_events is not None:
        report["usage_events"] = override_usage_events
    return report


def _compute_veo_cost(entries: list[dict[str, Any]]) -> dict[str, Any]:
    model = "veo-3.1-fast-generate-preview"
    rates = VEO_PRICING[model]

    requested_duration = None
    requested_generate_audio = None
    generated_count = 0
    seconds_total = Decimal("0")

    last_requested_duration = 8
    last_requested_generate_audio = False

    for entry in entries:
        context = entry.get("context") or {}
        stage = context.get("stage")
        message = entry.get("message")

        if stage == "stage_4_video_gen" and message == "Requesting video generation with Veo 3.1.":
            if context.get("duration_seconds") is not None:
                last_requested_duration = _to_int(context.get("duration_seconds")) or 8
                requested_duration = last_requested_duration
            if context.get("generate_audio") is not None:
                last_requested_generate_audio = bool(context.get("generate_audio"))
                requested_generate_audio = last_requested_generate_audio

        if stage == "stage_4_video_gen" and message == "Video generated.":
            generated_count += 1
            duration = _to_int(context.get("duration_seconds")) or last_requested_duration
            generate_audio = (
                bool(context.get("generate_audio"))
                if context.get("generate_audio") is not None
                else last_requested_generate_audio
            )
            seconds_total += Decimal(duration)
            requested_duration = duration
            requested_generate_audio = generate_audio

    if requested_duration is None:
        requested_duration = 8
    if requested_generate_audio is None:
        requested_generate_audio = False

    rate = (
        rates["with_audio_per_second"]
        if requested_generate_audio
        else rates["no_audio_per_second"]
    )
    total_cost = seconds_total * rate

    return {
        "step": "step_4_video_generation",
        "model": model,
        "usage": {
            "generated_videos_count": generated_count,
            "seconds_total": float(seconds_total),
            "duration_seconds_requested": requested_duration,
            "generate_audio_requested": requested_generate_audio,
        },
        "rates": {
            "no_audio_per_second": _decimal_to_float(rates["no_audio_per_second"]),
            "with_audio_per_second": _decimal_to_float(rates["with_audio_per_second"]),
            "applied_rate_per_second": _decimal_to_float(rate),
        },
        "cost": {"total": _decimal_to_float(total_cost)},
    }


def compute_price_report(job_dir: Path, job_log_file: Path, currency: str) -> dict[str, Any]:
    if not job_log_file.exists():
        raise FileNotFoundError(f"Job log not found: {job_log_file}")

    entries = _load_json_lines(job_log_file)
    if not entries:
        raise ValueError(f"Job log is empty: {job_log_file}")

    job_meta = _extract_job_meta(entries, job_dir)
    per_step_usage = _aggregate_tokens(entries)
    flux_stage_2_cost, flux_stage_2_events, flux_stage_2_model = _aggregate_flux_stage2_cost(entries)

    step_reports: list[dict[str, Any]] = []
    token_cost_total = Decimal("0")
    total_input = 0
    total_output = 0
    total_cached = 0
    total_tokens = 0

    for step in ("step_1_product_kyc", "step_2_image_generation", "step_3_video_prompt_generation"):
        agg = per_step_usage.get(step, TokenAggregate())
        if step == "step_2_image_generation" and flux_stage_2_events > 0:
            report = _compute_step_cost(
                step,
                agg,
                override_cost_total=flux_stage_2_cost,
                override_model=flux_stage_2_model,
                override_usage_events=flux_stage_2_events,
            )
        else:
            report = _compute_step_cost(step, agg)
        step_reports.append(report)
        token_cost_total += Decimal(str(report["cost"]["total"]))
        total_input += report["usage"]["input_tokens"]
        total_output += report["usage"]["output_tokens"]
        total_cached += report["usage"]["cached_tokens"]
        total_tokens += report["usage"]["total_tokens"]

    veo_report = _compute_veo_cost(entries)
    veo_cost = Decimal(str(veo_report["cost"]["total"]))
    step_reports.append(veo_report)

    grand_total = token_cost_total + veo_cost

    return {
        "job": job_meta,
        "currency": currency,
        "pricing_table": {
            "openai": {
                model: {
                    "input_per_million": _decimal_to_float(rates["input_per_million"]),
                    "cached_input_per_million": _decimal_to_float(rates["cached_input_per_million"]),
                    "output_per_million": _decimal_to_float(rates["output_per_million"]),
                }
                for model, rates in MODEL_PRICING.items()
            },
            "gemini": {
                model: {
                    "no_audio_per_second": _decimal_to_float(rates["no_audio_per_second"]),
                    "with_audio_per_second": _decimal_to_float(rates["with_audio_per_second"]),
                }
                for model, rates in VEO_PRICING.items()
            },
            "sources": {
                "openai_models": "OpenAI pricing",
                "veo_model": "Gemini API pricing (ai.google.dev)",
            },
        },
        "steps": step_reports,
        "totals": {
            "token_usage": {
                "input_tokens": total_input,
                "output_tokens": total_output,
                "cached_tokens": total_cached,
                "total_tokens": total_tokens,
            },
            "token_cost_total": _decimal_to_float(token_cost_total),
            "video_cost_total": _decimal_to_float(veo_cost),
            "grand_total": _decimal_to_float(grand_total),
        },
        "assumptions": [
            "Logged token totals are treated as billable totals when explicit image-token splits are unavailable.",
            "Step 4 pricing is estimated as generated_videos_count * duration_seconds_requested * applied_rate_per_second.",
            "If generate_audio is not present in logs, silent video pricing is used by default.",
        ],
        "generated_from": {
            "job_log_file": str(job_log_file.resolve()),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute and store per-job pricing breakdown.")
    parser.add_argument("--job-dir", required=True, help="Job directory path")
    parser.add_argument("--job-log-file", default=None, help="Path to job.log")
    parser.add_argument("--output-file", default=None, help="Output price.json path")
    parser.add_argument("--currency", default="USD", help="Currency code")
    args = parser.parse_args()

    job_dir = Path(args.job_dir).resolve()
    job_log_file = (
        Path(args.job_log_file).resolve()
        if args.job_log_file
        else (job_dir / "job.log").resolve()
    )
    output_file = (
        Path(args.output_file).resolve()
        if args.output_file
        else (job_dir / "price.json").resolve()
    )

    report = compute_price_report(job_dir=job_dir, job_log_file=job_log_file, currency=args.currency)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(json.dumps({"ok": True, "output_file": str(output_file)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
