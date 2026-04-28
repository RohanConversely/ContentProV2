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
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";

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

const landingImages = {
  hero: "/landing_page_images/image1.png",
  featureA: "/landing_page_images/image2.png",
  featureB: "/landing_page_images/image3.png",
  featureC: "/landing_page_images/image4.png",
  galleryA: "/landing_page_images/image5.png",
  galleryB: "/landing_page_images/image6.png",
  galleryC: "/landing_page_images/image7.png",
  galleryD: "/landing_page_images/image8.png",
};

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">ContentPro</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
              className="bg-gradient-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
            >
              {isAuthenticated ? "Open App" : "Sign In"}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40 pt-28 pb-16">
        <div className="absolute top-20 -left-32 h-80 w-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-8 -right-32 h-80 w-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="container relative grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              AI-generated content for Amazon sellers
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">
              Launch premium product creatives in minutes.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground md:text-lg">
              Transform raw product photos into high-converting brand stories. No design degree required. Boost your conversion rate by up to 25% with our luminous AI engine.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
              >
                Get Started For Free <ArrowRight className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">No credit card required</span>
            </div>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card/60 p-3 shadow-card">
            <img
              src={landingImages.hero}
              alt="Landing preview"
              className="w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* Feature visual cards */}
      <section className="py-20 border-b border-border/40">
        <div className="container grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/60 p-3">
            <img src={landingImages.featureA} alt="Image generation preview" className="h-56 w-full rounded-xl object-cover" />
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-3">
            <img src={landingImages.featureB} alt="Product layout preview" className="h-56 w-full rounded-xl object-cover" />
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-3">
            <img src={landingImages.featureC} alt="Output composition preview" className="h-56 w-full rounded-xl object-cover" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-b border-border/40">
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

      {/* Process + gallery */}
      <section className="py-24 border-b border-border/40">
        <div className="container">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Simple process</p>
            <h2 className="font-display text-3xl font-bold md:text-4xl">One flow, production-ready output.</h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-2xl border border-border bg-card/60 p-3">
                <img src={landingImages.galleryA} alt="Generated creative set" className="h-64 w-full rounded-xl object-cover" />
              </div>
              <div className="rounded-2xl border border-border bg-card/60 p-3">
                <img src={landingImages.galleryC} alt="Creative sample" className="h-44 w-full rounded-xl object-cover" />
              </div>
              <div className="rounded-2xl border border-border bg-card/60 p-3">
                <img src={landingImages.galleryD} alt="Creative icon sample" className="h-44 w-full rounded-xl object-cover" />
              </div>
            </div>
            <div className="grid gap-4">
              {steps.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border border-border bg-card/60 p-6"
                >
                  <p className="text-3xl font-display font-bold text-primary">{s.number}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="py-24 border-b border-border/40">
        <div className="container">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Showcase</p>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Results your catalog can publish immediately.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card/60 p-3">
              <img src={landingImages.galleryB} alt="Hero-style generated output" className="h-[420px] w-full rounded-xl object-cover" />
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-3">
              <img src={landingImages.featureB} alt="Additional generated output" className="h-[420px] w-full rounded-xl object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
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
                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
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

      {/* Footer */}
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
