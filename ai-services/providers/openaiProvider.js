import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const kycCache = new Map();

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash.toString();
}

const VARIANT_PREFIXES = {
  white_background:
    "Product on pure white seamless background, Amazon listing ready, professional studio lighting, no shadows, isolated, DSLR quality",
  professional:
    "Product in premium lifestyle studio environment, soft directional lighting, subtle surface reflection, Amazon A+ content style, photorealistic",
  with_model:
    "Product being worn/used by a professional model, Indian lifestyle context, studio quality, natural interaction, Amazon A+ content",
  with_box:
    "Product placed inside its open retail packaging box, studio lighting, clean flat lay perspective, Amazon listing ready",
};

const PRODUCT_LOCK =
  "The uploaded product image is the single source of truth. Shape, size, proportions, color tones, material finish, surface texture, branding placement, logos, text, edges, curves, thickness, transparency, reflections, shadows, and overall geometry must remain identical to the reference image. Only background, environment, camera angle, lighting, and context may vary.";

const KYC_SYSTEM_PROMPT = `You are a senior product analyst and e-commerce
strategist specialising in the Indian market (Amazon.in, Flipkart, Meesho,
Nykaa, Myntra). You will be given a product image and optional metadata.
Your job is to perform a deep KYC (Know Your Product) analysis and return
a single raw JSON object. No markdown, no explanation, no code fences —
raw JSON only.

The JSON must have exactly these top-level keys:

{
  "product_basic_kyc": {
    "product_name": "string — inferred or from metadata",
    "brand_name": "string — inferred or from metadata",
    "brand_website": "string — from metadata or null",
    "category": "string — from metadata or inferred",
    "sub_category": "string — specific sub-type",
    "product_description": "string — concise 2-3 sentence description",
    "primary_color": "string",
    "secondary_colors": ["array of strings"],
    "material": "string",
    "finish": "string — matte / glossy / satin / textured etc.",
    "shape": "string",
    "approximate_dimensions": "string — e.g. 30cm x 20cm x 10cm",
    "has_text_or_logo": true,
    "notable_features": ["array of strings"]
  },
  "keyword_oriented_kyc": {
    "primary_keywords": ["5-7 high-volume Indian market search terms"],
    "long_tail_keywords": ["5-7 specific buyer-intent phrases"],
    "regional_relevance": "string — any regional/festival/seasonal angle",
    "target_buyer_persona": "string — who buys this in India",
    "price_segment": "budget / mid-range / premium / luxury"
  },
  "competitor_analysis": {
    "top_competing_products": ["3-5 competitor product types on Amazon.in"],
    "visual_differentiation": "string — what makes this product visually stand out",
    "common_listing_weaknesses": ["2-3 weaknesses seen in competitor listings"]
  },
  "image_generation_guidance": {
    "hero_shot_recommendation": "string — best single shot type for this product",
    "must_show_features": ["3-5 features that must be visible in listing images"],
    "avoid_in_images": ["2-3 things to avoid that would hurt conversion"],
    "colour_background_recommendation": "string — best background colour/tone",
    "props_recommendation": ["2-4 props that add context without distracting"],
    "indian_context_hooks": ["2-3 culturally relevant visual hooks for Indian buyers"]
  }
}`;

function parseKycJson(content) {
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`failed to parse KYC JSON: ${err.message}`);
  }
}

async function createProductFile(uploadedImageUrl) {
  const response = await fetch(uploadedImageUrl);

  if (!response.ok) {
    throw new Error(`failed to fetch uploaded image: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const imageBlob = blob.type === "image/png" ? blob : new Blob([blob], { type: "image/png" });

  return new File([imageBlob], "product.png", { type: "image/png" });
}

export async function generateVariant(variant, uploadedImageUrl, userPrompt, options = {}) {
  try {
    const cacheKey = hashString(uploadedImageUrl + (options.productName || '') + (options.brandName || ''));
    const kycCached = kycCache.has(cacheKey);
    let kycJson;

    if (kycCached) {
      kycJson = kycCache.get(cacheKey);
    } else {
      const kycResponse = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: KYC_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: uploadedImageUrl } },
              {
                type: "text",
                text: `Extract product KYC JSON for this image.
Metadata provided:
- Product Name: ${options.productName || "not provided"}
- Brand Name: ${options.brandName || "not provided"}
- Brand Website: ${options.brandWebsite || "not provided"}
- Category: ${userPrompt || "not provided"}
- Description: ${options.description || "not provided"}

Use metadata to fill product_basic_kyc fields where available.
Infer everything else from the image.`,
              },
            ],
          },
        ],
      });

      const kycContent = kycResponse.choices?.[0]?.message?.content;

      if (!kycContent) {
        throw new Error("KYC response did not include message content");
      }

      kycJson = parseKycJson(kycContent);
      kycCache.set(cacheKey, kycJson);
    }
    const variantPrefix = VARIANT_PREFIXES[variant];

    if (!variantPrefix) {
      throw new Error(`unsupported variant: ${variant}`);
    }

    const finalPrompt = JSON.stringify({
      generation_task: {
        objective: "Generate a photorealistic Amazon.in product listing image",
        variant: variant,
        variant_instruction: variantPrefix
      },
      product_lock: {
        instruction: PRODUCT_LOCK,
        strictness: "absolute — any deviation from reference image shape, color, logo, texture, or proportions is a generation failure"
      },
      realism_standard: {
        quality_target: "indistinguishable from a professional DSLR product photograph",
        lighting_realism: "physically accurate light falloff, no flat AI lighting",
        material_realism: "surface texture and reflectance must match reference image material",
        shadow_realism: "natural grounded shadow appropriate to environment"
      },
      image_composition: {
        category: options.category || userPrompt || "general",
        instruction: "Choose the most conversion-optimised composition for this product category on Amazon.in. Environment, props, angle, and lighting must feel authentic to Indian buyer expectations."
      },
      product_kyc_reference: kycJson
    });

    const finalPass = options.finalPass === true;
    const quality = finalPass ? "high" : "low";
    const n = finalPass ? 1 : 2;
    const image = await createProductFile(uploadedImageUrl);
    const imageResponse = await openai.images.edit({
      model: "gpt-image-2",
      image,
      prompt: finalPrompt,
      n,
      size: "1024x1024",
      quality,
    });

    const item = imageResponse.data?.[0];

    if (!item?.b64_json) {
      throw new Error("image response did not include b64_json output");
    }

    return {
      success: true,
      variant,
      outputUrl: "data:image/png;base64," + item.b64_json,
      seed: null,
      provider: "openai",
      metadata: {
        prompt_used: finalPrompt,
        model: "gpt-image-2",
        kyc: kycJson,
        kyc_cached: kycCached,
        quality,
      },
    };
  } catch (err) {
    throw new Error(`openaiProvider: ${err.message}`);
  }
}
