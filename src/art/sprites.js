// Gangsters (every pose), furniture, lamps and pickups, drawn facing the camera.
import { gray, bitmap } from "./bitmap.js";

// People, drawn facing the camera
function person(g, o, pose) {
  const cx = 32;
  g.save();
  if (o.wide) { g.translate(cx, 64); g.scale(1.18, 1); g.translate(-cx, -64); }
  if (pose === "hurt") { g.translate(cx, 64); g.rotate(0.12); g.translate(-cx, -64); }
  g.fillStyle = gray(o.pants); g.fillRect(cx - 7, 46, 5, 16); g.fillRect(cx + 2, 46, 5, 16);
  g.fillStyle = gray(18); g.fillRect(cx - 8, 61, 7, 3); g.fillRect(cx + 1, 61, 7, 3);
  g.fillStyle = gray(o.coat); g.beginPath(); g.moveTo(cx - 10, 19); g.lineTo(cx + 10, 19); g.lineTo(cx + 12, 52); g.lineTo(cx - 12, 52); g.closePath(); g.fill();
  if (o.stripes) { g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 0.6; for (let x = -10; x <= 10; x += 3) { g.beginPath(); g.moveTo(cx + x, 20); g.lineTo(cx + x * 1.15, 52); g.stroke(); } }
  g.fillStyle = gray(228); g.beginPath(); g.moveTo(cx - 3, 19); g.lineTo(cx + 3, 19); g.lineTo(cx, 30); g.fill();
  g.fillStyle = gray(o.tie); g.fillRect(cx - 1, 20, 2, 9);
  g.strokeStyle = gray(o.coat - 35); g.lineWidth = 1; g.beginPath(); g.moveTo(cx, 30); g.lineTo(cx, 52); g.stroke();
  g.fillStyle = gray(o.skin); g.beginPath(); g.ellipse(cx, 13.5, 5, 6, 0, 0, 6.283); g.fill();
  g.fillStyle = gray(o.skin - 85); g.fillRect(cx - 5, 10, 10, 3);
  g.fillStyle = gray(o.hat); g.fillRect(cx - 9, 7.5, 18, 3);
  g.beginPath(); g.moveTo(cx - 6, 8); g.lineTo(cx - 5, 1); g.lineTo(cx + 5, 1); g.lineTo(cx + 6, 8); g.fill();
  g.fillStyle = gray(o.band); g.fillRect(cx - 6, 5.5, 12, 2);
  if (o.cigar) { g.fillStyle = gray(90); g.fillRect(cx + 1, 16, 5, 1.5); g.fillStyle = gray(255); g.fillRect(cx + 6, 15.6, 1.5, 2); }
  // Arms and the gun
  g.fillStyle = gray(o.coat - 12);
  if (pose === "aim" || pose === "fire") {
    g.fillRect(cx - 11, 22, 5, 12); g.fillRect(cx + 6, 22, 5, 12);
    g.fillStyle = gray(o.skin); g.fillRect(cx - 5, 31, 4, 3); g.fillRect(cx + 1, 29, 4, 3);
    if (o.weapon === "tommy") { g.fillStyle = gray(24); g.beginPath(); g.arc(cx, 34, 5, 0, 6.283); g.fill(); g.fillStyle = gray(70); g.beginPath(); g.arc(cx - 1, 33, 1.6, 0, 6.283); g.fill(); }
    g.fillStyle = gray(30); g.fillRect(cx - 2.5, 25, 5, 6);
    g.fillStyle = gray(5); g.beginPath(); g.arc(cx, 27, 1.6, 0, 6.283); g.fill();
    if (pose === "fire") {
      g.fillStyle = gray(255);
      g.beginPath();
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? 4 : 11; g.lineTo(cx + Math.cos(a) * r, 26 + Math.sin(a) * r); }
      g.closePath(); g.fill();
    }
  } else {
    g.fillRect(cx - 12, 21, 4, 18); g.fillRect(cx + 8, 21, 4, 16);
    g.save(); g.translate(cx, 36); g.rotate(pose === "hurt" ? 0.6 : -0.45);
    g.fillStyle = gray(26);
    if (o.weapon === "tommy") { g.fillRect(-13, -2, 26, 4); g.beginPath(); g.arc(-2, 3, 4, 0, 6.283); g.fill(); g.fillRect(-16, -1, 4, 6); }
    else if (o.weapon === "shotgun") { g.fillRect(-15, -1.5, 30, 3); g.fillRect(-16, -1, 6, 6); }
    else { g.fillRect(4, -2, 8, 3); g.fillRect(4, 0, 3, 5); }
    g.restore();
    g.fillStyle = gray(o.skin); g.fillRect(cx - 12, 37, 4, 3); g.fillRect(cx + 8, 35, 4, 3);
  }
  g.restore();
}
function personSet(o) {
  const f = pose => bitmap(64, 64, g => person(g, o, pose));
  return {
    idle: f("idle"), aim: f("aim"), fire: f("fire"), hurt: f("hurt"),
    fall: bitmap(64, 64, g => { g.translate(32, 64); g.rotate(-0.85); g.translate(-32, -64); person(g, o, "hurt"); }),
    dead: bitmap(64, 64, g => {
      g.fillStyle = gray(o.coat); g.beginPath(); g.ellipse(30, 58, 20, 5, 0, 0, 6.283); g.fill();
      g.fillStyle = gray(o.pants); g.fillRect(44, 56, 14, 4);
      g.fillStyle = gray(o.skin); g.beginPath(); g.ellipse(10, 57, 4, 3.5, 0, 0, 6.283); g.fill();
      g.fillStyle = gray(o.hat); g.beginPath(); g.ellipse(4, 61, 6, 2.5, 0, 0, 6.283); g.fill();
    }),
  };
}
// Enemy sprite sets, keyed by the `art` name in config.js ENEMY_TYPES
export const PEOPLE = {};
PEOPLE.goon = personSet({ coat: 74, hat: 34, band: 14, pants: 48, tie: 28, skin: 168, weapon: "tommy" });
PEOPLE.heavy = personSet({ coat: 182, hat: 200, band: 40, pants: 66, tie: 40, skin: 160, weapon: "shotgun", wide: true });
PEOPLE.boss = personSet({ coat: 30, hat: 232, band: 18, pants: 30, tie: 232, skin: 172, weapon: "pistol", stripes: true, cigar: true, wide: true });

