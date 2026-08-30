import React, { useState, useRef, useEffect } from 'react';
import type { MediaSequenceItem } from '../types';
import { Play, Pause, Scissors, Check, X, RotateCcw, FastForward, Film } from 'lucide-react';

interface VideoTrimModalProps {
  item: MediaSequenceItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: Partial<MediaSequenceItem>) => void;
}

export const VideoTrimModal: React.FC<VideoTrimModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(item.trimStartSec || 0);
  const [videoDuration, setVideoDuration] = useState(item.sourceDurationSec || 0);
  const [trimStart, setTrimStart] = useState(item.trimStartSec || 0);
  const [trimEnd, setTrimEnd] = useState(item.trimEndSec || (item.sourceDurationSec || 0));
  const [direction, setDirection] = useState<'forward' | 'reverse' | 'ping-pong' | 'freeze-frame'>(item.playbackDirection || 'forward');
  const [speedMode, setSpeedMode] = useState<string>(item.videoTimeStretchMode === 'auto-fit-duration' ? 'auto-fit-duration' : String(item.playbackRate ?? 0.5));

  useEffect(() => {
    if (isOpen) {
      setTrimStart(item.trimStartSec || 0);
      setTrimEnd(item.trimEndSec || (item.sourceDurationSec || 0));
      setCurrentVideoTime(item.trimStartSec || 0);
      setDirection(item.playbackDirection || 'forward');
      setSpeedMode(item.videoTimeStretchMode === 'auto-fit-duration' ? 'auto-fit-duration' : String(item.playbackRate ?? 0.5));
      setIsPlaying(false);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = Number(videoRef.current.duration.toFixed(2));
      setVideoDuration(dur);
      if (!trimEnd || trimEnd > dur || trimEnd === 0) {
        setTrimEnd(dur);
      }
      videoRef.current.currentTime = trimStart;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const t = Number(videoRef.current.currentTime.toFixed(2));
      setCurrentVideoTime(t);
      const effectiveEnd = trimEnd > trimStart ? trimEnd : (videoDuration || 10);
      if (t >= effectiveEnd) {
        videoRef.current.currentTime = trimStart;
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        const effectiveEnd = trimEnd > trimStart ? trimEnd : (videoDuration || 10);
        if (videoRef.current.currentTime >= effectiveEnd || videoRef.current.currentTime < trimStart) {
          videoRef.current.currentTime = trimStart;
        }
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const handleScrub = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentVideoTime(time);
    }
  };

  const handleSetInPoint = () => {
    setTrimStart(currentVideoTime);
    if (trimEnd <= currentVideoTime && videoDuration > 0) {
      setTrimEnd(videoDuration);
    }
  };

  const handleSetOutPoint = () => {
    setTrimEnd(Math.max(currentVideoTime, trimStart + 0.5));
  };

  const handleApply = () => {
    const finalEnd = trimEnd > trimStart ? trimEnd : (videoDuration || trimStart + 5.0);
    const isAutoFit = speedMode === 'auto-fit-duration';
    const numericRate = isAutoFit ? (item.playbackRate || 0.5) : Number(speedMode);

    onSave({
      trimStartSec: Number(trimStart.toFixed(2)),
      trimEndSec: Number(finalEnd.toFixed(2)),
      sourceDurationSec: videoDuration > 0 ? videoDuration : item.sourceDurationSec,
      playbackDirection: direction,
      videoTimeStretchMode: isAutoFit ? 'auto-fit-duration' : 'slow-motion',
      playbackRate: numericRate,
    });
    onClose();
  };

  const clipSpan = Math.max(0.1, (trimEnd || videoDuration) - trimStart);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="md-surface-container w-full max-w-2xl rounded-2xl border border-[var(--md-sys-color-outline-variant)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)]">
          <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-[var(--md-sys-color-on-surface)]">
            <Film className="w-5 h-5 text-[var(--md-sys-color-primary)] shrink-0" />
            <span className="truncate max-w-[280px] sm:max-w-md">Video Clip Trimmer: {item.name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close trim modal"
            className="md-button-tonal !p-1.5 rounded-full text-[var(--md-sys-color-on-surface-variant)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player & Preview */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div className="aspect-video bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-white/10 shadow-inner group">
            <video
              ref={videoRef}
              src={item.url}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              playsInline
              className="w-full h-full object-contain"
            />

            {/* Floating Play/Pause Overlay */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause video preview' : 'Play video preview'}
              className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-transform active:scale-95 shadow-lg"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
          </div>

          {/* Time Scrubber Slider with In/Out markers */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono font-bold text-[var(--md-sys-color-on-surface)] tabular-nums">
              <span>Playhead: {currentVideoTime.toFixed(2)}s</span>
              <span>In: {trimStart.toFixed(2)}s ➔ Out: {trimEnd.toFixed(2)}s</span>
              <span>Total: {(videoDuration || 0).toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={videoDuration || 10}
              step={0.05}
              value={currentVideoTime}
              onChange={(e) => handleScrub(Number(e.target.value))}
              className="w-full accent-[var(--md-sys-color-primary)] h-2.5 bg-[var(--md-sys-color-surface-container-highest)] rounded-full appearance-none cursor-pointer"
            />
          </div>

          {/* In / Out Visual Controls & Numerical Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[var(--md-sys-color-surface-container-highest)] p-3.5 rounded-xl border border-[var(--md-sys-color-outline-variant)]">
            {/* Start / In Point */}
            <div className="space-y-1.5">
              <label htmlFor="modal-trim-start-input" className="text-xs font-bold text-[var(--md-sys-color-primary)] flex items-center justify-between">
                <span>Start Time (In-Point):</span>
                <span className="font-mono text-[11px] font-bold">{trimStart.toFixed(2)}s</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="modal-trim-start-input"
                  type="number"
                  min={0}
                  max={videoDuration || 100}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Math.max(0, Number(e.target.value)))}
                  className="w-20 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setTrimStart(Math.max(0, Number((trimStart - 1).toFixed(1))))}
                  className="md-button-tonal !p-1.5 text-xs font-bold font-mono"
                  title="Step -1s"
                >
                  -1s
                </button>
                <button
                  type="button"
                  onClick={() => setTrimStart(Number((trimStart + 1).toFixed(1)))}
                  className="md-button-tonal !p-1.5 text-xs font-bold font-mono"
                  title="Step +1s"
                >
                  +1s
                </button>
                <button
                  type="button"
                  onClick={handleSetInPoint}
                  className="md-button-filled !py-1.5 !px-2.5 text-xs font-bold flex items-center gap-1 text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm"
                  title="Set Start to current video frame"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Set In ⏱️</span>
                </button>
              </div>
            </div>

            {/* Finish / Out Point */}
            <div className="space-y-1.5">
              <label htmlFor="modal-trim-end-input" className="text-xs font-bold text-amber-400 flex items-center justify-between">
                <span>Finish Time (Out-Point):</span>
                <span className="font-mono text-[11px] font-bold">{trimEnd.toFixed(2)}s</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="modal-trim-end-input"
                  type="number"
                  min={trimStart}
                  max={videoDuration || 100}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Math.max(trimStart + 0.1, Number(e.target.value)))}
                  className="w-20 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setTrimEnd(Math.max(trimStart + 0.1, Number((trimEnd - 1).toFixed(1))))}
                  className="md-button-tonal !p-1.5 text-xs font-bold font-mono"
                  title="Step -1s"
                >
                  -1s
                </button>
                <button
                  type="button"
                  onClick={() => setTrimEnd(Math.min(videoDuration || 100, Number((trimEnd + 1).toFixed(1))))}
                  className="md-button-tonal !p-1.5 text-xs font-bold font-mono"
                  title="Step +1s"
                >
                  +1s
                </button>
                <button
                  type="button"
                  onClick={handleSetOutPoint}
                  className="md-button-filled !py-1.5 !px-2.5 text-xs font-bold flex items-center gap-1 text-white bg-amber-600 hover:bg-amber-500 shadow-sm"
                  title="Set Finish to current video frame"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Set Out ⏱️</span>
                </button>
              </div>
            </div>
          </div>

          {/* Direction & Speed Presets inside Modal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[var(--md-sys-color-surface-container-highest)] p-3.5 rounded-xl border border-[var(--md-sys-color-outline-variant)]">
            {/* Playback Direction */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)] block">
                Playback Direction:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'forward', label: '⏩ Forward' },
                  { id: 'reverse', label: '⏪ Reverse' },
                  { id: 'ping-pong', label: '🪃 Boomerang' },
                  { id: 'freeze-frame', label: '⏸️ Freeze' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDirection(d.id as any)}
                    className={`text-xs font-bold py-1.5 px-2 rounded-lg border text-center transition-colors ${
                      direction === d.id
                        ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent shadow-sm'
                        : 'bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed Stretcher */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-1">
                <FastForward className="w-3.5 h-3.5 text-[var(--md-sys-color-primary)]" />
                <span>Speed / Time-Stretch:</span>
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'auto-fit-duration', label: 'Auto-Fit' },
                  { id: '0.25', label: '0.25x' },
                  { id: '0.5', label: '0.5x' },
                  { id: '0.75', label: '0.75x' },
                  { id: '1', label: '1.0x' },
                  { id: '1.5', label: '1.5x' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSpeedMode(s.id)}
                    className={`text-xs font-bold py-1.5 px-1 rounded-lg border text-center font-mono transition-colors ${
                      speedMode === s.id
                        ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent shadow-sm'
                        : 'bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Range Summary Box */}
          <div className="flex items-center justify-between text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] px-1">
            <span>Video Clip Span: <strong className="text-[var(--md-sys-color-on-surface)] font-mono">{clipSpan.toFixed(2)}s</strong></span>
            <span>Scene Music Duration: <strong className="text-[var(--md-sys-color-on-surface)] font-mono">{item.durationSec}s</strong></span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)]">
          <button
            type="button"
            onClick={() => {
              setTrimStart(0);
              setTrimEnd(videoDuration);
              if (videoRef.current) videoRef.current.currentTime = 0;
            }}
            className="md-button-outlined !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Range</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="md-button-outlined !py-1.5 !px-3.5 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="md-button-filled !py-1.5 !px-4.5 text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>Apply Clip Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
