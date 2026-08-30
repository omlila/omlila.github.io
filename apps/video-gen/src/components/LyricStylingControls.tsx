import React, { useState } from 'react';
import type { MotionCurve, StyleConfig, TextStyleAnimation, TextVerticalPosition, VisualThemePreset } from '../types';
import { THEME_PRESETS } from '../data/themePresets';
import {
  Type,
  Sparkles,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Wand2,
  Tv,
  Grid,
  Film,
  Aperture,
  ChevronDown,
  ChevronUp,
  Zap,
  Activity,
  Move,
  Eye,
  EyeOff,
  Maximize2,
  VideoOff,
  Activity as CurveIcon,
  WrapText,
  Gauge,
  Blend,
  CaseSensitive,
  Music,
  Layers3,
  SlidersHorizontal,
  Radio,
  MoveHorizontal,
  ImagePlus,
  MonitorSpeaker,
  Waves,
  Focus,
  PanelBottom,
  LayoutList,
} from 'lucide-react';

interface LyricStylingControlsProps {
  style: StyleConfig;
  onChange: (newStyle: StyleConfig) => void;
  onBgUpload?: (file: File) => void;
}

const FONTS = [
  { id: 'Noto Sans Devanagari', name: '🇳🇵 Noto Sans Devanagari (Clean Devanagari)' },
  { id: 'Rozha One', name: '🇳🇵 Rozha One (Bold Traditional Devanagari)' },
  { id: 'Tiro Devanagari Hindi', name: '🇳🇵 Tiro Devanagari (Poetic Serif)' },
  { id: 'Yatra One', name: '🇳🇵 Yatra One (Heavy Display Devanagari)' },
  { id: 'Teko', name: '🇳🇵 Teko (Condensed High Impact)' },
  { id: 'Khand', name: '🇳🇵 Khand (Strong Grotesque Devanagari)' },
  { id: 'Rajdhani', name: '🇳🇵 Rajdhani (Tech/Sci-fi Devanagari)' },
  { id: 'Cinzel', name: 'Cinzel (Cinematic Serif)' },
  { id: 'Inter', name: 'Inter (Modern Sans)' },
  { id: 'Montserrat', name: 'Montserrat (Bold & Clean)' },
  { id: 'Poppins', name: 'Poppins (Geometric)' },
  { id: 'Playfair Display', name: 'Playfair (Elegant Serif)' },
  { id: 'Permanent Marker', name: 'Permanent Marker (Handwritten)' },
  { id: 'Bebas Neue', name: 'Bebas Neue (Bold Display Headline)' },
  { id: 'Lobster', name: 'Lobster (Retro Script)' },
  { id: 'Fjalla One', name: 'Fjalla One (Tall sans-serif)' },
];

const ANIMATION_TYPES: { id: TextStyleAnimation; label: string; desc: string }[] = [
  { id: 'karaoke', label: 'Karaoke Fill', desc: 'Progressive word-by-word active highlight' },
  { id: 'pop', label: 'Pop & Scale', desc: 'Dynamic spring pop entry scale' },
  { id: 'wave', label: 'Wave Ripple', desc: 'Per-character sine wave oscillation' },
  { id: 'bounce', label: 'Bounce', desc: 'Playful vertical rhythm bounce' },
  { id: 'typewriter', label: 'Typewriter', desc: 'Timed character-by-character reveal' },
  { id: 'glitch', label: 'Matrix Glitch', desc: 'RGB split chromatic aberration' },
  { id: 'neon-pulse', label: 'Neon Pulse', desc: 'Continuous pulsing glow shadow' },
  { id: 'slide-up', label: 'Kinetic Slide', desc: 'Smooth vertical translation' },
  { id: 'fade', label: 'Classic Fade', desc: 'Smooth opacity transitions' },
  { id: 'blur-reveal', label: 'Blur Reveal', desc: 'Focus from out-of-focus blur' },
];

const MOTION_CURVES: { id: MotionCurve; label: string; desc: string }[] = [
  { id: 'smooth', label: 'Smooth Linear', desc: 'Constant rate speed' },
  { id: 'ease-in-out', label: 'Ease In Out', desc: 'Smooth acceleration & deceleration' },
  { id: 'elastic-spring', label: 'Elastic Spring', desc: 'Playful spring overshoot' },
  { id: 'bounce-pop', label: 'Bounce Pop', desc: 'Impact bounce physics' },
  { id: 'cinematic-cubic', label: 'Cinematic Cubic', desc: 'Slow ramp-up movie curve' },
];

