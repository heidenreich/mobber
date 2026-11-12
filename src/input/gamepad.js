// A game controller, on a desktop or paired with a phone. Read once a frame:
// the sticks go into input.pad for player.js, and buttons act on the press.
//
//   left stick   walk and sidestep        right stick  look
//   RT / R2      fire                     X / square   reload
//   Y / triangle next gun                 A / cross    search a wall, work a safe; next card
//   LB, RB       lean left, right         L3 (press the left stick)  run
import { PAD } from "../config.js";
import { game, input } from "../state.js";
import { initAudio } from "../audio.js";
import { nextWeapon, startReload, use } from "../player.js";
import { advance } from "../flow.js";

const was = [];   // which buttons were down last frame, to act once per press
const dead = v => (Math.abs(v) < PAD.deadZone ? 0 : (v - Math.sign(v) * PAD.deadZone) / (1 - PAD.deadZone));

export function pollGamepad() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(p => p && p.connected) : [];
  const gp = pads.find(p => p.mapping === "standard") || pads[0];
  if (!gp || input.menu) { input.pad = null; return; }
  const down = i => !!gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.35);
  const pressed = i => down(i) && !was[i];
  input.pad = {
    fw: -dead(gp.axes[1] || 0), st: dead(gp.axes[0] || 0), look: dead(gp.axes[2] || 0),
    fire: down(7), run: down(10), use: down(0), lean: (down(5) ? 1 : 0) - (down(4) ? 1 : 0),
  };
  if (game.state === "play" && game.player) {
    if (pressed(2)) startReload();
    if (pressed(3)) nextWeapon();
    if (pressed(0)) use();
    if (down(7)) input.touched = true;   // you've taken hold: the phone's auto-fire may join in
  } else if (pressed(0) || pressed(9)) { initAudio(); advance(); }   // A or Start moves the cards along
  for (let i = 0; i < gp.buttons.length; i++) was[i] = down(i);
}
