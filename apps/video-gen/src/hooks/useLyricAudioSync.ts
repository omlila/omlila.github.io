import { useState, useEffect, useRef, useCallback } from 'react';
import type { LyricLine } from '../types';

export function useLyricAudioSync(lyrics: LyricLine[], initialAudioUrl?: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [audioUrl, setAudioUrlState] = useState(initialAudioUrl || '');
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.volume = volume;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [audioUrl]);

  useEffect(() => {
    let animFrameId: number;

    const updateTimeLoop = () => {
      if (audioRef.current && !audioRef.current.paused) {
        setCurrentTime(audioRef.current.currentTime);
        animFrameId = requestAnimationFrame(updateTimeLoop);
      }
    };

    if (isPlaying) {
      animFrameId = requestAnimationFrame(updateTimeLoop);
    }

    return () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!lyrics || lyrics.length === 0) {
      setActiveLineIndex(-1);
      setActiveWordIndex(-1);
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

    setActiveLineIndex(lineIdx);

    if (lineIdx !== -1 && lyrics[lineIdx].words && lyrics[lineIdx].words!.length > 0) {
      const words = lyrics[lineIdx].words!;
      const wordIdx = words.findIndex(
        (w) => currentTime >= w.startTime && currentTime <= w.endTime
      );
      setActiveWordIndex(wordIdx !== -1 ? wordIdx : 0);
    } else {
      setActiveWordIndex(-1);
    }
  }, [currentTime, lyrics]);

  const play = useCallback(() => {
    if (audioRef.current && audioUrl) {
      if (audioRef.current.currentTime >= audioRef.current.duration) {
        audioRef.current.currentTime = 0;
      }
      audioRef.current.play().catch(console.error);
    }
  }, [audioUrl]);

  const pause = useCallback(() => {
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
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

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
    duration,
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
