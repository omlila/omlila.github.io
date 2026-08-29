# Implementation Plan: Omlila App Automation Protocol & MCP Server

## Phase 1: Protocol Design & Types
- [x] Task: Define `OmlilaAppMetadata`, `OmlilaAppBridge`, and `OmlilaStudioAutomationAPI` in `src/automation/types.ts`

## Phase 2: Studio Automation Bridge Implementation
- [x] Task: Implement `registerStudioBridge` and state notification in `src/automation/omlilaStudioBridge.ts`
- [x] Task: Bind React state, canvas frame capture, and WebCodecs export engine in `src/App.tsx`

## Phase 3: CLI Runner & MCP Server
- [x] Task: Implement `OmlilaAppClient` in `scripts/omlila-agent.js` using headless Chrome/Playwright
- [x] Task: Implement JSON-RPC 2.0 stdio MCP server in `scripts/mcp-server.js`
- [x] Task: Add automation scripts to root `package.json`

## Phase 4: Verification & Git Deployment
- [x] Task: Verify `pnpm build` passes with zero type errors
- [x] Task: Commit and push changes to GitHub
