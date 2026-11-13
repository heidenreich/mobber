// Draws the 3D view into the film's luma buffer: floor and ceiling, walls (one
// ray per screen column), sprites sorted far to near, then the gun in your hand.
import { W, H, HALF, K, PLANE, FOG, GLOW, WEAPONS, ENEMY_AI, PLAYER } from "../config.js";
import { clamp } from "../util.js";
import { game } from "../state.js";
import { FLOORS, CEILS, TEX, WALL_TEXTURES, DOOR_TEX, SECRET_TEXTURES, SMASHED_TEXTURES } from "../art/textures.js";
import { PEOPLE } from "../art/sprites.js";
import { ENTRANCES, makeSky, FENCE_SHUT } from "../art/streets.js";
import { GUN_ART } from "../art/guns.js";
import { lightMap, lightAt } from "../world.js";
import { partialBox, secretTex } from "../doors.js";
import { cam, camera, project, zbuf } from "./camera.js";
import { luma } from "./film.js";

const NIGHT_SKY = makeSky(2048, HALF), DAWN_SKY = makeSky(2048, HALF, true);
// Each screen column's angle from the view direction, for wrapping the sky around
const COL_ANGLE = Float32Array.from({ length: W }, (_, x) => Math.atan((2 * x / W - 1) * PLANE));
// What each screen column's wall looked like this frame, kept for reflections in wet streets
const colTex = new Array(W), colTx = new Uint8Array(W), colLit = new Float32Array(W);

