import ResultsGrid from '../components/ResultsGrid.jsx';

export default function Results() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-slate-950">Results</h1>
      <div className="mt-8">
        <ResultsGrid />
      </div>
    </main>
  );
}
