# 🌌 Omlila Monorepo & Creative Suite

> **Offline-First Creative Intelligence & Edge AI Ecosystem**  
> Rooted in the high altitudes of Nepal: **Om** *(Universal Vibration)* + **Lila** *(Divine Play)*.

---

## 🌐 Public Live Applications

* 🏠 **Main Omlila Portal**: [`https://omlila.github.io/`](https://omlila.github.io/)
* 🎬 **4K Lyrical Video Studio**: [`https://omlila.github.io/studio/video/`](https://omlila.github.io/studio/video/)
* 🔀 **Studio Hub (Auto-redirect)**: [`https://omlila.github.io/studio/`](https://omlila.github.io/studio/)

---

## 📁 Repository & Workspace Structure

```
omlila.github.io/
├── apps/
│   ├── web/                     # Next.js 16 Static Web Portal & Legal Pages
│   └── video-gen/               # Vite + React 19 Client-Side 4K Lyrical Video Studio
├── services/
│   └── nep-lyricist/            # FastAPI Python AI Backend (Local & Training Pipeline)
├── conductor/                   # Conductor Spec-Driven Tracks & Technical Documentation
├── .github/workflows/           # Automated GitHub Pages CI/CD Workflow (deploy.yml)
├── pnpm-workspace.yaml          # Monorepo Workspace Configuration
└── package.json                 # Root Workspace Scripts & Automation Commands
```

---

## 🛠 Features & Capabilities

### 1. 🎬 Omlila Video Studio (`apps/video-gen`)
* **100% Client-Side 4K Video Rendering**: Frame-by-frame Canvas 2D engine with hardware-accelerated **WebCodecs API** (`mp4-muxer`) exporting crisp H.264 MP4 videos directly in the browser.
* **Multi-Aspect Ratio**: `16:9` (Landscape / YouTube), `9:16` (Vertical / TikTok / Reels / Shorts), and `1:1` (Square).
* **Audio & Beat Sync**: Real-time Web Audio API frequency analysis and dynamic beat detection pulsing canvas visuals and lyrics to musical rhythms.
* **Devanagari & English LRC Sync**: Dynamic subtitle and lyric alignment with word-level karaoke, kinetic motion, and customizable typography styling.
* **Offline Local Storage**: Uses browser `IndexedDB` to securely persist custom audio tracks, videos, and background artwork locally without cloud uploads.

### 2. 🤖 Pluggable App Automation Protocol & MCP Server
Every app in the Omlila ecosystem implements the standard `OmlilaAppBridge` interface on `window.omlilaApps`:

```javascript
// Available in browser console or headless Playwright/Puppeteer:
window.omlilaStudio.setLyrics(lrcText);
window.omlilaStudio.setTheme('mother-love');
window.omlilaStudio.setAspectRatio('9:16');
const frameBase64 = window.omlilaStudio.captureCanvasFrame();
const exportResult = await window.omlilaStudio.exportMP4({ quality: '2160p' });
```

* **Standard Model Context Protocol (MCP)**: Run `pnpm mcp:server` to allow AI coding agents (Antigravity, Claude, Cursor) to inspect state, preview canvas frames, and headlessly render 4K videos via standard JSON-RPC tools over `stdio`.
* **Headless CLI Agent Runner**: Run automated exports and snapshots directly from your terminal.

---

## 🚀 Quickstart & Development

### Prerequisites
* **Node.js**: `v20+`
* **pnpm**: `v9+` or `v11+`
* **Python**: `3.10+` *(optional, only needed for local AI lyric generation backend)*

### Workspace Commands

```bash
# Install all dependencies across the workspace
pnpm install

# Start both Web Portal (port 3000) and Video Studio (port 5173) in parallel
pnpm dev

# Start only the Video Studio
pnpm dev:studio

# Start only the Web Portal
pnpm dev:web

# Start the Python AI lyric backend (FastAPI on port 8000)
pnpm dev:api

# Start everything (Web + Studio + Python Backend)
pnpm dev:all

# Production Build (builds web portal and bundles video studio into ./out)
pnpm build
```

---

## 🤖 AI Agent & CLI Automation Commands

```bash
# Query active studio configuration and playback state
pnpm agent:info

# Capture a PNG snapshot of the current canvas frame
pnpm agent:preview ./preview_frame.png

# Headlessly render and export a 4K MP4 video file
pnpm agent:export ./output_4k.mp4 2160p

# Start the JSON-RPC Model Context Protocol (MCP) server
pnpm mcp:server
```

---

## ⚙️ Environment Configuration

In `apps/video-gen`:
* **`.env.production` (GitHub Pages Default)**:
  ```bash
  VITE_ENABLE_AI_LYRICIST=false
  VITE_BASE_PATH=/studio/video/
  ```
* **`.env.development` / `.env.local` (Local Fullstack Mode)**:
  ```bash
  VITE_ENABLE_AI_LYRICIST=true
  VITE_API_BASE_URL=http://localhost:8000
  VITE_BASE_PATH=/
  ```

---

## 🔒 Security & Privacy Architecture

* **Zero Server Compute & 100% Privacy**: All audio processing, lyrics parsing, canvas drawing, and 4K MP4 video encoding run strictly inside the user's browser runtime. No media or user data is uploaded to remote servers.
* **Isolated MCP Server**: The MCP automation server operates strictly via local `stdio` JSON-RPC and is never exposed over public ports.
* **Safe Static Deployment**: GitHub Pages serves pure static assets without any live server execution attack surfaces.

---

## 📄 License

MIT License © 2026 Omlila Labs.
