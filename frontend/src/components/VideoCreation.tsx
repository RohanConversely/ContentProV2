import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Pause,
  Music,
  Upload,
  Sparkles,
  TrendingUp,
  Library,
  Download,
  RefreshCw,
  Video,
  Volume2,
  VolumeX,
  Clock,
  Film,
  ChevronRight,
  Check,
  Wand2,
} from "lucide-react";
import { type ProductFormData } from "./CreationWizard";

interface VideoCreationProps {
  productData: ProductFormData;
  images: string[];
  onBack: () => void;
  onStartOver: () => void;
}

type MusicSource = "trending" | "royalty-free" | "upload" | "ai-generated";

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  mood: string;
  source: MusicSource;
}

const musicSources: { id: MusicSource; label: string; icon: typeof Music; desc: string }[] = [
  { id: "trending", label: "Instagram Trending", icon: TrendingUp, desc: "Hot reels audio" },
  { id: "royalty-free", label: "Royalty Free", icon: Library, desc: "Licensed tracks" },
  { id: "upload", label: "Custom Upload", icon: Upload, desc: "Your own audio" },
  { id: "ai-generated", label: "AI Generated", icon: Sparkles, desc: "Custom AI music" },
];

const trendingTracks: MusicTrack[] = [
  { id: "t1", title: "Aesthetic Vibes", artist: "Reel Audio", duration: "0:30", mood: "Trendy", source: "trending" },
  { id: "t2", title: "Main Character Energy", artist: "Viral Sounds", duration: "0:25", mood: "Upbeat", source: "trending" },
  { id: "t3", title: "Soft Glow", artist: "Insta Beats", duration: "0:35", mood: "Calm", source: "trending" },
  { id: "t4", title: "Luxury Drop", artist: "Premium Audio", duration: "0:20", mood: "Elegant", source: "trending" },
  { id: "t5", title: "Product Reveal", artist: "Trend Studio", duration: "0:30", mood: "Dramatic", source: "trending" },
];

const royaltyFreeTracks: MusicTrack[] = [
  { id: "r1", title: "Cinematic Rise", artist: "StockAudio Pro", duration: "1:00", mood: "Cinematic", source: "royalty-free" },
  { id: "r2", title: "Gentle Morning", artist: "Ambient Lab", duration: "0:45", mood: "Calm", source: "royalty-free" },
  { id: "r3", title: "Urban Pulse", artist: "Beat Factory", duration: "0:30", mood: "Energetic", source: "royalty-free" },
  { id: "r4", title: "Elegant Piano", artist: "Classical Cuts", duration: "0:50", mood: "Sophisticated", source: "royalty-free" },
  { id: "r5", title: "Lo-Fi Dreams", artist: "Chill Waves", duration: "1:00", mood: "Relaxed", source: "royalty-free" },
  { id: "r6", title: "Corporate Upbeat", artist: "Biz Tunes", duration: "0:40", mood: "Professional", source: "royalty-free" },
];

const aiPromptSuggestions = [
  "Cinematic orchestral build-up for luxury product reveal",
  "Lo-fi chill beat for lifestyle product showcase",
  "Upbeat trendy pop for social media reel",
  "Elegant ambient piano for premium brand video",
];

const videoDurations = [
  { value: 15, label: "15s", desc: "Instagram Story" },
  { value: 30, label: "30s", desc: "Reel / Short" },
  { value: 60, label: "60s", desc: "Full Reel" },
];

const videoStyles = [
  { id: "slideshow", label: "Smooth Slideshow", desc: "Ken Burns pan & zoom transitions" },
  { id: "cinematic", label: "Cinematic Cuts", desc: "Quick cuts with motion blur" },
  { id: "reveal", label: "Product Reveal", desc: "Dramatic zoom-in reveal sequence" },
  { id: "storytelling", label: "Story Arc", desc: "Narrative flow with text overlays" },
];

interface VideoCreationProps {
  productData: ProductFormData;
  images: string[];
  onBack: () => void;
  onStartOver: () => void;
}

