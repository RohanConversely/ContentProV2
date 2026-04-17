# Frontend Documentation

## Overview

ContentPro frontend is a React + TypeScript application that provides a complete user interface for:
- User authentication (email/password, Google OAuth)
- Single image job creation with live progress tracking
- Batch image job creation from CSV/XLSX files
- Project and batch management
- Asset viewing, logs, and downloads
- **Admin panel for user management and prompt configuration**

The frontend is fully integrated with the backend API. It is not a mock-only UI.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 5.x |
| Styling | Tailwind CSS 3.x |
| UI Components | Shadcn UI (Radix UI primitives) |
| Routing | React Router v6 |
| State Management | React Context + localStorage persistence |
| Data Parsing | PapaParse (CSV), XLSX (Excel) |
| Animation | Framer Motion |
| HTTP Client | Native fetch API |
| Real-time Updates | Server-Sent Events (SSE) |
| Form Handling | React Hook Form + Zod |
| Testing | Vitest |
| Data Fetching | TanStack Query (React Query) |

---

## Project Structure

```
frontend/src/
├── assets/                 # Static assets (images, fonts)
├── components/
│   ├── ui/                 # Shadcn UI components (50+ components)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   ├── progress.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── carousel.tsx
│   │   └── ... (40+ more)
│   ├── Navbar.tsx          # Main navigation header
│   ├── CreationWizard.tsx  # Single image job creation flow
│   ├── BatchCreationWizard.tsx  # Batch job creation from spreadsheet
│   ├── GenerationResults.tsx    # Display generated images
│   ├── VideoCreation.tsx        # Video job creation (legacy)
│   ├── RecentProjects.tsx       # Recent projects list
│   ├── CreationOptions.tsx      # Job type selection
│   ├── ImageUploadZone.tsx      # Drag-and-drop image upload
│   ├── GenreThemeSelector.tsx   # Style/theme selection
│   ├── ClientKycStep.tsx        # KYC form step
│   ├── NavLink.tsx              # Navigation link component
│   ├── ProtectedRoute.tsx       # Auth guard component
│   ├── AdminDefaultPromptPanel.tsx   # Admin prompt management panel
│   ├── AdminUsersList.tsx            # Admin user list component
│   └── AdminPromptOverrideModal.tsx # Admin user prompt override modal
├── contexts/
│   ├── AuthContext.tsx          # Authentication state (login/logout/user)
│   └── ProcessContext.tsx       # Active job tracking
├── hooks/                       # Custom React hooks
├── lib/
│   ├── api.ts                   # Backend API client (ALL API calls)
│   ├── active-runs.ts           # Persist active jobs in localStorage
│   ├── mock_data.ts             # Mock data for landing page
│   └── utils.ts                 # Utility functions (cn, formatting)
├── pages/
│   ├── LandingPage.tsx          # Public landing page
│   ├── Index.tsx                # Home/dashboard redirect
│   ├── Dashboard.tsx            # User dashboard
│   ├── AuthPage.tsx             # Login/register page
│   ├── AuthCallbackPage.tsx     # OAuth callback handler
│   ├── BatchRunPage.tsx         # Active batch execution page
│   ├── BatchDetailPage.tsx      # Batch results/history page
│   ├── ProjectsPage.tsx         # All projects listing
│   ├── ProfilePage.tsx          # User profile settings
│   ├── SettingsPage.tsx         # App settings
│   └── NotFound.tsx             # 404 page
├── App.tsx                      # Main app with routing
├── main.tsx                     # Entry point
└── index.css                    # Global styles
```

---

## Key Files

### `src/lib/api.ts` (933 lines)

The central API client handling all communication with the backend. Key functions:

**Authentication:**
- `registerAccount()` - Create new user account
- `loginAccount()` - Authenticate user
- `getCurrentUser()` - Fetch current user profile
- `changePassword()` - Update password
- `getGoogleLoginUrl()` - Get Google OAuth URL

**Jobs:**
- `createJob()` - Create single image job
- `getJob()` - Get job details
- `getJobLogs()` - Get job execution logs
- `cancelJob()` - Cancel running job
- `waitForJobCompletion()` - Poll for job completion via SSE
- `subscribeToJobEvents()` - Subscribe to real-time job updates

