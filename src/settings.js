// What you've chosen (sound, look speed, difficulty) and where you got to,
// kept in the browser's local storage so they survive closing the tab.

const KEY = "mobber.settings", SAVE_KEY = "mobber.save";

function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
function write(key, value) { try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private browsing: play without saving */ } }

// How hard the Vitale outfit hits and how well they shoot
export const DIFFICULTY = [
  { name: "Sunday stroll", damage: 0.6, aim: 0.8 },
  { name: "Regular", damage: 1, aim: 1 },
  { name: "Hard-boiled", damage: 1.4, aim: 1.15 },
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
