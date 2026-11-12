// The settings panel: a small gear in the corner opens it, on a phone or a desktop.
// The picture stops while it's open.
import { game, input, resetStats } from "./state.js";
import { settings, saveSettings, DIFFICULTY, LOOK_SPEEDS, STICKS, clearGame } from "./settings.js";
import { isTouch } from "./config.js";
import { setSoundOn, initAudio } from "./audio.js";

const gear = document.getElementById("gear"), panel = document.getElementById("panel");
const onOff = v => (v ? "On" : "Off");

// Each row: a label, the current value, and what a tap does
const ROWS = [
  ["Music", () => onOff(settings.music), () => { settings.music = !settings.music; }],
  ["Sound effects", () => onOff(settings.sound), () => { settings.sound = !settings.sound; setSoundOn(settings.sound); }],
  ["Look speed", () => LOOK_SPEEDS[settings.look].name, () => { settings.look = (settings.look + 1) % LOOK_SPEEDS.length; }],
  ["Difficulty", () => DIFFICULTY[settings.difficulty].name, () => { settings.difficulty = (settings.difficulty + 1) % DIFFICULTY.length; }],
];
if (isTouch) ROWS.splice(2, 0, ["Left thumb", () => STICKS[settings.stick], () => { settings.stick = (settings.stick + 1) % STICKS.length; }]);
if (navigator.vibrate) ROWS.splice(3, 0, ["Buzz when hit", () => onOff(settings.vibrate), () => { settings.vibrate = !settings.vibrate; }]);

let sure = false;
function draw() {
  panel.innerHTML = "";
  const add = (tag, text, cls) => { const el = document.createElement(tag); el.textContent = text; if (cls) el.className = cls; panel.appendChild(el); return el; };
  add("h2", "THE PROJECTION BOOTH");
  for (const [label, value, change] of ROWS) {
    const row = add("button", "", "row");
    const a = document.createElement("span"); a.textContent = label; const b = document.createElement("b"); b.textContent = value();
    row.append(a, b);
    row.onclick = () => { change(); saveSettings(); draw(); };
  }
  // Starting over throws away your place, so it asks twice
  const over = add("button", sure ? "Sure? Tap again to start over" : "Start the picture over", "row plain");
  over.onclick = () => {
    if (!sure) { sure = true; draw(); return; }
    clearGame(); resetStats(); game.player = null; close(); game.state = "title"; game.card = null; game.fade = 1; game.fadeDir = 0;
  };
  add("button", "Back to the picture", "row plain").onclick = close;
}
function open() { initAudio(); sure = false; input.menu = true; if (document.pointerLockElement) document.exitPointerLock(); draw(); panel.style.display = "block"; }
function close() { input.menu = false; input.firing = false; panel.style.display = "none"; }

export function installPanel() {
  gear.addEventListener("click", e => { e.stopPropagation(); input.menu ? close() : open(); });
  for (const type of ["touchstart", "mousedown", "click"]) panel.addEventListener(type, e => e.stopPropagation());
  window.addEventListener("keydown", e => { if (e.key === "Escape" && input.menu) close(); });
}
// For the tests and the keyboard: is it open?
export const panelOpen = () => !!input.menu;
