import type { MediaSequenceItem, SceneTransitionType } from '../types';

/**
 * Calculates the effective playback rate for a video sequence item.
 * Supports auto-fit time stretching across the scene duration, explicit multipliers, and slow-motion.
 */
export function calculateEffectivePlaybackRate(
  item: Partial<MediaSequenceItem>,
  defaultGlobalSpeed: number = 1.0,
  actualSourceDurationSec?: number,
  incomingTransitionDuration: number = 0
): number {
  const trimStart = Math.max(0, item.trimStartSec ?? 0);
  const maxSource = (actualSourceDurationSec && actualSourceDurationSec > 0)
    ? actualSourceDurationSec
    : (item.sourceDurationSec ?? (trimStart + 100.0));
  const trimEnd = (item.trimEndSec && item.trimEndSec > trimStart) 
    ? Math.min(maxSource, item.trimEndSec) 
    : maxSource;
  const clipSpan = Math.max(0.1, trimEnd - trimStart);
  const totalVisibleDuration = Math.max(0.1, (item.durationSec ?? 5.0) + incomingTransitionDuration);

  if (item.videoTimeStretchMode === 'auto-fit-duration') {
    const autoRate = clipSpan / totalVisibleDuration;
    return Math.max(0.05, Math.min(4.0, Number(autoRate.toFixed(3))));
  }

  const explicitRate = item.playbackRate ?? defaultGlobalSpeed;
  return Math.max(0.05, Math.min(4.0, explicitRate));
}

/**
 * Calculates the exact video timestamp (in seconds) to display for a given moment in the scene.
 * Handles forward, reverse, boomerang/ping-pong loop, and freeze-frame still modes.
 */
export function calculateVideoTime(
  item: Partial<MediaSequenceItem>,
  timeInSceneSec: number,
  sourceDurationSec?: number,
  incomingTransitionDuration: number = 0
): number {
  const trimStart = Math.max(0, item.trimStartSec ?? 0);
  const maxSourceDur = (sourceDurationSec && !isNaN(sourceDurationSec) && sourceDurationSec > 0)
    ? sourceDurationSec
    : (item.sourceDurationSec ?? (trimStart + 100.0));
  const trimEnd = (item.trimEndSec && item.trimEndSec > trimStart) 
    ? Math.min(maxSourceDur, item.trimEndSec) 
    : maxSourceDur;
  const clipSpan = Math.max(0.1, trimEnd - trimStart);
  const totalVisibleDuration = Math.max(0.1, (item.durationSec ?? 5.0) + incomingTransitionDuration);

  const speed = (item.videoTimeStretchMode === 'auto-fit-duration')
    ? (clipSpan / totalVisibleDuration)
    : (item.playbackRate ?? 1.0);

  const direction = item.playbackDirection || 'forward';

  if (direction === 'freeze-frame') {
    const freezeTime = item.freezeFrameTimeSec !== undefined ? item.freezeFrameTimeSec : trimStart;
    return Math.max(0, Math.min(maxSourceDur, freezeTime));
  }

  const elapsedVirtualTime = Math.max(0, timeInSceneSec) * speed;

  if (direction === 'reverse') {
    const progress = (item.videoTimeStretchMode === 'auto-fit-duration')
      ? Math.min(clipSpan, elapsedVirtualTime)
      : (elapsedVirtualTime % clipSpan);
    return Number(Math.max(trimStart, trimEnd - progress).toFixed(3));
  }

  if (direction === 'ping-pong') {
    const fullCycle = clipSpan * 2;
    const cyclePos = elapsedVirtualTime % fullCycle;
    if (cyclePos < clipSpan) {
      return Number((trimStart + cyclePos).toFixed(3));
    } else {
      return Number((trimEnd - (cyclePos - clipSpan)).toFixed(3));
    }
  }

  // Standard forward: if auto-fit, smoothly clamp to trimEnd without jump-cut loops
  const progress = (item.videoTimeStretchMode === 'auto-fit-duration')
    ? Math.min(clipSpan, elapsedVirtualTime)
    : (elapsedVirtualTime % clipSpan);
  return Number(Math.min(trimEnd, trimStart + progress).toFixed(3));
}

export interface ActiveSceneInfo {
  activeIndex: number;
  activeItem: MediaSequenceItem;
  timeInScene: number;
  timeInSceneContinuous: number;
  sceneProgress: number; // 0.0 to 1.0
  isInTransition: boolean;
  nextIndex?: number;
  nextItem?: MediaSequenceItem;
  transitionProgress: number; // 0.0 to 1.0
  transitionType: SceneTransitionType;
  incomingTransitionDuration: number;
}

