import { useState } from 'react';
import { signIn, signUp, signInWithGoogle } from '../lib/authService.js';

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

        {/* Google OAuth */}
        <button
          type="button"
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-zinc-800 border border-white/10 hover:bg-zinc-700 text-white rounded-lg py-2.5 text-sm font-['DM_Sans'] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30 font-['DM_Sans']">or</span>
          <div className="flex-1 h-px bg-white/10" />
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
