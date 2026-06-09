import * as mockProvider from "./providers/mockProvider.js";
import * as openaiProvider from "./providers/openaiProvider.js";

async function getProvider() {
  const providerName = import.meta.env.VITE_AI_PROVIDER || "mock";

  if (providerName === "mock") {
    return mockProvider;
  }

  if (providerName === "openai") {
    return openaiProvider;
  }

  throw new Error(`Unknown AI provider: ${providerName}`);
}

export async function generateWithQueue(tasks, delayMs = 15000, onProgress) {
  const results = [];
  for (let i = 0; i < tasks.length; i++) {
    const result = await tasks[i]();
    results.push(result);
    onProgress?.(i + 1, tasks.length);
    if (i < tasks.length - 1) {
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
  return results;
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
