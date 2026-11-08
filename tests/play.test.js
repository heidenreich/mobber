// Plays the game in headless Chromium through the same flow a player would.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { serve, openGame, rollFilm, game, chromium } = require("./helpers");

let srv, browser;
before(async () => { srv = await serve(); browser = await chromium.launch(); });
after(async () => { await browser.close(); srv.server.close(); });

// Jump straight to a level by its title
const goTo = (page, title) => game(page, t => window.__mobber.startLevel(window.__mobber.LEVELS.findIndex(l => l.title === t)), title);
const CLUB = "The Blue Note Club", HOTEL = "Hotel Regent, Top Floor";

// Stand on the floor square next to the exit door, facing it
const faceExit = page => game(page, () => {
  const M = window.__mobber, P = M.player, map = M.level.map;
  for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) {
    if (map[y][x] !== "E") continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (M.map[y + dy] && M.map[y + dy][x + dx] === ".") { P.x = x + dx + 0.5; P.y = y + dy + 0.5; P.a = Math.atan2(-dy, -dx); return; }
    }
  }
});

async function startedGame() {
  const g = await openGame(browser, srv.url);
  await rollFilm(g.page);
  return g;
}

test("title card, chapter card, then play", async () => {
  const { page, context, errors } = await startedGame();
  assert.equal(await game(page, () => window.__mobber.state), "play");
  const p = await game(page, () => ({ hp: window.__mobber.player.hp, weapon: window.__mobber.player.weapon }));
  assert.deepEqual(p, { hp: 100, weapon: 0 });
  assert.deepEqual(errors, []);
  await context.close();
});

test("renders at a playable frame rate", async () => {
  const { page, context } = await startedGame();
  const fps = await page.evaluate(() => new Promise(r => {
    let n = 0; const t0 = performance.now();
    (function f() { n++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : r(n / 2); })();
  }));
  assert.ok(fps > 25, `only ${fps.toFixed(1)} fps`);
  await context.close();
});

test("walking moves the player and walls stop them", async () => {
  const { page, context } = await startedGame();
  await game(page, () => { for (const e of window.__mobber.enemies) { e.hp = 0; e.state = "dead"; } });
  const a = await game(page, () => ({ x: window.__mobber.player.x, y: window.__mobber.player.y }));
  await page.keyboard.down("w"); await page.waitForTimeout(3000); await page.keyboard.up("w");
  const b = await game(page, () => ({ x: window.__mobber.player.x, y: window.__mobber.player.y }));
  assert.ok(Math.hypot(b.x - a.x, b.y - a.y) > 1, "player should have walked");
  assert.equal(await game(page, () => window.__mobber.wallAt(window.__mobber.player.x, window.__mobber.player.y)), false, "player ended up inside a wall");
  await context.close();
});

test("shooting a goon takes it down", async () => {
  const { page, context, errors } = await startedGame();
  await goTo(page, CLUB);
  // Stand in the main hall facing the nearest goon with a clear line of fire
  const target = await game(page, () => {
    const M = window.__mobber, P = M.player;
    P.x = 6.5; P.y = 8.5;
    let best = null, bd = 1e9;
    for (const e of M.enemies) {
      let clear = true;
      for (let i = 1; i < 40; i++) if (M.wallAt(P.x + (e.x - P.x) * i / 40, P.y + (e.y - P.y) * i / 40)) { clear = false; break; }
      const d = Math.hypot(e.x - P.x, e.y - P.y);
      if (clear && d < bd) { bd = d; best = M.enemies.indexOf(e); }
    }
    return best;
  });
  assert.notEqual(target, null, "no goon in sight of the main hall");
  for (let i = 0; i < 30; i++) {
    const down = await game(page, idx => {
      const M = window.__mobber, P = M.player, e = M.enemies[idx];
      P.hp = 100; P.a = Math.atan2(e.y - P.y, e.x - P.x);
      return e.hp <= 0;
    }, target);
    if (down) break;
    await page.keyboard.down(" "); await page.waitForTimeout(120); await page.keyboard.up(" ");
  }
  assert.ok(await game(page, idx => window.__mobber.enemies[idx].hp <= 0, target), "goon survived 30 shots");
  assert.deepEqual(errors, []);
  await context.close();
});

test("ledger, exit door and the next scene", async () => {
  const { page, context } = await startedGame();
  await goTo(page, CLUB);
  await game(page, () => {
    const M = window.__mobber, P = M.player, L = M.objs.find(o => o.pick === "ledger");
    for (const e of M.enemies) { e.hp = 0; e.state = "dead"; }
    P.x = L.x; P.y = L.y;
  });
  await page.waitForTimeout(300);
  assert.equal(await game(page, () => window.__mobber.player.ledger), true, "ledger not picked up");
  await faceExit(page);
  await page.keyboard.down("w"); await page.waitForTimeout(600); await page.keyboard.up("w");
  await page.waitForFunction(() => window.__mobber.state === "card");
  await page.waitForTimeout(700);
  await page.mouse.click(200, 200);
  await page.waitForFunction(() => window.__mobber.state === "play");
  assert.equal(await game(page, () => window.__mobber.level.title), "The Waterfront", "should be out on the street, heading for Pier 9");
  await context.close();
});

