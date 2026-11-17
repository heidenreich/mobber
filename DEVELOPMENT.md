# Developing Mobber

How to test and change the game. To run it, see [Running it locally](README.md#running-it-locally) in the README.

## Tests

The tests play the game in headless Chromium: the maps, shooting, the safe and the exit, the street scenes, doors and secret walls, bullets and leaning, the knife man, the rifleman and the bagman, every level, dying and retrying, the lift, slipping past a lookout, the ending, saving, the settings panel, and the phone controls.

```sh
npm install
npx playwright install chromium
npm test
```

GitHub Actions runs them on every push and pull request (`.github/workflows/test.yml`).

A test file starts with `useBrowser()` from `tests/helpers.js`, which gives it one server and one browser, closes every game a test opened, and fails the test if the page logged an error. `scene(title, { clear, hp })` drops a test straight into a scene without clicking through the cards (one test covers those), and `landing(page, n)` skips the lift's ride to its next landing.

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
  crane.js            the loads slung from the warehouse crane, and what happens when one is shot down
  folk.js             bystanders: patrons, the bartender, the pianist
  fence.js            the fence's walk-up window (or, indoors, the night porter's hatch): where it is, when it's open, when the shutter is down
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
    shop.js           the fence: what he sells and buys, and his list
    choice.js         the end of the chase: finish the Don or hand him over
  art/
    bitmap.js         turns canvas drawings into grayscale bitmaps
    textures.js       wall, floor and ceiling textures
    sprites.js        gangsters, furniture, lamps, pickups and street props
    streets.js        the night sky, two-story building fronts and entrances, the harbour (water, quay edge, freighter)
    guns.js           the revolver, the tommy gun and the sawn-off: small 3D models drawn from your point of view
  input/
    desktop.js        keyboard, mouse, pointer lock
    touch.js          floating stick, drag-to-aim, FIRE and SWAP
scripts/              the local server, and the playthrough bot
tests/                browser tests
```

All the art and sound are generated in code when the page loads; there are no image or audio files (`og.png` is only the preview shown when the link is shared). The renderer draws brightness values into a 640x360 buffer (`render/raycaster.js`), and `render/film.js` turns that into the finished black-and-white frame.

## Common changes

- **The roof chase:** `route` and `takeoff` on the roof's entry in `src/levels.js` (where the Don runs, how long he stands at each point, and the seconds until the autogiro can fly), and `CHASE` in `src/config.js`.
- **Difficulty:** the three difficulty levels are `DIFFICULTY` in `src/settings.js`; everything else is in `src/config.js`. Enemy health, damage and reaction time, how fast their bullets fly and how wide of the mark they go (`BULLETS`), player speed, how strong the phone aim assist is, and how much ammo you start with, find and loot (`AMMO`).
- **The story:** the prologue and epilogue are `STORY` in `src/levels.js`, and each scene's title card is its `card` lines.
- **A new level:** add an entry to `src/levels.js`. For a street scene, set `sky`, `wallHeight: 2`, `rain` and `objective: "reach"`, and pick an `entrance` for the door at the end. Set `harbour: true` to make the top edge the water: `=` is open water past the quay's edge and `J`, `Y`, `X` are a moored freighter. The legend at the top lists every map character. `npm test` checks that the map is sealed, that everything in it can be reached, and that the objective and exit never depend on finding a secret.
- **Doors and secrets:** put `D` between two walls for a door, and `!` in a wall (with open floor behind it) for a secret. Their timing and speed are in `DOORS` in `src/config.js`.
- **New furniture or pickups:** draw it in `src/art/sprites.js`, then give it a map letter in the `SPAWNS` table in `src/world.js`.
