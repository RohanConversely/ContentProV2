import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const { completeGoogleLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const token = searchParams.get("token");
  const nextPath = useMemo(() => searchParams.get("next") || "/dashboard", [searchParams]);
  const oauthError = searchParams.get("error");

  useEffect(() => {
    if (oauthError) {
      setError(oauthError);
      return;
    }
    if (!token) {
      setError("Missing Google session token.");
      return;
    }
    void (async () => {
      try {
        await completeGoogleLogin(token);
        setIsDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google sign-in failed.");
      }
    })();
  }, [completeGoogleLogin, oauthError, token]);

  if (isDone) {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="rounded-2xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground">
        {error ? (
          <div className="space-y-3">
            <p className="text-destructive">{error}</p>
            <a href="/login" className="text-primary hover:underline">
              Back to sign in
            </a>
          </div>
        ) : (
          <p>Completing Google sign-in...</p>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;
