import * as Mp4Muxer from 'mp4-muxer';
import type { ExportConfig, ExportStatus, LyricLine, MediaSequenceItem, StyleConfig } from '../types';
import { QUALITY_CONFIGS } from '../types';
import { renderLyricFrame } from './canvasRenderer';
import { calculateSceneTransition, calculateVideoTime } from './videoSequencerEngine';

/**
 * Finds the first supported VideoEncoderConfig for the target resolution and browser.
 */
async function getSupportedVideoEncoderConfig(
  width: number,
  height: number,
  fps: number,
  bitrate: number
): Promise<VideoEncoderConfig> {
  const is4K = width >= 3840 || height >= 3840 || (width * height >= 3840 * 2160);

  const candidateCodecs = is4K
    ? [
        'avc1.4d4033', // H.264 Main Profile Level 5.1 (4K Ultra HD)
        'avc1.640033', // H.264 High Profile Level 5.1
        'vp09.00.51.08', // VP9 Profile 0 Level 5.1
        'avc1.4d402a',
      ]
    : [
        'avc1.4d402a', // H.264 Main Profile Level 4.2 (1080p / 720p)
        'avc1.64002a',
        'avc1.42001f',
        'vp09.00.31.08',
      ];

  const evenWidth = Math.floor(width / 2) * 2;
  const evenHeight = Math.floor(height / 2) * 2;

  // Cap hardware bitrate to 24 Mbps for 4K and 12 Mbps for 1080p to prevent GPU encoder slice overflows
  const safeBitrate = is4K ? Math.min(bitrate, 24_000_000) : Math.min(bitrate, 12_000_000);

  for (const codec of candidateCodecs) {
    const config: VideoEncoderConfig = {
      codec,
      width: evenWidth,
      height: evenHeight,
      bitrate: safeBitrate,
      framerate: fps,
      avc: codec.startsWith('avc') ? { format: 'avc' } : undefined,
    };
    try {
      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported && support.config) {
        return support.config;
      }
    } catch {
      // Continue to next candidate codec
    }
  }

  return {
    codec: is4K ? 'avc1.4d4033' : 'avc1.4d402a',
    width: evenWidth,
    height: evenHeight,
    bitrate: safeBitrate,
    framerate: fps,
    avc: { format: 'avc' },
  };
}

/**
 * Helper to preload media items for export rendering
 */
async function preloadMediaSequence(items: MediaSequenceItem[]): Promise<Map<string, HTMLImageElement | HTMLVideoElement>> {
  const loadedMap = new Map<string, HTMLImageElement | HTMLVideoElement>();
  if (!items || items.length === 0) return loadedMap;

  const promises = items.map((item) => {
    return new Promise<void>((resolve) => {
      if (item.type === 'image') {
        const img = new Image();
        if (!item.url.startsWith('blob:') && !item.url.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
        }
        img.src = item.url;
        img.onload = () => {
          loadedMap.set(item.id, img);
          resolve();
        };
        img.onerror = () => resolve();
      } else {
        const video = document.createElement('video');
        if (!item.url.startsWith('blob:') && !item.url.startsWith('data:')) {
          video.crossOrigin = 'anonymous';
        }
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        video.src = item.url;
        
        const onReady = () => {
          loadedMap.set(item.id, video);
          resolve();
        };

        video.onloadeddata = () => {
          try {
            video.currentTime = Math.max(0.001, item.trimStartSec ?? 0.001);
          } catch { /* ignore */ }
          onReady();
        };
        video.onerror = () => resolve();
      }
    });
  });

  await Promise.all(promises);
  return loadedMap;
}

async function loadAudioBuffer(audioUrl: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(audioUrl);
    const arrayBuffer = await res.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    audioCtx.close();
    return audioBuffer;
  } catch (e) {
    console.warn('Could not load audio for MP4 export:', e);
    return null;
  }
}

function seekVideoToTime(video: HTMLVideoElement, targetTime: number): Promise<void> {
  return new Promise<void>((resolve) => {
    if (Math.abs(video.currentTime - targetTime) < 0.001) {
      return resolve();
    }

    let handled = false;
    const cleanup = () => {
      if (!handled) {
        handled = true;
        video.removeEventListener('seeked', onSeeked);
        resolve();
      }
    };

    const onSeeked = () => {
      cleanup();
    };

    video.addEventListener('seeked', onSeeked, { once: true });

    try {
      const maxTime = Math.max(0, (video.duration && !isNaN(video.duration)) ? video.duration - 0.001 : 1000);
      video.currentTime = Math.max(0, Math.min(maxTime, targetTime));
    } catch {
      cleanup();
    }

    // Sufficient timeout to ensure decoder finishes intra-frame decode without dropping frames
    setTimeout(cleanup, 350);
  });
}

