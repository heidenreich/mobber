// Screen geometry and every tuning number in one place.
// To make the game easier or harder, start here.

// The 3D view is rendered at this resolution, then scaled up to the screen.
export const W = 640;
export const H = 360;
export const HALF = H / 2;
export const PLANE = 0.75;          // camera plane length: sets the field of view (~73°)
export const K = (W / 2) / PLANE;   // projection scale: wall height in pixels at distance 1
export const FOG = 0.05;            // how quickly things fade into the dark with distance
export const GLOW = 240;            // texture brightness above which walls light themselves (windows, signs)

export const isTouch = matchMedia("(pointer: coarse)").matches;

export const FONTS = {
  deco: "Limelight, serif",
  serif: "'Playfair Display', Georgia, serif",
  type: "'Special Elite', 'Courier New', monospace",
};
export const CREAM = "#ece6da";

export const PLAYER = {
  maxHp: 100,
  minStartHp: 50,           // health carries over between scenes, but you never start one with less than this
  radius: 0.22,
  walkSpeed: 3.2,
  runSpeed: 4.2,            // while holding Shift
  turnSpeed: 2.4,           // arrow keys, radians per second
  mouseSensitivity: 0.0024,
  medkitHeal: 35,
  pickupRange: 0.55,
  safeReach: 1.3,           // how close you must stand to work a safe's dial
  safeTime: 5,              // seconds of dial work to open it
  hitWidth: 0.22,           // how wide a target counts as "under the crosshair", desktop
  bodyRadius: 0.3,          // how close a gangster's bullet must pass to hit you
  headRadius: 0.17,         // ...or to hit your head, when you lean it out of cover
  leanReach: 0.45,          // how far a lean moves your eyes sideways (Z and C)
  leanTime: 0.16,           // seconds to lean all the way out, or back
  leanTilt: 0.05,           // how far the picture tips with you, radians
};

// Bystanders (folk.js)
export const FOLK = {
  hearing: 14,              // a shot this close sends them running
  speed: 2.6,               // how fast they run for the door
  barmanReach: 2.4,
  fenceReach: 1.25,         // how close to his window you stand to deal with the fence
  fenceNerve: 5,            // seconds after a shot before he'll deal again         // how close you come before the bartender speaks
  hitWidth: 0.2,            // how wide a bystander is to a stray bullet
};

// Gangsters' bullets fly, and you can step out of their way.
export const BULLETS = {
  speed: 11,                // squares per second (you walk at 3.2)
  step: 0.08,               // how finely a bullet's flight is checked
  range: 30,
  scatter: 0.1,             // a gangster's aim is off by up to this much, radians either side
  pellets: 5,               // a heavy's shotgun blast...
  pelletSpread: 0.2,        // ...and how wide it spreads, so it hits hardest up close
  whizz: 0.9,               // a miss this close is heard going past
};

export const TOUCH = {
  stickRadius: 60,          // pixels
  deadZone: 0.18,
  joystickArea: 0.45,       // left share of the screen that starts the stick
  stickTurn: 1.05,          // stick left/right turns...
  stickStrafe: 0.25,        // ...and sidesteps a little
  lookSensitivity: 0.0055,  // right-thumb drag, radians per pixel
  hitWidth: 0.3,            // more forgiving crosshair on phones
};

export const AIM_ASSIST = {
  range: 14,                // only for gangsters this close
  cone: 0.16,               // radians either side of the crosshair
  turnRate: 1.6,            // radians per second
  autoFireRange: 13,
};

// Ammo is limited: you start with a loaded revolver and a few spare rounds, and
// find more on the floor or on the gangsters you put down.
// Measured with scripts/playthrough.js: a scene should give back roughly what it costs.
export const AMMO = {
  startRevolverReserve: 12,
  maxReserve: [36, 60, 16], // how many spare rounds you can carry for each gun; extra stays on the floor
  revolverBox: 6,           // a box of rounds found lying around (r on the map)
  drum: 30,                 // a tommy gun drum (a on the map); the first one gives you the gun
  goonRounds: 3,            // a downed goon often has a few revolver rounds on him...
  goonRoundsChance: 0.5,
  goonTommyRounds: 12,      // ...sometimes his tommy gun, with what's left in the drum...
  goonTommyChance: 0.15,    // ...and otherwise some cash
  heavyRounds: 6,
  heavyShells: 4,           // a heavy drops his sawn-off the first time, then shells or revolver rounds
  bossCash: 1000,
  // Things a gangster had on him that the fence will buy. A goon who'd have dropped cash sometimes drops one instead
  valuables: [["a pocket watch", 120], ["a pair of cufflinks", 60], ["a signet ring", 90], ["a silver cigarette case", 150]],
  valuableChance: 0.5,
  donsWatch: ["the Don's gold watch", 400],   // on each of his doubles
  lieutenantCash: 500,      // a lieutenant's bankroll, on top of his prize
  bagCash: 600,             // what the bagman was carrying
  rifleRounds: 6,
};

// With both guns empty, clicking swings the gun at anyone in arm's reach
export const MELEE = { range: 1.4, dmg: 25, rate: 0.55 };

export const WEAPONS = [
  { name: "REVOLVER", mag: 6, rate: 0.36, dmg: 34, spread: 1.5, reload: 1.3 },
  { name: "TOMMY GUN", mag: 50, rate: 0.085, dmg: 15, spread: 9, reload: 2.0 },
  // Two barrels of buckshot: `pellets` separate shots spread wide, each weaker the further it flies
  { name: "SAWN-OFF", mag: 2, rate: 0.55, dmg: 17, spread: 30, reload: 1.5, pellets: 7 },
];
export const ROUND_NAMES = ["revolver rounds", "tommy gun rounds", "shells"];

