# ContentPro - Frontend Specification

## 1. Project Overview

**Project Name:** ContentPro  
**Project Type:** Web Application (React + TypeScript + Tailwind CSS + Shadcn UI)  
**Core Functionality:** A tool that takes raw product images and brand/product details as input, then generates Amazon A+ images and video frames through backend processing.  
**Target Users:** Amazon sellers, e-commerce brands, marketing professionals

---

## 2. Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Shadcn UI components
- **Routing:** React Router DOM v6
- **State Management:** React Context + React Query
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React
- **HTTP Client:** Fetch API (wrapper in api.ts)
- **Authentication:** Google OAuth (future implementation)

---

## 3. Navigation Structure

```
/                       → Landing Page (Index)
/login                  → Login Page (Google OAuth)
/dashboard              → Dashboard (authenticated)
/create                 → Create Page
    ├── /create/images  → Generate Images workflow
    └── /create/video   → Generate Video workflow
/projects               → Projects Page
/settings               → Settings Page
/profile                → Profile Page
```

---

## 4. Pages & Components

### 4.1 Landing Page (`/`)

**Purpose:** Marketing homepage explaining the service

**Sections:**
- **Hero Section:**
  - Headline: "Create Professional Amazon A+ Content in Minutes"
  - Subheadline describing the service
  - CTA buttons: "Get Started" (links to /login), "View Demo"
  - Hero image/illustration showing product images and generated content

- **Features Section:**
  - 3-4 feature cards with icons:
    - "AI-Powered Image Generation" - Transform raw product photos into professional A+ images
    - "Video Creation" - Generate engaging video content from images
    - "Amazon-Ready" - All content optimized for Amazon listing standards

- **How It Works Section:**
  - Step-by-step visual guide (3 steps)
  - Upload → Generate → Download

- **Pricing/Plans Section:**
  - Free Plan: Limited credits
  - Pro Plan: Higher limits, priority support

- **Footer:**
  - Links: About, Contact, Terms, Privacy
  - Social media links
  - Copyright

**Components Needed:**
- `LandingPage.tsx` - Main landing page
- `Hero.tsx` - Hero section
- `Features.tsx` - Features grid
- `HowItWorks.tsx` - Step-by-step guide
- `PricingSection.tsx` - Plan comparison
- `Footer.tsx` - Footer with links

---

### 4.2 Login Page (`/login`)

**Purpose:** Authenticate users via Google OAuth

**UI:**
- Centered card with Google sign-in button
- Brief text: "Sign in with Google to continue"
- Loading state during authentication
- Redirect to /dashboard on success

**Components Needed:**
- `LoginPage.tsx` - Login wrapper

---

### 4.3 Dashboard (`/dashboard`)

**Purpose:** Main authenticated hub

**Layout:**
- Top navigation bar with:
  - Logo (left)
  - Nav links: Create, Projects (center)
  - Profile dropdown (right)
- Main content area

**Components:**
- `Navbar.tsx` - Top navigation (already exists, needs modification)
- `DashboardContent.tsx` - Welcome message + quick actions

---

### 4.4 Create Page (`/create`)

**Purpose:** Entry point for content creation

**UI:**
- Page heading: "Create New Content"
- Two large option cards:
  1. **Generate Images** card
     - Icon: Image icon
     - Title: "Generate Images"
     - Description: "Create Amazon A+ ready product images"
     - CTA: "Start" → navigates to `/create/images`
  
  2. **Generate Video** card
     - Icon: Video icon
     - Title: "Generate Video"
     - Description: "Create engaging video content from images"
     - CTA: "Start" → navigates to `/create/video`

**Components Needed:**
- `CreatePage.tsx` - Main create page
- `CreationOptionCard.tsx` - Reusable option card component

---

### 4.5 Generate Images Workflow (`/create/images`)

**Multi-step form wizard:**

**Step 1: Product Details**
- **Required Fields:**
  - Brand Name (text input)
  - Brand Website (URL input)
  - Product Name (text input)
  - Product Category (dropdown or text input)
  - Product Image (file upload with drag-and-drop)
  
- **Optional Fields:**
  - Social Link 1 (URL input)
  - Social Link 2 (URL input)

- **Validation:** All required fields must be filled before proceeding

**Step 2: Generate Images**
- Display entered details summary
- "Generate Images" button
- Loading state with progress indicator
- On success: Display 6 generated images in a grid

**Step 3: Results**
- Grid of 6 generated images
- Each image has:
  - Download button
  - "Select for Video" checkbox (for video workflow)
- "Create More Images" button (restart)
- "Continue to Video" button (if video workflow)

**Components Needed:**
- `ImageCreateWizard.tsx` - Main wizard container
- `ProductDetailsForm.tsx` - Step 1 form
- `ImageGenerationStep.tsx` - Step 2 generation
- `ImageResultsGrid.tsx` - Step 3 results display

---

### 4.6 Generate Video Workflow (`/create/video`)

**Multi-step form wizard:**

**Step 1: Product Details**
- Same as Generate Images Step 1

**Step 2: Generate Images**
- Same as Generate Images Step 2
- Displays 6 generated images

