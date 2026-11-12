// Sliding doors and secret walls.
//
// Doors (D) sit between two walls and slide sideways into one of them. They open
// on their own when you, or a gangster who's after you, come near, and close a
// few seconds after everyone has gone. A closed door blocks bullets and sight.
//
// Secret walls (!) look like the wall around them, apart from faint scuff marks
// near the floor. Walk into one (or press E) and it grinds back up to two squares.
import { DOORS } from "./config.js";
import { clamp } from "./util.js";
import { game, stats, say } from "./state.js";
import { SND } from "./audio.js";

import { WALL_CHARS as WALLS, SIDE_WALL_CHARS } from "./tiles.js";
const WALL_CHARS = WALLS + "!";
const key = (x, y) => y * game.width + x;

// Called by loadLevel with the original map rows, before entities are cleared
export function setupDoors(rows) {
  game.doors = new Map(); game.secrets = new Map(); game.movers = []; game.moverCells = new Map();
  const at = (x, y) => (rows[y] || "")[x] || "#";
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === "D") {
      // Walls left and right: the door spans the x axis and you walk through it north-south
      const axis = WALL_CHARS.includes(at(x - 1, y)) && WALL_CHARS.includes(at(x + 1, y)) ? "x" : "y";
      game.doors.set(key(x, y), { x, y, axis, open: 0, opening: false, hold: 0 });
    } else if (c === "!") {
      // Borrow the texture of a neighboring wall so the secret blends in
      const tex = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].find(n => SIDE_WALL_CHARS.includes(n)) || "W";
      game.secrets.set(key(x, y), { x, y, tex });
    }
  }));
}

export const doorAt = (x, y) => game.doors.get(key(x, y));
export const secretTex = (x, y) => { const s = game.secrets.get(key(x, y)); return s ? s.tex : "W"; };

// The solid part of a door or moving secret wall in a square, or null if there's none.
export function partialBox(x, y) {
  const c = game.map[y][x];
  if (c === "D") {
    const d = doorAt(x, y), t = DOORS.thickness / 2;
    if (d.open >= 0.999) return null;
    return d.axis === "x"
      ? { x0: x + d.open, x1: x + 1, y0: y + 0.5 - t, y1: y + 0.5 + t, door: d }
      : { x0: x + 0.5 - t, x1: x + 0.5 + t, y0: y + d.open, y1: y + 1, door: d };
  }
  if (c === "~") { const m = game.moverCells.get(key(x, y)); return m ? moverBox(m) : null; }
  return null;
}
function moverBox(m) {
  const ox = m.x + m.dx * m.p, oy = m.y + m.dy * m.p;
  return { x0: ox, x1: ox + 1, y0: oy, y1: oy + 1, mover: m };
}

// Is this point inside a door or moving wall? (Used for collision and line of sight.)
export function partialSolid(c, xi, yi, x, y) {
  if (c === "D") return doorAt(xi, yi).open < DOORS.passableAt;
  const m = game.moverCells.get(key(xi, yi));
  if (!m) return false;
  const b = moverBox(m);
  return x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1;
}

function someoneIn(d, r = 0.25) {
  const inside = a => a.x > d.x - r && a.x < d.x + 1 + r && a.y > d.y - r && a.y < d.y + 1 + r;
  return inside(game.player) || game.enemies.some(e => e.hp > 0 && inside(e));
}

export function updateDoors(dt) {
  const p = game.player;
  for (const d of game.doors.values()) {
    const cx = d.x + 0.5, cy = d.y + 0.5;
    let near = Math.hypot(p.x - cx, p.y - cy) < DOORS.reach;
    // Gangsters open doors too, but only once they're after you
    for (const e of game.enemies) if (e.hp > 0 && e.state !== "idle" && Math.hypot(e.x - cx, e.y - cy) < DOORS.reach) near = true;
    if (d.locked) { near = false; d.hold = 0; }   // the lift gate, between landings
    d.hold = near ? DOORS.holdOpen : d.hold - dt;
    const opening = d.hold > 0 || someoneIn(d); // never close on anyone
    if (opening !== d.opening) {
      d.opening = opening;
      if (opening ? d.open < 0.5 : d.open > 0.5) SND.door(Math.hypot(p.x - cx, p.y - cy));
    }
    d.open = clamp(d.open + (opening ? 1 : -1) * DOORS.speed * dt, 0, 1);
  }
}

// Push a secret wall in front of (px, py) along (dirX, dirY). Returns true if one moved.
export function tryPush(px, py, dirX, dirY, reach = 0.7) {
  const tx = (px + dirX * reach) | 0, ty = (py + dirY * reach) | 0;
  if (!game.map[ty] || game.map[ty][tx] !== "!") return false;
  // It slides away from you, along whichever axis you're facing it on
  const ddx = tx + 0.5 - px, ddy = ty + 0.5 - py;
  const dx = Math.abs(ddx) >= Math.abs(ddy) ? Math.sign(ddx) : 0, dy = dx ? 0 : Math.sign(ddy);
  // Never slide onto a prop, a gangster or you
  const inSquare = (a, x, y) => a.x > x - 0.25 && a.x < x + 1.25 && a.y > y - 0.25 && a.y < y + 1.25;
  const free = (x, y) => game.map[y] && game.map[y][x] === "." && !game.objs.some(o => (o.x | 0) === x && (o.y | 0) === y)
    && !game.enemies.some(e => e.hp > 0 && inSquare(e, x, y)) && !inSquare(game.player, x, y);
  let dist = 0;
  while (dist < DOORS.secretTravel && free(tx + dx * (dist + 1), ty + dy * (dist + 1))) dist++;
  if (!dist) return false;
  const s = game.secrets.get(key(tx, ty));
  const m = { x: tx, y: ty, dx, dy, p: 0, dist, tex: s.tex };
  for (let k = 0; k <= dist; k++) { const x = tx + dx * k, y = ty + dy * k; game.map[y][x] = "~"; game.moverCells.set(key(x, y), m); }
  game.secrets.delete(key(tx, ty));
  game.movers.push(m);
  stats.secretsFound.add(`${game.levelIdx}:${tx}:${ty}`);
  say("A secret!", 2.5);
  SND.grind();
  return true;
}

export function updateSecrets(dt) {
  for (let i = game.movers.length - 1; i >= 0; i--) {
    const m = game.movers[i];
    m.p = Math.min(m.dist, m.p + DOORS.secretSpeed * dt);
    if (m.p < m.dist) continue;
    // Settled: the wall becomes solid again in its new square
    for (let k = 0; k <= m.dist; k++) { const x = m.x + m.dx * k, y = m.y + m.dy * k; game.map[y][x] = "."; game.moverCells.delete(key(x, y)); }
    game.map[m.y + m.dy * m.dist][m.x + m.dx * m.dist] = m.tex;
    game.movers.splice(i, 1);
  }
}
