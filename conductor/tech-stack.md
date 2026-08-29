# Tech Stack

## 1. Overview
Omlila Gen uses a modern monorepo architecture, splitting the interactive lyrical video rendering capabilities to a performant frontend, and the AI lyric generation to a dedicated Python backend.

## 2. Web Portal (apps/web)
- **Framework:** Next.js 16 (App Router, Static Export)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Lucide React
- **Hosting:** GitHub Pages (`https://omlila.github.io`)

## 3. Video Studio App (apps/video-gen)
- **Framework:** React 19, Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Material Design 3 tokens
- **Icons & UI:** Lucide React
- **Video Export:** WebCodecs API, MP4 Muxer, Canvas 2D
- **Deployment Path:** Hosted statically under `/studio/` on GitHub Pages

## 4. Backend (services/nep-lyricist)
- **Language:** Python 3
- **Framework:** FastAPI (served via Uvicorn)
- **AI Models:** Fine-tuned local models (e.g. Qwen 1.5B, DeepSeek)
- **Data Pipeline:** Scrapy for data mining (from earlier iterations)
- **Environment:** virtualenv/pip with `requirements.txt`
