// The Vitale outfit. Each gangster runs a small state machine:
// idle -> chase -> aim -> fire -> chase ... with hurt/dying/dead on top.
// They raise their gun ("aim") before firing, which gives you a moment to react.
import { ENEMY_AI } from "./config.js";
import { rand, clamp } from "./util.js";
import { game, stats, say } from "./state.js";
import { SND } from "./audio.js";
import { los, moveBy, nextStep } from "./world.js";
import { fadeOut, showCard } from "./flow.js";

export function updateEnemy(e, dt) {
  const p = game.player, T = e.type;
  if (e.state === "dying") { e.t -= dt; if (e.t <= 0) e.state = "dead"; return; }
  if (e.state === "dead") return;
  e.cd -= dt; e.staggerCd = Math.max(0, (e.staggerCd || 0) - dt); e.repath = (e.repath || 0) - dt;
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
  const sees = d < ENEMY_AI.sightRange && los(e.x, e.y, p.x, p.y);
  if (sees) { e.alert = true; e.lx = p.x; e.ly = p.y; }
  e.moving = false;
  switch (e.state) {
    case "idle": if (e.alert) e.state = "chase"; break;
    case "hurt": e.t -= dt; if (e.t <= 0) e.state = "chase"; break;
    case "chase": {
      if (sees && d < T.range && e.cd <= 0) { e.state = "aim"; e.t = T.aim; e.burstLeft = T.burst; break; }
      if (T.flees && game.level.route) { flee(e, dt); break; }
      if (sees) {
        // In sight: close in, but not right up to you
        const gd = d;
        if (gd > ENEMY_AI.keepDistance) walk(e, p.x, p.y, gd, dt, true);
      } else if (Math.hypot(e.lx - e.x, e.ly - e.y) > 0.4) {
        // Out of sight: hunt, finding a way around walls and furniture to where you were last seen or heard
        if (e.repath <= 0 || !e.wp2) { e.wp2 = nextStep(e.x, e.y, e.lx, e.ly); e.repath = ENEMY_AI.repath; }
        if (e.wp2) {
          const gd = Math.hypot(e.wp2.x - e.x, e.wp2.y - e.y);
          if (gd < 0.1) e.repath = 0; else walk(e, e.wp2.x, e.wp2.y, gd, dt, false);
        }
      }
      break;
    }
    case "aim":
      e.t -= dt;
      if (e.t <= 0) { shoot(e, d, sees); e.burstLeft--; e.state = "fire"; e.t = 0.13; }
      break;
    case "fire":
      e.t -= dt;
      if (e.t <= 0) {
        if (e.burstLeft > 0 && sees) { shoot(e, d, sees); e.burstLeft--; e.t = 0.16; }
        else { e.state = "chase"; e.cd = rand(T.cd[0], T.cd[1]); }
      }
      break;
  }
}

function walk(e, tx, ty, gd, dt, weave) {
  e.step += dt;
  const ux = (tx - e.x) / gd, uy = (ty - e.y) / gd, wv = weave ? Math.sin(e.step * 2.2) * 0.45 : 0; // a slight weave when in the open
  moveBy(e, (ux - uy * wv) * e.type.speed * dt, (uy + ux * wv) * e.type.speed * dt, 0.22);
  e.moving = true;
}

// The Don makes for his getaway, waypoint by waypoint, finding a way around anyone
// or anything in his path. If he gets there, he's gone.
function flee(e, dt) {
  if (e.wp >= game.level.route.length) return; // already gone
  const route = game.level.route, last = e.wp >= route.length - 1, [tx, ty] = route[Math.min(e.wp, route.length - 1)];
  const p = game.player;
  // Reached it, or it's taken (you're standing on it) or he's been stuck: on to the next one
  e.stuck = (e.stuck || 0) + dt;
  const blocked = !last && (Math.hypot(p.x - tx, p.y - ty) < 0.9 || e.stuck > 1.2);
  if (Math.hypot(tx - e.x, ty - e.y) < 0.45 || blocked) {
    e.wp++; e.stuck = 0; e.repath = 0;
    if (e.wp >= route.length) escaped();
    return;
  }
  if (e.repath <= 0 || !e.wp2) { e.wp2 = nextStep(e.x, e.y, tx, ty, game.player) || { x: tx, y: ty }; e.repath = ENEMY_AI.repath; }
  const gd = Math.hypot(e.wp2.x - e.x, e.wp2.y - e.y);
  if (gd < 0.1) { e.repath = 0; return; }
  const bx = e.x, by = e.y;
  walk(e, e.wp2.x, e.wp2.y, gd, dt, false);
  // Boxed in for a moment? Look for another way next frame
  if (Math.hypot(e.x - bx, e.y - by) < 0.2 * e.type.speed * dt) e.repath = 0;
  else e.stuck = 0;
}
function escaped() {
  if (game.state !== "play") return;
  game.state = "dying";
  say("Don Vitale got away.", 3);
  fadeOut(() => showCard("escaped", game.levelIdx), 1.8);
}

function shoot(e, d, sees) {
  const T = e.type, p = game.player, shotgun = T.name === "heavy";
  shotgun ? SND.shotgun(d) : SND.enemy(d);
  if (!sees || game.state !== "play") return; // no hits on a player who's already down
  const chance = clamp(ENEMY_AI.accuracyNear - d * ENEMY_AI.accuracyFalloff, ENEMY_AI.accuracyMin, ENEMY_AI.accuracyNear) * (p.moving ? ENEMY_AI.movingTargetPenalty : 1);
  if (Math.random() > chance) return;
  let dmg = rand(T.dmg[0], T.dmg[1]);
  if (shotgun) dmg *= clamp(1.3 - d * 0.12, 0.3, 1.3); // shotguns hit hardest up close
  hurtPlayer(dmg);
}

// Every hit on you goes through here. Once you're down, that's one death, however
// many more rounds are still flying.
export function hurtPlayer(dmg) {
  const p = game.player;
  if (game.state !== "play") return;
  p.hp -= dmg; p.hurt = 0.3; SND.hurt();
  if (p.hp <= 0) {
    p.hp = 0; game.state = "dying"; stats.deaths++;
    fadeOut(() => showCard("dead", game.levelIdx), 1.4);
  }
}
