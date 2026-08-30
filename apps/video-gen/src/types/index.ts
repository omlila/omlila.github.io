export interface LyricWord {
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
}

export interface LyricLine {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
  words?: LyricWord[]; // Optional word-level karaoke sync
}

export type AspectRatio = '9:16' | '16:9' | '1:1';

export interface AspectRatioDimensions {
  width: number;
  height: number;
  label: string;
  description: string;
  iconName: string;
}

export const ASPECT_RATIOS: Record<AspectRatio, AspectRatioDimensions> = {
  '9:16': { width: 1080, height: 1920, label: '9:16 Vertical', description: 'TikTok, Shorts, Reels', iconName: 'smartphone' },
  '16:9': { width: 1920, height: 1080, label: '16:9 Widescreen', description: 'YouTube, TV, Desktop', iconName: 'monitor' },
  '1:1': { width: 1080, height: 1080, label: '1:1 Square', description: 'Instagram Post, Feed', iconName: 'square' },
};

export type ResolutionQuality = '720p' | '1080p' | '1440p' | '2160p'; // 4K

export interface QualityConfig {
  label: string;
  badge: string;
  getDimensions: (aspectRatio: AspectRatio) => { width: number; height: number };
  bitrate: number; // bits per second
}

export const QUALITY_CONFIGS: Record<ResolutionQuality, QualityConfig> = {
  '720p': {
    label: '720p HD',
    badge: 'HD',
    getDimensions: (aspect) => {
      if (aspect === '16:9') return { width: 1280, height: 720 };
      if (aspect === '9:16') return { width: 720, height: 1280 };
      return { width: 720, height: 720 };
    },
    bitrate: 4_000_000,
  },
  '1080p': {
    label: '1080p Full HD',
    badge: 'FHD',
    getDimensions: (aspect) => {
      if (aspect === '16:9') return { width: 1920, height: 1080 };
      if (aspect === '9:16') return { width: 1080, height: 1920 };
      return { width: 1080, height: 1080 };
    },
    bitrate: 8_000_000,
  },
  '1440p': {
    label: '1440p 2K QHD',
    badge: '2K',
    getDimensions: (aspect) => {
      if (aspect === '16:9') return { width: 2560, height: 1440 };
      if (aspect === '9:16') return { width: 1440, height: 2560 };
      return { width: 1440, height: 1440 };
    },
    bitrate: 16_000_000,
  },
  '2160p': {
    label: '4K Ultra HD (2160p)',
    badge: '4K Ultra HD',
    getDimensions: (aspect) => {
      if (aspect === '16:9') return { width: 3840, height: 2160 };
      if (aspect === '9:16') return { width: 2160, height: 3840 };
      return { width: 2160, height: 2160 };
    },
    bitrate: 35_000_000,
  },
};

export type TextStyleAnimation =
  | 'clean-subtitle'
  | 'karaoke'
  | 'pop'
  | 'bounce'
  | 'slide-up'
  | 'fade'
  | 'wave'
  | 'typewriter'
  | 'glitch'
  | 'neon-pulse'
  | 'blur-reveal';

export type VisualThemePreset =
  | 'clean-subtitle'
  | 'documentary-cinema'
  | 'poetic-gold'
  | 'karaoke-pro'
  | 'mother-love'
  | 'cartoon'
  | 'cyberpunk'
  | 'retro-vhs'
  | 'kinetic'
  | 'cinematic'
  | 'starfield'
  | 'glitch-matrix'
  | 'neon-glow'
  | 'forest-nature'
  | 'aurora-borealis'
  | 'deep-space-nebula';

export type AppWorkspaceTheme =
  | 'studio-dark'
  | 'forest-green'
  | 'cyberpunk-neon'
  | 'midnight-oled'
  | 'synthwave-sunset'
  | 'nordic-slate'
  | 'dracula-studio';

export type TextVerticalPosition = 'top' | 'center' | 'bottom' | 'custom';
export type MotionCurve = 'smooth' | 'ease-in-out' | 'elastic-spring' | 'bounce-pop' | 'cinematic-cubic';

