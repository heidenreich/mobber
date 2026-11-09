// 64x64 wall, floor and ceiling textures, drawn in code when the page loads.
import { rand } from "../util.js";
import { gray, bitmap, speckle } from "./bitmap.js";
import { FACADES } from "./streets.js";

export const TEX = {
  brick: bitmap(64, 64, g => {
    g.fillStyle = gray(48); g.fillRect(0, 0, 64, 64);
    for (let r = 0; r < 8; r++) { const off = r % 2 ? 8 : 0; for (let c = -1; c < 4; c++) { g.fillStyle = gray(92 + rand(-20, 22)); g.fillRect(c * 16 + off + 1, r * 8 + 1, 14, 6); } }
    speckle(g, 64, 64, 700, 0.35);
  }),
  paper: bitmap(64, 64, g => {
    g.fillStyle = gray(150); g.fillRect(0, 0, 64, 64);
    for (let x = 0; x < 64; x += 8) { g.fillStyle = gray(165); g.fillRect(x, 0, 2, 46); }
    g.strokeStyle = gray(105); g.lineWidth = 1;
    for (let y = 4; y < 44; y += 16) for (let x = 0; x < 64; x += 16) {
      g.beginPath(); g.moveTo(x + 8, y); g.lineTo(x + 13, y + 6); g.lineTo(x + 8, y + 12); g.lineTo(x + 3, y + 6); g.closePath(); g.stroke();
      g.fillStyle = gray(120); g.fillRect(x + 7, y + 5, 2, 2);
    }
    g.fillStyle = gray(62); g.fillRect(0, 46, 64, 18);
    g.fillStyle = gray(118); g.fillRect(0, 45, 64, 3);
    g.fillStyle = gray(45); for (let x = 0; x < 64; x += 16) g.fillRect(x, 50, 1, 14);
    speckle(g, 64, 64, 300, 0.2);
  }),
  panel: bitmap(64, 64, g => {
    g.fillStyle = gray(86); g.fillRect(0, 0, 64, 64);
    for (let x = 0; x < 64; x += 16) { g.fillStyle = gray(52); g.fillRect(x, 0, 1, 64); }
    g.strokeStyle = "rgba(30,30,30,0.35)";
    for (let i = 0; i < 18; i++) { const x = rand(0, 64); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + rand(-4, 4), 20, x + rand(-4, 4), 44, x + rand(-3, 3), 64); g.stroke(); }
    g.fillStyle = gray(124); g.fillRect(0, 28, 64, 3);
    g.strokeStyle = gray(60); g.lineWidth = 2; g.strokeRect(4, 36, 24, 24); g.strokeRect(36, 36, 24, 24); g.strokeRect(4, 4, 24, 20); g.strokeRect(36, 4, 24, 20);
  }),
  bar: bitmap(64, 64, g => {
    g.fillStyle = gray(32); g.fillRect(0, 0, 64, 64);
    for (const sy of [22, 42]) {
      let x = 2;
      while (x < 60) {
        const bw = rand(4, 6), bh = rand(10, 15), v = rand(70, 215);
        g.fillStyle = gray(v); g.fillRect(x, sy - bh, bw, bh); g.fillRect(x + bw / 2 - 1, sy - bh - 4, 2, 4);
        g.fillStyle = gray(Math.min(255, v + 40)); g.fillRect(x + 1, sy - bh + 2, 1, bh - 4);
        x += bw + rand(1, 3);
      }
      g.fillStyle = gray(140); g.fillRect(0, sy, 64, 3);
    }
    g.fillStyle = gray(88); g.fillRect(0, 50, 64, 14); g.fillStyle = gray(150); g.fillRect(0, 50, 64, 2);
  }),
  deco: bitmap(64, 64, g => {
    g.fillStyle = gray(200); g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 9; i++) {
      const a0 = Math.PI + i * Math.PI / 9, a1 = a0 + Math.PI / 18;
      g.fillStyle = gray(i % 2 ? 70 : 140); g.beginPath(); g.moveTo(32, 64);
      g.lineTo(32 + Math.cos(a0) * 70, 64 + Math.sin(a0) * 70); g.lineTo(32 + Math.cos(a1) * 70, 64 + Math.sin(a1) * 70); g.fill();
    }
    g.fillStyle = gray(230); g.beginPath(); g.arc(32, 64, 12, Math.PI, 0); g.fill();
    g.fillStyle = gray(40); g.fillRect(0, 0, 64, 3); g.fillRect(0, 61, 64, 3); g.fillRect(0, 0, 2, 64);
  }),
  door: bitmap(64, 64, g => {
    g.fillStyle = gray(30); g.fillRect(0, 0, 64, 64);
    g.fillStyle = gray(112); g.fillRect(10, 4, 44, 60);
    g.strokeStyle = gray(70); g.lineWidth = 2; g.strokeRect(16, 20, 32, 16); g.strokeRect(16, 42, 32, 18);
    g.fillStyle = gray(225); g.beginPath(); g.arc(47, 41, 2.5, 0, 6.283); g.fill();
    g.fillStyle = gray(15); g.fillRect(18, 7, 28, 10);
    g.fillStyle = gray(250); g.font = "bold 8px monospace"; g.textAlign = "center"; g.fillText("EXIT", 32, 15);
  }),
};
export const FLOORS = {
  checker: bitmap(64, 64, g => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = gray((x + y) % 2 ? 36 : 196); g.fillRect(x * 16, y * 16, 16, 16); }
    g.fillStyle = gray(110); for (let i = 0; i <= 64; i += 16) { g.fillRect(i, 0, 1, 64); g.fillRect(0, i, 64, 1); }
    speckle(g, 64, 64, 400, 0.3);
  }),
  concrete: bitmap(64, 64, g => {
    g.fillStyle = gray(96); g.fillRect(0, 0, 64, 64); speckle(g, 64, 64, 1600, 0.35);
    g.strokeStyle = gray(60); g.beginPath(); g.moveTo(5, 10); g.lineTo(20, 22); g.lineTo(26, 40); g.stroke();
    g.fillStyle = gray(70); g.fillRect(0, 0, 64, 1); g.fillRect(0, 0, 1, 64);
  }),
  carpet: bitmap(64, 64, g => {
    g.fillStyle = gray(58); g.fillRect(0, 0, 64, 64);
    g.strokeStyle = gray(95); g.lineWidth = 2;
    for (let y = 0; y < 64; y += 32) for (let x = 0; x < 64; x += 32) {
      g.beginPath(); g.moveTo(x + 16, y + 2); g.lineTo(x + 30, y + 16); g.lineTo(x + 16, y + 30); g.lineTo(x + 2, y + 16); g.closePath(); g.stroke();
      g.fillStyle = gray(120); g.fillRect(x + 14, y + 14, 4, 4);
    }
    speckle(g, 64, 64, 500, 0.25);
  }),
};
FLOORS.cobbles = bitmap(64, 64, g => {
  g.fillStyle = gray(40); g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) for (let x = (y / 8) % 2 ? -4 : 0; x < 64; x += 8) {
    g.fillStyle = gray(rand(70, 110)); g.beginPath(); g.ellipse(x + 4, y + 4, 3.4, 3, 0, 0, 6.283); g.fill();
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(x + 2, y + 2, 2, 1);   // wet highlight
  }
  speckle(g, 64, 64, 300, 0.3);
});

