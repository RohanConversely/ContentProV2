# Image Generation Pipeline

A pipeline for generating Amazon A+ content images with KYC (Know Your Customer) documentation, video prompts, and video frames.

## Pipeline Overview

This pipeline orchestrates a 4-stage process to generate product images and video frames:

1. **Stage 1: Image KYC Generation** - Generate product KYC from product image, brand name, and brand website
2. **Stage 2: A+ Image Generation** - Generate realistic product images using the KYC
3. **Stage 3: Per-Image Prompt Generation** - Generate Veo video prompts for each generated image
4. **Stage 4: Video Frame Generation** - Generate video frames from images using Veo 3.1

## File Structure

```
imageGenScript/
├── main.py                         # Orchestrator script (runs entire pipeline)
├── product_kyc.py                  # Stage 1: Generate product KYC
├── image_gen_with_KYC.py           # Stage 2: Generate A+ images
├── video_prompt_generation.py      # Stage 3: Generate video prompts
├── video_gen.py                    # Stage 4: Generate video frames
├── job_pricing.py                  # Calculate job pricing from logs
├── logger.py                       # Logging utility
├── prompts/
│   ├── imageKYC.txt                # KYC generation prompt
│   ├── ImageWithKYCTesting.txt    # A+ image generation prompt
│   └── perImagePromptGen.txt      # Veo prompt generation
├── storage/
│   └── logs/
│       └── execution.log           # Global execution log
├── .env                            # API keys (not committed)
├── requirements.txt                # Python dependencies
└── venv/                          # Virtual environment
```

## Prerequisites

- Python 3.10+
- OpenAI API key (for stages 1-3)
- Gemini API key (for stage 4 - video generation)

## Setup

1. **Install dependencies:**

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install google-genai
```

2. **Configure environment variables:**

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```
OPENAI_API_KEY=sk-your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
```

## Running the Pipeline

### Using main.py (Recommended)

Run the entire pipeline using the orchestrator script:

```bash
source venv/bin/activate
python main.py <brand_name> <brand_website> <product_name> <product_category> <product_image_path>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `brand_name` | Yes | Brand name (e.g., "Tatsya") |
| `brand_website` | Yes | Brand website URL (e.g., "https://tatsya.com/") |
| `product_name` | Yes | Product name |
| `product_category` | Yes | Product category |
| `product_image_path` | Yes | Path to product image file |
| `--social-link-1` | No | Optional social media link 1 |
| `--social-link-2` | No | Optional social media link 2 |
| `--video-duration-seconds` | No | Video duration (default: 8) |

**Example:**

```bash
python main.py Tatsya https://tatsya.com/ "Premium Marble Cake Stand" "Kitchen & Dining" tatsya_product.jpg
```

The pipeline will:
1. Create a job directory under `jobs/<job_id>/`
2. Run Stage 1 and prompt for confirmation before continuing
3. Run Stage 2 and prompt for confirmation before video generation loop
4. Generate video prompts and frames for each generated image
5. Calculate and save pricing information

### Running Individual Stages

You can also run each stage separately:

**Stage 1: Generate Image KYC**

```bash
source venv/bin/activate
python product_kyc.py --image-path <path> --brand-name <name> --brand-website <url>
```

**Stage 2: Generate A+ Content Images**

```bash
source venv/bin/activate
python image_gen_with_KYC.py --image-path <path> --brand-name <name> --kyc-path <kyc_json>
```

**Stage 3: Generate Video Prompts**

```bash
source venv/bin/activate
python video_prompt_generation.py --image-path <image_path>
```

**Stage 4: Generate Video Frames**

```bash
source venv/bin/activate
python video_gen.py --image-path <image_path> --kyc-path <prompt_json>
```

## Output Structure

When running via `main.py`, outputs are organized by job ID:

```
jobs/
└── <job_id>/
    ├── job.log                              # Job-specific log file
    ├── price.json                           # Pricing calculation
    ├── product_kycs/
    │   └── <brand>_<product>_kyc.json      # Full KYC JSON
    │   └── <brand>_<product>_kyc_filtered.json  # Filtered KYC for image gen
    ├── generated_images/
    │   └── <brand>_<product>_<n>.png      # Generated A+ images
    ├── video_frame_prompts/
    │   └── <image_name>_prompt.json        # Video prompts for Veo
    └── video_frames/
        └── <image_name>_video.mp4          # Generated video frames
```

## API Usage

| Stage | Script | Model | Purpose |
|-------|--------|-------|---------|
| 1 | `product_kyc.py` | OpenAI GPT-4.1 mini | Generate product KYC |
| 2 | `image_gen_with_KYC.py` | OpenAI GPT-4.1 + gpt-image-1 | Generate A+ images |
| 3 | `video_prompt_generation.py` | OpenAI GPT-4.1 mini | Generate video prompts |
| 4 | `video_gen.py` | Google Veo 3.1 fast | Generate video frames |

## Pricing

Run the pricing calculation separately:

```bash
source venv/bin/activate
python job_pricing.py --job-dir <job_dir> --job-log-file <log_file> --output-file <output_file>
```

This calculates costs based on token usage from the job logs.

## Notes

- The pipeline uses `main.py` as the orchestrator for end-to-end execution
- Each stage can be run independently for testing
- Job outputs are organized by unique job ID under `jobs/` directory
- Logs are written to both job-specific log files and the global `storage/logs/execution.log`
- Do not commit `.env` to version control (it's in `.gitignore`)
