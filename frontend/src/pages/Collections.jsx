import { useState, useEffect, useRef } from 'react';
import { fetchSessions, fetchSessionImages } from '../lib/collectionsService.js';
import { getBatchJobs, getBatchItemsWithResults } from '../lib/batchService.js';
import { supabase } from '../lib/supabase.js';
import { useClientMode } from '../lib/clientConfig.js';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function StatusBadge({ status }) {
  const cls = {
    pending:    'bg-zinc-700 text-zinc-300',
    processing: 'bg-blue-900 text-blue-300',
    completed:  'bg-green-900 text-green-400',
    failed:     'bg-red-900 text-red-400',
  }[status] || 'bg-zinc-700 text-zinc-300';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${cls}`}>
      {status === 'processing' && (
        <svg className="animate-spin w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {status}
    </span>
  );
}

function BatchJobCard({ job, expanded, onToggleExpand, items, loadingItems }) {
  const styles = Array.isArray(job.styles) ? job.styles : [];
  const completedItems = job.completed_items || 0;
  const failedItems = job.failed_items || 0;
  const total = job.total_items || 0;
  const done = completedItems + failedItems;
  const creditsUsed = completedItems * styles.length;
  const progress = total > 0 ? (done / total) * 100 : 0;
  const isActive = job.status === 'pending' || job.status === 'processing';

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-medium text-white">Batch Job</p>
          <p className="text-xs text-zinc-400 mt-0.5">{formatDateTime(job.created_at)}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Stats + style pills */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-zinc-400">
          {styles.length} {styles.length === 1 ? 'style' : 'styles'} · {total} {total === 1 ? 'product' : 'products'} · {creditsUsed} credits used
        </span>
        {styles.map(s => (
          <span key={s} className="text-[11px] bg-violet-900/40 text-violet-300 px-2 py-0.5 rounded-full">
            {s.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* Progress bar */}
      {isActive && total > 0 && (
        <div className="mb-3">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-zinc-400">{done} of {total} complete</span>
            {failedItems > 0 && (
              <span className="text-xs text-red-400">· {failedItems} failed</span>
            )}
          </div>
        </div>
      )}

      {/* Expand button */}
      {completedItems > 0 && (
        <button
          onClick={onToggleExpand}
          className="text-xs text-zinc-400 hover:text-white transition-colors mt-1"
        >
          {expanded ? 'Hide ▴' : 'View Results ▾'}
        </button>
      )}

      {/* Expanded results */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
          {loadingItems ? (
            <p className="text-xs text-zinc-500">Loading results...</p>
          ) : items?.length > 0 ? (
            items.map(item => (
              <div key={item.id}>
                <p className="text-sm font-medium text-zinc-300 mb-2">{item.product_name}</p>
                {item.status === 'pending' || item.status === 'processing' ? (
                  <p className="text-xs text-zinc-500 italic">Generating...</p>
                ) : item.status === 'failed' ? (
                  <p className="text-xs text-red-400" title={item.error_message || ''}>Failed</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(item.batch_item_results || []).map(result => (
                      <a
                        key={result.id}
                        href={result.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 hover:brightness-110 transition-all"
                      >
                        <img
                          src={result.image_url}
                          alt={result.style_key}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500">No results yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Collections({ onBack, userId }) {
  const { isClientMode, config: clientConfig } = useClientMode();
  const [resolvedUserId, setResolvedUserId] = useState(userId || null);

  // Sessions state
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionImages, setSessionImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // Batch state
  const [batchJobs, setBatchJobs] = useState([]);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState(new Set());
  const [jobItems, setJobItems] = useState({});
  const [loadingItemsFor, setLoadingItemsFor] = useState(new Set());
  const activeJobIdsRef = useRef([]);
  const pollRef = useRef(null);

  // Resolve user ID once and load sessions
  useEffect(() => {
    async function init() {
      const uid = userId || (await supabase.auth.getUser()).data?.user?.id;
      setResolvedUserId(uid);
      if (!uid) { setLoading(false); return; }
      const data = await fetchSessions(uid);
      setSessions(data);
      setLoading(false);
    }
    init();
  }, []);

  // Load batch jobs when switching to batch tab
  useEffect(() => {
    if (activeTab !== 'batch' || !resolvedUserId) return;
    async function load() {
      setLoadingBatch(true);
      const jobs = await getBatchJobs(resolvedUserId);
      setBatchJobs(jobs);
      setLoadingBatch(false);
    }
    load();
  }, [activeTab, resolvedUserId]);

  // Keep active job IDs ref current without restarting the poll interval
  useEffect(() => {
    activeJobIdsRef.current = batchJobs
      .filter(j => j.status === 'pending' || j.status === 'processing')
      .map(j => j.id);
  }, [batchJobs]);

  // Poll active jobs every 30s; restart interval only when tab changes
  useEffect(() => {
    if (activeTab !== 'batch') {
      clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const ids = activeJobIdsRef.current;
      if (ids.length === 0) {
        clearInterval(pollRef.current);
        return;
      }
      const { data } = await supabase
        .from('batch_jobs')
        .select('*')
        .in('id', ids);
      if (data?.length) {
        setBatchJobs(prev => prev.map(j => data.find(d => d.id === j.id) || j));
      }
    }, 30000);
    return () => clearInterval(pollRef.current);
  }, [activeTab]);

  async function openSession(session) {
    setActiveSession(session);
    setLoadingImages(true);
    const images = await fetchSessionImages(session.id);
    setSessionImages(images);
    setLoadingImages(false);
  }

  async function toggleExpand(jobId) {
    const job = batchJobs.find(j => j.id === jobId);
    if (!job || (job.completed_items || 0) === 0) return;

    setExpandedJobs(prev => {
      const next = new Set(prev);
      next.has(jobId) ? next.delete(jobId) : next.add(jobId);
      return next;
    });

    if (!jobItems[jobId] && !loadingItemsFor.has(jobId)) {
      setLoadingItemsFor(prev => new Set(prev).add(jobId));
      const items = await getBatchItemsWithResults(jobId);
      setJobItems(prev => ({ ...prev, [jobId]: items }));
      setLoadingItemsFor(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  }

  // ── Session detail view ──────────────────────────────────────────
  if (activeSession) {
    const showSerial = isClientMode && clientConfig?.showSequenceNumber;
    const sequenceLabel = showSerial && activeSession.sequence_number != null
      ? `#${String(activeSession.sequence_number).padStart(3, '0')}`
      : null;

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
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
          <p className="text-xs uppercase tracking-widest text-white/30 mb-4">Images</p>
          {loadingImages ? (
            <div className="text-white/30 text-sm">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
        <p className="text-white/40 text-sm mb-6">Every generation session saved automatically.</p>

        {/* Tab bar */}
        <div className="flex gap-6 border-b border-white/10 mb-8">
          {[['sessions', 'Sessions'], ['batch', 'Batch Jobs']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-b-2 border-violet-500 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sessions tab */}
        {activeTab === 'sessions' && (
          loading ? (
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
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-zinc-800">
                    {session.thumbnail_url
                      ? <img src={session.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-zinc-700" />
                    }
                  </div>
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
          )
        )}

        {/* Batch Jobs tab */}
        {activeTab === 'batch' && (
          loadingBatch ? (
            <div className="text-white/30 text-sm">Loading batch jobs...</div>
          ) : batchJobs.length === 0 ? (
            <div className="text-white/30 text-sm">No batch jobs yet — submit a batch to get started.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {batchJobs.map(job => (
                <BatchJobCard
                  key={job.id}
                  job={job}
                  expanded={expandedJobs.has(job.id)}
                  onToggleExpand={() => toggleExpand(job.id)}
                  items={jobItems[job.id]}
                  loadingItems={loadingItemsFor.has(job.id)}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
