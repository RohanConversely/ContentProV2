import ResultsGrid from '../components/ResultsGrid.jsx';

export default function Results({ results = [], onReroll, onBack }) {
  return (
    <div className="min-h-screen bg-[#0a0a0b] px-6 py-10">
      {/* Top bar */}
      <div className="mb-8 flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#111116] px-4 py-2 text-sm text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back
          </button>
        )}
        <div>
          <h1 className="text-2xl font-semibold">
            <span style={{ background: 'linear-gradient(135deg, #fff 40%, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Your Generated Images
            </span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Review and download your product photos</p>
        </div>
      </div>

      <ResultsGrid results={results} onReroll={onReroll} />
    </div>
  );
}
