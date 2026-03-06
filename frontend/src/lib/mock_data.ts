import type { User, Project, GeneratedImage, AudioOption } from './types';

// Mock user
export const mockUser: User = {
  id: "user_123",
  name: "John Doe",
  email: "john@example.com",
  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
  plan: "free",
  credits: {
    used: 5,
    total: 10,
    resetDate: "2024-02-01"
  }
};

// Mock projects
export const mockProjects: Project[] = [
  {
    id: "proj_1",
    userId: "user_123",
    name: "Tatsya Jewelry Stand",
    type: "video",
    status: "completed",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T12:00:00Z",
    inputData: {
      brandName: "Tatsya",
      brandWebsite: "tatsya.com",
      productName: "Jewelry Stand",
      productCategory: "Home Decor",
      productImage: "",
    },
    images: [
      { id: "img_1", url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop", selected: true },
      { id: "img_2", url: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&h=400&fit=crop", selected: true },
      { id: "img_3", url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=400&fit=crop", selected: false },
      { id: "img_4", url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop", selected: false },
      { id: "img_5", url: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=400&h=400&fit=crop", selected: true },
      { id: "img_6", url: "https://images.unsplash.com/photo-1618403088890-3d13b6a4b638?w=400&h=400&fit=crop", selected: false },
    ],
    video: {
      id: "vid_1",
      url: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
      thumbnail: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop",
      duration: 30,
      audio: "upbeat"
    }
  },
  {
    id: "proj_2",
    userId: "user_123",
    name: "Premium Skincare Set",
    type: "images",
    status: "completed",
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-01-10T09:30:00Z",
    inputData: {
      brandName: "Glow Beauty",
      brandWebsite: "glowbeauty.com",
      productName: "Premium Skincare Set",
      productCategory: "Beauty",
      productImage: "",
    },
    images: [
      { id: "img_7", url: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop", selected: false },
      { id: "img_8", url: "https://images.unsplash.com/photo-1570194065650-d99fb4b38b19?w=400&h=400&fit=crop", selected: false },
      { id: "img_9", url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop", selected: false },
      { id: "img_10", url: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&h=400&fit=crop", selected: false },
      { id: "img_11", url: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400&h=400&fit=crop", selected: false },
      { id: "img_12", url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop", selected: false },
    ]
  },
  {
    id: "proj_3",
    userId: "user_123",
    name: "Wireless Earbuds Pro",
    type: "video",
    status: "processing",
    createdAt: "2024-01-20T14:00:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
    inputData: {
      brandName: "TechSound",
      brandWebsite: "techsound.io",
      productName: "Wireless Earbuds Pro",
      productCategory: "Electronics",
      productImage: "",
    },
    images: [
      { id: "img_13", url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop", selected: true },
      { id: "img_14", url: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400&h=400&fit=crop", selected: true },
      { id: "img_15", url: "https://images.unsplash.com/photo-1598331668826-20cecc596b86?w=400&h=400&fit=crop", selected: false },
      { id: "img_16", url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop", selected: false },
      { id: "img_17", url: "https://images.unsplash.com/photo-1606156889598-bd239c92845a?w=400&h=400&fit=crop", selected: false },
      { id: "img_18", url: "https://images.unsplash.com/photo-1572569028738-411a1971d6b9?w=400&h=400&fit=crop", selected: false },
    ]
  },
  {
    id: "proj_4",
    userId: "user_123",
    name: "Organic Coffee Beans",
    type: "images",
    status: "failed",
    createdAt: "2024-01-05T10:00:00Z",
    updatedAt: "2024-01-05T10:15:00Z",
    inputData: {
      brandName: "BeanCraft",
      brandWebsite: "beancraft.co",
      productName: "Organic Coffee Beans",
      productCategory: "Food & Beverage",
      productImage: "",
    },
    images: []
  }
];

// Mock generated images
export const mockGeneratedImages: GeneratedImage[] = [
  { id: "gen_1", url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop", selected: false },
  { id: "gen_2", url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop", selected: false },
  { id: "gen_3", url: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop", selected: false },
  { id: "gen_4", url: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&h=400&fit=crop", selected: false },
  { id: "gen_5", url: "https://images.unsplash.com/photo-1491553895911-0055uj934d3ad?w=400&h=400&fit=crop", selected: false },
  { id: "gen_6", url: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&h=400&fit=crop", selected: false },
];

// Mock audio options
export const mockAudioOptions: AudioOption[] = [
  { id: "audio_1", name: "No Audio", duration: 30 },
  { id: "audio_2", name: "Upbeat", duration: 30 },
  { id: "audio_3", name: "Calm", duration: 30 },
  { id: "audio_4", name: "Corporate", duration: 30 },
];