// Map letter -> enemy type. `art` names a sprite set in art/sprites.js.
export const ENEMY_TYPES = {
  g: { name: "goon", art: "goon", hp: 40, speed: 1.5, dmg: [6, 11], cd: [1.3, 2.3], range: 13, aim: 0.5, burst: 1, scale: 0.95 },
  G: { name: "heavy", art: "heavy", hp: 95, speed: 1.15, dmg: [13, 22], cd: [1.7, 2.7], range: 7, aim: 0.6, burst: 1, scale: 1.0 },
  // A knife man: no gun, but faster than you walk. He raises the blade before he strikes: step back
  j: { name: "knife", art: "knife", hp: 28, speed: 3.5, dmg: [14, 20], cd: [0.7, 1.1], range: 1.0, aim: 0.32, burst: 1, scale: 0.92, melee: true },
  // A rifleman at an upstairs window (put him on a street square beside a building). He never moves,
  // takes his time, and his scope glints before a fast, well-aimed shot. `up` is how high his window is
  y: { name: "rifleman", art: "rifle", hp: 30, speed: 0, dmg: [20, 28], cd: [2.6, 3.6], range: 16, aim: 1.1, burst: 1, scale: 0.95, up: 0.75, still: true, bulletSpeed: 17, scatter: 0.035 },
  // The bagman doesn't fight: he runs for the nearest alarm bell (x on the map). Stop him before he rings it
  b: { name: "bagman", art: "bagman", hp: 35, speed: 2.7, dmg: [5, 9], cd: [1.2, 2.0], range: 9, aim: 0.5, burst: 1, scale: 0.93, runner: true },
  // Body doubles dressed as the Don, waiting in the penthouse
  // Vitale's lieutenants, one to a chapter. They hold their post: gunfire elsewhere doesn't bring them, only the sight of you.
  // Each has a name (shown with his health while you fight him),
  // something to say when he sees you (`line`), and something worth taking off him (`prize`: [name, value]).
  M: { name: "manager", art: "manager", hp: 170, speed: 1.6, dmg: [9, 14], cd: [0.8, 1.4], range: 12, aim: 0.4, burst: 2, scale: 1.0,
    lieutenant: true, title: "FRANKIE LACE", role: "who runs the Blue Note", line: ["“Eddie's brother. He said you'd come.", "He said a lot of things, at the end.”"], prize: ["a diamond stickpin", 300] },
  O: { name: "foreman", art: "foreman", hp: 240, speed: 1.05, dmg: [13, 20], cd: [1.4, 2.1], range: 8, aim: 0.55, burst: 1, scale: 1.1, noStagger: true,
    lieutenant: true, title: "BIG OTTO", role: "foreman of Pier 9", line: ["“Nobody walks off my pier", "with my book.”"], prize: ["a gold watch chain", 250] },
  Z: { name: "bodyguard", art: "bodyguard", hp: 190, speed: 1.7, dmg: [5, 9], cd: [1.4, 2.0], range: 13, aim: 0.45, burst: 3, scale: 1.05,
    lieutenant: true, title: "MR. FINCH", role: "the Don's own man", line: ["“The Don said you'd get this far.", "He said it wouldn't matter.”"], prize: ["a silver hip flask", 200] },
  v: { name: "double", art: "boss", hp: 120, speed: 1.05, dmg: [6, 10], cd: [1.1, 1.8], range: 13, aim: 0.45, burst: 3, scale: 1.05 },
  // The real Don runs for his getaway along the level's `route`, stopping to fire
  // He wears a vest under the pinstripes: tommy gun rounds do only `tommyResist` of their damage
  V: { name: "boss", art: "boss", hp: 420, speed: 1.7, dmg: [7, 12], cd: [2.0, 2.8], range: 14, aim: 0.45, burst: 3, scale: 1.05, flees: true, noStagger: true, tommyResist: 0.6 },
};

export const DOORS = {
  reach: 2.2,               // doors open when someone is this close to their center (far enough to walk through without stopping)
  holdOpen: 3,              // seconds a door stays open after everyone leaves
  speed: 2.2,               // fraction of the door per second
  passableAt: 0.85,         // how open a door must be to walk or see through
  thickness: 0.12,
  secretTravel: 2,          // squares a secret wall slides back
  secretSpeed: 1.0,         // squares per second
};

export const ENEMY_AI = {
  sightRange: 16,
  repath: 0.4,              // seconds between route recalculations while hunting
  staggerCooldown: 0.7,     // after flinching from a hit, a gangster can't flinch again for this long
  hearingRange: 12,         // gunshots alert enemies this close
  viewCone: 1.2,            // until he's alerted, a gangster only sees this far (radians) either side of where he's looking...
  senseRange: 2.2,          // ...or anyone who gets this close
  ambush: 3,                // damage multiplier for a shot at a man who hasn't noticed you
  shoutRange: 6.5,          // the first to see you shouts, and anyone this close to him comes too
  darkSight: 0.6,           // how much of sightRange they keep when you stand in the dark
  coverChance: 0.5,         // how often a goon ducks out of sight between bursts
  spinChance: 0.3,          // how often a hit that staggers a man spins him right round
  spinTime: 0.45,           // how long the spin takes (a plain flinch is 0.18)
  hatChance: 0.35,          // how often a hit knocks a man's hat off
  keepDistance: 2.6,        // stop approaching when this close and in sight
};
