// The gun in your hands, seen the way you'd see it: from behind and above, the
// barrel running away from you toward the crosshair.
//
// Each gun is a small 3D model (tubes, extruded profiles, fingers) drawn once at
// load, far parts first, with the same perspective as the world. A model is drawn in
// several poses: at rest, two steps of recoil, mid-shot with a muzzle flash, and
// two steps of a reload.
//
// Model coordinates are centimeters: x to your right, y up, z forward along the
// barrel, with the bore on the z axis.
import { W, H, K } from "../config.js";
import { gray, bitmap } from "./bitmap.js";

const SKIN = 160, STEEL = 50, WOOD = 96, CLOTH = 40;
const LIGHT = norm([-0.45, -0.62, -0.64]);  // in view space (y down): a lamp above, behind and to your left

function norm(v) { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; }
const SHEEN = norm([-0.5, -0.86, -0.1]);     // surfaces turned this way catch a gleam
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// A drawing kit for one pose of one gun. `at` is where the model's origin sits
// relative to your eye (cm right, down, forward); `pitch` raises the muzzle, `roll`
// cants the gun, both turning about `pivot` (the grip). (cx, cy) is the crosshair in the bitmap.
function kit(g, cx, cy, { at, pitch = 0, roll = 0, pivot = [0, -5, -2] }) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const turn = ([x, y, z]) => { const x1 = x * cr - y * sr, y1 = x * sr + y * cr; return [x1, y1 * cp + z * sp, -y1 * sp + z * cp]; };
  const view = p => { const q = turn([p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]]); return [q[0] + pivot[0] + at[0], at[1] - q[1] - pivot[1], q[2] + pivot[2] + at[2]]; };
  const viewDir = n => { const q = turn(n); return [q[0], -q[1], q[2]]; };
  const scr = v => [cx + K * v[0] / v[2], cy + K * v[1] / v[2]];
  const P = p => { const v = view(p); return [...scr(v), K / v[2]]; };   // screen x, y, and pixels per cm there

  // One flat face. Skipped if it faces away from you; shaded by how squarely it faces the lamp.
  function face(pts, n, base, shine = 0.5) {
    const vs = pts.map(view), nv = norm(viewDir(n));
    if (dot(nv, vs[0]) >= 0) return false;
    const l = Math.max(0, dot(nv, LIGHT)), gleam = Math.max(0, dot(nv, SHEEN));
    g.fillStyle = g.strokeStyle = gray(base * (0.3 + 1.1 * l) + shine * 190 * gleam ** 5);
    g.lineWidth = 0.7; g.lineJoin = "round";
    g.beginPath(); for (const v of vs) g.lineTo(...scr(v)); g.closePath(); g.fill(); g.stroke();
    return true;
  }
  function line(a, b, wCm, v) {
    const A = P(a), B = P(b);
    g.strokeStyle = gray(v); g.lineWidth = Math.max(0.8, wCm * (A[2] + B[2]) / 2); g.lineCap = "round";
    g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
  }
  // A round bar along the barrel axis, centered on (x, y), from z0 back to z1 forward.
  // `flutes` cuts dark grooves along it; `cap(ring)` decorates the end facing you.
  function tube(x, y, r, z0, z1, base, { sides = 16, flutes = 0, cap, shine = 0.6 } = {}) {
    const ring = (z, rr = r) => Array.from({ length: sides }, (_, i) => { const a = i / sides * 6.2832; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr, z]; });
    const back = ring(z0), front = ring(z1);
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides, a = (i + 0.5) / sides * 6.2832;
      face([back[i], back[j], front[j], front[i]], [Math.cos(a), Math.sin(a), 0], base, shine);
    }
    for (let k = 0; k < flutes; k++) {
      const a = (k + 0.5) / flutes * 6.2832, n = [Math.cos(a), Math.sin(a), 0], p0 = [x + n[0] * r, y + n[1] * r, z0 + (z1 - z0) * 0.3];
      if (dot(viewDir(n), view(p0)) < -0.25 * Math.hypot(...view(p0))) line(p0, [p0[0], p0[1], z1], r * 0.34, base * 0.3);
    }
    if (face(back, [0, 0, -1], base * 0.8, 0.2) && cap) cap(rr => ring(z0 - 0.02, rr));
  }
  // A side profile, given as [z, y] points, extruded from x0 to x1
  function slab(profile, x0, x1, base, shine = 0.4) {
    let area = 0;
    profile.forEach(([z, y], i) => { const [z2, y2] = profile[(i + 1) % profile.length]; area += z * y2 - z2 * y; });
    const s = area > 0 ? 1 : -1;
    face(profile.map(([z, y]) => [x1, y, z]), [1, 0, 0], base, shine);
    profile.forEach(([z, y], i) => {
      const [z2, y2] = profile[(i + 1) % profile.length];
      face([[x0, y, z], [x1, y, z], [x1, y2, z2], [x0, y2, z2]], [0, -(z2 - z) * s, (y2 - y) * s], base, shine);
    });
    face(profile.map(([z, y]) => [x0, y, z]), [-1, 0, 0], base, shine);
  }
  const box = (x0, x1, y0, y1, z0, z1, base, shine) => slab([[z0, y0], [z1, y0], [z1, y1], [z0, y1]], x0, x1, base, shine);

  // A finger, thumb or arm: rounded segments through `pts`, `r` cm thick (one number, or one per point)
  function limb(pts, r, v, { crease = true, stripes = 0 } = {}) {
    const ps = pts.map(P), rad = i => (Array.isArray(r) ? r[i] : r) * ps[i][2];
    const pass = (grow, tone, dx = 0, dy = 0) => {
      g.strokeStyle = gray(tone); g.lineCap = g.lineJoin = "round";
      for (let i = 0; i < ps.length - 1; i++) {
        g.lineWidth = Math.max(1, (rad(i) + rad(i + 1)) * grow);
        g.beginPath(); g.moveTo(ps[i][0] + dx * rad(i), ps[i][1] + dy * rad(i)); g.lineTo(ps[i + 1][0] + dx * rad(i + 1), ps[i + 1][1] + dy * rad(i + 1)); g.stroke();
      }
    };
    pass(1.12, v * 0.45); pass(1, v * 0.82); pass(0.72, v, -0.14, -0.2); pass(0.24, Math.min(255, v * 1.22), -0.3, -0.42);
    if (crease) for (let i = 1; i < ps.length - 1; i++) {                 // a crease across each knuckle
      const dx = ps[i + 1][0] - ps[i - 1][0], dy = ps[i + 1][1] - ps[i - 1][1], l = Math.hypot(dx, dy) || 1, k = rad(i) * 0.6;
      g.strokeStyle = gray(v * 0.5); g.lineWidth = 1; g.beginPath();
      g.moveTo(ps[i][0] - dy / l * k, ps[i][1] + dx / l * k); g.lineTo(ps[i][0] + dy / l * k, ps[i][1] - dx / l * k); g.stroke();
    }
    for (let k = 0; k < stripes; k++) {                                   // pinstripes down a sleeve
      const o = (k + 0.5) / stripes * 1.5 - 0.75;
      g.strokeStyle = gray(v * 2.1); g.lineWidth = 0.8; g.beginPath();
      ps.forEach((p, i) => { const q = ps[Math.min(i + 1, ps.length - 1)], b = ps[Math.max(i - 1, 0)], dx = q[0] - b[0], dy = q[1] - b[1], l = Math.hypot(dx, dy) || 1; g.lineTo(p[0] - dy / l * o * rad(i), p[1] + dx / l * o * rad(i)); });
      g.stroke();
    }
  }
  // A soft-edged patch of skin: the back of a hand
  function patch(pts, v) {
    const ps = pts.map(P), ys = ps.map(p => p[1]), xs = ps.map(p => p[0]);
    const gr = g.createLinearGradient(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
    gr.addColorStop(0, gray(v * 1.1)); gr.addColorStop(0.55, gray(v * 0.9)); gr.addColorStop(1, gray(v * 0.68));
    const outline = w => { g.lineWidth = w; g.lineJoin = "round"; g.beginPath(); ps.forEach(p => g.lineTo(p[0], p[1])); g.closePath(); };
    g.strokeStyle = gray(v * 0.45); outline(ps[0][2] * 1.5); g.stroke();
    g.fillStyle = g.strokeStyle = gr; outline(ps[0][2] * 1.2); g.fill(); g.stroke();
  }
  // The muzzle flash: a ragged star with a white-hot core. Drawn first, so the barrel stands in front of it.
  function flash(p, cm) {
    const [x, y, s] = P(p), big = cm * s, rays = 11;
    for (const [k, tone] of [[1, 120], [0.72, 236]]) {
      g.fillStyle = gray(tone); g.beginPath();
      for (let i = 0; i < rays * 2; i++) {
        const a = i / (rays * 2) * 6.2832 + 0.3, r = i % 2 ? big * 0.34 * k : big * k * (0.62 + 0.38 * ((i * 7919) % 13) / 13);
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85);
      }
      g.closePath(); g.fill();
    }
    g.fillStyle = gray(255); g.beginPath(); g.arc(x, y, big * 0.3, 0, 6.2832); g.fill();
  }
  return { P, face, line, tube, slab, box, limb, patch, flash };
}

