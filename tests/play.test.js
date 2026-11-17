// Plays the game in headless Chromium through the same flow a player would.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { useBrowser, open, scene, rollFilm, game, holdUntil, shoot, clickCard, clearEnemies } = require("./helpers");

useBrowser();
const CLUB = "The Blue Note Club", HOTEL = "Hotel Regent, Top Floor";
const goTo = (page, title) => game(page, t => window.__mobber.startLevel(window.__mobber.LEVELS.findIndex(l => l.title === t)), title);

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

test("title card, chapter card, then play, on the street", async () => {
  const { page } = await open();
  await rollFilm(page);
  assert.equal(await game(page, () => window.__mobber.state), "play");
  const p = await game(page, () => ({ title: window.__mobber.level.title, hp: window.__mobber.player.hp, weapon: window.__mobber.player.weapon }));
  assert.deepEqual(p, { title: "Mulberry Street", hp: 100, weapon: 0 });
});

test("renders at a playable frame rate", async () => {
  const { page } = await scene();
  const fps = await page.evaluate(() => new Promise(r => {
    let n = 0; const t0 = performance.now();
    (function f() { n++; performance.now() - t0 < 1000 ? requestAnimationFrame(f) : r(n); })();
  }));
  assert.ok(fps > 15, `only ${fps.toFixed(1)} fps`); // a low bar: CI machines are slow
});

test("walking moves the player, and not into a wall", async () => {
  const { page } = await scene(undefined, { clear: true });
  const a = await game(page, () => ({ x: window.__mobber.player.x, y: window.__mobber.player.y }));
  await holdUntil(page, "w", a => Math.hypot(window.__mobber.player.x - a.x, window.__mobber.player.y - a.y) > 1, a);
  assert.equal(await game(page, () => window.__mobber.wallAt(window.__mobber.player.x, window.__mobber.player.y)), false, "player ended up inside a wall");
});

test("shooting a goon takes it down", async () => {
  const { page } = await scene(CLUB);
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
    await shoot(page);
  }
  assert.ok(await game(page, idx => window.__mobber.enemies[idx].hp <= 0, target), "goon survived 30 shots");
});

test("ledger, exit door and the next scene", async () => {
  const { page } = await scene(CLUB, { clear: true });
  await game(page, () => {
    // The ledger is in the office safe: stand next to it
    const M = window.__mobber, P = M.player, safe = M.objs.find(o => o.safe);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!M.wallAt(safe.x + dx, safe.y + dy)) { P.x = safe.x + dx * 1.1; P.y = safe.y + dy * 1.1; break; }
  });
  await page.waitForFunction(() => window.__mobber.cracking && !window.__mobber.cracking.working);
  assert.equal(await game(page, () => window.__mobber.player.ledger), false, "the safe doesn't open by itself");
  // Work the dial (hold E) until it gives
  await holdUntil(page, "e", () => window.__mobber.player.ledger);
  await faceExit(page);
  await holdUntil(page, "w", () => window.__mobber.state === "card");
  await clickCard(page);
  assert.equal(await game(page, () => window.__mobber.level.title), "The Waterfront", "should be out on the street, heading for Pier 9");
});

test("the exit stays shut without the ledger", async () => {
  const { page } = await scene(CLUB, { clear: true });
  await faceExit(page);
  await page.keyboard.down("w"); await page.waitForTimeout(800); await page.keyboard.up("w"); // a fixed wait is right here: nothing should happen
  assert.equal(await game(page, () => window.__mobber.state), "play");
});

test("the penthouse Dons are doubles, and the exit leads to the roof", async () => {
  const { page } = await scene(HOTEL);
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
});

