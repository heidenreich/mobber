// The story and the levels, in order, as plain data. Each chapter's location is
// preceded by a street scene that ends at its front door, and the picture ends
// with a chase across the Hotel Regent's roof.
//
// Each map is a grid of characters, one per square. Rows must all be the same
// length and the outer edge must be walls. tests/maps.test.js checks this, and
// that everything is reachable from the start.
//
// To add a level, add an entry here. `objective` is "ledger" (find the L, then
// the exit), "doubles" (take out every v, then the exit), "boss" (take out the
// V) or "reach" (just get to the exit; street scenes use it). `goal`, if set, is
// the on-screen objective. With `endOnBoss`, the V's death ends the picture, and
// a fleeing V runs along `route` (a list of [x, y] points) and escapes at its end.
//
// Street scenes also set: sky (true for night, "dawn" for the morning sky)
// instead of a ceiling, wallHeight (2 for two-story buildings, 0.5 for the roof's
// waist-high parapet), rain, and `entrance`, the facade drawn on the E square
// ("bluenote", "pier" or "hotel").
//
// # brick  W wallpaper  P wood panel  B bar shelves  T deco tile  E exit door
// F storefront  H tenement  U the Blue Note's front   (two-story facades for streets)
// D sliding door: put it between two walls, with open floor on the other two sides
// ! secret wall: looks like the wall next to it; walking into it slides it back up
//   to two squares, so leave open floor behind it
// R roof parapet
// S start  g goon  G heavy  v the Don's body double  V the Don  c table  k crate  p piano  l floor lamp  * hanging lamp  o barrel
// $ cash  + first aid  a tommy gun drum (the first gives you the gun)  r box of revolver rounds  L ledger
// Streets: C parked car  m street lamp  h hydrant  t trash can  n newsstand
// Roof: w water tower  q chimney  N the REGENT sign  A the Don's autogiro
// Title cards before the first scene and after the last
export const STORY = {
  prologue: [
    "Your brother Eddie kept the books at the Blue Note.",
    "He kept them honest. The Vitale family didn't like that.",
    "Tuesday night they pulled him out of the river.",
    "Tonight you find out who gave the order.",
  ],
  epilogue: [
    "Don Vitale never made it off the roof of the Hotel Regent.",
    "Eddie's ledger went to the District Attorney,",
    "and by noon every paper in town had the story.",
    "Somewhere across town, someone else started keeping books.",
  ],
};

