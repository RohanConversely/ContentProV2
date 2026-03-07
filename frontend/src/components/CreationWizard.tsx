import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Wand2,
  PenLine,
  Palette,
  Layout,
  Check,
  Sparkles,
  ShoppingBag,
  Share2,
  MonitorPlay,
  Image as ImageIcon,
  Lightbulb,
  Upload,
  Building2,
  Globe,
} from "lucide-react";
import GenreThemeSelector from "./GenreThemeSelector";
import ImageUploadZone from "./ImageUploadZone";
import ClientKycStep, { type ClientKycData, industries } from "./ClientKycStep";
import GenerationResults from "./GenerationResults";
import VideoCreation from "./VideoCreation";

interface CreationWizardProps {
  mode: string;
  onBack: () => void;
}

const outputTypes = [
  {
    id: "product",
    label: "Product Images",
    desc: "Hero shots, lifestyle scenes, infographics for your listings",
    icon: ShoppingBag,
  },
  {
    id: "aplus",
    label: "A+ Content",
    desc: "Amazon enhanced brand content with rich storytelling modules",
    icon: Sparkles,
  },
  {
    id: "social",
    label: "Social Media",
    desc: "Optimized for Instagram, Facebook, Pinterest & more",
    icon: Share2,
  },
  {
    id: "banner",
    label: "Banners & Ads",
    desc: "Web banners, display ads, and promotional creatives",
    icon: MonitorPlay,
  },
];

const promptSuggestions = [
  "Premium watch on dark reflective surface with dramatic lighting",
  "Organic skincare bottles in a botanical garden setting",
  "Minimalist tech gadget on a clean marble desk",
  "Luxury handbag in an editorial fashion shoot style",
];

const stepConfig = [
  { icon: Building2, label: "Client Info" },
  { icon: PenLine, label: "Describe", altLabel: "Upload" },
  { icon: Palette, label: "Genre & Theme" },
  { icon: Layout, label: "Output Type" },
];

const emptyKyc: ClientKycData = {
  companyName: "",
  website: "",
  industry: "",
  instagram: "",
  facebook: "",
  linkedin: "",
  twitter: "",
  productCategory: "",
};

