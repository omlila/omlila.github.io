import type { SamplePreset } from '../types';

export function createSynthesizedAudioUrl(presetType: 'synthwave' | 'lofi'): string {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
  const duration = 24;
  const sampleRate = audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(2, sampleRate * duration, sampleRate);
  
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const bpm = presetType === 'synthwave' ? 120 : 80;
  const secondsPerBeat = 60 / bpm;

  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    const beat = (t / secondsPerBeat) % 1;
    
    const bassFreq = presetType === 'synthwave' ? (t % 4 < 2 ? 110 : 146.83) : 65.41;
    const bass = Math.sin(2 * Math.PI * bassFreq * t) * Math.exp(-beat * 2);

    const melodyFreq = 440 * Math.pow(2, (Math.floor(t * 2) % 7) / 12);
    const synthPad = Math.sin(2 * Math.PI * melodyFreq * t) * 0.15;

    const kick = Math.sin(2 * Math.PI * 60 * Math.exp(-beat * 20) * t) * (beat < 0.1 ? 0.6 : 0);

    const signal = (bass * 0.25 + synthPad + kick) * 0.5;
    left[i] = signal;
    right[i] = signal;
  }

  return bufferToWavUrl(buffer);
}

function bufferToWavUrl(buffer: AudioBuffer): string {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const numSamples = buffer.length;
  const dataByteCount = numSamples * blockAlign;
  const headerByteCount = 44;
  const totalByteCount = headerByteCount + dataByteCount;
  
  const arrayBuffer = new ArrayBuffer(totalByteCount);
  const dataView = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      dataView.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  dataView.setUint32(4, 36 + dataByteCount, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  dataView.setUint32(16, 16, true);
  dataView.setUint16(20, format, true);
  dataView.setUint16(22, numChannels, true);
  dataView.setUint32(24, sampleRate, true);
  dataView.setUint32(28, sampleRate * blockAlign, true);
  dataView.setUint16(32, blockAlign, true);
  dataView.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  dataView.setUint32(40, dataByteCount, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      dataView.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'cinematic-journey',
    title: 'Cinematic Journey',
    artist: 'Sample Artist',
    theme: 'cinematic',
    audioUrl: './demo_melody.wav',
    lrcContent: `[00:00.00] [Intro - Cinematic Swell]
[00:04.00] The journey begins here
[00:08.00] Colors painting the sky
[00:12.00] Shadows slowly fade away
[00:16.00] Embrace the morning light
[00:20.00] [Outro - Fade]`,
    coverImage: 'https://images.unsplash.com/photo-1447958272669-9c5ce24c8bf2?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cartoon-pop',
    title: 'Cartoon Pop Art',
    artist: 'Comic Beats',
    theme: 'cartoon',
    audioUrl: '',
    lrcContent: `[00:00.00] Boom! Pow! Comic pop art energy!
[00:04.00] Colorful vibes lighting up the screen
[00:08.00] Supercharged rhythm in full display
[00:12.00] Neon highlights and halftone dots
[00:16.00] Unleash your inner superhero now
[00:20.00] Pure cartoon magic in motion`,
    coverImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cyberpunk-neon',
    title: 'Cyberpunk Neon',
    artist: 'Cyberwave Synth',
    theme: 'cyberpunk',
    audioUrl: '',
    lrcContent: `[00:00.00] Neon lights glow in the midnight rain
[00:04.00] Cruising down the digital highway
[00:08.00] Electric shadows dancing in the night
[00:12.00] Synthesizers echo through the sky
[00:16.00] Infinite horizon bathed in purple glow
[00:20.00] We belong to the future now`,
    coverImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cosmic-starfield',
    title: 'Cosmic Starfield',
    artist: 'Lofi Stardust',
    theme: 'starfield',
    audioUrl: '',
    lrcContent: `[00:00.00] Floating among distant stars
[00:04.00] Quiet echoes in deep space
[00:08.00] Lost in the serenity of the cosmos
[00:12.00] Time slows down in zero gravity
[00:16.00] Dreaming beneath the starlit canopy
[00:20.00] Eternal peace in motion`,
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  },
];
