import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

/**
 * Universal Omlila App Automation Runner
 * Connects to a running Omlila web app (local dev or production) and executes actions.
 */

function findChromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'google-chrome';
}

export class OmlilaAppClient {
  constructor(options = {}) {
    this.targetUrl = options.targetUrl || 'http://localhost:5173/studio/video/';
    this.headless = options.headless ?? true;
    this.chromePath = options.chromePath || findChromePath();
    this.browser = null;
    this.page = null;
  }

  async connect() {
    if (this.browser) return;
    this.browser = await puppeteer.launch({
      executablePath: this.chromePath,
      headless: this.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-gl=angle',
        '--enable-features=WebCodecs,AcceleratedVideoEncoder',
        '--autoplay-policy=no-user-gesture-required',
      ],
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    console.log(`🌐 Navigating to ${this.targetUrl}...`);
    await this.page.goto(this.targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the Omlila Studio bridge to register
    await this.page.waitForFunction(() => !!window.omlilaStudio, { timeout: 15000 });
    console.log('✅ Omlila Studio automation bridge connected.');
  }

  async getState() {
    await this.connect();
    return this.page.evaluate(() => window.omlilaStudio.getState());
  }

  async listPresets() {
    await this.connect();
    return this.page.evaluate(() => window.omlilaStudio.listPresets());
  }

  async setLyrics(lrcText) {
    await this.connect();
    return this.page.evaluate((lrc) => window.omlilaStudio.setLyrics(lrc), lrcText);
  }

  async setTheme(themeId) {
    await this.connect();
    return this.page.evaluate((t) => window.omlilaStudio.setTheme(t), themeId);
  }

  async setAspectRatio(ratio) {
    await this.connect();
    return this.page.evaluate((r) => window.omlilaStudio.setAspectRatio(r), ratio);
  }

  async captureCanvasFrame(options = {}) {
    await this.connect();
    const dataUrl = await this.page.evaluate((opts) => window.omlilaStudio.captureCanvasFrame(opts), options);
    if (options.outputPath) {
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(options.outputPath, Buffer.from(base64Data, 'base64'));
      console.log(`📸 Frame saved to ${options.outputPath}`);
    }
    return dataUrl;
  }

  async exportMP4(options = {}) {
    await this.connect();
    console.log(`🎬 Triggering MP4 export (Quality: ${options.quality || '2160p'})...`);

    const base64Video = await this.page.evaluate(async (opts) => {
      if (opts.lrc) window.omlilaStudio.setLyrics(opts.lrc);
      if (opts.theme) window.omlilaStudio.setTheme(opts.theme);
      if (opts.aspectRatio) window.omlilaStudio.setAspectRatio(opts.aspectRatio);

      const result = await window.omlilaStudio.exportMP4({
        quality: opts.quality,
        fps: opts.fps,
      });

      // Convert Blob to Base64 to return across Puppeteer boundary
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(result.blob);
      });
    }, options);

    if (options.outputPath) {
      const dir = path.dirname(options.outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const base64Data = base64Video.replace(/^data:video\/\w+;base64,/, '');
      fs.writeFileSync(options.outputPath, Buffer.from(base64Data, 'base64'));
      console.log(`🎉 Video saved successfully to ${options.outputPath}`);
    }

    return base64Video;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

// CLI usage if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0] || 'info';

  const client = new OmlilaAppClient({
    targetUrl: process.env.STUDIO_URL || 'http://localhost:5173/studio/video/',
  });

  try {
    if (command === 'info') {
      const state = await client.getState();
      console.log('App State:', JSON.stringify(state, null, 2));
    } else if (command === 'preview') {
      const out = args[1] || './preview_frame.png';
      await client.captureCanvasFrame({ outputPath: out });
    } else if (command === 'export') {
      const out = args[1] || './output.mp4';
      const quality = args[2] || '1080p';
      await client.exportMP4({ outputPath: out, quality });
    }
  } catch (err) {
    console.error('Automation Error:', err);
  } finally {
    await client.close();
  }
}