**Step 3: Select Images for Video**
- Display all 6 generated images
- Minimum 3 images must be selected (validation)
- Each image has selection checkbox
- Show selection count (e.g., "3/6 selected")
- "Generate Video" button

**Step 4: Generate Video**
- Loading state with progress
- Display generated video preview
- Audio selection dropdown:
  - Options: "No Audio", "Upbeat", "Calm", "Corporate", "Custom Upload"
- "Add Audio" button
- Final video with audio preview

**Step 5: Results**
- Final video player
- Download button
- "Create New" button
- "View in Projects" button

**Components Needed:**
- `VideoCreateWizard.tsx` - Main wizard container
- `ImageSelectionGrid.tsx` - Step 3 image selector
- `AudioSelector.tsx` - Step 4 audio selection
- `VideoPreview.tsx` - Video player component

---

### 4.7 Projects Page (`/projects`)

**Purpose:** Display user's past jobs

**UI:**
- Page heading: "Your Projects"
- Filter/Sort options (by date, status)
- Grid or list of project cards

**Project Card displays:**
- Thumbnail (first image or video frame)
- Project name (product name)
- Creation date
- Status: "Processing", "Completed", "Failed"
- Type: "Images Only", "Images + Video"
- Quick actions: View, Download, Delete

**Empty State:**
- "No projects yet"
- "Create your first project" CTA → /create

**Components Needed:**
- `ProjectsPage.tsx` - Main projects page
- `ProjectCard.tsx` - Individual project card
- `ProjectFilters.tsx` - Filter/sort controls

---

### 4.8 Profile Page (`/profile`)

**Purpose:** User profile management

**UI:**
- User avatar (from Google account)
- Display name
- Email address
- Account info section
- "Logout" button

**Components Needed:**
- `ProfilePage.tsx` - Profile page

---

### 4.9 Settings Page (`/settings`)

**Purpose:** Subscription and credits management

**UI:**
- **Current Plan Section:**
  - Plan name: "Free" or "Pro"
  - Credits used / Total credits
  - Progress bar showing usage

- **Credits Details:**
  - Images generated this month
  - Videos generated this month
  - Reset date

- **Upgrade Section:**
  - "Upgrade to Pro" button
  - Pro plan benefits:
    - More credits per month
    - Priority processing
    - Export in higher resolution

- **Billing History** (future):
  - Past invoices

**Components Needed:**
- `SettingsPage.tsx` - Settings page
- `PlanCard.tsx` - Current plan display
- `UpgradeCard.tsx` - Pro plan upgrade option

---

## 5. Global Components

### 5.1 Navbar
- Logo (left)
- Navigation links (center): Create, Projects
- Profile dropdown (right):
  - Profile link
  - Settings link
  - Logout option
- Mobile responsive hamburger menu

### 5.2 Profile Dropdown
- Avatar image
- User name
- Menu items:
  - Profile
  - Settings
  - Separator
  - Logout

### 5.3 Loading States
- Skeleton loaders for content
- Spinner for actions
- Progress bars for generation

### 5.4 Toast Notifications
- Success messages
- Error messages
- Info messages

---

## 6. API Integration

### 6.1 API Structure (`src/lib/api.ts`)

All API calls will be wrapped here with proper error handling.

**Base URL:** Environment variable (`VITE_API_URL`)

**Endpoints:**

```
Authentication:
POST   /api/auth/google          → Google OAuth callback
POST   /api/auth/logout          → Logout
GET    /api/auth/me              → Current user

User:
GET    /api/user/profile          → Get user profile
PUT    /api/user/profile          → Update profile
GET    /api/user/subscription     → Get subscription details

Projects:
GET    /api/projects              → List all projects
GET    /api/projects/:id          → Get project details
DELETE /api/projects/:id          → Delete project

Image Generation:
POST   /api/generate/images       → Start image generation
GET    /api/generate/images/:id  → Get generation status
GET    /api/generate/images/:id/result → Get generated images

Video Generation:
POST   /api/generate/video        → Start video generation
GET    /api/generate/video/:id   → Get generation status
GET    /api/generate/video/:id/result → Get generated video

Audio:
GET    /api/audio/options         → List available audio tracks
POST   /api/video/:id/audio       → Add audio to video
```

### 6.2 Mock Data (`src/lib/mock_data.ts`)

Until backend is ready, use mock data:

```typescript
// Mock user
const mockUser = {
  id: "user_123",
  name: "John Doe",
  email: "john@example.com",
  avatar: "https://...",
  plan: "free", // or "pro"
  credits: {
    used: 5,
    total: 10,
    resetDate: "2024-01-01"
  }
}

// Mock projects
const mockProjects = [
  {
    id: "proj_1",
    name: "Tatsya Jewelry Stand",
    type: "images_video",
    status: "completed",
    createdAt: "2024-01-15T10:00:00Z",
    thumbnail: "https://...",
    images: [...],
    video: "https://..."
  }
]

// Mock generated images
const mockGeneratedImages = [
  { id: "img_1", url: "...", selected: false },
  // ... 6 images
]

// Mock audio options
const mockAudioOptions = [
  { id: "audio_1", name: "Upbeat", duration: 30 },
  { id: "audio_2", name: "Calm", duration: 30 },
  { id: "audio_3", name: "Corporate", duration: 30 },
]
```

