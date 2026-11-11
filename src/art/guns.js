// The gun in your hand, seen over your right shoulder.
// GUN_ART[weapon][0] is at rest, [1] is mid-shot with a muzzle flash.
// Each also carries a `pivot` (your wrist), which the renderer turns the gun around
// for the recoil kick and the reload tilt. The bitmaps run past the bottom of the
// frame, so your sleeve always goes off the edge of the picture.
import { gray, bitmap } from "./bitmap.js";

// ---- Shading helpers: everything is grayscale, so form comes from gradients ----
// A bar lit from above: bright top edge, dark underside (blued steel, wood)
function barGradient(g, y0, y1, top, mid, bottom) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, gray(top)); gr.addColorStop(0.35, gray(mid)); gr.addColorStop(1, gray(bottom));
  return gr;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function glint(g, x0, y0, x1, y1, w = 1.2, v = 250) {
  g.strokeStyle = gray(v); g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
}
// Fine diagonal crosshatch for checkered grips, inside the current clip
function checkering(g, x0, y0, x1, y1, step, v) {
  g.strokeStyle = gray(v); g.lineWidth = 0.7;
  for (let k = -(y1 - y0); k < x1 - x0; k += step) {
    g.beginPath(); g.moveTo(x0 + k, y0); g.lineTo(x0 + k + (y1 - y0), y1); g.stroke();
    g.beginPath(); g.moveTo(x0 + k, y1); g.lineTo(x0 + k + (y1 - y0), y0); g.stroke();
  }
}
// Wood grain: wavy dark streaks along the length of a piece
function grain(g, x0, y0, x1, y1, n, v) {
  g.strokeStyle = `rgba(${v},${v},${v},0.45)`; g.lineWidth = 0.8;
  for (let i = 0; i < n; i++) {
    const y = y0 + (y1 - y0) * (i + 0.5) / n;
    g.beginPath(); g.moveTo(x0, y);
    for (let x = x0; x <= x1; x += 6) g.lineTo(x, y + Math.sin(x * 0.11 + i * 1.7) * 1.4);
    g.stroke();
  }
}

function muzzleFlash(g, x, y, big) {
  // Bitmaps are cut out at a hard alpha edge, so no soft glow: a ragged star of
  // flame thrown forward, a small white-hot core and a ring of gray smoke.
  g.fillStyle = gray(92);
  for (const [dx, dy, r] of [[-0.35, -0.3, 0.3], [-0.55, 0.22, 0.26], [-0.1, 0.32, 0.2], [-0.75, -0.08, 0.24]]) {
    g.beginPath(); g.arc(x + dx * big, y + dy * big, r * big, 0, 6.283); g.fill();
  }
  const rays = 14;
  g.fillStyle = gray(236); g.beginPath();
  for (let i = 0; i < rays * 2; i++) {
    const a = (i / (rays * 2)) * 6.283, forward = Math.max(0, -Math.cos(a));   // longest pointing away from the gun
    const r = i % 2 ? big * 0.3 : big * (0.42 + 0.8 * forward ** 2) * (0.75 + 0.5 * ((i * 7919) % 13) / 13);
    g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.75);
  }
  g.closePath(); g.fill();
  g.fillStyle = gray(255); g.beginPath(); g.ellipse(x - big * 0.12, y, big * 0.32, big * 0.22, 0, 0, 6.283); g.fill();
}

