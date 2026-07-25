import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const script = readFileSync(
  new URL(
    "../skills/recover-airpods-audio/scripts/airpods-recovery.sh",
    import.meta.url,
  ),
  "utf8",
);

test("terminal playback caps high volume and restores the prior setting", () => {
  assert.match(
    script,
    /output volume of \(get volume settings\)/,
  );
  assert.match(script, /\(\( current_volume > 12 \)\)/);
  assert.match(
    script,
    /set volume output volume \$ORIGINAL_VOLUME/,
  );
  assert.match(script, /trap restore_output_volume EXIT/);
  assert.ok(
    script.indexOf("trap restore_output_volume EXIT") <
      script.indexOf("set volume output volume 12"),
  );
});

test("route cache exists before Swift runs and failures are classified", () => {
  const mkdirPosition = script.indexOf('mkdir -p "$RECOVERY_CACHE"');
  const swiftPosition = script.indexOf("if swift");

  assert.ok(mkdirPosition >= 0);
  assert.ok(swiftPosition > mkdirPosition);
  assert.match(script, /case "\$route_status" in/);
  assert.match(script, /The AirPods route check could not run/);
});

test("unknown modes fail before route inspection", () => {
  const modeValidation = script.indexOf('case "$MODE" in');
  const routeInspection = script.indexOf("if swift");

  assert.ok(modeValidation >= 0);
  assert.ok(routeInspection > modeValidation);
});

test("moisture pulse requires the drying-period warning", () => {
  assert.match(script, /dry completely for at least two hours/);
  assert.match(script, /--confirm-out-of-ears/);
});
