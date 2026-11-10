// Keyboard and mouse. The mouse aims through pointer lock; if pointer lock isn't
// available, dragging with the button held turns instead.
import { isTouch, PLAYER } from "../config.js";
import { game, input } from "../state.js";
import { cv } from "../screen.js";
import { initAudio } from "../audio.js";
import { switchWeapon, startReload, use } from "../player.js";
import { advance, requestLock } from "../flow.js";

export function installDesktopInput() {
  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase(), p = game.player; input.keys.add(k);
    if (k === " ") { e.preventDefault(); input.firing = true; }
    if (k === "enter") advance();
    // One press, one action (no key-repeat), and nothing while paused or between scenes
    const paused = input.wasLocked && !input.locked;
    if (e.repeat || !p || game.state !== "play" || paused) return;
    if (k === "1") switchWeapon(0);
    if (k === "2") switchWeapon(1);
    if (k === "q") switchWeapon(1 - p.weapon);
    if (k === "r") startReload();
    if (k === "e") use();
  });
  window.addEventListener("keyup", e => { const k = e.key.toLowerCase(); input.keys.delete(k); if (k === " ") input.firing = false; });
  window.addEventListener("blur", () => { input.keys.clear(); input.firing = false; });
  document.addEventListener("pointerlockchange", () => { input.locked = document.pointerLockElement === cv; if (input.locked) input.wasLocked = true; });
  cv.addEventListener("mousedown", e => {
    initAudio();
    if (game.state !== "play") return;
    if (!input.locked) requestLock();
    if (input.wasLocked && !input.locked) return; // first click after a pause just resumes
    if (e.button === 0) input.firing = true;
    input.dragLook = true;
  });
  window.addEventListener("mouseup", () => { input.firing = false; input.dragLook = false; });
  window.addEventListener("mousemove", e => {
    if (game.state !== "play" || !game.player) return;
    if (input.locked || (input.dragLook && !isTouch)) game.player.a += e.movementX * PLAYER.mouseSensitivity;
  });
  cv.addEventListener("wheel", () => { if (game.player && game.state === "play") switchWeapon(1 - game.player.weapon); });
  cv.addEventListener("click", () => { initAudio(); if (game.state !== "play") advance(); });
}
