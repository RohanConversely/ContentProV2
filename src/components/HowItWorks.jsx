const steps = [
  {
    number: '01',
    title: 'Upload',
    desc: 'Add your product photos and brand details.',
  },
  {
    number: '02',
    title: 'Generate',
    desc: 'AI crafts professional images and video content.',
  },
  {
    number: '03',
    title: 'Download',
    desc: 'Export and use across Amazon, Instagram, and more.',
  },
];

export default function HowItWorks() {
  return (
    <section className="relative bg-black py-28 text-white">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">
        <div className="mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">How it works</p>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.05] lg:text-6xl">
            Create high-converting visuals in minutes.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:bg-white/[0.04]"
            >
              <span className="text-5xl font-semibold text-white/30">{step.number}</span>
              <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-white/60">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
