import type { LyricLine, LyricWord } from '../types';

/**
 * Parses timestamp string like "01:23.45" or "01:23.456" or "83.45" into seconds
 */
export function parseTimestamp(timeStr: string): number {
  const cleanStr = timeStr.trim();
  const parts = cleanStr.split(':');
  
  if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return (isNaN(minutes) ? 0 : minutes * 60) + (isNaN(seconds) ? 0 : seconds);
  } else if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return (isNaN(hours) ? 0 : hours * 3600) + (isNaN(minutes) ? 0 : minutes * 60) + (isNaN(seconds) ? 0 : seconds);
  }
  
  const sec = parseFloat(cleanStr);
  return isNaN(sec) ? 0 : sec;
}

/**
 * Formats a list of LyricLine objects into standard LRC markup text format
 */
export function formatLyricCuesToLrc(lyrics: LyricLine[]): string {
  return lyrics
    .map((line) => {
      const m = Math.floor(line.startTime / 60).toString().padStart(2, '0');
      const s = (line.startTime % 60).toFixed(2).padStart(5, '0');
      return `[${m}:${s}]${line.text}`;
    })
    .join('\n');
}

/**
 * Formats a list of LyricLine objects into SubRip (SRT) format
 */
export function formatLyricCuesToSrt(lyrics: LyricLine[]): string {
  const formatSrtTime = (sec: number) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, '0');
    return `${h}:${m}:${s},${ms}`;
  };

  return lyrics
    .map((line, idx) => {
      return `${idx + 1}\n${formatSrtTime(line.startTime)} --> ${formatSrtTime(line.endTime)}\n${line.text}\n`;
    })
    .join('\n');
}

/**
 * Formats a list of LyricLine objects into WebVTT format
 */
export function formatLyricCuesToVtt(lyrics: LyricLine[]): string {
  const formatVttTime = (sec: number) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  };

  return 'WEBVTT\n\n' + lyrics
    .map((line, idx) => {
      return `${idx + 1}\n${formatVttTime(line.startTime)} --> ${formatVttTime(line.endTime)}\n${line.text}\n`;
    })
    .join('\n');
}

/**
 * Parses word-level inline timestamps in LRC: e.g. "Hello <00:10.50> world <00:11.20>"
 */
function parseInlineWords(text: string, lineStartTime: number): { cleanedText: string; words: LyricWord[] } {
  const wordRegex = /<(\d{2}:\d{2}(?:\.\d{1,3})?)>\s*([^<]+)/g;
  const words: LyricWord[] = [];
  let match: RegExpExecArray | null;
  
  const firstTagIndex = text.indexOf('<');
  let cleanedText = '';
  
  if (firstTagIndex > 0) {
    const initialText = text.substring(0, firstTagIndex).trim();
    if (initialText) {
      cleanedText += initialText + ' ';
    }
  }

  while ((match = wordRegex.exec(text)) !== null) {
    const timeSec = parseTimestamp(match[1]);
    const wordText = match[2].trim();
    if (wordText) {
      words.push({
        text: wordText,
        startTime: timeSec,
        endTime: timeSec + 0.5,
      });
      cleanedText += wordText + ' ';
    }
  }

  for (let i = 0; i < words.length - 1; i++) {
    words[i].endTime = words[i + 1].startTime;
  }

  const finalCleaned = cleanedText.trim() || text.replace(/<[^>]+>/g, '').trim();

  if (words.length === 0 && finalCleaned) {
    const rawWords = finalCleaned.split(/\s+/);
    const durationPerWord = 0.4;
    rawWords.forEach((w, idx) => {
      words.push({
        text: w,
        startTime: lineStartTime + idx * durationPerWord,
        endTime: lineStartTime + (idx + 1) * durationPerWord,
      });
    });
  }

  return { cleanedText: finalCleaned, words };
}

/**
 * Parses standard `.lrc` formatted text
 */
