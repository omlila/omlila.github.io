# Implementation Plan: Enhanced Multi-Section Video Sequencer & Scene Transitions

## Phase 1: Data Model & Timing Engine Architecture
- [ ] Task: Extend `MediaSequenceItem` and `StyleConfig` in `types/index.ts` with explicit in/out points, transition types (`crossfade`, `fade-black`, `blur-dissolve`, `cut`), and speed modes
- [ ] Task: Write unit tests and implement pure video timing functions in `utils/videoSequencerEngine.ts` (`calculateVideoTime`, `calculateEffectivePlaybackRate`, `autoContiguousSlice`)
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Data Model & Timing Engine Architecture' (Protocol in workflow.md)

## Phase 2: Live Canvas Renderer & WebCodecs Offline 4K Exporter Integration
- [ ] Task: Update `LyricCanvasRenderer.tsx` with high-performance multi-layer video transitions (Crossfade, Fade-to-Black, Blur Dissolve) and glitch-free Reverse/Boomerang seeking
- [ ] Task: Update `mp4Exporter.ts` to render precise in/out trimmed video slices, playback directions, speed stretching, and dual-layer scene transitions in 4K MP4 exports
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Live Canvas Renderer & WebCodecs Offline 4K Exporter Integration' (Protocol in workflow.md)

## Phase 3: Interactive Video Sequencer UI & Card Controls
- [ ] Task: Update `MediaSequencer.tsx` with explicit `Start Time` and `Finish Time` inputs, "Set In" / "Set Out" quick buttons, and contiguous auto-spawn
- [ ] Task: Add mini visual video frame scrubber & preview popup for effortless in/out point selection
- [ ] Task: Add 1-click direction buttons (⏩ Forward, ⏪ Reverse, 🪃 Boomerang, ⏸️ Freeze) and Speed Presets (0.25x, 0.5x, 0.75x, 1.0x, Auto-Fit)
- [ ] Task: Add Scene Transition Controls & duration slider to top toolbar and scene cards
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Interactive Video Sequencer UI & Card Controls' (Protocol in workflow.md)
