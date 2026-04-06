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
  role: string;
  industry: string;
  default_image_model: "reve" | "gpt-image-1.5" | "gpt-image-1";
}

interface BackendMeResponse {
  user_id: string;
  email: string;
  display_name: string;
  role: "user" | "superadmin";
  industry: string;
  default_image_model: "reve" | "gpt-image-1.5" | "gpt-image-1";
  plan: "free" | "pro";
  member_since: string;
}

interface BackendAdminUserResponse {
  id: string;
  email: string;
  display_name: string;
  role: "user" | "superadmin";
  industry: string;
  default_image_model: "reve" | "gpt-image-1.5" | "gpt-image-1";
  plan: "free" | "pro" | string;
  created_at: string;
}

interface BackendPromptResponse {
  industry: string;
  prompt_text: string;
  shot_prompts: { key: string; label: string; prompt: string }[];
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
  batch_id?: string;
  total_jobs?: number;
}

interface BackendAssetResponse {
  id: string;
  job_id: string;
  generation_id?: string | null;
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

export interface BackendJobSummaryResponse {
  id: string;
  job_id: string;
  brand_name: string;
  product_name: string;
  job_type: string;
  image_model: "reve" | "flux-2-pro" | "gpt-image-1.5" | "gpt-image-1";
  requested_image_count: number;
  batch_id?: string;
  batch_name?: string;
  total_jobs?: number;
  status: string;
  current_stage: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendJobResponse extends BackendJobSummaryResponse {
  user_id: string;
  brand_website: string;
  product_category: string;
  social_link_1?: string | null;
  social_link_2?: string | null;
  social_link_3?: string | null;
  social_link_4?: string | null;
  additional_input?: Record<string, unknown> | null;
  video_duration_seconds: number;
  error_message?: string | null;
  storage_prefix: string;
  assets: BackendAssetResponse[];
  generations?: BackendJobGenerationResponse[];
}

interface BackendJobGenerationResponse {
  id: string;
  round_number: number;
  additional_description?: string | null;
  status: string;
  created_at: string;
  images: BackendAssetResponse[];
}

interface BackendJobListResponse {
  items: BackendJobSummaryResponse[];
  page: number;
  page_size: number;
  total: number;
}

interface BackendJobLogEntryResponse {
  level: string;
  stage: string | null;
  message: string;
  context: Record<string, unknown> | null;
  logged_at: string;
}

export interface AuthPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends AuthPayload {
  displayName: string;
  industry: string;
}

export interface UpdateProfilePayload {
  displayName?: string;
  industry?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface GenerateImagesInput {
  imageFiles: File[];
  brandName: string;
  brandWebsite: string;
  productName: string;
  productCategory: string;
  socialLink1?: string;
  socialLink2?: string;
  socialLink3?: string;
  socialLink4?: string;
  additionalInput?: Record<string, unknown>;
  requestedImageCount?: number;
}

export interface JobEventPayload {
  stage: string;
  status: string;
  message: string;
}

export interface JobLogEntry {
  level: string;
  stage: string | null;
  message: string;
  context: Record<string, unknown> | null;
  loggedAt: string;
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
  generations?: BackendJobGenerationResponse[];
  errorMessage: string | null;
}

export interface JobGenerationSummary {
  id: string;
  roundNumber: number;
  additionalDescription?: string | null;
  status: string;
  createdAt: string;
  images: string[];
}

export interface RegenerateImagesInput {
  additionalDescription: string;
  inputImages?: File[];
  shotTypes?: string[];
}

export interface AdminUserRecord {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "superadmin";
  industry: string;
  defaultImageModel: "reve" | "gpt-image-1.5";
  plan: string;
  createdAt: string;
}

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  displayName: string;
  role: "user" | "superadmin";
  industry: string;
  defaultImageModel: "reve" | "gpt-image-1.5";
  plan: string;
}

export interface AdminUpdateUserPayload {
  email?: string;
  password?: string;
  displayName?: string;
  role?: "user" | "superadmin";
  industry?: string;
  defaultImageModel?: "reve" | "gpt-image-1.5";
  plan?: string;
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
  const normalizedModel =
    payload.default_image_model === "gpt-image-1" ? "gpt-image-1.5" : payload.default_image_model;
  return {
    id: payload.user_id,
    name: payload.display_name,
    email: payload.email,
    avatar: buildAvatarUrl(payload.display_name || payload.email),
    plan: payload.plan,
    role: payload.role,
    industry: payload.industry,
    defaultImageModel: normalizedModel,
    memberSince: formatDate(payload.member_since),
  };
}

function mapAdminUser(payload: BackendAdminUserResponse): AdminUserRecord {
  const normalizedModel =
    payload.default_image_model === "gpt-image-1" ? "gpt-image-1.5" : payload.default_image_model;
  return {
    id: payload.id,
    email: payload.email,
    displayName: payload.display_name,
    role: payload.role,
    industry: payload.industry,
    defaultImageModel: normalizedModel,
    plan: payload.plan,
    createdAt: payload.created_at,
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
  const inProgress = payload.status !== "completed" && payload.status !== "failed" && payload.status !== "cancelled";
  return {
    id: payload.id,
    name: payload.name,
    genre: payload.type === "video" ? "Video" : "Images",
    theme: inProgress ? "Running" : payload.status,
    images: payload.images,
    date: formatDate(payload.date),
    status: inProgress ? "in-progress" : payload.status === "failed" || payload.status === "cancelled" ? "failed" : "completed",
    batch_id: payload.batch_id,
    total_jobs: payload.total_jobs,
  };
}

function assetUrl(asset: BackendAssetResponse): string | null {
  return asset.presigned_url ?? null;
}

function pickDisplayGeneration(
  generations: JobGenerationSummary[],
  preferredGenerationId?: string | null,
): JobGenerationSummary | null {
  if (preferredGenerationId) {
    const preferred = generations.find((generation) => generation.id === preferredGenerationId);
    if (preferred && preferred.images.length > 0) {
      return preferred;
    }
  }

  return [...generations].reverse().find((generation) => generation.images.length > 0) ?? generations[generations.length - 1] ?? null;
}

function mapProject(job: BackendJobResponse, summary?: BackendJobSummaryResponse): Project {
  const additionalInput = job.additional_input ?? {};
  const dimensions =
    typeof additionalInput.dimensions === "string" ? additionalInput.dimensions : undefined;
  const productDescription =
    typeof additionalInput.product_description === "string"
      ? additionalInput.product_description
      : undefined;
  const additionalInfo = Object.fromEntries(
    Object.entries(additionalInput).filter(
      ([key, value]) =>
        key !== "dimensions" &&
        key !== "product_description" &&
        value !== null &&
        value !== undefined &&
        String(value).trim().length > 0,
    ),
  ) as Record<string, string>;
  const socialLinks = [
    job.social_link_1,
    job.social_link_2,
    job.social_link_3,
    job.social_link_4,
  ].filter((value): value is string => Boolean(value));
  const rawImages = job.assets
    .filter((asset) => asset.asset_type === "raw_image" && !asset.is_deleted)
    .map((asset) => assetUrl(asset))
    .filter((value): value is string => Boolean(value));
  const generations = (job.generations ?? [])
    .map((generation) => ({
      id: generation.id,
      roundNumber: generation.round_number,
      additionalDescription: generation.additional_description ?? undefined,
      status: generation.status,
      createdAt: generation.created_at,
      images: generation.images
        .map((asset) => assetUrl(asset))
        .filter((value): value is string => Boolean(value)),
    }))
    .sort((a, b) => a.roundNumber - b.roundNumber);
  const activeGeneration = pickDisplayGeneration(generations);
  const fallbackGeneratedImages = job.assets
    .filter((asset) => asset.asset_type === "generated_image" && !asset.is_deleted)
    .map((asset) => assetUrl(asset))
    .filter((value): value is string => Boolean(value));
  const generatedImages = activeGeneration && activeGeneration.images.length > 0 ? activeGeneration.images : fallbackGeneratedImages;
  const thumbnail =
    rawImages[0] ||
    generatedImages[0] ||
    "";
  return {
    id: job.job_id,
    name: summary?.batch_name || summary?.product_name || job.batch_name || job.product_name,
    type: job.job_type === "video" ? "video" : "images",
    status:
      (summary?.status || job.status) === "completed"
        ? "completed"
        : (summary?.status || job.status) === "cancelled"
          ? "cancelled"
          : (summary?.status || job.status) === "failed"
            ? "failed"
            : "processing",
    createdAt: job.created_at,
    thumbnail,
    batch_id: summary?.batch_id || job.batch_id,
    total_jobs: summary?.total_jobs || job.total_jobs,
    detail: {
      brandName: job.brand_name,
      productName: job.product_name,
      productCategory: job.product_category,
      productDescription,
      brandWebsite: job.brand_website,
      dimensions,
      socialLinks,
      additionalInfo,
      inputImages: rawImages,
      images: generatedImages,
      activeGenerationId: activeGeneration?.id ?? null,
      generations,
      imageModel: summary?.image_model ?? job.image_model,
      requestedImageCount: summary?.requested_image_count ?? job.requested_image_count,
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
        industry: payload.industry,
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

export async function updateCurrentUser(payload: UpdateProfilePayload): Promise<UserProfile> {
  const response = await apiJson<BackendMeResponse>(
    "/auth/me",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        display_name: payload.displayName,
        industry: payload.industry,
      }),
    },
    true,
  );
  return mapUserProfile(response);
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await apiJson<{ ok: boolean }>(
    "/auth/change-password",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        current_password: payload.currentPassword,
        new_password: payload.newPassword,
        confirm_new_password: payload.confirmNewPassword,
      }),
    },
    true,
  );
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

export async function createJob(
  input: Omit<GenerateImagesInput, "imageFiles"> & { batch_id?: string; batch_name?: string },
): Promise<BackendJobSummaryResponse> {
  return apiJson<BackendJobSummaryResponse>(
    "/jobs",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job_type: "image",
        requested_image_count: input.requestedImageCount ?? 4,
        brand_name: input.brandName,
        brand_website: input.brandWebsite,
        product_name: input.productName,
        product_category: input.productCategory,
        social_link_1: input.socialLink1,
        social_link_2: input.socialLink2,
        social_link_3: input.socialLink3,
        social_link_4: input.socialLink4,
        additional_input: input.additionalInput,
        batch_id: input.batch_id,
        batch_name: input.batch_name,
      }),
    },
    true,
  );
}


