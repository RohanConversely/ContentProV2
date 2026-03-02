# Image Generation Pipeline

A pipeline for generating Amazon A+ content images with KYC (Know Your Customer) documentation.

## Pipeline Steps

1. **Image KYC Generation** - Generate product KYC from product image, brand name, and brand website
2. **A+ Image Generation** - Generate 6-7 realistic product images using the KYC
3. **Per-Image Prompt Generation** - Generate Veo video prompts for each image

## Prerequisites

- Python 3.10+
- OpenAI API key

## Setup

1. **Install dependencies:**

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. **Configure environment variables:**

Copy `.env.example` to `.env` and add your OpenAI API key:

```bash
cp .env.example .env
```

Edit `.env` and replace `your_api_key_here` with your actual OpenAI API key:

```
OPENAI_API_KEY=sk-your-actual-api-key
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
- Generate a KYC JSON and save it to `Tatsya_kyc/kyc.json`

### Custom Brand Configuration

Edit the `main()` function in `product_kyc.py` to change the brand details:

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
├── Tatsya_kyc/
│   └── kyc.json          # Generated KYC data
├── prompts/
│   ├── imageKYC.txt       # KYC generation prompt
│   ├── imageWithKYC.txt  # A+ image generation prompt
│   └── perImagePromptGen.txt  # Veo prompt generation
├── product_kyc.py         # Step 1 script
└── .env                   # API keys (not committed)
```

## Prompts

- `prompts/imageKYC.txt` - Generates product KYC with Amazon India focus
- `prompts/imageWithKYC.txt` - Generates 6-7 A+ content images
- `prompts/perImagePromptGen.txt` - Generates video prompts for each image

## Notes

- The KYC JSON output is stored in `<brand_name>_kyc/kyc.json`
- Subsequent pipeline steps read from this JSON file
- Do not commit `.env` to version control (it's in `.gitignore`)
