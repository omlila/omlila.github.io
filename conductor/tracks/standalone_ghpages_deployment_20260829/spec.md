# Specification: Standalone Browser Video Studio & Monorepo Deployment

## 1. Overview
Consolidate the `omlila-gen` codebase into the `omlila.github.io` repository as a unified monorepo. Support standalone browser hosting of the 4K Lyrical Video Studio on GitHub Pages under `/studio/` without requiring any Python backend in production, while preserving full local backend development capabilities via environment variables.

## 2. Functional Requirements
- **Monorepo Architecture**: Manage `apps/web` (Next.js portal), `apps/video-gen` (Vite Video Studio), and `services/nep-lyricist` (FastAPI backend) within a single `pnpm` workspace.
- **Feature Flags**: Introduce `VITE_ENABLE_AI_LYRICIST` to conditionally show/hide backend-dependent features (AI Lyricist modal and lab playground).
- **Public Hosting**: Deploy the built static site (`apps/web` at `/` and `apps/video-gen` at `/studio/`) to GitHub Pages via automated GitHub Actions.
- **Offline / Standalone Media**: Support built-in presets, canvas rendering, beat detection, and 4K MP4 export via WebCodecs and IndexedDB purely in the browser.

## 3. Acceptance Criteria
- [x] Monorepo structure configured with `pnpm-workspace.yaml` and root scripts.
- [x] `apps/video-gen` supports `VITE_ENABLE_AI_LYRICIST` feature flag.
- [x] Production build bundles `apps/video-gen` into `out/studio/` with relative asset links.
- [x] `apps/web` Next.js landing page has direct links to `/studio/`.
- [x] GitHub Actions workflow `.github/workflows/deploy.yml` builds and deploys to GitHub Pages.
