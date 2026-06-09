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
              onClick={() => onSignupComplete?.()}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-['Plus_Jakarta_Sans',Inter,sans-serif] text-sm font-semibold text-[#0c1a14] shadow-xl shadow-black/20 transition-colors duration-300 hover:bg-[#ff5c73] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#9db8ff] focus:ring-offset-2 focus:ring-offset-[#0c1a14]"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 z-20 h-48 w-full bg-gradient-to-b from-transparent via-[#0c1a14] to-black" />
    </section>
  );
}
