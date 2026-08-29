import React, { useState, useEffect } from 'react';
import type { AspectRatio, AppWorkspaceTheme, ExportConfig, ExportStatus, LyricLine, MediaSequenceItem, ResolutionQuality, StyleConfig } from './types';
import { QUALITY_CONFIGS } from './types';
import { WORKSPACE_THEMES } from './data/appThemes';
import { parseLyricCues, formatLyricCuesToLrc } from './utils/lrcParser';
import { createSynthesizedAudioUrl, SAMPLE_PRESETS } from './data/samplePresets';
import { THEME_PRESETS } from './data/themePresets';
import { useLyricAudioSync } from './hooks/useLyricAudioSync';
import { useBeatSync } from './hooks/useBeatSync';
import { CanvasViewport } from './components/CanvasViewport';
import { LyricStylingControls } from './components/LyricStylingControls';
import { MediaSequencer } from './components/MediaSequencer';
import { LyricTimelineEditor } from './components/LyricTimelineEditor';
import { ExportModal } from './components/ExportModal';
import { AutoVideoWizardModal } from './components/AutoVideoWizardModal';
import { NepaliLyricistModal } from './components/NepaliLyricistModal';
import { NepaliLyricistPlaygroundPage } from './components/NepaliLyricistPlaygroundPage';
import { exportLyricalVideoMP4 } from './utils/mp4Exporter';
import {
  Video,
  FileText,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Volume2,
  Sparkles,
  Wand2,
  Layers,
  Palette,
  Save,
  CheckCircle2,
} from 'lucide-react';

import { getMediaFile, getAudioFile, saveAudioFile, saveMediaFile } from './utils/mediaStore';
import { registerStudioBridge, notifyStudioStateChange } from './automation/omlilaStudioBridge';

