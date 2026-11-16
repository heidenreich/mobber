// What you've chosen (sound, look speed, difficulty) and where you got to,
// kept in the browser's local storage so they survive closing the tab.

const KEY = "mobber.settings", SAVE_KEY = "mobber.save";

function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
function write(key, value) { try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private browsing: play without saving */ } }

// How hard the Vitale outfit hits, how well they shoot, and how far ahead of a
// moving target they aim (1 = exactly where you'll be if you keep going)
export const DIFFICULTY = [
  // `retake`: after "CUT!" you go again with at least this much health and this many revolver rounds, so a scene
  // you reached nearly empty-handed can still be got through (it grows with each further death there: RETAKE in config.js).
  // `floor`: the least health you start a scene with, however badly the last one went. `fresh`: full health for the finale
  { name: "Sunday stroll", damage: 0.6, aim: 0.8, lead: 0.5, floor: 50, fresh: true, retake: [75, 30] },
  { name: "Regular", damage: 1, aim: 1, lead: 1.1, floor: 30, retake: [60, 24] },
  { name: "Hard-boiled", damage: 1.4, aim: 1.15, lead: 1.1, floor: 15, retake: [40, 18] },
];
export const LOOK_SPEEDS = [{ name: "Slow", k: 0.6 }, { name: "Normal", k: 1 }, { name: "Fast", k: 1.5 }];

export const settings = { music: true, sound: true, look: 1, vibrate: true, difficulty: 1, ...read(KEY) };
export function saveSettings() { write(KEY, settings); }
export const difficulty = () => DIFFICULTY[settings.difficulty] || DIFFICULTY[1];
export const lookSpeed = () => (LOOK_SPEEDS[settings.look] || LOOK_SPEEDS[1]).k;

// A phone buzzes when you're hit
export function buzz(ms) { if (settings.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* not allowed here */ } } }

// The scene you last reached, with what you were carrying and your running totals
export const loadGame = () => { const s = read(SAVE_KEY); return s && Number.isInteger(s.idx) && s.player && s.stats ? s : null; };
export const saveGame = data => write(SAVE_KEY, data);
export const clearGame = () => write(SAVE_KEY, null);
