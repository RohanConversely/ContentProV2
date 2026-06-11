import { useCallback, useEffect, useRef, useState } from "react";

export function BeforeAfter({
  beforeSrc,
  afterSrc,
  beforeAlt = "Before",
  afterAlt = "After",
  initial = 50,
}) {
  const [pos, setPos] = useState(initial);
  const [active, setActive] = useState(false);
  const [hinted, setHinted] = useState(false);
  const containerRef = useRef(null);
  const handleRef = useRef(null);
  const draggingRef = useRef(false);
  const rafRef = useRef(null);

  const setPosFromClientX = useCallback((clientX) => {
    const el = containerRef.current;
    if (!el) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setPos(Math.max(0, Math.min(100, pct)));
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || hinted) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !hinted) {
            setHinted(true);
            const seq = [62, 38, 50];
            seq.forEach((target, i) => {
              setTimeout(() => setPos(target), 350 + i * 450);
            });
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hinted]);

  const onPointerDown = (e) => {
    draggingRef.current = true;
    setActive(true);
    handleRef.current?.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setPosFromClientX(e.clientX);
  };
  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    setPosFromClientX(e.clientX);
  };
  const endDrag = () => {
    draggingRef.current = false;
    setActive(false);
  };

  const onKeyDown = (e) => {
    let next = pos;
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") next = pos - step;
    else if (e.key === "ArrowRight") next = pos + step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    else return;
    e.preventDefault();
    setPos(Math.max(0, Math.min(100, next)));
  };

  const beforeLabelOpacity = pos < 18 ? 0 : 1;
  const afterLabelOpacity = pos > 82 ? 0 : 1;

  return (
    <div
      ref={containerRef}
      className="group/ba relative w-full h-full select-none overflow-hidden rounded-xl hairline-strong cursor-ew-resize touch-none bg-secondary"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <img
        src={afterSrc}
        alt={afterAlt}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
        loading="lazy"
      />
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{
          clipPath: `inset(0 ${100 - pos}% 0 0)`,
          transition: draggingRef.current ? "none" : "clip-path 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <img
          src={beforeSrc}
          alt={beforeAlt}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
          loading="lazy"
        />
      </div>

      <div
        className="pointer-events-none absolute top-3 left-3 px-2.5 py-1 rounded-md bg-foreground/85 backdrop-blur-sm font-mono text-[10px] uppercase tracking-widest text-background transition-opacity duration-200"
        style={{ opacity: beforeLabelOpacity }}
      >
        Before
      </div>
      <div
        className="pointer-events-none absolute top-3 right-3 px-2.5 py-1 rounded-md bg-lime text-ink font-mono text-[10px] uppercase tracking-widest shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition-opacity duration-200"
        style={{ opacity: afterLabelOpacity }}
      >
        After
      </div>

      <div
        className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-background shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
        style={{
          left: `${pos}%`,
          transform: "translateX(-1px)",
          transition: draggingRef.current ? "none" : "left 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />

      <button
        ref={handleRef}
        type="button"
        role="slider"
        aria-label="Compare before and after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% before, ${100 - Math.round(pos)}% after`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        onPointerDown={(e) => e.stopPropagation()}
        className={`absolute top-1/2 h-11 w-11 rounded-full bg-background text-foreground flex items-center justify-center border border-foreground/15 outline-none transition-[transform,box-shadow] duration-200 ${
          active
            ? "shadow-[0_0_0_6px_oklch(0.58_0.22_295/0.22),0_8px_24px_rgba(0,0,0,0.18)] scale-110"
            : "shadow-[0_4px_16px_rgba(0,0,0,0.18)] group-hover/ba:scale-105"
        }`}
        style={{
          left: `${pos}%`,
          transform: `translate(-50%, -50%) ${active ? "scale(1.1)" : ""}`.trim(),
          transition: draggingRef.current
            ? "transform 0s, box-shadow 200ms"
            : "left 220ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 200ms, box-shadow 200ms",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M6.5 4.5L3 9l3.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11.5 4.5L15 9l-3.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        className={`pointer-events-none absolute left-1/2 bottom-4 -translate-x-1/2 px-3 py-1.5 rounded-full bg-foreground/85 text-background font-mono text-[10px] uppercase tracking-widest backdrop-blur-sm transition-opacity duration-300 ${
          active || draggingRef.current ? "opacity-0" : "opacity-90"
        }`}
      >
        Drag to compare
      </div>
    </div>
  );
}
