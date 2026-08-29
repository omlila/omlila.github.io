import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Direct 4K MP4 Frame-by-Frame WebCodecs Renderer for "Aama"...');
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const targetMp4Path = '/Users/sanjeevbhusal/Downloads/aama song/aama_4k_lyrical_video.mp4';
  const distMp4Path = path.join(process.cwd(), 'dist', 'aama_4k_lyrical_video.mp4');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--enable-features=WebCodecs,AcceleratedVideoEncoder',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🌐 Loading Vite environment at http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

  // Execute WebCodecs 4K Frame Encoding by dynamically importing mp4Exporter module
  console.log('🔥 Encoding 4K Video Frames (3840x2160 @ 30 FPS, 35 Mbps H.264 MP4)...');
  const base64Data = await page.evaluate(async () => {
    // Dynamic import of Vite modules
    const { exportLyricalVideoMP4 } = await import('/src/utils/mp4Exporter.ts');
    const { parseLyricCues } = await import('/src/utils/lrcParser.ts');

    const lrcText = `[00:00.00] [Intro - Acoustic Guitar]
[00:12.00] धेरै ती रात
[00:18.00] आँसुका साथ
[00:24.00] काटेछौ तिमीले
[00:30.00] सारा ती दुःख
[00:36.00] बिर्सी है आमा
[00:42.00] हुर्कायौ हामीलाई
[00:50.00] आ... आमा
[01:02.00] तिम्रा ती दुःख
[01:08.00] तिम्रा ती पीडा
[01:14.00] गएका छैनन् खेर
[01:20.00] तिम्रा ती दुई
[01:26.00] आँखाका नानी
[01:32.00] भएका छैनन् टाढा
[01:42.00] हरेक पल
[01:48.00] सम्झी रहन्छन् तिमीलाई
[01:56.00] धेरै नै माया
[02:02.00] गरी रहन्छन् तिमीलाई
[02:12.00] फुलेका फूल
[02:18.00] बासना छर्न
[02:24.00] गएका हुन् ती टाढा
[02:30.00] आउनेछन् फेरि
[02:36.00] तिम्रै त्यो साथ
[02:42.00] तिमीलाई खुसी पार्न
[02:50.00] धेरै ती रात
[02:56.00] आँसुका साथ
[03:02.00] काटेछौ तिमीले
[03:08.00] सारा ती दुःख
[03:14.00] बिर्सी है आमा
[03:20.00] हुर्कायौ हामीलाई
[03:26.00] आ... आमा
[03:32.00] [Outro - Acoustic Guitar Fade]`;

    const lyrics = parseLyricCues(lrcText);

    const style = {
      showLyrics: true,
      textPosition: { preset: 'center', offsetYPercent: 50, offsetXPercent: 50, scale: 1.1 },
      backgroundTransform: { scale: 1.0, offsetXPercent: 0, offsetYPercent: 0, fitMode: 'cover' },
      themePreset: 'mother-love',
      fontFamily: 'Cinzel',
      fontSize: 56,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textColor: '#fff7ed',
      activeTextColor: '#fbbf24',
      glowColor: '#f59e0b',
      glowIntensity: 35,
      strokeColor: '#1c1917',
      strokeWidth: 6,
      textAlign: 'center',
      animationType: 'karaoke',
      motionCurve: 'cinematic-cubic',
      backgroundType: 'image',
      backgroundColor: '#051c14',
      backgroundGradient: 'linear-gradient(135deg, #051c14, #064e3b, #022c22)',
      backgroundImageUrl: '/mother_golden.jpg',
      backgroundBlur: 0,
      backgroundDarken: 0.3,
      linesToShow: 3,
      highlightActiveWord: true,
      enableParticles: true,
      enableVignette: true,
      enableScanlines: false,
      enableHalftone: false,
      enableLetterbox: false,
      enableAudioSpectrum: true,
      enableKenBurns: true,
    };

    const exportConfig = {
      aspectRatio: '16:9',
      quality: '2160p', // 4K Ultra HD
      fps: 30,
      customBitrate: 35_000_000,
    };

    const mediaItems = [
      {
        id: 'aama_bg_1',
        name: 'Nepali Mother & Child in Pokhara Hills (Machhapuchhre Sunset)',
        type: 'image',
        url: '/mother_golden.jpg',
        durationSec: 70.0,
      },
      {
        id: 'aama_bg_2',
        name: 'Traditional Diya & Himalayas Moonlight Night (Pokhara)',
        type: 'image',
        url: '/mother_night.jpg',
        durationSec: 70.0,
      },
      {
        id: 'aama_bg_3',
        name: 'Rhododendron Lali Gurans Blooming on Pokhara Hills',
        type: 'image',
        url: '/mother_flowers.jpg',
        durationSec: 80.0,
      },
    ];

    const mp4Blob = await exportLyricalVideoMP4(
      lyrics,
      '/aama.wav',
      style,
      exportConfig,
      undefined,
      undefined,
      mediaItems
    );

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(mp4Blob);
    });
  });

  console.log('🎉 4K MP4 Video Encoding Complete! Writing file to disk...');
  const base64Content = String(base64Data).split(',')[1];
  const buffer = Buffer.from(base64Content, 'base64');

  fs.mkdirSync(path.dirname(targetMp4Path), { recursive: true });
  fs.mkdirSync(path.dirname(distMp4Path), { recursive: true });

  fs.writeFileSync(targetMp4Path, buffer);
  fs.writeFileSync(distMp4Path, buffer);

  const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
  console.log(`\n==================================================`);
  console.log(`🎉 4K LYRICAL VIDEO GENERATED & SAVED LOCALLY!`);
  console.log(`📹 File Path: ${targetMp4Path}`);
  console.log(`📦 File Size: ${sizeMb} MB`);
  console.log(`==================================================\n`);

  await browser.close();
}

main().catch((err) => {
  console.error('❌ Render Error:', err);
  process.exit(1);
});
