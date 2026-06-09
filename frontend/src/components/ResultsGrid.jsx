import { useState } from 'react';

const STYLE_LABELS = {
  white_bg: 'White Background',
  white_bg_dims: 'White BG + Dimensions',
  with_model: 'With Model',
  professional: 'Professional',
  flat_lay: 'Flat Lay',
};

function CopyButton({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback for browsers blocking clipboard in non-https
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`text-xs px-2 py-1 rounded border transition-colors ${
        copied
          ? 'border-green-500/50 text-green-400 bg-green-500/10'
          : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
      } ${className}`}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}

function CopyPanel({ copy }) {
  const [open, setOpen] = useState(false);

  if (!copy) return null;

  return (
    <div className="border-t border-white/10">
      {/* Toggle row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-xs text-white/40 font-['DM_Sans'] tracking-wide">
          Copy Description &amp; SEO
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-white/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4">
          {/* Description */}
          {copy.description && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-['DM_Sans']">Description</span>
                <CopyButton text={copy.description} label="Copy" />
              </div>
              <p className="text-xs text-white/70 font-['DM_Sans'] leading-relaxed">
                {copy.description}
              </p>
            </div>
          )}

          {/* SEO Keywords */}
          {copy.seo_keywords?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-['DM_Sans']">SEO Keywords</span>
                <CopyButton text={copy.seo_keywords.join(', ')} label="Copy All" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {copy.seo_keywords.map(kw => (
                  <span
                    key={kw}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/25 text-[#a78bfa] font-['DM_Sans']"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result, onReroll }) {
  const key = result.id;
  const label = STYLE_LABELS[result.variant] || result.variant.replace(/_/g, ' ');

  const handleDownload = async () => {
    try {
      const response = await fetch(result.outputUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${result.variant}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(result.outputUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden">
      {/* Image */}
      <div className="relative overflow-hidden bg-[#0a0a0b]" style={{ aspectRatio: '1' }}>
        {result.success && result.outputUrl ? (
          <img
            src={result.outputUrl}
            alt={label}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
            {result.error || 'No image'}
          </div>
        )}
      </div>

      {/* Actions */}
      {result.success && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e1e1e]">
          <span className="font-['Cormorant_Garamond'] text-sm text-[#aaaaaa]">
            {label}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReroll?.(key)}
              className="rounded-lg border py-2 px-3 text-sm font-semibold transition"
              style={{ borderColor: '#a78bfa', color: '#a78bfa' }}
            >
              Re-roll
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-[#c9a96e] hover:bg-[#b8924f] text-[#080808] text-xs font-medium font-['DM_Sans'] tracking-widest uppercase transition-colors"
            >
              ↓ Download
            </button>
          </div>
        </div>
      )}

      {/* SEO / Copy panel */}
      {result.success && <CopyPanel copy={result.copy} />}
    </div>
  );
}

export default function ResultsGrid({ results = [], onReroll }) {
  if (results.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-zinc-500">
        No results yet — go back and generate!
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {results.map(result => (
        <ResultCard
          key={result.id}
          result={result}
          onReroll={onReroll}
        />
      ))}
    </div>
  );
}
