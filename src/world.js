// The current chapter's space: loading a map, walls, line of sight, the light map
// and collision.
import { ENEMY_TYPES, PLAYER, AMMO } from "./config.js";
import { rand, clamp } from "./util.js";
import { game, say } from "./state.js";
import { LEVELS } from "./levels.js";
import { OBJ } from "./art/sprites.js";
import { setupDoors, partialSolid } from "./doors.js";

import { WALL_CHARS as WALLS, DOOR, SECRET } from "./tiles.js";
import { FOLK_LETTERS, spawnFolk } from "./folk.js";
import { findWindows } from "./fence.js";

// Map letter -> what gets placed there. `light` is [intensity, radius] for lamps.
// `cover` props are taller than a person, so they block sight and bullets; you can
// see (and shoot) a gangster's head and shoulders over a car or a crate.
export const SPAWNS = {
  c: { art: "table", scale: 0.75, block: true, light: [0.8, 3.6] },
  k: { art: "crate", scale: 0.85, block: true },
  p: { art: "piano", scale: 0.9, block: true },
  o: { art: "barrel", scale: 0.7, block: true },
  l: { art: "lamp", scale: 1.0, block: true, glow: true, light: [1.2, 5.5], lampWidth: 0.16 },
  "*": { art: "hanging", scale: 0.6, hang: true, glow: true, light: [1.25, 6], lampWidth: 0.12 },
  $: { art: "cash", scale: 0.6, pick: "cash" },
  "+": { art: "medkit", scale: 0.6, pick: "med" },
  a: { art: "ammo", scale: 0.6, pick: "rounds", weapon: 1, amount: AMMO.drum },
  r: { art: "rounds", scale: 0.6, pick: "rounds", weapon: 0, amount: AMMO.revolverBox },
  L: { art: "ledger", scale: 0.6, pick: "ledger", bob: true },
  // Street furniture. `size` is how far the solid part reaches from the center.
  // (L becomes a safe holding the ledger on a level with `safe: true`)
  C: { art: "car", scale: 0.8, block: true, size: 0.8 },
  m: { art: "lamppost", scale: 1.8, block: true, size: 0.15, glow: true, light: [1.3, 6], lampWidth: 0.14 },
  h: { art: "hydrant", scale: 0.6, block: true, size: 0.2 },
  t: { art: "trash", scale: 0.7, block: true, size: 0.25 },
  s: { art: "bollard", scale: 0.6, block: true, size: 0.22 },
  n: { art: "newsstand", scale: 0.9, block: true, size: 0.45 },
  x: { art: "alarm", scale: 0.8, block: true, size: 0.2, alarm: true },
  // The hotel roof
  w: { art: "watertower", scale: 2.6, block: true, size: 0.8, cover: true },
  q: { art: "chimney", scale: 1.1, block: true, size: 0.3, cover: true },
  N: { art: "regentSign", scale: 1.5, block: true, size: 0.6, glow: true, cover: true },
  A: { art: "autogiro", scale: 1.3, block: true, size: 1.0, cover: true, frames: "autogiroSpin" },
};

// Blocks movement and sight: walls, closed doors and moving secret walls
export function wallAt(x, y) {
  const xi = x | 0, yi = y | 0;
  if (xi < 0 || yi < 0 || xi >= game.width || yi >= game.height) return true;
  const c = game.map[yi][xi];
  if (c === ".") return false;
  if (c === "D" || c === "~") return partialSolid(c, xi, yi, x, y);
  return true;
}
// Blocks lamplight: walls only (light spills under doors)
function solidAt(x, y) {
  const xi = x | 0, yi = y | 0;
  if (xi < 0 || yi < 0 || xi >= game.width || yi >= game.height) return true;
  const c = game.map[yi][xi];
  return c !== "." && c !== "D";
}

// Clear line of sight (and of fire) between two points. Walls and closed doors
// block it, and so do props taller than a person (water towers, chimneys...): cover.
// Lamplight passes its own test (walls only) and ignores props.
export function los(x0, y0, x1, y1, blocks = wallAt) {
  // Walk every square the line passes through, exactly as the renderer's rays do, so
  // nobody can see (or shoot) through the corner of a wall. Each square is tested at
  // the middle of the stretch of line inside it, which also handles part-open doors.
  const dx = x1 - x0, dy = y1 - y0;
  let cx = Math.floor(x0), cy = Math.floor(y0);
  const ex = Math.floor(x1), ey = Math.floor(y1);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
  const tdx = dx ? Math.abs(1 / dx) : Infinity, tdy = dy ? Math.abs(1 / dy) : Infinity;
  let tmx = dx ? (dx > 0 ? cx + 1 - x0 : x0 - cx) * tdx : Infinity;
  let tmy = dy ? (dy > 0 ? cy + 1 - y0 : y0 - cy) * tdy : Infinity;
  let t = 0;
  for (let n = 0; n < 256; n++) {
    const tNext = Math.min(tmx, tmy, 1), tm = (t + tNext) / 2;
    if (n > 0 && blocks(x0 + dx * tm, y0 + dy * tm)) return false; // the starting square is never in the way
    if ((cx === ex && cy === ey) || tNext >= 1) break;
    if (tmx < tmy) { cx += sx; t = tmx; tmx += tdx; } else { cy += sy; t = tmy; tmy += tdy; }
  }
  if (blocks === wallAt) for (const o of game.objs) if (o.cover && segmentHitsBox(x0, y0, x1, y1, o)) return false;
  return true;
}
function segmentHitsBox(x0, y0, x1, y1, o) {
  const h = (o.size || 0.28) * 0.9, bx0 = o.x - h, bx1 = o.x + h, by0 = o.y - h, by1 = o.y + h;
  const inside = (x, y) => x > bx0 && x < bx1 && y > by0 && y < by1;
  if (inside(x0, y0) || inside(x1, y1)) return false; // someone right up against it can see past
  const dx = x1 - x0, dy = y1 - y0;
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, x0 - bx0], [dx, bx1 - x0], [-dy, y0 - by0], [dy, by1 - y0]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}

