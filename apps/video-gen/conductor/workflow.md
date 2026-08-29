# Workflow Guidelines

## Development & Verification Protocol
1. **Branching**: Feature work and refactoring should occur on clean git feature branches or directly in working branch when appropriate.
2. **Pre-flight Build Verification**:
   - Before completing any task, execute:
     `npm run build`
   - Ensure `0 compile errors` and `0 warnings`.
3. **WebCodecs Browser Compatibility**:
   - All video rendering export logic must maintain `VideoEncoder.isConfigSupported()` fallbacks to ensure compatibility across Chrome, Edge, and Safari 15.4+.
