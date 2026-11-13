// THE END: the morning paper spins up out of the dark, the way they did in the
// pictures, with the night's work written up as its front page.
import { isTouch, FONTS, CREAM } from "../config.js";
import { game, stats } from "../state.js";
import { ctx, view } from "../screen.js";
import { difficulty, settings } from "../settings.js";

const { deco: DECO, serif: SERIF, type: TYPE } = FONTS;
const INK = "#1b1815", PAPER = "#e6dfcc";

// How the run went, as a number: accuracy, retakes, pace and how hard you made it
function stars() {
  const acc = stats.shots ? stats.hits / stats.shots : 0;
  return 3 - Math.min(2, stats.bystanders || 0) + (acc >= 0.5) + (stats.deaths === 0) - (stats.deaths >= 4) + (stats.time < 12 * 60) - (stats.time > 25 * 60) + [-1, 0, 1][settings.difficulty];
}
const VERDICTS = ["a flop.", "a flop.", "a flop.", "a B picture.", "a solid programmer.", "a hit!", "a box office smash!", "the picture of the year!"];
export const rating = () => VERDICTS[Math.max(0, Math.min(7, stars()))];

export function drawPaper(t) {
  const f = view.cardRect, s = f.s, cx = f.x + f.w / 2;
  ctx.fillStyle = "#0b0a09"; ctx.fillRect(f.x, f.y, f.w, f.h);
  // The page is laid out in card units (640x360) around its own middle
  const W2 = 150, H2 = 166, e = game.fade * game.fade * (3 - 2 * game.fade);
  ctx.save();
  ctx.beginPath(); ctx.rect(f.x, f.y, f.w, f.h); ctx.clip();
  ctx.translate(cx, f.y + 172 * s); ctx.rotate((1 - e) * 9 - 0.025);   // it spins in, and lands a little crooked
  const k = s * (0.12 + 0.88 * e); ctx.scale(k, k);
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(-W2 + 5, -H2 + 6, W2 * 2, H2 * 2);
  ctx.fillStyle = PAPER; ctx.fillRect(-W2, -H2, W2 * 2, H2 * 2);
  ctx.fillStyle = ctx.strokeStyle = INK;
  const Y = v => -H2 + v;
  const text = (txt, x, y, font, align = "center") => { ctx.font = font; ctx.textAlign = align; ctx.fillText(txt, x, Y(y)); };
  const hr = (y, w = 1) => ctx.fillRect(-W2 + 10, Y(y), W2 * 2 - 20, w);

  // masthead
  text("The Chicago Daily Ledger", 0, 30, `900 23px ${SERIF}`);
  hr(37, 1.4); hr(40, 0.5);
  text("VOL. XLIV        CHICAGO, WEDNESDAY, OCTOBER 14, 1931        TWO CENTS", 0, 49, `5.6px ${TYPE}`);
  hr(53, 0.5);
  // the headline depends on how the night went
  const grade = stars();
  const head = grade < 3 ? ["GANG WAR LEAVES", "CITY REELING"]
    : stats.mercy ? (grade >= 5 ? ["VITALE OUTFIT SMASHED", "DON TO STAND TRIAL"] : ["DON VITALE TAKEN", "ON HOTEL ROOF"])
    : grade >= 5 ? ["VITALE OUTFIT SMASHED", "IN A SINGLE NIGHT"] : ["DON VITALE DEAD", "ON HOTEL ROOF"];
  head.forEach((h, i) => {
    let size = 27; ctx.font = `900 ${size}px ${SERIF}`;
    while (ctx.measureText(h).width > W2 * 2 - 24) { size -= 1; ctx.font = `900 ${size}px ${SERIF}`; }
    ctx.textAlign = "center"; ctx.fillText(h, 0, Y(82 + i * 27));
  });
  text(stats.mercy ? "Bookkeeper's Brother Hands Don and Ledger to District Attorney" : "Bookkeeper's Brother Hands Ledger to District Attorney", 0, 126, `italic 700 9.5px ${SERIF}`);
  hr(132, 0.5);

  // the photograph: the hotel roof at dawn, the autogiro still on it
  const px = -W2 + 12, py = Y(140), pw = 120, ph = 84;
  const sky = ctx.createLinearGradient(0, py, 0, py + ph); sky.addColorStop(0, "#3a3835"); sky.addColorStop(1, "#bdb6a4");
  ctx.fillStyle = sky; ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = INK;
  for (const [x, w, h] of [[0, 16, 30], [16, 12, 44], [30, 20, 26], [52, 10, 50], [64, 22, 34], [88, 14, 46], [102, 18, 28]]) ctx.fillRect(px + x, py + ph - h - 22, w, h + 22);
  ctx.fillRect(px, py + ph - 22, pw, 22);                                                    // the roof itself
  ctx.fillStyle = "#6a655c";
  ctx.fillRect(px + 38, py + ph - 37, 48, 2); ctx.fillRect(px + 61, py + ph - 37, 2, 10);   // rotor and mast
  ctx.beginPath(); ctx.ellipse(px + 62, py + ph - 23, 20, 5.5, 0, 0, 6.283); ctx.fill();    // fuselage
  ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = INK; text("The roof of the Hotel Regent at dawn.", px + pw / 2, 234, `italic 700 5.8px ${SERIF}`);

  // the story: your numbers, written up
  const acc = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0, mm = Math.floor(stats.time / 60), ss = Math.floor(stats.time % 60);
  const rooms = stats.secretsFound.size;
  const story = [
    `${stats.kills} of the Vitale outfit were`, "found where they fell.", "",
    `Police counted ${stats.shots} shots fired,`, `${acc} in every hundred finding`, "their mark.", "",
    `$${stats.cash.toLocaleString()} in cash was recovered.`, "",
    `It was over in ${mm} min. ${String(ss).padStart(2, "0")} sec.`,
    `${rooms} hidden room${rooms === 1 ? "" : "s"} came to light.`,
    stats.bystanders ? `${stats.bystanders} bystander${stats.bystanders === 1 ? " was" : "s were"} hit. Retakes: ${stats.deaths}.` : `Retakes: ${stats.deaths}.`,
  ];
  story.forEach((l, i) => text(l, px + pw + 9, 147 + i * 8.4, `6.6px ${TYPE}`, "left"));   // the column beside the photograph

  // the critic's box
  hr(246, 0.5);
  text("AT THE PICTURES", 0, 260, `9px ${DECO}`);
  text(`“Mobber” — our critic calls it ${rating()}`, 0, 276, `italic 700 11px ${SERIF}`);
  text(`Played ${difficulty().name.toLowerCase()}.`, 0, 288, `6.4px ${TYPE}`);
  hr(295, 0.5);
  text("Eddie's name was cleared. The city got a new boss.", 0, 310, `italic 700 8.6px ${SERIF}`);
  text("THE END", 0, 325, `8px ${DECO}`);
  ctx.restore();

  // the prompt, once the page has landed
  if (game.fade >= 0.95) {
    ctx.save(); ctx.globalAlpha *= 0.6 + 0.3 * Math.sin(t * 3); ctx.fillStyle = CREAM; ctx.textAlign = "center"; ctx.font = `${9.5 * s}px ${TYPE}`;
    ctx.fillText(`— ${isTouch ? "tap" : "click"} to watch it again —`, cx, f.y + 353 * s);
    ctx.restore();
  }
}
