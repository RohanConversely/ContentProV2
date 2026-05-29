import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

function IconShell({ children, className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function Sparkles({ className }) {
  return (
    <IconShell className={className}>
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8L12 3Z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </IconShell>
  );
}

const foregroundVideoSrc = '/videos/foregroundVid.mp4';
const backgroundVideoSrc = '/videos/backgroundVid.mp4';
const logoSrc = '/videos/Slack%20logo.gif';

const rotatingKeywords = [
  {
    label: 'that sell faster',
    colorClass: 'bg-gradient-to-r from-[#c7d7ff] via-[#8fb0ff] to-[#5f8dff] text-transparent bg-clip-text',
    typeClass: 'font-semibold font-serif',
  },
  {
    label: 'that look professional',
    colorClass: 'bg-gradient-to-r from-[#dbe7ff] via-[#a9c2ff] to-[#78a3ff] text-transparent bg-clip-text',
    typeClass: 'italic font-serif',
  },
  {
    label: 'that beat competitors',
    colorClass: 'bg-gradient-to-r from-[#eef4ff] via-[#b7cbff] to-[#6f98ff] text-transparent bg-clip-text',
    typeClass: 'tracking-tight font-serif',
  },
  {
    label: 'that convert buyers',
    colorClass: 'bg-gradient-to-r from-[#bdd0ff] via-[#82a8ff] to-[#4f7dff] text-transparent bg-clip-text',
    typeClass: 'tracking-wide font-serif',
  },
  {
    label: 'that win the buybox',
    colorClass: 'bg-gradient-to-r from-[#e8efff] via-[#9db8ff] to-[#668fff] text-transparent bg-clip-text',
    typeClass: 'font-semibold italic font-serif',
  },
];

export default function ContentProHero({ onSignupComplete }) {
  const [keywordIndex, setKeywordIndex] = useState(0);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const activeKeyword = rotatingKeywords[keywordIndex];

  useEffect(() => {
    const keywordTimer = window.setInterval(() => {
      setKeywordIndex((currentIndex) => (currentIndex + 1) % rotatingKeywords.length);
    }, 2200);

    return () => window.clearInterval(keywordTimer);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0c1a14] text-white">
      <video
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        className="absolute inset-0 z-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
      >
        <source src={backgroundVideoSrc} type="video/mp4" />
      </video>
      <video
        autoPlay
        muted
        loop
        playsInline
        aria-label="ContentPro premium product inspiration video"
        className="absolute right-0 top-0 z-10 h-full w-[48%] object-cover object-[85%_center] [mask-image:linear-gradient(to_left,black_0%,black_55%,rgba(0,0,0,0.4)_75%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_left,black_0%,black_55%,rgba(0,0,0,0.4)_75%,transparent_100%)]"
      >
        <source src={foregroundVideoSrc} type="video/mp4" />
      </video>
      <div className="absolute inset-0 z-[5] bg-gradient-to-r from-[#0c1a14] via-transparent to-[#0c1a14]/60" />

      <a
        href="/"
        className="absolute left-6 top-6 z-30 inline-flex items-center gap-3 font-['Plus_Jakarta_Sans',Inter,sans-serif] text-base font-semibold tracking-tight text-white lg:left-16 xl:left-24"
        aria-label="ContentPro home"
      >
        <img src={logoSrc} alt="" className="h-9 w-9 rounded-lg object-cover" />
        <span>
          Content<span className="text-[#ff5c73]">Pro</span>
        </span>
      </a>

      <div className="relative z-20 flex min-h-screen items-center">
        <div className="w-full px-6 lg:px-16 xl:px-24">
          <div className="max-w-xl lg:ml-4 xl:ml-8">
            <div className="inline-flex items-center gap-2 font-['Plus_Jakarta_Sans',Inter,sans-serif] text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[#9db8ff]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                Our <span className="text-[#ff5c73]">Model</span> your{' '}
                <span className="text-[#ff5c73]">Product</span>
              </span>
            </div>

            <h1 className="mt-6 font-['Playfair_Display',Cormorant_Garamond,Georgia,serif] text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-white lg:text-7xl">
              <span className="block">Your product listings</span>
              <span className="block text-4xl leading-[1.05] lg:text-5xl">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={keywordIndex}
                    className={`inline-block break-words ${activeKeyword.colorClass} ${activeKeyword.typeClass}`}
                    initial={{ opacity: 0, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(6px)' }}
                    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                    style={{ willChange: 'opacity, filter' }}
                  >
                    {activeKeyword.label}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            <p className="mt-6 max-w-lg font-['Plus_Jakarta_Sans',Inter,sans-serif] text-base leading-7 text-white/70 lg:text-lg lg:leading-8">
              ContentPro transforms raw product images into polished, high-converting Amazon listing visuals with premium studio lighting, clean backgrounds, and shopper-ready creative in minutes.
            </p>

            <button
              type="button"
              onClick={() => setIsSignupOpen(true)}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-['Plus_Jakarta_Sans',Inter,sans-serif] text-sm font-semibold text-[#0c1a14] shadow-xl shadow-black/20 transition-colors duration-300 hover:bg-[#ff5c73] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#9db8ff] focus:ring-offset-2 focus:ring-offset-[#0c1a14]"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 z-20 h-48 w-full bg-gradient-to-b from-transparent via-[#0c1a14] to-black" />

      <AnimatePresence>
        {isSignupOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#07100d]/80 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="signup-title"
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1a14] p-6 font-['Plus_Jakarta_Sans',Inter,sans-serif] shadow-2xl shadow-black/40"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="signup-title" className="text-xl font-semibold text-white">
                    Sign up for Content<span className="text-[#ff5c73]">Pro</span>
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    Get early access to premium product listing visuals.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSignupOpen(false)}
                  className="rounded-full px-3 py-1 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#9db8ff]"
                  aria-label="Close signup form"
                >
                  Close
                </button>
              </div>

              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setIsSignupOpen(false);
                  onSignupComplete?.();
                }}
              >
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/50">Name</span>
                  <input
                    type="text"
                    className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#9db8ff]/70"
                    placeholder="Your name"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/50">Email</span>
                  <input
                    type="email"
                    className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#9db8ff]/70"
                    placeholder="you@example.com"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#ff5c73] px-5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#0c1a14] focus:outline-none focus:ring-2 focus:ring-[#9db8ff]"
                >
                  Create account
                </button>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
