// Outdoor art: the night sky, two-story building fronts and the entrances you
// walk to at the end of each street scene. Facades are 64x128 (two stories).
// Pixels brighter than the renderer's glow threshold (see config.js) shine on
// their own, so lit windows and signs read even in the dark.
import { rand } from "../util.js";
import { gray, bitmap, speckle } from "./bitmap.js";

function bricks(g, y0, y1, base = 88) {
  g.fillStyle = gray(46); g.fillRect(0, y0, 64, y1 - y0);
  for (let y = y0, r = 0; y < y1; y += 8, r++) {
    const off = r % 2 ? 8 : 0;
    for (let x = -16; x < 64; x += 16) { g.fillStyle = gray(base + rand(-18, 18)); g.fillRect(x + off + 1, y + 1, 14, 6); }
  }
}
function windowAt(g, x, y, w, h, lit) {
  g.fillStyle = gray(60); g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle = gray(lit ? 246 : 28); g.fillRect(x, y, w, h);
  if (lit) { g.fillStyle = gray(200); g.fillRect(x, y + h * 0.55, w, 2); g.fillStyle = gray(150); g.fillRect(x + w / 2 - 1, y, 2, h); } // blind and sash
  else { g.fillStyle = gray(70); g.fillRect(x + 2, y + 2, 3, h - 4); }
  g.fillStyle = gray(130); g.fillRect(x - 3, y + h + 2, w + 6, 2); // sill
}
function sign(g, text, x, y, w, h, size) {
  g.fillStyle = gray(18); g.fillRect(x, y, w, h);
  g.fillStyle = gray(250); g.font = `bold ${size}px monospace`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, x + w / 2, y + h / 2 + 1);
}

export const FACADES = {
  // Tenement: brick, two rows of windows, a fire escape
  H: bitmap(64, 128, g => {
    bricks(g, 0, 128, 84);
    windowAt(g, 10, 14, 14, 22, Math.random() < 0.5); windowAt(g, 40, 14, 14, 22, Math.random() < 0.4);
    windowAt(g, 10, 72, 14, 22, false); windowAt(g, 40, 72, 14, 22, Math.random() < 0.5);
    g.strokeStyle = gray(30); g.lineWidth = 2;
    for (const y of [42, 100]) { g.beginPath(); g.moveTo(4, y); g.lineTo(60, y); g.stroke(); for (let x = 6; x < 60; x += 6) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 8); g.stroke(); } }
    g.fillStyle = gray(40); g.fillRect(0, 0, 64, 3);
    speckle(g, 64, 128, 500, 0.3);
  }),
  // Storefront: a lit shop window under an awning, apartment window above
  F: bitmap(64, 128, g => {
    bricks(g, 0, 64, 96);
    windowAt(g, 24, 16, 16, 24, Math.random() < 0.6);
    g.fillStyle = gray(52); g.fillRect(0, 64, 64, 64);
    g.fillStyle = gray(244); g.fillRect(6, 82, 52, 34);
    g.fillStyle = gray(120); for (let x = 10; x < 56; x += 9) g.fillRect(x, 100, 5, 16 - (x % 3) * 3); // goods on display
    g.fillStyle = gray(70); g.fillRect(6, 98, 52, 2); g.fillRect(31, 82, 2, 34);
    for (let x = 0; x < 64; x += 8) { g.fillStyle = gray(x % 16 ? 70 : 165); g.fillRect(x, 66, 8, 12); } // striped awning
    g.fillStyle = gray(40); g.fillRect(0, 78, 64, 2); g.fillRect(0, 120, 64, 8);
  }),
  // The Blue Note's front: black lacquer, chrome strips and a lit poster
  U: bitmap(64, 128, g => {
    g.fillStyle = gray(22); g.fillRect(0, 0, 64, 128);
    g.fillStyle = gray(150); g.fillRect(2, 0, 2, 128); g.fillRect(60, 0, 2, 128);
    g.fillStyle = gray(60); g.fillRect(0, 0, 64, 6); g.fillRect(0, 118, 64, 10);
    g.fillStyle = gray(70); g.fillRect(14, 50, 36, 50);
    g.fillStyle = gray(244); g.fillRect(16, 52, 32, 46);
    g.fillStyle = gray(30);
    g.beginPath(); g.ellipse(28, 80, 5, 4, -0.4, 0, 6.283); g.fill(); g.fillRect(32, 62, 2, 18); g.fillRect(32, 62, 7, 3);
    g.font = "bold 6px monospace"; g.textAlign = "center"; g.fillText("HOT JAZZ", 32, 59); g.fillText("TONIGHT", 32, 93);
  }),
};