export interface TextPositionConfig {
  preset: TextVerticalPosition;
  offsetYPercent: number; // 0% to 100% from top
  offsetXPercent: number; // 0% to 100% from left
  scale: number; // 0.5x to 2.0x font scaling multiplier
}

export interface BackgroundTransformConfig {
  scale: number; // 0.5x to 3.0x zoom
  offsetXPercent: number; // -50% to 50% pan
  offsetYPercent: number; // -50% to 50% pan
  fitMode: 'cover' | 'contain' | 'custom';
}

export type SceneTransitionType = 'crossfade' | 'fade-black' | 'blur-dissolve' | 'instant-cut';

export interface MediaSequenceItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  durationSec: number;
  thumbnailUrl?: string;
  element?: HTMLImageElement | HTMLVideoElement;
  transform?: BackgroundTransformConfig;
  playbackRate?: number; // 0.1x to 2.0x video playback speed
  videoTimeStretchMode?: 'slow-motion' | 'loop' | 'auto-fit-duration' | 'freeze-frame';
  trimStartSec?: number; // In-point start timestamp within source video file (seconds)
  trimEndSec?: number; // Out-point end timestamp within source video file (seconds)
  sourceDurationSec?: number; // Full duration of original video file
  playbackDirection?: 'forward' | 'reverse' | 'ping-pong' | 'freeze-frame'; // Video direction & effect
  freezeFrameTimeSec?: number; // Specific timestamp to hold still if in freeze-frame mode
  sourceVideoId?: string; // Grouping identifier for subsections of the same video
  transitionType?: SceneTransitionType; // Optional per-scene transition override
  transitionDurationSec?: number; // Duration of transition into this scene (seconds)
}

export interface StyleConfig {
  showLyrics?: boolean; // Optional lyrics toggle (true = render lyrics, false = pure video/slideshow)
  motionCurve?: MotionCurve; // OpenReel-inspired animation easing curves
  videoPlaybackRate?: number; // Global video speed multiplier (0.25x to 2.0x)
  enableVideoSlowMotion?: boolean; // Global video slow-motion toggle
  sequenceTransitionType?: SceneTransitionType; // Global transition effect between scenes
  sequenceCrossfadeDuration?: number; // 0 to 5 seconds (legacy & global crossfade duration)
  sequenceTransitionDuration?: number; // 0 to 5 seconds global transition duration
  textPosition?: TextPositionConfig;
  backgroundTransform?: BackgroundTransformConfig;
  themePreset?: VisualThemePreset;
  fontFamily: string;
  fontSize: number; // base size in px (relative to 1080 width baseline)
  fontWeight: 'normal' | 'bold' | '800' | '900';
  fontStyle: 'normal' | 'italic';
  textColor: string;
  activeTextColor: string;
  glowColor: string;
  glowIntensity: number; // 0 to 60
  strokeColor: string;
  strokeWidth: number; // 0 to 16
  dropShadowColor?: string;
  dropShadowBlur?: number;
  dropShadowOffsetX?: number;
  dropShadowOffsetY?: number;
  textAlign: 'center' | 'left' | 'right';
  animationType: TextStyleAnimation;
  backgroundType: 'color' | 'gradient' | 'image' | 'video' | 'animated-aurora' | 'animated-nebula';
  backgroundColor: string;
  backgroundGradient: string;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  backgroundBlur: number; // 0 to 30px
  backgroundDarken: number; // 0 to 1 (opacity of black overlay)
  backgroundTintColor?: string;
  backgroundTintAmount?: number; // 0 to 1
  linesToShow: number; // how many lines displayed in view window
  highlightActiveWord: boolean;
  // Visual FX Overlays
  enableParticles: boolean;
  enableScanlines: boolean;
  enableHalftone: boolean;
  enableLetterbox: boolean;
  enableVignette: boolean;
  enableAudioSpectrum?: boolean;
  enableKenBurns?: boolean; // Zoom/Pan Ken Burns motion effect
  enableActiveLineBackground?: boolean; // Karaoke pill behind text
  enableProgressBar?: boolean; // Bottom progress bar