/**
 * Resolves the active scene item and transition state for a given master playback timeline timestamp.
 */
export function calculateSceneTransition(
  masterTimeSec: number,
  mediaItems: MediaSequenceItem[],
  globalTransitionDuration: number = 0.8,
  globalTransitionType: SceneTransitionType = 'crossfade'
): ActiveSceneInfo | null {
  if (!mediaItems || mediaItems.length === 0) return null;

  const totalDuration = mediaItems.reduce((acc, it) => acc + (it.durationSec || 5), 0);
  const loopedMasterTime = totalDuration > 0 ? (masterTimeSec % totalDuration) : 0;

  let accumulated = 0;
  for (let i = 0; i < mediaItems.length; i++) {
    const item = mediaItems[i];
    const duration = item.durationSec || 5;
    const nextAccumulated = accumulated + duration;

    const isLastItem = i === mediaItems.length - 1;
    if (loopedMasterTime >= accumulated && (isLastItem ? loopedMasterTime <= nextAccumulated : loopedMasterTime < nextAccumulated)) {
      const timeInScene = loopedMasterTime - accumulated;
      const sceneProgress = Math.min(1.0, Math.max(0.0, timeInScene / duration));

      const transDuration = item.transitionDurationSec ?? globalTransitionDuration;
      const transType = item.transitionType ?? globalTransitionType;

      let isInTransition = false;
      let transitionProgress = 0;
      let nextIndex: number | undefined;
      let nextItem: MediaSequenceItem | undefined;

      if (transDuration > 0 && mediaItems.length > 1 && timeInScene > (duration - transDuration)) {
        isInTransition = true;
        transitionProgress = Math.min(1.0, Math.max(0.0, (timeInScene - (duration - transDuration)) / transDuration));
        nextIndex = (i + 1) % mediaItems.length;
        nextItem = mediaItems[nextIndex];
      }

      const incomingTransitionDuration = i > 0
        ? (mediaItems[i - 1].transitionDurationSec ?? globalTransitionDuration)
        : 0;
      const timeInSceneContinuous = timeInScene + incomingTransitionDuration;

      return {
        activeIndex: i,
        activeItem: item,
        timeInScene,
        timeInSceneContinuous,
        sceneProgress,
        isInTransition,
        nextIndex,
        nextItem,
        transitionProgress,
        transitionType: transType,
        incomingTransitionDuration
      };
    }

    accumulated = nextAccumulated;
  }

  return {
    activeIndex: 0,
    activeItem: mediaItems[0],
    timeInScene: 0,
    timeInSceneContinuous: 0,
    sceneProgress: 0,
    isInTransition: false,
    transitionProgress: 0,
    transitionType: globalTransitionType,
    incomingTransitionDuration: 0
  };
}

/**
 * Spawns the next contiguous scene from a video item, calculating the next in-point based on the previous out-point.
 */
export function autoContiguousSlice(
  previousItem: MediaSequenceItem,
  sceneDurationSec: number = 5.0,
  nextDirection: 'forward' | 'reverse' | 'ping-pong' | 'freeze-frame' = 'forward'
): MediaSequenceItem {
  const speed = calculateEffectivePlaybackRate(previousItem);
  const prevTrimStart = previousItem.trimStartSec ?? 0;
  const prevTrimEnd = previousItem.trimEndSec ?? (prevTrimStart + (previousItem.durationSec * speed));
  const nextTrimStart = Number(prevTrimEnd.toFixed(1));

  const labelMap = {
    forward: 'Continuation',
    reverse: 'Reverse',
    'ping-pong': 'Boomerang',
    'freeze-frame': 'Freeze'
  };

  return {
    ...previousItem,
    id: 'scene_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    sourceVideoId: previousItem.sourceVideoId || previousItem.id,
    name: previousItem.name.replace(/ \((Continuation|Reverse|Boomerang|Freeze|Scene \d+|Copy)\)/g, '') + ' (' + (labelMap[nextDirection] || 'Next') + ')',
    trimStartSec: nextTrimStart,
    trimEndSec: undefined,
    durationSec: Math.max(0.5, Number(sceneDurationSec.toFixed(1))),
    playbackDirection: nextDirection,
    videoTimeStretchMode: previousItem.videoTimeStretchMode || 'auto-fit-duration'
  };
}
