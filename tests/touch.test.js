// Phone controls, in an emulated iPhone: the floating stick, drag-to-aim,
// aim assist with auto-fire, and switching between portrait and landscape.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { useBrowser, scene, game } = require("./helpers");

useBrowser();

async function phone(device, title) {
  const g = await scene(title, { device, clear: true });
  g.cdp = await g.context.newCDPSession(g.page);
  g.send = (type, points) => g.cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  return g;
}
const pose = page => game(page, () => { const P = window.__mobber.player; return { x: P.x, y: P.y, a: P.a }; });

async function drag(g, id, x, y, dx, dy, holdMs = 600) {
  await g.send("touchStart", [{ x, y, id }]);
  for (let i = 1; i <= 6; i++) { await g.send("touchMove", [{ x: x + dx * i / 6, y: y + dy * i / 6, id }]); await g.page.waitForTimeout(16); }
  await g.page.waitForTimeout(holdMs);
  await g.send("touchEnd", []);
}

test("left thumb walks forward and turns", async () => {
  const g = await phone("iPhone 13 landscape");
  const a = await pose(g.page);
  await drag(g, 1, 150, 250, 0, -60);
  const b = await pose(g.page);
  assert.ok(Math.hypot(b.x - a.x, b.y - a.y) > 1, "pushing the stick up should walk");
  await drag(g, 1, 150, 250, 60, 0);
  const c = await pose(g.page);
  assert.ok(c.a - b.a > 0.5, "pushing the stick right should turn right");
});

test("right thumb drag fine-tunes aim", async () => {
  const g = await phone("iPhone 13 landscape");
  const a = await pose(g.page);
  await drag(g, 2, 600, 200, -50, 0, 50);
  const b = await pose(g.page);
  assert.ok(b.a < a.a - 0.1, "dragging left should turn left");
});

test("aim assist pulls onto a nearby goon and auto-fires", async () => {
  const g = await phone("iPhone 13 landscape", "The Blue Note Club");
  await game(g.page, () => {
    const M = window.__mobber, P = M.player, e = M.enemies[0];
    P.x = 6.5; P.y = 8.5; P.a = 0; P.hp = 100;
    Object.assign(e, { hp: 40, state: "idle", alert: false, x: 11.5, y: 9.1, cd: 99, face: 0, lookBack: false, turnT: 99 });   // his back to you
    for (const o of M.enemies) if (o !== e) { o.hp = 0; o.state = "dead"; }   // and nobody else to shout a warning
  });
  // Auto-fire waits until you've touched the screen in this scene
  await g.page.waitForTimeout(800);
  assert.equal(await game(g.page, () => window.__mobber.enemies[0].hp), 40, "no shooting before the first touch");
  await g.send("touchStart", [{ x: 700, y: 120, id: 3 }]); await g.send("touchEnd", []);
  // He hasn't seen you, so it leaves him alone: whether and when to shoot is yours to decide
  await g.page.waitForTimeout(1500);
  assert.equal(await game(g.page, () => window.__mobber.enemies[0].hp), 40, "no auto-fire at a man who hasn't seen you");
  // Once he has, it fires for you
  await game(g.page, () => { window.__mobber.enemies[0].alert = true; });
  await g.page.waitForFunction(() => window.__mobber.enemies[0].hp <= 0, null, { timeout: 5000 });
});

test("plays upright and keeps playing after rotating", async () => {
  const g = await phone("iPhone 13");
  assert.equal(await game(g.page, () => window.__mobber.state), "play");
  const a = await pose(g.page);
  await drag(g, 1, 90, 500, 0, -60);
  const b = await pose(g.page);
  assert.ok(Math.hypot(b.x - a.x, b.y - a.y) > 1, "should walk while upright");
  await g.page.setViewportSize({ width: 844, height: 390 });
  await g.page.waitForTimeout(300);
  assert.equal(await game(g.page, () => window.__mobber.state), "play");
});