test("taking out the Don and leaving rolls THE END", async () => {
  const { page, context, errors } = await startedGame();
  await goTo(page, HOTEL);
  await game(page, () => { for (const e of window.__mobber.enemies) { e.hp = 0; e.state = "dead"; } });
  await faceExit(page);
  await page.keyboard.down("w"); await page.waitForTimeout(600); await page.keyboard.up("w");
  await page.waitForFunction(() => window.__mobber.state === "card");
  assert.equal(await game(page, () => window.__mobber.card.kind), "end");
  assert.deepEqual(errors, []);
  await context.close();
});

test("the exit stays shut without the ledger", async () => {
  const { page, context } = await startedGame();
  await goTo(page, CLUB);
  await game(page, () => { for (const e of window.__mobber.enemies) { e.hp = 0; e.state = "dead"; } });
  await faceExit(page);
  await page.keyboard.down("w"); await page.waitForTimeout(800); await page.keyboard.up("w");
  assert.equal(await game(page, () => window.__mobber.state), "play");
  await context.close();
});

test("a door slides open as you walk up and closes behind you", async () => {
  const { page, context, errors } = await startedGame();
  await goTo(page, CLUB);
  // Chapter one: the door between the main hall and the bar
  const door = () => game(page, () => window.__mobber.doors.get(5 * window.__mobber.level.map[0].length + 9).open);
  await game(page, () => { const M = window.__mobber, P = M.player; for (const e of M.enemies) { e.hp = 0; e.state = "dead"; } P.x = 9.5; P.y = 8.5; P.a = -Math.PI / 2; });
  assert.equal(await door(), 0, "starts closed");
  assert.equal(await game(page, () => window.__mobber.wallAt(9.5, 5.5)), true, "a closed door blocks the way");
  await page.keyboard.down("w"); await page.waitForTimeout(1600); await page.keyboard.up("w");
  assert.ok(await door() > 0.85, "door should be open");
  assert.ok(await game(page, () => window.__mobber.player.y < 5.5), "player should be through the doorway");
  // Walk on into the bar and wait: the door shuts behind you
  await game(page, () => { const P = window.__mobber.player; P.x = 3.5; P.y = 3.5; });
  await page.waitForTimeout(5000);
  assert.equal(await door(), 0, "door should have closed");
  assert.deepEqual(errors, []);
  await context.close();
});

test("walking into a secret wall slides it back to reveal a stash", async () => {
  const { page, context, errors } = await startedGame();
  await goTo(page, CLUB);
  // Chapter one: the cloak room's east wall at (7, 18) hides a small room
  await game(page, () => { const M = window.__mobber, P = M.player; for (const e of M.enemies) { e.hp = 0; e.state = "dead"; } P.x = 6.5; P.y = 18.5; P.a = 0; });
  assert.equal(await game(page, () => window.__mobber.map[18][7]), "!");
  await page.keyboard.down("w"); await page.waitForTimeout(500); await page.keyboard.up("w");
  await page.waitForTimeout(2600);
  const after = await game(page, () => ({ old: window.__mobber.map[18][7], next: window.__mobber.map[18][8], end: window.__mobber.map[18][9], found: window.__mobber.stats.secretsFound.size }));
  assert.deepEqual(after, { old: ".", next: ".", end: "W", found: 1 });
  // The stash's cash is now reachable
  await page.keyboard.down("w"); await page.waitForTimeout(500); await page.keyboard.up("w");
  await game(page, () => { const P = window.__mobber.player; P.x = 8.5; P.y = 19.5; });
  await page.waitForTimeout(300);
  await game(page, () => { const P = window.__mobber.player; P.x = 8.5; P.y = 20.5; });
  await page.waitForTimeout(300);
  assert.ok(await game(page, () => window.__mobber.stats.cash) > 0, "should have picked up the stash cash");
  assert.deepEqual(errors, []);
  await context.close();
});

test("dying shows the CUT! card and retrying restarts the scene", async () => {
  const { page, context } = await startedGame();
  await goTo(page, CLUB);
  await game(page, () => { const P = window.__mobber.player; P.hp = 1; P.x = 12.5; P.y = 7.5; });
  await page.waitForFunction(() => window.__mobber.state === "card", null, { timeout: 15000 });
  await page.waitForTimeout(700);
  await page.mouse.click(200, 200);
  await page.waitForFunction(() => window.__mobber.state === "play");
  assert.equal(await game(page, () => window.__mobber.player.hp), 100);
  await context.close();
});

test("the street scene ends at the Blue Note's front door", async () => {
  const { page, context, errors } = await startedGame();
  assert.equal(await game(page, () => window.__mobber.level.title), "Mulberry Street", "the picture opens on the street");
  await game(page, () => { for (const e of window.__mobber.enemies) { e.hp = 0; e.state = "dead"; } });
  await faceExit(page);
  await page.keyboard.down("w"); await page.waitForTimeout(600); await page.keyboard.up("w");
  await page.waitForFunction(() => window.__mobber.state === "card");
  await page.waitForTimeout(700);
  await page.mouse.click(200, 200);
  await page.waitForFunction(() => window.__mobber.state === "play");
  assert.equal(await game(page, () => window.__mobber.level.title), CLUB);
  assert.deepEqual(errors, []);
  await context.close();
});

test("every level loads and renders without errors", async () => {
  const { page, context, errors } = await startedGame();
  for (const i of [1, 2, 3, 4, 5]) {
    await game(page, n => window.__mobber.startLevel(n), i);
    await page.waitForTimeout(400);
    assert.equal(await game(page, () => window.__mobber.state), "play");
  }
  assert.deepEqual(errors, []);
  await context.close();
});
