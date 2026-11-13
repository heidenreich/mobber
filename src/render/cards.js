// Silent-movie title cards: the title, chapter cards, "CUT!" and "THE END".
import { isTouch, FONTS, CREAM } from "../config.js";
import { game, stats } from "../state.js";
import { LEVELS, STORY } from "../levels.js";
import { ctx, view } from "../screen.js";
import { noiseCv } from "./film.js";
import { loadGame, settings, saveSettings, DIFFICULTY } from "../settings.js";
import { drawPaper } from "./paper.js";

const { deco: DECO, serif: SERIF, type: TYPE } = FONTS;

// Where the difficulty names sit on the title card (screen pixels), so a click or tap can pick one
export const titleChoices = [];
export function setDifficulty(i) { settings.difficulty = Math.max(0, Math.min(DIFFICULTY.length - 1, i)); saveSettings(); }
// True if the click landed on a difficulty name (and so shouldn't start the picture)
export function chooseDifficultyAt(x, y) {
  if (game.state !== "title") return false;
  const hit = titleChoices.find(c => x >= c.x0 && x < c.x1 && y >= c.y0 && y < c.y1);
  if (hit) setDifficulty(hit.i);
  return !!hit;
}

// Art deco fan in each corner of the frame
function corner(x, y, sx, sy, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
  ctx.strokeStyle = CREAM; ctx.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) { const a = i * Math.PI / 12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 34 * s, Math.sin(a) * 34 * s); ctx.stroke(); }
  for (const r of [14, 22]) { ctx.beginPath(); ctx.arc(0, 0, r * s, 0, Math.PI / 2); ctx.stroke(); }
  ctx.restore();
}
// Controls, shown once before the first scene. Desktop and phone get their own list.
const HOW_TO = isTouch
  ? [["Walk and turn", "left thumb, anywhere"], ["Aim", "drag with your right thumb"], ["Shoot", "hold FIRE, or put a gangster under the crosshair"],
     ["Swap guns", "SWAP"], ["Reload", "by itself"], ["Search a wall", "walk into it"]]
  : [["Move", "W A S D  (Shift to run)"], ["Lean round a corner", "Z and C"], ["Aim", "mouse"], ["Shoot", "click or Space"], ["Reload", "R"],
     ["Swap guns", "Q, or 1, 2 and 3"], ["Search a wall", "E, or walk into it"], ["Pause", "Esc"], ["Music on or off", "M"]];

