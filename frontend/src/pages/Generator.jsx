import { useState } from 'react';
import UploadBox from '../components/UploadBox.jsx';
import { generateVariant } from '@ai-services/imageService.js';

export default function Generator() {
  const VARIANTS = ['white_background', 'professional', 'with_model', 'with_box'];
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [category, setCategory] = useState('general');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults] = useState([]);
  const [finalizedVariants, setFinalizedVariants] = useState({});
  const [finalizingVariants, setFinalizingVariants] = useState(new Set());
  const [rerollingVariants, setRerollingVariants] = useState({});
  const [finalizeErrors, setFinalizeErrors] = useState({});
  const [mode, setMode] = useState('create');
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [platform, setPlatform] = useState('');
  const [size, setSize] = useState('');
  const [description, setDescription] = useState('');

  function toggleTemplate(index) {
    setSelectedTemplates((current) => {
      if (current.includes(index)) {
        return current.filter((i) => i !== index);
      }
      if (current.length >= 2) {
        return current;
      }
      return [...current, index];
    });
  }

  async function handleGenerate() {
    if (!uploadedImageUrl) {
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    setResults([]);
    setFinalizedVariants({});
    setFinalizingVariants(new Set());
    setRerollingVariants({});
    setFinalizeErrors({});

    try {
      const settled = await Promise.all(
        VARIANTS.map((v) => generateVariant(v, uploadedImageUrl, category))
      );
      setResults(settled);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleFinalize(variant) {
    setFinalizeErrors((current) => {
      const next = { ...current };
      delete next[variant];
      return next;
    });
    setFinalizingVariants((current) => new Set(current).add(variant));

    try {
      const result = await generateVariant(variant, uploadedImageUrl, category, { finalPass: true });

      if (!result.success) {
        throw new Error(result.error || 'Failed to finalize variant');
      }

      setFinalizedVariants((current) => ({
        ...current,
        [variant]: {
          outputUrl: result.outputUrl,
          metadata: result.metadata,
        },
      }));
    } catch (error) {
      setFinalizeErrors((current) => ({
        ...current,
        [variant]: error.message,
      }));
    } finally {
      setFinalizingVariants((current) => {
        const next = new Set(current);
        next.delete(variant);
        return next;
      });
    }
  }

  async function handleReroll(variant) {
    setFinalizeErrors((current) => {
      const next = { ...current };
      delete next[variant];
      return next;
    });
    setFinalizedVariants((current) => {
      const next = { ...current };
      delete next[variant];
      return next;
    });
    setRerollingVariants((current) => ({ ...current, [variant]: true }));

    try {
      const result = await generateVariant(variant, uploadedImageUrl, category, { finalPass: false });

      if (!result.success) {
        throw new Error(result.error || 'Failed to re-roll variant');
      }

      setResults((current) =>
        current.map((item) => (item.variant === variant ? result : item))
      );
    } catch (error) {
      setFinalizeErrors((current) => ({
        ...current,
        [variant]: error.message,
      }));
    } finally {
      setRerollingVariants((current) => {
        const next = { ...current };
        delete next[variant];
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050814] via-[#071a2f] to-[#050814] text-white">
      {/* Top Nav Bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 lg:px-12">
        {/* LEFT: Logo */}
        <div className="text-lg font-semibold">ContentPro</div>

        {/* CENTER: Toggle */}
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setMode('create')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              mode === 'create'
                ? 'bg-[#9db8ff] text-black'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Create
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              mode === 'batch'
                ? 'bg-[#9db8ff] text-black'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Batch Run
          </button>
        </div>

        {/* RIGHT: Credits */}
        <div className="text-sm text-white/70">
          Credits: <span className="font-medium text-white">24</span>
        </div>
      </div>

      {/* Header Text */}
      <div className="mx-auto mt-12 max-w-3xl px-6 lg:px-12">
        <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.02em] lg:text-5xl">
          Generate A+ Images
        </h1>
        <p className="mt-4 text-lg text-white/60">
          Enter your product details to get started
        </p>
      </div>

      {/* Form Container */}
      <div className="mx-auto mt-12 max-w-3xl space-y-10 px-6 lg:px-12">
        {/* Brand Details Section */}
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Brand Details</p>
            <h3 className="mt-2 text-lg font-semibold">Tell us about your brand</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Brand Name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#9db8ff]"
            />
            <input
              type="text"
              placeholder="Brand Website"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#9db8ff]"
            />
          </div>
        </div>

        {/* Product Details Section */}
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Product Details</p>
            <h3 className="mt-2 text-lg font-semibold">Describe your product</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Product Name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#9db8ff]"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#9db8ff] [&>option]:bg-[#071a2f] [&>option]:text-white"
            >
              <option value="">Select Industry</option>
              <option value="apparel">Apparel</option>
              <option value="bags">Bags and Accessories</option>
              <option value="cosmetics">Cosmetics</option>
              <option value="food">Food and Beverages</option>
              <option value="footwear">Footwear</option>
              <option value="handicraft">Handicraft and Export Item</option>
              <option value="home">Home Furnishing</option>
              <option value="jewelry">Jewellery</option>
            </select>
          </div>
        </div>

        {/* Generate KYC Button */}
        <div className="pt-4">
          <button className="w-full rounded-xl bg-[#9db8ff] py-3 font-semibold text-black transition hover:bg-white">
            Generate KYC
          </button>
        </div>

        {/* Template Library Section */}
        <div className="space-y-4 pt-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Template Library</p>
            <h3 className="mt-2 text-lg font-semibold">Choose up to 2 styles</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {[...Array(6)].map((_, i) => {
              const isSelected = selectedTemplates.includes(i);
              return (
                <div
                  key={i}
                  onClick={() => toggleTemplate(i)}
                  className={`group relative cursor-pointer overflow-hidden rounded-xl border ${
                    isSelected ? 'border-[#9db8ff]' : 'border-white/10'
                  }`}
                >
                  <img
                    src={`https://source.unsplash.com/400x400/?product,studio,${i}`}
                    alt={`Template ${i + 1}`}
                    className="h-40 w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition group-hover:opacity-100" />
                  <div
                    className={`absolute right-2 top-2 h-5 w-5 rounded-full border ${
                      isSelected
                        ? 'border-[#9db8ff] bg-[#9db8ff]'
                        : 'border-white bg-black/50'
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="h-full w-full text-black"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Product Dimensions Section */}
        <div className="space-y-4 pt-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Product Dimensions (Optional)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <select className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#9db8ff] [&>option]:bg-[#071a2f] [&>option]:text-white">
              <option>Centimeters (cm)</option>
              <option>Inches (in)</option>
              <option>Meters (m)</option>
            </select>
            <input
              type="number"
              placeholder="Length"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#9db8ff]"
            />
            <input
              type="number"
              placeholder="Breadth"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#9db8ff]"
            />
            <input
              type="number"
              placeholder="Height"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#9db8ff]"
            />
          </div>
        </div>

        {/* Upload Product Image Section */}
        <div className="space-y-4 pt-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Upload Product Image</p>
          </div>
          <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-white/60">
              Drop up to 5 product images here or click to browse
            </p>
            <p className="mt-2 text-xs text-white/40">
              Supports JPG, PNG, WEBP up to 20MB each
            </p>
          </div>
        </div>

        {/* Short Description Section */}
        <div className="space-y-4 pt-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Short Product Description (Optional)
            </p>
          </div>
          <textarea
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your product..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#9db8ff]"
          />
        </div>

        {/* Output Settings Section */}
        <div className="space-y-4 pt-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Output Settings</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#9db8ff] [&>option]:bg-[#071a2f] [&>option]:text-white"
            >
              <option value="">Select Platform</option>
              <option value="amazon">Amazon</option>
              <option value="instagram">Instagram</option>
              <option value="shopify">Shopify</option>
            </select>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#9db8ff] [&>option]:bg-[#071a2f] [&>option]:text-white"
            >
              <option value="">Select Size</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="4:5">4:5 (Portrait)</option>
              <option value="16:9">16:9 (Landscape)</option>
            </select>
          </div>
        </div>

        {/* Upload Section (Old - keeping for backward compatibility) */}
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Product Image</p>
            <h3 className="mt-2 text-lg font-semibold">Upload your product photo</h3>
          </div>
          <UploadBox onUploadComplete={setUploadedImageUrl} />
          {uploadedImageUrl && (
            <p className="break-all text-sm text-white/40">{uploadedImageUrl}</p>
          )}
        </div>

        {/* Error Message */}
        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!uploadedImageUrl || isGenerating}
          className="w-full rounded-xl bg-[#9db8ff] px-6 py-3.5 text-sm font-semibold text-black transition-all hover:bg-[#8da7ef] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
        >
          {isGenerating ? 'Generating...' : 'Generate Images'}
        </button>
      </div>

      {/* Results Section */}
      {/* Results Section */}
      {results.length > 0 && (
        <div className="mx-auto mt-16 max-w-6xl space-y-8 px-6 pb-16 lg:px-12">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Generated Images</p>
            <h3 className="mt-2 text-lg font-semibold">Your product variations</h3>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {results.map((result) => {
              const finalizedResult = finalizedVariants[result.variant];
              const isFinalizing = finalizingVariants.has(result.variant);
              const isRerolling = Boolean(rerollingVariants[result.variant]);
              const cardError = finalizeErrors[result.variant];
              const outputUrl = finalizedResult?.outputUrl || result.outputUrl;

              return (
                <div key={result.variant} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium capitalize text-white">
                      {result.variant.replace(/_/g, ' ')}
                    </p>
                    {finalizedResult && (
                      <span className="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
                        ✓ Finalized
                      </span>
                    )}
                  </div>
                  {result.success ? (
                    <>
                      <div className="relative">
                        <img
                          src={outputUrl}
                          alt={result.variant}
                          className="aspect-square w-full rounded-lg object-cover"
                        />
                        {(isFinalizing || isRerolling) && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/70 text-sm font-medium text-white">
                            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            <span>{isFinalizing ? 'Finalizing...' : 'Re-rolling...'}</span>
                          </div>
                        )}
                      </div>
                      {cardError && <p className="text-sm text-red-400">{cardError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleReroll(result.variant)}
                          disabled={isRerolling || isFinalizing}
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-white/30"
                        >
                          Re-roll
                        </button>
                        {!finalizedResult && (
                          <button
                            type="button"
                            onClick={() => handleFinalize(result.variant)}
                            disabled={isFinalizing || isRerolling}
                            className="flex-1 rounded-lg bg-[#9db8ff] px-4 py-2 text-sm font-medium text-black transition-all hover:bg-[#8da7ef] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
                          >
                            Finalize
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-red-400">{result.error}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