export async function getBatchJobs(batchId: string): Promise<BackendJobSummaryResponse[]> {
  return apiJson<BackendJobSummaryResponse[]>(`/batches/${encodeURIComponent(batchId)}`, {}, true);
}


export async function downloadBatchArchive(batchId: string, filename: string): Promise<void> {
  const response = await apiFetch(`/batches/${encodeURIComponent(batchId)}/download`, {}, true);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function uploadJobAsset(jobId: string, files: File[]): Promise<BackendAssetResponse[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("asset_type", "raw_image");
  formData.append("stage", "raw");
  return apiJson<BackendAssetResponse[]>(
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

export async function uploadRemoteFolderAssets(jobId: string, folderUrl: string, maxImages = 5): Promise<BackendAssetResponse[]> {
  return apiJson<BackendAssetResponse[]>(
    `/jobs/${encodeURIComponent(jobId)}/assets/remote-folder`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ folder_url: folderUrl, max_images: maxImages }),
    },
    true,
  );
}

export async function getJob(jobId: string): Promise<BackendJobResponse> {
  return apiJson<BackendJobResponse>(`/jobs/${encodeURIComponent(jobId)}`, {}, true);
}

export async function regenerateJobImages(jobId: string, input: RegenerateImagesInput): Promise<JobGenerationSummary> {
  const formData = new FormData();
  formData.append("additional_description", input.additionalDescription);
  (input.shotTypes ?? []).forEach((shotType) => formData.append("shot_types", shotType));
  (input.inputImages ?? []).forEach((file) => formData.append("input_images", file));

  const response = await apiJson<BackendJobGenerationResponse>(
    `/jobs/${encodeURIComponent(jobId)}/regenerate-images`,
    {
      method: "POST",
      body: formData,
    },
    true,
  );
  return {
    id: response.id,
    roundNumber: response.round_number,
    additionalDescription: response.additional_description ?? undefined,
    status: response.status,
    createdAt: response.created_at,
    images: [],
  };
}

