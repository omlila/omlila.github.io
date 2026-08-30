import React from 'react';
import type { MediaSequenceItem, StyleConfig } from '../types';
import { 
  Upload, Trash2, ArrowUp, ArrowDown, 
  Clock, Sparkles, Wand2, Layers, Scissors, 
  Film, Copy
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
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalItemsCount = mediaItems.length + files.length;
    const equalDuration = audioDuration > 0 
      ? Number((audioDuration / totalItemsCount).toFixed(1)) 
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
        trimStartSec: 0,
        playbackRate: 0.5,
        videoTimeStretchMode: 'slow-motion',
        playbackDirection: 'forward',
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

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= mediaItems.length) return;

    const updated = [...mediaItems];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIdx, 0, moved);
    onUpdateMediaItems(updated);
  };

  const updateDuration = (id: string, durationSec: number) => {
    onUpdateMediaItems(
      mediaItems.map((item) => (item.id === id ? { ...item, durationSec: Math.max(0.5, Number(durationSec.toFixed(1))) } : item))
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

  // 1-Click "End Here & Add Next Scene": Locks current clip's duration to song playback time and appends next video subsection
  const handleEndHereAndSplit = (index: number) => {
    if (!currentTime || currentTime <= 0) return;
    
    let accumulatedBefore = 0;
    for (let i = 0; i < index; i++) {
      accumulatedBefore += mediaItems[i].durationSec;
    }
    
    let currentClipDuration = Number((currentTime - accumulatedBefore).toFixed(1));
    if (currentClipDuration < 0.5) currentClipDuration = 0.5;

    const currentItem = mediaItems[index];
    const updated = [...mediaItems];

    // Lock duration of current scene to end at current playback position
    updated[index] = { ...currentItem, durationSec: currentClipDuration };

    // If it's a video, automatically spawn the next contiguous scene from the same video
    if (currentItem.type === 'video') {
      const speed = currentItem.playbackRate ?? 0.5;
      const currentTrimStart = currentItem.trimStartSec ?? 0;
      const nextTrimStart = Number((currentTrimStart + (currentClipDuration * speed)).toFixed(1));
      
      const remainingAudio = audioDuration > currentTime ? Number((audioDuration - currentTime).toFixed(1)) : 5.0;

      const nextScene: MediaSequenceItem = {
        ...currentItem,
        id: `media_${Date.now()}_scene`,
        name: `${currentItem.name.replace(/ \(Scene \d+\)/, '')} (Scene ${index + 2})`,
        trimStartSec: nextTrimStart,
        durationSec: Math.max(1, remainingAudio),
        playbackDirection: currentItem.playbackDirection || 'forward',
      };

      updated.splice(index + 1, 0, nextScene);
    }

    onUpdateMediaItems(updated);
  };

  // Add another scene subsection from the same video
  const expandVideoScene = (index: number, direction: 'forward' | 'reverse' | 'ping-pong' | 'freeze-frame' = 'forward') => {
    const item = mediaItems[index];
    const speed = item.playbackRate ?? 0.5;
    const currentTrimStart = item.trimStartSec ?? 0;
    const nextTrimStart = direction === 'forward' ? Number((currentTrimStart + (item.durationSec * speed)).toFixed(1)) : currentTrimStart;

    const labelMap: Record<string, string> = {
      'forward': 'Next Scene',
      'reverse': 'Reverse',
      'ping-pong': 'Boomerang',
      'freeze-frame': 'Freeze'
    };

    const nextScene: MediaSequenceItem = {
      ...item,
      id: `media_${Date.now()}_scene`,
      name: `${item.name.replace(/ \((Next Scene|Reverse|Boomerang|Freeze|Scene \d+)\)/, '')} (${labelMap[direction]})`,
      trimStartSec: nextTrimStart,
      playbackDirection: direction,
      durationSec: item.durationSec || 5.0,
    };

    const updated = [...mediaItems];
    updated.splice(index + 1, 0, nextScene);
    onUpdateMediaItems(updated);
  };

  const autoDistributeDurations = () => {
    if (mediaItems.length === 0 || audioDuration <= 0) return;
    const equalDuration = Number((audioDuration / mediaItems.length).toFixed(1));
    onUpdateMediaItems(mediaItems.map((item) => ({ ...item, durationSec: equalDuration })));
  };

  const totalMediaDuration = mediaItems.reduce((acc, item) => acc + item.durationSec, 0);

  return (
    <div className="space-y-4">
      {/* Upload Header Bar */}
      <div className="md-surface-container p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--md-sys-color-primary)]">
            <Film className="w-5 h-5 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
            <span>Video Scenes & Background Sequencer</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={autoDistributeDurations}
              disabled={mediaItems.length === 0 || audioDuration <= 0}
              aria-label="Auto-fit image durations to match audio length"
              title={audioDuration <= 0 ? "Load audio first to use auto-fit" : "Auto-fit clip durations to match audio length"}
              className="md-button-outlined !px-3 !py-1.5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
            >
              <Wand2 className="w-4 h-4" aria-hidden="true" />
              <span>Equal Fit ({audioDuration > 0 ? `${audioDuration.toFixed(0)}s` : 'Full Track'})</span>
            </button>

            <label className="md-button-filled cursor-pointer flex items-center gap-2 text-xs font-bold !py-1.5 !px-3">
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Add Videos / Images</span>
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
          Upload video backgrounds or photos. Click <strong>"End Here ✂️"</strong> during audio playback to lock scene boundaries, or use <strong>"⏩ Forward"</strong>, <strong>"⏪ Reverse"</strong>, and <strong>"🪃 Boomerang"</strong> to create looping visuals.
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
          <span>Scenes: {mediaItems.length}</span>
          <span>Timeline: {totalMediaDuration.toFixed(1)}s / Audio: {audioDuration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Media Items Sequence List */}
      {mediaItems.length === 0 ? (
        <div className="md-surface-container-highest p-8 border border-dashed border-[var(--md-sys-color-outline-variant)] text-center space-y-3">
          <Sparkles className="w-8 h-8 text-[var(--md-sys-color-primary)] mx-auto animate-pulse" aria-hidden="true" />
          <h3 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">No Video Scenes Uploaded</h3>
          <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] max-w-xs mx-auto">
            Upload videos or images to build your lyrical sequence. You can expand any video into forward, reverse, and boomerang scenes.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {mediaItems.map((item, index) => {
            const dir = item.playbackDirection || 'forward';

            return (
              <div
                key={item.id}
                className="md-surface-container p-3.5 rounded-xl border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-all space-y-3 group"
              >
                {/* Top Row: Info, Badges & Reorder Actions */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-highest)] px-2 py-0.5 rounded-md tabular-nums">
                      Scene #{index + 1}
                    </span>

                    <div className="w-12 h-12 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] overflow-hidden shrink-0 flex items-center justify-center relative border border-white/5">
                      {item.type === 'image' ? (
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <video src={`${item.url}#t=${item.trimStartSec || 0.5}`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                      )}
                      <span className="absolute bottom-0.5 right-0.5 px-1 rounded-sm bg-black/80 text-[9px] font-mono text-white">
                        {item.type}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate block max-w-[200px]" title={item.name}>
                        {item.name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item.type === 'video' && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            dir === 'reverse' ? 'bg-amber-500/20 text-amber-300' :
                            dir === 'ping-pong' ? 'bg-purple-500/20 text-purple-300' :
                            dir === 'freeze-frame' ? 'bg-cyan-500/20 text-cyan-300' :
                            'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {dir === 'reverse' ? '⏪ Reverse' : dir === 'ping-pong' ? '🪃 Boomerang' : dir === 'freeze-frame' ? '⏸️ Freeze' : '⏩ Forward'}
                          </span>
                        )}
                        {item.trimStartSec && item.trimStartSec > 0 ? (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            Start: {item.trimStartSec.toFixed(1)}s
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Reorder and Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      aria-label="Move scene earlier"
                      title="Move Scene Earlier"
                      className="md-button-tonal !p-1.5 disabled:opacity-30 rounded-lg"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === mediaItems.length - 1}
                      aria-label="Move scene later"
                      title="Move Scene Later"
                      className="md-button-tonal !p-1.5 disabled:opacity-30 rounded-lg"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label="Delete scene"
                      title="Delete Scene"
                      className="md-button-tonal !p-1.5 text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error-container)] rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Controls & Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[var(--md-sys-color-outline-variant)]/40 text-xs">
                  {/* Left Controls: Duration & "End Here" */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[var(--md-sys-color-surface-container-highest)] px-2 py-1 rounded-lg border border-[var(--md-sys-color-outline-variant)]">
                      <Clock className="w-3.5 h-3.5 text-[var(--md-sys-color-primary)]" />
                      <label htmlFor={`duration-${item.id}`} className="sr-only">Duration</label>
                      <input
                        id={`duration-${item.id}`}
                        type="number"
                        min={0.5}
                        max={120}
                        step={0.5}
                        value={item.durationSec}
                        onChange={(e) => updateDuration(item.id, Number(e.target.value))}
                        className="w-14 bg-transparent text-[var(--md-sys-color-on-surface)] text-xs font-mono text-center font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-zinc-400 font-medium">sec</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEndHereAndSplit(index)}
                      title="Set clip end time to current audio playback position and automatically add the next scene"
                      className="md-button-filled !py-1 !px-2.5 text-xs font-bold flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-white shadow-sm"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>End Here ✂️</span>
                    </button>
                  </div>

                  {/* Right Controls (Video direction & expand actions) */}
                  {item.type === 'video' ? (
                    <div className="flex items-center gap-1.5 justify-start sm:justify-end flex-wrap">
                      {/* Direction Dropdown */}
                      <select
                        value={item.playbackDirection || 'forward'}
                        onChange={(e) => updateItemField(index, 'playbackDirection', e.target.value as any)}
                        className="bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-2 py-1 text-xs font-bold rounded-lg cursor-pointer focus:outline-none"
                      >
                        <option value="forward">⏩ Forward</option>
                        <option value="reverse">⏪ Reverse</option>
                        <option value="ping-pong">🪃 Boomerang Loop</option>
                        <option value="freeze-frame">⏸️ Freeze Still</option>
                      </select>

                      {/* Speed Multiplier */}
                      <select
                        value={item.videoTimeStretchMode === 'auto-fit-duration' ? 'auto-fit-duration' : (item.playbackRate ?? 0.5)}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'auto-fit-duration') {
                            updateItemField(index, 'videoTimeStretchMode', 'auto-fit-duration');
                          } else {
                            const updated = [...mediaItems];
                            updated[index] = { ...updated[index], playbackRate: Number(val), videoTimeStretchMode: 'slow-motion' };
                            onUpdateMediaItems(updated);
                          }
                        }}
                        className="bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-1.5 py-1 text-xs font-mono rounded-lg cursor-pointer focus:outline-none"
                      >
                        <option value="0.25">0.25x Slow</option>
                        <option value="0.5">0.5x Smooth</option>
                        <option value="0.75">0.75x</option>
                        <option value="1">1.0x Normal</option>
                        <option value="auto-fit-duration">Auto-Fit</option>
                      </select>

                      {/* Quick Expand Button */}
                      <button
                        type="button"
                        onClick={() => expandVideoScene(index, 'forward')}
                        title="Add next scene from this video"
                        className="md-button-tonal !py-1 !px-2 text-xs font-bold flex items-center gap-1 rounded-lg text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)]"
                      >
                        <span>+ Add Scene</span>
                      </button>

                      {/* Quick Boomerang Button */}
                      <button
                        type="button"
                        onClick={() => expandVideoScene(index, 'reverse')}
                        title="Duplicate as a Reverse scene"
                        className="md-button-tonal !py-1 !px-2 text-xs font-bold flex items-center gap-1 rounded-lg text-purple-300 hover:bg-purple-900/30"
                      >
                        <span>⏪ Reverse Clone</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-start sm:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const duplicated: MediaSequenceItem = {
                            ...item,
                            id: `media_${Date.now()}_dup`,
                            name: `${item.name} (Copy)`
                          };
                          const updated = [...mediaItems];
                          updated.splice(index + 1, 0, duplicated);
                          onUpdateMediaItems(updated);
                        }}
                        className="md-button-tonal !py-1 !px-2.5 text-xs font-bold flex items-center gap-1 rounded-lg"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Duplicate Photo</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
