import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Running OpenReel 4K MP4 Video Automation Script for "Aama"...');
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

  // Intercept URL.createObjectURL BEFORE navigation
  await page.evaluateOnNewDocument(() => {
    (window).exportedMp4Blobs = [];
    const origCreateObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = function (blob) {
      const url = origCreateObjectURL(blob);
      if (blob && blob.size > 50000) {
        console.log('[Capture] Intercepted MP4 Blob! Size:', blob.size);
        (window).exportedMp4Blobs.push(blob);
      }
      return url;
    };
  });

  console.log('🌐 Navigating to http://localhost:5173/#/editor ...');
  await page.goto('http://localhost:5173/#/editor', { waitUntil: 'networkidle2' });

  // Set localStorage and dismiss welcome tour
  await page.evaluate(() => {
    localStorage.setItem('openreel-ui-store', JSON.stringify({ state: { skipWelcomeScreen: true, activeModal: null }, version: 0 }));
    localStorage.setItem('has_seen_tour', 'true');
    localStorage.setItem('openreel_tour_completed', 'true');
    const buttons = Array.from(document.querySelectorAll('button'));
    const skipBtn = buttons.find((b) => b.textContent && b.textContent.toLowerCase().includes('skip tour'));
    if (skipBtn) skipBtn.click();
  });

  await new Promise((r) => setTimeout(r, 1500));
  console.log('✅ OpenReel Editor ready.');

  // Click Export dropdown button in header
  console.log('🎬 Clicking Export Menu...');
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

  // Select Export Video Option
  console.log('⚙️ Opening Export Video Modal...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('[role="menuitem"], button, div, span'));
    const videoItem = items.find((el) => {
      const txt = (el.textContent || '').toLowerCase();
      return txt.includes('export video') || txt.includes('mp4') || txt.includes('4k');
    });
    if (videoItem) videoItem.click();
  });

  await new Promise((r) => setTimeout(r, 1500));

  // Select a Preset or Custom Tab to enable Start Export button
  console.log('🎯 Selecting Export Preset in Dialog...');
  await page.evaluate(() => {
    // Try clicking first preset card
    const cards = Array.from(document.querySelectorAll('.grid > div, [role="button"]'));
    if (cards.length > 0) {
      (cards[0]).click();
    }

    // Also try clicking "Custom" or "Presets" tab
    const tabs = Array.from(document.querySelectorAll('button, div'));
    const customTab = tabs.find((t) => t.textContent && t.textContent.trim() === 'Custom');
    if (customTab) (customTab).click();
  });

  await new Promise((r) => setTimeout(r, 1000));

  // Click Start Export inside Export Dialog
  console.log('🔥 Triggering WebCodecs Video Encoder ("Start Export")...');
  const startClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const startBtn = buttons.find((b) => {
      const txt = (b.textContent || '').toLowerCase();
      return (txt.includes('start export') || txt.includes('compress & export') || txt.includes('export')) && !b.disabled;
    });
    if (startBtn) {
      startBtn.click();
      return true;
    }
    return false;
  });
  console.log(`Start export clicked: ${startClicked}`);

  console.log('⏳ Encoding 4K video frames (waiting for MP4 Blob capture)...');
  let capturedBlob = false;
  for (let i = 0; i < 300; i++) {
    await new Promise((r) => setTimeout(r, 1000));

    const blobInfo = await page.evaluate(() => {
      const blobs = (window).exportedMp4Blobs || [];
      if (blobs.length > 0) {
        return { hasBlob: true, count: blobs.length, size: blobs[blobs.length - 1].size };
      }
      return { hasBlob: false, count: 0, size: 0 };
    });

    if (blobInfo.hasBlob) {
      capturedBlob = true;
      console.log(`🎉 SUCCESS! Intercepted Exported MP4 Blob (${(blobInfo.size / (1024 * 1024)).toFixed(2)} MB)!`);
      break;
    }

    if (i % 5 === 0) {
      console.log(`  ⏱️ Still rendering frames... (${i}s elapsed)`);
    }
  }

  if (!capturedBlob) {
    throw new Error('Video rendering timed out before MP4 blob was intercepted.');
  }

  // Extract intercepted MP4 blob data
  console.log('💾 Converting MP4 Blob to binary buffer and writing to disk...');
  const base64Data = await page.evaluate(async () => {
    const blobs = (window).exportedMp4Blobs || [];
    const targetBlob = blobs[blobs.length - 1];

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(targetBlob);
    });
  });

  const base64Content = String(base64Data).split(',')[1];
  const buffer = Buffer.from(base64Content, 'base64');

  fs.mkdirSync(path.dirname(targetMp4Path), { recursive: true });
  fs.mkdirSync(path.dirname(distMp4Path), { recursive: true });

  fs.writeFileSync(targetMp4Path, buffer);
  fs.writeFileSync(distMp4Path, buffer);

  const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
  console.log(`\n==================================================`);
  console.log(`🎉 SUCCESS! 4K LYRICAL VIDEO SAVED TO DISK!`);
  console.log(`📹 File Path: ${targetMp4Path}`);
  console.log(`📦 File Size: ${sizeMb} MB`);
  console.log(`==================================================\n`);

  await browser.close();
  console.log('✨ Automation Finished Successfully!');
}

main().catch((err) => {
  console.error('❌ Automation Error:', err);
  process.exit(1);
});