export function drawCard(t) {
  const f = view.cardRect, s = f.s, card = game.intertitle ? { kind: "intertitle" } : game.card || {};   // no card yet on the title
  if (card.kind === "end") { drawPaper(t); return; }
   // THE END is the morning paper (paper.js)
  ctx.fillStyle = "#0b0a09"; ctx.fillRect(f.x, f.y, f.w, f.h);
  const cx = f.x + f.w / 2, Y = v => f.y + v * s;
  // The big cards (title, CUT!, THE END) get a faint sunburst rising behind the lettering
  const big = !game.intertitle && game.state === "title" || ["dead", "escaped", "end"].includes(card.kind);
  if (big) {
    ctx.save(); ctx.beginPath(); ctx.rect(f.x, f.y, f.w, f.h); ctx.clip();
    ctx.fillStyle = "rgba(236,230,218,0.035)";
    for (let i = 0; i < 13; i++) {
      const a0 = Math.PI + (i * 2) * Math.PI / 25, a1 = a0 + Math.PI / 25;
      ctx.beginPath(); ctx.moveTo(cx, Y(400)); ctx.lineTo(cx + Math.cos(a0) * f.w, Y(400) + Math.sin(a0) * f.w); ctx.lineTo(cx + Math.cos(a1) * f.w, Y(400) + Math.sin(a1) * f.w); ctx.fill();
    }
    ctx.restore();
  }
  const m = 18 * s;
  ctx.strokeStyle = CREAM; ctx.lineWidth = 2.5; ctx.strokeRect(f.x + m, f.y + m, f.w - m * 2, f.h - m * 2);
  ctx.lineWidth = 0.8; ctx.strokeRect(f.x + m + 6 * s, f.y + m + 6 * s, f.w - m * 2 - 12 * s, f.h - m * 2 - 12 * s);
  corner(f.x + m + 6 * s, f.y + m + 6 * s, 1, 1, s); corner(f.x + f.w - m - 6 * s, f.y + m + 6 * s, -1, 1, s);
  corner(f.x + m + 6 * s, f.y + f.h - m - 6 * s, 1, -1, s); corner(f.x + f.w - m - 6 * s, f.y + f.h - m - 6 * s, -1, -1, s);
  // Lines are positioned in 640x360 card coordinates
  const line = (txt, y, font, a = 1) => { ctx.globalAlpha = a; ctx.font = font; ctx.fillStyle = CREAM; ctx.textAlign = "center"; ctx.fillText(txt, cx, Y(y)); ctx.globalAlpha = 1; };
  // A deco rule: two lines meeting at a diamond
  const rule = (y, half = 110) => {
    ctx.strokeStyle = ctx.fillStyle = CREAM; ctx.globalAlpha = 0.75; ctx.lineWidth = 1;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + d * 12 * s, Y(y)); ctx.lineTo(cx + d * half * s, Y(y)); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + d * half * s, Y(y), 1.6 * s, 0, 6.283); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(cx, Y(y - 5)); ctx.lineTo(cx + 6 * s, Y(y)); ctx.lineTo(cx, Y(y + 5)); ctx.lineTo(cx - 6 * s, Y(y)); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  };
  const blink = 0.6 + 0.3 * Math.sin(t * 3);
  const prompt = what => line(`— ${isTouch ? "tap" : "click"} to ${what} —`, 300, `${11 * s}px ${TYPE}`, blink);
  if (card.kind === "intertitle") {
    // A line of dialogue in the middle of a scene
    const it = game.intertitle, n = it.lines.length, y0 = 186 - (n - 1) * 17 + (it.who ? 8 : 0);
    if (it.who) { line(it.who, y0 - 44, `${12 * s}px ${DECO}`, 0.8); rule(y0 - 30, 70); }
    it.lines.forEach((c, i) => line(c, y0 + i * 34, `italic 700 ${26 * s}px ${SERIF}`));
  } else if (game.state === "title") {
    line("A MOBBER PICTURE", 96, `${10 * s}px ${TYPE}`, 0.8);
    line("MOBBER", 174, `${76 * s}px ${DECO}`);
    rule(200, 150);
    line("a gangland picture in three reels", 228, `italic 700 ${15 * s}px ${SERIF}`);
    // How hard a night do you want? Click or tap one (or use the arrow keys).
    ctx.font = `${11 * s}px ${TYPE}`;
    const names = DIFFICULTY.map(d => d.name), gap = 26 * s, widths = names.map(n => ctx.measureText(n).width);
    let x = cx - (widths.reduce((a, b) => a + b, 0) + gap * (names.length - 1)) / 2;
    titleChoices.length = 0;
    names.forEach((n, i) => {
      const on = i === settings.difficulty, w = widths[i], y = Y(258);
      ctx.globalAlpha = on ? 1 : 0.45; ctx.fillStyle = CREAM; ctx.textAlign = "left"; ctx.fillText(n, x, y);
      if (on) ctx.fillRect(x, y + 4 * s, w, Math.max(1, s));
      titleChoices.push({ x0: x - gap / 2, x1: x + w + gap / 2, y0: y - 16 * s, y1: y + 12 * s, i });
      x += w + gap;
    });
    ctx.globalAlpha = 1;
    if (view.portrait) line("best played sideways (turn off rotation lock)", 278, `${9 * s}px ${TYPE}`, 0.6);
    const save = loadGame(), at = save && LEVELS[save.idx];
    if (at) { prompt(`pick up at ${at.title}`); if (!isTouch) line("N to start over", 318, `${8.5 * s}px ${TYPE}`, 0.55); }
    else prompt("roll film");
  } else if (card.kind === "prologue") {
    line("PROLOGUE", 80, `${14 * s}px ${DECO}`, 0.85);
    line("Chicago, 1931", 120, `italic 700 ${26 * s}px ${SERIF}`);
    rule(142);
    STORY.prologue.forEach((c, i) => line(c, 178 + i * 21, `${12.5 * s}px ${TYPE}`, 0.92));
    prompt("continue");
  } else if (card.kind === "controls") {
    line("BEFORE THE PICTURE STARTS", 76, `${14 * s}px ${DECO}`, 0.85);
    rule(96);
    const n = HOW_TO.length, gap = n > 8 ? 18 : n > 6 ? 20 : 24, top = n > 8 ? 120 : n > 6 ? 124 : 128;
    HOW_TO.forEach(([what, how], i) => {
      const y = Y(top + i * gap);
      ctx.fillStyle = CREAM; ctx.font = `italic 700 ${13 * s}px ${SERIF}`; ctx.textAlign = "right"; ctx.fillText(what, cx - 14 * s, y);
      ctx.globalAlpha = 0.9; ctx.font = `${11.5 * s}px ${TYPE}`; ctx.textAlign = "left"; ctx.fillText(how, cx + 14 * s, y);
      ctx.globalAlpha = 0.5; ctx.fillRect(cx - 5 * s, y - 4 * s, 10 * s, 1); ctx.globalAlpha = 1;
    });
    prompt("continue");
  } else if (card.kind === "escaped") {
    line("HE GOT AWAY.", 138, `${46 * s}px ${DECO}`);
    rule(162);
    line("The autogiro climbs into the dawn with Don Vitale aboard.", 192, `italic 700 ${14 * s}px ${SERIF}`);
    line("The picture rewinds to the start of the reel.", 218, `${11 * s}px ${TYPE}`, 0.8);
    prompt("roll it again");
  } else if (card.kind === "epilogue") {
    line("EPILOGUE", 84, `${14 * s}px ${DECO}`, 0.85);
    rule(104);
    const lines = stats.mercy ? STORY.epilogueMercy : STORY.epilogue;   // what you did with the Don
    lines.forEach((c, i) => line(c, 146 + i * 24, `${i === lines.length - 1 ? "italic 700 " + 15 * s + "px " + SERIF : 12.5 * s + "px " + TYPE}`, 0.92));
    prompt("continue");
  } else if (card.kind === "chapter") {
    const L = LEVELS[card.idx];
    line(L.chapter, 84, `${14 * s}px ${DECO}`, 0.85);
    line(L.title, 132, `italic 700 ${34 * s}px ${SERIF}`);
    rule(154);
    L.card.forEach((c, i) => line(c, 190 + i * 21, `${12.5 * s}px ${TYPE}`, 0.92));
    prompt("continue");
  } else if (card.kind === "dead") {
    line("CUT!", 144, `${64 * s}px ${DECO}`);
    rule(168);
    line(`They got you at ${LEVELS[card.idx].title}.`, 198, `italic 700 ${16 * s}px ${SERIF}`);
    line("The picture rewinds to the start of the reel.", 224, `${11 * s}px ${TYPE}`, 0.8);
    prompt("roll it again");
  }
  // Dark corners, like a projected slide
  const vg = ctx.createRadialGradient(cx, Y(180), f.h * 0.35, cx, Y(180), f.w * 0.62);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vg; ctx.fillRect(f.x, f.y, f.w, f.h);
  // Grain over the card
  ctx.save(); ctx.globalAlpha = 0.09; ctx.globalCompositeOperation = "screen";
  ctx.drawImage(noiseCv, (Math.random() * 160) | 0, (Math.random() * 90) | 0, 480, 270, f.x, f.y, f.w, f.h);
  ctx.restore();
}
