// Regressions for what an independent review found: state left behind by "Start the picture
// over", the lift's dark landing leaking into the next scene, the lift gate, the autogiro pad,
// men jammed in a doorway, and door men shot from out of their reach.
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { serve, openGame, rollFilm, game, chromium } = require("./helpers");

let srv, browser;
before(async () => { srv = await serve(); browser = await chromium.launch(); });
after(async () => { await browser.close(); srv.server.close(); });

const at = async title => {
  const g = await openGame(browser, srv.url);
  await rollFilm(g.page);
  await game(g.page, t => { const M = window.__mobber; M.startLevel(M.LEVELS.findIndex(l => l.title === t)); M.player.hp = 1e9; }, title);
  return g;
};
// Free the mouse (Esc, for a person), then the gear and two clicks on "Start the picture over"
const startOver = async page => {
  await page.evaluate(() => document.exitPointerLock());
  await page.waitForFunction(() => !document.pointerLockElement);
  await page.click("#gear");
  await page.click("#panel .row:has-text('Start the picture over')");
  await page.click("#panel .row:has-text('Sure?')");
};

test("starting the picture over with the fence's list open goes back to a clean title", async () => {
  const { page, errors } = await at("Mulberry Street");
  await game(page, () => { const M = window.__mobber, w = M.windows[0]; M.player.x = w.x; M.player.y = w.y; });
  await page.keyboard.press("e");
  await page.waitForFunction(() => window.__mobber.shop === true, null, { timeout: 4000 });
  await page.click("#gear");
  await page.click("#panel .row:has-text('Start the picture over')");
  await page.click("#panel .row:has-text('Sure?')");
  await page.waitForTimeout(600);
  assert.deepEqual(await game(page, () => [window.__mobber.state, window.__mobber.shop]), ["title", false]);
  // The picture is still running: the title's own clock moves
  const f0 = await game(page, () => window.__mobber.frames);
  await page.waitForTimeout(400);
  assert.ok(await game(page, () => window.__mobber.frames) > f0, "frames are still being drawn");
  assert.deepEqual(errors, []);
});

test("starting over with the Don's choice showing takes the choice away too", async () => {
  const { page, errors } = await at("The Roof");
  await game(page, () => {
    const M = window.__mobber, d = M.enemies.find(e => e.type.name === "boss"), P = M.player;
    for (const e of M.enemies) if (e !== d) { e.hp = 0; e.state = "dead"; }
    P.x = d.x - 1.5; P.y = d.y; P.a = 0; d.hp = 1; d.cd = 99; d.standing = true;
  });
  await page.keyboard.down(" ");
  await page.waitForFunction(() => window.__mobber.choice, null, { timeout: 6000 });
  await page.keyboard.up(" ");
  await page.click("#gear");
  await page.click("#panel .row:has-text('Start the picture over')");
  await page.click("#panel .row:has-text('Sure?')");
  await page.waitForTimeout(400);
  assert.deepEqual(await game(page, () => [window.__mobber.state, !!window.__mobber.choice, !!window.__mobber.chase]), ["title", false, false]);
  assert.deepEqual(errors, []);
});

test("the dark landing's light and its message stay on that landing", async () => {
  const { page, errors } = await at("Going Up");
  await page.waitForFunction(() => window.__mobber.lift.phase === "stop" && window.__mobber.lift.stop === 0, null, { timeout: 10000 });
  await game(page, () => { for (const e of window.__mobber.enemies) { e.hp = 0; e.state = "dead"; } });
  await page.waitForFunction(() => window.__mobber.lift.phase === "stop" && window.__mobber.lift.stop === 1, null, { timeout: 12000 });
  assert.ok(await game(page, () => window.__mobber.lightAt(8.5, 3.5)) < 0.3, "this is the dark one");
  // Die there and the scene rolls again: the lift car is lit as it should be
  await game(page, () => { const M = window.__mobber; M.startLevel(M.LEVELS.findIndex(l => l.title === "Going Up")); });
  const car = await game(page, () => { const M = window.__mobber; return { light: M.lightAt(M.player.x, M.player.y), ambient: M.level.ambient, msg: M.message }; });
  assert.ok(car.light >= car.ambient - 0.01, "the car is at least as bright as the scene's own light: " + JSON.stringify(car));
  assert.equal(car.msg, "", "and the landing's message is gone");
  // Start over from the dark landing: Mulberry Street is lit as Mulberry Street
  await page.waitForFunction(() => window.__mobber.lift.phase === "stop" && window.__mobber.lift.stop === 0, null, { timeout: 10000 });
  await game(page, () => { for (const e of window.__mobber.enemies) { e.hp = 0; e.state = "dead"; } });
  await page.waitForFunction(() => window.__mobber.lift.phase === "stop" && window.__mobber.lift.stop === 1, null, { timeout: 12000 });
  await startOver(page);
  await game(page, () => window.__mobber.startLevel(0));
  const street = await game(page, () => { const M = window.__mobber; return { light: M.lightAt(M.player.x, M.player.y), ambient: M.level.ambient }; });
  assert.ok(street.light >= street.ambient - 0.01, JSON.stringify(street));
  assert.deepEqual(errors, []);
});

