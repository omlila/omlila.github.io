import type {
  OmlilaStudioAutomationAPI,
  VideoStudioState,
} from './types';
import { SAMPLE_PRESETS } from '../data/samplePresets';
import { THEME_PRESETS } from '../data/themePresets';
import type { VisualThemePreset } from '../types';

export interface StudioBridgeHandlers {
  getState: () => VideoStudioState;
  setLyrics: (lrcContent: string) => void;
  setTheme: (themeId: VisualThemePreset) => void;
  setStyleConfig: (config: any) => void;
  setWorkspaceTheme: (theme: any) => void;
  setAspectRatio: (ratio: any) => void;
  setMediaItems: (items: any[]) => void;
  addMediaItem: (item: any) => void;
  setAudioUrl: (url: string) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  exportMP4: (options?: any) => Promise<{ blob: Blob; filename: string; duration: number }>;
}

let activeBridge: OmlilaStudioAutomationAPI | null = null;
const stateListeners = new Set<(state: VideoStudioState) => void>();

export function registerStudioBridge(handlers: StudioBridgeHandlers): OmlilaStudioAutomationAPI {
  const metadata = {
    id: 'video-studio',
    name: 'Omlila Lyrical Video Studio',
    version: '1.0.0',
    description: 'Client-side 4K lyrical video creator with WebCodecs export & canvas animation',
    capabilities: [
      'canvas-preview',
      'mp4-webcodecs-export',
      'lrc-timeline-sync',
      'audio-beat-detection',
      'multi-aspect-ratio',
      'styling-presets',
    ],
  };

  const bridge: OmlilaStudioAutomationAPI = {
    metadata,
    getState: handlers.getState,
    setState: (partial) => {
      if (partial.lrcText !== undefined) handlers.setLyrics(partial.lrcText);
      if (partial.aspectRatio !== undefined) handlers.setAspectRatio(partial.aspectRatio);
      if (partial.styleConfig !== undefined) handlers.setStyleConfig(partial.styleConfig);
      if (partial.workspaceTheme !== undefined) handlers.setWorkspaceTheme(partial.workspaceTheme);
      if (partial.mediaItems !== undefined) handlers.setMediaItems(partial.mediaItems);
      if (partial.currentTime !== undefined) handlers.seek(partial.currentTime);
    },
    executeAction: async (actionName: string, payload?: any) => {
      switch (actionName) {
        case 'setLyrics':
          handlers.setLyrics(payload?.lrc || payload);
          return true;
        case 'setTheme':
          handlers.setTheme(payload?.themeId || payload);
          return true;
        case 'setAspectRatio':
          handlers.setAspectRatio(payload?.ratio || payload);
          return true;
        case 'seek':
          handlers.seek(typeof payload === 'number' ? payload : payload?.time || 0);
          return true;
        case 'captureCanvasFrame':
          return bridge.captureCanvasFrame(payload);
        case 'exportMP4':
          return bridge.exportMP4(payload);
        default:
          throw new Error(`Unknown action: ${actionName}`);
      }
    },
    onStateChange: (listener) => {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },

    // High Level Direct Action Methods
    setLyrics: handlers.setLyrics,
    getLyrics: () => handlers.getState().lyrics,
    getLrcText: () => handlers.getState().lrcText,

    setTheme: handlers.setTheme,
    setStyleConfig: handlers.setStyleConfig,
    setWorkspaceTheme: handlers.setWorkspaceTheme,
    setAspectRatio: handlers.setAspectRatio,

    setMediaItems: handlers.setMediaItems,
    addMediaItem: handlers.addMediaItem,
    setAudioUrl: handlers.setAudioUrl,

    play: handlers.play,
    pause: handlers.pause,
    togglePlay: handlers.togglePlay,
    seek: handlers.seek,

    listPresets: () => SAMPLE_PRESETS,
    loadPreset: (presetId: string) => {
      const preset = SAMPLE_PRESETS.find((p) => p.id === presetId);
      if (!preset) return false;
      handlers.setLyrics(preset.lrcContent);
      const theme = THEME_PRESETS.find((t) => t.id === preset.theme);
      if (theme) {
        handlers.setStyleConfig(theme.style);
      }
      return true;
    },

    captureCanvasFrame: (options = {}) => {
      const { format = 'png', quality = 0.95 } = options;
      const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) {
        throw new Error('Canvas element not found in DOM');
      }
      return canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', quality);
    },

    exportMP4: handlers.exportMP4,
  };

  // Register onto global window
  if (typeof window !== 'undefined') {
    window.omlilaApps = window.omlilaApps || {};
    window.omlilaApps['video-studio'] = bridge;
    window.omlilaStudio = bridge;

    window.dispatchEvent(
      new CustomEvent('omlila:app-ready', {
        detail: { appId: 'video-studio', bridge },
      })
    );
    window.dispatchEvent(
      new CustomEvent('omlila:studio-ready', {
        detail: bridge,
      })
    );
  }

  activeBridge = bridge;
  return bridge;
}

export function notifyStudioStateChange(state: VideoStudioState) {
  stateListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (e) {
      console.error('State listener error:', e);
    }
  });
}

export function getActiveStudioBridge(): OmlilaStudioAutomationAPI | null {
  return activeBridge;
}