// Grid pathfinding for gangsters: the center of the next square to walk to on the
// way to (tx, ty), going around walls and furniture and through doors. Returns null
// if there's no way there. `avoid` is a point whose square counts as blocked.
export function nextStep(fx, fy, tx, ty, avoid) {
  const W = game.width, H = game.height, start = (fy | 0) * W + (fx | 0), goal = (ty | 0) * W + (tx | 0);
  if (start === goal) return { x: tx, y: ty };
  const free = i => {
    const c = game.map[(i / W) | 0][i % W];
    if (c !== "." && c !== "D") return false;
    if (game.navBlocked[i]) return false;
    return !(avoid && i === (avoid.y | 0) * W + (avoid.x | 0) && i !== goal);
  };
  const prev = new Int32Array(W * H).fill(-1), queue = [goal];
  prev[goal] = goal;
  // Search back from the goal so the answer is simply "the neighbor nearest the goal"
  for (let qi = 0; qi < queue.length; qi++) {
    const i = queue[qi], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, j = ny * W + nx;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev[j] !== -1) continue;
      if (j !== start && !free(j)) continue;
      prev[j] = i;
      if (j === start) { const k = prev[start]; return k === goal ? { x: tx, y: ty } : { x: (k % W) + 0.5, y: ((k / W) | 0) + 0.5 }; }
      queue.push(j);
    }
  }
  return null;
}
// Squares furniture fills, for pathfinding (built once per scene; furniture doesn't move)
function buildNav() {
  const W = game.width, H = game.height;
  game.navBlocked = new Uint8Array(W * H);
  for (const o of game.objs) {
    if (!o.block) continue;
    const r = (o.size || 0.28) + 0.2;
    for (let y = Math.floor(o.y - r); y <= Math.floor(o.y + r); y++) for (let x = Math.floor(o.x - r); x <= Math.floor(o.x + r); x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      // Block the square if the prop covers its middle
      if (Math.abs(x + 0.5 - o.x) < r && Math.abs(y + 0.5 - o.y) < r) game.navBlocked[y * W + x] = 1;
    }
  }
}

// One slot per gun: revolver, tommy gun, sawn-off. A loadout carried in from an older save may have only two.
const three = (have, fresh) => fresh.map((v, i) => (have ? have[i] ?? (typeof v === "boolean" ? false : 0) : v));

export function loadLevel(i) {
  const lvl = LEVELS[i];
  game.levelIdx = i; game.level = lvl;
  game.height = lvl.map.length; game.width = lvl.map[0].length;
  game.map = lvl.map.map(r => r.split(""));
  game.objs = []; game.enemies = []; game.folk = []; game.bullets = []; game.smashed = new Set();
  setupDoors(lvl.map);
  findWindows(lvl.map);
  // Guns and ammo carry over from the previous scene (flow.js passes the right loadout on a retry)
  const prev = game.player;
  const player = game.player = {
    x: 2, y: 2, a: 0, hp: !prev || lvl.fullHealth ? PLAYER.maxHp : Math.max(prev.hp, PLAYER.minStartHp), weapon: prev ? prev.weapon : 0, has: three(prev && prev.has, [true, false, false]),
    mag: three(prev && prev.mag, [6, 0, 0]), reserve: three(prev && prev.reserve, [AMMO.startRevolverReserve, 0, 0]),
    fireCd: 0, reload: 0, recoil: 0, flash: 0, bob: 0, moving: false, hurt: 0, ledger: false,
    lean: 0, vx: 0, vy: 0,
    loot: prev && prev.loot ? prev.loot.slice() : [],   // valuables to sell to the fence: [name, value] pairs
    vest: prev ? prev.vest || 0 : 0,   // what's left of a steel vest bought from the dealer
  };
  for (let y = 0; y < game.height; y++) for (let x = 0; x < game.width; x++) {
    const ch = game.map[y][x], cx = x + 0.5, cy = y + 0.5;
    if (WALLS.includes(ch) || ch === DOOR || ch === SECRET) continue; // doors and secrets stay in the map
    game.map[y][x] = ".";
    if (ch === "S") { player.x = cx; player.y = cy; player.a = facingOpen(x, y); game.wayOut = [cx, cy]; }
    else if (FOLK_LETTERS.includes(ch)) spawnFolk(ch, cx, cy);
    else if (ENEMY_TYPES[ch]) spawnEnemy(ch, cx, cy);
    else if (ch === "L" && lvl.safe) game.objs.push({ x: cx, y: cy, art: OBJ.safe, scale: 0.8, block: true, size: 0.3, safe: true, progress: 0 });
    else if (SPAWNS[ch]) { const sp = SPAWNS[ch]; game.objs.push({ x: cx, y: cy, ...sp, art: OBJ[sp.art], frames: sp.frames && OBJ[sp.frames] }); }
  }
  buildLight();
  buildNav();
  game.timer = 0; game.shop = false; game.choice = null; game.cracking = null; game.lift = null; game.alarm = false;
}

