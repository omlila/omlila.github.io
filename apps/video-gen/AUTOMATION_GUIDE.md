# 🎬 OpenReel 4K Lyrical Video Automation & Scripting Guide

> **Song Context**: *"Aama"* (Mother's Love & Sacrifice)  
> **Cultural Setting**: Nepali mother growing up in the hills of **Pokhara, Nepal** (Machhapuchhre / Fishtail peak, Annapurna range, terrace fields, traditional stone cottage, and rhododendron Lali Gurans blossoms).  
> **Export Format**: **4K Ultra HD (3840 × 2160 @ 30 FPS, 35 Mbps H.264 MP4)** via WebCodecs API.

---

## 🛠 Architecture Overview

OpenReel provides two complementary automation surfaces:
1. **Studio Canvas Engine (`src/utils/canvasRenderer.ts` & `src/utils/mp4Exporter.ts`)**: Frame-by-frame 2D Canvas rendering engine with particle systems, audio spectrum visualizer, Ken Burns motion effects, easing curves, and WebCodecs hardware encoding.
2. **Headless Chrome Automation (`scripts/export-aama-video.js`)**: Puppeteer / Chrome DevTools script that launches the web editor at `http://localhost:5173/#/editor`, sets up project configuration, and encodes the production-grade 4K MP4 file automatically.

---

## 📁 Key Project Assets & Location

| Asset | Local File Path | Public Web Path | Description |
| :--- | :--- | :--- | :--- |
| **Audio File** | `/Users/sanjeevbhusal/Downloads/aama song/aama.wav` | `/aama.wav` | 3m 38s full song (48kHz Stereo WAV) |
| **Devanagari Lyrics** | `/Users/sanjeevbhusal/Downloads/aama song/lyrics.rtf` | Handled via LRC | Timestamped Nepali lyrics cue file |
| **Scene 1 Artwork** | `public/mother_golden.jpg` | `/mother_golden.jpg` | Pokhara hill sunset, mother & child, Machhapuchhre peak |
| **Scene 2 Artwork** | `public/mother_night.jpg` | `/mother_night.jpg` | Moonlight Himalayas night window with traditional brass diya |
| **Scene 3 Artwork** | `public/mother_flowers.jpg` | `/mother_flowers.jpg` | Rhododendron (Lali Gurans) blooming over Pokhara valley |

---

## 📜 Timed Devanagari Lyrics (LRC Format)

```lrc
[00:00.00] [Intro - Acoustic Guitar]
[00:12.00] धेरै ती रात
[00:18.00] आँसुका साथ
[00:24.00] काटेछौ तिमीले
[00:30.00] सारा ती दुःख
[00:36.00] बिर्सी है आमा
[00:42.00] हुर्कायौ हामीलाई
[00:50.00] आ... आमा
[01:02.00] तिम्रा ती दुःख
[01:08.00] तिम्रा ती पीडा
[01:14.00] गएका छैनन् खेर
[01:20.00] तिम्रा ती दुई
[01:26.00] आँखाका नानी
[01:32.00] भएका छैनन् टाढा
[01:42.00] हरेक पल
[01:48.00] सम्झी रहन्छन् तिमीलाई
[01:56.00] धेरै नै माया
[02:02.00] गरी रहन्छन् तिमीलाई
[02:12.00] फुलेका फूल
[02:18.00] बासना छर्न
[02:24.00] गएका हुन् ती टाढा
[02:30.00] आउनेछन् फेरि
[02:36.00] तिम्रै त्यो साथ
[02:42.00] तिमीलाई खुसी पार्न
[02:50.00] धेरै ती रात
[02:56.00] आँसुका साथ
[03:02.00] काटेछौ तिमीले
[03:08.00] सारा ती दुःख
[03:14.00] बिर्सी है आमा
[03:20.00] हुर्कायौ हामीलाई
[03:26.00] आ... आमा
[03:32.00] [Outro - Acoustic Guitar Fade]
```

---

## 🚀 Running Video Automation

To execute automated 4K video rendering and export from the command line:

```bash
# 1. Start OpenReel Dev Server (if not already running)
npm run dev

# 2. Run the Chrome DevTools Puppeteer Automation Script
node scripts/export-aama-video.js
```

### Output Files Generated:
- 🎬 `/Users/sanjeevbhusal/Downloads/aama song/aama_4k_lyrical_video.mp4`
- 🎬 `dist/aama_4k_lyrical_video.mp4`
- 📸 `scripts/screenshots/01_pokhara_mother_editor.png`
- 📸 `scripts/screenshots/02_export_studio_modal.png`
- 📸 `scripts/screenshots/03_export_completed.png`

---

## 💻 Scripting Custom Video Pipelines

You can programmatically customize the video rendering in your own scripts using `exportLyricalVideoMP4`:

```typescript
import { exportLyricalVideoMP4 } from './src/utils/mp4Exporter';
import { parseLyricCues } from './src/utils/lrcParser';

const lyrics = parseLyricCues(lrcText);
const blob = await exportLyricalVideoMP4(
  lyrics,
  '/aama.wav',
  {
    fontFamily: 'Cinzel',
    fontSize: 56,
    textColor: '#fff7ed',
    activeTextColor: '#fbbf24',
    glowColor: '#f59e0b',
    glowIntensity: 35,
    animationType: 'karaoke',
    motionCurve: 'cinematic-cubic',
    backgroundType: 'image',
    backgroundImageUrl: '/mother_golden.jpg',
    enableParticles: true,
    enableKenBurns: true,
    enableVignette: true,
    enableAudioSpectrum: true,
  },
  {
    aspectRatio: '16:9',
    quality: '2160p', // 4K Ultra HD (3840x2160)
    fps: 30,
    customBitrate: 35_000_000,
  },
  (status) => console.log(`Encoding frame ${status.currentFrame}/${status.totalFrames} (${status.progress}%)`),
  bgImageElement,
  mediaItemsSequence
);
```

---

## 🏁 Summary Checklist

- [x] Audio `/aama.wav` linked to timeline.
- [x] Timed Devanagari lyrics mapped for *Aama*.
- [x] 3 Pokhara, Nepal authentic 4K artworks generated & integrated.
- [x] 16:9 YouTube Widescreen aspect ratio configured.
- [x] 4K Ultra HD (2160p) resolution & WebCodecs bitrate optimized.
- [x] Chrome DevTools automation script (`scripts/export-aama-video.js`) ready.