  // Cinema Scrim & Feathered Background Fade (Half-Screen / Lower-Third Cover)
  enableScrimOverlay?: boolean; // Covers a portion of screen with a soft feathered dark gradient
  scrimType?: 'bottom-fade' | 'top-fade' | 'center-band' | 'horizontal-split';
  scrimHeightPercent?: number; // 20 to 100%, default 50% (half screen)
  scrimOpacity?: number; // 0.0 to 1.0, default 0.75
  scrimColor?: string; // default '#000000'
  scrimFeatherPercent?: number; // 10 to 100% feather/blend softness, default 50%
  scrimOnlyWhenLyricsActive?: boolean; // Smoothly fades out scrim during instrumental breaks when no lyrics are sung
  hideInactiveLyrics?: boolean; // Completely hides lyrics and boxes when no line is actively sung (default true for single line)

  // Feature 1: Lyrics Text Wrapping Control
  lyricsMaxWidthPercent?: number; // 30 to 100, default 90 - max width as % of canvas
  lyricsWrapMode?: 'word' | 'char' | 'none'; // default 'word'

  // Feature 3: Lyrics Background Pill Styling
  activePillColor?: string; // default 'rgba(0,0,0,0.5)'
  activePillOpacity?: number; // 0 to 1, default 0.5
  activePillBlur?: number; // 0 to 30px blur radius for glass effect
  activePillPaddingX?: number; // 10 to 80 px padding horizontal
  activePillPaddingY?: number; // 5 to 40 px padding vertical
  activePillBorderRadius?: number; // 0 to 50px, default 20

  // Feature 4: Gradient Text Color
  enableGradientText?: boolean;
  gradientTextFrom?: string; // #color start
  gradientTextTo?: string; // #color end
  gradientTextAngle?: number; // 0 to 360 degrees

  // Feature 5: Text Letter Spacing & Line Height
  letterSpacing?: number; // -10 to 50, in px at 1080 baseline
  lineHeightMultiplier?: number; // 1.0 to 3.0, default 1.45

  // Feature 6: Animation Speed Control  
  animationSpeed?: 'slow' | 'normal' | 'fast' | 'instant'; // default 'normal'

  // Feature 8: Active Line Highlight Backdrop Blur
  enableActivePillBackdropBlur?: boolean;

  // Feature 9: Multi-Color Gradient Background
  backgroundGradientStops?: { color: string; position: number }[]; // 2-4 stops
  backgroundGradientAngle?: number; // 0 to 360

  // Feature 11: Lyrics Padding/Margin Zone (safe zone)
  lyricsSafeZonePercent?: number; // 0 to 20%, default 5 - padding from canvas edges

  // Feature 12: Wave Animation Controls
  waveAmplitude?: number; // 0.5 to 3.0, multiplier, default 1.0
  waveSpeed?: number; // 0.5 to 3.0, multiplier, default 1.0

  // Feature 13: Dual-Color Karaoke
  enableDualColorKaraoke?: boolean;
  karaokeSecondaryColor?: string; // 2nd gradient color for karaoke wipe

  // Feature 14: Text Transform
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'; // default 'none'

  // Feature 15: Emoji/Icon Prefix Mode  
  enableLinePrefix?: boolean;
  linePrefixEmoji?: string; // default '♪'

  // === NEW BATCH 2: 15 Advanced Features ===

  // Feature B1: Beat-Sync Motion (Web Audio API)
  enableBeatSync?: boolean; // Enables Web Audio beat detection driving lyric animations
  beatSyncSensitivity?: number; // 0.5 to 3.0, how aggressively beats affect motion
  beatSyncTarget?: 'lyrics' | 'background' | 'both'; // What the beat drives

  // Feature B2: Beat-Driven Background Pulse
  enableBeatBackgroundPulse?: boolean; // Background scale pulses on beat
  beatPulseIntensity?: number; // 0.01 to 0.15 scale overshoot on beat

