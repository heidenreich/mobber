// The Vitale outfit. Each gangster runs a small state machine:
// idle -> chase -> aim -> fire -> chase ... with hurt/dying/dead on top.
// They raise their gun ("aim") before firing, which gives you a moment to react.
import { ENEMY_AI, BULLETS, STREET } from "./config.js";
import { rand } from "./util.js";
import { game, stats, say, intertitle, eye } from "./state.js";
import { SND } from "./audio.js";
import { los, moveBy, nextStep, lightAt } from "./world.js";
import { fadeOut, showCard } from "./flow.js";
import { difficulty, buzz } from "./settings.js";
import { spawnBullet } from "./bullets.js";
import { scare } from "./folk.js";

export function updateEnemy(e, dt) {
  const p = game.player, T = e.type;
  if (e.state === "stagger") { lastSteps(e, dt); return; }
  if (e.state === "kneel") return;   // the Don, beaten, waiting to hear what you'll do with him
  if (e.state === "dying") { e.t -= dt; if (e.t <= 0) e.state = "dead"; return; }
  if (e.state === "dead") return;
  e.cd -= dt; e.staggerCd = Math.max(0, (e.staggerCd || 0) - dt); e.repath = (e.repath || 0) - dt;
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
  // They see less far when you're standing in the dark (shoot out a lamp and find out)
  const range = ENEMY_AI.sightRange * (lightAt(p.x, p.y) < 0.5 && p.flash <= 0 ? ENEMY_AI.darkSight : 1);
  // Until something alerts him he only sees what's in front of him, and now and then he looks behind
  if (!e.alert && (e.turnT -= dt) <= 0) { e.face += Math.PI; e.lookBack = !e.lookBack; e.turnT = e.lookBack ? rand(2, 3.5) : rand(4, 8); }
  // He sees you if he can see where you stand, or your head leaning out of cover
  let sees = d < range && (los(e.x, e.y, p.x, p.y) || (!!p.lean && los(e.x, e.y, eye().x, eye().y)));
  if (sees && !e.alert && d > ENEMY_AI.senseRange) {
    const off = Math.atan2(dy, dx) - e.face;
    if (Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) > ENEMY_AI.viewCone) sees = false;
  }
  if (e.panic) { runForIt(e, dt, d); return; }
  if (T.runner && e.alert && !e.rang && !e.cornered) { runForAlarm(e, dt); return; }
  if (sees) {
    // The first gangster to get a good look at you, and later the Don himself, have something to say
    // A lieutenant speaks the first time he sees you close, even if your bullet reached him first
    if (T.lieutenant) { if (!e.met && d < 9) { e.met = true; intertitle(T.name, T.title, T.line); } }
    else if (!e.alert && d < 9) {
      if (T.flees) intertitle("don", "DON VITALE", ["“You should have stayed", "out of it, kid.”"]);
      else intertitle("spotted", "A VITALE GUNMAN", ["“It's Eddie's brother!", "Get him!”"]);
    }
    if (!e.alert) raiseAlarm(e, d);
    e.alert = true; e.lx = p.x; e.ly = p.y;
  }
  // On a street where they make a stand, a man who isn't a lookout falls back to the front door once he knows you're here
  if (e.alert && e.hold === undefined) e.hold = e.doorMan ? holdSpot(e) : null;
  e.moving = false;
  switch (e.state) {
    case "idle": if (e.alert) e.state = "chase"; break;
    case "hurt": e.t -= dt; if (e.t <= 0) e.state = "chase"; break;
    case "chase": {
      if (sees && d < T.range && e.cd <= 0) { e.state = "aim"; e.t = T.aim; e.burstLeft = T.burst; break; }
      if (T.still) break;   // a man at a window stays there
      if (T.flees && game.level.route) { flee(e, dt); break; }
      if (e.hold) {
        // Back to his place by the door (firing on the way whenever he's ready), and there he stays
        if (Math.hypot(e.hold.x - e.x, e.hold.y - e.y) > 0.3) {
          if (e.repath <= 0 || !e.wp2) { e.wp2 = nextStep(e.x, e.y, e.hold.x, e.hold.y) || e.hold; e.repath = ENEMY_AI.repath; }
          const gd = Math.hypot(e.wp2.x - e.x, e.wp2.y - e.y);
          const bx = e.x, by = e.y;
          if (gd < 0.1) e.repath = 0; else walk(e, e.wp2.x, e.wp2.y, gd, dt, false);
          // Someone's in his way: after a moment he makes do with where he is
          e.jam = Math.hypot(e.x - bx, e.y - by) < 0.2 * T.speed * dt ? (e.jam || 0) + dt : 0;
          if (e.jam > 0.8 && Math.hypot(game.doorFront.x - e.x, game.doorFront.y - e.y) < STREET.holdFar + 2) e.hold = { x: e.x, y: e.y };
        }
        break;
      }
      // Between bursts a goon may duck out of your line of fire until he's ready to shoot again
      if (e.cover) {
        if (e.cd <= 0) e.cover = null;
        else {
          if (Math.hypot(e.cover.x - e.x, e.cover.y - e.y) > 0.25) {
            const s = nextStep(e.x, e.y, e.cover.x, e.cover.y) || e.cover, gd = Math.hypot(s.x - e.x, s.y - e.y);
            if (gd > 0.05) walk(e, s.x, s.y, gd, dt, false);
          }
          break;
        }
      }
      if (sees) {
        // In sight: close in, but not right up to you
        // (a knife man comes all the way, and straight)
        const gd = d;
        if (gd > (T.melee ? 0.6 : ENEMY_AI.keepDistance)) walk(e, p.x, p.y, gd, dt, !T.melee);
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
        else {
          e.state = "chase"; e.cd = rand(T.cd[0], T.cd[1]);
          e.cover = T.name === "goon" && !e.hold && Math.random() < ENEMY_AI.coverChance ? findCover(e) : null;
        }
      }
      break;
  }
}

