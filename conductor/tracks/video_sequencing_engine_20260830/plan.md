# Implementation Plan: Enhanced Multi-Section Video Sequencer & Scene Transitions

## Phase 1: Data Model & Timing Engine Architecture
- [x] Task: Extend `MediaSequenceItem` and `StyleConfig` in `types/index.ts` with explicit in/out points, transition types (`crossfade`, `fade-black`, `blur-dissolve`, `cut`), and speed modes [80a4656]
- [x] Task: Write unit tests and implement pure video timing functions in `utils/videoSequencerEngine.ts` (`calculateVideoTime`, `calculateEffectivePlaybackRate`, `autoContiguousSlice`) [ff3960a]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Data Model & Timing Engine Architecture' (Protocol in workflow.md) [ff3960a]

## Phase 2: Live Canvas Renderer & WebCodecs Offline 4K Exporter Integration
- [x] Task: Update `LyricCanvasRenderer.tsx` with high-performance multi-layer video transitions (Crossfade, Fade-to-Black, Blur Dissolve) and glitch-free Reverse/Boomerang seeking [f279268]
- [x] Task: Update `mp4Exporter.ts` to render precise in/out trimmed video slices, playback directions, speed stretching, and dual-layer scene transitions in 4K MP4 exports [f279268]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Live Canvas Renderer & WebCodecs Offline 4K Exporter Integration' (Protocol in workflow.md) [f279268]

## Phase 3: Interactive Video Sequencer UI & Card Controls
- [x] Task: Update `MediaSequencer.tsx` with explicit `Start Time` and `Finish Time` inputs, "Set In" / "Set Out" quick buttons, and contiguous auto-spawn [acb9b43]
- [x] Task: Add mini visual video frame scrubber & preview popup for effortless in/out point selection [acb9b43]
- [x] Task: Add 1-click direction buttons (⏩ Forward, ⏪ Reverse, 🪃 Boomerang, ⏸️ Freeze) and Speed Presets (0.25x, 0.5x, 0.75x, 1.0x, Auto-Fit) [acb9b43]
- [x] Task: Add Scene Transition Controls & duration slider to top toolbar and scene cards [acb9b43]
- [x] Task: Conductor - User Manual Verification 'Phase 3: Interactive Video Sequencer UI & Card Controls' (Protocol in workflow.md) [acb9b43]
