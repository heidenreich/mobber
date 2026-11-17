// Shared helpers for the browser tests: open the game in Chromium and drive it
// through its window.__mobber hook (see src/main.js).
const { chromium, devices } = require("playwright");
const { serve } = require("../scripts/server");

async function openGame(browser, url, contextOptions = { viewport: { width: 1280, height: 720 } }) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  // Google Fonts aren't needed for the tests, and CI may not reach them
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.goto(url);
  await page.waitForFunction(() => window.__mobber && window.__mobber.state === "title");
  // Dialogue cards pause the action for a couple of seconds; the tests that want them turn them back on
  await page.evaluate(() => { window.__mobber.dialogue = false; });
  return { context, page, errors };
}

// A click, or a tap on a phone
async function tap(page, touch = false, x = 100, y = 100) {
  if (!touch) return page.mouse.click(x, y);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

// Click (or tap) through the title, prologue, controls and chapter cards into play, as a player would.
async function rollFilm(page, touch = false) {
  await tap(page, touch);
  for (let i = 0; i < 5; i++) {
    // Each card must fade in before it accepts a click
    await page.waitForFunction(() => window.__mobber.state === "play" || (window.__mobber.state === "card" && window.__mobber.fade >= 0.6));
    if (await page.evaluate(() => window.__mobber.state === "play")) return;
    await tap(page, touch);
  }
  await page.waitForFunction(() => window.__mobber.state === "play");
}

const game = (page, fn, arg) => page.evaluate(fn, arg);

// ---- For the test files: one server and one browser per file, a fresh browser context per game ----

// Each test file runs in its own process, so these are per file
const env = { srv: null, browser: null, open: [] };
let hooked = false;

// Call once at the top of a test file. Every game a test opens is closed after it, and a test
// fails if the page logged an error (a test that expects one can empty g.errors itself).
function useBrowser() {
  if (hooked) return;
  hooked = true;
  const { before, after, afterEach } = require("node:test");
  const assert = require("node:assert/strict");
  before(async () => { env.srv = await serve(); env.browser = await chromium.launch(); });
  afterEach(async () => {
    const open = env.open.splice(0);
    for (const g of open) await g.context.close();
    for (const g of open) assert.deepEqual(g.errors, [], "errors in the page");
  });
  after(async () => { await env.browser.close(); env.srv.server.close(); });
}

// The game at its title card. `device` is a Playwright device name, for a phone.
async function open(device) {
  const g = await openGame(env.browser, env.srv.url, device ? { ...devices[device] } : undefined);
  g.touch = !!device;
  env.open.push(g);
  return g;
}

// Straight into a scene, skipping the cards (the "title card, chapter card, then play" test covers
// those). One click or tap on the title first, as a player's would, so the page has had a gesture.
//   title:  the scene's title (the first scene if left out)
//   clear:  true to put every gangster down, or a list of gangster kinds to leave standing
//   hp:     the player's health
//   device: a phone to play it on
async function scene(title, { clear, hp, device } = {}) {
  const g = await open(device);
  await tap(g.page, g.touch);
  await g.page.waitForFunction(() => window.__mobber.state === "card");
  await game(g.page, ({ title, clear, hp }) => {
    const M = window.__mobber;
    M.startLevel(title ? M.LEVELS.findIndex(l => l.title === title) : 0);
    if (clear) for (const e of M.enemies) if (clear === true || !clear.includes(e.type.name)) { e.hp = 0; e.state = "dead"; }
    if (hp !== undefined) M.player.hp = hp;
  }, { title, clear, hp });
  return g;
}

// Hold a key until the game reaches some state (rather than for a fixed time, so a
// slow machine running the game in slow motion doesn't fail the test)
async function holdUntil(page, key, cond, arg, timeout = 8000) {
  await page.keyboard.down(key);
  try { await page.waitForFunction(cond, arg, { timeout }); } finally { await page.keyboard.up(key); }
}

// One pull of the trigger
async function shoot(page) {
  await page.keyboard.down(" "); await page.waitForTimeout(100); await page.keyboard.up(" ");
}

// Click through a card once it has faded in enough to accept the click
async function clickCard(page) {
  await page.waitForFunction(() => window.__mobber.state === "card" && window.__mobber.fade >= 0.6);
  await page.mouse.click(200, 200);
}

// The hotel lift: skip the ride and wait at landing `stop` (the doors open on their own)
async function landing(page, stop) {
  await page.waitForFunction(s => { const l = window.__mobber.lift; if (l.phase === "ride" && l.t > 0.05) l.t = 0.05; return l.phase === "stop" && l.stop === s; }, stop, { timeout: 10000 });
}

const clearEnemies = page => game(page, () => { for (const e of window.__mobber.enemies) { e.hp = 0; e.state = "dead"; } });

module.exports = { serve, openGame, rollFilm, game, chromium, devices, useBrowser, open, scene, tap, holdUntil, shoot, clickCard, landing, clearEnemies };
