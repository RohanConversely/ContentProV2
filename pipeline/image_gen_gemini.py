#!/usr/bin/env python3
import os
import base64
import json
from pathlib import Path
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

def run_dump():
    pipeline_dir = Path(__file__).parent
    prompt_file = pipeline_dir / "prompts" / "ImageWithKYCTesting.txt"
    kyc_file = pipeline_dir / "product_kycs" / "Nikitavibhor_pendent_set1_kyc_filtered.json"
    image_folder = pipeline_dir / "product_images2"
    output_dir = pipeline_dir / "generated_images_dump"
    output_dir.mkdir(parents=True, exist_ok=True)

    if not prompt_file.exists():
        print(f"Error: Prompt file not found at {prompt_file}")
        return
    
    with open(prompt_file, "r", encoding="utf-8") as f:
        base_prompt = f.read()

    kyc_text = ""
    if kyc_file.exists():
        with open(kyc_file, "r", encoding="utf-8") as f:
            kyc_data = json.load(f)
            kyc_text = json.dumps(kyc_data, indent=2)
    else:
        print(f"Warning: KYC file not found at {kyc_file}")

    full_prompt = (
        f"{base_prompt}\n\n"
        f"### PRODUCT KYC DATA (STRICT REFERENCE):\n"
        f"{kyc_text}\n\n"
        f"Please generate 5 images based on the reference images and KYC provided above."
    )

    # 3. Gather reference images
    reference_images = []
    supported_exts = {".jpg", ".jpeg", ".png", ".webp"}
    
    if image_folder.exists():
        # Sort to ensure consistent "Image 1", "Image 2" referencing
        for img_path in sorted(image_folder.iterdir()):
            if img_path.suffix.lower() in supported_exts:
                print(f"Loading reference image: {img_path.name}")
                reference_images.append(img_path)
    
    if not reference_images:
        print(f"Warning: No reference images found in {image_folder}")

    if len(reference_images) > 16:
        print(f"Warning: Found {len(reference_images)} reference images.")

    # 4. Prepare API Client
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env")
        return
    
    client = genai.Client(api_key=api_key)

    # 5. Call Images API
    print(f"\nCalling gemini-3-pro-image-preview to generate 5 images...")
    print("Note: gemini-3-pro-image-preview currently generates from text prompt only.")
    
    try:
        response = client.models.generate_images(
            model="gemini-3-pro-image-preview",
            prompt=full_prompt,
            config=types.GenerateImagesConfig(
                number_of_images=5,
                output_mime_type="image/jpeg",
                aspect_ratio="1:1"
            )
        )

        # 6. Process and save outputs
        if not response.generated_images:
            print("Warning: No images returned from Gemini API.")
            
        for index, generated_image in enumerate(response.generated_images):
            if hasattr(generated_image, "image") and hasattr(generated_image.image, "image_bytes"):
                filename = f"dump_direct_{index+1}.jpeg"
                file_path = output_dir / filename
                
                with open(file_path, "wb") as f:
                    f.write(generated_image.image.image_bytes)
                
                print(f"Saved: {file_path.resolve()}")
            else:
                print(f"Warning: Image {index+1} had no valid image_bytes data.")

    except Exception as e:
        print(f"API Call failed: {e}")

if __name__ == "__main__":
    run_dump()
