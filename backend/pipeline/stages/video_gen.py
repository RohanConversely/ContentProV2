#!/usr/bin/env python3
import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from logger import JsonLogger

load_dotenv()

DEFAULT_RESULT_PREFIX = "__RESULT__"
SUPPORTED_DURATIONS = (4, 6, 8)


def _extract_video_bytes_and_uri(video_obj):
    """Return `(video_bytes, uri)` from either flat or nested video response shapes."""
    direct_bytes = getattr(video_obj, "video_bytes", None)
    if direct_bytes:
        return direct_bytes, None

    nested = getattr(video_obj, "video", None)
    if nested is not None:
        nested_data = getattr(nested, "data", None)
        if nested_data:
            return nested_data, None

        nested_bytes = getattr(nested, "video_bytes", None)
        if nested_bytes:
            return nested_bytes, None

        nested_uri = getattr(nested, "uri", None)
        if nested_uri:
            return None, nested_uri

    direct_uri = getattr(video_obj, "uri", None)
    if direct_uri:
        return None, direct_uri

    return None, None


def _build_download_url(base_uri: str, api_key: str | None) -> str:
    if not api_key:
        return base_uri

    parsed = urllib.parse.urlparse(base_uri)
    query = urllib.parse.parse_qs(parsed.query)
    query["key"] = [api_key]
    new_query = urllib.parse.urlencode(query, doseq=True)
    return parsed._replace(query=new_query).geturl()


def _redact_key_from_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    query = urllib.parse.parse_qs(parsed.query)
    if "key" in query:
        query["key"] = ["[REDACTED]"]
    new_query = urllib.parse.urlencode(query, doseq=True)
    return parsed._replace(query=new_query).geturl()


def build_logger(job_log_file: str | None) -> JsonLogger:
    if job_log_file:
        return JsonLogger(
            job_log_file=job_log_file,
            include_global_when_job_active=False,
        )
    return JsonLogger()


def with_context(base: dict[str, Any] | None, extra: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base or {})
    merged.update(extra)
    return merged


def normalize_duration_seconds(duration_seconds: int) -> int:
    if duration_seconds in SUPPORTED_DURATIONS:
        return duration_seconds
    return min(SUPPORTED_DURATIONS, key=lambda value: abs(value - duration_seconds))


def _build_generate_config(types_module, duration_seconds: int):
    return types_module.GenerateVideosConfig(
        aspect_ratio="9:16",
        resolution="1080p",
        duration_seconds=duration_seconds,
    )


def generate_video_frame(
    image_path: str,
    kyc_path: str,
    output_dir: str = "video_frames",
    duration_seconds: int = 8,
    max_wait_seconds: int = 480,
    logger_obj: JsonLogger | None = None,
    log_context: dict[str, Any] | None = None,
) -> str | None:
    stage_logger = logger_obj or JsonLogger()

    requested_duration_seconds = duration_seconds
    duration_seconds = normalize_duration_seconds(duration_seconds)
    if duration_seconds != requested_duration_seconds:
        stage_logger.warning(
            "Requested duration is not directly supported. Using nearest supported duration.",
            with_context(
                log_context,
                {
                    "duration_seconds_requested": requested_duration_seconds,
                    "duration_seconds_effective": duration_seconds,
                    "supported_durations": list(SUPPORTED_DURATIONS),
                },
            ),
        )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY not found in environment. Please set it in .env file."
        )

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    with open(kyc_path, "r", encoding="utf-8") as f:
        prompt_json = json.load(f)

    prompt_lines = [
        "Analyse the attached image and follow the instructions to generate a high fidelity cinematic video.",
        f"Video duration: {duration_seconds} seconds.",
        "Generate a silent video with no audio track.",
    ]

    generate_config = _build_generate_config(types, duration_seconds)

    prompt_text = (
        "\n".join(prompt_lines)
        + "\n\n"
        + json.dumps(prompt_json, indent=2, ensure_ascii=False)
    )

    stage_logger.info(
        "Requesting video generation with Veo 3.1.",
        with_context(
            log_context,
            {
                "image_path": str(Path(image_path).resolve()),
                "kyc_path": str(Path(kyc_path).resolve()),
                "output_dir": str(output_path.resolve()),
                "duration_seconds_requested": requested_duration_seconds,
                "duration_seconds": duration_seconds,
                "generate_audio": False,
                "max_wait_seconds": max_wait_seconds,
            },
        ),
    )

    operation = client.models.generate_videos(
        model="veo-3.1-fast-generate-preview",
        prompt=prompt_text,
        image=types.Image.from_file(location=image_path),
        config=generate_config,
    )

    if getattr(operation, "name", None):
        stage_logger.info(
            "Video generation operation created.",
            with_context(log_context, {"operation_name": operation.name}),
        )

    start_time = time.time()
    try:
        while not operation.done:
            if time.time() - start_time > max_wait_seconds:
                stage_logger.error(
                    "Video generation timed out.",
                    with_context(
                        log_context,
                        {
                            "operation_name": getattr(operation, "name", None),
                            "max_wait_seconds": max_wait_seconds,
                        },
                    ),
                )
                if hasattr(client, "operations") and hasattr(
                    client.operations, "cancel"
                ):
                    try:
                        client.operations.cancel(operation)
                        stage_logger.info(
                            "Cancellation requested for timed-out operation.",
                            with_context(
                                log_context,
                                {"operation_name": getattr(operation, "name", None)},
                            ),
                        )
                    except Exception as cancel_err:
                        stage_logger.error(
                            "Failed to cancel timed-out operation.",
                            with_context(log_context, {"error": str(cancel_err)}),
                        )
                return None
            time.sleep(2)
            operation = client.operations.get(operation)
    except KeyboardInterrupt:
        stage_logger.warning(
            "Interrupted by user. Attempting to cancel operation.",
            with_context(
                log_context,
                {"operation_name": getattr(operation, "name", None)},
            ),
        )
        if hasattr(client, "operations") and hasattr(client.operations, "cancel"):
            try:
                client.operations.cancel(operation)
                stage_logger.info(
                    "Cancellation requested after interrupt.",
                    with_context(
                        log_context,
                        {"operation_name": getattr(operation, "name", None)},
                    ),
                )
            except Exception as cancel_err:
                stage_logger.error(
                    "Failed to cancel operation after interrupt.",
                    with_context(log_context, {"error": str(cancel_err)}),
                )
        return None

    if operation.error:
        stage_logger.error(
            "Video generation failed.",
            with_context(log_context, {"error": str(operation.error)}),
        )
        print(f"Error: {operation.error}")
        return None

    if operation.result.generated_videos:
        video = operation.result.generated_videos[0]
        video_data, video_uri = _extract_video_bytes_and_uri(video)

        if not video_data and video_uri:
            download_url = _build_download_url(video_uri, api_key)
            safe_url = _redact_key_from_url(download_url)

            stage_logger.info(
                "Video returned as URI; attempting download.",
                with_context(log_context, {"uri": safe_url}),
            )
            try:
                request = urllib.request.Request(download_url)
                request.add_header("x-goog-api-key", api_key)
                with urllib.request.urlopen(request) as response_stream:
                    video_data = response_stream.read()
            except Exception as download_err:
                stage_logger.error(
                    "Failed to download video from URI.",
                    with_context(
                        log_context,
                        {"uri": safe_url, "error": str(download_err)},
                    ),
                )
                print("Error: Failed to download video from URI.")
                return None

        if not video_data:
            stage_logger.error(
                "No video bytes found on response.",
                with_context(log_context, {"video": str(video)}),
            )
            print("Error: No video bytes found on response.")
            return None

        image_name = Path(image_path).stem
        output_file = (output_path / f"{image_name}_video.mp4").resolve()

        with open(output_file, "wb") as f:
            f.write(video_data)

        print(f"Video saved to: {output_file}")
        stage_logger.info(
            "Video generated.",
            with_context(
                log_context,
                {
                    "output_file": str(output_file),
                    "duration_seconds": duration_seconds,
                    "generate_audio": False,
                },
            ),
        )

        return str(output_file)

    stage_logger.error(
        "No video generated.",
        with_context(log_context, {"response": str(operation.result)}),
    )
    return None


