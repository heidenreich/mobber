// The game's shared, changing state. Modules import these objects and read or
// update their fields; nothing else holds game state.

export const game = {
  state: "title",       // title | card | play | dying (killed) | won (Don down) | leaving (reached the exit)
  card: null,           // { kind: "chapter" | "dead" | "end", idx } while state is "card"
  levelIdx: 0,
  level: null,          // the current entry from LEVELS
  map: [],              // level map as rows of characters; walls stay, everything else becomes "."
  width: 0,
  height: 0,
  player: null,
  enemies: [],
  objs: [],             // props, lamps and pickups
  msg: { text: "", t: 0 },
  intertitle: null,     // { who, lines, t, dur } while a line of dialogue holds the screen
  dialogue: true,       // set false to play without dialogue cards (the tests do)
  timer: 0,             // seconds since the chapter started
  fade: 1,              // 0..1 picture brightness during transitions
  fadeDir: 0,
  afterFade: null,      // called once a fade-out finishes
  doors: new Map(),     // see doors.js
  secrets: new Map(),
  movers: [],
  moverCells: new Map(),
  smashed: new Set(),   // wall squares whose bottles or shop window have been shot out (y * width + x)
  navBlocked: null,     // squares furniture fills, for enemy pathfinding (world.js)
};

export const stats = { kills: 0, cash: 0, shots: 0, hits: 0, deaths: 0, time: 0, secretsFound: new Set() };
export function resetStats() { Object.assign(stats, { kills: 0, cash: 0, shots: 0, hits: 0, deaths: 0, time: 0, secretsFound: new Set() }); }

export const input = {
  keys: new Set(),
  firing: false,
  locked: false,        // pointer lock is active
  wasLocked: false,     // pointer lock was active this chapter (so losing it means "paused")
  dragLook: false,
  menu: false,          // the settings panel is open: the picture stops
  touched: false,       // the player has touched the screen this scene (phone auto-fire waits for it)
  touch: { move: null, look: null },
};

export function say(text, dur = 2.2) { game.msg = { text, t: dur }; }

// A line of dialogue, the way a silent picture does it: the action stops and a card
// holds the screen for a moment. Each line (by `key`) is shown once per run.
// Returns false if it wasn't shown, so the caller can fall back to a message.
const spoken = new Set();
export function intertitle(key, who, lines, dur = 2.4) {
  if (!game.dialogue || spoken.has(key)) return false;
  spoken.add(key); game.intertitle = { who, lines, t: dur, dur };
  return true;
}
export function resetIntertitles() { spoken.clear(); game.intertitle = null; }
