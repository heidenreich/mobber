// The knife man, the rifleman at his window, and the bagman who runs for the alarm.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { serve, openGame, rollFilm, game, chromium } = require("./helpers");

let srv, browser;
before(async () => { srv = await serve(); browser = await chromium.launch(); });
after(async () => { await browser.close(); srv.server.close(); });

// Start a level with only one kind of gangster left standing
async function sceneWith(title, keep) {
  const g = await openGame(browser, srv.url);
  await rollFilm(g.page);
  await game(g.page, ([title, keep]) => {
    const M = window.__mobber;
    M.startLevel(M.LEVELS.findIndex(l => l.title === title));
    for (const e of M.enemies) if (!keep.includes(e.type.name)) { e.hp = 0; e.state = "dead"; }
    M.player.hp = 100;
  }, [title, keep]);
  return g;
}
const CLUB = "The Blue Note Club";

test("a knife man runs at you and cuts, without firing a shot", async () => {
  const { page, context, errors } = await sceneWith(CLUB, ["knife"]);
  await game(page, () => {
    const M = window.__mobber, k = M.enemies.find(e => e.type.name === "knife");
    Object.assign(M.player, { x: k.x - 4, y: k.y }); M.player.a = 0;
  });
  await page.waitForFunction(() => window.__mobber.player.hp < 100);
  const s = await game(page, () => { const M = window.__mobber, k = M.enemies.find(e => e.type.name === "knife"); return { bullets: M.bullets.length, d: Math.hypot(k.x - M.player.x, k.y - M.player.y) }; });
  assert.equal(s.bullets, 0);
  assert.ok(s.d < 1.5, `he cut from ${s.d} away`);
  assert.deepEqual(errors, []);
  await context.close();
});

test("the knife misses a man who has stepped out of reach", async () => {
  const { page, context, errors } = await sceneWith(CLUB, ["knife"]);
  // Catch him with the blade raised, then put the player across the room before it falls
  await game(page, () => {
    const M = window.__mobber, k = M.enemies.find(e => e.type.name === "knife");
    Object.assign(M.player, { x: k.x - 0.8, y: k.y }); M.player.a = 0;
    Object.assign(k, { alert: true, cd: 0 });
  });
  await page.waitForFunction(() => window.__mobber.enemies.some(e => e.type.name === "knife" && e.state === "aim"), null, { polling: "raf" });
  await game(page, () => { window.__mobber.player.x -= 3; });
  await page.waitForFunction(() => window.__mobber.enemies.some(e => e.type.name === "knife" && e.state !== "aim"), null, { polling: "raf" });
  assert.equal(await game(page, () => window.__mobber.player.hp), 100);
  assert.deepEqual(errors, []);
  await context.close();
});

test("a rifleman keeps to his window, fires a fast shot down at you, and can be shot out of it", async () => {
  const { page, context, errors } = await sceneWith("Mulberry Street", ["rifleman"]);
  const at = await game(page, () => {
    const M = window.__mobber, r = M.enemies.find(e => e.type.name === "rifleman");
    Object.assign(M.player, { x: r.x, y: r.y + 4, hp: 1e6 }); M.player.a = -Math.PI / 2;
    return [r.x, r.y];
  });
  await page.waitForFunction(() => window.__mobber.bullets.length > 0, null, { polling: "raf" });
  const shot = await game(page, () => { const M = window.__mobber, b = M.bullets[0], r = M.enemies.find(e => e.type.name === "rifleman"); return { speed: b.speed, drop: !!b.drop, at: [r.x, r.y], beside: M.wallAt(r.x, r.y - 0.5) }; });
  assert.ok(shot.speed > 11 && shot.drop, "not a rifle shot from above");
  assert.deepEqual(shot.at, at, "he left his window");
  assert.ok(shot.beside, "he isn't up against the building");
  for (let i = 0; i < 12; i++) {
    if (await game(page, () => window.__mobber.enemies.find(e => e.type.name === "rifleman").hp <= 0)) break;
    await page.keyboard.down(" "); await page.waitForTimeout(150); await page.keyboard.up(" "); await page.waitForTimeout(250);
  }
  assert.ok(await game(page, () => window.__mobber.enemies.find(e => e.type.name === "rifleman").hp <= 0), "he survived twelve shots");
  assert.deepEqual(errors, []);
  await context.close();
});

test("the bagman runs for the bell, and ringing it brings everyone", async () => {
  const { page, context, errors } = await sceneWith(CLUB, ["bagman", "heavy", "goon"]);
  // Leave one far-off goon who knows nothing, and let the bagman see you
  const far = await game(page, () => {
    const M = window.__mobber, b = M.enemies.find(e => e.type.name === "bagman");
    const others = M.enemies.filter(e => e !== b && e.hp > 0).sort((p, q) => Math.hypot(q.x - b.x, q.y - b.y) - Math.hypot(p.x - b.x, p.y - b.y));
    others.slice(1).forEach(e => { e.hp = 0; e.state = "dead"; });
    Object.assign(M.player, { x: b.x - 3, y: b.y + 3, hp: 1e6 }); M.player.a = Math.atan2(b.y - M.player.y, b.x - M.player.x);
    return M.enemies.indexOf(others[0]);
  });
  assert.equal(await game(page, i => window.__mobber.enemies[i].alert, far), false);
  await page.waitForFunction(() => window.__mobber.alarm, null, { timeout: 20000 });
  const s = await game(page, i => { const M = window.__mobber, b = M.enemies.find(e => e.type.name === "bagman"), bell = M.objs.find(o => o.alarm); return { alert: M.enemies[i].alert, d: Math.hypot(b.x - bell.x, b.y - bell.y), bullets: M.bullets.length }; }, far);
  assert.ok(s.alert, "the far goon never heard the alarm");
  assert.ok(s.d < 1.6, "the bagman wasn't at the bell");
  assert.deepEqual(errors, []);
  await context.close();
});

test("stop the bagman first and the bell stays quiet; he drops the takings", async () => {
  const { page, context, errors } = await sceneWith(CLUB, ["bagman"]);
  await game(page, () => {
    const M = window.__mobber, b = M.enemies.find(e => e.type.name === "bagman");
    Object.assign(M.player, { x: b.x - 3, y: b.y + 0.01 }); M.player.a = 0;
  });
  for (let i = 0; i < 20; i++) {
    const down = await game(page, () => { const M = window.__mobber, b = M.enemies.find(e => e.type.name === "bagman"); M.player.a = Math.atan2(b.y - M.player.y, b.x - M.player.x); return b.hp <= 0; });
    if (down) break;
    await page.keyboard.down(" "); await page.waitForTimeout(120); await page.keyboard.up(" ");
  }
  const s = await game(page, () => { const M = window.__mobber; return { down: M.enemies.find(e => e.type.name === "bagman").hp <= 0, alarm: M.alarm, cash: M.objs.some(o => o.pick === "cash" && o.amount === M.AMMO.bagCash) }; });
  assert.ok(s.down, "the bagman got away");
  assert.equal(s.alarm, false);
  assert.ok(s.cash, "no bag of cash where he fell");
  assert.deepEqual(errors, []);
  await context.close();
});
