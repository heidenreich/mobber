// The back room: between scenes, a man who sells what you need for what you've
// picked up. Shown only if you can afford something. Click or tap a line to buy it
// (or press its number); anywhere else, and you walk on.
import { isTouch, FONTS, CREAM, AMMO, PLAYER, WEAPONS } from "../config.js";
import { game, stats } from "../state.js";
import { LEVELS } from "../levels.js";
import { ctx, view } from "../screen.js";
import { SND } from "../audio.js";

const { deco: DECO, serif: SERIF, type: TYPE } = FONTS;

const rounds = (w, n) => ({
  have: p => p.has[w],
  full: p => (p.reserve[w] >= AMMO.maxReserve[w] ? "pockets full" : ""),
  take: p => { p.reserve[w] = Math.min(AMMO.maxReserve[w], p.reserve[w] + n); if (p.mag[w] === 0) { const k = Math.min(WEAPONS[w].mag, p.reserve[w]); p.mag[w] = k; p.reserve[w] -= k; } },
});
// What he sells. `have` hides a line you've no use for; `full` says why you can't buy it now.
export const SHOP = [
  { name: "A box of revolver rounds", note: "12 rounds", price: 150, ...rounds(0, 12) },
  { name: "A drum for the tommy gun", note: "30 rounds", price: 350, ...rounds(1, 30) },
  { name: "Shells for the sawn-off", note: "4 shells", price: 200, ...rounds(2, 4) },
  { name: "A doctor who asks no questions", note: "patches you up", price: 250, have: () => true,
    full: p => (p.hp >= PLAYER.maxHp ? "you're fit" : ""), take: p => { p.hp = Math.min(PLAYER.maxHp, p.hp + PLAYER.medkitHeal); } },
  { name: "A steel vest", note: "takes half of the next 60 points of harm", price: 700, have: () => true,
    full: p => (p.vest > 0 ? "you're wearing one" : ""), take: p => { p.vest = 60; } },
];
const onOffer = () => SHOP.filter(it => it.have(game.player));
// Is it worth stopping? Only before a scene you walk into, and only if you can afford something you can use.
export function shopOpen(idx) {
  const p = game.player;
  return !!p && !LEVELS[idx].endOnBoss && onOffer().some(it => stats.cash >= it.price && !it.full(p));
}
export function buy(n) {
  const p = game.player, it = onOffer()[n];
  if (!it || stats.cash < it.price || it.full(p)) { if (it) SND.click(); return false; }
  stats.cash -= it.price; it.take(p); SND.pickup("cash");
  return true;
}

export const shopRows = [];   // where each line sits on screen, for clicks and taps
const rows = shopRows;
// True if the click landed on a line of the list (bought or not), so it shouldn't walk you on
export function shopClickAt(x, y) {
  if (game.state !== "card" || !game.card || game.card.kind !== "shop") return false;
  const hit = rows.find(r => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1);
  if (hit) buy(hit.i);
  return !!hit;
}

export function drawShop(t) {
  const f = view.cardRect, s = f.s, cx = f.x + f.w / 2, Y = v => f.y + v * s, p = game.player;
  ctx.fillStyle = "#0b0a09"; ctx.fillRect(f.x, f.y, f.w, f.h);
  const m = 18 * s;
  ctx.strokeStyle = CREAM; ctx.lineWidth = 2.5; ctx.strokeRect(f.x + m, f.y + m, f.w - m * 2, f.h - m * 2);
  ctx.lineWidth = 0.8; ctx.strokeRect(f.x + m + 6 * s, f.y + m + 6 * s, f.w - m * 2 - 12 * s, f.h - m * 2 - 12 * s);
  ctx.fillStyle = CREAM; ctx.textAlign = "center";
  ctx.globalAlpha = 0.85; ctx.font = `${14 * s}px ${DECO}`; ctx.fillText("THE BACK ROOM", cx, Y(70)); ctx.globalAlpha = 1;
  ctx.font = `italic 700 ${20 * s}px ${SERIF}`; ctx.fillText(`“What'll it be? You've got $${stats.cash.toLocaleString()}.”`, cx, Y(104));
  ctx.globalAlpha = 0.6; ctx.fillRect(cx - 110 * s, Y(118), 220 * s, 1); ctx.globalAlpha = 1;
  // the list: number, what it is, what it does, what it costs
  const list = onOffer(), x0 = f.x + 120 * s, x1 = f.x + f.w - 120 * s, top = 146, gap = Math.min(30, 150 / list.length);
  rows.length = 0;
  list.forEach((it, i) => {
    const y = Y(top + i * gap), why = it.full(p), can = !why && stats.cash >= it.price;
    ctx.globalAlpha = can ? 1 : 0.4;
    ctx.textAlign = "left"; ctx.font = `${10 * s}px ${TYPE}`; if (!isTouch) ctx.fillText(String(i + 1), x0, y);
    ctx.font = `italic 700 ${13 * s}px ${SERIF}`; ctx.fillText(it.name, x0 + 16 * s, y);
    ctx.font = `${9 * s}px ${TYPE}`; ctx.fillText(why || it.note, x0 + 16 * s, y + 10 * s);
    ctx.textAlign = "right"; ctx.font = `${13 * s}px ${TYPE}`; ctx.fillText(`$${it.price}`, x1, y);
    ctx.globalAlpha = 1;
    rows.push({ x0: x0 - 8 * s, x1: x1 + 8 * s, y0: y - 13 * s, y1: y + 13 * s, i });
  });
  ctx.textAlign = "center"; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 3); ctx.font = `${11 * s}px ${TYPE}`;
  ctx.fillText(`— ${isTouch ? "tap a line to buy it; tap anywhere else" : "click a line to buy it; click anywhere else"} to walk on —`, cx, Y(300));
  ctx.globalAlpha = 1;
}
