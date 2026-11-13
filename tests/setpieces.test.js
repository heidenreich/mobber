// The set pieces: slipping behind a lookout, riding the hotel lift, and the Don's last steps.
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { serve, openGame, rollFilm, game, chromium } = require("./helpers");

let srv, browser;
before(async () => { srv = await serve(); browser = await chromium.launch(); });
after(async () => { await browser.close(); srv.server.close(); });

const start = async title => {
  const g = await openGame(browser, srv.url);
  await rollFilm(g.page);
  await game(g.page, t => { const M = window.__mobber; M.startLevel(M.LEVELS.findIndex(l => l.title === t)); }, title);
  return g;
};

test("a lookout with his back turned doesn't see you, and goes down to one shot", async () => {
  const { page, errors } = await start("The Waterfront");
  await game(page, () => {
    const M = window.__mobber, P = M.player, e = M.enemies[0];
    for (const o of M.enemies) if (o !== e) { o.hp = 0; o.state = "dead"; }
    // Three steps in front of you, facing the same way you are: you're behind him
    e.x = P.x + Math.cos(P.a) * 3; e.y = P.y + Math.sin(P.a) * 3; e.face = P.a; e.turnT = 99; e.alert = false; e.state = "idle";
  });
  await page.waitForTimeout(600);
  assert.equal(await game(page, () => window.__mobber.enemies[0].alert), false, "he hasn't noticed you");
  // Step right up behind him and he hears you
  const near = await start("The Waterfront");
  await game(near.page, () => {
    const M = window.__mobber, P = M.player, e = M.enemies[0];
    for (const o of M.enemies) if (o !== e) { o.hp = 0; o.state = "dead"; }
    e.x = P.x + Math.cos(P.a) * 1.5; e.y = P.y + Math.sin(P.a) * 1.5; e.face = P.a; e.turnT = 99; e.alert = false; e.state = "idle";
  });
  await near.page.waitForFunction(() => window.__mobber.enemies[0].alert, null, { timeout: 4000 });
  // Back in the first game: one revolver round in the back is enough for a goon
  await game(page, () => { const P = window.__mobber.player; P.mag[0] = 6; P.fireCd = 0; });
  await page.keyboard.down(" "); await page.waitForTimeout(120); await page.keyboard.up(" ");
  await page.waitForFunction(() => window.__mobber.enemies[0].hp <= 0, null, { timeout: 4000 });
  assert.equal(await game(page, () => window.__mobber.stats.shots), 1);
  assert.deepEqual(errors, []);
});

test("the lift stops at each landing, and only the top floor lets you through", async () => {
  const { page, errors } = await start("Going Up");
  const clear = () => game(page, () => { for (const e of window.__mobber.enemies) { e.hp = 0; e.state = "dead"; } });
  await game(page, () => { window.__mobber.player.hp = 1e9; });
  assert.equal(await game(page, () => window.__mobber.lift.gate.locked), true, "the gate is shut while it rides");
  const waves = await game(page, () => window.__mobber.level.lift.length);
  for (let stop = 0; stop < waves; stop++) {
    await page.waitForFunction(s => window.__mobber.lift.phase === "stop" && window.__mobber.lift.stop === s, stop, { timeout: 10000 });
    assert.equal(await game(page, () => window.__mobber.enemies.filter(e => e.hp > 0).length), await game(page, s => window.__mobber.level.lift[s].length, stop), "they're waiting on the landing");
    assert.equal(await game(page, () => window.__mobber.lift.done), false);
    await clear();   // you're still in the car, so up it goes
    await page.waitForFunction(() => window.__mobber.lift.phase === "ride", null, { timeout: 4000 });
  }
  await page.waitForFunction(() => window.__mobber.lift.done, null, { timeout: 10000 });
  // Out through the door at the end of the landing, into the Don's suite
  await game(page, () => {
    const M = window.__mobber, P = M.player, map = M.level.map;
    const y = map.findIndex(r => r.includes("E")), x = map[y].indexOf("E");
    P.x = x - 0.8; P.y = y + 0.5; P.a = 0;
  });
  await page.keyboard.down("w");
  await page.waitForFunction(() => window.__mobber.state === "card", null, { timeout: 8000 });
  await page.keyboard.up("w");
  assert.equal(await game(page, () => window.__mobber.LEVELS[window.__mobber.card.idx].title), "Hotel Regent, Top Floor");
  assert.deepEqual(errors, []);
});

