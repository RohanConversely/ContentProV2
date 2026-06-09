const MOCK_OUTPUTS = {
  white_background: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1024&q=90",
  professional: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1024&q=90",
  with_model: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1024&q=90",
  with_box: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1024&q=90",
};

const FALLBACK_OUTPUT = "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1024&q=90";

export async function generateImage(variant, uploadedImageUrl, templateImageUrl, userPrompt) {
  const startedAt = new Date().toISOString();

  await new Promise((resolve) => setTimeout(resolve, 2500));

  const completedAt = new Date().toISOString();
  const outputUrl = MOCK_OUTPUTS[variant] || FALLBACK_OUTPUT;

  return {
    success: true,
    variant: variant,
    outputUrl,
    seed: 42,
    provider: "mock",
    metadata: {
      model: "mock-flux-v1",
      inference_steps: 28,
      guidance_scale: 7.5,
      strength: 0.85,
      prompt_used: userPrompt,
      source_image: uploadedImageUrl,
      template_image: templateImageUrl || null,
      started_at: startedAt,
      completed_at: completedAt,
      duration_ms: 2500,
    },
  };
}

export async function generateVariant(variant, uploadedImageUrl, templateImageUrl, userPrompt) {
  const result = await generateImage(variant, uploadedImageUrl, templateImageUrl, userPrompt);
  return {
    ...result,
    copy: {
      description: "A premium quality product crafted for everyday use. Built with attention to detail and durable materials, it delivers both style and function. Perfect for gifting or personal use.",
      seo_keywords: ["premium quality", "everyday use", "durable", "stylish design", "best seller", "top rated", "value for money", "fast delivery"],
    },
  };
}