// (The Don's last stand and the end of the picture are in setpieces.test.js)
test("the Don gets to the autogiro and away if you let him, whoever stands in his way", async () => {
  const { page } = await scene("The Roof", { hp: 1e9 });
  const start = await game(page, () => {
    const M = window.__mobber, d = M.enemies.find(e => e.type.name === "boss"), P = M.player, [x, y] = M.level.route[1];
    for (const e of M.enemies) if (e !== d) { e.hp = 0; e.state = "dead"; }
    // He won't shoot, and the rotor is nearly up to speed, so he doesn't stop to fight on the way
    d.cd = 1e9; M.chase.len = 32;
    P.x = x; P.y = y;   // right on his route
    return d.x;
  });
  assert.ok(start < 15, "he starts well short of the autogiro");
  // Once he's gone past, wait for him on the autogiro's pad instead
  await page.waitForFunction(() => window.__mobber.enemies.find(e => e.type.name === "boss").wp >= 2, null, { timeout: 30000 });
  await game(page, () => { const M = window.__mobber, r = M.level.route, [x, y] = r[r.length - 1]; M.player.x = x; M.player.y = y; });
  await page.waitForFunction(() => window.__mobber.state === "card", null, { timeout: 60000 });
  assert.ok(await game(page, () => window.__mobber.chase.t >= 32), "he couldn't leave until the rotor was up to speed");
  assert.equal(await game(page, () => window.__mobber.card.kind), "escaped", "letting him reach the autogiro shows HE GOT AWAY");
  await clickCard(page);
  assert.equal(await game(page, () => window.__mobber.level.title), "The Roof", "and the scene rolls again");
});

test("a door slides open as you walk up and closes behind you", async () => {
  const { page } = await scene(CLUB, { clear: true });
  // Chapter one: the door between the main hall and the bar
  const door = () => game(page, () => window.__mobber.doors.get(5 * window.__mobber.level.map[0].length + 9).open);
  await game(page, () => { const P = window.__mobber.player; P.x = 9.5; P.y = 8.5; P.a = -Math.PI / 2; });
  assert.equal(await door(), 0, "starts closed");
  assert.equal(await game(page, () => window.__mobber.wallAt(9.5, 5.5)), true, "a closed door blocks the way");
  // Walking up opens it, and you walk through into the bar
  await holdUntil(page, "w", () => window.__mobber.player.y < 5.2);
  assert.ok(await door() > 0.85, "door should be open");
  // Walk on into the bar: the door shuts behind you
  await game(page, () => { const P = window.__mobber.player; P.x = 3.5; P.y = 3.5; });
  await page.waitForFunction(() => window.__mobber.doors.get(5 * window.__mobber.level.map[0].length + 9).open === 0, null, { timeout: 15000 });
});

test("walking into a secret wall slides it back to reveal a stash", async () => {
  const { page } = await scene(CLUB, { clear: true });
  // Chapter one: the cloak room's east wall at (7, 18) hides a small room
  await game(page, () => { const P = window.__mobber.player; P.x = 6.5; P.y = 18.5; P.a = 0; });
  assert.equal(await game(page, () => window.__mobber.map[18][7]), "!");
  await holdUntil(page, "w", () => window.__mobber.map[18][7] !== "!");
  await page.waitForFunction(() => window.__mobber.map[18][9] === "W", null, { timeout: 15000 }); // settled two squares back
  const after = await game(page, () => ({ old: window.__mobber.map[18][7], next: window.__mobber.map[18][8], end: window.__mobber.map[18][9], found: window.__mobber.stats.secretsFound.size }));
  assert.deepEqual(after, { old: ".", next: ".", end: "W", found: 1 });
  // The stash's cash is now reachable
  await game(page, () => { const P = window.__mobber.player; P.x = 8.5; P.y = 20.5; });
  await page.waitForFunction(() => window.__mobber.stats.cash > 0);
});

test("dying shows CUT! and the retry really rewinds the scene", async () => {
  const { page } = await scene(CLUB);
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
  // (a retake hands you revolver rounds up to 24 on Regular: you walked in with 18)
  assert.deepEqual(retry, { ...start, reserve: [18, 0, 0] }, "everything from the failed attempt should be undone");
  assert.equal(await game(page, () => window.__mobber.stats.deaths), 1);
});

test("a death counts once, however many rounds hit the body", async () => {
  const { page } = await scene(CLUB);
  await game(page, () => { const M = window.__mobber; M.hurtPlayer(1000); M.hurtPlayer(50); M.hurtPlayer(50); });
  // Gangsters near the body keep firing during the fade
  await game(page, () => { const M = window.__mobber, P = M.player; P.x = 12.5; P.y = 7.5; for (const e of M.enemies) Object.assign(e, { alert: true, state: "chase", cd: 0 }); });
  await page.waitForFunction(() => window.__mobber.state === "card");
  assert.equal(await game(page, () => window.__mobber.stats.deaths), 1);
});