// The Don is hit and finished, but not down yet: he staggers for the parapet and goes over
function lastSteps(e, dt) {
  e.t -= dt; e.step += dt;
  const gd = Math.hypot(e.goal.x - e.x, e.goal.y - e.y);
  if (gd > 0.75 && e.t > 0) { moveBy(e, (e.goal.x - e.x) / gd * 0.9 * dt, (e.goal.y - e.y) / gd * 0.9 * dt, 0.22); return; }
  e.state = "dying"; e.t = 0.6; e.over = gd <= 1.3;   // close enough to the edge to fall from it
  SND.down();
  intertitle("eddie", null, ["“That's for Eddie.”"]) || say("That's for Eddie.", 4);
  fadeOut(() => showCard("epilogue"), 2.6);
}

// The bagman makes for the nearest alarm bell. If he gets there, every gun in the
// place knows where you are; then he looks after himself. With no bell to run to, he just runs.
function runForAlarm(e, dt) {
  const p = game.player;
  if (e.state === "hurt") { e.t -= dt; if (e.t > 0) return; }
  e.state = "chase"; e.moving = false;
  let bell = null, best = Infinity;
  if (e.type.toDoor) {
    // The street's runner: the front door is his bell
    bell = game.doorFront;
    if (bell) {
      best = Math.hypot(bell.x - e.x, bell.y - e.y);
      if (e.wait === undefined) { e.wait = STREET.runnerWait; intertitle("runner", "A VITALE LOOKOUT", ["“It's him! I'll tell them inside!”"]) || say("A lookout is running for the door. Stop him!", 3.5); }
      if ((e.wait -= dt) > 0) return;
      if (best < 0.95) { gotInside(e); return; }
    }
  } else for (const o of game.objs) { const bd = Math.hypot(o.x - e.x, o.y - e.y); if (o.alarm && bd < best) { best = bd; bell = o; } }
  if (!bell) { e.rang = true; e.panic = true; return; }
  if (best < 0.95) {
    e.rang = true; e.panic = true; game.alarm = true; SND.alarm(); scare(e.x, e.y);
    for (const o of game.enemies) if (o.hp > 0 && !o.type.lieutenant) { o.alert = true; o.lx = p.x; o.ly = p.y; }   // a lieutenant holds his post even then
    intertitle("alarm", null, ["The bagman has rung the alarm.", "Every gun in the place is coming."]) || say("The alarm! Every gun in the place is coming.", 3.5);
    return;
  }
  if (e.repath <= 0 || !e.wp2) { e.wp2 = nextStep(e.x, e.y, bell.x, bell.y); e.repath = ENEMY_AI.repath; }
  if (!e.wp2) { e.rang = true; e.panic = true; return; }
  const gd = Math.hypot(e.wp2.x - e.x, e.wp2.y - e.y);
  if (gd < 0.1) e.repath = 0; else walk(e, e.wp2.x, e.wp2.y, gd, dt, false);
}

