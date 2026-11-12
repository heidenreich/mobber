// The hotel lift: you ride up, and at each landing the gate opens on Vitale men
// waiting for you. Clear the landing, step back in, ride on. After the last one,
// the door at the far end of the landing leads to the Don's suite.
//
// A level turns this on with `lift: [[...], [...]]`, one list of enemy letters per stop.
import { rand } from "./util.js";
import { game, say } from "./state.js";
import { SND } from "./audio.js";
import { spawnEnemy } from "./world.js";

const RIDE = 3.2;                                   // seconds between landings
export const FLOORS = ["Third floor", "Sixth floor", "Ninth floor", "Eleventh floor"];

export function startLift(waves) {
  const gate = [...game.doors.values()][0];
  gate.locked = true;
  game.lift = { waves, stop: -1, phase: "ride", t: RIDE, gate, done: false, nag: 0 };
  SND.lift(RIDE);
}
export const liftFloor = () => { const l = game.lift; return l.done ? "Top floor" : l.stop < 0 ? "Lobby" : FLOORS[l.stop] || `Floor ${l.stop + 3}`; };

export function updateLift(dt) {
  const l = game.lift, p = game.player;
  if (!l || l.done) return;
  if (l.phase === "ride") {
    l.t -= dt;
    if (l.t > 0) return;
    // Arrived: the gate opens and whoever is waiting comes for you
    l.stop++; l.phase = "stop"; l.gate.locked = false; SND.bell();
    const last = l.stop === l.waves.length;
    if (last) { l.done = true; say("Top floor. The Don's suite is through that door.", 4); return; }
    say(`${liftFloor()}.`, 2);
    const spots = [];
    for (let y = 0; y < game.height; y++) for (let x = l.gate.x + 4; x < game.width; x++) if (game.map[y][x] === "." && !game.navBlocked[y * game.width + x]) spots.push([x + 0.5, y + 0.5]);
    for (const letter of l.waves[l.stop]) {
      const [x, y] = spots.splice((rand(0, spots.length)) | 0, 1)[0];
      const e = spawnEnemy(letter, x, y);
      e.alert = true; e.lx = p.x; e.ly = p.y; e.cd = rand(0.6, 1.4);
    }
    return;
  }
  // At a landing: once it's clear and you're back inside, the gate shuts and up you go
  if (game.enemies.some(e => e.hp > 0)) return;
  const inside = l.gate.axis === "y" ? p.x < l.gate.x : p.y < l.gate.y;
  if (inside) { l.gate.locked = true; l.phase = "ride"; l.t = RIDE; SND.lift(RIDE); say("Going up.", 1.5); }
  else if ((l.nag -= dt) <= 0) { l.nag = 4; say("Back in the lift."); }
}
