import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Eye,
  Star,
  Camera,
  Home,
  Sparkles,
  Search,
  Image as ImageIcon,
  BookOpen,
  Maximize2,
  X,
  Globe,
  Building2,
  Film,
} from "lucide-react";
import { type ClientKycData, industries } from "./ClientKycStep";

interface GenerationResultsProps {
  kycData: ClientKycData;
  prompt: string;
  images: string[];
  genre: string | null;
  theme: string | null;
  outputType: string | null;
  onBack: () => void;
  onStartOver: () => void;
  onCreateVideo: () => void;
}

const shotTypes = [
  {
    id: "hero",
    label: "Hero Image",
    desc: "Primary listing image — clean, bold, conversion-focused",
    icon: Star,
    orientation: "landscape" as const,
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    desc: "Product in a real-life Indian context setting",
    icon: Home,
    orientation: "landscape" as const,
  },
  {
    id: "studio",
    label: "Studio Shot",
    desc: "Clean enhanced studio — Amazon listing ready",
    icon: Camera,
    orientation: "portrait" as const,
  },
  {
    id: "closeup",
    label: "Close-up Detail",
    desc: "Texture, finish, and craftsmanship macro shot",
    icon: Search,
    orientation: "portrait" as const,
  },
  {
    id: "inuse",
    label: "Product In-Use",
    desc: "Realistic usage scenario with human interaction",
    icon: Eye,
    orientation: "landscape" as const,
  },
  {
    id: "storytelling",
    label: "Storytelling",
    desc: "Emotion-driven narrative — aspirational & relatable",
    icon: BookOpen,
    orientation: "landscape" as const,
  },
  {
    id: "infographic",
    label: "Infographic",
    desc: "Key features & benefits highlighted visually",
    icon: ImageIcon,
    orientation: "portrait" as const,
  },
];

const GenerationResults = ({
  kycData,
  prompt,
  images,
  genre,
  theme,
  outputType,
  onBack,
  onStartOver,
  onCreateVideo,
}: GenerationResultsProps) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    () => Object.fromEntries(shotTypes.map((s) => [s.id, true]))
  );
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Simulate staggered generation
  useEffect(() => {
    shotTypes.forEach((shot, i) => {
      setTimeout(() => {
        setLoadingStates((prev) => ({ ...prev, [shot.id]: false }));
      }, 2000 + i * 800);
    });
  }, []);

  const allDone = Object.values(loadingStates).every((v) => !v);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">
              Generated Images
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              A+ Content for{" "}
              <span className="text-primary font-semibold">
                {kycData.companyName}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {allDone && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onStartOver}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> New Project
            </motion.button>
          )}
          {allDone && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onCreateVideo}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
            >
              <Film className="h-4 w-4" /> Create Video
            </motion.button>
          )}
          {allDone && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              <Download className="h-4 w-4" /> Download All
            </motion.button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!allDone && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              Generating A+ content images…
            </span>
            <span>
              {Object.values(loadingStates).filter((v) => !v).length} /{" "}
              {shotTypes.length}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full bg-gradient-primary rounded-full"
              initial={{ width: "0%" }}
              animate={{
                width: `${
                  (Object.values(loadingStates).filter((v) => !v).length /
                    shotTypes.length) *
                  100
                }%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shotTypes.map((shot, i) => {
          const ShotIcon = shot.icon;
          const isLoading = loadingStates[shot.id];
          // Use uploaded images as placeholders for demo
          const demoSrc = images.length > 0 ? images[i % images.length] : null;

          return (
            <motion.div
              key={shot.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`group relative rounded-xl border overflow-hidden transition-all duration-300 ${
                shot.orientation === "landscape"
                  ? "aspect-[4/3]"
                  : "aspect-[3/4]"
              } ${
                isLoading
                  ? "border-border bg-card"
                  : "border-border hover:border-primary/40 bg-card hover:shadow-glow"
              }`}
            >
              {isLoading ? (
                /* Loading state */
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ShotIcon className="h-5 w-5 text-primary" />
                    </div>
                    <motion.div
                      className="absolute -inset-1 rounded-xl border-2 border-primary/30"
                      animate={{ opacity: [0.3, 0.8, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{shot.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Generating…
                    </p>
                  </div>
                  {/* Shimmer bars */}
                  <div className="w-full space-y-2 px-6">
                    <div className="h-2 rounded-full bg-secondary animate-pulse" />
                    <div className="h-2 rounded-full bg-secondary animate-pulse w-3/4" />
                  </div>
                </div>
              ) : (
                /* Generated image */
                <>
                  {demoSrc ? (
                    <img
                      src={demoSrc}
                      alt={shot.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-card flex items-center justify-center">
                      <ShotIcon className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Bottom label */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                    <div className="translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <p className="text-sm font-semibold">{shot.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {shot.desc}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button
                        onClick={() => demoSrc && setPreviewImage(demoSrc)}
                        className="h-8 w-8 rounded-lg bg-card/80 backdrop-blur border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
                      <button className="h-8 w-8 rounded-lg bg-card/80 backdrop-blur border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Top-left badge */}
                  <div className="absolute top-2 left-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-card/80 backdrop-blur border border-border text-xs">
                      <ShotIcon className="h-3 w-3 text-primary" />
                      <span className="font-medium">{shot.label}</span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Summary footer */}
      {allDone && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card/60 backdrop-blur p-5 space-y-4"
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {kycData.companyName || "Untitled Project"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {shotTypes.length} images generated
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {kycData.website && (
                <a
                  href={kycData.website.startsWith("http") ? kycData.website : `https://${kycData.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-primary hover:bg-secondary transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {kycData.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity">
                <RefreshCw className="h-4 w-4" /> Regenerate All
              </button>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs pt-3 border-t border-border">
            <div className="space-y-1">
              <span className="text-muted-foreground">Client</span>
              <p className="font-medium truncate">{kycData.companyName || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Industry</span>
              <p className="font-medium">{industries.find(i => i.id === kycData.industry)?.label || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Category</span>
              <p className="font-medium truncate">{kycData.productCategory || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Genre</span>
              <p className="font-medium">{genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Theme</span>
              <p className="font-medium">{theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Output</span>
              <p className="font-medium">{outputType || "—"}</p>
            </div>
          </div>

          {/* Social links */}
          {(kycData.instagram || kycData.facebook || kycData.linkedin || kycData.twitter) && (
            <div className="pt-3 border-t border-border flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted-foreground">Socials:</span>
              {kycData.instagram && (
                <a href={kycData.instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Instagram</a>
              )}
              {kycData.facebook && (
                <a href={kycData.facebook} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Facebook</a>
              )}
              {kycData.linkedin && (
                <a href={kycData.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">LinkedIn</a>
              )}
              {kycData.twitter && (
                <a href={kycData.twitter} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">X / Twitter</a>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Lightbox */}
      {previewImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-6 h-10 w-10 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <motion.img
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            src={previewImage}
            alt="Preview"
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </motion.div>
  );
};

export default GenerationResults;
