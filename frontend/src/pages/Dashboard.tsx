import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  Clock,
  Film,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Eye,
  XCircle,
  BarChart3,
  Layers,
  TrendingUp,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useProcesses, type WorkflowProcess, type ProcessStage } from "@/contexts/ProcessContext";

const stageLabels: Record<ProcessStage, string> = {
  queued: "Queued",
  kyc: "Collecting Info",
  images: "Generating Images",
  video: "Creating Video",
  completed: "Completed",
  failed: "Failed",
};

const stageOrder: ProcessStage[] = ["queued", "kyc", "images", "video", "completed"];

const stageIcons: Record<ProcessStage, typeof Clock> = {
  queued: Clock,
  kyc: Layers,
  images: ImageIcon,
  video: Film,
  completed: CheckCircle2,
  failed: XCircle,
};

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const Dashboard = () => {
  const { processes, updateProcess, removeProcess } = useProcesses();
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  // Simulate live progress on active processes
  useEffect(() => {
    const interval = setInterval(() => {
      processes.forEach((p) => {
        if (p.stage === "queued" || p.stage === "completed" || p.stage === "failed") return;
        const newProgress = Math.min(p.progress + Math.random() * 2, 100);
        const updates: Partial<WorkflowProcess> = { progress: newProgress };

        if (p.stage === "images") {
          const newImages = Math.min(Math.floor((newProgress / 100) * p.totalImages), p.totalImages);
          updates.imagesGenerated = newImages;
          if (newProgress >= 100) {
            updates.stage = "video";
            updates.progress = 0;
          }
        } else if (p.stage === "video") {
          if (newProgress >= 100) {
            updates.stage = "completed";
            updates.videoReady = true;
            updates.completedAt = new Date();
          }
        }
        updateProcess(p.id, updates);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [processes, updateProcess]);

  const filtered = processes.filter((p) => {
    if (filter === "active") return p.stage !== "completed" && p.stage !== "failed";
    if (filter === "completed") return p.stage === "completed";
    return true;
  });

  const activeCount = processes.filter((p) => p.stage !== "completed" && p.stage !== "failed").length;
  const completedCount = processes.filter((p) => p.stage === "completed").length;

  const overallStage = (p: WorkflowProcess) => {
    const idx = stageOrder.indexOf(p.stage);
    const total = stageOrder.length - 1; // exclude "completed" from divisor
    if (p.stage === "completed") return 100;
    return Math.round(((idx + p.progress / 100) / total) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Process <span className="text-gradient">Dashboard</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Track all your content generation workflows in real-time
            </p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> New Project
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Processes", value: processes.length, icon: BarChart3, color: "text-primary" },
            { label: "Active", value: activeCount, icon: Activity, color: "text-primary" },
            { label: "Completed", value: completedCount, icon: CheckCircle2, color: "text-green-500" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? "bg-primary/10 border border-primary/40 text-primary"
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {f === "all" ? "All" : f === "active" ? "Active" : "Completed"}
              {f === "active" && activeCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px]">
                  {activeCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Process Cards */}
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((proc, i) => {
              const StageIcon = stageIcons[proc.stage];
              const overall = overallStage(proc);
              const isActive = proc.stage !== "completed" && proc.stage !== "failed";

              return (
                <motion.div
                  key={proc.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card hover:bg-secondary/30 transition-all duration-200 overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                          proc.stage === "completed"
                            ? "bg-green-500/10"
                            : proc.stage === "failed"
                            ? "bg-destructive/10"
                            : "bg-primary/10"
                        }`}>
                          {isActive ? (
                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                          ) : proc.stage === "completed" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-semibold text-sm truncate">{proc.clientName}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              proc.stage === "completed"
                                ? "bg-green-500/10 text-green-500"
                                : proc.stage === "failed"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-primary/10 text-primary"
                            }`}>
                              {stageLabels[proc.stage]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {proc.genre && <span className="capitalize">{proc.genre}</span>}
                            {proc.theme && <><span>·</span><span className="capitalize">{proc.theme}</span></>}
                            {proc.outputType && <><span>·</span><span>{proc.outputType}</span></>}
                            <span>·</span>
                            <span>{timeAgo(proc.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {proc.stage === "completed" && (
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors">
                            <Eye className="h-3 w-3" /> View
                          </button>
                        )}
                        <button
                          onClick={() => removeProcess(proc.id)}
                          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Section */}
                    {isActive && (
                      <div className="mt-4 space-y-2">
                        {/* Stage pipeline */}
                        <div className="flex items-center gap-1">
                          {stageOrder.slice(0, -1).map((stage, si) => {
                            const currentIdx = stageOrder.indexOf(proc.stage);
                            const isDone = si < currentIdx;
                            const isCurrent = si === currentIdx;
                            const Icon = stageIcons[stage];
                            return (
                              <div key={stage} className="flex items-center flex-1 gap-1">
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                                  isDone
                                    ? "bg-green-500/10 text-green-500"
                                    : isCurrent
                                    ? "bg-primary/10 text-primary border border-primary/30"
                                    : "bg-secondary text-muted-foreground"
                                }`}>
                                  <Icon className="h-3 w-3" />
                                  <span className="hidden sm:inline">{stageLabels[stage]}</span>
                                </div>
                                {si < stageOrder.length - 2 && (
                                  <div className={`h-px flex-1 ${isDone ? "bg-green-500/40" : "bg-border"}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-primary rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${overall}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <span className="text-xs font-medium text-primary w-10 text-right">{overall}%</span>
                        </div>

                        {/* Detail line */}
                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {proc.imagesGenerated}/{proc.totalImages} images
                          </span>
                          <span className="flex items-center gap-1">
                            <Film className="h-3 w-3" />
                            Video: {proc.videoReady ? "Ready" : proc.stage === "video" ? "In progress" : "Pending"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Completed summary */}
                    {proc.stage === "completed" && (
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3 text-green-500" /> {proc.totalImages} images
                        </span>
                        <span className="flex items-center gap-1">
                          <Film className="h-3 w-3 text-green-500" /> Video ready
                        </span>
                        {proc.completedAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" /> Completed {timeAgo(proc.completedAt)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground">No processes found</p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" /> Start a Project
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
