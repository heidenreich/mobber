// Silent-movie title cards: the title, chapter cards, "CUT!" and "THE END".
import { isTouch, FONTS, CREAM } from "../config.js";
import { game, stats } from "../state.js";
import { LEVELS, STORY } from "../levels.js";
import { ctx, view } from "../screen.js";
import { noiseCv } from "./film.js";

const { deco: DECO, serif: SERIF, type: TYPE } = FONTS;

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
  : [["Move", "W A S D  (Shift to run)"], ["Aim", "mouse"], ["Shoot", "click or Space"], ["Reload", "R"],
     ["Swap guns", "Q, or 1 and 2"], ["Search a wall", "E, or walk into it"], ["Pause", "Esc"]];

export function drawCard(t) {
  const f = view.cardRect, s = f.s, card = game.card;
  ctx.fillStyle = "#0b0a09"; ctx.fillRect(f.x, f.y, f.w, f.h);
  const cx = f.x + f.w / 2, Y = v => f.y + v * s;
  // The big cards (title, CUT!, THE END) get a faint sunburst rising behind the lettering
  const big = game.state === "title" || ["dead", "escaped", "end"].includes(card.kind);
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
  if (game.state === "title") {
    line("A MOBBER PICTURE", 96, `${10 * s}px ${TYPE}`, 0.8);
    line("MOBBER", 174, `${76 * s}px ${DECO}`);
    rule(200, 150);
    line("a gangland picture in three reels", 228, `italic 700 ${15 * s}px ${SERIF}`);
    if (view.portrait) line("best played sideways (turn off rotation lock)", 262, `${9 * s}px ${TYPE}`, 0.6);
    prompt("roll film");
  } else if (card.kind === "prologue") {
    line("PROLOGUE", 80, `${14 * s}px ${DECO}`, 0.85);
    line("Chicago, 1931", 120, `italic 700 ${26 * s}px ${SERIF}`);
    rule(142);
    STORY.prologue.forEach((c, i) => line(c, 178 + i * 21, `${12.5 * s}px ${TYPE}`, 0.92));
    prompt("continue");
  } else if (card.kind === "controls") {
    line("BEFORE THE PICTURE STARTS", 76, `${14 * s}px ${DECO}`, 0.85);
    rule(96);
    const top = 128, gap = HOW_TO.length > 6 ? 21 : 24;
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
    STORY.epilogue.forEach((c, i) => line(c, 146 + i * 24, `${i === STORY.epilogue.length - 1 ? "italic 700 " + 15 * s + "px " + SERIF : 12.5 * s + "px " + TYPE}`, 0.92));
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
  } else if (card.kind === "end") {
    const acc = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0, mm = Math.floor(stats.time / 60), ss = Math.floor(stats.time % 60);
    line("THE END", 118, `${60 * s}px ${DECO}`);
    rule(142);
    line("Eddie's name was cleared. The city got a new boss.", 172, `italic 700 ${16 * s}px ${SERIF}`);
    line(`${stats.kills} Vitale men down · $${stats.cash.toLocaleString()} collected · ${acc}% of shots on target`, 214, `${11 * s}px ${TYPE}`, 0.85);
    line(`Running time ${mm}:${String(ss).padStart(2, "0")} · secrets found: ${stats.secretsFound.size} · retakes: ${stats.deaths}`, 234, `${11 * s}px ${TYPE}`, 0.85);
    prompt("watch it again");
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
