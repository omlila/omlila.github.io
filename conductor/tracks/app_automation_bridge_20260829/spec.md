# Specification: Omlila App Automation Protocol & MCP Server

## 1. Overview
Establish a standardized, pluggable browser automation protocol (`window.omlilaApps` and `window.omlilaStudio`) across the Omlila web applications ecosystem. Provide an extensible Model Context Protocol (MCP) server and Playwright headless CLI runner allowing any external AI agent or automation script to inspect state, manipulate lyrics/themes/timelines, capture canvas preview frames, and trigger 4K WebCodecs video exports.

## 2. Universal Protocol Architecture
- **Global App Registry**: `window.omlilaApps[appId]` implements `OmlilaAppBridge<TState>` with:
  - `metadata`: `{ id, name, version, capabilities }`
  - `getState()` / `setState()`
  - `executeAction(actionName, payload)`
  - `onStateChange(listener)`
- **Video Studio Bridge (`window.omlilaStudio`)**:
  - **Lyrics**: `setLyrics(lrc)`, `getLyrics()`, `getLrcText()`
  - **Themes & Styling**: `setTheme(themeId)`, `setStyleConfig(cfg)`, `setWorkspaceTheme(theme)`
  - **Aspect Ratio**: `setAspectRatio(ratio)`
  - **Media**: `setMediaItems(items)`, `addMediaItem(item)`, `setAudioUrl(url)`
  - **Playback**: `play()`, `pause()`, `togglePlay()`, `seek(sec)`
  - **Presets**: `listPresets()`, `loadPreset(presetId)`
  - **Preview & Export**: `captureCanvasFrame(opts)`, `exportMP4(opts)`
- **Playwright & MCP Integration**:
  - `omlila-agent.js`: Universal headless Puppeteer/Playwright client connecting to local dev server or live GitHub Pages.
  - `mcp-server.js`: Standard JSON-RPC 2.0 stdio MCP server for AI coding assistants.

## 3. Acceptance Criteria
- [x] Strongly typed `OmlilaAppBridge` interface defined in `src/automation/types.ts`.
- [x] `omlilaStudioBridge` implemented and registered to `window.omlilaStudio` and `window.omlilaApps['video-studio']`.
- [x] Connected all state setters, playback controls, and `exportLyricalVideoMP4` engine to the bridge.
- [x] Created `omlila-agent.js` CLI client supporting `info`, `preview`, and `export`.
- [x] Created `mcp-server.js` stdio server exposing `omlila_get_studio_state`, `omlila_list_presets`, `omlila_set_studio_config`, `omlila_preview_canvas_frame`, and `omlila_export_video`.
- [x] Root scripts added: `pnpm agent:info`, `pnpm agent:preview`, `pnpm agent:export`, `pnpm mcp:server`.
