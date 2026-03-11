import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock3, ImageIcon, Video as VideoIcon, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import GenerationResults from "@/components/GenerationResults";
import VideoCreation from "@/components/VideoCreation";
import type { ProductFormData } from "@/components/CreationWizard";
import {
  createJob,
  getJob,
  uploadRemoteJobAsset,
  waitForJobCompletion,
  type JobEventPayload,
} from "@/lib/api";
import {
  clearActiveBatchRun,
  readActiveBatchRun,
  writeActiveBatchRun,
} from "@/lib/active-runs";

type BatchMode = "images" | "video";
type BatchJobStatus = "queued" | "creating" | "uploading" | "running" | "completed" | "failed";

interface BatchJobRunPayload {
  id: string;
  mode: BatchMode;
  productData: ProductFormData;
}

interface BatchRunLocationState {
  mode: BatchMode;
  jobs: BatchJobRunPayload[];
}

interface BatchJobExecutionState extends BatchJobRunPayload {
  backendJobId: string | null;
  status: BatchJobStatus;
  stage: string | null;
  message: string | null;
  generatedImages: string[];
  error: string | null;
}

const BatchRunPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as BatchRunLocationState | undefined;
  const persistedRun = readActiveBatchRun();
  const initialJobs = state?.jobs?.length ? state.jobs : (persistedRun?.jobs ?? []);
  const defaultMode = state?.mode ?? persistedRun?.mode ?? "images";
  const [jobStates, setJobStates] = useState<BatchJobExecutionState[]>(() => {
    if (persistedRun?.jobStates?.length) {
      return persistedRun.jobStates;
    }
    return initialJobs.map((job) => ({
      ...job,
      backendJobId: null,
      status: "queued",
      stage: "queued",
      message: "Waiting to start.",
      generatedImages: [],
      error: null,
    }));
  });
  const [activeJobId, setActiveJobId] = useState<string | null>(persistedRun?.activeJobId ?? initialJobs[0]?.id ?? null);
  const [showVideoCreation, setShowVideoCreation] = useState(false);
  const hasStartedRef = useRef(false);
  const jobStatesRef = useRef<BatchJobExecutionState[]>(jobStates);

  const activeJob = useMemo(
    () => jobStates.find((job) => job.id === activeJobId) ?? jobStates[0],
    [jobStates, activeJobId],
  );

  useEffect(() => {
    jobStatesRef.current = jobStates;
    if (jobStates.length === 0) return;
    writeActiveBatchRun({
      mode: defaultMode,
      jobs: jobStates.map(({ id, mode, productData }) => ({ id, mode, productData })),
      jobStates,
      activeJobId,
    });
    const stillActive = jobStates.some((job) => ["queued", "creating", "uploading", "running"].includes(job.status));
    if (!stillActive) {
      clearActiveBatchRun();
    }
  }, [jobStates, defaultMode, activeJobId]);

  useEffect(() => {
    if (!state?.jobs?.length) return;
    setJobStates(
      state.jobs.map((job) => ({
        ...job,
        backendJobId: null,
        status: "queued",
        stage: "queued",
        message: "Waiting to start.",
        generatedImages: [],
        error: null,
      })),
    );
    setActiveJobId(state.jobs[0]?.id ?? null);
    hasStartedRef.current = false;
  }, [state]);

  useEffect(() => {
    if (jobStates.length === 0 || hasStartedRef.current) return;
    hasStartedRef.current = true;

    let cancelled = false;
    const updateJob = (jobId: string, updater: (job: BatchJobExecutionState) => BatchJobExecutionState) => {
      if (cancelled) return;
      setJobStates((prev) => prev.map((job) => (job.id === jobId ? updater(job) : job)));
    };

    void (async () => {
      for (const localJob of jobStatesRef.current) {
        if (cancelled) return;

        setActiveJobId(localJob.id);

        try {
          let currentJob = jobStatesRef.current.find((job) => job.id === localJob.id) ?? localJob;
          if (currentJob.status === "completed" || currentJob.status === "failed") {
            continue;
          }

          if (!currentJob.backendJobId) {
            updateJob(localJob.id, (job) => ({
              ...job,
              status: "creating",
              stage: "queued",
              message: "Creating backend job.",
              error: null,
            }));
            const createdJob = await createJob({
              brandName: localJob.productData.brandName,
              brandWebsite: localJob.productData.brandWebsite,
              productName: localJob.productData.productName,
              productCategory: localJob.productData.productCategory,
              socialLink1: localJob.productData.socialLinkInstagram || undefined,
              socialLink2: localJob.productData.socialLinkFacebook || undefined,
              socialLink3: localJob.productData.socialLinkLinkedin || undefined,
              socialLink4: localJob.productData.socialLinkX || undefined,
              additionalInput: localJob.productData.additionalInfo,
            });

            updateJob(localJob.id, (job) => ({
              ...job,
              backendJobId: createdJob.job_id,
              status: "uploading",
              stage: "queued",
              message: "Downloading source image and queuing the job.",
            }));
            currentJob = {
              ...currentJob,
              backendJobId: createdJob.job_id,
              status: "uploading",
              stage: "queued",
              message: "Downloading source image and queuing the job.",
            };
          }

          const backendJobId = currentJob.backendJobId;
          if (!backendJobId) {
            throw new Error("Missing backend job id.");
          }

          const sourceImageUrl = localJob.productData.productImages[0];
          if (!sourceImageUrl) {
            throw new Error("Batch row is missing an image URL.");
          }

          const liveJob = await getJob(backendJobId);
          const hasRawImage = liveJob.assets.some((asset) => asset.asset_type === "raw_image" && !asset.is_deleted);
          if (!hasRawImage) {
            await uploadRemoteJobAsset(backendJobId, sourceImageUrl);
          }

          const completionPromise = waitForJobCompletion(backendJobId, (update: JobEventPayload) => {
            updateJob(localJob.id, (job) => ({
              ...job,
              status: update.status === "failed" ? "failed" : update.status === "completed" ? "completed" : "running",
              stage: update.stage,
              message: update.message,
              error: update.status === "failed" ? update.message : null,
            }));
          });

          const result = await completionPromise;
          updateJob(localJob.id, (job) => ({
            ...job,
            backendJobId: result.jobId,
            status: result.status === "completed" ? "completed" : "failed",
            stage: result.currentStage,
            message: result.status === "completed" ? "Generated images are ready." : result.errorMessage,
            generatedImages: result.generatedImages,
            error: result.errorMessage,
          }));
        } catch (error) {
          updateJob(localJob.id, (job) => ({
            ...job,
            status: "failed",
            stage: job.stage ?? "pipeline",
            message: error instanceof Error ? error.message : "Batch job failed.",
            error: error instanceof Error ? error.message : "Batch job failed.",
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobStates.length]);

  if (jobStates.length === 0 || !activeJob) {
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
            images={activeJob.generatedImages}
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
                {jobStates.length} job{jobStates.length === 1 ? "" : "s"} ·{" "}
                {defaultMode === "video" ? "Images + video workflow" : "Images only workflow"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Jobs
            </p>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {jobStates.map((job, index) => {
                const isActive = job.id === activeJob.id;
                const ModeIcon = job.mode === "video" ? VideoIcon : ImageIcon;
                const StatusIcon =
                  job.status === "completed" ? CheckCircle2 : job.status === "failed" ? XCircle : Clock3;
                const statusTone =
                  job.status === "completed"
                    ? "text-green-500"
                    : job.status === "failed"
                      ? "text-destructive"
                      : "text-primary";

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
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                            <span>{job.productData.brandName || "Untitled brand"}</span>
                            <span className={`inline-flex items-center gap-1 ${statusTone}`}>
                              <StatusIcon className={`h-3 w-3 ${job.status === "running" ? "animate-spin" : ""}`} />
                              {job.status}
                            </span>
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

          <div className="lg:col-span-3">
            <GenerationResults
              productData={activeJob.productData}
              mode={effectiveMode === "video" ? "video" : "images"}
              generatedImages={activeJob.generatedImages}
              jobId={activeJob.backendJobId}
              isLoading={!["completed", "failed"].includes(activeJob.status)}
              error={activeJob.error}
              statusStage={activeJob.stage}
              statusMessage={activeJob.message}
              onBack={() => navigate("/dashboard")}
              onStartOver={() => {
                clearActiveBatchRun();
                navigate("/dashboard");
              }}
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
