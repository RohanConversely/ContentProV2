import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Sparkles,
  Maximize2,
  X,
  Globe,
  Building2,
  Film,
  Check,
} from "lucide-react";
import { type ProductFormData } from "./CreationWizard";
import { downloadFile, downloadJobImagesArchive } from "@/lib/api";

interface GenerationResultsProps {
  productData: ProductFormData;
  mode: string;
  generatedImages?: string[];
  jobId?: string | null;
  isLoading?: boolean;
  error?: string | null;
  statusStage?: string | null;
  statusMessage?: string | null;
  statusUpdates?: { stage: string; status: string; message: string }[];
  onBack: () => void;
  onStartOver: () => void;
  onCreateVideo?: () => void;
}

const GenerationResults = ({
  productData,
  mode,
  generatedImages,
  jobId,
  isLoading = false,
  error = null,
  statusStage = null,
  statusMessage = null,
  statusUpdates = [],
  onBack,
  onStartOver,
  onCreateVideo,
}: GenerationResultsProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const allDone = !isLoading && !error;
  const displayImages = Array.isArray(generatedImages) ? generatedImages.filter(Boolean) : [];

  const toggleImageSelection = (index: number) => {
    setSelectedImages(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const canCreateVideo = selectedImages.length >= 3;
  const isVideoMode = mode === "video";

  const handleDownloadImage = async (src: string, index: number) => {
    await downloadFile(src, `${productData.productName || "generated-image"}-${index + 1}.png`);
  };

  const handleDownloadAll = async () => {
    if (jobId) {
      await downloadJobImagesArchive(jobId, `${productData.brandName}_${productData.productName}`);
      return;
    }
    for (const [index, src] of displayImages.entries()) {
      await handleDownloadImage(src, index);
    }
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
            <h2 className="font-display text-2xl md:text-3xl font-bold">
              Generated Images
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              A+ Content for{" "}
              <span className="text-primary font-semibold">
                {productData.brandName}
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
          {allDone && onCreateVideo && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onCreateVideo}
              disabled={isVideoMode && !canCreateVideo}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Film className="h-4 w-4" /> Create Video
            </motion.button>
          )}
          {allDone && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => void handleDownloadAll()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              <Download className="h-4 w-4" /> Download All
            </motion.button>
          )}
        </div>
      </div>

      {/* Live status */}
      {!allDone && (
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span>{statusMessage || "Generating A+ content images..."}</span>
          </div>
          <div className="mt-3 space-y-2">
            {statusUpdates.length > 0 ? (
              statusUpdates.map((update, index) => (
                <div key={`${update.stage}-${update.status}-${index}`} className="text-sm text-muted-foreground">
                  {update.message}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">{statusStage || "queued"}</div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Selection message for video mode */}
      {allDone && isVideoMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between"
        >
          <p className="text-sm font-medium">
            Select at least <span className="text-primary">3 images</span> for video generation
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedImages.length}/{displayImages.length} selected
          </p>
        </motion.div>
      )}

      {/* Image Grid - 6 images, 1:1 aspect ratio */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: Math.max(displayImages.length, isLoading ? 6 : displayImages.length) }).map((_, i) => {
          const src = displayImages[i];
          const isSelected = selectedImages.includes(i);
          if (!src) {
            return (
              <div
                key={`placeholder-${i}`}
                className="aspect-square overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="h-full w-full animate-pulse bg-gradient-to-br from-secondary via-card to-secondary" />
              </div>
            );
          }

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`group relative rounded-xl border overflow-hidden transition-all duration-300 ${
                isSelected
                  ? "border-primary bg-card ring-2 ring-primary shadow-glow"
                  : "border-border hover:border-primary/40 bg-card hover:shadow-glow cursor-pointer"
              } aspect-square`}
            >
              <>
                  <img
                    src={src}
                    alt={`Generated Image ${i + 1}`}
                    className="h-full w-full object-cover"
                    onClick={() => isVideoMode && toggleImageSelection(i)}
                  />

                  {/* Selection overlay for video mode */}
                  {isVideoMode && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleImageSelection(i);
                        }}
                        className={`absolute top-3 left-3 z-10 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "bg-white/80 border-gray-400 hover:border-primary"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  {/* Bottom label */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                    <div className="translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <p className="text-sm font-semibold">Image {i + 1}</p>
                      <p className="text-xs text-muted-foreground">1024 × 1024</p>
                    </div>
                    <div className="flex items-center gap-1.5 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button
                        onClick={() => src && setPreviewImage(src)}
                        className="h-8 w-8 rounded-lg bg-card/80 backdrop-blur border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => void handleDownloadImage(src, i)}
                        className="h-8 w-8 rounded-lg bg-card/80 backdrop-blur border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Top-right badge */}
                  {isVideoMode && isSelected && (
                    <div className="absolute top-3 right-3 z-10">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
                        <Check className="h-3 w-3" />
                        Selected
                      </div>
                    </div>
                  )}
              </>
            </motion.div>
          );
        })}
      </div>

      {allDone && displayImages.length === 0 && !error && (
        <div className="rounded-xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">
          No generated images were returned by the backend.
        </div>
      )}

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
                      {productData.productName || "Untitled Project"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {displayImages.length} images generated {jobId ? `· Job ${jobId}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {productData.brandWebsite && (
                    <a
                      href={productData.brandWebsite.startsWith("http") ? productData.brandWebsite : `https://${productData.brandWebsite}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-primary hover:bg-secondary transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {productData.brandWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-border">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Brand</span>
                  <p className="font-medium truncate">{productData.brandName || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Product</span>
                  <p className="font-medium truncate">{productData.productName || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Category</span>
                  <p className="font-medium truncate">{productData.productCategory || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Dimensions</span>
                  <p className="font-medium truncate">
                    {productData.dimensionLength && productData.dimensionBreadth && productData.dimensionHeight
                      ? `${productData.dimensionLength} × ${productData.dimensionBreadth} × ${productData.dimensionHeight} ${productData.dimensionUnit}`
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Description */}
              {productData.productDescription && (
                <div className="pt-2 border-t border-border space-y-1">
                  <span className="text-xs text-muted-foreground">Description</span>
                  <p className="text-xs">{productData.productDescription}</p>
                </div>
              )}

              {/* Social links */}
              {(productData.socialLinkInstagram || productData.socialLinkFacebook || productData.socialLinkLinkedin || productData.socialLinkX) && (
                <div className="pt-3 border-t border-border flex flex-wrap items-center gap-3">
                  <span className="text-xs text-muted-foreground">Socials:</span>
                  {productData.socialLinkInstagram && (
                    <a href={productData.socialLinkInstagram} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Instagram</a>
                  )}
                  {productData.socialLinkFacebook && (
                    <a href={productData.socialLinkFacebook} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Facebook</a>
                  )}
                  {productData.socialLinkLinkedin && (
                    <a href={productData.socialLinkLinkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">LinkedIn</a>
                  )}
                  {productData.socialLinkX && (
                    <a href={productData.socialLinkX} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">X</a>
                  )}
                </div>
              )}

              {/* Additional Metadata */}
              {productData.additionalInfo && Object.keys(productData.additionalInfo).length > 0 && (
                <div className="pt-3 border-t border-border space-y-2">
                  <span className="text-xs text-muted-foreground">Additional Information:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(productData.additionalInfo).map(([key, value]) => (
                      value && (
                        <div key={key} className="flex items-center justify-between text-[11px] border-b border-border/50 pb-1">
                          <span className="text-muted-foreground font-medium">{key}:</span>
                          <span className="truncate max-w-[150px]">{value}</span>
                        </div>
                      )
                    ))}
                  </div>
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