// A pinstriped suit sleeve and white shirt cuff running from (x, y) off the edge of the frame at angle `rot`
function sleeve(g, x, y, rot, len, wid) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = barGradient(g, -wid / 2, wid / 2, 104, 70, 34);
  g.beginPath(); g.moveTo(0, -wid / 2); g.lineTo(len, -wid / 2 - 6); g.lineTo(len, wid / 2 + 6); g.lineTo(0, wid / 2); g.closePath(); g.fill();
  g.strokeStyle = "rgba(200,200,200,0.22)"; g.lineWidth = 1;
  for (let k = -wid / 2 + 4; k < wid / 2; k += 6) { g.beginPath(); g.moveTo(12, k); g.lineTo(len, k * 1.15); g.stroke(); } // pinstripes
  g.fillStyle = barGradient(g, -wid / 2, wid / 2, 250, 228, 170);                                                           // shirt cuff
  roundRect(g, -6, -wid / 2 + 2, 16, wid - 4, 3); g.fill();
  g.fillStyle = gray(150); g.beginPath(); g.arc(3, wid * 0.2, 2.6, 0, 6.283); g.fill();                                   // cufflink
  g.fillStyle = gray(252); g.beginPath(); g.arc(2.2, wid * 0.2 - 0.8, 1, 0, 6.283); g.fill();
  g.restore();
}
// A rounded, shaded segment of skin: a finger joint or a wrist
function capsule(g, x0, y0, x1, y1, w, v) {
  g.lineCap = "round";
  g.strokeStyle = gray(v - 70); g.lineWidth = w + 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = gray(v); g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = gray(Math.min(255, v + 28)); g.lineWidth = w * 0.3;
  g.beginPath(); g.moveTo(x0, y0 - w * 0.2); g.lineTo(x1, y1 - w * 0.2); g.stroke();
}
// A finger along a chain of points, with knuckle creases
function finger(g, pts, w, v = 150) {
  for (let i = 0; i < pts.length - 1; i++) capsule(g, ...pts[i], ...pts[i + 1], w, v - i * 4);
  g.fillStyle = gray(v - 64);
  for (let i = 1; i < pts.length - 1; i++) { g.beginPath(); g.arc(pts[i][0], pts[i][1], 1.2, 0, 6.283); g.fill(); }
}
// A hand closed round a grip, drawn in the gun's own coordinates. The fingertips wrap
// past the edge running from `top` to `bottom`; the back of the hand lies `palmFrom`..`depth`
// behind that edge, on the side away from `dir` (dir 1: fingers point toward the muzzle).
// `skipTop` leaves room at the top of the grip for a trigger finger. `wrist` is where the cuff is.
function gripHand(g, { top, bottom, depth, palmFrom = 0, n = 3, skipTop = 0, wrist, dir = 1, v = 150 }) {
  const len = Math.hypot(bottom[0] - top[0], bottom[1] - top[1]);
  const ux = (bottom[0] - top[0]) / len, uy = (bottom[1] - top[1]) / len, fx = -uy * dir, fy = ux * dir;
  const P = (s, d) => [top[0] + ux * s - fx * d, top[1] + uy * s - fy * d];
  if (wrist) capsule(g, ...P(len * 0.55, (palmFrom + depth) / 2), ...wrist, depth - palmFrom + 4, v - 14);
  const pts = [P(skipTop - 3, palmFrom), P(skipTop - 4, depth), P(len + 4, depth), P(len + 3, palmFrom)];
  const ys = pts.map(q => q[1]);
  g.fillStyle = barGradient(g, Math.min(...ys), Math.max(...ys), v + 30, v, v - 62);
  g.strokeStyle = g.fillStyle; g.lineWidth = 8; g.lineJoin = "round";
  g.beginPath(); pts.forEach(q => g.lineTo(...q)); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = gray(v - 40); g.lineWidth = 1;                     // tendons on the back of the hand
  for (let i = 0; i < n; i++) { const s = skipTop + (len - skipTop) * (i + 0.5) / n; g.beginPath(); g.moveTo(...P(s, depth - 3)); g.lineTo(...P(s, palmFrom + (depth - palmFrom) * 0.7)); g.stroke(); }
  // Real fingers aren't a row of matching tubes: the middle one is longest, the little one thin and short
  const SHAPES = { 3: [[1.05, 4], [1.0, 2.5], [0.82, 0.5]], 4: [[1.0, 3], [1.06, 4.5], [1.0, 3], [0.8, 0.5]] }[n];
  const w = (len - skipTop) / SHAPES.reduce((a, [k]) => a + k, 0);
  let s0 = skipTop;
  const fingers = SHAPES.map(([k, reach], i) => { const fw = w * k, f = { s: s0 + fw / 2, fw, reach, i }; s0 += fw; return f; });
  for (const { s, fw, reach, i } of fingers.reverse()) {             // bottom finger first, so each one above overlaps it
    const base = P(s, palmFrom + (depth - palmFrom) * 0.55), mid = P(s, palmFrom * 0.5 + 2), tip = P(s, -reach);
    capsule(g, ...base, ...mid, fw * 0.95, v - i * 6);
    capsule(g, ...mid, ...tip, fw * 0.86, v - 8 - i * 6);
    g.strokeStyle = gray(v - 66); g.lineWidth = 1.1; g.beginPath();     // knuckle crease
    g.moveTo(mid[0] - ux * fw * 0.3, mid[1] - uy * fw * 0.3); g.lineTo(mid[0] + ux * fw * 0.3, mid[1] + uy * fw * 0.3); g.stroke();
  }
}

