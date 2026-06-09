import { supabase } from './supabase.js';

export async function signUp(email, password) {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error };

  const userId = data.user?.id;
  if (userId) {
    const { error: creditsError } = await supabase
      .from('credits')
      .insert({ user_id: userId, balance: 100 });
    if (creditsError) console.error('signUp credits insert:', creditsError);
  }

  return { data };
}

export async function signIn(email, password) {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error };
  return { data };
}

export async function signInWithGoogle() {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/generator' },
  });
  if (error) return { error };
  return { data };
}

export async function signOut() {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const { error } = await supabase.auth.signOut();
  if (error) return { error };
  return {};
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export function onAuthChange(callback) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}
