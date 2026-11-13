// People who aren't in the Vitale outfit: patrons at the Blue Note, the bartender,
// the man at the piano, someone caught out in the rain. They don't fight. When the
// shooting starts the patrons scatter, some for a way out and some for the nearest
// place to hide, and the staff get their heads down.
//
// Map letters: e a patron, hotel guest or passer-by, d a working man (the docks, the pier),
// u the bartender, i the pianist (put him beside a piano), z the hotel doorman.
import { FOLK } from "./config.js";
import { shutWindows } from "./fence.js";
import { rand, clamp } from "./util.js";
import { game, stats, say, intertitle } from "./state.js";
import { SND } from "./audio.js";
import { music } from "./music.js";
import { nextStep, wallAt, los } from "./world.js";

// The ones who stay at their post and get their heads down, and what they say if you walk up first
const STAFF = ["barman", "pianist", "doorman"];
const LINES = {
  barman: ["THE BARTENDER", "“The office is in the back, pal.", "I never saw you.”"],
  doorman: ["THE DOORMAN", "“Mr. Vitale isn't receiving tonight, sir.", "The lift is straight through.”"],
};

export const FOLK_LETTERS = "euidz";

export function spawnFolk(letter, x, y) {
  const kind = letter === "u" ? "barman" : letter === "i" ? "pianist" : letter === "d" ? "worker" : letter === "z" ? "doorman" : ((x | 0) + (y | 0)) % 2 ? "lady" : "gent";
  game.folk.push({ x, y, kind, state: "idle", step: rand(0, 6), t: 0, spoke: false });
}
const up = f => f.state === "idle" || f.state === "flee" || f.state === "cower";   // still on his feet (or knees)
export const standing = () => game.folk.filter(up);

// A shot has been fired at (x, y). Everyone in earshot reacts: the nearest first, the
// far side of the room a moment later. Someone already hiding stays put unless the
// shooting comes right up to them, and then they break cover and run again.
export function scare(x, y) {
  shutWindows(x, y);
  let screamed = false;
  for (const f of game.folk) {
    const d = Math.hypot(f.x - x, f.y - y);
    if (d > FOLK.hearing) continue;
    const staff = STAFF.includes(f.kind);
    if (f.state === "idle") {
      if (f.kind === "pianist") { music.stop(); SND.clang(); }   // the tune stops dead on a fistful of wrong notes
      if (staff) { f.state = "cower"; continue; }
      bolt(f, x, y, d / FOLK.hearing * 0.6 + rand(0, 0.3));
      screamed = true;
    } else if (!staff && (f.nerve || 0) <= 0) {
      // Hiding, and the gun is on top of them; or running, and the gun is now where they were running to
      const flushed = f.state === "cower" && d < FOLK.tooClose && los(f.x, f.y, x, y);
      const cutOff = f.state === "flee" && f.goal && Math.hypot(f.goal.x - x, f.goal.y - y) < FOLK.tooClose;
      if (flushed || cutOff) { bolt(f, x, y, flushed ? rand(0.1, 0.3) : 0); screamed = screamed || flushed; }
    }
  }
  if (screamed) SND.scream();
}
function bolt(f, x, y, wait) {
  f.state = "flee"; f.t = wait; f.nerve = FOLK.nerve;
  f.pace = f.pace || FOLK.speed * rand(0.85, 1.25);
  f.goal = null; f.goal = pickGoal(f, x, y, game.folk.indexOf(f));
}

