// Gangsters (every pose), furniture, lamps, pickups and street props, drawn facing the camera.
import { rand } from "../util.js";
import { gray, bitmap } from "./bitmap.js";

// ---- People ----
// Drawn facing the camera at 128x128 (in 64-unit coordinates, doubled), lit from
// the upper left like everything else: each shape is light on its left edge and
// falls off into shadow on the right, so a figure reads even in a dark street.
const P_RES = 128;
// A gradient across a shape from x0 (lit side) to x1 (shadow side)
function across(g, x0, x1, v, lift = 34, drop = 38) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, gray(v + lift)); gr.addColorStop(0.3, gray(v)); gr.addColorStop(1, gray(v - drop));
  return gr;
}
function poly(g, pts, fill) { g.fillStyle = fill; g.beginPath(); pts.forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); g.fill(); }

// The guns gangsters carry, drawn along the x axis with the muzzle to the right
function longGun(g, kind) {
  if (kind === "tommy") {
    poly(g, [[-17, -1], [-9, -2.2], [-9, 2.2], [-17, 3.6]], gray(96));              // stock
    g.fillStyle = gray(34); g.fillRect(-9, -2.2, 13, 4.4);                           // receiver
    g.fillStyle = gray(120); g.fillRect(-9, -2.2, 13, 0.8);
    g.fillStyle = gray(26); g.fillRect(4, -1.3, 11, 2.6);                            // barrel
    g.fillStyle = gray(84); for (let x = 5; x < 13; x += 1.6) g.fillRect(x, -1.8, 0.7, 3.6);   // fins
    g.fillStyle = gray(22); g.beginPath(); g.arc(-1.5, 4.6, 4.6, 0, 6.283); g.fill(); // drum
    g.strokeStyle = gray(96); g.lineWidth = 0.7; g.beginPath(); g.arc(-1.5, 4.6, 3.2, 0, 6.283); g.stroke();
    g.fillStyle = gray(90); g.fillRect(5.5, 1.3, 2.2, 5);                            // foregrip
  } else {
    poly(g, [[-18, -0.6], [-8, -1.8], [-8, 2], [-18, 4]], gray(92));                 // shotgun stock
    g.fillStyle = gray(30); g.fillRect(-8, -1.8, 9, 3.8);
    g.fillStyle = gray(40); g.fillRect(1, -1.6, 17, 1.5); g.fillRect(1, 0.1, 17, 1.5);   // two barrels
    g.fillStyle = gray(130); g.fillRect(1, -1.6, 17, 0.5);
    g.fillStyle = gray(88); g.fillRect(3, 1.7, 8, 2);                                // fore-end
  }
}

