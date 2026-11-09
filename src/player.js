// You: moving, shooting, reloading, looting and leaving through the exit.
import { W, K, isTouch, PLAYER, TOUCH, AIM_ASSIST, WEAPONS, ENEMY_AI, AMMO, MELEE } from "./config.js";
import { rand, clamp } from "./util.js";
import { game, stats, input, say } from "./state.js";
import { LEVELS } from "./levels.js";
import { OBJ } from "./art/sprites.js";
import { SND } from "./audio.js";
import { los, moveBy, objectiveDone } from "./world.js";
import { tryPush } from "./doors.js";
import { cam, camera, project, zbuf } from "./render/camera.js";
import { fadeOut, showCard } from "./flow.js";

const ammoLeft = (p, i) => p.mag[i] + p.reserve[i];

export function switchWeapon(i) {
  const p = game.player;
  if (!p.has[i] || p.weapon === i) return;
  p.weapon = i; p.reload = 0; p.fireCd = 0.25; SND.click();
}

export function startReload() {
  const p = game.player, w = WEAPONS[p.weapon];
  if (p.reload > 0 || p.mag[p.weapon] >= w.mag) return;
  if (p.reserve[p.weapon] <= 0) return;
  p.reload = w.reload; SND.reload();
}

function finishReload() {
  const p = game.player, i = p.weapon;
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
    if (Math.abs(sx - col) < half && tY < bestD && los(p.x, p.y, e.x, e.y)) { bestD = tY; best = e; }
  }
  return best;
}

// What a downed gangster leaves on the floor
function dropLoot(e) {
  const at = (pick, art, extra) => game.objs.push({ x: e.x, y: e.y, art: OBJ[art], scale: 0.6, pick, ...extra });
  if (e.type.name === "boss") return at("cash", "cash", { amount: AMMO.bossCash });
  if (e.type.name === "heavy") return at("rounds", "rounds", { weapon: 0, amount: AMMO.heavyRounds });
  const r = Math.random();
  if (r < AMMO.goonTommyChance) at("rounds", "tommy", { weapon: 1, amount: AMMO.goonTommyRounds });
  else if (r < AMMO.goonTommyChance + AMMO.goonRoundsChance) at("rounds", "rounds", { weapon: 0, amount: AMMO.goonRounds });
  else at("cash", "cash");
}

function damage(t, dmg) {
  const p = game.player;
  stats.hits++;
  t.hp -= dmg;
  t.alert = true; t.lx = p.x; t.ly = p.y;
  if (t.hp <= 0) {
    t.state = "dying"; t.t = 0.5; stats.kills++; SND.down();
    dropLoot(t);
    if (t.type.name === "boss") say("Don Vitale is finished. Get to the exit.", 4);
  } else if (t.state !== "aim" || Math.random() < 0.4) { t.state = "hurt"; t.t = 0.18; }
}

// Out of bullets: crack whoever's in arm's reach with the butt of the gun
function pistolWhip() {
  const p = game.player;
  p.fireCd = MELEE.rate; p.recoil = 1.6;
  const t = hitscan(W / 2, MELEE.range);
  SND.whip(!!t);
  if (t) damage(t, MELEE.dmg * rand(0.85, 1.15));
  else if (game.msg.t <= 0) say("Out of ammo. Search the bodies.");
}

function fire() {
  const p = game.player, w = WEAPONS[p.weapon];
  if (p.reload > 0 || p.fireCd > 0) return;
  if (p.mag[p.weapon] <= 0) {
    if (p.reserve[p.weapon] > 0) { startReload(); return; }
    // This gun is dry: swap to the other one if it has rounds, otherwise go hand to hand
    const other = 1 - p.weapon;
    if (p.has[other] && ammoLeft(p, other) > 0) { switchWeapon(other); say(`${WEAPONS[p.weapon].name} is empty.`); return; }
    pistolWhip(); return;
  }
  p.mag[p.weapon]--; p.fireCd = w.rate; p.recoil = 1; p.flash = 0.06; stats.shots++;
  p.weapon === 0 ? SND.rev() : SND.tommy();
  for (const e of game.enemies) if (e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < ENEMY_AI.hearingRange) e.alert = true;
  const spread = w.spread * (p.moving ? 1.6 : 1);
  const col = clamp((W / 2 + rand(-spread, spread)) | 0, 0, W - 1);
  const t = hitscan(col);
  if (t) damage(t, w.dmg * rand(0.85, 1.15));
  if (p.mag[p.weapon] === 0) startReload();
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
  if (!isTouch || p.reload > 0) return false;
  const dry = !p.has.some((h, i) => h && ammoLeft(p, i) > 0);
  const e = hitscan(W / 2, dry ? MELEE.range : AIM_ASSIST.autoFireRange); // with no ammo, only swing at someone close
  return !!e && e.state !== "dying";
}

function checkExit() {
  const p = game.player, lvl = game.level;
  for (const [dx, dy] of [[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]]) {
    const x = (p.x + dx) | 0, y = (p.y + dy) | 0;
    if (lvl.map[y] && lvl.map[y][x] === "E") {
      if (objectiveDone()) { fadeOut(() => game.levelIdx + 1 < LEVELS.length ? showCard("chapter", game.levelIdx + 1) : showCard("end")); return; }
      if (game.msg.t <= 0) say(lvl.objective === "ledger" ? "Not without the ledger." : "Not while Don Vitale still breathes.");
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
  const m = Math.hypot(fw, st), speed = keys.has("shift") ? PLAYER.runSpeed : PLAYER.walkSpeed;
  if (m > 0.05) {
    const k = Math.min(1, m) / m * speed * dt;
    const bumped = moveBy(p, (cam.dirX * fw - cam.dirY * st) * k, (cam.dirY * fw + cam.dirX * st) * k, PLAYER.radius);
    // Walking straight into a secret wall pushes it
    if (bumped && fw > 0.3) tryPush(p.x, p.y, cam.dirX, cam.dirY);
    p.bob += dt * 9; p.moving = true;
    checkExit();
  } else p.moving = false;
  tickPlayerEffects(dt);
  if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) { p.reload = 0; finishReload(); } }
  if ((input.firing || autoFire()) && game.state === "play") fire();
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
      if (w === 1 && !p.has[1]) {
        p.has[1] = true; p.weapon = 1; p.mag[1] = Math.min(WEAPONS[1].mag, o.amount); p.reserve[1] += Math.max(0, o.amount - WEAPONS[1].mag);
        say("A Tommy gun. Now we're talking.  [1/2 or Q to swap]", 3.5);
      } else {
        p.reserve[w] += o.amount;
        say(`+${o.amount} ${w === 0 ? "revolver rounds" : "tommy gun rounds"}`);
        if (p.mag[p.weapon] === 0 && p.weapon === w) startReload();
      }
    }
    else if (o.pick === "ledger") {
      p.ledger = true; say("Got the ledger. Now find the EXIT.", 3.5);
      for (const e of game.enemies) e.alert = true;
    }
    objs.splice(i, 1); SND.pickup();
  }
}
