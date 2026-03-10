import {
  mockLandingGalleryImages,
  mockTrendingTracks,
  mockRoyaltyFreeTracks,
  mockVideoDurations,
  mockVideoStyles,
  type AudioTrack,
  type LandingGalleryImage,
  type Project,
  type RecentProjectSummary,
  type UsageSummary,
  type UserProfile,
  type VideoPresetDuration,
  type VideoStylePreset,
} from "./mock_data";

export type {
  AudioTrack,
  LandingGalleryImage,
  Project,
  RecentProjectSummary,
  UsageSummary,
  UserProfile,
  VideoPresetDuration,
  VideoStylePreset,
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";
const SESSION_STORAGE_KEY = "contentpro.auth";

interface StoredSession {
  accessToken: string;
}

interface BackendTokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  display_name: string;
}

interface BackendMeResponse {
  user_id: string;
  email: string;
  display_name: string;
  plan: "free" | "pro";
  member_since: string;
}

interface BackendUsageResponse {
  plan: "free" | "pro";
  credits_used: number;
  credits_total: number;
  images_this_month: number;
  videos_this_month: number;
  reset_date: string;
}

interface BackendRecentJobResponse {
  id: string;
  name: string;
  type: string;
  status: string;
  images: number;
  date: string;
}

interface BackendAssetResponse {
  id: string;
  job_id: string;
  asset_type: string;
  stage: string;
  storage_key: string;
  original_filename: string | null;
  mime_type: string;
  size_bytes: number | null;
  metadata?: Record<string, unknown> | null;
  is_deleted: boolean;
  created_at: string;
  presigned_url?: string | null;
}

interface BackendJobSummaryResponse {
  id: string;
  job_id: string;
  brand_name: string;
  product_name: string;
  job_type: string;
  status: string;
  current_stage: string | null;
  created_at: string;
  updated_at: string;
}

interface BackendJobResponse extends BackendJobSummaryResponse {
  user_id: string;
  brand_website: string;
  product_category: string;
  social_link_1?: string | null;
  social_link_2?: string | null;
  social_link_3?: string | null;
  social_link_4?: string | null;
  video_duration_seconds: number;
  error_message?: string | null;
  storage_prefix: string;
  assets: BackendAssetResponse[];
}

interface BackendJobListResponse {
  items: BackendJobSummaryResponse[];
  page: number;
  page_size: number;
  total: number;
}

export interface AuthPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends AuthPayload {
  displayName: string;
}

export interface GenerateImagesInput {
  imageFile: File;
  brandName: string;
  brandWebsite: string;
  productName: string;
  productCategory: string;
  socialLink1?: string;
  socialLink2?: string;
  socialLink3?: string;
  socialLink4?: string;
}

export interface JobEventPayload {
  stage: string;
  status: string;
  message: string;
}

export interface JobSubscription {
  close: () => void;
}

export interface GeneratedImageResult {
  jobId: string;
  status: string;
  currentStage: string | null;
  generatedImages: string[];
  assets: BackendAssetResponse[];
  errorMessage: string | null;
}

