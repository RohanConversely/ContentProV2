const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt } = await request.json();
    const apiKey = Deno.env.get('REPLICATE_API_KEY');

    if (!apiKey) {
      throw new Error('Replicate API key is not configured.');
    }

    const createResponse = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt,
            num_outputs: 1,
            aspect_ratio: '1:1',
            output_format: 'jpg',
          },
        }),
      },
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Image generation request failed: ${errorText}`);
    }

    const prediction = await createResponse.json();

    if (!prediction.id) {
      throw new Error('Image generation response did not include a prediction ID.');
    }

    const startedAt = Date.now();

    while (Date.now() - startedAt < 60000) {
      await sleep(2000);

      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      if (!pollResponse.ok) {
        const errorText = await pollResponse.text();
        throw new Error(`Image generation polling failed: ${errorText}`);
      }

      const result = await pollResponse.json();

      if (result.status === 'succeeded') {
        const imageUrl = result.output?.[0];

        if (!imageUrl) {
          throw new Error('Image generation response did not include an image URL.');
        }

        return new Response(JSON.stringify({ imageUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (result.status === 'failed') {
        throw new Error(result.error || 'Image generation failed');
      }
    }

    throw new Error('Image generation timed out.');
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
