// The camera follows the player. project() turns a world position into
// screen space; zbuf holds each screen column's wall distance for hiding sprites.
import { W, PLANE } from "../config.js";
import { game, eye } from "../state.js";

export const cam = { x: 0, y: 0, dirX: 1, dirY: 0, planeX: 0, planeY: PLANE };
export const zbuf = new Float32Array(W);

export function camera() {
  const a = game.player.a;
  cam.dirX = Math.cos(a); cam.dirY = Math.sin(a);
  cam.planeX = -cam.dirY * PLANE; cam.planeY = cam.dirX * PLANE;
  const e = eye(); cam.x = e.x; cam.y = e.y;
}

// Returns [sideways offset, depth, screen column]
export function project(x, y) {
  const { dirX, dirY, planeX, planeY } = cam;
  const rx = x - cam.x, ry = y - cam.y, inv = 1 / (planeX * dirY - dirX * planeY);
  const tX = inv * (dirY * rx - dirX * ry), tY = inv * (-planeY * rx + planeX * ry);
  return [tX, tY, (W / 2) * (1 + tX / tY)];
}