FLOORS.tar = bitmap(64, 64, g => {
  g.fillStyle = gray(72); g.fillRect(0, 0, 64, 64); speckle(g, 64, 64, 1800, 0.4);
  g.fillStyle = gray(52); g.fillRect(0, 31, 64, 2); g.fillRect(31, 0, 2, 64);   // tar seams
});

export const CEILS = {
  tin: bitmap(64, 64, g => {
    g.fillStyle = gray(118); g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) {
      g.fillStyle = gray(150); g.fillRect(x + 2, y + 2, 12, 2); g.fillRect(x + 2, y + 2, 2, 12);
      g.fillStyle = gray(80); g.fillRect(x + 2, y + 12, 12, 2); g.fillRect(x + 12, y + 2, 2, 12);
    }
  }),
  beams: bitmap(64, 64, g => {
    g.fillStyle = gray(40); g.fillRect(0, 0, 64, 64);
    g.fillStyle = gray(78); g.fillRect(0, 0, 64, 10); g.fillRect(0, 32, 64, 10);
    g.fillStyle = gray(25); g.fillRect(0, 10, 64, 2); g.fillRect(0, 42, 64, 2);
    speckle(g, 64, 64, 300, 0.3);
  }),
  plaster: bitmap(64, 64, g => {
    g.fillStyle = gray(150); g.fillRect(0, 0, 64, 64); speckle(g, 64, 64, 600, 0.15);
    g.strokeStyle = gray(120); g.strokeRect(0.5, 0.5, 63, 63);
  }),
};

// Map letter -> wall texture (see levels.js for the legend)
export const WALL_TEXTURES = { "#": TEX.brick, W: TEX.paper, P: TEX.panel, B: TEX.bar, T: TEX.deco, E: TEX.door, ...FACADES };

// Sliding door: wood with a frosted glass panel and a brass pull
export const DOOR_TEX = bitmap(64, 64, g => {
  g.fillStyle = gray(96); g.fillRect(0, 0, 64, 64);
  for (let x = 0; x < 64; x += 8) { g.fillStyle = gray(80); g.fillRect(x, 0, 1, 64); }
  g.strokeStyle = "rgba(30,30,30,0.3)";
  for (let i = 0; i < 12; i++) { const x = rand(0, 64); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + rand(-3, 3), 20, x + rand(-3, 3), 44, x, 64); g.stroke(); }
  g.fillStyle = gray(58); g.fillRect(14, 8, 36, 24);
  g.fillStyle = gray(182); g.fillRect(16, 10, 32, 20);
  g.strokeStyle = gray(150); g.lineWidth = 1;
  for (let k = -20; k < 40; k += 6) { g.beginPath(); g.moveTo(16 + k, 10); g.lineTo(36 + k, 30); g.stroke(); }
  g.strokeStyle = gray(60); g.lineWidth = 2; g.strokeRect(14, 38, 36, 20);
  g.fillStyle = gray(225); g.fillRect(52, 30, 3, 12); g.fillStyle = gray(150); g.fillRect(53, 31, 1, 10);
  g.fillStyle = gray(40); g.fillRect(0, 0, 2, 64); g.fillRect(62, 0, 2, 64);
});

// Secret walls look like their neighbors, plus faint scrape marks where they've been moved
function scuffed(src) {
  const L = src.L.slice(), A = src.A.slice(), H = src.h;
  for (const cx of [14, 40]) for (let r = 6; r <= 14; r += 2) {
    for (let a = 0.15; a < Math.PI - 0.15; a += 0.02) {
      const x = Math.round(cx + Math.cos(a) * r * 1.4), y = Math.round(H - Math.sin(a) * r * 0.6);
      if (x >= 0 && x < 64 && y >= 0 && y < H) L[y * 64 + x] *= 0.5;
    }
  }
  return { w: 64, h: H, L, A };
}
export const SECRET_TEXTURES = Object.fromEntries(Object.entries(WALL_TEXTURES).map(([k, t]) => [k, scuffed(t)]));
