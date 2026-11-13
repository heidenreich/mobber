// The story and the levels, in order, as plain data. Each chapter's location is
// preceded by a street scene that ends at its front door, and the picture ends
// with a chase across the Hotel Regent's roof.
//
// Each map is a grid of characters, one per square. Rows must all be the same
// length and the outer edge must be walls. tests/maps.test.js checks this, and
// that everything is reachable from the start.
//
// To add a level, add an entry here. `objective` is "lift" (ride the hotel lift: see
// lift.js), "ledger" (find the L, then
// the exit), "doubles" (take out every v, then the exit), "boss" (take out the
// V) or "reach" (just get to the exit; street scenes use it). `goal`, if set, is
// the on-screen objective. With `endOnBoss`, the V's death ends the picture, and
// a fleeing V runs along `route` (a list of [x, y] points) and escapes at its end.
// With `safe: true` the L is a safe you have to crack, not a book lying on a desk.
// Health carries over between scenes; `fullHealth` restores it on arrival (the finale).
//
// Street scenes also set: sky (true for night, "dawn" for the morning sky)
// instead of a ceiling, harbour (true if the top edge is the water), wallHeight (2 for two-story buildings, 0.5 for the roof's
// waist-high parapet), rain, and `entrance`, the facade drawn on the E square
// ("bluenote", "pier" or "hotel").
//
// # brick  W wallpaper  P wood panel  B bar shelves  T deco tile  I corrugated iron  E exit door
// F storefront  H tenement  U the Blue Note's front   (two-story facades for streets)
// D sliding door: put it between two walls, with open floor on the other two sides
// ! secret wall: looks like the wall next to it; walking into it slides it back up
//   to two squares, so leave open floor behind it
// R roof parapet
// Bystanders (folk.js): e a patron, hotel guest or passer-by  d a working man  u the bartender  i the pianist, beside a piano  z the hotel doorman
// Q the fence's walk-up window (he sells ammunition, a doctor's visit and a vest): put it at the end of an alley,
// with K, the wall with his pawnbroker's sign, beside the alley's mouth
// Vitale's lieutenants, one to a chapter: M the Blue Note's manager  O the pier's foreman  Z the Don's bodyguard
// j knife man  b bagman (runs for the alarm bell: x)  y rifleman at an upstairs window (streets only, on a square beside a building)
// S start  g goon  G heavy  v the Don's body double  V the Don  c table  k crate  p piano  l floor lamp  * hanging lamp  o barrel
// $ cash  + first aid  a tommy gun drum (the first gives you the gun)  r box of revolver rounds  L ledger
// Streets: C parked car  m street lamp  h hydrant  t trash can  n newsstand
// The harbour (a level with `harbour: true`, along its top edge): = open water past the quay's edge
//   J Y X the moored freighter (plain hull, deckhouse, funnel)  s mooring bollard
// Roof: w water tower  q chimney  N the REGENT sign  A the Don's autogiro
// Title cards before the first scene and after the last
export const STORY = {
  prologue: [
    "Your brother Eddie kept the books at the Blue Note.",
    "He kept them honest. The Vitale family didn't like that.",
    "Tuesday night they pulled him out of the river.",
    "Tonight you find out who gave the order.",
  ],
  // ...or, if you handed him over instead
  epilogueMercy: [
    "Don Vitale went down the Regent's stairs in handcuffs.",
    "Eddie's ledger went to the District Attorney,",
    "and the trial ran all winter. He never came out.",
    "Somewhere across town, someone else started keeping books.",
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
    card: ["Rain on Mulberry Street.", "Eddie's ledger is still in the Blue Note's back office.", "Vitale lookouts are posted out front. Get to the club.", "A fence deals from a window down an alley: look for the three balls."],
    floor: "cobbles", sky: true, wallHeight: 2, rain: true, objective: "reach",
    map: [
      "HHHHHHFFFFHHHHHHFFFFHHHHHHFFFFHHUUUUUUUU",
      "HHHHHHFFFFHHHHHHFFFFHHHHHHFFFFHHUUUUUUUU",
      "HHHHHHFFFFHHHHHHFFFFHHHHHHFFFFHHUUUEUUUU",
      "H.......m...n..HHFFHm...y.......m......H",
      "H..r.....e.....HHFFH......C.g..........H",
      "H..............HHFFH...g...........g...H",
      "H.S..........g.HHFFH......FFHHFn.......H",
      "H................t....e...FFHHF.....C..H",
      "H.....C...........g.C.....FFHHF..g...e.H",
      "H...m......h..m....m..h...FFHHFm.....r.H",
      "HHHHH.KHFFFF.HHHHHFFFF..HHHHFFFFHHHHHHHH",
      "HHHHH.HHFFFF.HHHHHFFFF..HHHHFFFFHHHHHHHH",
      "HHHHH.HHFFFF.HHHH#####..#####FFFHHHHHHHH",
      "HHHHHQHHFFFF.......+...r....#FFFHHHHHHHH",
      "HHHHHHHHFFFFHHHHH#...j....$.#FFFHHHHHHHH",
      "HHHHHHHHFFFFHHHHH############FFFHHHHHHHH",
      "HHHHHHHHFFFFHHHHHHFFFFHHHHHHFFFFHHHHHHHH",
    ] },
  { chapter: "CHAPTER ONE", title: "The Blue Note Club", floor: "checker", ceil: "tin", ambient: 0.4, objective: "ledger", safe: true,
    card: ["The Vitales keep Eddie's ledger", "in the back office of the Blue Note.", "It's in the office safe. Work the dial, take it, walk out.", "Eddie always said the place was full of hidden rooms."],
    map: [
      "BBBBBBBBBBBBBBWWWWWWWPPPPPPPPP",
      "Wl.u..x....$.Bk..aW..Pl......P",
      "W...g........!....W.*P...c.L.P",
      "W......c..g..B..$.W..P..M....P",
      "W............Bk..*W..D.......P",
      "WWWWWWWWWDWWWWWWWWW..P.......P",
      "Wl...............lW..P.....g.P",
      "W.........g..bpi..W.*P+......P",
      "W..ce..ce.........W..PPPP!PPPP",
      "W....g....*.......D..PP$...*PP",
      "W............g....W.rPP.....PP",
      "W..ce..c.e.c......W..PP$...$PP",
      "W.................Wg.#########",
      "Wl.......r...j...lW..#......o#",
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
    card: ["Eddie's last entry: a shipment, Pier 9, Tuesday night.", "The night they pulled him out of the river.", "Their lookouts haven't seen you yet.", "Keep behind their backs and out of the lamplight."],
    floor: "cobbles", sky: true, wallHeight: 2, rain: true, harbour: true, objective: "reach",
    map: [
      "IIIIIIII===========JJJJYYXYYJJJJJJ======####",
      "IIIIIIIIs....s....s.k..s....s..k.s....s.####",
      "IIIIIIII.......m......kk.g.a....m.......####",
      "#.....m....t.............r..m............m.#",
      "#...............d...kk........C............#",
      "#.........g............g...............G...#",
      "#.S.............................g..........E",
      "#................g........k................#",
      "#....r..C........................d.oo......#",
      "#.................m.....h.............m....#",
      "##.K######HHHHHH##############....##########",
      "##.#######HHHHHH##############.$+.##########",
      "##Q#######HHHHHH############################",
      "##########HHHHHH############################",
    ] },
  { chapter: "CHAPTER TWO", title: "Pier 9", floor: "concrete", ceil: "beams", ambient: 0.42, objective: "ledger",
    card: ["A warehouse full of Canadian rye and Vitale muscle.", "The foreman's shipping book will show", "who signed off on Eddie."],
    map: [
      "IIIIIIIIIIIIIIIIIIIIIIII",
      "IS...r.I....*k.k.......I",
      "I..d...I..g..........G.I",
      "I..k...I.....k.k...*...I",
      "I...*..III.IIIIII..o...I",
      "I..a.........x....o....I",
      "IIII.III..k..k..k......I",
      "I......I..b..*........gI",
      "I..g.j.I..k..k..k.d....I",
      "I..*...I..r............I",
      "I.o....IIII.IIIIIPPPP.PP",
      "I.......g...I...Pl...O.P",
      "I..$........I.G.P..L...P",
      "IIII.IIII.*.I...P......P",
      "I.......I...I...PPP.PPPP",
      "I..+.*..I..g.j......r..I",
      "I.......I....k.k...$*..I",
      "I..g....I.............aE",
      "I.......I....*.........I",
      "IIIIIIIIIIIIIIIIIIIIIIII",
    ] },
  { chapter: "EXT. REGENT SQUARE — NIGHT", title: "Regent Square", ambient: 0.32, goal: "Get into the Hotel Regent", entrance: "hotel",
    card: ["Every page of the shipping book is signed the same way.", "Don Vitale. He keeps the penthouse at the Hotel Regent,", "and his men are watching the square."],
    floor: "cobbles", sky: true, wallHeight: 2, rain: true, objective: "reach",
    map: [
      "HHHHHHHHHHFFFFFFHHHHHHHHTTTTTTTTTTTTTFFF",
      "HHHHHHHHHHFFFFFFHHHHHHHHTTTTTTTTTTTTTFFF",
      "HHHHHHHHHHFFFFFFHHHHHHHHTTTTTTTTTTTTTFFF",
      "HHHHHHHHHHFFFFFFHHHHHHHHTTTTTTETTTTTTFFF",
      "H.$..m..y..n................m..zm......F",
      "H............................G.G.......F",
      "H.......C........g..................r..F",
      "H...........e....................g.....F",
      "H..............m........m..............F",
      "H.........g........oo......g...........F",
      "H..................oo................+.F",
      "H..............m........m..............F",
      "H.......r..................e...........F",
      "H..S.........C........g.C.........C....F",
      "H......................................F",
      "H.....t.....a...........y.....h.....m..F",
      "HHHH.KHHHHHHFFFFFFFFHHHHHHHHFFFFFFFFFFFF",
      "HHHH.HHHHHHHFFFFFFFFHHHHHHHHFFFFFFFFFFFF",
      "HHHHQHHHHHHHFFFFFFFFHHHHHHHHFFFFFFFFFFFF",
      "HHHHHHHHHHHHFFFFFFFFHHHHHHHHFFFFFFFFFFFF",
    ] },
  // The lift: no map letters for the gangsters; `lift` lists who is waiting at each landing
  { chapter: "INT. HOTEL REGENT — THE LIFT", title: "Going Up", floor: "carpet", ceil: "plaster", ambient: 0.4, objective: "lift",
    lift: [["g", "g"], ["g", "g", "g", "j"], ["G", "g", "g"]],
    card: ["The desk clerk rang upstairs.", "Every landing between here and the top floor", "has Vitale men waiting on it."],
    map: [
      "TTTTTTTTTTTTTT",
      "TTTTT........T",
      "T...T..*...c.T",
      "T.S.D........E",
      "T...T..*...c.T",
      "TTTTT........T",
      "TTTTTTTTTTTTTT",
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
      "W........e.............W",
      "W.l..r.g.....l.j...g..lW",
      "W......................W",
      "WWWW.WWWWWW.WWWWWW.WWWWW",
      "W.......W.....W........W",
      "W..g....W..$e.W....G...W",
      "W..l..a.W..l..W..l..r..W",
      "W.......W..g..W...j....W",
      "WWWW.WWWWWW.WWWWWWW.WWWW",
      "P...........r..........P",
      "P..l..ce...c.....cv..l.P",
      "P......Z......v........P",
      "P..+..c....c.....c..g..P",
      "P.l........l.......l...P",
      "PPPPPPPPPPPPPPPPPPPPPEPP",
    ] },
  { chapter: "EXT. HOTEL REGENT ROOF — DAWN", title: "The Roof", floor: "tar", sky: "dawn", wallHeight: 0.5, ambient: 0.62, objective: "boss", endOnBoss: true, fullHealth: true,
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
