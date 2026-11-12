// Crosshair, the health/cash/objective/ammo bar, messages, the touch stick and
// the pause screen. Drawn at full screen resolution on top of the film.
import { isTouch, FONTS, CREAM, TOUCH, WEAPONS } from "../config.js";
import { game, stats, input } from "../state.js";
import { ctx, view, swapBtn } from "../screen.js";
import { objectiveDone } from "../world.js";
import { liftFloor } from "../lift.js";
import { settings } from "../settings.js";

const { deco: DECO, serif: SERIF, type: TYPE } = FONTS;

// Held upright, the space under the picture is where your thumbs go: a framed
// panel marks the two halves, so it reads as part of the set instead of dead screen.
function thumbDeck(top) {
  const { vw, vh } = view, m = 12, bottom = vh - m, split = vw * TOUCH.joystickArea;
  if (bottom - top < 120) return;
  ctx.strokeStyle = "rgba(236,230,218,0.4)"; ctx.lineWidth = 1.5; ctx.strokeRect(m, top, vw - m * 2, bottom - top);
  ctx.lineWidth = 0.7; ctx.strokeRect(m + 5, top + 5, vw - m * 2 - 10, bottom - top - 10);
  ctx.beginPath(); ctx.moveTo(split, top + 26); ctx.lineTo(split, bottom - 26); ctx.stroke();
  ctx.fillStyle = "rgba(236,230,218,0.5)"; ctx.textAlign = "center";
  const label = (big, small, x) => {
    ctx.font = `15px ${DECO}`; ctx.fillText(big, x, top + 38);
    ctx.font = `11px ${TYPE}`; ctx.fillText(small, x, top + 56);
  };
  label(settings.stick ? "WALK · SIDESTEP" : "WALK · TURN", "left thumb, anywhere here", (m + split) / 2);
  label("AIM", "drag with your right thumb", (split + vw - m) / 2);
}

