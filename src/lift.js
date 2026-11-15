// The hotel lift: you ride up, and at each landing the gate opens on Vitale men
// waiting for you. Clear the landing, step back in, ride on. After the last one,
// the door at the far end of the landing leads to the Don's suite.
//
// A level turns this on with `lift: [{ who: [...] }, ...]`, one entry per stop. No two
// landings are the same: one has its lights out, one has tables tipped over for the
// men to shoot from behind, one has a man standing right outside the gate.
import { rand } from "./util.js";
import { game, say } from "./state.js";
import { SND } from "./audio.js";
import { OBJ, dimmed } from "./art/sprites.js";
import { SPAWNS, spawnEnemy, buildLight, buildNav, los } from "./world.js";

const RIDE = 3.2;                                   // seconds between landings
const WAIT = 3.5;                                  // seconds the men behind the tables wait for a shot before they come for you
const DARK = 0.16;                                  // how little light a landing has with its lamps out
// The barricaded landing: where each man crouches (out of sight from the gate) and where he steps out to fire
const DENS = [
  { den: (gx, gy) => [gx + 6.5, gy - 1], peek: (gx, gy) => [gx + 6.5, gy - 2.3] },   // (a little past where he'll stop: he pulls up short of his mark)
  { den: (gx, gy) => [gx + 6.5, gy + 1], peek: (gx, gy) => [gx + 6.5, gy + 2.3] },
  { den: (gx, gy) => [gx + 7.5, gy - 1], peek: (gx, gy) => [gx + 6.5, gy] },
];
export const FLOORS = ["Third floor", "Sixth floor", "Ninth floor", "Eleventh floor"];

export function startLift(waves) {
  const gate = [...game.doors.values()][0];
  gate.locked = true;
  // What's in the room on every floor (the lamps): everything else is set out landing by landing
  game.lift = { waves, stop: -1, phase: "ride", t: RIDE, gate, done: false, nag: 0, fixed: new Set(game.objs) };
  SND.lift(RIDE);
}
export const liftFloor = () => { const l = game.lift; return l.done ? "Top floor" : l.stop < 0 ? "Lobby" : FLOORS[l.stop] || `Floor ${l.stop + 3}`; };

// Put a prop on the landing by its map letter
function place(letter, x, y) {
  const sp = SPAWNS[letter];
  game.objs.push({ x, y, ...sp, art: OBJ[sp.art] });
}
// The landing's lamps: on, or out
function lamps(on) {
  for (const o of game.objs) {
    if (o.lit === undefined) { if (!o.light) continue; o.lit = { light: o.light, art: o.art, glow: o.glow }; }
    if (on) { o.light = o.lit.light; o.art = o.lit.art; o.glow = o.lit.glow; }
    else { o.light = null; o.glow = false; o.art = dimmed(o.lit.art); }
  }
  game.ambient = on ? undefined : DARK;
}
// Leaving a landing: the bodies and whatever was lying about stay behind on that floor
function clearLanding() {
  const l = game.lift;
  game.enemies = []; game.bullets = [];
  game.objs = game.objs.filter(o => l.fixed.has(o));
}
// Arriving at one: its furniture, its light, and who's waiting
function setLanding(w) {
  const l = game.lift, p = game.player, gx = l.gate.x, gy = l.gate.y + 0.5;
  const far = game.width - 2.5;                     // the far end of the landing, by the door
  if (w.barricade) { place("~", gx + 5.5, gy - 1); place("~", gx + 5.5, gy + 1); }
  else { place("c", far, gy - 1); place("c", far, gy + 1); }
  if (w.kit) place("+", gx + 2.5, gy + 2);
  lamps(!w.dark);
  buildLight(); buildNav();
  const spots = [];
  for (let y = 0; y < game.height; y++) for (let x = gx + 4; x < game.width; x++) if (game.map[y][x] === "." && !game.navBlocked[y * game.width + x]) spots.push([x + 0.5, y + 0.5]);
  w.who.forEach((letter, i) => {
    let at;
    if (w.atGate && i === 0 && Math.hypot(p.x - (gx + 2.5), p.y - gy) > 1.5) at = [gx + 2.5, gy];   // right outside the gate (unless that's where you are)
    else if (w.barricade) at = DENS[i % DENS.length].den(gx, gy);                    // down behind a tipped table
    else { const free = spots.filter(s => Math.hypot(p.x - s[0], p.y - s[1]) > 1.5); at = free[(rand(0, free.length)) | 0] || spots[0]; spots.splice(spots.indexOf(at), 1); }
    const e = spawnEnemy(letter, at[0], at[1]);
    e.alert = true; e.lx = p.x; e.ly = p.y; e.cd = rand(0.6, 1.4);
    e.face = Math.atan2(p.y - e.y, p.x - e.x);
    if (w.barricade) {
      // He keeps down behind his table, and steps out to its side when he's ready to shoot
      const d = DENS[i % DENS.length], [px, py] = d.peek(gx, gy);
      e.den = { x: at[0], y: at[1] }; e.peek = { x: px, y: py }; e.hold = e.den;
    }
    else e.hold = null;
  });
  const floor = `${liftFloor()}.`;
  say(w.dark ? `${floor} Somebody's put the lights out.` : w.barricade ? `${floor} They've tipped the tables over.` : w.atGate ? `${floor} One of them is right at the gate!` : floor, w.dark || w.barricade || w.atGate ? 3.5 : 2);
}

export function updateLift(dt) {
  const l = game.lift, p = game.player;
  if (!l || l.done) return;
  if (l.phase === "ride") {
    l.t -= dt;
    if (l.t > 0) return;
    // Arrived: the gate opens and whoever is waiting comes for you
    l.stop++; l.phase = "stop"; l.gate.locked = false; SND.bell();
    const last = l.stop === l.waves.length;
    if (last) {
      l.done = true;
      place("c", game.width - 2.5, l.gate.y - 0.5); place("c", game.width - 2.5, l.gate.y + 1.5);
      lamps(true); buildLight(); buildNav();
      say("Top floor. The Don's suite is through that door.", 4);
      return;
    }
    setLanding(l.waves[l.stop]);
    return;
  }
  // Behind the tables: out to shoot when he's ready and there's something to shoot at, back down
  // while he isn't. If you keep out of sight for long enough, they come and find you.
  for (const e of game.enemies) {
    if (!e.den || e.hp <= 0 || !e.hold) continue;
    const shot = los(e.peek.x, e.peek.y, p.x, p.y);
    e.blind = shot || los(e.x, e.y, p.x, p.y) ? 0 : (e.blind || 0) + dt;
    if (e.blind > WAIT) { e.den = null; e.hold = null; continue; }
    e.hold = (e.cd <= 0.7 || e.state === "aim" || e.state === "fire") && shot ? e.peek : e.den;
  }
  // At a landing: once it's clear and you're back inside, the gate shuts and up you go
  if (game.enemies.some(e => e.hp > 0)) return;
  // (right inside: clear of the doorway, so the gate can shut behind you)
  const inside = l.gate.axis === "y" ? p.x < l.gate.x - 0.3 : p.y < l.gate.y - 0.3;
  if (inside) { l.gate.locked = true; l.phase = "ride"; l.t = RIDE; clearLanding(); SND.lift(RIDE); say("Going up.", 1.5); }
  else if ((l.nag -= dt) <= 0) { l.nag = 4; say("Back in the lift."); }
}
