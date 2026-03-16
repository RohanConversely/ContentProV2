#!/usr/bin/env python3
import json
from datetime import UTC, datetime
from pathlib import Path

from dotenv import load_dotenv

from flux import main as flux_main


SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def collect_reference_images(image_folder: Path) -> list[Path]:
    if not image_folder.exists():
        raise RuntimeError(f"Reference image folder does not exist: {image_folder}")

    reference_images = [
        path
        for path in sorted(image_folder.iterdir())
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTS
    ]
    if not reference_images:
        raise RuntimeError(f"No supported images found in {image_folder}")
    if len(reference_images) > flux_main.MAX_REFERENCE_IMAGES:
        raise RuntimeError(
            f"Found {len(reference_images)} images but Flux test supports at most "
            f"{flux_main.MAX_REFERENCE_IMAGES}."
        )
    for path in reference_images:
        print(f"Using reference image: {path}")
    return reference_images


def build_full_prompt(prompt_file: Path, kyc_path: Path) -> str:
    if not prompt_file.exists():
        raise RuntimeError(f"Prompt file not found: {prompt_file}")
    if not kyc_path.exists():
        raise RuntimeError(f"KYC file not found: {kyc_path}")

    base_prompt = prompt_file.read_text(encoding="utf-8").strip()
    kyc_data = json.loads(kyc_path.read_text(encoding="utf-8"))
    kyc_text = json.dumps(kyc_data, indent=2)
    return (
        f"{base_prompt}\n\n"
        f"### PRODUCT KYC DATA (STRICT REFERENCE):\n"
        f"{kyc_text}\n\n"
        f"Please generate images based on the reference images and KYC provided above."
    )


def run_flux_test(
    prompt: str,
    reference_images: list[Path],
    output_dir: Path,
    api_logs_dir: Path,
    num_images: int,
    kyc_path: Path,
) -> list[Path]:
    mode_config = flux_main.current_mode_config()
    generated_paths: list[Path] = []

    print(
        f"Using mode={flux_main.current_run_mode()}, model={mode_config['model']}, "
        f"size={mode_config['size']} with {len(reference_images)} reference image(s)."
    )

    for index in range(1, num_images + 1):
        shot_name = f"flux_test_{index}"
        log_paths = flux_main.build_api_log_paths(api_logs_dir)
        print(f"Generating {shot_name}...")

        try:
            submit_payload, request_payload = flux_main.submit_edit_request(
                prompt=prompt,
                reference_images=reference_images,
                mode_config=mode_config,
            )
            flux_main.log_request(
                request_log_path=log_paths["request"],
                prompt=prompt,
                reference_images=reference_images,
                kyc_path=kyc_path,
                request_payload=request_payload | {"submit_response": submit_payload},
            )

            polling_url = submit_payload.get("polling_url")
            if not polling_url:
                raise RuntimeError(f"BFL response did not include polling_url: {submit_payload}")

            result_payload = flux_main.poll_result(str(polling_url))
            flux_main.log_response(log_paths["response"], result_payload)

            if result_payload.get("status") != "Ready":
                raise RuntimeError(f"BFL generation failed: {result_payload}")

            sample_url = result_payload.get("result", {}).get("sample")
            if not sample_url:
                raise RuntimeError(f"BFL result did not include sample URL: {result_payload}")

            image_bytes = flux_main.download_result_image(str(sample_url))
            output_path = output_dir / f"dump_direct_{index}.png"
            output_path.write_bytes(image_bytes)
            generated_paths.append(output_path)
            print(f"Saved: {output_path.resolve()}")
        except Exception as exc:
            flux_main.log_error(
                log_paths["error"],
                {
                    "timestamp_utc": datetime.now(UTC).isoformat(),
                    "backend": "bfl_flux_api",
                    "mode": flux_main.current_run_mode(),
                    "model": mode_config["model"],
                    "shot_type": shot_name,
                    "error_type": exc.__class__.__name__,
                    "error_message": str(exc),
                },
            )
            raise

    return generated_paths


def main() -> None:
    pipeline_dir = Path(__file__).resolve().parent

    load_dotenv(pipeline_dir / ".env")
    load_dotenv(pipeline_dir / "flux" / ".env")

    prompt_file = pipeline_dir / "prompts" / "ImageWithKYCTesting.txt"
    kyc_path = pipeline_dir / "product_kycs" / "Nikitavibhor_green_set1_kyc_filtered.json"
    image_folder = pipeline_dir / "product_images"
    output_dir = pipeline_dir / "gen_images_flux_test"
    num_images = 5

    prompt_file = prompt_file.resolve()
    kyc_path = kyc_path.resolve()
    image_folder = image_folder.resolve()
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    api_logs_dir = (pipeline_dir / "flux" / "output" / flux_main.API_LOGS_DIR_NAME).resolve()
    api_logs_dir.mkdir(parents=True, exist_ok=True)

    reference_images = collect_reference_images(image_folder)
    prompt = build_full_prompt(prompt_file, kyc_path)

    generated_paths = run_flux_test(
        prompt=prompt,
        reference_images=reference_images,
        output_dir=output_dir,
        api_logs_dir=api_logs_dir,
        num_images=num_images,
        kyc_path=kyc_path,
    )
    print(f"Done. Generated {len(generated_paths)} image(s) in {output_dir}")


if __name__ == "__main__":
    main()
