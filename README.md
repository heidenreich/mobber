# Mobber

*A gangland picture in three reels.*

A first-person shooter styled as a lost 1931 gangster film: black and white, film grain, projector flicker and silent-movie title cards. You shoot your way through the Vitale family's speakeasy, waterfront warehouse and hotel penthouse.

**Play it:** https://heidenreich.github.io/mobber/

## Controls

| | Desktop | Phone |
|---|---|---|
| Move | WASD (Shift to run) | Left thumb: up/down walks, left/right turns |
| Aim | Mouse | Drag with your right thumb, including on FIRE |
| Shoot | Click or Space | Hold FIRE. It also fires on its own when a gangster is under the crosshair |
| Reload | R (automatic when empty) | Automatic |
| Swap guns | Q, 1/2 or the mouse wheel | SWAP |
| Pause | Esc | — |

## Running it locally

There's no build step. The game is plain HTML, CSS and JavaScript modules. Browsers won't load modules from a double-clicked file, so serve the folder:

```sh
npm start            # then open http://127.0.0.1:8000/
```

`npm start` needs only Node. Any static server works too, for example `python3 -m http.server`.

## Tests

The tests play the game in headless Chromium: the maps, shooting, the ledger and exit, every chapter, dying and retrying, the ending, and the phone controls.

```sh
npm install
npx playwright install chromium
npm test
```

GitHub Actions runs them on every push and pull request (`.github/workflows/test.yml`).

## How the code is organized

```
index.html            the page: a canvas and two phone buttons
style.css
src/
  main.js             starts everything and runs the frame loop
  config.js           screen size and every tuning number (speeds, damage, aim assist)
  levels.js           the three chapters as plain data: maps and title-card text
  state.js            the game's shared state (one object, read and updated by the modules)
  screen.js           canvas sizing, landscape vs. portrait layout
  world.js            loading a map, walls, line of sight, the light map, collision
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
    sprites.js        gangsters, furniture, lamps and pickups
    guns.js           the revolver and the tommy gun
  input/
    desktop.js        keyboard, mouse, pointer lock
    touch.js          floating stick, drag-to-aim, FIRE and SWAP
scripts/              the local server
tests/                browser tests
```

All the art and sound are generated in code when the page loads; there are no image or audio files. The renderer draws brightness values into a 640x360 buffer (`render/raycaster.js`), and `render/film.js` turns that into the finished black-and-white frame.

### Common changes

- **Difficulty:** `src/config.js`. Enemy health, damage, accuracy and reaction time, player speed, and how strong the phone aim assist is.
- **A new chapter:** add an entry to `src/levels.js`. The legend at the top lists every map character. `npm test` checks that the map is sealed and that everything in it can be reached.
- **New furniture or pickups:** draw it in `src/art/sprites.js`, then give it a map letter in the `SPAWNS` table in `src/world.js`.
