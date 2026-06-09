import { supabase } from './supabase.js';

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

export async function createBatchJob({ userId, clientCode, styles, industry, category, driveLink, items }) {
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
      status: 'pending',
    })
    .select('id')
    .single();
  if (jobError) throw jobError;

  const batchJobId = jobData.id;

  const batchItems = items.map(item => ({
    batch_job_id: batchJobId,
    product_name: item.product_name,
    brand_name: item.brand_name ?? null,
    category: item.category ?? null,
    image_url: item.image_url,
    original_filename: item.original_filename,
    status: 'pending',
  }));

  const { error: itemsError } = await supabase.from('batch_items').insert(batchItems);
  if (itemsError) throw itemsError;

  return batchJobId;
}
