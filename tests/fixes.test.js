// What a full check of the game turned up: a trigger press shorter than a frame fired nothing,
// FIRE and SWAP sat over the fence's list on a phone, the last man on a lift landing ran and hid,
// and a scene reached nearly empty-handed could only be retried empty-handed.
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { serve, openGame, rollFilm, game, chromium, devices } = require("./helpers");

let srv, browser;
before(async () => { srv = await serve(); browser = await chromium.launch(); });
after(async () => { await browser.close(); srv.server.close(); });

test("a trigger press shorter than a frame still fires", async () => {
  const { page, errors } = await openGame(browser, srv.url);
  await rollFilm(page);
  await game(page, () => { for (const e of window.__mobber.enemies) { e.hp = 0; e.state = "dead"; } });
  // Down and up again before the game has drawn another frame
  await game(page, () => { for (const type of ["keydown", "keyup"]) window.dispatchEvent(new KeyboardEvent(type, { key: " " })); });
  await page.waitForFunction(() => window.__mobber.stats.shots === 1, null, { timeout: 2000 });
  await page.waitForTimeout(600);
  assert.equal(await game(page, () => window.__mobber.stats.shots), 1, "one press, one shot");
  assert.deepEqual(errors, []);
});

test("on a phone FIRE and SWAP get out of the way of the fence's list", async () => {
  const { page, errors } = await openGame(browser, srv.url, { ...devices["iPhone 13 landscape"] });
  await rollFilm(page, true);
  const shown = () => game(page, () => ["fire", "swap"].map(id => getComputedStyle(document.getElementById(id)).visibility));
  await game(page, () => { const M = window.__mobber, w = M.windows[0]; for (const e of M.enemies) { e.hp = 0; e.state = "dead"; } M.player.has = [true, true, false]; M.player.x = w.x; M.player.y = w.y - 0.6; });
  await page.waitForFunction(() => window.__mobber.shop);
  await page.waitForTimeout(100);
  assert.deepEqual(await shown(), ["hidden", "hidden"]);
  await game(page, () => window.__mobber.closeShop());
  await page.waitForTimeout(100);
  assert.deepEqual(await shown(), ["visible", "visible"]);
  assert.deepEqual(errors, []);
});

test("the last man on a lift landing doesn't run and hide", async () => {
  const { page, errors } = await openGame(browser, srv.url);
  await rollFilm(page);
  await game(page, () => { const M = window.__mobber; M.startLevel(M.LEVELS.findIndex(l => l.title === "Going Up")); M.lift.stop = 1; M.lift.t = 0.1; M.player.hp = 1e9; });
  await page.waitForFunction(() => window.__mobber.lift.stop === 2 && window.__mobber.enemies.length === 3);
  // Shoot two of the three, one at a time, from right in front of them
  for (let n = 0; n < 2; n++) {
    await game(page, n => {
      const M = window.__mobber, P = M.player, v = M.enemies[n];
      for (const e of M.enemies) e.cd = 999;
      P.x = 5.5; P.y = 3.5; P.a = 0; P.mag[0] = 6; P.reload = 0; P.fireCd = 0;
      Object.assign(v, { x: 7, y: 3.5, hp: 1, den: null, hold: null });
    }, n);
    await page.keyboard.press("Space");
    await page.waitForFunction(n => window.__mobber.enemies[n].hp <= 0, n, { timeout: 3000 });
  }
  const last = await game(page, () => { const e = window.__mobber.enemies[2]; return { hp: e.hp, panic: !!e.panic, name: e.type.name }; });
  assert.deepEqual([last.name, last.hp > 0, last.panic], ["goon", true, false]);
  assert.deepEqual(errors, []);
});

test("a retake starts with enough health and rounds to have a chance; a first try doesn't", async () => {
  const { page, errors } = await openGame(browser, srv.url);
  await rollFilm(page);
  const loadout = () => game(page, () => { const P = window.__mobber.player; return [P.hp, P.mag[0] + P.reserve[0]]; });
  // Arrive at the top floor hurt and nearly out (Regular: you start a scene with at least 30 health)
  await game(page, () => {
    const M = window.__mobber, P = M.player; P.hp = 5; P.mag = [3, 0, 0]; P.reserve = [0, 0, 0];
    M.startLevel(M.LEVELS.findIndex(l => l.title === "Hotel Regent, Top Floor"));
  });
  assert.deepEqual(await loadout(), [30, 3], "the first try is as hard as you made it");
  await game(page, () => window.__mobber.startLevel(window.__mobber.LEVELS.findIndex(l => l.title === "Hotel Regent, Top Floor"), true));
  assert.deepEqual(await loadout(), [60, 24], "the retake is not");
  assert.match(await game(page, () => window.__mobber.message), /Another take/);
  // Each further death in the same scene adds 10 health and 6 rounds, up to full health and full pockets
  const again = () => game(page, () => window.__mobber.startLevel(window.__mobber.LEVELS.findIndex(l => l.title === "Hotel Regent, Top Floor"), true));
  await again(); assert.deepEqual(await loadout(), [70, 30]);
  await again(); await again(); await again();
  assert.deepEqual(await loadout(), [100, 42], "and no further than that");
  // Someone who walked in well supplied gets nothing extra
  await game(page, () => {
    const M = window.__mobber, P = M.player; P.hp = 90; P.mag = [6, 0, 0]; P.reserve = [30, 0, 0];
    const i = M.LEVELS.findIndex(l => l.title === "The Roof"); M.startLevel(i); M.startLevel(i, true);
  });
  assert.deepEqual(await loadout(), [90, 36]);
  assert.doesNotMatch(await game(page, () => window.__mobber.message), /Another take/);
  assert.deepEqual(errors, []);
});
