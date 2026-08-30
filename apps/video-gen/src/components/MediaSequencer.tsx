import React, { useState, useRef } from 'react';
import type { MediaSequenceItem, StyleConfig, BackgroundTransformConfig } from '../types';
import { 
  Upload, Trash2, ArrowLeft, ArrowRight, Image as ImageIcon, 
  Clock, Sparkles, Wand2, Layers, Gauge, Scissors, Crop, 
  Play, Pause, RotateCcw, ZoomIn, Move, Check, X, Film 
} from 'lucide-react';
import { saveMediaFile, deleteMediaFile } from '../utils/mediaStore';

interface MediaSequencerProps {
  mediaItems: MediaSequenceItem[];
  onUpdateMediaItems: (items: MediaSequenceItem[]) => void;
  audioDuration: number;
  style?: StyleConfig;
  onStyleChange?: (style: StyleConfig) => void;
  currentTime?: number;
}

export const MediaSequencer: React.FC<MediaSequencerProps> = ({
  mediaItems,
  onUpdateMediaItems,
  audioDuration,
  style,
  onStyleChange,
  currentTime = 0,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [previewVideoTime, setPreviewVideoTime] = useState<number>(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalItemsCount = mediaItems.length + files.length;
    const equalDuration = audioDuration > 0 
      ? Number((audioDuration / totalItemsCount).toFixed(2)) 
      : 5.0;

    const newItems: MediaSequenceItem[] = [];
    
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      const id = `media_${Date.now()}_${idx}`;
      
      await saveMediaFile(id, file);
      
      newItems.push({
        id,
        name: file.name,
        type: isVideo ? 'video' : 'image',
        url,
        durationSec: equalDuration,
      });
    }

    // Auto-update existing items to also share this new equal duration
    const updatedExistingItems = mediaItems.map(item => ({ 
      ...item, 
      durationSec: equalDuration 
    }));
    
    onUpdateMediaItems([...updatedExistingItems, ...newItems]);
  };

  const removeItem = async (id: string) => {
    onUpdateMediaItems(mediaItems.filter((item) => item.id !== id));
    await deleteMediaFile(id);
  };

  const moveItem = (index: number, direction: 'left' | 'right') => {
    const newIdx = direction === 'left' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= mediaItems.length) return;

    const updated = [...mediaItems];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIdx, 0, moved);
    onUpdateMediaItems(updated);
    if (editingIndex === index) {
      setEditingIndex(newIdx);
    }
  };

  const updateDuration = (id: string, durationSec: number) => {
    onUpdateMediaItems(
      mediaItems.map((item) => (item.id === id ? { ...item, durationSec: Math.max(1, durationSec) } : item))
    );
  };

  const updateItemField = <K extends keyof MediaSequenceItem>(
    index: number,
    field: K,
    value: MediaSequenceItem[K]
  ) => {
    const updated = [...mediaItems];
    updated[index] = { ...updated[index], [field]: value };
    onUpdateMediaItems(updated);
  };

  const updateItemTransform = (
    index: number,
    transformPartial: Partial<BackgroundTransformConfig>
  ) => {
    const current = mediaItems[index]?.transform || {
      scale: 1.0,
      offsetXPercent: 0,
      offsetYPercent: 0,
      fitMode: 'cover'
    };
    updateItemField(index, 'transform', { ...current, ...transformPartial });
  };

  const duplicateItem = (index: number) => {
    const itemToDuplicate = mediaItems[index];
    const duplicatedItem: MediaSequenceItem = {
      ...itemToDuplicate,
      id: `media_${Date.now()}_dup`,
      name: `${itemToDuplicate.name} (Copy)`
    };
    
    const updated = [...mediaItems];
    updated.splice(index + 1, 0, duplicatedItem);
    onUpdateMediaItems(updated);
  };

  // Split video at current preview timestamp into two sequential clips
  const splitVideoSegment = (index: number) => {
    const item = mediaItems[index];
    if (item.type !== 'video') return;

    const splitTimestamp = previewVideoTime;
    const originalTrimStart = item.trimStartSec ?? 0;
    const originalTrimEnd = item.trimEndSec ?? (item.sourceDurationSec || 60);

    if (splitTimestamp <= originalTrimStart || splitTimestamp >= originalTrimEnd) {
      alert('Move the scrubber to a point between the start and end to split the clip.');
      return;
    }

    const firstDuration = Math.max(1, Number((item.durationSec / 2).toFixed(1)));
    const secondDuration = Math.max(1, Number((item.durationSec / 2).toFixed(1)));

    // First clip ends at split timestamp
    const firstClip: MediaSequenceItem = {
      ...item,
      trimEndSec: splitTimestamp,
      durationSec: firstDuration,
      name: `${item.name} (Part 1)`
    };

    // Second clip starts at split timestamp and continues to original end
    const secondClip: MediaSequenceItem = {
      ...item,
      id: `media_${Date.now()}_part2`,
      trimStartSec: splitTimestamp,
      trimEndSec: originalTrimEnd,
      durationSec: secondDuration,
      name: `${item.name} (Part 2)`
    };

    const updated = [...mediaItems];
    updated.splice(index, 1, firstClip, secondClip);
    onUpdateMediaItems(updated);
    setEditingIndex(index + 1);
  };

  const autoDistributeDurations = () => {
    if (mediaItems.length === 0 || audioDuration <= 0) return;
    const equalDuration = Number((audioDuration / mediaItems.length).toFixed(2));
    onUpdateMediaItems(mediaItems.map((item) => ({ ...item, durationSec: equalDuration })));
  };

  const handleSetEndTime = (index: number) => {
    if (!currentTime) return;
    let startTime = 0;
    for (let i = 0; i < index; i++) {
      startTime += mediaItems[i].durationSec;
    }
    let newDuration = currentTime - startTime;
    if (newDuration < 0.1) newDuration = 0.1;
    updateDuration(mediaItems[index].id, Number(newDuration.toFixed(2)));
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toFixed(1).padStart(4, '0');
    return `${m}:${s}`;
  };

  const activeEditingItem = editingIndex !== null ? mediaItems[editingIndex] : null;
  const totalMediaDuration = mediaItems.reduce((acc, item) => acc + item.durationSec, 0);

  return (
    <div className="space-y-4">
      {/* Upload Header Bar */}
      <div className="md-surface-container p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--md-sys-color-primary)]">
            <ImageIcon className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
            <span>Multi-Media Background Sequencer</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={autoDistributeDurations}
              disabled={mediaItems.length === 0 || audioDuration <= 0}
              aria-label="Auto-fit image durations to match audio length"
              title={audioDuration <= 0 ? "Load audio first to use auto-fit" : "Auto-fit image durations to match audio length"}
              className="md-button-outlined !px-3 !py-1.5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 className="w-4 h-4" aria-hidden="true" />
              <span>Auto-Fit Timings</span>
            </button>

            <label className="md-button-filled cursor-pointer flex items-center gap-2">
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Add Media Clips</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
          Upload photos or video clips and arrange their order. Clips will automatically transition in sequence during video rendering.
        </p>

        {style && onStyleChange && (
          <div className="flex items-center gap-4 bg-[var(--md-sys-color-surface-container-highest)] p-3 rounded-lg border border-[var(--md-sys-color-outline-variant)]">
            <Layers className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-[var(--md-sys-color-on-surface)]">Transition Crossfade Duration</span>
                <span className="text-xs font-mono font-bold text-[var(--md-sys-color-primary)]">{style.sequenceCrossfadeDuration ?? 1.0}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={style.sequenceCrossfadeDuration ?? 1.0}
                onChange={(e) => onStyleChange({ ...style, sequenceCrossfadeDuration: Number(e.target.value) })}
                className="w-full accent-[var(--md-sys-color-primary)]"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)] border-t border-[var(--md-sys-color-outline-variant)] pt-3 tabular-nums mt-3">
          <span>Clips Count: {mediaItems.length}</span>
          <span>Sequence Duration: {totalMediaDuration.toFixed(1)}s / Audio: {audioDuration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Media Items Sequence Grid */}
      {mediaItems.length === 0 ? (
        <div className="md-surface-container-highest p-8 border border-dashed border-[var(--md-sys-color-outline-variant)] text-center space-y-3">
          <Sparkles className="w-8 h-8 text-[var(--md-sys-color-primary)] mx-auto animate-pulse" aria-hidden="true" />
          <h3 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">No Background Clips Uploaded</h3>
          <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] max-w-xs mx-auto">
            Upload photos or video backgrounds to build a dynamic slideshow sequence for your lyrical video.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {mediaItems.map((item, index) => {
            const hasCustomCrop = (item.transform?.scale && item.transform.scale !== 1.0) || item.transform?.offsetXPercent || item.transform?.offsetYPercent;
            const hasTrim = (item.trimStartSec && item.trimStartSec > 0) || (item.trimEndSec !== undefined);

            return (
              <div
                key={item.id}
                className={`md-surface-container p-3 flex items-center justify-between gap-3 group border transition-all ${
                  editingIndex === index 
                    ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)]/10' 
                    : 'border-transparent hover:border-[var(--md-sys-color-outline-variant)]'
                }`}
              >
                {/* Left Info & Thumbnail */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-mono font-bold text-[var(--md-sys-color-primary)] w-5 tabular-nums">
                    #{index + 1}
                  </span>

                  <div className="w-14 h-14 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] overflow-hidden shrink-0 flex items-center justify-center relative">
                    {item.type === 'image' ? (
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <video src={`${item.url}#t=${item.trimStartSec || 0.5}`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    )}
                    <span className="absolute bottom-1 right-1 px-1 rounded-sm bg-black/80 text-[10px] font-mono text-white">
                      {item.type}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate block max-w-[160px]">
                        {item.name}
                      </span>
                      {hasTrim && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                          ✂️ {item.trimStartSec ? `${item.trimStartSec.toFixed(1)}s` : '0s'}-{item.trimEndSec ? `${item.trimEndSec.toFixed(1)}s` : 'End'}
                        </span>
                      )}
                      {hasCustomCrop && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                          🔍 {item.transform?.scale?.toFixed(1)}x
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[var(--md-sys-color-on-surface-variant)]" aria-hidden="true" />
                        <label htmlFor={`duration-${item.id}`} className="sr-only">Duration in seconds for {item.name}</label>
                        <input
                          id={`duration-${item.id}`}
                          type="number"
                          min={1}
                          max={120}
                          step={0.5}
                          value={item.durationSec}
                          onChange={(e) => updateDuration(item.id, Number(e.target.value))}
                          className="w-14 bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-1 py-0.5 text-xs font-mono text-center rounded tabular-nums"
                        />
                        <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-medium">sec</span>
                        <button
                          type="button"
                          onClick={() => handleSetEndTime(index)}
                          title="End Clip Here (adjusts this clip's duration)"
                          className="md-button-tonal !px-1.5 !py-0.5 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)] rounded text-[10px] font-bold"
                        >
                          End Here
                        </button>
                      </div>

                      {item.type === 'video' && (
                        <div className="flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
                          <select
                            id={`speed-${item.id}`}
                            value={item.videoTimeStretchMode === 'auto-fit-duration' ? 'auto-fit-duration' : (item.playbackRate ?? 0.5)}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'auto-fit-duration') {
                                updateItemField(index, 'videoTimeStretchMode', 'auto-fit-duration');
                              } else {
                                const rate = Number(val);
                                const updated = [...mediaItems];
                                updated[index] = { ...updated[index], playbackRate: rate, videoTimeStretchMode: 'slow-motion' };
                                onUpdateMediaItems(updated);
                              }
                            }}
                            className="bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-1 py-0.5 text-[11px] font-mono rounded cursor-pointer"
                          >
                            <option value="0.25">0.25x Super Slow</option>
                            <option value="0.5">0.5x Slow-Mo</option>
                            <option value="0.75">0.75x Smooth</option>
                            <option value="1">1.0x Normal</option>
                            <option value="auto-fit-duration">Auto-Stretch</option>
                          </select>
                        </div>
                      )}

                      {/* Crop & Trim Button */}
                      <button
                        type="button"
                        onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                        className={`!py-0.5 !px-2 rounded text-[11px] font-bold flex items-center gap-1 border transition-colors ${
                          editingIndex === index
                            ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent'
                            : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)]'
                        }`}
                      >
                        <Crop className="w-3 h-3" aria-hidden="true" />
                        <span>{item.type === 'video' ? 'Trim & Crop' : 'Crop & Frame'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => duplicateItem(index)}
                    aria-label={`Duplicate ${item.name}`}
                    title="Duplicate Clip"
                    className="md-button-tonal !p-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => moveItem(index, 'left')}
                    disabled={index === 0}
                    aria-label={`Move ${item.name} up in sequence`}
                    title="Move Earlier in Sequence"
                    className="md-button-tonal !p-1.5 disabled:opacity-30"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveItem(index, 'right')}
                    disabled={index === mediaItems.length - 1}
                    aria-label={`Move ${item.name} down in sequence`}
                    title="Move Later in Sequence"
                    className="md-button-tonal !p-1.5 disabled:opacity-30"
                  >
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Delete ${item.name} from sequence`}
                    title="Delete Clip"
                    className="md-button-tonal !p-1.5 text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error-container)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Video Trimming, Cropping & Framing Editor Drawer */}
      {activeEditingItem && editingIndex !== null && (
        <div className="md-surface-container p-5 border-2 border-[var(--md-sys-color-primary)] rounded-2xl space-y-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-[var(--md-sys-color-outline-variant)] pb-3">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-[var(--md-sys-color-primary)]" />
              <div>
                <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                  {activeEditingItem.type === 'video' ? 'Video Trim & Framing Editor' : 'Image Crop & Pan Editor'}
                </h4>
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                  Editing Clip #{editingIndex + 1}: {activeEditingItem.name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditingIndex(null)}
              className="md-button-tonal !p-1.5 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Video Section Trimming Controls (if video) */}
          {activeEditingItem.type === 'video' && (
            <div className="bg-black/40 p-4 rounded-xl space-y-3 border border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--md-sys-color-primary)] flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" /> Video Section Range (In/Out Points)
                </span>
                <span className="font-mono text-zinc-400">
                  Scrubber: <strong className="text-white">{formatSec(previewVideoTime)}</strong> / {activeEditingItem.sourceDurationSec ? formatSec(activeEditingItem.sourceDurationSec) : '--:--'}
                </span>
              </div>

              {/* Video Player Preview for Trimming */}
              <div className="relative aspect-video max-h-[180px] bg-black rounded-lg overflow-hidden flex items-center justify-center mx-auto border border-white/10">
                <video
                  ref={videoPreviewRef}
                  src={activeEditingItem.url}
                  className="w-full h-full object-contain"
                  playsInline
                  muted
                  onLoadedMetadata={(e) => {
                    const dur = e.currentTarget.duration;
                    if (dur && isFinite(dur)) {
                      updateItemField(editingIndex, 'sourceDurationSec', dur);
                      if (activeEditingItem.trimEndSec === undefined) {
                        updateItemField(editingIndex, 'trimEndSec', dur);
                      }
                    }
                  }}
                  onTimeUpdate={(e) => setPreviewVideoTime(e.currentTarget.currentTime)}
                />
                
                <button
                  type="button"
                  onClick={() => {
                    if (videoPreviewRef.current) {
                      if (isVideoPlaying) {
                        videoPreviewRef.current.pause();
                        setIsVideoPlaying(false);
                      } else {
                        videoPreviewRef.current.play();
                        setIsVideoPlaying(true);
                      }
                    }
                  }}
                  className="absolute bottom-2 left-2 p-2 rounded-full bg-black/70 hover:bg-black text-white shadow-lg backdrop-blur-md"
                >
                  {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>

              {/* Range Timeline Scrubber Slider */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={activeEditingItem.sourceDurationSec || 60}
                  step={0.1}
                  value={previewVideoTime}
                  onChange={(e) => {
                    const t = Number(e.target.value);
                    setPreviewVideoTime(t);
                    if (videoPreviewRef.current) {
                      videoPreviewRef.current.currentTime = t;
                    }
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[var(--md-sys-color-primary)]"
                />
                
                {/* Visual Section Boundary Bar */}
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                  <span>00:00.0</span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">In: {formatSec(activeEditingItem.trimStartSec || 0)}</span>
                    <span>•</span>
                    <span className="text-amber-400">Out: {formatSec(activeEditingItem.trimEndSec || (activeEditingItem.sourceDurationSec || 0))}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">Span: {((activeEditingItem.trimEndSec || activeEditingItem.sourceDurationSec || 0) - (activeEditingItem.trimStartSec || 0)).toFixed(1)}s</span>
                  </div>
                  <span>{formatSec(activeEditingItem.sourceDurationSec || 60)}</span>
                </div>
              </div>

              {/* Set In/Out and Split Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      updateItemField(editingIndex, 'trimStartSec', previewVideoTime);
                    }}
                    className="md-button-tonal !py-1 !px-2.5 text-xs font-bold text-amber-300 flex items-center gap-1"
                    title="Set In-Point to current scrubber time"
                  >
                    <span>[ Set In-Point ({formatSec(previewVideoTime)})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateItemField(editingIndex, 'trimEndSec', previewVideoTime);
                    }}
                    className="md-button-tonal !py-1 !px-2.5 text-xs font-bold text-amber-300 flex items-center gap-1"
                    title="Set Out-Point to current scrubber time"
                  >
                    <span>Set Out-Point ({formatSec(previewVideoTime)}) ]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateItemField(editingIndex, 'trimStartSec', 0);
                      updateItemField(editingIndex, 'trimEndSec', activeEditingItem.sourceDurationSec || undefined);
                    }}
                    className="md-button-tonal !py-1 !px-2 text-xs text-zinc-400"
                    title="Reset to full source video"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => splitVideoSegment(editingIndex)}
                  className="md-button-filled !py-1 !px-3 text-xs bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1 font-bold shadow-md"
                  title="Cut video here and add the remainder as the next clip in sequence"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>✂️ Split Section Here</span>
                </button>
              </div>
            </div>
          )}

          {/* Portion of the Frame (Cropping, Pan & Zoom) */}
          <div className="bg-black/30 p-4 rounded-xl space-y-3 border border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--md-sys-color-primary)] flex items-center gap-1.5">
                <Crop className="w-3.5 h-3.5" /> Frame Portion & Zoom (Cropping ROI)
              </span>
              <span className="text-[11px] text-zinc-400">
                Fit: <strong className="text-white uppercase">{activeEditingItem.transform?.fitMode || 'cover'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Zoom Scale */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-zinc-300">
                  <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Zoom Scale</span>
                  <span className="font-mono text-emerald-400">{(activeEditingItem.transform?.scale || 1.0).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.05}
                  value={activeEditingItem.transform?.scale || 1.0}
                  onChange={(e) => updateItemTransform(editingIndex, { scale: Number(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[var(--md-sys-color-primary)]"
                />
              </div>

              {/* Pan X */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-zinc-300">
                  <span className="flex items-center gap-1"><Move className="w-3 h-3" /> Pan X (Horizontal)</span>
                  <span className="font-mono text-emerald-400">{activeEditingItem.transform?.offsetXPercent || 0}%</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={1}
                  value={activeEditingItem.transform?.offsetXPercent || 0}
                  onChange={(e) => updateItemTransform(editingIndex, { offsetXPercent: Number(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[var(--md-sys-color-primary)]"
                />
              </div>

              {/* Pan Y */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-zinc-300">
                  <span className="flex items-center gap-1"><Move className="w-3 h-3 rotate-90" /> Pan Y (Vertical)</span>
                  <span className="font-mono text-emerald-400">{activeEditingItem.transform?.offsetYPercent || 0}%</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={1}
                  value={activeEditingItem.transform?.offsetYPercent || 0}
                  onChange={(e) => updateItemTransform(editingIndex, { offsetYPercent: Number(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[var(--md-sys-color-primary)]"
                />
              </div>
            </div>

            {/* Quick Fit Mode Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-zinc-400">Framing Mode:</span>
              <button
                type="button"
                onClick={() => updateItemTransform(editingIndex, { fitMode: 'cover', scale: 1.0, offsetXPercent: 0, offsetYPercent: 0 })}
                className={`py-0.5 px-2 rounded text-[11px] font-bold border ${
                  activeEditingItem.transform?.fitMode === 'cover'
                    ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]'
                    : 'bg-zinc-800 border-transparent text-zinc-300'
                }`}
              >
                Cover (Fill Screen)
              </button>
              <button
                type="button"
                onClick={() => updateItemTransform(editingIndex, { fitMode: 'contain', scale: 1.0, offsetXPercent: 0, offsetYPercent: 0 })}
                className={`py-0.5 px-2 rounded text-[11px] font-bold border ${
                  activeEditingItem.transform?.fitMode === 'contain'
                    ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]'
                    : 'bg-zinc-800 border-transparent text-zinc-300'
                }`}
              >
                Contain (Full Frame)
              </button>
              <button
                type="button"
                onClick={() => updateItemTransform(editingIndex, { scale: 1.0, offsetXPercent: 0, offsetYPercent: 0 })}
                className="py-0.5 px-2 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
              >
                Reset Pan/Zoom
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setEditingIndex(null)}
              className="md-button-filled !py-1.5 !px-4 text-xs flex items-center gap-1.5 font-bold"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done Editing Clip #{editingIndex + 1}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
