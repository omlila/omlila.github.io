# Task 3 Specification: Local Browser MP4 Video Export Engine (WebCodecs + mp4-muxer)

## Objective
Implement a high-performance, 100% client-side deterministic video exporter `src/utils/mp4Exporter.ts` using WebCodecs API (`VideoEncoder`, `AudioEncoder`, `VideoFrame`, `AudioData`) and `mp4-muxer`.

## Key Requirements & Constraints
- **Zero Server Dependencies**: All encoding and muxing occurs in the browser.
- **Deterministic Frame Rendering**:
  - Do NOT use `MediaRecorder` or real-time canvas capture.
  - Loop deterministically through timestamps `t = 0, 1/fps, 2/fps, ... duration` (e.g., 30 FPS).
  - At each step `t`, render frame `t` onto an offscreen canvas using `renderLyricFrame()`.
  - Convert offscreen canvas to `VideoFrame` (`new VideoFrame(offscreenCanvas, { timestamp: t * 1_000_000 })`).
  - Encode frame using `VideoEncoder.encode(frame, { keyFrame: frameIndex % (fps * 2) === 0 })`.
  - Close `VideoFrame` immediately to prevent GPU memory leaks!

- **Audio Encoding**:
  - Fetch audio source URL or blob and decode using `AudioContext.decodeAudioData(arrayBuffer)`.
  - Feed audio samples to `AudioEncoder` or mux directly via `mp4-muxer` audio track configuration.
  - Mux audio & video streams together into playable `.mp4`.

- **Muxing via `mp4-muxer`**:
  ```ts
  import * as Mp4Muxer from 'mp4-muxer';

  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: {
      codec: 'avc', // H.264
      width,
      height,
    },
    audio: {
      codec: 'aac',
      numberOfChannels: 2,
      sampleRate: 44100,
    },
    fastStart: 'in-memory',
  });
  ```

- **Progress Reporting & Download**:
  - Provide a clean callback `onProgress(status: ExportStatus)` to update UI with real-time percentage, current frame, total frames, and stage.
  - Returns final downloadable `.mp4` Blob URL (`URL.createObjectURL(blob)`).

## Files to Implement/Edit
1. `src/utils/mp4Exporter.ts`
2. `src/components/ExportModal.tsx`