// The runner made it through the front door: he's out of this scene, and the men in the next one will be ready
function gotInside(e) {
  e.rang = true; e.hp = 0; e.state = "dead"; e.over = true;   // gone from the street, and not a man you put down
  game.player.warnedAt = game.levelIdx + 1;
  SND.door(Math.hypot(game.player.x - e.x, game.player.y - e.y));
  say("The lookout got inside. They'll be waiting for you.", 4);
}

// A place to stand near the front door: in sight of it, not on top of it, and not somebody else's
function holdSpot(e) {
  const door = game.doorFront;
  if (!door) return null;
  const taken = new Set(game.enemies.filter(o => o !== e && o.hold && o.hp > 0).map(o => (o.hold.y | 0) * game.width + (o.hold.x | 0)));
  let best = null, bestS = -Infinity;
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    const x = (door.x | 0) + dx, y = (door.y | 0) + dy, i = y * game.width + x, d = Math.hypot(dx, dy);
    if (d < STREET.holdNear || d > STREET.holdFar || (game.map[y] || [])[x] !== "." || game.navBlocked[i] || taken.has(i)) continue;
    // (a parked car fills more than its own square: he has to be able to stand there)
    if (game.objs.some(o => o.block && Math.abs(o.x - x - 0.5) < 0.24 + (o.size || 0.28) && Math.abs(o.y - y - 0.5) < 0.24 + (o.size || 0.28))) continue;
    if (!los(x + 0.5, y + 0.5, door.x, door.y) || !nextStep(e.x, e.y, x + 0.5, y + 0.5)) continue;
    // Better beside something solid (a car, a lamp post, a wall) than out in the open
    const beside = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ax, ay]) => (game.map[y + ay] || [])[x + ax] !== "." || game.navBlocked[(y + ay) * game.width + x + ax]);
    // ...and the nearer to where he is now the better, so they don't cross each other getting there
    const s = (beside ? 2 : 0) + rand(0, 1) - Math.hypot(x + 0.5 - e.x, y + 0.5 - e.y) * 0.5;
    if (s > bestS) { bestS = s; best = { x: x + 0.5, y: y + 0.5 }; }
  }
  return best;
}

// The first to spot you shouts, and anyone near him turns your way too
function raiseAlarm(e, d) {
  const p = game.player;
  let heard = false;
  for (const o of game.enemies) {
    if (o === e || o.hp <= 0 || o.alert || o.type.lieutenant || Math.hypot(o.x - e.x, o.y - e.y) > ENEMY_AI.shoutRange) continue;
    o.alert = true; o.lx = p.x; o.ly = p.y; heard = true;
  }
  if (heard) SND.shout(d);
}

// The nearest open square within a few steps that you can't see
function findCover(e) {
  const p = game.player, ex = e.x | 0, ey = e.y | 0;
  let best = null, bestD = Infinity;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const x = ex + dx, y = ey + dy;
    if (!dx && !dy || (game.map[y] || [])[x] !== "." || game.navBlocked[y * game.width + x]) continue;
    const d = Math.hypot(dx, dy);
    if (d < bestD && !los(x + 0.5, y + 0.5, p.x, p.y) && los(e.x, e.y, x + 0.5, y + 0.5)) { bestD = d; best = { x: x + 0.5, y: y + 0.5 }; }
  }
  return best;
}

