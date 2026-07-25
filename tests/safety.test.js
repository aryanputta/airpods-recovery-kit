import assert from "node:assert/strict";
import test from "node:test";

import { canStartRecovery } from "../site/safety.js";
import { RecoveryMode } from "../site/safety.js";

test("blocks playback when both confirmations are false", () => {
  assert.equal(
    canStartRecovery({ outOfEars: false, outputConfirmed: false }),
    false,
  );
});

test("blocks playback when AirPods may still be in the user's ears", () => {
  assert.equal(
    canStartRecovery({ outOfEars: false, outputConfirmed: true }),
    false,
  );
});

test("blocks playback when the output has not been confirmed", () => {
  assert.equal(
    canStartRecovery({ outOfEars: true, outputConfirmed: false }),
    false,
  );
});

test("allows playback only after both confirmations", () => {
  assert.equal(
    canStartRecovery({ outOfEars: true, outputConfirmed: true }),
    true,
  );
});

test("channel test requires low volume and output confirmation", () => {
  assert.equal(
    canStartRecovery({
      mode: RecoveryMode.CHANNELS,
      lowVolume: true,
      outputConfirmed: true,
    }),
    true,
  );
});

test("channel test ignores the out-of-ears confirmation", () => {
  assert.equal(
    canStartRecovery({
      mode: RecoveryMode.CHANNELS,
      outOfEars: true,
      lowVolume: false,
      outputConfirmed: true,
    }),
    false,
  );
});
