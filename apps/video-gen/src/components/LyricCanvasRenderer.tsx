import React, { useEffect, useRef, useState } from 'react';
import type { AspectRatio, LyricLine, MediaSequenceItem, StyleConfig } from '../types';
import { ASPECT_RATIOS } from '../types';
import { renderLyricFrame } from '../utils/canvasRenderer';
import { calculateEffectivePlaybackRate, calculateVideoTime, calculateSceneTransition } from '../utils/videoSequencerEngine';

interface LyricCanvasRendererProps {
  lyrics: LyricLine[];
  currentTime: number;
  duration?: number;
  isPlaying?: boolean;
  style: StyleConfig;
  aspectRatio: AspectRatio;
  bgMediaUrl?: string;
  mediaItems?: MediaSequenceItem[];
  onUpdateMediaItems?: (items: MediaSequenceItem[]) => void;
  className?: string;
  onStyleChange?: (newStyle: StyleConfig) => void;
  beatStrength?: number; // 0-1 from Web Audio beat detection
  bpm?: number;
  watermarkImg?: HTMLImageElement | null; // Pre-loaded watermark image
}

export const LyricCanvasRenderer: React.FC<LyricCanvasRendererProps> = ({
  lyrics,
  currentTime,
  duration = 0,
  isPlaying = false,
  style,
  aspectRatio,
  bgMediaUrl,
  mediaItems = [],
  onUpdateMediaItems,
  className = '',
  onStyleChange,
  beatStrength = 0,
  bpm = 0,
  watermarkImg,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const loadedMediaCache = useRef<Map<string, HTMLImageElement | HTMLVideoElement>>(new Map());
  const [bgLoaded, setBgLoaded] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const targetDim = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['9:16'];

  // Preload sequence images and videos with instant cache population
  useEffect(() => {
    if (!mediaItems || mediaItems.length === 0) return;

    mediaItems.forEach((item) => {
      if (loadedMediaCache.current.has(item.id)) return;

      // Share already-loaded media element if same URL or sourceVideoId exists
      if (item.url) {
        for (const [existingId, m] of loadedMediaCache.current.entries()) {
          const existing = mediaItems.find(it => it.id === existingId);
          if (existing?.url === item.url || (m as any).src === item.url) {
            loadedMediaCache.current.set(item.id, m);
            return;
          }
        }
      }

      if (item.type === 'image') {
        const img = new Image();
        if (!item.url.startsWith('blob:')) {
          img.crossOrigin = 'anonymous';
        }
        img.src = item.url;
        loadedMediaCache.current.set(item.id, img);
        img.onload = () => {
          setBgLoaded(Date.now());
        };
      } else {
        const video = document.createElement('video');
        video.preload = 'auto';
        if (!item.url.startsWith('blob:')) {
          video.crossOrigin = 'anonymous';
        }
        video.src = item.url;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        loadedMediaCache.current.set(item.id, video);
        video.onloadeddata = () => {
          setBgLoaded(Date.now());
        };
        video.load();
      }
    });
  }, [mediaItems]);

  // Fail-safe media element resolver (never returns null for valid items)
  const getMediaElement = (item: MediaSequenceItem | undefined): HTMLImageElement | HTMLVideoElement | null => {
    if (!item) return null;
    const cached = loadedMediaCache.current.get(item.id);
    if (cached) return cached;

    if (item.url) {
      for (const [id, el] of loadedMediaCache.current.entries()) {
        const other = mediaItems.find(it => it.id === id);
        if (other?.url === item.url || (el as any).src === item.url) {
          loadedMediaCache.current.set(item.id, el);
          return el;
        }
      }

      if (item.type === 'video') {
        const v = document.createElement('video');
        v.preload = 'auto';
        v.src = item.url;
        v.loop = true;
        v.muted = true;
        v.playsInline = true;
        loadedMediaCache.current.set(item.id, v);
        v.load();
        return v;
      } else {
        const img = new Image();
        img.src = item.url;
        loadedMediaCache.current.set(item.id, img);
        return img;
      }
    }

    return null;
  };

  // Keep bg media element updated
  useEffect(() => {
    if (!bgMediaUrl || mediaItems.length > 0) return;
    
    if (bgMediaUrl.match(/\.(mp4|webm|mov)$/i) || bgMediaUrl.startsWith('blob:')) {
      const video = document.createElement('video');
      video.src = bgMediaUrl;
      if (!bgMediaUrl.startsWith('blob:')) {
        video.crossOrigin = 'anonymous';
      }
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.onloadeddata = () => {
        bgVideoRef.current = video;
        bgImageRef.current = null;
        setBgLoaded(Date.now());
      };
      video.play().catch(() => {});
    } else {
      const img = new Image();
      if (!bgMediaUrl.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }
      img.src = bgMediaUrl;
      img.onload = () => {
        bgImageRef.current = img;
        bgVideoRef.current = null;
        setBgLoaded(Date.now());
      };
    }
  }, [bgMediaUrl, mediaItems.length]);

  // Determine active media element based on sequence timeline using robust engine
  const getActiveSequenceMedia = () => {
    if (mediaItems && mediaItems.length > 0) {
      const sceneInfo = calculateSceneTransition(
        currentTime,
        mediaItems,
        style.sequenceTransitionDuration ?? style.sequenceCrossfadeDuration ?? 0.8,
        style.sequenceTransitionType ?? 'crossfade'
      );

      if (sceneInfo) {
        const item = sceneInfo.activeItem;
        const media = getMediaElement(item);
        const mediaTransform = item.transform;

        // Sync video smoothly with direction, trimming, slow motion & time-stretching support
        if (media && media instanceof HTMLVideoElement && media.duration > 0) {
          const effectiveSpeed = calculateEffectivePlaybackRate(item, style.videoPlaybackRate ?? 1.0);
          media.playbackRate = effectiveSpeed;

          const expectedVideoTime = calculateVideoTime(item, sceneInfo.timeInScene, media.duration);
          const direction = item.playbackDirection || 'forward';

          if (isPlaying) {
            if (direction === 'forward') {
              if (media.paused) {
                media.play().catch(() => {});
              }
              if (Math.abs(media.currentTime - expectedVideoTime) > 0.35) {
                media.currentTime = expectedVideoTime;
              }
            } else {
              // Reverse, Boomerang, or Freeze Frame
              if (!media.paused) {
                media.pause();
              }
              if (Math.abs(media.currentTime - expectedVideoTime) > 0.04) {
                media.currentTime = expectedVideoTime;
              }
            }
          } else {
            if (!media.paused) {
              media.pause();
            }
            if (Math.abs(media.currentTime - expectedVideoTime) > 0.04) {
              media.currentTime = expectedVideoTime;
            }
          }
        }

        // Prepare next transitioning media layer
        let nextMedia = null;
        let nextMediaTransform = undefined;

        if (sceneInfo.isInTransition && sceneInfo.nextItem) {
          const nextItem = sceneInfo.nextItem;
          nextMedia = getMediaElement(nextItem);
          nextMediaTransform = nextItem.transform;

          if (nextMedia && nextMedia instanceof HTMLVideoElement && nextMedia.duration > 0) {
            const nextExpectedTime = calculateVideoTime(nextItem, sceneInfo.transitionProgress * (nextItem.transitionDurationSec ?? 0.8), nextMedia.duration);
            if (Math.abs(nextMedia.currentTime - nextExpectedTime) > 0.1) {
              nextMedia.currentTime = nextExpectedTime;
            }
          }
        }

        // Pause any inactive background video elements to keep audio/video tightly synced
        loadedMediaCache.current.forEach((el) => {
          if (el instanceof HTMLVideoElement && el !== media && el !== nextMedia && !el.paused) {
            el.pause();
          }
        });

        return {
          media: media || null,
          activeItem: item,
          mediaTransform,
          nextMedia: nextMedia || null,
          nextMediaTransform,
          transitionProgress: sceneInfo.transitionProgress,
          transitionType: sceneInfo.transitionType
        };
      }
    }

    return { 
      media: style.backgroundType === 'image' ? bgImageRef.current : bgVideoRef.current,
      activeItem: null,
      mediaTransform: undefined,
      nextMedia: null,
      nextMediaTransform: undefined,
      transitionProgress: 0,
      transitionType: style.sequenceTransitionType || 'crossfade'
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { media, mediaTransform, nextMedia, nextMediaTransform, transitionProgress, transitionType } = getActiveSequenceMedia();

    // Attach beat strength and watermark as side-channel properties on ctx for renderer access
    (ctx as any)._beatStrength = beatStrength;
    (ctx as any)._bpm = bpm;
    if (watermarkImg) (ctx as any)._watermarkImg = watermarkImg;

    renderLyricFrame(
      ctx,
      targetDim.width,
      targetDim.height,
      lyrics,
      currentTime,
      duration,
      style,
      media,
      nextMedia,
      transitionProgress,
      mediaTransform,
      nextMediaTransform,
      transitionType
    );
  }, [lyrics, currentTime, duration, style, aspectRatio, targetDim, bgLoaded, mediaItems, beatStrength, watermarkImg]);

  const [dragMode, setDragMode] = useState<'text' | 'background'>('text');

  const updatePositionFromEvent = (e: React.PointerEvent<HTMLCanvasElement>, isStart: boolean = false) => {
    if (!onStyleChange) return;
    
    // For background panning, we want relative movement rather than absolute positioning
    if (dragMode === 'background') {
      if (isStart) return; // Don't jump on click, only move on drag
      
      const rect = e.currentTarget.getBoundingClientRect();
      const movementX = (e.movementX / rect.width) * 100;
      const movementY = (e.movementY / rect.height) * 100;
      
      if (movementX !== 0 || movementY !== 0) {
        if (onUpdateMediaItems && mediaItems.length > 0) {
          const { activeItem } = getActiveSequenceMedia();
          if (activeItem) {
            const updatedItems = mediaItems.map(item => {
              if (item.id === activeItem.id) {
                const currentTransform = item.transform || style.backgroundTransform || { scale: 1, offsetXPercent: 0, offsetYPercent: 0, fitMode: 'cover' };
                return {
                  ...item,
                  transform: {
                    ...currentTransform,
                    offsetXPercent: Math.min(50, Math.max(-50, (currentTransform.offsetXPercent ?? 0) + movementX)),
                    offsetYPercent: Math.min(50, Math.max(-50, (currentTransform.offsetYPercent ?? 0) + movementY)),
                  }
                };
              }
              return item;
            });
            onUpdateMediaItems(updatedItems);
          }
        } else {
          onStyleChange({
            ...style,
            backgroundTransform: {
              ...style.backgroundTransform,
              scale: style.backgroundTransform?.scale ?? 1.0,
              fitMode: style.backgroundTransform?.fitMode ?? 'cover',
              offsetXPercent: Math.min(50, Math.max(-50, (style.backgroundTransform?.offsetXPercent ?? 0) + movementX)),
              offsetYPercent: Math.min(50, Math.max(-50, (style.backgroundTransform?.offsetYPercent ?? 0) + movementY)),
            },
          });
        }
      }
    } else {
      // Lyrics dragging is absolute
      if (style.showLyrics === false) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = Math.min(90, Math.max(10, ((e.clientX - rect.left) / rect.width) * 100));
      const relY = Math.min(90, Math.max(10, ((e.clientY - rect.top) / rect.height) * 100));
  
      onStyleChange({
        ...style,
        textPosition: {
          preset: 'custom',
          offsetXPercent: Math.round(relX),
          offsetYPercent: Math.round(relY),
          scale: style.textPosition?.scale ?? 1.0,
        },
      });
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onStyleChange) return;
    if (dragMode === 'text' && style.showLyrics === false) return;
    
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updatePositionFromEvent(e, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !onStyleChange) return;
    updatePositionFromEvent(e, false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onStyleChange) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (dragMode !== 'background') return;
      
      e.preventDefault();
      // Logic for scaling is handled by React's synthetic onWheel handler
    };

    canvas.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheelNative);
  }, [dragMode, style, onStyleChange]);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!onStyleChange || dragMode !== 'background') return;
    
    // Determine zoom direction
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    const currentScale = style.backgroundTransform?.scale ?? 1.0;
    const newScale = Math.min(3.0, Math.max(0.5, currentScale + zoomDelta));

    if (newScale !== currentScale) {
      if (onUpdateMediaItems && mediaItems.length > 0) {
        const { activeItem } = getActiveSequenceMedia();
        if (activeItem) {
          const updatedItems = mediaItems.map(item => {
            if (item.id === activeItem.id) {
              const currentTransform = item.transform || style.backgroundTransform || { scale: 1, offsetXPercent: 0, offsetYPercent: 0, fitMode: 'cover' };
              return {
                ...item,
                transform: {
                  ...currentTransform,
                  scale: Number(newScale.toFixed(2)),
                }
              };
            }
            return item;
          });
          onUpdateMediaItems(updatedItems);
        }
      } else {
        onStyleChange({
          ...style,
          backgroundTransform: {
            ...style.backgroundTransform,
            fitMode: style.backgroundTransform?.fitMode ?? 'cover',
            offsetXPercent: style.backgroundTransform?.offsetXPercent ?? 0,
            offsetYPercent: style.backgroundTransform?.offsetYPercent ?? 0,
            scale: Number(newScale.toFixed(2)),
          },
        });
      }
    }
  };

  return (
    <div className={`relative flex items-center justify-center overflow-hidden shadow-2xl rounded-2xl border border-white/10 ${className}`}>
      <canvas
        ref={canvasRef}
        width={targetDim.width}
        height={targetDim.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className={`w-full h-full object-contain max-h-[75vh] ${onStyleChange ? 'cursor-grab active:cursor-grabbing' : ''}`}
      />
      {onStyleChange && (
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <div className="bg-black/80 backdrop-blur-md p-1 rounded-lg border border-white/15 flex gap-1 shadow-lg pointer-events-auto">
            <button 
              onClick={() => setDragMode('text')} 
              className={`px-2 py-1 text-[10px] font-bold rounded ${dragMode === 'text' ? 'bg-[var(--md-sys-color-primary)] text-black' : 'text-white hover:bg-white/20'}`}
              disabled={style.showLyrics === false}
            >
              Move Text
            </button>
            <button 
              onClick={() => setDragMode('background')} 
              className={`px-2 py-1 text-[10px] font-bold rounded ${dragMode === 'background' ? 'bg-[var(--md-sys-color-primary)] text-black' : 'text-white hover:bg-white/20'}`}
            >
              Pan Image
            </button>
          </div>
          
          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 text-[10px] font-mono text-emerald-300 pointer-events-none flex items-center gap-1.5 shadow-lg max-w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{dragMode === 'text' ? 'Drag Canvas to Position Text' : 'Drag to Pan Background'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