// The last hired gun has lost his nerve: he runs from you, and only turns to fight if cornered
function runForIt(e, dt, d) {
  const p = game.player;
  if (e.state === "hurt") { e.t -= dt; if (e.t > 0) return; }
  e.state = "chase"; e.moving = false; e.repath -= dt;
  if (e.repath <= 0 || !e.away) {
    e.repath = 0.6; e.away = null;
    let bestD = d + 1;
    for (let a = 0; a < 6.28; a += 0.785) {
      const x = e.x + Math.cos(a) * 4, y = e.y + Math.sin(a) * 4;
      if ((game.map[y | 0] || [])[x | 0] !== "." || game.navBlocked[(y | 0) * game.width + (x | 0)]) continue;
      const far = Math.hypot(x - p.x, y - p.y);
      if (far > bestD && nextStep(e.x, e.y, x, y)) { bestD = far; e.away = { x, y }; }
    }
    // Nowhere left to run, and you're on top of him
    if (!e.away && d < 3.5) { e.panic = false; e.cornered = true; e.alert = true; e.cd = 0.4; return; }
  }
  if (e.away) {
    const s = nextStep(e.x, e.y, e.away.x, e.away.y) || e.away, gd = Math.hypot(s.x - e.x, s.y - e.y);
    if (gd > 0.1) walk(e, s.x, s.y, gd, dt, false); else e.repath = 0;
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

// He fires where he sees you, or where he last saw you. The bullet takes time to
// arrive (bullets.js), so his aim is a guess at where you'll be: sometimes he
// leads a moving target well, sometimes not at all.
function shoot(e, d, sees) {
  const T = e.type, p = game.player, D = difficulty(), shotgun = T.name === "heavy";
  if (T.melee) {
    // The knife comes down: it only finds you if you're still within reach
    const hit = sees && d < T.range + 0.35 && game.state === "play";
    SND.whip(hit);
    if (hit) hurtPlayer(rand(T.dmg[0], T.dmg[1]) * D.damage);
    return;
  }
  shotgun ? SND.shotgun(d) : SND.enemy(d);
  scare(e.x, e.y);
  if (game.state !== "play") return; // no more rounds at a player who's already down
  const speed = T.bulletSpeed || BULLETS.speed;
  let tx = e.lx, ty = e.ly;
  if (sees) {
    // Your body if he can see it, otherwise the head you've leaned out
    const at = los(e.x, e.y, p.x, p.y) ? p : eye(), ahead = (d / speed) * rand(0, D.lead);
    tx = at.x + (p.vx || 0) * ahead; ty = at.y + (p.vy || 0) * ahead;
  }
  const a = Math.atan2(ty - e.y, tx - e.x), ox = e.x + Math.cos(a) * 0.2, oy = e.y + Math.sin(a) * 0.2;
  const dmg = () => rand(T.dmg[0], T.dmg[1]) * D.damage;
  // A shotgun's pellets spread, so it hits hardest up close
  if (shotgun) for (let n = 0; n < BULLETS.pellets; n++) spawnBullet(ox, oy, a + rand(-BULLETS.pelletSpread, BULLETS.pelletSpread), dmg() * 1.3 / BULLETS.pellets);
  else { const s = (T.scatter || BULLETS.scatter) / D.aim; spawnBullet(ox, oy, a + rand(-s, s), dmg(), speed, T.up ? { h: T.up + 0.2, over: Math.max(1, d) } : null); }
}

// Every hit on you goes through here. Once you're down, that's one death, however
// many more rounds are still flying.
export function hurtPlayer(dmg) {
  const p = game.player;
  if (game.state !== "play") return;
  // A steel vest takes half of what hits you until it's used up
  if (p.vest > 0) { const took = Math.min(p.vest, dmg * 0.5); p.vest -= took; dmg -= took; }
  p.hp -= dmg; p.hurt = 0.3; SND.hurt(); buzz(40);
  if (p.hp <= 0) {
    p.hp = 0; game.state = "dying"; stats.deaths++;
    fadeOut(() => showCard("dead", game.levelIdx), 1.4);
  }
}