// Your right hand closed round a pistol grip whose front edge runs from (z, y) = (fz, -2.4)
// down and back to (fz - 2.4, -10.2): the same hold on both guns.
// Drawn in two halves, so the gun's frame can sit between the far fingers and the near palm.
function triggerFinger({ limb }, fz) {
  limb([[1.75, -2.5, fz - 0.4], [1.6, -2.7, fz + 2.6], [0.6, -3.1, fz + 3.9]], [0.9, 0.85, 0.75], SKIN * 0.9);
}
function rightHand({ limb, patch }, fz) {
  // the thumb, laid forward along the left of the frame
  limb([[-0.2, -1.5, fz - 2.8], [-1.75, -1.8, fz - 1.2], [-2.1, -2.4, fz + 1.2], [-1.9, -2.7, fz + 3.0]], [1.2, 1.1, 0.95, 0.82], SKIN);
  // three fingers come round the front of the grip; you see their ends on the left
  [[-3.8, 0.98], [-5.6, 0.95], [-7.3, 0.8]].forEach(([y, r]) => {
    const zf = fz + (y + 2.4) * 0.308;
    limb([[1.9, y, zf - 0.6], [0.7, y - 0.1, zf + 1.0], [-1.1, y - 0.2, zf + 0.8], [-1.85, y - 0.35, zf - 1.0]], r, SKIN * 0.94);
  });
  // the back of the hand, to the right of the grip and behind it, then wrist, cuff and sleeve
  patch([[0.6, -1.4, fz - 2.6], [3.1, -1.9, fz + 0.6], [3.7, -5, fz], [3.3, -8.6, fz - 1.4], [2.4, -10.6, fz - 4.8], [-0.4, -9.4, fz - 6], [-1.1, -3.4, fz - 4.2]], SKIN);
  limb([[3.3, -3.6, fz + 0.3], [3.5, -5.4, fz - 0.2], [3.2, -7.4, fz - 0.8]], 0.5, SKIN * 1.04, { crease: false });   // the ridge of knuckles
  limb([[1.4, -9, fz - 5.2], [2.4, -11.5, fz - 9]], 2.9, SKIN * 0.9, { crease: false });
  limb([[2.3, -11.2, fz - 8.6], [2.8, -12.4, fz - 10.4]], 3.3, 228, { crease: false });
  limb([[2.8, -12.4, fz - 10.4], [4.2, -15.5, fz - 15]], 3.7, CLOTH, { crease: false, stripes: 5 });
}

