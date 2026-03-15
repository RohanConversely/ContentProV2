#!/usr/bin/env python3
import os
import base64
import json
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def run_dump():
    pipeline_dir = Path(__file__).parent
    prompt_file = pipeline_dir / "prompts" / "ImageWithKYCTesting.txt"
    kyc_file = pipeline_dir / "product_kycs" / "Nikitavibhor_green_set1_kyc_filtered.json"
    image_folder = pipeline_dir / "product_images"
    output_dir = pipeline_dir / "generated_images_dump_green_set_1024"
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
        print(f"Error: No reference images found in {image_folder}")
        return

    if len(reference_images) > 16:
        print(f"Error: Found {len(reference_images)} reference images, but the image edit API supports at most 16.")
        return

    # 4. Prepare API Client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY not found in .env")
        return
    
    client = OpenAI(api_key=api_key)

    # 5. Call Images API
    print(f"\nCalling gpt-image-1.5.edit with {len(reference_images)} reference image(s) to generate 5 images...")
    
    try:
        response = client.images.edit(
            image=reference_images,
            model="gpt-image-1.5",
            prompt=full_prompt,
            n=5 ,
            size="1024x1024",
            quality="high",
            input_fidelity="high",
        )

        # 6. Process and save outputs
        for index, img_data in enumerate(response.data):
            if img_data.b64_json:
                filename = f"dump_direct_{index+1}.png"
                file_path = output_dir / filename
                
                with open(file_path, "wb") as f:
                    f.write(base64.b64decode(img_data.b64_json))
                
                print(f"Saved: {file_path.resolve()}")
            else:
                print(f"Warning: Image {index+1} had no b64_json data.")

    except Exception as e:
        print(f"API Call failed: {e}")

if __name__ == "__main__":
    run_dump()
