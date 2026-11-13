// People who aren't in the Vitale outfit: patrons at the Blue Note, the bartender,
// the man at the piano, someone caught out in the rain. They don't fight. When the
// shooting starts the patrons scatter, some for a way out and some for the nearest
// place to hide, and the staff get their heads down.
//
// Map letters: e a patron or passer-by, u the bartender, i the pianist (put him beside a piano).
import { FOLK } from "./config.js";
import { shutWindows } from "./fence.js";
import { rand, clamp } from "./util.js";
import { game, stats, say, intertitle } from "./state.js";
import { SND } from "./audio.js";
import { music } from "./music.js";
import { nextStep, wallAt, los } from "./world.js";

export const FOLK_LETTERS = "eui";

export function spawnFolk(letter, x, y) {
  const kind = letter === "u" ? "barman" : letter === "i" ? "pianist" : ((x | 0) + (y | 0)) % 2 ? "lady" : "gent";
  game.folk.push({ x, y, kind, state: "idle", step: rand(0, 6), t: 0, spoke: false });
}
const up = f => f.state === "idle" || f.state === "flee" || f.state === "cower";   // still on his feet (or knees)
export const standing = () => game.folk.filter(up);

// A shot has been fired at (x, y). Everyone in earshot reacts.
export function scare(x, y) {
  shutWindows(x, y);
  let screamed = false;
  for (const f of game.folk) {
    if (f.state !== "idle" || Math.hypot(f.x - x, f.y - y) > FOLK.hearing) continue;
    if (f.kind === "pianist") { music.stop(); SND.clang(); }   // the tune stops dead on a fistful of wrong notes
    if (f.kind === "barman" || f.kind === "pianist") f.state = "cower";
    else { f.state = "flee"; f.t = rand(0, 0.5); f.goal = pickGoal(f, x, y, game.folk.indexOf(f)); screamed = true; }
  }
  if (screamed) SND.scream();
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
// whichever way out is furthest from the gunfire, and the rest dive for the nearest
// spot the shooter can't see and stay down there. `leave` means they're gone when they arrive.
function pickGoal(f, sx, sy, n) {
  const from = d => Math.hypot(d.x - sx, d.y - sy), to = d => Math.hypot(d.x - f.x, d.y - f.y);
  const reachable = d => !!nextStep(f.x, f.y, d.x, d.y);
  // A way out, as long as it isn't where the shooting is
  const exits = waysOut().filter(d => from(d) > 4 && reachable(d)).sort((a, b) => (from(b) - to(b) * 0.4) - (from(a) - to(a) * 0.4));
  // Somewhere close by that's out of the shooter's sight, and further from him than here
  let hide = null, best = -Infinity;
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    const x = (f.x | 0) + dx, y = (f.y | 0) + dy, d = { x: x + 0.5, y: y + 0.5 };
    if ((game.map[y] || [])[x] !== "." || game.navBlocked[y * game.width + x] || los(d.x, d.y, sx, sy) || from(d) < from(f)) continue;
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
    f.step += dt;
    if (f.state === "idle") {
      if (f.kind === "pianist") {
        // His playing is the music in here: louder the nearer you are
        music.play("joint", clamp(1.15 - Math.hypot(f.x - p.x, f.y - p.y) / 16, 0.25, 1));
      } else if (f.kind === "barman" && !f.spoke && Math.hypot(f.x - p.x, f.y - p.y) < FOLK.barmanReach && los(f.x, f.y, p.x, p.y)) {
        f.spoke = true;
        intertitle("barman", "THE BARTENDER", ["“The office is in the back, pal.", "I never saw you.”"]) || say("“The office is in the back, pal. I never saw you.”", 4);
      }
    } else if (f.state === "flee") {
      if ((f.t -= dt) > 0) continue;   // a moment of disbelief first
      // To the way out they chose (and gone), or to their hiding place (and down on the floor)
      const goal = f.goal;
      if (!goal) { f.state = "cower"; continue; }   // nowhere to go: down where they stand
      if (Math.hypot(goal.x - f.x, goal.y - f.y) < 0.7) { f.state = goal.leave ? "gone" : "cower"; continue; }
      const s = nextStep(f.x, f.y, goal.x, goal.y);
      if (!s) { f.state = "cower"; continue; }
      const gd = Math.hypot(s.x - f.x, s.y - f.y) || 1, k = Math.min(1, FOLK.speed * dt / gd);
      const nx = f.x + (s.x - f.x) * k, ny = f.y + (s.y - f.y) * k;
      if (!wallAt(nx, ny)) { f.x = nx; f.y = ny; }   // a shut door holds them up until it slides open
    }
  }
}
