const serviceImages = [
  {
    src: '/photos/p1.jpeg',
    title: 'Studio polish',
    desc: 'Clean product visuals with refined lighting and sharp detail.',
  },
  {
    src: '/photos/p2.jpeg',
    title: 'Lifestyle scenes',
    desc: 'Context-rich imagery that makes products easier to imagine.',
  },
  {
    src: '/photos/p3.png',
    title: 'Marketplace ready',
    desc: 'Listing assets shaped for conversion-focused storefronts.',
  },
  {
    src: '/photos/p4.jpeg',
    title: 'Creative variants',
    desc: 'Multiple directions for testing angles, moods, and offers.',
  },
  {
    src: '/photos/p5.jpeg',
    title: 'Premium detail',
    desc: 'Close-up treatments that make materials and finishes stand out.',
  },
  {
    src: '/photos/p6.jpeg',
    title: 'Brand systems',
    desc: 'Consistent visual language across every product touchpoint.',
  },
  {
    src: '/photos/p7.png',
    title: 'Campaign assets',
    desc: 'Hero-ready images for launches, ads, and seasonal pushes.',
  },
  {
    src: '/photos/p8.jpeg',
    title: 'Fast production',
    desc: 'A repeatable creative workflow without sacrificing quality.',
  },
];

export default function ServicesMarquee() {
  return (
    <section className="relative overflow-hidden bg-black py-24 text-white">
      <div className="relative z-10 mx-auto mb-16 max-w-6xl px-6 lg:px-12">
        <p className="text-sm uppercase tracking-[0.2em] text-[#ff5c73]">What We Do</p>
        <h2 className="mt-4 text-4xl font-semibold leading-[1.05] lg:text-6xl">Services.</h2>
        <p className="mt-6 max-w-xl text-lg text-white/70">
          Strategy, design, and development tailored for modern digital brands.
        </p>
      </div>

      <div className="relative overflow-hidden">
        <div className="flex w-max animate-marquee gap-6 hover:[animation-play-state:paused]">
          {[...serviceImages, ...serviceImages].map((image, index) => (
            <div
              key={`${image.src}-${index}`}
              className={`group relative h-[380px] w-[280px] overflow-hidden rounded-2xl ${
                index % 2 === 0 ? 'translate-y-0' : 'translate-y-4'
              }`}
            >
              <img src={image.src} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
              <div className="absolute bottom-4 left-4 right-4 text-white opacity-0 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                <h3 className="text-lg font-semibold">{image.title}</h3>
                <p className="mt-1 text-sm text-white/70">{image.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