export const LyricStylingControls: React.FC<LyricStylingControlsProps> = ({
  style,
  onChange,
  onBgUpload,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateStyle = (key: keyof StyleConfig, value: any) => {
    onChange({ ...style, [key]: value });
  };

  const updateTextPosition = (key: string, value: any) => {
    const currentPos = style.textPosition || { preset: 'center', offsetYPercent: 50, offsetXPercent: 50, scale: 1.0 };
    onChange({ ...style, textPosition: { ...currentPos, [key]: value } });
  };

  const updateBgTransform = (key: string, value: any) => {
    const currentBgTrans = style.backgroundTransform || { scale: 1.0, offsetXPercent: 0, offsetYPercent: 0, fitMode: 'cover' };
    onChange({ ...style, backgroundTransform: { ...currentBgTrans, [key]: value } });
  };

  const applyThemePreset = (presetId: VisualThemePreset) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onChange({ ...style, ...preset.style });
    }
  };

  const disableAllMotionFX = () => {
    onChange({
      ...style,
      enableKenBurns: false,
      enableAudioSpectrum: false,
      enableActiveLineBackground: false,
      enableParticles: false,
      enableScanlines: false,
      enableHalftone: false,
      enableVignette: false,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onBgUpload) {
      onBgUpload(file);
    }
  };

  return (
    <div className="space-y-6 text-sm">
      {/* Optional Lyrics Toggle Bar */}
      <div className="md-surface-container p-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
          {style.showLyrics ? <Eye className="w-5 h-5 text-[var(--md-sys-color-primary)]" /> : <EyeOff className="w-5 h-5 text-[var(--md-sys-color-on-surface-variant)]" />}
          <span>Display Lyrics Overlay</span>
        </div>

        <button
          type="button"
          onClick={() => updateStyle('showLyrics', !style.showLyrics)}
          aria-pressed={style.showLyrics}
          aria-label="Toggle display lyrics overlay on canvas"
          className={`py-2.5 px-4 rounded-xl text-sm font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] ${
            style.showLyrics
              ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-[var(--md-sys-elevation-2)]'
              : 'bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface-variant)]'
          }`}
        >
          {style.showLyrics ? 'Lyrics Enabled' : 'Lyrics Hidden (Pure Video)'}
        </button>
      </div>

      {/* Motion Easing Curves Grid */}
      <div className="md-surface-container p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
            <CurveIcon className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
            <span>Motion Easing Curves</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]">
            {style.motionCurve || 'smooth'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Motion Easing Curves">
          {MOTION_CURVES.map((curve) => {
            const isActive = (style.motionCurve || 'smooth') === curve.id;
            return (
              <button
                key={curve.id}
                type="button"
                onClick={() => updateStyle('motionCurve', curve.id)}
                aria-pressed={isActive}
                className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] ${
                  isActive
                    ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)] shadow-[var(--md-sys-elevation-2)]'
                    : 'bg-[var(--md-sys-color-surface-container)] border-transparent text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                }`}
              >
                <div className="text-sm font-bold">{curve.label}</div>
                <div className={`text-[11px] leading-tight mt-1 ${isActive ? 'opacity-80' : 'text-[var(--md-sys-color-on-surface-variant)]'}`}>{curve.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TOP-LEVEL: Canvas Visual FX & Motion Overlays */}
      <div className="md-surface-container p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
            <Sparkles className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
            <span>Canvas Motion FX & Overlays</span>
          </div>
          <button
            type="button"
            onClick={disableAllMotionFX}
            className="md-button-outlined border-[var(--md-sys-color-error)] text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error-container)] hover:text-[var(--md-sys-color-on-error-container)] flex items-center gap-1.5"
          >
            <VideoOff className="w-4 h-4" />
            <span>Stop All Motion</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Visual Effects Overlays">
          {[
            { key: 'enableProgressBar', label: 'Progress Bar', icon: Activity, desc: 'Social media time bar' },
            { key: 'enableKenBurns', label: 'Ken Burns Motion', icon: Wand2, desc: 'Background zoom & pan' },
            { key: 'enableAudioSpectrum', label: 'Audio Spectrum', icon: Activity, desc: 'Moving audio bars' },
            { key: 'enableActiveLineBackground', label: 'Karaoke Pill Box', icon: Move, desc: 'Active text background' },
            { key: 'enableParticles', label: 'Starfield Space', icon: Sparkles, desc: 'Floating stars' },
            { key: 'enableHalftone', label: 'Halftone Pop Art', icon: Grid, desc: 'Cartoon dot grid' },
            { key: 'enableScanlines', label: 'CRT Scanlines', icon: Tv, desc: 'Retro TV lines' },
            { key: 'enableLetterbox', label: 'Cinema Letterbox', icon: Film, desc: 'Top/bottom bars' },
            { key: 'enableVignette', label: 'Vignette Shade', icon: Aperture, desc: 'Darkened corners' },
          ].map(({ key, label, icon: Icon, desc }) => {
            const isEnabled = Boolean(style[key as keyof StyleConfig]);
            return (
              <button
                key={key}
                type="button"
                onClick={() => updateStyle(key as keyof StyleConfig, !isEnabled)}
                aria-pressed={isEnabled}
                aria-label={`Toggle ${label}`}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none ${
                  isEnabled
                    ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)] shadow-[var(--md-sys-elevation-1)]'
                    : 'bg-[var(--md-sys-color-surface-container)] border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isEnabled ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)]'}`} aria-hidden="true" />
                <div>
                  <div className="font-bold text-sm leading-none">{label}</div>
                  <div className={`text-[11px] leading-tight mt-1 ${isEnabled ? 'opacity-80' : 'text-[var(--md-sys-color-on-surface-variant)]'}`}>{desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Text Position & Scale Controls */}
      {style.showLyrics && (
        <div className="md-surface-container p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
              <Move className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
              <span>Text Layout & Position</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] capitalize">
              {style.textPosition?.preset || 'Center'}
            </span>
          </div>

          {/* Position Preset Buttons */}
          <div>
            <span className="block text-sm font-bold text-[var(--md-sys-color-on-surface)] mb-2">Vertical Position Preset</span>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="Text Vertical Position Preset">
              {(['top', 'center', 'bottom', 'custom'] as TextVerticalPosition[]).map((pos) => {
                const isActive = (style.textPosition?.preset || 'center') === pos;
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => updateTextPosition('preset', pos)}
                    aria-pressed={isActive}
                    className={`py-2 rounded-xl border text-sm font-bold capitalize transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] ${
                      isActive
                        ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]'
                        : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                    }`}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders for Custom Position & Scale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-3">
            <div>
              <div className="flex justify-between text-sm text-zinc-400 mb-1 font-semibold">
                <label htmlFor="text-scale-slider">Text Scale Multiplier</label>
                <span className="tabular-nums font-mono">{(style.textPosition?.scale ?? 1.0).toFixed(1)}x</span>
              </div>
              <input
                id="text-scale-slider"
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={style.textPosition?.scale ?? 1.0}
                onChange={(e) => updateTextPosition('scale', Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm text-zinc-400 mb-1 font-semibold">
                <label htmlFor="text-offset-y-slider">Vertical Y Offset</label>
                <span className="tabular-nums font-mono">{Math.round(style.textPosition?.offsetYPercent ?? 50)}%</span>
              </div>
              <input
                id="text-offset-y-slider"
                type="range"
                min={10}
                max={90}
                step={1}
                value={style.textPosition?.offsetYPercent ?? 50}
                onChange={(e) => {
                  updateTextPosition('preset', 'custom');
                  updateTextPosition('offsetYPercent', Number(e.target.value));
                }}
                className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          {/* Feature 1: Max Width & Wrap Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-3">
            <div>
              <div className="flex justify-between text-sm text-zinc-400 mb-1 font-semibold">
                <label htmlFor="lyrics-max-width-slider" className="flex items-center gap-1.5"><WrapText className="w-4 h-4" />Max Lyrics Width</label>
                <span className="tabular-nums font-mono">{style.lyricsMaxWidthPercent ?? 90}%</span>
              </div>
              <input
                id="lyrics-max-width-slider"
                type="range"
                min={30}
                max={100}
                step={2}
                value={style.lyricsMaxWidthPercent ?? 90}
                onChange={(e) => updateStyle('lyricsMaxWidthPercent', Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <span className="block text-sm font-bold text-[var(--md-sys-color-on-surface)] mb-2">Wrap Mode</span>
              <div className="flex gap-2" role="group" aria-label="Lyrics Wrap Mode">
                {(['word', 'char', 'none'] as const).map((mode) => (
                  <button key={mode} type="button"
                    onClick={() => updateStyle('lyricsWrapMode', mode)}
                    aria-pressed={(style.lyricsWrapMode ?? 'word') === mode}
                    className={`flex-1 py-1.5 rounded-xl border text-xs font-bold capitalize cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] ${(style.lyricsWrapMode ?? 'word') === mode ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'}`}
                  >{mode}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 11: Safe Zone Padding */}
          <div className="border-t border-white/5 pt-3">
            <div className="flex justify-between text-sm text-zinc-400 mb-1 font-semibold">
              <label htmlFor="safe-zone-slider" className="flex items-center gap-1.5"><Layers3 className="w-4 h-4" />Edge Safe Zone</label>
              <span className="tabular-nums font-mono">{style.lyricsSafeZonePercent ?? 5}%</span>
            </div>
            <input
              id="safe-zone-slider"
              type="range"
              min={0}
              max={20}
              step={1}
              value={style.lyricsSafeZonePercent ?? 5}
              onChange={(e) => updateStyle('lyricsSafeZonePercent', Number(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Visual Theme Preset Cards Grid */}
      <div className="md-surface-container p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
            <Wand2 className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
            <span>Choose Visual Theme Preset</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]">
            {THEME_PRESETS.length} Presets
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Aesthetic Themes">
          {THEME_PRESETS.map((theme) => {
            const isActive = style.themePreset === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => applyThemePreset(theme.id)}
                aria-pressed={isActive}
                aria-label={`Apply ${theme.name} theme`}
                className={`p-3 rounded-2xl border text-left transition-colors relative overflow-hidden group cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none ${
                  isActive
                    ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)] shadow-[var(--md-sys-elevation-2)]'
                    : 'bg-[var(--md-sys-color-surface-container)] border-transparent text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-sm">{theme.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]' : 'bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)]'}`}>
                    {theme.badge}
                  </span>
                </div>
                <p className={`text-[11px] line-clamp-2 leading-tight ${isActive ? 'opacity-80' : 'text-[var(--md-sys-color-on-surface-variant)]'}`}>
                  {theme.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Animation Style Selector Grid */}
      <div className="md-surface-container p-6 space-y-4">
        <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
          <Zap className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
          <span>Animation Effect</span>
        </div>

        <div className="grid grid-cols-3 gap-3" role="group" aria-label="Animation Effects">
          {ANIMATION_TYPES.map((anim) => {
            const isActive = style.animationType === anim.id;
            return (
              <button
                key={anim.id}
                type="button"
                onClick={() => updateStyle('animationType', anim.id)}
                aria-pressed={isActive}
                aria-label={`Select ${anim.label} animation`}
                className={`p-2.5 rounded-2xl border text-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none ${
                  isActive
                    ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)] font-bold shadow-[var(--md-sys-elevation-2)]'
                    : 'bg-[var(--md-sys-color-surface-container)] border-transparent text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                }`}
              >
                <div className="text-sm font-bold">{anim.label}</div>
              </button>
            );
          })}
        </div>

        {/* B1: Beat Sync Motion */}
        <div className="mt-4 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[var(--md-sys-color-primary)]" />
              <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">Beat-Sync Motion</span>
              {style.enableBeatSync && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">LIVE</span>
              )}
            </div>
            <button type="button"
              onClick={() => updateStyle('enableBeatSync', !style.enableBeatSync)}
              aria-pressed={style.enableBeatSync}
              className={`py-1.5 px-4 rounded-xl border text-xs font-bold cursor-pointer ${style.enableBeatSync ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
            >{style.enableBeatSync ? 'Enabled' : 'Off'}</button>
          </div>
          {style.enableBeatSync && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(['lyrics', 'background', 'both'] as const).map((target) => (
                  <button key={target} type="button"
                    onClick={() => updateStyle('beatSyncTarget', target)}
                    aria-pressed={(style.beatSyncTarget ?? 'lyrics') === target}
                    className={`py-1.5 rounded-xl border text-xs font-bold capitalize cursor-pointer ${(style.beatSyncTarget ?? 'lyrics') === target ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
                  >{target}</button>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                  <label htmlFor="beat-sensitivity-slider">Sensitivity</label>
                  <span>{(style.beatSyncSensitivity ?? 1.0).toFixed(1)}x</span>
                </div>
                <input id="beat-sensitivity-slider" type="range" min={0.5} max={3.0} step={0.1}
                  value={style.beatSyncSensitivity ?? 1.0}
                  onChange={(e) => updateStyle('beatSyncSensitivity', Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--md-sys-color-surface-container)]">
                  <span className="text-xs text-zinc-400">BG Pulse</span>
                  <button type="button" onClick={() => updateStyle('enableBeatBackgroundPulse', !style.enableBeatBackgroundPulse)}
                    aria-pressed={style.enableBeatBackgroundPulse}
                    className={`text-xs px-2 py-1 rounded-lg font-bold cursor-pointer ${style.enableBeatBackgroundPulse ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500'}`}
                  >{style.enableBeatBackgroundPulse ? 'On' : 'Off'}</button>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--md-sys-color-surface-container)]">
                  <span className="text-xs text-zinc-400">Shake</span>
                  <button type="button" onClick={() => updateStyle('enableBeatShake', !style.enableBeatShake)}
                    aria-pressed={style.enableBeatShake}
                    className={`text-xs px-2 py-1 rounded-lg font-bold cursor-pointer ${style.enableBeatShake ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500'}`}
                  >{style.enableBeatShake ? 'On' : 'Off'}</button>
                </div>
              </div>
              {style.enableBeatBackgroundPulse && (
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                    <label htmlFor="beat-pulse-intensity">Pulse Intensity</label>
                    <span>{(style.beatPulseIntensity ?? 0.05).toFixed(2)}</span>
                  </div>
                  <input id="beat-pulse-intensity" type="range" min={0.01} max={0.15} step={0.01}
                    value={style.beatPulseIntensity ?? 0.05}
                    onChange={(e) => updateStyle('beatPulseIntensity', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                </div>
              )}
              {style.enableBeatShake && (
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                    <label htmlFor="beat-shake-intensity">Shake Intensity</label>
                    <span>{style.beatShakeIntensity ?? 5}px</span>
                  </div>
                  <input id="beat-shake-intensity" type="range" min={1} max={20} step={1}
                    value={style.beatShakeIntensity ?? 5}
                    onChange={(e) => updateStyle('beatShakeIntensity', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feature 6: Animation Speed */}
        <div className="mt-4 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-[var(--md-sys-color-primary)]" />
            <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">Animation Speed</span>
            <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]">{style.animationSpeed ?? 'normal'}</span>
          </div>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Animation Speed">
            {(['slow', 'normal', 'fast', 'instant'] as const).map((speed) => {
              const isActive = (style.animationSpeed ?? 'normal') === speed;
              return (
                <button key={speed} type="button"
                  onClick={() => updateStyle('animationSpeed', speed)}
                  aria-pressed={isActive}
                  className={`py-2 rounded-xl border text-xs font-bold capitalize cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] ${isActive ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'}`}
                >{speed}</button>
              );
            })}
          </div>
        </div>

        {/* Feature 12: Wave Controls (shown for wave animation) */}
        {style.animationType === 'wave' && (
          <div className="mt-4 border-t border-[var(--md-sys-color-outline-variant)] pt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-sm text-zinc-400 mb-1 font-semibold">
                <label htmlFor="wave-amplitude-slider">Wave Amplitude</label>
                <span className="tabular-nums font-mono">{(style.waveAmplitude ?? 1.0).toFixed(1)}x</span>
              </div>
              <input id="wave-amplitude-slider" type="range" min={0.5} max={3.0} step={0.1}
                value={style.waveAmplitude ?? 1.0}
                onChange={(e) => updateStyle('waveAmplitude', Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div>
              <div className="flex justify-between text-sm text-zinc-400 mb-1 font-semibold">
                <label htmlFor="wave-speed-slider">Wave Speed</label>
                <span className="tabular-nums font-mono">{(style.waveSpeed ?? 1.0).toFixed(1)}x</span>
              </div>
              <input id="wave-speed-slider" type="range" min={0.5} max={3.0} step={0.1}
                value={style.waveSpeed ?? 1.0}
                onChange={(e) => updateStyle('waveSpeed', Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        )}

        {/* Feature 13: Dual-Color Karaoke (shown for karaoke animation) */}
        {style.animationType === 'karaoke' && (
          <div className="mt-4 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-1.5"><Blend className="w-4 h-4" />Dual-Color Karaoke</span>
              <button type="button"
                onClick={() => updateStyle('enableDualColorKaraoke', !style.enableDualColorKaraoke)}
                aria-pressed={style.enableDualColorKaraoke}
                className={`py-1.5 px-4 rounded-xl border text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] ${style.enableDualColorKaraoke ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
              >{style.enableDualColorKaraoke ? 'Enabled' : 'Disabled'}</button>
            </div>
            {style.enableDualColorKaraoke && (
              <div className="flex items-center gap-3">
                <label htmlFor="karaoke-secondary-color" className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">Secondary Color</label>
                <input id="karaoke-secondary-color" type="color"
                  value={style.karaokeSecondaryColor || '#ff6b6b'}
                  onChange={(e) => updateStyle('karaokeSecondaryColor', e.target.value)}
                  className="w-10 h-10 rounded border-2 border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5" />
                <span className="text-sm font-mono text-[var(--md-sys-color-on-surface-variant)]">{style.karaokeSecondaryColor || '#ff6b6b'}</span>
              </div>
            )}
          </div>
        )}
      </div>

        {/* B12: Line Transition Style */}
        <div className="mt-4 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <span className="block text-sm font-bold text-[var(--md-sys-color-on-surface)] mb-2 flex items-center gap-1.5"><Focus className="w-4 h-4" />Line Transition Style</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2" role="group">
            {(['instant', 'dissolve', 'zoom-in', 'wipe-right'] as const).map((mode) => (
              <button key={mode} type="button"
                onClick={() => updateStyle('lineTransitionStyle', mode)}
                aria-pressed={(style.lineTransitionStyle ?? 'dissolve') === mode}
                className={`py-2 rounded-xl border text-xs font-bold capitalize cursor-pointer ${(style.lineTransitionStyle ?? 'dissolve') === mode ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'}`}
              >{mode}</button>
            ))}
          </div>
        </div>

        {/* B10: Staggered Entrance */}
        <div className="mt-4 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-1.5"><LayoutList className="w-4 h-4" />Staggered Entrance</span>
            <button type="button"
              onClick={() => updateStyle('enableStaggeredEntrance', !style.enableStaggeredEntrance)}
              aria-pressed={style.enableStaggeredEntrance}
              className={`py-1.5 px-4 rounded-xl border text-xs font-bold cursor-pointer ${style.enableStaggeredEntrance ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
            >{style.enableStaggeredEntrance ? 'On' : 'Off'}</button>
          </div>
          {style.enableStaggeredEntrance && (
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                <label htmlFor="stagger-delay-slider">Stagger Delay</label>
                <span>{style.staggerDelayMs ?? 80}ms</span>
              </div>
              <input id="stagger-delay-slider" type="range" min={0} max={300} step={10}
                value={style.staggerDelayMs ?? 80}
                onChange={(e) => updateStyle('staggerDelayMs', Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
            </div>
          )}
        </div>

        {/* B13: Ticker Mode */}
        <div className="mt-4 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-1.5"><MoveHorizontal className="w-4 h-4" />Ticker Scroll Mode</span>
            <button type="button"
              onClick={() => updateStyle('enableTickerMode', !style.enableTickerMode)}
              aria-pressed={style.enableTickerMode}
              className={`py-1.5 px-4 rounded-xl border text-xs font-bold cursor-pointer ${style.enableTickerMode ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
            >{style.enableTickerMode ? 'On' : 'Off'}</button>
          </div>
          {style.enableTickerMode && (
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                <label htmlFor="ticker-speed-slider">Scroll Speed</label>
                <span>{style.tickerSpeed ?? 80}px/s</span>
              </div>
              <input id="ticker-speed-slider" type="range" min={20} max={200} step={5}
                value={style.tickerSpeed ?? 80}
                onChange={(e) => updateStyle('tickerSpeed', Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
            </div>
          )}
        </div>

      {/* Typography & Alignment (Core Settings) */}
      <div className="md-surface-container p-6 space-y-4">
        <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
          <Type className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
          <span>Typography & Alignment</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="font-family-select" className="block text-sm font-bold text-[var(--md-sys-color-on-surface)] mb-2">
              Font Family
            </label>
            <select
              id="font-family-select"
              value={style.fontFamily}
              onChange={(e) => updateStyle('fontFamily', e.target.value)}
              className="w-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-3 py-2 rounded-lg text-sm font-bold focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none"
            >
              {FONTS.map((f) => (
                <option key={f.id} value={f.id} className="bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)]">
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-sm font-bold text-[var(--md-sys-color-on-surface)] mb-2">Text Alignment</span>
            <div className="flex items-center gap-2" role="group" aria-label="Text Alignment">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => updateStyle('textAlign', align)}
                  aria-label={`Align ${align}`}
                  aria-pressed={style.textAlign === align}
                  className={`p-2.5 rounded-xl border flex-1 flex justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none ${
                    style.textAlign === align
                      ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]'
                      : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                  }`}
                >
                  {align === 'left' && <AlignLeft className="w-5 h-5" aria-hidden="true" />}
                  {align === 'center' && <AlignCenter className="w-5 h-5" aria-hidden="true" />}
                  {align === 'right' && <AlignRight className="w-5 h-5" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <div>
            <div className="flex justify-between text-sm text-[var(--md-sys-color-on-surface)] mb-2 font-bold">
              <label htmlFor="font-size-slider">Font Size</label>
              <span className="tabular-nums font-mono text-[var(--md-sys-color-primary)]">{style.fontSize}px</span>
            </div>
            <input
              id="font-size-slider"
              type="range"
              min={20}
              max={160}
              step={2}
              value={style.fontSize}
              onChange={(e) => updateStyle('fontSize', Number(e.target.value))}
              className="w-full h-2 bg-[var(--md-sys-color-surface-container-highest)] rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] accent-[var(--md-sys-color-primary)]"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm text-[var(--md-sys-color-on-surface)] mb-2 font-bold">
              <label htmlFor="lines-to-show-slider">Max Lines on Screen</label>
              <span className="tabular-nums font-mono text-[var(--md-sys-color-primary)]">{style.linesToShow} {style.linesToShow === 1 ? 'Line' : 'Lines'}</span>
            </div>
            <input
              id="lines-to-show-slider"
              type="range"
              min={1}
              max={15}
              step={1}
              value={style.linesToShow}
              onChange={(e) => updateStyle('linesToShow', Number(e.target.value))}
              className="w-full h-2 bg-[var(--md-sys-color-surface-container-highest)] rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] accent-[var(--md-sys-color-primary)]"
            />
          </div>
        </div>

        {/* Feature 5: Letter Spacing & Line Height */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <div>
            <div className="flex justify-between text-sm text-[var(--md-sys-color-on-surface)] mb-2 font-bold">
              <label htmlFor="letter-spacing-slider" className="flex items-center gap-1.5"><SlidersHorizontal className="w-4 h-4" />Letter Spacing</label>
              <span className="tabular-nums font-mono text-[var(--md-sys-color-primary)]">{style.letterSpacing ?? 0}px</span>
            </div>
            <input
              id="letter-spacing-slider"
              type="range"
              min={-10}
              max={50}
              step={1}
              value={style.letterSpacing ?? 0}
              onChange={(e) => updateStyle('letterSpacing', Number(e.target.value))}
              className="w-full h-2 bg-[var(--md-sys-color-surface-container-highest)] rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] accent-[var(--md-sys-color-primary)]"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm text-[var(--md-sys-color-on-surface)] mb-2 font-bold">
              <label htmlFor="line-height-slider">Line Height</label>
              <span className="tabular-nums font-mono text-[var(--md-sys-color-primary)]">{(style.lineHeightMultiplier ?? 1.45).toFixed(2)}x</span>
            </div>
            <input
              id="line-height-slider"
              type="range"
              min={1.0}
              max={3.0}
              step={0.05}
              value={style.lineHeightMultiplier ?? 1.45}
              onChange={(e) => updateStyle('lineHeightMultiplier', Number(e.target.value))}
              className="w-full h-2 bg-[var(--md-sys-color-surface-container-highest)] rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] accent-[var(--md-sys-color-primary)]"
            />
          </div>
        </div>

        {/* Feature 14: Text Transform */}
        <div className="mt-4 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <span className="block text-sm font-bold text-[var(--md-sys-color-on-surface)] mb-2 flex items-center gap-1.5"><CaseSensitive className="w-4 h-4" />Text Transform</span>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Text Transform">
            {([
              { value: 'none', label: 'Aa' },
              { value: 'uppercase', label: 'AA' },
              { value: 'lowercase', label: 'aa' },
              { value: 'capitalize', label: 'Aa.' },
            ] as const).map(({ value, label }) => {
              const isActive = (style.textTransform ?? 'none') === value;
              return (
                <button key={value} type="button"
                  onClick={() => updateStyle('textTransform', value)}
                  aria-pressed={isActive}
                  className={`py-2 rounded-xl border text-sm font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] ${isActive ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'}`}
                >{label}</button>
              );
            })}
          </div>
        </div>

        {/* B3: Perspective Fade */}
        <div className="mt-4 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-1.5"><Layers3 className="w-4 h-4" />Perspective Line Fade</span>
            <button type="button"
              onClick={() => updateStyle('enableLinePerspectiveFade', !style.enableLinePerspectiveFade)}
              aria-pressed={style.enableLinePerspectiveFade}
              className={`py-1.5 px-3 rounded-xl border text-xs font-bold cursor-pointer ${style.enableLinePerspectiveFade ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
            >{style.enableLinePerspectiveFade ? 'On' : 'Off'}</button>
          </div>
          {style.enableLinePerspectiveFade && (
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                <label htmlFor="perspective-fade-slider">Fade Strength</label>
                <span>{(style.perspectiveFadeStrength ?? 0.3).toFixed(2)}</span>
              </div>
              <input id="perspective-fade-slider" type="range" min={0.1} max={0.9} step={0.05}
                value={style.perspectiveFadeStrength ?? 0.3}
                onChange={(e) => updateStyle('perspectiveFadeStrength', Number(e.target.value))}
                className="w-full h-2 bg-[var(--md-sys-color-surface-container-highest)] rounded-lg appearance-none cursor-pointer accent-[var(--md-sys-color-primary)]" />
            </div>
          )}
        </div>

        {/* B15: Active Line Extra Scale */}
        <div className="mt-4 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-1.5"><Zap className="w-4 h-4" />Active Line Zoom Pop</span>
            <button type="button"
              onClick={() => updateStyle('enableFontWeightPop', !style.enableFontWeightPop)}
              aria-pressed={style.enableFontWeightPop}
              className={`py-1.5 px-3 rounded-xl border text-xs font-bold cursor-pointer ${style.enableFontWeightPop ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
            >{style.enableFontWeightPop ? 'On' : 'Off'}</button>
          </div>
          {style.enableFontWeightPop && (
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                <label htmlFor="active-scale-slider">Scale Factor</label>
                <span>{(style.activeLineExtraScale ?? 1.1).toFixed(2)}x</span>
              </div>
              <input id="active-scale-slider" type="range" min={1.0} max={1.5} step={0.02}
                value={style.activeLineExtraScale ?? 1.1}
                onChange={(e) => updateStyle('activeLineExtraScale', Number(e.target.value))}
                className="w-full h-2 bg-[var(--md-sys-color-surface-container-highest)] rounded-lg appearance-none cursor-pointer accent-[var(--md-sys-color-primary)]" />
            </div>
          )}
        </div>
      </div>

      {/* Advanced Studio Toggle Accordion */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          aria-controls="advanced-controls-panel"
          className="w-full py-4 px-6 md-surface-container flex items-center justify-between text-sm font-bold text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
            <span>Advanced Fine-Tuning Controls</span>
          </div>
          {showAdvanced ? (
            <ChevronUp className="w-5 h-5" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-5 h-5" aria-hidden="true" />
          )}
        </button>

        {showAdvanced && (
          <div id="advanced-controls-panel" className="space-y-4 animate-fade-in">
            {/* Background Image/Video Positioning & Fit Mode */}
            <div className="md-surface-container p-6 space-y-4">
              <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
                <Maximize2 className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
                <span>Background Media Position & Scale</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <span className="block text-sm font-bold text-[var(--md-sys-color-on-surface)] mb-2">Fit Mode</span>
                  <div className="flex gap-2" role="group" aria-label="Media Fit Mode">
                    {['cover', 'contain'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateBgTransform('fitMode', mode)}
                        aria-pressed={(style.backgroundTransform?.fitMode ?? 'cover') === mode}
                        className={`flex-1 py-2 rounded-xl border text-sm capitalize font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] ${
                          (style.backgroundTransform?.fitMode ?? 'cover') === mode
                            ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]'
                            : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-zinc-400 mb-1 font-semibold">
                      <label htmlFor="bg-zoom-slider">Zoom Scale</label>
                      <span className="tabular-nums font-mono">{(style.backgroundTransform?.scale ?? 1.0).toFixed(1)}x</span>
                    </div>
                    <input
                      id="bg-zoom-slider"
                      type="range"
                      min={0.5}
                      max={3.0}
                      step={0.1}
                      value={style.backgroundTransform?.scale ?? 1.0}
                      onChange={(e) => updateBgTransform('scale', Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-zinc-400 mb-1 font-semibold">
                      <label htmlFor="bg-x-offset">X Focal Offset</label>
                      <span className="tabular-nums font-mono">{style.backgroundTransform?.offsetXPercent ?? 0}%</span>
                    </div>
                    <input
                      id="bg-x-offset"
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={style.backgroundTransform?.offsetXPercent ?? 0}
                      onChange={(e) => updateBgTransform('offsetXPercent', Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-zinc-400 mb-1 font-semibold">
                      <label htmlFor="bg-y-offset">Y Focal Offset</label>
                      <span className="tabular-nums font-mono">{style.backgroundTransform?.offsetYPercent ?? 0}%</span>
                    </div>
                    <input
                      id="bg-y-offset"
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={style.backgroundTransform?.offsetYPercent ?? 0}
                      onChange={(e) => updateBgTransform('offsetYPercent', Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>



            {/* Colors & Shadows */}
            <div className="md-surface-container p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="base-text-color" className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">Base Text</label>
                  <div className="flex items-center gap-3">
                    <input
                      id="base-text-color"
                      type="color"
                      value={style.textColor}
                      onChange={(e) => updateStyle('textColor', e.target.value)}
                      className="w-10 h-10 rounded border-2 border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="text-sm font-mono text-[var(--md-sys-color-on-surface-variant)]">{style.textColor}</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="active-text-color" className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">Active Fill</label>
                  <div className="flex items-center gap-3">
                    <input
                      id="active-text-color"
                      type="color"
                      value={style.activeTextColor}
                      onChange={(e) => updateStyle('activeTextColor', e.target.value)}
                      className="w-10 h-10 rounded border-2 border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="text-sm font-mono text-[var(--md-sys-color-on-surface-variant)]">{style.activeTextColor}</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="glow-color" className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">Glow Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      id="glow-color"
                      type="color"
                      value={style.glowColor}
                      onChange={(e) => updateStyle('glowColor', e.target.value)}
                      className="w-10 h-10 rounded border-2 border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="text-sm font-mono text-[var(--md-sys-color-on-surface-variant)]">{style.glowColor}</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="stroke-color" className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">Stroke Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      id="stroke-color"
                      type="color"
                      value={style.strokeColor}
                      onChange={(e) => updateStyle('strokeColor', e.target.value)}
                      className="w-10 h-10 rounded border-2 border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="text-sm font-mono text-[var(--md-sys-color-on-surface-variant)]">{style.strokeColor}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-[var(--md-sys-color-outline-variant)]">
                <div>
                  <div className="flex justify-between text-sm text-[var(--md-sys-color-on-surface)] mb-2 font-bold">
                    <label htmlFor="glow-intensity-slider">Glow Intensity</label>
                    <span className="tabular-nums font-mono text-[var(--md-sys-color-primary)]">{style.glowIntensity}px</span>
                  </div>
                  <input
                    id="glow-intensity-slider"
                    type="range"
                    min={0}
                    max={60}
                    value={style.glowIntensity}
                    onChange={(e) => updateStyle('glowIntensity', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm text-zinc-400 mb-1">
                    <label htmlFor="stroke-width-slider">Outline Stroke Width</label>
                    <span className="tabular-nums">{style.strokeWidth}px</span>
                  </div>
                  <input
                    id="stroke-width-slider"
                    type="range"
                    min={0}
                    max={16}
                    value={style.strokeWidth}
                    onChange={(e) => updateStyle('strokeWidth', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>
              </div>

              {/* Drop Shadow Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-[var(--md-sys-color-outline-variant)]">
                <div>
                  <label htmlFor="drop-shadow-color" className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">Drop Shadow Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      id="drop-shadow-color"
                      type="color"
                      value={style.dropShadowColor || '#000000'}
                      onChange={(e) => updateStyle('dropShadowColor', e.target.value)}
                      className="w-10 h-10 rounded border-2 border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="text-sm font-mono text-[var(--md-sys-color-on-surface-variant)]">{style.dropShadowColor || '#000000'}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-zinc-400 mb-1">
                    <label htmlFor="drop-shadow-blur-slider">Drop Shadow Blur</label>
                    <span className="tabular-nums">{style.dropShadowBlur ?? 0}px</span>
                  </div>
                  <input
                    id="drop-shadow-blur-slider"
                    type="range"
                    min={0}
                    max={30}
                    value={style.dropShadowBlur ?? 0}
                    onChange={(e) => updateStyle('dropShadowBlur', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm text-zinc-400 mb-1">
                    <label htmlFor="drop-shadow-x-slider">Drop Shadow Offset X</label>
                    <span className="tabular-nums">{style.dropShadowOffsetX ?? 0}px</span>
                  </div>
                  <input
                    id="drop-shadow-x-slider"
                    type="range"
                    min={-30}
                    max={30}
                    value={style.dropShadowOffsetX ?? 0}
                    onChange={(e) => updateStyle('dropShadowOffsetX', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm text-zinc-400 mb-1">
                    <label htmlFor="drop-shadow-y-slider">Drop Shadow Offset Y</label>
                    <span className="tabular-nums">{style.dropShadowOffsetY ?? 0}px</span>
                  </div>
                  <input
                    id="drop-shadow-y-slider"
                    type="range"
                    min={-30}
                    max={30}
                    value={style.dropShadowOffsetY ?? 0}
                    onChange={(e) => updateStyle('dropShadowOffsetY', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Background Media */}
            <div className="md-surface-container p-6 space-y-4">
              <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
                <ImageIcon className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
                <span>Background Media</span>
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Background Type">
                {['gradient', 'color', 'image', 'video', 'animated-aurora', 'animated-nebula'].map((type) => {
                  const label = type === 'animated-aurora' ? 'Aurora' : type === 'animated-nebula' ? 'Nebula' : type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateStyle('backgroundType', type)}
                      aria-pressed={style.backgroundType === type}
                      className={`flex-1 min-w-[80px] py-2.5 rounded-xl border text-sm capitalize font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none ${style.backgroundType === type ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {(style.backgroundType === 'image' || style.backgroundType === 'video') && (
                <div>
                  <label htmlFor="custom-media-file" className="block text-sm font-bold text-[var(--md-sys-color-on-surface)] mb-2">Upload Custom Media</label>
                  <input
                    id="custom-media-file"
                    type="file"
                    accept={style.backgroundType === 'image' ? 'image/*' : 'video/*'}
                    onChange={handleFileUpload}
                    className="w-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-3 py-2 rounded-lg text-sm font-bold file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[var(--md-sys-color-primary)] file:text-[var(--md-sys-color-on-primary)] cursor-pointer"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-[var(--md-sys-color-outline-variant)]">
                <div>
                  <div className="flex justify-between text-sm text-zinc-400 mb-1">
                    <label htmlFor="darken-overlay-slider">Darken Overlay</label>
                    <span className="tabular-nums">{Math.round(style.backgroundDarken * 100)}%</span>
                  </div>
                  <input
                    id="darken-overlay-slider"
                    type="range"
                    min={0}
                    max={0.9}
                    step={0.05}
                    value={style.backgroundDarken}
                    onChange={(e) => updateStyle('backgroundDarken', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm text-zinc-400 mb-1">
                    <label htmlFor="tint-overlay-slider">Color Tint Amount</label>
                    <span className="tabular-nums">{Math.round((style.backgroundTintAmount || 0) * 100)}%</span>
                  </div>
                  <input
                    id="tint-overlay-slider"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={style.backgroundTintAmount || 0}
                    onChange={(e) => updateStyle('backgroundTintAmount', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                </div>
                
                <div>
                  <label htmlFor="tint-color" className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">Tint Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      id="tint-color"
                      type="color"
                      value={style.backgroundTintColor || '#000000'}
                      onChange={(e) => updateStyle('backgroundTintColor', e.target.value)}
                      className="w-10 h-10 rounded border-2 border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="text-sm font-mono text-[var(--md-sys-color-on-surface-variant)]">{style.backgroundTintColor || '#000000'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3: Lyric Pill Background Styling */}
            <div className="md-surface-container p-6 space-y-4">
              <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
                <Layers3 className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
                <span>Lyric Pill Styling</span>
                <span className="text-xs font-normal text-[var(--md-sys-color-on-surface-variant)] ml-2">Active line background</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="pill-bg-color" className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">Pill Color</label>
                  <div className="flex items-center gap-2">
                    <input id="pill-bg-color" type="color"
                      value={style.activePillColor?.startsWith('#') ? style.activePillColor : '#000000'}
                      onChange={(e) => updateStyle('activePillColor', e.target.value)}
                      className="w-10 h-10 rounded border-2 border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5" />
                    <span className="text-xs font-mono text-[var(--md-sys-color-on-surface-variant)]">{style.activePillColor || '#000000'}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                    <label htmlFor="pill-opacity-slider">Pill Opacity</label>
                    <span>{Math.round((style.activePillOpacity ?? 0.5) * 100)}%</span>
                  </div>
                  <input id="pill-opacity-slider" type="range" min={0} max={1} step={0.05}
                    value={style.activePillOpacity ?? 0.5}
                    onChange={(e) => updateStyle('activePillOpacity', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                    <label htmlFor="pill-blur-slider">Glass Blur</label>
                    <span>{style.activePillBlur ?? 0}px</span>
                  </div>
                  <input id="pill-blur-slider" type="range" min={0} max={30} step={1}
                    value={style.activePillBlur ?? 0}
                    onChange={(e) => updateStyle('activePillBlur', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                    <label htmlFor="pill-pad-x-slider">Padding X</label>
                    <span>{style.activePillPaddingX ?? 30}px</span>
                  </div>
                  <input id="pill-pad-x-slider" type="range" min={10} max={80} step={2}
                    value={style.activePillPaddingX ?? 30}
                    onChange={(e) => updateStyle('activePillPaddingX', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                    <label htmlFor="pill-pad-y-slider">Padding Y</label>
                    <span>{style.activePillPaddingY ?? 15}px</span>
                  </div>
                  <input id="pill-pad-y-slider" type="range" min={5} max={40} step={1}
                    value={style.activePillPaddingY ?? 15}
                    onChange={(e) => updateStyle('activePillPaddingY', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                    <label htmlFor="pill-radius-slider">Corner Radius</label>
                    <span>{style.activePillBorderRadius ?? 20}px</span>
                  </div>
                  <input id="pill-radius-slider" type="range" min={0} max={50} step={2}
                    value={style.activePillBorderRadius ?? 20}
                    onChange={(e) => updateStyle('activePillBorderRadius', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>
            </div>

            {/* Feature 4: Gradient Text Color */}
            <div className="md-surface-container p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
                  <Blend className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
                  <span>Gradient Text Effect</span>
                </div>
                <button type="button"
                  onClick={() => updateStyle('enableGradientText', !style.enableGradientText)}
                  aria-pressed={style.enableGradientText}
                  className={`py-1.5 px-4 rounded-xl border text-xs font-bold cursor-pointer ${style.enableGradientText ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
                >{style.enableGradientText ? 'Enabled' : 'Disabled'}</button>
              </div>
              {style.enableGradientText && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="gradient-text-from" className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">From Color</label>
                    <div className="flex items-center gap-2">
                      <input id="gradient-text-from" type="color"
                        value={style.gradientTextFrom || '#ffffff'}
                        onChange={(e) => updateStyle('gradientTextFrom', e.target.value)}
                        className="w-10 h-10 rounded border-2 border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5" />
                      <span className="text-xs font-mono text-[var(--md-sys-color-on-surface-variant)]">{style.gradientTextFrom || '#ffffff'}</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="gradient-text-to" className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">To Color</label>
                    <div className="flex items-center gap-2">
                      <input id="gradient-text-to" type="color"
                        value={style.gradientTextTo || '#fbbf24'}
                        onChange={(e) => updateStyle('gradientTextTo', e.target.value)}
                        className="w-10 h-10 rounded border-2 border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5" />
                      <span className="text-xs font-mono text-[var(--md-sys-color-on-surface-variant)]">{style.gradientTextTo || '#fbbf24'}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                      <label htmlFor="gradient-text-angle">Gradient Angle</label>
                      <span>{style.gradientTextAngle ?? 0}°</span>
                    </div>
                    <input id="gradient-text-angle" type="range" min={0} max={360} step={5}
                      value={style.gradientTextAngle ?? 0}
                      onChange={(e) => updateStyle('gradientTextAngle', Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                  </div>
                </div>
              )}
            </div>

            {/* Feature 9: Gradient Background Angle */}
            {style.backgroundType === 'gradient' && (
              <div className="md-surface-container p-6 space-y-4">
                <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
                  <Blend className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
                  <span>Gradient Background Controls</span>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-zinc-400 mb-1 font-semibold">
                    <label htmlFor="bg-gradient-angle-slider">Gradient Angle</label>
                    <span>{style.backgroundGradientAngle ?? 135}°</span>
                  </div>
                  <input id="bg-gradient-angle-slider" type="range" min={0} max={360} step={5}
                    value={style.backgroundGradientAngle ?? 135}
                    onChange={(e) => updateStyle('backgroundGradientAngle', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">Color Stops ({(style.backgroundGradientStops || [{ color: '#051c14', position: 0 }, { color: '#064e3b', position: 0.5 }, { color: '#02140d', position: 1 }]).length})</span>
                    <button type="button"
                      onClick={() => {
                        const stops = style.backgroundGradientStops || [{ color: '#051c14', position: 0 }, { color: '#02140d', position: 1 }];
                        if (stops.length < 4) updateStyle('backgroundGradientStops', [...stops, { color: '#ffffff', position: 0.75 }]);
                      }}
                      className="text-xs px-3 py-1 rounded-lg bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold cursor-pointer"
                    >+ Add Stop</button>
                  </div>
                  {(style.backgroundGradientStops || [{ color: '#051c14', position: 0 }, { color: '#064e3b', position: 0.5 }, { color: '#02140d', position: 1 }]).map((stop, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input type="color" value={stop.color}
                        onChange={(e) => {
                          const stops = [...(style.backgroundGradientStops || [{ color: '#051c14', position: 0 }, { color: '#02140d', position: 1 }])];
                          stops[idx] = { ...stops[idx], color: e.target.value };
                          updateStyle('backgroundGradientStops', stops);
                        }}
                        className="w-8 h-8 rounded border border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5" />
                      <input type="range" min={0} max={1} step={0.01} value={stop.position}
                        onChange={(e) => {
                          const stops = [...(style.backgroundGradientStops || [{ color: '#051c14', position: 0 }, { color: '#02140d', position: 1 }])];
                          stops[idx] = { ...stops[idx], position: Number(e.target.value) };
                          updateStyle('backgroundGradientStops', stops);
                        }}
                        className="flex-1 accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                      <span className="text-xs font-mono text-zinc-400 w-10">{Math.round(stop.position * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* B6: Text Shadow Spread */}
            <div className="md-surface-container p-6 space-y-4">
              <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
                <Layers3 className="w-5 h-5" aria-hidden="true" />
                <span>Multi-Layer Shadow Spread</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-sm text-zinc-400 mb-1 font-semibold">
                    <label htmlFor="shadow-layers-slider">Shadow Layers</label>
                    <span>{style.shadowSpreadLayers ?? 1}</span>
                  </div>
                  <input id="shadow-layers-slider" type="range" min={1} max={5} step={1}
                    value={style.shadowSpreadLayers ?? 1}
                    onChange={(e) => updateStyle('shadowSpreadLayers', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                  <label htmlFor="shadow-spread-color" className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">Shadow Color</label>
                  <div className="flex items-center gap-2">
                    <input id="shadow-spread-color" type="color"
                      value={style.shadowSpreadColor || '#000000'}
                      onChange={(e) => updateStyle('shadowSpreadColor', e.target.value)}
                      className="w-10 h-10 rounded border-2 border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5" />
                    <span className="text-xs font-mono text-[var(--md-sys-color-on-surface-variant)]">{style.shadowSpreadColor || '#000000'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* B7: Animated Gradient Hue Shift */}
            <div className="md-surface-container p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
                  <Waves className="w-5 h-5" aria-hidden="true" />
                  <span>Animated Hue Shift</span>
                  <span className="text-xs font-normal text-[var(--md-sys-color-on-surface-variant)]">gradient backgrounds</span>
                </div>
                <button type="button"
                  onClick={() => updateStyle('enableGradientHueShift', !style.enableGradientHueShift)}
                  aria-pressed={style.enableGradientHueShift}
                  className={`py-1.5 px-4 rounded-xl border text-xs font-bold cursor-pointer ${style.enableGradientHueShift ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
                >{style.enableGradientHueShift ? 'Enabled' : 'Disabled'}</button>
              </div>
              {style.enableGradientHueShift && (
                <div>
                  <div className="flex justify-between text-sm text-zinc-400 mb-1 font-semibold">
                    <label htmlFor="hue-shift-speed-slider">Hue Shift Speed</label>
                    <span>{style.gradientHueShiftSpeed ?? 30}°/s</span>
                  </div>
                  <input id="hue-shift-speed-slider" type="range" min={10} max={180} step={5}
                    value={style.gradientHueShiftSpeed ?? 30}
                    onChange={(e) => updateStyle('gradientHueShiftSpeed', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                </div>
              )}
            </div>

            {/* B8: Watermark Overlay */}
            <div className="md-surface-container p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
                  <ImagePlus className="w-5 h-5" aria-hidden="true" />
                  <span>Watermark / Logo Overlay</span>
                </div>
                <button type="button"
                  onClick={() => updateStyle('enableWatermark', !style.enableWatermark)}
                  aria-pressed={style.enableWatermark}
                  className={`py-1.5 px-4 rounded-xl border text-xs font-bold cursor-pointer ${style.enableWatermark ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
                >{style.enableWatermark ? 'Enabled' : 'Disabled'}</button>
              </div>
              {style.enableWatermark && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">Logo Image URL</label>
                    <input type="text" placeholder="https://... or blob URL"
                      value={style.watermarkUrl || ''}
                      onChange={(e) => updateStyle('watermarkUrl', e.target.value)}
                      className="w-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-3 py-2 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">Position</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                        <button key={pos} type="button"
                          onClick={() => updateStyle('watermarkPosition', pos)}
                          aria-pressed={(style.watermarkPosition ?? 'bottom-right') === pos}
                          className={`py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${(style.watermarkPosition ?? 'bottom-right') === pos ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
                        >{pos.replace('-', ' ')}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                        <label htmlFor="watermark-opacity">Opacity</label>
                        <span>{Math.round((style.watermarkOpacity ?? 0.7) * 100)}%</span>
                      </div>
                      <input id="watermark-opacity" type="range" min={0} max={1} step={0.05}
                        value={style.watermarkOpacity ?? 0.7}
                        onChange={(e) => updateStyle('watermarkOpacity', Number(e.target.value))}
                        className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                        <label htmlFor="watermark-size">Size</label>
                        <span>{style.watermarkSizePercent ?? 12}%</span>
                      </div>
                      <input id="watermark-size" type="range" min={5} max={30} step={1}
                        value={style.watermarkSizePercent ?? 12}
                        onChange={(e) => updateStyle('watermarkSizePercent', Number(e.target.value))}
                        className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* B9: Subtitle Box */}
            <div className="md-surface-container p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
                  <PanelBottom className="w-5 h-5" aria-hidden="true" />
                  <span>Global Subtitle Box</span>
                  <span className="text-xs font-normal text-[var(--md-sys-color-on-surface-variant)]">behind all lyrics</span>
                </div>
                <button type="button"
                  onClick={() => updateStyle('enableSubtitleBox', !style.enableSubtitleBox)}
                  aria-pressed={style.enableSubtitleBox}
                  className={`py-1.5 px-4 rounded-xl border text-xs font-bold cursor-pointer ${style.enableSubtitleBox ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
                >{style.enableSubtitleBox ? 'Enabled' : 'Disabled'}</button>
              </div>
              {style.enableSubtitleBox && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="subtitle-box-color" className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">Box Color</label>
                    <input id="subtitle-box-color" type="color"
                      value={style.subtitleBoxColor || '#000000'}
                      onChange={(e) => updateStyle('subtitleBoxColor', e.target.value)}
                      className="w-10 h-10 rounded border-2 border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                      <label htmlFor="subtitle-box-opacity">Opacity</label>
                      <span>{Math.round((style.subtitleBoxOpacity ?? 0.6) * 100)}%</span>
                    </div>
                    <input id="subtitle-box-opacity" type="range" min={0} max={1} step={0.05}
                      value={style.subtitleBoxOpacity ?? 0.6}
                      onChange={(e) => updateStyle('subtitleBoxOpacity', Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                      <label htmlFor="subtitle-box-radius">Corner Radius</label>
                      <span>{style.subtitleBoxBorderRadius ?? 16}px</span>
                    </div>
                    <input id="subtitle-box-radius" type="range" min={0} max={50} step={2}
                      value={style.subtitleBoxBorderRadius ?? 16}
                      onChange={(e) => updateStyle('subtitleBoxBorderRadius', Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                  </div>
                </div>
              )}
            </div>

            {/* B14: Pulse Glow Ring */}
            <div className="md-surface-container p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
                  <MonitorSpeaker className="w-5 h-5" aria-hidden="true" />
                  <span>Pulse Glow Ring</span>
                  <span className="text-xs font-normal text-[var(--md-sys-color-on-surface-variant)]">active line</span>
                </div>
                <button type="button"
                  onClick={() => updateStyle('enablePulseGlowRing', !style.enablePulseGlowRing)}
                  aria-pressed={style.enablePulseGlowRing}
                  className={`py-1.5 px-4 rounded-xl border text-xs font-bold cursor-pointer ${style.enablePulseGlowRing ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
                >{style.enablePulseGlowRing ? 'Enabled' : 'Disabled'}</button>
              </div>
              {style.enablePulseGlowRing && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pulse-ring-color" className="block text-xs font-bold text-[var(--md-sys-color-on-surface)] mb-2">Ring Color</label>
                    <div className="flex items-center gap-2">
                      <input id="pulse-ring-color" type="color"
                        value={style.pulseGlowRingColor || '#fbbf24'}
                        onChange={(e) => updateStyle('pulseGlowRingColor', e.target.value)}
                        className="w-10 h-10 rounded border-2 border-[var(--md-sys-color-outline)] bg-transparent cursor-pointer p-0.5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1 font-semibold">
                      <label htmlFor="pulse-ring-speed">Ring Speed</label>
                      <span>{(style.pulseGlowRingSpeed ?? 1.5).toFixed(1)}x</span>
                    </div>
                    <input id="pulse-ring-speed" type="range" min={0.5} max={3.0} step={0.1}
                      value={style.pulseGlowRingSpeed ?? 1.5}
                      onChange={(e) => updateStyle('pulseGlowRingSpeed', Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                  </div>
                </div>
              )}
            </div>

            {/* Feature 15: Emoji/Icon Line Prefix */}
            <div className="md-surface-container p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[var(--md-sys-color-primary)]">
                  <Music className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
                  <span>Line Prefix Emoji</span>
                </div>
                <button type="button"
                  onClick={() => updateStyle('enableLinePrefix', !style.enableLinePrefix)}
                  aria-pressed={style.enableLinePrefix}
                  className={`py-1.5 px-4 rounded-xl border text-xs font-bold cursor-pointer ${style.enableLinePrefix ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface-container-highest)] border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}
                >{style.enableLinePrefix ? 'Enabled' : 'Disabled'}</button>
              </div>
              {style.enableLinePrefix && (
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {['♪', '♫', '🎵', '🎶', '🎤', '🎸', '✨', '⭐', '🔥', '💫'].map((emoji) => (
                      <button key={emoji} type="button"
                        onClick={() => updateStyle('linePrefixEmoji', emoji)}
                        aria-pressed={(style.linePrefixEmoji ?? '♪') === emoji}
                        className={`w-10 h-10 rounded-xl border text-lg cursor-pointer transition-colors ${(style.linePrefixEmoji ?? '♪') === emoji ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)]' : 'bg-[var(--md-sys-color-surface-container)] border-transparent hover:bg-[var(--md-sys-color-surface-container-high)]'}`}
                      >{emoji}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <label htmlFor="custom-prefix-input" className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">Custom:</label>
                    <input id="custom-prefix-input" type="text" maxLength={4}
                      value={style.linePrefixEmoji ?? '♪'}
                      onChange={(e) => updateStyle('linePrefixEmoji', e.target.value)}
                      className="w-20 bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-3 py-2 rounded-lg text-sm text-center font-bold focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
