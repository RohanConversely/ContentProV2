import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ShoppingCart,
  Image,
  Video,
  Store,
  Upload,
  ArrowRight,
  Check,
  Star,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Image Generation",
    description: "Transform raw product photos into professional A+ images with cutting-edge AI",
  },
  {
    icon: Video,
    title: "Video Creation",
    description: "Generate engaging video content from your product images automatically",
  },
  {
    icon: ShoppingCart,
    title: "Amazon-Ready",
    description: "All content optimized for Amazon listing standards and requirements",
  },
];

const steps = [
  {
    number: "01",
    title: "Upload",
    description: "Upload your raw product images and enter brand details",
  },
  {
    number: "02",
    title: "Generate",
    description: "Our AI creates professional images and videos in minutes",
  },
  {
    number: "03",
    title: "Download",
    description: "Download ready-to-use content for your Amazon listings",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for getting started",
    features: ["10 credits/month", "Standard quality", "Basic support"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "For serious sellers",
    features: [
      "50 credits/month",
      "Priority processing",
      "Higher resolution exports",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <div className="relative pt-24 pb-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Create Professional{" "}
                <span className="text-gradient">Amazon A+ Content</span> in Minutes
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Transform raw product images into stunning Amazon A+ images and
                videos with the power of AI. No design skills required.
              </p>
              <div className="flex items-center justify-center gap-4 pt-4">
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-opacity"
                >
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border font-medium hover:bg-secondary transition-colors">
                  View Demo
                </button>
              </div>
            </motion.div>

            {/* Hero Image/Illustration */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-16 rounded-2xl border border-border bg-card p-2 shadow-xl"
            >
              <div className="rounded-xl bg-secondary/50 aspect-video flex items-center justify-center">
                <div className="text-center">
                  <Sparkles className="h-16 w-16 mx-auto text-primary mb-4" />
                  <p className="text-muted-foreground">
                    Your generated A+ content will appear here
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to create professional Amazon content
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-2xl border border-border bg-card"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Create professional content in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative p-6 rounded-2xl border border-border bg-card"
              >
                <span className="font-display text-5xl font-bold text-primary/20 absolute top-4 right-4">
                  {step.number}
                </span>
                <h3 className="font-display text-xl font-semibold mb-2 mt-4">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-20 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Simple Pricing
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Choose the plan that works for you
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 rounded-2xl border bg-card relative ${
                  plan.popular ? "border-primary shadow-lg shadow-primary/10" : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1">
                      <Star className="h-3 w-3" /> Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    plan.popular
                      ? "bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                      : "border border-border hover:bg-secondary"
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold">
                ContentPro<span className="text-gradient">+</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">About</a>
              <a href="#" className="hover:text-foreground">Contact</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a href="#" className="hover:text-foreground">Privacy</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 ContentPro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
