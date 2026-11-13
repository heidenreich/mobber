# Mobber

*A gangland picture in three reels.*

A first-person shooter styled as a lost 1931 gangster film: black and white, film grain, projector flicker, silent-movie title cards, scenes that open and close with an iris, and a piano playing along.

Your brother Eddie kept the books at the Blue Note, and kept them honest. The Vitale family pulled him out of the river. Over one night you follow his ledger from the club to the docks to the Hotel Regent, walking the rainy streets between them, and the picture ends at dawn with a chase across the hotel roof: stop Don Vitale before his autogiro flies him out of town.

**Play it:** https://heidenreich.github.io/mobber/

## Controls

| | Desktop | Phone |
|---|---|---|
| Move | WASD (Shift to run) | Left thumb: up/down walks, left/right turns |
| Lean round a corner | Z (left) and C (right) | — |
| Aim | Mouse | Drag with your right thumb, including on FIRE |
| Shoot | Click or Space | Hold FIRE. It also fires on its own when a gangster is under the crosshair |
| Reload | R (automatic when empty) | Automatic |
| Swap guns | Q, 1/2/3 or the mouse wheel | SWAP |
| Search for secret walls | Walk into a wall, or press E | Walk into a wall |
| Crack a safe | Stand at it and hold E | Stand still at it |
| Pause | Esc | — |
| Music on or off | M | the gear, top right |
| Settings | the gear, top right (Esc first to free the mouse) | the gear, top right |

The gear opens the projection booth: music, sound effects, look speed, difficulty (Sunday stroll, Regular, Hard-boiled), a buzz when you're hit on a phone, and starting the picture over. Your choices and the scene you last reached are remembered in the browser, so closing the tab doesn't send you back to the start.

Doors open by themselves as you walk up to them. Some walls hide rooms: look for faint scrape marks near the floor.

Ammo is limited, and so is what you can carry. You start with a loaded revolver and 12 spare rounds. Boxes of rounds and tommy gun drums are lying around, and gangsters you put down leave something behind: a few revolver rounds, sometimes their tommy gun, sometimes cash. The first heavy you put down gives up his sawn-off shotgun, which settles things up close and does little at a distance. With both guns empty, a click swings the gun at anyone in arm's reach. Your health carries over from scene to scene, so first-aid kits matter.

Gangsters who hear gunfire come looking for you, finding their way around walls and through doors. The first to see you shouts for the others near him. Between bursts a goon may duck out of your line of fire, a hit may knock his hat off, and the last hired gun left standing loses his nerve and runs.

Their bullets take time to reach you, and you can see them coming: a bright streak in the air. Step sideways and it goes past; stand still and it finds you. Some gangsters aim ahead of a moving target, so walking in a straight line isn't always enough, and changing direction is. Walls, closed doors and tall cover stop bullets.

Z and C lean your head and gun out to one side while your feet stay where they are. From behind a corner or a doorway that's enough to see and shoot, with only your head for them to aim at, and letting go puts the wall back between you and whatever is already on its way. You can't run while leaning.

Not all of them carry tommy guns. A knife man in a flat cap has no gun at all, but he runs faster than you walk: he raises the blade before he strikes, and a step back makes it miss. On the streets a rifleman may be waiting at an upstairs window; the lamplight catches his scope a moment before a fast, well-aimed shot, and he can be shot out of his window. The bagman, carrying the night's takings, doesn't fight: he runs for the alarm bell, and if he reaches it every gun in the place knows where you are. Drop him first and the bag is yours.

Until something alerts him, a gangster only sees what's in front of him, and now and then he looks behind. If you can see his back, he can't see you: keep out of the lamplight, don't get too close, and you can slip past. A shot at a man who never saw it coming does three times the damage.

Not everyone is in the Vitale outfit. The Blue Note has patrons at its tables, a bartender who'll tell you where the office is, and a man at the piano: his playing is the music in there, and it stops on a fistful of wrong notes when the first shot is fired. The patrons run for the door and the staff get their heads down. There's someone out in the rain on Mulberry Street too. A bullet that finds a bystander is counted against you in the morning paper.

Cash is worth picking up. On each street a fence deals from a yard down an alley: look for a pawnbroker's three balls and a LOANS sign on the wall beside it. Walk up to him and press E (on a phone his list comes up by itself). He sells revolver rounds, tommy gun drums, shells, a visit from a doctor, and a steel vest that takes half of the next 60 points of harm. Click or tap a line to buy it, or press its number. He won't deal for a few seconds after a shot nearby.

Each chapter has something besides shooting. The ledger at the Blue Note is in the office safe, and partway through working the dial the whole club hears you. The lookouts on the Waterfront can be slipped past. At the Hotel Regent you ride the lift, and Vitale men are waiting at every landing on the way up.

