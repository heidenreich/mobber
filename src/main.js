// Entry point: sets up the screen and controls, then runs the frame loop.
import { isTouch } from "./config.js";
import { rand } from "./util.js";
import { game, input } from "./state.js";
import { LEVELS } from "./levels.js";
import { ctx, view, watchScreen, resizeIfChanged } from "./screen.js";
import { wallAt } from "./world.js";
import { updatePlayer, collectPickups } from "./player.js";
import { updateEnemy } from "./enemies.js";
import { startLevel, tickFade } from "./flow.js";
import { installDesktopInput } from "./input/desktop.js";
import { installTouchInput } from "./input/touch.js";
import { buf, develop, projector } from "./render/film.js";
import { renderWorld } from "./render/raycaster.js";
import { drawHUD } from "./render/hud.js";
import { drawCard } from "./render/cards.js";

watchScreen();
installDesktopInput();
installTouchInput();
// Ask for the web fonts early so the title card doesn't flash in a fallback face
if (document.fonts) ["16px Limelight", "italic 700 16px 'Playfair Display'", "900 16px 'Playfair Display'", "16px 'Special Elite'"]
  .forEach(f => document.fonts.load(f).catch(() => {}));

function update(dt) {
  updatePlayer(dt);
  for (const e of game.enemies) updateEnemy(e, dt);
  collectPickups();
  if (game.msg.t > 0) game.msg.t -= dt;
}

let last = performance.now(), t = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  resizeIfChanged();
  const paused = game.state === "play" && input.wasLocked && !input.locked && !isTouch;
  if ((game.state === "play" && !paused) || game.state === "dying") update(dt);
  tickFade(dt);
  const { vw, vh, film } = view;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, vw, vh);
  const flicker = 0.93 + Math.random() * 0.07;
  const jitter = Math.random() < 0.03 ? rand(-2, 2) : 0;
  if ((game.state === "play" || game.state === "dying") && game.level) {
    const p = game.player;
    renderWorld(t);
    let bright = flicker * game.fade * (p.flash > 0 ? 1.25 : 1) * (1 - p.hurt * 1.2);
    if (game.state === "dying") bright *= 0.7;
    develop(Math.max(0.05, bright));
    const shake = p.hurt > 0 ? rand(-4, 4) * p.hurt * 3 : 0;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buf, film.x + shake, film.y + jitter + shake, film.w, film.h);
    projector();
    drawHUD();
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
  get objs() { return game.objs; }, get level() { return game.level; }, get card() { return game.card; }, LEVELS, startLevel, wallAt,
};
