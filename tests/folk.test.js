// Bystanders, the pianist, and the dealer between scenes.
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { serve, openGame, rollFilm, game, chromium } = require("./helpers");

let srv, browser;
before(async () => { srv = await serve(); browser = await chromium.launch(); });
after(async () => { await browser.close(); srv.server.close(); });

const club = async () => {
  const g = await openGame(browser, srv.url);
  await rollFilm(g.page);
  await game(g.page, () => { const M = window.__mobber; M.startLevel(M.LEVELS.findIndex(l => l.title === "The Blue Note Club")); for (const e of M.enemies) { e.hp = 0; e.state = "dead"; } M.player.hp = 1e9; });
  return g;
};
const kinds = page => game(page, () => window.__mobber.folk.map(f => f.kind + ":" + f.state).sort());

test("the Blue Note has patrons, a bartender and a pianist, and the piano is the music", async () => {
  const { page, errors } = await club();
  const who = await kinds(page);
  assert.ok(who.includes("barman:idle") && who.includes("pianist:idle"), who.join());
  assert.ok(who.filter(k => k.startsWith("gent") || k.startsWith("lady")).length >= 3, "patrons at the tables");
  await page.waitForFunction(() => window.__mobber.music.playing === "joint", null, { timeout: 5000 });
  assert.deepEqual(errors, []);
});

test("the first shot stops the piano, sends the patrons for the door and the staff to the floor", async () => {
  const { page, errors } = await club();
  await page.waitForFunction(() => window.__mobber.music.playing === "joint", null, { timeout: 5000 });
  // Fire into a wall from the middle of the main hall
  await game(page, () => { const P = window.__mobber.player; P.x = 9.5; P.y = 9.5; P.a = -Math.PI / 2; P.mag[0] = 6; P.fireCd = 0; });
  await page.keyboard.down(" "); await page.waitForTimeout(100); await page.keyboard.up(" ");
  await page.waitForFunction(() => window.__mobber.music.playing === null, null, { timeout: 4000 });
  const who = await kinds(page);
  assert.ok(who.includes("pianist:cower") && who.includes("barman:cower"), who.join());
  assert.ok(who.some(k => k.endsWith(":flee") || k.endsWith(":gone")), "patrons running: " + who.join());
  // They make it out the way you came in
  await page.waitForFunction(() => window.__mobber.folk.filter(f => f.kind === "gent" || f.kind === "lady").every(f => f.state === "gone"), null, { timeout: 25000 });
  assert.equal(await game(page, () => window.__mobber.stats.bystanders), 0);
  assert.deepEqual(errors, []);
});

test("a bullet that finds a bystander is counted against you", async () => {
  const { page, errors } = await club();
  await game(page, () => {
    const M = window.__mobber, P = M.player, f = M.folk.find(f => f.kind === "gent" || f.kind === "lady");
    P.x = 9.5; P.y = 9.5; P.a = 0; f.x = P.x + 2; f.y = P.y; P.mag[0] = 6; P.fireCd = 0;
  });
  await page.keyboard.down(" "); await page.waitForTimeout(100); await page.keyboard.up(" ");
  await page.waitForFunction(() => window.__mobber.stats.bystanders === 1, null, { timeout: 4000 });
  assert.ok(await game(page, () => window.__mobber.folk.some(f => f.state === "down")));
  assert.deepEqual(errors, []);
});

test("with cash in hand the dealer stops you between scenes, and what you buy comes with you", async () => {
  const { page, errors } = await openGame(browser, srv.url);
  await rollFilm(page);
  await game(page, async () => {
    const M = window.__mobber, P = M.player;
    for (const e of M.enemies) { e.hp = 0; e.state = "dead"; }
    M.stats.cash = 1000; P.hp = 40; P.reserve[0] = 0;
    (await import("/src/flow.js")).nextCard(1);
  });
  await page.waitForFunction(() => window.__mobber.state === "card" && window.__mobber.fade >= 0.6);
  assert.equal(await game(page, () => window.__mobber.card.kind), "shop");
  // 1 is the box of rounds, 2 the doctor (no tommy gun or sawn-off yet, so those lines aren't offered), 3 the vest
  await page.keyboard.press("1"); await page.keyboard.press("2");
  assert.deepEqual(await game(page, () => { const M = window.__mobber, P = M.player; return [M.stats.cash, P.reserve[0], P.hp]; }), [600, 12, 75]);
  await page.keyboard.press("3");
  assert.equal(await game(page, () => window.__mobber.stats.cash), 600, "can't afford the vest");
  // Clicking a line buys it too; clicking elsewhere walks on to the next scene's card
  const row = await game(page, () => { const r = window.__mobber.shopRows[0]; return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }; });
  await page.mouse.click(row.x, row.y);
  assert.deepEqual(await game(page, () => [window.__mobber.stats.cash, window.__mobber.player.reserve[0], window.__mobber.card.kind]), [450, 24, "shop"]);
  await page.mouse.click(200, 200);
  await page.waitForFunction(() => window.__mobber.card.kind === "chapter");
  await page.waitForFunction(() => window.__mobber.fade >= 0.6);
  await page.mouse.click(200, 200);
  await page.waitForFunction(() => window.__mobber.state === "play");
  assert.deepEqual(await game(page, () => { const P = window.__mobber.player; return [P.reserve[0], P.hp]; }), [24, 75], "carried into the next scene");
  assert.deepEqual(errors, []);
});

test("a steel vest takes half of what hits you until it's used up", async () => {
  const { page, errors } = await openGame(browser, srv.url);
  await rollFilm(page);
  const hp = await game(page, () => { const M = window.__mobber, P = M.player; P.hp = 100; P.vest = 60; M.hurtPlayer(40); const a = [P.hp, P.vest]; M.hurtPlayer(200); return [...a, P.vest]; });
  assert.deepEqual(hp.slice(0, 2), [80, 40], "40 points of harm: 20 to you, 20 to the vest");
  assert.equal(hp[2], 0, "a big hit uses it up");
  assert.deepEqual(errors, []);
});