A shot that misses can still hit something. Lamps can be shot out, and gangsters see less far when you stand in the dark. The bottles behind a bar and shop windows shatter. Crates, cars, water towers and other solid props are cover: they block bullets and sight both ways.

## Running it locally

There's no build step. The game is plain HTML, CSS and JavaScript modules. Browsers won't load modules from a double-clicked file, so serve the folder:

```sh
npm start            # then open http://127.0.0.1:8000/
```

`npm start` needs only Node. Any static server works too, for example `python3 -m http.server`.

## Tests

The tests play the game in headless Chromium: the maps, shooting, the safe and the exit, the street scenes, doors and secret walls, bullets and leaning, the knife man, the rifleman and the bagman, every level, dying and retrying, the lift, slipping past a lookout, the ending, saving, the settings panel, and the phone controls.

```sh
npm install
npx playwright install chromium
npm test
```

GitHub Actions runs them on every push and pull request (`.github/workflows/test.yml`).

To check balance, `npm run playthrough` has a bot play the whole game in real time (several minutes) and report time, damage taken, shots, kills and ammo for each scene. `npm run playthrough -- poor` plays it as a weaker player.

## How the code is organized

```
index.html            the page: a canvas and two phone buttons
style.css
src/
  main.js             starts everything and runs the frame loop
  config.js           screen size and every tuning number (speeds, damage, aim assist)
  levels.js           the story cards and the eight scenes (three streets, three locations, the lift, the roof) as plain data
  state.js            the game's shared state (one object, read and updated by the modules)
  screen.js           canvas sizing, landscape vs. portrait layout
  tiles.js            which map letters are walls (the one list everything uses)
  world.js            loading a map, walls, line of sight and cover, the light map, collision, enemy pathfinding
  doors.js            sliding doors and secret walls
  lift.js             the hotel lift: ride, stop at a landing, clear it, ride on
  folk.js             bystanders: patrons, the bartender, the pianist, the fence
  player.js           moving, leaning, shooting, reloading, pickups, cracking the safe, the exit
  enemies.js          gangster behavior: watching, idle -> chase -> aim -> fire, taking cover, running, the knife, the alarm, the Don's last steps
  bullets.js          gangsters' bullets in flight: what stops them, and when they hit you
  flow.js             title card -> chapter card -> play -> death / next chapter / the end
  audio.js            synthesized sound effects: gunshots, footsteps, rain, reloads, pickups, projector clatter
  settings.js         your choices and your saved place, kept in the browser's local storage
  panel.js            the settings panel behind the gear
  music.js            the piano accompaniment: three short tunes, synthesized note by note
  render/
    camera.js         the player's view and world-to-screen projection
    raycaster.js      walls, floors and ceilings, sprites, the gun in your hand
    film.js           grain, vignette and tint; scratches and dust
    hud.js            health/ammo bar, crosshair, messages, the touch stick
    cards.js          the title, chapter, dialogue and "CUT!" cards
    paper.js          THE END: the morning paper, with your run as its front page
    shop.js           the fence: what he sells, and his list
  art/
    bitmap.js         turns canvas drawings into grayscale bitmaps
    textures.js       wall, floor and ceiling textures
    sprites.js        gangsters, furniture, lamps, pickups and street props
    streets.js        the night sky, two-story building fronts and entrances
    guns.js           the revolver, the tommy gun and the sawn-off: small 3D models drawn from your point of view
  input/
    desktop.js        keyboard, mouse, pointer lock
    touch.js          floating stick, drag-to-aim, FIRE and SWAP
scripts/              the local server, and the playthrough bot
tests/                browser tests
```

All the art and sound are generated in code when the page loads; there are no image or audio files (`og.png` is only the preview shown when the link is shared). The renderer draws brightness values into a 640x360 buffer (`render/raycaster.js`), and `render/film.js` turns that into the finished black-and-white frame.

### Common changes

- **Difficulty:** the three difficulty levels are `DIFFICULTY` in `src/settings.js`; everything else is in `src/config.js`. Enemy health, damage and reaction time, how fast their bullets fly and how wide of the mark they go (`BULLETS`), player speed, how strong the phone aim assist is, and how much ammo you start with, find and loot (`AMMO`).
- **The story:** the prologue and epilogue are `STORY` in `src/levels.js`, and each scene's title card is its `card` lines.
- **A new level:** add an entry to `src/levels.js`. For a street scene, set `sky`, `wallHeight: 2`, `rain` and `objective: "reach"`, and pick an `entrance` for the door at the end. The legend at the top lists every map character. `npm test` checks that the map is sealed, that everything in it can be reached, and that the objective and exit never depend on finding a secret.
- **Doors and secrets:** put `D` between two walls for a door, and `!` in a wall (with open floor behind it) for a secret. Their timing and speed are in `DOORS` in `src/config.js`.
- **New furniture or pickups:** draw it in `src/art/sprites.js`, then give it a map letter in the `SPAWNS` table in `src/world.js`.
