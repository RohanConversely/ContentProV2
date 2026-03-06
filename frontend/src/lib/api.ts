import type { User, Project, GeneratedImage, AudioOption } from "./types";
import { mockUser, mockProjects, mockGeneratedImages, mockAudioOptions } from "./mock_data";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Helper for API calls
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authApi = {
  googleLogin: () => fetchApi<User>("/auth/google", { method: "POST" }),
  logout: () => fetchApi<void>("/auth/logout", { method: "POST" }),
  me: () => fetchApi<User>("/auth/me"),
};

// User API
export const userApi = {
  getProfile: () => fetchApi<User>("/user/profile"),
  updateProfile: (data: Partial<User>) =>
    fetchApi<User>("/user/profile", { method: "PUT", body: JSON.stringify(data) }),
  getSubscription: () => fetchApi<User["credits"]>("/user/subscription"),
};

// Projects API
export const projectsApi = {
  list: () => fetchApi<Project[]>("/projects"),
  get: (id: string) => fetchApi<Project>(`/projects/${id}`),
  delete: (id: string) => fetchApi<void>(`/projects/${id}`, { method: "DELETE" }),
};

// Image Generation API
export const imageGenerationApi = {
  create: (data: FormData) =>
    fetch<{ id: string }>("/generate/images", {
      method: "POST",
      body: data,
    }).then(res => res.json()),
  getStatus: (id: string) => fetchApi<{ status: string; progress: number }>(`/generate/images/${id}`),
  getResult: (id: string) => fetchApi<GeneratedImage[]>(`/generate/images/${id}/result`),
};

// Video Generation API
export const videoGenerationApi = {
  create: (data: FormData) =>
    fetch<{ id: string }>("/generate/video", {
      method: "POST",
      body: data,
    }).then(res => res.json()),
  getStatus: (id: string) => fetchApi<{ status: string; progress: number }>(`/generate/video/${id}`),
  getResult: (id: string) => fetchApi<{ video: string }>(`/generate/video/${id}/result`),
  addAudio: (videoId: string, audioId: string) =>
    fetchApi<void>(`/video/${videoId}/audio`, {
      method: "POST",
      body: JSON.stringify({ audioId }),
    }),
};

// Audio API
export const audioApi = {
  getOptions: () => fetchApi<AudioOption[]>("/audio/options"),
};

// Mock API functions (for demo before backend is ready)
export const mockApi = {
  getUser: () => Promise.resolve(mockUser),
  getProjects: () => Promise.resolve(mockProjects),
  getGeneratedImages: () => Promise.resolve(mockGeneratedImages),
  getAudioOptions: () => Promise.resolve(mockAudioOptions),
};
