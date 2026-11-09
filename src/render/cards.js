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
  for (let i = 0; i < 5; i++) { const a = i * Math.PI / 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 26 * s, Math.sin(a) * 26 * s); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0, 0, 14 * s, 0, Math.PI / 2); ctx.stroke();
  ctx.restore();
}

export function drawCard(t) {
  const f = view.cardRect, s = f.s, card = game.card;
  ctx.fillStyle = "#0b0a09"; ctx.fillRect(f.x, f.y, f.w, f.h);
  const m = 22 * s;
  ctx.strokeStyle = CREAM; ctx.lineWidth = 2; ctx.strokeRect(f.x + m, f.y + m, f.w - m * 2, f.h - m * 2);
  ctx.lineWidth = 0.8; ctx.strokeRect(f.x + m + 6 * s, f.y + m + 6 * s, f.w - m * 2 - 12 * s, f.h - m * 2 - 12 * s);
  corner(f.x + m + 6 * s, f.y + m + 6 * s, 1, 1, s); corner(f.x + f.w - m - 6 * s, f.y + m + 6 * s, -1, 1, s);
  corner(f.x + m + 6 * s, f.y + f.h - m - 6 * s, 1, -1, s); corner(f.x + f.w - m - 6 * s, f.y + f.h - m - 6 * s, -1, -1, s);
  // Lines are positioned in 640x360 card coordinates
  const cx = f.x + f.w / 2, Y = v => f.y + v * s;
  const line = (txt, y, font, a = 1) => { ctx.globalAlpha = a; ctx.font = font; ctx.fillStyle = CREAM; ctx.textAlign = "center"; ctx.fillText(txt, cx, Y(y)); ctx.globalAlpha = 1; };
  const blink = 0.45 + 0.4 * Math.sin(t * 3);
  if (game.state === "title") {
    line("A MOBBER PICTURE", 92, `${11 * s}px ${TYPE}`, 0.8);
    line("MOBBER", 150, `${58 * s}px ${DECO}`);
    line("~ a gangland picture in three reels ~", 180, `italic 700 ${13 * s}px ${SERIF}`);
    line("WASD move · mouse aim · click fire · E search walls · R reload · Q swap guns", 232, `${9 * s}px ${TYPE}`, 0.75);
    line(isTouch ? "left thumb walks & turns · right thumb aims · it fires when you're on target" : "Esc to pause · Shift to run", 248, `${9 * s}px ${TYPE}`, 0.6);
    if (view.portrait) line("best played sideways (turn off rotation lock)", 268, `${9 * s}px ${TYPE}`, 0.6);
    line(isTouch ? "— tap to roll film —" : "— click to roll film —", 296, `${12 * s}px ${TYPE}`, blink);
  } else if (card.kind === "prologue") {
    line("PROLOGUE", 84, `${14 * s}px ${DECO}`, 0.85);
    line("Chicago, 1931", 122, `italic 700 ${24 * s}px ${SERIF}`);
    STORY.prologue.forEach((c, i) => line(c, 168 + i * 20, `${12 * s}px ${TYPE}`, 0.9));
    line(isTouch ? "— tap to continue —" : "— click to continue —", 296, `${11 * s}px ${TYPE}`, blink);
  } else if (card.kind === "escaped") {
    line("HE GOT AWAY.", 130, `${40 * s}px ${DECO}`);
    line("The autogiro climbs into the dawn with Don Vitale aboard.", 172, `italic 700 ${14 * s}px ${SERIF}`);
    line("The picture rewinds to the start of the reel.", 200, `${11 * s}px ${TYPE}`, 0.8);
    line(isTouch ? "— tap to roll it again —" : "— click to roll it again —", 296, `${11 * s}px ${TYPE}`, blink);
  } else if (card.kind === "epilogue") {
    line("EPILOGUE", 84, `${14 * s}px ${DECO}`, 0.85);
    STORY.epilogue.forEach((c, i) => line(c, 130 + i * 22, `${i === STORY.epilogue.length - 1 ? "italic 700 " + 14 * s + "px " + SERIF : 12 * s + "px " + TYPE}`, 0.92));
    line(isTouch ? "— tap to continue —" : "— click to continue —", 296, `${11 * s}px ${TYPE}`, blink);
  } else if (card.kind === "chapter") {
    const L = LEVELS[card.idx];
    line(L.chapter, 92, `${14 * s}px ${DECO}`, 0.85);
    line(L.title, 140, `italic 700 ${30 * s}px ${SERIF}`);
    L.card.forEach((c, i) => line(c, 186 + i * 20, `${12 * s}px ${TYPE}`, 0.9));
    line(isTouch ? "— tap to continue —" : "— click to continue —", 296, `${11 * s}px ${TYPE}`, blink);
  } else if (card.kind === "dead") {
    line("CUT!", 130, `${46 * s}px ${DECO}`);
    line(`They got you at ${LEVELS[card.idx].title}.`, 172, `italic 700 ${16 * s}px ${SERIF}`);
    line("The picture rewinds to the start of the reel.", 200, `${11 * s}px ${TYPE}`, 0.8);
    line(isTouch ? "— tap to roll it again —" : "— click to roll it again —", 296, `${11 * s}px ${TYPE}`, blink);
  } else if (card.kind === "end") {
    const acc = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0, mm = Math.floor(stats.time / 60), ss = Math.floor(stats.time % 60);
    line("THE END", 108, `${46 * s}px ${DECO}`);
    line("Eddie's name was cleared. The city got a new boss.", 146, `italic 700 ${16 * s}px ${SERIF}`);
    line(`${stats.kills} Vitale men down · $${stats.cash.toLocaleString()} collected · ${acc}% of shots on target`, 192, `${11 * s}px ${TYPE}`, 0.85);
    line(`Running time ${mm}:${String(ss).padStart(2, "0")} · secrets found: ${stats.secretsFound.size} · retakes: ${stats.deaths}`, 212, `${11 * s}px ${TYPE}`, 0.85);
    line(isTouch ? "— tap to watch it again —" : "— click to watch it again —", 296, `${11 * s}px ${TYPE}`, blink);
  }
  // Grain over the card
  ctx.save(); ctx.globalAlpha = 0.09; ctx.globalCompositeOperation = "screen";
  ctx.drawImage(noiseCv, (Math.random() * 160) | 0, (Math.random() * 90) | 0, 480, 270, f.x, f.y, f.w, f.h);
  ctx.restore();
}
