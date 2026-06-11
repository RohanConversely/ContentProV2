import { supabase } from './supabase.js';

const BATCH_API = import.meta.env.VITE_BATCH_API_URL;

// ── FastAPI batch service calls ───────────────────────────────────────────────

export async function submitBatchToFastAPI(images, metadata) {
  const formData = new FormData();
  for (const image of images) {
    formData.append('files', image, image.name);
  }
  formData.append('scene_brief', metadata.scene_brief || 'Create a premium ecommerce product image with a clean premium background.');
  formData.append('product_category', metadata.category || 'pets_accessories');
  formData.append('completion_window', metadata.completion_window || '24h');
  formData.append('input_fidelity', metadata.input_fidelity || 'low');
  formData.append('image_count', String(metadata.image_count || 1));
  if (metadata.job_id) formData.append('job_id', metadata.job_id);

  const res = await fetch(`${BATCH_API}/batch/folder-upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Batch submission failed (${res.status})`);
  }
  return res.json();
}

export async function pollBatchStatus(batchId) {
  const res = await fetch(`${BATCH_API}/batch/${batchId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Status poll failed (${res.status})`);
  }
  return res.json();
}

export async function triggerBatchDownload(batchId, jobId) {
  const res = await fetch(`${BATCH_API}/batch/${batchId}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Download trigger failed (${res.status})`);
  }
  return res.json();
}

// ── Supabase batch data functions ─────────────────────────────────────────────

export async function getBatchJobs(userId) {
  const { data, error } = await supabase
    .from('batch_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getBatchItemsWithResults(jobId) {
  const { data, error } = await supabase
    .from('batch_items')
    .select('*, batch_item_results(*)')
    .eq('batch_job_id', jobId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function uploadBatchImage(file, batchJobId) {
  const path = `batch/${batchJobId}/${file.name}`;
  const { error } = await supabase.storage
    .from('contentpro-images')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('contentpro-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function createBatchJob({ userId, clientCode, styles, industry, category, driveLink, items, batchIds, status }) {
  const { data: jobData, error: jobError } = await supabase
    .from('batch_jobs')
    .insert({
      user_id: userId,
      client_code: clientCode ?? null,
      styles: Array.isArray(styles) ? styles : [...styles],
      industry: industry || null,
      category: category || null,
      drive_link: driveLink ?? null,
      total_items: items.length,
      status: status || 'pending',
      batch_ids: batchIds ?? null,
    })
    .select('id')
    .single();
  if (jobError) throw jobError;

  const batchJobId = jobData.id;

  if (items.length > 0) {
    const batchItems = items.map(item => ({
      batch_job_id: batchJobId,
      product_name: item.product_name,
      brand_name: item.brand_name ?? null,
      category: item.category ?? null,
      image_url: item.image_url || '',
      original_filename: item.original_filename,
      status: 'pending',
    }));

    const { error: itemsError } = await supabase.from('batch_items').insert(batchItems);
    if (itemsError) throw itemsError;
  }

  return batchJobId;
}