export function drawHUD() {
  const p = game.player, f = view.hudRect, film = view.film, s = f.s;
  if (isTouch) swapBtn.style.display = game.state === "play" && p.has.filter(Boolean).length > 1 ? "block" : "none";
  const fs = n => Math.max(10, n * s);
  // Crosshair
  const cx = film.x + film.w / 2, cy = film.y + film.h / 2, g = 4 + p.recoil * 6;
  ctx.strokeStyle = "rgba(236,230,218,0.8)"; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.moveTo(cx - g - 6, cy); ctx.lineTo(cx - g, cy); ctx.moveTo(cx + g, cy); ctx.lineTo(cx + g + 6, cy);
  ctx.moveTo(cx, cy - g - 6); ctx.lineTo(cx, cy - g); ctx.moveTo(cx, cy + g); ctx.lineTo(cx, cy + g + 6); ctx.stroke();
  // Bottom band, framed like an intertitle
  const bh = 34 * s, by = f.y + f.h - bh;
  const grd = ctx.createLinearGradient(0, by - 10 * s, 0, f.y + f.h);
  grd.addColorStop(0, "rgba(0,0,0,0)"); grd.addColorStop(0.35, "rgba(0,0,0,0.75)"); grd.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = grd; ctx.fillRect(f.x, by - 10 * s, f.w, bh + 10 * s);
  ctx.strokeStyle = "rgba(236,230,218,0.55)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(f.x + 14 * s, by + 2); ctx.lineTo(f.x + f.w - 14 * s, by + 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(f.x + 14 * s, by + 5); ctx.lineTo(f.x + f.w - 14 * s, by + 5); ctx.stroke();
  ctx.textBaseline = "alphabetic";
  const base = by + bh - 9 * s;
  ctx.fillStyle = CREAM; ctx.textAlign = "left";
  ctx.font = `${fs(9)}px ${TYPE}`; ctx.fillText("HEALTH", f.x + 18 * s, base - 13 * s);
  ctx.font = `${fs(17)}px ${DECO}`; ctx.fillStyle = p.hp < 30 && Math.floor(game.timer * 4) % 2 ? "#ffffff" : CREAM;
  ctx.fillText(String(Math.ceil(p.hp)), f.x + 18 * s, base);
  ctx.fillStyle = CREAM; ctx.font = `${fs(9)}px ${TYPE}`; ctx.fillText("CASH", f.x + 78 * s, base - 13 * s);
  ctx.font = `${fs(14)}px ${DECO}`; ctx.fillText("$" + stats.cash.toLocaleString(), f.x + 78 * s, base);
  ctx.textAlign = "center"; ctx.font = `${fs(10)}px ${TYPE}`;
  const left = game.enemies.filter(e => e.hp > 0).length;
  const o = game.level.objective;
  const lift = game.lift;
  const obj = o === "lift" ? (lift.done ? "THROUGH THE DOOR TO THE DON'S SUITE" : lift.phase === "ride" ? "GOING UP" : left ? "CLEAR THE LANDING" : "BACK IN THE LIFT")
    : o === "reach" || game.level.endOnBoss ? game.level.goal.toUpperCase()
    : o === "doubles" ? (objectiveDone() ? "IT WAS A DOUBLE — GET TO THE ROOF" : "FIND DON VITALE")
    : o === "ledger" ? (p.ledger ? "LEDGER IN HAND — FIND THE EXIT" : "FIND THE LEDGER")
    : (objectiveDone() ? "THE DON IS DOWN — FIND THE EXIT" : "FIND DON VITALE");
  // On a narrow screen a long objective would run into the cash and ammo: shrink it to fit between them
  const room = f.w - 250 * s;
  for (let size = fs(10); size > 6 && ctx.measureText(obj).width > room; size -= 0.5) ctx.font = `${size}px ${TYPE}`;
  ctx.fillText(obj, f.x + f.w / 2, base - 12 * s);
  // Under it: how many are left, or just where you are when the job is only to get through
  ctx.font = `italic 700 ${fs(10)}px ${SERIF}`;
  ctx.fillText(o === "lift" ? liftFloor() : o === "reach" ? game.level.title : left === 0 ? "The Vitale outfit is finished here" : `${left} of the Vitale outfit ${left === 1 ? "remains" : "remain"}`, f.x + f.w / 2, base);
  ctx.textAlign = "right"; ctx.font = `${fs(9)}px ${TYPE}`;
  ctx.fillText(WEAPONS[p.weapon].name + (p.has.filter(Boolean).length > 1 ? "   [Q]" : ""), f.x + f.w - 18 * s, base - 13 * s);
  ctx.font = `${fs(17)}px ${DECO}`;
  const ammo = p.reload > 0 ? "RELOADING" : `${p.mag[p.weapon]} / ${p.reserve[p.weapon]}`;
  if (!p.reload && p.mag[p.weapon] + p.reserve[p.weapon] === 0) ctx.fillStyle = Math.floor(game.timer * 3) % 2 ? "#ffffff" : CREAM;
  ctx.fillText(ammo, f.x + f.w - 18 * s, base);
  // At the safe: a dial that turns as you work it, with a ring showing how far along you are
  const ck = game.cracking;
  if (ck) {
    const x = film.x + film.w / 2, y = film.y + film.h * 0.68, R = 20 * film.s;
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.beginPath(); ctx.arc(x, y, R + 7 * film.s, 0, 6.283); ctx.fill();
    ctx.strokeStyle = "rgba(236,230,218,0.35)"; ctx.lineWidth = 3 * film.s; ctx.beginPath(); ctx.arc(x, y, R + 3 * film.s, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = CREAM; ctx.beginPath(); ctx.arc(x, y, R + 3 * film.s, -Math.PI / 2, -Math.PI / 2 + ck.progress * 6.283); ctx.stroke();
    ctx.lineWidth = 1; const turn = ck.progress * 21;
    for (let i = 0; i < 20; i++) { const a = turn + i * 0.314, r0 = R * (i % 5 ? 0.82 : 0.68); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); ctx.stroke(); }
    ctx.fillStyle = CREAM; ctx.beginPath(); ctx.arc(x, y, R * 0.3, 0, 6.283); ctx.fill();
    ctx.textAlign = "center"; ctx.font = `${Math.max(11, 10 * film.s)}px ${TYPE}`;
    const tip = ck.working ? "working the dial…" : isTouch ? "stand still to work the dial" : "hold E to work the dial";
    ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillText(tip, x + 1, y + R + 21 * film.s + 1); ctx.fillStyle = CREAM; ctx.fillText(tip, x, y + R + 21 * film.s);
  }
  // Messages ("Find the ledger.", pickups)
  const msg = game.msg;
  if (msg.t > 0) {
    ctx.globalAlpha = Math.min(1, msg.t * 2); ctx.textAlign = "center"; ctx.font = `${fs(12)}px ${TYPE}`;
    ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillText(msg.text, f.x + f.w / 2 + 1, f.y + 30 * s + 1);
    ctx.fillStyle = CREAM; ctx.fillText(msg.text, f.x + f.w / 2, f.y + 30 * s);
    ctx.globalAlpha = 1;
  }
  // The floating stick under the left thumb, or a hint where to put thumbs
  const touch = input.touch;
  if (touch.move) {
    const m = touch.move, R = TOUCH.stickRadius;
    ctx.strokeStyle = "rgba(236,230,218,0.45)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(m.x, m.y, R, 0, 6.283); ctx.stroke();
    ctx.fillStyle = "rgba(236,230,218,0.08)"; ctx.fill();
    const kd = Math.min(R, Math.hypot(m.kx - m.x, m.ky - m.y)), ka = Math.atan2(m.ky - m.y, m.kx - m.x);
    ctx.fillStyle = "rgba(236,230,218,0.5)"; ctx.beginPath(); ctx.arc(m.x + Math.cos(ka) * kd, m.y + Math.sin(ka) * kd, 24, 0, 6.283); ctx.fill();
  } else if (isTouch && !view.portrait && game.timer < 8) {
    ctx.textAlign = "center"; ctx.font = `${Math.max(13, 11 * s)}px ${TYPE}`;
    for (const [txt, x, y] of [[settings.stick ? "left thumb: walk & sidestep" : "left thumb: walk & turn", 0.22, 0.72], ["right thumb: drag to aim", 0.7, 0.5]]) {
      ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillText(txt, f.x + f.w * x + 1.5, f.y + f.h * y + 1.5);
      ctx.fillStyle = "rgba(236,230,218,0.9)"; ctx.fillText(txt, f.x + f.w * x, f.y + f.h * y);
    }
  }
  if (isTouch && view.portrait) thumbDeck(f.y + f.h + 12);
  if (input.wasLocked && !input.locked && !isTouch) {
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.fillStyle = CREAM; ctx.textAlign = "center"; ctx.font = `${fs(22)}px ${DECO}`; ctx.fillText("INTERMISSION", f.x + f.w / 2, f.y + f.h / 2);
    ctx.font = `${fs(11)}px ${TYPE}`; ctx.fillText("click to resume the picture", f.x + f.w / 2, f.y + f.h / 2 + 22 * s);
  }
}