export const LEVELS = [
  { chapter: "EXT. MULBERRY STREET — NIGHT", title: "Mulberry Street", ambient: 0.3, goal: "Get to the Blue Note", entrance: "bluenote",
    card: ["Rain on Mulberry Street.", "Eddie's ledger is still in the Blue Note's back office.", "Vitale lookouts are posted out front. Get to the club."],
    floor: "cobbles", sky: true, wallHeight: 2, rain: true, objective: "reach",
    map: [
      "HHHHHHFFFFHHHHHHFFFFHHHHHHFFFFHHUUUUUUUU",
      "HHHHHHFFFFHHHHHHFFFFHHHHHHFFFFHHUUUUUUUU",
      "HHHHHHFFFFHHHHHHFFFFHHHHHHFFFFHHUUUEUUUU",
      "H.......m...n.......m...t.......m......H",
      "H..r...........C.......................H",
      "H........................g........g....H",
      "H.S..........g.........................H",
      "H..................g..........g........H",
      "H.....C.....................C.........rH",
      "H...m......h..m....t......m..........m.H",
      "HHHHHHHHFFFFHHHHHHFFFF..####FFFFHHHHHHHH",
      "HHHHHHHHFFFFHHHHHHFFFF..####FFFFHHHHHHHH",
      "HHHHHHHHFFFFHHHHH#####..#####FFFHHHHHHHH",
      "HHHHHHHHFFFFHHHHH#.+...r...m#FFFHHHHHHHH",
      "HHHHHHHHFFFFHHHHH#...g....$.#FFFHHHHHHHH",
      "HHHHHHHHFFFFHHHHH############FFFHHHHHHHH",
    ] },
  { chapter: "CHAPTER ONE", title: "The Blue Note Club", floor: "checker", ceil: "tin", ambient: 0.4, objective: "ledger",
    card: ["The Vitales keep Eddie's ledger", "in the back office of the Blue Note.", "Walk in. Take it. Walk out.", "Eddie always said the place was full of hidden rooms."],
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
      "W............g....W.rPP.....PP",
      "W..c...c...c......W..PP$...$PP",
      "W.................Wg.#########",
      "Wl.......r.......lW..#......o#",
      "WWWWDWWWWWWWWWWDWWW*.#.kk....#",
      "Wl.....WWWWW......W..#...*..a#",
      "W......W.*.W.k....W..D.......#",
      "W..*...W..+W..*...W..#...g...#",
      "W...S..!...W...g..W..#.......E",
      "W......W...W....k.W..#.......#",
      "W......W$.$Wk....+W..#.....r.#",
      "WWWWWWWWWWWWWWWWWWWWW#########",
    ] },
  { chapter: "EXT. THE WATERFRONT — LATER", title: "The Waterfront", ambient: 0.28, goal: "Get to Pier 9", entrance: "pier",
    card: ["Eddie's last entry: a shipment, Pier 9, Tuesday night.", "The night they pulled him out of the river.", "The Vitales know you're coming."],
    floor: "cobbles", sky: true, wallHeight: 2, rain: true, objective: "reach",
    map: [
      "HHHHHHHH###########HHHHHHHH#################",
      "HHHHHHHH#####k.m..kHHHHHHHH#################",
      "HHHHHHHH#####.g.a..HHHHHHHH#################",
      "#.....m....t.............r..m............m.#",
      "#...................kk........C............#",
      "#.........g............g...............G...#",
      "#.S.............................g..........E",
      "#................g........k................#",
      "#....r..C..........................oo......#",
      "#.................m.....h.............m....#",
      "##########HHHHHH##############....##########",
      "##########HHHHHH##############.$+.##########",
      "##########HHHHHH############################",
      "##########HHHHHH############################",
    ] },
  { chapter: "CHAPTER TWO", title: "Pier 9", floor: "concrete", ceil: "beams", ambient: 0.42, objective: "ledger",
    card: ["A warehouse full of Canadian rye and Vitale muscle.", "The foreman's shipping book will show", "who signed off on Eddie."],
    map: [
      "########################",
      "#S...r.#....*k.k.......#",
      "#......#..g..........G.#",
      "#..k...#.....k.k...*...#",
      "#...*..###.######..o...#",
      "#..a..............o....#",
      "####.###..k..k..k......#",
      "#......#.....*........g#",
      "#..g...#..k..k..k......#",
      "#..*...#..r............#",
      "#.o....####.#####PPPP.PP",
      "#.......g...#...Pl.....P",
      "#..$........#.G.P..L...P",
      "####.####.*.#...P......P",
      "#.......#...#...PPP.PPPP",
      "#..+.*..#..g........r..#",
      "#.......#....k.k...$*..#",
      "#..g....#.............aE",
      "#.......#....*.........#",
      "########################",
    ] },
  { chapter: "EXT. REGENT SQUARE — NIGHT", title: "Regent Square", ambient: 0.32, goal: "Get into the Hotel Regent", entrance: "hotel",
    card: ["Every page of the shipping book is signed the same way.", "Don Vitale. He keeps the penthouse at the Hotel Regent,", "and his men are watching the square."],
    floor: "cobbles", sky: true, wallHeight: 2, rain: true, objective: "reach",
    map: [
      "HHHHHHHHHHFFFFFFHHHHHHHHTTTTTTTTTTTTTFFF",
      "HHHHHHHHHHFFFFFFHHHHHHHHTTTTTTTTTTTTTFFF",
      "HHHHHHHHHHFFFFFFHHHHHHHHTTTTTTTTTTTTTFFF",
      "HHHHHHHHHHFFFFFFHHHHHHHHTTTTTTETTTTTTFFF",
      "H.$..m.....n................m...m......F",
      "H............................G.G.......F",
      "H.......C........g..................r..F",
      "H................................g.....F",
      "H..............m........m..............F",
      "H.........g........oo......g...........F",
      "H..................oo................+.F",
      "H..............m........m..............F",
      "H.......r..............................F",
      "H..S.........C........g.C.........C....F",
      "H......................................F",
      "H.....t.....a.................h.....m..F",
      "HHHHHHHHHHHHFFFFFFFFHHHHHHHHFFFFFFFFFFFF",
      "HHHHHHHHHHHHFFFFFFFFHHHHHHHHFFFFFFFFFFFF",
      "HHHHHHHHHHHHFFFFFFFFHHHHHHHHFFFFFFFFFFFF",
      "HHHHHHHHHHHHFFFFFFFFHHHHHHHHFFFFFFFFFFFF",
    ] },
  { chapter: "CHAPTER THREE", title: "Hotel Regent, Top Floor", floor: "carpet", ceil: "plaster", ambient: 0.42, objective: "doubles",
    card: ["Don Vitale takes his supper", "in the penthouse at eight o'clock.", "Don't be late."],
    map: [
      "TTTTTTTTTTTTTTTTTTTTTTTT",
      "Tl.......T.....T......lT",
      "T..S.....T..g..T...G...T",
      "T........T.....T.......T",
      "T..+..l..T..l..T.l...a.T",
      "TTTT.TTTTTT.TTTTTT.TTTTT",
      "W......................W",
      "W.l..r.g.....l.....g..lW",
      "W......................W",
      "WWWW.WWWWWW.WWWWWW.WWWWW",
      "W.......W.....W........W",
      "W..g....W..$..W....G...W",
      "W..l..a.W..l..W..l..r..W",
      "W.......W..g..W........W",
      "WWWW.WWWWWW.WWWWWWW.WWWW",
      "P...........r..........P",
      "P..l..c....c.....cv..l.P",
      "P......g......v........P",
      "P..+..c....c.....c..g..P",
      "P.l........l.......l...P",
      "PPPPPPPPPPPPPPPPPPPPPEPP",
    ] },
  { chapter: "EXT. HOTEL REGENT ROOF — DAWN", title: "The Roof", floor: "tar", sky: "dawn", wallHeight: 0.5, ambient: 0.62, objective: "boss", endOnBoss: true,
    goal: "Stop Don Vitale before he reaches the autogiro",
    route: [[13.5, 6.5], [18.5, 9.5], [24.5, 6.5], [29.2, 8.5]],   // zigzagging between the water towers
    card: ["It was a double. The real Don is running for the roof,", "where an autogiro is warming up to fly him out of town.", "Don't let him reach it."],
    map: [
      "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
      "R..................N.............R",
      "R................................R",
      "R...r.....q...w.....a............R",
      "R......................g.........R",
      "R...........g..............G.....R",
      "R................................R",
      "R................................R",
      "R.S.......V....r...............A.R",
      "R................................R",
      "R................................R",
      "R...............g..........g.....R",
      "R.....q...............w..q.......R",
      "R...+............q...........+...R",
      "R................................R",
      "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
    ] },
];