// One figure. `pose` is idle, walk1, walk2, aim, fire or hurt.
function person(g, o, pose) {
  const cx = 32, aiming = pose === "aim" || pose === "fire";
  const stride = pose === "walk1" ? 1 : pose === "walk2" ? -1 : 0;
  g.save(); g.scale(P_RES / 64, P_RES / 64);
  // a pool of shadow at the feet
  g.fillStyle = gray(8); g.beginPath(); g.ellipse(cx + 1, 62.6, o.wide ? 15 : 13, 1.6, 0, 0, 6.283); g.fill();
  if (o.wide) { g.translate(cx, 64); g.scale(1.2, 1); g.translate(-cx, -64); }
  if (pose === "hurt") { g.translate(cx, 64); g.rotate(0.14); g.translate(-cx, -64); }
  if (stride) g.translate(0, -0.6);

  // legs and shoes: one foot forward when walking
  for (const side of [-1, 1]) {
    const fwd = stride * side, x = cx + side * 4.4 - 2.6, top = 47, len = 14.5 + fwd * 1.2;
    g.fillStyle = across(g, x, x + 5.2, o.pants - (fwd < 0 ? 14 : 0), 22, 24); g.fillRect(x, top, 5.2, len);
    g.fillStyle = gray(o.pants + 34); g.fillRect(x + 1.6, top + 2, 0.6, len - 3);      // trouser crease
    g.fillStyle = gray(o.spats ? 222 : 16); g.beginPath(); g.ellipse(x + 2.6 + side * 0.6, top + len + 0.8, 3.9, 1.7, 0, 0, 6.283); g.fill();
    if (o.spats) { g.fillStyle = gray(18); g.fillRect(x - 1.2 + side * 0.6, top + len + 1.2, 7.6, 1.4); }
  }

  // the overcoat: shoulders, a slight waist, a long skirt
  const sh = 11.5, hem = 12.5;
  const coat = [[cx - sh, 21], [cx - 5, 18.6], [cx + 5, 18.6], [cx + sh, 21], [cx + 10.4, 34], [cx + hem, 52], [cx - hem, 52], [cx - 10.4, 34]];
  poly(g, coat, across(g, cx - sh, cx + sh, o.coat));
  if (o.stripes) {
    g.save(); g.beginPath(); coat.forEach(([x, y]) => g.lineTo(x, y)); g.clip();
    g.strokeStyle = "rgba(255,255,255,0.3)"; g.lineWidth = 0.45;
    for (let x = -12; x <= 12; x += 2.4) { g.beginPath(); g.moveTo(cx + x, 19); g.lineTo(cx + x * 1.12, 52); g.stroke(); }
    g.restore();
  }
  g.strokeStyle = gray(o.coat - 46); g.lineWidth = 0.8;                                // the overlap and folds of the skirt
  g.beginPath(); g.moveTo(cx + 1.5, 30); g.lineTo(cx + 2.5, 52); g.moveTo(cx - 6, 40); g.lineTo(cx - 7.4, 52); g.moveTo(cx + 7, 42); g.lineTo(cx + 8.4, 52); g.stroke();
  if (o.belt) { g.fillStyle = gray(o.coat - 44); g.fillRect(cx - 10.6, 35, 21.2, 2.4); g.fillStyle = gray(170); g.fillRect(cx - 1.6, 34.8, 3.2, 2.8); g.fillStyle = gray(o.coat - 44); g.fillRect(cx - 0.8, 35.5, 1.6, 1.4); }
  g.fillStyle = gray(o.coat - 58); for (const y of [27, 31.5, 41, 45.5]) for (const x of [-2.6, 4.6]) { g.beginPath(); g.arc(cx + x, y, 0.75, 0, 6.283); g.fill(); }   // double-breasted buttons
  // shirt, tie and lapels
  poly(g, [[cx - 3.6, 18.8], [cx + 3.6, 18.8], [cx + 0.6, 29]], gray(232));
  poly(g, [[cx - 1.1, 19.4], [cx + 1.1, 19.4], [cx + 1.5, 26.5], [cx, 28.4], [cx - 1.5, 26.5]], gray(o.tie));
  poly(g, [[cx - 5.4, 18.6], [cx - 3.2, 18.6], [cx + 0.6, 29.6], [cx - 6.2, 25]], gray(o.coat + 22));
  poly(g, [[cx + 5.4, 18.6], [cx + 3.2, 18.6], [cx + 0.6, 29.6], [cx + 6.6, 25]], gray(o.coat - 20));

  // head: jaw, ears, a face mostly lost in the shadow of the hat brim
  g.fillStyle = gray(o.skin - 60); g.fillRect(cx - 2.4, 16.4, 4.8, 3);                 // neck
  g.fillStyle = across(g, cx - 5.2, cx + 5.2, o.skin, 26, 62);
  g.beginPath(); g.moveTo(cx - 5, 9); g.lineTo(cx + 5, 9); g.quadraticCurveTo(cx + 5.4, 15, cx + 2.4, 18); g.lineTo(cx - 2.4, 18); g.quadraticCurveTo(cx - 5.4, 15, cx - 5, 9); g.fill();
  g.fillStyle = gray(o.skin - 30); g.fillRect(cx - 5.9, 11.6, 1.1, 2.6); g.fillStyle = gray(o.skin - 80); g.fillRect(cx + 4.8, 11.6, 1.1, 2.6);
  g.fillStyle = "rgba(0,0,0,0.62)"; g.fillRect(cx - 5.2, 9, 10.4, 3.6);                // brim shadow over the eyes
  g.fillStyle = gray(o.skin + 34); g.fillRect(cx - 2.6, 10.8, 1.5, 0.7); g.fillRect(cx + 1.0, 10.8, 1.5, 0.7);   // a glint in each eye
  g.fillStyle = gray(o.skin + 30); g.fillRect(cx - 0.9, 11.6, 1.1, 2.8);                // nose
  g.fillStyle = gray(o.skin - 86); g.fillRect(cx - 2, 15.4, 4, 0.7);                   // mouth
  if (o.moustache) { g.fillStyle = gray(30); g.fillRect(cx - 2.4, 14.3, 4.8, 1); }
  if (o.cigar) { g.fillStyle = gray(78); g.fillRect(cx + 1, 15.1, 5.4, 1.5); g.fillStyle = gray(255); g.fillRect(cx + 6.2, 14.8, 1.6, 2.1); }
  // fedora: a wide brim, a pinched crown, a band
  g.fillStyle = across(g, cx - 10, cx + 10, o.hat, 30, 30); g.beginPath(); g.ellipse(cx, 8.8, 10, 2.1, -0.04, 0, 6.283); g.fill();
  poly(g, [[cx - 6, 8.4], [cx - 5.2, 2.2], [cx - 1.6, 1], [cx, 1.9], [cx + 1.8, 1], [cx + 5.2, 2.2], [cx + 6, 8.4]], across(g, cx - 6, cx + 6, o.hat, 30, 34));
  g.fillStyle = gray(o.band); g.fillRect(cx - 5.9, 5.8, 11.8, 2.3);
  g.fillStyle = gray(o.hat - 40); g.fillRect(cx - 0.3, 1.9, 0.7, 3.6);                 // the pinch

  // arms and the gun
  const sleeve = (x, y, w, h, shade) => { g.fillStyle = across(g, x, x + w, o.coat - shade, 26, 30); g.beginPath(); g.roundRect(x, y, w, h, 2); g.fill(); };
  const hand = (x, y) => { g.fillStyle = gray(o.skin - 6); g.beginPath(); g.ellipse(x, y, 2.3, 2, 0, 0, 6.283); g.fill(); };
  if (aiming) {
    // both arms brought up, the gun pointed straight at you
    sleeve(cx - 13, 21, 5.4, 11.5, 10); sleeve(cx + 7.6, 21, 5.4, 11.5, 30);
    poly(g, [[cx - 12.6, 30], [cx - 7.4, 30], [cx - 2.4, 27], [cx - 3.4, 31.6], [cx - 9, 34]], gray(o.coat - 6));
    poly(g, [[cx + 12.6, 30], [cx + 7.4, 30], [cx + 2.4, 27], [cx + 3.4, 31.6], [cx + 9, 34]], gray(o.coat - 34));
    if (o.weapon === "tommy") { g.fillStyle = gray(20); g.beginPath(); g.ellipse(cx, 33.6, 6.2, 5, 0, 0, 6.283); g.fill(); g.strokeStyle = gray(88); g.lineWidth = 0.7; g.beginPath(); g.ellipse(cx, 33.6, 4.4, 3.5, 0, 0, 6.283); g.stroke(); }
    const r = o.weapon === "shotgun" ? 2 : 2.5;
    g.fillStyle = gray(44); g.beginPath(); g.roundRect(cx - 3.2, 24.4, 6.4, 6.6, 1.4); g.fill();
    g.fillStyle = gray(150); g.fillRect(cx - 3.2, 24.4, 6.4, 0.8);
    g.fillStyle = gray(4);
    if (o.weapon === "shotgun") { g.beginPath(); g.arc(cx - 1.5, 27.6, 1.35, 0, 6.283); g.arc(cx + 1.5, 27.6, 1.35, 0, 6.283); g.fill(); }
    else { g.beginPath(); g.arc(cx, 27.6, r * 0.62, 0, 6.283); g.fill(); }
    g.fillStyle = gray(120); g.fillRect(cx - 0.4, 23.2, 0.8, 1.4);                     // front sight
    hand(cx - 4.4, 31.4); hand(cx + 4.4, 30.6);
    if (pose === "fire") {
      g.fillStyle = gray(255); g.beginPath();
      for (let i = 0; i < 18; i++) { const a = i * Math.PI / 9 + 0.2, rr = i % 2 ? 4.2 : 9 + (i * 7 % 5); g.lineTo(cx + Math.cos(a) * rr, 27.4 + Math.sin(a) * rr); }
      g.closePath(); g.fill();
    }
  } else if (o.weapon === "pistol") {
    sleeve(cx - 13.4, 21, 5, 17, 10); sleeve(cx + 8.4, 21, 5, 15.5, 30);
    hand(cx - 10.9, 38.6); hand(cx + 10.9, 37);
    g.fillStyle = gray(30); g.fillRect(cx + 9.6, 37.4, 2.6, 6.4); g.fillRect(cx + 9.6, 36, 5, 2.2);   // a pistol held low
  } else {
    // a long gun carried across the body, muzzle up over the left shoulder
    sleeve(cx - 13.4, 21, 5, 13.5, 10); sleeve(cx + 8.4, 21, 5, 15.5, 30);
    g.save(); g.translate(cx - 0.5, 34.5); g.rotate(pose === "hurt" ? -0.2 : -2.5); g.scale(1, -1); longGun(g, o.weapon); g.restore();
    hand(cx - 7.2, 31.2); hand(cx + 6.4, 37.2);
  }
  g.restore();
}
function personSet(o) {
  const f = pose => bitmap(P_RES, P_RES, g => person(g, o, pose));
  const k = P_RES / 64;
  return {
    idle: f("idle"), walk: [f("walk1"), f("walk2")], aim: f("aim"), fire: f("fire"), hurt: f("hurt"),
    fall: bitmap(P_RES, P_RES, g => { g.translate(50 * k, 64 * k); g.rotate(-0.72); g.translate(-32 * k, -64 * k); person(g, o, "hurt"); }),
    // sprawled on his back, hat rolled away
    dead: bitmap(P_RES, P_RES, g => {
      g.scale(k, k);
      g.fillStyle = gray(6); g.beginPath(); g.ellipse(30, 59.5, 25, 4.2, 0, 0, 6.283); g.fill();
      for (const [x, y, r] of [[44, 57.5, -0.1], [45, 60, 0.12]]) { g.save(); g.translate(x, y); g.rotate(r); g.fillStyle = across(g, 0, 15, o.pants, 20, 30); g.fillRect(0, -1.6, 15, 3.2); g.fillStyle = gray(o.spats ? 222 : 16); g.fillRect(14, -2.4, 3, 4); g.restore(); }
      const body = g.createLinearGradient(0, 53, 0, 62); body.addColorStop(0, gray(o.coat + 30)); body.addColorStop(1, gray(o.coat - 40));
      g.fillStyle = body; g.beginPath(); g.ellipse(30, 57.6, 16, 4.6, 0, 0, 6.283); g.fill();
      g.fillStyle = gray(232); poly(g, [[16.5, 55], [20, 56.6], [16.5, 58.4]], gray(232));
      g.fillStyle = across(g, 8, 16, o.skin, 20, 50); g.beginPath(); g.ellipse(12.4, 57, 3.9, 3.4, 0, 0, 6.283); g.fill();
      g.fillStyle = gray(o.coat - 14); g.save(); g.translate(26, 60.4); g.rotate(0.25); g.fillRect(-8, -1.5, 13, 3); g.restore();
      g.fillStyle = gray(o.skin - 10); g.beginPath(); g.ellipse(17, 62, 2, 1.5, 0, 0, 6.283); g.fill();
      g.fillStyle = gray(o.hat); g.beginPath(); g.ellipse(4.6, 61.4, 5.2, 1.7, 0, 0, 6.283); g.fill(); g.beginPath(); g.ellipse(4.6, 60.2, 3, 2, 0, Math.PI, 0); g.fill();
      g.fillStyle = gray(o.band); g.fillRect(1.8, 60.2, 5.6, 0.9);
    }),
  };
}
// Enemy sprite sets, keyed by the `art` name in config.js ENEMY_TYPES
export const PEOPLE = {};
PEOPLE.goon = personSet({ coat: 112, hat: 44, band: 16, pants: 60, tie: 30, skin: 172, weapon: "tommy", belt: true });
PEOPLE.heavy = personSet({ coat: 178, hat: 196, band: 44, pants: 70, tie: 44, skin: 164, weapon: "shotgun", wide: true, moustache: true });
PEOPLE.boss = personSet({ coat: 40, hat: 232, band: 20, pants: 36, tie: 228, skin: 176, weapon: "pistol", stripes: true, cigar: true, wide: true, spats: true });