function inferFilename(url: string, fallback: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.split("/").filter(Boolean).pop();
    if (path) return decodeURIComponent(path);
  } catch {
    // ignore
  }
  return fallback;
}

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session: StoredSession | null): void {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function getStoredAccessToken(): string | null {
  return readStoredSession()?.accessToken ?? null;
}

export function setStoredAccessToken(token: string): void {
  storeToken(token);
}

export function clearStoredSession(): void {
  writeStoredSession(null);
}

function storeToken(token: string): void {
  writeStoredSession({ accessToken: token });
}

function buildAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function mapUserProfile(payload: BackendMeResponse): UserProfile {
  return {
    id: payload.user_id,
    name: payload.display_name,
    email: payload.email,
    avatar: buildAvatarUrl(payload.display_name || payload.email),
    plan: payload.plan,
    memberSince: formatDate(payload.member_since),
  };
}

function mapUsage(payload: BackendUsageResponse): UsageSummary {
  return {
    plan: payload.plan,
    creditsUsed: payload.credits_used,
    creditsTotal: payload.credits_total,
    imagesThisMonth: payload.images_this_month,
    videosThisMonth: payload.videos_this_month,
    resetDate: formatDate(payload.reset_date),
  };
}

function mapRecentProject(payload: BackendRecentJobResponse): RecentProjectSummary {
  const inProgress = payload.status !== "completed" && payload.status !== "failed";
  return {
    id: payload.id,
    name: payload.name,
    genre: payload.type === "video" ? "Video" : "Images",
    theme: inProgress ? "Running" : payload.status,
    images: payload.images,
    date: formatDate(payload.date),
    status: inProgress ? "in-progress" : "completed",
  };
}

function assetUrl(asset: BackendAssetResponse): string | null {
  return asset.presigned_url ?? null;
}

function mapProject(job: BackendJobResponse): Project {
  const generatedImages = job.assets
    .filter((asset) => asset.asset_type === "generated_image" && !asset.is_deleted)
    .map((asset) => assetUrl(asset))
    .filter((value): value is string => Boolean(value));
  const thumbnail =
    generatedImages[0] ||
    job.assets
      .filter((asset) => asset.asset_type === "raw_image" && !asset.is_deleted)
      .map((asset) => assetUrl(asset))
      .find((value): value is string => Boolean(value)) ||
    "";
  return {
    id: job.job_id,
    name: job.product_name,
    type: job.job_type === "video" ? "video" : "images",
    status:
      job.status === "completed"
        ? "completed"
        : job.status === "failed"
          ? "failed"
          : "processing",
    createdAt: job.created_at,
    thumbnail,
    detail: {
      brandName: job.brand_name,
      productName: job.product_name,
      productCategory: job.product_category,
      brandWebsite: job.brand_website,
      images: generatedImages,
    },
  };
}

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    // ignore
  }
  return `Request failed with status ${response.status}`;
}

async function apiFetch(path: string, init: RequestInit = {}, auth = false): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  if (auth) {
    const token = getStoredAccessToken();
    if (!token) {
      throw new Error("Please sign in before creating a job.");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearStoredSession();
    }
    throw new Error(await parseErrorResponse(response));
  }
  return response;
}

async function apiJson<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const response = await apiFetch(path, init, auth);
  return (await response.json()) as T;
}

async function persistSessionFromTokenResponse(payload: BackendTokenResponse): Promise<UserProfile> {
  storeToken(payload.access_token);
  return getCurrentUser();
}

export async function registerAccount(payload: RegisterPayload): Promise<UserProfile> {
  const response = await apiJson<BackendTokenResponse>(
    "/auth/register",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        display_name: payload.displayName,
      }),
    },
    false,
  );
  return persistSessionFromTokenResponse(response);
}

export async function loginAccount(payload: AuthPayload): Promise<UserProfile> {
  const response = await apiJson<BackendTokenResponse>(
    "/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    false,
  );
  return persistSessionFromTokenResponse(response);
}

export async function getCurrentUser(): Promise<UserProfile> {
  const response = await apiJson<BackendMeResponse>("/auth/me", {}, true);
  return mapUserProfile(response);
}

export function getGoogleLoginUrl(nextPath = "/dashboard"): string {
  const url = new URL(`${API_BASE_URL}/auth/google/login`);
  url.searchParams.set("next_path", nextPath);
  return url.toString();
}

export async function getUsageSummary(): Promise<UsageSummary> {
  const response = await apiJson<BackendUsageResponse>("/usage", {}, true);
  return mapUsage(response);
}

export async function getProBenefits(): Promise<string[]> {
  return apiJson<string[]>("/benefits", {}, true);
}

export async function getRecentProjects(): Promise<RecentProjectSummary[]> {
  const response = await apiJson<BackendRecentJobResponse[]>("/jobs/recent", {}, true);
  return response.map(mapRecentProject);
}

export async function createJob(input: Omit<GenerateImagesInput, "imageFile">): Promise<BackendJobSummaryResponse> {
  return apiJson<BackendJobSummaryResponse>(
    "/jobs",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job_type: "image",
        brand_name: input.brandName,
        brand_website: input.brandWebsite,
        product_name: input.productName,
        product_category: input.productCategory,
        social_link_1: input.socialLink1,
        social_link_2: input.socialLink2,
        social_link_3: input.socialLink3,
        social_link_4: input.socialLink4,
      }),
    },
    true,
  );
}

