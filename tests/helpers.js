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
  return { context, page, errors };
}

// Click (or tap) through the title card and the chapter card into play.
async function rollFilm(page, touch = false) {
  const go = async () => {
    if (touch) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 100, y: 100 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else await page.mouse.click(200, 200);
  };
  await go();
  await page.waitForFunction(() => window.__mobber.state === "card");
  await page.waitForTimeout(700); // the card must fade in before it accepts a click
  await go();
  await page.waitForFunction(() => window.__mobber.state === "play");
}

const game = (page, fn, arg) => page.evaluate(fn, arg);

module.exports = { serve, openGame, rollFilm, game, chromium, devices };