export const OBJ = {
  table: bitmap(64, 64, g => {
    g.fillStyle = gray(212); g.beginPath(); g.moveTo(14, 40); g.lineTo(50, 40); g.lineTo(54, 63); g.lineTo(10, 63); g.closePath(); g.fill();
    g.strokeStyle = gray(170); for (let x = 16; x < 50; x += 6) { g.beginPath(); g.moveTo(x, 42); g.lineTo(x - 2 + (x - 32) * 0.1, 63); g.stroke(); }
    g.fillStyle = gray(235); g.beginPath(); g.ellipse(32, 40, 19, 3, 0, 0, 6.283); g.fill();
    g.fillStyle = gray(60); g.fillRect(31, 30, 2, 9); g.fillStyle = gray(250); g.beginPath(); g.moveTo(26, 31); g.lineTo(38, 31); g.lineTo(35, 24); g.lineTo(29, 24); g.fill();
    g.fillStyle = gray(90); g.fillRect(41, 31, 3, 8); g.fillRect(41.8, 28, 1.4, 3);
  }),
  crate: bitmap(64, 64, g => {
    g.fillStyle = gray(118); g.fillRect(8, 18, 48, 46);
    g.fillStyle = gray(80); for (let y = 18; y < 64; y += 9) g.fillRect(8, y, 48, 1);
    g.strokeStyle = gray(70); g.lineWidth = 3; g.strokeRect(9.5, 19.5, 45, 43); g.beginPath(); g.moveTo(10, 20); g.lineTo(54, 62); g.stroke();
    g.fillStyle = gray(30); g.font = "bold 10px monospace"; g.textAlign = "center"; g.fillText("RYE", 22, 34);
  }),
  piano: bitmap(64, 64, g => {
    g.fillStyle = gray(24); g.fillRect(4, 16, 56, 48);
    g.fillStyle = gray(56); g.fillRect(4, 16, 56, 4);
    g.fillStyle = gray(225); g.fillRect(6, 38, 52, 6);
    g.fillStyle = gray(20); for (let x = 8; x < 58; x += 4) if ((x / 4 | 0) % 7 !== 2 && (x / 4 | 0) % 7 !== 6) g.fillRect(x, 38, 2, 4);
    g.fillStyle = gray(200); g.fillRect(24, 22, 16, 10); g.fillStyle = gray(120); for (let y = 24; y < 31; y += 2) g.fillRect(26, y, 12, 1);
  }),
  lamp: bitmap(64, 64, g => {
    g.fillStyle = gray(40); g.fillRect(31, 18, 2, 44); g.beginPath(); g.ellipse(32, 62, 8, 2, 0, 0, 6.283); g.fill();
    g.fillStyle = gray(250); g.beginPath(); g.moveTo(24, 20); g.lineTo(40, 20); g.lineTo(36, 6); g.lineTo(28, 6); g.closePath(); g.fill();
    g.fillStyle = gray(200); g.fillRect(24, 19, 16, 2);
  }),
  hanging: bitmap(64, 64, g => {
    g.fillStyle = gray(30); g.fillRect(31.5, 0, 1, 22);
    g.fillStyle = gray(70); g.beginPath(); g.moveTo(32, 20); g.lineTo(44, 30); g.lineTo(20, 30); g.closePath(); g.fill();
    g.fillStyle = gray(255); g.beginPath(); g.arc(32, 31, 4, 0, 6.283); g.fill();
  }),
  barrel: bitmap(64, 64, g => {
    g.fillStyle = gray(76); g.beginPath(); g.ellipse(32, 42, 15, 22, 0, 0, 6.283); g.fill();
    g.fillStyle = gray(40); g.fillRect(16, 28, 32, 3); g.fillRect(16, 52, 32, 3);
    g.fillStyle = gray(110); g.fillRect(24, 22, 3, 38);
  }),
  cash: bitmap(64, 64, g => {
    for (let i = 0; i < 3; i++) { g.fillStyle = gray(150 - i * 10); g.fillRect(20 + i * 2, 52 - i * 4, 22, 6); g.fillStyle = gray(240); g.fillRect(29 + i * 2, 52 - i * 4, 4, 6); }
    g.fillStyle = gray(30); g.font = "bold 7px monospace"; g.fillText("$", 23, 50);
  }),
  medkit: bitmap(64, 64, g => {
    g.fillStyle = gray(225); g.fillRect(20, 46, 24, 17); g.fillStyle = gray(40); g.fillRect(30, 49, 4, 11); g.fillRect(26, 53, 12, 3);
    g.fillStyle = gray(150); g.fillRect(28, 43, 8, 3);
  }),
  ammo: bitmap(64, 64, g => {
    g.fillStyle = gray(34); g.beginPath(); g.arc(32, 52, 10, 0, 6.283); g.fill();
    g.strokeStyle = gray(110); g.lineWidth = 1.5; g.beginPath(); g.arc(32, 52, 7, 0, 6.283); g.stroke();
    g.fillStyle = gray(150); g.beginPath(); g.arc(32, 52, 2, 0, 6.283); g.fill();
  }),
  ledger: bitmap(64, 64, g => {
    g.fillStyle = gray(235); g.fillRect(21, 50, 22, 4);
    g.fillStyle = gray(36); g.fillRect(20, 44, 24, 7); g.fillStyle = gray(200); g.fillRect(23, 46, 18, 1);
    g.fillStyle = gray(36); g.fillRect(20, 53, 24, 3);
  }),
};
