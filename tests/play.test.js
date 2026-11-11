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

// Hold a key until the game reaches some state (rather than for a fixed time, so a
// slow machine running the game in slow motion doesn't fail the test)
async function holdUntil(page, key, cond, arg, timeout = 8000) {
  await page.keyboard.down(key);
  try { await page.waitForFunction(cond, arg, { timeout }); } finally { await page.keyboard.up(key); }
}
// Click through a title card once it has faded in enough to accept the click
async function clickCard(page) {
  await page.waitForFunction(() => window.__mobber.state === "card" && window.__mobber.fade >= 0.6);
  await page.mouse.click(200, 200);
  await page.waitForFunction(() => window.__mobber.state === "play");
}
const clearEnemies = page => game(page, () => { for (const e of window.__mobber.enemies) { e.hp = 0; e.state = "dead"; } });

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
  assert.ok(fps > 15, `only ${fps.toFixed(1)} fps`); // a low bar: CI machines are slow
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
  await page.waitForFunction(() => window.__mobber.player.ledger);
  await faceExit(page);
  await holdUntil(page, "w", () => window.__mobber.state === "card");
  await clickCard(page);
  assert.equal(await game(page, () => window.__mobber.level.title), "The Waterfront", "should be out on the street, heading for Pier 9");
  await context.close();
});

test("the penthouse Dons are doubles, and the exit leads to the roof", async () => {
  const { page, context, errors } = await startedGame();
  await goTo(page, HOTEL);
  assert.ok(await game(page, () => window.__mobber.enemies.filter(e => e.type.name === "double").length) >= 1);
  await faceExit(page);
  await page.keyboard.down("w"); await page.waitForTimeout(600); await page.keyboard.up("w"); // the exit stays shut with doubles standing
  assert.equal(await game(page, () => window.__mobber.state), "play");
  await clearEnemies(page);
  await faceExit(page);
  await holdUntil(page, "w", () => window.__mobber.state === "card");
  assert.equal(await game(page, () => window.__mobber.card.kind), "chapter");
  await clickCard(page);
  assert.equal(await game(page, () => window.__mobber.level.title), "The Roof");
  assert.deepEqual(errors, []);
  await context.close();
});

test("on the roof, the Don runs for the autogiro and escapes if you let him", async () => {
  const { page, context } = await startedGame();
  await goTo(page, "The Roof");
  const don = () => game(page, () => { const d = window.__mobber.enemies.find(e => e.type.name === "boss"); return { x: d.x, state: d.state }; });
  const start = await don();
  // Stay out of sight behind him: everyone else is gone, and the Don can't see us
  await game(page, () => { const M = window.__mobber; for (const e of M.enemies) if (e.type.name !== "boss") { e.hp = 0; e.state = "dead"; } M.player.hp = 1e9; });
  await page.waitForFunction(() => window.__mobber.state === "card", null, { timeout: 60000 });
  assert.equal(await game(page, () => window.__mobber.card.kind), "escaped", "letting him reach the autogiro shows HE GOT AWAY");
  assert.ok(start.x < 15, "he starts well short of the autogiro");
  await clickCard(page);
  assert.equal(await game(page, () => window.__mobber.level.title), "The Roof", "and the scene rolls again");
  await context.close();
});

test("taking out the real Don ends the picture: epilogue, then THE END", async () => {
  const { page, context, errors } = await startedGame();
  await goTo(page, "The Roof");
  await game(page, () => { const M = window.__mobber, d = M.enemies.find(e => e.type.name === "boss"); for (const e of M.enemies) if (e !== d) { e.hp = 0; e.state = "dead"; } const P = M.player; P.x = d.x - 1.5; P.y = d.y; P.a = 0; d.hp = 1; d.cd = 99; });
  await holdUntil(page, " ", () => window.__mobber.enemies.find(e => e.type.name === "boss").hp <= 0);
  await page.waitForFunction(() => window.__mobber.state === "card", null, { timeout: 10000 });
  assert.equal(await game(page, () => window.__mobber.card.kind), "epilogue");
  await page.waitForFunction(() => window.__mobber.fade >= 0.6);
  await page.mouse.click(200, 200);
  await page.waitForFunction(() => window.__mobber.card && window.__mobber.card.kind === "end");
  assert.deepEqual(errors, []);
  await context.close();
});