test("a dead man can't walk out the exit", async () => {
  const { page } = await scene(undefined, { clear: true });
  await faceExit(page);
  await game(page, () => { const P = window.__mobber.player, M = window.__mobber; P.x -= Math.cos(P.a) * 1.2; P.y -= Math.sin(P.a) * 1.2; M.hurtPlayer(1000); });
  await holdUntil(page, "w", () => window.__mobber.state === "card");
  assert.equal(await game(page, () => window.__mobber.card.kind), "dead", "should be CUT!, not the next scene");
});

test("nothing can kill you once you've reached the exit", async () => {
  const { page } = await scene(undefined, { clear: true });
  await faceExit(page);
  await holdUntil(page, "w", () => window.__mobber.state !== "play");
  await game(page, () => window.__mobber.hurtPlayer(1000));
  await page.waitForFunction(() => window.__mobber.state === "card");
  assert.equal(await game(page, () => window.__mobber.card.kind), "chapter");
});

test("the street ends at the Blue Note's door, and health carries over, with a floor", async () => {
  const { page } = await scene();
  // (on Regular the floor is 30: the fence's doctor is how you do better than that)
  for (const [hp, expect] of [[72, 72], [20, 30]]) {
    await goTo(page, "Mulberry Street");
    await clearEnemies(page);
    await game(page, h => { window.__mobber.player.hp = h; }, hp);
    await faceExit(page);
    await holdUntil(page, "w", () => window.__mobber.state === "card");
    await clickCard(page);
    assert.equal(await game(page, () => window.__mobber.level.title), CLUB);
    assert.equal(await game(page, () => Math.round(window.__mobber.player.hp)), expect);
  }
});

test("ammo runs out, gangsters drop more, and an empty gun still swings", async () => {
  const { page } = await scene(CLUB);
  assert.deepEqual(await game(page, () => ({ mag: window.__mobber.player.mag, reserve: window.__mobber.player.reserve, has: window.__mobber.player.has })),
    { mag: [6, 0, 0], reserve: [12, 0, 0], has: [true, false, false] }, "a fresh start is a loaded revolver and 12 spare rounds");
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
  assert.ok(loot && ["rounds", "cash", "loot"].includes(loot.pick), "a downed goon should drop rounds, a tommy gun, cash or something to sell");
  const pockets = () => game(page, () => ({ ammo: window.__mobber.player.reserve.slice(), has: window.__mobber.player.has.slice(), cash: window.__mobber.stats.cash, loot: window.__mobber.player.loot.length }));
  const before = await pockets();
  await game(page, () => { const P = window.__mobber.player; P.x = 8.5; P.y = 9.5; });
  await page.waitForFunction(n => !window.__mobber.objs.slice(n).some(o => o.pick), setup);
  assert.notDeepEqual(await pockets(), before, "picking up the loot should give ammo, a gun, cash or something to sell");
  // Both guns dry: clicking swings the gun at a goon in arm's reach
  await game(page, () => {
    const M = window.__mobber, P = M.player;
    P.has = [true, false]; P.weapon = 0; P.mag = [0, 0]; P.reserve = [0, 0]; P.x = 6.5; P.y = 9.5; P.a = 0; P.fireCd = 0;
    Object.assign(M.enemies[0], { x: 7.6, y: 9.5, hp: 40, state: "idle", alert: false, cd: 99 });
  });
  await holdUntil(page, " ", () => window.__mobber.enemies[0].hp < 40);
  assert.equal(await game(page, () => window.__mobber.player.mag[0] + window.__mobber.player.reserve[0]), 0, "no bullets were conjured up");
});

