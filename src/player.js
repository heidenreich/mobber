// You: moving, shooting, reloading, looting and leaving through the exit.
import { W, K, isTouch, FOLK, PLAYER, TOUCH, AIM_ASSIST, WEAPONS, ROUND_NAMES, ENEMY_AI, AMMO, MELEE } from "./config.js";
import { rand, clamp } from "./util.js";
import { game, stats, input, say, intertitle, eye } from "./state.js";
import { LEVELS } from "./levels.js";
import { OBJ, dimmed } from "./art/sprites.js";
import { SND } from "./audio.js";
import { los, moveBy, objectiveDone, wallAt, buildLight } from "./world.js";
import { tryPush } from "./doors.js";
import { cam, camera, project, zbuf } from "./render/camera.js";
import { fadeOut, showCard } from "./flow.js";
import { knock } from "./fence.js";
import { offerChoice } from "./render/choice.js";
import { scare, shootFolk, standing } from "./folk.js";

const ammoLeft = (p, i) => (p.mag[i] || 0) + (p.reserve[i] || 0);

export function switchWeapon(i) {
  const p = game.player;
  if (!p.has[i] || p.weapon === i) return;
  p.weapon = i; p.reload = 0; p.fireCd = 0.25; SND.click();
}

// Q, the mouse wheel and SWAP: on to the next gun you're carrying
export function nextWeapon() {
  const p = game.player;
  for (let k = 1; k < WEAPONS.length; k++) { const i = (p.weapon + k) % WEAPONS.length; if (p.has[i]) return switchWeapon(i); }
}

export function startReload() {
  const p = game.player, w = WEAPONS[p.weapon];
  if (p.reload > 0 || p.mag[p.weapon] >= w.mag) return;
  if (p.reserve[p.weapon] <= 0) return;
  p.reload = w.reload; p.reloadW = p.weapon; SND.reload(p.weapon, w.reload);
}

function finishReload() {
  const p = game.player, i = p.reloadW ?? p.weapon; // the gun that was being reloaded, even if you've picked up another
  const n = Math.min(WEAPONS[i].mag - p.mag[i], p.reserve[i]);
  p.mag[i] += n; p.reserve[i] -= n;
}

// The nearest living enemy under a screen column, in front of any wall or closed door
function hitscan(col, maxDist = Infinity) {
  camera();
  const p = game.player;
  let best = null, bestD = Infinity;
  for (const e of game.enemies) {
    if (e.hp <= 0) continue;
    const [, tY, sx] = project(e.x, e.y);
    if (tY < 0.15 || tY > zbuf[col] || tY > maxDist) continue;
    const half = (K / tY) * (isTouch ? TOUCH.hitWidth : PLAYER.hitWidth);
    // Same line-of-sight rule enemies use, so a half-open door hides you both equally
    if (Math.abs(sx - col) < half && tY < bestD && los(cam.x, cam.y, e.x, e.y)) { bestD = tY; best = e; }
  }
  return best;
}

// The nearest bystander under a screen column, in front of any wall
function bystander(col) {
  let best = null, bestD = Infinity;
  for (const f of standing()) {
    const [, tY, sx] = project(f.x, f.y);
    if (tY < 0.15 || tY > zbuf[col]) continue;
    if (Math.abs(sx - col) < (K / tY) * FOLK.hitWidth && tY < bestD && los(cam.x, cam.y, f.x, f.y)) { bestD = tY; best = f; }
  }
  return best;
}

// What a downed gangster leaves on the floor
function dropLoot(e) {
  const at = (pick, art, extra) => game.objs.push({ x: e.x, y: e.y, art: OBJ[art], scale: 0.6, pick, ...extra });
  if (e.type.name === "boss") return at("cash", "cash", { amount: AMMO.bossCash });
  if (e.type.name === "bagman") return at("cash", "cash", { amount: AMMO.bagCash });
  if (e.type.lieutenant) { at("cash", "cash", { amount: AMMO.lieutenantCash }); return at("loot", "valuable", { item: e.type.prize }); }
  if (e.type.name === "knife") return at("cash", "cash");
  if (e.type.name === "double") return at("loot", "valuable", { item: AMMO.donsWatch });
  if (e.type.name === "rifleman") return at("rounds", "rounds", { weapon: 0, amount: AMMO.rifleRounds });
  if (e.type.name === "heavy") {
    // The first heavy you put down gives up his sawn-off; after that, shells or revolver rounds
    if (!game.player.has[2] || Math.random() < 0.5) return at("rounds", game.player.has[2] ? "shells" : "sawnoff", { weapon: 2, amount: AMMO.heavyShells });
    return at("rounds", "rounds", { weapon: 0, amount: AMMO.heavyRounds });
  }
  const r = Math.random();
  if (r < AMMO.goonTommyChance) at("rounds", "tommy", { weapon: 1, amount: AMMO.goonTommyRounds });
  else if (r < AMMO.goonTommyChance + AMMO.goonRoundsChance) at("rounds", "rounds", { weapon: 0, amount: AMMO.goonRounds });
  else if (Math.random() < AMMO.valuableChance) at("loot", "valuable", { item: AMMO.valuables[(Math.random() * AMMO.valuables.length) | 0] });
  else at("cash", "cash");
}

