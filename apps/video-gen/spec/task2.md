# Task 2 Specification: Canvas & CSS Animation Engine & Styling Controls

## Objective
Build a modular canvas animation rendering engine (`src/utils/canvasRenderer.ts`), a React Canvas Renderer component (`src/components/LyricCanvasRenderer.tsx`), styling controls (`src/components/LyricStylingControls.tsx`), and responsive aspect-ratio viewport container (`src/components/CanvasViewport.tsx`).

## Core Requirement: Decoupled Pure Canvas Engine
The canvas rendering logic MUST be a pure, deterministic function `renderLyricFrame()` that accepts `(ctx: CanvasRenderingContext2D, width: number, height: number, lyrics: LyricLine[], currentTime: number, style: StyleConfig, bgMedia?: HTMLImageElement | HTMLVideoElement | null)`:
- This function draws the background (color/gradient/image/video with blur & darken overlay).
- It draws the active lyric lines centered in the frame or aligned based on `style.textAlign`.
- Handles font sizing proportional to `width` so it looks identical at 540x960 preview resolution and 1080x1920 export resolution!
- Supports text glow effects (`ctx.shadowColor`, `ctx.shadowBlur`).
- Supports Karaoke progressive text fill (coloring text word-by-word or character-by-character based on line progress).
- Supports text stroke/outline (`ctx.strokeText`).
- Animation transitions (fade-in, pop-in, kinetic slide up, bounce).

## Files to Create/Edit
1. `src/utils/canvasRenderer.ts`
2. `src/components/LyricCanvasRenderer.tsx`
3. `src/components/LyricStylingControls.tsx`
4. `src/components/CanvasViewport.tsx`

## Specs

### 1. `src/utils/canvasRenderer.ts`
Export function `renderLyricFrame(...)`:
- Parameters:
  - `ctx: CanvasRenderingContext2D`
  - `width: number` (e.g. 1080, 1920)
  - `height: number` (e.g. 1920, 1080)
  - `lyrics: LyricLine[]`
  - `currentTime: number`
  - `style: StyleConfig`
  - `bgElement?: HTMLImageElement | HTMLVideoElement | null`
- Logic:
  1. Clear rect.
  2. Draw background:
     - If `backgroundType === 'color'`: `ctx.fillStyle = style.backgroundColor`.
     - If `backgroundType === 'gradient'`: Parse gradient or draw linear/radial gradient.
     - If `backgroundType === 'image'` or `'video'` and `bgElement` loaded: Draw image scaled with `object-fit: cover` logic. Apply darken overlay with `style.backgroundDarken` opacity black rect.
  3. Find active line index.
  4. Compute line window (e.g., if `linesToShow === 3`, show prev line, active line, next line).
  5. Calculate font size scaled by canvas width: `fontSize = (style.fontSize / 1080) * width`.
  6. Set `ctx.font = "${style.fontStyle} ${style.fontWeight} ${fontSize}px ${style.fontFamily}"`.
  7. Set `ctx.textAlign = style.textAlign`.
  8. For active line:
     - Calculate word or character highlight ratio based on line timing: `lineProgress = (currentTime - line.startTime) / (line.endTime - line.startTime)`.
     - Apply glow: `ctx.shadowColor = style.glowColor; ctx.shadowBlur = style.glowIntensity`.
     - If `highlightActiveWord` or `animationType === 'karaoke'`:
       - Measure text width.
       - Draw base text in `style.textColor`.
       - Clip/fill highlighted portion in `style.activeTextColor` based on progress!
     - Draw text stroke if `style.strokeWidth > 0`.
  9. For inactive lines (previous/next):
     - Render with lower opacity (`rgba(..., 0.4)`).

### 2. `src/components/LyricCanvasRenderer.tsx`
React component:
- Props: `lyrics: LyricLine[]`, `currentTime: number`, `style: StyleConfig`, `aspectRatio: AspectRatio`, `bgMediaUrl?: string`.
- Maintains HTML `<canvas>` element and offscreen background image/video element.
- Runs `requestAnimationFrame` loop on canvas when playing or when props update to keep preview 60fps responsive.

### 3. `src/components/LyricStylingControls.tsx`
Rich Glassmorphism UI panel:
- Font Family dropdown (Inter, Montserrat, Poppins, Permanent Marker, Playfair Display, Cinzel).
- Font size slider & Weight toggles.
- Colors: Text Color, Active Karaoke Color, Glow Color, Stroke Color.
- Glow intensity & Stroke width sliders.
- Animation style selector (Fade, Pop, Karaoke, Kinetic Slide, Bounce).
- Background selector: Preset Colors, Gradients, or custom File Upload (Image/Video).
- Blur & Darken sliders.
- Lines to show selector (1, 3, 5).

### 4. `src/components/CanvasViewport.tsx`
Responsive container that houses `<LyricCanvasRenderer>`:
- Preset buttons for Aspect Ratios (`9:16` 1080x1920, `16:9` 1920x1080, `1:1` 1080x1080).
- Scales preview canvas dynamically to fit screen without quality loss while preserving exact canvas pixel resolution!