**Assets:**
- `uploadJobAsset()` - Upload local images
- `uploadRemoteJobAsset()` - Upload from URL
- `uploadRemoteFolderAssets()` - Upload from Google Drive folder
- `downloadJobImagesArchive()` - Download ZIP of generated images

**Batches:**
- `getBatchJobs()` - Get all jobs in a batch
- `downloadBatchArchive()` - Download ZIP of entire batch
- `deleteBatch()` - Delete batch

**Projects:**
- `getProjects()` - List all user projects
- `getProjectById()` - Get single project
- `deleteProject()` - Soft delete project

### `src/components/CreationWizard.tsx`

Single image job creation flow:
1. Product information form (brand, product name, category)
2. Image upload (drag-and-drop, up to 5 images)
3. Additional inputs (dimensions, description, social links)
4. Model selection (REVE, GPT-Image-1)
5. Job submission and live progress tracking
6. Generated image display with download options

### `src/components/BatchCreationWizard.tsx`

Batch job creation from spreadsheet:
1. File upload (CSV/XLSX)
2. Column mapping (brand, product, image URL)
3. Source mode selection (direct URLs or Google Drive folders)
4. Row validation and selection
5. Batch submission with progress tracking

### `src/pages/ProjectsPage.tsx`

Main project listing:
- Cards showing project thumbnail, name, status, date
- Filter by status (all, completed, failed, in-progress)
- Batch grouping with job counts
- Soft delete functionality
- Quick actions (view, download, delete)

---

## Routes

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Landing page | No |
| `/login` | Login page | No |
| `/register` | Registration page | No |
| `/auth/callback` | OAuth callback | No |
| `/dashboard` | User dashboard | Yes |
| `/batch-run` | Active batch execution | Yes |
| `/batch/:batchId` | Batch detail/history | Yes |
| `/projects` | All projects list | Yes |
| `/project/:jobId` | Job detail view | Yes |
| `/profile` | User profile | Yes |
| `/settings` | App settings | Yes |
| `/admin/users` | Admin users & prompts | Yes (superadmin only) |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login with email/password |
| GET | `/auth/me` | Get current user |
| POST | `/auth/change-password` | Change password |
| GET | `/auth/google/login` | Get Google OAuth URL |
| GET | `/auth/google/callback` | Google OAuth callback |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/jobs` | Create new job |
| GET | `/jobs` | List jobs (paginated) |
| GET | `/jobs/recent` | Get recent jobs |
| GET | `/jobs/{job_id}` | Get job details |
| GET | `/jobs/{job_id}/events` | SSE for job progress |
| GET | `/jobs/{job_id}/logs` | Get job logs |
| GET | `/jobs/{job_id}/pricing` | Get pricing snapshot |
| GET | `/jobs/{job_id}/download/images` | Download images ZIP |
| GET | `/jobs/{job_id}/download/image` | Download single image |
| POST | `/jobs/{job_id}/regenerate-images` | Regenerate with new prompt |
| POST | `/jobs/{job_id}/cancel` | Cancel job |
| DELETE | `/jobs/{job_id}` | Delete job (soft delete) |

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/jobs/{job_id}/assets` | Upload local files |
| POST | `/jobs/{job_id}/assets/remote` | Upload from URL |
| POST | `/jobs/{job_id}/assets/remote-folder` | Upload from Drive folder |
| GET | `/jobs/{job_id}/assets` | List job assets |

### Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/batches/{batch_id}` | Get batch jobs |
| GET | `/batches/{batch_id}/download` | Download batch ZIP |
| DELETE | `/batches/{batch_id}` | Delete batch |

