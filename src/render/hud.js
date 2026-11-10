// Crosshair, the health/cash/objective/ammo bar, messages, the touch stick and
// the pause screen. Drawn at full screen resolution on top of the film.
import { isTouch, FONTS, CREAM, TOUCH, WEAPONS } from "../config.js";
import { game, stats, input } from "../state.js";
import { ctx, view, swapBtn } from "../screen.js";
import { objectiveDone } from "../world.js";

const { deco: DECO, serif: SERIF, type: TYPE } = FONTS;

export function drawHUD() {
  const p = game.player, f = view.hudRect, film = view.film, s = f.s;
  if (isTouch) swapBtn.style.display = game.state === "play" && p.has[1] ? "block" : "none";
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
  const obj = o === "reach" || game.level.endOnBoss ? game.level.goal.toUpperCase()
    : o === "doubles" ? (objectiveDone() ? "IT WAS A DOUBLE — GET TO THE ROOF" : "FIND DON VITALE")
    : o === "ledger" ? (p.ledger ? "LEDGER IN HAND — FIND THE EXIT" : "FIND THE LEDGER")
    : (objectiveDone() ? "THE DON IS DOWN — FIND THE EXIT" : "FIND DON VITALE");
  ctx.fillText(obj, f.x + f.w / 2, base - 12 * s);
  ctx.font = `italic 700 ${fs(10)}px ${SERIF}`; ctx.fillText(`${left} of the Vitale outfit remain`, f.x + f.w / 2, base);
  ctx.textAlign = "right"; ctx.font = `${fs(9)}px ${TYPE}`;
  ctx.fillText(WEAPONS[p.weapon].name + (p.has[1] && p.has[0] ? "   [Q]" : ""), f.x + f.w - 18 * s, base - 13 * s);
  ctx.font = `${fs(17)}px ${DECO}`;
  const ammo = p.reload > 0 ? "RELOADING" : `${p.mag[p.weapon]} / ${p.reserve[p.weapon]}`;
  if (!p.reload && p.mag[p.weapon] + p.reserve[p.weapon] === 0) ctx.fillStyle = Math.floor(game.timer * 3) % 2 ? "#ffffff" : CREAM;
  ctx.fillText(ammo, f.x + f.w - 18 * s, base);
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
  } else if (isTouch && game.timer < 8) {
    const { portrait, vw, vh } = view;
    ctx.fillStyle = "rgba(236,230,218,0.5)"; ctx.textAlign = "center"; ctx.font = `${fs(10)}px ${TYPE}`;
    ctx.fillText("thumb here to walk & turn", portrait ? vw * 0.25 : f.x + f.w * 0.2, portrait ? vh * 0.72 : f.y + f.h * 0.72);
    ctx.fillText("drag here to aim", portrait ? vw * 0.7 : f.x + f.w * 0.72, portrait ? vh * 0.62 : f.y + f.h * 0.5);
  }
  if (input.wasLocked && !input.locked && !isTouch) {
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.fillStyle = CREAM; ctx.textAlign = "center"; ctx.font = `${fs(22)}px ${DECO}`; ctx.fillText("INTERMISSION", f.x + f.w / 2, f.y + f.h / 2);
    ctx.font = `${fs(11)}px ${TYPE}`; ctx.fillText("click to resume the picture", f.x + f.w / 2, f.y + f.h / 2 + 22 * s);
  }
}
