import React, { useState } from 'react';
import type { AspectRatio, LyricLine, MediaSequenceItem, ResolutionQuality, StyleConfig, VisualThemePreset } from '../types';
import { THEME_PRESETS } from '../data/themePresets';
import { parseLyricCues, autoSpreadLyricTimings, unescapeRtf } from '../utils/lrcParser';
import {
  Wand2,
  Upload,
  Music,
  FileText,
  Image as ImageIcon,
  Sparkles,
  X,
  Play,
  Monitor,
  Smartphone,
  Zap,
  Heart,
} from 'lucide-react';

interface AutoVideoWizardModalProps {
  onClose: () => void;
  onApplyAutoVideo: (config: {
    audioUrl: string;
    lyrics: LyricLine[];
    lrcRawText: string;
    mediaItems: MediaSequenceItem[];
    styleConfig: StyleConfig;
    aspectRatio: AspectRatio;
    quality: ResolutionQuality;
    autoTriggerExport?: boolean;
  }) => void;
  currentAudioDuration: number;
}

export const AutoVideoWizardModal: React.FC<AutoVideoWizardModalProps> = ({
  onClose,
  onApplyAutoVideo,
  currentAudioDuration,
}) => {
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioFileName, setAudioFileName] = useState<string>('No Audio Selected');
  const [rawLyricsText, setRawLyricsText] = useState<string>('');

  const [selectedTheme, setSelectedTheme] = useState<VisualThemePreset>('mother-love');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [quality, setQuality] = useState<ResolutionQuality>('2160p');

  const [uploadedImages, setUploadedImages] = useState<MediaSequenceItem[]>([]);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setAudioFileName(file.name);
    }
  };

  const handleLyricsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const cleaned = unescapeRtf(text);
          setRawLyricsText(cleaned);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newItems: MediaSequenceItem[] = Array.from(files).map((file, idx) => ({
        id: `wizard_img_${Date.now()}_${idx}`,
        name: file.name,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        url: URL.createObjectURL(file),
        durationSec: 10.0,
      }));
      setUploadedImages((prev) => [...prev, ...newItems]);
    }
  };

  const handleLoadDemoPreset = () => {
    setAudioUrl('');
    setAudioFileName('No Audio Selected (Demo)');
    setRawLyricsText(`[00:00.00] [Intro - Cinematic Swell]
[00:04.00] The journey begins here
[00:08.00] Colors painting the sky
[00:12.00] Shadows slowly fade away
[00:16.00] Embrace the morning light
[00:20.00] [Outro - Fade]`);
    setSelectedTheme('cinematic');
    setQuality('2160p');
    setAspectRatio('16:9');
    setUploadedImages([
      {
        id: 'demo_img_1',
        name: 'Cinematic Landscape 1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1447958272669-9c5ce24c8bf2?w=600&auto=format&fit=crop&q=80',
        durationSec: 10.0,
      },
      {
        id: 'demo_img_2',
        name: 'Cinematic Landscape 2',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
        durationSec: 10.0,
      }
    ]);
  };

  const handleGenerate = (autoExport: boolean = false) => {
    const themeDef = THEME_PRESETS.find((t) => t.id === selectedTheme) || THEME_PRESETS[0];

    // Parse lyrics
    let parsedLyrics = parseLyricCues(rawLyricsText);

    // If lyrics are not timestamped (e.g. plain text or RTF), auto-spread them evenly across song duration
    const hasTimestamps = /\[\d{2}:\d{2}/.test(rawLyricsText);
    if (!hasTimestamps && parsedLyrics.length > 0) {
      const estimatedAudioLength = currentAudioDuration || 218.2;
      parsedLyrics = autoSpreadLyricTimings(parsedLyrics, estimatedAudioLength, 10);
    }

    // Auto calculate image clip durations so they evenly span the total audio length
    const totalAudioSec = currentAudioDuration || 218.2;
    const finalMediaItems = [...uploadedImages];
    if (finalMediaItems.length > 0) {
      const perImageDuration = totalAudioSec / finalMediaItems.length;
      finalMediaItems.forEach((item) => {
        item.durationSec = Math.round(perImageDuration * 10) / 10;
      });
    }

    const mergedStyle: StyleConfig = {
      showLyrics: themeDef.style.showLyrics ?? true,
      textPosition: themeDef.style.textPosition || { preset: 'center', offsetYPercent: 50, offsetXPercent: 50, scale: 1.1 },
      backgroundTransform: themeDef.style.backgroundTransform || { scale: 1.0, offsetXPercent: 0, offsetYPercent: 0, fitMode: 'cover' },
      themePreset: selectedTheme,
      fontFamily: selectedTheme === 'mother-love' ? 'Noto Sans Devanagari' : (themeDef.style.fontFamily || 'Inter'),
      fontSize: 56,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textColor: '#fff7ed',
      activeTextColor: '#fbbf24',
      glowColor: '#f59e0b',
      glowIntensity: 35,
      strokeColor: '#1c1917',
      strokeWidth: 6,
      textAlign: 'center',
      animationType: 'karaoke',
      motionCurve: 'cinematic-cubic',
      backgroundType: 'image',
      backgroundColor: themeDef.style.backgroundColor || '#051c14',
      backgroundGradient: themeDef.style.backgroundGradient || 'linear-gradient(135deg, #051c14, #064e3b, #022c22)',
      backgroundImageUrl: finalMediaItems[0]?.url || '/mother_golden.jpg',
      backgroundBlur: 0,
      backgroundDarken: 0.3,
      linesToShow: 3,
      highlightActiveWord: true,
      enableParticles: true,
      enableVignette: true,
      enableScanlines: false,
      enableHalftone: false,
      enableLetterbox: false,
      enableAudioSpectrum: true,
      enableKenBurns: true,
    };

    onApplyAutoVideo({
      audioUrl,
      lyrics: parsedLyrics,
      lrcRawText: rawLyricsText,
      mediaItems: finalMediaItems,
      styleConfig: mergedStyle,
      aspectRatio,
      quality,
      autoTriggerExport: autoExport,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="md-surface-container-high max-w-4xl w-full p-8 shadow-[var(--md-sys-elevation-4)] space-y-6 relative my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Auto Video Wizard"
          className="absolute top-5 right-5 p-2 rounded-full text-[var(--md-sys-color-on-surface-variant)] md-button-tonal !px-2 cursor-pointer"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-500 flex items-center justify-center shadow-lg glow-emerald shrink-0">
            <Wand2 className="w-6 h-6 text-white animate-pulse" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-white via-amber-200 to-emerald-400 bg-clip-text text-transparent">
                Auto Lyrical Video Generator
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                1-Click Studio
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Provide Audio, Lyrics (LRC/RTF/TXT), & Images to auto-create a production-grade 4K YouTube video with Ken Burns motion & Devanagari lyrics.
            </p>
          </div>
        </div>

        {/* 1-Click Sample Preset Bar */}
        <div className="p-6 rounded-2xl md-surface-container border border-[var(--md-sys-color-primary)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-[var(--md-sys-color-primary)] shrink-0" aria-hidden="true" />
            <div>
              <div className="text-sm font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-1.5">
                <span>Load Demo Assets</span>
              </div>
              <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                Instantly populate with sample lyrics and 4K background images to test the wizard!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLoadDemoPreset}
            aria-label="Load demo preset"
            className="md-button-filled shrink-0 flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Load Demo</span>
          </button>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Audio Input */}
          <div className="space-y-3 md-surface-container p-6">
            <label htmlFor="wizard-audio-upload-input" className="text-sm font-bold text-[var(--md-sys-color-primary)] flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-1.5">
                <Music className="w-4 h-4 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
                1. Audio Track (WAV, MP3, M4A)
              </span>
            </label>
            <div className="flex items-center gap-2">
              <label htmlFor="wizard-audio-upload-input" className="flex-1 md-button-outlined cursor-pointer flex items-center gap-2 overflow-hidden">
                <Upload className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{audioFileName}</span>
                <input
                  id="wizard-audio-upload-input"
                  type="file"
                  accept="audio/*,.wav,.mp3,.aac,.flac,.m4a,.ogg"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Lyrics Input */}
          <div className="space-y-3 md-surface-container p-6">
            <label htmlFor="wizard-lyrics-upload-input" className="text-sm font-bold text-[var(--md-sys-color-tertiary)] flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[var(--md-sys-color-tertiary)]" aria-hidden="true" />
                2. Lyrics File (RTF, LRC, TXT)
              </span>
            </label>
            <label htmlFor="wizard-lyrics-upload-input" className="md-button-outlined cursor-pointer flex items-center gap-2">
              <Upload className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Upload Lyrics File (.rtf, .lrc, .txt)</span>
              <input
                id="wizard-lyrics-upload-input"
                type="file"
                accept=".json,.srt,.rtf,.lrc,.vtt,.txt"
                onChange={handleLyricsFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Lyrics Text Preview Box */}
        <div className="space-y-3">
          <label htmlFor="wizard-lyrics-textarea" className="text-sm font-bold text-[var(--md-sys-color-on-surface)] flex items-center justify-between">
            <span>Lyrics Content & Timings (RTF Unicode Auto-Decoded):</span>
            <span className="text-[10px] text-[var(--md-sys-color-tertiary)] font-mono">Auto-Devanagari Ready</span>
          </label>
          <textarea
            id="wizard-lyrics-textarea"
            value={rawLyricsText}
            onChange={(e) => setRawLyricsText(e.target.value)}
            rows={5}
            placeholder="Paste your lyrics here..."
            className="w-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-4 py-3 rounded-xl font-mono resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)]"
          />
        </div>

        {/* Media Background Images Input */}
        <div className="space-y-3 md-surface-container p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--md-sys-color-secondary)] flex items-center gap-1.5">
              <ImageIcon className="w-5 h-5 text-[var(--md-sys-color-secondary)]" aria-hidden="true" />
              3. Background Image Sequence ({uploadedImages.length} items loaded)
            </span>
            <label htmlFor="wizard-images-upload-input" className="md-button-tonal cursor-pointer flex items-center gap-1.5 text-sm">
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Add Images/Videos</span>
              <input
                id="wizard-images-upload-input"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleImagesUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            {uploadedImages.map((img) => (
              <div key={img.id} className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-zinc-950 group">
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between text-[10px]">
                  <span className="text-white font-bold truncate">{img.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Theme, Quality & Aspect Ratio Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
          <div>
            <label htmlFor="wizard-theme-select" className="text-sm font-bold text-[var(--md-sys-color-on-surface)] mb-2 block">Visual Theme</label>
            <select
              id="wizard-theme-select"
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value as VisualThemePreset)}
              className="w-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-3 py-2.5 rounded-xl font-bold focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none"
            >
              {THEME_PRESETS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] mb-2 block">Aspect Ratio</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 border transition-colors focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none ${
                  aspectRatio === '16:9' ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent' : 'bg-[var(--md-sys-color-surface-container-highest)] border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                <Monitor className="w-4 h-4" aria-hidden="true" /> 16:9
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 border transition-colors focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none ${
                  aspectRatio === '9:16' ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent' : 'bg-[var(--md-sys-color-surface-container-highest)] border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                <Smartphone className="w-4 h-4" aria-hidden="true" /> 9:16
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="wizard-quality-select" className="text-sm font-bold text-[var(--md-sys-color-on-surface)] mb-2 block">Output Quality</label>
            <select
              id="wizard-quality-select"
              value={quality}
              onChange={(e) => setQuality(e.target.value as ResolutionQuality)}
              className="w-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-3 py-2.5 rounded-xl font-bold focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none"
            >
              <option value="2160p">✨ 4K Ultra HD (3840x2160)</option>
              <option value="1440p">2K QHD (2560x1440)</option>
              <option value="1080p">1080p Full HD (1920x1080)</option>
            </select>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--md-sys-color-outline-variant)]">
          <button
            type="button"
            onClick={onClose}
            className="md-button-text"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleGenerate(false)}
            className="md-button-tonal flex items-center gap-2"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            <span>Generate & Preview</span>
          </button>

          <button
            type="button"
            onClick={() => handleGenerate(true)}
            className="md-button-filled flex items-center gap-2"
          >
            <Zap className="w-4 h-4" aria-hidden="true" />
            <span>Generate & Export 4K MP4</span>
          </button>
        </div>
      </div>
    </div>
  );
};
