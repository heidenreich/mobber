// The top floor's night porter: one more place to sell what you took and stock up before the roof.
const { test } = require("node:test");
const assert = require("node:assert");
const { useBrowser, scene, game } = require("./helpers");

useBrowser();

test("the night porter buys and sells at his hatch by the roof stairs", async () => {
  const { page } = await scene("Hotel Regent, Top Floor", { clear: true });
  const w = await game(page, () => window.__mobber.windows);
  assert.equal(w.length, 1, "one hatch on the top floor");
  await game(page, () => { const M = window.__mobber, P = M.player, w = M.windows[0]; P.x = w.x - 0.9; P.y = w.y; P.loot = [["a silver hip flask", 200]]; });
  await page.keyboard.press("e");
  await page.waitForFunction(() => window.__mobber.shop);
  const cash = await game(page, () => window.__mobber.stats.cash);
  await page.keyboard.press("1");   // sell him the flask
  await page.waitForFunction(c => window.__mobber.stats.cash > c, cash);
  assert.equal(await game(page, () => window.__mobber.player.loot.length), 0);
});
