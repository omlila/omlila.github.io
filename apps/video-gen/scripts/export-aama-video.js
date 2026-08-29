import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Starting 4K Lyrical Video Automation for "Aama (Nepali Mother - Pokhara, Nepal)"...');

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome executable not found at ${chromePath}`);
  }

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

  console.log('🌐 Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

  // Wait for canvas to render Pokhara mother background
  await page.waitForSelector('canvas', { timeout: 15000 });
  console.log('✅ 4K Studio Viewport Ready.');

  const screenshotsDir = path.join(process.cwd(), 'scripts', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const initialScreenshotPath = path.join(screenshotsDir, '01_pokhara_studio.png');
  await page.screenshot({ path: initialScreenshotPath });
  console.log(`📸 Studio Screenshot saved to: ${initialScreenshotPath}`);

  // Locate Export 4K MP4 button
  console.log('🎬 Opening 4K Export Studio Modal...');
  const exportButtonClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const exportBtn = buttons.find((b) => {
      const txt = (b.textContent || '').toLowerCase();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return txt.includes('export 4k mp4') || aria.includes('export mp4 video') || txt.includes('export');
    });
    if (exportBtn) {
      exportBtn.click();
      return true;
    }
    return false;
  });

  console.log(`Export button click status: ${exportButtonClicked}`);
  await new Promise((r) => setTimeout(r, 1000));

  const modalScreenshotPath = path.join(screenshotsDir, '02_export_modal.png');
  await page.screenshot({ path: modalScreenshotPath });
  console.log(`📸 Modal Screenshot saved to: ${modalScreenshotPath}`);

  // Select 4K Ultra HD
  console.log('⚙️ Selecting 4K Ultra HD (2160p)...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn4k = buttons.find((b) => b.textContent && (b.textContent.includes('2160p') || b.textContent.includes('4K')));
    if (btn4k) btn4k.click();
  });

  // Click Start Video Export
  console.log('🔥 Triggering WebCodecs 4K Frame-by-Frame Encoder...');
  const encodingStarted = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const startBtn = buttons.find((b) => {
      const txt = (b.textContent || '').toLowerCase();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return (txt.includes('start') && txt.includes('export')) || aria.includes('start video export') || txt.includes('start encoding');
    });
    if (startBtn) {
      startBtn.click();
      return true;
    }
    return false;
  });

  console.log(`Start encoding status: ${encodingStarted}`);

  // Poll for completion
  console.log('⏳ Encoding 4K Video (3840x2160 @ 30 FPS)...');
  let isCompleted = false;
  let pollCount = 0;

  while (!isCompleted && pollCount < 180) {
    await new Promise((r) => setTimeout(r, 2000));
    pollCount++;

    const status = await page.evaluate(() => {
      const text = document.body.innerText;
      if (text.includes('100%') || text.includes('Your Video is Ready!') || text.includes('Download MP4 Video')) {
        return { completed: true, progress: '100' };
      }
      const match = text.match(/(\d+)%/);
      return { completed: false, progress: match ? match[1] : '0' };
    });

    if (status.completed) {
      isCompleted = true;
      console.log('🎉 4K MP4 Video Encoding & Muxing COMPLETED 100%!');
    } else {
      console.log(`  📊 Progress: ${status.progress}% encoded`);
    }
  }

  const completedScreenshotPath = path.join(screenshotsDir, '03_export_completed.png');
  await page.screenshot({ path: completedScreenshotPath });
  console.log(`📸 Completed Screenshot saved to: ${completedScreenshotPath}`);

  // Extract generated MP4 Blob
  console.log('💾 Extracting 4K MP4 binary blob...');
  const base64Data = await page.evaluate(async () => {
    const links = Array.from(document.querySelectorAll('a'));
    const mp4Link = links.find((l) => l.href && (l.href.startsWith('blob:') || (l.getAttribute('download') || '').endsWith('.mp4')));

    if (mp4Link) {
      const response = await fetch(mp4Link.href);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }
    throw new Error('Export download blob link not found.');
  });

  const base64Content = String(base64Data).split(',')[1];
  const buffer = Buffer.from(base64Content, 'base64');

  const outputPaths = [
    '/Users/sanjeevbhusal/Downloads/aama song/aama_4k_lyrical_video.mp4',
    path.join(process.cwd(), 'dist', 'aama_4k_lyrical_video.mp4'),
  ];

  for (const outPath of outputPaths) {
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, buffer);
    console.log(`✅ Production 4K MP4 Video saved: ${outPath} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
  }

  await browser.close();
  console.log('✨ 4K Lyrical Video Automation Finished Successfully!');
}

main().catch((err) => {
  console.error('❌ Automation Error:', err);
  process.exit(1);
});
