import { useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getGoogleLoginUrl } from "@/lib/api";

const AuthPage = () => {
  const location = useLocation();
  const { isAuthenticated, isLoading, loginWithPassword, registerWithPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const destination = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || "/dashboard";
  }, [location.state]);

  if (isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      if (mode === "register") {
        await registerWithPassword({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
        });
        return;
      }
      await loginWithPassword({
        email: email.trim(),
        password,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = getGoogleLoginUrl(destination);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container min-h-screen flex items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 shadow-xl backdrop-blur"
        >
          <Link to="/" className="mb-8 inline-flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">ContentPro</span>
          </Link>

          <div className="mb-8 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">
              Account Access
            </p>
            <h1 className="font-display text-3xl font-bold">
              {mode === "login" ? "Sign in to ContentPro" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Use email and password to access your saved jobs and projects on the deployed server.
            </p>
          </div>

          <div className="mb-5 inline-flex rounded-2xl border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Register
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background px-5 py-3 text-sm font-semibold transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue with Google
            </button>

            <div className="relative py-1">
              <div className="h-px w-full bg-border" />
            </div>

            {mode === "register" ? (
              <>
                <label className="block space-y-2 text-sm">
                  <span className="text-muted-foreground">Display name</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none ring-0 transition-colors focus:border-primary"
                    placeholder="Your name"
                    required
                  />
                </label>
              </>
            ) : null}

            <label className="block space-y-2 text-sm">
              <span className="text-muted-foreground">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none ring-0 transition-colors focus:border-primary"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="text-muted-foreground">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-12 outline-none ring-0 transition-colors focus:border-primary"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background px-5 py-3 text-sm font-semibold transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "login" ? "Sign In" : "Create Account"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;
