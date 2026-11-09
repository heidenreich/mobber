// The current chapter's space: loading a map, walls, line of sight, the light map
// and collision.
import { ENEMY_TYPES, PLAYER, AMMO } from "./config.js";
import { rand, clamp } from "./util.js";
import { game, say } from "./state.js";
import { LEVELS } from "./levels.js";
import { OBJ } from "./art/sprites.js";
import { setupDoors, partialSolid } from "./doors.js";

const WALLS = "#WPBTEFHU";

// Map letter -> what gets placed there. `light` is [intensity, radius] for lamps.
const SPAWNS = {
  c: { art: "table", scale: 0.75, block: true, light: [0.8, 3.6] },
  k: { art: "crate", scale: 0.85, block: true },
  p: { art: "piano", scale: 0.9, block: true },
  o: { art: "barrel", scale: 0.7, block: true },
  l: { art: "lamp", scale: 1.0, block: true, glow: true, light: [1.2, 5.5] },
  "*": { art: "hanging", scale: 0.6, hang: true, glow: true, light: [1.25, 6] },
  $: { art: "cash", scale: 0.6, pick: "cash" },
  "+": { art: "medkit", scale: 0.6, pick: "med" },
  a: { art: "ammo", scale: 0.6, pick: "rounds", weapon: 1, amount: AMMO.drum },
  r: { art: "rounds", scale: 0.6, pick: "rounds", weapon: 0, amount: AMMO.revolverBox },
  L: { art: "ledger", scale: 0.6, pick: "ledger", bob: true },
  // Street furniture. `size` is how far the solid part reaches from the center.
  C: { art: "car", scale: 0.8, block: true, size: 0.8 },
  m: { art: "lamppost", scale: 1.8, block: true, size: 0.15, glow: true, light: [1.3, 6] },
  h: { art: "hydrant", scale: 0.6, block: true, size: 0.2 },
  t: { art: "trash", scale: 0.7, block: true, size: 0.25 },
  n: { art: "newsstand", scale: 0.9, block: true, size: 0.45 },
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

export function los(x0, y0, x1, y1, blocks = wallAt) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 0.15);
  for (let i = 1; i < n; i++) if (blocks(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false;
  return true;
}

export function loadLevel(i) {
  const lvl = LEVELS[i];
  game.levelIdx = i; game.level = lvl;
  game.height = lvl.map.length; game.width = lvl.map[0].length;
  game.map = lvl.map.map(r => r.split(""));
  game.objs = []; game.enemies = [];
  setupDoors(lvl.map);
  // Guns and ammo carry over from the previous scene (flow.js passes the right loadout on a retry)
  const prev = game.player;
  const player = game.player = {
    x: 2, y: 2, a: 0, hp: PLAYER.maxHp, weapon: prev ? prev.weapon : 0, has: prev ? prev.has.slice() : [true, false],
    mag: prev ? prev.mag.slice() : [6, 0], reserve: prev ? prev.reserve.slice() : [AMMO.startRevolverReserve, 0],
    fireCd: 0, reload: 0, recoil: 0, flash: 0, bob: 0, moving: false, hurt: 0, ledger: false,
  };
  for (let y = 0; y < game.height; y++) for (let x = 0; x < game.width; x++) {
    const ch = game.map[y][x], cx = x + 0.5, cy = y + 0.5;
    if (WALLS.includes(ch) || ch === "D" || ch === "!") continue; // doors and secrets stay in the map
    game.map[y][x] = ".";
    if (ch === "S") { player.x = cx; player.y = cy; player.a = facingOpen(x, y); }
    else if (ENEMY_TYPES[ch]) {
      const type = ENEMY_TYPES[ch];
      game.enemies.push({ x: cx, y: cy, type, hp: type.hp, state: "idle", t: 0, cd: rand(0.5, 1.5), alert: false, lx: cx, ly: cy, burstLeft: 0, step: 0 });
    }
    else if (SPAWNS[ch]) game.objs.push({ x: cx, y: cy, ...SPAWNS[ch], art: OBJ[SPAWNS[ch].art] });
  }
  buildLight();
  game.timer = 0;
  say(lvl.objective === "ledger" ? "Find the ledger." : lvl.objective === "boss" ? "Find Don Vitale." : lvl.goal, 3);
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
function buildLight() {
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
  for (const e of game.enemies) if (e !== self && e.hp > 0 && Math.hypot(e.x - x, e.y - y) < r + 0.25) return true;
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
  return o === "ledger" ? game.player.ledger : !game.enemies.some(e => e.type.name === "boss" && e.hp > 0);
}
