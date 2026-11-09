// The game's shared, changing state. Modules import these objects and read or
// update their fields; nothing else holds game state.

export const game = {
  state: "title",       // title | card | play | dying | won
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
  timer: 0,             // seconds since the chapter started
  fade: 1,              // 0..1 picture brightness during transitions
  fadeDir: 0,
  afterFade: null,      // called once a fade-out finishes
  doors: new Map(),     // see doors.js
  secrets: new Map(),
  movers: [],
  moverCells: new Map(),
};

export const stats = { kills: 0, cash: 0, shots: 0, hits: 0, deaths: 0, time: 0, secretsFound: new Set() };
export function resetStats() { Object.assign(stats, { kills: 0, cash: 0, shots: 0, hits: 0, deaths: 0, time: 0, secretsFound: new Set() }); }

export const input = {
  keys: new Set(),
  firing: false,
  locked: false,        // pointer lock is active
  wasLocked: false,     // pointer lock was active this chapter (so losing it means "paused")
  dragLook: false,
  touch: { move: null, look: null },
};

export function say(text, dur = 2.2) { game.msg = { text, t: dur }; }
