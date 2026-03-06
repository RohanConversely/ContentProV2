import { motion } from "framer-motion";
import { Check } from "lucide-react";

const genres = [
  { id: "lifestyle", label: "Lifestyle", emoji: "🏡", description: "Natural settings & daily use" },
  { id: "studio", label: "Studio", emoji: "📸", description: "Clean white backgrounds" },
  { id: "luxury", label: "Luxury", emoji: "✨", description: "Premium & high-end feel" },
  { id: "minimal", label: "Minimal", emoji: "◻️", description: "Simple & elegant" },
  { id: "outdoor", label: "Outdoor", emoji: "🌿", description: "Nature & adventure" },
  { id: "tech", label: "Tech", emoji: "💻", description: "Modern & innovative" },
  { id: "food", label: "Food & Bev", emoji: "🍽️", description: "Culinary photography" },
  { id: "fashion", label: "Fashion", emoji: "👗", description: "Style & apparel" },
];

const themes = [
  { id: "warm", label: "Warm Tones", color: "hsl(24, 95%, 53%)" },
  { id: "cool", label: "Cool Tones", color: "hsl(210, 80%, 55%)" },
  { id: "neutral", label: "Neutral", color: "hsl(40, 15%, 70%)" },
  { id: "vibrant", label: "Vibrant", color: "hsl(340, 80%, 55%)" },
  { id: "dark", label: "Dark & Moody", color: "hsl(222, 47%, 15%)" },
  { id: "pastel", label: "Pastel", color: "hsl(300, 40%, 80%)" },
];

interface GenreThemeSelectorProps {
  selectedGenre: string | null;
  selectedTheme: string | null;
  onGenreSelect: (genre: string) => void;
  onThemeSelect: (theme: string) => void;
}

const GenreThemeSelector = ({ selectedGenre, selectedTheme, onGenreSelect, onThemeSelect }: GenreThemeSelectorProps) => {
  return (
    <div className="space-y-8">
      {/* Genre Selection */}
      <div>
        <h3 className="font-display text-lg font-semibold mb-1">Select Genre</h3>
        <p className="text-sm text-muted-foreground mb-4">Choose the style that best fits your product</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {genres.map((genre, i) => (
            <motion.button
              key={genre.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onGenreSelect(genre.id)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                selectedGenre === genre.id
                  ? "border-primary bg-primary/10 shadow-glow"
                  : "border-border bg-card hover:border-primary/30 hover:bg-secondary"
              }`}
            >
              {selectedGenre === genre.id && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              <span className="text-2xl">{genre.emoji}</span>
              <span className="font-medium text-sm">{genre.label}</span>
              <span className="text-xs text-muted-foreground">{genre.description}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Theme Selection */}
      <div>
        <h3 className="font-display text-lg font-semibold mb-1">Select Theme</h3>
        <p className="text-sm text-muted-foreground mb-4">Pick a color mood for your images</p>
        <div className="flex flex-wrap gap-3">
          {themes.map((theme, i) => (
            <motion.button
              key={theme.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onThemeSelect(theme.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                selectedTheme === theme.id
                  ? "border-primary bg-primary/10 shadow-glow"
                  : "border-border bg-card hover:border-primary/30 hover:bg-secondary"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full ${selectedTheme === theme.id ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                style={{ backgroundColor: theme.color }}
              />
              <span className="text-sm font-medium">{theme.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GenreThemeSelector;
