import { useRef, useEffect, useCallback, useState } from 'react';

/**
 * useBeatSync - Web Audio API beat detection hook.
 * Connects to an HTMLAudioElement, runs an AnalyserNode, and
 * emits a real-time beatStrength (0-1) that can drive lyric animations.
 */
export interface BeatSyncState {
  beatStrength: number;   // 0.0 to 1.0 - current beat energy
  bpm: number;            // Estimated BPM (0 if not detected)
  isConnected: boolean;
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
    setBeatStrength(rawBeat);

    // BPM estimation: track intervals between strong beats
    const now = performance.now();
    if (rawBeat > 0.5 && now - lastBeatTimeRef.current > 200) {
      const interval = now - lastBeatTimeRef.current;
      lastBeatTimeRef.current = now;
      if (interval > 200 && interval < 2000) {
        beatHistoryRef.current.push(60000 / interval);
        if (beatHistoryRef.current.length > 8) beatHistoryRef.current.shift();
        const avgBpm = beatHistoryRef.current.reduce((a, b) => a + b, 0) / beatHistoryRef.current.length;
        setBpm(Math.round(avgBpm));
      }
    }

    rafRef.current = requestAnimationFrame(analyseFrame);
  }, [enabled, sensitivity]);

  const connectToAudio = useCallback((audio: HTMLAudioElement) => {
    if (!enabled) return;
    if (connectedAudioRef.current === audio && isConnected) return;

    try {
      // Create or reuse AudioContext
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          audioCtxRef.current = new AudioCtxClass();
        }
      }
      const audioCtx = audioCtxRef.current;
      if (!audioCtx) return;

      // Resume if suspended on user gesture
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      // Create analyser if needed
      if (!analyserRef.current) {
        analyserRef.current = audioCtx.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.7;
        analyserRef.current.connect(audioCtx.destination);
      }

      // Connect audio element if not already connected
      if (!sourceRef.current && audio) {
        try {
          const source = audioCtx.createMediaElementSource(audio);
          source.connect(analyserRef.current);
          sourceRef.current = source;
        } catch (e) {
          // May already be connected to another node
          console.warn('[BeatSync] MediaElement already connected or restricted:', e);
        }
      }

      connectedAudioRef.current = audio;
      setIsConnected(true);

      // Start analysis loop
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
    setBeatStrength(0);
    setBpm(0);
  }, []);

  useEffect(() => {
    if (!enabled) {
      cancelAnimationFrame(rafRef.current);
      setBeatStrength(0);
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

  return { beatStrength, bpm, isConnected, connectToAudio, disconnect, resumeAudioContext };
}