// ---- The revolver: a .38 with a four-inch barrel and walnut grips ----
// `open` (0..1) swings the cylinder out to the left for a reload.
function revolver(S, { flash, open = 0 }) {
  const { tube, slab, box, line } = S;
  if (flash) S.flash([0, 0.2, 18], 6.5);
  tube(0, -1.35, 0.5, 5.8, 12.6, STEEL * 0.85);                                    // ejector rod shroud
  tube(0, 0, 0.85, 5.8, 16, STEEL, { shine: 0.9 });                                // barrel
  slab([[14.4, 0.8], [15.9, 0.8], [15.7, 1.75], [15.0, 1.75]], -0.15, 0.15, 120);   // front sight
  triggerFinger(S, -0.4);
  box(-0.7, 0.7, -2.3, -1.5, -1, 5.8, STEEL * 0.9);                                // frame under the cylinder
  box(-0.75, 0.75, -2.0, 1.5, 5.3, 6.2, STEEL);
  const cx = -open * 2.5, cy = -0.25 - open * 1.0;
  tube(cx, cy, 1.85, 1.3, 5.3, STEEL * 1.15, {                                     // the cylinder
    flutes: 6, shine: 0.9,
    cap: ring => {                                                                 // six chambers: brass when loaded, dark when open
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * 6.2832 + 0.5, c = [cx + Math.cos(a) * 1.15, cy + Math.sin(a) * 1.15, 1.28];
        line(c, c, 0.78, open > 0.5 ? 16 : 170); if (open <= 0.5) line(c, c, 0.3, 90);
      }
    },
  });
  box(-0.5, 0.5, 1.5, 1.85, -1.2, 6.2, STEEL * 1.1, 0.9);                          // topstrap
  tube(0, -0.25, 1.45, -0.9, 1.3, STEEL, { shine: 0.8 });                          // recoil shield
  box(-0.75, 0.75, -2.2, 0.6, -2.0, 1.3, STEEL * 0.95);                            // back of the frame
  line([-0.16, 1.9, -1.25], [0.16, 1.9, -1.25], 0.22, 14);                         // rear sight notch
  slab([[-1.2, 1.3], [-1.7, 2.7], [-2.9, 3.0], [-2.7, 2.3], [-2.1, 0.8]], -0.3, 0.3, STEEL * 1.3, 0.9);   // hammer spur
  slab([[-2.0, -0.3], [-3.2, -1.4], [-4.2, -5], [-5.4, -9.6], [-2.8, -10.2], [-1.6, -6], [-0.4, -2.4]], -1.3, 1.3, WOOD);   // walnut grip
  rightHand(S, -0.4);
}

