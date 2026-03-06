// User type
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'pro';
  credits: {
    used: number;
    total: number;
    resetDate: string;
  };
}

// Project type
export interface Project {
  id: string;
  userId: string;
  name: string;
  type: 'images' | 'video';
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  inputData: ProductInput;
  images?: GeneratedImage[];
  video?: GeneratedVideo;
}

// Product Input type
export interface ProductInput {
  brandName: string;
  brandWebsite: string;
  productName: string;
  productCategory: string;
  productImage: File | string;
  socialLink1?: string;
  socialLink2?: string;
}

// Generated Image type
export interface GeneratedImage {
  id: string;
  url: string;
  thumbnail?: string;
  selected: boolean;
}

// Generated Video type
export interface GeneratedVideo {
  id: string;
  url: string;
  thumbnail?: string;
  duration: number;
  audio?: string;
}

// Audio Option type
export interface AudioOption {
  id: string;
  name: string;
  duration: number;
}