function damage(t, dmg) {
  const p = game.player;
  stats.hits++;
  t.hp -= dmg;
  t.alert = true; t.lx = p.x; t.ly = p.y;
  if (t.hp <= 0) {
    t.state = "dying"; t.t = 0.5; stats.kills++; SND.down();
    if (t.type.lieutenant) { stats.lieutenants = (stats.lieutenants || 0) + 1; say(`${t.type.title[0]}${t.type.title.slice(1).toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase())} is finished.`, 3.5); }
    dropLoot(t);
    // The last man standing, if he's only a hired gun, loses his nerve
    const alive = game.enemies.filter(e => e.hp > 0);
    if (alive.length === 1 && game.enemies.length >= 3 && alive[0].type.name === "goon" && !alive[0].cornered) {
      alive[0].panic = true; say("The last of them is running for it.", 3);
    }
    if (t.type.name === "double") {
      const left = game.enemies.filter(e => e.type.name === "double" && e.hp > 0).length;
      if (left) intertitle("double", null, ["“That's not the Don.", "It's a double!”"]) || say("That's not the Don. It's a double!", 4);
      else intertitle("lastDouble", null, ["“Another double!", "The real Don is making for the roof.”"]) || say("Another double! The real Don is making for the roof.", 4);
    }
    if (t.type.name === "boss") {
      if (game.level.endOnBoss) {
        // The Don goes down and the picture ends: no exit to find
        game.state = "won";
        // The stretch of parapet nearest him, in case he ends up going over it
        let goal = { x: t.x, y: t.y }, best = Infinity;
        game.map.forEach((row, y) => row.forEach((c, x) => { const d = Math.hypot(x + 0.5 - t.x, y + 0.5 - t.y); if (c === "R" && d < best) { best = d; goal = { x: x + 0.5, y: y + 0.5 }; } }));
        // He isn't finished yet: he's on his knees, and what happens next is your choice (render/choice.js)
        offerChoice(t, goal);
      } else say("Don Vitale is finished. Get to the exit.", 4);
    }
  } else if (!t.type.noStagger && t.staggerCd <= 0 && (t.state !== "aim" || Math.random() < 0.4)) {
    // Flinch, but not again straight away: a fast gun can't keep someone pinned
    // Now and then the hit turns him right round before he recovers
    t.spin = Math.random() < ENEMY_AI.spinChance;
    t.state = "hurt"; t.t = t.spin ? ENEMY_AI.spinTime : 0.18; t.staggerCd = ENEMY_AI.staggerCooldown;
  }
  // Sometimes a hit takes his hat off
  if (t.hp > 0 && !t.hatless && !t.type.noHat && Math.random() < ENEMY_AI.hatChance) {
    t.hatless = true;
    game.objs.push({ x: t.x + rand(-0.35, 0.35), y: t.y + rand(-0.35, 0.35), art: OBJ.hats[t.type.art], scale: 0.6 });
  }
}

// Out of bullets: crack whoever's in arm's reach with the butt of the gun
function pistolWhip() {
  const p = game.player;
  p.fireCd = MELEE.rate; p.recoil = 1.6; stats.shots++;
  let t = hitscan(W / 2, MELEE.range);
  if (t && t.type.up) t = null;   // out of reach at his window
  SND.whip(!!t);
  if (t) damage(t, MELEE.dmg * rand(0.85, 1.15) * (t.alert ? 1 : ENEMY_AI.ambush));   // a man who never saw it coming goes down hard
  else if (game.msg.t <= 0) say("Out of ammo. Search the bodies.");
}

