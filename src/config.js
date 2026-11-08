// Screen geometry and every tuning number in one place.
// To make the game easier or harder, start here.

// The 3D view is rendered at this resolution, then scaled up to the screen.
export const W = 640;
export const H = 360;
export const HALF = H / 2;
export const PLANE = 0.75;          // camera plane length: sets the field of view (~73°)
export const K = (W / 2) / PLANE;   // projection scale: wall height in pixels at distance 1
export const FOG = 0.05;            // how quickly things fade into the dark with distance

export const isTouch = matchMedia("(pointer: coarse)").matches;

export const FONTS = {
  deco: "Limelight, serif",
  serif: "'Playfair Display', Georgia, serif",
  type: "'Special Elite', 'Courier New', monospace",
};
export const CREAM = "#ece6da";

export const PLAYER = {
  maxHp: 100,
  radius: 0.22,
  walkSpeed: 3.2,
  runSpeed: 4.2,            // while holding Shift
  turnSpeed: 2.4,           // arrow keys, radians per second
  mouseSensitivity: 0.0024,
  medkitHeal: 35,
  pickupRange: 0.55,
  hitWidth: 0.22,           // how wide a target counts as "under the crosshair", desktop
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

export const WEAPONS = [
  { name: "REVOLVER", mag: 6, rate: 0.36, dmg: 34, spread: 1.5, reload: 1.3 },
  { name: "TOMMY GUN", mag: 50, rate: 0.085, dmg: 15, spread: 9, reload: 2.0 },
];

// Map letter -> enemy type. `art` names a sprite set in art/sprites.js.
export const ENEMY_TYPES = {
  g: { name: "goon", art: "goon", hp: 40, speed: 1.5, dmg: [6, 11], cd: [1.3, 2.3], range: 13, aim: 0.5, burst: 1, scale: 0.95 },
  G: { name: "heavy", art: "heavy", hp: 95, speed: 1.15, dmg: [13, 22], cd: [1.7, 2.7], range: 7, aim: 0.6, burst: 1, scale: 1.0 },
  V: { name: "boss", art: "boss", hp: 420, speed: 1.05, dmg: [7, 12], cd: [1.0, 1.7], range: 14, aim: 0.45, burst: 3, scale: 1.05 },
};

export const ENEMY_AI = {
  sightRange: 16,
  hearingRange: 12,         // gunshots alert enemies this close
  keepDistance: 2.6,        // stop approaching when this close and in sight
  accuracyNear: 0.82,       // hit chance up close...
  accuracyFalloff: 0.045,   // ...minus this much per unit of distance
  accuracyMin: 0.18,
  movingTargetPenalty: 0.72, // hit chance multiplier when you're on the move
  dropChance: 0.5,          // chance a downed gangster drops ammo or cash
};
