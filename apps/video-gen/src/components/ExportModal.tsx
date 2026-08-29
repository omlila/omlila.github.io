import React, { useEffect } from 'react';
import type { ExportConfig, ExportStatus, ResolutionQuality } from '../types';
import { QUALITY_CONFIGS } from '../types';
import { Download, CheckCircle, Loader2, X, Film, AlertTriangle, Sparkles, MonitorPlay, Zap, BarChart2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExportModalProps {
  status: ExportStatus;
  exportConfig: ExportConfig;
  onConfigChange: (newConfig: ExportConfig) => void;
  onStartExport: () => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  status,
  exportConfig,
  onConfigChange,
  onStartExport,
  onClose,
}) => {
  useEffect(() => {
    if (status.stage === 'completed') {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [status.stage]);

  const targetQualityConfig = QUALITY_CONFIGS[exportConfig.quality];
  const targetDims = targetQualityConfig.getDimensions(exportConfig.aspectRatio);
  const activeBitrateMbps = (exportConfig.customBitrate || targetQualityConfig.bitrate) / 1_000_000;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="md-surface-container-high w-full max-w-lg p-8 relative space-y-6 text-center max-h-[90vh] overflow-y-auto shadow-[var(--md-sys-elevation-4)]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="md-button-tonal !p-2 !rounded-full absolute top-4 right-4 text-[var(--md-sys-color-on-surface-variant)]"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center gap-2">
          {status.stage === 'completed' ? (
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center ring-8 ring-emerald-500/10">
              <CheckCircle className="w-6 h-6" aria-hidden="true" />
            </div>
          ) : status.stage === 'error' ? (
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center ring-8 ring-rose-500/10">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center ring-8 ring-purple-500/10 glow-purple">
              <Film className="w-6 h-6" aria-hidden="true" />
            </div>
          )}

          <h2 id="export-modal-title" className="text-xl font-extrabold text-white text-balance">
            {status.stage === 'completed'
              ? 'Your Video is Ready!'
              : status.stage === 'error'
              ? 'Export Failed'
              : status.stage === 'muxing' || status.progress >= 99
              ? 'Finalizing MP4 Video Container…'
              : status.isExporting
              ? 'Rendering MP4 Video…'
              : 'Export Video Options'}
          </h2>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto">
            {status.stage === 'completed'
              ? `Encoded locally in ${status.resolutionText} at ${status.fps} FPS via WebCodecs API.`
              : status.stage === 'error'
              ? status.errorMessage || 'An error occurred during encoding.'
              : status.stage === 'muxing' || status.progress >= 99
              ? 'All frames rendered. Now assembling MP4 headers and flushing audio/video tracks (~5–10s).'
              : status.isExporting
              ? 'Deterministic frame-by-frame rendering in progress…'
              : 'Select resolution quality, bitrate fine-tuning, and frame rate before exporting.'}
          </p>
        </div>

        {/* Export Configuration Form (when idle/not exporting) */}
        {status.stage === 'idle' && !status.isExporting && (
          <div className="space-y-4 text-left border-t border-b border-white/10 py-4">
            {/* Resolution Quality Selector */}
            <div>
              <label className="block text-sm font-semibold text-[var(--md-sys-color-primary)] mb-3 flex items-center gap-1.5">
                <MonitorPlay className="w-4 h-4" aria-hidden="true" />
                <span>Video Resolution & Quality</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['720p', '1080p', '1440p', '2160p'] as ResolutionQuality[]).map((q) => {
                  const cfg = QUALITY_CONFIGS[q];
                  const dims = cfg.getDimensions(exportConfig.aspectRatio);
                  const isSelected = exportConfig.quality === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onConfigChange({ ...exportConfig, quality: q, customBitrate: undefined })}
                      aria-pressed={isSelected}
                      className={`p-3 rounded-2xl border text-left transition-colors focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none ${
                        isSelected
                          ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)] font-bold shadow-[var(--md-sys-elevation-2)]'
                          : 'bg-[var(--md-sys-color-surface-container)] border-transparent text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{cfg.label}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]' : 'bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)]'}`}>
                          {cfg.badge}
                        </span>
                      </div>
                      <div className={`text-[11px] font-mono tabular-nums mt-1 ${isSelected ? 'text-[var(--md-sys-color-on-primary-container)] opacity-80' : 'text-[var(--md-sys-color-on-surface-variant)]'}`}>
                        {dims.width} × {dims.height} px
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Bitrate Slider (Up to 50 Mbps) */}
            <div>
              <div className="flex justify-between text-xs text-purple-300 mb-1 font-semibold">
                <label htmlFor="custom-bitrate-slider" className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  <span>Bitrate & Quality Fine-Tuner</span>
                </label>
                <span className="tabular-nums font-mono">{activeBitrateMbps.toFixed(1)} Mbps</span>
              </div>
              <input
                id="custom-bitrate-slider"
                type="range"
                min={4_000_000}
                max={50_000_000}
                step={1_000_000}
                value={exportConfig.customBitrate || targetQualityConfig.bitrate}
                onChange={(e) => onConfigChange({ ...exportConfig, customBitrate: Number(e.target.value) })}
                className="w-full accent-purple-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-500"
              />
            </div>

            {/* Frame Rate (FPS) Selector */}
            <div>
              <label className="block text-sm font-semibold text-[var(--md-sys-color-primary)] mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Frame Rate (FPS)</span>
              </label>
              <div className="flex gap-3">
                {([24, 30, 60] as (24 | 30 | 60)[]).map((fpsVal) => (
                  <button
                    key={fpsVal}
                    type="button"
                    onClick={() => onConfigChange({ ...exportConfig, fps: fpsVal })}
                    aria-pressed={exportConfig.fps === fpsVal}
                    className={`flex-1 py-2.5 rounded-2xl border text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none ${
                      exportConfig.fps === fpsVal
                        ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)] font-bold shadow-[var(--md-sys-elevation-2)]'
                        : 'bg-[var(--md-sys-color-surface-container)] border-transparent text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                    }`}
                  >
                    {fpsVal} FPS <span className={`text-[10px] block ${exportConfig.fps === fpsVal ? 'opacity-80' : 'text-[var(--md-sys-color-on-surface-variant)]'}`}>{fpsVal === 60 ? '(Ultra Smooth)' : fpsVal === 24 ? '(Cinematic)' : '(Standard)'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Badge */}
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-between text-sm font-mono">
              <span className="text-zinc-400">Target Render Output:</span>
              <span className="text-purple-300 font-bold tabular-nums">
                {targetDims.width} × {targetDims.height} @ {exportConfig.fps} FPS ({activeBitrateMbps.toFixed(1)} Mbps)
              </span>
            </div>
          </div>
        )}

        {/* Benchmark & Completion Stats */}
        {status.stage === 'completed' && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-sm font-mono space-y-1 text-left tabular-nums">
            <div className="flex items-center gap-1.5 font-bold text-emerald-300 mb-1">
              <BarChart2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Export Benchmark Performance</span>
            </div>
            {status.renderTimeSec && (
              <div className="flex justify-between text-zinc-300">
                <span>Wall-Clock Render Time:</span>
                <span className="text-emerald-400 font-bold">{status.renderTimeSec.toFixed(2)} sec</span>
              </div>
            )}
            {status.fileSizeBytes && (
              <div className="flex justify-between text-zinc-300">
                <span>Encoded MP4 File Size:</span>
                <span className="text-emerald-400 font-bold">{(status.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            )}
          </div>
        )}

        {/* Render Progress Bar */}
        {status.isExporting && status.stage !== 'completed' && status.stage !== 'error' && (
          <div className="space-y-3" aria-live="polite">
            <div className="flex justify-between text-sm text-zinc-400 font-mono tabular-nums">
              <span>Rendering: {status.resolutionText}</span>
              <span>{Math.round(status.progress)}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 h-full rounded-full transition-transform duration-300 shadow-lg glow-purple"
                style={{ width: `${status.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-zinc-500 font-mono tabular-nums">
              <span>Frame {status.currentFrame} / {status.totalFrames}</span>
              <span>{status.fps} FPS</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2">
          {status.stage === 'idle' && !status.isExporting ? (
            <button
              type="button"
              onClick={onStartExport}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-extrabold text-sm shadow-xl hover:opacity-95 flex items-center justify-center gap-2 glow-purple transition-opacity transform hover:-translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
            >
              <Film className="w-4 h-4" aria-hidden="true" />
              <span>Start Render ({targetQualityConfig.badge} MP4)</span>
            </button>
          ) : status.stage === 'completed' && status.downloadUrl ? (
            <a
              href={status.downloadUrl}
              download={`lyrical_video_${exportConfig.quality}_${exportConfig.aspectRatio.replace(':', 'x')}.mp4`}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-extrabold text-sm shadow-xl hover:from-emerald-500 hover:to-teal-400 flex items-center justify-center gap-2 transition-colors transform hover:-translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
            >
              <Download className="w-5 h-5" aria-hidden="true" />
              <span>Download {exportConfig.quality} MP4 Video</span>
            </a>
          ) : status.stage === 'error' ? (
            <button
              type="button"
              onClick={onClose}
              className="md-button-tonal w-full py-3.5 flex justify-center text-sm font-bold"
            >
              Close
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-purple-300 font-medium py-2" aria-live="polite">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Encoding frames locally via WebCodecs…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