### 6.3 API Hooks

Use React Query for data fetching:

```typescript
// Example hooks
useUser()           → Fetch current user
useProjects()       → Fetch all projects
useCreateImages()   → Create images mutation
useCreateVideo()    → Create video mutation
useAudioOptions()   → Fetch audio options
```

---

## 7. State Management

### 7.1 Auth Context (`src/contexts/AuthContext.tsx`)
- User state
- Login/Logout functions
- Loading states

### 7.2 Create Workflow Context
- Form data state
- Generated images state
- Selected images state
- Video generation state
- Audio selection state

---

## 8. Data Models

### User
```typescript
interface User {
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
```

### Project
```typescript
interface Project {
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
```

### ProductInput
```typescript
interface ProductInput {
  brandName: string;
  brandWebsite: string;
  productName: string;
  productCategory: string;
  productImage: File | string;
  socialLink1?: string;
  socialLink2?: string;
}
```

### GeneratedImage
```typescript
interface GeneratedImage {
  id: string;
  url: string;
  thumbnail?: string;
  selected: boolean;
}
```

### GeneratedVideo
```typescript
interface GeneratedVideo {
  id: string;
  url: string;
  thumbnail?: string;
  duration: number;
  audio?: string;
}
```

---

## 9. Routing & Protected Routes

- `/`, `/login` → Public
- `/dashboard`, `/create/**`, `/projects`, `/profile`, `/settings` → Protected (require auth)

**Route Protection Component:**
```typescript
// ProtectedRoute.tsx
- Check if user is authenticated
- If not, redirect to /login
- Show loading while checking auth
```

---

## 10. Form Validation

Using Zod + React Hook Form:

**Product Details Form:**
```typescript
const productFormSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  brandWebsite: z.string().url("Invalid URL"),
  productName: z.string().min(1, "Product name is required"),
  productCategory: z.string().min(1, "Product category is required"),
  productImage: z.any(), // File validation
  socialLink1: z.string().url().optional(),
  socialLink2: z.string().url().optional(),
});
```

---

## 11. File Structure

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/                 # Shadcn UI components (existing)
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── create/
│   │   │   ├── CreationOptionCard.tsx
│   │   │   ├── ProductDetailsForm.tsx
│   │   │   ├── ImageSelectionGrid.tsx
│   │   │   ├── AudioSelector.tsx
│   │   │   └── VideoPreview.tsx
│   │   ├── projects/
│   │   │   ├── ProjectCard.tsx
│   │   │   └── ProjectFilters.tsx
│   │   └── landing/
│   │       ├── Hero.tsx
│   │       ├── Features.tsx
│   │       ├── HowItWorks.tsx
│   │       └── PricingSection.tsx
│   │
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CreatePage.tsx
│   │   ├── ImageCreatePage.tsx
│   │   ├── VideoCreatePage.tsx
│   │   ├── ProjectsPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── NotFoundPage.tsx
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── CreateWorkflowContext.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useProjects.ts
│   │   ├── useImageGeneration.ts
│   │   └── useVideoGeneration.ts
│   │
│   ├── lib/
│   │   ├── api.ts              # API client
│   │   ├── mock_data.ts        # Mock data
│   │   ├── utils.ts            # Utilities (existing)
│   │   └── types.ts             # TypeScript types
│   │
│   ├── App.tsx                 # Routes setup
│   ├── main.tsx
│   └── index.css
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 12. Implementation Priority

### Phase 1: Core Structure
1. Setup routing with protected routes
2. Create AuthContext
3. Build Navbar with profile dropdown
4. Create Landing Page

### Phase 2: Create Workflow
1. Create Page with two options
2. Generate Images workflow (all steps)
3. Generate Video workflow (all steps)

### Phase 3: Projects & Settings
1. Projects page with mock data
2. Profile page
3. Settings page with credits display

### Phase 4: API Integration
1. Implement api.ts with real endpoints
2. Replace mock data with API calls
3. Add proper error handling

---

## 13. Design Guidelines

### Color Palette
- Primary: `#0A0A0A` (near black)
- Secondary: `#FAFAFA` (off white)
- Accent: `#3B82F6` (blue - for CTAs)
- Success: `#22C55E` (green)
- Warning: `#F59E0B` (amber)
- Error: `#EF4444` (red)
- Muted: `#71717A` (gray for secondary text)

### Typography
- Headings: Bold, clean sans-serif
- Body: Regular weight, good line-height
- Monospace: For code/technical elements

### Spacing
- Consistent padding: 16px, 24px, 32px
- Section spacing: 64px, 96px
- Card padding: 24px

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## 14. Notes

- All dynamic content will be fetched from API endpoints listed in `api.ts`
- Until backend is ready, `mock_data.ts` provides realistic mock responses
- Use existing shadcn/ui components for consistency
- Follow existing code patterns in the project
- Ensure accessibility (aria labels, keyboard navigation)
- Mobile-first responsive design
