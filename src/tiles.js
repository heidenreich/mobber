// Which map letters are what. The one place these lists live: world.js, doors.js
// and the tests all read them from here (the tests through window.__mobber.TILES).

// Solid walls, including the exit door and the roof parapet. "=" is the harbour's edge (a low kerb you see over, with
// water beyond) and J, Y, X are lengths of the freighter moored against it
export const WALL_CHARS = "#WPBTEFHURIKQ=JYX";
// Walls that can sit beside a door or hide a secret (everything but the exit)
export const SIDE_WALL_CHARS = "#WPBTFHURIKQ=JYX";
export const DOOR = "D";
export const SECRET = "!";
