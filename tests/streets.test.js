// Street scenes where the Vitale men make a stand: lookouts, the runner, the men at the door,
// and what the runner's warning does to the scene inside.
const { test } = require("node:test");
const assert = require("node:assert");
const { useBrowser, scene, game } = require("./helpers");

useBrowser();
const street = () => scene("Mulberry Street", { hp: 1e9 });

test("Mulberry Street has two lookouts, a runner, and men who fall back to the door and hold it", async () => {
  const { page } = await street();
  const roles = await game(page, () => { const M = window.__mobber; return { stand: M.level.stand, door: M.doorFront, runner: M.enemies.filter(e => e.type.toDoor).length, doorMen: M.enemies.filter(e => e.doorMan).length, lookouts: M.enemies.filter(e => e.type.name === "goon" && !e.doorMan).length }; });
  assert.deepEqual([roles.stand.lookouts, roles.runner, roles.lookouts], [2, 1, 2]);
  assert.ok(roles.door && roles.doorMen >= 2, JSON.stringify(roles));
  // Word gets round (the runner is held back for this one)
  await game(page, () => { const M = window.__mobber; for (const e of M.enemies) { if (e.type.toDoor) { e.hp = 0; e.state = "dead"; } else { e.alert = true; e.cd = 99; } } });
  await page.waitForFunction(() => { const M = window.__mobber; return M.enemies.filter(e => e.doorMan).every(e => e.hold && Math.hypot(e.hold.x - e.x, e.hold.y - e.y) < 0.5); }, null, { timeout: 30000 });
  const s = await game(page, () => { const M = window.__mobber, D = M.doorFront; return { far: M.enemies.filter(e => e.doorMan).map(e => Math.hypot(e.x - D.x, e.y - D.y)), spots: M.enemies.filter(e => e.doorMan).map(e => e.hold.x + "," + e.hold.y), lookoutHold: M.enemies.filter(e => e.type.name === "goon" && !e.doorMan).map(e => e.hold) }; });
  assert.ok(s.far.every(d => d < 5.2), "door men by the door: " + s.far.join());
  assert.equal(new Set(s.spots).size, s.spots.length, "each has his own place");
  assert.deepEqual(s.lookoutHold, [null, null], "lookouts don't fall back");
});

test("the runner who reaches the door warns the Blue Note; stop him and they know nothing", async () => {
  const { page } = await street();
  // Let him see you from across the forecourt, with everyone else out of the picture
  await game(page, () => {
    const M = window.__mobber, r = M.enemies.find(e => e.type.toDoor), P = M.player, D = M.doorFront;
    for (const e of M.enemies) if (e !== r) { e.hp = 0; e.state = "dead"; }
    r.x = D.x - 1; r.y = D.y + 3; P.x = D.x - 4; P.y = D.y + 4; r.face = Math.atan2(P.y - r.y, P.x - r.x);
  });
  await page.waitForFunction(() => window.__mobber.player.warnedAt === 1, null, { timeout: 15000 });
  const gone = await game(page, () => { const M = window.__mobber, r = M.enemies.find(e => e.type.toDoor); return { hp: r.hp, over: r.over, kills: M.stats.kills }; });
  assert.deepEqual(gone, { hp: 0, over: true, kills: 0 }, "he went inside; you didn't put him down");
  // Through the door: they're ready, all but the manager
  const club = await game(page, () => { const M = window.__mobber; M.startLevel(1); return { warned: M.warned, alert: M.enemies.filter(e => !e.type.lieutenant).every(e => e.alert), manager: M.enemies.find(e => e.type.lieutenant).alert }; });
  assert.deepEqual(club, { warned: true, alert: true, manager: false });
  // A retake of the club starts the same way
  assert.equal(await game(page, () => { const M = window.__mobber; M.startLevel(1, true); return M.warned; }), true);
  // A fresh run, and this time he's stopped
  await game(page, () => {
    const M = window.__mobber; M.startLevel(0);
    const r = M.enemies.find(e => e.type.toDoor); r.hp = 0; r.state = "dead";
    M.startLevel(1);
  });
  assert.deepEqual(await game(page, () => { const M = window.__mobber; return [M.warned, M.enemies.some(e => e.alert)]; }), [false, false]);
});

test("a club that was warned has been cleared: no customers, no piano, the staff with their heads down", async () => {
  const { page } = await scene();
  // The lookout got in ahead of you
  await game(page, () => { const M = window.__mobber; M.player.warnedAt = 1; M.startLevel(1); });
  const club = await game(page, () => ({ title: window.__mobber.level.title, folk: window.__mobber.folk.map(f => f.kind + ":" + f.state).sort() }));
  assert.equal(club.title, "The Blue Note Club");
  assert.ok(club.folk.includes("barman:cower") && club.folk.includes("pianist:cower"), club.folk.join());
  assert.ok(club.folk.filter(k => /^(gent|lady)/.test(k)).every(k => k.endsWith(":gone")), "the customers have gone: " + club.folk.join());
  await page.waitForTimeout(700);
  assert.equal(await game(page, () => window.__mobber.music.playing), null, "nobody is playing");
  // Walk in unannounced and it's the club as usual
  await game(page, () => { const M = window.__mobber; M.player.warnedAt = undefined; M.startLevel(1); });
  await page.waitForFunction(() => window.__mobber.music.playing === "joint", null, { timeout: 5000 });
  assert.ok(await game(page, () => window.__mobber.folk.some(f => (f.kind === "gent" || f.kind === "lady") && f.state === "idle")));
});

