const heroImg = "/assets/hero-product.jpg";
const fashionImg = "/assets/transform-fashion.jpg";
const jewelImg = "/assets/transform-jewellery.jpg";
const realestateImg = "/assets/transform-homefurnishing.jpg";
const beforeJewel = "/assets/before-jewellery.jpg";
const beforeFashion = "/assets/before-fashion.jpg";
const beforeRealestate = "/assets/before-homefurnishing.jpg";
const csEarringsBefore = "/assets/before-earrings.jpg";
const csEarringsAfter = "/assets/transform-earrings.jpg";
const csCushionBefore = "/assets/before-cushion.jpg";
const csCushionAfter = "/assets/transform-cushion.jpg";
const csFootwearBefore = "/assets/before-footwear.jpg";
const csFootwearAfter = "/assets/transform-footwear.jpg";
const sareeBefore = "/assets/before-saree.jpg";
const sareeAfter = "/assets/after-saree.jpg";
const visualCampaign = "/assets/visual-campaign.jpg";
const visualFlatlay = "/assets/visual-flatlay.jpg";
const visualTradeshow = "/assets/visual-tradeshow.jpg";
const visualPortrait = "/assets/visual-portrait.jpg";
const catFurnishing = "/assets/cat-furnishing.jpg";
const catWallart = "/assets/cat-wallart.jpg";
const catApparel = "/assets/cat-apparel.jpg";
const catJewelry = "/assets/cat-jewelry.jpg";
const apparelHero = "/assets/apparel-hero.jpg";
const apparelLifestyle = "/assets/apparel-lifestyle.jpg";
const apparelStory = "/assets/apparel-story.jpg";
const apparelDetail = "/assets/apparel-detail.jpg";

