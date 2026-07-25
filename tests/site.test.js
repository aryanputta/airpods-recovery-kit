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
const robots = readFileSync(
  new URL("../site/robots.txt", import.meta.url),
  "utf8",
);
const sitemap = readFileSync(
  new URL("../site/sitemap.xml", import.meta.url),
  "utf8",
);
const socialPreview = readFileSync(
  new URL("../site/social-preview.png", import.meta.url),
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
    /engine\.running \|\| app\.dataset\.running === "true"/,
  );
  assert.match(
    app,
    /\.mode-switcher button\[data-mode\]/,
  );
});

test("page exposes status updates to assistive technology", () => {
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /role="tablist"/);
  assert.match(app, /stopButton\.focus\(\{ preventScroll: true \}\)/);
  assert.match(app, /startButton\.focus\(\{ preventScroll: true \}\)/);
});

test("page includes reduced-motion behavior", () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("page includes canonical and structured metadata", () => {
  assert.match(html, /rel="canonical"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /Wet AirPods\? How to Dry and Test Them Safely/);
  assert.match(html, /"@type": "FAQPage"/);
  assert.match(html, /AirPods water damage/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /property="og:site_name"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /Does this work with every AirPods generation/);
  assert.doesNotMatch(html, /name="keywords"/);

  const structuredData = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  assert.ok(structuredData);
  const graph = JSON.parse(structuredData[1])["@graph"];
  const website = graph.find((entry) => entry["@type"] === "WebSite");
  const application = graph.find(
    (entry) => entry["@type"] === "WebApplication",
  );
  const faq = graph.find((entry) => entry["@type"] === "FAQPage");

  assert.equal(website.name, "AirPods Recovery Kit");
  assert.equal(
    application.codeRepository,
    "https://github.com/aryanputta/airpods-recovery-kit",
  );
  assert.equal(application.offers.price, "0");
  assert.equal(application.softwareVersion, "0.1.1");

  const visibleQuestions = [
    ...html.matchAll(/<summary>([\s\S]*?)<\/summary>/g),
  ].map((match) => match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  for (const question of faq.mainEntity) {
    assert.ok(visibleQuestions.includes(question.name));
  }
});

test("progress percentage is labeled as test progress, not battery", () => {
  assert.match(html, /aria-label="Audio test progress"/);
  assert.match(html, /id="progress-value">Ready</);
  assert.match(html, /<small>test<\/small>/);
  assert.match(app, /progressRing\.setAttribute\("aria-valuenow"/);
});

test("crawler files expose the canonical page and raster social preview", () => {
  const canonical =
    "https://aryanputta.github.io/airpods-recovery-kit/";
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(
    robots,
    /Sitemap: https:\/\/aryanputta\.github\.io\/airpods-recovery-kit\/sitemap\.xml/,
  );
  assert.match(sitemap, new RegExp(`<loc>${canonical}</loc>`));
  assert.deepEqual(
    [...socialPreview.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
});

test("liquid-exposure copy requires drying before playback", () => {
  assert.match(html, /dried for 2\+ hours and are out of my ears/);
  assert.match(html, /Wait at least two hours/);
  assert.match(app, /dried for 2\+ hours and are out of my ears/);
});
