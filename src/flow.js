// Moving between the title card, chapter cards, play, death and the end,
// with fades in between.
import { isTouch, PLAYER } from "./config.js";
import { clamp } from "./util.js";
import { game, input, resetStats } from "./state.js";
import { cv, fireBtn, swapBtn } from "./screen.js";
import { loadLevel } from "./world.js";

export function showCard(kind, idx) {
  game.card = { kind, idx }; game.state = "card"; game.fade = 0; game.fadeDir = 1; game.afterFade = null;
  if (document.pointerLockElement) document.exitPointerLock();
  input.wasLocked = false; input.firing = false;
  fireBtn.style.display = swapBtn.style.display = "none";
}

// A click, tap or Enter on a card
export function advance() {
  if (game.state === "title") { showCard("chapter", 0); return; }
  if (game.state !== "card" || game.fade < 0.6) return;
  const c = game.card;
  if (c.kind === "chapter") startLevel(c.idx);
  else if (c.kind === "dead") { game.player.hp = PLAYER.maxHp; startLevel(c.idx, true); }
  else if (c.kind === "end") { resetStats(); game.player = null; showCard("chapter", 0); }
}

export function requestLock() {
  if (!isTouch && cv.requestPointerLock) { try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
}

export function startLevel(i, retry) {
  if (!retry && i === 0) game.player = null; // a fresh run starts with just the revolver
  if (retry) game.player.ledger = false;
  loadLevel(i);
  game.state = "play"; game.fade = 0; game.fadeDir = 1;
  requestLock();
  if (isTouch) { fireBtn.style.display = "block"; swapBtn.style.display = "block"; }
}

export function fadeOut(fn, dur = 0.8) { game.fadeDir = -1 / dur; game.afterFade = fn; }

export function tickFade(dt) {
  if (!game.fadeDir) return;
  game.fade = clamp(game.fade + game.fadeDir * dt * (game.fadeDir > 0 ? 1.6 : 1), 0, 1);
  if (game.fadeDir < 0 && game.fade <= 0) { game.fadeDir = 0; const fn = game.afterFade; game.afterFade = null; if (fn) fn(); }
  else if (game.fadeDir > 0 && game.fade >= 1) game.fadeDir = 0;
}
