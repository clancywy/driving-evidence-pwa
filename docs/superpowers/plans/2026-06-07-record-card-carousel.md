# Record Card Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the processing records view from a vertical list to an iOS-style horizontal card carousel.

**Architecture:** Keep the existing record rendering code and use CSS-native horizontal scrolling with scroll snapping. Add one static asset test that proves the carousel rules exist, then make the smallest CSS and cache-version changes needed.

**Tech Stack:** Static PWA, HTML, CSS, vanilla JavaScript, Node `node:test`.

---

### Task 1: Add Carousel Asset Test

**Files:**
- Create: `tests/pwa-assets.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create `tests/pwa-assets.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function readAsset(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function extractRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "m"));
  return match ? match[1] : "";
}

test("processing records use a horizontal snap carousel", () => {
  const css = readAsset("pwa/styles.css");
  const listRule = extractRule(css, ".record-list");
  const cardRule = extractRule(css, ".record-card");

  assert.match(listRule, /overflow-x:\s*auto/);
  assert.match(listRule, /scroll-snap-type:\s*x mandatory/);
  assert.match(listRule, /display:\s*flex/);
  assert.match(cardRule, /scroll-snap-align:\s*center/);
  assert.match(cardRule, /flex:\s*0 0/);
});
```

- [ ] **Step 2: Update the npm test script**

In `package.json`, change:

```json
"test": "node --test tests/app-core.test.js"
```

to:

```json
"test": "node --test tests/*.test.js"
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```bash
node --test tests/pwa-assets.test.js
```

Expected: FAIL because `.record-list` currently does not have `overflow-x: auto` or `scroll-snap-type`.

### Task 2: Implement Carousel CSS

**Files:**
- Modify: `pwa/styles.css`

- [ ] **Step 1: Update `.record-list`**

Replace the current vertical list rule:

```css
.record-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

with:

```css
.record-list {
  display: flex;
  flex-direction: row;
  gap: 12px;
  margin: 0 -14px;
  padding: 0 14px 4px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.record-list::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 2: Update `.record-card`**

Replace:

```css
.record-card {
  padding: 14px;
}
```

with:

```css
.record-card {
  flex: 0 0 87%;
  scroll-snap-align: center;
  padding: 14px;
}
```

- [ ] **Step 3: Run tests**

Run:

```bash
npm test
node --test tests/pwa-assets.test.js
```

Expected: all tests pass.

### Task 3: Bump PWA Cache Version

**Files:**
- Modify: `pwa/index.html`
- Modify: `pwa/sw.js`

- [ ] **Step 1: Update asset query version**

In `pwa/index.html`, change:

```html
<link rel="stylesheet" href="./styles.css?v=9">
<script src="./app-core.js?v=9" defer></script>
<script src="./app.js?v=9" defer></script>
```

to:

```html
<link rel="stylesheet" href="./styles.css?v=10">
<script src="./app-core.js?v=10" defer></script>
<script src="./app.js?v=10" defer></script>
```

- [ ] **Step 2: Update service worker cache**

In `pwa/sw.js`, change cache name and versioned assets from `v9` to `v10`:

```js
const CACHE_NAME = "traffic-report-pwa-v10";
```

and:

```js
"./styles.css?v=10",
"./app.js?v=10",
"./app-core.js?v=10",
```

- [ ] **Step 3: Run syntax checks**

Run:

```bash
node --check pwa/app.js
node --check pwa/app-core.js
node --check pwa/sw.js
```

Expected: all commands exit 0.

### Task 4: Final Verification And Commit

**Files:**
- Test: `tests/*.test.js`

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
node --test tests/pwa-assets.test.js
node --check pwa/app.js
node --check pwa/app-core.js
node --check pwa/sw.js
```

Expected: all commands exit 0.

- [ ] **Step 2: Check changed files**

Run:

```bash
git status -sb
git diff --stat
```

Expected: changed files are limited to the carousel plan, CSS, asset version files, and the new asset test.

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-06-07-record-card-carousel.md tests/pwa-assets.test.js package.json pwa/styles.css pwa/index.html pwa/sw.js
git commit -m "Add processing record card carousel"
```

Expected: commit succeeds.