// Where a point in a gun's own coordinates lands in its bitmap
const toBitmap = (o, x, y) => [o.x + x * Math.cos(o.rot) - y * Math.sin(o.rot), o.y + x * Math.sin(o.rot) + y * Math.cos(o.rot)];

// ---- The revolver: a .38 with a four-inch barrel and walnut grips ----
// Drawn pointing left along the local x axis, then the whole thing is turned so
// the barrel points up toward the middle of the screen.
const REV = { x: 140, y: 100, rot: 0.36 };
function revolverArt(flash) {
  const art = bitmap(270, 210, g => {
    g.save(); g.translate(REV.x, REV.y); g.rotate(REV.rot);
    sleeve(g, 70, 46, 0.42, 170, 44);                                   // your arm, off the lower right
    // walnut grip behind the trigger guard
    g.save();
    g.beginPath(); g.moveTo(24, 6); g.lineTo(38, -10); g.quadraticCurveTo(46, 16, 58, 44); g.quadraticCurveTo(60, 56, 48, 58);
    g.quadraticCurveTo(40, 58, 38, 52); g.quadraticCurveTo(30, 30, 24, 6); g.closePath();
    g.fillStyle = barGradient(g, -10, 58, 120, 86, 40); g.fill(); g.clip(); checkering(g, 20, -10, 62, 60, 3.2, 58);
    g.restore();
    // frame
    g.fillStyle = barGradient(g, -16, 10, 150, 88, 34);
    g.beginPath(); g.moveTo(-12, -14); g.lineTo(38, -14); g.lineTo(40, -8); g.lineTo(28, 8); g.lineTo(-12, 8); g.closePath(); g.fill();
    // trigger guard and trigger
    g.strokeStyle = gray(56); g.lineWidth = 3.5; g.beginPath(); g.moveTo(-2, 8); g.quadraticCurveTo(0, 28, 16, 26); g.quadraticCurveTo(26, 24, 24, 8); g.stroke();
    g.strokeStyle = gray(130); g.lineWidth = 1; g.beginPath(); g.moveTo(-3, 9); g.quadraticCurveTo(-1, 26, 15, 24); g.stroke();
    g.fillStyle = gray(70); g.beginPath(); g.moveTo(6, 8); g.quadraticCurveTo(12, 16, 8, 21); g.lineTo(11, 21); g.quadraticCurveTo(16, 14, 10, 8); g.fill();
    // hammer with a checkered spur
    g.fillStyle = barGradient(g, -30, -10, 130, 80, 40);
    g.beginPath(); g.moveTo(32, -13); g.lineTo(38, -24); g.quadraticCurveTo(46, -31, 52, -25); g.lineTo(42, -11); g.closePath(); g.fill();
    g.strokeStyle = gray(50); g.lineWidth = 0.8; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(41 + k * 2.6, -28 + k); g.lineTo(46 + k * 2, -22 + k * 0.6); g.stroke(); }
    // cylinder, lit like a drum, with flutes
    g.fillStyle = barGradient(g, -20, 13, 196, 118, 40);
    roundRect(g, -8, -20, 38, 33, 5); g.fill();
    g.fillStyle = gray(52);
    for (const fy of [-13, -3, 6]) { roundRect(g, -2, fy - 2.2, 26, 4.4, 2.2); g.fill(); }
    g.fillStyle = gray(150); for (const fy of [-13, -3, 6]) g.fillRect(0, fy - 2.6, 22, 0.8);
    g.strokeStyle = gray(30); g.lineWidth = 1.2; g.beginPath(); g.moveTo(-8, -20); g.lineTo(-8, 13); g.moveTo(30, -20); g.lineTo(30, 13); g.stroke();
    glint(g, -4, -18, 26, -18, 1.4, 245);
    // topstrap and rear sight notch
    g.fillStyle = barGradient(g, -20, -13, 170, 110, 60); g.fillRect(-14, -20, 52, 6);
    g.fillStyle = gray(30); g.fillRect(33, -21, 3, 2);
    // barrel, with the ejector shroud underneath
    g.fillStyle = barGradient(g, 3, 11, 110, 64, 28); g.fillRect(-82, 3, 72, 7);
    g.fillStyle = barGradient(g, -10, 4, 210, 120, 38); g.fillRect(-104, -10, 96, 14);
    glint(g, -100, -9, -14, -9, 1.6, 252);
    glint(g, -96, -4, -40, -4, 0.8, 175);
    g.fillStyle = gray(90); g.fillRect(-104, -10, 4, 14);
    g.fillStyle = gray(12); g.beginPath(); g.ellipse(-104, -3, 1.6, 4.5, 0, 0, 6.283); g.fill();   // the bore
    g.fillStyle = barGradient(g, -17, -10, 180, 120, 60); g.beginPath(); g.moveTo(-100, -10); g.lineTo(-98, -17); g.lineTo(-92, -17); g.lineTo(-91, -10); g.fill(); // front sight
    // your hand: three fingers round the grip, the index finger in the guard on the trigger
    gripHand(g, { top: [24, 8], bottom: [38, 54], depth: 26, n: 3, skipTop: 10, wrist: [72, 46] });
    finger(g, [[48, 14], [42, -2], [34, -9]], 10, 140);                 // thumb, curled over the top of the grip
  finger(g, [[42, 4], [24, 12], [12, 14], [9, 19]], 9);
    if (flash) muzzleFlash(g, -110, -3, 42);
    g.restore();
  });
  art.pivot = toBitmap(REV, 72, 46);
  return art;
}

