import { motion } from "framer-motion";
import { Image, Video } from "lucide-react";

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
      icon: Image,
      title: "Generate A+ Images",
      description: "Create professional Amazon A+ ready product images from your photos",
      action: () => onSelect("images"),
    },
    {
      icon: Video,
      title: "Generate a Video",
      description: "Create engaging video content from your product images",
      action: () => onSelect("video"),
    },
  ];

  return (
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
  );
};

export default CreationOptions;
