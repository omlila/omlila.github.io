
import test from "node:test";
import assert from "node:assert/strict";
import { 
  calculateEffectivePlaybackRate, 
  calculateVideoTime, 
  calculateSceneTransition,
  autoContiguousSlice
} from "./videoSequencerEngine.js";

test("calculateEffectivePlaybackRate calculates auto-fit speed accurately", () => {
  const item = {
    id: "clip1",
    name: "Clip 1",
    type: "video",
    url: "test.mp4",
    durationSec: 10,
    trimStartSec: 2,
    trimEndSec: 7, // span = 5s
    videoTimeStretchMode: "auto-fit-duration"
  };
  const rate = calculateEffectivePlaybackRate(item, 1.0);
  assert.equal(rate, 0.5); // 5s span over 10s duration = 0.5x speed
});

test("calculateVideoTime computes forward playback time", () => {
  const item = {
    id: "clip1",
    name: "Clip 1",
    type: "video",
    url: "test.mp4",
    durationSec: 10,
    trimStartSec: 2,
    trimEndSec: 7,
    playbackDirection: "forward",
    playbackRate: 1.0
  };
  const t = calculateVideoTime(item, 2.0); // 2s into scene
  assert.equal(t, 4.0); // 2 + 2 = 4
});

test("calculateVideoTime computes reverse playback time", () => {
  const item = {
    id: "clip1",
    name: "Clip 1",
    type: "video",
    url: "test.mp4",
    durationSec: 10,
    trimStartSec: 2,
    trimEndSec: 7,
    playbackDirection: "reverse",
    playbackRate: 1.0
  };
  const t = calculateVideoTime(item, 2.0); // 2s into scene
  assert.equal(t, 5.0); // 7 - 2 = 5
});

test("calculateVideoTime computes ping-pong / boomerang loop", () => {
  const item = {
    id: "clip1",
    name: "Clip 1",
    type: "video",
    url: "test.mp4",
    durationSec: 10,
    trimStartSec: 0,
    trimEndSec: 4, // 4s span, cycle is 8s
    playbackDirection: "ping-pong",
    playbackRate: 1.0
  };
  assert.equal(calculateVideoTime(item, 2.0), 2.0); // Forward phase at 2s
  assert.equal(calculateVideoTime(item, 6.0), 2.0); // Backward phase at 6s (4 - 2 = 2s)
});

test("autoContiguousSlice spawns contiguous next scene with correct In-Point", () => {
  const prevItem = {
    id: "scene_1",
    name: "Drone Shot",
    type: "video",
    url: "drone.mp4",
    durationSec: 6.0,
    trimStartSec: 0,
    trimEndSec: 3.0,
    playbackRate: 0.5,
    playbackDirection: "forward"
  };
  const nextScene = autoContiguousSlice(prevItem, 5.0, "reverse");
  assert.equal(nextScene.trimStartSec, 3.0); // Picks up at 3.0s
  assert.equal(nextScene.playbackDirection, "reverse");
  assert.equal(nextScene.durationSec, 5.0);
});

test("calculateSceneTransition provides continuous playback time across transitions without restart", () => {
  const items = [
    { id: "s1", name: "Scene 1", type: "video", url: "1.mp4", durationSec: 10, transitionDurationSec: 1.0 },
    { id: "s2", name: "Scene 2", type: "video", url: "2.mp4", durationSec: 10, transitionDurationSec: 1.0 }
  ];

  // At t = 9.5s (inside transition from Scene 1 to Scene 2, progress = 0.5)
  const transInfo = calculateSceneTransition(9.5, items, 1.0);
  assert.equal(transInfo.isInTransition, true);
  assert.equal(transInfo.transitionProgress, 0.5);

  // Incoming video time at end of transition (t = 10.0s, p = 1.0)
  const incomingTimeAtEnd = calculateVideoTime(items[1], 1.0 * 1.0, 20, 1.0);
  
  // Active video time right as Scene 2 begins (t = 10.0s, timeInScene = 0.0)
  const s2Info = calculateSceneTransition(10.0, items, 1.0);
  assert.equal(s2Info.activeIndex, 1);
  const activeTimeAtStart = calculateVideoTime(items[1], s2Info.timeInSceneContinuous, 20, s2Info.incomingTransitionDuration);

  // MUST BE 100% CONTINUOUS AND NOT RESTART AT 0!
  assert.equal(incomingTimeAtEnd, activeTimeAtStart);
  assert.ok(activeTimeAtStart > 0, "Video did not restart at 0");
});