test("the lift doesn't leave with you in its doorway, and nobody is put down on top of you", async () => {
  const { page, errors } = await at("Going Up");
  await page.waitForFunction(() => window.__mobber.lift.phase === "stop" && window.__mobber.lift.stop === 0, null, { timeout: 10000 });
  // The landing is clear, but you're standing in the gate
  await game(page, () => { const M = window.__mobber; for (const e of M.enemies) { e.hp = 0; e.state = "dead"; } M.player.x = M.lift.gate.x - 0.1; M.player.y = M.lift.gate.y + 0.5; });
  await page.waitForTimeout(1200);
  assert.equal(await game(page, () => window.__mobber.lift.phase), "stop", "it waits for you to step right in");
  await game(page, () => { window.__mobber.player.x = window.__mobber.lift.gate.x - 1.5; });
  await page.waitForFunction(() => window.__mobber.lift.phase === "ride", null, { timeout: 4000 });
  await page.waitForFunction(() => window.__mobber.lift.gate.open < 0.05, null, { timeout: 4000 });
  // Ride to the landing with a man at the gate, having somehow got out there first
  for (let s = 1; s < 3; s++) {
    await page.waitForFunction(s => window.__mobber.lift.phase === "stop" && window.__mobber.lift.stop === s, s, { timeout: 12000 });
    await game(page, () => { for (const e of window.__mobber.enemies) { e.hp = 0; e.state = "dead"; } });
  }
  await page.waitForFunction(() => window.__mobber.lift.phase === "ride", null, { timeout: 4000 });
  await game(page, () => { const M = window.__mobber; M.player.x = M.lift.gate.x + 2.5; M.player.y = M.lift.gate.y + 0.5; });
  await page.waitForFunction(() => window.__mobber.lift.phase === "stop" && window.__mobber.lift.stop === 3, null, { timeout: 12000 });
  const nearest = await game(page, () => { const M = window.__mobber, P = M.player; return Math.min(...M.enemies.map(e => Math.hypot(e.x - P.x, e.y - P.y))); });
  assert.ok(nearest > 1.2, "nobody was set down on top of you: " + nearest);
  assert.deepEqual(errors, []);
});

test("standing on the autogiro's pad doesn't keep the Don from it", async () => {
  const { page, errors } = await at("The Roof");
  await game(page, () => {
    const M = window.__mobber, d = M.enemies.find(e => e.type.name === "boss"), P = M.player, r = M.level.route, [x, y] = r[r.length - 1];
    for (const e of M.enemies) if (e !== d) { e.hp = 0; e.state = "dead"; }
    d.cd = 1e9; P.x = x; P.y = y; M.chase.len = 30;
  });
  await page.waitForFunction(() => window.__mobber.card && window.__mobber.card.kind === "escaped", null, { timeout: 60000 });
  assert.deepEqual(errors, []);
});

test("two men who want the same doorway get through it", async () => {
  const { page, errors } = await at("The Blue Note Club");
  const set = await game(page, () => {
    const M = window.__mobber, map = M.level.map;
    // A door with open floor on both sides, east and west or north and south
    for (let y = 1; y < map.length - 1; y++) for (let x = 1; x < map[0].length - 1; x++) {
      if (map[y][x] !== "D") continue;
      const ns = M.map[y - 1][x] === "." && M.map[y + 1][x] === ".", a = ns ? [x + 0.5, y - 1.5] : [x - 1.5, y + 0.5], b = ns ? [x + 0.5, y + 2.5] : [x + 2.5, y + 0.5];
      if (M.wallAt(a[0], a[1]) || M.wallAt(b[0], b[1])) continue;
      const [e1, e2] = M.enemies.filter(e => e.type.name === "goon");
      for (const e of M.enemies) if (e !== e1 && e !== e2) { e.hp = 0; e.state = "dead"; }
      M.folk.length = 0; M.player.x = 1.5; M.player.y = 1.5;
      // Each stands on one side and is sent to hold the other's place
      Object.assign(e1, { x: a[0], y: a[1], alert: true, state: "chase", cd: 1e9, hold: { x: b[0], y: b[1] } });
      Object.assign(e2, { x: b[0], y: b[1], alert: true, state: "chase", cd: 1e9, hold: { x: a[0], y: a[1] } });
      window.__pair = [e1, e2];
      return true;
    }
    return false;
  });
  assert.ok(set, "found a doorway");
  await page.waitForFunction(() => window.__pair.every(e => Math.hypot(e.hold.x - e.x, e.hold.y - e.y) < 0.6), null, { timeout: 15000 });
  assert.deepEqual(errors, []);
});

test("a man holding the door comes after you if you shoot him from further than his gun carries", async () => {
  const { page, errors } = await at("Regent Square");
  const set = await game(page, () => {
    const M = window.__mobber, P = M.player, h = window.__h = M.enemies.find(e => e.type.name === "heavy");
    for (const e of M.enemies) if (e !== h) { e.hp = 0; e.state = "dead"; }
    M.folk.length = 0;
    h.x = 30.5; h.y = 6.5; h.alert = true; h.state = "chase"; h.hold = { x: h.x, y: h.y }; h.hp = 1e6;
    P.x = 20.5; P.y = 6.5; P.a = 0;
    return { far: Math.hypot(h.x - P.x, h.y - P.y) > h.type.range, clear: M.los(P.x, P.y, h.x, h.y) };
  });
  assert.deepEqual(set, { far: true, clear: true });
  await page.keyboard.down(" ");
  await page.waitForFunction(() => window.__h.hold === null, null, { timeout: 6000 });
  await page.keyboard.up(" ");
  await page.waitForFunction(() => Math.hypot(window.__h.x - 30.5, window.__h.y - 6.5) > 1, null, { timeout: 6000 });
  assert.deepEqual(errors, []);
});
