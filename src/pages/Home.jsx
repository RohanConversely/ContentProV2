import { useState } from 'react';
import UploadBox from '../components/UploadBox.jsx';
import { generateVariant } from '../services/imageService.js';

export default function Home() {
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [category, setCategory] = useState('general');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleGenerate() {
    if (!uploadedImageUrl) {
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');

    try {
      const imageUrl = await generateVariant('white_bg', uploadedImageUrl, category);
      console.log(imageUrl);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-12">
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
    </main>
  );
}
