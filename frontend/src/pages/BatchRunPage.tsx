import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ImageIcon, PlayCircle, Video as VideoIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import GenerationResults from "@/components/GenerationResults";
import VideoCreation from "@/components/VideoCreation";
import type { ProductFormData } from "@/components/CreationWizard";

type BatchMode = "images" | "video";

interface BatchJobRunPayload {
  id: string;
  mode: BatchMode;
  productData: ProductFormData;
}

interface BatchRunLocationState {
  mode: BatchMode;
  jobs: BatchJobRunPayload[];
}

const BatchRunPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as BatchRunLocationState | undefined;

  const jobs = state?.jobs ?? [];
  const defaultMode = state?.mode ?? "images";

  const [activeJobId, setActiveJobId] = useState<string | null>(jobs[0]?.id ?? null);
  const [showVideoCreation, setShowVideoCreation] = useState(false);

  const activeJob = useMemo(
    () => jobs.find((j) => j.id === activeJobId) ?? jobs[0],
    [jobs, activeJobId],
  );

  if (!state || jobs.length === 0 || !activeJob) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-24 pb-16">
          <div className="max-w-xl mx-auto rounded-xl border border-border bg-card p-6 space-y-3">
            <h1 className="font-display text-xl font-semibold">No batch run data</h1>
            <p className="text-sm text-muted-foreground">
              This page is meant to be opened after running a batch from the dashboard.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
            >
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const effectiveMode: BatchMode = activeJob.mode ?? defaultMode;

  if (showVideoCreation && effectiveMode === "video") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-24 pb-16">
          <VideoCreation
            productData={activeJob.productData}
            images={activeJob.productData.productImages}
            onBack={() => setShowVideoCreation(false)}
            onStartOver={() => navigate("/dashboard")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">Batch run</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                {jobs.length} job{jobs.length === 1 ? "" : "s"} ·{" "}
                {defaultMode === "video" ? "Images + video workflow" : "Images only workflow"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: job cards */}
          <div className="lg:col-span-1 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Jobs
            </p>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {jobs.map((job, index) => {
                const isActive = job.id === activeJob.id;
                const ModeIcon = job.mode === "video" ? VideoIcon : ImageIcon;
                return (
                  <motion.button
                    key={job.id}
                    type="button"
                    onClick={() => {
                      setShowVideoCreation(false);
                      setActiveJobId(job.id);
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`w-full text-left rounded-xl border px-4 py-3 text-sm flex flex-col gap-1.5 transition-all ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-glow"
                        : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <ModeIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {job.productData.productName || `Job ${index + 1}`}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {job.productData.brandName || "Untitled brand"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        #{index + 1}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Right: results for active job */}
          <div className="lg:col-span-3">
            <GenerationResults
              productData={activeJob.productData}
              mode={effectiveMode === "video" ? "video" : "images"}
              onBack={() => navigate("/dashboard")}
              onStartOver={() => navigate("/dashboard")}
              onCreateVideo={
                effectiveMode === "video"
                  ? () => {
                      setShowVideoCreation(true);
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchRunPage;

