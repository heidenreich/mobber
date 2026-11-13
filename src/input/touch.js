// Phone controls: a floating stick under the left thumb (up/down walks,
// left/right turns), drag anywhere on the right, including on FIRE, to aim.
// Aim assist and auto-fire live in player.js.
import { TOUCH } from "../config.js";
import { game, input } from "../state.js";
import { cv, view, fireBtn, swapBtn } from "../screen.js";
import { initAudio } from "../audio.js";
import { nextWeapon } from "../player.js";
import { advance } from "../flow.js";
import { lookSpeed } from "../settings.js";
import { chooseDifficultyAt } from "../render/cards.js";
import { shopClickAt } from "../render/shop.js";

function lookBy(dx) { if (game.player) game.player.a += dx * TOUCH.lookSensitivity * lookSpeed(); }

export function installTouchInput() {
  const touch = input.touch, R = TOUCH.stickRadius;
  cv.addEventListener("touchstart", e => {
    initAudio();
    if (input.menu) return;
    if (game.shop) { const t = e.changedTouches[0]; shopClickAt(t.clientX, t.clientY); e.preventDefault(); return; }   // dealing with the fence
    if (game.state !== "play") {
      const t = e.changedTouches[0];
      if (!chooseDifficultyAt(t.clientX, t.clientY)) advance();   // a tap on a difficulty name picks it; anywhere else rolls the film
      e.preventDefault(); return;
    }
    input.touched = true;
    for (const t of e.changedTouches) {
      if (t.clientX < view.vw * TOUCH.joystickArea && !touch.move) touch.move = { id: t.identifier, x: t.clientX, y: t.clientY, kx: t.clientX, ky: t.clientY, dx: 0, dy: 0 };
      else if (!touch.look) touch.look = { id: t.identifier, x: t.clientX };
    }
    e.preventDefault();
  }, { passive: false });
  cv.addEventListener("touchmove", e => {
    for (const t of e.changedTouches) {
      if (touch.move && t.identifier === touch.move.id) {
        const m = touch.move;
        let dx = t.clientX - m.x, dy = t.clientY - m.y, d = Math.hypot(dx, dy);
        // Let the stick follow a thumb that drifts too far, so it never "runs out"
        if (d > R) { m.x += dx * (1 - R / d); m.y += dy * (1 - R / d); dx = t.clientX - m.x; dy = t.clientY - m.y; d = R; }
        m.kx = t.clientX; m.ky = t.clientY;
        const dead = TOUCH.deadZone, n = d / R, k = n < dead ? 0 : (n - dead) / (1 - dead) / (n || 1);
        m.dx = dx / R * k; m.dy = dy / R * k;
      }
      if (touch.look && t.identifier === touch.look.id) { lookBy(t.clientX - touch.look.x); touch.look.x = t.clientX; }
    }
    e.preventDefault();
  }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      if (touch.move && t.identifier === touch.move.id) touch.move = null;
      if (touch.look && t.identifier === touch.look.id) touch.look = null;
    }
  };
  cv.addEventListener("touchend", end);
  cv.addEventListener("touchcancel", end);

  // FIRE fires while held, and dragging on it aims
  let fireTouch = null;
  fireBtn.addEventListener("touchstart", e => {
    e.preventDefault(); initAudio(); input.firing = true; input.touched = true;
    const t = e.changedTouches[0]; fireTouch = { id: t.identifier, x: t.clientX };
  }, { passive: false });
  fireBtn.addEventListener("touchmove", e => {
    e.preventDefault();
    for (const t of e.changedTouches) if (fireTouch && t.identifier === fireTouch.id) { lookBy(t.clientX - fireTouch.x); fireTouch.x = t.clientX; }
  }, { passive: false });
  const fireUp = e => { e.preventDefault(); input.firing = false; fireTouch = null; };
  fireBtn.addEventListener("touchend", fireUp, { passive: false });
  fireBtn.addEventListener("touchcancel", fireUp, { passive: false });
  swapBtn.addEventListener("touchstart", e => { e.preventDefault(); if (game.player && game.state === "play") nextWeapon(); }, { passive: false });
}
