// Bystanders, the pianist, and the fence.
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

test("the first shot stops the piano, scatters the patrons and sends the staff to the floor", async () => {
  const { page, errors } = await club();
  await page.waitForFunction(() => window.__mobber.music.playing === "joint", null, { timeout: 5000 });
  // Fire into a wall from the middle of the main hall
  await game(page, () => { const P = window.__mobber.player; P.x = 9.5; P.y = 9.5; P.a = -Math.PI / 2; P.mag[0] = 6; P.fireCd = 0; });
  await page.keyboard.down(" "); await page.waitForTimeout(100); await page.keyboard.up(" ");
  await page.waitForFunction(() => window.__mobber.music.playing === null, null, { timeout: 4000 });
  const who = await kinds(page);
  assert.ok(who.includes("pianist:cower") && who.includes("barman:cower"), who.join());
  assert.ok(who.some(k => k.endsWith(":flee") || k.endsWith(":gone")), "patrons running: " + who.join());
  // They scatter: not all to the same place, and away from where the shot was fired
  const goals = await game(page, () => { const P = window.__mobber.player; return window.__mobber.folk.filter(f => f.goal).map(f => ({ at: f.goal.x + "," + f.goal.y, leave: !!f.goal.leave, away: Math.hypot(f.goal.x - P.x, f.goal.y - P.y) })); });
  assert.ok(goals.length >= 3, "the patrons each picked somewhere to go");
  assert.ok(new Set(goals.map(g => g.at)).size >= 2, "they don't all run to the same spot: " + JSON.stringify(goals));
  assert.ok(goals.some(g => g.leave) && goals.some(g => !g.leave), "some make for a way out, some for a place to hide");
  assert.ok(goals.every(g => g.away > 3), "nobody runs at the gun");
  // Every one of them ends up gone or down on the floor somewhere, not left running about
  await page.waitForFunction(() => window.__mobber.folk.every(f => f.state === "gone" || f.state === "cower"), null, { timeout: 25000 });
  assert.ok(await game(page, () => window.__mobber.folk.some(f => f.state === "gone")), "some got out");
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

// Stand in the alley facing the fence's window
const toWindow = page => game(page, () => {
  const M = window.__mobber, P = M.player, w = M.windows[0];
  for (const e of M.enemies) { e.hp = 0; e.state = "dead"; }
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (!M.wallAt(w.x + dx, w.y + dy)) { P.x = w.x + dx * 0.9; P.y = w.y + dy * 0.9; P.a = Math.atan2(-dy, -dx); }
});

test("the fence deals through a window down an alley, and what you buy is yours at once", async () => {
  const { page, errors } = await openGame(browser, srv.url);
  await rollFilm(page);   // Mulberry Street
  await game(page, () => { const M = window.__mobber, P = M.player; M.stats.cash = 1000; P.hp = 40; P.reserve[0] = 0; });
  await toWindow(page);
  await page.waitForTimeout(150);
  assert.equal(await game(page, () => window.__mobber.shop), false, "he waits to be asked");
  await page.keyboard.press("e");
  await page.waitForFunction(() => window.__mobber.shop);
  const t0 = await game(page, () => window.__mobber.stats.time);
  // 1 is the box of rounds, 2 the doctor (no tommy gun or sawn-off yet, so those lines aren't offered), 3 the vest
  await page.keyboard.press("1"); await page.keyboard.press("2");
  assert.deepEqual(await game(page, () => { const M = window.__mobber, P = M.player; return [M.stats.cash, P.mag[0] + P.reserve[0], P.hp]; }), [600, 18, 75]);
  await page.keyboard.press("3");
  assert.equal(await game(page, () => window.__mobber.stats.cash), 600, "can't afford the vest");
  // Clicking a line buys it too
  await page.waitForFunction(() => window.__mobber.shopRows.length > 0);
  const row = await game(page, () => { const r = window.__mobber.shopRows[0]; return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }; });
  await page.mouse.click(row.x, row.y);
  assert.deepEqual(await game(page, () => [window.__mobber.stats.cash, window.__mobber.shop]), [450, true]);
  assert.equal(await game(page, () => window.__mobber.stats.time), t0, "the clock stops while you deal");
  // E walks away, and you're back in the alley
  await page.keyboard.press("e");
  await page.waitForFunction(() => !window.__mobber.shop);
  assert.equal(await game(page, () => window.__mobber.state), "play");
  assert.deepEqual(errors, []);
});

test("a shot brings the fence's shutter down, and it goes back up when it's quiet", async () => {
  const { page, errors } = await openGame(browser, srv.url);
  await rollFilm(page);
  await toWindow(page);
  await game(page, () => { const P = window.__mobber.player; P.mag[0] = 6; P.fireCd = 0; });
  await page.keyboard.down(" "); await page.waitForTimeout(100); await page.keyboard.up(" ");
  await page.waitForFunction(() => window.__mobber.fenceShut > 0, null, { timeout: 3000 });
  await page.keyboard.press("e");
  await page.waitForTimeout(200);
  assert.equal(await game(page, () => window.__mobber.shop), false, "no dealing through a shutter");
  await page.waitForFunction(() => window.__mobber.fenceShut === 0, null, { timeout: 9000 });
  await page.keyboard.press("e");
  await page.waitForFunction(() => window.__mobber.shop, null, { timeout: 3000 });
  assert.deepEqual(errors, []);
});

test("every street has the fence's window at the end of an alley, with his sign by its mouth", async () => {
  const { page, errors } = await openGame(browser, srv.url);
  const streets = await game(page, () => window.__mobber.LEVELS.filter(l => l.objective === "reach").map(l => {
    const rows = l.map, y = rows.findIndex(r => r.includes("Q")), x = y < 0 ? -1 : rows[y].indexOf("Q");
    // open ground on exactly one side of the window: the alley
    const open = y < 0 ? 0 : [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([dx, dy]) => (rows[y + dy] || "")[x + dx] === ".").length;
    return { title: l.title, windows: rows.join("").split("Q").length - 1, sign: rows.join("").includes("K"), open };
  }));
  assert.equal(streets.length, 3);
  for (const s of streets) assert.deepEqual([s.windows, s.sign, s.open], [1, true, 1], s.title);
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
