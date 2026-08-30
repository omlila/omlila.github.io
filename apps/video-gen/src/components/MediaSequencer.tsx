import React, { useState } from 'react';
import type { MediaSequenceItem, SceneTransitionType, StyleConfig } from '../types';
import { 
  Upload, Trash2, ArrowUp, ArrowDown, 
  Clock, Sparkles, Wand2, Layers, Scissors, 
  Film, Copy, Eye, Plus
} from 'lucide-react';
import { saveMediaFile, deleteMediaFile } from '../utils/mediaStore';
import { autoContiguousSlice, calculateEffectivePlaybackRate } from '../utils/videoSequencerEngine';
import { VideoTrimModal } from './VideoTrimModal';

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
  const [activeTrimItem, setActiveTrimItem] = useState<MediaSequenceItem | null>(null);

  // List of unique uploaded media sources so any scene can reuse any video/photo
  const uniqueMediaSources = React.useMemo(() => {
    const seen = new Set<string>();
    const sources: { id: string; name: string; url: string; type: 'image' | 'video' }[] = [];
    mediaItems.forEach(item => {
      const key = item.sourceVideoId || item.url;
      if (!seen.has(key) && item.url) {
        seen.add(key);
        sources.push({
          id: item.sourceVideoId || item.id,
          name: item.name.replace(/ \((Continuation|Reverse|Boomerang|Freeze|Scene \d+|Copy)\)/g, ''),
          url: item.url,
          type: item.type
        });
      }
    });
    return sources;
  }, [mediaItems]);

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
        sourceVideoId: id,
        name: file.name,
        type: isVideo ? 'video' : 'image',
        url,
        durationSec: equalDuration,
        trimStartSec: 0,
        playbackRate: 0.5,
        videoTimeStretchMode: 'auto-fit-duration',
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
    const itemToRemove = mediaItems.find(item => item.id === id);
    onUpdateMediaItems(mediaItems.filter((item) => item.id !== id));
    // Only delete file from idb if no other scene is using this source
    const otherUses = mediaItems.filter(item => item.id !== id && (item.sourceVideoId === id || item.id === id));
    if (otherUses.length === 0 && itemToRemove) {
      await deleteMediaFile(itemToRemove.sourceVideoId || id);
    }
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

  // Switch which uploaded source media this scene uses
  const switchSceneSource = (index: number, sourceId: string) => {
    const source = uniqueMediaSources.find(s => s.id === sourceId);
    if (!source) return;

    const updated = [...mediaItems];
    updated[index] = {
      ...updated[index],
      sourceVideoId: source.id,
      name: `${source.name} (Scene ${index + 1})`,
      url: source.url,
      type: source.type,
      trimStartSec: 0,
      trimEndSec: undefined,
    };
    onUpdateMediaItems(updated);
  };

  const handleSaveTrim = (updatedFields: Partial<MediaSequenceItem>) => {
    if (!activeTrimItem) return;
    onUpdateMediaItems(
      mediaItems.map((item) => (item.id === activeTrimItem.id ? { ...item, ...updatedFields } : item))
    );
  };

  // 1-Click "End Here ✂️": Locks current clip's duration to song playback time and appends next contiguous video subsection
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
      const remainingAudio = audioDuration > currentTime ? Number((audioDuration - currentTime).toFixed(1)) : 5.0;
      const nextScene = autoContiguousSlice(updated[index], Math.max(1, remainingAudio), 'forward');
      updated.splice(index + 1, 0, nextScene);
    } else {
      // If photo, spawn next duplicate scene
      const remainingAudio = audioDuration > currentTime ? Number((audioDuration - currentTime).toFixed(1)) : 5.0;
      const nextScene: MediaSequenceItem = {
        ...currentItem,
        id: `media_${Date.now()}_scene`,
        durationSec: Math.max(1, remainingAudio),
        name: `${currentItem.name} (Scene ${index + 2})`
      };
      updated.splice(index + 1, 0, nextScene);
    }

    onUpdateMediaItems(updated);
  };

  // Add another scene subsection from the same video
  const expandVideoScene = (index: number, direction: 'forward' | 'reverse' | 'ping-pong' | 'freeze-frame' = 'forward') => {
    const item = mediaItems[index];
    const nextScene = autoContiguousSlice(item, item.durationSec || 5.0, direction);

    const updated = [...mediaItems];
    updated.splice(index + 1, 0, nextScene);
    onUpdateMediaItems(updated);
  };

  const autoDistributeDurations = () => {
    if (mediaItems.length === 0 || audioDuration <= 0) return;
    const equalDuration = Number((audioDuration / mediaItems.length).toFixed(1));
    onUpdateMediaItems(mediaItems.map((item) => ({ ...item, durationSec: equalDuration })));
  };

  const applyTransitionToAllScenes = (transType: SceneTransitionType) => {
    onUpdateMediaItems(mediaItems.map(it => ({ ...it, transitionType: transType })));
    if (onStyleChange && style) {
      onStyleChange({ ...style, sequenceTransitionType: transType });
    }
  };

  const applyMotionToAllVideos = (direction: 'forward' | 'reverse' | 'ping-pong' | 'freeze-frame') => {
    onUpdateMediaItems(mediaItems.map(it => it.type === 'video' ? { ...it, playbackDirection: direction } : it));
  };

  const totalMediaDuration = mediaItems.reduce((acc, item) => acc + item.durationSec, 0);

  return (
    <div className="space-y-4">
      {/* Upload Header Bar */}
      <div className="md-surface-container p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--md-sys-color-primary)]">
            <Film className="w-5 h-5 text-[var(--md-sys-color-primary)] shrink-0" aria-hidden="true" />
            <span>Video Scenes & Background Sequencer</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={autoDistributeDurations}
              disabled={mediaItems.length === 0 || audioDuration <= 0}
              aria-label="Auto-fit image durations to match audio length"
              title={audioDuration <= 0 ? "Load audio first to use auto-fit" : "Auto-fit clip durations to match audio length"}
              className="md-button-outlined !px-3 !py-1.5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold shrink-0"
            >
              <Wand2 className="w-4 h-4" aria-hidden="true" />
              <span>Equal Fit ({audioDuration > 0 ? `${audioDuration.toFixed(0)}s` : 'Full Track'})</span>
            </button>

            <label className="md-button-filled cursor-pointer flex items-center gap-2 text-xs font-bold !py-1.5 !px-3 shrink-0 shadow-sm">
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

        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
          Upload video backgrounds or photos. Reuse the same video across multiple scenes with custom <strong>In/Out Timestamps</strong>, <strong>⏩ Forward</strong>, <strong>⏪ Reverse</strong>, and <strong>🪃 Boomerang</strong> motion, or click <strong>"End Here ✂️"</strong> during audio playback to lock scene boundaries.
        </p>

        {/* Global Scene Transition & Motion Toolbar */}
        {style && onStyleChange && (
          <div className="space-y-2 bg-[var(--md-sys-color-surface-container-highest)] p-3 rounded-lg border border-[var(--md-sys-color-outline-variant)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--md-sys-color-primary)] shrink-0" aria-hidden="true" />
                <label htmlFor="global-transition-type" className="text-xs font-bold text-[var(--md-sys-color-on-surface)] shrink-0">
                  Scene Transition:
                </label>
                <select
                  id="global-transition-type"
                  value={style.sequenceTransitionType || 'crossfade'}
                  onChange={(e) => applyTransitionToAllScenes(e.target.value as SceneTransitionType)}
                  className="flex-1 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-2 py-1 text-xs font-bold rounded-lg cursor-pointer focus:outline-none"
                >
                  <option value="crossfade">✨ Crossfade Dissolve</option>
                  <option value="fade-black">🌑 Fade to Black</option>
                  <option value="blur-dissolve">🌫️ Blur Dissolve</option>
                  <option value="instant-cut">⚡ Instant Cut</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] shrink-0">Duration:</span>
                <input
                  type="range"
                  min="0"
                  max="3.0"
                  step="0.25"
                  value={style.sequenceTransitionDuration ?? style.sequenceCrossfadeDuration ?? 0.8}
                  onChange={(e) => onStyleChange({ ...style, sequenceTransitionDuration: Number(e.target.value), sequenceCrossfadeDuration: Number(e.target.value) })}
                  className="w-full accent-[var(--md-sys-color-primary)]"
                />
                <span className="text-xs font-mono font-bold text-[var(--md-sys-color-primary)] w-10 text-right tabular-nums">
                  {(style.sequenceTransitionDuration ?? style.sequenceCrossfadeDuration ?? 0.8).toFixed(2)}s
                </span>
              </div>
            </div>

            {/* Quick batch direction actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)]/40 text-xs">
              <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">Batch Motion:</span>
              <button
                type="button"
                onClick={() => applyMotionToAllVideos('forward')}
                className="px-2 py-0.5 rounded bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[11px] font-bold border border-[var(--md-sys-color-outline-variant)] cursor-pointer"
              >
                ⏩ All Forward
              </button>
              <button
                type="button"
                onClick={() => applyMotionToAllVideos('ping-pong')}
                className="px-2 py-0.5 rounded bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[11px] font-bold border border-[var(--md-sys-color-outline-variant)] cursor-pointer"
              >
                🪃 All Boomerang
              </button>
              <button
                type="button"
                onClick={() => applyMotionToAllVideos('reverse')}
                className="px-2 py-0.5 rounded bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[11px] font-bold border border-[var(--md-sys-color-outline-variant)] cursor-pointer"
              >
                ⏪ All Reverse
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)] border-t border-[var(--md-sys-color-outline-variant)] pt-2.5 tabular-nums mt-2">
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
            Upload videos or images to build your lyrical sequence. You can set in/out points, reverse motion, and apply smooth scene transitions.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
          {mediaItems.map((item, index) => {
            const dir = item.playbackDirection || 'forward';
            const effectiveRate = calculateEffectivePlaybackRate(item, style?.videoPlaybackRate ?? 1.0);

            return (
              <div
                key={item.id}
                className="md-surface-container p-4 rounded-xl border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition-all space-y-3 group shadow-sm"
              >
                {/* Top Row: Info, Media Source Switcher & Reorder Actions */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs font-mono font-bold text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-highest)] px-2 py-0.5 rounded-md tabular-nums shrink-0">
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

                    <div className="min-w-0 flex-1">
                      {/* Media Source Dropdown (allows picking which uploaded video/photo this scene uses) */}
                      {uniqueMediaSources.length > 1 ? (
                        <div className="flex items-center gap-1.5">
                          <label htmlFor={`source-select-${item.id}`} className="sr-only">Source Media</label>
                          <select
                            id={`source-select-${item.id}`}
                            value={item.sourceVideoId || item.id}
                            onChange={(e) => switchSceneSource(index, e.target.value)}
                            className="bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] text-xs font-bold px-2 py-0.5 rounded-lg focus:outline-none truncate max-w-[220px]"
                          >
                            {uniqueMediaSources.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.type === 'video' ? '🎬' : '🖼️'} {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate block max-w-[220px]" title={item.name}>
                          {item.name}
                        </span>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {item.type === 'video' && (
                          <>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                              dir === 'reverse' ? 'bg-amber-500/20 text-amber-300' :
                              dir === 'ping-pong' ? 'bg-purple-500/20 text-purple-300' :
                              dir === 'freeze-frame' ? 'bg-cyan-500/20 text-cyan-300' :
                              'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {dir === 'reverse' ? '⏪ Reverse' : dir === 'ping-pong' ? '🪃 Boomerang' : dir === 'freeze-frame' ? '⏸️ Freeze' : '⏩ Forward'}
                            </span>

                            <span className="text-[10px] text-zinc-400 font-mono bg-[var(--md-sys-color-surface-container-highest)] px-1.5 py-0.2 rounded">
                              Speed: {effectiveRate}x
                            </span>
                          </>
                        )}
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

                {/* Video In/Out Trimming Row (For Video Clips) */}
                {item.type === 'video' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[var(--md-sys-color-surface-container-highest)] rounded-lg border border-[var(--md-sys-color-outline-variant)]/60 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Start Time (In-Point) */}
                      <div className="flex items-center gap-1">
                        <label htmlFor={`trim-start-${item.id}`} className="text-[11px] font-bold text-[var(--md-sys-color-primary)]">
                          Start (In):
                        </label>
                        <input
                          id={`trim-start-${item.id}`}
                          type="number"
                          min={0}
                          step={0.1}
                          value={item.trimStartSec ?? 0}
                          onChange={(e) => updateItemField(index, 'trimStartSec', Math.max(0, Number(e.target.value)))}
                          className="w-14 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-1.5 py-0.5 text-xs font-mono font-bold rounded focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateItemField(index, 'trimStartSec', Math.max(0, Number(((item.trimStartSec ?? 0) - 1).toFixed(1))))}
                          className="text-[10px] font-mono px-1 py-0.5 bg-[var(--md-sys-color-surface-container)] rounded border border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]"
                          title="-1s"
                        >
                          -1s
                        </button>
                        <button
                          type="button"
                          onClick={() => updateItemField(index, 'trimStartSec', Number(((item.trimStartSec ?? 0) + 1).toFixed(1)))}
                          className="text-[10px] font-mono px-1 py-0.5 bg-[var(--md-sys-color-surface-container)] rounded border border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]"
                          title="+1s"
                        >
                          +1s
                        </button>
                      </div>

                      {/* Finish Time (Out-Point) */}
                      <div className="flex items-center gap-1">
                        <label htmlFor={`trim-end-${item.id}`} className="text-[11px] font-bold text-amber-400">
                          Finish (Out):
                        </label>
                        <input
                          id={`trim-end-${item.id}`}
                          type="number"
                          min={item.trimStartSec ?? 0}
                          step={0.1}
                          placeholder="End"
                          value={item.trimEndSec ?? ''}
                          onChange={(e) => updateItemField(index, 'trimEndSec', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-14 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-1.5 py-0.5 text-xs font-mono font-bold rounded focus:outline-none placeholder:text-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const curEnd = item.trimEndSec || (item.trimStartSec ?? 0) + 5.0;
                            updateItemField(index, 'trimEndSec', Math.max((item.trimStartSec ?? 0) + 0.1, Number((curEnd - 1).toFixed(1))));
                          }}
                          className="text-[10px] font-mono px-1 py-0.5 bg-[var(--md-sys-color-surface-container)] rounded border border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]"
                          title="-1s"
                        >
                          -1s
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const curEnd = item.trimEndSec || (item.trimStartSec ?? 0) + 5.0;
                            updateItemField(index, 'trimEndSec', Number((curEnd + 1).toFixed(1)));
                          }}
                          className="text-[10px] font-mono px-1 py-0.5 bg-[var(--md-sys-color-surface-container)] rounded border border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]"
                          title="+1s"
                        >
                          +1s
                        </button>
                      </div>
                    </div>

                    {/* Scrubber Modal Opener */}
                    <button
                      type="button"
                      onClick={() => setActiveTrimItem(item)}
                      title="Open visual video scrubber and frame trimmer"
                      className="md-button-filled !py-1 !px-2.5 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Trim & Scrubber ✂️</span>
                    </button>
                  </div>
                )}

                {/* Bottom Row: Duration, Direction, Speed & Slicing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-[var(--md-sys-color-outline-variant)]/40 text-xs">
                  {/* Left Controls: Scene Timeline Duration & "End Here" */}
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
                      title="Lock current scene to audio time and spawn next contiguous scene"
                      className="md-button-filled !py-1 !px-2.5 text-xs font-bold flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-white shadow-sm shrink-0"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>End Here ✂️</span>
                    </button>
                  </div>

                  {/* Right Controls: Video Direction, Speed Presets, & Quick Expansion */}
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
                        <option value="ping-pong">🪃 Boomerang</option>
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
                        <option value="auto-fit-duration">Auto-Fit (Stretch)</option>
                        <option value="0.25">0.25x Super Slow</option>
                        <option value="0.5">0.5x Slow-Mo</option>
                        <option value="0.75">0.75x Gentle</option>
                        <option value="1">1.0x Normal</option>
                      </select>

                      {/* Quick Next Contiguous Scene Button */}
                      <button
                        type="button"
                        onClick={() => expandVideoScene(index, 'forward')}
                        title="Spawn next contiguous section from this video"
                        className="md-button-tonal !py-1 !px-2 text-xs font-bold flex items-center gap-1 rounded-lg text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)]"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Cont.</span>
                      </button>

                      {/* Quick Reverse Button */}
                      <button
                        type="button"
                        onClick={() => expandVideoScene(index, 'reverse')}
                        title="Duplicate as a Reverse section"
                        className="md-button-tonal !py-1 !px-2 text-xs font-bold flex items-center gap-1 rounded-lg text-purple-300 hover:bg-purple-900/30"
                      >
                        <span>⏪ Reverse</span>
                      </button>

                      {/* Quick Boomerang Button */}
                      <button
                        type="button"
                        onClick={() => expandVideoScene(index, 'ping-pong')}
                        title="Duplicate as a Boomerang loop section"
                        className="md-button-tonal !py-1 !px-2 text-xs font-bold flex items-center gap-1 rounded-lg text-pink-300 hover:bg-pink-900/30"
                      >
                        <span>🪃 Boomerang</span>
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
                            sourceVideoId: item.sourceVideoId || item.id,
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

      {/* Video Trimming Modal */}
      {activeTrimItem && (
        <VideoTrimModal
          item={activeTrimItem}
          isOpen={true}
          onClose={() => setActiveTrimItem(null)}
          onSave={handleSaveTrim}
        />
      )}
    </div>
  );
};
