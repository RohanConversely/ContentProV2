# ContentPro - Project Status

## Overview

**ContentPro** is a full-stack web application that generates Amazon A+ content (professional product images and video frames) from raw product photos and brand information. The system uses AI (OpenAI GPT-4.1, gpt-image-1, and Google Veo 3.1) to transform simple product images into marketing-ready assets.

## Project Architecture

```
imageGenScript/
├── pipeline/                 # Python backend (image generation pipeline)
├── frontend/                 # React/TypeScript web application
└── .gitignore                # Git ignore rules
```

---

## Backend (Pipeline)

**Location:** `pipeline/`

### Purpose
Orchestrates a 4-stage AI pipeline to transform raw product images into Amazon A+ ready images and video frames.

### Technology Stack
- **Language:** Python 3.10+
- **AI APIs:** OpenAI (GPT-4.1, gpt-image-1), Google Gemini (Veo 3.1)
- **Key Dependencies:** `openai`, `python-dotenv`, `google-genai`

### Pipeline Stages

| Stage | Script | AI Model | Output |
|-------|--------|----------|--------|
| 1 | `product_kyc.py` | OpenAI GPT-4.1 mini | Product KYC JSON |
| 2 | `image_gen_with_KYC.py` | OpenAI gpt-image-1 | A+ content images (PNG) |
| 3 | `video_prompt_generation.py` | OpenAI GPT-4.1 mini | Video prompts (JSON) |
| 4 | `video_gen.py` | Google Veo 3.1 fast | Video frames (MP4) |

### Key Scripts

| File | Purpose |
|------|---------|
| `main.py` | **Orchestrator** - Runs the full 4-stage pipeline with user confirmations |
| `product_kyc.py` | Stage 1: Generate product Know Your Customer documentation |
| `image_gen_with_KYC.py` | Stage 2: Generate A+ content images using KYC |
| `video_prompt_generation.py` | Stage 3: Generate Veo video prompts |
| `video_gen.py` | Stage 4: Generate video frames from images |
| `job_pricing.py` | Calculate job costs from API usage logs |
| `logger.py` | JSON logging utility |

### Prompts Directory (`pipeline/prompts/`)

| File | Purpose |
|------|---------|
| `imageKYC.txt` | Prompt for KYC generation |
| `ImageWithKYCTesting.txt` | Prompt for A+ image generation |
| `perImagePromptGen.txt` | Prompt for video prompt generation |

### Environment Configuration

Create `pipeline/.env`:
```bash
OPENAI_API_KEY=your_openai_api_key
# Note: Gemini API key may also be needed for video generation
```

### Running the Pipeline

**Full pipeline (recommended):**
```bash
cd pipeline
python main.py <brand_name> <brand_website> <product_name> <product_category> <image_path>
```

**Example:**
```bash
python main.py Tatsya https://tatsya.com/ "Premium Marble Cake Stand" "Kitchen & Dining" ../tatsya_product.jpg
```

**Arguments:**
- `brand_name` - Brand name (e.g., "Tatsya")
- `brand_website` - Brand website URL
- `product_name` - Product name
- `product_category` - Product category
- `product_image_path` - Path to product image
- `--social-link-1` - Optional social media link
- `--social-link-2` - Optional social media link
- `--video-duration-seconds` - Video duration (default: 8)

**Individual stages:**
```bash
# Stage 1: KYC
python product_kyc.py --image-path <path> --brand-name <name> --brand-website <url>

# Stage 2: Images
python image_gen_with_KYC.py --image-path <path> --brand-name <name> --kyc-path <kyc_json>

# Stage 3: Video prompts
python video_prompt_generation.py --image-path <image_path>

# Stage 4: Video frames
python video_gen.py --image-path <image_path> --kyc-path <prompt_json>
```

### Output Structure

Jobs are stored in `pipeline/jobs/<job_id>/`:
```
jobs/<job_id>/
├── job.log                           # Job execution log
├── price.json                        # Pricing calculation
├── product_kycs/
│   └── <brand>_<product>_kyc.json  # Full KYC documentation
├── generated_images/
│   └── <brand>_<product>_<n>.png   # Generated A+ images
├── video_frame_prompts/
│   └── <image>_prompt.json          # Video prompts
└── video_frames/
    └── <image>_video.mp4            # Generated videos
```

