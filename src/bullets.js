// Gangsters' bullets in flight. Each one travels in a straight line until a wall,
// a closed door or tall cover stops it, or it reaches you: step aside and it misses.
import { PLAYER, BULLETS } from "./config.js";
import { game, eye } from "./state.js";
import { SND } from "./audio.js";
import { wallAt } from "./world.js";
import { hurtPlayer } from "./enemies.js";

const inBox = (o, x, y) => { const h = (o.size || 0.28) * 0.9; return Math.abs(x - o.x) < h && Math.abs(y - o.y) < h; };

// `speed` defaults to BULLETS.speed. `drop` = { h, over }: fired from h up, reaching the ground after `over` squares.
export function spawnBullet(x, y, angle, dmg, speed = BULLETS.speed, drop = null) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  // Cover the shooter is standing right up against doesn't stop his own shot
  const skip = game.objs.filter(o => o.cover && inBox(o, x, y));
  game.bullets.push({ x, y, dx, dy, dmg, speed, drop, flown: 0, skip, whizzed: false });
}

export function updateBullets(dt) {
  const p = game.player, list = game.bullets;
  if (!list.length || !p) return;
  const e = eye(), leaning = Math.abs(p.lean || 0) > 0.05;
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    let left = b.speed * dt, gone = false;
    while (left > 0 && !gone) {
      const step = Math.min(left, BULLETS.step); left -= step;
      b.x += b.dx * step; b.y += b.dy * step; b.flown += step;
      if (b.flown > BULLETS.range || wallAt(b.x, b.y) || game.objs.some(o => o.cover && !b.skip.includes(o) && inBox(o, b.x, b.y))) { gone = true; break; }
      // Your body, and your head too when it's leaning out past it
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < PLAYER.bodyRadius || (leaning && Math.hypot(b.x - e.x, b.y - e.y) < PLAYER.headRadius)) { hurtPlayer(b.dmg); gone = true; break; }
      // A near miss, heard as it goes past
      if (!b.whizzed && d < BULLETS.whizz && (p.x - b.x) * b.dx + (p.y - b.y) * b.dy < 0) { b.whizzed = true; if (game.state === "play") SND.whizz(); }
    }
    if (gone) list.splice(i, 1);
  }
}