export function renderWorld(t) {
  camera();
  const { dirX, dirY, planeX, planeY } = cam;
  const p = game.player, px = cam.x, py = cam.y, map = game.map, MW = game.width, MH = game.height, lvl = game.level;
  const fl = FLOORS[lvl.floor].L, ce = lvl.sky ? null : CEILS[lvl.ceil].L;
  const light = lightMap.data, LW = lightMap.w, LH = lightMap.h, LSUB = lightMap.sub;
  const wallH = lvl.wallHeight || 1;
  const exitTex = lvl.entrance ? ENTRANCES[lvl.entrance] : TEX.door;

  // Outdoors: the sky, which turns with you
  const SKY = lvl.sky === "dawn" ? DAWN_SKY : NIGHT_SKY;
  if (ce === null) {
    for (let x = 0; x < W; x++) {
      const a = (p.a + COL_ANGLE[x]) / (Math.PI * 2);
      const u = (((a - Math.floor(a)) * SKY.w) | 0) % SKY.w;
      for (let y = 0; y < HALF; y++) luma[y * W + x] = SKY.L[y * SKY.w + u];
    }
  }

  // Floor and ceiling, one row at a time
  for (let y = HALF + 1; y < H; y++) {
    const rowDist = (0.5 * K) / (y - HALF);
    const fog = Math.exp(-rowDist * FOG);
    let fx = px + rowDist * (dirX - planeX), fy = py + rowDist * (dirY - planeY);
    const sx = rowDist * 2 * planeX / W, sy = rowDist * 2 * planeY / W;
    const rf = y * W, rc = (H - 1 - y) * W;
    for (let x = 0; x < W; x++) {
      const ti = ((((fy * 64) | 0) & 63) << 6) | (((fx * 64) | 0) & 63);
      const li = light[clamp((fy * LSUB) | 0, 0, LH - 1) * LW + clamp((fx * LSUB) | 0, 0, LW - 1)] * fog;
      luma[rf + x] = fl[ti] * li;
      if (ce) luma[rc + x] = ce[ti] * li * 0.75;
      fx += sx; fy += sy;
    }
  }
  // The horizon rows: nothing else writes them, so set them every frame
  if (ce) for (let x = 0; x < W; x++) { luma[HALF * W + x] = 0; luma[(HALF - 1) * W + x] = 0; }
  else for (let x = 0; x < W; x++) luma[HALF * W + x] = luma[(HALF - 1) * W + x];
  // A door or sliding wall can share your own square, which the grid walk below never tests
  const here = map[py | 0][px | 0], hereBox = here === "D" || here === "~" ? partialBox(px | 0, py | 0) : null;

  // Walls: step each ray through the grid until it hits one (DDA)
  for (let x = 0; x < W; x++) {
    const camX = 2 * x / W - 1, rdx = dirX + planeX * camX, rdy = dirY + planeY * camX;
    let mx = px | 0, my = py | 0;
    const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
    let stepX, stepY, sdx, sdy, side = 0;
    if (rdx < 0) { stepX = -1; sdx = (px - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - px) * ddx; }
    if (rdy < 0) { stepY = -1; sdy = (py - my) * ddy; } else { stepY = 1; sdy = (my + 1 - py) * ddy; }
    let c = ".", part = null;
    const own = hereBox && rayBox(px, py, rdx, rdy, hereBox);
    if (own) part = { box: hereBox, t: own.t, side: own.side };
    for (let n = 0; n < 64 && !part; n++) {
      if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
      c = (mx < 0 || my < 0 || mx >= MW || my >= MH) ? "#" : map[my][mx];
      if (c === ".") continue;
      // Doors and moving secret walls fill only part of their square
      if (c === "D" || c === "~") {
        const box = partialBox(mx, my), hit = box && rayBox(px, py, rdx, rdy, box);
        if (!hit) continue;
        part = { box, t: hit.t, side: hit.side };
      }
      break;
    }
    let perp, wallX, tex;
    if (part) {
      perp = part.t; side = part.side;
      const hx = px + rdx * perp, hy = py + rdy * perp, b = part.box;
      if (b.door) {
        // Measured from the door's edge, so the wood slides along as it opens
        const across = b.door.axis === "x" ? side === 1 : side === 0;
        wallX = across ? (b.door.axis === "x" ? hx - b.x0 : hy - b.y0) : 0.02;
        tex = DOOR_TEX;
      } else {
        wallX = side === 0 ? hy - b.y0 : hx - b.x0;
        tex = WALL_TEXTURES[b.mover.tex];
      }
    } else {
      perp = side === 0 ? sdx - ddx : sdy - ddy;
      wallX = side === 0 ? py + perp * rdy : px + perp * rdx;
      wallX -= Math.floor(wallX);
      tex = c === "!" ? SECRET_TEXTURES[secretTex(mx, my)] : c === "E" ? exitTex : WALL_TEXTURES[c] || TEX.brick;
      if (SMASHED_TEXTURES[c] && game.smashed.has(my * MW + mx)) tex = SMASHED_TEXTURES[c];
      if (c === "Q" && game.fenceShut > 0) tex = FENCE_SHUT;   // the fence has pulled his shutter down   // shot-out bottles or shop window
    }
    perp = Math.max(0.01, perp);
    zbuf[x] = perp;
    // Walls stand on the floor and rise wallH units (two stories outdoors)
    const lineH = K / perp, y0 = HALF + lineH / 2 - lineH * wallH;
    let tx = clamp((wallX * 64) | 0, 0, 63);
    // Mirror where needed so textures (and the lettering on signs) read left to right
    if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) tx = 63 - tx;
    const lit = lightAt(px + rdx * (perp - 0.06), py + rdy * (perp - 0.06)) * Math.exp(-perp * FOG) * (side ? 0.8 : 1);
    colTex[x] = tex; colTx[x] = tx; colLit[x] = lit;
    const ys = Math.max(0, y0 | 0), ye = Math.min(H, Math.ceil(HALF + lineH / 2));
    // 64-high textures repeat once per story; taller ones (facades) stretch over the whole wall
    const texH = tex.h, L = tex.L, step = (texH === 64 ? 64 * wallH : texH) / (lineH * wallH);
    let ty = (ys - y0) * step;
    for (let y = ys; y < ye; y++) {
      const v = L[(((ty | 0) % texH) << 6) | tx];
      luma[y * W + x] = v > GLOW ? v : v * lit; // lit windows and signs shine on their own
      ty += step;
    }
  }

  const wet = !!lvl.rain;
  if (wet) wetStreet(t, wallH);

  // Sprites, far to near
  const list = [];
  for (const o of game.objs) list.push({ x: o.x, y: o.y, art: o.frames ? o.frames[((t * 14) | 0) % o.frames.length] : o.art, scale: o.scale, hang: o.hang, glow: o.glow, bob: o.bob ? Math.sin(t * 3) * 0.03 : 0 });
  for (const e of game.enemies) {
    const A = PEOPLE[e.type.art + (e.hatless ? "Bare" : "")];
    if (e.state === "dead" && e.over) continue;   // he went over the parapet
    let art = e.moving ? A.walk[Math.sin(e.step * 9) > 0 ? 0 : 1] : A.idle;
    if (e.state === "idle" && !e.alert) {
      // He hasn't noticed you: if he's looking the other way, you see his back
      const off = Math.atan2(py - e.y, px - e.x) - e.face;
      if (Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) > 1.7) art = A.back;
    }
    if (e.state === "stagger") art = Math.sin(e.step * 11) > 0 ? A.hurt : A.idle;
    if (e.state === "aim") art = A.aim; else if (e.state === "fire") art = e.t > 0.07 ? A.fire : A.aim;
    else if (e.state === "hurt") art = e.spin ? A.spin[Math.min(3, ((1 - e.t / ENEMY_AI.spinTime) * 4) | 0)] : A.hurt; else if (e.state === "dying") art = e.t > 0.25 ? A.hurt : A.fall;
    else if (e.state === "dead") art = A.dead;
    // Gangsters stay readable in the dark: they're never lit below a floor brightness
    const up = !e.type.up || e.state === "dead" ? 0 : e.state === "dying" ? e.type.up * Math.min(1, e.t / 0.5) : e.type.up;
    list.push({ x: e.x, y: e.y, up, art, scale: e.type.scale, bob: e.moving ? Math.abs(Math.sin(e.step * 9)) * 0.02 : 0, muzzle: e.state === "fire" && e.t > 0.07, minLit: e.hp > 0 ? 0.6 : 0 });
  }
  // Bystanders: standing about, running, crouched with their heads down, or hit
  for (const f of game.folk) {
    if (f.state === "gone") continue;
    const A = PEOPLE[f.kind];
    const art = f.state === "down" ? A.dead : f.state === "cower" ? A.cower : f.state === "flee" && f.t <= 0 ? A.walk[Math.sin(f.step * 11) > 0 ? 0 : 1]
      : f.kind === "pianist" ? (Math.sin(f.step * 9) > 0 ? A.aim : A.idle) : A.idle;   // the pianist's hands go up and down
    list.push({ x: f.x, y: f.y, art, scale: f.kind === "lady" ? 0.88 : 0.93, bob: f.state === "flee" ? Math.abs(Math.sin(f.step * 11)) * 0.02 : 0, minLit: f.state === "down" ? 0 : 0.55 });
  }
  for (const b of game.bullets) list.push({ x: b.x, y: b.y, bullet: b });
  for (const s of list) s.d = (s.x - px) ** 2 + (s.y - py) ** 2;
  list.sort((a, b) => b.d - a.d);
  for (const s of list) s.bullet ? drawBullet(s.bullet) : drawSprite(s, wet);

  drawGun(t);
}