function fire() {
  const p = game.player, w = WEAPONS[p.weapon];
  if (p.reload > 0 || p.fireCd > 0) return;
  if (p.mag[p.weapon] <= 0) {
    if (p.reserve[p.weapon] > 0) { startReload(); return; }
    // This gun is dry: swap to the other one if it has rounds, otherwise go hand to hand
    const other = WEAPONS.findIndex((_, i) => i !== p.weapon && p.has[i] && ammoLeft(p, i) > 0);
    if (other >= 0) { const was = WEAPONS[p.weapon].name; switchWeapon(other); say(`${was} is empty.`); return; }
    pistolWhip(); return;
  }
  p.mag[p.weapon]--; p.fireCd = w.rate; p.recoil = w.pellets ? 1.5 : 1; p.flash = 0.06; stats.shots++;
  [SND.rev, SND.tommy, SND.sawn][p.weapon]();
  // Gunfire carries: anyone in earshot now knows where you are, and comes looking
  scare(p.x, p.y);
  const unaware = new Set(game.enemies.filter(e => e.hp > 0 && !e.alert));
  for (const e of game.enemies) if (e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < ENEMY_AI.hearingRange) { e.alert = true; e.lx = p.x; e.ly = p.y; }
  const spread = w.spread * (p.moving ? 1.6 : 1);
  let hitAnyone = false;
  for (let n = 0; n < (w.pellets || 1); n++) {
    const col = clamp((W / 2 + rand(-spread, spread)) | 0, 0, W - 1);
    const t = hitscan(col), f = bystander(col);
    // Someone who isn't a gangster is nearer along that line: the bullet finds them instead
    if (f && (!t || Math.hypot(f.x - p.x, f.y - p.y) < Math.hypot(t.x - p.x, t.y - p.y))) { shootFolk(f); hitAnyone = true; continue; }
    if (!t || t.hp <= 0) continue;
    hitAnyone = true;
    // Buckshot loses its punch with distance; the Don's vest shrugs off some of a tommy gun
    const reach = w.pellets ? clamp(1.25 - Math.hypot(t.x - p.x, t.y - p.y) * 0.12, 0.2, 1) : 1;
    damage(t, w.dmg * rand(0.85, 1.15) * reach * (p.weapon === 1 ? t.type.tommyResist ?? 1 : 1) * (unaware.delete(t) ? ENEMY_AI.ambush : 1));
    if (n > 0) stats.hits--;   // a blast counts as one shot on target, however many pellets land
  }
  if (!hitAnyone) smash();
  if (p.mag[p.weapon] === 0) startReload();
}

// A shot that hits nobody may still hit something: a lamp, the bottles behind the
// bar, a shop window. Lamps go dark (and so does the room around them).
function smash() {
  const p = game.player;
  camera();
  // How far the shot flies before a wall stops it
  let far = 0, tile = null;
  for (; far < 30; far += 0.05) {
    const x = cam.x + cam.dirX * far, y = cam.y + cam.dirY * far;
    if (wallAt(x, y)) { tile = { x: x | 0, y: y | 0 }; break; }
  }
  // A lit lamp in the line of fire, nearer than the wall
  let lamp = null, lampD = far;
  for (const o of game.objs) {
    if (!o.light || !o.lampWidth) continue;
    const [, tY, sx] = project(o.x, o.y);
    if (tY > 0.2 && tY < lampD && Math.abs(sx - W / 2) < (K / tY) * o.lampWidth && los(cam.x, cam.y, o.x, o.y)) { lamp = o; lampD = tY; }
  }
  if (lamp) {
    lamp.light = null; lamp.glow = false; lamp.art = dimmed(lamp.art);
    buildLight(); SND.glass();
    return;
  }
  if (!tile) return;
  const c = (game.map[tile.y] || [])[tile.x], key = tile.y * game.width + tile.x;
  if ((c === "B" || c === "F") && !game.smashed.has(key)) { game.smashed.add(key); SND.glass(); }
}

// On touch screens the view drifts onto a gangster near the crosshair, and fires when one is under it.
function aimAssist(dt) {
  const p = game.player;
  let best = null, bestDa = AIM_ASSIST.cone;
  for (const e of game.enemies) {
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d > AIM_ASSIST.range) continue;
    let da = Math.atan2(e.y - p.y, e.x - p.x) - p.a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) < bestDa && los(p.x, p.y, e.x, e.y)) { bestDa = Math.abs(da); best = da; }
  }
  if (best !== null) p.a += Math.sign(best) * Math.min(Math.abs(best), AIM_ASSIST.turnRate * dt);
}
function autoFire() {
  const p = game.player;
  if (!isTouch || p.reload > 0 || !input.touched) return false; // not before you've laid a finger on the screen
  const dry = !p.has.some((h, i) => h && ammoLeft(p, i) > 0);
  const e = hitscan(W / 2, dry ? MELEE.range : AIM_ASSIST.autoFireRange); // with no ammo, only swing at someone close
  return !!e && e.state !== "dying";
}

