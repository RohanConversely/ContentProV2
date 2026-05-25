import { useState } from 'react';

export default function UploadBox() {
  const [selectedFile, setSelectedFile] = useState(null);

  function handleFileChange(event) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  return (
    <label className="block rounded-lg border border-dashed border-slate-300 p-6">
      <span className="block text-sm font-medium text-slate-900">Product image</span>
      <input
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
        className="mt-4 block w-full text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
      />
      {selectedFile && (
        <span className="mt-3 block text-sm text-slate-600">Selected: {selectedFile.name}</span>
      )}
    </label>
  );
}