// Rain-slick pavement mirrors the buildings: each floor pixel adds a little of the
// wall its reflected ray would reach, so lit windows and signs smear down the street.
// The mirror is strongest at a glancing angle (far away) and wobbles with the rain.
function wetStreet(t, wallH) {
  for (let y = HALF + 2; y < H; y++) {
    const r = (0.5 * K) / (y - HALF);                      // how far away this row of pavement is
    const strength = 0.55 * (0.25 + 0.75 * Math.min(1, r / 5));
    const wobble = Math.round(Math.sin(y * 0.8 + t * 5) * 1.5);
    const row = y * W;
    for (let x = 0; x < W; x++) {
      const xs = clamp(x + wobble, 0, W - 1), perp = zbuf[xs];
      if (r >= perp) continue;
      const h = 0.5 * (perp - r) / r;                      // the height on the wall the reflection shows
      if (h >= wallH) continue;
      const tex = colTex[xs], texH = tex.h;
      const ty = ((wallH - h) * (texH === 64 ? 64 : texH / wallH)) | 0;
      const v = tex.L[((ty % texH) << 6) | colTx[xs]];
      luma[row + x] += (v > GLOW ? v : v * colLit[xs]) * strength;
    }
  }
}

// Where a ray first enters an axis-aligned box, and which kind of face it hit
// (side 0 = a face running north-south, 1 = east-west). Null if it misses.
function rayBox(px, py, rdx, rdy, b) {
  const ix = 1 / (rdx || 1e-9), iy = 1 / (rdy || 1e-9);
  const tx1 = (b.x0 - px) * ix, tx2 = (b.x1 - px) * ix, ty1 = (b.y0 - py) * iy, ty2 = (b.y1 - py) * iy;
  const txn = Math.min(tx1, tx2), tyn = Math.min(ty1, ty2);
  const tn = Math.max(txn, tyn), tf = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2));
  if (tf < tn || tn <= 0.01) return null;
  return { t: tn, side: txn > tyn ? 0 : 1 };
}

