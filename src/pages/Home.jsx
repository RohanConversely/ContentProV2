import { useState } from 'react';
import UploadBox from '../components/UploadBox.jsx';

export default function Home() {
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');

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
      <button
        type="button"
        disabled={!uploadedImageUrl}
        className="w-fit rounded-md bg-slate-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Generate
      </button>
    </main>
  );
}
