import { useState, useEffect } from 'react';
import { fetchSessions, fetchSessionImages } from '../lib/collectionsService.js';
import { supabase } from '../lib/supabase.js';
import { useClientMode } from '../lib/clientConfig.js';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Collections({ onBack, userId }) {
  const { isClientMode, config: clientConfig } = useClientMode();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionImages, setSessionImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    async function load() {
      const resolvedUserId = userId || (await supabase.auth.getUser()).data?.user?.id;
      if (!resolvedUserId) { setLoading(false); return; }
      fetchSessions(resolvedUserId).then(data => {
        setSessions(data);
        setLoading(false);
      });
    }
    load();
  }, []);

  async function openSession(session) {
    setActiveSession(session);
    setLoadingImages(true);
    const images = await fetchSessionImages(session.id);
    setSessionImages(images);
    setLoadingImages(false);
  }

  // ── Session detail view ──────────────────────────────────────────
  if (activeSession) {
    const showSerial = isClientMode && clientConfig?.showSequenceNumber;
    const sequenceLabel = showSerial && activeSession.sequence_number != null
      ? `#${String(activeSession.sequence_number).padStart(3, '0')}`
      : null;

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#080808] border-b border-white/10 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => { setActiveSession(null); setSessionImages([]); }}
            className="text-white/50 hover:text-white transition-colors text-sm flex items-center gap-2"
          >
            ← Back to Collections
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {activeSession.brand_name} — {activeSession.product_name}
              {activeSession.serial_number && (
                <span className="ml-2 text-[#c9a96e] font-['DM_Sans'] tracking-wider text-xs">{activeSession.serial_number}</span>
              )}
            </p>
            <p className="text-xs text-white/40 mt-0.5 flex items-center gap-2">
              {formatDate(activeSession.created_at)}
              {sequenceLabel && <span className="text-[#c9a96e]">{sequenceLabel}</span>}
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* Image grid: source upload first, then generated */}
          <p className="text-xs uppercase tracking-widest text-white/30 mb-4">Images</p>
          {loadingImages ? (
            <div className="text-white/30 text-sm">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

              {/* Source / upload image */}
              {activeSession.thumbnail_url && (
                <div className="rounded-xl overflow-hidden border border-[#c9a96e]/30 bg-zinc-900 relative">
                  <img src={activeSession.thumbnail_url} alt="Original upload" className="w-full aspect-square object-cover" />
                  <div className="px-3 py-2 flex items-center justify-between">
                    <p className="text-xs text-[#c9a96e]/70 font-['DM_Sans'] tracking-wide">Original</p>
                    <a
                      href={activeSession.thumbnail_url}
                      download="original.png"
                      className="text-xs text-[#a78bfa] hover:text-white transition-colors"
                    >
                      ↓
                    </a>
                  </div>
                </div>
              )}

              {/* Generated images */}
              {sessionImages.map(img => (
                <div key={img.id} className="rounded-xl overflow-hidden border border-white/10 bg-zinc-900 group relative">
                  <img src={img.image_url} alt={img.style_key} className="w-full aspect-square object-cover" />
                  <div className="px-3 py-2 flex items-center justify-between">
                    {showSerial && activeSession.sequence_number != null ? (
                      <p className="text-xs text-white/50 font-['DM_Sans'] tracking-widest">{sequenceLabel}</p>
                    ) : (
                      <p className="text-xs text-white/50 capitalize">{img.style_key.replace(/_/g, ' ')}</p>
                    )}
                    <a
                      href={img.image_url}
                      download={`${img.style_key}.png`}
                      className="text-xs text-[#a78bfa] hover:text-white transition-colors"
                    >
                      ↓
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Collections list view ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#080808] border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-white/50 hover:text-white transition-colors text-sm flex items-center gap-2"
        >
          ← Back
        </button>
        <div className="h-4 w-px bg-white/10" />
        <p className="text-sm font-semibold text-white">Collections</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-1">Your Collections</h1>
        <p className="text-white/40 text-sm mb-8">Every generation session saved automatically.</p>

        {loading ? (
          <div className="text-white/30 text-sm">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-white/30 text-sm">No sessions yet — generate your first image to get started.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => openSession(session)}
                className="w-full flex items-center gap-4 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 hover:border-[#a78bfa]/40 hover:bg-zinc-800 transition-all text-left"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-zinc-800">
                  {session.thumbnail_url
                    ? <img src={session.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-zinc-700" />
                  }
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{session.brand_name} — {session.product_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-white/40">{formatDate(session.created_at)}</p>
                    {session.serial_number && (
                      <span className="text-xs text-[#c9a96e] font-['DM_Sans'] tracking-wider">{session.serial_number}</span>
                    )}
                    {session.sequence_number != null && (
                      <span className="text-xs text-white/30">#{String(session.sequence_number).padStart(3, '0')}</span>
                    )}
                  </div>
                </div>
                <span className="text-white/20 text-lg">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
