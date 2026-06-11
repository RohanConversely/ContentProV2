import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase.js";

export function Nav() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const links = [
    ["#stack", "Stack"],
    ["#workflow", "Workflow"],
    ["#use-cases", "Use cases"],
    ["#difference", "Difference"],
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/60 border-b border-line">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 h-14 sm:h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="h-2.5 w-2.5 rounded-full bg-lime pulse-ring" />
          <span className="font-display text-lg sm:text-xl tracking-tight text-cream">
            Content<span className="italic text-lime">Pro</span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm text-cream-muted">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="hover:text-cream transition-colors">
              {label}
            </a>
          ))}
        </nav>

        <a
          href="/generator"
          className="hidden sm:inline-flex group items-center gap-2 px-4 py-2 rounded-full bg-lime text-ink text-sm font-medium hover:bg-lime-deep transition-colors"
        >
          {user ? "Go to App" : "Login"}
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </a>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden h-10 w-10 -mr-2 inline-flex items-center justify-center rounded-full hover:bg-cream/5"
        >
          <span className="relative block w-5 h-3">
            <span
              className={`absolute left-0 top-0 h-[2px] w-5 bg-cream transition-transform ${
                open ? "translate-y-1.5 rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 bottom-0 h-[2px] w-5 bg-cream transition-transform ${
                open ? "-translate-y-1 -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>

      <div
        className={`md:hidden overflow-hidden border-t border-line transition-[max-height] duration-300 ease-out ${
          open ? "max-h-96" : "max-h-0"
        }`}
      >
        <nav className="px-4 py-3 flex flex-col">
          {links.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="py-3 text-cream-muted hover:text-cream border-b border-line/60 last:border-b-0"
            >
              {label}
            </a>
          ))}
          <a
            href="/generator"
            onClick={() => setOpen(false)}
            className="mt-3 mb-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-lime text-ink text-sm font-medium"
          >
            {user ? "Go to App →" : "Login →"}
          </a>
        </nav>
      </div>
    </header>
  );
}
