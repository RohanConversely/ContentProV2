# Image Batch Upscaler

BFL FLUX API jewellery image generator that:

- reads up to 4 reference product images from `input/`
- reads one KYC text file from `input/`
- appends the KYC text to a built-in prompt in code
- uses the BFL hosted model `flux-2-pro`
- generates 4 images: `hero`, `lifestyle`, `storytelling`, `detail`
- keeps generated images at `1024x1024`
- automatically creates sharpened `2000x2000` final images
- upscales only the images you manually select
- logs API requests and responses to JSON
- can run as a local FastAPI service on your Mac

## Important limits

- `flux-2-pro` is configured here as the default BFL model.
- This project is capped at `4` reference images to match your chosen setup.
- Use this input pattern:
  - full set image
  - necklace zoom
  - earrings zoom
  - optional extra detail image
  - `KYC.txt`

## Setup

```bash
cd /Users/ritu/Documents/New\ project/image-batch-upscaler
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Environment

Edit `.env` in the project root:

```dotenv
BFL_API_KEY=your_bfl_api_key_here
FLUX_RUN_MODE=strict
BFL_MODEL=flux-2-pro
FLUX_OUTPUT_SIZE=1024x1024
BFL_PROMPT_UPSAMPLING=false
```

Modes:

- `strict`: uses `flux-2-pro`
- `draft`: uses `flux-2-pro`

Optional estimate override:

```dotenv
BFL_ESTIMATED_COST_PER_IMAGE_USD=0.02
```

This project records an estimated spend using that per-image value.

## Input folder

Put these files into:

```text
input/
```

Supported input files:

- up to 4 reference images: `png`, `jpg`, `jpeg`, `webp`
- 1 KYC document: `txt` or `md`

Example:

```text
input/full_set.png
input/earring_zoom.png
input/necklace_zoom.png
input/extra_detail.png
input/KYC.txt
```

## Run CLI

```bash
python3 main.py
```

The script generates 4 images into:

```text
output/generated/
```

It also automatically creates sharpened `2000x2000` finals in:

```text
output/final/
```

To upscale only selected images:

1. Review files in `output/generated/`
2. Copy the chosen files into `output/selected/`
3. Run `python3 main.py` again

Upscaled files are written to:

```text
output/upscaled/
output/final/
```

## Run local API

Start the API locally:

```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

Available endpoints:

- `GET /health`
- `POST /generate`

`POST /generate` accepts:

- `reference_images`: 1 to 4 uploaded image files
- `kyc_text`: product KYC text
- `run_mode`: optional, `strict` or `draft`

Example:

```bash
curl -X POST http://127.0.0.1:8000/generate \
  -F "reference_images=@input/full_set.png" \
  -F "reference_images=@input/earring_zoom.png" \
  -F "reference_images=@input/necklace_zoom.png" \
  -F "kyc_text=$(cat input/KYC.txt)" \
  -F "run_mode=strict"
```

The API writes uploaded files into `input/`, runs the same pipeline as the CLI, and returns output paths as JSON.

## Output

Generated files are written to:

```text
output/generated/
output/selected/
output/upscaled/
output/final/
output/spend_log.csv
output/run_summaries/
output/api_logs/
```

## Logging

Each generation call writes:

- request metadata to `output/api_logs/*_request.json`
- response metadata to `output/api_logs/*_response.json`
- error details to `output/api_logs/*_error.json`

`output/spend_log.csv` stores an estimated spend based on `BFL_ESTIMATED_COST_PER_IMAGE_USD`.

## Notes

- This project now uses the BFL hosted API, not OpenAI and not local diffusers.
- Your Mac is only running the app and orchestration; image generation happens on the BFL side.
