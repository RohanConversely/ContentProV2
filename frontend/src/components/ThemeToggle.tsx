import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";

  const toggleTheme = () => {
    setTheme(isLight ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
      className="rounded-xl border border-border bg-card/30 p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
    >
      {isLight ? <Moon className="h-4 w-4" strokeWidth={1.9} /> : <Sun className="h-4 w-4" strokeWidth={1.9} />}
    </button>
  );
};

export default ThemeToggle;
