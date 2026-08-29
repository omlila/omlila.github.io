import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Launching 4K Video Encoder Automation for "Aama (Nepali Mother - Pokhara, Nepal)"...');

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

  await page.waitForSelector('canvas', { timeout: 15000 });
  console.log('✅ Canvas Viewport Loaded.');

  const screenshotsDir = path.join(process.cwd(), 'scripts', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  await page.screenshot({ path: path.join(screenshotsDir, '01_pokhara_studio.png') });
  console.log('📸 Saved initial screenshot.');

  // Click Export 4K MP4 button in header
  console.log('🎬 Clicking Export 4K MP4 Button...');
  const clickedHeaderExport = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes('Export 4K MP4'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log(`Header export clicked: ${clickedHeaderExport}`);
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({ path: path.join(screenshotsDir, '02_export_modal.png') });

  // Click "Start 4K Video Encoding" in modal
  console.log('🔥 Starting 4K WebCodecs Video Encoding...');
  const startClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const startBtn = buttons.find((b) => b.textContent && b.textContent.includes('Start 4K Video Encoding'));
    if (startBtn) {
      startBtn.click();
      return true;
    }
    return false;
  });

  console.log(`Start encoding clicked: ${startClicked}`);

  // Monitor progress until completed
  console.log('⏳ Encoding 4K Video Frames (3840x2160 @ 30 FPS)...');
  let completed = false;
  let attempts = 0;

  while (!completed && attempts < 180) {
    await new Promise((r) => setTimeout(r, 2000));
    attempts++;

    const status = await page.evaluate(() => {
      const text = document.body.innerText;
      if (text.includes('Your Video is Ready!') || text.includes('Download MP4 Video') || text.includes('100%')) {
        return { isDone: true, text: 'completed' };
      }
      const match = text.match(/(\d+)%/);
      return { isDone: false, progress: match ? match[1] : '0' };
    });

    if (status.isDone) {
      completed = true;
      console.log('🎉 4K MP4 Video Encoding & Muxing COMPLETED 100%!');
    } else {
      console.log(`  📊 Progress: ${status.progress}% encoded`);
    }
  }

  await page.screenshot({ path: path.join(screenshotsDir, '03_export_completed.png') });

  // Extract Blob download URL
  console.log('💾 Extracting exported 4K MP4 video file...');
  const base64Data = await page.evaluate(async () => {
    const downloadBtn = Array.from(document.querySelectorAll('a')).find(
      (a) => a.textContent && a.textContent.includes('Download MP4 Video')
    );
    if (!downloadBtn || !downloadBtn.href) {
      const anyBlobLink = Array.from(document.querySelectorAll('a')).find((a) => a.href && a.href.startsWith('blob:'));
      if (anyBlobLink) {
        const res = await fetch(anyBlobLink.href);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
      throw new Error('Download button not found in modal');
    }

    const res = await fetch(downloadBtn.href);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
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
    console.log(`✅ Production 4K MP4 Video saved to: ${outPath} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
  }

  await browser.close();
  console.log('✨ 4K Lyrical Video Generation Completed Successfully!');
}

main().catch((err) => {
  console.error('❌ Automation Error:', err);
  process.exit(1);
});
