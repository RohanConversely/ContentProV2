import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  clearStoredSession,
  getCurrentUser,
  getStoredAccessToken,
  setStoredAccessToken,
  type UserProfile,
} from "@/lib/api";

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  refreshUser: () => Promise<UserProfile | null>;
  completeGoogleLogin: (token: string) => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async (): Promise<UserProfile | null> => {
    const token = getStoredAccessToken();
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const profile = await getCurrentUser();
      setUser(profile);
      return profile;
    } catch {
      clearStoredSession();
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    void (async () => {
      await refreshUser();
      setIsLoading(false);
    })();
  }, []);

  const completeGoogleLogin = async (token: string) => {
    setStoredAccessToken(token);
    const profile = await refreshUser();
    setIsLoading(false);
    return profile;
  };

  const logout = () => {
    clearStoredSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        logout,
        refreshUser,
        completeGoogleLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
};