const CreationWizard = ({ mode, onBack }: CreationWizardProps) => {
  const [step, setStep] = useState(0);
  const [kycData, setKycData] = useState<ClientKycData>(emptyKyc);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showVideoCreation, setShowVideoCreation] = useState(false);

  const totalSteps = stepConfig.length;

  const canProceed = () => {
    if (step === 0) return kycData.companyName.trim().length > 0 && kycData.industry.length > 0;
    if (step === 1) return mode === "generate" ? prompt.trim().length > 0 : images.length > 0;
    if (step === 2) return selectedGenre && selectedTheme;
    if (step === 3) return selectedOutput;
    return false;
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowResults(true);
    }, 1500);
  };

  if (showVideoCreation) {
    return (
      <VideoCreation
        kycData={kycData}
        prompt={prompt}
        images={images}
        genre={selectedGenre}
        theme={selectedTheme}
        outputType={outputTypes.find((o) => o.id === selectedOutput)?.label ?? null}
        onBack={() => setShowVideoCreation(false)}
        onStartOver={onBack}
      />
    );
  }

  if (showResults) {
    return (
      <GenerationResults
        kycData={kycData}
        prompt={prompt}
        images={images}
        genre={selectedGenre}
        theme={selectedTheme}
        outputType={outputTypes.find((o) => o.id === selectedOutput)?.label ?? null}
        onBack={() => setShowResults(false)}
        onStartOver={onBack}
        onCreateVideo={() => {
          setShowResults(false);
          setShowVideoCreation(true);
        }}
      />
    );
  }

  const genreLabel = selectedGenre
    ? selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)
    : null;
  const themeLabel = selectedTheme
    ? selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)
    : null;
  const outputLabel = outputTypes.find((o) => o.id === selectedOutput)?.label;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h2 className="font-display text-2xl md:text-3xl font-bold">
            {mode === "generate"
              ? "Generate with AI"
              : mode === "upload"
              ? "Upload & Transform"
              : mode === "template"
              ? "Use a Template"
              : "Import & Enhance"}
          </h2>
        </div>
      </div>

      {/* Enhanced Step Indicator */}
      <div className="flex items-center gap-0">
        {stepConfig.map((s, i) => {
          const isActive = i === step;
          const isCompleted = i < step;
          const StepIcon = s.icon;
          const label = i === 1 && mode !== "generate" ? (s.altLabel ?? s.label) : s.label;

          return (
            <div key={i} className="flex items-center flex-1">
              <button
                onClick={() => {
                  if (isCompleted) setStep(i);
                }}
                disabled={!isCompleted}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-300 w-full ${
                  isActive
                    ? "bg-primary/15 border border-primary/40 shadow-glow"
                    : isCompleted
                    ? "bg-secondary/80 border border-border cursor-pointer hover:bg-secondary"
                    : "bg-card/40 border border-border/50 opacity-50"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                    isActive
                      ? "bg-gradient-primary text-primary-foreground"
                      : isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs text-muted-foreground">Step {i + 1}</p>
                  <p
                    className={`text-sm font-medium truncate ${
                      isActive ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {label}
                  </p>
                </div>
              </button>
              {i < stepConfig.length - 1 && (
                <div
                  className={`h-px w-4 shrink-0 mx-1 ${
                    isCompleted ? "bg-primary/40" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="min-h-[340px]"
        >
          {/* STEP 0 — Client KYC */}
          {step === 0 && (
            <ClientKycStep data={kycData} onChange={setKycData} />
          )}

          {/* STEP 1 — Describe or Upload */}
          {step === 1 && (
            <div className="space-y-6">
              {mode === "generate" ? (
                <>
                  <div>
                    <h3 className="font-display text-xl font-semibold mb-1">
                      Describe Your Vision
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tell us what kind of premium images you want to create
                    </p>
                  </div>

                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="E.g., Premium watch product photography with dark moody lighting, reflective surface, clean minimalist composition..."
                      className="w-full h-36 rounded-xl border border-border bg-card p-4 pr-12 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none transition-all"
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                      {prompt.length}/500
                    </div>
                  </div>

                  {/* Prompt Suggestions */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Try a suggestion
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {promptSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setPrompt(suggestion)}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                            prompt === suggestion
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30"
                          }`}
                        >
                          {suggestion.substring(0, 45)}...
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional: Also upload reference images */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Optionally upload reference images for better results
                    </p>
                    <ImageUploadZone images={images} onImagesChange={setImages} />
                  </div>
                </>
              ) : (
                <ImageUploadZone images={images} onImagesChange={setImages} />
              )}
            </div>
          )}

          {/* STEP 2 — Genre & Theme */}
          {step === 2 && (
            <GenreThemeSelector
              selectedGenre={selectedGenre}
              selectedTheme={selectedTheme}
              onGenreSelect={setSelectedGenre}
              onThemeSelect={setSelectedTheme}
            />
          )}

          {/* STEP 3 — Output Type + Review */}
          {step === 3 && (
            <div className="space-y-8">
              <div>
                <h3 className="font-display text-xl font-semibold mb-1">
                  What would you like to create?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select the output format for your premium images
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {outputTypes.map((type) => {
                  const TypeIcon = type.icon;
                  const isSelected = selectedOutput === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedOutput(type.id)}
                      className={`group relative flex items-start gap-4 p-5 rounded-xl border text-left transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-glow"
                          : "border-border bg-card hover:border-primary/30 hover:bg-secondary"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${
                          isSelected
                            ? "bg-gradient-primary text-primary-foreground"
                            : "bg-primary/10 text-primary group-hover:bg-primary/20"
                        }`}
                      >
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1">{type.label}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {type.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Review Summary */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl border border-border bg-card/60 backdrop-blur p-5 space-y-4"
              >
                {/* Header with client name */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-display font-semibold text-base flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Review Summary
                    </h4>
                    {kycData.companyName && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Creating for <span className="text-primary font-semibold">{kycData.companyName}</span>
                      </p>
                    )}
                  </div>
                  {kycData.website && (
                    <a
                      href={kycData.website.startsWith("http") ? kycData.website : `https://${kycData.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {kycData.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                </div>

                {/* Client & Project Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
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
                    <p className="font-medium">{genreLabel || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Theme</span>
                    <p className="font-medium">{themeLabel || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Output</span>
                    <p className="font-medium">{outputLabel || "—"}</p>
                  </div>
                </div>

                {/* Social links row */}
                {(kycData.instagram || kycData.facebook || kycData.linkedin || kycData.twitter) && (
                  <div className="pt-2 border-t border-border flex flex-wrap items-center gap-3">
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

                {prompt && (
                  <div className="pt-2 border-t border-border space-y-1">
                    <span className="text-xs text-muted-foreground">Prompt</span>
                    <p className="text-xs text-foreground/80 line-clamp-2">{prompt}</p>
                  </div>
                )}
                {images.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {images.length} image{images.length > 1 ? "s" : ""} uploaded
                    </span>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {stepConfig.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step ? "w-6 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        {step < totalSteps - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={!canProceed() || isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" /> Generate Images
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default CreationWizard;
