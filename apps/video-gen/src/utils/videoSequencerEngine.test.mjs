
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
