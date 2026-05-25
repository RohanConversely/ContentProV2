const resultLabels = [
  'White Background',
  'Professional Background',
  'With Model',
  'Dimension Scale',
];

export default function ResultsGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {resultLabels.map((label) => (
        <div
          key={label}
          className="flex aspect-square items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-700"
        >
          {label}
        </div>
      ))}
    </div>
  );
}
