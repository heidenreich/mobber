// Plays the whole game with a simple bot and reports, per scene: time, damage
// taken, shots, hits, kills, and ammo going in and coming out. Use it to check
// balance after changing AMMO or ENEMY_TYPES in src/config.js.
//
//   npm run playthrough            an average player (hits ~70% of shots)
//   npm run playthrough -- poor    a weaker one (slow to turn and react)
//
// It needs Playwright like the tests, and runs in real time (several minutes).
const { serve, openGame, rollFilm, chromium } = require("../tests/helpers");
const SKILL = process.argv[2] || "avg"; // avg | poor
const LIMIT_MIN = Number(process.env.LIMIT_MIN) || 25;
function installBot(skill) {
  const M = window.__mobber;
  const cfg = skill === "poor" ? { turn: 3, react: 0.6, jitter: 0.05, tol: 0.05 } : { turn: 5, react: 0.35, jitter: 0.02, tol: 0.035 };
  const key = (k, down) => window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key: k }));
  const held = new Set();
  const hold = (k, on) => { if (on && !held.has(k)) { held.add(k); key(k, true); } else if (!on && held.has(k)) { held.delete(k); key(k, false); } };
  const los = (x0, y0, x1, y1) => M.los(x0, y0, x1, y1); // the game's own line of sight, cover included
  const rec = window.__rec = []; let cur = null, lastP = null, seen = new Map(), jit = 0, jitT = 0, stuckT = 0, stuckPos = [0, 0], jig = 0, jigKey = "a", lastHp = 100;
  let last = performance.now();
  function bfs(P, goalFn) {
    const map = M.map, H = map.length, W = map[0].length, nav = M.navBlocked; // the squares furniture fills, as the game's own pathfinding sees them
    const blockedCell = { has: k => !!nav[k] };
    const sx = P.x | 0, sy = P.y | 0, prev = new Map([[sy * W + sx, -1]]), q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      if (goalFn(x, y) && !(x === sx && y === sy && false)) { const path = []; let k = y * W + x; while (k !== -1) { path.push([k % W, (k / W) | 0]); k = prev.get(k); } return path.reverse(); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = ny * W + nx, c = (map[ny] || [])[nx];
        if ((c !== "." && c !== "D") || prev.has(k) || blockedCell.has(k)) continue;
        prev.set(k, y * W + x); q.push([nx, ny]);
      }
    }
    return null;
  }
  function tick() {
    requestAnimationFrame(tick);
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    const P = M.player;
    if (M.state !== "play" || !P) { for (const k of [...held]) hold(k, false); return; }
    if (P !== lastP) { lastP = P; seen = new Map(); cur = { level: M.level.title, ammoStart: [P.mag[0] + P.reserve[0], P.mag[1] + P.reserve[1]], shots0: M.stats.shots, hits0: M.stats.hits, kills0: M.stats.kills, t: 0, minHp: 100, dmg: 0 }; rec.push(cur); lastHp = P.hp; }
    cur.t += dt; cur.minHp = Math.min(cur.minHp, P.hp); if (P.hp < lastHp) cur.dmg += lastHp - P.hp; lastHp = P.hp;
    cur.ammoEnd = [P.mag[0] + P.reserve[0], P.mag[1] + P.reserve[1]]; cur.shots = M.stats.shots - cur.shots0; cur.hits = M.stats.hits - cur.hits0; cur.kills = M.stats.kills - cur.kills0; cur.left = M.enemies.filter(e => e.hp > 0).length;
    cur.dryTime = (cur.dryTime || 0) + (cur.ammoEnd[0] + cur.ammoEnd[1] === 0 ? dt : 0);
    const turnTo = (a, rate) => { let da = a - P.a; da = Math.atan2(Math.sin(da), Math.cos(da)); P.a += Math.sign(da) * Math.min(Math.abs(da), rate * dt); return Math.abs(da); };
    // fight
    let tgt = null, td = 1e9;
    for (const e of M.enemies) { if (e.hp <= 0) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < 15 && los(P.x, P.y, e.x, e.y)) { if (!seen.has(e)) seen.set(e, cur.t); const pr = e.type.name === "boss" ? d - 100 : d; if (pr < td) { td = pr; tgt = e; } } }
    const dry = P.mag[0] + P.reserve[0] + P.mag[1] + P.reserve[1] === 0;
    jitT -= dt; if (jitT <= 0) { jitT = 0.3; jit = (Math.random() * 2 - 1) * cfg.jitter; }
    if (tgt) {
      const d = Math.hypot(tgt.x - P.x, tgt.y - P.y);
      const wantTommy = P.has[1] && P.mag[1] + P.reserve[1] > 0 && (d < 8 || tgt.type.hp > 60 || P.mag[0] + P.reserve[0] === 0);
      if (wantTommy && P.weapon !== 1) key("2", true), key("2", false); if (!wantTommy && P.weapon !== 0 && P.mag[0] + P.reserve[0] > 0) key("1", true), key("1", false);
      const off = turnTo(Math.atan2(tgt.y - P.y, tgt.x - P.x) + jit, cfg.turn);
      const ready = cur.t - seen.get(tgt) > cfg.react;
      hold(" ", ready && off < cfg.tol + cfg.jitter && (!dry || d < 1.4));
      // close in when dry or when the Don is running or target out of comfortable range
      hold("w", (dry && d > 1.0) || (tgt.type.flees && d > 6) || d > 11);
      hold("a", false); hold("d", false);
      return;
    }
    hold(" ", false);
    // navigate
    // Go for pickups it can actually take: rounds only with room in its pockets
    const lvl = M.level, want = o => (o.pick === "rounds" && (!P.has[o.weapon] || P.reserve[o.weapon] < M.AMMO.maxReserve[o.weapon])) || (o.pick === "med" && P.hp <= 65);
    let path = bfs(P, (x, y) => M.objs.some(o => want(o) && (o.x | 0) === x && (o.y | 0) === y));
    if (path && path.length > 14) path = null;
    let exitFace = null;
    // The safe: walk up to it and hold E until it opens
    hold("e", false);
    const safe = M.objs.find(o => o.safe && !o.cracked);
    if (!path && safe) {
      if (Math.hypot(safe.x - P.x, safe.y - P.y) < 1.2) { hold("w", false); hold("e", true); return; }
      path = bfs(P, (x, y) => Math.abs(x + 0.5 - safe.x) + Math.abs(y + 0.5 - safe.y) === 1);
    }
    // The lift: between landings, wait in the car (where the scene starts)
    if (!path && M.lift && !M.lift.done) {
      const sy = lvl.map.findIndex(r => r.includes("S")), sx = lvl.map[sy].indexOf("S");
      if ((P.x | 0) === sx && (P.y | 0) === sy) { hold("w", false); return; }
      path = bfs(P, (x, y) => x === sx && y === sy);
    }
    if (!path) {
      const o = lvl.objective, led = M.objs.find(o => o.pick === "ledger");
      const need = o === "ledger" && led ? [led] : o === "doubles" ? M.enemies.filter(e => e.type.name === "double" && e.hp > 0) : o === "boss" ? M.enemies.filter(e => e.type.name === "boss" && e.hp > 0) : [];
      if (need.length) path = bfs(P, (x, y) => need.some(n => (n.x | 0) === x && (n.y | 0) === y));
      else path = bfs(P, (x, y) => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if ((lvl.map[y + dy] || "")[x + dx] === "E") { return true; } return false; });
      if (!need.length && path && path.length === 1) { const [x, y] = path[0]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if ((lvl.map[y + dy] || "")[x + dx] === "E") exitFace = [x + dx + 0.5, y + dy + 0.5]; }
    }
    if (!path) { hold("w", false); cur.noPath = (cur.noPath || 0) + dt; return; }
    let goal = exitFace || (path.length > 1 ? [path[1][0] + 0.5, path[1][1] + 0.5] : [path[0][0] + 0.5, path[0][1] + 0.5]);
    if (!exitFace && path.length > 1 && Math.hypot(P.x - (path[0][0] + 0.5), P.y - (path[0][1] + 0.5)) > 0.35 && path.length > 2) {
      // cut corners only when the straight line to the next cell is clear
      if (!los(P.x, P.y, goal[0], goal[1])) goal = [path[0][0] + 0.5, path[0][1] + 0.5];
    }
    const off = turnTo(Math.atan2(goal[1] - P.y, goal[0] - P.x), 7);
    hold("w", off < 0.6);
    stuckT += dt; if (stuckT > 1.2) { if (Math.hypot(P.x - stuckPos[0], P.y - stuckPos[1]) < 0.25) { jig = 0.45; jigKey = Math.random() < 0.5 ? "a" : "d"; cur.stuck = (cur.stuck || 0) + 1; } stuckT = 0; stuckPos = [P.x, P.y]; }
    if (jig > 0) { jig -= dt; hold(jigKey, true); } else { hold("a", false); hold("d", false); }
  }
  requestAnimationFrame(tick);
}
(async () => {
  const srv = await serve(); const browser = await chromium.launch();
  const { page, errors } = await openGame(browser, srv.url); await rollFilm(page);
  await page.evaluate(installBot, SKILL);
  await page.evaluate(() => window.__mobber.startLevel(0));
  const cards = []; const t0 = Date.now(); let done = false;
  while (!done && Date.now() - t0 < LIMIT_MIN * 60e3) {
    await page.waitForTimeout(250);
    const s = await page.evaluate(() => ({ state: window.__mobber.state, fade: window.__mobber.fade, card: window.__mobber.card, n: window.__rec.length }));
    if (s.state === "card" && s.fade >= 0.6) {
      cards.push(s.card.kind); await page.evaluate(([n, k]) => { if (window.__rec[n - 1] && !window.__rec[n - 1].result) window.__rec[n - 1].result = k; }, [s.n, s.card.kind]);
      if (s.card.kind === "end") done = true; else await page.mouse.click(200, 200);
    }
  }
  const rec = await page.evaluate(() => window.__rec);
  for (const r of rec) console.log(SKILL, JSON.stringify({ lvl: r.level, res: r.result || "(unfinished)", t: Math.round(r.t), dmg: Math.round(r.dmg), minHp: Math.round(r.minHp), shots: r.shots, hits: r.hits, kills: r.kills, left: r.left, ammo: r.ammoStart.join("/") + " -> " + (r.ammoEnd || []).join("/"), dry: Math.round(r.dryTime || 0), stuck: r.stuck || 0, noPath: Math.round(r.noPath || 0) }));
  console.log(SKILL, "stats", JSON.stringify(await page.evaluate(() => ({ ...window.__mobber.stats, secretsFound: 0 }))), "errors", errors.length, "wall min", ((Date.now() - t0) / 60000).toFixed(1));
  await browser.close(); srv.server.close();
})();
