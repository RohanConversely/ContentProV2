async function getProvider() {
  const providerName = import.meta.env.VITE_AI_PROVIDER || "mock";

  if (providerName === "mock") {
    const mod = await import("./providers/mockProvider.js");
    return mod;
  }

  if (providerName === "fal") {
    const mod = await import("./providers/falProvider.js");
    return mod;
  }

  throw new Error(`Unknown AI provider: ${providerName}`);
}

export async function generateVariant(variant, uploadedImageUrl, userPrompt) {
  try {
    const mod = await getProvider();

    return mod.generateImage(variant, uploadedImageUrl, userPrompt);
  } catch (err) {
    return {
      success: false,
      variant,
      error: err.message,
      provider: import.meta.env.VITE_AI_PROVIDER || "mock",
    };
  }
}