export async function cancelJob(jobId: string): Promise<{ ok: boolean; status: string; signal_sent?: boolean }> {
  return apiJson<{ ok: boolean; status: string; signal_sent?: boolean }>(
    `/jobs/${encodeURIComponent(jobId)}/cancel`,
    {
      method: "POST",
    },
    true,
  );
}

export async function adminListUsers(): Promise<AdminUserRecord[]> {
  const response = await apiJson<BackendAdminUserResponse[]>("/admin/users", {}, true);
  return response.map(mapAdminUser);
}

export async function adminCreateUser(payload: AdminCreateUserPayload): Promise<AdminUserRecord> {
  const response = await apiJson<BackendAdminUserResponse>(
    "/admin/users",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        display_name: payload.displayName,
        role: payload.role,
        industry: payload.industry,
        default_image_model: payload.defaultImageModel,
        plan: payload.plan,
      }),
    },
    true,
  );
  return mapAdminUser(response);
}

export async function adminUpdateUser(userId: string, payload: AdminUpdateUserPayload): Promise<AdminUserRecord> {
  const response = await apiJson<BackendAdminUserResponse>(
    `/admin/users/${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        display_name: payload.displayName,
        role: payload.role,
        industry: payload.industry,
        default_image_model: payload.defaultImageModel,
        plan: payload.plan,
      }),
    },
    true,
  );
  return mapAdminUser(response);
}

export async function adminDeleteUser(userId: string): Promise<void> {
  await apiJson<{ ok: boolean }>(`/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" }, true);
}

export async function adminListDefaultPrompts(): Promise<BackendPromptResponse[]> {
  return apiJson<BackendPromptResponse[]>("/admin/prompts/defaults", {}, true);
}

export async function adminUpdateDefaultPrompt(industry: string, promptText: string): Promise<BackendPromptResponse> {
  return apiJson<BackendPromptResponse>(
    `/admin/prompts/defaults/${encodeURIComponent(industry)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt_text: promptText }),
    },
    true,
  );
}

export async function adminGetUserPromptOverride(userId: string, industry: string): Promise<BackendPromptResponse | null> {
  try {
    return await apiJson<BackendPromptResponse>(
      `/admin/users/${encodeURIComponent(userId)}/prompts/${encodeURIComponent(industry)}`,
      {},
      true,
    );
  } catch {
    return null;
  }
}

export async function adminSetUserPromptOverride(
  userId: string,
  industry: string,
  promptText: string,
  shotPrompts?: { key: string; label: string; prompt: string }[],
): Promise<BackendPromptResponse> {
  return apiJson<BackendPromptResponse>(
    `/admin/users/${encodeURIComponent(userId)}/prompts/${encodeURIComponent(industry)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt_text: promptText, shot_prompts: shotPrompts }),
    },
    true,
  );
}

