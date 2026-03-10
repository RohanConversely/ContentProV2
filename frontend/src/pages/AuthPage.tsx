import { useMemo } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getGoogleLoginUrl } from "@/lib/api";

const AuthPage = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const destination = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || "/dashboard";
  }, [location.state]);

  if (isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  const continueWithGoogle = () => {
    window.location.assign(getGoogleLoginUrl(destination));
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
              Google Sign-In
            </p>
            <h1 className="font-display text-3xl font-bold">Continue with Google</h1>
            <p className="text-sm text-muted-foreground">
              Sign in with your Google account to create persisted image generation jobs.
            </p>
          </div>

          <button
            onClick={continueWithGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background px-5 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.5 39.5 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.6-6.1 7.2l6.2 5.2C38 37.8 44 32 44 24c0-1.3-.1-2.3-.4-3.5z" />
            </svg>
            Continue with Google
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;
