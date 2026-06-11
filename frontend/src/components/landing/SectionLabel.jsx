export function SectionLabel({ children, num }) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs tracking-[0.2em] uppercase text-cream-muted">
      {num && <span className="text-lime">{num}</span>}
      <span className="h-px w-8 bg-line-strong" />
      {children}
    </div>
  );
}
