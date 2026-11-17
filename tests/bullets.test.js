// Gangsters' bullets take time to arrive and can be dodged; Z and C lean round a corner.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { useBrowser, scene, game } = require("./helpers");

useBrowser();

// The empty hotel roof, standing in the open and looking east
async function onTheRoof(x = 4.5, y = 7.5) {
  const g = await scene("The Roof", { clear: true });
  await game(g.page, ([x, y]) => { Object.assign(window.__mobber.player, { x, y, a: 0 }); }, [x, y]);
  return g;
}
const hp = page => game(page, () => window.__mobber.player.hp);
const flown = page => page.waitForFunction(() => window.__mobber.bullets.length === 0);

test("a bullet takes time to arrive, and hits a man who stands still", async () => {
  const { page } = await onTheRoof();
  await game(page, () => window.__mobber.spawnBullet(12.5, 7.5, Math.PI, 20));
  assert.equal(await hp(page), 100, "hit the instant it was fired");
  await flown(page);
  assert.equal(await hp(page), 80);
});

test("stepping aside lets it go past", async () => {
  const { page } = await onTheRoof();
  await game(page, () => window.__mobber.spawnBullet(12.5, 7.5, Math.PI, 20));
  await page.keyboard.down("d");
  await flown(page);
  await page.keyboard.up("d");
  assert.equal(await hp(page), 100);
  assert.ok(await game(page, () => window.__mobber.player.y > 7.9), "the player never moved");
});

test("tall cover stops a bullet", async () => {
  // Behind the water tower, with the shot coming from its far side
  const { page } = await onTheRoof(12.5, 3.5);
  await game(page, () => window.__mobber.spawnBullet(17.5, 3.5, Math.PI, 20));
  await flown(page);
  assert.equal(await hp(page), 100);
});

test("gangsters' shots are bullets in the air, not instant hits", async () => {
  const { page } = await onTheRoof();
  await game(page, () => {
    const M = window.__mobber, e = M.enemies.find(e => e.type.name === "goon");
    Object.assign(e, { hp: 40, state: "chase", alert: true, cd: 0, x: 12.5, y: 7.5 });
  });
  await page.waitForFunction(() => window.__mobber.bullets.length > 0);
  const shot = await game(page, () => { const M = window.__mobber, b = M.bullets[0]; return { hp: M.player.hp, heading: b.dx }; });
  assert.equal(shot.hp, 100);
  assert.ok(shot.heading < -0.9, "the bullet isn't heading for the player");
});

test("C leans your head out to the right, feet where they were, and Z to the left", async () => {
  const { page } = await onTheRoof();
  const lean = () => game(page, () => window.__mobber.player.lean);
  await page.keyboard.down("c");
  await page.waitForFunction(() => window.__mobber.player.lean > 0.44);
  assert.deepEqual(await game(page, () => [window.__mobber.player.x, window.__mobber.player.y]), [4.5, 7.5]);
  await page.keyboard.up("c");
  await page.waitForFunction(() => window.__mobber.player.lean === 0);
  await page.keyboard.down("z");
  await page.waitForFunction(() => window.__mobber.player.lean < -0.44);
  await page.keyboard.up("z");
  assert.ok(await lean() <= 0);
});

test("a wall beside you stops the lean", async () => {
  // Shoulder to the north parapet: there's no room to lean left
  const { page } = await onTheRoof(4.5, 1.25);
  await page.keyboard.down("z");
  await page.waitForTimeout(600);
  const lean = await game(page, () => window.__mobber.player.lean);
  await page.keyboard.up("z");
  assert.ok(lean > -0.2 && lean <= 0, `leaned ${lean} into the wall`);
});

test("a shot that would pass your shoulder hits a head leaned into its path", async () => {
  const { page } = await onTheRoof();
  // Half a square to your right: a miss while you stand straight
  await game(page, () => window.__mobber.spawnBullet(12.5, 7.95, Math.PI, 20));
  await flown(page);
  assert.equal(await hp(page), 100);
  await page.keyboard.down("c");
  await page.waitForFunction(() => window.__mobber.player.lean > 0.44);
  await game(page, () => window.__mobber.spawnBullet(12.5, 7.95, Math.PI, 20));
  await flown(page);
  await page.keyboard.up("c");
  assert.equal(await hp(page), 80);
});
