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
