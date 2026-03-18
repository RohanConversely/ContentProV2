import { useEffect, useMemo, useState } from "react";
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
  Loader2,
  Upload,
} from "lucide-react";
import { type ProductFormData } from "./CreationWizard";
import {
  downloadFile,
  downloadJobImagesArchive,
  cancelJob,
  getJob,
  regenerateJobImages,
  waitForJobCompletion,
  type BackendJobResponse,
  type GeneratedImageResult,
  type JobGenerationSummary,
} from "@/lib/api";

const ImageLightbox = ({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 h-10 w-10 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-secondary transition-colors z-10"
      >
        <X className="h-5 w-5" />
      </button>
      <motion.img
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        src={src}
        alt="Preview"
        className="max-w-[70vw] max-h-[70vh] w-auto h-auto object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
};

interface GenerationResultsProps {
  productData: ProductFormData;
  mode: string;
  generatedImages?: string[];
  generations?: JobGenerationSummary[];
  jobId?: string | null;
  isLoading?: boolean;
  error?: string | null;
  statusStage?: string | null;
  statusMessage?: string | null;
  statusUpdates?: { stage: string; status: string; message: string }[];
  onResultChange?: (result: GeneratedImageResult) => void;
  onCancel?: () => Promise<void> | void;
  onBack: () => void;
  onStartOver: () => void;
  onCreateVideo?: (images: string[]) => void;
}

const GenerationResults = ({
  productData,
  mode,
  generatedImages,
  generations = [],
  jobId,
  isLoading = false,
  error = null,
  statusStage = null,
  statusMessage = null,
  statusUpdates = [],
  onResultChange,
  onCancel,
  onBack,
  onStartOver,
  onCreateVideo,
}: GenerationResultsProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [additionalDescription, setAdditionalDescription] = useState("");
  const [regenerationModel, setRegenerationModel] = useState<"reve" | "gpt-image-1">("reve");
  const [regenerationInputFiles, setRegenerationInputFiles] = useState<File[]>([]);
  const [regenerationError, setRegenerationError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null);
  const [localGenerations, setLocalGenerations] = useState<JobGenerationSummary[]>(generations);
  const [localTimeline, setLocalTimeline] = useState<{ stage: string; status: string; message: string }[]>([]);
  const [localStatus, setLocalStatus] = useState<{ stage: string | null; message: string | null }>({
    stage: null,
    message: null,
  });
  const latestGenerationId = useMemo(() => {
    if (localGenerations.length === 0) return null;
    return [...localGenerations].sort((a, b) => b.roundNumber - a.roundNumber)[0]?.id ?? null;
  }, [localGenerations]);

  useEffect(() => {
    setLocalGenerations(generations);
  }, [generations]);

  useEffect(() => {
    setActiveGenerationId((current) => {
      if (current && localGenerations.some((generation) => generation.id === current)) {
        return current;
      }
      return latestGenerationId;
    });
  }, [localGenerations, latestGenerationId]);

  const selectedGeneration = useMemo(() => {
    if (localGenerations.length === 0) return null;
    return (
      localGenerations.find((generation) => generation.id === activeGenerationId && generation.images.length > 0) ??
      [...localGenerations].reverse().find((generation) => generation.images.length > 0) ??
      localGenerations[localGenerations.length - 1]
    );
  }, [activeGenerationId, localGenerations]);

  const displayImages = selectedGeneration?.images.length
    ? selectedGeneration.images
    : Array.isArray(generatedImages)
      ? generatedImages.filter(Boolean)
      : [];
  const effectiveLoading = isLoading || isRegenerating;
  const effectiveError = regenerationError || error;
  const effectiveAllDone = !effectiveLoading && !effectiveError;
  const effectiveStatusMessage = isRegenerating ? localStatus.message : statusMessage;
  const effectiveStatusStage = isRegenerating ? localStatus.stage : statusStage;
  const effectiveStatusUpdates = isRegenerating ? localTimeline : statusUpdates;
  const canRegenerate = Boolean(jobId && additionalDescription.trim());

  const toggleImageSelection = (index: number) => {
    setSelectedImages(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const canCreateVideo = selectedImages.length >= 3;
  const isVideoMode = mode === "video";
  const canCancelJob = Boolean(jobId) && (effectiveLoading || isRegenerating);

  const handleDownloadImage = async (src: string, index: number) => {
    await downloadFile(src, `${productData.productName || "generated-image"}-${index + 1}.png`);
  };

  const handleDownloadAll = async () => {
    if (jobId) {
      await downloadJobImagesArchive(
        jobId,
        `${productData.brandName}_${productData.productName}`,
        selectedGeneration?.id ?? null,
      );
      return;
    }
    for (const [index, src] of displayImages.entries()) {
      await handleDownloadImage(src, index);
    }
  };

  const toGenerationSummary = (job: BackendJobResponse): JobGenerationSummary[] =>
    (job.generations ?? [])
      .map((generation) => ({
        id: generation.id,
        roundNumber: generation.round_number,
        additionalDescription: generation.additional_description ?? undefined,
        status: generation.status,
        createdAt: generation.created_at,
        images: generation.images
          .map((asset) => asset.presigned_url)
          .filter((value): value is string => Boolean(value)),
      }))
      .sort((a, b) => a.roundNumber - b.roundNumber);

  const toGeneratedImageResult = (job: BackendJobResponse): GeneratedImageResult => {
    const mappedGenerations = toGenerationSummary(job);
    const latestGeneration = [...mappedGenerations]
      .reverse()
      .find((generation) => generation.images.length > 0) ?? mappedGenerations[mappedGenerations.length - 1];
    return {
      jobId: job.job_id,
      status: job.status,
      currentStage: job.current_stage,
      generatedImages: latestGeneration?.images ?? [],
      assets: job.assets,
      generations: job.generations,
      errorMessage: job.error_message ?? null,
    };
  };

  const handleRegenerate = async () => {
    if (!jobId || !additionalDescription.trim()) return;

    setIsRegenerating(true);
    setIsCancelling(false);
    setRegenerationError(null);
    setLocalTimeline([]);
    setLocalStatus({
      stage: "stage_2",
      message: "Queueing image regeneration.",
    });

    try {
      const queuedGeneration = await regenerateJobImages(jobId, {
        additionalDescription: additionalDescription.trim(),
        imageModel: regenerationModel,
        inputImages: regenerationInputFiles,
      });
      setLocalGenerations((prev) => [
        ...prev.filter((generation) => generation.id !== queuedGeneration.id),
        queuedGeneration,
      ]);
      setActiveGenerationId(queuedGeneration.id);

      await waitForJobCompletion(jobId, (update) => {
        setLocalStatus({ stage: update.stage, message: update.message });
        setLocalTimeline((prev) => {
          const previous = prev[prev.length - 1];
          if (
            previous &&
            previous.stage === update.stage &&
            previous.status === update.status &&
            previous.message === update.message
          ) {
            return prev;
          }
          return [...prev, update];
        });
        if (update.stage === "stage_2" && update.status === "running") {
          void (async () => {
            try {
              const liveJob = await getJob(jobId);
              setLocalGenerations(toGenerationSummary(liveJob));
            } catch {
              // keep local partial state
            }
          })();
        }
      });

      const refreshedJob = await getJob(jobId);
      const refreshedResult = toGeneratedImageResult(refreshedJob);
      const refreshedGenerations = toGenerationSummary(refreshedJob);
      setLocalGenerations(refreshedGenerations);
      setActiveGenerationId(refreshedGenerations[refreshedGenerations.length - 1]?.id ?? null);
      setAdditionalDescription("");
      setRegenerationInputFiles([]);
      onResultChange?.(refreshedResult);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to regenerate images.";
      if (!message.toLowerCase().includes("cancelled")) {
        setRegenerationError(message);
      } else {
        try {
          const refreshedJob = await getJob(jobId);
          const refreshedResult = toGeneratedImageResult(refreshedJob);
          const refreshedGenerations = toGenerationSummary(refreshedJob);
          setLocalGenerations(refreshedGenerations);
          setActiveGenerationId(
            [...refreshedGenerations].reverse().find((generation) => generation.images.length > 0)?.id ??
              refreshedGenerations[refreshedGenerations.length - 1]?.id ??
              null,
          );
          onResultChange?.(refreshedResult);
        } catch {
          // keep the last known state if refresh fails
        }
        setRegenerationError(null);
        setLocalStatus({
          stage: "stage_2",
          message: "User cancelled the job.",
        });
      }
    } finally {
      setIsRegenerating(false);
      setIsCancelling(false);
    }
  };

  const handleCancel = async () => {
    if (!jobId || isCancelling) return;
    setIsCancelling(true);
    try {
      if (onCancel) {
        await onCancel();
      } else {
        await cancelJob(jobId);
      }
    } catch (error) {
      setRegenerationError(error instanceof Error ? error.message : "Unable to cancel job.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRegenerationInputImages = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const merged = [...regenerationInputFiles, ...incoming].slice(0, 3);
    setRegenerationInputFiles(merged);
  };

  const removeRegenerationInputImage = (index: number) => {
    setRegenerationInputFiles((prev) => prev.filter((_, i) => i !== index));
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
          {canCancelJob && (
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={isCancelling}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Cancel Job
            </button>
          )}
          {effectiveAllDone && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onStartOver}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> New Project
            </motion.button>
          )}
          {effectiveAllDone && onCreateVideo && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => onCreateVideo(displayImages)}
              disabled={isVideoMode && !canCreateVideo}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Film className="h-4 w-4" /> Create Video
            </motion.button>
          )}
        </div>
      </div>

      {/* Live status */}
      {!(!effectiveLoading && !effectiveError) && (
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span>{effectiveStatusMessage || "Generating A+ content images..."}</span>
          </div>
          <div className="mt-3 space-y-2">
            {effectiveStatusUpdates.length > 0 ? (
              effectiveStatusUpdates.map((update, index) => (
                <div key={`${update.stage}-${update.status}-${index}`} className="text-sm text-muted-foreground">
                  {update.message}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">{effectiveStatusStage || "queued"}</div>
            )}
          </div>
        </div>
      )}

      {effectiveError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {effectiveError}
        </div>
      )}

      {/* Selection message for video mode */}
      {!effectiveLoading && !effectiveError && isVideoMode && (
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
      {localGenerations.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {localGenerations.map((generation) => (
            <button
              key={generation.id}
              type="button"
              onClick={() => setActiveGenerationId(generation.id)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                generation.id === selectedGeneration?.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              Round {generation.roundNumber}
            </button>
          ))}
        </div>
      )}

      {effectiveAllDone && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleDownloadAll()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Download className="h-4 w-4" /> Download All
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: Math.max(displayImages.length, effectiveLoading ? 6 : displayImages.length) }).map((_, i) => {
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

      {!effectiveError && jobId && (!isLoading || isRegenerating) && (
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Generate Again</h3>
            <p className="text-sm text-muted-foreground">
              Add an extra direction for the next image set. Existing KYC and input images will be reused.
            </p>
          </div>
          <textarea
            value={additionalDescription}
            onChange={(event) => setAdditionalDescription(event.target.value.slice(0, 250))}
            maxLength={250}
            rows={4}
            placeholder="Example: make the background warmer, more premium, and suitable for luxury ecommerce."
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Input Images (optional, up to 3)</p>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-3 text-sm hover:border-primary/50 hover:bg-secondary/40 transition-colors">
              <Upload className="h-4 w-4" />
              Attach images
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => handleRegenerationInputImages(event.target.files)}
                className="hidden"
              />
            </label>
            {regenerationInputFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {regenerationInputFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
                    <span className="truncate pr-2">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeRegenerationInputImage(index)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Image Generation Model</p>
            <select
              value={regenerationModel}
              onChange={(event) => setRegenerationModel(event.target.value as "reve" | "gpt-image-1")}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            >
              <option value="reve">reve</option>
              <option value="gpt-image-1">gpt-image-1</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{additionalDescription.length}/250</span>
            <div className="flex items-center gap-2">
              {isRegenerating && (
                <button
                  type="button"
                  onClick={() => void handleCancel()}
                  disabled={isCancelling}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Cancel
                </button>
              )}
              <button
                type="button"
                disabled={!canRegenerate || isRegenerating}
                onClick={() => void handleRegenerate()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Generate Again
              </button>
            </div>
          </div>
        </div>
      )}

      {effectiveAllDone && displayImages.length === 0 && !effectiveError && (
        <div className="rounded-xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">
          No generated images were returned by the backend.
        </div>
      )}

      {/* Summary footer */}
      {effectiveAllDone && (
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
        <ImageLightbox src={previewImage} onClose={() => setPreviewImage(null)} />
      )}
    </motion.div>
  );
};

export default GenerationResults;
