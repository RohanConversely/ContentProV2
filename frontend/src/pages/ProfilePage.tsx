import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, LogOut, Settings } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Your <span className="text-gradient">Profile</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your account information
            </p>
          </div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-8"
          >
            {/* Avatar & Name */}
            <div className="flex items-center gap-6 mb-8">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
              )}
              <div>
                <h2 className="font-display text-2xl font-bold">{user.name}</h2>
                <p className="text-muted-foreground capitalize">{user.plan} Plan</p>
              </div>
            </div>

            {/* Info Sections */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{user.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Current Plan</p>
                  <p className="font-medium capitalize">{user.plan}</p>
                </div>
              </div>
            </div>

            {/* Credits Summary */}
            <div className="mt-8 p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Monthly Credits</p>
                <p className="text-sm text-muted-foreground">
                  {user.credits.used} / {user.credits.total} used
                </p>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-gradient-primary rounded-full transition-all"
                  style={{
                    width: `${(user.credits.used / user.credits.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Resets on {new Date(user.credits.resetDate).toLocaleDateString()}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => navigate("/settings")}
                className="flex-1"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex-1 text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
