// Every map must be sealed, rectangular and beatable: the start can reach every
// enemy, pickup and objective, and the exit door is reachable.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { serve, openGame, chromium } = require("./helpers");

let srv, browser, levels;
before(async () => {
  srv = await serve();
  browser = await chromium.launch();
  const { page, context } = await openGame(browser, srv.url);
  levels = await page.evaluate(() => window.__mobber.LEVELS.map(l => ({ title: l.title, objective: l.objective, map: l.map })));
  await context.close();
});
after(async () => { await browser.close(); srv.server.close(); });

const WALLS = "#WPBTE", BLOCKERS = "ckpol";
const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function analyse(map) {
  const cells = [];
  map.forEach((row, y) => [...row].forEach((c, x) => cells.push({ c, x, y })));
  const start = cells.find(k => k.c === "S");
  const seen = new Set([`${start.x},${start.y}`]), queue = [start];
  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of STEPS) {
      const nx = x + dx, ny = y + dy, c = (map[ny] || "")[nx];
      if (c === undefined || WALLS.includes(c) || BLOCKERS.includes(c) || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`); queue.push({ x: nx, y: ny });
    }
  }
  return { cells, start, reach: k => seen.has(`${k.x},${k.y}`), touches: k => STEPS.some(([dx, dy]) => seen.has(`${k.x + dx},${k.y + dy}`)) };
}

test("there are three chapters", () => assert.equal(levels.length, 3));

for (let i = 0; i < 3; i++) {
  test(`chapter ${i + 1} map is sound and beatable`, () => {
    const { title, objective, map } = levels[i];
    const w = map[0].length, h = map.length;
    map.forEach((row, y) => assert.equal(row.length, w, `${title}: row ${y} has the wrong length`));
    const { cells, start, reach, touches } = analyse(map);
    assert.ok(start, `${title}: no start`);
    assert.equal(cells.filter(k => k.c === "S").length, 1, `${title}: exactly one start`);
    for (const k of cells) {
      if (k.x === 0 || k.y === 0 || k.x === w - 1 || k.y === h - 1) assert.ok(WALLS.includes(k.c), `${title}: gap in the outer wall at ${k.x},${k.y}`);
    }
    for (const k of cells.filter(k => "gGV$+aL".includes(k.c))) assert.ok(reach(k), `${title}: '${k.c}' at ${k.x},${k.y} can't be reached`);
    const exits = cells.filter(k => k.c === "E");
    assert.ok(exits.length >= 1 && exits.every(touches), `${title}: exit door can't be reached`);
    if (objective === "ledger") assert.equal(cells.filter(k => k.c === "L").length, 1, `${title}: needs one ledger`);
    if (objective === "boss") assert.equal(cells.filter(k => k.c === "V").length, 1, `${title}: needs the Don`);
  });
}