export const OBJ = {
  table: bitmap(64, 64, g => {
    g.fillStyle = gray(212); g.beginPath(); g.moveTo(14, 40); g.lineTo(50, 40); g.lineTo(54, 63); g.lineTo(10, 63); g.closePath(); g.fill();
    g.strokeStyle = gray(170); for (let x = 16; x < 50; x += 6) { g.beginPath(); g.moveTo(x, 42); g.lineTo(x - 2 + (x - 32) * 0.1, 63); g.stroke(); }
    g.fillStyle = gray(235); g.beginPath(); g.ellipse(32, 40, 19, 3, 0, 0, 6.283); g.fill();
    g.fillStyle = gray(60); g.fillRect(31, 30, 2, 9); g.fillStyle = gray(250); g.beginPath(); g.moveTo(26, 31); g.lineTo(38, 31); g.lineTo(35, 24); g.lineTo(29, 24); g.fill();
    g.fillStyle = gray(90); g.fillRect(41, 31, 3, 8); g.fillRect(41.8, 28, 1.4, 3);
  }),
  crate: bitmap(128, 128, g => {
    g.scale(2, 2);
    g.fillStyle = gray(8); g.beginPath(); g.ellipse(33, 62.6, 27, 1.6, 0, 0, 6.283); g.fill();
    g.fillStyle = across(g, 8, 56, 122, 26, 44); g.fillRect(8, 18, 48, 45);                       // planks
    g.fillStyle = gray(70); for (let y = 18; y < 63; y += 9) g.fillRect(8, y, 48, 1);
    g.fillStyle = gray(150); for (let y = 19; y < 63; y += 9) g.fillRect(8, y, 48, 0.6);
    g.strokeStyle = across(g, 8, 56, 92, 30, 34); g.lineWidth = 4; g.strokeRect(10, 20, 44, 41);   // frame and brace
    g.beginPath(); g.moveTo(11, 21); g.lineTo(53, 60); g.stroke();
    g.fillStyle = gray(190); for (const [x, y] of [[10, 20], [54, 20], [10, 61], [54, 61]]) { g.beginPath(); g.arc(x, y, 0.9, 0, 6.283); g.fill(); }   // nail heads
    g.fillStyle = gray(26); g.font = "bold 9px monospace"; g.textAlign = "center"; g.fillText("RYE", 24, 34);
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
  barrel: bitmap(128, 128, g => {
    g.scale(2, 2);
    g.fillStyle = gray(8); g.beginPath(); g.ellipse(33, 62.6, 17, 1.6, 0, 0, 6.283); g.fill();
    g.fillStyle = across(g, 17, 47, 92, 40, 54); g.beginPath(); g.ellipse(32, 42, 15, 21, 0, 0, 6.283); g.fill();
    g.strokeStyle = gray(52); g.lineWidth = 0.6; for (const x of [-9, -4.5, 0, 4.5, 9]) { g.beginPath(); g.moveTo(32 + x * 0.8, 21.5); g.quadraticCurveTo(32 + x * 1.5, 42, 32 + x * 0.8, 62.5); g.stroke(); }   // staves
    for (const y of [27.5, 40.5, 53.5]) { const w = y === 40.5 ? 15 : 13.4; g.fillStyle = across(g, 32 - w, 32 + w, 50, 70, 30); g.fillRect(32 - w, y, w * 2, 2.6); }   // iron hoops
    g.fillStyle = across(g, 20, 44, 70, 30, 30); g.beginPath(); g.ellipse(32, 21.5, 11.5, 2.2, 0, 0, 6.283); g.fill();
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

// Street furniture
// A black 1930s sedan, side on: long hood, upright cabin, sweeping fenders, running board
OBJ.car = bitmap(256, 128, g => {
  g.scale(2, 2);
  g.fillStyle = gray(6); g.beginPath(); g.ellipse(64, 62.4, 58, 2, 0, 0, 6.283); g.fill();
  const body = g.createLinearGradient(0, 12, 0, 54);
  body.addColorStop(0, gray(120)); body.addColorStop(0.12, gray(52)); body.addColorStop(0.55, gray(26)); body.addColorStop(1, gray(12));
  // cabin and hood
  g.fillStyle = body;
  g.beginPath(); g.moveTo(8, 50); g.lineTo(9, 33); g.quadraticCurveTo(10, 30, 16, 30); g.lineTo(38, 29); g.quadraticCurveTo(40, 15, 50, 13.5); g.lineTo(84, 13.5);
  g.quadraticCurveTo(92, 14, 95, 28); g.lineTo(118, 31); g.quadraticCurveTo(122, 32, 122, 38); g.lineTo(122, 50); g.closePath(); g.fill();
  g.strokeStyle = gray(150); g.lineWidth = 0.8; g.beginPath(); g.moveTo(41, 15.5); g.quadraticCurveTo(46, 13.6, 52, 13.6); g.lineTo(84, 13.6); g.stroke();   // light along the roof
  // windows, with a streak of reflection
  for (const [x, w] of [[44, 13], [59, 14], [75, 13]]) {
    g.fillStyle = gray(58); g.beginPath(); g.roundRect(x, 17, w, 11.5, 1.6); g.fill();
    g.fillStyle = gray(128); g.beginPath(); g.moveTo(x + 2, 28); g.lineTo(x + 6, 17.4); g.lineTo(x + 8.4, 17.4); g.lineTo(x + 4.4, 28); g.fill();
  }
  g.fillStyle = gray(14); g.fillRect(57.2, 16.5, 1.6, 34); g.fillRect(73.4, 16.5, 1.6, 34);     // door pillars
  g.fillStyle = gray(190); g.fillRect(61, 33, 3.4, 1); g.fillRect(77, 33, 3.4, 1);             // door handles
  g.fillStyle = gray(168); g.fillRect(9, 34.6, 112, 1);                                         // chrome belt line
  g.fillStyle = gray(70); for (let x = 99; x < 117; x += 2.4) g.fillRect(x, 37, 1, 7);            // hood louvers
  g.fillStyle = gray(34); g.fillRect(34, 50, 62, 2.4); g.fillStyle = gray(120); g.fillRect(34, 50, 62, 0.6);   // running board
  // fenders sweeping over the wheels
  for (const x of [24, 104]) {
    const f = g.createLinearGradient(0, 34, 0, 50); f.addColorStop(0, gray(96)); f.addColorStop(0.25, gray(30)); f.addColorStop(1, gray(10));
    g.fillStyle = f; g.beginPath(); g.moveTo(x - 17, 51); g.quadraticCurveTo(x - 15, 35, x, 35); g.quadraticCurveTo(x + 15, 35, x + 17, 51); g.lineTo(x + 11.5, 51); g.arc(x, 51, 11.5, 0, Math.PI, true); g.closePath(); g.fill();
  }
  // wheels: whitewall tyres and spokes
  for (const x of [24, 104]) {
    g.fillStyle = gray(10); g.beginPath(); g.arc(x, 51.5, 10.5, 0, 6.283); g.fill();
    g.strokeStyle = gray(206); g.lineWidth = 1.8; g.beginPath(); g.arc(x, 51.5, 7.2, 0, 6.283); g.stroke();
    g.fillStyle = gray(40); g.beginPath(); g.arc(x, 51.5, 6, 0, 6.283); g.fill();
    g.strokeStyle = gray(130); g.lineWidth = 0.5; for (let a = 0; a < 6.283; a += 0.52) { g.beginPath(); g.moveTo(x, 51.5); g.lineTo(x + Math.cos(a) * 6, 51.5 + Math.sin(a) * 6); g.stroke(); }
    g.fillStyle = gray(200); g.beginPath(); g.arc(x, 51.5, 1.8, 0, 6.283); g.fill();
  }
  // headlamp, radiator shell, bumpers, spare on the back
  g.fillStyle = gray(150); g.fillRect(118.6, 30, 3.6, 16); g.fillStyle = gray(60); for (let y = 32; y < 45; y += 2) g.fillRect(119, y, 3, 0.8);
  g.fillStyle = gray(110); g.beginPath(); g.ellipse(115, 33.6, 3.6, 3.4, 0, 0, 6.283); g.fill();
  g.fillStyle = gray(255); g.beginPath(); g.ellipse(116.6, 33.6, 2.2, 2.8, 0, 0, 6.283); g.fill();
  g.fillStyle = gray(170); g.fillRect(120, 47.5, 6, 1.6); g.fillRect(2, 47.5, 7, 1.6);
  g.fillStyle = gray(14); g.beginPath(); g.ellipse(7.4, 38, 3, 8, 0, 0, 6.283); g.fill();
  g.strokeStyle = gray(120); g.lineWidth = 0.7; g.beginPath(); g.ellipse(7.4, 38, 1.8, 5.6, 0, 0, 6.283); g.stroke();
});
// A cast-iron street lamp with a glowing glass lantern
OBJ.lamppost = bitmap(64, 256, g => {
  g.scale(2, 2);
  g.fillStyle = across(g, 13.6, 18.4, 44, 60, 30); g.fillRect(14.4, 22, 3.2, 100);
  for (const [y, w, h] of [[118, 11, 10], [112, 7, 6], [44, 6.4, 2.4], [22, 6.4, 2]]) { g.fillStyle = across(g, 16 - w / 2, 16 + w / 2, 40, 60, 26); g.fillRect(16 - w / 2, y, w, h); }
  g.fillStyle = gray(34); poly(g, [[7, 9.4], [25, 9.4], [20, 3.6], [12, 3.6]], gray(34)); g.fillRect(15, 1, 2, 3);     // cap and finial
  poly(g, [[9, 9.4], [23, 9.4], [20.4, 21.4], [11.6, 21.4]], gray(255));                                               // the lit glass
  g.fillStyle = gray(60); g.fillRect(15.6, 9.4, 0.8, 12); g.fillRect(10.6, 20.8, 10.8, 1.4);
});
OBJ.hydrant = bitmap(64, 64, g => {
  g.fillStyle = gray(120); g.fillRect(26, 42, 12, 20); g.fillRect(22, 48, 20, 5); g.fillRect(24, 60, 16, 4);
  g.beginPath(); g.arc(32, 42, 6, Math.PI, 0); g.fill();
  g.fillStyle = gray(170); g.fillRect(28, 44, 2, 16);
});
OBJ.trash = bitmap(64, 64, g => {
  g.fillStyle = gray(96); g.fillRect(22, 40, 20, 24);
  g.fillStyle = gray(70); for (let x = 24; x < 42; x += 4) g.fillRect(x, 42, 1, 22);
  g.fillStyle = gray(120); g.beginPath(); g.ellipse(32, 39, 12, 3, 0, 0, 6.283); g.fill();
  g.fillStyle = gray(210); g.fillRect(36, 34, 6, 5);  // a newspaper sticking out
});
OBJ.newsstand = bitmap(64, 64, g => {
  g.fillStyle = gray(60); g.fillRect(8, 24, 48, 40);
  g.fillStyle = gray(30); g.fillRect(4, 20, 56, 6);
  g.fillStyle = gray(225); for (let i = 0; i < 4; i++) g.fillRect(12 + i * 11, 30, 9, 12);
  g.fillStyle = gray(60); for (let i = 0; i < 4; i++) { g.fillRect(13 + i * 11, 32, 7, 1); g.fillRect(13 + i * 11, 35, 5, 1); }
  g.fillStyle = gray(18); g.font = "bold 6px monospace"; g.textAlign = "center"; g.fillText("EXTRA!", 32, 54);
});

// Loot: a box of revolver rounds, and a dropped tommy gun
OBJ.rounds = bitmap(64, 64, g => {
  g.fillStyle = gray(150); g.fillRect(22, 50, 20, 13);
  g.fillStyle = gray(90); g.fillRect(22, 50, 20, 3);
  g.fillStyle = gray(30); g.font = "bold 6px monospace"; g.textAlign = "center"; g.fillText(".38", 32, 60);
  g.fillStyle = gray(220); for (let i = 0; i < 4; i++) { g.fillRect(24 + i * 5, 45, 3, 6); } // rounds poking out
  g.fillStyle = gray(160); for (let i = 0; i < 4; i++) { g.fillRect(24 + i * 5, 44, 3, 2); }
});
OBJ.tommy = bitmap(64, 64, g => {
  g.fillStyle = gray(36); g.fillRect(10, 54, 36, 5); g.fillRect(4, 55, 8, 3);
  g.fillStyle = gray(98); g.beginPath(); g.moveTo(44, 53); g.lineTo(60, 55); g.lineTo(60, 61); g.lineTo(44, 59); g.fill();
  g.fillStyle = gray(30); g.beginPath(); g.arc(28, 58, 6, 0, 6.283); g.fill();
  g.strokeStyle = gray(120); g.lineWidth = 1; g.beginPath(); g.arc(28, 58, 4, 0, 6.283); g.stroke();
  g.fillStyle = gray(150); for (let x = 12; x < 22; x += 3) g.fillRect(x, 53, 1, 7);
});

// The hotel roof
OBJ.watertower = bitmap(64, 128, g => {
  g.fillStyle = gray(40);
  for (const x of [12, 30, 48]) g.fillRect(x, 70, 4, 58);                    // legs
  g.strokeStyle = gray(40); g.lineWidth = 2; g.beginPath(); g.moveTo(14, 80); g.lineTo(50, 120); g.moveTo(50, 80); g.lineTo(14, 120); g.stroke();
  g.fillStyle = gray(96); g.fillRect(8, 26, 48, 46);                          // the wooden tank
  g.fillStyle = gray(70); for (let x = 8; x < 56; x += 6) g.fillRect(x, 26, 1, 46);
  g.fillStyle = gray(45); for (const y of [34, 50, 64]) g.fillRect(6, y, 52, 3); // iron hoops
  g.fillStyle = gray(80); g.beginPath(); g.moveTo(4, 27); g.lineTo(32, 6); g.lineTo(60, 27); g.closePath(); g.fill(); // conical roof
  g.fillStyle = gray(120); g.fillRect(31, 2, 2, 6);
});
OBJ.chimney = bitmap(32, 64, g => {
  g.fillStyle = gray(46); g.fillRect(6, 10, 20, 54);
  for (let y = 12, r = 0; y < 64; y += 6, r++) for (let x = 6 + (r % 2 ? 5 : 0); x < 26; x += 10) { g.fillStyle = gray(rand(80, 105)); g.fillRect(x, y, 9, 5); }
  g.fillStyle = gray(70); g.fillRect(4, 6, 24, 6);
});
OBJ.regentSign = bitmap(192, 64, g => {
  g.strokeStyle = gray(40); g.lineWidth = 3;
  for (const x of [20, 96, 172]) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, 64); g.stroke(); }
  g.beginPath(); g.moveTo(10, 60); g.lineTo(182, 60); g.stroke();
  g.fillStyle = gray(30); g.fillRect(4, 4, 184, 38);
  g.fillStyle = gray(250); g.font = "bold 30px serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("REGENT", 96, 24);
  for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(10 + i * 11.5, 6, 1.6, 0, 6.283); g.fill(); g.beginPath(); g.arc(10 + i * 11.5, 40, 1.6, 0, 6.283); g.fill(); }
});
OBJ.autogiro = bitmap(128, 96, g => {
  g.fillStyle = gray(30); g.fillRect(62, 14, 4, 26);                          // rotor mast
  g.fillStyle = gray(60); g.fillRect(4, 10, 120, 4);                         // rotor blades
  g.fillStyle = gray(110);
  g.beginPath(); g.moveTo(14, 58); g.quadraticCurveTo(40, 40, 92, 46); g.lineTo(120, 50); g.lineTo(120, 58); g.quadraticCurveTo(70, 70, 14, 66); g.closePath(); g.fill(); // fuselage
  g.fillStyle = gray(150); g.fillRect(30, 54, 64, 3);
  g.fillStyle = gray(40); g.fillRect(52, 44, 16, 10);                        // open cockpit
  g.fillStyle = gray(80); g.beginPath(); g.moveTo(112, 50); g.lineTo(126, 36); g.lineTo(126, 58); g.closePath(); g.fill(); // tail
  g.fillStyle = gray(70); g.fillRect(6, 52, 8, 14); g.fillStyle = gray(40); g.fillRect(2, 50, 3, 18); // propeller
  g.fillStyle = gray(30); g.fillRect(40, 66, 2, 16); g.fillRect(82, 64, 2, 18);
  for (const x of [41, 83]) { g.fillStyle = gray(15); g.beginPath(); g.arc(x, 84, 7, 0, 6.283); g.fill(); g.fillStyle = gray(150); g.beginPath(); g.arc(x, 84, 2.5, 0, 6.283); g.fill(); }
});
