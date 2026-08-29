import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function generate4KYouTubeVideo() {
  console.log('🚀 Starting Automated 4K YouTube Video Generation Test...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('🌐 Navigating to Lyrical Video Creator on http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

  // 1. Select 16:9 Widescreen for YouTube
  console.log('📺 Selecting 16:9 Widescreen aspect ratio for YouTube...');
  const widescreenBtn = await page.waitForSelector('button[aria-label*="16:9"]');
  if (widescreenBtn) await widescreenBtn.click();

  // 2. Open Export Modal
  console.log('🎬 Opening Export Modal...');
  const exportBtn = await page.waitForSelector('header button[aria-label*="Export"]');
  if (exportBtn) await exportBtn.click();

  // 3. Select 2160p 4K Quality
  console.log('✨ Selecting 2160p 4K Ultra HD Quality...');
  const quality4kBtn = await page.waitForSelector('button[aria-pressed="false"]:has-text("4K"), button:has-text("2160p")');
  if (quality4kBtn) await quality4kBtn.click();

  // 4. Click Start Render
  console.log('⚡ Triggering 4K MP4 Frame-by-Frame WebCodecs Render Loop...');
  const startRenderBtn = await page.waitForSelector('button:has-text("Start Render")');
  if (startRenderBtn) await startRenderBtn.click();

  // 5. Wait for Render Completion & Download Link
  console.log('⏳ Waiting for WebCodecs encoding to reach 100% completion...');
  const downloadLink = await page.waitForSelector('a[download*="mp4"]', { timeout: 120_000 });

  if (downloadLink) {
    console.log('🎉 4K MP4 Video successfully encoded and ready for download!');
    const href = await page.evaluate((el) => el.getAttribute('href'), downloadLink);
    console.log(`✅ Download Blob URL generated: ${href}`);
  }

  await browser.close();
  console.log('🏆 4K YouTube Video Generation Test Completed Successfully!');
}

generate4KYouTubeVideo().catch((err) => {
  console.error('❌ Error during 4K video generation test:', err);
  process.exit(1);
});
