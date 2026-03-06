import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Upload, ImagePlus, X } from "lucide-react";

interface ImageUploadZoneProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

const ImageUploadZone = ({ images, onImagesChange }: ImageUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            onImagesChange([...images, ev.target.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [images, onImagesChange]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            onImagesChange([...images, ev.target.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [images, onImagesChange]
  );

  const removeImage = useCallback(
    (index: number) => {
      onImagesChange(images.filter((_, i) => i !== index));
    },
    [images, onImagesChange]
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold mb-1">Upload Raw Images</h3>
        <p className="text-sm text-muted-foreground">Upload your product photos to transform into premium images</p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-all duration-300 cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5 shadow-glow"
            : "border-border hover:border-primary/40 hover:bg-secondary/50"
        }`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Upload className="h-7 w-7 text-primary" />
        </div>
        <div className="text-center">
          <p className="font-medium">Drop your images here or click to browse</p>
          <p className="text-sm text-muted-foreground mt-1">Supports JPG, PNG, WEBP up to 20MB</p>
        </div>
      </div>

      {/* Image preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-card"
            >
              <img src={src} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
          <label className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          </label>
        </div>
      )}
    </div>
  );
};

export default ImageUploadZone;