// Put a gangster on the map. He stands watching the longest open view from where he is.
export function spawnEnemy(letter, x, y) {
  const type = ENEMY_TYPES[letter];
  // A fleeing Don is already on the run when the scene opens
  const e = { x, y, type, hp: type.hp, state: "idle", t: 0, cd: rand(0.5, 1.5), alert: !!type.flees, lx: x, ly: y, burstLeft: 0, step: 0, wp: 0, wp2: null, repath: 0, staggerCd: 0,
    face: facingOpen(x | 0, y | 0), turnT: rand(3, 8), lookBack: false };
  if (type.up) {
    // A man at a window: tucked against the building beside him, looking out over the street
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      if (!WALLS.includes((game.map[(y | 0) + dy] || [])[(x | 0) + dx])) continue;
      e.x += dx * 0.38; e.y += dy * 0.38; e.face = Math.atan2(-dy, -dx); e.turnT = Infinity;
      break;
    }
  }
  game.enemies.push(e);
  return e;
}

// Start facing down the longest open line of sight, looking through doors
function facingOpen(x, y) {
  const open = (px, py) => { const c = (game.map[py | 0] || [])[px | 0]; return c === "." || c === "D"; };
  let best = 0, bestN = -1;
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    let n = 0; while (n < 20 && open(x + 0.5 + Math.cos(a) * (n + 1), y + 0.5 + Math.sin(a) * (n + 1))) n++;
    if (n > bestN) { bestN = n; best = a; }
  }
  return best;
}

// Light map: lamps throw pools of light, blocked by walls. Sampled at 4x4 per square.
export const lightMap = { data: null, w: 0, h: 0, sub: 4 };
// Called again when a lamp is shot out
export function buildLight() {
  const sub = lightMap.sub, ambient = game.level.ambient;
  const w = lightMap.w = game.width * sub, h = lightMap.h = game.height * sub;
  const data = lightMap.data = new Float32Array(w * h).fill(ambient);
  const lamps = game.objs.filter(o => o.light);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const wx = (x + 0.5) / sub, wy = (y + 0.5) / sub;
    if (solidAt(wx, wy)) continue;
    let v = ambient;
    for (const l of lamps) {
      const d = Math.hypot(l.x - wx, l.y - wy), [I, R] = l.light;
      if (d >= R) continue;
      if (!los(l.x, l.y, wx, wy, solidAt)) continue;
      const f = 1 - d / R; v += I * f * f;
    }
    data[y * w + x] = Math.min(1.35, v);
  }
}
export function lightAt(x, y) {
  const { data, w, h, sub } = lightMap;
  return data[clamp((y * sub) | 0, 0, h - 1) * w + clamp((x * sub) | 0, 0, w - 1)];
}

export function blocked(x, y, r, self) {
  if (wallAt(x - r, y - r) || wallAt(x + r, y - r) || wallAt(x - r, y + r) || wallAt(x + r, y + r)) return true;
  for (const o of game.objs) if (o.block && Math.abs(o.x - x) < r + (o.size || 0.28) && Math.abs(o.y - y) < r + (o.size || 0.28)) return true;
  for (const e of game.enemies) if (e !== self && e.hp > 0 && !e.type.up && Math.hypot(e.x - x, e.y - y) < r + 0.25) return true;
  if (self !== game.player && Math.hypot(game.player.x - x, game.player.y - y) < r + 0.25) return true;
  return false;
}

// Moves along each axis separately so you slide along walls instead of sticking
export function moveBy(o, dx, dy, r) {
  let hit = false;
  if (!blocked(o.x + dx, o.y, r, o)) o.x += dx; else hit = true;
  if (!blocked(o.x, o.y + dy, r, o)) o.y += dy; else hit = true;
  return hit;
}

export function objectiveDone() {
  const o = game.level.objective;
  if (o === "reach") return true; // street scenes: just get to the door
  if (o === "lift") return !!game.lift && game.lift.done;
  if (o === "doubles") return !game.enemies.some(e => e.type.name === "double" && e.hp > 0);
  return o === "ledger" ? game.player.ledger : !game.enemies.some(e => e.type.name === "boss" && e.hp > 0);
}
