// Turns 2D canvas drawings into grayscale bitmaps the renderer can sample:
// L holds brightness (0-255) and A holds alpha for each pixel.
import { clamp } from "../util.js";

export const gray = v => { v = clamp(v | 0, 0, 255); return `rgb(${v},${v},${v})`; };
export function bitmap(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); draw(g, w, h);
  const d = g.getImageData(0, 0, w, h).data, L = new Uint8Array(w * h), A = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { A[i] = d[i * 4 + 3]; L[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11; }
  return { w, h, L, A };
}
export function speckle(g, w, h, n, a) {
  for (let i = 0; i < n; i++) { const c = Math.random() < 0.5 ? 0 : 255; g.fillStyle = `rgba(${c},${c},${c},${a * Math.random()})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
}