test("a box of rounds tops up the revolver, and full pockets leave it on the floor", async () => {
  const { page } = await scene(undefined, { clear: true });
  const box = await game(page, () => window.__mobber.objs.find(o => o.pick === "rounds" && o.weapon === 0));
  assert.ok(box, "Mulberry Street should have a box of revolver rounds");
  const stand = () => game(page, b => { const P = window.__mobber.player; P.x = b.x; P.y = b.y; }, box);
  // Full pockets first
  await game(page, () => { window.__mobber.player.reserve[0] = 36; });
  await stand();
  await page.waitForTimeout(400); // a fixed wait is right here: nothing should happen
  assert.equal(await game(page, () => window.__mobber.player.reserve[0]), 36);
  assert.ok(await game(page, b => window.__mobber.objs.some(o => o.x === b.x && o.y === b.y), box), "the box should still be there");
  // Room for it: down to the 12 you start with, and it's picked up
  await game(page, () => { window.__mobber.player.reserve[0] = 12; });
  await page.waitForFunction(() => window.__mobber.player.reserve[0] === 18); // 12 + a box of 6
});

test("gangsters who hear you come looking, around walls and through doors", async () => {
  const { page } = await scene(CLUB);
  // Everyone alerted while you're out of sight in the cloak room
  const start = await game(page, () => {
    const M = window.__mobber, P = M.player; P.hp = 1e9;
    for (const e of M.enemies) { e.alert = true; e.lx = P.x; e.ly = P.y; e.cd = 99; }
    return M.enemies.map(e => [e.x, e.y]);
  });
  await page.waitForFunction(s => window.__mobber.enemies.filter((e, i) => Math.hypot(e.x - s[i][0], e.y - s[i][1]) > 1.5).length >= s.length * 0.7, start, { timeout: 15000 });
  // Someone actually makes it to the cloak room, which means coming through its door
  await page.waitForFunction(() => { const M = window.__mobber, P = M.player; return M.enemies.some(e => Math.hypot(e.x - P.x, e.y - P.y) < 4); }, null, { timeout: 20000 });
});

test("the Don can't be pinned down with a tommy gun", async () => {
  const { page } = await scene("The Roof");
  await game(page, () => {
    const M = window.__mobber, d = M.enemies.find(e => e.type.name === "boss"), P = M.player;
    for (const e of M.enemies) if (e !== d) { e.hp = 0; e.state = "dead"; }
    P.hp = 1e9; P.has[1] = true; P.weapon = 1; P.mag[1] = 50; P.reserve[1] = 100; P.x = d.x - 2; P.y = d.y; P.a = 0;
    window.__flinched = false; window.__hits = 0; let hp = d.hp;
    // (and keep the gun on him as he runs: this is about him not flinching, not about your aim)
    (function watch() { if (d.state === "hurt") window.__flinched = true; if (d.hp < hp) window.__hits++; hp = d.hp; P.a = Math.atan2(d.y - P.y, d.x - P.x); if (d.hp > 0) requestAnimationFrame(watch); })();
  });
  // A good burst: enough rounds into him that a goon would have staggered several times over
  await holdUntil(page, " ", () => window.__hits >= 8);
  assert.equal(await game(page, () => window.__flinched), false, "the Don never flinches");
});

test("tall props are cover; you can shoot over a parked car", async () => {
  const { page } = await scene();
  // A parked car on Mulberry Street: shorter than a man, so it doesn't stop a bullet
  const car = await game(page, () => { const M = window.__mobber, c = M.objs.find(o => o.art === M.objs.find(p => p.size === 0.8).art); return !M.los(c.x - 1.2, c.y, c.x + 1.2, c.y); });
  assert.equal(car, false, "a car doesn't block the shot");
  // A water tower on the roof does
  await goTo(page, "The Roof");
  const tower = await game(page, () => { const M = window.__mobber, w = M.objs.find(o => o.cover && o.size === 0.7 && o.scale > 2); return { blocked: !M.los(w.x - 1.2, w.y, w.x + 1.2, w.y), beside: !M.los(w.x - 1.2, w.y - 1.1, w.x + 1.2, w.y - 1.1) }; });
  assert.deepEqual(tower, { blocked: true, beside: false });
});

test("holding Q swaps guns once, not on every key-repeat", async () => {
  const { page } = await scene();
  await game(page, () => { const P = window.__mobber.player; P.has[1] = true; P.mag[1] = 30; P.weapon = 0; });
  await page.keyboard.down("q"); await page.keyboard.down("q"); await page.keyboard.down("q"); await page.keyboard.up("q");
  assert.equal(await game(page, () => window.__mobber.player.weapon), 1);
});

