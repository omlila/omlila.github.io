import { parseLyricCues } from '../src/utils/lrcParser.js';
import { QUALITY_CONFIGS, ASPECT_RATIOS } from '../src/types/index.js';
import { WORKSPACE_THEMES } from '../src/data/appThemes.js';
import { THEME_PRESETS } from '../src/data/themePresets.js';

console.log('🧪 Running 4K YouTube Video Export Engine Validation Suite...\n');

// 1. Validate Forest Green Theme Presence
console.log('1️⃣ Checking Workspace Themes...');
const forestTheme = WORKSPACE_THEMES.find((t) => t.id === 'forest-green');
if (!forestTheme) {
  throw new Error('❌ Forest Green Dark theme missing from WORKSPACE_THEMES');
}
console.log(`   ✅ Found Forest Green Dark theme: ${forestTheme.name} (${forestTheme.badge})`);

// 2. Validate Forest Nature Visual Preset
console.log('\n2️⃣ Checking Visual Theme Presets...');
const forestPreset = THEME_PRESETS.find((p) => p.id === 'forest-nature');
if (!forestPreset) {
  throw new Error('❌ Forest Nature visual preset missing from THEME_PRESETS');
}
console.log(`   ✅ Found Forest Nature preset: ${forestPreset.name} (${forestPreset.badge})`);

// 3. Validate 4K YouTube Widescreen Aspect Ratio Dimensions
console.log('\n3️⃣ Checking 4K YouTube Widescreen (16:9) Dimensions...');
const q4k = QUALITY_CONFIGS['2160p'];
const dims169 = q4k.getDimensions('16:9');
if (dims169.width !== 3840 || dims169.height !== 2160) {
  throw new Error(`❌ Invalid 4K dimensions: expected 3840x2160, got ${dims169.width}x${dims169.height}`);
}
console.log(`   ✅ Verified 4K YouTube Dimensions: ${dims169.width} x ${dims169.height} px @ ${q4k.bitrate / 1_000_000} Mbps`);

// 4. Validate LRC Parser Cues
console.log('\n4️⃣ Testing LRC Timing Cue Parser...');
const sampleLrc = `[00:00.00] Welcome to Forest Green Studio
[00:04.50] Dynamic 4K WebCodecs MP4 Export
[00:09.00] Ultra HD 3840x2160 Lyrical Video`;
const parsedCues = parseLyricCues(sampleLrc);
if (parsedCues.length !== 3) {
  throw new Error(`❌ LRC parser failed: expected 3 cues, got ${parsedCues.length}`);
}
console.log(`   ✅ Successfully parsed ${parsedCues.length} timing cues:`);
parsedCues.forEach((cue) => console.log(`      • [${cue.startTime}s - ${cue.endTime}s]: "${cue.text}"`));

console.log('\n🏆 ALL 4K YOUTUBE VIDEO GENERATOR TESTS PASSED 100% CLEANLY!');
