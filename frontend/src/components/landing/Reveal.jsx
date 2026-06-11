import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils.js";

export function Reveal({
  children,
  className,
  direction = "up",
  delay = 0,
  distance = 28,
  duration = 700,
  rootMargin = "0px 0px -10% 0px",
  repeat = false,
  as: Tag = "div",
  style: styleProp,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (!repeat) io.unobserve(entry.target);
          } else if (repeat) {
            setVisible(false);
          }
        }
      },
      { threshold: 0.15, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [repeat, rootMargin]);

  const offset = (() => {
    switch (direction) {
      case "up": return `translate3d(0, ${distance}px, 0)`;
      case "down": return `translate3d(0, -${distance}px, 0)`;
      case "left": return `translate3d(${distance}px, 0, 0)`;
      case "right": return `translate3d(-${distance}px, 0, 0)`;
      case "none": return "translate3d(0,0,0)";
    }
  })();

  const style = {
    ...styleProp,
    transitionProperty: "opacity, transform",
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    transitionDelay: `${delay}ms`,
    opacity: visible ? 1 : 0,
    transform: visible ? "translate3d(0,0,0)" : offset,
    willChange: "opacity, transform",
  };

  return <Tag ref={ref} className={cn(className)} style={style}>{children}</Tag>;
}
