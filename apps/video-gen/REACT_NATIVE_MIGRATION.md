# 📱 React Native & Mobile Migration Blueprint

## Overview
This document outlines the exact architecture, bridge protocols, and step-by-step strategy for embedding the web-based Lyric Canvas Animation & MP4 Video Export Engine into a mobile application powered by **React Native / Expo** (via `react-native-webview` or `expo-dom`).

---

## 🏗️ Decoupled Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native Native App                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Native UI Controls & Audio Player (react-native-track-player)│ │
│ └────────────────────────────┬────────────────────────────┘ │
│                              │ postMessage Event Bridge     │
│                              ▼                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  Embedded WebView / Expo DOM Component (LyricCanvas)    │ │
│ │  - CanvasRenderingContext2D Engine (canvasRenderer.ts)  │ │
│ │  - Offline Frame-by-Frame WebCodecs + mp4-muxer Exporter│ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 1. PostMessage Bridge Event Protocol

Communication between React Native and the Web Lyric Engine uses bidirectional `postMessage` JSON payloads.

### A. Messages from React Native -> WebView (Control Signals)

#### 1. Sync Playback & Timing
```json
{
  "type": "SYNC_TIME",
  "payload": {
    "currentTime": 12.45,
    "isPlaying": true
  }
}
```

#### 2. Update Lyrics Data
```json
{
  "type": "SET_LYRICS",
  "payload": {
    "lyrics": [
      { "id": "1", "startTime": 0.5, "endTime": 4.2, "text": "Neon lights in the night" },
      { "id": "2", "startTime": 4.5, "endTime": 8.0, "text": "Fading into memories" }
    ]
  }
}
```

#### 3. Update Styling Config
```json
{
  "type": "UPDATE_STYLE",
  "payload": {
    "fontFamily": "Montserrat",
    "fontSize": 48,
    "glowColor": "#8b5cf6",
    "animationType": "karaoke",
    "backgroundType": "gradient"
  }
}
```

#### 4. Trigger Deterministic MP4 Video Export
```json
{
  "type": "START_EXPORT",
  "payload": {
    "aspectRatio": "9:16",
    "fps": 30,
    "width": 1080,
    "height": 1920
  }
}
```

---

### B. Messages from WebView -> React Native (Event & Output Signals)

#### 1. Engine Ready Event
```json
{
  "type": "ENGINE_READY",
  "payload": {
    "webcodecsSupported": true
  }
}
```

#### 2. Video Export Progress Event
```json
{
  "type": "EXPORT_PROGRESS",
  "payload": {
    "progress": 45.5,
    "currentFrame": 273,
    "totalFrames": 600,
    "stage": "rendering-video"
  }
}
```

#### 3. Video Export Complete (Base64 / Data URI)
```json
{
  "type": "EXPORT_COMPLETE",
  "payload": {
    "fileName": "lyric_video_1080x1920.mp4",
    "mimeType": "video/mp4",
    "base64Data": "data:video/mp4;base64,AAAAIGZ0eXBpc29t..."
  }
}
```

---

## 📱 2. Expo / React Native Implementation Code

Below is the complete, drop-in React Native Expo component wrapping the Web engine:

```tsx
import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function MobileLyricCanvas({ lyrics, currentTime, isPlaying, styleConfig }) {
  const webViewRef = useRef(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Send timing updates to WebView
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'SYNC_TIME',
        payload: { currentTime, isPlaying }
      }));
    }
  }, [currentTime, isPlaying]);

  // Handle messages coming from WebView
  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'EXPORT_PROGRESS') {
        setExportProgress(data.payload.progress);
      } else if (data.type === 'EXPORT_COMPLETE') {
        setIsExporting(false);
        // Save Base64 MP4 to native FileSystem & prompt native Share sheet
        const fileUri = `${FileSystem.documentDirectory}${data.payload.fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, data.payload.base64Data.split(',')[1], {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(fileUri, { mimeType: 'video/mp4' });
      }
    } catch (err) {
      console.error("Bridge Error:", err);
    }
  };

  const triggerExport = () => {
    setIsExporting(true);
    webViewRef.current.postMessage(JSON.stringify({
      type: 'START_EXPORT',
      payload: { aspectRatio: '9:16', fps: 30, width: 1080, height: 1920 }
    }));
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ uri: 'https://your-deployed-web-app-url.com' }}
        onMessage={handleMessage}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
      />
      <TouchableOpacity onPress={triggerExport} style={styles.exportBtn}>
        <Text style={styles.btnText}>{isExporting ? `Exporting ${Math.round(exportProgress)}%` : 'Export MP4'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  webview: { flex: 1 },
  exportBtn: { padding: 16, backgroundColor: '#8b5cf6', alignItems: 'center' },
  btnText: { color: '#ffffff', fontWeight: 'bold' }
});
```

---

## ⚡ 3. Mobile Performance & WebCodecs Considerations
1. **iOS WebView WebCodecs Support**: iOS 15.4+ natively supports WebCodecs in WebViews (`VideoEncoder` and `AudioEncoder`).
2. **Android WebView**: Supported natively in Android WebViews powered by Chrome (Chromium 94+).
3. **Expo DOM Components (Expo SDK 52+)**: Utilizing `use dom` directives allows zero-overhead native DOM rendering on iOS & Android while giving full web API access to standard Canvas2D and WebCodecs!