// The fence's place: a pawnbroker's three balls and a lit sign, beside the mouth of his alley
FACADES.K = bitmap(64, 128, g => {
  bricks(g, 0, 128, 80);
  windowAt(g, 24, 14, 16, 22, false);
  g.fillStyle = gray(30); g.fillRect(31, 60, 2, 12); g.fillRect(18, 71, 28, 2);                 // the bracket
  for (const [x, y] of [[20, 80], [32, 86], [44, 80]]) {                                      // three balls
    g.fillStyle = gray(30); g.fillRect(x - 0.6, 72, 1.2, y - 76);
    g.fillStyle = gray(236); g.beginPath(); g.arc(x, y, 5, 0, 6.283); g.fill();
    g.fillStyle = gray(150); g.beginPath(); g.arc(x + 1.4, y + 1.6, 3, 0, 6.283); g.fill();
    g.fillStyle = gray(255); g.beginPath(); g.arc(x - 1.6, y - 1.8, 1.3, 0, 6.283); g.fill();
  }
  sign(g, "LOANS", 8, 98, 48, 14, 11);
  g.fillStyle = gray(40); g.fillRect(0, 120, 64, 8);
  speckle(g, 64, 128, 400, 0.3);
});

// The hotel roof's parapet: a stone balustrade (only the top half shows on a waist-high wall)
FACADES.R = bitmap(64, 64, g => {
  g.fillStyle = gray(150); g.fillRect(0, 0, 64, 64);
  g.fillStyle = gray(185); g.fillRect(0, 0, 64, 6);                 // capstone
  g.fillStyle = gray(110); g.fillRect(0, 6, 64, 2);
  g.fillStyle = gray(60); g.fillRect(0, 8, 64, 22);                 // gaps between balusters
  for (let x = 4; x < 64; x += 10) {
    g.fillStyle = gray(165); g.beginPath(); g.ellipse(x + 3, 19, 3.2, 10, 0, 0, 6.283); g.fill();
    g.fillStyle = gray(200); g.fillRect(x + 1, 12, 1, 14);
  }
  g.fillStyle = gray(140); g.fillRect(0, 30, 64, 4);
  speckle(g, 64, 64, 300, 0.25);
});

// Entrances at the end of each street scene: the map's E square uses one of these
function entrance(title, size, draw) {
  return bitmap(64, 128, g => {
    draw(g);
    sign(g, title, 2, 40, 60, 14, size);
  });
}
export const ENTRANCES = {
  bluenote: entrance("BLUE NOTE", 9, g => {
    g.fillStyle = gray(22); g.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 12; i++) { g.fillStyle = gray(i % 2 ? 250 : 120); g.beginPath(); g.arc(4 + i * 5, 36, 1.5, 0, 6.283); g.fill(); } // marquee bulbs
    for (let x = 0; x < 64; x += 8) { g.fillStyle = gray(x % 16 ? 60 : 140); g.fillRect(x, 56, 8, 10); }
    g.fillStyle = gray(80); g.fillRect(12, 70, 40, 58); g.fillStyle = gray(56); g.fillRect(14, 72, 17, 56); g.fillRect(33, 72, 17, 56);
    g.fillStyle = gray(225); g.fillRect(28, 96, 2, 8); g.fillRect(34, 96, 2, 8);
    g.fillStyle = gray(246); g.fillRect(17, 76, 11, 8); g.fillRect(36, 76, 11, 8);
  }),
  pier: entrance("PIER 9", 11, g => {
    g.fillStyle = gray(70); g.fillRect(0, 0, 64, 128);
    g.fillStyle = gray(55); for (let x = 0; x < 64; x += 4) g.fillRect(x, 0, 2, 128); // corrugated iron
    g.fillStyle = gray(36); g.fillRect(8, 60, 48, 68);
    g.strokeStyle = gray(90); g.lineWidth = 2; for (let y = 64; y < 128; y += 10) { g.beginPath(); g.moveTo(8, y); g.lineTo(56, y); g.stroke(); }
    g.fillStyle = gray(246); g.beginPath(); g.arc(32, 26, 5, 0, 6.283); g.fill(); // lamp over the door
    g.fillStyle = gray(30); g.fillRect(24, 18, 16, 4);
  }),
  hotel: entrance("REGENT", 11, g => {
    g.fillStyle = gray(190); g.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 7; i++) { g.fillStyle = gray(i % 2 ? 120 : 210); g.beginPath(); g.moveTo(32, 36); g.lineTo(32 + Math.cos(Math.PI + i * Math.PI / 6) * 40, 36 + Math.sin(Math.PI + i * Math.PI / 6) * 40); g.lineTo(32 + Math.cos(Math.PI + (i + 1) * Math.PI / 6) * 40, 36 + Math.sin(Math.PI + (i + 1) * Math.PI / 6) * 40); g.fill(); }
    g.fillStyle = gray(30); g.fillRect(0, 56, 64, 8);
    for (let i = 0; i < 10; i++) { g.fillStyle = gray(250); g.beginPath(); g.arc(5 + i * 6, 60, 1.6, 0, 6.283); g.fill(); }
    g.fillStyle = gray(60); g.fillRect(10, 70, 44, 58);
    g.fillStyle = gray(246); for (const x of [13, 25, 37]) g.fillRect(x, 74, 10, 50); // revolving door glass
    g.fillStyle = gray(90); g.fillRect(31, 70, 2, 58);
  }),
};

