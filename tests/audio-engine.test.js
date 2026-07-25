import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPulseSchedule,
  CHANNEL_GAIN,
  MOISTURE_DURATION_SECONDS,
  MOISTURE_GAIN,
} from "../site/audio-engine.js";

test("moisture pulse uses bounded gain and duration", () => {
  assert.ok(MOISTURE_GAIN > 0);
  assert.ok(MOISTURE_GAIN <= 0.03);
  assert.ok(MOISTURE_DURATION_SECONDS <= 20);
});

test("channel test gain stays below the moisture-pulse ceiling", () => {
  assert.ok(CHANNEL_GAIN > 0);
  assert.ok(CHANNEL_GAIN <= 0.03);
});

test("pulse schedule never exceeds its duration", () => {
  const pulses = buildPulseSchedule();

  assert.ok(pulses.length > 1);
  assert.equal(pulses[0].startSeconds, 0);
  assert.ok(
    pulses.every(
      ({ startSeconds, endSeconds }) =>
        startSeconds >= 0 &&
        endSeconds > startSeconds &&
        endSeconds <= MOISTURE_DURATION_SECONDS,
    ),
  );
});

test("pulse schedule rejects unsafe duration", () => {
  assert.throws(
    () => buildPulseSchedule({ durationSeconds: 21 }),
    /Unsafe pulse schedule/,
  );
});