export async function uploadJobAsset(jobId: string, file: File): Promise<BackendAssetResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("asset_type", "raw_image");
  formData.append("stage", "raw");
  return apiJson<BackendAssetResponse>(
    `/jobs/${encodeURIComponent(jobId)}/assets`,
    {
      method: "POST",
      body: formData,
    },
    true,
  );
}

export async function uploadRemoteJobAsset(jobId: string, imageUrl: string): Promise<BackendAssetResponse> {
  return apiJson<BackendAssetResponse>(
    `/jobs/${encodeURIComponent(jobId)}/assets/remote`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image_url: imageUrl }),
    },
    true,
  );
}

export async function getJob(jobId: string): Promise<BackendJobResponse> {
  return apiJson<BackendJobResponse>(`/jobs/${encodeURIComponent(jobId)}`, {}, true);
}

export function subscribeToJobEvents(
  jobId: string,
  handlers: {
    onStatus: (payload: JobEventPayload) => void;
    onError?: (message: string) => void;
  },
): JobSubscription {
  const token = getStoredAccessToken();
  if (!token) {
    throw new Error("Please sign in before creating a job.");
  }

  const url = new URL(`${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/events`);
  url.searchParams.set("access_token", token);

  const eventSource = new EventSource(url.toString());
  const handleMessage = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as JobEventPayload;
      handlers.onStatus(payload);
    } catch {
      handlers.onError?.("Received an unreadable job event from the server.");
    }
  };

  eventSource.addEventListener("status", handleMessage as EventListener);
  eventSource.onmessage = handleMessage;
  eventSource.onerror = () => {
    handlers.onError?.("Live job updates were interrupted.");
  };

  return {
    close: () => eventSource.close(),
  };
}

export async function waitForJobCompletion(
  jobId: string,
  onStatus: (payload: JobEventPayload) => void,
): Promise<GeneratedImageResult> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const subscription = subscribeToJobEvents(jobId, {
      onStatus: (payload) => {
        onStatus(payload);
        if (payload.status === "completed") {
          settled = true;
          subscription.close();
          resolve();
        } else if (payload.status === "failed") {
          settled = true;
          subscription.close();
          reject(new Error(payload.message || "Image generation failed."));
        }
      },
      onError: (message) => {
        if (settled) return;
        settled = true;
        subscription.close();
        reject(new Error(message));
      },
    });
  });

  const job = await getJob(jobId);
  const generatedImages = job.assets
    .filter((asset) => asset.asset_type === "generated_image" && !asset.is_deleted)
    .map((asset) => assetUrl(asset))
    .filter((value): value is string => Boolean(value));
  return {
    jobId: job.job_id,
    status: job.status,
    currentStage: job.current_stage,
    generatedImages,
    assets: job.assets,
    errorMessage: job.error_message ?? null,
  };
}

export async function getProjects(): Promise<Project[]> {
  const response = await apiJson<BackendJobListResponse>("/jobs?page=1&page_size=50", {}, true);
  const jobs = await Promise.allSettled(response.items.map((item) => getJob(item.job_id)));
  return jobs
    .filter((result): result is PromiseFulfilledResult<BackendJobResponse> => result.status === "fulfilled")
    .map((result) => mapProject(result.value));
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const job = await getJob(id);
    return mapProject(job);
  } catch {
    return null;
  }
}

export async function deleteProject(id: string): Promise<void> {
  await apiFetch(`/jobs/${encodeURIComponent(id)}`, { method: "DELETE" }, true);
}

export async function downloadFile(url: string, fallbackFilename = "download.bin"): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = inferFilename(url, fallbackFilename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function getAudioTracks(): Promise<{
  trending: AudioTrack[];
  royaltyFree: AudioTrack[];
}> {
  await delay(50);
  return {
    trending: mockTrendingTracks,
    royaltyFree: mockRoyaltyFreeTracks,
  };
}

export async function getVideoPresets(): Promise<{
  durations: VideoPresetDuration[];
  styles: VideoStylePreset[];
}> {
  await delay(50);
  return {
    durations: mockVideoDurations,
    styles: mockVideoStyles,
  };
}

export async function getLandingGalleryImages(): Promise<LandingGalleryImage[]> {
  await delay(30);
  return mockLandingGalleryImages;
}