function checkExit() {
  const p = game.player, lvl = game.level;
  for (const [dx, dy] of [[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]]) {
    const x = (p.x + dx) | 0, y = (p.y + dy) | 0;
    if (lvl.map[y] && lvl.map[y][x] === "E") {
      if (objectiveDone()) {
        game.state = "leaving"; // you made it: no more hits, pickups or deaths during the fade
        fadeOut(() => game.levelIdx + 1 < LEVELS.length ? showCard("chapter", game.levelIdx + 1) : showCard("end"));
        return;
      }
      if (game.msg.t <= 0) say(lvl.objective === "ledger" ? "Not without the ledger." : lvl.objective === "lift" ? "Not this floor." : "Not while Don Vitale still breathes.");
    }
  }
}

// Movement, timers and shooting for one frame. Only called while playing, never while dying.
export function updatePlayer(dt) {
  const p = game.player, keys = input.keys, touch = input.touch;
  game.timer += dt; stats.time += dt;
  camera();
  let fw = 0, st = 0, turn = 0;
  if (keys.has("w") || keys.has("arrowup")) fw += 1;
  if (keys.has("s") || keys.has("arrowdown")) fw -= 1;
  if (keys.has("a")) st -= 1;
  if (keys.has("d")) st += 1;
  if (keys.has("arrowleft")) turn -= 1;
  if (keys.has("arrowright")) turn += 1;
  if (touch.move) { fw -= touch.move.dy; turn += touch.move.dx * TOUCH.stickTurn; st += touch.move.dx * TOUCH.stickStrafe; }
  if (isTouch) aimAssist(dt);
  p.a += turn * PLAYER.turnSpeed * dt;
  const leanTo = (keys.has("c") ? 1 : 0) - (keys.has("z") ? 1 : 0);
  const m = Math.hypot(fw, st), speed = keys.has("shift") && !leanTo ? PLAYER.runSpeed : PLAYER.walkSpeed;   // no running bent sideways
  const ox = p.x, oy = p.y;
  if (m > 0.05) {
    const k = Math.min(1, m) / m * speed * dt;
    const bumped = moveBy(p, (cam.dirX * fw - cam.dirY * st) * k, (cam.dirY * fw + cam.dirX * st) * k, PLAYER.radius);
    // Walking straight into a secret wall pushes it
    if (bumped && fw > 0.3) tryPush(p.x, p.y, cam.dirX, cam.dirY);
    p.bob += dt * 9; p.moving = true;
    // A footfall each time the walk cycle comes down
    const beat = Math.floor(p.bob / Math.PI);
    if (beat !== p.beat) { p.beat = beat; SND.step(game.level.rain ? "wet" : game.level.floor === "carpet" ? "soft" : "hard"); }
    checkExit();
  } else p.moving = false;
  // How fast you're really going, for gangsters who aim ahead of a moving target
  const vx = dt > 0 ? (p.x - ox) / dt : 0, vy = dt > 0 ? (p.y - oy) / dt : 0, v = Math.hypot(vx, vy), cap = v > PLAYER.runSpeed ? PLAYER.runSpeed / v : 1;
  p.vx = vx * cap; p.vy = vy * cap;
  lean(leanTo, dt);
  crackSafe(dt);
  tickPlayerEffects(dt);
  if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) { p.reload = 0; finishReload(); } }
  if ((input.firing || autoFire()) && game.state === "play") fire();
}

// Z and C lean your head and gun out to one side while your feet stay put: enough
// to see and shoot round a corner, and to duck back before the answer arrives.
// A wall (or tall cover) on that side stops the lean.
function lean(to, dt) {
  const p = game.player, R = PLAYER.leanReach, max = (R / PLAYER.leanTime) * dt, want = to * R;
  let l = (p.lean || 0) + clamp(want - (p.lean || 0), -max, max);
  const sx = -Math.sin(p.a), sy = Math.cos(p.a), r = 0.1;
  const stuck = l => {
    const x = p.x + sx * l, y = p.y + sy * l;
    return wallAt(x - r, y - r) || wallAt(x + r, y - r) || wallAt(x - r, y + r) || wallAt(x + r, y + r)
      || game.objs.some(o => o.cover && Math.abs(o.x - x) < (o.size || 0.28) && Math.abs(o.y - y) < (o.size || 0.28));
  };
  while (Math.abs(l) > 0.01 && stuck(l)) l *= 0.8;
  p.lean = Math.abs(l) > 0.01 ? l : 0;
}

