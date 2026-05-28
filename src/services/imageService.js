async function getProvider() {
  const providerName = import.meta.env.VITE_AI_PROVIDER || "mock";

  if (providerName === "mock") {
    const mod = await import("./providers/mockProvider.js");
    return mod;
  }

  if (providerName === "fal") {
    const path = "./providers/falProvider.js";
    const mod = await import(/* @vite-ignore */ path);
    return mod;
  }

  if (providerName === "openai") {
    const path = "./providers/openaiProvider.js";
    const mod = await import(/* @vite-ignore */ path);
    return mod;
  }

  throw new Error(`Unknown AI provider: ${providerName}`);
}

export async function generateVariant(variant, uploadedImageUrl, userPrompt, options) {
  try {
    const mod = await getProvider();

    return mod.generateVariant(variant, uploadedImageUrl, userPrompt, options);
  } catch (err) {
    return {
      success: false,
      variant,
      error: err.message,
      provider: import.meta.env.VITE_AI_PROVIDER || "mock",
    };
  }
}
