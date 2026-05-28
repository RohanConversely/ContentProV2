import { useState } from 'react';
import ContentProHero from '../components/ContentProHero.jsx';
import HowItWorks from '../components/HowItWorks.jsx';
import ServicesMarquee from '../components/ServicesMarquee.jsx';
import UploadBox from '../components/UploadBox.jsx';
import { Pricing } from '../components/ui/single-pricing-card-1.jsx';
import { generateVariant } from '../services/imageService.js';

export default function Home() {
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
    <>
      <ContentProHero />
      <ServicesMarquee />
      <HowItWorks />
      <div className="bg-black">
        <Pricing />
      </div>
      <main
        id="generator"
        className="mx-auto flex min-h-screen max-w-3xl scroll-mt-6 flex-col justify-center gap-6 px-6 py-12"
      >
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">ContentProV2</h1>
          <p className="mt-2 text-slate-600">Upload a product image to start generating variations.</p>
        </div>
        <UploadBox onUploadComplete={setUploadedImageUrl} />
        {uploadedImageUrl && (
          <p className="break-all text-sm text-slate-600">{uploadedImageUrl}</p>
        )}
        <label className="block">
          <span className="block text-sm font-medium text-slate-900">Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-2 w-fit rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="jewelry">Jewelry</option>
            <option value="clothing">Clothing</option>
            <option value="general">General</option>
          </select>
        </label>
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!uploadedImageUrl || isGenerating}
          className="w-fit rounded-md bg-slate-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
        {results.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {results.map((result) => {
              const finalizedResult = finalizedVariants[result.variant];
              const isFinalizing = finalizingVariants.has(result.variant);
              const isRerolling = Boolean(rerollingVariants[result.variant]);
              const cardError = finalizeErrors[result.variant];
              const outputUrl = finalizedResult?.outputUrl || result.outputUrl;

              return (
                <div key={result.variant} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{result.variant}</p>
                    {finalizedResult && (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
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
                          className="aspect-square w-full rounded-md object-cover"
                        />
                        {(isFinalizing || isRerolling) && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-md bg-slate-950/60 text-sm font-medium text-white">
                            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            <span>{isFinalizing ? 'Finalizing...' : 'Re-rolling...'}</span>
                          </div>
                        )}
                      </div>
                      {cardError && <p className="text-sm text-red-600">{cardError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleReroll(result.variant)}
                          disabled={isRerolling || isFinalizing}
                          className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          🔄 Re-roll
                        </button>
                        {!finalizedResult && (
                          <button
                            type="button"
                            onClick={() => handleFinalize(result.variant)}
                            disabled={isFinalizing || isRerolling}
                            className="flex-1 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            Finalize
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-red-600">{result.error}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
