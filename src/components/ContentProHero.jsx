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

function ArrowRight({ className }) {
  return (
    <IconShell className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconShell>
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

function Wand2({ className }) {
  return (
    <IconShell className={className}>
      <path d="m15 4 5 5" />
      <path d="m14 10 5-5" />
      <path d="M4 20 14 10" />
      <path d="m5 4 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
    </IconShell>
  );
}

function Zap({ className }) {
  return (
    <IconShell className={className}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </IconShell>
  );
}

const featurePills = [
  { label: 'AI Studio Quality', icon: Sparkles },
  { label: 'Instant Generation', icon: Zap },
  { label: 'Amazon-ready Scenes', icon: Wand2 },
];

const heroVideoSrc =
  '/videos/🛋️ Build this fresh bridal shower roundup that make everything look instantly polished with smart steps cute details and cozy vibes and make your - Pin-206954545371279530.mp4';
const backgroundVideoSrc = '/videos/backgroundVid.mp4';

export default function ContentProHero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0c1a14] text-white">
      <video
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        className="absolute inset-0 z-0 h-full w-full scale-125 object-cover opacity-55 blur-2xl"
      >
        <source src={backgroundVideoSrc} type="video/mp4" />
      </video>
      <div className="absolute inset-0 z-10 bg-[#0c1a14]/40 backdrop-blur-[2px]" />
      <video
        autoPlay
        muted
        loop
        playsInline
        aria-label="ContentPro premium product inspiration video"
        className="absolute right-0 top-0 z-20 hidden h-full w-[55%] object-cover brightness-[0.85] [mask-image:linear-gradient(to_left,black_0%,black_65%,rgba(0,0,0,0.4)_80%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_left,black_0%,black_65%,rgba(0,0,0,0.4)_80%,transparent_100%)] lg:block"
      >
        <source src={heroVideoSrc} type="video/mp4" />
      </video>
      <div className="absolute inset-0 z-20 bg-[radial-gradient(circle_at_18%_12%,rgba(89,139,255,0.12),transparent_28%),radial-gradient(circle_at_80%_86%,rgba(255,255,255,0.04),transparent_34%)]" />

      <div className="relative z-30 flex min-h-screen">
        <div className="relative z-30 flex min-h-screen w-full items-center px-4 py-6 sm:px-6 lg:w-[50%] lg:px-8 xl:w-[45%] xl:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.06),transparent_28%),radial-gradient(circle_at_78%_82%,rgba(157,184,255,0.08),transparent_32%)]" />

          <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.025] p-5 shadow-2xl shadow-black/45 backdrop-blur-2xl drop-shadow-[0_2px_22px_rgba(0,0,0,0.45)] sm:p-6 lg:p-7 xl:p-8">
            <header className="flex items-center justify-between gap-4">
              <a href="/" className="group flex items-center gap-3" aria-label="ContentPro home">
                <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 shadow-lg shadow-black/20 transition-all duration-300 group-hover:border-[#7aa2ff]/60 group-hover:bg-[#7aa2ff]/15">
                  <span className="absolute h-4.5 w-4.5 rotate-45 rounded-md border border-[#7aa2ff]/75" />
                  <span className="h-2 w-2 rounded-full bg-[#9db8ff]" />
                </span>
                <span className="font-['Plus_Jakarta_Sans',Inter,sans-serif] text-sm font-semibold tracking-wide text-white sm:text-base">
                  ContentPro
                </span>
              </a>

              <a
                href="#generator"
                className="hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 font-['Plus_Jakarta_Sans',Inter,sans-serif] text-xs font-medium text-white shadow-lg shadow-black/10 transition-all duration-300 hover:border-[#9db8ff]/70 hover:bg-[#9db8ff] hover:text-[#02040b] focus:outline-none focus:ring-2 focus:ring-[#9db8ff]/70 sm:inline-flex"
              >
                Launch App
              </a>
            </header>

            <div className="py-10 sm:py-12 lg:py-14">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3.5 py-2 font-['Plus_Jakarta_Sans',Inter,sans-serif] text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[#9db8ff]">
                <Sparkles className="h-3.5 w-3.5" />
                Listing intelligence
              </div>

              <h1 className="max-w-lg font-['Playfair_Display',Cormorant_Garamond,Georgia,serif] text-4xl font-semibold leading-[1.02] tracking-normal text-white sm:text-5xl lg:text-6xl xl:text-[4.35rem]">
                Your product listings never stop selling.
              </h1>

              <p className="mt-6 max-w-lg font-['Plus_Jakarta_Sans',Inter,sans-serif] text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                ContentPro transforms raw product images into polished, high-converting Amazon listing visuals with premium studio lighting, clean backgrounds, and shopper-ready creative in minutes.
              </p>

              <form className="mt-8 w-full max-w-lg" onSubmit={(event) => event.preventDefault()}>
                <label htmlFor="hero-email" className="sr-only">
                  Enter your email address
                </label>
                <div className="flex flex-col gap-2.5 rounded-[1.4rem] border border-white/12 bg-white/10 p-2 shadow-2xl shadow-black/25 backdrop-blur-xl transition-all duration-300 focus-within:border-[#9db8ff]/70 focus-within:bg-white/[0.13] sm:flex-row sm:items-center">
                  <input
                    id="hero-email"
                    type="email"
                    placeholder="Enter your email address"
                    className="min-h-11 flex-1 rounded-full bg-transparent px-4 font-['Plus_Jakarta_Sans',Inter,sans-serif] text-sm text-white outline-none placeholder:text-white/45 sm:px-5"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#9db8ff] px-5 font-['Plus_Jakarta_Sans',Inter,sans-serif] text-sm font-semibold text-[#02040b] shadow-xl shadow-[#5d87ff]/15 transition-all duration-300 hover:bg-white hover:shadow-[#5d87ff]/25 focus:outline-none focus:ring-2 focus:ring-white/70 sm:px-6"
                  >
                    Join waitlist
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-5 font-['Plus_Jakarta_Sans',Inter,sans-serif]">
              <div>
                <p className="text-lg font-semibold text-white sm:text-xl">4x</p>
                <p className="mt-1 text-xs leading-5 text-white/55">creative variants</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-white sm:text-xl">90s</p>
                <p className="mt-1 text-xs leading-5 text-white/55">average render</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-white sm:text-xl">FBA</p>
                <p className="mt-1 text-xs leading-5 text-white/55">ready output</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-30 hidden lg:block">
          <div className="absolute bottom-5 right-5 w-[min(92vw,21rem)] rounded-[1.45rem] border border-white/18 bg-[#050814]/42 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl sm:bottom-8 sm:right-8">
            <div className="mb-3 flex items-center justify-between px-2 pt-1 font-['Plus_Jakarta_Sans',Inter,sans-serif]">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-white/60">Creative modes</p>
              <span className="h-2 w-2 rounded-full bg-[#9db8ff] shadow-[0_0_18px_rgba(157,184,255,0.9)]" />
            </div>

            <div className="flex flex-wrap gap-2">
              {featurePills.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="pointer-events-auto group inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/12 px-3 py-2 font-['Plus_Jakarta_Sans',Inter,sans-serif] text-xs font-medium text-white shadow-lg shadow-black/10 transition-all duration-300 hover:border-[#9db8ff]/70 hover:bg-[#9db8ff] hover:text-[#02040b] focus:outline-none focus:ring-2 focus:ring-[#9db8ff]/70"
                >
                  <Icon className="h-3.5 w-3.5 transition-all duration-300 group-hover:scale-110" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