// ---- The tommy gun: finned barrel, drum magazine, vertical foregrip, walnut stock ----
const TOMMY = { x: 196, y: 116, rot: 0.3 };
function tommyArt(flash) {
  const art = bitmap(350, 230, g => {
    g.save(); g.translate(TOMMY.x, TOMMY.y); g.rotate(TOMMY.rot);
    sleeve(g, 74, 44, 0.42, 160, 42);                                   // right arm, off the lower right
    sleeve(g, -62, 72, 1.95, 140, 38);                                  // left arm, off the bottom
    // walnut buttstock running back to your shoulder
    g.save();
    g.beginPath(); g.moveTo(62, -12); g.lineTo(170, -6); g.lineTo(172, 36); g.lineTo(62, 14); g.closePath();
    g.fillStyle = barGradient(g, -12, 36, 140, 100, 52); g.fill(); g.clip(); grain(g, 60, -12, 172, 36, 7, 50);
    g.restore();
    glint(g, 66, -11, 166, -5, 1.2, 200);
    // pistol grip and trigger guard
    g.fillStyle = barGradient(g, 8, 50, 120, 84, 44);
    g.beginPath(); g.moveTo(36, 8); g.lineTo(60, 8); g.lineTo(60, 46); g.quadraticCurveTo(50, 52, 42, 46); g.closePath(); g.fill();
    g.strokeStyle = gray(56); g.lineWidth = 3.5; g.beginPath(); g.moveTo(12, 9); g.quadraticCurveTo(14, 26, 26, 25); g.quadraticCurveTo(36, 24, 36, 9); g.stroke();
    g.fillStyle = gray(70); g.beginPath(); g.moveTo(22, 9); g.quadraticCurveTo(27, 16, 23, 20); g.lineTo(26, 20); g.quadraticCurveTo(31, 14, 26, 9); g.fill();
    // receiver
    g.fillStyle = barGradient(g, -16, 12, 215, 120, 40); g.fillRect(-50, -16, 114, 26);
    g.fillStyle = gray(48); g.fillRect(-50, 6, 114, 4);
    glint(g, -46, -15, 60, -15, 1.6, 250);
    g.fillStyle = gray(50); g.fillRect(-10, -12, 40, 6);                                   // ejection port
    g.fillStyle = barGradient(g, -24, -14, 200, 140, 80); g.beginPath(); g.arc(18, -16, 4.5, Math.PI, 0); g.fill(); // cocking knob
    g.fillStyle = gray(70); g.fillRect(42, -24, 10, 8); g.fillStyle = gray(30); g.fillRect(45, -24, 4, 4);         // rear sight
    // finned barrel and compensator
    g.fillStyle = barGradient(g, -10, 6, 120, 76, 30); g.fillRect(-124, -10, 76, 16);
    for (let x = -120; x < -52; x += 5) { g.fillStyle = barGradient(g, -13, 9, 205, 120, 48); g.fillRect(x, -13, 3, 22); }
    g.fillStyle = barGradient(g, -9, 5, 170, 100, 40); g.fillRect(-142, -8, 20, 13);
    g.fillStyle = gray(25); for (const x of [-138, -132, -127]) g.fillRect(x, -8, 2, 4);    // compensator slots
    g.fillStyle = gray(12); g.beginPath(); g.ellipse(-142, -1.5, 1.6, 4.5, 0, 0, 6.283); g.fill();
    g.fillStyle = gray(90); g.fillRect(-140, -14, 3, 6);                                   // front sight
    // drum magazine: ribs and a winding key, lit like a tin can
    const dg = g.createRadialGradient(-4, 22, 4, 4, 32, 34);
    dg.addColorStop(0, gray(150)); dg.addColorStop(0.6, gray(80)); dg.addColorStop(1, gray(28));
    g.fillStyle = dg; g.beginPath(); g.arc(4, 32, 32, 0, 6.283); g.fill();
    g.strokeStyle = gray(40); g.lineWidth = 2; g.beginPath(); g.arc(4, 32, 26, 0, 6.283); g.stroke();
    g.strokeStyle = gray(170); g.lineWidth = 1; g.beginPath(); g.arc(4, 32, 27.5, -2.8, -0.9); g.stroke();
    g.fillStyle = gray(60); g.beginPath(); g.arc(4, 32, 7, 0, 6.283); g.fill();
    g.fillStyle = barGradient(g, 22, 42, 210, 150, 70); g.beginPath(); g.ellipse(4, 32, 4, 9, 0.6, 0, 6.283); g.fill(); // winding key
    // vertical foregrip
    g.fillStyle = barGradient(g, 6, 50, 140, 96, 46);
    g.beginPath(); g.moveTo(-64, 6); g.lineTo(-46, 6); g.lineTo(-44, 50); g.quadraticCurveTo(-54, 56, -62, 50); g.closePath(); g.fill();
    // left hand: the back of the hand in front of the foregrip, fingers wrapped round toward you
    gripHand(g, { top: [-46, 10], bottom: [-44, 48], depth: 34, palmFrom: 16, n: 4, dir: -1, wrist: [-62, 70], v: 146 });
    finger(g, [[-70, 8], [-56, 2], [-44, 4]], 9.5, 140);                 // left thumb over the top of the foregrip
    // right hand on the pistol grip, index finger on the trigger
    gripHand(g, { top: [36, 10], bottom: [42, 48], depth: 24, n: 3, skipTop: 6, wrist: [76, 44] });
    finger(g, [[54, 6], [38, 12], [27, 13], [24, 18]], 8.5);
    if (flash) muzzleFlash(g, -150, -1.5, 48);
    g.restore();
  });
  art.pivot = toBitmap(TOMMY, 76, 44);
  return art;
}

export const GUN_ART = [[revolverArt(false), revolverArt(true)], [tommyArt(false), tommyArt(true)]];
