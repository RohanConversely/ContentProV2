import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Wand2,
  Sparkles,
  Building2,
  Globe,
  Package,
  Tag,
  Link2,
  Upload,
  X,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Ruler,
  AlignLeft,
} from "lucide-react";
import GenerationResults from "./GenerationResults";
import VideoCreation from "./VideoCreation";
import {
  createJob,
  getJob,
  uploadJobAsset,
  waitForJobCompletion,
  type GeneratedImageResult,
  type JobEventPayload,
} from "@/lib/api";

export interface ProductFormData {
  brandName: string;
  brandWebsite: string;
  productName: string;
  productCategory: string;
  socialLinkInstagram: string;
  socialLinkFacebook: string;
  socialLinkLinkedin: string;
  socialLinkX: string;
  dimensionUnit: string;
  dimensionLength: string;
  dimensionBreadth: string;
  dimensionHeight: string;
  productDescription: string;
  productImages: string[];
  additionalInfo?: Record<string, string>;
}

interface CreationWizardProps {
  mode: string;
  onBack: () => void;
}

const emptyFormData: ProductFormData = {
  brandName: "",
  brandWebsite: "",
  productName: "",
  productCategory: "",
  socialLinkInstagram: "",
  socialLinkFacebook: "",
  socialLinkLinkedin: "",
  socialLinkX: "",
  dimensionUnit: "cm",
  dimensionLength: "",
  dimensionBreadth: "",
  dimensionHeight: "",
  productDescription: "",
  productImages: [],
};

const dimensionUnits = [
  { value: "mm", label: "Millimeters (mm)" },
  { value: "cm", label: "Centimeters (cm)" },
  { value: "inches", label: "Inches (in)" },
  { value: "feet", label: "Feet (ft)" },
];

