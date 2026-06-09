import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { buildPromptForWorker, PRODUCT_FIDELITY_NON_NEGOTIABLE } from './promptBuilder.js';

// ── Configuration ────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 15000;
const DELAY_BETWEEN_IMAGES_MS = 8000;
const MAX_RETRIES = 2;
const WORKER_CONCURRENCY = 1; // eslint-disable-line no-unused-vars

// ── Clients ──────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg, ...args) {
  console.log(`[Worker ${new Date().toISOString()}] ${msg}`, ...args);
}

/**
 * Calls gpt-image-2 edit with the scene prompt, uploads the result to
 * Supabase storage, and returns the public URL.
 * Mirrors the generateVariant image-edit step in openaiProvider.js.
 */
async function generateImage({ prompt, imageUrl, batchJobId, itemId, styleKey }) {
  // Fetch product image as Blob → File (Node 18+ global)
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch product image: ${res.status}`);
  const blob = await res.blob();
  const imageFile = new File([blob], 'product.png', { type: 'image/png' });

  const editPrompt = `Professional product photography. ${prompt} NON-NEGOTIABLE PRODUCT FIDELITY: ${PRODUCT_FIDELITY_NON_NEGOTIABLE} Reproduce the product's design, colors, and details with 100% accuracy from the reference image.`;

  const imageResponse = await openai.images.edit({
    model: 'gpt-image-2',
    image: imageFile,
    prompt: editPrompt,
    n: 1,
    size: '1024x1024',
    quality: 'low',
  });

  const item = imageResponse.data?.[0];
  if (!item?.b64_json) throw new Error('OpenAI returned no image data');

  // Upload to Supabase storage
  const imageBuffer = Buffer.from(item.b64_json, 'base64');
  const storagePath = `batch-results/${batchJobId}/${itemId}/${styleKey}.png`;

  const { error: uploadError } = await supabase.storage
    .from('contentpro-images')
    .upload(storagePath, imageBuffer, { contentType: 'image/png', upsert: true });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage
    .from('contentpro-images')
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

// ── Core generation step ─────────────────────────────────────────────────────

async function generateSingleImage(item, styleKey, job) {
  if (!item.image_url) {
    log(`Skipping Drive-mode item ${item.id} (${styleKey}) — no image_url`);
    return null;
  }

  const effectiveCategory = item.category || job.category;

  const prompt = await buildPromptForWorker({
    productName: item.product_name,
    brandName: item.brand_name,
    category: effectiveCategory,
    industry: job.industry,
    styleKey,
    variantIndex: 0,
    imageUrls: [item.image_url],
    openaiApiKey: process.env.OPENAI_API_KEY,
  });

  log(`Prompt built for item ${item.id} style=${styleKey}: "${prompt.slice(0, 80)}..."`);

  const publicUrl = await generateImage({
    prompt,
    imageUrl: item.image_url,
    batchJobId: job.id,
    itemId: item.id,
    styleKey,
  });

  return publicUrl;
}

// ── Worker loop ──────────────────────────────────────────────────────────────

async function resetStuckItems() {
  const { data, error } = await supabase
    .from('batch_items')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('status', 'processing')
    .select('id');

  if (error) {
    log('Warning: could not reset stuck items:', error.message);
    return;
  }
  if (data?.length) {
    log(`Reset ${data.length} stuck processing item(s) back to pending.`);
  }
}

async function processPendingItems() {
  // Fetch one pending item with its parent job via embedded resource
  const { data, error } = await supabase
    .from('batch_items')
    .select('*, batch_jobs!inner(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    log('DB query error:', error.message);
    return;
  }

  if (!data) {
    log('No pending items. Sleeping...');
    return;
  }

  const item = data;
  const job = data.batch_jobs;

  log(`Processing item ${item.id} (${item.product_name}) job=${job.id}`);

  // Mark as processing
  await supabase
    .from('batch_items')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', item.id);

  const styles = Array.isArray(job.styles) ? job.styles : [];
  let successCount = 0;
  let lastError = null;

  for (let i = 0; i < styles.length; i++) {
    const styleKey = styles[i];

    let attempt = 0;
    let styleSucceeded = false;

    while (attempt <= MAX_RETRIES && !styleSucceeded) {
      try {
        if (attempt > 0) log(`Retry ${attempt}/${MAX_RETRIES} for item ${item.id} style=${styleKey}`);

        const resultUrl = await generateSingleImage(item, styleKey, job);

        if (resultUrl) {
          const { error: insertError } = await supabase
            .from('batch_item_results')
            .insert({
              batch_item_id: item.id,
              style_key: styleKey,
              image_url: resultUrl,
            });

          if (insertError) throw new Error(`Result insert failed: ${insertError.message}`);

          log(`Success: item ${item.id} style=${styleKey} → ${resultUrl}`);
          successCount++;
          styleSucceeded = true;
        } else {
          // Drive-mode skip — treat as non-failure
          styleSucceeded = true;
        }
      } catch (err) {
        attempt++;
        lastError = err;
        log(`Error on item ${item.id} style=${styleKey} attempt ${attempt}: ${err.message}`);
        if (attempt <= MAX_RETRIES) await sleep(3000);
      }
    }

    if (!styleSucceeded) {
      log(`Style ${styleKey} failed after ${MAX_RETRIES + 1} attempts for item ${item.id}`);
    }

    // Throttle between style calls (skip delay after last style)
    if (i < styles.length - 1) {
      log(`Waiting ${DELAY_BETWEEN_IMAGES_MS}ms before next style...`);
      await sleep(DELAY_BETWEEN_IMAGES_MS);
    }
  }

  if (successCount > 0 || !lastError) {
    // At least one style succeeded — mark completed
    await supabase
      .from('batch_items')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', item.id);

    await supabase.rpc('increment_batch_progress', { p_job_id: job.id, p_success: true });
    log(`Item ${item.id} completed (${successCount}/${styles.length} styles succeeded).`);
    await logJobDoneIfComplete(job.id);
  } else {
    // Every style failed
    await supabase
      .from('batch_items')
      .update({
        status: 'failed',
        error_message: lastError?.message ?? 'All styles failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    await supabase.rpc('increment_batch_progress', { p_job_id: job.id, p_success: false });
    log(`Item ${item.id} failed: ${lastError?.message}`);
    await logJobDoneIfComplete(job.id);
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────

async function logJobDoneIfComplete(jobId) {
  const { count } = await supabase
    .from('batch_items')
    .select('*', { count: 'exact', head: true })
    .eq('batch_job_id', jobId)
    .in('status', ['pending', 'processing']);

  if (count === 0) {
    log(`Job ${jobId}: all items done.`);
  }
}

async function run() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[Worker] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('[Worker] OPENAI_API_KEY is required.');
    process.exit(1);
  }

  await resetStuckItems();
  log(`Started. Polling every ${POLL_INTERVAL_MS / 1000}s...`);

  while (true) {
    try {
      await processPendingItems();
    } catch (err) {
      log('Unhandled error in processPendingItems:', err.message);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

run().catch(err => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
