import {
  mockUser,
  mockUsage,
  mockProBenefits,
  mockRecentProjects,
  mockProjects,
  mockTrendingTracks,
  mockRoyaltyFreeTracks,
  mockVideoDurations,
  mockVideoStyles,
  mockLandingGalleryImages,
  type UserProfile,
  type UsageSummary,
  type Project,
  type RecentProjectSummary,
  type AudioTrack,
  type VideoPresetDuration,
  type VideoStylePreset,
  type LandingGalleryImage,
} from "./mock_data";

// In the future this will use VITE_API_URL and real fetch calls.
// For now, we centralize all data access here so components don't
// depend on hardcoded mock data.

export type {
  UserProfile,
  UsageSummary,
  Project,
  RecentProjectSummary,
  AudioTrack,
  VideoPresetDuration,
  VideoStylePreset,
  LandingGalleryImage,
};

// Simulate async latency to match a real API.
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function getCurrentUser(): Promise<UserProfile> {
  await delay(100);
  return mockUser;
}

export async function getUsageSummary(): Promise<UsageSummary> {
  await delay(100);
  return mockUsage;
}

export async function getProBenefits(): Promise<string[]> {
  await delay(50);
  return mockProBenefits;
}

export async function getRecentProjects(): Promise<RecentProjectSummary[]> {
  await delay(120);
  return mockRecentProjects;
}

export async function getProjects(): Promise<Project[]> {
  await delay(150);
  return mockProjects;
}

export async function getProjectById(id: string): Promise<Project | null> {
  await delay(120);
  return mockProjects.find((p) => p.id === id) ?? null;
}

export async function deleteProject(id: string): Promise<void> {
  // Placeholder – backend will handle persistence later.
  await delay(80);
  console.info("deleteProject called for", id);
}

export async function getAudioTracks(): Promise<{
  trending: AudioTrack[];
  royaltyFree: AudioTrack[];
}> {
  await delay(120);
  return {
    trending: mockTrendingTracks,
    royaltyFree: mockRoyaltyFreeTracks,
  };
}

export async function getVideoPresets(): Promise<{
  durations: VideoPresetDuration[];
  styles: VideoStylePreset[];
}> {
  await delay(80);
  return {
    durations: mockVideoDurations,
    styles: mockVideoStyles,
  };
}

export async function getLandingGalleryImages(): Promise<LandingGalleryImage[]> {
  await delay(80);
  return mockLandingGalleryImages;
}


