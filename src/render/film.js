// The "film stock": the 3D view is drawn as brightness values into `luma`, then
// develop() adds vignette, grain and a slightly warm silver tint. projector()
// adds scratches and dust on top of the finished frame.
import { W, H } from "../config.js";
import { rand, clamp } from "../util.js";
import { ctx, view } from "../screen.js";

export const buf = document.createElement("canvas"); buf.width = W; buf.height = H;
const bctx = buf.getContext("2d");
const img = bctx.createImageData(W, H);
const out = new Uint32Array(img.data.buffer);
export const luma = new Float32Array(W * H);

// Brightness -> color: lifted blacks and a faint warm tint, like an old print
const LUT = new Uint32Array(256);
for (let v = 0; v < 256; v++) {
  const b = 9 + v * 0.95;
  const r = Math.min(255, b), g = Math.min(255, b * 0.97), bl = Math.min(255, b * 0.9);
  LUT[v] = (255 << 24) | ((bl | 0) << 16) | ((g | 0) << 8) | (r | 0);
}
const GRAIN = new Float32Array(256 * 256);
for (let i = 0; i < GRAIN.length; i++) GRAIN[i] = (Math.random() + Math.random() + Math.random() - 1.5) * 20;
const VIG = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
  VIG[y * W + x] = clamp(1.1 - 0.32 * Math.pow(dx * dx * 0.8 + dy * dy, 1.3), 0, 1.12);
}

// Full-screen noise for grain over the title cards
export const noiseCv = document.createElement("canvas"); noiseCv.width = 640; noiseCv.height = 360;
{
  const g = noiseCv.getContext("2d"), d = g.createImageData(640, 360);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
}

export function develop(bright) {
  const ox = (Math.random() * 256) | 0, oy = (Math.random() * 256) | 0;
  for (let y = 0; y < H; y++) {
    const gy = ((y + oy) & 255) << 8, row = y * W;
    for (let x = 0; x < W; x++) {
      const i = row + x;
      const v = luma[i] * VIG[i] * bright + GRAIN[gy | ((x + ox) & 255)];
      out[i] = LUT[v < 0 ? 0 : v > 255 ? 255 : v | 0];
    }
  }
  bctx.putImageData(img, 0, 0);
}

// Rain for street scenes: slanted streaks over the frame
const drops = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), s: rand(0.8, 1.3), l: rand(0.03, 0.07) }));
export function rain(dt) {
  const film = view.film;
  ctx.save(); ctx.beginPath(); ctx.rect(film.x, film.y, film.w, film.h); ctx.clip();
  ctx.strokeStyle = "rgba(220,220,220,0.18)"; ctx.lineWidth = 1; ctx.beginPath();
  for (const d of drops) {
    d.y += dt * d.s * 1.6; d.x -= dt * d.s * 0.18;
    if (d.y > 1) { d.y -= 1.1; d.x = Math.random() * 1.2; }
    if (d.x < 0) d.x += 1.2;
    const x = film.x + d.x * film.w, y = film.y + d.y * film.h;
    ctx.moveTo(x, y); ctx.lineTo(x - d.l * film.h * 0.12, y + d.l * film.h);
  }
  ctx.stroke(); ctx.restore();
}

// An iris: the picture opens from a point and closes back to one, as silent films
// began and ended their scenes. `open` runs from 0 (black) to 1 (the whole frame).
export function iris(open) {
  const film = view.film, w = Math.min(film.w, view.vw), cx = film.x + film.w / 2, cy = film.y + film.h / 2;
  const e = open * open * (3 - 2 * open), R = Math.hypot(w, film.h) / 2 * 1.04 * e;
  ctx.save(); ctx.beginPath(); ctx.rect(film.x, film.y, film.w, film.h); ctx.clip();
  ctx.fillStyle = "#000"; ctx.beginPath(); ctx.rect(film.x - 2, film.y - 2, film.w + 4, film.h + 4); ctx.arc(cx, cy, R, 0, 6.2832, true); ctx.fill("evenodd");
  if (R > 1) {   // a soft edge to the circle
    const g = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.9)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, 6.2832); ctx.fill();
  }
  ctx.restore();
}

// Projector artifacts on top of the frame
const scratches = [];
export function projector(intensity = 1) {
  const film = view.film;
  if (Math.random() < 0.06 * intensity) scratches.push({ x: Math.random(), life: rand(0.1, 0.6), w: rand(0.5, 1.5), dark: Math.random() < 0.5 });
  ctx.save(); ctx.beginPath(); ctx.rect(film.x, film.y, film.w, film.h); ctx.clip();
  for (let i = scratches.length - 1; i >= 0; i--) {
    const s = scratches[i]; s.life -= 1 / 60; s.x += rand(-0.002, 0.002);
    if (s.life <= 0) { scratches.splice(i, 1); continue; }
    ctx.fillStyle = s.dark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.22)";
    ctx.fillRect(film.x + s.x * film.w, film.y, s.w, film.h);
  }
  const n = Math.random() < 0.3 * intensity ? (Math.random() * 3) | 0 : 0;
  for (let i = 0; i < n; i++) {
    const x = film.x + Math.random() * film.w, y = film.y + Math.random() * film.h;
    ctx.strokeStyle = Math.random() < 0.6 ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.5)"; ctx.lineWidth = rand(0.8, 2);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + rand(-12, 12), y + rand(-12, 12), x + rand(-18, 18), y + rand(-18, 18)); ctx.stroke();
  }
  ctx.restore();
}
