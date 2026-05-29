import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function UploadBox({ onUploadComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  function handleFileChange(event) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setErrorMessage('');
  }

  async function handleUpload() {
    if (!selectedFile) {
      setErrorMessage('Please select a JPG or PNG image first.');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');

    if (!supabase) {
      setErrorMessage('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart Vite.');
      setIsUploading(false);
      return;
    }

    const filePath = `uploads/${Date.now()}_${selectedFile.name}`;
    const { error } = await supabase.storage
      .from('product image')
      .upload(filePath, selectedFile);

    if (error) {
      setErrorMessage(error.message);
      setIsUploading(false);
      return;
    }

    const { data } = supabase.storage.from('product image').getPublicUrl(filePath);
    onUploadComplete(data.publicUrl);
    setIsUploading(false);
  }

  return (
    <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-6">
      <label className="block">
        <span className="block text-sm font-medium text-white">Product image</span>
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
          className="mt-4 block w-full text-sm text-white/70 file:mr-4 file:rounded-lg file:border-0 file:bg-[#9db8ff] file:px-4 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-[#8da7ef]"
        />
      </label>
      {selectedFile && (
        <span className="mt-3 block text-sm text-white/60">Selected: {selectedFile.name}</span>
      )}
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Selected product preview"
          className="mt-4 max-h-72 rounded-lg border border-white/10 object-contain"
        />
      )}
      {errorMessage && <p className="mt-3 text-sm text-red-400">{errorMessage}</p>}
      <button
        type="button"
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="mt-5 rounded-lg bg-[#9db8ff] px-5 py-2.5 text-sm font-medium text-black transition-all hover:bg-[#8da7ef] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
      >
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
}
