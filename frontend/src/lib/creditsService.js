import { supabase } from './supabase.js';

export async function fetchCredits(userId) {
  if (!supabase || !userId) return 100;
  const { data, error } = await supabase
    .from('credits')
    .select('balance')
    .eq('user_id', userId)
    .single();
  if (error) { console.error('fetchCredits:', error); return 0; }
  return data.balance;
}

export async function deductCredits(userId, amount) {
  if (!userId) {
    console.error('[deductCredits] userId is undefined — skipping deduction');
    return null;
  }
  if (!supabase) return true;
  const { data, error } = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) { console.error('deductCredits:', error); return false; }
  return data;
}
