// The Vitale outfit. Each gangster runs a small state machine:
// idle -> chase -> aim -> fire -> chase ... with hurt/dying/dead on top.
// They raise their gun ("aim") before firing, which gives you a moment to react.
import { ENEMY_AI } from "./config.js";
import { rand, clamp } from "./util.js";
import { game, stats } from "./state.js";
import { SND } from "./audio.js";
import { los, moveBy } from "./world.js";
import { fadeOut, showCard } from "./flow.js";

export function updateEnemy(e, dt) {
  const p = game.player, T = e.type;
  if (e.state === "dying") { e.t -= dt; if (e.t <= 0) e.state = "dead"; return; }
  if (e.state === "dead") return;
  e.cd -= dt;
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
  const sees = d < ENEMY_AI.sightRange && los(e.x, e.y, p.x, p.y);
  if (sees) { e.alert = true; e.lx = p.x; e.ly = p.y; }
  e.moving = false;
  switch (e.state) {
    case "idle": if (e.alert) e.state = "chase"; break;
    case "hurt": e.t -= dt; if (e.t <= 0) e.state = "chase"; break;
    case "chase": {
      if (sees && d < T.range && e.cd <= 0) { e.state = "aim"; e.t = T.aim; e.burstLeft = T.burst; break; }
      // Head for you, or for where you were last seen
      const tx = sees ? p.x : e.lx, ty = sees ? p.y : e.ly, gd = Math.hypot(tx - e.x, ty - e.y);
      if (gd > (sees ? ENEMY_AI.keepDistance : 0.4)) {
        // Slight sideways weave so they don't walk in a straight line
        e.step += dt;
        const ux = (tx - e.x) / gd, uy = (ty - e.y) / gd, wv = Math.sin(e.step * 2.2) * 0.45;
        moveBy(e, (ux - uy * wv) * T.speed * dt, (uy + ux * wv) * T.speed * dt, 0.22);
        e.moving = true;
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
