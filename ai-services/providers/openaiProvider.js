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

const KYC_SYSTEM_PROMPT =
  "You are a product analyst. Given a product image, extract a compact JSON object\nwith these keys: product_type, primary_color, secondary_colors, material, finish,\nshape, has_text_or_logo (bool), approximate_dimensions, notable_features.\nRespond with raw JSON only. No markdown, no explanation.";

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
    const cacheKey = hashString(uploadedImageUrl);
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
              { type: "text", text: "Extract product KYC JSON for this image." },
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

    const finalPrompt =
      variantPrefix +
      ". " +
      PRODUCT_LOCK +
      (userPrompt ? " Additional context: " + userPrompt : "") +
      " Product details: " +
      JSON.stringify(kycJson);

    const finalPass = options.finalPass === true;
    const quality = finalPass ? "high" : "low";
    const n = finalPass ? 1 : 2;
    const image = await createProductFile(uploadedImageUrl);
    const imageResponse = await openai.images.edit({
      model: "gpt-image-1",
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
        model: "gpt-image-1",
        kyc: kycJson,
        kyc_cached: kycCached,
        quality,
      },
    };
  } catch (err) {
    throw new Error(`openaiProvider: ${err.message}`);
  }
}
