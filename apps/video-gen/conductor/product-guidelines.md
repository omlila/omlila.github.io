# Visual Design & Aesthetics
- **Theme & Palette**: Sleek dark mode (`#09090b` background) with rich glassmorphism UI panels (`rgba(18, 18, 22, 0.75)` backdrop-filter blur), vibrant purple/pink/amber gradient accents, and subtle borders (`rgba(255, 255, 255, 0.08)`).
- **Typography**: Google Fonts integration (`Inter`, `Montserrat`, `Poppins`, `Permanent Marker`, `Playfair Display`, `Cinzel`). Responsive text scaling proportional to canvas width (`(fontSize / 1080) * width`).
- **Interactive Feedback**: Micro-animations on button hover/click, active glow shadows (`glow-purple`), dynamic aspect ratio viewports, and confetti celebration on successful video export.

# UX Principles
- **Dual-Tier Layout**:
  - **Easy Mode (Default)**: Simple 3-step workflow (Select Preset Theme, Select Aspect Ratio, One-Click Export MP4).
  - **Advanced Studio Mode**: Expandable accordion drawer for fine-tuning font sizes, glow intensity, outline stroke width, darken opacity, color pickers, and visual FX toggles.
- **Instant Preview**: Immediate procedural Web Audio playback and real-time 60FPS Canvas preview without mandatory file uploads.

# Performance & Client-Side Execution
- **Zero Backend Dependencies**: All parsing, rendering, WebCodecs video encoding, and MP4 muxing execute 100% locally in the browser.
- **Deterministic Rendering**: Frame-by-frame timeline stepping (`t = frame / fps`) ensuring perfect output quality with 0 dropped frames.
