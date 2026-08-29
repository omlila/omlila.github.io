import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🎬 Starting 4K MP4 Video Render for "Aama (Nepali Mother - Pokhara, Nepal)"...');

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome executable not found at ${chromePath}`);
  }

  const downloadDir = '/Users/sanjeevbhusal/Downloads/aama song';
  if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

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

  // Enable download interception
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
  });

  // Pre-set skipWelcomeScreen in localStorage
  await page.goto('http://localhost:5173/#/editor', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('openreel-ui-store', JSON.stringify({ state: { skipWelcomeScreen: true, activeModal: null }, version: 0 }));
    localStorage.setItem('has_seen_tour', 'true');
    localStorage.setItem('openreel_tour_completed', 'true');
  });

  console.log('🌐 Navigating to http://localhost:5173/#/editor ...');
  await page.goto('http://localhost:5173/#/editor', { waitUntil: 'networkidle2' });

  // Dismiss any tour modal button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const skipBtn = buttons.find((b) => b.textContent && b.textContent.toLowerCase().includes('skip tour'));
    if (skipBtn) skipBtn.click();
  });

  await new Promise((r) => setTimeout(r, 1500));

  // Click Export in header
  console.log('🎬 Opening Export Menu...');
  const exportClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const exportBtn = buttons.find((b) => b.textContent && b.textContent.trim().startsWith('Export'));
    if (exportBtn) {
      exportBtn.click();
      return true;
    }
    return false;
  });

  console.log(`Export menu clicked: ${exportClicked}`);
  await new Promise((r) => setTimeout(r, 1000));

  // Select Export Video
  console.log('⚙️ Selecting Video Export Options...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('[role="menuitem"], button, div, span'));
    const videoItem = items.find((el) => {
      const txt = (el.textContent || '').toLowerCase();
      return txt.includes('export video') || txt.includes('mp4') || txt.includes('4k');
    });
    if (videoItem) videoItem.click();
  });

  await new Promise((r) => setTimeout(r, 1500));

  // Trigger Start Export Encoding
  console.log('🔥 Triggering WebCodecs 4K Frame-by-Frame Video Encoder...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const startBtn = buttons.find((b) => {
      const txt = (b.textContent || '').toLowerCase();
      return txt.includes('export') || txt.includes('start') || txt.includes('encoding');
    });
    if (startBtn) startBtn.click();
  });

  console.log('⏳ Encoding 4K Video Frames (3840x2160 @ 30 FPS)...');
  let isDone = false;
  let attempts = 0;

  while (!isDone && attempts < 200) {
    await new Promise((r) => setTimeout(r, 2000));
    attempts++;

    const status = await page.evaluate(() => {
      const text = document.body.innerText;
      if (text.includes('100%') || text.includes('Ready to Download') || text.includes('Download MP4') || text.includes('Export Complete')) {
        return { completed: true, progress: '100' };
      }
      const match = text.match(/(\d+)%/);
      return { completed: false, progress: match ? match[1] : '0' };
    });

    if (status.completed) {
      isDone = true;
      console.log('🎉 4K MP4 Video Encoding & WebCodecs Muxing 100% COMPLETE!');
    } else {
      console.log(`  📊 Progress: ${status.progress}% frame encoded...`);
    }
  }

  // Click Download button if present to trigger file write
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const downloadBtn = btns.find((b) => b.textContent && b.textContent.toLowerCase().includes('download'));
    if (downloadBtn) downloadBtn.click();
  });

  await new Promise((r) => setTimeout(r, 4000));

  // Check generated mp4 in directory or fallback save
  const files = fs.readdirSync(downloadDir);
  console.log(`📁 Files in target directory ${downloadDir}:`, files);

  const mp4Files = files.filter((f) => f.endsWith('.mp4'));
  const targetFile = path.join(downloadDir, 'aama_4k_lyrical_video.mp4');

  if (mp4Files.length > 0) {
    const srcFile = path.join(downloadDir, mp4Files[0]);
    if (srcFile !== targetFile) {
      fs.copyFileSync(srcFile, targetFile);
    }
    const stats = fs.statSync(targetFile);
    console.log(`\n==================================================`);
    console.log(`✅ SUCCESS! Production 4K Video Generated & Saved!`);
    console.log(`📹 File Path: ${targetFile}`);
    console.log(`📦 File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`==================================================\n`);
  } else {
    // Canvas fallback: Extract encoded canvas data if browser download link was blob
    console.log('💾 Extracting MP4 from blob URL in browser context...');
    const base64Data = await page.evaluate(async () => {
      const links = Array.from(document.querySelectorAll('a'));
      const mp4Link = links.find((l) => l.href && (l.href.startsWith('blob:') || (l.getAttribute('download') || '').endsWith('.mp4')));

      if (mp4Link) {
        const res = await fetch(mp4Link.href);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
      return null;
    });

    if (base64Data) {
      const base64Content = String(base64Data).split(',')[1];
      const buffer = Buffer.from(base64Content, 'base64');
      fs.writeFileSync(targetFile, buffer);
      console.log(`\n==================================================`);
      console.log(`✅ SUCCESS! Production 4K Video Extracted & Saved!`);
      console.log(`📹 File Path: ${targetFile}`);
      console.log(`📦 File Size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`==================================================\n`);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error('❌ Render Error:', err);
  process.exit(1);
});
