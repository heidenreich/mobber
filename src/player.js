// You: moving, shooting, reloading, picking things up and leaving through the exit.
import { W, K, isTouch, PLAYER, TOUCH, AIM_ASSIST, WEAPONS, ENEMY_AI } from "./config.js";
import { rand, clamp } from "./util.js";
import { game, stats, input, say } from "./state.js";
import { LEVELS } from "./levels.js";
import { OBJ } from "./art/sprites.js";
import { SND } from "./audio.js";
import { los, moveBy, objectiveDone } from "./world.js";
import { cam, camera, project, zbuf } from "./render/camera.js";
import { fadeOut, showCard } from "./flow.js";

export function switchWeapon(i) {
  const p = game.player;
  if (!p.has[i] || p.weapon === i) return;
  p.weapon = i; p.reload = 0; p.fireCd = 0.25; SND.click();
}

export function startReload() {
  const p = game.player, w = WEAPONS[p.weapon];
  if (p.reload > 0 || p.mag[p.weapon] >= w.mag) return;
  if (p.weapon === 1 && p.reserve <= 0) { say("Out of drums."); return; }
  p.reload = w.reload; SND.reload();
}

function finishReload() {
  const p = game.player, w = WEAPONS[p.weapon];
  if (p.weapon === 0) p.mag[0] = 6;
  else { const n = Math.min(w.mag - p.mag[1], p.reserve); p.mag[1] += n; p.reserve -= n; }
}

// The nearest living enemy under a screen column, in front of any wall
function hitscan(col) {
  camera();
  let best = null, bestD = Infinity;
  for (const e of game.enemies) {
    if (e.hp <= 0) continue;
    const [, tY, sx] = project(e.x, e.y);
    if (tY < 0.15 || tY > zbuf[col]) continue;
    const half = (K / tY) * (isTouch ? TOUCH.hitWidth : PLAYER.hitWidth);
    if (Math.abs(sx - col) < half && tY < bestD) { bestD = tY; best = e; }
  }
  return best;
}

function fire() {
  const p = game.player, w = WEAPONS[p.weapon];
  if (p.reload > 0 || p.fireCd > 0) return;
  if (p.mag[p.weapon] <= 0) { SND.click(); p.fireCd = 0.25; startReload(); return; }
  p.mag[p.weapon]--; p.fireCd = w.rate; p.recoil = 1; p.flash = 0.06; stats.shots++;
  p.weapon === 0 ? SND.rev() : SND.tommy();
  for (const e of game.enemies) if (e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < ENEMY_AI.hearingRange) e.alert = true;
  const spread = w.spread * (p.moving ? 1.6 : 1);
  const col = clamp((W / 2 + rand(-spread, spread)) | 0, 0, W - 1);
  const t = hitscan(col);
  if (t) {
    stats.hits++;
    t.hp -= w.dmg * rand(0.85, 1.15);
    t.alert = true; t.lx = p.x; t.ly = p.y;
    if (t.hp <= 0) {
      t.state = "dying"; t.t = 0.5; stats.kills++; SND.down();
      if (Math.random() < ENEMY_AI.dropChance) {
        const ammo = p.has[1];
        game.objs.push({ x: t.x, y: t.y, art: ammo ? OBJ.ammo : OBJ.cash, scale: 0.6, pick: ammo ? "ammo" : "cash" });
      }
      if (t.type.name === "boss") say("Don Vitale is finished. Get to the exit.", 4);
    } else if (t.state !== "aim" || Math.random() < 0.4) { t.state = "hurt"; t.t = 0.18; }
  }
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
  if (!isTouch || game.player.reload > 0) return false;
  const e = hitscan(W / 2);
  return !!e && e.state !== "dying" && Math.hypot(e.x - game.player.x, e.y - game.player.y) < AIM_ASSIST.autoFireRange;
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

// Movement, timers and shooting for one frame
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
    moveBy(p, (cam.dirX * fw - cam.dirY * st) * k, (cam.dirY * fw + cam.dirX * st) * k, PLAYER.radius);
    p.bob += dt * 9; p.moving = true;
    checkExit();
  } else p.moving = false;
  p.fireCd = Math.max(0, p.fireCd - dt);
  p.flash = Math.max(0, p.flash - dt);
  p.recoil = Math.max(0, p.recoil - dt * 7);
  p.hurt = Math.max(0, p.hurt - dt);
  if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) { p.reload = 0; finishReload(); } }
  if ((input.firing || autoFire()) && game.state === "play") fire();
}

export function collectPickups() {
  const p = game.player, objs = game.objs;
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i];
    if (!o.pick || Math.hypot(o.x - p.x, o.y - p.y) > PLAYER.pickupRange) continue;
    if (o.pick === "med") { if (p.hp >= PLAYER.maxHp) continue; p.hp = Math.min(PLAYER.maxHp, p.hp + PLAYER.medkitHeal); say("Patched up."); }
    else if (o.pick === "cash") { const v = Math.round(rand(1, 5)) * 100; stats.cash += v; say(`+$${v}`); }
    else if (o.pick === "ammo") {
      if (!p.has[1]) { p.has[1] = true; p.weapon = 1; p.mag[1] = 50; say("A Tommy gun. Now we're talking.  [1/2 or Q to swap]", 3.5); }
      else { p.reserve += 50; say("+50 rounds"); }
    }
    else if (o.pick === "ledger") {
      p.ledger = true; say("Got the ledger. Now find the EXIT.", 3.5);
      for (const e of game.enemies) e.alert = true;
    }
    objs.splice(i, 1); SND.pickup();
  }
}
