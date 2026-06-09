import { useState } from 'react';
import { signIn, signUp } from '../lib/authService.js';

export default function AuthModal({ onSuccess }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password);
      if (result.error) {
        setError(result.error.message);
      } else {
        onSuccess(result.data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-8">

        {/* Wordmark */}
        <p className="font-['Cormorant_Garamond'] text-2xl font-semibold tracking-[0.2em] uppercase text-[#c9a96e] text-center mb-8">
          ContentPro
        </p>

        {/* Tab toggle */}
        <div className="flex bg-zinc-800 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(''); }}
            className={`flex-1 py-2 text-sm rounded-md transition-all font-['DM_Sans'] ${mode === 'signin' ? 'bg-zinc-700 text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-2 text-sm rounded-md transition-all font-['DM_Sans'] ${mode === 'signup' ? 'bg-zinc-700 text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 font-['DM_Sans'] text-sm focus:outline-none focus:border-[#c9a96e] transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 font-['DM_Sans'] text-sm focus:outline-none focus:border-[#c9a96e] transition-colors"
          />

          {error && (
            <p className="text-red-400 text-sm font-['DM_Sans']">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`mt-2 w-full h-12 rounded-lg text-sm uppercase tracking-widest font-['DM_Sans'] font-medium transition-all ${
              loading
                ? 'bg-zinc-700 text-white/40 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#c9a96e] to-[#b8924f] hover:from-[#b8924f] hover:to-[#9a7b45] text-[#080808] shadow-[0_0_15px_rgba(201,169,110,0.3)] cursor-pointer'
            }`}
          >
            {loading ? '...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
