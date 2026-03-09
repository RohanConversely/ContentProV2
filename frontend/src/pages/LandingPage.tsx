import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ImageIcon,
  Video,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";
import { getLandingGalleryImages, type LandingGalleryImage } from "@/lib/api";

const features = [
  {
    icon: ImageIcon,
    title: "AI-Powered Images",
    desc: "Transform raw product photos into professional Amazon A+ images in seconds.",
  },
  {
    icon: Video,
    title: "Video Creation",
    desc: "Generate cinematic product videos ready for reels, listings, and ads.",
  },
  {
    icon: Zap,
    title: "Instant Results",
    desc: "No design skills needed. Enter your product details and get studio-quality output.",
  },
];

const steps = [
  { number: "01", title: "Upload", desc: "Add your product photos and brand details." },
  { number: "02", title: "Generate", desc: "AI crafts professional images and video content." },
  { number: "03", title: "Download", desc: "Export and use across Amazon, Instagram, and more." },
];

const freeBenefits = ["10 images / month", "2 videos / month", "Standard resolution"];
const proBenefits = ["Unlimited images", "Unlimited videos", "4K export", "Priority processing"];

const LandingPage = () => {
  const navigate = useNavigate();
  const [galleryImages, setGalleryImages] = useState<LandingGalleryImage[]>([]);

  useEffect(() => {
    void (async () => {
      const imgs = await getLandingGalleryImages();
      setGalleryImages(imgs);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">ContentPro</span>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gradient-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        {/* Background blobs */}
        <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-40 w-[400px] h-[400px] rounded-full bg-primary/8 blur-3xl pointer-events-none" />

        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-sm text-primary font-medium"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI-generated content for Amazon sellers
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight"
            >
              Professional content,{" "}
              <span className="text-gradient">zero effort.</span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto"
            >
              Upload your product photos, enter brand details, and ContentPro
              generates studio-quality images and videos — ready for Amazon A+,
              reels, and ads.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.26 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 bg-gradient-primary text-primary-foreground px-8 py-3.5 rounded-xl text-base font-semibold shadow-glow hover:opacity-90 transition-opacity"
              >
                Get Started Free <ArrowRight className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">No credit card required</span>
            </motion.div>
          </div>

          {/* Floating preview cards */}
          {galleryImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-20 grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto"
            >
              {galleryImages.map((img, i) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 + i * 0.07 }}
                  className="aspect-square rounded-xl overflow-hidden border border-border/50 bg-card"
                >
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full object-cover opacity-70 hover:opacity-100 transition-opacity duration-500"
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 border-t border-border/40">
        <div className="container">
          <div className="text-center mb-14">
            <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-3">What you get</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">Everything you need, nothing you don't.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-border bg-card/60 p-6 space-y-3 hover:border-primary/30 hover:shadow-glow transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 border-t border-border/40">
        <div className="container">
          <div className="text-center mb-14">
            <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-3">Simple process</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">Ready in three steps.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="text-center space-y-3 rounded-xl border border-border bg-card/60 p-6 hover:border-primary/30 hover:shadow-glow transition-all duration-300"
              >
                <span className="text-5xl font-display font-bold text-primary">{s.number}</span>
                <h3 className="font-display text-xl font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24 border-t border-border/40">
        <div className="container">
          <div className="text-center mb-14">
            <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-3">Pricing</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">Start free, scale as you grow.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-xl border border-border bg-card/60 p-7 space-y-5"
            >
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Free</p>
                <p className="font-display text-4xl font-bold">$0<span className="text-lg font-normal text-muted-foreground">/mo</span></p>
              </div>
              <ul className="space-y-2.5">
                {freeBenefits.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" /> {b}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors"
              >
                Get Started
              </button>
            </motion.div>

            {/* Pro */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-primary/40 bg-primary/5 p-7 space-y-5 relative overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide">Popular</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Pro</p>
                <p className="font-display text-4xl font-bold">$29<span className="text-lg font-normal text-muted-foreground">/mo</span></p>
              </div>
              <ul className="space-y-2.5">
                {proBenefits.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" /> {b}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
              >
                Upgrade to Pro
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-primary flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-foreground">ContentPro</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-foreground transition-colors">About</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          </div>
          <p>© 2026 ContentPro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
