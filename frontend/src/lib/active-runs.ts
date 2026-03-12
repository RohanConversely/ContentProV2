import type { ProductFormData } from "@/components/CreationWizard";
import type { GeneratedImageResult, JobEventPayload } from "@/lib/api";

const SINGLE_RUN_KEY = "contentpro.active.single";
const BATCH_RUN_KEY = "contentpro.active.batch";

export interface PersistedSingleRun {
  mode: string;
  formData: ProductFormData;
  jobId: string | null;
  isGenerating: boolean;
  generationError: string | null;
  generationResult: GeneratedImageResult | null;
  jobUpdate: JobEventPayload | null;
  jobTimeline: JobEventPayload[];
}

export interface PersistedBatchRunPayload {
  id: string;
  mode: "images" | "video";
  sourceType: "image_link" | "drive_folder";
  batch_id?: string;
  batch_name?: string;
  productData: ProductFormData;
}

export interface PersistedBatchJobState extends PersistedBatchRunPayload {
  backendJobId: string | null;
  status: "queued" | "creating" | "uploading" | "running" | "completed" | "failed";
  stage: string | null;
  message: string | null;
  generatedImages: string[];
  error: string | null;
}

export interface PersistedBatchRun {
  mode: "images" | "video";
  jobs: PersistedBatchRunPayload[];
  jobStates: PersistedBatchJobState[];
  activeJobId: string | null;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function writeJson<T>(key: string, value: T | null): void {
  if (typeof window === "undefined") return;
  if (value === null) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readActiveSingleRun(): PersistedSingleRun | null {
  return readJson<PersistedSingleRun>(SINGLE_RUN_KEY);
}

export function writeActiveSingleRun(value: PersistedSingleRun | null): void {
  writeJson(SINGLE_RUN_KEY, value);
}

export function clearActiveSingleRun(): void {
  writeJson(SINGLE_RUN_KEY, null);
}

export function readActiveBatchRun(): PersistedBatchRun | null {
  const value = readJson<PersistedBatchRun>(BATCH_RUN_KEY);
  if (!value) return null;

  const hasActiveJobs = value.jobStates.some((job) =>
    ["queued", "creating", "uploading", "running"].includes(job.status),
  );
  if (hasActiveJobs) {
    return value;
  }

  clearActiveBatchRun();
  return null;
}

export function writeActiveBatchRun(value: PersistedBatchRun | null): void {
  writeJson(BATCH_RUN_KEY, value);
}

export function clearActiveBatchRun(): void {
  writeJson(BATCH_RUN_KEY, null);
}
