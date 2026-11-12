// Moving between the title card, chapter cards, play, death and the end,
// with fades in between.
import { isTouch } from "./config.js";
import { clamp } from "./util.js";
import { game, stats, input, resetStats } from "./state.js";
import { cv, fireBtn, swapBtn } from "./screen.js";
import { loadLevel } from "./world.js";
import { startLift } from "./lift.js";
import { LEVELS } from "./levels.js";
import { resetIntertitles } from "./state.js";
import { music } from "./music.js";
import { SND } from "./audio.js";
import { loadGame, saveGame, clearGame } from "./settings.js";

export function showCard(kind, idx) {
  game.card = { kind, idx }; game.state = "card"; game.fade = 0; game.fadeDir = 1; game.afterFade = null;
  if (document.pointerLockElement) document.exitPointerLock();
  input.wasLocked = false; input.firing = false;
  fireBtn.style.display = swapBtn.style.display = "none";
  // The pianist plays quietly under the cards, and stops dead on CUT!
  if (kind === "dead" || kind === "escaped") music.stop(); else music.play("street", 0.6);
  SND.rain(false); SND.rotor(false);
  if (kind === "end") clearGame();   // the picture is over: next time starts from the top
}

// A click, tap or Enter on a card
export function advance() {
  if (game.state === "title") {
    // Pick up at the scene you last reached, carrying what you had
    const save = loadGame();
    if (save && LEVELS[save.idx]) {
      game.player = save.player; Object.assign(stats, { ...save.stats, secretsFound: new Set(save.stats.secretsFound) });
      showCard("chapter", save.idx);
    } else showCard("prologue");
    return;
  }
  if (game.state !== "card" || game.fade < 0.6) return;
  const c = game.card;
  if (c.kind === "prologue") showCard("controls");
  else if (c.kind === "controls") showCard("chapter", 0);
  else if (c.kind === "chapter") startLevel(c.idx);
  else if (c.kind === "dead" || c.kind === "escaped") startLevel(c.idx, true);
  else if (c.kind === "epilogue") showCard("end");
  else if (c.kind === "end") { resetStats(); game.player = null; showCard("chapter", 0); }
}

export function requestLock() {
  if (!isTouch && cv.requestPointerLock) { try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
}

// A snapshot of your loadout and stats as each scene begins, so a retry after
// "CUT!" really does rewind the reel: what you picked up or spent on the failed
// attempt is undone (only the retake count goes up).
let checkpoint = null;
const copyStats = () => ({ ...stats, secretsFound: new Set(stats.secretsFound) });

export function startLevel(i, retry) {
  if (retry && checkpoint) {
    game.player = structuredClone(checkpoint.player);
    Object.assign(stats, { ...checkpoint.stats, secretsFound: new Set(checkpoint.stats.secretsFound), deaths: stats.deaths });
  } else if (i === 0) { game.player = null; resetIntertitles(); } // a fresh run starts with just the revolver
  const prevLoadout = game.player && structuredClone(game.player);   // what you walked in with
  loadLevel(i);
  if (!retry || !checkpoint) {
    checkpoint = { player: structuredClone(game.player), stats: copyStats() };
    // Remember how far you've got (there's nothing to remember about the first scene)
    if (i > 0) saveGame({ idx: i, player: prevLoadout, stats: { ...stats, secretsFound: [...stats.secretsFound] } });
  }
  game.state = "play"; game.fade = 0; game.fadeDir = 1; input.touched = false;
  music.play(game.level.endOnBoss ? "chase" : game.level.rain ? "street" : "joint");
  SND.rain(!!game.level.rain); SND.rotor(!!game.level.endOnBoss);
  if (game.level.lift) startLift(game.level.lift);
  requestLock();
  if (isTouch) fireBtn.style.display = "block"; // SWAP appears once you have a second gun (hud.js)
}

export function fadeOut(fn, dur = 0.8) { game.fadeDir = -1 / dur; game.afterFade = fn; }

// A scene's iris opens a little slower than a card fades in
export function tickFade(dt) {
  if (!game.fadeDir) return;
  game.fade = clamp(game.fade + game.fadeDir * dt * (game.fadeDir > 0 ? (game.state === "card" ? 1.6 : 1.1) : 1), 0, 1);
  if (game.fadeDir < 0 && game.fade <= 0) { game.fadeDir = 0; const fn = game.afterFade; game.afterFade = null; if (fn) fn(); }
  else if (game.fadeDir > 0 && game.fade >= 1) game.fadeDir = 0;
}
