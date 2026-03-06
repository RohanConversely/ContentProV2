import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Image, Video, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";

const CreatePage = () => {
  const options = [
    {
      id: "images",
      icon: Image,
      title: "Generate Images",
      description: "Create Amazon A+ ready product images with AI-powered generation",
      href: "/create/images",
      features: [
        "6 unique image variations",
        "Multiple themes & styles",
        "Amazon-optimized sizing",
        "Instant download",
      ],
    },
    {
      id: "video",
      icon: Video,
      title: "Generate Video",
      description: "Create engaging video content from your product images",
      href: "/create/video",
      features: [
        "Motion video generation",
        "Background music options",
        "Social media ready",
        "HD quality export",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">
            Create New <span className="text-gradient">Content</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Choose what type of content you want to create. Our AI will generate
            professional-grade visuals for your Amazon listings.
          </p>
        </div>

        {/* Option Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={option.href}
                  className="group block p-6 rounded-2xl border border-border bg-card hover:bg-secondary transition-all duration-300 hover:shadow-glow hover:border-primary/30 h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all duration-300">
                      <Icon className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>

                  <h2 className="font-display text-xl font-semibold mb-2">
                    {option.title}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    {option.description}
                  </p>

                  <ul className="space-y-2">
                    {option.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
