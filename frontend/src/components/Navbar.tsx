import { Link, useLocation } from "react-router-dom";
import { Sparkles, FolderOpen } from "lucide-react";

const navItems = [
  { label: "Create", icon: Sparkles, path: "/" },
  { label: "Projects", icon: FolderOpen, path: "/projects" },
];

const Navbar = () => {
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            ContentPro
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button className="bg-gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity">
            Upgrade Pro
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
