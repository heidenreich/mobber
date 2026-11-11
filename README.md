# Mobber

*A gangland picture in three reels.*

A first-person shooter styled as a lost 1931 gangster film: black and white, film grain, projector flicker and silent-movie title cards.

Your brother Eddie kept the books at the Blue Note, and kept them honest. The Vitale family pulled him out of the river. Over one night you follow his ledger from the club to the docks to the Hotel Regent, walking the rainy streets between them, and the picture ends at dawn with a chase across the hotel roof: stop Don Vitale before his autogiro flies him out of town.

**Play it:** https://heidenreich.github.io/mobber/

## Controls

| | Desktop | Phone |
|---|---|---|
| Move | WASD (Shift to run) | Left thumb: up/down walks, left/right turns |
| Aim | Mouse | Drag with your right thumb, including on FIRE |
| Shoot | Click or Space | Hold FIRE. It also fires on its own when a gangster is under the crosshair |
| Reload | R (automatic when empty) | Automatic |
| Swap guns | Q, 1/2 or the mouse wheel | SWAP |
| Search for secret walls | Walk into a wall, or press E | Walk into a wall |
| Pause | Esc | — |

Doors open by themselves as you walk up to them. Some walls hide rooms: look for faint scrape marks near the floor.

Ammo is limited, and so is what you can carry. You start with a loaded revolver and 12 spare rounds. Boxes of rounds and tommy gun drums are lying around, and gangsters you put down leave something behind: a few revolver rounds, sometimes their tommy gun, sometimes cash. With both guns empty, a click swings the gun at anyone in arm's reach. Your health carries over from scene to scene, so first-aid kits matter.

Gangsters who hear gunfire come looking for you, finding their way around walls and through doors. Crates, cars, water towers and other solid props are cover: they block bullets and sight both ways.

## Running it locally

There's no build step. The game is plain HTML, CSS and JavaScript modules. Browsers won't load modules from a double-clicked file, so serve the folder:

```sh
npm start            # then open http://127.0.0.1:8000/
```

`npm start` needs only Node. Any static server works too, for example `python3 -m http.server`.

## Tests

The tests play the game in headless Chromium: the maps, shooting, the ledger and exit, the street scenes, doors and secret walls, every level, dying and retrying, the ending, and the phone controls.

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
  levels.js           the story cards and the seven scenes (three streets, three locations, the roof) as plain data
  state.js            the game's shared state (one object, read and updated by the modules)
  screen.js           canvas sizing, landscape vs. portrait layout
  tiles.js            which map letters are walls (the one list everything uses)
  world.js            loading a map, walls, line of sight and cover, the light map, collision, enemy pathfinding
  doors.js            sliding doors and secret walls
  player.js           moving, shooting, reloading, pickups, the exit
  enemies.js          gangster behavior: idle -> chase -> aim -> fire
  flow.js             title card -> chapter card -> play -> death / next chapter / the end
  audio.js            synthesized gunshots and projector clatter
  render/
    camera.js         the player's view and world-to-screen projection
    raycaster.js      walls, floors and ceilings, sprites, the gun in your hand
    film.js           grain, vignette and tint; scratches and dust
    hud.js            health/ammo bar, crosshair, messages, the touch stick
    cards.js          the title, chapter, "CUT!" and "THE END" cards
  art/
    bitmap.js         turns canvas drawings into grayscale bitmaps
    textures.js       wall, floor and ceiling textures
    sprites.js        gangsters, furniture, lamps, pickups and street props
    streets.js        the night sky, two-story building fronts and entrances
    guns.js           the revolver and the tommy gun: small 3D models drawn from your point of view
  input/
    desktop.js        keyboard, mouse, pointer lock
    touch.js          floating stick, drag-to-aim, FIRE and SWAP
scripts/              the local server, and the playthrough bot
tests/                browser tests
```

All the art and sound are generated in code when the page loads; there are no image or audio files. The renderer draws brightness values into a 640x360 buffer (`render/raycaster.js`), and `render/film.js` turns that into the finished black-and-white frame.

### Common changes

- **Difficulty:** `src/config.js`. Enemy health, damage, accuracy and reaction time, player speed, how strong the phone aim assist is, and how much ammo you start with, find and loot (`AMMO`).
- **The story:** the prologue and epilogue are `STORY` in `src/levels.js`, and each scene's title card is its `card` lines.
- **A new level:** add an entry to `src/levels.js`. For a street scene, set `sky`, `wallHeight: 2`, `rain` and `objective: "reach"`, and pick an `entrance` for the door at the end. The legend at the top lists every map character. `npm test` checks that the map is sealed, that everything in it can be reached, and that the objective and exit never depend on finding a secret.
- **Doors and secrets:** put `D` between two walls for a door, and `!` in a wall (with open floor behind it) for a secret. Their timing and speed are in `DOORS` in `src/config.js`.
- **New furniture or pickups:** draw it in `src/art/sprites.js`, then give it a map letter in the `SPAWNS` table in `src/world.js`.
