import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import CreationOptions from "@/components/CreationOptions";
import CreationWizard from "@/components/CreationWizard";
import BatchCreationWizard from "@/components/BatchCreationWizard";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero section */}
      <div className="relative pt-16">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-hero" />

        <div className="relative container py-16 md:py-24">
          <AnimatePresence mode="wait">
            {!selectedMode ? (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                {/* Headline */}
                <div className="max-w-2xl space-y-4">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-display text-4xl md:text-5xl font-bold leading-tight"
                  >
                    Create <span className="text-gradient">Premium</span> Product Images with AI
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg text-muted-foreground leading-relaxed"
                  >
                    Transform raw product photos into professional listing images.
                    Choose genres, themes, and let AI do the magic.
                  </motion.p>
                </div>

                {/* How would you like to get started */}
                <div>
                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="font-display text-xl font-semibold mb-4"
                  >
                    How would you like to get started?
                  </motion.h2>
                  <CreationOptions onSelect={setSelectedMode} />
                </div>
              </motion.div>
            ) : (
              (() => {
                const isBatch = selectedMode.endsWith("-batch");
                const baseMode = (isBatch ? selectedMode.replace(/-batch$/, "") : selectedMode) as
                  | "images"
                  | "video";

                return isBatch ? (
                  <BatchCreationWizard mode={baseMode} onBack={() => setSelectedMode(null)} />
                ) : (
                  <CreationWizard mode={baseMode} onBack={() => setSelectedMode(null)} />
                );
              })()
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Index;
