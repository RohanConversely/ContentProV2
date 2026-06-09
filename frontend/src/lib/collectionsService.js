import { supabase } from './supabase.js';

function base64ToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function uploadImage(path, dataUrl) {
  const blob = base64ToBlob(dataUrl);
  const { error } = await supabase.storage
    .from('contentpro-images')
    .upload(path, blob, { upsert: true, contentType: blob.type });
  if (error) { console.error('uploadImage error:', error.message, error); return null; }
  const { data } = supabase.storage.from('contentpro-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function saveSession({ userId, productName, brandName, sourceImageBase64, results, sequenceNumber = null, serialNumber = null }) {
  if (!userId) {
    console.error('[saveSession] userId is undefined — skipping save');
    return null;
  }
  if (!supabase) return null;

  // 1. Create session row
  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      product_name: productName,
      brand_name: brandName,
      ...(sequenceNumber != null ? { sequence_number: sequenceNumber } : {}),
      ...(serialNumber != null ? { serial_number: serialNumber } : {}),
    })
    .select()
    .single();
  if (error) { console.error('saveSession:', error); return null; }

  const sessionId = session.id;

  // 2. Upload source image and all generated images in parallel
  const validResults = results.filter(r => r?.outputUrl);

  const [thumbUrl, ...generatedUrls] = await Promise.all([
    uploadImage(`${userId}/${sessionId}/source.png`, sourceImageBase64),
    ...validResults.map((r, i) =>
      r.outputUrl.startsWith('data:')
        ? uploadImage(`${userId}/${sessionId}/${r.variant}_${i}.png`, r.outputUrl)
        : Promise.resolve(r.outputUrl)
    ),
  ]);

  // 3. Update session thumbnail and insert generated images in parallel
  await Promise.all([
    supabase.from('sessions').update({ thumbnail_url: thumbUrl }).eq('id', sessionId),
    ...validResults.map((r, i) =>
      supabase.from('session_images').insert({
        session_id: sessionId,
        style_key: r.variant,
        image_url: generatedUrls[i],
      })
    ),
  ]);

  return sessionId;
}

export async function deleteSession(sessionId) {
  if (!supabase) return { error: new Error('Supabase not configured') };
  await supabase.from('session_images').delete().eq('session_id', sessionId);
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
  if (error) return { error };
  return {};
}

export async function fetchSessions(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchSessions:', error); return []; }
  return data;
}

export async function fetchSessionImages(sessionId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('session_images')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchSessionImages:', error); return []; }
  return data;
}