  // Feature B3: Multi-Line Opacity Gradient (perspective fade)
  enableLinePerspectiveFade?: boolean; // Lines fade based on distance from active
  perspectiveFadeStrength?: number; // 0.1 to 0.9, how strongly inactive lines fade

  // Feature B4: Line Exit Animation
  lineExitAnimation?: 'none' | 'slide-down' | 'fade-out' | 'scale-out' | 'blur-out';

  // Feature B5: Word-Level Karaoke Highlighting
  enableWordHighlight?: boolean; // Highlight individual words using LyricWord timestamps
  wordHighlightStyle?: 'underline' | 'box' | 'glow' | 'scale'; // How to highlight word

  // Feature B6: Enhanced Text Shadow Spread
  shadowSpreadLayers?: number; // 1 to 5 multi-layer shadow passes
  shadowSpreadColor?: string; // Color of spread shadow layers

  // Feature B7: Animated Gradient Hue Shift
  enableGradientHueShift?: boolean; // Auto-cycle hue on gradient backgrounds
  gradientHueShiftSpeed?: number; // degrees per second, 10-180

  // Feature B8: Watermark / Logo Overlay
  enableWatermark?: boolean;
  watermarkUrl?: string; // URL/blob of logo image
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  watermarkOpacity?: number; // 0 to 1
  watermarkSizePercent?: number; // 5 to 30% of canvas width

  // Feature B9: Full Subtitle Box (behind all visible lyrics)
  enableSubtitleBox?: boolean;
  subtitleBoxColor?: string;
  subtitleBoxOpacity?: number;
  subtitleBoxPaddingX?: number;
  subtitleBoxPaddingY?: number;
  subtitleBoxBorderRadius?: number;

  // Feature B10: Staggered Line Entrance Delay
  enableStaggeredEntrance?: boolean;
  staggerDelayMs?: number; // 0 to 300ms delay between each line entering

  // Feature B11: Beat Shake / Canvas Vibrate
  enableBeatShake?: boolean;
  beatShakeIntensity?: number; // 1 to 20px max shake offset

  // Feature B12: Custom Line Transition Style
  lineTransitionStyle?: 'instant' | 'dissolve' | 'wipe-right' | 'zoom-in' | 'slide-up-reveal';

  // Feature B13: Ticker / Scroll Mode
  enableTickerMode?: boolean; // Lyrics scroll horizontally like a news ticker
  tickerSpeed?: number; // pixels per second at 1080 baseline, 20-200

  // Feature B14: Active Line Pulse Glow Ring
  enablePulseGlowRing?: boolean; // Animated expanding ring around active text
  pulseGlowRingColor?: string;
  pulseGlowRingSpeed?: number; // 0.5 to 3.0 ring animation speed

  // Feature B15: Font Weight Animation (bold on active)
  enableFontWeightPop?: boolean; // Active line uses heavier font weight
  activeLineExtraScale?: number; // 1.0 to 1.5 additional scale on active line
}

export interface ExportConfig {
  aspectRatio: AspectRatio;
  quality: ResolutionQuality;
  fps: 24 | 30 | 60;
  customBitrate?: number; // Custom target bitrate in bps (up to 50 Mbps)
}

export interface ExportStatus {
  isExporting: boolean;
  progress: number; // 0 to 100
  currentFrame: number;
  totalFrames: number;
  fps: number;
  quality: ResolutionQuality;
  resolutionText: string;
  stage: 'idle' | 'rendering-video' | 'encoding-audio' | 'muxing' | 'completed' | 'error';
  errorMessage?: string;
  downloadUrl?: string;
  renderTimeSec?: number; // Total encoding wall-clock time in seconds
  fileSizeBytes?: number; // Total generated MP4 blob size
}

export interface SamplePreset {
  id: string;
  title: string;
  artist: string;
  theme: VisualThemePreset;
  audioUrl: string;
  lrcContent: string;
  coverImage?: string;
}