// Night sky panorama, wrapped all the way around the horizon. Height is the top half of the view.
export function makeSky(width, height, dawn = false) {
  return bitmap(width, height, g => {
    const gr = g.createLinearGradient(0, 0, 0, height);
    if (dawn) { gr.addColorStop(0, gray(70)); gr.addColorStop(0.65, gray(150)); gr.addColorStop(1, gray(215)); }
    else { gr.addColorStop(0, gray(8)); gr.addColorStop(0.7, gray(34)); gr.addColorStop(1, gray(70)); }
    g.fillStyle = gr; g.fillRect(0, 0, width, height);
    if (dawn) {
      // The sun just clearing the skyline
      const sx = width * 0.62, sy = height * 0.92;
      const glow = g.createRadialGradient(sx, sy, 10, sx, sy, 220);
      glow.addColorStop(0, "rgba(255,255,255,0.9)"); glow.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = glow; g.fillRect(sx - 220, sy - 220, 440, 440);
    }
    if (!dawn) for (let i = 0; i < 320; i++) { g.fillStyle = `rgba(255,255,255,${rand(0.2, 0.7)})`; g.fillRect(rand(0, width), rand(0, height * 0.6), 1, 1); }
    // Moon with a halo (fading into the morning at dawn)
    const mx = 300, my = height * 0.28;
    const halo = g.createRadialGradient(mx, my, 6, mx, my, 60);
    halo.addColorStop(0, "rgba(255,255,255,0.35)"); halo.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = halo; g.fillRect(mx - 60, my - 60, 120, 120);
    g.fillStyle = gray(dawn ? 200 : 250); g.beginPath(); g.arc(mx, my, 13, 0, 6.283); g.fill();
    g.fillStyle = gray(215); g.beginPath(); g.arc(mx + 4, my - 3, 3, 0, 6.283); g.arc(mx - 5, my + 4, 2, 0, 6.283); g.fill();
    // Clouds drifting across
    for (let i = 0; i < 28; i++) {
      const cx = rand(0, width), cy = rand(height * 0.1, height * 0.55), w = rand(60, 160);
      const c = g.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
      c.addColorStop(0, "rgba(120,120,120,0.35)"); c.addColorStop(1, "rgba(120,120,120,0)");
      g.fillStyle = c; g.beginPath(); g.ellipse(cx, cy, w / 2, w / 7, 0, 0, 6.283); g.fill();
    }
    // Distant skyline along the horizon, with lit windows
    let x = 0;
    while (x < width) {
      const w = rand(14, 46), h = rand(height * 0.12, height * 0.42);
      g.fillStyle = gray(dawn ? rand(40, 70) : rand(14, 26)); g.fillRect(x, height - h, w, h);
      if (Math.random() < 0.15) { g.fillRect(x + w / 2 - 1, height - h - 14, 2, 14); } // spire
      for (let wy = height - h + 4; wy < height - 3; wy += 5) for (let wx = x + 3; wx < x + w - 3; wx += 5) {
        if (Math.random() < (dawn ? 0.04 : 0.18)) { g.fillStyle = gray(rand(170, 252)); g.fillRect(wx, wy, 2, 2); }
      }
      x += w + rand(0, 6);
    }
  });
}