const VideoCreation = ({
  productData,
  images,
  onBack,
  onStartOver,
}: VideoCreationProps) => {
  const [activeSource, setActiveSource] = useState<MusicSource>("trending");
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [selectedStyle, setSelectedStyle] = useState("cinematic");
  const [aiMusicPrompt, setAiMusicPrompt] = useState("");
  const [customAudioName, setCustomAudioName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Simulate slideshow preview
  useEffect(() => {
    if (!isPlaying || images.length === 0) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % Math.max(images.length, 1));
    }, 2500);
    return () => clearInterval(interval);
  }, [isPlaying, images.length]);

  // Simulate generation progress
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          setVideoReady(true);
          return 100;
        }
        return prev + Math.random() * 8 + 2;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const currentTracks = activeSource === "trending" ? trendingTracks : activeSource === "royalty-free" ? royaltyFreeTracks : [];

  const hasMusicSelection = () => {
    if (activeSource === "trending" || activeSource === "royalty-free") return !!selectedTrack;
    if (activeSource === "upload") return !!customAudioName;
    if (activeSource === "ai-generated") return aiMusicPrompt.trim().length > 0;
    return false;
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setVideoReady(false);
  };

  const handleFileUpload = () => {
    setCustomAudioName("custom-track.mp3");
  };

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
            <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Film className="h-7 w-7 text-primary" />
              Create Video
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Transform your A+ images into a cinematic video for{" "}
              <span className="text-primary font-semibold">{productData.brandName}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onStartOver}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> New Project
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Video Preview (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Preview */}
          <div className="relative aspect-[9/16] rounded-xl border border-border bg-card overflow-hidden">
            {images.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={images[currentImageIndex % images.length]}
                  alt="Preview frame"
                  className="absolute inset-0 h-full w-full object-cover"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.8 }}
                />
              </AnimatePresence>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-card to-secondary">
                <Video className="h-16 w-16 text-muted-foreground/20" />
              </div>
            )}

            {/* Overlay controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/30" />

            {/* Play/Pause button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-14 w-14 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center text-primary-foreground hover:bg-primary transition-colors shadow-glow"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
              </button>
            </div>

            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="h-8 w-8 rounded-lg bg-card/60 backdrop-blur border border-border/50 flex items-center justify-center hover:bg-card/80 transition-colors"
                >
                  {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-card/60 backdrop-blur border border-border/50 text-xs">
                <Clock className="h-3 w-3 text-primary" />
                <span>{selectedDuration}s</span>
              </div>
            </div>

            {/* Top badge */}
            <div className="absolute top-3 left-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/70 backdrop-blur border border-border/50 text-xs font-medium">
                <div className={`h-2 w-2 rounded-full ${isPlaying ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
                {isPlaying ? "Preview" : "Paused"}
              </div>
            </div>
          </div>

        </div>

        {/* Right: Music Selection (3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Music Source Tabs */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              Background Music
            </h3>
            <div className="flex gap-2">
              {musicSources.map((source) => {
                const SourceIcon = source.icon;
                const isActive = activeSource === source.id;
                return (
                  <button
                    key={source.id}
                    onClick={() => {
                      setActiveSource(source.id);
                      setSelectedTrack(null);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary shadow-glow"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30"
                    }`}
                  >
                    <SourceIcon className="h-3.5 w-3.5" />
                    {source.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Music Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSource}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Trending / Royalty-Free Tracks */}
              {(activeSource === "trending" || activeSource === "royalty-free") && (
                <div className="space-y-2">
                  {activeSource === "trending" && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      Trending on Instagram Reels this week
                    </p>
                  )}
                  {currentTracks.map((track) => {
                    const isSelected = selectedTrack === track.id;
                    return (
                      <button
                        key={track.id}
                        onClick={() => setSelectedTrack(track.id)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-glow"
                            : "border-border bg-card hover:border-primary/30 hover:bg-secondary/50"
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-gradient-primary text-primary-foreground" : "bg-primary/10 text-primary"
                        }`}>
                          {isSelected ? <Check className="h-4 w-4" /> : <Music className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : ""}`}>{track.title}</p>
                          <p className="text-xs text-muted-foreground">{track.artist}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{track.mood}</span>
                          <span className="text-xs text-muted-foreground">{track.duration}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Custom Upload */}
              {activeSource === "upload" && (
                <div className="space-y-4">
                  <div
                    onClick={handleFileUpload}
                    className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-border bg-card/50 hover:border-primary/40 hover:bg-secondary/30 transition-all cursor-pointer"
                  >
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Upload your audio file</p>
                      <p className="text-xs text-muted-foreground mt-1">MP3, WAV, AAC — Max 10MB</p>
                    </div>
                  </div>
                  {customAudioName && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3.5 rounded-xl border border-primary bg-primary/10 shadow-glow"
                    >
                      <div className="h-10 w-10 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center">
                        <Music className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">{customAudioName}</p>
                        <p className="text-xs text-muted-foreground">Custom audio uploaded</p>
                      </div>
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    </motion.div>
                  )}
                </div>
              )}

              {/* AI Generated */}
              {activeSource === "ai-generated" && (
                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={aiMusicPrompt}
                      onChange={(e) => setAiMusicPrompt(e.target.value)}
                      placeholder="Describe the music you want... e.g., 'Cinematic orchestral build-up with soft piano intro'"
                      className="w-full h-28 rounded-xl border border-border bg-card p-4 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none transition-all"
                    />
                    <div className="absolute bottom-3 right-3">
                      <Sparkles className="h-4 w-4 text-primary/40" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aiPromptSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setAiMusicPrompt(suggestion)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          aiMusicPrompt === suggestion
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30"
                        }`}
                      >
                        {suggestion.substring(0, 40)}…
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Client Summary */}
          <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Project Summary</p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-muted-foreground">Brand</span>
                <p className="font-medium truncate">{productData.brandName || "—"}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground">Product</span>
                <p className="font-medium truncate">{productData.productName || "—"}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground">Category</span>
                <p className="font-medium truncate">{productData.productCategory || "—"}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground">Images</span>
                <p className="font-medium">{images.length} selected</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generation Progress / CTA */}
      {isGenerating ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card/60 backdrop-blur p-5 space-y-3"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Film className="h-5 w-5 text-primary" />
            </motion.div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Creating your video…</p>
              <p className="text-xs text-muted-foreground">
                {generationProgress < 30
                  ? "Sequencing images…"
                  : generationProgress < 60
                  ? "Applying transitions & effects…"
                  : generationProgress < 85
                  ? "Mixing background music…"
                  : "Finalizing export…"}
              </p>
            </div>
            <span className="text-sm font-semibold text-primary">{Math.min(Math.round(generationProgress), 100)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full bg-gradient-primary rounded-full"
              animate={{ width: `${Math.min(generationProgress, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      ) : videoReady ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/30 bg-primary/5 backdrop-blur p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Video Ready!</p>
                <p className="text-xs text-muted-foreground">
                  {images.length} frames selected
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> Regenerate
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity">
                <Download className="h-4 w-4" /> Download Video
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {images.length} images selected
          </p>
          <button
            onClick={handleGenerate}
            disabled={!hasMusicSelection()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <Wand2 className="h-4 w-4" /> Generate Video
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default VideoCreation;
