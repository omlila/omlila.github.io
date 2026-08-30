import React from 'react';
import type { MediaSequenceItem, StyleConfig } from '../types';
import { Upload, Trash2, ArrowLeft, ArrowRight, Image as ImageIcon, Clock, Sparkles, Wand2, Layers, Gauge } from 'lucide-react';

interface MediaSequencerProps {
  mediaItems: MediaSequenceItem[];
  onUpdateMediaItems: (items: MediaSequenceItem[]) => void;
  audioDuration: number;
  style?: StyleConfig;
  onStyleChange?: (style: StyleConfig) => void;
  currentTime?: number;
}

import { saveMediaFile, deleteMediaFile } from '../utils/mediaStore';

export const MediaSequencer: React.FC<MediaSequencerProps> = ({
  mediaItems,
  onUpdateMediaItems,
  audioDuration,
  style,
  onStyleChange,
  currentTime = 0,
}) => {
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
  };

  const updateDuration = (id: string, durationSec: number) => {
    onUpdateMediaItems(
      mediaItems.map((item) => (item.id === id ? { ...item, durationSec: Math.max(1, durationSec) } : item))
    );
  };

  const duplicateItem = (index: number) => {
    const itemToDuplicate = mediaItems[index];
    const duplicatedItem = {
      ...itemToDuplicate,
      id: `media_${Date.now()}_dup`,
      name: `${itemToDuplicate.name} (Copy)`
    };
    
    const updated = [...mediaItems];
    updated.splice(index + 1, 0, duplicatedItem);
    onUpdateMediaItems(updated);
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
          {mediaItems.map((item, index) => (
            <div
              key={item.id}
              className="md-surface-container p-3 flex items-center justify-between gap-3 group hover:border-[var(--md-sys-color-primary)] border border-transparent transition-colors"
            >
              {/* Left Info & Thumbnail */}
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-sm font-mono font-bold text-[var(--md-sys-color-primary)] w-5 tabular-nums">
                  #{index + 1}
                </span>

                <div className="w-14 h-14 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] overflow-hidden shrink-0 flex items-center justify-center relative">
                  {item.type === 'image' ? (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <video src={`${item.url}#t=0.5`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  )}
                  <span className="absolute bottom-1 right-1 px-1 rounded-sm bg-black/80 text-[10px] font-mono text-white">
                    {item.type}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate block">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--md-sys-color-on-surface-variant)]" aria-hidden="true" />
                    <label htmlFor={`duration-${item.id}`} className="sr-only">Duration in seconds for {item.name}</label>
                    <input
                      id={`duration-${item.id}`}
                      type="number"
                      min={1}
                      max={60}
                      step={0.5}
                      value={item.durationSec}
                      onChange={(e) => updateDuration(item.id, Number(e.target.value))}
                      className="w-16 bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-1.5 py-0.5 text-xs font-mono text-center rounded tabular-nums focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none"
                    />
                    <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-medium">sec</span>
                    <button
                      type="button"
                      onClick={() => handleSetEndTime(index)}
                      title="End Clip Here (adjusts this clip's duration)"
                      className="md-button-tonal !px-1.5 !py-1 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)] rounded text-[10px] font-bold"
                    >
                      End Here
                    </button>
                  </div>

                  {item.type === 'video' && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Gauge className="w-3.5 h-3.5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
                      <label htmlFor={`speed-${item.id}`} className="sr-only">Speed for {item.name}</label>
                      <select
                        id={`speed-${item.id}`}
                        value={item.videoTimeStretchMode === 'auto-fit-duration' ? 'auto-fit-duration' : (item.playbackRate ?? 0.5)}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'auto-fit-duration') {
                            onUpdateMediaItems(
                              mediaItems.map(m => m.id === item.id ? { ...m, videoTimeStretchMode: 'auto-fit-duration' } : m)
                            );
                          } else {
                            onUpdateMediaItems(
                              mediaItems.map(m => m.id === item.id ? { ...m, playbackRate: Number(val), videoTimeStretchMode: 'slow-motion' } : m)
                            );
                          }
                        }}
                        className="bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-1.5 py-0.5 text-xs font-mono rounded cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none"
                      >
                        <option value="0.25">0.25x Super Slow</option>
                        <option value="0.5">0.5x Slow-Motion (Smooth)</option>
                        <option value="0.75">0.75x Cinematic Slow</option>
                        <option value="1">1.0x Normal Speed</option>
                        <option value="1.5">1.5x Fast</option>
                        <option value="auto-fit-duration">Auto-Stretch to Fill Segment</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => duplicateItem(index)}
                  aria-label={`Duplicate ${item.name}`}
                  className="md-button-tonal !p-2"
                >
                  <Layers className="w-4 h-4" aria-hidden="true" />
                </button>
                
                <button
                  type="button"
                  onClick={() => moveItem(index, 'left')}
                  disabled={index === 0}
                  aria-label={`Move ${item.name} up in sequence`}
                  className="md-button-tonal !p-2 disabled:opacity-30"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => moveItem(index, 'right')}
                  disabled={index === mediaItems.length - 1}
                  aria-label={`Move ${item.name} down in sequence`}
                  className="md-button-tonal !p-2 disabled:opacity-30"
                >
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Delete ${item.name} from sequence`}
                  className="md-button-tonal !p-2 text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error-container)] hover:text-[var(--md-sys-color-on-error-container)]"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
