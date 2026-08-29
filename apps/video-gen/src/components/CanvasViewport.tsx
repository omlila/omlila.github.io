import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { AspectRatio, LyricLine, MediaSequenceItem, StyleConfig } from '../types';
import { ASPECT_RATIOS } from '../types';
import { LyricCanvasRenderer } from './LyricCanvasRenderer';
import { Smartphone, Monitor, Square, Sparkles, Maximize, Minimize, Play, Pause } from 'lucide-react';

interface CanvasViewportProps {
  lyrics: LyricLine[];
  currentTime: number;
  style: StyleConfig;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  bgMediaUrl?: string;
  mediaItems?: MediaSequenceItem[];
  onUpdateMediaItems?: (items: MediaSequenceItem[]) => void;
  onStyleChange?: (newStyle: StyleConfig) => void;
  isPlaying?: boolean;
  togglePlay?: () => void;
  duration?: number;
  seek?: (time: number) => void;
  beatStrength?: number;
  bpm?: number;
  isBeatSyncConnected?: boolean;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  lyrics,
  currentTime,
  style,
  aspectRatio,
  onAspectRatioChange,
  bgMediaUrl,
  mediaItems = [],
  onUpdateMediaItems,
  onStyleChange,
  isPlaying,
  togglePlay,
  duration = 0,
  seek,
  beatStrength = 0,
  bpm = 0,
}) => {
  const ratios: { id: AspectRatio; icon: any; platformBadge: string }[] = [
    { id: '9:16', icon: Smartphone, platformBadge: 'TikTok / Shorts / Reels' },
    { id: '16:9', icon: Monitor, platformBadge: 'YouTube / TV / Desktop' },
    { id: '1:1', icon: Square, platformBadge: 'Instagram Post / Feed' },
  ];

  const [isFullscreen, setIsFullscreen] = useState(false);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full h-full">
      {/* Grid Based Platform & Aspect Ratio Selector */}
      <div className="w-full grid grid-cols-3 gap-2 p-1.5 md-surface-container-high rounded-2xl shadow-[var(--md-sys-elevation-2)]" role="group" aria-label="Aspect Ratio Selector">
        {ratios.map(({ id, icon: Icon, platformBadge }) => {
          const config = ASPECT_RATIOS[id];
          const isActive = aspectRatio === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onAspectRatioChange(id)}
              aria-label={`${config.label} aspect ratio for ${platformBadge}`}
              aria-pressed={isActive}
              className={`p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none ${
                isActive
                  ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] border border-[var(--md-sys-color-primary)] shadow-[var(--md-sys-elevation-2)] font-bold'
                  : 'bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--md-sys-color-on-primary-container)]' : 'text-[var(--md-sys-color-on-surface-variant)]'}`} aria-hidden="true" />
                <span className="text-xs font-extrabold">{config.label}</span>
              </div>
              <span className={`text-[10px] font-mono truncate max-w-full ${isActive ? 'text-[var(--md-sys-color-on-primary-container)] opacity-80' : 'text-[var(--md-sys-color-on-surface-variant)]'}`}>
                {platformBadge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Canvas Preview Viewport */}
      <div className="relative w-full flex-1 flex flex-col items-center justify-center p-2 min-h-[480px]">
        {isFullscreen && (
           <div className="w-full h-full border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-zinc-500 font-mono text-sm gap-3">
              <Maximize className="w-8 h-8 opacity-50" />
              <span>Preview is running in Full Screen</span>
           </div>
        )}
        
        {!isFullscreen && (
          <>
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-4 right-4 z-10 p-3 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 rounded-xl text-white shadow-xl transition-all hover:scale-105"
              title="Enter Fullscreen"
              aria-label="Enter Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </button>

            <LyricCanvasRenderer
              beatStrength={beatStrength}
              bpm={bpm}
              lyrics={lyrics}
              currentTime={currentTime}
              duration={duration}
              style={style}
              aspectRatio={aspectRatio}
              bgMediaUrl={bgMediaUrl}
              mediaItems={mediaItems}
              onUpdateMediaItems={onUpdateMediaItems}
              onStyleChange={onStyleChange}
              className="object-contain shadow-2xl rounded-xl border border-white/5 bg-black w-auto h-auto max-w-full max-h-[60vh] lg:max-h-[650px]"
            />
          </>
        )}

        {/* Fullscreen Portal Overlay */}
        {isFullscreen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="absolute top-6 left-6 text-emerald-400 font-bold tracking-widest uppercase text-sm">
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 animate-pulse" /> 4K Studio Preview
              </span>
            </div>
            
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 z-10 p-4 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 rounded-2xl text-white shadow-2xl transition-all hover:scale-105"
              title="Exit Fullscreen"
              aria-label="Exit Fullscreen"
            >
              <Minimize className="w-6 h-6" />
            </button>

            <div className="relative flex-1 w-full flex items-center justify-center max-h-[calc(100vh-180px)] mt-12 mb-28">
              <LyricCanvasRenderer
                beatStrength={beatStrength}
                bpm={bpm}
                lyrics={lyrics}
                currentTime={currentTime}
                duration={duration}
                style={style}
                aspectRatio={aspectRatio}
                bgMediaUrl={bgMediaUrl}
                mediaItems={mediaItems}
                onStyleChange={onStyleChange}
                className="object-contain shadow-2xl rounded-2xl border border-white/10 bg-black max-w-full max-h-full"
              />
            </div>
            
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-zinc-900/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-4">
              {/* Timeline Slider */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-mono text-zinc-400">
                  <span className="font-bold text-white">Live Preview Playback</span>
                  <div className="flex gap-2 tabular-nums">
                    <span className="text-emerald-400">{formatTime(currentTime)}</span>
                    <span>/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
                {seek && (
                  <input
                    type="range"
                    min={0}
                    max={duration || 30}
                    step={0.05}
                    value={currentTime}
                    onChange={(e) => seek(Number(e.target.value))}
                    className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  />
                )}
              </div>
              
              {/* Play/Pause & Resolution */}
              <div className="flex items-center justify-between">
                {togglePlay && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-xl transition-transform hover:scale-105"
                  >
                    {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                  </button>
                )}
                
                <div className="flex items-center gap-3 text-sm font-mono text-purple-300 bg-purple-950/40 px-6 py-2.5 rounded-full border border-purple-500/30 tabular-nums">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span>{ASPECT_RATIOS[aspectRatio].width} × {ASPECT_RATIOS[aspectRatio].height} px</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Live Canvas Details Footer (Normal Mode) */}
      {!isFullscreen && (
        <div className="flex items-center gap-3 text-sm font-mono text-purple-300/80 bg-purple-950/30 px-6 py-2.5 rounded-full border border-purple-500/20 tabular-nums shadow-md mt-auto">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" aria-hidden="true" />
          <span>Canvas Resolution: {ASPECT_RATIOS[aspectRatio].width} × {ASPECT_RATIOS[aspectRatio].height} px</span>
        </div>
      )}
    </div>
  );
};
