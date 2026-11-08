// Phone controls, in an emulated iPhone: the floating stick, drag-to-aim,
// aim assist with auto-fire, and switching between portrait and landscape.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { serve, openGame, rollFilm, game, chromium, devices } = require("./helpers");

let srv, browser;
before(async () => { srv = await serve(); browser = await chromium.launch(); });
after(async () => { await browser.close(); srv.server.close(); });

async function phone(device) {
  const g = await openGame(browser, srv.url, { ...devices[device] });
  g.cdp = await g.context.newCDPSession(g.page);
  g.touch = (type, points) => g.cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  await rollFilm(g.page, true);
  await game(g.page, () => { for (const e of window.__mobber.enemies) { e.hp = 0; e.state = "dead"; } });
  return g;
}
const pose = page => game(page, () => { const P = window.__mobber.player; return { x: P.x, y: P.y, a: P.a }; });

async function drag(g, id, x, y, dx, dy, holdMs = 600) {
  await g.touch("touchStart", [{ x, y, id }]);
  for (let i = 1; i <= 6; i++) { await g.touch("touchMove", [{ x: x + dx * i / 6, y: y + dy * i / 6, id }]); await g.page.waitForTimeout(16); }
  await g.page.waitForTimeout(holdMs);
  await g.touch("touchEnd", []);
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
  await g.context.close();
});

test("right thumb drag fine-tunes aim", async () => {
  const g = await phone("iPhone 13 landscape");
  const a = await pose(g.page);
  await drag(g, 2, 600, 200, -50, 0, 50);
  const b = await pose(g.page);
  assert.ok(b.a < a.a - 0.1, "dragging left should turn left");
  await g.context.close();
});

test("aim assist pulls onto a nearby goon and auto-fires", async () => {
  const g = await phone("iPhone 13 landscape");
  await game(g.page, () => {
    const M = window.__mobber, P = M.player, e = M.enemies[0];
    P.x = 6.5; P.y = 8.5; P.a = 0; P.hp = 100;
    Object.assign(e, { hp: 40, state: "idle", alert: false, x: 11.5, y: 9.1 });
  });
  await g.page.waitForFunction(() => window.__mobber.enemies[0].hp <= 0, null, { timeout: 5000 });
  await g.context.close();
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
  assert.deepEqual(g.errors, []);
  await g.context.close();
});
