import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Check, ImageIcon, Video, RefreshCw, Crown } from "lucide-react";
import Navbar from "@/components/Navbar";

const mockUsage = {
  plan: "free" as "free" | "pro",
  creditsUsed: 7,
  creditsTotal: 10,
  imagesThisMonth: 6,
  videosThisMonth: 1,
  resetDate: "April 1, 2026",
};

const proBenefits = [
  "Unlimited images per month",
  "Unlimited videos per month",
  "Priority processing queue",
  "4K resolution exports",
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const usagePercent = Math.round((mockUsage.creditsUsed / mockUsage.creditsTotal) * 100);
  const isPro = mockUsage.plan === "pro";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container pt-28 pb-16 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <h1 className="font-display text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage your plan and credits</p>
          </div>

          {/* Current Plan */}
          <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Current Plan</p>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold capitalize">{mockUsage.plan}</h2>
                  {isPro && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                      <Crown className="h-3 w-3" /> Pro
                    </span>
                  )}
                </div>
              </div>
              {!isPro && (
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="h-4 w-4" /> Upgrade to Pro
                </button>
              )}
            </div>

            {/* Credits bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Credits used</span>
                <span className="font-semibold tabular-nums">
                  {mockUsage.creditsUsed} / {mockUsage.creditsTotal}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    usagePercent >= 90
                      ? "bg-red-500"
                      : usagePercent >= 70
                      ? "bg-yellow-500"
                      : "bg-gradient-primary"
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground">{usagePercent}% of monthly credits used</p>
            </div>
          </div>

          {/* Credits Details */}
          <div className="rounded-xl border border-border bg-card/60 backdrop-blur divide-y divide-border">
            <div className="px-6 py-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Credits Details</p>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-medium">Images generated</p>
              </div>
              <span className="text-sm font-semibold tabular-nums">{mockUsage.imagesThisMonth} this month</span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Video className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-medium">Videos generated</p>
              </div>
              <span className="text-sm font-semibold tabular-nums">{mockUsage.videosThisMonth} this month</span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-medium">Credits reset</p>
              </div>
              <span className="text-sm font-semibold">{mockUsage.resetDate}</span>
            </div>
          </div>

          {/* Upgrade card (only for free users) */}
          {!isPro && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Upgrade to Pro</p>
                <h3 className="font-display text-xl font-bold">Unlock unlimited content creation</h3>
              </div>
              <ul className="space-y-2.5">
                {proBenefits.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity">
                <Crown className="h-4 w-4" /> Upgrade to Pro — $29/mo
              </button>
            </div>
          )}

          {/* Billing History (placeholder) */}
          <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Billing History</p>
              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">Coming soon</span>
            </div>
            <p className="text-sm text-muted-foreground">Your past invoices will appear here once billing is available.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
