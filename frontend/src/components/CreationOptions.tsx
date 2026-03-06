import { motion } from "framer-motion";
import { Sparkles, Upload, LayoutTemplate, FileText } from "lucide-react";

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
  const options: CreationOption[] = [
    {
      icon: Sparkles,
      title: "Generate with AI",
      description: "Create premium images from a one-line prompt in seconds",
      action: () => onSelect("generate"),
    },
    {
      icon: Upload,
      title: "Upload Raw Images",
      description: "Transform your raw product photos into professional images",
      action: () => onSelect("upload"),
    },
    {
      icon: LayoutTemplate,
      title: "Use a Template",
      description: "Start from professionally designed templates",
      action: () => onSelect("template"),
    },
    {
      icon: FileText,
      title: "Import File or URL",
      description: "Enhance existing docs, presentations, or webpages",
      action: () => onSelect("import"),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
  );
};

export default CreationOptions;