/**
 * Encodes and exports video frame-by-frame locally in browser using WebCodecs API and mp4-muxer.
 * Supports up to 4K Ultra HD resolution & 60 FPS with full AAC stereo audio!
 */
export async function exportLyricalVideoMP4(
  lyrics: LyricLine[],
  audioUrl: string | undefined,
  style: StyleConfig,
  exportConfig: ExportConfig,
  onProgress?: (status: ExportStatus) => void,
  bgMedia?: HTMLImageElement | HTMLVideoElement | null,
  mediaItems?: MediaSequenceItem[]
): Promise<Blob> {
  const startTimeMs = performance.now();
  const qualityConfig = QUALITY_CONFIGS[exportConfig.quality] || QUALITY_CONFIGS['1080p'];
  const rawDims = qualityConfig.getDimensions(exportConfig.aspectRatio);

  // Ensure even pixel dimensions
  const width = Math.floor(rawDims.width / 2) * 2;
  const height = Math.floor(rawDims.height / 2) * 2;
  const fps = exportConfig.fps || 30;

  // Preload audio buffer if audioUrl is provided
  const targetAudioUrl = audioUrl || '';
  const audioBuffer = targetAudioUrl ? await loadAudioBuffer(targetAudioUrl) : null;
  const audioDurationSec = audioBuffer ? audioBuffer.duration : 0;

  const maxLyricEnd = lyrics.length > 0 ? Math.max(...lyrics.map((l) => l.endTime)) : 10;
  const sequenceEnd = mediaItems && mediaItems.length > 0
    ? mediaItems.reduce((acc, item) => acc + item.durationSec, 0)
    : 0;

  const durationSec = audioDurationSec > 0
    ? audioDurationSec
    : Math.max(10, maxLyricEnd + 1, sequenceEnd);
  const totalFrames = Math.ceil(durationSec * fps);

  if (typeof window.VideoEncoder === 'undefined') {
    throw new Error(
      'WebCodecs API is not supported in this browser. Please use Chrome, Edge, or Safari 15.4+.'
    );
  }

  // Preload sequence assets
  const loadedSequenceMap = await preloadMediaSequence(mediaItems || []);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    throw new Error('Failed to create 2D canvas context for export.');
  }

  // Calculate target bitrate (custom slider or default scaling)
  const targetBitrate = exportConfig.customBitrate || Math.round(qualityConfig.bitrate * (fps / 30));

  // Determine supported codec configuration dynamically
  const encoderConfig = await getSupportedVideoEncoderConfig(width, height, fps, targetBitrate);

  let audioChunks: { chunk: EncodedAudioChunk; meta?: any }[] = [];
  let audioChannels = 2;
  let audioSampleRate = 44100;

  if (audioBuffer && typeof window.AudioEncoder !== 'undefined') {
    let audioEncoderError: any = null;
    let audioEncoder: AudioEncoder | null = null;
    try {
      audioChannels = Math.min(2, audioBuffer.numberOfChannels);
      audioSampleRate = audioBuffer.sampleRate;

      // Try multiple audio configs for maximum compatibility
      const audioConfigs: AudioEncoderConfig[] = [
        { codec: 'mp4a.40.2', numberOfChannels: audioChannels, sampleRate: audioSampleRate, bitrate: 192_000 },
        { codec: 'mp4a.40.2', numberOfChannels: audioChannels, sampleRate: audioSampleRate, bitrate: 128_000 },
        { codec: 'mp4a.40.2', numberOfChannels: 1, sampleRate: audioSampleRate, bitrate: 128_000 },
      ];

      let usedConfig: AudioEncoderConfig | null = null;
      for (const cfg of audioConfigs) {
        try {
          const support = await AudioEncoder.isConfigSupported(cfg);
          if (support.supported && support.config) {
            usedConfig = support.config;
            break;
          }
        } catch { /* try next */ }
      }
      if (!usedConfig) usedConfig = audioConfigs[0];

      // Update channels to match the config we're actually using
      audioChannels = usedConfig.numberOfChannels || audioChannels;

      audioEncoder = new AudioEncoder({
        output: (chunk, meta) => { audioChunks.push({ chunk, meta }); },
        error: (e) => { audioEncoderError = e; },
      });

      audioEncoder.configure(usedConfig);

      const totalSamples = audioBuffer.length;
      const samplesPerFrame = 1024;
      const sourceChannels = audioBuffer.numberOfChannels;

      const channelData: Float32Array[] = [];
      for (let c = 0; c < Math.min(sourceChannels, audioChannels); c++) {
        channelData.push(audioBuffer.getChannelData(c));
      }

      for (let offset = 0; offset < totalSamples; offset += samplesPerFrame) {
        if (audioEncoderError || audioEncoder.state === 'closed') break;

        const frameCount = Math.min(samplesPerFrame, totalSamples - offset);
        if (frameCount <= 0) break;

        const planarBuffer = new Float32Array(audioChannels * samplesPerFrame);
        for (let c = 0; c < audioChannels; c++) {
          const src = c < channelData.length ? channelData[c] : channelData[0];
          const slice = src.subarray(offset, offset + frameCount);
          planarBuffer.set(slice, c * samplesPerFrame);
        }

        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate: audioSampleRate,
          numberOfChannels: audioChannels,
          numberOfFrames: samplesPerFrame,
          timestamp: Math.round((offset / audioSampleRate) * 1_000_000),
          data: planarBuffer,
        });

        try {
          audioEncoder.encode(audioData);
        } catch (encErr) {
          audioData.close();
          break;
        }
        audioData.close();

        // Yield every 100 audio frames to prevent UI freeze
        if ((offset / samplesPerFrame) % 100 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      if (audioEncoder.state !== 'closed') {
        await audioEncoder.flush();
      }

      if (audioEncoderError) {
        console.warn('AudioEncoder had errors, audio may be incomplete:', audioEncoderError);
      }
    } catch (audioErr) {
      console.warn('Audio encoding failed, exporting video-only:', audioErr);
      audioChunks = [];
    } finally {
      if (audioEncoder && audioEncoder.state !== 'closed') {
        try { audioEncoder.close(); } catch { /* ignore */ }
      }
    }
  }

  // Muxer options
  const muxerOptions: Mp4Muxer.MuxerOptions<Mp4Muxer.ArrayBufferTarget> = {
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: {
      codec: encoderConfig.codec.startsWith('vp') ? 'vp9' : 'avc',
      width,
      height,
    },
    fastStart: 'in-memory',
  };

  if (audioChunks.length > 0) {
    muxerOptions.audio = {
      codec: 'aac',
      numberOfChannels: audioChannels,
      sampleRate: audioSampleRate,
    };
  }

  const muxer = new Mp4Muxer.Muxer(muxerOptions);

  let encoderError: any = null;
  let videoChunks: { chunk: EncodedVideoChunk; meta?: any }[] = [];

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      videoChunks.push({ chunk, meta });
    },
    error: (e) => {
      console.error('VideoEncoder runtime error:', e);
      encoderError = e;
    },
  });

  // Configure VideoEncoder
  videoEncoder.configure(encoderConfig);

  const resolutionText = `${width}x${height} (${qualityConfig.label})`;

  const frameDurationUs = Math.round((1 / fps) * 1_000_000);
  const keyFrameInterval = Math.max(1, Math.round(fps * 2));

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    // Check if encoder errored or closed
    if (encoderError || videoEncoder.state === 'closed') {
      const msg = encoderError?.message || `VideoEncoder closed unexpectedly at frame ${frameIdx}/${totalFrames}. Please try 1080p or 720p.`;
      throw new Error(msg);
    }

    // **Backpressure**: wait for GPU encoder queue to drain before pushing more frames
    // This prevents OOM and dropped frames on slower hardware
    while (videoEncoder.encodeQueueSize > 8) {
      await new Promise((r) => setTimeout(r, 5));
      if (encoderError || (videoEncoder.state as string) === 'closed') break;
    }

    const timeSec = frameIdx / fps;

    // Determine active background item for current timeSec using robust sequencer engine
    let activeFrameBg = bgMedia;
    let nextFrameBg = null;
    let transitionProgress = 0;
    let activeItemObj: MediaSequenceItem | null = null;
    let nextItemObj: MediaSequenceItem | null = null;
    let transitionType = style.sequenceTransitionType || 'crossfade';

    if (mediaItems && mediaItems.length > 0) {
      const sceneInfo = calculateSceneTransition(
        timeSec,
        mediaItems,
        style.sequenceTransitionDuration ?? style.sequenceCrossfadeDuration ?? 0.8,
        style.sequenceTransitionType ?? 'crossfade'
      );

      if (sceneInfo) {
        activeItemObj = sceneInfo.activeItem;
        activeFrameBg = loadedSequenceMap.get(activeItemObj.id) || bgMedia;
        transitionProgress = sceneInfo.transitionProgress;
        transitionType = sceneInfo.transitionType;

        if (sceneInfo.isInTransition && sceneInfo.nextItem) {
          nextItemObj = sceneInfo.nextItem;
          nextFrameBg = loadedSequenceMap.get(nextItemObj.id) || null;
        }

        // Frame-accurate video seeking
        const seekTasks: Promise<void>[] = [];
        if (activeFrameBg instanceof HTMLVideoElement && activeFrameBg.duration > 0) {
          const targetTime = calculateVideoTime(activeItemObj, sceneInfo.timeInScene, activeFrameBg.duration);
          seekTasks.push(seekVideoToTime(activeFrameBg, targetTime));
        }

        if (nextFrameBg instanceof HTMLVideoElement && nextFrameBg.duration > 0 && nextItemObj) {
          const nextTargetTime = calculateVideoTime(nextItemObj, transitionProgress * (nextItemObj.transitionDurationSec ?? 0.8), nextFrameBg.duration);
          seekTasks.push(seekVideoToTime(nextFrameBg, nextTargetTime));
        }

        if (seekTasks.length > 0) {
          await Promise.all(seekTasks);
        }
      }

      if (!activeFrameBg && loadedSequenceMap.size > 0) {
        activeFrameBg = loadedSequenceMap.values().next().value;
      }
    }

    renderLyricFrame(
      ctx,
      width,
      height,
      lyrics,
      timeSec,
      durationSec,
      style,
      activeFrameBg,
      nextFrameBg,
      transitionProgress,
      activeItemObj?.transform,
      nextItemObj?.transform,
      transitionType
    );

    const timestampMicroseconds = Math.round(timeSec * 1_000_000);
    const videoFrame = new VideoFrame(canvas, {
      timestamp: timestampMicroseconds,
      duration: frameDurationUs,
    });

    const isKeyFrame = frameIdx % keyFrameInterval === 0;
    videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });

    videoFrame.close();

    const progressPercent = Math.min(99, Math.round(((frameIdx + 1) / totalFrames) * 100));
    if (onProgress) {
      onProgress({
        isExporting: true,
        progress: progressPercent,
        currentFrame: frameIdx + 1,
        totalFrames,
        fps,
        quality: exportConfig.quality,
        resolutionText,
        stage: 'rendering-video',
      });
    }

    // Yield to UI thread every 15 frames for progress updates
    if (frameIdx % 15 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  if (onProgress) {
    onProgress({
      isExporting: true,
      progress: 99,
      currentFrame: totalFrames,
      totalFrames,
      fps,
      quality: exportConfig.quality,
      resolutionText,
      stage: 'muxing',
    });
  }

  // Properly flush all remaining encoder output — NO timeout race
  try {
    if (videoEncoder.state !== 'closed') {
      await videoEncoder.flush();
    }
  } catch (flushErr) {
    console.warn('VideoEncoder flush warning:', flushErr);
  } finally {
    try {
      if (videoEncoder.state !== 'closed') videoEncoder.close();
    } catch { /* ignore */ }
  }

  // Feed video chunks first (sorted by timestamp), then audio chunks
  // mp4-muxer handles interleaving internally — feeding by track type is more reliable
  const sortedVideoChunks = [...videoChunks].sort((a, b) => a.chunk.timestamp - b.chunk.timestamp);
  const sortedAudioChunks = [...audioChunks].sort((a, b) => a.chunk.timestamp - b.chunk.timestamp);

  for (const item of sortedVideoChunks) {
    muxer.addVideoChunk(item.chunk, item.meta);
  }
  for (const item of sortedAudioChunks) {
    muxer.addAudioChunk(item.chunk, item.meta);
  }

  muxer.finalize();

  const renderTimeSec = (performance.now() - startTimeMs) / 1000;
  const mp4Buffer = muxer.target.buffer;
  const mp4Blob = new Blob([mp4Buffer], { type: 'video/mp4' });

  if (onProgress) {
    onProgress({
      isExporting: false,
      progress: 100,
      currentFrame: totalFrames,
      totalFrames,
      fps,
      quality: exportConfig.quality,
      resolutionText,
      stage: 'completed',
      downloadUrl: URL.createObjectURL(mp4Blob),
      renderTimeSec,
      fileSizeBytes: mp4Blob.size,
    });
  }

  return mp4Blob;
}
