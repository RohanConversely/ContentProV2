import { motion } from "framer-motion";
import {
  CreditCard,
  Zap,
  CheckCircle2,
  Crown,
  Star,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SettingsPage = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const usagePercentage = (user.credits.used / user.credits.total) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              <span className="text-gradient">Settings</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your subscription and credits
            </p>
          </div>

          {/* Current Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  Current Plan
                  <Badge variant={user.plan === "pro" ? "default" : "secondary"}>
                    {user.plan === "pro" ? "PRO" : "FREE"}
                  </Badge>
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  You are on the {user.plan} plan
                </p>
              </div>
              {user.plan === "free" && (
                <Button className="bg-gradient-primary">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              )}
            </div>

            {/* Credits Usage */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Monthly Credits</span>
                <span className="text-sm text-muted-foreground">
                  {user.credits.used} / {user.credits.total}
                </span>
              </div>
              <div className="h-3 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{user.credits.total - user.credits.used} credits remaining</span>
                <span>Resets {new Date(user.credits.resetDate).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
              <div className="text-center p-4 rounded-xl bg-secondary/50">
                <Zap className="h-5 w-5 mx-auto text-primary mb-2" />
                <p className="text-2xl font-display font-bold">{user.credits.used}</p>
                <p className="text-xs text-muted-foreground">Credits Used</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-secondary/50">
                <CreditCard className="h-5 w-5 mx-auto text-primary mb-2" />
                <p className="text-2xl font-display font-bold">{user.credits.total - user.credits.used}</p>
                <p className="text-xs text-muted-foreground">Credits Left</p>
              </div>
            </div>
          </motion.div>

          {/* Upgrade to Pro */}
          {user.plan === "free" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                  <Crown className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-semibold mb-2">
                    Upgrade to Pro
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Unlock more credits and premium features
                  </p>
                  <ul className="space-y-2 mb-6">
                    {[
                      "50 credits per month",
                      "Priority processing",
                      "Higher resolution exports",
                      "Priority support",
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full bg-gradient-primary">
                    <Star className="h-4 w-4 mr-2" />
                    Upgrade Now <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Pro Features (for reference) */}
          {user.plan === "pro" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h3 className="font-display text-lg font-semibold mb-4">
                Pro Plan Benefits
              </h3>
              <ul className="space-y-3">
                {[
                  { name: "Monthly Credits", value: "50 credits" },
                  { name: "Processing Priority", value: "High" },
                  { name: "Export Resolution", value: "4K" },
                  { name: "Support", value: "Priority" },
                ].map((item) => (
                  <li key={item.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
