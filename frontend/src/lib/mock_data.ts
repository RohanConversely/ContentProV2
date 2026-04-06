import type { ProductFormData } from "@/components/CreationWizard";

export type PlanType = "free" | "pro";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: PlanType;
  role: "user" | "superadmin";
  industry: string;
  defaultImageModel: "reve" | "gpt-image-1.5" | "gpt-batch-api";
  defaultBatchModel: "reve" | "gpt-image-1.5" | "gpt-batch-api";
  memberSince: string;
}

export interface UsageSummary {
  plan: PlanType;
  creditsUsed: number;
  creditsTotal: number;
  imagesThisMonth: number;
  videosThisMonth: number;
  resetDate: string;
}

export interface RecentProjectSummary {
  id: string | number;
  name: string;
  genre: string;
  theme: string;
  images: number;
  date: string;
  status: "completed" | "in-progress" | "failed";
  batch_id?: string;
  total_jobs?: number;
}

export interface ProjectDetail {
  brandName: string;
  productName: string;
  productCategory: string;
  imageModel?: string;
  requestedImageCount?: number;
  productDescription?: string;
  brandWebsite?: string;
  dimensions?: string;
  socialLinks?: string[];
  additionalInfo?: Record<string, string>;
  inputImages?: string[];
  images: string[];
  activeGenerationId?: string | null;
  generations?: {
    id: string;
    roundNumber: number;
    additionalDescription?: string;
    status: string;
    createdAt: string;
    images: string[];
  }[];
  videoUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  type: "images" | "video";
  status: "processing" | "completed" | "failed" | "cancelled";
  createdAt: string;
  thumbnail: string;
  detail: ProjectDetail;
  batch_id?: string;
  total_jobs?: number;
}

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  mood: string;
  source: "trending" | "royalty-free";
}

export interface VideoPresetDuration {
  value: number;
  label: string;
  desc: string;
}

export interface VideoStylePreset {
  id: string;
  label: string;
  desc: string;
}

export interface LandingGalleryImage {
  id: string;
  url: string;
}

// User/profile
export const mockUser: UserProfile = {
  id: "user_123",
  name: "Alex Johnson",
  email: "alex@example.com",
  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=ContentPro&backgroundType=gradientLinear",
  plan: "free",
  role: "user",
  industry: "jewelry",
  defaultImageModel: "gpt-image-1.5",
  defaultBatchModel: "gpt-batch-api",
  memberSince: "January 2026",
};

// Usage/settings
export const mockUsage: UsageSummary = {
  plan: "free",
  creditsUsed: 7,
  creditsTotal: 10,
  imagesThisMonth: 6,
  videosThisMonth: 1,
  resetDate: "April 1, 2026",
};

export const mockProBenefits: string[] = [
  "Unlimited images per month",
  "Unlimited videos per month",
  "Priority processing queue",
  "4K resolution exports",
];

// Recent projects summaries
export const mockRecentProjects: RecentProjectSummary[] = [
  {
    id: 1,
    name: "Premium Watch Collection",
    genre: "Luxury",
    theme: "Dark & Moody",
    images: 8,
    date: "2 hours ago",
    status: "completed",
  },
  {
    id: 2,
    name: "Organic Skincare Line",
    genre: "Lifestyle",
    theme: "Pastel",
    images: 12,
    date: "1 day ago",
    status: "completed",
  },
  {
    id: 3,
    name: "Tech Gadgets Bundle",
    genre: "Tech",
    theme: "Cool Tones",
    images: 6,
    date: "3 days ago",
    status: "in-progress",
  },
  {
    id: 4,
    name: "Fitness Equipment Set",
    genre: "Studio",
    theme: "Neutral",
    images: 10,
    date: "5 days ago",
    status: "completed",
  },
];