// ---- The tommy gun: finned barrel, drum magazine, vertical foregrip, walnut stock ----
// `drum: false` leaves the magazine off, mid-reload.
function tommy(S, { flash, drum = true }) {
  const { tube, slab, box, line, limb, patch } = S;
  if (flash) S.flash([0, 0.3, 69], 11);
  // left hand, far half: fingers coming round the front of the foregrip
  [[-4.2, 0.95], [-5.9, 1.0], [-7.6, 0.95], [-9.2, 0.8]].forEach(([y, r]) =>
    limb([[-2.2, y, 43.6], [-1.2, y, 45.4], [0.6, y - 0.1, 45.6], [1.7, y - 0.2, 44.2]], r, SKIN * 0.9));
  box(-1.5, 1.5, -2.6, -0.9, 37, 50, WOOD);                                        // handguard under the barrel
  slab([[40.2, -2.6], [43.8, -2.6], [44.3, -11], [40.6, -11.5]], -1.4, 1.4, WOOD);  // vertical foregrip
  tube(0, 0, 1.15, 62, 66.5, STEEL * 1.05, { shine: 0.9 });                         // compensator
  for (const z of [63.2, 64.4, 65.6]) line([-0.5, 1.17, z], [0.5, 1.17, z], 0.35, 12);
  slab([[64.2, 1.1], [65.4, 1.1], [65.2, 2.1], [64.6, 2.1]], -0.15, 0.15, 120);     // front sight
  tube(0, 0, 0.9, 59, 62, STEEL);
  for (let z = 57.5; z >= 38; z -= 1.5) {                                          // cooling fins
    tube(0, 0, 1.0, z + 0.7, z + 1.5, STEEL * 0.3, { shine: 0 });
    tube(0, 0, 1.65, z, z + 0.7, STEEL * 1.2, { shine: 1 });
  }
  // left hand, near half: thumb over the back of the foregrip, the back of the hand, the arm
  limb([[-2.4, -4.6, 41.5], [-0.9, -3.4, 39.8], [0.9, -3.6, 40.2]], [1.15, 1.05, 0.9], SKIN);
  patch([[-1.6, -3.4, 44.6], [-3.4, -4.6, 45], [-3.8, -8, 44], [-3.2, -10.6, 41.5], [-2.2, -10.4, 37.5], [-1.5, -4.4, 38.4]], SKIN);
  limb([[-3.5, -4.6, 44.6], [-3.9, -6.4, 44.4], [-3.7, -8.2, 43.6]], 0.5, SKIN * 1.04, { crease: false });
  limb([[-2.6, -8.6, 38.6], [-4.4, -10.6, 33.5]], 2.8, SKIN * 0.9, { crease: false });
  limb([[-4.2, -10.4, 34], [-5, -11.3, 31.8]], 3.2, 228, { crease: false });
  limb([[-5, -11.3, 31.8], [-11, -17, 16]], 3.6, CLOTH, { crease: false, stripes: 5 });
  // drum magazine: a wide flat can under the receiver, its ribbed back toward you
  if (drum) tube(0, -10.6, 8, 21, 27.5, STEEL * 0.8, {
    sides: 28, shine: 0.7,
    cap: ring => {
      const loop = (rr, tone, wd) => { const pts = ring(rr); pts.forEach((p, i) => line(p, pts[(i + 1) % pts.length], wd, tone)); };
      loop(6.9, 26, 0.3); loop(6.5, 92, 0.16); loop(2.2, 24, 0.5);
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.2832 + 0.2; line([Math.cos(a) * 2.8, -10.6 + Math.sin(a) * 2.8, 20.98], [Math.cos(a) * 6.2, -10.6 + Math.sin(a) * 6.2, 20.98], 0.45, 30); }
    },
  });
  triggerFinger(S, 9.5);
  slab([[9.5, -2.4], [6, -2.4], [3.6, -10.5], [6.6, -11.2], [8.6, -6]], -1.25, 1.25, WOOD);     // pistol grip
  box(-1.7, 1.7, -2.4, 1.9, 8, 38, STEEL * 1.05, 0.9);                              // receiver
  line([0, 1.93, 13], [0, 1.93, 35], 0.5, 16);                                      // bolt slot along the top
  box(-0.6, 0.6, 1.9, 2.9, 24, 26.2, STEEL * 1.3, 0.9);                             // cocking knob
  box(-1.1, 1.1, 1.9, 3.4, 8.6, 10, STEEL * 0.9);                                   // rear sight
  line([-0.2, 3.1, 8.55], [0.2, 3.1, 8.55], 0.5, 12);
  rightHand(S, 9.5);
  slab([[8, 0.6], [-11, -2.8], [-11, -9.5], [5, -3]], -1.3, 1.3, WOOD * 1.05);      // walnut stock, back to your shoulder
}