test("every scene loads and draws without errors", async () => {
  const { page } = await scene();
  const n = await game(page, () => window.__mobber.LEVELS.length);
  for (let i = 1; i < n; i++) {
    await game(page, i => window.__mobber.startLevel(i), i);
    // a few frames of it
    const f0 = await game(page, () => window.__mobber.frames);
    await page.waitForFunction(f0 => window.__mobber.frames > f0 + 5, f0);
    assert.equal(await game(page, () => window.__mobber.state), "play");
  }
});

test("a dialogue card stops the action, then the scene carries on", async () => {
  const { page } = await scene();
  // Stand a gangster in front of you with dialogue cards on: the first to see you speaks
  await game(page, () => {
    const M = window.__mobber, P = M.player, e = M.enemies[0];
    M.dialogue = true;
    for (const o of M.enemies) if (o !== e) { o.hp = 0; o.state = "dead"; }
    e.x = P.x + Math.cos(P.a) * 3; e.y = P.y + Math.sin(P.a) * 3; e.alert = false; e.state = "idle";
    e.face = P.a + Math.PI; e.turnT = 99;   // looking straight at you
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
});

test("the pianist plays under the picture", async () => {
  const { page } = await scene();
  await page.waitForFunction(() => window.__mobber.music.playing, null, { timeout: 5000 });
  assert.equal(await game(page, () => window.__mobber.music.playing), "street", "the first scene is a rainy street");
  await game(page, () => window.__mobber.startLevel(1));
  await page.waitForFunction(() => window.__mobber.music.playing === "joint", null, { timeout: 5000 });
  await game(page, () => window.__mobber.startLevel(window.__mobber.LEVELS.length - 1));
  await page.waitForFunction(() => window.__mobber.music.playing === "chase", null, { timeout: 5000 });
});

test("closing the tab keeps your place, and the end of the picture clears it", async () => {
  const { page } = await scene();
  const toTitle = async () => {
    await page.reload();
    await page.waitForFunction(() => window.__mobber && window.__mobber.state === "title");
    await page.evaluate(() => { window.__mobber.dialogue = false; });
    await page.mouse.click(200, 200);
    await page.waitForFunction(() => window.__mobber.state === "card");
  };
  // Walk into the second scene carrying a tommy gun and some cash
  await game(page, () => { const M = window.__mobber; M.player.has[1] = true; M.player.reserve[1] = 40; M.stats.cash = 700; M.startLevel(1); });
  await toTitle();
  assert.deepEqual(await game(page, () => window.__mobber.card), { kind: "chapter", idx: 1 }, "the title leads straight to the scene you reached");
  await clickCard(page);
  const after = await game(page, () => ({ title: window.__mobber.level.title, tommy: window.__mobber.player.has[1], reserve: window.__mobber.player.reserve[1], cash: window.__mobber.stats.cash }));
  assert.deepEqual(after, { title: CLUB, tommy: true, reserve: 40, cash: 700 });
  // THE END wipes the save
  await page.evaluate(async () => { (await import("/src/flow.js")).showCard("end"); });
  await toTitle();
  assert.equal(await game(page, () => window.__mobber.card.kind), "prologue");
});

test("the settings panel stops the picture and its choices stick", async () => {
  const { page } = await scene();
  // On a desktop the mouse is captured while you play: Esc lets it go, then the gear can be clicked
  await page.evaluate(() => document.exitPointerLock());
  await page.waitForFunction(() => !document.pointerLockElement);
  await page.click("#gear");
  assert.equal(await page.isVisible("#panel"), true);
  const t0 = await game(page, () => window.__mobber.stats.time);
  await page.waitForTimeout(300);
  assert.equal(await game(page, () => window.__mobber.stats.time), t0, "the clock stops while the panel is open");
  await page.click("#panel .row:has-text('Difficulty')");
  await page.click("#panel .row:has-text('Music')");
  assert.deepEqual(await game(page, () => [window.__mobber.settings.difficulty, window.__mobber.settings.music]), [2, false]);
  await page.click("#panel .row:has-text('Back to the picture')");
  assert.equal(await page.isVisible("#panel"), false);
  await page.reload();
  await page.waitForFunction(() => window.__mobber && window.__mobber.state === "title");
  assert.deepEqual(await game(page, () => [window.__mobber.settings.difficulty, window.__mobber.settings.music]), [2, false], "settings survive a reload");
});

test("a heavy gives up his sawn-off, and it settles things up close", async () => {
  const { page } = await scene("Pier 9", { clear: true, hp: 1e9 });
  // Put a heavy down in front of you: he drops the sawn-off
  await game(page, () => {
    const M = window.__mobber, P = M.player;
    const heavy = M.enemies.find(e => e.type.name === "heavy"), goon = M.enemies.find(e => e.type.name === "goon");
    P.x = 2.5; P.y = 2.5; P.a = 0;   // open floor by the start
    heavy.hp = 1; heavy.state = "idle"; heavy.x = P.x + 1.6; heavy.y = P.y;
    goon.x = 20.5; goon.y = 8.5;   // parked out of the way for later
  });
  await holdUntil(page, " ", () => window.__mobber.enemies.find(e => e.type.name === "heavy").hp <= 0);
  assert.ok(await game(page, () => window.__mobber.objs.some(o => o.pick === "rounds" && o.weapon === 2)), "the sawn-off is on the floor");
  await game(page, () => { const M = window.__mobber, o = M.objs.find(o => o.weapon === 2); M.player.x = o.x; M.player.y = o.y; });
  await page.waitForFunction(() => window.__mobber.player.has[2]);
  assert.deepEqual(await game(page, () => { const P = window.__mobber.player; return [P.weapon, P.mag[2], P.reserve[2]]; }), [2, 2, 2]);
  // One barrel at arm's length drops a fresh goon
  await game(page, () => { const M = window.__mobber, P = M.player, g = M.enemies.find(e => e.type.name === "goon"); g.hp = g.type.hp; g.state = "idle"; g.x = P.x + 1.5; g.y = P.y; P.a = 0; P.fireCd = 0; });
  await shoot(page);
  await page.waitForFunction(() => window.__mobber.enemies.find(e => e.type.name === "goon").hp <= 0, null, { timeout: 5000 });
});

test("shooting out a lamp darkens the room, and a stray shot breaks the bottles", async () => {
  const { page } = await scene(CLUB, { clear: true });
  const before = await game(page, () => {
    const M = window.__mobber, P = M.player;
    const lamp = M.objs.find(o => o.light && o.lampWidth);
    // Stand two squares from a lamp with a clear line to it, looking at it
    for (let a = 0; a < 6.28; a += 0.2) { const x = lamp.x + Math.cos(a) * 2, y = lamp.y + Math.sin(a) * 2; if (!M.wallAt(x, y) && M.los(x, y, lamp.x, lamp.y)) { P.x = x; P.y = y; P.a = Math.atan2(lamp.y - y, lamp.x - x); break; } }
    P.mag[0] = 6; P.fireCd = 0;
    return { lit: M.lightAt(lamp.x + 0.3, lamp.y + 0.3), x: lamp.x, y: lamp.y };
  });
  await shoot(page);
  await page.waitForFunction(({ x, y }) => { const l = window.__mobber.objs.find(o => o.x === x && o.y === y); return l && !l.light; }, before, { timeout: 5000 });
  assert.ok(await game(page, ({ x, y }) => window.__mobber.lightAt(x + 0.3, y + 0.3), before) < before.lit, "it is darker where the lamp was");
  // Now put a round into the bar shelves
  const bar = await game(page, () => {
    const M = window.__mobber, P = M.player, map = M.level.map;
    for (let y = 1; y < map.length - 1; y++) for (let x = 1; x < map[y].length - 1; x++) {
      if (map[y][x] !== "B") continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (map[y + dy][x + dx] !== "." && !M.wallAt(x + 0.5 + dx, y + 0.5 + dy)) {
        P.x = x + 0.5 + dx * 1.2; P.y = y + 0.5 + dy * 1.2; P.a = Math.atan2(-dy, -dx); P.mag[0] = 6; P.fireCd = 0; return y * map[0].length + x;
      }
    }
    return -1;
  });
  assert.ok(bar >= 0, "found the bar shelves");
  await shoot(page);
  await page.waitForFunction(k => window.__mobber.smashed.has(k), bar, { timeout: 5000 });
});
