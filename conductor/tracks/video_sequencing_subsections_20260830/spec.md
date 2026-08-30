# Specification: Intuitive Video Subsections & Playback Directions (Forward, Reverse, Ping-Pong, Freeze)

## 1. Overview
Replace separate complex cropping/trimming modals with an intuitive, inline video expansion workflow. Content creators can upload a video, expand it into ordered scene subsections, use a 1-click **"End Here"** action while listening to audio to lock segment boundaries, and apply creative playback effects (**Forward**, **Reverse**, **Ping-Pong / Boomerang**, and **Freeze Frame**).

## 2. Functional Requirements
- **Inline Video Expansion & Subsections**:
  - Add an **"+ Add Scene / Expand"** button directly on video cards.
  - Clicking **"End Here"** during song playback sets the active clip's end time to the song's current time and automatically creates the next contiguous scene from the same video.
- **Playback Direction & Motion Modes**:
  - `Forward` (Default): Plays video forward in normal direction.
  - `Reverse`: Plays video in reverse backwards.
  - `Ping-Pong (Boomerang)`: Plays forward then backward in a seamless loop.
  - `Freeze-Frame`: Holds a single frame still across the segment duration.
- **Simplified Inline UI**:
  - Clean card layout with Duration, Speed Multiplier (`0.25x` to `2.0x`), Direction Selector, and Reorder arrows.
  - No confusing modal dialogs.
- **Rendering & MP4 Export Engine**:
  - Seamless GPU-accelerated canvas playback and frame-accurate seeking in `mp4Exporter.ts` for all 4 direction modes.

## 3. Acceptance Criteria
- [ ] Users can expand any video into sequential subsections inline.
- [ ] "End Here" cleanly splits at current audio time and spawns the next scene.
- [ ] Forward, Reverse, Ping-Pong, and Freeze Frame modes render correctly in live preview and exported MP4.
- [ ] Monorepo build and unit tests pass with zero errors.