// Each gun's bitmaps cover a fixed patch of the screen, running past the bottom
// edge so arms and the stock always leave the picture.
// `shift` is the usual first-person cheat: the gun is modeled further below and beside
// your eye than it could be on screen, so you look down onto its top and side, and
// the picture is then slid back into the frame by this many pixels.
function pose(model, rect, opts) {
  return bitmap(rect.w, rect.h, g => model(kit(g, W / 2 - rect.x + rect.shift[0], H / 2 - rect.y + rect.shift[1], opts), opts));
}
function gunSet(model, rect, at, kick, reloadPoses) {
  const recoil = k => ({ at: [at[0], at[1] - k * 0.5, at[2] - k * kick.back], pitch: kick.rest + k * kick.rise });
  return {
    x: rect.x, y: rect.y,
    kick: [0, 0.5, 1].map(k => pose(model, rect, recoil(k))),       // at rest, then two steps of recoil
    flash: pose(model, rect, { ...recoil(1), flash: true }),
    reload: reloadPoses.map(o => pose(model, rect, { at, ...o })),  // into the reload and at the middle of it
  };
}

const REVOLVER_RECT = { x: W / 2 - 60, y: H - 260, w: 360, h: 276, shift: [-36, -116] };
const TOMMY_RECT = { x: W / 2 - 170, y: H - 260, w: 460, h: 276, shift: [-22, -58] };
export const GUN_ART = [
  gunSet(revolver, REVOLVER_RECT, [9, 13, 26], { rest: 0.03, rise: 0.16, back: 2.2 },
    [{ pitch: 0.2, roll: 0.25, open: 0.4 }, { pitch: 0.42, roll: 0.5, open: 1 }]),
  gunSet(tommy, TOMMY_RECT, [8, 15, 22], { rest: -0.04, rise: 0.035, back: 1.6 },
    [{ pitch: -0.05, roll: -0.2, pivot: [0, -5, 8] }, { pitch: -0.1, roll: -0.42, drum: false, pivot: [0, -5, 8] }]),
];