// The ways out of this scene: where you came in, and the floor in front of each exit door
function waysOut() {
  const out = [{ x: game.wayOut[0], y: game.wayOut[1] }], rows = game.level.map;
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== "E") return;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if ((game.map[y + dy] || [])[x + dx] === ".") out.push({ x: x + dx + 0.5, y: y + dy + 0.5 });
  }));
  return out;
}
// Where one frightened person runs to. They scatter: every other one bolts for
// whichever way out is furthest from the danger, and the rest dive for the nearest
// spot out of sight and stay down there. The danger is the gun that fired and, if it
// was a gangster's, you as well: nobody hides from him by running into your sights.
// No two pick the same hiding place. `leave` means they're gone when they arrive.
function pickGoal(f, sx, sy, n) {
  const p = game.player, guns = [{ x: sx, y: sy }];
  if (Math.hypot(p.x - sx, p.y - sy) > 1.5) guns.push({ x: p.x, y: p.y });
  const from = d => Math.min(...guns.map(g => Math.hypot(d.x - g.x, d.y - g.y))), to = d => Math.hypot(d.x - f.x, d.y - f.y);
  const seen = d => guns.some(g => los(d.x, d.y, g.x, g.y));
  const reachable = d => !!nextStep(f.x, f.y, d.x, d.y);
  // A way out, as long as it isn't where the shooting is
  const exits = waysOut().filter(d => from(d) > 4 && reachable(d)).sort((a, b) => (from(b) - to(b) * 0.4) - (from(a) - to(a) * 0.4));
  // Somewhere close by that's out of sight, no nearer the guns than here, and not already taken
  const taken = new Set(game.folk.filter(o => o !== f && o.goal && !o.goal.leave && o.state !== "down" && o.state !== "gone").map(o => (o.goal.y | 0) * game.width + (o.goal.x | 0)));
  let hide = null, best = -Infinity;
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    const x = (f.x | 0) + dx, y = (f.y | 0) + dy, d = { x: x + 0.5, y: y + 0.5 }, i = y * game.width + x;
    if ((game.map[y] || [])[x] !== "." || game.navBlocked[i] || taken.has(i) || from(d) < from(f) || seen(d)) continue;
    const score = from(d) * 0.5 - to(d) + rand(0, 1.5);
    if (score > best && reachable(d)) { best = score; hide = d; }
  }
  const run = exits[0] && { ...exits[0], leave: true };
  return n % 2 ? hide || run : run || hide;
}

// A bullet of yours found someone who had nothing to do with it
export function shootFolk(f) {
  f.state = "down"; stats.bystanders = (stats.bystanders || 0) + 1;
  SND.down(); say("You've shot a bystander!", 3);
}

export function updateFolk(dt) {
  const p = game.player;
  for (const f of game.folk) {
    f.step += dt; f.nerve = Math.max(0, (f.nerve || 0) - dt);
    if (f.state === "idle") {
      if (f.kind === "pianist") {
        // His playing is the music in here: louder the nearer you are
        music.play("joint", clamp(1.15 - Math.hypot(f.x - p.x, f.y - p.y) / 16, 0.25, 1));
      } else if (LINES[f.kind] && !f.spoke && Math.hypot(f.x - p.x, f.y - p.y) < FOLK.barmanReach && los(f.x, f.y, p.x, p.y)) {
        // Walk up before the shooting starts and he has something to say, once
        const [who, ...lines] = LINES[f.kind];
        f.spoke = true;
        intertitle(f.kind, who, lines) || say(lines.join(" "), 4);
      }
    } else if (f.state === "flee") {
      if ((f.t -= dt) > 0) continue;   // a moment of disbelief first
      // To the way out they chose (and gone), or to their hiding place (and down on the floor)
      const goal = f.goal;
      if (!goal) { f.state = "cower"; continue; }   // nowhere to go: down where they stand
      if (Math.hypot(goal.x - f.x, goal.y - f.y) < 0.7) { f.state = goal.leave ? "gone" : "cower"; continue; }
      const s = nextStep(f.x, f.y, goal.x, goal.y);
      if (!s) { f.state = "cower"; continue; }
      // Someone just ahead in the rush: fall in behind them rather than run through them
      const gd = Math.hypot(s.x - f.x, s.y - f.y) || 1;
      const jam = game.folk.some(o => o !== f && o.state === "flee" && o.t <= 0 && Math.hypot(o.x - f.x, o.y - f.y) < 0.45 && Math.hypot(s.x - o.x, s.y - o.y) < gd);
      const k = Math.min(1, (f.pace || FOLK.speed) * (jam ? 0.35 : 1) * dt / gd);
      const nx = f.x + (s.x - f.x) * k, ny = f.y + (s.y - f.y) * k;
      if (!wallAt(nx, ny)) { f.x = nx; f.y = ny; }   // a shut door holds them up until it slides open
    }
  }
}