// Standing at the safe, working the dial (hold E; on a phone, just stand still).
// It takes a while, and partway through the whole club hears you at it.
function crackSafe(dt) {
  const p = game.player, s = game.objs.find(o => o.safe && !o.cracked);
  game.cracking = null;
  if (!s || Math.hypot(s.x - p.x, s.y - p.y) > PLAYER.safeReach) return;
  const working = isTouch ? !p.moving && !input.firing : input.keys.has("e");
  game.cracking = { progress: s.progress, working };
  if (!working) return;
  const before = s.progress, everyone = () => { for (const e of game.enemies) { e.alert = true; e.lx = p.x; e.ly = p.y; } };
  s.progress += dt / PLAYER.safeTime;
  if (Math.floor(s.progress * 14) !== Math.floor(before * 14)) SND.click();   // the tumblers
  if (before < 0.35 && s.progress >= 0.35 && game.enemies.some(e => e.hp > 0)) { everyone(); say("They've heard you at the safe!", 3); }
  if (s.progress >= 1) {
    s.cracked = true; s.art = OBJ.safeOpen; game.cracking = null;
    p.ledger = true; say("Got the ledger. Now find the EXIT.", 3.5); SND.pickup("ledger"); everyone();
  }
}

// Flashes, recoil and the hurt shake keep fading even while the player is dying
export function tickPlayerEffects(dt) {
  const p = game.player;
  p.fireCd = Math.max(0, p.fireCd - dt);
  p.flash = Math.max(0, p.flash - dt);
  p.recoil = Math.max(0, p.recoil - dt * 7);
  p.hurt = Math.max(0, p.hurt - dt);
}

// E on desktop: push a secret wall you're facing
export function use() {
  const p = game.player;
  if (!p || game.state !== "play") return;
  if (knock()) return;   // at the fence's window: see what he has
  camera();
  tryPush(p.x, p.y, cam.dirX, cam.dirY, 1.0);
}

export function collectPickups() {
  const p = game.player, objs = game.objs;
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i];
    if (!o.pick || Math.hypot(o.x - p.x, o.y - p.y) > PLAYER.pickupRange) continue;
    if (o.pick === "med") { if (p.hp >= PLAYER.maxHp) continue; p.hp = Math.min(PLAYER.maxHp, p.hp + PLAYER.medkitHeal); say("Patched up."); }
    else if (o.pick === "cash") { const v = o.amount || Math.round(rand(1, 5)) * 100; stats.cash += v; say(`+$${v.toLocaleString()}`); }
    else if (o.pick === "rounds") {
      const w = o.weapon;
      if (p.has[w] && p.reserve[w] >= AMMO.maxReserve[w]) continue; // pockets full: leave it for later
      if (w > 0 && !p.has[w]) {
        // A new gun: loaded with what it came with, the rest in your pocket
        p.has[w] = true; p.weapon = w; p.reload = 0; p.mag[w] = Math.min(WEAPONS[w].mag, o.amount); p.reserve[w] = Math.min(AMMO.maxReserve[w], (p.reserve[w] || 0) + Math.max(0, o.amount - WEAPONS[w].mag));
        const how = isTouch ? "Tap SWAP to change guns." : "[1, 2, 3 or Q to change guns]";
        say(`${w === 1 ? "A Tommy gun. Now we're talking." : "A sawn-off. For close work."}  ${how}`, 3.5);
      } else {
        p.reserve[w] = Math.min(AMMO.maxReserve[w], p.reserve[w] + o.amount);
        say(`+${o.amount} ${ROUND_NAMES[w]}`);
        if (p.mag[p.weapon] === 0 && p.weapon === w) startReload();
      }
    }
    else if (o.pick === "loot") { p.loot.push(o.item); say(`${o.item[0][0].toUpperCase()}${o.item[0].slice(1)}. The fence will give you something for it.`, 3); }
    else if (o.pick === "ledger") {
      p.ledger = true; say("Got the ledger. Now find the EXIT.", 3.5);
      for (const e of game.enemies) { e.alert = true; e.lx = p.x; e.ly = p.y; }
    }
    objs.splice(i, 1); SND.pickup(o.pick);
  }
}
