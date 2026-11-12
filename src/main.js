// Entry point: sets up the screen and controls, then runs the frame loop.
import { isTouch } from "./config.js";
import { rand } from "./util.js";
import { game, input, stats } from "./state.js";
import { LEVELS } from "./levels.js";
import { ctx, view, watchScreen, resizeIfChanged } from "./screen.js";
import { wallAt, los, lightAt, SPAWNS } from "./world.js";
import { WALL_CHARS, SIDE_WALL_CHARS } from "./tiles.js";
import { AMMO } from "./config.js";
import { updatePlayer, collectPickups, tickPlayerEffects } from "./player.js";
import { updateEnemy, hurtPlayer } from "./enemies.js";
import { updateDoors, updateSecrets } from "./doors.js";
import { startLevel, tickFade } from "./flow.js";
import { installDesktopInput } from "./input/desktop.js";
import { installTouchInput } from "./input/touch.js";
import { buf, develop, projector, rain, iris } from "./render/film.js";
import { renderWorld } from "./render/raycaster.js";
import { drawHUD } from "./render/hud.js";
import { drawCard } from "./render/cards.js";
import { music } from "./music.js";
import { installPanel } from "./panel.js";
import { updateLift } from "./lift.js";
import { settings } from "./settings.js";

watchScreen();
installDesktopInput();
installTouchInput();
installPanel();
// Ask for the web fonts early so the title card doesn't flash in a fallback face
if (document.fonts) ["16px Limelight", "italic 700 16px 'Playfair Display'", "900 16px 'Playfair Display'", "16px 'Special Elite'"]
  .forEach(f => document.fonts.load(f).catch(() => {}));

function update(dt) {
  // While the death fade runs, the world keeps moving but you don't: no walking,
  // shooting, looting, pushing walls or slipping out the exit.
  const alive = game.state === "play";
  if (alive) updatePlayer(dt); else tickPlayerEffects(dt);
  updateDoors(dt);
  updateSecrets(dt);
  if (alive) updateLift(dt);
  for (const e of game.enemies) updateEnemy(e, dt);
  if (alive) collectPickups();
  if (game.msg.t > 0) game.msg.t -= dt;
}

let last = performance.now(), t = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  resizeIfChanged();
  const paused = input.menu || (game.state === "play" && input.wasLocked && !input.locked && !isTouch);
  // A dialogue card stops the action (and any fade) while it holds the screen
  const it = game.intertitle;
  if (it) { if (!paused) it.t -= dt; if (it.t <= 0) game.intertitle = null; }
  else {
    if ((game.state === "play" && !paused) || game.state === "dying" || game.state === "won" || game.state === "leaving") update(dt);
    tickFade(dt);
  }
  const { vw, vh, film } = view;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, vw, vh);
  const flicker = 0.93 + Math.random() * 0.07;
  const jitter = Math.random() < 0.03 ? rand(-2, 2) : 0;
  if (it) {
    ctx.save(); ctx.globalAlpha = Math.min(1, (it.dur - it.t) / 0.12, it.t / 0.12) * flicker;
    drawCard(t);
    ctx.restore();
    projector(0.8);
  } else if (["play", "dying", "won", "leaving"].includes(game.state) && game.level) {
    const p = game.player;
    renderWorld(t);
    // Scenes open and close with an iris (below); the picture itself only dims a little
    let bright = flicker * (0.5 + 0.5 * game.fade) * (p.flash > 0 ? 1.25 : 1) * (1 - p.hurt * 1.2);
    if (game.state === "dying") bright *= 0.7;
    // Riding the lift: the landings' lights slide past the gate
    const riding = game.lift && game.lift.phase === "ride" && !game.lift.done;
    if (riding) bright *= 0.62 + 0.38 * Math.abs(Math.sin(t * 2.6));
    develop(Math.max(0.05, bright));
    const shake = (p.hurt > 0 ? rand(-4, 4) * p.hurt * 3 : 0) + (riding ? rand(-1.2, 1.2) : 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buf, film.x + shake, film.y + jitter + shake, film.w, film.h);
    if (game.level.rain) rain(dt);
    projector();
    if (game.fade < 1) iris(game.fade);
    ctx.save(); ctx.globalAlpha = game.fade; drawHUD(); ctx.restore();
  } else {
    ctx.save(); ctx.globalAlpha = game.state === "card" ? game.fade * flicker : flicker;
    drawCard(t);
    ctx.restore();
    projector(0.8);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Hook for the automated tests in tests/
window.__mobber = {
  get state() { return game.state; }, get player() { return game.player; }, get enemies() { return game.enemies; },
  get objs() { return game.objs; }, get level() { return game.level; }, get card() { return game.card; }, get map() { return game.map; }, get doors() { return game.doors; }, get fade() { return game.fade; }, get navBlocked() { return game.navBlocked; }, get intertitle() { return game.intertitle; }, get smashed() { return game.smashed; }, get lift() { return game.lift; }, get cracking() { return game.cracking; }, lightAt, set dialogue(v) { game.dialogue = v; }, stats, LEVELS, AMMO, music, settings, startLevel, wallAt, los, hurtPlayer,
  TILES: { walls: WALL_CHARS, sideWalls: SIDE_WALL_CHARS, blockers: Object.keys(SPAWNS).filter(k => SPAWNS[k].block).join("") },
};
