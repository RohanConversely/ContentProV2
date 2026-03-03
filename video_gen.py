#!/usr/bin/env python3
import os
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from google import genai
from google.genai import types

from logger import JsonLogger, log_usage

logger = JsonLogger()


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
    """Append API key as a query param for direct file download endpoints."""
    if not api_key:
        return base_uri

    parsed = urllib.parse.urlparse(base_uri)
    query = urllib.parse.parse_qs(parsed.query)
    query["key"] = [api_key]
    new_query = urllib.parse.urlencode(query, doseq=True)
    return parsed._replace(query=new_query).geturl()


def _redact_key_from_url(url: str) -> str:
    """Remove sensitive query parameters before logging."""
    parsed = urllib.parse.urlparse(url)
    query = urllib.parse.parse_qs(parsed.query)
    if "key" in query:
        query["key"] = ["[REDACTED]"]
    new_query = urllib.parse.urlencode(query, doseq=True)
    return parsed._replace(query=new_query).geturl()


def generate_video_frame(
    image_path: str,
    kyc_path: str,
    output_dir: str = "video_frames",
    max_wait_seconds: int = 480,
) -> str | None:
    """
    Generate video frame from an image using Gemini Veo 3.1 fast model.

    Args:
        image_path: Path to the generated image
        kyc_path: Path to the KYC JSON file
        output_dir: Output directory for video frames

    Returns:
        Path to the generated video file
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY not found in environment. Please set it in .env file."
        )

    client = genai.Client(api_key=api_key)

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    with open(kyc_path, "r", encoding="utf-8") as f:
        prompt_json = json.load(f)

    prompt_prefix = (
    "Analyse the attached image and follow the instructions to generate a "
    "high fidelity cinematic video. Video duration: 8 seconds."
    )

    prompt_text = prompt_prefix + "\n\n" + json.dumps(
        prompt_json, indent=2, ensure_ascii=False
    )

    logger.info(
        "Requesting video generation with Veo 3.1.",
        {"image_path": image_path, "kyc_path": kyc_path},
    )

    operation = client.models.generate_videos(
        model="veo-3.1-fast-generate-preview",
        prompt=prompt_text,
        image=types.Image.from_file(location=image_path),
        config=types.GenerateVideosConfig(
            aspect_ratio="9:16",
            resolution="1080p",
            duration_seconds=8,
        ),
    )

    if getattr(operation, "name", None):
        logger.info("Video generation operation created.", {"operation_name": operation.name})

    start_time = time.time()
    try:
        while not operation.done:
            if time.time() - start_time > max_wait_seconds:
                logger.error(
                    "Video generation timed out.",
                    {
                        "operation_name": getattr(operation, "name", None),
                        "max_wait_seconds": max_wait_seconds,
                    },
                )
                if hasattr(client, "operations") and hasattr(client.operations, "cancel"):
                    try:
                        client.operations.cancel(operation)
                        logger.info(
                            "Cancellation requested for timed-out operation.",
                            {"operation_name": getattr(operation, "name", None)},
                        )
                    except Exception as cancel_err:
                        logger.error(
                            "Failed to cancel timed-out operation.",
                            {"error": str(cancel_err)},
                        )
                return None
            time.sleep(2)
            operation = client.operations.get(operation)
    except KeyboardInterrupt:
        logger.warning(
            "Interrupted by user. Attempting to cancel operation.",
            {"operation_name": getattr(operation, "name", None)},
        )
        if hasattr(client, "operations") and hasattr(client.operations, "cancel"):
            try:
                client.operations.cancel(operation)
                logger.info(
                    "Cancellation requested after interrupt.",
                    {"operation_name": getattr(operation, "name", None)},
                )
            except Exception as cancel_err:
                logger.error(
                    "Failed to cancel operation after interrupt.",
                    {"error": str(cancel_err)},
                )
        return None

    if operation.error:
        logger.error("Video generation failed.", {"error": str(operation.error)})
        print(f"Error: {operation.error}")
        return None

    if operation.result.generated_videos:
        video = operation.result.generated_videos[0]
        video_data, video_uri = _extract_video_bytes_and_uri(video)

        if not video_data and video_uri:
            api_key = os.getenv("GEMINI_API_KEY")
            download_url = _build_download_url(video_uri, api_key)
            safe_url = _redact_key_from_url(download_url)

            logger.info("Video returned as URI; attempting download.", {"uri": safe_url})
            try:
                request = urllib.request.Request(download_url)
                if api_key:
                    request.add_header("x-goog-api-key", api_key)
                with urllib.request.urlopen(request) as response_stream:
                    video_data = response_stream.read()
            except Exception as download_err:
                logger.error(
                    "Failed to download video from URI.",
                    {"uri": safe_url, "error": str(download_err)},
                )
                print("Error: Failed to download video from URI.")
                return None

        if not video_data:
            logger.error("No video bytes found on response.", {"video": str(video)})
            print("Error: No video bytes found on response.")
            return None

        image_name = Path(image_path).stem
        output_file = output_path / f"{image_name}_video.mp4"

        with open(output_file, "wb") as f:
            f.write(video_data)

        print(f"Video saved to: {output_file}")
        logger.info("Video generated.", {"output_file": str(output_file)})

        return str(output_file)
    else:
        logger.error("No video generated.", {"response": str(operation.result)})
        return None


def main():
    script_dir = Path(__file__).parent
    image_path = script_dir / "generated_images" / "Tatsya_tatsya_product2_3.png"
    kyc_path = script_dir / "video_frame_prompts" / "Tatsya_tatsya_product2_3_prompt.json"

    if not image_path.exists():
        print(f"Image not found: {image_path}")
        return

    if not kyc_path.exists():
        print(f"KYC file not found: {kyc_path}")
        return

    generate_video_frame(image_path=str(image_path), kyc_path=str(kyc_path))


if __name__ == "__main__":
    main()
