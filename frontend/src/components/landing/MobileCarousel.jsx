import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils.js";

export function MobileCarousel({
  children,
  className,
  slideWidthClass = "w-[85%]",
  ariaLabel = "Carousel",
}) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const count = Array.isArray(children) ? children.length : 1;

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => {
      const slideW = el.clientWidth * 0.85 + 12;
      const idx = Math.round(el.scrollLeft / slideW);
      setActive(Math.min(count - 1, Math.max(0, idx)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [count]);

  const goTo = (i) => {
    const el = trackRef.current;
    if (!el) return;
    const slides = el.querySelectorAll("[data-slide]");
    slides[i]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  const items = Array.isArray(children) ? children : [children];

  return (
    <div className={cn("relative -mx-6", className)} aria-label={ariaLabel} role="region">
      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <div key={i} data-slide className={cn("snap-start shrink-0", slideWidthClass)}>
            {child}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === active ? "w-6 bg-lime" : "w-1.5 bg-cream-muted/30",
            )}
          />
        ))}
      </div>
    </div>
  );
}
