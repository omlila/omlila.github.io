# Implementation Plan: Standalone Video Studio & Monorepo Deployment

## Phase 1: Workspace Consolidation
- [x] Task: Move Next.js site to `apps/web/`
- [x] Task: Copy `apps/video-gen`, `services/nep-lyricist`, `conductor/`, and `.agents/` to monorepo root
- [x] Task: Create `pnpm-workspace.yaml` and root `package.json` with workspace dev/build scripts

## Phase 2: Feature Flags & Standalone Config
- [x] Task: Add `VITE_ENABLE_AI_LYRICIST` and `baseUrl` handling to `apps/video-gen/src/App.tsx`
- [x] Task: Configure `apps/video-gen/vite.config.ts` for relative asset loading
- [x] Task: Create `.env.production` and `.env.development` templates

## Phase 3: Web Portal Integration & Build Automation
- [x] Task: Add Video Studio hero button and product card in `apps/web/app/page.tsx`
- [x] Task: Configure static export pipeline combining Next.js `out/` and Vite `dist/` into `out/studio/`
- [x] Task: Update `.github/workflows/deploy.yml` for automated GitHub Pages deployment

## Phase 4: Verification & Conductor Indexing
- [x] Task: Test `pnpm build` to verify clean build of all apps
- [x] Task: Register track in `conductor/index.md`
