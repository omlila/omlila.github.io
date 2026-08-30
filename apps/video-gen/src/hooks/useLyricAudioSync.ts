import { useState, useEffect, useRef, useCallback } from 'react';
import type { LyricLine } from '../types';

export function useLyricAudioSync(
  lyrics: LyricLine[],
  initialAudioUrl?: string,
  onResumeAudio?: () => Promise<void> | void
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [audioUrl, setAudioUrlState] = useState(initialAudioUrl || '');
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  // Compute fallback duration from lyrics if audio duration is not yet available
  const lyricsDuration = lyrics && lyrics.length > 0
    ? Math.max(...lyrics.map((l) => l.endTime || 0), 20)
    : 30;
  const effectiveDuration = duration > 0 ? duration : lyricsDuration;

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    audio.volume = volume;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || effectiveDuration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      if (audio.ended || audio.paused) {
        setIsPlaying(false);
      }
    };
    const handleError = (e: Event) => {
      console.warn('Audio element playback error, falling back to timeline timer:', e);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [effectiveDuration]);

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      const audio = audioRef.current;
      if (audioUrl.startsWith('blob:') || audioUrl.startsWith('data:')) {
        audio.removeAttribute('crossOrigin');
      } else {
        audio.crossOrigin = 'anonymous';
      }
      audio.src = audioUrl;
      audio.load();
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [audioUrl]);

  // Robust animation loop that advances time smoothly
  useEffect(() => {
    let animFrameId: number;
    let lastTime = performance.now();

    const updateTimeLoop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended && audioUrl) {
        setCurrentTime(audioRef.current.currentTime);
      } else if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= effectiveDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }

      if (isPlaying) {
        animFrameId = requestAnimationFrame(updateTimeLoop);
      }
    };

    if (isPlaying) {
      lastTime = performance.now();
      animFrameId = requestAnimationFrame(updateTimeLoop);
    }

    return () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
    };
  }, [isPlaying, audioUrl, effectiveDuration]);

  // Calculate active line and word
  useEffect(() => {
    if (!lyrics || lyrics.length === 0) {
      setActiveLineIndex((prev) => (prev !== -1 ? -1 : prev));
      setActiveWordIndex((prev) => (prev !== -1 ? -1 : prev));
      return;
    }

    let lineIdx = lyrics.findIndex(
      (line) => currentTime >= line.startTime && currentTime <= line.endTime
    );

    if (lineIdx === -1) {
      for (let i = lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= lyrics[i].startTime) {
          lineIdx = i;
          break;
        }
      }
    }

    setActiveLineIndex((prev) => (prev !== lineIdx ? lineIdx : prev));

    let wordIdx = -1;
    if (lineIdx !== -1 && lyrics[lineIdx].words && lyrics[lineIdx].words!.length > 0) {
      const words = lyrics[lineIdx].words!;
      const foundIdx = words.findIndex(
        (w) => currentTime >= w.startTime && currentTime <= w.endTime
      );
      wordIdx = foundIdx !== -1 ? foundIdx : 0;
    }
    setActiveWordIndex((prev) => (prev !== wordIdx ? wordIdx : prev));
  }, [currentTime, lyrics]);

  const play = useCallback(async () => {
    if (onResumeAudio) {
      try { await onResumeAudio(); } catch {}
    }
    setIsPlaying(true);
    if (audioRef.current && audioUrl) {
      try {
        if (audioRef.current.currentTime >= (audioRef.current.duration || effectiveDuration)) {
          audioRef.current.currentTime = 0;
        }
        await audioRef.current.play();
      } catch (err) {
        console.warn('Audio play notice (clock fallback active):', err);
      }
    }
  }, [audioUrl, effectiveDuration, onResumeAudio]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(time, effectiveDuration));
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = clampedTime;
    }
    setCurrentTime(clampedTime);
  }, [audioUrl, effectiveDuration]);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  const setAudioUrl = useCallback((url: string) => {
    setAudioUrlState(url);
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration: effectiveDuration,
    volume,
    audioUrl,
    activeLineIndex,
    activeWordIndex,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    setAudioUrl,
    setCurrentTime,
  };
}
