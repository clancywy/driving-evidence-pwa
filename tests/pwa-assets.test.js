const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function readAsset(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function extractRules(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "gm"));
  return Array.from(matches, (match) => match[1]).join("\n");
}

function numericDeclaration(rule, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = rule.match(new RegExp(`${escaped}:\\s*(\\d+)px`));
  return match ? Number(match[1]) : null;
}

test("processing records use a horizontal snap carousel", () => {
  const css = readAsset("pwa/styles.css");
  const listRule = extractRules(css, ".record-list");
  const cardRule = extractRules(css, ".record-card");

  assert.match(listRule, /overflow-x:\s*auto/);
  assert.match(listRule, /scroll-snap-type:\s*x mandatory/);
  assert.match(listRule, /display:\s*flex/);
  assert.match(cardRule, /scroll-snap-align:\s*center/);
  assert.match(cardRule, /flex:\s*0 0/);
});

test("processing record maps use a larger window", () => {
  const css = readAsset("pwa/styles.css");
  const miniMapRule = extractRules(css, ".mini-map");

  assert.ok(numericDeclaration(miniMapRule, "min-height") >= 220);
  assert.match(miniMapRule, /margin-bottom:\s*12px/);
});

test("processing record cards expose a confirmed delete action", () => {
  const app = readAsset("pwa/app.js");
  const css = readAsset("pwa/styles.css");

  assert.match(app, /core\.deleteRecord/);
  assert.match(app, /window\.confirm/);
  assert.match(app, /delete-record/);
  assert.match(css, /\.delete-record\s*\{/);
});

test("geolocation prefers fresh high speed driving positions", () => {
  const app = readAsset("pwa/app.js");

  assert.match(app, /enableHighAccuracy:\s*true/);
  assert.match(app, /timeout:\s*5000/);
  assert.match(app, /maximumAge:\s*1000/);
});

test("pwa cache is bumped to v11", () => {
  const html = readAsset("pwa/index.html");
  const sw = readAsset("pwa/sw.js");

  assert.match(html, /styles\.css\?v=11/);
  assert.match(html, /app-core\.js\?v=11/);
  assert.match(html, /app\.js\?v=11/);
  assert.match(sw, /traffic-report-pwa-v11/);
  assert.doesNotMatch(html, /v=10/);
  assert.doesNotMatch(sw, /v=10|traffic-report-pwa-v10/);
});