const CreationWizard = ({ mode, onBack }: CreationWizardProps) => {
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showVideoCreation, setShowVideoCreation] = useState(false);
  const [generationResult, setGenerationResult] = useState<GeneratedImageResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobUpdate, setJobUpdate] = useState<JobEventPayload | null>(null);
  const [jobTimeline, setJobTimeline] = useState<JobEventPayload[]>([]);

  const updateField = (field: keyof ProductFormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const hasAnyDimension =
    formData.dimensionLength || formData.dimensionBreadth || formData.dimensionHeight;

  const hasAllDimensions =
    formData.dimensionLength && formData.dimensionBreadth && formData.dimensionHeight;

  const handleImageUpload = useCallback((files: FileList) => {
    const remainingSlots = Math.max(0, 4 - uploadedFiles.length);
    const acceptedFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remainingSlots);
    if (acceptedFiles.length === 0) return;
    const newImages: string[] = [];
    acceptedFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            newImages.push(ev.target.result as string);
            if (newImages.length === acceptedFiles.length) {
              updateField("productImages", [...formData.productImages, ...newImages]);
              setUploadedFiles((prev) => [...prev, ...acceptedFiles]);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }, [formData.productImages, uploadedFiles.length]);

  const removeImage = (index: number) => {
    updateField(
      "productImages",
      formData.productImages.filter((_, i) => i !== index)
    );
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const canGenerate =
    formData.brandName.trim().length > 0 &&
    formData.brandWebsite.trim().length > 0 &&
    formData.productName.trim().length > 0 &&
    formData.productCategory.trim().length > 0 &&
    formData.productImages.length > 0 &&
    (!hasAnyDimension || hasAllDimensions);

  const buildAdditionalInfo = () => {
    const additionalInfo: Record<string, string> = {};
    if (formData.productDescription.trim()) additionalInfo.product_description = formData.productDescription.trim();
    if (formData.dimensionLength && formData.dimensionBreadth && formData.dimensionHeight) {
      additionalInfo.dimensions = `${formData.dimensionLength} x ${formData.dimensionBreadth} x ${formData.dimensionHeight} ${formData.dimensionUnit}`;
    }
    return Object.keys(additionalInfo).length > 0 ? additionalInfo : undefined;
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setShowResults(true);
    setGenerationError(null);
    setGenerationResult(null);
    setJobId(null);
    setJobTimeline([]);
    setJobUpdate({
      stage: "queued",
      status: "running",
      message: "Creating your image job.",
    });
    try {
      const imagesToUpload = uploadedFiles.slice(0, 4);
      if (imagesToUpload.length === 0) {
        throw new Error("Please upload at least one product image.");
      }

      const additionalInfo = buildAdditionalInfo();
      setFormData((prev) => ({ ...prev, additionalInfo }));

      const job = await createJob({
        brandName: formData.brandName,
        brandWebsite: formData.brandWebsite,
        productName: formData.productName,
        productCategory: formData.productCategory,
        socialLink1: formData.socialLinkInstagram || undefined,
        socialLink2: formData.socialLinkFacebook || undefined,
        socialLink3: formData.socialLinkLinkedin || undefined,
        socialLink4: formData.socialLinkX || undefined,
        additionalInput: additionalInfo,
      });
      setJobId(job.job_id);
      setJobUpdate({
        stage: "queued",
        status: "running",
        message: "Uploading the source image.",
      });

      const completionPromise = waitForJobCompletion(job.job_id, (update) => {
        setJobUpdate(update);
        setJobTimeline((prev) => {
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
              const liveJob = await getJob(job.job_id);
              const generatedImages = liveJob.assets
                .filter((asset) => asset.asset_type === "generated_image" && !asset.is_deleted)
                .map((asset) => asset.presigned_url)
                .filter((value): value is string => Boolean(value));
              setGenerationResult((prev) => ({
                jobId: liveJob.job_id,
                status: liveJob.status,
                currentStage: liveJob.current_stage,
                generatedImages,
                assets: liveJob.assets,
                errorMessage: liveJob.error_message ?? null,
              }));
            } catch {
              // Keep the current partial state if the live refresh fails.
            }
          })();
        }
      });

      await uploadJobAsset(job.job_id, imagesToUpload);

      const result = await completionPromise;
      setGenerationResult(result);
      setJobUpdate({
        stage: result.currentStage || "stage_2",
        status: result.status,
        message: "Generated images are ready.",
      });
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Image generation failed.");
      setJobUpdate({
        stage: "pipeline",
        status: "failed",
        message: error instanceof Error ? error.message : "Image generation failed.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (showVideoCreation) {
    return (
      <VideoCreation
        productData={formData}
        images={generationResult?.generatedImages ?? formData.productImages}
        onBack={() => setShowVideoCreation(false)}
        onStartOver={onBack}
      />
    );
  }

  if (showResults) {
    return (
      <GenerationResults
        productData={formData}
        mode={mode}
        generatedImages={generationResult?.generatedImages ?? []}
        jobId={generationResult?.jobId ?? jobId}
        isLoading={isGenerating}
        error={generationError}
        statusStage={jobUpdate?.stage ?? null}
        statusMessage={jobUpdate?.message ?? null}
        statusUpdates={jobTimeline}
        onBack={() => setShowResults(false)}
        onStartOver={onBack}
        onCreateVideo={
          mode === "video"
            ? () => {
                setShowResults(false);
                setShowVideoCreation(true);
              }
            : undefined
        }
      />
    );
  }

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
            {mode === "images" ? "Generate A+ Images" : "Generate a Video"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Enter your product details to get started
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Brand Details */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Brand Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Brand Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => updateField("brandName", e.target.value)}
                placeholder="e.g., Tatsya"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Brand Website <span className="text-destructive">*</span>
              </label>
              <input
                type="url"
                value={formData.brandWebsite}
                onChange={(e) => updateField("brandWebsite", e.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Product Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Product Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => updateField("productName", e.target.value)}
                placeholder="e.g., Marble Jewelry Stand"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Product Category <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.productCategory}
                onChange={(e) => updateField("productCategory", e.target.value)}
                placeholder="e.g., Home & Kitchen > Decor"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Product Dimensions */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Ruler className="h-5 w-5 text-primary" />
            Product Dimensions <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit</label>
              <select
                value={formData.dimensionUnit}
                onChange={(e) => updateField("dimensionUnit", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              >
                {dimensionUnits.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Length</label>
              <input
                type="number"
                value={formData.dimensionLength}
                onChange={(e) => updateField("dimensionLength", e.target.value)}
                placeholder="0"
                min="0"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Breadth</label>
              <input
                type="number"
                value={formData.dimensionBreadth}
                onChange={(e) => updateField("dimensionBreadth", e.target.value)}
                placeholder="0"
                min="0"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Height</label>
              <input
                type="number"
                value={formData.dimensionHeight}
                onChange={(e) => updateField("dimensionHeight", e.target.value)}
                placeholder="0"
                min="0"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
          </div>
          {hasAnyDimension && !hasAllDimensions && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <X className="h-4 w-4" />
              Please provide all three dimensions (length, breadth, height)
            </p>
          )}
        </div>

        {/* Product Image Upload */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Product Image <span className="text-destructive">*</span>
          </h3>
          
          {formData.productImages.length === 0 ? (
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-all duration-300 cursor-pointer hover:border-primary/40 hover:bg-secondary/50 border-border">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Drop up to 4 product images here or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">Supports JPG, PNG, WEBP up to 20MB each</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {formData.productImages.map((src, i) => (
                <div
                  key={i}
                  className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-card"
                >
                  <img
                    src={src}
                    alt={`Product ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <label className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  className="hidden"
                />
                <Upload className="h-6 w-6 text-muted-foreground" />
              </label>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{formData.productImages.length}/4 images selected</p>
        </div>

        {/* Short Product Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <AlignLeft className="h-4 w-4 text-muted-foreground" />
            Short Product Description <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <textarea
            value={formData.productDescription}
            onChange={(e) => {
              if (e.target.value.length <= 250) {
                updateField("productDescription", e.target.value);
              }
            }}
            placeholder="Enter a brief description of your product..."
            rows={3}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">
            {formData.productDescription.length}/250 characters
          </p>
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Social Media Links <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Instagram className="h-4 w-4 text-muted-foreground" />
                Instagram
              </label>
              <input
                type="url"
                value={formData.socialLinkInstagram}
                onChange={(e) => updateField("socialLinkInstagram", e.target.value)}
                placeholder="https://instagram.com/brand"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Facebook className="h-4 w-4 text-muted-foreground" />
                Facebook
              </label>
              <input
                type="url"
                value={formData.socialLinkFacebook}
                onChange={(e) => updateField("socialLinkFacebook", e.target.value)}
                placeholder="https://facebook.com/brand"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-muted-foreground" />
                LinkedIn
              </label>
              <input
                type="url"
                value={formData.socialLinkLinkedin}
                onChange={(e) => updateField("socialLinkLinkedin", e.target.value)}
                placeholder="https://linkedin.com/company/brand"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Twitter className="h-4 w-4 text-muted-foreground" />
                X (Twitter)
              </label>
              <input
                type="url"
                value={formData.socialLinkX}
                onChange={(e) => updateField("socialLinkX", e.target.value)}
                placeholder="https://x.com/brand"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

        {/* Generate Button */}
      <div className="flex justify-end pt-4 border-t border-border">
        {generationError && (
          <p className="mr-auto text-sm text-destructive self-center">{generationError}</p>
        )}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
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
      </div>
    </motion.div>
  );
};

export default CreationWizard;
