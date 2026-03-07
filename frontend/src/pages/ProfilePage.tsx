import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Mail, User, Shield, Settings } from "lucide-react";
import Navbar from "@/components/Navbar";

const mockUser = {
  name: "Alex Johnson",
  email: "alex@example.com",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  plan: "free" as "free" | "pro",
  memberSince: "January 2026",
};

const ProfilePage = () => {
  const navigate = useNavigate();

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
                src={mockUser.avatar}
                alt={mockUser.name}
                className="h-24 w-24 rounded-full border-2 border-primary/30 bg-secondary"
              />
            </div>
            <div className="text-center sm:text-left space-y-1 flex-1">
              <h1 className="font-display text-2xl font-bold">{mockUser.name}</h1>
              <p className="text-muted-foreground text-sm">{mockUser.email}</p>
              <span
                className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  mockUser.plan === "pro"
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <Shield className="h-3 w-3" />
                {mockUser.plan === "pro" ? "Pro Plan" : "Free Plan"}
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
                <p className="text-sm font-medium">{mockUser.name}</p>
              </div>
            </div>
            <div className="px-6 py-4 flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{mockUser.email}</p>
              </div>
            </div>
            <div className="px-6 py-4 flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-sm font-medium capitalize">{mockUser.plan}</p>
              </div>
            </div>
            <div className="px-6 py-4 flex items-center gap-3">
              <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm font-medium">{mockUser.memberSince}</p>
              </div>
            </div>
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
              onClick={() => navigate("/")}
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
