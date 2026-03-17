import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Layers, CheckCircle2, Clock3, XCircle, ImageIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getBatchJobs, downloadBatchArchive, type BackendJobSummaryResponse } from "@/lib/api";

const BatchDetailPage = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<BackendJobSummaryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!batchId) return;
    void (async () => {
      try {
        const data = await getBatchJobs(batchId);
        setJobs(data);
      } catch (error) {
        console.error("Failed to fetch batch jobs", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [batchId]);

  const batchName = jobs[0]?.batch_name || "Batch Results";
  const anyRunning = jobs.some(j => !["completed", "failed", "cancelled"].includes(j.status));

  const getBatchJobStatus = (status: string) => {
    if (["pending_upload", "pending", "queued", "creating", "uploading"].includes(status)) {
      return "queued";
    }
    if (status === "running") {
      return "running";
    }
    if (status === "completed") {
      return "completed";
    }
    if (status === "failed") {
      return "failed";
    }
    if (status === "cancelled") {
      return "cancelled";
    }
    return status;
  };

  const handleDownloadAll = async () => {
    if (!batchId) return;
    await downloadBatchArchive(batchId, batchName);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/projects")}
              className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold">{batchName}</h1>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  BATCH
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {jobs.length} jobs in this batch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              disabled={anyRunning || jobs.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" /> Download All Results (ZIP)
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job, index) => {
               const normalizedStatus = getBatchJobStatus(job.status);
               const canView = !["queued", "creating", "uploading", "pending", "pending_upload"].includes(job.status);
               const StatusIcon = normalizedStatus === "completed" ? CheckCircle2 : normalizedStatus === "failed" ? XCircle : Clock3;
               const statusTone = normalizedStatus === "completed" ? "text-green-500" : normalizedStatus === "failed" ? "text-destructive" : "text-primary";
               
               return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group rounded-xl border border-border bg-card p-4 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${statusTone}`}>
                      <StatusIcon className={`h-3.5 w-3.5 ${normalizedStatus === "running" ? "animate-spin" : ""}`} />
                      {normalizedStatus}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm truncate">{job.product_name}</h4>
                    <p className="text-xs text-muted-foreground">{job.brand_name}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono break-all opacity-70">
                      Job ID: {job.job_id}
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border">
                    <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    <button
                      type="button"
                      disabled={!canView}
                      onClick={() => {
                        if (canView) {
                          navigate(`/project/${job.job_id}`);
                        }
                      }}
                      className={`font-medium ${canView ? "text-primary hover:underline" : "text-muted-foreground/50 cursor-not-allowed"}`}
                    >
                      View Details →
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchDetailPage;
