# Image Generation Pipeline

A pipeline for generating Amazon A+ content images with KYC (Know Your Customer) documentation, video prompts, and video frames.

## Pipeline Steps

1. **Image KYC Generation** - Generate product KYC from product image, brand name, and brand website
2. **A+ Image Generation** - Generate 6-7 realistic product images using the KYC
3. **Per-Image Prompt Generation** - Generate Veo video prompts for each generated image
4. **Video Frame Generation** - Generate video frames from images using Veo 3.1

## Prerequisites

- Python 3.10+
- OpenAI API key
- Gemini API key (for video generation)

## Setup

1. **Install dependencies:**

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. **Configure environment variables:**

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and replace with your actual API keys:

```
OPENAI_API_KEY=sk-your-actual-api-key
GEMINI_API_KEY=your-gemini-api-key
```

## Usage

### Step 1: Generate Image KYC

Run the product KYC generation script:

```bash
source venv/bin/activate
python product_kyc.py
```

This will:
- Read the product image (`tatsya_product.jpg`)
- Use brand name "Tatsya" and website "https://tatsya.com/"
- Generate a KYC JSON and save it to `product_kycs/`

### Step 2: Generate A+ Content Images

Run the image generation script:

```bash
source venv/bin/activate
python image_gen_with_KYC.py
```

This will:
- Read the product image and KYC JSON
- Generate 4 A+ content images
- Save them to `generated_images/`

### Step 3: Generate Video Prompts

Run the video prompt generation script:

```bash
source venv/bin/activate
python video_prompt_generation.py
```

This will:
- Read the first image from `generated_images/`
- Use `prompts/perImagePromptGen.txt` as the prompt
- Generate video prompts using GPT-4.1 mini
- Save them to `video_frame_prompts/`

### Step 4: Generate Video Frames

Run the video generation script:

```bash
source venv/bin/activate
python video_gen.py
```

This will:
- Read the image from `generated_images/`
- Use the KYC JSON as the prompt
- Generate video frames using Veo 3.1 fast model
- Save them to `video_frames/`

### Custom Brand Configuration

Edit the `main()` function in each script to change the brand details:

```python
def main():
    generate_image_kyc(
        image_path="path/to/your/product.jpg",
        brand_name="YourBrandName",
        brand_website="https://yourbrand.com/",
    )
```

## Output Structure

```
project_root/
├── product_kycs/
│   └── <brand>_<product>_kyc.json    # Generated KYC data
├── generated_images/
│   └── <brand>_<product>_<n>.png      # Generated A+ images
├── video_frame_prompts/
│   └── <image_name>_prompt.json       # Video prompts for Veo
├── video_frames/
│   └── <image_name>_video.mp4        # Generated video frames
├── prompts/
│   ├── imageKYC.txt                   # KYC generation prompt
│   ├── imageWithKYC.txt              # A+ image generation prompt
│   └── perImagePromptGen.txt         # Veo prompt generation
├── product_kyc.py                     # Step 1 script
├── image_gen_with_KYC.py              # Step 2 script
├── video_prompt_generation.py         # Step 3 script
├── video_gen.py                       # Step 4 script
└── .env                               # API keys (not committed)
```

## Scripts

| Script | Purpose | API |
|--------|---------|-----|
| `product_kyc.py` | Generate product KYC | OpenAI GPT-4.1 mini |
| `image_gen_with_KYC.py` | Generate A+ images | OpenAI gpt-image-1 |
| `video_prompt_generation.py` | Generate video prompts | OpenAI GPT-4.1 mini |
| `video_gen.py` | Generate video frames | Google Veo 3.1 fast |

