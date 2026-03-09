import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Image, Layers, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreationOption {
  icon: React.ElementType;
  title: string;
  description: string;
  action: () => void;
}

interface CreationOptionsProps {
  onSelect: (mode: string) => void;
}

const CreationOptions = ({ onSelect }: CreationOptionsProps) => {
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<"images" | "video" | null>(null);

  const openChoice = (mode: "images" | "video") => {
    setPendingMode(mode);
    setChoiceOpen(true);
  };

  const options: CreationOption[] = [
    {
      icon: Image,
      title: "Generate A+ Images",
      description: "Create professional Amazon A+ ready product images from your photos",
      action: () => openChoice("images"),
    },
    {
      icon: Video,
      title: "Generate a Video",
      description: "Create engaging video content from your product images",
      action: () => openChoice("video"),
    },
  ];

  const title = useMemo(() => {
    if (pendingMode === "images") return "Generate A+ Images";
    if (pendingMode === "video") return "Generate a Video";
    return "Start generation";
  }, [pendingMode]);

  const description = useMemo(() => {
    if (pendingMode === "images")
      return "Run generation for a single product, or upload a CSV/XLSX to generate for many products at once.";
    if (pendingMode === "video")
      return "Run the full images → video pipeline for a single product, or upload a CSV/XLSX batch.";
    return "Choose how you want to run generation.";
  }, [pendingMode]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto">
        {options.map((option, i) => (
          <motion.button
            key={option.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            onClick={option.action}
            className="group relative flex flex-col items-start gap-3 p-6 rounded-xl border border-border bg-card hover:bg-secondary transition-all duration-300 text-left hover:shadow-glow hover:border-primary/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all duration-300">
              <option.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground mb-1">{option.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{option.description}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <Dialog
        open={choiceOpen}
        onOpenChange={(open) => {
          setChoiceOpen(open);
          if (!open) setPendingMode(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (!pendingMode) return;
                onSelect(pendingMode);
                setChoiceOpen(false);
              }}
              className="group rounded-xl border border-border bg-card p-4 text-left hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all">
                  <Image className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Single product</p>
                  <p className="text-xs text-muted-foreground">Fill the form and run generation once</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                if (!pendingMode) return;
                onSelect(`${pendingMode}-batch`);
                setChoiceOpen(false);
              }}
              className="group rounded-xl border border-border bg-card p-4 text-left hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Batch upload</p>
                  <p className="text-xs text-muted-foreground">Upload CSV/XLSX, review rows, select jobs</p>
                </div>
              </div>
            </button>
          </div>

          <div className="text-xs text-muted-foreground">
            Expected columns: image link, brand name, brand website, product name, product category, short description, 4 social links.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreationOptions;