function drawSprite(s, wet) {
  const [, tY, sx] = project(s.x, s.y);
  if (tY < 0.12) return;
  const bm = s.art, size = (K / tY) * s.scale;
  const floorY = HALF + (K * 0.5) / tY;
  const top = (s.hang ? HALF - (K * 0.5) / tY : floorY - size) - ((s.bob || 0) + (s.up || 0)) * (K / tY);
  const wpx = size * bm.w / bm.h, left = sx - wpx / 2;
  const x0 = Math.max(0, left | 0), x1 = Math.min(W, (left + wpx) | 0);
  let lit = lightAt(s.x, s.y) * Math.exp(-tY * FOG);
  if (s.glow) lit = Math.max(lit, 1.05);
  if (s.minLit) lit = Math.max(lit, s.minLit);
  if (s.muzzle) lit = Math.max(lit, 0.9);
  const y0 = Math.max(0, top | 0), y1 = Math.min(H, (top + size) | 0), stepY = bm.h / size;
  for (let x = x0; x < x1; x++) {
    if (tY >= zbuf[x]) continue;
    const tx = ((x - left) / wpx * bm.w) | 0;
    let ty = (y0 - top) * stepY;
    for (let y = y0; y < y1; y++) {
      const i = (ty | 0) * bm.w + tx;
      if (bm.A[i] > 110) luma[y * W + x] = bm.L[i] * (bm.L[i] > 245 ? 1.1 : lit);
      ty += stepY;
    }
    // On wet pavement, a dim upside-down copy under the feet
    if (wet && !s.hang && !s.up) {
      const r1 = Math.min(H, (floorY + size * 0.9) | 0);
      for (let y = Math.max(0, Math.ceil(floorY)); y < r1; y++) {
        const i = (((floorY - y + size) * stepY) | 0) * bm.w + tx;
        if (i >= 0 && bm.A[i] > 110) { const v = bm.L[i] * (bm.L[i] > 245 ? 1.1 : lit); luma[y * W + x] = luma[y * W + x] * 0.72 + v * 0.28; }
      }
    }
  }
}

// A bullet in flight: a bright streak at chest height, a hot round head with a
// fading tail, so you can see where it's going and get out of its way
function drawBullet(b) {
  const N = 9, LEN = 0.9;
  for (let n = 0; n < N; n++) {
    const f = n / (N - 1), back = LEN * (1 - f);
    const [, tY, sx] = project(b.x - b.dx * back, b.y - b.dy * back);
    if (tY < 0.1) continue;
    const r = clamp((K * 0.04) / tY, 2.2, 14) * (0.35 + 0.65 * f), v = 120 + 150 * f;
    const up = b.drop ? b.drop.h * Math.max(0, 1 - (b.flown - back) / b.drop.over) : 0;   // still coming down from the window
    const cy = HALF + (K * (0.1 - up)) / tY;
    const x0 = Math.max(0, Math.floor(sx - r)), x1 = Math.min(W - 1, Math.ceil(sx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
    for (let x = x0; x <= x1; x++) {
      if (tY >= zbuf[x]) continue;
      for (let y = y0; y <= y1; y++) {
        if ((x - sx) ** 2 + (y - cy) ** 2 > r * r) continue;
        if (luma[y * W + x] < v) luma[y * W + x] = v;
      }
    }
  }
}

function drawGun(t) {
  const p = game.player, set = GUN_ART[p.weapon];
  const reloading = p.reload > 0 ? Math.sin(Math.min(1, p.reload / WEAPONS[p.weapon].reload) * Math.PI) : 0;
  // Pick the pose: mid-reload, mid-shot with the flash, or somewhere along the recoil
  const art = reloading > 0.25 ? set.reload[reloading > 0.6 ? 1 : 0]
    : p.flash > 0 ? set.flash
    : set.kick[Math.min(set.kick.length - 1, Math.round(p.recoil * (set.kick.length - 1)))];
  const bobX = p.moving ? Math.cos(p.bob) * 5 : 0, bobY = p.moving ? Math.abs(Math.sin(p.bob)) * 5 : Math.sin(t * 1.5) * 1.5;
  const ox = Math.round(set.x + bobX + (p.lean || 0) / PLAYER.leanReach * 16), oy = Math.round(set.y + bobY + reloading * 26);
  const lit = clamp(lightAt(p.x, p.y) * 0.9 + 0.12, 0.36, 1.05);   // the gun takes the light of where you stand
  // The flash adds a fixed amount of light, so dark steel catches it and skin doesn't burn out
  const flashAdd = p.flash > 0 ? 20 : 0;
  for (let y = Math.max(0, -oy); y < art.h; y++) {
    const sy = oy + y; if (sy >= H) break;
    for (let x = Math.max(0, -ox); x < art.w; x++) {
      const sx = ox + x; if (sx >= W) break;
      const i = y * art.w + x;
      if (art.A[i] > 110) luma[sy * W + sx] = flashAdd && art.L[i] > 245 ? art.L[i] * 1.1 : Math.min(225, art.L[i] * lit + flashAdd);   // only the flash itself glows
    }
  }
}
