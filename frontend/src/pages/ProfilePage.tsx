import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogOut, Mail, Shield, Settings, User } from "lucide-react";
import Navbar from "@/components/Navbar";
import { changePassword, getCurrentUser, type UserProfile } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    void (async () => {
      const data = await getCurrentUser();
      setUser(data);
    })();
  }, []);

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordSuccess("Password updated successfully.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-28 pb-16 max-w-2xl">
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container pt-28 pb-16 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Avatar + name card */}
          <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="shrink-0">
              <img
                src={user.avatar}
                alt={user.name}
                className="h-24 w-24 rounded-full border-2 border-primary/30 bg-secondary"
              />
            </div>
            <div className="text-center sm:text-left space-y-1 flex-1">
              <h1 className="font-display text-2xl font-bold">{user.name}</h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <span
                className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  user.plan === "pro"
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <Shield className="h-3 w-3" />
                {user.plan === "pro" ? "Pro Plan" : "Free Plan"}
              </span>
            </div>
          </div>

          {/* Account Info */}
          <div className="rounded-xl border border-border bg-card/60 backdrop-blur divide-y divide-border">
            <div className="px-6 py-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">Account Info</p>
            </div>
            <div className="px-6 py-4 flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm font-medium">{user.name}</p>
              </div>
            </div>
            <div className="px-6 py-4 flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>
            <div className="px-6 py-4 flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-sm font-medium capitalize">{user.plan}</p>
              </div>
            </div>
            <div className="px-6 py-4 flex items-center gap-3">
              <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm font-medium">{user.memberSince}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Security</p>
              <h2 className="font-display text-xl font-semibold">Update Password</h2>
            </div>

            <form className="space-y-4" onSubmit={handlePasswordChange}>
              <label className="block space-y-2 text-sm">
                <span className="text-muted-foreground">Current Password</span>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-12 outline-none ring-0 transition-colors focus:border-primary"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-muted-foreground">New Password</span>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-12 outline-none ring-0 transition-colors focus:border-primary"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-muted-foreground">Confirm New Password</span>
                <div className="relative">
                  <input
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-12 outline-none ring-0 transition-colors focus:border-primary"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
              {passwordSuccess ? <p className="text-sm text-green-500">{passwordSuccess}</p> : null}

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary transition-colors disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isUpdatingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/settings")}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              <Settings className="h-4 w-4" /> Manage Subscription
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