### Meta
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/usage` | Get user usage |
| GET | `/benefits` | Get Pro benefits |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List all users (superadmin) |
| POST | `/admin/users` | Create new user (superadmin) |
| PUT | `/admin/users/{user_id}` | Update user (superadmin) |
| DELETE | `/admin/users/{user_id}` | Delete user (superadmin) |
| GET | `/admin/prompts/defaults` | List default prompts |
| PUT | `/admin/prompts/defaults/{industry}` | Update default prompt |
| DELETE | `/admin/prompts/defaults/{industry}` | Delete industry prompt |
| GET | `/admin/prompts/defaults/{industry}/categories` | List category prompts |
| PUT | `/admin/prompts/defaults/{industry}/categories/{key}` | Upsert category prompt |
| DELETE | `/admin/prompts/defaults/{industry}/categories/{key}` | Delete category prompt |
| GET | `/admin/users/{user_id}/prompts/{industry}` | Get user prompt override |
| PUT | `/admin/users/{user_id}/prompts/{industry}` | Set user prompt override |
| DELETE | `/admin/users/{user_id}/prompts/{industry}` | Delete user prompt override |

---

## Design System

### Shadcn UI Components

The frontend uses [Shadcn UI](https://ui.shadcn.com/) which provides accessible, customizable components built on Radix UI primitives:

**Form Components:**
- Button, Input, Textarea, Select, Checkbox, Radio Group
- Form with validation (React Hook Form + Zod)

**Layout:**
- Card, Dialog, Drawer, Sheet, Popover
- Tabs, Accordion, Collapsible
- Scroll Area, Resizable Panels

**Feedback:**
- Toast notifications (Sonner)
- Alert Dialog, Confirm Dialog
- Progress, Skeleton loaders
- Tooltip

**Navigation:**
- Dropdown Menu, Navigation Menu
- Breadcrumb, Pagination

**Media:**
- Carousel, Aspect Ratio
- Avatar, Badge

**Data Display:**
- Table, Calendar
- Chart (Recharts)

### Tailwind CSS

All styling uses Tailwind CSS with custom configuration:
- Custom color palette in `tailwind.config.js`
- Typography plugin for prose styling
- Animation utilities

### Icons

Icons are provided by [Lucide React](https://lucide.dev/) - a consistent, lightweight icon set.

---

## State Management

### AuthContext
- Current user information
- Authentication state (logged in/out)
- Token management (localStorage)
- Auto-logout on token expiration

### ProcessContext
- Active job tracking
- Real-time status updates
- Persisted across page reloads via localStorage

### TanStack Query
- Used for server state management
- Caching and background refetching for API data
- Optimistic updates for mutations

### Active Runs Persistence (`lib/active-runs.ts`)

Persists active jobs in localStorage to survive page reloads:
- Single jobs: job ID, status, created time
- Batch runs: batch ID, job IDs, progress

Clears completed batch runs automatically.

---

## Input/Output Limits

| Resource | Limit |
|----------|-------|
| Single job source images | Up to 5 |
| Batch Drive folder images | First 5 files |
| Generated images per job | 6 |
| Batch rows per spreadsheet | Based on valid rows |

---

## Authentication

### Current Active Mode
- **Email/Password** - Full implementation with registration, login, change password
- **Google OAuth** - Full implementation with registration, login

### Session Management
- JWT tokens stored in localStorage
- Bearer token in Authorization header
- 401 triggers auto-logout and redirect to login

---

## Real-time Updates

### Server-Sent Events (SSE)

Jobs emit progress updates via SSE endpoint `GET /jobs/{job_id}/events`:

```typescript
subscribeToJobEvents(jobId, {
  onStatus: (payload) => {
    // payload: { stage, status, message }
    // status: "pending" | "running" | "completed" | "failed" | "cancelled"
  },
  onError: (message) => {
    // Connection error
  }
})
```

### Progress Flow
1. Job created with `pending_upload` status
2. After assets uploaded, status changes to `pending`
3. Pipeline starts, status becomes `running`
4. Stage updates via SSE (kyc, image_gen, etc.)
5. Final status: `completed`, `failed`, or `cancelled`

---

## Running Locally

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
cd frontend
npm install
```

### Development
```bash
npm run dev    # Start dev server on localhost:5173
```

### Production Build
```bash
npm run build  # Production build
npm run lint   # Run ESLint
npm test       # Run tests
```

### Environment Variables
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (e.g., `http://127.0.0.1:8000`) |

### Production
- Built with Vite for production
- Served by backend or standalone static hosting
- CORS configured for allowed origins

---

## Key Frontend Patterns

### API Error Handling
```typescript
async function apiFetch(path, init = {}, auth = false) {
  const response = await fetch(`${API_BASE_URL}${path}`, {...});
  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearStoredSession(); // Auto-logout
    }
    throw new Error(await parseErrorResponse(response));
  }
  return response;
}
```

### Job Polling with SSE
```typescript
await waitForJobCompletion(jobId, (payload) => {
  // Update UI with progress
  console.log(payload.stage, payload.status, payload.message);
});
```

### Batch Processing
- Creates one job per spreadsheet row
- All jobs share same `batch_id` and `batch_name`
- Batch page shows aggregated progress
- ZIP download available when all complete
