# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server (root = frontend/; reads .env from repo root; restart after editing .env)
npm run build    # production build to frontend/dist/
npm run preview  # serve the built frontend/dist/
```

There is no test runner, linter, or formatter configured.

## Structure

```
ContentProV2/
├── package.json / node_modules   # single install at repo root
├── .env / .env.example           # Vite reads these via envDir (repo root)
├── frontend/                     # Vite root — React 18, Tailwind, JSX
│   ├── index.html / vite.config.js / tailwind.config.js / postcss.config.js
│   ├── public/                   # videos/, photos/ (served as static assets)
│   └── src/
│       ├── main.jsx App.jsx styles.css
│       ├── components/ (incl. ui/)
│       ├── pages/
│       └── lib/                  # supabase.js, utils.js
├── ai-services/                  # browser-bundled AI modules (imported via @ai-services alias)
│   ├── imageService.js
│   └── providers/                # mockProvider.js, openaiProvider.js
├── backend/
│   └── supabase/functions/generate-images/  # Deno edge function (Replicate)
└── database/
    ├── migrations/               # SQL migrations (empty scaffold)
    └── README.md                 # documents 'product image' bucket
```

## Architecture

Routes in `frontend/src/App.jsx`: `/` (`Home`), `/generator` (`Generator`), `/results` (`Results`). The marketing `Home` page funnels signups into `/generator`; `Generator` is the actual product tool.

### Image generation flow

The core feature generates four product-photo variants from one uploaded image. The variant keys are fixed and flow through the whole stack: `white_background`, `professional`, `with_model`, `with_box`.

1. **Upload** (`frontend/src/components/UploadBox.jsx`) — pushes the file to the Supabase Storage bucket named `product image` (note the space) and returns its public URL. `lib/supabase.js` exports `supabase` as `null` when env vars are missing, so callers must null-check.
2. **Generate** (`frontend/src/pages/Generator.jsx`) — fans out one `generateVariant()` call per variant in parallel via `Promise.all`. Each result card supports **Re-roll** (regenerate preview) and **Finalize** (high-quality pass). State is tracked per-variant in plain objects/Sets keyed by variant name.
3. **Provider dispatch** (`ai-services/imageService.js`) — `generateVariant()` picks a provider by `VITE_AI_PROVIDER` (`mock` | `openai` | `fal`) and dynamically imports it. Note: `falProvider.js` is referenced but does not exist yet — selecting `fal` will throw. The dispatcher catches all errors and returns `{ success: false, error, ... }` rather than throwing.

### @ai-services alias

`ai-services/` sits outside the Vite root (`frontend/`). `frontend/vite.config.js` maps `@ai-services` → `../ai-services` and sets `server.fs.allow` to the repo root so Vite's file-serve sandbox allows cross-root imports.

### Provider contract

Every provider exports `generateVariant(variant, uploadedImageUrl, userPrompt, options)` returning `{ success, variant, outputUrl, seed, provider, metadata }`. `outputUrl` may be a remote URL (mock) or a `data:image/png;base64,...` string (openai). `options.finalPass` distinguishes the two quality tiers.

- `providers/mockProvider.js` — returns Unsplash URLs after a 2.5s delay; the default and what runs with no API keys.
- `providers/openaiProvider.js` — runs OpenAI **in the browser** (`dangerouslyAllowBrowser: true`). Two-step pipeline:
  1. **KYC**: `gpt-4.1-mini` vision call extracts a compact product-description JSON, cached in-module by a hash of the image URL (so re-rolls/finalizes reuse it).
  2. **Image edit**: `gpt-image-1` edit using `VARIANT_PREFIXES[variant]` + the `PRODUCT_LOCK` constraint (keeps product geometry identical) + KYC JSON. `finalPass` controls `quality` (`high`/`low`) and `n` (`1`/`2`).

### Supabase edge function

`backend/supabase/functions/generate-images/index.ts` is a Deno function that calls **Replicate** flux-schnell with create-then-poll. It uses `REPLICATE_API_KEY` and is independent of the in-browser provider system — the frontend does not currently call it.

**Supabase CLI note:** the CLI conventionally expects a single `supabase/` directory. With this layout, run CLI commands from `backend/` or pass `--workdir backend/supabase`.

## Environment

Frontend env (`VITE_`-prefixed, `.env` at repo root): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENAI_API_KEY`, `VITE_AI_PROVIDER` (defaults to `mock`). `VITE_FAL_API_KEY` is listed but unused. The edge function uses `REPLICATE_API_KEY` (server-side, not `VITE_`-prefixed).

## Conventions

- `frontend/src/lib/utils.js` exports `cn()` for className composition; `frontend/src/components/ui/` holds shadcn-style primitives.
- When adding a provider, match the `generateVariant` contract above and register its dynamic-import branch in `ai-services/imageService.js`.
