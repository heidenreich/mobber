// The fence's window: a lit hatch in the wall at the end of an alley off each
// street (map letter Q; K is the wall with his sign, beside the alley's mouth).
// Walk up to it and he'll deal (render/shop.js has his list). When shots are
// fired nearby the shutter comes down, and stays down until it's been quiet a while.
import { FOLK, isTouch } from "./config.js";
import { game, say } from "./state.js";
import { openShop, closeShop } from "./render/shop.js";

// Called by loadLevel: where the windows are in this scene
export function findWindows(rows) {
  game.windows = []; game.fenceShut = 0;
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === "Q") game.windows.push({ x: x + 0.5, y: y + 0.5, met: false }); }));
}
const reach = w => Math.hypot(w.x - game.player.x, w.y - game.player.y) < FOLK.fenceReach;
// Are you standing at an open window?
export const atWindow = () => game.windows.some(reach);

// A shot at (x, y): if he can hear it, down comes the shutter
export function shutWindows(x, y) {
  if (!game.windows.some(w => Math.hypot(w.x - x, w.y - y) < FOLK.hearing)) return;
  game.fenceShut = FOLK.fenceNerve;
  closeShop();
}

// E at the window (or walking up to it, on a phone)
export function knock() {
  if (!atWindow()) return false;
  if (game.fenceShut > 0) say("The shutter's down. He'll open up when it's quiet.", 2.5); else openShop();
  return true;
}

export function updateFence(dt) {
  if (game.fenceShut > 0) game.fenceShut = Math.max(0, game.fenceShut - dt);
  for (const w of game.windows) {
    const near = reach(w);
    // Once each time you walk up: on a phone his list comes up by itself, on a desktop you're told the key
    if (near && !w.met && game.fenceShut <= 0) { w.met = true; if (isTouch) openShop(); else say("E: see what the fence is selling", 3); }
    if (!near) w.met = false;
  }
}
