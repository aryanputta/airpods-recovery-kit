import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(
  new URL("../site/index.html", import.meta.url),
  "utf8",
);
const app = readFileSync(
  new URL("../site/app.js", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../site/styles.css", import.meta.url),
  "utf8",
);

test("sound starts disabled and only from a click handler", () => {
  assert.match(
    html,
    /id="start-button"[^>]*type="button"[^>]*disabled/,
  );
  assert.doesNotMatch(html, /<(?:audio|video)\b[^>]*\bautoplay\b/i);
  assert.match(
    app,
    /startButton\.addEventListener\("click", startRecovery\)/,
  );
  assert.match(
    app,
    /\.mode-switcher button\[data-mode\]/,
  );
});

test("page exposes status updates to assistive technology", () => {
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /role="tablist"/);
});

test("page includes reduced-motion behavior", () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("page includes canonical and structured metadata", () => {
  assert.match(html, /rel="canonical"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /Wet or Damaged AirPods Help/);
  assert.match(html, /"@type": "FAQPage"/);
  assert.match(html, /AirPods water damage/);

  const structuredData = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  assert.ok(structuredData);
  assert.doesNotThrow(() => JSON.parse(structuredData[1]));
});

test("progress percentage is labeled as test progress, not battery", () => {
  assert.match(html, /aria-label="Audio test progress"/);
  assert.match(html, /id="progress-value">Ready</);
  assert.match(html, /<small>test<\/small>/);
  assert.match(app, /progressRing\.setAttribute\("aria-valuenow"/);
});
