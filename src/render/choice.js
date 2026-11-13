// The end of the chase. The Don is beaten and on his knees, and what happens to
// him is up to you: finish it, or hand him to the law. The picture stops until
// you choose (click or tap a line, or press 1 or 2), and the ending and the
// morning paper follow from it.
import { isTouch, FONTS, CREAM } from "../config.js";
import { game, stats, input, say, intertitle } from "../state.js";
import { ctx, view } from "../screen.js";
import { SND } from "../audio.js";
import { fadeOut, showCard } from "../flow.js";

const { deco: DECO, serif: SERIF, type: TYPE } = FONTS;

const OPTIONS = [
  { name: "Finish it", note: "For Eddie." },
  { name: "Hand him to the law", note: "Let the ledger hang him." },
];

// Called when the Don's last shot lands (player.js). `goal` is the stretch of parapet nearest him.
export function offerChoice(boss, goal) {
  boss.state = "kneel";
  game.choice = { boss, goal };
  input.firing = false; input.keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();   // free the mouse to click an answer
  input.wasLocked = false;   // the shooting is over: a free mouse from here on isn't a pause
  intertitle("plea", "DON VITALE", ["“Don't. I can pay.", "Name your price.”"]);
}

export function decide(n) {
  const c = game.choice;
  if (!c || !OPTIONS[n]) return;
  game.choice = null; SND.click();
  if (n === 0) {
    // He gets up, staggers for the parapet and goes over (enemies.js finishes it)
    c.boss.state = "stagger"; c.boss.t = 2.6; c.boss.goal = c.goal;
  } else {
    stats.mercy = true;
    intertitle("mercy", null, ["“The law can have you.", "Eddie kept honest books.”"]) || say("The law can have you.", 4);
    fadeOut(() => showCard("epilogue"), 2.6);
  }
}

export const choiceRows = [];   // where each answer sits on screen, for clicks and taps
export function choiceClickAt(x, y) {
  if (!game.choice) return false;
  const hit = choiceRows.find(r => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1);
  if (hit) decide(hit.i);
  return true;   // a click anywhere else does nothing: you have to choose
}

export function drawChoice(t) {
  const f = view.cardRect, s = f.s, cx = f.x + f.w / 2, Y = v => f.y + v * s;
  ctx.fillStyle = "#0b0a09"; ctx.fillRect(f.x, f.y, f.w, f.h);
  const m = 18 * s;
  ctx.strokeStyle = CREAM; ctx.lineWidth = 2.5; ctx.strokeRect(f.x + m, f.y + m, f.w - m * 2, f.h - m * 2);
  ctx.lineWidth = 0.8; ctx.strokeRect(f.x + m + 6 * s, f.y + m + 6 * s, f.w - m * 2 - 12 * s, f.h - m * 2 - 12 * s);
  ctx.fillStyle = CREAM; ctx.textAlign = "center";
  ctx.globalAlpha = 0.85; ctx.font = `${14 * s}px ${DECO}`; ctx.fillText("THE ROOF OF THE HOTEL REGENT", cx, Y(76)); ctx.globalAlpha = 1;
  ctx.font = `italic 700 ${24 * s}px ${SERIF}`; ctx.fillText("Don Vitale is on his knees.", cx, Y(116));
  ctx.globalAlpha = 0.6; ctx.fillRect(cx - 110 * s, Y(132), 220 * s, 1); ctx.globalAlpha = 1;
  const x0 = f.x + 190 * s, x1 = f.x + f.w - 190 * s;
  choiceRows.length = 0;
  OPTIONS.forEach((o, i) => {
    const y = Y(176 + i * 46);
    ctx.textAlign = "left"; ctx.font = `${11 * s}px ${TYPE}`; if (!isTouch) ctx.fillText(String(i + 1), x0, y);
    ctx.font = `italic 700 ${19 * s}px ${SERIF}`; ctx.fillText(o.name, x0 + 20 * s, y);
    ctx.globalAlpha = 0.8; ctx.font = `${10.5 * s}px ${TYPE}`; ctx.fillText(o.note, x0 + 20 * s, y + 15 * s); ctx.globalAlpha = 1;
    choiceRows.push({ x0: x0 - 10 * s, x1: x1 + 10 * s, y0: y - 20 * s, y1: y + 22 * s, i });
  });
  ctx.textAlign = "center"; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 3); ctx.font = `${10.5 * s}px ${TYPE}`;
  ctx.fillText(isTouch ? "— tap your answer —" : "— press 1 or 2, or click your answer —", cx, Y(300));
  ctx.globalAlpha = 1;
}