test("the exit stays shut without the ledger", async () => {
  const { page, context } = await startedGame();
  await goTo(page, CLUB);
  await clearEnemies(page);
  await faceExit(page);
  await page.keyboard.down("w"); await page.waitForTimeout(800); await page.keyboard.up("w"); // a fixed wait is right here: nothing should happen
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
  // Walking up opens it, and you walk through into the bar
  await holdUntil(page, "w", () => window.__mobber.player.y < 5.2);
  assert.ok(await door() > 0.85, "door should be open");
  // Walk on into the bar: the door shuts behind you
  await game(page, () => { const P = window.__mobber.player; P.x = 3.5; P.y = 3.5; });
  await page.waitForFunction(() => window.__mobber.doors.get(5 * window.__mobber.level.map[0].length + 9).open === 0, null, { timeout: 15000 });
  assert.deepEqual(errors, []);
  await context.close();
});

test("walking into a secret wall slides it back to reveal a stash", async () => {
  const { page, context, errors } = await startedGame();
  await goTo(page, CLUB);
  // Chapter one: the cloak room's east wall at (7, 18) hides a small room
  await game(page, () => { const M = window.__mobber, P = M.player; for (const e of M.enemies) { e.hp = 0; e.state = "dead"; } P.x = 6.5; P.y = 18.5; P.a = 0; });
  assert.equal(await game(page, () => window.__mobber.map[18][7]), "!");
  await holdUntil(page, "w", () => window.__mobber.map[18][7] !== "!");
  await page.waitForFunction(() => window.__mobber.map[18][9] === "W", null, { timeout: 15000 }); // settled two squares back
  const after = await game(page, () => ({ old: window.__mobber.map[18][7], next: window.__mobber.map[18][8], end: window.__mobber.map[18][9], found: window.__mobber.stats.secretsFound.size }));
  assert.deepEqual(after, { old: ".", next: ".", end: "W", found: 1 });
  // The stash's cash is now reachable
  await game(page, () => { const P = window.__mobber.player; P.x = 8.5; P.y = 20.5; });
  await page.waitForFunction(() => window.__mobber.stats.cash > 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test("dying shows CUT! and the retry really rewinds the scene", async () => {
  const { page, context } = await startedGame();
  await goTo(page, CLUB);
  const snapshot = () => game(page, () => {
    const M = window.__mobber, P = M.player;
    return { x: P.x, y: P.y, hp: P.hp, has: P.has, mag: P.mag, reserve: P.reserve, cash: M.stats.cash, kills: M.stats.kills, shots: M.stats.shots,
      alive: M.enemies.filter(e => e.hp > 0).length, pickups: M.objs.filter(o => o.pick).length };
  });
  const start = await snapshot();
  // Do well on the failed attempt: grab a tommy gun, spend ammo, collect cash, down a goon...
  await game(page, () => {
    const M = window.__mobber, P = M.player, S = M.stats;
    P.has[1] = true; P.mag = [1, 40]; P.reserve = [3, 99]; S.cash = 900; S.kills = 3; S.shots = 20;
    M.enemies[0].hp = 0; M.enemies[0].state = "dead"; M.objs.splice(M.objs.findIndex(o => o.pick), 1);
    P.x = 12.5; P.y = 7.5;
  });
  // ...then get shot down
  await game(page, () => window.__mobber.hurtPlayer(1000));
  assert.equal(await game(page, () => window.__mobber.card ? window.__mobber.state : "dying"), "dying");
  await page.waitForFunction(() => window.__mobber.state === "card");
  assert.equal(await game(page, () => window.__mobber.card.kind), "dead");
  await clickCard(page);
  const retry = await snapshot();
  assert.deepEqual(retry, start, "everything from the failed attempt should be undone");
  assert.equal(await game(page, () => window.__mobber.stats.deaths), 1);
  await context.close();
});

test("a death counts once, however many rounds hit the body", async () => {
  const { page, context } = await startedGame();
  await goTo(page, CLUB);
  await game(page, () => { const M = window.__mobber; M.hurtPlayer(1000); M.hurtPlayer(50); M.hurtPlayer(50); });
  // Gangsters near the body keep firing during the fade
  await game(page, () => { const M = window.__mobber, P = M.player; P.x = 12.5; P.y = 7.5; for (const e of M.enemies) Object.assign(e, { alert: true, state: "chase", cd: 0 }); });
  await page.waitForFunction(() => window.__mobber.state === "card");
  assert.equal(await game(page, () => window.__mobber.stats.deaths), 1);
  await context.close();
});

test("a dead man can't walk out the exit", async () => {
  const { page, context } = await startedGame();
  await clearEnemies(page);
  await faceExit(page);
  await game(page, () => { const P = window.__mobber.player, M = window.__mobber; P.x -= Math.cos(P.a) * 1.2; P.y -= Math.sin(P.a) * 1.2; M.hurtPlayer(1000); });
  await page.keyboard.down("w");
  await page.waitForFunction(() => window.__mobber.state === "card");
  await page.keyboard.up("w");
  assert.equal(await game(page, () => window.__mobber.card.kind), "dead", "should be CUT!, not the next scene");
  await context.close();
});

test("ammo runs out, gangsters drop more, and an empty gun still swings", async () => {
  const { page, context, errors } = await startedGame();
  await goTo(page, CLUB);
  assert.deepEqual(await game(page, () => ({ mag: window.__mobber.player.mag, reserve: window.__mobber.player.reserve, has: window.__mobber.player.has })),
    { mag: [6, 0], reserve: [12, 0], has: [true, false] }, "a fresh start is a loaded revolver and 12 spare rounds");
  // Shoot a goon standing right in front of us, until he drops
  const setup = await game(page, () => {
    const M = window.__mobber, P = M.player;
    M.enemies.forEach((e, i) => { if (i) { e.hp = 0; e.state = "dead"; } });
    P.x = 6.5; P.y = 9.5; P.a = 0;
    Object.assign(M.enemies[0], { x: 8.5, y: 9.5, hp: 40, state: "idle", alert: false, cd: 99 });
    return M.objs.length;
  });
  await holdUntil(page, " ", () => window.__mobber.enemies[0].hp <= 0);
  const p = await game(page, () => window.__mobber.player);
  assert.ok(p.mag[0] + p.reserve[0] < 18, "shooting should use up rounds");
  // He leaves loot where he fell; walk over it
  const loot = await game(page, n => window.__mobber.objs.slice(n).find(o => o.pick), setup);
  assert.ok(loot && ["rounds", "cash"].includes(loot.pick), "a downed goon should drop rounds, a tommy gun or cash");
  const before = await game(page, () => ({ ammo: window.__mobber.player.reserve.slice(), has: window.__mobber.player.has.slice(), cash: window.__mobber.stats.cash }));
  await game(page, () => { const P = window.__mobber.player; P.x = 8.5; P.y = 9.5; });
  await page.waitForFunction(n => !window.__mobber.objs.slice(n).some(o => o.pick), setup);
  const after = await game(page, () => ({ ammo: window.__mobber.player.reserve.slice(), has: window.__mobber.player.has.slice(), cash: window.__mobber.stats.cash }));
  assert.notDeepEqual(after, before, "picking up the loot should give ammo, a gun or cash");
  // Both guns dry: clicking swings the gun at a goon in arm's reach
  await game(page, () => {
    const M = window.__mobber, P = M.player;
    P.has = [true, false]; P.weapon = 0; P.mag = [0, 0]; P.reserve = [0, 0]; P.x = 6.5; P.y = 9.5; P.a = 0; P.fireCd = 0;
    Object.assign(M.enemies[0], { x: 7.6, y: 9.5, hp: 40, state: "idle", alert: false, cd: 99 });
  });
  await holdUntil(page, " ", () => window.__mobber.enemies[0].hp < 40);
  assert.equal(await game(page, () => window.__mobber.player.mag[0] + window.__mobber.player.reserve[0]), 0, "no bullets were conjured up");
  assert.deepEqual(errors, []);
  await context.close();
});

test("gangsters who hear you come looking, around walls and through doors", async () => {
  const { page, context } = await startedGame();
  await goTo(page, CLUB);
  // Everyone alerted while you're out of sight in the cloak room
  const start = await game(page, () => {
    const M = window.__mobber, P = M.player; P.hp = 1e9;
    for (const e of M.enemies) { e.alert = true; e.lx = P.x; e.ly = P.y; e.cd = 99; }
    return M.enemies.map(e => [e.x, e.y]);
  });
  await page.waitForFunction(s => window.__mobber.enemies.filter((e, i) => Math.hypot(e.x - s[i][0], e.y - s[i][1]) > 1.5).length >= s.length * 0.7, start, { timeout: 15000 });
  // Someone actually makes it to the cloak room, which means coming through its door
  await page.waitForFunction(() => { const M = window.__mobber, P = M.player; return M.enemies.some(e => Math.hypot(e.x - P.x, e.y - P.y) < 4); }, null, { timeout: 20000 });
  await context.close();
});

test("the Don can't be pinned down with a tommy gun", async () => {
  const { page, context } = await startedGame();
  await goTo(page, "The Roof");
  await game(page, () => {
    const M = window.__mobber, d = M.enemies.find(e => e.type.name === "boss"), P = M.player;
    for (const e of M.enemies) if (e !== d) { e.hp = 0; e.state = "dead"; }
    P.hp = 1e9; P.has[1] = true; P.weapon = 1; P.mag[1] = 50; P.reserve[1] = 100; P.x = d.x - 2; P.y = d.y; P.a = 0;
    window.__flinched = false;
    (function watch() { if (d.state === "hurt") window.__flinched = true; if (d.hp > 0) requestAnimationFrame(watch); })();
  });
  await page.keyboard.down(" "); await page.waitForTimeout(1500); await page.keyboard.up(" ");
  assert.ok(await game(page, () => window.__mobber.enemies.find(e => e.type.name === "boss").hp < 480), "he should have been hit");
  assert.equal(await game(page, () => window.__flinched), false, "the Don never flinches");
  await context.close();
});

test("standing in the Don's way doesn't stop him", async () => {
  const { page, context } = await startedGame();
  await goTo(page, "The Roof");
  await game(page, () => {
    const M = window.__mobber, d = M.enemies.find(e => e.type.name === "boss"), P = M.player, [x, y] = M.level.route[1];
    for (const e of M.enemies) if (e !== d) { e.hp = 0; e.state = "dead"; }
    d.cd = 1e9; P.hp = 1e9; P.x = x; P.y = y; // right on his route
  });
  await page.waitForFunction(() => window.__mobber.card && window.__mobber.card.kind === "escaped", null, { timeout: 60000 });
  await context.close();
});

test("tall props are cover; you can shoot over a parked car", async () => {
  const { page, context } = await startedGame();
  const across = (M, o) => ({ blocked: !M.los(o.x - 1.2, o.y, o.x + 1.2, o.y), beside: !M.los(o.x - 1.2, o.y - 1.1, o.x + 1.2, o.y - 1.1) });
  // A parked car on Mulberry Street: shorter than a man, so it doesn't stop a bullet
  const car = await game(page, () => { const M = window.__mobber, c = M.objs.find(o => o.art === M.objs.find(p => p.size === 0.8).art); return !M.los(c.x - 1.2, c.y, c.x + 1.2, c.y); });
  assert.equal(car, false, "a car doesn't block the shot");
  // A water tower on the roof does
  await goTo(page, "The Roof");
  const tower = await game(page, () => { const M = window.__mobber, w = M.objs.find(o => o.cover && o.size === 0.8 && o.scale > 2); return { blocked: !M.los(w.x - 1.2, w.y, w.x + 1.2, w.y), beside: !M.los(w.x - 1.2, w.y - 1.1, w.x + 1.2, w.y - 1.1) }; });
  assert.deepEqual(tower, { blocked: true, beside: false });
  await context.close();
});

test("nothing can kill you once you've reached the exit", async () => {
  const { page, context } = await startedGame();
  await clearEnemies(page);
  await faceExit(page);
  await holdUntil(page, "w", () => window.__mobber.state !== "play");
  await game(page, () => window.__mobber.hurtPlayer(1000));
  await page.waitForFunction(() => window.__mobber.state === "card");
  assert.equal(await game(page, () => window.__mobber.card.kind), "chapter");
  await context.close();
});

test("holding Q swaps guns once, not on every key-repeat", async () => {
  const { page, context } = await startedGame();
  await game(page, () => { const P = window.__mobber.player; P.has[1] = true; P.mag[1] = 30; P.weapon = 0; });
  await page.keyboard.down("q"); await page.keyboard.down("q"); await page.keyboard.down("q"); await page.keyboard.up("q");
  assert.equal(await game(page, () => window.__mobber.player.weapon), 1);
  await context.close();
});

test("full pockets leave the rounds on the floor", async () => {
  const { page, context } = await startedGame();
  await clearEnemies(page);
  const box = await game(page, () => { const M = window.__mobber, b = M.objs.find(o => o.pick === "rounds" && o.weapon === 0); M.player.reserve[0] = 36; return b; });
  await game(page, b => { const P = window.__mobber.player; P.x = b.x; P.y = b.y; }, box);
  await page.waitForTimeout(400); // a fixed wait is right here: nothing should happen
  assert.equal(await game(page, () => window.__mobber.player.reserve[0]), 36);
  assert.ok(await game(page, b => window.__mobber.objs.some(o => o.x === b.x && o.y === b.y), box), "the box should still be there");
  await context.close();
});

test("health carries over between scenes, with a floor", async () => {
  const { page, context } = await startedGame();
  for (const [hp, expect] of [[72, 72], [20, 50]]) {
    await goTo(page, "Mulberry Street");
    await clearEnemies(page);
    await game(page, h => { window.__mobber.player.hp = h; }, hp);
    await faceExit(page);
    await holdUntil(page, "w", () => window.__mobber.state === "card");
    await clickCard(page);
    assert.equal(await game(page, () => Math.round(window.__mobber.player.hp)), expect);
  }
  await context.close();
});

test("a box of rounds tops up the revolver", async () => {
  const { page, context } = await startedGame();
  await clearEnemies(page);
  const box = await game(page, () => window.__mobber.objs.find(o => o.pick === "rounds" && o.weapon === 0));
  assert.ok(box, "Mulberry Street should have a box of revolver rounds");
  await game(page, b => { const P = window.__mobber.player; P.x = b.x; P.y = b.y; }, box);
  await page.waitForFunction(() => window.__mobber.player.reserve[0] === 18); // 12 to start + a box of 6
  await context.close();
});

test("the street scene ends at the Blue Note's front door", async () => {
  const { page, context, errors } = await startedGame();
  assert.equal(await game(page, () => window.__mobber.level.title), "Mulberry Street", "the picture opens on the street");
  await game(page, () => { for (const e of window.__mobber.enemies) { e.hp = 0; e.state = "dead"; } });
  await faceExit(page);
  await holdUntil(page, "w", () => window.__mobber.state === "card");
  await clickCard(page);
  assert.equal(await game(page, () => window.__mobber.level.title), CLUB);
  assert.deepEqual(errors, []);
  await context.close();
});

test("every level loads and renders without errors", async () => {
  const { page, context, errors } = await startedGame();
  for (const i of [1, 2, 3, 4, 5, 6]) {
    await game(page, n => window.__mobber.startLevel(n), i);
    await page.waitForTimeout(400);
    assert.equal(await game(page, () => window.__mobber.state), "play");
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test("a dialogue card stops the action, then the scene carries on", async () => {
  const { page, errors } = await openGame(browser, srv.url);
  await rollFilm(page);
  // Stand a gangster in front of you with dialogue cards on: the first to see you speaks
  await game(page, () => {
    const M = window.__mobber, P = M.player, e = M.enemies[0];
    M.dialogue = true;
    for (const o of M.enemies) if (o !== e) { o.hp = 0; o.state = "dead"; }
    e.x = P.x + Math.cos(P.a) * 3; e.y = P.y + Math.sin(P.a) * 3; e.alert = false; e.state = "idle";
  });
  await page.waitForFunction(() => window.__mobber.intertitle);
  const before = await game(page, () => ({ lines: window.__mobber.intertitle.lines.join(" "), cd: window.__mobber.enemies[0].cd }));
  assert.match(before.lines, /Eddie's brother/);
  await page.waitForTimeout(400);
  assert.equal(await game(page, () => window.__mobber.enemies[0].cd), before.cd, "the gangster waits while the card is up");
  await page.waitForFunction(() => !window.__mobber.intertitle, null, { timeout: 6000 });
  assert.equal(await game(page, () => window.__mobber.state), "play");
  // Each line is spoken once: a second gangster seeing you doesn't repeat it
  await game(page, () => { const e = window.__mobber.enemies[0]; e.alert = false; e.state = "idle"; });
  await page.waitForTimeout(300);
  assert.equal(await game(page, () => window.__mobber.intertitle), null);
  assert.deepEqual(errors, []);
});

test("the pianist plays under the picture", async () => {
  const { page, errors } = await openGame(browser, srv.url);
  await rollFilm(page);
  await page.waitForFunction(() => window.__mobber.music.playing, null, { timeout: 5000 });
  assert.equal(await game(page, () => window.__mobber.music.playing), "street", "the first scene is a rainy street");
  await game(page, () => window.__mobber.startLevel(1));
  await page.waitForFunction(() => window.__mobber.music.playing === "joint", null, { timeout: 5000 });
  await game(page, () => window.__mobber.startLevel(window.__mobber.LEVELS.length - 1));
  await page.waitForFunction(() => window.__mobber.music.playing === "chase", null, { timeout: 5000 });
  assert.deepEqual(errors, []);
});
