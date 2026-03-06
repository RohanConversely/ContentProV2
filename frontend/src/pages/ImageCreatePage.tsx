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
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { mockGeneratedImages } from "@/lib/mock_data";
import type { GeneratedImage } from "@/lib/types";

type Step = "product-details" | "generate" | "results";

interface ProductDetails {
  brandName: string;
  brandWebsite: string;
  productName: string;
  productCategory: string;
  productImage: File | null;
  socialLink1: string;
  socialLink2: string;
}

const ImageCreatePage = () => {
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

  const canProceed = () => {
    if (step === "product-details") {
      return (
        productDetails.brandName.trim().length > 0 &&
        productDetails.brandWebsite.trim().length > 0 &&
        productDetails.productName.trim().length > 0 &&
        productDetails.productCategory.trim().length > 0
      );
    }
    return true;
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setGeneratedImages(mockGeneratedImages.map((img) => ({ ...img, selected: false })));
      setIsGenerating(false);
      setStep("results");
    }, 2000);
  };

  const toggleImageSelection = (id: string) => {
    setGeneratedImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, selected: !img.selected } : img))
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

  const stepIndex = step === "product-details" ? 0 : step === "generate" ? 1 : 2;

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
              Generate Images
            </h1>
            <p className="text-muted-foreground text-sm">
              Create Amazon A+ ready product images
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {["Product Details", "Generate", "Results"].map((label, i) => (
            <div key={label} className="flex items-center flex-1">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  i <= stepIndex
                    ? "bg-primary/10 border border-primary/40 text-primary"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    i < stepIndex
                      ? "bg-primary text-primary-foreground"
                      : i === stepIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary"
                  }`}
                >
                  {i < stepIndex ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className="text-sm hidden sm:inline">{label}</span>
              </div>
              {i < 2 && <div className={`h-px flex-1 mx-2 ${i < stepIndex ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
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

                {/* Required Fields */}
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

                  {/* Product Image Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Product Image</label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="product-image"
                      />
                      <label htmlFor="product-image" className="cursor-pointer">
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

                  {/* Optional Social Links */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-3">Social Links (Optional)</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <input
                        type="url"
                        value={productDetails.socialLink1}
                        onChange={(e) =>
                          setProductDetails((prev) => ({ ...prev, socialLink1: e.target.value }))
                        }
                        placeholder="Social Link 1"
                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <input
                        type="url"
                        value={productDetails.socialLink2}
                        onChange={(e) =>
                          setProductDetails((prev) => ({ ...prev, socialLink2: e.target.value }))
                        }
                        placeholder="Social Link 2"
                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
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
                  Review & Generate
                </h2>

                {/* Summary */}
                <div className="bg-secondary/50 rounded-xl p-4 mb-6 text-left">
                  <h3 className="text-sm font-medium mb-2">Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Brand:</span> {productDetails.brandName}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Product:</span> {productDetails.productName}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category:</span> {productDetails.productCategory}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Website:</span> {productDetails.brandWebsite}
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
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

                <button
                  onClick={() => setStep("product-details")}
                  className="mt-4 text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to Edit Details
                </button>
              </div>
            </motion.div>
          )}

          {step === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    Generated Images
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {generatedImages.length} images ready for download
                  </p>
                </div>
              </div>

              {/* Images Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {generatedImages.map((img) => (
                  <div
                    key={img.id}
                    className="group relative aspect-square rounded-xl border border-border overflow-hidden bg-secondary"
                  >
                    <img
                      src={img.url}
                      alt={`Generated ${img.id}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                        <Download className="h-5 w-5 text-white" />
                      </button>
                      <button
                        onClick={() => toggleImageSelection(img.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          img.selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/20 hover:bg-white/30 text-white"
                        }`}
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    </div>
                    {img.selected && (
                      <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep("product-details")}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Create More
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => navigate("/create/video")}>
                    <Video className="h-4 w-4 mr-2" />
                    Continue to Video
                  </Button>
                  <Button className="bg-gradient-primary">
                    <Download className="h-4 w-4 mr-2" />
                    Download All
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

export default ImageCreatePage;