export function parseLrc(content: string): LyricLine[] {
  const lines = content.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timestampRegex = /\[(\d{2,3}:\d{2}(?:\.\d{1,3})?)\]/g;

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('[ar:') || trimmed.startsWith('[ti:') || trimmed.startsWith('[al:') || trimmed.startsWith('[by:')) {
      return;
    }

    const matches = Array.from(trimmed.matchAll(timestampRegex));
    if (matches.length === 0) return;

    const textWithoutTime = trimmed.replace(timestampRegex, '').trim();

    matches.forEach((match) => {
      const startTime = parseTimestamp(match[1]);
      if (!textWithoutTime) {
        // Blank timestamp marker (e.g. [00:14.00]) -> acts as explicit end marker
        result.push({
          id: `lrc-blank-${lineIdx}-${Math.random().toString(36).substr(2, 6)}`,
          startTime,
          endTime: startTime,
          text: '',
        });
        return;
      }

      const { cleanedText, words } = parseInlineWords(textWithoutTime, startTime);

      result.push({
        id: `lrc-${lineIdx}-${Math.random().toString(36).substr(2, 6)}`,
        startTime,
        endTime: startTime + 4,
        text: cleanedText,
        words,
      });
    });
  });

  result.sort((a, b) => a.startTime - b.startTime);

  // Filter out blank markers while using their timestamps to end the preceding line
  const filteredResult: LyricLine[] = [];
  for (let i = 0; i < result.length; i++) {
    const item = result[i];
    if (!item.text) {
      // Empty marker -> set end time on previous valid line
      if (filteredResult.length > 0) {
        filteredResult[filteredResult.length - 1].endTime = item.startTime;
      }
      continue;
    }
    filteredResult.push(item);
  }

  for (let i = 0; i < filteredResult.length; i++) {
    if (i < filteredResult.length - 1) {
      const nextStart = filteredResult[i + 1].startTime;
      const gap = nextStart - filteredResult[i].startTime;
      // If there is a long instrumental break (> 5.5s), cap line duration to natural length
      if (gap > 5.5) {
        const estimatedDuration = Math.max(3.5, (filteredResult[i].words?.length || 4) * 0.65);
        filteredResult[i].endTime = Math.min(nextStart, filteredResult[i].startTime + estimatedDuration);
      } else {
        filteredResult[i].endTime = nextStart;
      }
    } else {
      filteredResult[i].endTime = filteredResult[i].startTime + Math.max(4.0, (filteredResult[i].words?.length || 4) * 0.65);
    }

    const currentWords = filteredResult[i].words;
    if (currentWords && currentWords.length > 0) {
      const lineDuration = filteredResult[i].endTime - filteredResult[i].startTime;
      const wordCount = currentWords.length;
      currentWords.forEach((w, wIdx) => {
        w.startTime = filteredResult[i].startTime + (wIdx / wordCount) * lineDuration;
        w.endTime = filteredResult[i].startTime + ((wIdx + 1) / wordCount) * lineDuration;
      });
    }
  }

  return filteredResult;
}

/**
 * Parses WebVTT format text
 */
export function parseVtt(content: string): LyricLine[] {
  const lines = content.split(/\r?\n/);
  const result: LyricLine[] = [];
  const cueTimeRegex = /(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/;

  let currentStart = 0;
  let currentEnd = 0;
  let currentText = '';

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed === 'WEBVTT' || trimmed.startsWith('NOTE') || !trimmed) {
      return;
    }

    const match = trimmed.match(cueTimeRegex);
    if (match) {
      if (currentText && currentEnd > currentStart) {
        result.push({
          id: `vtt-${idx}-${Math.random().toString(36).substr(2, 6)}`,
          startTime: currentStart,
          endTime: currentEnd,
          text: currentText.trim(),
        });
      }
      currentStart = parseTimestamp(match[1]);
      currentEnd = parseTimestamp(match[2]);
      currentText = '';
    } else if (currentEnd > 0) {
      currentText += (currentText ? ' ' : '') + trimmed;
    }
  });

  if (currentText && currentEnd > currentStart) {
    result.push({
      id: `vtt-last`,
      startTime: currentStart,
      endTime: currentEnd,
      text: currentText.trim(),
    });
  }

  return result.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Unescapes RTF format unicode characters (e.g. \u2343) and strips RTF markup tags.
 */
export function unescapeRtf(rtfContent: string): string {
  if (!rtfContent || (!rtfContent.includes('\\rtf') && !rtfContent.includes('\\u23') && !rtfContent.includes('\\ansi'))) {
    return rtfContent;
  }

  // Replace RTF unicode escapes \u2343 or \u-4234
  const unescaped = rtfContent.replace(/\\u(-?\d+)\s?/g, (_, valStr) => {
    let val = parseInt(valStr, 10);
    if (val < 0) val += 65536;
    return String.fromCharCode(val);
  });

  const lines = unescaped.split(/\r?\n/);
  const cleanedLines: string[] = [];

  lines.forEach((line) => {
    // Strip RTF control words like \pard, \f0, \fs24, \cf0, \partightenfactor0, {}, etc.
    const clean = line
      .replace(/\\[a-zA-Z0-9-]+\s?/g, '')
      .replace(/[\{\}]/g, '')
      .trim();

    if (
      clean &&
      !clean.startsWith('rtf') &&
      !clean.startsWith('ansi') &&
      !clean.startsWith('fonttbl') &&
      !clean.startsWith('colortbl') &&
      !clean.startsWith('expandedcolortbl') &&
      !clean.startsWith('margl')
    ) {
      cleanedLines.push(clean);
    }
  });

  return cleanedLines.join('\n');
}