// Projects + details
export const mockProjects: Project[] = [
  {
    id: "1",
    name: "Tatsya Marble Jewelry Stand",
    type: "video",
    status: "completed",
    createdAt: "2024-01-15T10:30:00Z",
    thumbnail: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=400&h=300&fit=crop",
    detail: {
      brandName: "Tatsya",
      productName: "Marble Jewelry Stand",
      productCategory: "Home & Decor",
      productDescription:
        "Premium marble jewelry organizer stand with a minimalist aesthetic, perfect for displaying rings, necklaces, and bracelets.",
      brandWebsite: "tatsya.com",
      dimensions: "12 × 8 × 20 cm",
      images: [
        "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=600&h=600&fit=crop",
      ],
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    },
  },
  {
    id: "2",
    name: "Bath Set Collection",
    type: "images",
    status: "completed",
    createdAt: "2024-01-14T14:20:00Z",
    thumbnail: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=300&fit=crop",
    detail: {
      brandName: "LuxeBath",
      productName: "Bath Set Collection",
      productCategory: "Personal Care",
      productDescription:
        "A curated collection of premium bath products including body wash, bath salts, and loofah sponge.",
      brandWebsite: "luxebath.in",
      dimensions: "30 × 20 × 10 cm",
      images: [
        "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1570194065650-d99fb4b8ccab?w=600&h=600&fit=crop",
      ],
    },
  },
  {
    id: "3",
    name: "Trinket Plate Organizer",
    type: "video",
    status: "processing",
    createdAt: "2024-01-16T09:00:00Z",
    thumbnail: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=400&h=300&fit=crop",
    detail: {
      brandName: "Nestify",
      productName: "Trinket Plate Organizer",
      productCategory: "Home & Decor",
      productDescription:
        "Handcrafted ceramic trinket plate for organizing small jewellery and desk accessories.",
      dimensions: "15 × 15 × 2 cm",
      images: [
        "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1563170446-3a1eeb8eb1c4?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1598524374912-6b0f2f1a1d1d?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1567696153798-9111f9cd3d0d?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1604480133414-bec8e665f23c?w=600&h=600&fit=crop",
      ],
    },
  },
];

// Generated images mock for a product (used by GenerationResults if needed later)
export const mockGeneratedImages = (product: ProductFormData): string[] => {
  if (product.productImages?.length) {
    return product.productImages;
  }
  return [];
};

// Audio / video presets
export const mockTrendingTracks: AudioTrack[] = [
  { id: "t1", title: "Aesthetic Vibes", artist: "Reel Audio", duration: "0:30", mood: "Trendy", source: "trending" },
  { id: "t2", title: "Main Character Energy", artist: "Viral Sounds", duration: "0:25", mood: "Upbeat", source: "trending" },
  { id: "t3", title: "Soft Glow", artist: "Insta Beats", duration: "0:35", mood: "Calm", source: "trending" },
  { id: "t4", title: "Luxury Drop", artist: "Premium Audio", duration: "0:20", mood: "Elegant", source: "trending" },
  { id: "t5", title: "Product Reveal", artist: "Trend Studio", duration: "0:30", mood: "Dramatic", source: "trending" },
];

export const mockRoyaltyFreeTracks: AudioTrack[] = [
  { id: "r1", title: "Cinematic Rise", artist: "StockAudio Pro", duration: "1:00", mood: "Cinematic", source: "royalty-free" },
  { id: "r2", title: "Gentle Morning", artist: "Ambient Lab", duration: "0:45", mood: "Calm", source: "royalty-free" },
  { id: "r3", title: "Urban Pulse", artist: "Beat Factory", duration: "0:30", mood: "Energetic", source: "royalty-free" },
  { id: "r4", title: "Elegant Piano", artist: "Classical Cuts", duration: "0:50", mood: "Sophisticated", source: "royalty-free" },
  { id: "r5", title: "Lo-Fi Dreams", artist: "Chill Waves", duration: "1:00", mood: "Relaxed", source: "royalty-free" },
  { id: "r6", title: "Corporate Upbeat", artist: "Biz Tunes", duration: "0:40", mood: "Professional", source: "royalty-free" },
];

export const mockVideoDurations: VideoPresetDuration[] = [
  { value: 15, label: "15s", desc: "Instagram Story" },
  { value: 30, label: "30s", desc: "Reel / Short" },
  { value: 60, label: "60s", desc: "Full Reel" },
];

export const mockVideoStyles: VideoStylePreset[] = [
  { id: "slideshow", label: "Smooth Slideshow", desc: "Ken Burns pan & zoom transitions" },
  { id: "cinematic", label: "Cinematic Cuts", desc: "Quick cuts with motion blur" },
  { id: "reveal", label: "Product Reveal", desc: "Dramatic zoom-in reveal sequence" },
  { id: "storytelling", label: "Story Arc", desc: "Narrative flow with text overlays" },
];

export const mockLandingGalleryImages: LandingGalleryImage[] = [
  {
    id: "landing-1",
    url: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=400&h=400&fit=crop",
  },
  {
    id: "landing-2",
    url: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop",
  },
  {
    id: "landing-3",
    url: "https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=400&h=400&fit=crop",
  },
  {
    id: "landing-4",
    url: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=400&h=400&fit=crop",
  },
  {
    id: "landing-5",
    url: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop",
  },
  {
    id: "landing-6",
    url: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=400&h=400&fit=crop",
  },
];
