import { useRef, useEffect, useCallback, useState } from 'react';

/**
 * useBeatSync - Web Audio API beat detection hook.
 * Connects to an HTMLAudioElement, runs an AnalyserNode, and
 * provides smooth real-time beat energy without causing React infinite render cascades.
 */
export interface BeatSyncState {
  beatStrength: number;   // 0.0 to 1.0 (throttled for UI)
  bpm: number;            // Estimated BPM (0 if not detected)
  isConnected: boolean;
  getBeatStrength: () => number; // Real-time 60fps for Canvas rendering
  connectToAudio: (audio: HTMLAudioElement) => void;
  disconnect: () => void;
  resumeAudioContext: () => Promise<void>;
}

export function useBeatSync(enabled: boolean, sensitivity: number = 1.0): BeatSyncState {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const connectedAudioRef = useRef<HTMLAudioElement | null>(null);
  const beatHistoryRef = useRef<number[]>([]);
  const lastBeatTimeRef = useRef<number>(0);
  const beatStrengthRef = useRef<number>(0);
  const bpmRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);

  const [beatStrength, setBeatStrength] = useState(0);
  const [bpm, setBpm] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const resumeAudioContext = useCallback(async () => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      try {
        await audioCtxRef.current.resume();
      } catch (e) {
        console.warn('AudioContext resume warning:', e);
      }
    }
  }, []);

  const analyseFrame = useCallback(() => {
    if (!analyserRef.current || !enabled) return;

    const analyser = analyserRef.current;
    const bufferLen = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLen);
    analyser.getByteFrequencyData(dataArray);

    // Focus on bass frequencies (roughly 20-250 Hz) for beat detection
    const bassEnd = Math.max(1, Math.floor(bufferLen * 0.08));
    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassSum += dataArray[i];
    }
    const bassAvg = bassSum / bassEnd / 255; // normalized 0-1

    // Beat is a transient - bass peak significantly above average
    const rawBeat = Math.min(1.0, bassAvg * 2.0 * sensitivity);
    beatStrengthRef.current = rawBeat;

    // BPM estimation: track intervals between strong beats
    const now = performance.now();
    if (rawBeat > 0.5 && now - lastBeatTimeRef.current > 200) {
      const interval = now - lastBeatTimeRef.current;
      lastBeatTimeRef.current = now;
      if (interval > 200 && interval < 2000) {
        beatHistoryRef.current.push(60000 / interval);
        if (beatHistoryRef.current.length > 8) beatHistoryRef.current.shift();
        const avgBpm = Math.round(beatHistoryRef.current.reduce((a, b) => a + b, 0) / beatHistoryRef.current.length);
        bpmRef.current = avgBpm;
      }
    }

    // Only update React state at throttled ~10 FPS to prevent render loops
    if (now - lastUiUpdateRef.current > 100) {
      lastUiUpdateRef.current = now;
      setBeatStrength(Math.round(rawBeat * 10) / 10);
      setBpm(bpmRef.current);
    }

    rafRef.current = requestAnimationFrame(analyseFrame);
  }, [enabled, sensitivity]);

  const connectToAudio = useCallback((audio: HTMLAudioElement) => {
    if (!enabled) return;
    if (connectedAudioRef.current === audio && isConnected) return;

    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          audioCtxRef.current = new AudioCtxClass();
        }
      }
      const audioCtx = audioCtxRef.current;
      if (!audioCtx) return;

      if (!analyserRef.current) {
        analyserRef.current = audioCtx.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.7;
        analyserRef.current.connect(audioCtx.destination);
      }

      if (!sourceRef.current && audio) {
        try {
          const source = audioCtx.createMediaElementSource(audio);
          source.connect(analyserRef.current);
          sourceRef.current = source;
        } catch (e) {
          console.warn('[BeatSync] MediaElement already connected:', e);
        }
      }

      connectedAudioRef.current = audio;
      setIsConnected(true);

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(analyseFrame);
    } catch (err) {
      console.warn('[BeatSync] Failed to connect audio:', err);
    }
  }, [enabled, isConnected, analyseFrame]);

  const disconnect = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    connectedAudioRef.current = null;
    setIsConnected(false);
    beatStrengthRef.current = 0;
    bpmRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled) {
      cancelAnimationFrame(rafRef.current);
      beatStrengthRef.current = 0;
      bpmRef.current = 0;
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
      }
    };
  }, []);

  return {
    beatStrength,
    bpm,
    isConnected,
    getBeatStrength: () => beatStrengthRef.current,
    connectToAudio,
    disconnect,
    resumeAudioContext,
  };
}