/**
 * Parses JSON format text
 */
export function parseJson(content: string): LyricLine[] | null {
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'text' in data[0] && 'startTime' in data[0]) {
      return data as LyricLine[];
    }
  } catch (e) {
    // Not valid JSON
  }
  return null;
}

/**
 * Parses SubRip (SRT) format text
 */
export function parseSrt(content: string): LyricLine[] {
  const lines = content.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timeRegex = /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/;

  const parseSrtTimestamp = (ts: string) => {
    const [time, ms] = ts.split(',');
    const [h, m, s] = time.split(':');
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
  };

  let currentStart = 0;
  let currentEnd = 0;
  let currentText = '';

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      if (currentText && currentEnd > currentStart) {
        result.push({
          id: `srt-${i}-${Math.random().toString(36).substr(2, 6)}`,
          startTime: currentStart,
          endTime: currentEnd,
          text: currentText.trim(),
        });
        currentText = '';
        currentStart = 0;
        currentEnd = 0;
      }
      continue;
    }

    if (/^\d+$/.test(trimmed) && !currentText) {
      continue;
    }

    const match = trimmed.match(timeRegex);
    if (match) {
      currentStart = parseSrtTimestamp(match[1]);
      currentEnd = parseSrtTimestamp(match[2]);
    } else if (currentEnd > 0) {
      currentText += (currentText ? ' ' : '') + trimmed;
    }
  }

  if (currentText && currentEnd > currentStart) {
    result.push({
      id: `srt-last`,
      startTime: currentStart,
      endTime: currentEnd,
      text: currentText.trim(),
    });
  }

  return result.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Auto-detects and parses JSON, SRT, LRC, VTT, RTF, or plain text
 */
export function parseLyricCues(rawContent: string): LyricLine[] {
  if (!rawContent || !rawContent.trim()) return [];

  const jsonData = parseJson(rawContent);
  if (jsonData) return jsonData;

  const content = unescapeRtf(rawContent.trim());

  if (content.startsWith('WEBVTT')) {
    return parseVtt(content);
  } else if (/\d{2}:\d{2}:\d{2},\d{3}\s*-->/.test(content)) {
    return parseSrt(content);
  } else if (/\[\d{2}:\d{2}/.test(content)) {
    return parseLrc(content);
  }

  const rawLines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return rawLines.map((lineText, idx) => {
    const startTime = idx * 4;
    const endTime = (idx + 1) * 4;
    const words = lineText.trim().split(/\s+/).map((w, wIdx, arr) => ({
      text: w,
      startTime: startTime + (wIdx / arr.length) * 4,
      endTime: startTime + ((wIdx + 1) / arr.length) * 4,
    }));

    return {
      id: `plain-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      startTime,
      endTime,
      text: lineText.trim(),
      words,
    };
  });
}

/**
 * Distributes lyrics evenly across total audio duration (with optional intro padding)
 */
export function autoSpreadLyricTimings(
  lyrics: LyricLine[],
  audioDurationSec: number,
  introOffsetSec: number = 8
): LyricLine[] {
  if (!lyrics || lyrics.length === 0) return [];
  const validDuration = Math.max(10, audioDurationSec || 180);
  const usableDuration = Math.max(10, validDuration - introOffsetSec - 6);
  const timePerLine = usableDuration / lyrics.length;

  return lyrics.map((line, idx) => {
    const startTime = introOffsetSec + idx * timePerLine;
    const endTime = startTime + timePerLine * 0.95;

    const words = line.text.split(/\s+/).map((w, wIdx, arr) => ({
      text: w,
      startTime: startTime + (wIdx / arr.length) * (endTime - startTime),
      endTime: startTime + ((wIdx + 1) / arr.length) * (endTime - startTime),
    }));

    return {
      ...line,
      startTime: Math.round(startTime * 100) / 100,
      endTime: Math.round(endTime * 100) / 100,
      words,
    };
  });
}