test("the Waterfront's men make a stand at the pier door too", async () => {
  const { page } = await scene();
  const roles = await game(page, () => {
    const M = window.__mobber; M.startLevel(M.LEVELS.findIndex(l => l.title === "The Waterfront"));
    const guns = M.enemies.filter(e => !e.type.melee && !e.type.still && !e.type.runner);
    return { doorMen: guns.filter(e => e.doorMan).length, lookouts: guns.filter(e => !e.doorMan).length, knives: M.enemies.filter(e => e.type.melee).length, door: !!M.doorFront };
  });
  assert.equal(roles.lookouts, 2);
  assert.ok(roles.doorMen >= 4, "the rest hold the door: " + JSON.stringify(roles));
  assert.ok(roles.knives >= 1 && roles.door);
});

test("on the Waterfront the door men hear the first shot, and your gun's flash shows you in the dark", async () => {
  const { page } = await scene();
  // One gunman, wide awake, a long way down a dark quay: further than he can see into the dark
  const set = await game(page, () => {
    const M = window.__mobber; M.startLevel(M.LEVELS.findIndex(l => l.title === "The Waterfront")); const P = M.player; P.hp = 1e9;
    const doorMen = M.enemies.filter(e => e.doorMan), g = M.enemies.find(e => e.type.name === "goon" && !e.doorMan);
    for (const e of M.enemies) if (e !== g && !e.doorMan) { e.hp = 0; e.state = "dead"; }
    window.__g = g; g.type = { ...g.type, speed: 0 }; g.y = 6.5; g.alert = true; g.state = "chase"; g.cd = 0;
    for (let x = 4.5; x < 30; x++) for (let gx = x + 11.5; gx <= x + 12.5; gx += 0.5) {
      if (M.lightAt(x, 6.5) < 0.5 && !M.wallAt(gx, 6.5) && M.los(gx, 6.5, x, 6.5)) { P.x = x; P.y = 6.5; P.a = Math.PI; g.x = gx; return { ok: true, doorMen: doorMen.length, awake: doorMen.filter(e => e.alert).length }; }
    }
    return { ok: false };
  });
  assert.ok(set.ok, "found a dark spot with a clear view");
  assert.equal(set.awake, 0, "the door men know nothing yet");
  await page.waitForTimeout(1200);
  assert.equal(await game(page, () => window.__g.state), "chase", "he can't see you in the dark at that distance");
  // Fire (away from him): the flash gives you away, and the men on the door hear it from the far end of the street
  await page.keyboard.press("Space");
  await page.waitForFunction(() => ["aim", "fire"].includes(window.__g.state), null, { timeout: 1400 });
  const after = await game(page, () => ({ shown: window.__mobber.player.shown, awake: window.__mobber.enemies.filter(e => e.doorMan && e.alert).length }));
  assert.equal(after.awake, set.doorMen, "every door man heard it");
  await page.waitForFunction(() => window.__mobber.player.shown === 0, null, { timeout: 3000 });
});

test("Regent Square: a fountain and trees for cover, and the Vitale men hold the hotel door", async () => {
  const { page } = await scene();
  const sq = await game(page, () => {
    const M = window.__mobber; M.startLevel(M.LEVELS.findIndex(l => l.title === "Regent Square"));
    const guns = M.enemies.filter(e => !e.type.melee && !e.type.still && !e.type.runner);
    const cover = M.objs.filter(o => o.cover), f = cover.find(o => o.size === 0.9);
    const rifles = M.enemies.filter(e => e.type.still), door = M.doorFront;
    return { doorMen: guns.filter(e => e.doorMan).length, lookouts: guns.filter(e => !e.doorMan).length, cover: cover.length, fountain: !!f,
      behind: f && !M.los(f.x - 1.6, f.y, f.x + 1.6, f.y), door: !!door, rifleByDoor: door && rifles.some(e => Math.hypot(e.x - door.x, e.y - door.y) < 6) };
  });
  assert.equal(sq.lookouts, 2);
  assert.ok(sq.doorMen >= 4 && sq.door, "the rest fall back to the hotel door: " + JSON.stringify(sq));
  assert.ok(sq.fountain && sq.behind, "the fountain is in the middle, and it's cover");
  assert.ok(sq.cover >= 8, "trees and the newsstand are cover too");
  assert.ok(sq.rifleByDoor, "a rifleman covers the hotel door");
});
