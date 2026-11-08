// The gun in your hand. GUN_ART[weapon][0] is at rest, [1] is mid-shot with a muzzle flash.
import { gray, bitmap } from "./bitmap.js";

function muzzleFlash(g, x, y, big) {
  g.fillStyle = gray(255); g.beginPath();
  for (let i = 0; i < 20; i++) { const a = Math.PI + (i - 10) * 0.16, r = i % 2 ? big * 0.3 : big; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  g.closePath(); g.fill();
  const gr = g.createRadialGradient(x, y, 0, x, y, big * 1.4);
  gr.addColorStop(0, "rgba(255,255,255,0.7)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, big * 1.4, 0, 6.283); g.fill();
}
function hand(g, x, y, rot, s) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.fillStyle = gray(52); g.fillRect(10, -16, 90, 40);               // coat sleeve
  g.fillStyle = gray(236); g.fillRect(4, -14, 12, 36);               // shirt cuff
  g.fillStyle = gray(178); g.beginPath(); g.ellipse(-8, 4, 20, 16, 0, 0, 6.283); g.fill();
  g.fillStyle = gray(150); g.beginPath(); g.ellipse(-12, 12, 16, 7, 0.1, 0, 6.283); g.fill();
  g.strokeStyle = gray(120); g.lineWidth = 2;
  for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-22 + k * 7, -6); g.lineTo(-24 + k * 7, 10); g.stroke(); }
  g.restore();
}
function revolverArt(flash) {
  return bitmap(260, 180, g => {
    g.save(); g.translate(150, 112); g.rotate(0.38);
    // grip
    g.fillStyle = gray(84); g.beginPath(); g.moveTo(18, 4); g.lineTo(44, 40); g.lineTo(30, 52); g.lineTo(6, 14); g.closePath(); g.fill();
    g.strokeStyle = gray(60); g.lineWidth = 1; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(12 + k * 4, 10 + k * 5); g.lineTo(34 + k * 2, 38 + k); g.stroke(); }
    // frame and barrel
    g.fillStyle = gray(92); g.fillRect(-92, -9, 110, 15);
    g.fillStyle = gray(196); g.fillRect(-92, -9, 110, 3);
    g.fillStyle = gray(60); g.fillRect(-92, 3, 110, 3);
    g.fillStyle = gray(70); g.fillRect(-96, -15, 7, 7);
    // cylinder
    g.fillStyle = gray(108); g.fillRect(-6, -20, 34, 32);
    g.fillStyle = gray(60); for (let k = 0; k < 4; k++) g.fillRect(-2 + k * 8, -20, 3, 32);
    g.fillStyle = gray(190); g.fillRect(-4, -19, 30, 3);
    // hammer + trigger guard
    g.fillStyle = gray(80); g.fillRect(26, -22, 8, 9);
    g.strokeStyle = gray(80); g.lineWidth = 3; g.beginPath(); g.arc(14, 16, 9, 0, Math.PI); g.stroke();
    if (flash) muzzleFlash(g, -98, -2, 40);
    g.restore();
    hand(g, 170, 148, 0.55, 1.2);
  });
}
function tommyArt(flash) {
  return bitmap(340, 200, g => {
    g.save(); g.translate(190, 120); g.rotate(0.3);
    // wooden stock running back to the shoulder
    g.fillStyle = gray(98); g.beginPath(); g.moveTo(60, -12); g.lineTo(160, -4); g.lineTo(160, 30); g.lineTo(60, 12); g.closePath(); g.fill();
    g.strokeStyle = gray(74); g.lineWidth = 1; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(64, -8 + k * 4); g.lineTo(158, -1 + k * 6); g.stroke(); }
    // receiver
    g.fillStyle = gray(88); g.fillRect(-46, -14, 108, 24);
    g.fillStyle = gray(200); g.fillRect(-46, -14, 108, 3);
    g.fillStyle = gray(56); g.fillRect(-46, 7, 108, 3);
    g.fillStyle = gray(140); g.fillRect(30, -18, 10, 5);
    // finned barrel
    g.fillStyle = gray(76); g.fillRect(-120, -9, 76, 14);
    g.fillStyle = gray(150); for (let x = -116; x < -50; x += 6) g.fillRect(x, -11, 3, 18);
    g.fillStyle = gray(70); g.fillRect(-132, -6, 14, 8);
    // drum magazine
    g.fillStyle = gray(66); g.beginPath(); g.arc(4, 30, 30, 0, 6.283); g.fill();
    g.strokeStyle = gray(150); g.lineWidth = 3; g.beginPath(); g.arc(4, 30, 22, -2.6, -0.6); g.stroke();
    g.fillStyle = gray(160); g.beginPath(); g.arc(4, 30, 5, 0, 6.283); g.fill();
    // front grip
    g.fillStyle = gray(98); g.fillRect(-58, 8, 14, 32);
    if (flash) muzzleFlash(g, -136, -2, 46);
    g.restore();
    hand(g, 136, 132, 1.9, 1.0);
    hand(g, 244, 150, 0.6, 1.15);
  });
}
export const GUN_ART = [[revolverArt(false), revolverArt(true)], [tommyArt(false), tommyArt(true)]];
