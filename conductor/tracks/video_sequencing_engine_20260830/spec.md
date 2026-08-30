# Track Specification: Enhanced Multi-Section Video Sequencer & Scene Transitions

## 1. Overview
Empower users to build dynamic, cinematic lyrical videos from their uploaded video footage and images. Users can split a single source video into multiple contiguous or independent scenes, set precise **Start Time (In-Point)** and **Finish Time (Out-Point)** timestamps, apply **Forward, Reverse, Boomerang Loop, and Freeze Still** playback directions, auto-fit/stretch clip durations to match audio beats, and apply smooth **Scene Transitions** (Crossfade, Fade to Black, Blur Dissolve, Instant Cut).

---

## 2. Functional Requirements

### 2.1 Explicit In/Out Video Trimming on Every Scene Card
- **Video Time Range Inputs**: Direct numerical inputs for `Start Time (In-Point)` and `Finish Time (Out-Point)` on each video scene card.
- **Visual Video Scrubber & Preview**: Mini scrubber / preview modal on each card showing exact video timestamp, duration, and frame previews.
- **1-Click "Set In" / "Set Out"**: Grab current live video timestamp with a single click.

### 2.2 Flexible Time-Stretching & Playback Direction
- **Auto-Fit Time Stretch (Default)**: Automatically calculate playback rate (`(trimEnd - trimStart) / durationSec`) so the chosen video section stretches smoothly across the entire scene without abrupt looping or cutting.
- **Speed Multipliers**: Direct 1-click presets for `0.25x Super Slow`, `0.5x Cinematic Slow`, `0.75x Gentle`, `1.0x Normal`, and `Auto-Fit`.
- **Playback Directions**:
  - `⏩ Forward`: Standard forward playback from In-Point to Out-Point.
  - `⏪ Reverse`: Backwards motion starting from Out-Point down to In-Point.
  - `🪃 Boomerang`: Continuous forward-then-reverse ping-pong loop.
  - `⏸️ Freeze Still`: Hold a specific frame still for dramatic effect.

### 2.3 Contiguous Scene Auto-Spawn & Split
- **Contiguous Auto-Spawn**: When adding a new scene from the same video, automatically set the new scene's `Start Time` to the previous scene's `Finish Time` so the video flows naturally.
- **1-Click "End Here ✂️"**: Locks the current scene's duration to current audio playback time and immediately spawns the next scene starting from that exact video timestamp.

### 2.4 Simplified Scene Transitions
- **Transition Selector**: Easy global and per-scene transition picker (`Crossfade Dissolve`, `Fade to Black`, `Blur Dissolve`, `Instant Cut`).
- **Transition Duration Slider**: Configurable overlap duration (`0.0s` to `2.5s`).
- **Dual-Layer Canvas Blending**: Renders seamless transitions both in live 60fps canvas preview and in 4K MP4 export.

---

## 3. Acceptance Criteria
1. Users can upload a video, define multiple scenes with custom Start/Finish times, and see each scene play the exact requested video slice.
2. Reverse and Boomerang scenes render smoothly in live canvas playback and export frame-perfect MP4 videos.
3. Auto-Fit speed stretches video slices to fit the exact scene duration without jumping or unexpected loops.
4. Scene transitions (Crossfade, Fade-to-Black, Blur Dissolve) execute smoothly between consecutive media clips.
5. All scene configurations persist safely in IndexedDB / LocalStorage.
