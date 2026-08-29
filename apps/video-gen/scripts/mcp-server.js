import readline from 'readline';
import { OmlilaAppClient } from './omlila-agent.js';

/**
 * Standard Model Context Protocol (MCP) Server for Omlila Studio
 * Communicates via JSON-RPC 2.0 over stdio with any AI coding agent.
 */

const client = new OmlilaAppClient({
  targetUrl: process.env.STUDIO_URL || 'http://localhost:5173/studio/video/',
});

const TOOLS = [
  {
    name: 'omlila_get_studio_state',
    description: 'Retrieve the active state, lyrics, theme, and playback configuration of the Omlila Video Studio app.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'omlila_list_presets',
    description: 'List all built-in song presets, themes, and sample lyrical configurations.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'omlila_set_studio_config',
    description: 'Configure lyrics (LRC format), visual theme, and aspect ratio in the studio.',
    inputSchema: {
      type: 'object',
      properties: {
        lrc: { type: 'string', description: 'Timed lyrics in LRC format' },
        theme: { type: 'string', description: 'Theme preset ID (e.g. mother-love, cyberpunk, cartoon, retro-vhs, kinetic)' },
        aspectRatio: { type: 'string', enum: ['16:9', '9:16', '1:1'], description: 'Canvas aspect ratio' },
      },
    },
  },
  {
    name: 'omlila_preview_canvas_frame',
    description: 'Capture a PNG preview screenshot of the canvas renderer for visual inspection.',
    inputSchema: {
      type: 'object',
      properties: {
        outputPath: { type: 'string', description: 'Local path where to save the preview PNG file' },
        seekTime: { type: 'number', description: 'Timestamp in seconds to preview' },
      },
    },
  },
  {
    name: 'omlila_export_video',
    description: 'Headlessly render and export a 4K or 1080p MP4 video using browser-native WebCodecs hardware encoding.',
    inputSchema: {
      type: 'object',
      properties: {
        outputPath: { type: 'string', description: 'Local file path to save the exported MP4 video' },
        quality: { type: 'string', enum: ['720p', '1080p', '1440p', '2160p'], description: 'Resolution quality (2160p is 4K Ultra HD)' },
        lrc: { type: 'string', description: 'Optional custom LRC lyrics text' },
        theme: { type: 'string', description: 'Optional theme preset' },
        aspectRatio: { type: 'string', enum: ['16:9', '9:16', '1:1'], description: 'Aspect ratio' },
      },
      required: ['outputPath'],
    },
  },
];

async function handleToolCall(name, args) {
  switch (name) {
    case 'omlila_get_studio_state':
      return await client.getState();
    case 'omlila_list_presets':
      return await client.listPresets();
    case 'omlila_set_studio_config':
      if (args.lrc) await client.setLyrics(args.lrc);
      if (args.theme) await client.setTheme(args.theme);
      if (args.aspectRatio) await client.setAspectRatio(args.aspectRatio);
      return { success: true, message: 'Studio configuration updated' };
    case 'omlila_preview_canvas_frame':
      const dataUrl = await client.captureCanvasFrame({ outputPath: args.outputPath });
      return { success: true, frameSavedTo: args.outputPath || 'dataUrl returned', dataUrl: args.outputPath ? undefined : dataUrl };
    case 'omlila_export_video':
      await client.exportMP4(args);
      return { success: true, outputPath: args.outputPath, message: 'Video rendered successfully' };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// JSON-RPC stdio loop
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

rl.on('line', async (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch (e) {
    return;
  }

  const { id, method, params } = msg;

  if (method === 'initialize') {
    const response = {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'omlila-studio-mcp', version: '1.0.0' },
      },
    };
    console.log(JSON.stringify(response));
  } else if (method === 'tools/list') {
    const response = {
      jsonrpc: '2.0',
      id,
      result: { tools: TOOLS },
    };
    console.log(JSON.stringify(response));
  } else if (method === 'tools/call') {
    try {
      const result = await handleToolCall(params.name, params.arguments || {});
      const response = {
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
      };
      console.log(JSON.stringify(response));
    } catch (err) {
      const response = {
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: err.message },
      };
      console.log(JSON.stringify(response));
    }
  }
});