export default function App() {
  const isLyricistEnabled = import.meta.env.VITE_ENABLE_AI_LYRICIST === 'true';
  const baseUrl = (import.meta.env.BASE_URL || './').endsWith('/') ? (import.meta.env.BASE_URL || './') : `${import.meta.env.BASE_URL}/`;

  const initialPreset = SAMPLE_PRESETS[0];
  const initialTheme = THEME_PRESETS[0];

  const [workspaceTheme, setWorkspaceTheme] = useState<AppWorkspaceTheme>(() => {
    return (localStorage.getItem('omlila_saved_workspaceTheme') as AppWorkspaceTheme) || 'forest-green';
  });
  const [lrcInputText, setLrcInputText] = useState(initialPreset.lrcContent);
  const [lyrics, setLyrics] = useState<LyricLine[]>(() => {
    try {
      const saved = localStorage.getItem('omlila_saved_lyrics');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return parseLyricCues(initialPreset.lrcContent);
  });
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [activeTab, setActiveTab] = useState<'styles' | 'media' | 'lyrics'>('styles');
  const [bgMediaUrl, setBgMediaUrl] = useState<string | undefined>(initialPreset.coverImage);
  const [mediaItems, setMediaItems] = useState<MediaSequenceItem[]>(() => {
    try {
      const saved = localStorage.getItem('omlila_saved_mediaItems');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'default_bg_1',
        name: 'Golden Sunset Mountains',
        type: 'image',
        url: `${baseUrl}mother_golden.jpg`,
        durationSec: 70.0,
      },
      {
        id: 'default_bg_2',
        name: 'Moonlight Night',
        type: 'image',
        url: `${baseUrl}mother_night.jpg`,
        durationSec: 70.0,
      },
      {
        id: 'default_bg_3',
        name: 'Blooming Rhododendron Hills',
        type: 'image',
        url: `${baseUrl}mother_flowers.jpg`,
        durationSec: 80.0,
      },
    ];
  });

  const [styleConfig, setStyleConfig] = useState<StyleConfig>(() => {
    try {
      const saved = localStorage.getItem('omlila_saved_styleConfig');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      ...initialTheme.style,
      fontFamily: initialTheme.style.fontFamily || 'Noto Sans Devanagari',
      fontSize: initialTheme.style.fontSize || 56,
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
      backgroundColor: '#051c14',
      backgroundGradient: 'linear-gradient(135deg, #051c14, #064e3b, #064e3b)',
      backgroundImageUrl: '/mother_golden.jpg',
      backgroundBlur: 0,
      backgroundDarken: 0.3,
      linesToShow: 3,
      highlightActiveWord: true,
      enableParticles: true,
      enableScanlines: false,
      enableHalftone: false,
      enableLetterbox: false,
      enableVignette: true,
      enableAudioSpectrum: true,
      enableKenBurns: true,
    };
  });

  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);

  // Auto-save to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('omlila_saved_lyrics', JSON.stringify(lyrics));
      localStorage.setItem('omlila_saved_styleConfig', JSON.stringify(styleConfig));
      localStorage.setItem('omlila_saved_workspaceTheme', workspaceTheme);
      localStorage.setItem('omlila_saved_mediaItems', JSON.stringify(mediaItems));
      setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {}
  }, [lyrics, styleConfig, workspaceTheme, mediaItems]);

  const handleExportProjectBackup = () => {
    const projectData = {
      appName: 'OpenReel 4K Lyrical Studio',
      version: 1,
      exportedAt: new Date().toISOString(),
      lyrics,
      styleConfig,
      workspaceTheme,
      aspectRatio,
      mediaItems,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omlila_lyrical_project_backup.json`;
    a.click();
  };

  const handleImportProjectBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data.lyrics) setLyrics(data.lyrics);
        if (data.styleConfig) setStyleConfig(data.styleConfig);
        if (data.workspaceTheme) setWorkspaceTheme(data.workspaceTheme);
        if (data.aspectRatio) setAspectRatio(data.aspectRatio);
        if (data.mediaItems) setMediaItems(data.mediaItems);
        alert('✅ Project backup successfully loaded into studio!');
      } catch (err) {
        alert('Invalid project backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    aspectRatio: '16:9',
    quality: '2160p',
    fps: 30,
  });

  const [mainView, setMainView] = useState<'studio' | 'playground'>('studio');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAutoWizardOpen, setIsAutoWizardOpen] = useState(false);
  const [isLyricistModalOpen, setIsLyricistModalOpen] = useState(false);

  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    isExporting: false,
    progress: 0,
    currentFrame: 0,
    totalFrames: 0,
    fps: 30,
    quality: '2160p',
    resolutionText: '3840x2160',
    stage: 'idle',
  });

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    pause,
    togglePlay,
    seek,
    setVolume,
    setAudioUrl,
    audioUrl,
    audioRef,
  } = useLyricAudioSync(lyrics, initialPreset.audioUrl);

  const beatSync = useBeatSync(
    styleConfig.enableBeatSync ?? false,
    styleConfig.beatSyncSensitivity ?? 1.0
  );

  // Connect beat sync to audio element when enabled
  React.useEffect(() => {
    if (styleConfig.enableBeatSync && audioRef.current) {
      beatSync.connectToAudio(audioRef.current);
    } else if (!styleConfig.enableBeatSync) {
      beatSync.disconnect();
    }
  }, [styleConfig.enableBeatSync, audioRef.current]);

  // Restore blob URLs from IndexedDB on mount
  useEffect(() => {
    const restoreBlobs = async () => {
      let needsMediaUpdate = false;
      const restoredItems = await Promise.all(mediaItems.map(async (item) => {
        if (item.url.startsWith('blob:')) {
          const file = await getMediaFile(item.id);
          if (file) {
            needsMediaUpdate = true;
            return { ...item, url: URL.createObjectURL(file) };
          }
        }
        return item;
      }));
      
      if (needsMediaUpdate) {
        setMediaItems(restoredItems);
      }

      const savedAudio = await getAudioFile();
      if (savedAudio) {
        setAudioUrl(URL.createObjectURL(savedAudio));
      }
    };
    
    restoreBlobs();
  }, []); // Run once on mount

  useEffect(() => {
    setExportConfig((prev) => ({ ...prev, aspectRatio }));
  }, [aspectRatio]);

  const handleApplyAutoVideo = (config: {
    audioUrl: string;
    lyrics: LyricLine[];
    lrcRawText: string;
    mediaItems: MediaSequenceItem[];
    styleConfig: StyleConfig;
    aspectRatio: AspectRatio;
    quality: ResolutionQuality;
    autoTriggerExport?: boolean;
  }) => {
    setAudioUrl(config.audioUrl);
    setLyrics(config.lyrics);
    setLrcInputText(config.lrcRawText);
    setMediaItems(config.mediaItems);
    setStyleConfig(config.styleConfig);
    setAspectRatio(config.aspectRatio);
    setExportConfig((prev) => ({ ...prev, aspectRatio: config.aspectRatio, quality: config.quality }));

    if (config.mediaItems.length > 0) {
      setBgMediaUrl(config.mediaItems[0].url);
    }

    if (config.autoTriggerExport) {
      setTimeout(() => {
        handleStartExport();
      }, 300);
    }
  };

  const handleLrcTextChange = (text: string) => {
    setLrcInputText(text);
    const parsed = parseLyricCues(text);
    setLyrics(parsed);
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = SAMPLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setLrcInputText(preset.lrcContent);
    setLyrics(parseLyricCues(preset.lrcContent));
    setBgMediaUrl(preset.coverImage);

    if (preset.coverImage) {
      setMediaItems([
        {
          id: `preset_cover_${Date.now()}`,
          name: `${preset.title} Cover`,
          type: 'image',
          url: preset.coverImage,
          durationSec: 15.0,
        },
      ]);
    }

    const matchingTheme = THEME_PRESETS.find((t) => t.id === preset.theme);
    if (matchingTheme) {
      setStyleConfig((prev) => ({ ...prev, ...matchingTheme.style }));
    }

    const type = presetId.includes('lofi') ? 'lofi' : 'synthwave';
    const audioUrl = createSynthesizedAudioUrl(type);
    setAudioUrl(audioUrl);
  };

  const handleLrcFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) handleLrcTextChange(content);
      };
      reader.readAsText(file);
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      await saveAudioFile(file);
    }
  };

  const handleBgMediaUpload = async (file: File) => {
    const url = URL.createObjectURL(file);
    setBgMediaUrl(url);
    const id = `upload_${Date.now()}`;
    await saveMediaFile(id, file);
    setMediaItems([
      ...mediaItems,
      {
        id,
        name: file.name,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        url,
        durationSec: 5.0,
      },
    ]);
  };

  const handleStartExport = async () => {
    pause();
    setIsExportModalOpen(true);

    const qCfg = QUALITY_CONFIGS[exportConfig.quality];
    const dims = qCfg.getDimensions(exportConfig.aspectRatio);

    setExportStatus({
      isExporting: true,
      progress: 0,
      currentFrame: 0,
      totalFrames: 0,
      fps: exportConfig.fps,
      quality: exportConfig.quality,
      resolutionText: `${dims.width}x${dims.height}`,
      stage: 'rendering-video',
    });

    try {
      const mp4Blob = await exportLyricalVideoMP4(
        lyrics,
        audioUrl || '',
        styleConfig,
        exportConfig,
        (status) => setExportStatus(status),
        undefined,
        mediaItems
      );
      (window as any).lastExportedBlob = mp4Blob;
    } catch (err: any) {
      setExportStatus({
        isExporting: false,
        progress: 0,
        currentFrame: 0,
        totalFrames: 0,
        fps: exportConfig.fps,
        quality: exportConfig.quality,
        resolutionText: `${dims.width}x${dims.height}`,
        stage: 'error',
        errorMessage: err.message || 'Failed to export video',
      });
    }
  };

  useEffect(() => {
    const bridge = registerStudioBridge({
      getState: () => ({
        lyrics,
        lrcText: lrcInputText,
        aspectRatio,
        styleConfig,
        workspaceTheme,
        mediaItems,
        bgMediaUrl,
        isPlaying,
        currentTime,
        duration,
        bpm: beatSync.bpm,
        beatStrength: beatSync.beatStrength,
        isReady: true,
      }),
      setLyrics: (lrc) => handleLrcTextChange(lrc),
      setTheme: (themeId) => {
        const theme = THEME_PRESETS.find((t) => t.id === themeId);
        if (theme) setStyleConfig((prev) => ({ ...prev, ...theme.style }));
      },
      setStyleConfig: (cfg) => setStyleConfig((prev) => ({ ...prev, ...cfg })),
      setWorkspaceTheme: (th) => setWorkspaceTheme(th),
      setAspectRatio: (r) => setAspectRatio(r),
      setMediaItems: (items) => setMediaItems(items),
      addMediaItem: (item) => setMediaItems((prev) => [...prev, item]),
      setAudioUrl: (url) => setAudioUrl(url),
      play: () => { if (!isPlaying) togglePlay(); },
      pause: () => { if (isPlaying) togglePlay(); },
      togglePlay: togglePlay,
      seek: (sec) => seek(sec),
      exportMP4: async (opts = {}) => {
        const targetConfig: ExportConfig = {
          aspectRatio: opts.aspectRatio || aspectRatio,
          quality: opts.quality || exportConfig.quality,
          fps: opts.fps || exportConfig.fps || 30,
        };
        const blob = await exportLyricalVideoMP4(
          lyrics,
          audioUrl || '',
          styleConfig,
          targetConfig,
          (status) => {
            setExportStatus(status);
            if (opts.onProgress) {
              opts.onProgress(status.progress, status.stage);
            }
          },
          undefined,
          mediaItems
        );
        const filename = `lyrical_video_${targetConfig.quality}_${Date.now()}.mp4`;
        return { blob, filename, duration };
      },
    });

    (window as any).triggerStudioExport = handleStartExport;
    (window as any).runDirectExport = () => exportLyricalVideoMP4(lyrics, audioUrl || '', styleConfig, exportConfig, undefined, undefined, mediaItems);
    (window as any).exportLyricalVideoMP4 = exportLyricalVideoMP4;

    notifyStudioStateChange(bridge.getState());
  }, [
    lyrics,
    lrcInputText,
    aspectRatio,
    styleConfig,
    workspaceTheme,
    mediaItems,
    bgMediaUrl,
    isPlaying,
    currentTime,
    duration,
    beatSync.bpm,
    beatSync.beatStrength,
    audioUrl,
  ]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-screen md-surface flex flex-col selection:bg-blue-500 selection:text-white transition-colors duration-300`}>
      {/* Studio Header Bar - MD3 Top App Bar */}
      <header className={`sticky top-0 z-40 bg-[var(--md-sys-color-surface-container)] px-6 py-4 flex items-center justify-between shadow-[var(--md-sys-elevation-2)]`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full bg-[var(--md-sys-color-primary-container)] flex items-center justify-center shadow-[var(--md-sys-elevation-1)]`}>
            <Video className="w-6 h-6 text-[var(--md-sys-color-on-primary-container)]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[var(--md-sys-color-on-surface)] m-0">
                  Studio Lyrical Creator
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]">
                  4K WebCodecs
                </span>
              </div>
              {isLyricistEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setMainView('studio')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                      mainView === 'studio'
                        ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
                        : 'bg-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)]'
                    }`}
                  >
                    🎬 4K Studio
                  </button>
                  <button
                    onClick={() => setMainView('playground')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                      mainView === 'playground'
                        ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
                        : 'bg-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)]'
                    }`}
                  >
                    🎵 AI Lyricist Lab
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-Saved Confirmation Status Badge */}
          {lastSavedTimestamp && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--md-sys-color-tertiary-container)] text-[12px] font-medium text-[var(--md-sys-color-on-tertiary-container)]">
              <CheckCircle2 className="w-4 h-4 text-[var(--md-sys-color-on-tertiary-container)]" aria-hidden="true" />
              <span>Saved {lastSavedTimestamp}</span>
            </div>
          )}

          {/* Project Backup Download (.json) */}
          <button
            type="button"
            onClick={handleExportProjectBackup}
            title="Download project backup file (.json)"
            aria-label="Download project backup JSON file for future reference"
            className="md-button-outlined flex items-center gap-2"
          >
            <Save className="w-5 h-5" aria-hidden="true" />
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Project Backup Load (.json) */}
          <label className="md-button-outlined flex items-center gap-2 cursor-pointer focus-within:ring-2 focus-within:ring-blue-500">
            <Upload className="w-5 h-5" aria-hidden="true" />
            <span className="hidden sm:inline">Load</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportProjectBackup}
              className="hidden"
            />
          </label>

          {/* Studio UI Theme Picker */}
          <div className="flex items-center gap-2 md-surface-container-high px-4 py-2 text-sm border border-[var(--md-sys-color-outline-variant)]">
            <Palette className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
            <label htmlFor="workspace-theme-select" className="sr-only">Workspace UI Theme</label>
            <select
              id="workspace-theme-select"
              value={workspaceTheme}
              onChange={(e) => setWorkspaceTheme(e.target.value as AppWorkspaceTheme)}
              className="bg-transparent text-sm font-medium text-[var(--md-sys-color-on-surface)] focus-visible:outline-none cursor-pointer"
            >
              {WORKSPACE_THEMES.map((theme) => (
                <option key={theme.id} value={theme.id} className="bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)]">
                  🎨 {theme.name}
                </option>
              ))}
            </select>
          </div>

          {isLyricistEnabled && (
            <button
              type="button"
              onClick={() => setIsLyricistModalOpen(true)}
              aria-label="Open AI Nepali Lyricist Generator"
              className="md-button-tonal flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" aria-hidden="true" />
              <span>AI Lyricist</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAutoWizardOpen(true)}
            aria-label="Open Auto Lyrical Video Generator Wizard"
            className="md-button-tonal flex items-center gap-2"
          >
            <Wand2 className="w-5 h-5" aria-hidden="true" />
            <span>Auto Video</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            aria-label={`Export MP4 Video in ${exportConfig.quality}`}
            className="md-button-filled flex items-center gap-2 ml-2"
          >
            <Download className="w-5 h-5" aria-hidden="true" />
            <span>Export ({exportConfig.quality})</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Grid */}
      {isLyricistEnabled && mainView === 'playground' ? (
        <NepaliLyricistPlaygroundPage
          onImportToStudio={(lrcContent) => {
            handleLrcTextChange(lrcContent);
            setMainView('studio');
          }}
          onNavigateToStudio={() => setMainView('studio')}
        />
      ) : (
      <div className="flex-1 w-full flex flex-col items-center">
        <main className="flex-1 w-full max-w-[2400px] px-4 md:px-6 lg:px-8 py-6 grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Column: Canvas Viewport & Audio Timeline (7 cols) */}
          <div className="xl:col-span-7 flex flex-col gap-6 lg:gap-8">
            {/* Canvas Viewport */}
            <div className={`md-surface-container p-6 flex flex-col items-center justify-center min-h-[520px]`}>
              <CanvasViewport
                lyrics={lyrics}
                currentTime={currentTime}
                style={styleConfig}
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                bgMediaUrl={bgMediaUrl}
                mediaItems={mediaItems}
                onStyleChange={setStyleConfig}
                isPlaying={isPlaying}
                togglePlay={togglePlay}
                duration={duration}
                seek={seek}
                beatStrength={beatSync.beatStrength}
                bpm={beatSync.bpm}
                isBeatSyncConnected={beatSync.isConnected}
              />
            </div>

            {/* Audio Playback Controls Bar */}
            <div className={`md-surface-container p-6 space-y-6`}>
              {/* Timeline Slider */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium text-[var(--md-sys-color-on-surface-variant)]">
                  <label htmlFor="playback-timeline-slider">Timeline</label>
                  <div className="flex gap-2 tabular-nums">
                    <span>{formatTime(currentTime)}</span>
                    <span>/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
                <input
                  id="playback-timeline-slider"
                  type="range"
                  min={0}
                  max={duration || 30}
                  step={0.05}
                  value={currentTime}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="w-full accent-[var(--md-sys-color-primary)] h-2 bg-[var(--md-sys-color-surface-container-highest)] rounded-full appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none"
                />
              </div>

              {/* Playback Buttons & Volume */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
                    className={`w-16 h-16 rounded-[24px] bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center shadow-[var(--md-sys-elevation-3)] hover:shadow-[var(--md-sys-elevation-4)] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)]`}
                  >
                    {isPlaying ? <Pause className="w-8 h-8" aria-hidden="true" /> : <Play className="w-8 h-8 ml-1" aria-hidden="true" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => seek(0)}
                    aria-label="Restart audio from beginning"
                    className="md-button-tonal !p-4 !rounded-full"
                  >
                    <RotateCcw className="w-6 h-6" aria-hidden="true" />
                  </button>

                  <label className="md-button-outlined cursor-pointer flex items-center gap-2">
                    <Upload className="w-5 h-5" aria-hidden="true" />
                    <span>Upload Audio</span>
                    <input
                      type="file"
                      accept="audio/*,.wav,.mp3,.aac,.flac,.m4a,.ogg"
                      onChange={handleAudioFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-[var(--md-sys-color-on-surface-variant)]" aria-hidden="true" />
                  <label htmlFor="volume-control-slider" className="sr-only">Volume</label>
                  <input
                    id="volume-control-slider"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-28 accent-[var(--md-sys-color-primary)] h-2 bg-[var(--md-sys-color-surface-container-highest)] rounded-full appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Studio Controls & Sequencer (5 cols) */}
          <div className="xl:col-span-5 flex flex-col gap-6 lg:gap-8">
            {/* Demo Audio Presets Bar */}
            <div className={`md-surface-container p-4 flex items-center gap-3 overflow-x-auto`} role="group" aria-label="Demo Audio Presets">
              <span className="text-sm text-[var(--md-sys-color-on-surface-variant)] font-medium px-2 whitespace-nowrap flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
                <span>Demo Audio:</span>
              </span>
              {SAMPLE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  aria-label={`Load demo preset ${p.title}`}
                  className="md-button-tonal !py-1.5 !px-4 !text-sm whitespace-nowrap flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>{p.title}</span>
                </button>
              ))}
            </div>

            {/* 3-Tab Studio Navigation */}
            <div className={`flex md-surface-container-high p-1.5`} role="tablist" aria-label="Studio Editor Tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'styles'}
                onClick={() => setActiveTab('styles')}
                className={`flex-1 py-2.5 rounded-[12px] text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'styles' ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] shadow-sm' : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)]'
                }`}
              >
                <Sliders className="w-5 h-5" aria-hidden="true" />
                <span>Style</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'media'}
                onClick={() => setActiveTab('media')}
                className={`flex-1 py-2.5 rounded-[12px] text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'media' ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] shadow-sm' : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)]'
                }`}
              >
                <Layers className="w-5 h-5" aria-hidden="true" />
                <span>Sequence</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'lyrics'}
                onClick={() => setActiveTab('lyrics')}
                className={`flex-1 py-2.5 rounded-[12px] text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'lyrics' ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] shadow-sm' : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)]'
                }`}
              >
                <FileText className="w-5 h-5" aria-hidden="true" />
                <span>Lyrics</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1">
              {activeTab === 'styles' ? (
                <LyricStylingControls
                  style={styleConfig}
                  onChange={setStyleConfig}
                  onBgUpload={handleBgMediaUpload}
                />
              ) : activeTab === 'media' ? (
                <MediaSequencer
                  mediaItems={mediaItems}
                  onUpdateMediaItems={setMediaItems}
                  audioDuration={duration}
                  style={styleConfig}
                  onStyleChange={setStyleConfig}
                  currentTime={currentTime}
                />
              ) : (
                <LyricTimelineEditor
                  lyrics={lyrics}
                  onUpdateLyrics={(newLyrics) => {
                    setLyrics(newLyrics);
                    setLrcInputText(formatLyricCuesToLrc(newLyrics));
                  }}
                  onSeek={seek}
                  onFileUpload={handleLrcFileUpload}
                  rawLrcText={lrcInputText}
                  onRawTextChange={handleLrcTextChange}
                  currentTime={currentTime}
                />
              )}
            </div>
          </div>
        </main>
      </div>
      )}


      {isExportModalOpen && (
        <ExportModal
          status={exportStatus}
          exportConfig={exportConfig}
          onConfigChange={setExportConfig}
          onStartExport={handleStartExport}
          onClose={() => {
            setIsExportModalOpen(false);
            setExportStatus({
              isExporting: false,
              progress: 0,
              currentFrame: 0,
              totalFrames: 0,
              fps: exportConfig.fps,
              quality: exportConfig.quality,
              resolutionText: '',
              stage: 'idle',
            });
          }}
        />
      )}

      {isAutoWizardOpen && (
        <AutoVideoWizardModal
          currentAudioDuration={duration}
          onClose={() => setIsAutoWizardOpen(false)}
          onApplyAutoVideo={handleApplyAutoVideo}
        />
      )}

      {isLyricistEnabled && (
        <NepaliLyricistModal
          isOpen={isLyricistModalOpen}
          onClose={() => setIsLyricistModalOpen(false)}
          onImportLyrics={(lrcContent) => handleLrcTextChange(lrcContent)}
          onOpenPlaygroundPage={() => setMainView('playground')}
        />
      )}
    </div>
  );
}