import { Nav } from "../components/landing/Nav.jsx";
import { SectionLabel } from "../components/landing/SectionLabel.jsx";
import { BeforeAfter } from "../components/landing/BeforeAfter.jsx";
import { Reveal } from "../components/landing/Reveal.jsx";
import { MobileCarousel } from "../components/landing/MobileCarousel.jsx";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div id="top" className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* HERO */}
      <section className="relative pt-24 sm:pt-32 pb-14 sm:pb-20 px-4 sm:px-6 lg:px-10">
        <div
          className="absolute inset-0 -z-10 opacity-70"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--cream) 1px, transparent 1px), linear-gradient(to bottom, var(--cream) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 reveal-up">
            <SectionLabel>Visual commerce infrastructure</SectionLabel>
            <h1 className="mt-6 sm:mt-8 font-display font-light text-[clamp(2.25rem,7vw,6.5rem)] leading-[0.98] tracking-[-0.03em] text-cream text-balance">
              Your products don't need
              <span className="block italic text-lime">photoshoots</span>
              anymore.
            </h1>
            <p className="mt-8 max-w-xl text-lg text-cream-muted leading-relaxed">
              Turn raw product images into campaign-ready visuals, reels, lookbooks, buyer decks and website creatives — instantly.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3 text-xs font-mono uppercase tracking-wider text-cream-muted">
              {["No studios", "No models", "No logistics", "No delays"].map((t) => (
                <span key={t} className="px-3 py-1.5 rounded-full hairline">{t}</span>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <button onClick={() => navigate('/generator')} className="group px-6 py-3.5 rounded-full bg-lime text-ink font-medium hover:bg-lime-deep transition-all hover:scale-[1.02] inline-flex items-center gap-2">
                See your product transformed
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </button>
              <a href="#explainer" className="px-6 py-3.5 rounded-full hairline-strong text-cream hover:bg-cream/5 transition-colors inline-flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-cream/10 flex items-center justify-center text-[10px]">▶</span>
                Watch how it works
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 relative max-w-md mx-auto lg:max-w-none w-full">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden hairline-strong glow-lime float-slow">
              <img src={heroImg} alt="ContentPro generated jewellery visual" className="w-full h-full object-cover" width={1536} height={1920} />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-[10px] tracking-widest uppercase text-background/90">
                <span className="px-2 py-1 rounded bg-foreground/60 backdrop-blur-sm">OUTPUT_03 / LOOKBOOK</span>
                <span className="px-2 py-1 rounded bg-lime text-ink">RENDERED 00:42</span>
              </div>
              <div className="absolute bottom-5 left-5 right-5 text-background">
                <div className="font-mono text-[10px] uppercase tracking-widest opacity-80">Source → Campaign asset</div>
                <div className="font-display text-2xl mt-1">Emerald Heritage Set</div>
              </div>
            </div>
            <div className="absolute -left-6 top-1/3 hidden md:flex items-center gap-2 px-3 py-2 rounded-full bg-card hairline-strong text-xs">
              <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
              <span className="font-mono text-cream-muted">render.queue</span>
            </div>
            <div className="absolute -right-4 bottom-10 hidden md:block px-4 py-3 rounded-xl bg-card hairline-strong">
              <div className="font-mono text-[10px] uppercase text-cream-muted">SKUs processed</div>
              <div className="font-display text-2xl text-lime">12,400+</div>
            </div>
          </div>
        </div>

        <div className="mt-14 max-w-[1400px] mx-auto">
          <div className="text-center font-mono text-xs uppercase tracking-[0.3em] text-cream-muted">Trusted by commerce teams across</div>
          <div className="mt-6 flex flex-wrap justify-center items-center gap-x-12 gap-y-4 opacity-60">
            {["JEWELLERY", "FASHION", "AMAZON SELLERS"].map((l) => (
              <span key={l} className="font-display italic text-xl text-cream-muted">{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* EXPLAINER */}
      <section id="explainer" className="relative py-14 sm:py-20 px-4 sm:px-6 lg:px-10 border-t border-line">
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <SectionLabel>The shift</SectionLabel>
            <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl lg:text-6xl tracking-[-0.02em] text-cream text-balance">
              Why modern brands are moving <span className="italic text-lime">away</span> from photoshoots.
            </h2>
          </div>
          <div className="lg:col-span-7">
            <p className="text-cream-muted text-lg leading-relaxed">
              Shoots are slow, expensive and inflexible. ContentPro replaces the entire pipeline — upload an image, pick a direction, receive campaign-ready outputs in hours.
            </p>
            <div className="mt-8 font-display italic text-3xl text-cream">
              "ContentPro replaces the shoot pipeline."
            </div>
          </div>
        </div>
      </section>

      {/* POSITIONING */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-10 border-t border-line">
        <div className="max-w-[1100px] mx-auto text-center">
          <SectionLabel><span className="mx-auto">The bottleneck</span></SectionLabel>
          <h2 className="mt-8 font-display font-light text-4xl sm:text-5xl lg:text-7xl tracking-[-0.02em] text-cream text-balance leading-[1.05]">
            Visual production bandwidth is the real <span className="italic text-lime">growth bottleneck</span>.
          </h2>
          <p className="mt-10 text-lg text-cream-muted max-w-2xl mx-auto">
            Brands today are not limited by product. They are limited by the cycles around it.
          </p>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-3">
            {["Shoot timelines", "Storyboarding delays", "Vendor coordination", "Editing pipelines", "Campaign prep cycles"].map((t) => (
              <div key={t} className="p-5 rounded-xl hairline text-sm text-cream-muted hover:border-lime hover:text-cream transition-colors">{t}</div>
            ))}
          </div>
          <div className="mt-12 inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-lime/10 border border-lime/40 text-lime font-mono text-xs uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" /> ContentPro removes that bottleneck
          </div>
        </div>
      </section>

      {/* TRANSFORMATION PIPELINE */}
      <section className="relative py-14 sm:py-20 px-4 sm:px-6 lg:px-10 border-t border-line">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div>
              <SectionLabel>Transformation</SectionLabel>
              <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl lg:text-6xl tracking-[-0.02em] text-cream text-balance max-w-3xl">
                From one image to a complete <span className="italic text-lime">marketing kit</span>.
              </h2>
            </div>
            <p className="text-cream-muted max-w-sm">From raw image to buyer-ready presentation set in minutes.</p>
          </div>

          <div className="flex flex-nowrap items-center gap-2 sm:gap-3 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
            {[
              { k: "01", t: "Upload" },
              { k: "02", t: "Model context" },
              { k: "03", t: "Occasion styling" },
              { k: "04", t: "Scale clarity" },
              { k: "05", t: "Motion preview" },
              { k: "06", t: "Campaign assets" },
            ].map((s, i) => (
              <div key={s.k} className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-card hairline hover:bg-lime/5 hover:border-lime/30 transition-colors">
                  <span className="font-mono text-[10px] text-lime">{s.k}</span>
                  <span className="font-display text-xs sm:text-sm text-cream whitespace-nowrap">{s.t}</span>
                </div>
                {i < 5 && <span className="text-cream-muted/40 text-xs">→</span>}
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-6 gap-3">
            {[heroImg, visualPortrait, visualFlatlay, jewelImg, fashionImg, visualCampaign].map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden hairline group">
                <img src={src} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VISUAL STACK */}
      <section id="stack" className="relative py-14 sm:py-20 px-4 sm:px-6 lg:px-10 border-t border-line bg-secondary overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.78 0.15 295 / 0.45), transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.82 0.14 50 / 0.4), transparent 70%)" }} />

        <div className="relative max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-12 gap-10 items-end mb-10">
            <div className="lg:col-span-7">
              <SectionLabel>The stack</SectionLabel>
              <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl lg:text-7xl tracking-[-0.02em] text-cream text-balance leading-[1.02]">
                One upload. <span className="italic text-lime">Four outputs.</span> Zero shoots.
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className="text-cream-muted text-lg">One apparel image — transformed into a complete production set: hero, lifestyle, storytelling and close detail. Generated, ready to publish.</p>
              <div className="mt-5 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest">
                {["Apparel", "4 formats", "Brand-aligned"].map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-full bg-card hairline text-cream-muted">{t}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="-mx-4 sm:mx-0 px-4 sm:px-0 flex md:grid gap-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid-cols-6 lg:grid-cols-12 md:auto-rows-[160px] [&>*]:snap-start [&>*]:shrink-0 [&>*]:w-[78%] sm:[&>*]:w-[55%] md:[&>*]:w-auto [&>*]:h-[300px] md:[&>*]:h-auto">
            <Reveal as="article" delay={0} direction="up" className="relative col-span-2 md:col-span-3 lg:col-span-6 row-span-2 rounded-2xl overflow-hidden hairline-strong group bg-card">
              <img src={apparelHero} alt="Apparel hero studio image" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/20 to-transparent" />
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-background/80">
                <span className="px-2 py-1 rounded bg-lime text-ink">Format 01</span>
              </div>
              <div className="absolute bottom-5 left-5 right-5 text-background">
                <div className="font-display text-3xl lg:text-4xl leading-tight">Hero image</div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-widest opacity-80">Studio · full-body · PDP-ready</div>
              </div>
            </Reveal>

            <Reveal as="article" delay={80} direction="up" className="relative col-span-2 md:col-span-3 lg:col-span-6 row-span-2 rounded-2xl overflow-hidden hairline-strong group bg-card">
              <img src={apparelLifestyle} alt="Apparel lifestyle on-location image" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 right-4 font-mono text-[10px] uppercase tracking-widest text-background/80">
                <span>Format 02</span>
              </div>
              <div className="absolute bottom-5 left-5 right-5 text-background">
                <div className="font-display text-3xl lg:text-4xl leading-tight">Lifestyle</div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-widest opacity-80">On-location · in-context · campaign</div>
              </div>
            </Reveal>

            <Reveal as="article" delay={160} direction="up" className="relative col-span-2 md:col-span-3 lg:col-span-6 row-span-2 rounded-2xl overflow-hidden hairline-strong group bg-card">
              <img src={apparelStory} alt="Apparel storytelling editorial scene" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 right-4 font-mono text-[10px] uppercase tracking-widest text-background/80">
                <span>Format 03</span>
              </div>
              <div className="absolute bottom-5 left-5 right-5 text-background">
                <div className="font-display text-3xl lg:text-4xl leading-tight">Storytelling</div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-widest opacity-80">Narrative · editorial · social-ready</div>
              </div>
            </Reveal>

            <Reveal as="article" delay={240} direction="up" className="relative col-span-2 md:col-span-3 lg:col-span-6 row-span-2 rounded-2xl overflow-hidden hairline-strong group bg-card">
              <img src={apparelDetail} alt="Apparel close-up fabric detail" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-background/85">
                <span>Format 04</span>
                <span className="px-2 py-1 rounded bg-background/90 text-foreground">Macro</span>
              </div>
              <div className="absolute bottom-5 left-5 right-5 text-background">
                <div className="font-display text-3xl lg:text-4xl leading-tight">Close detail</div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-widest opacity-80">Fabric · stitching · craft</div>
              </div>
            </Reveal>
          </div>

          <Reveal as="article" delay={720} direction="up" className="mt-3 rounded-2xl overflow-hidden hairline bg-card flex items-center" style={{ minHeight: "72px" }}>
            <div className="flex items-center gap-3 px-5 w-full font-mono text-xs overflow-hidden">
              <span className="h-2 w-2 rounded-full bg-lime pulse-ring shrink-0" />
              <span className="text-lime shrink-0">contentpro.run</span>
              <span className="text-cream-muted hidden md:inline">→ uploading source.jpg</span>
              <span className="text-cream-muted hidden lg:inline">→ generating 4 asset variants</span>
              <span className="text-cream-muted hidden lg:inline">→ rendering reel.mp4</span>
              <span className="ml-auto text-lime shrink-0">✓ ready in 02:14</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* INVENTORY + EXPORTS */}
      <section className="relative py-14 sm:py-20 px-4 sm:px-6 lg:px-10 border-t border-line bg-secondary">
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-12">
          <div className="rounded-2xl bg-card hairline overflow-hidden">
            <div className="p-10">
              <SectionLabel>Exporters</SectionLabel>
              <h3 className="mt-6 font-display font-light text-4xl text-cream text-balance">
                Every season needs new visuals. Shoots <span className="italic text-lime">cannot keep up</span>.
              </h3>
              <p className="mt-6 text-cream-muted">Export teams must prepare buyer decks, range previews, trade-show creatives, catalogues and website refreshes — all at once.</p>
              <div className="mt-8 grid grid-cols-2 gap-2">
                {["Buyer decks", "Range previews", "Trade-show kits", "Catalogues", "Website refresh", "WhatsApp packs"].map((t) => (
                  <div key={t} className="px-3 py-2 rounded-lg bg-background hairline text-sm text-cream-muted">{t}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card hairline overflow-hidden">
            <div className="aspect-[21/9] overflow-hidden">
              <img src={visualFlatlay} alt="Premium jewellery inventory styled flatlay" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="use-cases" className="relative py-14 sm:py-20 px-4 sm:px-6 lg:px-10 border-t border-line bg-secondary">
        <div className="max-w-[1400px] mx-auto">
          <SectionLabel>Use cases</SectionLabel>
          <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl lg:text-6xl tracking-[-0.02em] text-cream max-w-3xl text-balance">
            Built for the categories where <span className="italic text-lime">presentation is everything</span>.
          </h2>

          {(() => {
            const cases = [
              { img: jewelImg, before: undefined, tag: "Jewellery / Fashion", title: "Context converts craftsmanship into sales.", body: "Raw product → model visual, festival styling, gifting context, scale clarity, motion creative.", result: "Higher inquiry conversion" },
              { img: sareeAfter, before: sareeBefore, tag: "Apparel", title: "From flat fabric to fashion campaign.", body: "Plain product saree → styled on-model visual, editorial context, festival storytelling, scroll-stopping creatives.", result: "Higher conversion on apparel drops" },
              { img: realestateImg, before: undefined, tag: "Home Furnishing", title: "Styling sells decor faster.", body: "Raw product shots → styled interior visuals, lifestyle context, room scenes and platform-ready creatives.", result: "Higher add-to-cart on marketplaces" },
            ];
            const Card = (c) => (
              <article className="group rounded-2xl overflow-hidden bg-card hairline hover:border-lime/40 transition-colors h-full">
                <div className="aspect-[16/10] overflow-hidden">
                  {c.before ? (
                    <div className="grid grid-cols-2 h-full">
                      <img src={c.before} alt={`${c.title} before`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                      <img src={c.img} alt={`${c.title} after`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                    </div>
                  ) : (
                    <img src={c.img} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                  )}
                </div>
                <div className="p-6 sm:p-7">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-lime">{c.tag}</div>
                  <h3 className="mt-3 font-display text-xl sm:text-2xl text-cream leading-tight">{c.title}</h3>
                  <p className="mt-4 text-cream-muted text-sm leading-relaxed">{c.body}</p>
                  <div className="mt-6 pt-5 border-t border-line flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase text-cream-muted">Result</span>
                    <span className="font-display italic text-lime text-right">{c.result} →</span>
                  </div>
                </div>
              </article>
            );
            return (
              <>
                <div className="mt-12 lg:hidden">
                  <MobileCarousel ariaLabel="Use cases">
                    {cases.map((c) => <Card key={c.tag} {...c} />)}
                  </MobileCarousel>
                </div>
                <div className="mt-10 hidden lg:grid grid-cols-3 gap-6">
                  {cases.map((c) => <Card key={c.tag} {...c} />)}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="relative py-14 sm:py-20 px-4 sm:px-6 lg:px-10 border-t border-line">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-12 gap-10 items-end mb-10">
            <div className="lg:col-span-7">
              <SectionLabel>Categories</SectionLabel>
              <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl lg:text-6xl tracking-[-0.02em] text-cream text-balance leading-[1.05]">
                Built for the products <span className="italic text-lime">commerce teams</span> sell every day.
              </h2>
            </div>
            <p className="lg:col-span-5 text-cream-muted text-lg">From hero stills to lifestyle context — every category gets the same campaign-grade treatment.</p>
          </div>

          {(() => {
            const cats = [
              { img: catFurnishing, tag: "Home furnishing", title: "Sofas, decor, soft goods", body: "Lifestyle room scenes, scale references and seasonal styling — generated from your studio shots.", count: "12 formats" },
              { img: catWallart, tag: "Wall art", title: "Prints, frames, gallery sets", body: "In-room previews, gallery-wall arrangements and curated collection shots that help buyers visualise.", count: "9 formats" },
              { img: catApparel, tag: "Apparel", title: "Fashion & lifestyle", body: "On-model visuals, flatlays, editorial campaigns and reels — across seasons and occasions.", count: "14 formats" },
              { img: catJewelry, tag: "Jewellery", title: "Fine & fashion jewellery", body: "Hand shots, on-model context, festive styling and macro detail — without the courier risk.", count: "11 formats" },
            ];
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {cats.map((c, i) => (
                  <Reveal key={c.tag} as="article" delay={i * 80} direction="up" className="group relative aspect-[3/4] sm:aspect-square rounded-2xl overflow-hidden hairline-strong bg-card">
                    <img src={c.img} alt={`${c.tag} — ${c.title}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent" />
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                      <span className="px-2 py-1 rounded bg-lime text-ink">{c.tag}</span>
                      <span className="text-background/85 hidden sm:inline">{c.count}</span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-background">
                      <div className="font-display text-lg sm:text-2xl leading-tight">{c.title}</div>
                      <p className="mt-2 text-xs sm:text-sm text-background/80 leading-relaxed line-clamp-3">{c.body}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            );
          })()}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cream-muted">
            <span>Also supported:</span>
            {["Footwear", "Beauty", "Fragrances", "Bags", "Kitchenware", "Artisanal decor"].map((t) => (
              <span key={t} className="px-3 py-1.5 rounded-full hairline">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CASE STUDIES */}
      <section className="relative py-14 sm:py-20 px-4 sm:px-6 lg:px-10 border-t border-line">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-10">
            <SectionLabel>Case studies</SectionLabel>
            <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl lg:text-6xl tracking-[-0.02em] text-cream max-w-3xl text-balance">
              Real transformations. <span className="italic text-lime">Measurable outcomes.</span>
            </h2>
          </div>

          <p className="text-cream-muted max-w-2xl mb-10">Drag the slider on each visual to see the raw input transform into a campaign-ready output.</p>

          {(() => {
            const studies = [
              { tag: "Jewellery", before: csEarringsBefore, after: csEarringsAfter, beforeText: "Flat catalogue shots of earrings on white. Buyers couldn't tell how they'd actually look when worn.", afterText: "On-model festive portraits, scale clarity, gifting context and motion creatives — generated from existing inventory shots.", result: "Higher inquiry conversion across festive collections", metric: "+38%" },
              { tag: "Home furnishing", before: csCushionBefore, after: csCushionAfter, beforeText: "Plain catalogue shots of cushions on white. Buyers couldn't picture them in their own living room.", afterText: "Styled interior scenes — sofa layering, props, ambient light and lifestyle context, generated from the same product shots.", result: "Higher add-to-cart conversion on marketplaces", metric: "+52%" },
              { tag: "Footwear", before: csFootwearBefore, after: csFootwearAfter, beforeText: "Generic side-profile product shots. Shoppers couldn't visualise the heels styled into an outfit or moment.", afterText: "Editorial on-model lifestyle visuals, occasion styling and platform-ready creatives — without booking a shoot.", result: "Faster catalogue refresh per season", metric: "12× faster" },
            ];

            const MobileCard = (c) => (
              <article className="rounded-2xl bg-card hairline overflow-hidden h-full flex flex-col">
                <div className="aspect-[4/3]">
                  <BeforeAfter beforeSrc={c.before} afterSrc={c.after} beforeAlt={`${c.tag} raw input`} afterAlt={`${c.tag} ContentPro output`} />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-lime">{c.tag}</span>
                    <span className="font-display italic text-2xl text-lime">{c.metric}</span>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-cream-muted/60">Before</div>
                      <p className="mt-2 text-cream-muted text-sm leading-relaxed">{c.beforeText}</p>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-lime">After</div>
                      <p className="mt-2 text-cream text-sm leading-relaxed">{c.afterText}</p>
                    </div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-line flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-cream-muted">Result</span>
                    <span className="font-display italic text-base text-cream text-right">{c.result} →</span>
                  </div>
                </div>
              </article>
            );

            return (
              <>
                <div className="lg:hidden">
                  <MobileCarousel ariaLabel="Case studies" slideWidthClass="w-[88%]">
                    {studies.map((c) => MobileCard(c))}
                  </MobileCarousel>
                </div>
                <div className="hidden lg:block space-y-4">
                  {studies.map((c, idx) => (
                    <article key={c.tag} className="grid grid-cols-12 gap-8 p-10 rounded-2xl bg-card hairline hover:border-lime/30 transition-colors">
                      <div className={`col-span-6 aspect-[4/3] ${idx % 2 === 1 ? "order-2" : ""}`}>
                        <BeforeAfter beforeSrc={c.before} afterSrc={c.after} beforeAlt={`${c.tag} raw input`} afterAlt={`${c.tag} ContentPro output`} />
                      </div>
                      <div className="col-span-6 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-lime">{c.tag}</span>
                            <span className="font-display italic text-3xl text-lime">{c.metric}</span>
                          </div>
                          <div className="mt-8 grid md:grid-cols-2 gap-6">
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-widest text-cream-muted/60">Before</div>
                              <p className="mt-3 text-cream-muted leading-relaxed">{c.beforeText}</p>
                            </div>
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-widest text-lime">After</div>
                              <p className="mt-3 text-cream leading-relaxed">{c.afterText}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-line flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-cream-muted">Result</span>
                          <span className="font-display italic text-xl text-cream">{c.result} →</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* DIFFERENTIATION */}
      <section id="difference" className="relative py-14 sm:py-20 px-4 sm:px-6 lg:px-10 border-t border-line">
        <div className="max-w-[1300px] mx-auto">
          <SectionLabel>Difference</SectionLabel>
          <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl lg:text-7xl tracking-[-0.02em] text-cream text-balance">
            Not an app. Not an agency.
          </h2>

          <div className="mt-10 grid md:grid-cols-3 gap-px bg-line rounded-2xl overflow-hidden hairline">
            {[
              { h: "Apps", items: ["Template outputs", "DIY workflow", "Generic visuals"], muted: true },
              { h: "Agencies", items: ["Slow", "Shoot dependent", "Expensive"], muted: true },
              { h: "ContentPro", items: ["AI-powered", "Brand-aligned", "Campaign-ready", "Scalable instantly", "Storyboard-supported"], muted: false },
            ].map((col) => (
              <div key={col.h} className={`p-8 ${col.muted ? "bg-card" : "bg-lime text-ink"}`}>
                <div className={`font-display text-3xl ${col.muted ? "text-cream" : ""}`}>{col.h}</div>
                <ul className="mt-8 space-y-3">
                  {col.items.map((item) => (
                    <li key={item} className={`flex items-center gap-3 ${col.muted ? "text-cream-muted" : ""}`}>
                      <span className={`h-1 w-4 ${col.muted ? "bg-cream-muted/40" : "bg-ink"}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 max-w-3xl">
            <div className="font-display italic text-3xl lg:text-4xl text-cream-muted leading-snug">
              Apps generate images.<br />
              Agencies generate campaigns.<br />
              <span className="text-cream not-italic font-light">ContentPro generates <span className="italic text-lime">visual commerce infrastructure</span>.</span>
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="relative py-14 sm:py-20 px-4 sm:px-6 lg:px-10 border-t border-line bg-secondary">
        <div className="max-w-[1300px] mx-auto">
          <SectionLabel>Workflow</SectionLabel>
          <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl lg:text-6xl tracking-[-0.02em] text-cream text-balance">
            From image to campaign-ready output in <span className="italic text-lime">three steps</span>.
          </h2>

          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Upload image", d: "You share a single product photo. Any angle. Any background.", img: beforeJewel },
              { n: "02", t: "Select visual direction", d: "Pick the moods, occasions, formats and platforms you need.", img: visualFlatlay },
              { n: "03", t: "Receive marketing-ready assets", d: "Stills, reels, decks, banners — delivered ready to publish.", img: visualCampaign },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl hairline bg-card overflow-hidden group">
                <div className="aspect-[2/1] overflow-hidden">
                  <img src={s.img} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                </div>
                <div className="p-8">
                  <div className="font-display text-7xl text-lime/30 leading-none">{s.n}</div>
                  <h3 className="mt-4 font-display text-2xl text-cream">{s.t}</h3>
                  <p className="mt-3 text-cream-muted">{s.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 rounded-2xl bg-card hairline flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-cream-muted">Enterprise scale</div>
              <div className="mt-2 font-display text-3xl text-cream">Built for <span className="italic text-lime">10 SKUs or 10,000 SKUs</span>.</div>
            </div>
            <div className="flex gap-6 text-sm text-cream-muted">
              <div><div className="font-display text-2xl text-cream">Consistent</div>styling</div>
              <div><div className="font-display text-2xl text-cream">Multi-platform</div>readiness</div>
              <div><div className="font-display text-2xl text-cream">Collection</div>scaling</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-10 border-t border-line overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-50" style={{ background: "var(--gradient-hero)" }} />
        <div className="max-w-[1200px] mx-auto text-center">
          <SectionLabel><span className="mx-auto">The infrastructure</span></SectionLabel>
          <h2 className="mt-8 font-display font-light text-4xl sm:text-5xl lg:text-8xl tracking-[-0.03em] text-cream text-balance leading-[1.02]">
            ContentPro is the <span className="italic text-lime">visual production layer</span> behind modern commerce teams.
          </h2>
          <p className="mt-10 text-xl text-cream-muted">Replace shoots. Accelerate launches. Scale storytelling.</p>
          <div className="mt-10 flex justify-center">
            <button onClick={() => navigate('/generator')} className="group px-6 py-3.5 rounded-full bg-lime text-ink font-medium hover:bg-lime-deep transition-all hover:scale-[1.02] inline-flex items-center gap-2">
              See your product transformed
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line py-12 px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-lime" />
            <span className="font-display text-lg text-cream">Content<span className="italic text-lime">Pro</span></span>
          </div>
          <div className="font-mono text-xs uppercase tracking-widest text-cream-muted">
            Visual commerce infrastructure © 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
