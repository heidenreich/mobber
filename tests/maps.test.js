// Every map must be sealed, rectangular and beatable: the start can reach every
// enemy, pickup and objective, and the exit door is reachable. Doors count as
// open floor; secret walls only count as open when checking optional stashes,
// because the objective and the exit must never depend on finding a secret.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { serve, openGame, chromium } = require("./helpers");

let srv, browser, levels, WALLS, BLOCKERS, SIDE_WALLS;
before(async () => {
  srv = await serve();
  browser = await chromium.launch();
  const { page, context } = await openGame(browser, srv.url);
  ({ walls: WALLS, blockers: BLOCKERS, sideWalls: SIDE_WALLS } = await page.evaluate(() => window.__mobber.TILES)); // the game's own lists
  levels = await page.evaluate(() => window.__mobber.LEVELS.map(l => ({ title: l.title, objective: l.objective, map: l.map, endOnBoss: !!l.endOnBoss, route: l.route })));
  await context.close();
});
after(async () => { await browser.close(); srv.server.close(); });

const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function flood(map, start, throughSecrets) {
  const seen = new Set([`${start.x},${start.y}`]), queue = [start];
  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of STEPS) {
      const nx = x + dx, ny = y + dy, c = (map[ny] || "")[nx];
      if (c === undefined || WALLS.includes(c) || BLOCKERS.includes(c) || (c === "!" && !throughSecrets) || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`); queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

function analyse(map) {
  const cells = [];
  map.forEach((row, y) => [...row].forEach((c, x) => cells.push({ c, x, y })));
  const start = cells.find(k => k.c === "S");
  const all = flood(map, start, true), main = flood(map, start, false);
  return {
    cells, start,
    reach: k => all.has(`${k.x},${k.y}`),
    reachMain: k => main.has(`${k.x},${k.y}`),
    touchesMain: k => STEPS.some(([dx, dy]) => main.has(`${k.x + dx},${k.y + dy}`)),
  };
}

test("three locations, each preceded by a street scene, then the rooftop finale", () => {
  assert.equal(levels.length, 7);
  levels.slice(0, 6).forEach((l, i) => assert.equal(l.objective === "reach", i % 2 === 0, `${l.title}: streets and locations should alternate`));
  const roof = levels[6];
  assert.ok(roof.endOnBoss && roof.objective === "boss", "the picture ends when the Don goes down on the roof");
});

for (let i = 0; i < 7; i++) {
  test(`level ${i + 1} map is sound and beatable`, () => {
    const { title, objective, map } = levels[i];
    const w = map[0].length, h = map.length;
    map.forEach((row, y) => assert.equal(row.length, w, `${title}: row ${y} has the wrong length`));
    const { cells, start, reach, reachMain, touchesMain } = analyse(map);
    const at = (x, y) => (map[y] || "")[x] || "#";
    assert.ok(start, `${title}: no start`);
    assert.equal(cells.filter(k => k.c === "S").length, 1, `${title}: exactly one start`);
    for (const k of cells) {
      if (k.x === 0 || k.y === 0 || k.x === w - 1 || k.y === h - 1) assert.ok(WALLS.includes(k.c), `${title}: gap in the outer wall at ${k.x},${k.y}`);
    }
    for (const k of cells.filter(k => "gGvV$+arL".includes(k.c))) assert.ok(reach(k), `${title}: '${k.c}' at ${k.x},${k.y} can't be reached`);
    for (const k of cells.filter(k => "LvV".includes(k.c))) assert.ok(reachMain(k), `${title}: the objective at ${k.x},${k.y} is only reachable through a secret wall`);
    const exits = cells.filter(k => k.c === "E");
    if (!levels[i].endOnBoss) assert.ok(exits.length >= 1 && exits.every(touchesMain), `${title}: exit door can't be reached (without secrets)`);
    // A fleeing Don's route must be walkable from where he starts, in straight lines
    if (levels[i].route) {
      const don = cells.find(k => k.c === "V");
      let [x, y] = [don.x + 0.5, don.y + 0.5];
      for (const [tx, ty] of levels[i].route) {
        for (let s = 0; s <= 1; s += 0.02) {
          const c = at((x + (tx - x) * s) | 0, (y + (ty - y) * s) | 0);
          assert.ok(!WALLS.includes(c) && !BLOCKERS.includes(c), `${title}: the Don's route is blocked by '${c}'`);
        }
        [x, y] = [tx, ty];
      }
    }
    for (const d of cells.filter(k => k.c === "D")) {
      const wall = c => (WALLS + "!").includes(c); // the same set doors.js uses
      const ew = wall(at(d.x - 1, d.y)) && wall(at(d.x + 1, d.y)) && !wall(at(d.x, d.y - 1)) && !wall(at(d.x, d.y + 1));
      const ns = wall(at(d.x, d.y - 1)) && wall(at(d.x, d.y + 1)) && !wall(at(d.x - 1, d.y)) && !wall(at(d.x + 1, d.y));
      assert.ok(ew || ns, `${title}: door at ${d.x},${d.y} must sit between two walls with floor on the other sides`);
    }
    for (const s of cells.filter(k => k.c === "!")) {
      // Some direction has open floor behind it for the wall to slide into
      const room = STEPS.some(([dx, dy]) => at(s.x + dx, s.y + dy) === "." && reachMain({ x: s.x - dx, y: s.y - dy }));
      assert.ok(room, `${title}: secret wall at ${s.x},${s.y} has nowhere to slide`);
    }
    if (objective === "ledger") assert.equal(cells.filter(k => k.c === "L").length, 1, `${title}: needs one ledger`);
    if (objective === "boss") assert.equal(cells.filter(k => k.c === "V").length, 1, `${title}: needs the Don`);
    if (objective === "doubles") assert.ok(cells.filter(k => k.c === "v").length >= 1, `${title}: needs the Don's doubles`);
  });
}