export async function adminDeleteUserPromptOverride(userId: string, industry: string): Promise<void> {
  await apiJson<{ ok: boolean }>(
    `/admin/users/${encodeURIComponent(userId)}/prompts/${encodeURIComponent(industry)}`,
    { method: "DELETE" },
    true,
  );
}

export async function getJobLogs(jobId: string): Promise<JobLogEntry[]> {
  const response = await apiJson<BackendJobLogEntryResponse[]>(
    `/jobs/${encodeURIComponent(jobId)}/logs`,
    {},
    true,
  );
  return response.map((entry) => ({
    level: entry.level,
    stage: entry.stage,
    message: entry.message,
    context: entry.context,
    loggedAt: entry.logged_at,
  }));
}

export async function adminGetUserJobLogs(userId: string, jobId: string): Promise<JobLogEntry[]> {
  const response = await apiJson<BackendJobLogEntryResponse[]>(
    `/admin/users/${encodeURIComponent(userId)}/jobs/${encodeURIComponent(jobId)}/logs`,
    {},
    true,
  );
  return response.map((entry) => ({
    level: entry.level,
    stage: entry.stage,
    message: entry.message,
    context: entry.context,
    loggedAt: entry.logged_at,
  }));
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
  // Avoid hanging when the job completes before SSE subscription starts.
  const preflight = await getJob(jobId);
  if (preflight.status === "completed") {
    onStatus({ stage: preflight.current_stage ?? "pipeline", status: "completed", message: "Completed." });
  } else if (preflight.status === "failed") {
    onStatus({
      stage: preflight.current_stage ?? "pipeline",
      status: "failed",
      message: preflight.error_message ?? "Image generation failed.",
    });
    throw new Error(preflight.error_message ?? "Image generation failed.");
  } else if (preflight.status === "cancelled") {
    onStatus({
      stage: preflight.current_stage ?? "pipeline",
      status: "cancelled",
      message: preflight.error_message ?? "User cancelled the job.",
    });
    throw new Error(preflight.error_message ?? "User cancelled the job.");
  }

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
        } else if (payload.status === "cancelled") {
          settled = true;
          subscription.close();
          reject(new Error(payload.message || "User cancelled the job."));
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
  const mappedGenerations = (job.generations ?? [])
    .map((generation) => ({
      roundNumber: generation.round_number,
      images: generation.images
        .map((asset) => assetUrl(asset))
        .filter((value): value is string => Boolean(value)),
    }))
    .sort((a, b) => a.roundNumber - b.roundNumber);
  const generatedImages =
    [...mappedGenerations].reverse().find((generation) => generation.images.length > 0)?.images ??
    job.assets
      .filter((asset) => asset.asset_type === "generated_image" && !asset.is_deleted)
      .map((asset) => assetUrl(asset))
      .filter((value): value is string => Boolean(value));
  return {
    jobId: job.job_id,
    status: job.status,
    currentStage: job.current_stage,
    generatedImages,
    assets: job.assets,
    generations: job.generations,
    errorMessage: job.error_message ?? null,
  };
}

