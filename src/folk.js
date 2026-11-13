// People who aren't in the Vitale outfit: patrons at the Blue Note, the bartender,
// the man at the piano, someone caught out in the rain. They don't fight. When the
// shooting starts the patrons run for the way out, and the staff get their heads down.
//
// Map letters: e a patron or passer-by, u the bartender, i the pianist (put him beside a piano),
// f the fence, who sells you what you need (render/shop.js) from a yard off the street.
import { FOLK, isTouch } from "./config.js";
import { openShop } from "./render/shop.js";
import { rand, clamp } from "./util.js";
import { game, stats, say, intertitle } from "./state.js";
import { SND } from "./audio.js";
import { music } from "./music.js";
import { nextStep, wallAt, los } from "./world.js";

export const FOLK_LETTERS = "euif";

export function spawnFolk(letter, x, y) {
  const kind = letter === "f" ? "fence" : letter === "u" ? "barman" : letter === "i" ? "pianist" : ((x | 0) + (y | 0)) % 2 ? "lady" : "gent";
  game.folk.push({ x, y, kind, state: "idle", step: rand(0, 6), t: 0, spoke: false });
}
const up = f => f.state === "idle" || f.state === "flee" || f.state === "cower";   // still on his feet (or knees)
export const standing = () => game.folk.filter(up);

// A shot has been fired at (x, y). Everyone in earshot reacts.
export function scare(x, y) {
  let screamed = false;
  for (const f of game.folk) {
    if (Math.hypot(f.x - x, f.y - y) > FOLK.hearing) continue;
    if (f.kind === "fence" && up(f)) { f.state = "cower"; f.t = FOLK.fenceNerve; continue; }   // he'll deal again when it's been quiet a while
    if (f.state !== "idle") continue;
    if (f.kind === "pianist") { music.stop(); SND.clang(); }   // the tune stops dead on a fistful of wrong notes
    if (f.kind === "barman" || f.kind === "pianist") f.state = "cower";
    else { f.state = "flee"; f.t = rand(0, 0.5); screamed = true; }
  }
  if (screamed) SND.scream();
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
      } else if (f.kind === "fence") {
        // Walk up to him and he'll deal: on a phone his list comes up by itself, once each time you approach
        const d = Math.hypot(f.x - p.x, f.y - p.y), near = d < FOLK.fenceReach && los(f.x, f.y, p.x, p.y);
        if (near && !f.met) { f.met = true; if (isTouch) openShop(); else say("E: see what the fence is selling", 3); }
        if (d > FOLK.fenceReach + 1) f.met = false;
      } else if (f.kind === "barman" && !f.spoke && Math.hypot(f.x - p.x, f.y - p.y) < FOLK.barmanReach && los(f.x, f.y, p.x, p.y)) {
        f.spoke = true;
        intertitle("barman", "THE BARTENDER", ["“The office is in the back, pal.", "I never saw you.”"]) || say("“The office is in the back, pal. I never saw you.”", 4);
      }
    } else if (f.state === "cower" && f.kind === "fence") {
      if ((f.t -= dt) <= 0) f.state = "idle";
    } else if (f.state === "flee") {
      if ((f.t -= dt) > 0) continue;   // a moment of disbelief first
      // Out the way you came in; once there, they're gone
      const [ex, ey] = game.wayOut;
      if (Math.hypot(ex - f.x, ey - f.y) < 0.7) { f.state = "gone"; continue; }
      const s = nextStep(f.x, f.y, ex, ey);
      if (!s) { f.state = "cower"; continue; }
      const gd = Math.hypot(s.x - f.x, s.y - f.y) || 1, k = Math.min(1, FOLK.speed * dt / gd);
      const nx = f.x + (s.x - f.x) * k, ny = f.y + (s.y - f.y) * k;
      if (!wallAt(nx, ny)) { f.x = nx; f.y = ny; }   // a shut door holds them up until it slides open
    }
  }
}