---

## Frontend

**Location:** `frontend/`

### Purpose
User-facing web application for managing the image/video generation workflow.

### Technology Stack
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Shadcn UI
- **Routing:** React Router DOM v6
- **State Management:** React Context + React Query
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React

### Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                    # Shadcn UI components
│   │   ├── Navbar.tsx             # Top navigation
│   │   ├── ImageUploadZone.tsx    # Image upload component
│   │   ├── CreationOptions.tsx   # Create page options
│   │   ├── CreationWizard.tsx    # Multi-step wizard
│   │   ├── GenerationResults.tsx # Results display
│   │   ├── VideoCreation.tsx     # Video creation workflow
│   │   ├── RecentProjects.tsx    # Recent projects list
│   │   └── ...
│   ├── pages/
│   │   ├── LandingPage.tsx        # Marketing homepage
│   │   ├── Dashboard.tsx          # User dashboard
│   │   ├── ProjectsPage.tsx      # Projects list
│   │   ├── SettingsPage.tsx       # Settings/credits
│   │   ├── ProfilePage.tsx        # User profile
│   │   └── ...
│   ├── contexts/
│   │   └── ProcessContext.tsx     # Generation workflow state
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   └── utils.ts               # Utilities
│   ├── App.tsx                    # Routes setup
│   └── main.tsx                   # Entry point
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

### Running Frontend

```bash
cd frontend
npm install
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run preview` | Preview production build |

---

## Current Project Status

### Backend - Complete
- [x] 4-stage pipeline fully implemented
- [x] Job orchestration with `main.py`
- [x] Logging system with `logger.py`
- [x] Pricing calculation
- [x] Environment configuration via `.env`
- [x] Job output organization

### Frontend - In Development
- [x] Project structure with React + TypeScript + Vite
- [x] Shadcn UI components installed
- [x] Routing setup (React Router)
- [x] Landing page
- [x] Dashboard
- [x] Navbar component
- [x] Image upload component
- [x] Creation workflow components
- [ ] Full backend integration (API layer)
- [ ] Authentication (Google OAuth)
- [ ] Projects page with full CRUD
- [ ] Settings page with credits management

### API Integration - Not Started
The frontend currently uses mock data. Real backend API integration needed:
- `/api/generate/images` - Start image generation
- `/api/generate/video` - Start video generation
- `/api/projects` - CRUD for projects

---

## Development Guidelines

### Adding New Pipeline Stages
1. Create new script in `pipeline/`
2. Add to `main.py` orchestration
3. Update this README

### Adding Frontend Pages
1. Create page in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add navigation in `Navbar.tsx`

### Environment Variables
Never commit `.env` files. Use `.env.example` as template.

---

## Dependencies

### Python (`pipeline/requirements.txt`)
- openai >= 1.58.0
- python-dotenv >= 1.0.0
- google-genai >= 1.0.0

### Node.js (`frontend/package.json`)
Key dependencies:
- react, react-dom (18.3.1)
- react-router-dom (6.30.1)
- @tanstack/react-query (5.83.0)
- tailwindcss (3.4.17)
- shadcn/ui components (Radix UI based)
- lucide-react (0.462.0)
- framer-motion (12.34.1)

---

## Known Issues / TODOs

1. **Frontend-Backend Integration**: No API layer connecting frontend to pipeline
2. **Authentication**: Google OAuth not implemented (only planned)
3. **Pricing**: Basic pricing calculation exists but may need refinement
4. **Video Generation**: Currently uses Veo 3.1 fast mode; full quality may need different configuration

---

## Quick Start for New Developer

### 1. Clone and setup
```bash
git clone <repo-url>
cd imageGenScript
```

### 2. Setup backend
```bash
cd pipeline
cp .env.example .env
# Add your OPENAI_API_KEY to .env
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install google-genai
```

### 3. Run a test pipeline
```bash
python main.py TestBrand https://test.com "Test Product" "Category" test_product.jpg
```

### 4. Setup frontend
```bash
cd ../frontend
npm install
npm run dev
```

### 5. Explore the codebase
- Start with `pipeline/main.py` for backend flow
- Start with `frontend/src/App.tsx` for frontend routing
- Check `SPEC.md` in frontend for detailed frontend specifications
