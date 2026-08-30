# Implementation Plan: Video Subsections & Playback Directions (Forward, Reverse, Ping-Pong, Freeze)

## Phase 1: Types & Core Engine Updates
- [ ] Task: Update `MediaSequenceItem` types in `apps/video-gen/src/types/index.ts` to support `playbackDirection: 'forward' | 'reverse' | 'ping-pong' | 'freeze-frame'` and `freezeFrameTimeSec`.
- [ ] Task: Implement direction math (Forward, Reverse, Ping-Pong Boomerang, Freeze Frame) in `LyricCanvasRenderer.tsx`.
- [ ] Task: Implement frame-accurate seeking for all 4 direction modes in `mp4Exporter.ts`.

## Phase 2: UI Overhaul - Inline Video Subsections & "End Here" Workflow
- [ ] Task: Redesign `MediaSequencer.tsx` with clean inline controls (Expand Scene, Direction Selector, Speed Multiplier, Duration) without confusing modals.
- [ ] Task: Implement 1-click **"End Here"** logic that locks current clip duration to song audio time and auto-creates the next subsection from the video.
- [ ] Task: Add quick action to duplicate, reverse, or boomerang any video clip in 1 click.

## Phase 3: Verification & Production Deployment
- [ ] Task: Test live playback in browser for Forward, Reverse, Ping-Pong, and Freeze scenes.
- [ ] Task: Verify MP4 export rendering for all direction modes.
- [ ] Task: Run full monorepo build, commit, and update Conductor track registry.
