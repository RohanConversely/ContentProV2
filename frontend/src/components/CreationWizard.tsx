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
} from "lucide-react";
import GenerationResults from "./GenerationResults";
import VideoCreation from "./VideoCreation";

export interface ProductFormData {
  brandName: string;
  brandWebsite: string;
  productName: string;
  productCategory: string;
  socialLink1: string;
  socialLink2: string;
  productImages: string[];
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
  socialLink1: "",
  socialLink2: "",
  productImages: [],
};

const CreationWizard = ({ mode, onBack }: CreationWizardProps) => {
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showVideoCreation, setShowVideoCreation] = useState(false);

  const updateField = (field: keyof ProductFormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = useCallback((files: FileList) => {
    const newImages: string[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            newImages.push(ev.target.result as string);
            if (newImages.length === files.length || newImages.length === Array.from(files).filter(f => f.type.startsWith("image/")).length) {
              updateField("productImages", [...formData.productImages, ...newImages]);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }, [formData.productImages]);

  const removeImage = (index: number) => {
    updateField(
      "productImages",
      formData.productImages.filter((_, i) => i !== index)
    );
  };

  const canGenerate =
    formData.brandName.trim().length > 0 &&
    formData.brandWebsite.trim().length > 0 &&
    formData.productName.trim().length > 0 &&
    formData.productCategory.trim().length > 0 &&
    formData.productImages.length > 0;

  const handleGenerate = () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowResults(true);
    }, 2000);
  };

  if (showVideoCreation) {
    return (
      <VideoCreation
        productData={formData}
        images={formData.productImages}
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

      {/* Form */}
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
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-all duration-300 cursor-pointer hover:border-primary/40 hover:bg-secondary/50 border-border">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Drop your product image here or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">Supports JPG, PNG, WEBP up to 20MB</p>
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
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  className="hidden"
                />
                <Upload className="h-6 w-6 text-muted-foreground" />
              </label>
            </div>
          )}
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Social Media Links <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Social Link 1</label>
              <input
                type="url"
                value={formData.socialLink1}
                onChange={(e) => updateField("socialLink1", e.target.value)}
                placeholder="https://instagram.com/brand"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Social Link 2</label>
              <input
                type="url"
                value={formData.socialLink2}
                onChange={(e) => updateField("socialLink2", e.target.value)}
                placeholder="https://facebook.com/brand"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end pt-4 border-t border-border">
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
              <Wand2 className="h-4 w-4" /> Generate {mode === "images" ? "Images" : "Video"}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default CreationWizard;
