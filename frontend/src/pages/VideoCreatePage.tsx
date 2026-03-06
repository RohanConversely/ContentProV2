import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Building2,
  Globe,
  Tags,
  Sparkles,
  Check,
  Download,
  Video,
  RefreshCw,
  Image as ImageIcon,
  Music,
  Play,
  Volume2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { mockGeneratedImages, mockAudioOptions } from "@/lib/mock_data";
import type { GeneratedImage, AudioOption } from "@/lib/types";

type Step = "product-details" | "generate" | "select-images" | "generate-video" | "results";

interface ProductDetails {
  brandName: string;
  brandWebsite: string;
  productName: string;
  productCategory: string;
  productImage: File | null;
  socialLink1: string;
  socialLink2: string;
}

const VideoCreatePage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("product-details");
  const [productDetails, setProductDetails] = useState<ProductDetails>({
    brandName: "",
    brandWebsite: "",
    productName: "",
    productCategory: "",
    productImage: null,
    socialLink1: "",
    socialLink2: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string>("no-audio");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const stepOrder: Step[] = ["product-details", "generate", "select-images", "generate-video", "results"];
  const stepIndex = stepOrder.indexOf(step);

  const canProceed = () => {
    if (step === "product-details") {
      return (
        productDetails.brandName.trim().length > 0 &&
        productDetails.brandWebsite.trim().length > 0 &&
        productDetails.productName.trim().length > 0 &&
        productDetails.productCategory.trim().length > 0
      );
    }
    if (step === "select-images") {
      return selectedImages.length >= 3;
    }
    return true;
  };

  const handleGenerateImages = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedImages(mockGeneratedImages.map((img) => ({ ...img, selected: true })));
      setSelectedImages(mockGeneratedImages.slice(0, 3).map((img) => img.id));
      setIsGenerating(false);
      setStep("select-images");
    }, 2000);
  };

  const handleGenerateVideo = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setVideoUrl("https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4");
      setIsGenerating(false);
      setStep("results");
    }, 3000);
  };

  const toggleImageSelection = (id: string) => {
    setSelectedImages((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProductDetails((prev) => ({
        ...prev,
        productImage: e.target.files![0],
      }));
    }
  };

  const steps = ["Product Details", "Generate Images", "Select Images", "Generate Video", "Results"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/create")}
            className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              Generate Video
            </h1>
            <p className="text-muted-foreground text-sm">
              Create engaging video content from your product images
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                  i <= stepIndex
                    ? "bg-primary/10 border border-primary/40 text-primary"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium ${
                    i < stepIndex
                      ? "bg-primary text-primary-foreground"
                      : i === stepIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary"
                  }`}
                >
                  {i < stepIndex ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className="text-xs hidden sm:inline">{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-px w-4 mx-1 ${i < stepIndex ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Product Details */}
          {step === "product-details" && (
            <motion.div
              key="product-details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
                <div>
                  <h2 className="font-display text-xl font-semibold mb-1">
                    Product Details
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your product and brand information
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        Brand Name *
                      </label>
                      <input
                        type="text"
                        value={productDetails.brandName}
                        onChange={(e) =>
                          setProductDetails((prev) => ({ ...prev, brandName: e.target.value }))
                        }
                        placeholder="e.g., Tatsya"
                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        Brand Website *
                      </label>
                      <input
                        type="url"
                        value={productDetails.brandWebsite}
                        onChange={(e) =>
                          setProductDetails((prev) => ({ ...prev, brandWebsite: e.target.value }))
                        }
                        placeholder="https://example.com"
                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Tags className="h-4 w-4 text-primary" />
                        Product Name *
                      </label>
                      <input
                        type="text"
                        value={productDetails.productName}
                        onChange={(e) =>
                          setProductDetails((prev) => ({ ...prev, productName: e.target.value }))
                        }
                        placeholder="e.g., Jewelry Stand"
                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Tags className="h-4 w-4 text-primary" />
                        Product Category *
                      </label>
                      <input
                        type="text"
                        value={productDetails.productCategory}
                        onChange={(e) =>
                          setProductDetails((prev) => ({ ...prev, productCategory: e.target.value }))
                        }
                        placeholder="e.g., Home Decor"
                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Product Image</label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="product-image-video"
                      />
                      <label htmlFor="product-image-video" className="cursor-pointer">
                        {productDetails.productImage ? (
                          <p className="text-sm font-medium">{productDetails.productImage.name}</p>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload product image
                            </p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => setStep("generate")}
                    disabled={!canProceed()}
                    className="bg-gradient-primary"
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Generate Images */}
          {step === "generate" && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <h2 className="font-display text-xl font-semibold mb-4">
                  Generate Images First
                </h2>
                <p className="text-muted-foreground mb-6">
                  We need to generate images before creating your video
                </p>

                <Button
                  onClick={handleGenerateImages}
                  disabled={isGenerating}
                  size="lg"
                  className="bg-gradient-primary"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Generating Images...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Images
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Select Images */}
          {step === "select-images" && (
            <motion.div
              key="select-images"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6">
                <h2 className="font-display text-xl font-semibold">
                  Select Images for Video
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select at least 3 images (selected: {selectedImages.length}/6)
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {generatedImages.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => toggleImageSelection(img.id)}
                    className={`group relative aspect-square rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                      selectedImages.includes(img.id)
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={`Generated ${img.id}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {selectedImages.includes(img.id) && (
                      <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("generate")}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep("generate-video")}
                  disabled={!canProceed()}
                  className="bg-gradient-primary"
                >
                  Generate Video <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Generate Video */}
          {step === "generate-video" && (
            <motion.div
              key="generate-video"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <h2 className="font-display text-xl font-semibold mb-4">
                  Creating Your Video
                </h2>
                <p className="text-muted-foreground mb-6">
                  Using {selectedImages.length} images to create your video
                </p>

                {/* Audio Selection */}
                <div className="mb-6 text-left">
                  <label className="text-sm font-medium flex items-center gap-2 mb-3">
                    <Music className="h-4 w-4" />
                    Background Music (Optional)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {mockAudioOptions.map((audio) => (
                      <button
                        key={audio.id}
                        onClick={() => setSelectedAudio(audio.id)}
                        className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                          selectedAudio === audio.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {audio.name}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleGenerateVideo}
                  disabled={isGenerating}
                  size="lg"
                  className="bg-gradient-primary"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Creating Video...
                    </>
                  ) : (
                    <>
                      <Video className="h-5 w-5 mr-2" />
                      Create Video
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Results */}
          {step === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6">
                <h2 className="font-display text-xl font-semibold">
                  Your Video is Ready!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Preview and download your generated video
                </p>
              </div>

              {/* Video Player */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
                <div className="aspect-video bg-black flex items-center justify-center">
                  <video
                    src={videoUrl || ""}
                    controls
                    className="w-full h-full"
                    poster={generatedImages[0]?.url}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{productDetails.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedImages.length} images • {mockAudioOptions.find(a => a.id === selectedAudio)?.name || "No Audio"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => navigate("/create")}>
                  Create New
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => navigate("/projects")}>
                    View in Projects
                  </Button>
                  <Button className="bg-gradient-primary">
                    <Download className="h-4 w-4 mr-2" />
                    Download Video
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VideoCreatePage;
