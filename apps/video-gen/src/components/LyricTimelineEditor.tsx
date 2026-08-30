import React, { useState } from 'react';
import type { LyricLine } from '../types';
import { Plus, Trash2, Clock, Play, FileText, Upload, Download, Sparkles, ChevronDown, ChevronUp, RotateCcw, Crosshair } from 'lucide-react';
import { parseLyricCues, formatLyricCuesToLrc, formatLyricCuesToSrt, formatLyricCuesToVtt } from '../utils/lrcParser';
import { SAMPLE_PRESETS } from '../data/samplePresets';

interface LyricTimelineEditorProps {
  lyrics: LyricLine[];
  onUpdateLyrics: (newLyrics: LyricLine[]) => void;
  onSeek: (timeSec: number) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  rawLrcText: string;
  onRawTextChange: (text: string) => void;
  audioDuration?: number;
  currentTime?: number;
}

export const LyricTimelineEditor: React.FC<LyricTimelineEditorProps> = ({
  lyrics,
  onUpdateLyrics,
  onSeek,
  onFileUpload,
  rawLrcText,
  onRawTextChange,
  audioDuration,
  currentTime = 0,
}) => {
  const [showRawEditor, setShowRawEditor] = useState(false);

  const updateLineText = (id: string, text: string) => {
    onUpdateLyrics(lyrics.map((l) => (l.id === id ? { ...l, text } : l)));
  };

  const updateLineTiming = (id: string, field: 'startTime' | 'endTime', valueSec: number) => {
    onUpdateLyrics(
      lyrics.map((l) => (l.id === id ? { ...l, [field]: Math.max(0, valueSec) } : l))
    );
  };

  const deleteLine = (id: string) => {
    onUpdateLyrics(lyrics.filter((l) => l.id !== id));
  };

  const addLine = () => {
    const lastEnd = lyrics.length > 0 ? lyrics[lyrics.length - 1].endTime : 0;
    const newLine: LyricLine = {
      id: `line_${Date.now()}`,
      startTime: Number((lastEnd + 0.5).toFixed(2)),
      endTime: Number((lastEnd + 3.5).toFixed(2)),
      text: 'New lyric timing cue line…',
    };
    onUpdateLyrics([...lyrics, newLine]);
  };

  const insertLine = (index: number, position: 'before' | 'after') => {
    const currentLine = lyrics[index];
    let startTime = 0;
    let endTime = 3.0;

    if (position === 'before') {
      const prevLine = index > 0 ? lyrics[index - 1] : null;
      endTime = currentLine.startTime;
      startTime = prevLine ? prevLine.endTime : Math.max(0, endTime - 3.0);
    } else {
      const nextLine = index < lyrics.length - 1 ? lyrics[index + 1] : null;
      startTime = currentLine.endTime;
      endTime = nextLine ? nextLine.startTime : startTime + 3.0;
    }

    if (endTime <= startTime) {
      endTime = startTime + 0.5;
    }

    const newLine: LyricLine = {
      id: `line_${Date.now()}_${position}`,
      startTime: Number(startTime.toFixed(2)),
      endTime: Number(endTime.toFixed(2)),
      text: 'New lyric…',
    };

    const newLyrics = [...lyrics];
    newLyrics.splice(position === 'before' ? index : index + 1, 0, newLine);
    onUpdateLyrics(newLyrics);
  };

  const shiftAllTimings = (deltaSec: number) => {
    onUpdateLyrics(
      lyrics.map((l) => ({
        ...l,
        startTime: Math.max(0, Number((l.startTime + deltaSec).toFixed(2))),
        endTime: Math.max(0.1, Number((l.endTime + deltaSec).toFixed(2))),
      }))
    );
  };

  const autoDistributeTimings = () => {
    if (!lyrics.length) return;
    const totalDuration = audioDuration || 30; // fallback
    const timePerLine = totalDuration / lyrics.length;
    onUpdateLyrics(
      lyrics.map((l, idx) => ({
        ...l,
        startTime: Number((idx * timePerLine).toFixed(2)),
        endTime: Number(((idx + 1) * timePerLine).toFixed(2)),
      }))
    );
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(2);
    return `${m.toString().padStart(2, '0')}:${s.padStart(5, '0')}`;
  };

  const downloadLyrics = (format: 'lrc' | 'srt' | 'vtt') => {
    let content = '';
    if (format === 'lrc') content = formatLyricCuesToLrc(lyrics);
    if (format === 'srt') content = formatLyricCuesToSrt(lyrics);
    if (format === 'vtt') content = formatLyricCuesToVtt(lyrics);

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lyrics_timed.${format}`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Top Action Header Bar */}
      <div className="md-surface-container p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--md-sys-color-primary)]">
            <FileText className="w-5 h-5 text-[var(--md-sys-color-primary)] shrink-0" aria-hidden="true" />
            <span>Interactive Lyrics & Timing Editor</span>
          </div>

          {/* Action Buttons Toolbar - fully responsive flex-wrap and scroll */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <label className="md-button-filled cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm shrink-0 shadow-sm">
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Import (.RTF, .LRC, .TXT)</span>
              <input
                type="file"
                accept=".json,.srt,.rtf,.lrc,.vtt,.txt"
                onChange={onFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={addLine}
              aria-label="Add new lyric timing cue"
              className="md-button-tonal flex items-center gap-1.5 text-xs sm:text-sm shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add Cue</span>
            </button>

            <button
              type="button"
              onClick={autoDistributeTimings}
              aria-label="Auto-distribute lyrics timings evenly across audio duration"
              className="md-button-tonal flex items-center gap-1.5 !bg-[var(--md-sys-color-secondary-container)] !text-[var(--md-sys-color-on-secondary-container)] text-xs sm:text-sm shrink-0"
            >
              <Sparkles className="w-4 h-4 text-[var(--md-sys-color-primary)]" aria-hidden="true" />
              <span>Auto-Sync</span>
            </button>

            <div className="relative group shrink-0">
              <button
                type="button"
                className="md-button-tonal flex items-center gap-1.5 !bg-[var(--md-sys-color-tertiary-container)] !text-[var(--md-sys-color-on-tertiary-container)] text-xs sm:text-sm"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Export Subs</span>
              </button>
              <div className="absolute right-0 mt-1 w-36 bg-[var(--md-sys-color-surface-container)] rounded-lg shadow-[var(--md-sys-elevation-3)] hidden group-hover:block z-50 border border-[var(--md-sys-color-outline-variant)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => downloadLyrics('lrc')}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] transition-colors font-mono"
                >
                  .LRC (Lyrics)
                </button>
                <button
                  type="button"
                  onClick={() => downloadLyrics('srt')}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] transition-colors font-mono"
                >
                  .SRT (SubRip)
                </button>
                <button
                  type="button"
                  onClick={() => downloadLyrics('vtt')}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] transition-colors font-mono"
                >
                  .VTT (WebVTT)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('omlila_saved_lyrics');
                const freshLyrics = parseLyricCues(SAMPLE_PRESETS[0].lrcContent);
                onUpdateLyrics(freshLyrics);
              }}
              title="Reset cached timestamps to default continuous timings"
              className="md-button-outlined flex items-center gap-1.5 !text-[var(--md-sys-color-tertiary)] text-xs sm:text-sm shrink-0"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Global Shift Buttons */}
        <div className="flex items-center justify-between text-xs border-t border-[var(--md-sys-color-outline-variant)] pt-3 mt-3">
          <span className="text-[var(--md-sys-color-on-surface-variant)] font-mono">Shift All Timings:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => shiftAllTimings(-0.5)}
              aria-label="Nudge all lyric timestamps back by 0.5 seconds"
              className="md-button-tonal !px-2 !py-1 text-xs font-mono"
            >
              -0.5s
            </button>
            <button
              type="button"
              onClick={() => shiftAllTimings(0.5)}
              aria-label="Nudge all lyric timestamps forward by 0.5 seconds"
              className="md-button-tonal !px-2 !py-1 text-xs font-mono"
            >
              +0.5s
            </button>
          </div>
        </div>
      </div>

      {/* Raw Text Accordion Toggle */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowRawEditor(!showRawEditor)}
          aria-expanded={showRawEditor}
          className="w-full py-3 px-4 md-surface-container flex items-center justify-between text-sm font-bold text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors cursor-pointer"
        >
          <span>Raw .LRC / WebVTT Text Markup</span>
          {showRawEditor ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showRawEditor && (
          <textarea
            className="w-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] rounded-xl p-3 font-mono resize-none focus-visible:outline-none focus-visible:border-[var(--md-sys-color-primary)]"
            rows={3}
            spellCheck={false}
            value={rawLrcText}
            onChange={(e) => onRawTextChange(e.target.value)}
            placeholder="[00:12.34] Timestamped text markup…"
          />
        )}
      </div>

      {/* Cue Timeline List */}
      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        {lyrics.length === 0 ? (
          <div className="md-surface-container-highest p-8 text-center space-y-2 border border-dashed border-[var(--md-sys-color-outline-variant)]">
            <Sparkles className="w-6 h-6 text-[var(--md-sys-color-primary)] mx-auto" aria-hidden="true" />
            <p className="text-sm text-[var(--md-sys-color-on-surface-variant)]">No lyric timing cues parsed yet.</p>
          </div>
        ) : (
          lyrics.map((line, idx) => (
            <div
              key={line.id || idx}
              className="md-surface-container p-3 space-y-2 group hover:border-[var(--md-sys-color-primary)] border border-transparent transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Play to position */}
                <button
                  type="button"
                  onClick={() => onSeek(line.startTime)}
                  aria-label={`Jump audio preview to cue ${idx + 1} at ${formatTime(line.startTime)}`}
                  className="flex items-center gap-1.5 text-sm font-mono font-bold text-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-primary-container)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] rounded px-1 tabular-nums shrink-0"
                >
                  <Play className="w-4 h-4" aria-hidden="true" />
                  <span>[{formatTime(line.startTime)}]</span>
                </button>

                {/* Timing controls */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[var(--md-sys-color-on-surface-variant)]" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => updateLineTiming(line.id, 'startTime', currentTime)}
                      title="Set Start to Current Playback Time"
                      className="md-button-tonal !p-1 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)] rounded"
                    >
                      <Crosshair className="w-3 h-3" />
                    </button>
                    <label htmlFor={`start-${line.id}`} className="sr-only">Start time in seconds</label>
                    <input
                      id={`start-${line.id}`}
                      type="number"
                      step={0.1}
                      min={0}
                      value={line.startTime}
                      onChange={(e) => updateLineTiming(line.id, 'startTime', Number(e.target.value))}
                      className="w-14 bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-1 py-0.5 text-xs font-mono text-center rounded tabular-nums focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none"
                    />
                  </div>
                  <span className="text-[var(--md-sys-color-on-surface-variant)] font-bold">→</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateLineTiming(line.id, 'endTime', currentTime)}
                      title="Set End to Current Playback Time"
                      className="md-button-tonal !p-1 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)] rounded"
                    >
                      <Crosshair className="w-3 h-3" />
                    </button>
                    <label htmlFor={`end-${line.id}`} className="sr-only">End time in seconds</label>
                    <input
                      id={`end-${line.id}`}
                      type="number"
                      step={0.1}
                      min={0}
                      value={line.endTime}
                      onChange={(e) => updateLineTiming(line.id, 'endTime', Number(e.target.value))}
                      className="w-14 bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-1 py-0.5 text-xs font-mono text-center rounded tabular-nums focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => insertLine(idx, 'before')}
                    title="Add lyric before"
                    className="md-button-tonal !py-0.5 !px-1.5 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)]"
                  >
                    <span className="text-[10px] font-bold">+ Before</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertLine(idx, 'after')}
                    title="Add lyric after"
                    className="md-button-tonal !py-0.5 !px-1.5 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)]"
                  >
                    <span className="text-[10px] font-bold">+ After</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteLine(line.id)}
                    aria-label={`Delete lyric line ${idx + 1}`}
                    className="md-button-tonal !p-1 text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error-container)] hover:text-[var(--md-sys-color-on-error-container)] ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Text Input */}
              <input
                type="text"
                value={line.text}
                onChange={(e) => updateLineText(line.id, e.target.value)}
                aria-label={`Lyric text for cue line ${idx + 1}`}
                className="w-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-3 py-2 rounded-lg text-sm font-bold focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:outline-none"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
