// A scene never opens with you already spotted: standing still where you come in,
// nobody sees you while the iris opens, and nobody is looking your way when it has.
const { test } = require("node:test");
const assert = require("node:assert");
const { useBrowser, scene, game } = require("./helpers");

useBrowser();

for (const title of ["Mulberry Street", "The Waterfront", "Pier 9", "Regent Square"]) {
  test(`${title}: standing where you come in, nobody spots you in the first few seconds`, async () => {
    const { page } = await scene(title);
    await page.waitForFunction(() => window.__mobber.fade >= 1);
    // (a slow machine plays in slow motion, so wait on the scene's own clock, not the wall's)
    await page.waitForFunction(() => window.__mobber.stats.time >= 4, null, { timeout: 20000 });
    const r = await game(page, () => {
      const M = window.__mobber;
      return { hp: M.player.hp, alarm: !!M.alarm, alert: M.enemies.filter(e => e.alert && !e.type.flees).map(e => `${e.type.name} at ${e.x | 0},${e.y | 0}`) };
    });
    assert.deepEqual(r.alert, [], "nobody alerted");
    assert.equal(r.alarm, false, "no alarm");
    assert.equal(r.hp, 100, "not a scratch");
  });
}
