# Initial Concept
A web-based client-side application enabling users to create synchronized lyrical videos using CSS keyframes and Canvas animations, featuring local 4K MP4 export via WebCodecs + mp4-muxer and a modular architecture ready for React Native migration.

# Product Vision
The Web-First Lyrical Video Generator empowers content creators, musicians, and social media managers to convert timestamped lyrics (.lrc, WebVTT, or plain text) and audio files into high-quality, synchronized lyrical videos directly inside the browser. By executing 100% client-side without server dependencies, it provides instantaneous real-time canvas previewing and deterministic frame-by-frame 4K MP4 export.

# Core Objectives & Features
1. **Synchronized Lyric Engine**: Robust `.lrc` and WebVTT timing cue parser with word-level karaoke sync and 60FPS audio playback synchronization.
2. **Preset Aesthetic Themes & Canvas FX**: 8 curated one-click visual themes (Cartoon Pop Art, Neon Cyberpunk, Retro Lofi VHS, Kinetic Pop, Cinematic Movie, Cosmic Starfield, Cyber Matrix Glitch, Pulsing Neon Glow) and 5 canvas overlays (Halftone dot grid, Space particles, CRT scanlines, Cinema letterbox, Vignette).
3. **Platform Viewports & Responsive Controls**: Multi-aspect ratio containers (`9:16` Vertical for TikTok/Reels/Shorts, `16:9` Widescreen for YouTube, `1:1` Square for Instagram).
4. **Deterministic Client-Side 4K MP4 Export**: Frame-by-frame rendering loop using WebCodecs API (`VideoEncoder`, `VideoFrame`) + `mp4-muxer` with auto-detected codec support up to 4K Ultra HD at 24/30/60 FPS.
5. **React Native Mobile Readiness**: Decoupled UI and Canvas animation layer designed for seamless embedding inside Expo `react-native-webview` / `expo-dom` components.
