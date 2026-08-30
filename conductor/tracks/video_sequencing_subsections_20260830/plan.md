# Implementation Plan: Video Subsections & Playback Directions (Forward, Reverse, Ping-Pong, Freeze)

## Phase 1: Types & Core Engine Updates
- [x] Task: Update `MediaSequenceItem` types in `apps/video-gen/src/types/index.ts` to support `playbackDirection: 'forward' | 'reverse' | 'ping-pong' | 'freeze-frame'` and `freezeFrameTimeSec`.
- [x] Task: Implement direction math (Forward, Reverse, Ping-Pong Boomerang, Freeze Frame) in `LyricCanvasRenderer.tsx`.
- [x] Task: Implement frame-accurate seeking for all 4 direction modes in `mp4Exporter.ts`.

## Phase 2: UI Overhaul - Inline Video Subsections & "End Here" Workflow
- [x] Task: Redesign `MediaSequencer.tsx` with clean inline controls (Expand Scene, Direction Selector, Speed Multiplier, Duration) without confusing modals.
- [x] Task: Implement 1-click **"End Here"** logic that locks current clip duration to song audio time and auto-creates the next subsection from the video.
- [x] Task: Add quick action to duplicate, reverse, or boomerang any video clip in 1 click.

## Phase 3: Verification & Production Deployment
- [x] Task: Test live playback in browser for Forward, Reverse, Ping-Pong, and Freeze scenes.
- [x] Task: Verify MP4 export rendering for all direction modes.
- [x] Task: Run full monorepo build, commit, and update Conductor track registry.

