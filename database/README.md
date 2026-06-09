# Database

Supabase Postgres schema, Storage buckets, and migrations for ContentProV2.

## Storage

### `product image` bucket

> The bucket name contains a space — `product image` — so it must be quoted/encoded exactly in client calls.

Used by the upload flow in `frontend/src/components/UploadBox.jsx`:

- Files are uploaded to the path `uploads/<timestamp>_<originalName>`.
- The app then reads the file's **public URL** (`getPublicUrl`) and passes it downstream to the AI services for image generation.
- This implies the bucket (or at least the `uploads/` prefix) must be **publicly readable**. If you later lock it down, switch the client to signed URLs.

## Tables

None yet. Generation results currently live only in React state (`frontend/src/pages/Generator.jsx`) and are not persisted.

When persistence is added, create migrations under `migrations/` (e.g. a `generations` table keyed by upload URL + variant) and document the schema and RLS policies here.

## Migrations

`migrations/` holds timestamped SQL migrations. See the Supabase-CLI note in the repo root `CLAUDE.md` for how the CLI is pointed at this split layout.