def run_cli(args: argparse.Namespace) -> int:
    stage_logger = build_logger(args.job_log_file)
    context = {"job_id": args.job_id, "stage": args.stage_name}

    try:
        image_path = str(Path(args.image_path).resolve())
        kyc_path = str(Path(args.kyc_path).resolve())
        output_dir = str(Path(args.output_dir).resolve())

        video_path = generate_video_frame(
            image_path=image_path,
            kyc_path=kyc_path,
            output_dir=output_dir,
            duration_seconds=args.duration_seconds,
            max_wait_seconds=args.max_wait_seconds,
            logger_obj=stage_logger,
            log_context=context,
        )
        if not video_path:
            raise RuntimeError("Video generation returned no output path.")

        result = {
            "ok": True,
            "video_path": str(Path(video_path).resolve()),
            "image_path": image_path,
            "prompt_path": kyc_path,
            "duration_seconds_requested": args.duration_seconds,
            "duration_seconds_effective": normalize_duration_seconds(
                args.duration_seconds
            ),
            "generate_audio_requested": False,
        }
        print(f"{args.result_prefix}{json.dumps(result, ensure_ascii=False)}")
        return 0
    except Exception as exc:
        stage_logger.error("Stage failed.", with_context(context, {"error": str(exc)}))
        print(f"Error: {exc}")
        return 1


def run_default() -> int:
    script_dir = Path(__file__).parent
    image_path = script_dir / "generated_images" / "Tatsya_trinket_plate_1.png"
    kyc_path = script_dir / "video_frame_prompts" / "Tatsya_trinket_plate_1_prompt.json"

    if not image_path.exists():
        print(f"Image not found: {image_path}")
        return 1

    if not kyc_path.exists():
        print(f"KYC file not found: {kyc_path}")
        return 1

    generate_video_frame(
        image_path=str(image_path),
        kyc_path=str(kyc_path),
        duration_seconds=8,
    )
    return 0


def main() -> None:
    if len(sys.argv) == 1:
        raise SystemExit(run_default())

    parser = argparse.ArgumentParser(
        description="Generate video from image + prompt JSON."
    )
    parser.add_argument("--image-path", required=True, help="Path to generated image")
    parser.add_argument("--kyc-path", required=True, help="Path to video prompt JSON")
    parser.add_argument("--output-dir", default="video_frames", help="Output directory")
    parser.add_argument(
        "--duration-seconds",
        type=int,
        default=8,
        help="Requested video duration in seconds",
    )
    parser.add_argument(
        "--max-wait-seconds",
        type=int,
        default=480,
        help="Max wait time for video operation completion",
    )
    parser.add_argument("--job-id", default=None, help="Pipeline job id")
    parser.add_argument("--stage-name", default="stage_4", help="Pipeline stage name")
    parser.add_argument("--job-log-file", default=None, help="Shared job log file path")
    parser.add_argument(
        "--result-prefix",
        default=DEFAULT_RESULT_PREFIX,
        help="Machine-readable result prefix for stdout",
    )
    args = parser.parse_args()
    raise SystemExit(run_cli(args))


if __name__ == "__main__":
    main()
