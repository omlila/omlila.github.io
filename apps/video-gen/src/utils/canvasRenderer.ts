import type { LyricLine, MotionCurve, StyleConfig, BackgroundTransformConfig } from '../types';

/**
 * OpenReel-inspired Easing Functions for High-Quality Keyframe Animations.
 */
function applyMotionCurve(progress: number, curve?: MotionCurve): number {
  const p = Math.min(1, Math.max(0, progress));
  if (curve === 'ease-in-out') {
    return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  }
  if (curve === 'elastic-spring') {
    return Math.sin(-13 * (p + 1) * Math.PI / 2) * Math.pow(2, -10 * p) + 1;
  }
  if (curve === 'bounce-pop') {
    const c4 = (2 * Math.PI) / 3;
    return p === 0 ? 0 : p === 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * c4) + 1;
  }
  if (curve === 'cinematic-cubic') {
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }
  // Default 'smooth' linear
  return p;
}

/**
 * Deterministic Canvas2D Renderer for Full Audio Video & Lyrical Video Frames.
 * Supports OpenReel keyframe easing curves, optional lyrics overlay, dynamic X/Y positioning & scaling, background pan/zoom transforms, audio spectrum, and 4K export!
 */


export function renderLyricFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  lyrics: LyricLine[],
  currentTime: number,
  duration: number,
  style: StyleConfig,
  bgElement?: HTMLImageElement | HTMLVideoElement | null,
  nextBgElement?: HTMLImageElement | HTMLVideoElement | null,
  bgTransitionProgress?: number,
  bgTransform?: BackgroundTransformConfig,
  nextBgTransform?: BackgroundTransformConfig
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Helper for drawing media with Ken Burns
  const drawMediaLayer = (
    media: HTMLImageElement | HTMLVideoElement, 
    globalAlpha: number = 1.0, 
    customTransform?: BackgroundTransformConfig
  ) => {
    const mediaWidth = (media as any).videoWidth || media.width || width;
    const mediaHeight = (media as any).videoHeight || media.height || height;
    
    // Fallback to global style transform if item doesn't have one
    const transformToUse = customTransform || style.backgroundTransform;
    
    const bgScaleMulti = transformToUse?.scale ?? 1.0;
    const bgFitMode = transformToUse?.fitMode ?? 'cover';

    let scale = bgFitMode === 'contain'
      ? Math.min(width / mediaWidth, height / mediaHeight)
      : Math.max(width / mediaWidth, height / mediaHeight);

    scale *= bgScaleMulti;

    ctx.save();
    if (globalAlpha < 1.0) {
      ctx.globalAlpha = globalAlpha;
    }

    // Ken Burns (Zoom / Pan) Motion Effect: Starts full-screen with overscan to eliminate edge gaps
    if (style.enableKenBurns) {
      const minOverscan = 1.15;
      const zoomCycle = (1 + Math.sin(currentTime * 0.15)) * 0.5; // 0.0 to 1.0
      const kbZoom = minOverscan + zoomCycle * 0.12; // 1.15 to 1.27
      scale *= kbZoom;
    }

    const drawWidth = mediaWidth * scale;
    const drawHeight = mediaHeight * scale;
    
    let offsetX = (width - drawWidth) / 2 + (width * ((transformToUse?.offsetXPercent ?? 0) / 100));
    let offsetY = (height - drawHeight) / 2 + (height * ((transformToUse?.offsetYPercent ?? 0) / 100));

    if (style.enableKenBurns) {
      const maxPanX = Math.max(0, (drawWidth - width) / 2);
      const maxPanY = Math.max(0, (drawHeight - height) / 2);
      const panX = Math.cos(currentTime * 0.08) * (maxPanX * 0.6);
      const panY = Math.sin(currentTime * 0.06) * (maxPanY * 0.6);
      offsetX += panX;
      offsetY += panY;

      // Ensure the image always fully covers the canvas boundary without black gaps
      if (drawWidth >= width) {
        offsetX = Math.min(0, Math.max(width - drawWidth, offsetX));
      }
      if (drawHeight >= height) {
        offsetY = Math.min(0, Math.max(height - drawHeight, offsetY));
      }
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(media, offsetX, offsetY, drawWidth, drawHeight);
    ctx.restore();
  };

  // Only draw background media if explicit bgElement is provided,
  // bypassing the static "image/video" backgroundType check to allow sequencer dominance.
  if (bgElement) {
    if (nextBgElement && bgTransitionProgress !== undefined && bgTransitionProgress > 0 && (style.sequenceCrossfadeDuration ?? 0) > 0) {
      drawMediaLayer(bgElement, 1 - bgTransitionProgress, bgTransform);
      drawMediaLayer(nextBgElement, bgTransitionProgress, nextBgTransform);
    } else {
      drawMediaLayer(bgElement, 1.0, bgTransform);
    }
  } else if (style.backgroundType === 'color') {
    ctx.fillStyle = style.backgroundColor || '#09090b';
    ctx.fillRect(0, 0, width, height);
  } else if (style.backgroundType === 'gradient') {
    // B7: Animated hue shift
    const hueShiftOffset = style.enableGradientHueShift ? (currentTime * (style.gradientHueShiftSpeed ?? 30)) % 360 : 0;
    // Feature 9: Custom multi-stop gradient with angle support
    const gradAngle = ((style.backgroundGradientAngle ?? 135) * Math.PI) / 180;
    const gx1 = width / 2 - Math.cos(gradAngle) * width / 2;
    const gy1 = height / 2 - Math.sin(gradAngle) * height / 2;
    const gx2 = width / 2 + Math.cos(gradAngle) * width / 2;
    const gy2 = height / 2 + Math.sin(gradAngle) * height / 2;
    const gradient = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
    if (style.backgroundGradientStops && style.backgroundGradientStops.length >= 2) {
      style.backgroundGradientStops.forEach(stop => {
        gradient.addColorStop(Math.min(1, Math.max(0, stop.position)), stop.color);
      });
      // Apply hue shift overlay if enabled
      if (hueShiftOffset > 0) {
        const hueGrad = ctx.createLinearGradient(0, 0, width, 0);
        hueGrad.addColorStop(0, `hsla(${hueShiftOffset}, 60%, 50%, 0.15)`);
        hueGrad.addColorStop(1, `hsla(${(hueShiftOffset + 60) % 360}, 60%, 50%, 0.15)`);
        ctx.fillStyle = hueGrad;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = gradient;
      }
    } else if (style.backgroundGradient && style.backgroundGradient.includes('linear-gradient')) {
      gradient.addColorStop(0, '#051c14');
      gradient.addColorStop(0.5, '#064e3b');
      gradient.addColorStop(1, '#02140d');
    } else {
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(1, '#020617');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else if (style.backgroundType === 'animated-aurora') {
    const t = currentTime * 0.2;
    const gradient = ctx.createLinearGradient(
      width * 0.5 + Math.cos(t) * width * 0.5, 
      height * 0.5 + Math.sin(t) * height * 0.5, 
      width * 0.5 - Math.cos(t) * width * 0.5, 
      height * 0.5 - Math.sin(t) * height * 0.5
    );
    gradient.addColorStop(0, `hsl(${(t * 40) % 360}, 80%, 25%)`);
    gradient.addColorStop(0.5, `hsl(${((t * 40) + 60) % 360}, 80%, 15%)`);
    gradient.addColorStop(1, `hsl(${((t * 40) + 120) % 360}, 100%, 5%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else if (style.backgroundType === 'animated-nebula') {
    const t = currentTime * 0.15;
    const cx = width / 2 + Math.cos(t) * (width * 0.2);
    const cy = height / 2 + Math.sin(t * 1.5) * (height * 0.2);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.8);
    gradient.addColorStop(0, `hsl(${((t * 20) + 260) % 360}, 80%, 25%)`);
    gradient.addColorStop(0.5, `hsl(${((t * 20) + 290) % 360}, 90%, 15%)`);
    gradient.addColorStop(1, `hsl(${((t * 20) + 320) % 360}, 100%, 5%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Fallback if image/video type but no bgElement
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#051c14');
    gradient.addColorStop(1, '#020d08');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Halftone Pop Art Overlay FX (Cartoon Style)
  if (style.enableHalftone) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    const dotSpacing = (24 / 1080) * width;
    const dotRadius = (3 / 1080) * width;
    for (let x = 0; x < width; x += dotSpacing) {
      for (let y = 0; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 3. Floating Space Particles System
  if (style.enableParticles) {
    ctx.save();
    const particleCount = 60;
    for (let i = 0; i < particleCount; i++) {
      const speed = 0.1 + (i % 5) * 0.05;
      const seedX = (i * 137.5) % width;
      const seedY = (i * 295.3 - currentTime * 50 * speed + height * 10) % height;
      const radius = (1.5 + (i % 4) * 1.2) * (width / 1080);
      const alpha = 0.2 + Math.sin(currentTime * 2 + i) * 0.15;

      ctx.fillStyle = style.glowColor ? `${style.glowColor}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}` : `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(seedX, seedY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Darken Overlay & Color Tint Overlay
  if (style.backgroundDarken > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.95, style.backgroundDarken)})`;
    ctx.fillRect(0, 0, width, height);
  }

  // 4.5. Cinema Scrim & Feathered Background Fade (Half-Screen / Lower-Third Cover)
  if (style.enableScrimOverlay) {
    let scrimActiveAlpha = 1.0;
    if (style.scrimOnlyWhenLyricsActive) {
      const hasActiveLyric = lyrics.some(
        (l) => currentTime >= (l.startTime - 0.4) && currentTime <= (l.endTime + 0.4)
      );
      if (!hasActiveLyric) {
        scrimActiveAlpha = 0.0;
      } else {
        const activeL = lyrics.find(
          (l) => currentTime >= (l.startTime - 0.4) && currentTime <= (l.endTime + 0.4)
        );
        if (activeL) {
          if (currentTime < activeL.startTime) {
            scrimActiveAlpha = Math.min(1.0, Math.max(0.0, (currentTime - (activeL.startTime - 0.4)) / 0.4));
          } else if (currentTime > activeL.endTime) {
            scrimActiveAlpha = Math.min(1.0, Math.max(0.0, 1.0 - (currentTime - activeL.endTime) / 0.4));
          } else {
            scrimActiveAlpha = 1.0;
          }
        }
      }
    }

    if (scrimActiveAlpha > 0.01) {
      ctx.save();
      const scrimType = style.scrimType || 'bottom-fade';
      const heightPercent = (style.scrimHeightPercent ?? 50) / 100;
      const baseOpacity = Math.min(1.0, Math.max(0.0, style.scrimOpacity ?? 0.75));
      const scrimOpacity = baseOpacity * scrimActiveAlpha;
      const scrimColor = style.scrimColor || '#000000';
      const featherRatio = (style.scrimFeatherPercent ?? 50) / 100;

      let r = 0, g = 0, b = 0;
      const hexMatch = scrimColor.match(/^#([0-9a-f]{6})$/i);
      if (hexMatch) {
        r = parseInt(hexMatch[1].substring(0, 2), 16);
        g = parseInt(hexMatch[1].substring(2, 4), 16);
        b = parseInt(hexMatch[1].substring(4, 6), 16);
      }

      if (scrimType === 'bottom-fade' || scrimType === 'horizontal-split') {
        const scrimH = height * heightPercent;
        const startY = height - scrimH;
        
        const grad = ctx.createLinearGradient(0, startY, 0, height);
        grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
        grad.addColorStop(Math.min(0.9, featherRatio), `rgba(${r},${g},${b},${scrimOpacity * 0.7})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},${scrimOpacity})`);
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, startY, width, scrimH);
      } else if (scrimType === 'top-fade') {
        const scrimH = height * heightPercent;
        const grad = ctx.createLinearGradient(0, 0, 0, scrimH);
        grad.addColorStop(0, `rgba(${r},${g},${b},${scrimOpacity})`);
        grad.addColorStop(Math.min(0.9, featherRatio), `rgba(${r},${g},${b},${scrimOpacity * 0.7})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, scrimH);
      } else if (scrimType === 'center-band') {
        const bandH = height * heightPercent;
        const startY = (height - bandH) / 2;
        const grad = ctx.createLinearGradient(0, startY, 0, startY + bandH);
        grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
        grad.addColorStop(0.3, `rgba(${r},${g},${b},${scrimOpacity})`);
        grad.addColorStop(0.7, `rgba(${r},${g},${b},${scrimOpacity})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, startY, width, bandH);
      }
      ctx.restore();
    }
  }
  
  if ((style.backgroundTintAmount || 0) > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1.0, style.backgroundTintAmount!);
    ctx.fillStyle = style.backgroundTintColor || '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 5. Scanline Overlay (Retro / Cyberpunk FX)
  if (style.enableScanlines) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    const scanlineHeight = Math.max(2, Math.floor((4 / 1080) * width));
    for (let y = 0; y < height; y += scanlineHeight * 2) {
      ctx.fillRect(0, y, width, scanlineHeight);
    }
    ctx.restore();
  }

  // 6. Radial Vignette Overlay (Cinematic FX)
  if (style.enableVignette) {
    ctx.save();
    const radius = Math.max(width, height) * 0.75;
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      radius * 0.3,
      width / 2,
      height / 2,
      radius
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 7. Audio Spectrum Bars Visualizer FX
  if (style.enableAudioSpectrum) {
    ctx.save();
    const barCount = 32;
    const barWidth = (width * 0.8) / barCount;
    const startX = (width - width * 0.8) / 2;
    const bottomY = height * (style.enableLetterbox ? 0.86 : 0.94);

    for (let i = 0; i < barCount; i++) {
      const freq = Math.sin(currentTime * 8 + i * 0.4) * 0.5 + 0.5;
      const noise = Math.cos(currentTime * 12 + i * 0.7) * 0.3 + 0.3;
      const barHeight = (freq * 0.7 + noise * 0.3) * (height * 0.12);
      const x = startX + i * barWidth;

      ctx.fillStyle = i % 2 === 0
        ? (style.activeTextColor || '#34d399')
        : (style.glowColor || '#fbbf24');
      ctx.globalAlpha = 0.45;
      ctx.fillRect(x + 2, bottomY - barHeight, barWidth - 4, barHeight);
    }
    ctx.restore();
  }

  // 8. 2.39:1 Cinema Letterbox Bars Overlay
  if (style.enableLetterbox) {
    const letterboxHeight = height * 0.12;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, letterboxHeight);
    ctx.fillRect(0, height - letterboxHeight, width, letterboxHeight);
  }

  // 8.5. Social Media Progress Bar Overlay
  if (style.enableProgressBar && duration > 0) {
    const progress = Math.min(1.0, Math.max(0.0, currentTime / duration));
    const barHeight = Math.max(4, Math.floor((6 / 1080) * width));
    
    // Background track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, height - barHeight, width, barHeight);
    
    // Fill track
    ctx.fillStyle = style.activeTextColor || '#34d399';
    ctx.fillRect(0, height - barHeight, width * progress, barHeight);
  }

  // B1/B11: Beat strength - real value from Web Audio AnalyserNode (via ctx side-channel), falls back to BPM simulation
  const realBeat = (ctx as any)._beatStrength as number | undefined;
  const beatPhase = (currentTime * 2.0) % 1.0;
  const simulatedBeat = Math.max(0, Math.sin(beatPhase * Math.PI * 2) * (style.beatSyncSensitivity ?? 1.0));
  const beatStrength = style.enableBeatSync ? Math.min(1.0, (realBeat !== undefined ? realBeat : simulatedBeat) * (style.beatSyncSensitivity ?? 1.0)) : 0;

  // B11: Beat Shake Canvas
  if (style.enableBeatShake && beatStrength > 0.6) {
    const shakeAmt = (beatStrength - 0.6) * (style.beatShakeIntensity ?? 5) * (width / 1080);
    ctx.save();
    ctx.translate((Math.random() - 0.5) * shakeAmt * 2, (Math.random() - 0.5) * shakeAmt * 2);
  }

  // B2: Beat Background Pulse (scale background brightness)
  if (style.enableBeatBackgroundPulse && beatStrength > 0.5) {
    const pulseIntensity = style.beatPulseIntensity ?? 0.05;
    ctx.save();
    ctx.globalAlpha = (beatStrength - 0.5) * pulseIntensity * 4;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // OPTIONAL LYRICS CHECK: If showLyrics is false, skip text rendering altogether
  if (style.showLyrics === false) {
    ctx.restore();
    return;
  }

  // 9. Find Active Lyric Lines Window with Smooth Continuous Anchor
  const linesToShow = style.linesToShow || 3;
  const shouldHideInactive = style.hideInactiveLyrics ?? (linesToShow === 1 || style.animationType === 'clean-subtitle');
  let activeIndex = lyrics.findIndex(
    (l) => currentTime >= l.startTime && currentTime <= l.endTime
  );

  // If shouldHideInactive is enabled and no lyric is currently active at this moment:
  if (shouldHideInactive && activeIndex === -1 && lyrics.length > 0) {
    // Check if we are in smooth exit fade (within 0.25s of a line ending)
    const justEndedIdx = lyrics.findIndex(
      (l) => currentTime > l.endTime && currentTime <= l.endTime + 0.25
    );
    if (justEndedIdx === -1) {
      // In an instrumental intro / break / outro -> Render NOTHING!
      ctx.restore();
      return;
    }
    activeIndex = justEndedIdx;
  }

  // If in a gap between lines for multi-line mode, anchor smoothly to nearest previous line
  if (activeIndex === -1 && lyrics.length > 0) {
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime < lyrics[i].startTime) {
        activeIndex = Math.max(0, i - 1);
        break;
      }
    }
    if (activeIndex === -1 && currentTime > lyrics[lyrics.length - 1].endTime) {
      activeIndex = lyrics.length - 1;
    }
  }

  let startIndex = 0;
  if (activeIndex !== -1) {
    startIndex = Math.max(0, activeIndex - Math.floor(linesToShow / 2));
  }
  startIndex = Math.min(startIndex, Math.max(0, lyrics.length - linesToShow));

  const visibleLines = lyrics.slice(startIndex, startIndex + linesToShow);

  if (visibleLines.length === 0) {
    ctx.restore();
    return;
  }

  // Calculate Base Font Metrics & Scaling
  const fontScaleMulti = style.textPosition?.scale ?? 1.0;
  const baseScale = (width / 1080) * fontScaleMulti;
  const fontSizePx = Math.round(style.fontSize * baseScale);
  const strokeWidthPx = Math.round((style.strokeWidth || 4) * baseScale);
  const glowIntensityPx = Math.round((style.glowIntensity || 20) * baseScale);

  ctx.font = `${style.fontStyle || 'normal'} ${style.fontWeight || 'bold'} ${fontSizePx}px "${style.fontFamily || 'Inter'}", sans-serif`;
  ctx.textAlign = style.textAlign || 'center';
  ctx.textBaseline = 'middle';

  const lineSpacing = fontSizePx * (style.lineHeightMultiplier ?? 1.45);
  const totalTextHeight = (visibleLines.length - 1) * lineSpacing;

  // Position Preset Calculation (Top, Center, Bottom, Custom X/Y)
  const posPreset = style.textPosition?.preset ?? 'center';
  let targetCenterY = height / 2;
  if (posPreset === 'top') targetCenterY = height * 0.25;
  else if (posPreset === 'bottom') targetCenterY = height * 0.78;
  else if (posPreset === 'custom') {
    targetCenterY = height * ((style.textPosition?.offsetYPercent ?? 50) / 100);
  }

  const startY = targetCenterY - totalTextHeight / 2;

  // B13: Ticker / Horizontal Scroll Mode
  if (style.enableTickerMode) {
    ctx.save();
    const tickerSpeed = (style.tickerSpeed ?? 80) * (width / 1080);
    const totalTextW = Math.max(...visibleLines.map(l => ctx.measureText(l.text).width));
    const tickerX = width - ((currentTime * tickerSpeed) % (width + totalTextW));
    ctx.translate(tickerX - width / 2, 0);
  }

  // B9: Full Subtitle Box behind all visible lyrics
  if (style.enableSubtitleBox) {
    ctx.save();
    const sbPadX = (style.subtitleBoxPaddingX ?? 40) * baseScale;
    const sbPadY = (style.subtitleBoxPaddingY ?? 20) * baseScale;
    const sbRadius = (style.subtitleBoxBorderRadius ?? 16) * baseScale;
    const sbOpacity = style.subtitleBoxOpacity ?? 0.6;
    const sbColor = style.subtitleBoxColor || '#000000';
    const hexM = sbColor.match(/^#([0-9a-f]{6})$/i);
    if (hexM) {
      const r2 = parseInt(hexM[1].substring(0,2),16), g2 = parseInt(hexM[1].substring(2,4),16), b2 = parseInt(hexM[1].substring(4,6),16);
      ctx.fillStyle = `rgba(${r2},${g2},${b2},${sbOpacity})`;
    } else { ctx.fillStyle = sbColor; }
    const boxW = width * ((style.lyricsMaxWidthPercent ?? 90) / 100) + sbPadX * 2;
    const boxH = totalTextHeight + fontSizePx + sbPadY * 2;
    const boxX = width / 2 - boxW / 2;
    const boxY = startY - fontSizePx / 2 - sbPadY;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, sbRadius);
    ctx.fill();
    ctx.restore();
  }

  // Render Each Line with Smooth Continuous Easing
  visibleLines.forEach((line, idx) => {
    const lineY = startY + idx * lineSpacing;
    const isCurrentlyActive = currentTime >= line.startTime && currentTime <= line.endTime;
    const isPast = currentTime > line.endTime;

    let rawProgress = 0;
    if (isCurrentlyActive) {
      const speedMap = { slow: 0.5, normal: 1.0, fast: 2.0, instant: 5.0 };
      const speedMulti = speedMap[style.animationSpeed ?? 'normal'] ?? 1.0;
      rawProgress = Math.min(1.0, (currentTime - line.startTime) / Math.max(0.01, line.endTime - line.startTime) * speedMulti);
    } else if (isPast) {
      rawProgress = 1.0;
    }

    const lineProgress = applyMotionCurve(rawProgress, style.motionCurve);

    const safeZone = (style.lyricsSafeZonePercent ?? 5) / 100;
    let posX = width * ((style.textPosition?.offsetXPercent ?? 50) / 100);
    if (posPreset !== 'custom') {
      if (style.textAlign === 'left') posX = width * (safeZone + 0.05);
      else if (style.textAlign === 'right') posX = width * (1.0 - safeZone - 0.05);
      else posX = width * 0.5;
    } else {
      posX = Math.max(width * safeZone, Math.min(width * (1 - safeZone), posX));
    }

    const rawTextWidth = ctx.measureText(line.text).width;
    const maxWidth = width * ((style.lyricsMaxWidthPercent ?? 90) / 100);
    const scaleFactor = rawTextWidth > maxWidth ? maxWidth / rawTextWidth : 1.0;

    ctx.save();
    ctx.scale(scaleFactor, scaleFactor);

    // Smooth Entrance Fade, Slide Offset & Focus Scale
    // B3: Perspective fade - lines further from active get dimmer
    let perspectiveDist = Math.abs(idx - visibleLines.findIndex((l2) => currentTime >= l2.startTime && currentTime <= l2.endTime));
    if (perspectiveDist < 0) perspectiveDist = 0;
    const perspectiveFade = style.enableLinePerspectiveFade ? Math.max(0.15, 1.0 - perspectiveDist * (style.perspectiveFadeStrength ?? 0.3)) : 1.0;
    let fadeAlpha = isCurrentlyActive ? 1.0 : isPast ? (0.45 * perspectiveFade) : (0.25 * perspectiveFade);
    if (shouldHideInactive && !isCurrentlyActive) {
      if (isPast && currentTime <= line.endTime + 0.25) {
        fadeAlpha = Math.max(0.0, 1.0 - (currentTime - line.endTime) / 0.25);
      } else {
        fadeAlpha = 0.0;
      }
    }
    const isCleanSubtitle = style.animationType === 'clean-subtitle';
    const activeExtraScale = isCleanSubtitle ? 1.0 : (style.enableFontWeightPop ? (style.activeLineExtraScale ?? 1.1) : 1.05);
    // B1: Beat-sync drives scale pulse on active line
    const beatScaleBoost = (!isCleanSubtitle && style.enableBeatSync && (style.beatSyncTarget ?? 'lyrics') !== 'background')
      ? beatStrength * 0.08 : 0;
    let focusScale = isCurrentlyActive ? (activeExtraScale + beatScaleBoost) : (isCleanSubtitle ? 1.0 : 0.90); // scale up active, shrink inactive
    if (isCurrentlyActive && rawProgress < 0.15) {
      const enterRatio = rawProgress / 0.15;
      const transStyle = style.lineTransitionStyle ?? 'dissolve';
      if (transStyle === 'instant') {
        fadeAlpha = 1.0;
        focusScale = activeExtraScale;
      } else if (transStyle === 'zoom-in') {
        fadeAlpha = 0.5 + enterRatio * 0.5;
        focusScale = 0.6 + enterRatio * (activeExtraScale - 0.6);
      } else if (transStyle === 'wipe-right') {
        // Handled via clip in rendering; just fade here
        fadeAlpha = enterRatio;
        focusScale = activeExtraScale;
      } else {
        // Default: dissolve
        fadeAlpha = 0.3 + enterRatio * 0.7;
        focusScale = 0.90 + enterRatio * 0.15;
      }
    }
    
    ctx.scale(focusScale, focusScale);
    const totalScale = scaleFactor * focusScale;
    const renderPosX = posX / totalScale;
    const renderLineY = lineY / totalScale;

    ctx.globalAlpha = Math.min(1.0, Math.max(0.0, fadeAlpha));

    if (isCurrentlyActive && style.enableActiveLineBackground) {
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      const pillPaddingX = (style.activePillPaddingX ?? 30) * baseScale;
      const pillPaddingY = (style.activePillPaddingY ?? 15) * baseScale;
      const pillRadius = (style.activePillBorderRadius ?? 20) * baseScale;
      const pillOpacity = style.activePillOpacity ?? 0.5;
      const pillColor = style.activePillColor || '#000000';
      // Parse hex color and apply opacity
      const hexMatch = pillColor.match(/^#([0-9a-f]{6})$/i);
      if (hexMatch) {
        const r = parseInt(hexMatch[1].substring(0,2), 16);
        const g = parseInt(hexMatch[1].substring(2,4), 16);
        const b = parseInt(hexMatch[1].substring(4,6), 16);
        ctx.fillStyle = `rgba(${r},${g},${b},${pillOpacity})`;
      } else {
        ctx.fillStyle = pillColor;
        ctx.globalAlpha = pillOpacity;
      }
      if ((style.activePillBlur ?? 0) > 0) {
        ctx.filter = `blur(${style.activePillBlur}px)`;
      }
      const pillWidth = rawTextWidth + pillPaddingX * 2;
      const pillHeight = fontSizePx + pillPaddingY * 2;
      let bgX = renderPosX - pillPaddingX;
      if (style.textAlign === 'center') bgX = renderPosX - pillWidth / 2;
      else if (style.textAlign === 'right') bgX = renderPosX - rawTextWidth - pillPaddingX;
      const bgY = renderLineY - pillHeight / 2;
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, pillWidth, pillHeight, pillRadius);
      ctx.fill();
      ctx.restore();
    }

    if (isCurrentlyActive) {
      if (style.animationType === 'bounce') {
        const waveAmp = style.waveAmplitude ?? 1.0;
        const bounceOffset = Math.abs(Math.sin(lineProgress * Math.PI * 2)) * (10 * baseScale * waveAmp);
        ctx.translate(0, -bounceOffset / totalScale);
      } else if (style.animationType === 'pop') {
        const popScale = 1 + Math.sin(Math.min(1, lineProgress * 2) * Math.PI) * 0.08;
        ctx.translate(renderPosX, renderLineY);
        ctx.scale(popScale, popScale);
        ctx.translate(-renderPosX, -renderLineY);
      } else if (style.animationType === 'slide-up') {
        const staggerOffset = style.enableStaggeredEntrance ? idx * ((style.staggerDelayMs ?? 80) / 1000) : 0;
        const staggeredProgress = Math.max(0, lineProgress - staggerOffset);
        const slideOffset = (1 - Math.min(1, staggeredProgress * 3)) * (20 * baseScale);
        ctx.translate(0, slideOffset / totalScale);
      } else if (style.animationType === 'blur-reveal') {
        const blurAmount = (1 - Math.min(1, lineProgress * 2)) * 15;
        if (blurAmount > 0.1) {
          ctx.filter = `blur(${blurAmount}px)`;
        }
      }
    }

    let displayLineText = line.text;

    // Feature 14: Text Transform
    if (style.textTransform === 'uppercase') displayLineText = displayLineText.toUpperCase();
    else if (style.textTransform === 'lowercase') displayLineText = displayLineText.toLowerCase();
    else if (style.textTransform === 'capitalize') displayLineText = displayLineText.replace(/\b\w/g, (c: string) => c.toUpperCase());

    // Feature 15: Emoji/Icon Prefix
    if (style.enableLinePrefix && style.linePrefixEmoji) {
      displayLineText = style.linePrefixEmoji + ' ' + displayLineText;
    }

    if (style.animationType === 'typewriter') {
      const sourceText = displayLineText;
      if (isCurrentlyActive) {
        const charsToShow = Math.max(1, Math.floor(lineProgress * sourceText.length));
        displayLineText = sourceText.substring(0, charsToShow);
      } else if (!isPast) {
        displayLineText = '';
      }
    }

    // High-Performance Multi-Layer Glow
    if (style.glowIntensity > 0 && displayLineText.length > 0) {
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.strokeStyle = style.glowColor || style.activeTextColor;
      let pulseGlow = glowIntensityPx;
      if (style.animationType === 'neon-pulse' && isCurrentlyActive) {
        pulseGlow = glowIntensityPx * (1 + Math.sin(currentTime * 15) * 0.6);
      }
      ctx.lineWidth = strokeWidthPx + Math.round(pulseGlow * (isCurrentlyActive ? 0.6 : 0.2));
      ctx.globalAlpha = (ctx.globalAlpha * (isCurrentlyActive ? 0.35 : 0.15));
      ctx.strokeText(displayLineText, renderPosX, renderLineY);
      ctx.restore();
    }

    // B6: Multi-layer shadow spread
    if ((style.shadowSpreadLayers ?? 1) > 1 && displayLineText.length > 0) {
      const layers = Math.min(5, style.shadowSpreadLayers ?? 1);
      const spreadColor = style.shadowSpreadColor || '#000000';
      ctx.save();
      for (let sl = 1; sl < layers; sl++) {
        const spreadDist = sl * 3 * baseScale;
        ctx.shadowColor = spreadColor;
        ctx.shadowBlur = spreadDist * 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = spreadColor;
        ctx.fillText(displayLineText, renderPosX, renderLineY);
      }
      ctx.restore();
    }

    const hasDropShadow = (style.dropShadowBlur ?? 0) > 0 || (style.dropShadowOffsetX ?? 0) !== 0 || (style.dropShadowOffsetY ?? 0) !== 0;
    if (hasDropShadow) {
      ctx.shadowColor = style.dropShadowColor || '#000000';
      ctx.shadowBlur = (style.dropShadowBlur || 0) * baseScale;
      ctx.shadowOffsetX = (style.dropShadowOffsetX || 0) * baseScale;
      ctx.shadowOffsetY = (style.dropShadowOffsetY || 0) * baseScale;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    if (strokeWidthPx > 0 && displayLineText.length > 0) {
      ctx.strokeStyle = style.strokeColor || '#000000';
      ctx.lineWidth = strokeWidthPx;
      ctx.strokeText(displayLineText, renderPosX, renderLineY);
    }

    // Base inactive text fill (Feature 4: Gradient Text support)
    if (displayLineText.length > 0) {
      if (style.enableGradientText && style.gradientTextFrom && style.gradientTextTo) {
        const angleRad = ((style.gradientTextAngle ?? 0) * Math.PI) / 180;
        const textW = ctx.measureText(displayLineText).width / totalScale;
        const gx1 = renderPosX - (Math.cos(angleRad) * textW) / 2;
        const gy1 = renderLineY - (Math.sin(angleRad) * fontSizePx / totalScale) / 2;
        const gx2 = renderPosX + (Math.cos(angleRad) * textW) / 2;
        const gy2 = renderLineY + (Math.sin(angleRad) * fontSizePx / totalScale) / 2;
        const textGrad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
        textGrad.addColorStop(0, style.gradientTextFrom);
        textGrad.addColorStop(1, style.gradientTextTo);
        ctx.fillStyle = textGrad;
      } else {
        ctx.fillStyle = style.textColor;
      }
      ctx.fillText(displayLineText, renderPosX, renderLineY);
    }

    // OpenReel Vector Wipe Karaoke Engine (100% Flicker-Free in VLC & QuickTime)
    if (style.animationType === 'karaoke' && (isCurrentlyActive || isPast)) {
      const textWidth = ctx.measureText(displayLineText).width;
      let startX = renderPosX;
      if (style.textAlign === 'center') startX = renderPosX - (textWidth / totalScale) / 2;
      else if (style.textAlign === 'right') startX = renderPosX - (textWidth / totalScale);

      const wipeWidth = isPast ? (textWidth / totalScale) + 50 : (textWidth / totalScale) * Math.min(1.0, Math.max(0.0, lineProgress));

      if (wipeWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(startX - 10, renderLineY - (fontSizePx / totalScale), wipeWidth + 10, (fontSizePx / totalScale) * 2);
        ctx.clip();

        // Feature 13: Dual-Color Karaoke Gradient
        if (style.enableDualColorKaraoke && style.karaokeSecondaryColor) {
          const grad = ctx.createLinearGradient(startX, 0, startX + textWidth / totalScale, 0);
          grad.addColorStop(0, style.activeTextColor);
          grad.addColorStop(1, style.karaokeSecondaryColor);
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = style.activeTextColor;
        }
        ctx.fillText(displayLineText, renderPosX, renderLineY);
        ctx.restore();
      }
    } else if (style.animationType === 'glitch' && isCurrentlyActive && displayLineText.length > 0) {
      const glitchOffset = Math.sin(currentTime * 30) * (4 * baseScale);
      ctx.fillStyle = 'rgba(255, 0, 85, 0.8)';
      ctx.fillText(displayLineText, renderPosX - glitchOffset / totalScale, renderLineY);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.fillText(displayLineText, renderPosX + glitchOffset / totalScale, renderLineY);
      ctx.fillStyle = style.activeTextColor;
      ctx.fillText(displayLineText, renderPosX, renderLineY);
    } else if (isCurrentlyActive && displayLineText.length > 0) {
      ctx.fillStyle = style.activeTextColor;
      ctx.fillText(displayLineText, renderPosX, renderLineY);
    }

    // B14: Pulse Glow Ring around active line
    if (isCurrentlyActive && style.enablePulseGlowRing && displayLineText.length > 0) {
      ctx.save();
      const ringPhase = (currentTime * (style.pulseGlowRingSpeed ?? 1.5)) % 1.0;
      const ringRadius = (rawTextWidth / totalScale / 2) + (ringPhase * fontSizePx / totalScale * 1.5);
      const ringAlpha = (1 - ringPhase) * 0.5;
      const ringColor = style.pulseGlowRingColor || style.glowColor || '#fbbf24';
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3 * baseScale / totalScale;
      ctx.globalAlpha = ringAlpha;
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.ellipse(renderPosX, renderLineY, Math.max(10, ringRadius), Math.max(5, (fontSizePx / totalScale * 0.7) + ringPhase * 20), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  });

  // B13: Close ticker translate
  if (style.enableTickerMode) { ctx.restore(); }

  // B8: Watermark / Logo Overlay
  if (style.enableWatermark && style.watermarkUrl && (ctx as any)._watermarkImg) {
    const wImg = (ctx as any)._watermarkImg as HTMLImageElement;
    if (wImg.complete && wImg.naturalWidth > 0) {
      const wSize = width * ((style.watermarkSizePercent ?? 12) / 100);
      const wRatio = wImg.naturalHeight / wImg.naturalWidth;
      const wH = wSize * wRatio;
      const margin = width * 0.03;
      let wx = margin, wy = margin;
      const pos = style.watermarkPosition ?? 'bottom-right';
      if (pos === 'top-right') { wx = width - wSize - margin; wy = margin; }
      else if (pos === 'bottom-left') { wx = margin; wy = height - wH - margin; }
      else if (pos === 'bottom-right') { wx = width - wSize - margin; wy = height - wH - margin; }
      else if (pos === 'center') { wx = (width - wSize) / 2; wy = (height - wH) / 2; }
      ctx.save();
      ctx.globalAlpha = style.watermarkOpacity ?? 0.7;
      ctx.drawImage(wImg, wx, wy, wSize, wH);
      ctx.restore();
    }
  }

  ctx.restore();
}
