# Task 1 Specification: LRC & WebVTT Parser, Audio Sync Engine, and Sample Presets

## Objective
Implement robust parsing for `.lrc` and WebVTT lyrics formats, sample presets, and a custom React hook `useLyricAudioSync` for synchronized audio and lyrics playback.

## Files to Implement/Edit
1. `src/utils/lrcParser.ts`
2. `src/data/samplePresets.ts`
3. `src/hooks/useLyricAudioSync.ts`

## Detailed Requirements

### 1. `src/utils/lrcParser.ts`
Implement robust parsing functions:
- `parseLrc(content: string): LyricLine[]`
  - Handles standard LRC format lines like `[00:12.34] Lyrics text here` or `[01:05.67][02:10.50] Multi timestamp line`.
  - Supports inline word timestamps if present like `[00:10.00] Hello <00:10.50> world <00:11.20> again`.
  - Calculates line `endTime` based on the next line's `startTime` or line duration (defaulting to line `startTime + 4` for the last line).
  - Ignores metadata tags like `[ar: ...]`, `[ti: ...]`, `[al: ...]`, `[by: ...]`, etc.
  - Sorts all parsed lyric lines chronologically by `startTime`.
  - Assigns unique `id` to each line.

- `parseVtt(content: string): LyricLine[]`
  - Handles WebVTT cues `00:01.500 --> 00:04.000` or `01:02:03.400 --> 01:02:05.100`.
  - Extracts text and timestamps.

- `parseLyricCues(content: string): LyricLine[]`
  - Auto-detects whether `content` is VTT (starts with `WEBVTT`) or LRC and calls the appropriate parser.
  - If plain text without timestamps is provided, automatically generates estimated 4-second timing cues for each line so raw text input always works seamlessly!

### 2. `src/data/samplePresets.ts`
Define at least 2 high quality sample presets (`SamplePreset[]`):
1. **Midnight Neon (Synthwave)**
   - Includes full timestamped LRC text (e.g. 8-10 lines of catchy synthwave lyrics).
   - Audio URL using standard HTML5 Audio compatible sample audio (e.g. royalty-free mp3 data URI or reliable audio URL like `https://actions.google.com/sounds/v1/ambiences/outdoor_synth_pad.ogg` or data URL synth audio oscillator buffer / high quality royalty free CDN link).
2. **Cosmic Dreams (Lo-Fi Chill)**
   - Includes timestamped LRC text.

### 3. `src/hooks/useLyricAudioSync.ts`
React Hook accepting `(lyrics: LyricLine[], initialAudioUrl?: string)`:
- State: `isPlaying` (boolean), `currentTime` (number), `duration` (number), `volume` (number), `activeLineIndex` (number), `activeWordIndex` (number), `audioUrl` (string).
- Controls: `play()`, `pause()`, `togglePlay()`, `seek(time: number)`, `setVolume(vol: number)`, `setAudioUrl(url: string)`.
- Calculates current `activeLineIndex`: the index in `lyrics` where `currentTime >= line.startTime && currentTime <= line.endTime` (or nearest preceding line if in gap).
- Calculates current `activeWordIndex` if word timing exists.
- Listens to audio element `timeupdate`, `ended`, `loadedmetadata`, `play`, `pause` events cleanly with `requestAnimationFrame` for super smooth high-precision 60fps currentTime updates!
