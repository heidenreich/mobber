// Loads slung from the warehouse crane (^ on the map). A shot that reaches one before
// it reaches anybody parts the rope, and the load comes down on whoever is under it:
// gangsters, a working man who had nothing to do with it, or you.
import { W, K, CRANE } from "./config.js";
import { game, stats, say } from "./state.js";
import { SND } from "./audio.js";
import { OBJ } from "./art/sprites.js";
import { cam, camera, project } from "./render/camera.js";
import { los } from "./world.js";
import { damage } from "./player.js";
import { hurtPlayer } from "./enemies.js";
import { shootFolk, scare } from "./folk.js";

// The nearest load still hanging in your line of fire, and how far off it is
export function loadInLine() {
  let best = null;
  camera();
  for (const o of game.objs) {
    if (!o.load || o.falling !== undefined) continue;
    const [, tY, sx] = project(o.x, o.y);
    if (tY > 0.2 && Math.abs(sx - W / 2) < (K / tY) * CRANE.width && (!best || tY < best.d) && los(cam.x, cam.y, o.x, o.y)) best = { o, d: tY };
  }
  return best;
}

export function dropLoad(o) {
  o.falling = 0;
  SND.snap();
}

export function updateLoads(dt) {
  const p = game.player;
  for (const o of game.objs) {
    if (!o.load) continue;
    if (o.falling === undefined) {
      // The first one you get a look at
      if (!game.toldLoads && game.state === "play" && Math.hypot(o.x - p.x, o.y - p.y) < CRANE.notice && los(p.x, p.y, o.x, o.y)) {
        game.toldLoads = true; say("A load slung from the crane. A bullet would bring it down.", 4.5);
      }
      continue;
    }
    // Falling: it gathers speed, from where it hung to the floor
    o.falling += dt;
    const k = Math.min(1, o.falling / CRANE.fall);
    o.up = -(1 - o.scale) * k * k;
    if (k < 1) continue;
    land(o);
  }
}

function land(o) {
  const p = game.player;
  o.load = false; o.falling = undefined; o.hang = false; o.up = 0; o.art = OBJ.wreck; o.scale = 0.75;
  SND.crash();
  let under = 0;
  for (const e of game.enemies) {
    if (e.hp <= 0 || e.type.up) continue;
    const d = Math.hypot(e.x - o.x, e.y - o.y);
    if (d < CRANE.radius) { damage(e, CRANE.dmg); stats.hits--; under++; }   // (it wasn't a shot on target)
    else if (d < CRANE.heard && !e.type.lieutenant) { e.alert = true; e.lx = p.x; e.ly = p.y; }
  }
  for (const f of game.folk) if ((f.state === "idle" || f.state === "flee" || f.state === "cower") && Math.hypot(f.x - o.x, f.y - o.y) < CRANE.radius) shootFolk(f);
  scare(o.x, o.y);
  if (Math.hypot(p.x - o.x, p.y - o.y) < CRANE.yourRadius) hurtPlayer(CRANE.you);
  else if (under) say(under > 1 ? `The load came down on ${under} of them.` : "The load came down on him.", 3);
}