export async function getProjects(): Promise<Project[]> {
  const response = await apiJson<BackendJobListResponse>("/jobs?page=1&page_size=50", {}, true);
  const jobs = await Promise.allSettled(
    response.items.map(async (item) => ({
      summary: item,
      job: await getJob(item.job_id),
    })),
  );
  return jobs
    .filter(
      (result): result is PromiseFulfilledResult<{ summary: BackendJobSummaryResponse; job: BackendJobResponse }> =>
        result.status === "fulfilled",
    )
    .map((result) => mapProject(result.value.job, result.value.summary));
}

export async function adminGetUserProjects(userId: string): Promise<Project[]> {
  const response = await apiJson<BackendJobListResponse>(
    `/admin/users/${encodeURIComponent(userId)}/jobs?page=1&page_size=50`,
    {},
    true,
  );
  const jobs = await Promise.allSettled(
    response.items.map(async (item) => ({
      summary: item,
      job: await apiJson<BackendJobResponse>(
        `/admin/users/${encodeURIComponent(userId)}/jobs/${encodeURIComponent(item.job_id)}`,
        {},
        true,
      ),
    })),
  );
  return jobs
    .filter(
      (result): result is PromiseFulfilledResult<{ summary: BackendJobSummaryResponse; job: BackendJobResponse }> =>
        result.status === "fulfilled",
    )
    .map((result) => mapProject(result.value.job, result.value.summary));
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const job = await getJob(id);
    return mapProject(job);
  } catch {
    return null;
  }
}

export async function adminGetUserProjectById(userId: string, jobId: string): Promise<Project | null> {
  try {
    const job = await apiJson<BackendJobResponse>(
      `/admin/users/${encodeURIComponent(userId)}/jobs/${encodeURIComponent(jobId)}`,
      {},
      true,
    );
    return mapProject(job);
  } catch {
    return null;
  }
}

export async function deleteProject(id: string): Promise<void> {
  await apiFetch(`/jobs/${encodeURIComponent(id)}`, { method: "DELETE" }, true);
}


export async function deleteBatch(batchId: string): Promise<void> {
  await apiFetch(`/batches/${encodeURIComponent(batchId)}`, { method: "DELETE" }, true);
}

export async function downloadFile(url: string, fallbackFilename = "download.bin"): Promise<void> {
  const anchor = document.createElement("a");
  anchor.download = inferFilename(url, fallbackFilename);
  document.body.appendChild(anchor);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    anchor.href = blobUrl;
    anchor.click();
    window.URL.revokeObjectURL(blobUrl);
    return;
  } catch {
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
    return;
  } finally {
    anchor.remove();
  }
}

export async function downloadJobImagesArchive(
  jobId: string,
  fallbackFilename: string,
  generationId?: string | null,
): Promise<void> {
  const params = new URLSearchParams();
  if (generationId) {
    params.set("generation_id", generationId);
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await apiFetch(`/jobs/${encodeURIComponent(jobId)}/download/images${suffix}`, {}, true);
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = `${fallbackFilename}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function downloadJobImage(
  jobId: string,
  index: number,
  fallbackFilename: string,
  generationId?: string | null,
): Promise<void> {
  const params = new URLSearchParams({
    index: String(index),
  });
  if (generationId) {
    params.set("generation_id", generationId);
  }
  const response = await apiFetch(`/jobs/${encodeURIComponent(jobId)}/download/image?${params.toString()}`, {}, true);
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fallbackFilename;
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
