// The three chapters, as plain data.
//
// Each map is a grid of characters, one per square. Rows must all be the same
// length and the outer edge must be walls. tests/maps.test.js checks this, and
// that everything is reachable from the start.
//
// To add a chapter, append an entry here. `objective` is "ledger" (find the L,
// then the exit) or "boss" (take out the V, then the exit).
//
// # brick  W wallpaper  P wood panel  B bar shelves  T deco tile  E exit door
// D sliding door: put it between two walls, with open floor on the other two sides
// ! secret wall: looks like the wall next to it; walking into it slides it back up
//   to two squares, so leave open floor behind it
// S start  g goon  G heavy  V the Don  c table  k crate  p piano  l floor lamp  * hanging lamp  o barrel
// $ cash  + first aid  a drum magazine  L ledger
export const LEVELS = [
  { chapter: "CHAPTER ONE", title: "The Blue Note Club", floor: "checker", ceil: "tin", ambient: 0.4, objective: "ledger",
    card: ["The Vitale boys keep their books", "in the back office of the Blue Note.", "Walk in. Take the ledger. Walk out.", "They say the old place is full of hidden rooms."],
    map: [
      "BBBBBBBBBBBBBBWWWWWWWPPPPPPPPP",
      "Wl.........$.Bk..aW..Pl......P",
      "W...g........!....W.*P...c.L.P",
      "W......c..g..B..$.W..P..g....P",
      "W............Bk..*W..D.......P",
      "WWWWWWWWWDWWWWWWWWW..P.......P",
      "Wl...............lW..P.....g.P",
      "W.........g...p...W.*P+......P",
      "W..c...c..........W..PPPP!PPPP",
      "W....g....*.......D..PP$...*PP",
      "W............g....W..PP.....PP",
      "W..c...c...c......W..PP$...$PP",
      "W.................Wg.#########",
      "Wl...............lW..#......o#",
      "WWWWDWWWWWWWWWWDWWW*.#.kk....#",
      "Wl.....WWWWW......W..#...*..a#",
      "W......W.*.W.k....W..D.......#",
      "W..*...W..+W..*...W..#...g...#",
      "W...S..!...W...g..W..#.......E",
      "W......W...W....k.W..#.......#",
      "W......W$.$Wk....+W..#.......#",
      "WWWWWWWWWWWWWWWWWWWWW#########",
    ] },
  { chapter: "CHAPTER TWO", title: "Pier 9", floor: "concrete", ceil: "beams", ambient: 0.42, objective: "ledger",
    card: ["The ledger points to a warehouse", "full of Canadian rye and Vitale muscle.", "Their shipping book is in the foreman's office."],
    map: [
      "########################",
      "#S.....#....*k.k.......#",
      "#......#..g..........G.#",
      "#..k...#.....k.k...*...#",
      "#...*..###.######..o...#",
      "#..a..............o....#",
      "####.###..k..k..k......#",
      "#......#.....*........g#",
      "#..g...#..k..k..k......#",
      "#..*...#...............#",
      "#.o....####.#####PPPP.PP",
      "#.......g...#...P....l.P",
      "#..$........#.G.P..L...P",
      "####.####.*.#...P......P",
      "#.......#...#...PPP.PPPP",
      "#..+.*..#..g...........#",
      "#.......#....k.k...$*..#",
      "#..g....#.............aE",
      "#.......#....*.........#",
      "########################",
    ] },
  { chapter: "CHAPTER THREE", title: "Hotel Regent, Top Floor", floor: "carpet", ceil: "plaster", ambient: 0.42, objective: "boss",
    card: ["Don Vitale takes his supper", "in the penthouse at eight o'clock.", "Don't be late."],
    map: [
      "TTTTTTTTTTTTTTTTTTTTTTTT",
      "Tl.......T.....T......lT",
      "T..S.....T..g..T...G...T",
      "T........T.....T.......T",
      "T..+..l..T..l..T.l...a.T",
      "TTTT.TTTTTT.TTTTTT.TTTTT",
      "W......................W",
      "W.l....g.....l.....g..lW",
      "W......................W",
      "WWWW.WWWWWW.WWWWWW.WWWWW",
      "W.......W.....W........W",
      "W..g....W..$..W....G...W",
      "W..l..a.W..l..W..l.....W",
      "W.......W..g..W........W",
      "WWWW.WWWWWW.WWWWWWW.WWWW",
      "P......................P",
      "P..l..c....c.....c...l.P",
      "P......g......V........P",
      "P..+..c....c.....c..g..P",
      "P.l........l.......l...P",
      "PPPPPPPPPPPPPPPPPPPPPEPP",
    ] },
];
