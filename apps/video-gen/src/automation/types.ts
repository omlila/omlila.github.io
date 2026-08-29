import type {
  AspectRatio,
  AppWorkspaceTheme,
  LyricLine,
  MediaSequenceItem,
  ResolutionQuality,
  StyleConfig,
  VisualThemePreset,
  SamplePreset,
} from '../types';

/**
 * Standard Omlila Web Application Automation Protocol.
 * Any Omlila app (Video Studio, Jam Band, Sikshya, etc.) implements this
 * to allow external AI agents, Playwright, and MCP tools to inspect and drive the app.
 */
export interface OmlilaAppMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
}

export interface OmlilaAppBridge<TState = any> {
  metadata: OmlilaAppMetadata;
  getState: () => TState;
  setState: (partial: Partial<TState>) => void;
  executeAction: (actionName: string, payload?: any) => Promise<any>;
  onStateChange: (listener: (state: TState) => void) => () => void;
}

/**
 * Omlila Video Studio State Snapshot
 */
export interface VideoStudioState {
  lyrics: LyricLine[];
  lrcText: string;
  aspectRatio: AspectRatio;
  styleConfig: StyleConfig;
  workspaceTheme: AppWorkspaceTheme;
  mediaItems: MediaSequenceItem[];
  bgMediaUrl?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bpm: number;
  beatStrength: number;
  isReady: boolean;
}

/**
 * High-Level Video Studio Programmatic Actions
 */
export interface VideoStudioActions {
  // Lyrics
  setLyrics: (lrcContent: string) => void;
  getLyrics: () => LyricLine[];
  getLrcText: () => string;

  // Themes & Styles
  setTheme: (themeId: VisualThemePreset) => void;
  setStyleConfig: (config: Partial<StyleConfig>) => void;
  setWorkspaceTheme: (theme: AppWorkspaceTheme) => void;

  // Aspect Ratio & Layout
  setAspectRatio: (ratio: AspectRatio) => void;

  // Media
  setMediaItems: (items: MediaSequenceItem[]) => void;
  addMediaItem: (item: MediaSequenceItem) => void;
  setAudioUrl: (url: string) => void;

  // Timeline & Playback
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (timeInSeconds: number) => void;

  // Presets
  listPresets: () => SamplePreset[];
  loadPreset: (presetId: string) => boolean;

  // Frame Capture & Export
  captureCanvasFrame: (options?: { format?: 'png' | 'jpeg'; quality?: number }) => string;
  exportMP4: (options?: {
    quality?: ResolutionQuality;
    fps?: number;
    onProgress?: (progress: number, stage: string) => void;
  }) => Promise<{ blob: Blob; filename: string; duration: number }>;
}

export type OmlilaStudioAutomationAPI = OmlilaAppBridge<VideoStudioState> & VideoStudioActions;

declare global {
  interface Window {
    omlilaApps?: Record<string, OmlilaAppBridge>;
    omlilaStudio?: OmlilaStudioAutomationAPI;
  }
}