test("the Don staggers for the parapet before the picture ends, and the paper comes out", async () => {
  const { page, errors } = await start("The Roof");
  await game(page, () => {
    const M = window.__mobber, d = M.enemies.find(e => e.type.name === "boss"), P = M.player;
    for (const e of M.enemies) if (e !== d) { e.hp = 0; e.state = "dead"; }
    P.hp = 1e9; P.x = d.x - 1.5; P.y = d.y; P.a = 0; d.hp = 1; d.cd = 99; P.mag[0] = 6; P.fireCd = 0;
  });
  await page.keyboard.down(" ");
  await page.waitForFunction(() => window.__mobber.enemies.find(e => e.type.name === "boss").hp <= 0, null, { timeout: 5000 });
  await page.keyboard.up(" ");
  // Beaten, he drops to his knees, and nothing moves until you say what happens to him
  assert.equal(await game(page, () => window.__mobber.enemies.find(e => e.type.name === "boss").state), "kneel");
  assert.equal(await game(page, () => window.__mobber.state), "won");
  await page.waitForFunction(() => window.__mobber.choice);
  await page.mouse.click(200, 200);   // a click that isn't on an answer doesn't choose for you
  assert.ok(await game(page, () => !!window.__mobber.choice));
  await page.keyboard.press("1");     // finish it
  assert.equal(await game(page, () => window.__mobber.enemies.find(e => e.type.name === "boss").state), "stagger");
  assert.equal(await game(page, () => window.__mobber.stats.mercy), false);
  await page.waitForFunction(() => window.__mobber.state === "card" && window.__mobber.card.kind === "epilogue", null, { timeout: 15000 });
  await page.waitForFunction(() => window.__mobber.fade >= 0.6);
  await page.mouse.click(200, 200);
  await page.waitForFunction(() => window.__mobber.card.kind === "end");
  await page.waitForTimeout(1200);   // the paper spins in and is drawn without errors
  assert.deepEqual(errors, []);
});

test("the title card lets you pick how hard a night it will be", async () => {
  const { page, errors } = await openGame(browser, srv.url);
  await page.waitForTimeout(300);
  assert.equal(await game(page, () => window.__mobber.settings.difficulty), 1, "Regular to begin with");
  // The names sit in a row under the subtitle: click the last one
  const at = await game(page, () => {
    const c = window.__mobber.titleChoices[2];
    return { x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2 };
  });
  await page.mouse.click(at.x, at.y);
  assert.deepEqual(await game(page, () => [window.__mobber.settings.difficulty, window.__mobber.state]), [2, "title"], "picked, and the film hasn't started");
  await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowLeft");
  assert.equal(await game(page, () => window.__mobber.settings.difficulty), 0);
  // A click anywhere else still rolls the film
  await page.mouse.click(200, 200);
  await page.waitForFunction(() => window.__mobber.state === "card");
  assert.deepEqual(errors, []);
});

test("a hit can spin a man right round before he recovers", async () => {
  const { page, errors } = await start("The Blue Note Club");
  await game(page, () => {
    const M = window.__mobber, P = M.player, e = M.enemies[0];
    for (const o of M.enemies) if (o !== e) { o.hp = 0; o.state = "dead"; }
    Math.random = () => 0.01;   // every roll comes up: the hit staggers him and spins him
    P.hp = 1e9; e.hp = 1e6; e.staggerCd = 0; e.alert = true; e.state = "chase"; e.cd = 99;
    e.x = P.x + Math.cos(P.a) * 2; e.y = P.y + Math.sin(P.a) * 2; P.mag[0] = 6; P.fireCd = 0;
  });
  await page.keyboard.down(" "); await page.waitForFunction(() => window.__mobber.enemies[0].state === "hurt", null, { timeout: 4000 }); await page.keyboard.up(" ");
  assert.equal(await game(page, () => window.__mobber.enemies[0].spin), true);
  await page.waitForFunction(() => window.__mobber.enemies[0].state !== "hurt", null, { timeout: 4000 });   // and he comes out of it
  assert.deepEqual(errors, []);
});

test("hand the Don to the law instead, and the picture ends with him in handcuffs", async () => {
  const { page, errors } = await start("The Roof");
  await game(page, () => {
    const M = window.__mobber, d = M.enemies.find(e => e.type.name === "boss"), P = M.player;
    for (const e of M.enemies) if (e !== d) { e.hp = 0; e.state = "dead"; }
    P.hp = 1e9; P.x = d.x - 1.5; P.y = d.y; P.a = 0; d.hp = 1; d.cd = 99; P.mag[0] = 6; P.fireCd = 0;
  });
  await page.keyboard.down(" ");
  await page.waitForFunction(() => window.__mobber.choice, null, { timeout: 5000 });
  await page.keyboard.up(" ");
  // Click the second answer
  await page.waitForFunction(() => window.__mobber.choiceRows.length === 2);
  const row = await game(page, () => { const r = window.__mobber.choiceRows[1]; return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }; });
  await page.mouse.click(row.x, row.y);
  assert.deepEqual(await game(page, () => [window.__mobber.stats.mercy, !!window.__mobber.choice, window.__mobber.enemies.find(e => e.type.name === "boss").state]), [true, false, "kneel"]);
  await page.waitForFunction(() => window.__mobber.state === "card" && window.__mobber.card.kind === "epilogue", null, { timeout: 15000 });
  await page.waitForFunction(() => window.__mobber.fade >= 0.6);
  await page.mouse.click(200, 200);
  await page.waitForFunction(() => window.__mobber.card.kind === "end");
  await page.waitForTimeout(1200);
  assert.deepEqual(errors, []);
});
