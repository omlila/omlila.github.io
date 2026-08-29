# Track Spec: Core Web & 4K WebCodecs Video Generator Engine

## Context & Objectives
Build and optimize the client-side Lyrical Video Generator application using React 19, Vite 8, Tailwind CSS 4, and WebCodecs API + `mp4-muxer` for deterministic 4K MP4 video export.

## Key Requirements
1. **LRC & WebVTT Parser**: Parse timestamped lyrics with word-level karaoke cues.
2. **Preset Aesthetic Themes & Canvas Overlays**: 8 preset themes (Cartoon Pop Art, Neon Cyberpunk, Retro Lofi VHS, Kinetic Pop, Cinematic Movie, Cosmic Starfield, Cyber Matrix Glitch, Pulsing Neon Glow) and 5 canvas overlays.
3. **Platform Viewports**: Aspect ratio support (`9:16`, `16:9`, `1:1`).
4. **WebCodecs 4K MP4 Export Engine**: Frame-by-frame rendering at 720p/1080p/1440p/2160p (4K) at 24/30/60 FPS with dynamic `VideoEncoder.isConfigSupported()` capability discovery.
5. **UX Architecture**: Simple 3-step mode for normal users and expandable Advanced Studio Controls for power users.
