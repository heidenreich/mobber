// All sound is synthesized: shaped noise for gunshots, footsteps and rain,
// oscillators for thumps, clicks and bells. Nothing is loaded from a file.
import { rand, clamp } from "./util.js";
import { settings } from "./settings.js";

let actx = null, noise = null, sfx = null, rainGain = null, rotorGain = null;

// For music.js, which schedules its own notes. Null until the first click or tap.
export const audioContext = () => actx;

// Browsers only allow audio after a click or tap, so input handlers call this.
export function initAudio() {
  if (actx) { if (actx.state === "suspended") actx.resume(); return; }
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  noise = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // Every effect goes through one volume control, then a limiter so a burst of gunfire doesn't clip
  sfx = actx.createGain(); sfx.gain.value = settings.sound ? 1 : 0;
  const limit = actx.createDynamicsCompressor(); limit.threshold.value = -10; limit.ratio.value = 8;
  sfx.connect(limit).connect(actx.destination);
  // Projector clatter: band-passed noise chopped at 24 frames a second
  const src = actx.createBufferSource(); src.buffer = noise; src.loop = true;
  const bp = actx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2400; bp.Q.value = 0.8;
  const g = actx.createGain(); g.gain.value = 0.006;
  const lfo = actx.createOscillator(); lfo.type = "square"; lfo.frequency.value = 24;
  const lg = actx.createGain(); lg.gain.value = 0.004; lfo.connect(lg).connect(g.gain);
  src.connect(bp).connect(g).connect(sfx); src.start(); lfo.start();
  // Rain: a steady hiss with a slow swell, silent until a street scene turns it up
  const rs = actx.createBufferSource(); rs.buffer = noise; rs.loop = true; rs.playbackRate.value = 0.9;
  const hp = actx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800;
  const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 7000;
  rainGain = actx.createGain(); rainGain.gain.value = 0;
  rs.connect(hp).connect(lp).connect(rainGain).connect(sfx); rs.start();
  // The autogiro's rotor: a low thud chopped six times a second, silent until the roof
  const ro = actx.createBufferSource(); ro.buffer = noise; ro.loop = true;
  const rl = actx.createBiquadFilter(); rl.type = "lowpass"; rl.frequency.value = 260;
  const chop = actx.createGain(); chop.gain.value = 0.5;
  const beat = actx.createOscillator(); beat.type = "sawtooth"; beat.frequency.value = 6;
  const bg = actx.createGain(); bg.gain.value = 0.5; beat.connect(bg).connect(chop.gain);
  rotorGain = actx.createGain(); rotorGain.gain.value = 0;
  ro.connect(rl).connect(chop).connect(rotorGain).connect(sfx); ro.start(); beat.start();
}
export function setSoundOn(on) { if (sfx) sfx.gain.setTargetAtTime(on ? 1 : 0, actx.currentTime, 0.05); }

// A burst of filtered noise. `type` is the filter ("lowpass", "bandpass", "highpass"), `at` a delay in seconds.
function hiss(type, freq, decay, vol, at = 0, q = 0.8) {
  if (!actx) return;
  const t = actx.currentTime + at;
  const s = actx.createBufferSource(); s.buffer = noise; s.playbackRate.value = rand(0.85, 1.15);
  const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = actx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  s.connect(f).connect(g).connect(sfx); s.start(t, rand(0, 1)); s.stop(t + decay + 0.02);
}
// A pitched note that dies away, optionally sliding to another pitch
function tone(freq, dur, type = "sine", vol = 0.05, slide = 0, at = 0) {
  if (!actx) return;
  const t = actx.currentTime + at, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfx); o.start(t); o.stop(t + dur + 0.02);
}
// A creak: a thin, rasping note that climbs and wobbles, squeezed through a narrow filter
function creak(vol, dur = 0.55) {
  if (!actx) return;
  const t = actx.currentTime + 0.03, o = actx.createOscillator(), wob = actx.createOscillator(), wg = actx.createGain();
  const f = actx.createBiquadFilter(), g = actx.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(rand(210, 260), t); o.frequency.linearRampToValueAtTime(rand(330, 400), t + dur * 0.7); o.frequency.linearRampToValueAtTime(290, t + dur);
  wob.frequency.value = rand(9, 14); wg.gain.value = 26; wob.connect(wg).connect(o.frequency);   // the judder
  f.type = "bandpass"; f.frequency.value = 1100; f.Q.value = 5;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.06); g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(sfx); o.start(t); wob.start(t); o.stop(t + dur + 0.02); wob.stop(t + dur + 0.02);
}
// A gunshot is three things at once: the crack, the body of the report, and a thump you feel. Then the room answers.
function shot({ crack, body, thump, tail = 0.1, vol = 1 }) {
  hiss("bandpass", crack, 0.05, 0.55 * vol, 0, 0.6);
  hiss("lowpass", body, 0.22, 0.5 * vol);
  if (thump) tone(150, 0.16, "sine", thump * vol, 42);
  hiss("lowpass", 600, 0.7, tail * vol, 0.03);
}
const metal = (at, vol = 0.03, f = 2400) => { tone(f, 0.035, "square", vol, 0, at); hiss("highpass", 3000, 0.03, vol * 1.5, at); };

export const SND = {
  rev: () => shot({ crack: 1900, body: 1100, thump: 0.5 }),
  // The tommy gun: a tighter report, the bolt clacking, and a spent case ringing off the floor
  tommy: () => {
    shot({ crack: 2600, body: 1500, thump: 0.25, tail: 0.05, vol: 0.7 });
    metal(0.03, 0.02, 1900);
    tone(rand(3200, 4400), 0.07, "sine", 0.012, 0, rand(0.28, 0.45));
  },
  sawn: () => { shot({ crack: 1000, body: 800, thump: 0.8, tail: 0.25, vol: 1.2 }); hiss("lowpass", 300, 0.5, 0.3, 0.02); },
  // Someone has seen you and is calling the others: two barks
  shout: d => { const v = clamp(0.09 - d * 0.006, 0.015, 0.09); tone(330, 0.12, "sawtooth", v, 250); tone(390, 0.16, "sawtooth", v, 280, 0.16); },
  // A patron's scream, and the pianist's hands coming down on the wrong keys
  scream: () => { tone(880, 0.5, "sawtooth", 0.035, 1500); tone(1320, 0.45, "sine", 0.03, 1900, 0.04); },
  clang: () => { for (const f of [196, 208, 233, 277, 311]) tone(f, 0.7, "triangle", 0.06); hiss("lowpass", 400, 0.2, 0.2); },
  // Other people's guns are duller the further off they are
  enemy: d => shot({ crack: clamp(1700 - d * 70, 500, 1700), body: clamp(1300 - d * 60, 350, 1300), thump: 0.15, vol: clamp(0.75 - d * 0.04, 0.12, 0.75) }),
  shotgun: d => shot({ crack: 900, body: clamp(900 - d * 30, 300, 900), thump: 0.5, tail: 0.18, vol: clamp(1 - d * 0.05, 0.16, 1) }),
  // A footfall. `surface` is "wet" (the street), "soft" (carpet) or "hard" (boards, tile, concrete, tar).
  step: surface => {
    if (surface === "wet") { hiss("bandpass", 900, 0.09, 0.07); hiss("highpass", 3500, 0.12, 0.03, 0.02); }
    else if (surface === "soft") hiss("lowpass", 220, 0.09, 0.16);
    else { hiss("bandpass", 1400, 0.035, 0.07, 0, 1.5); tone(95, 0.06, "sine", 0.07, 60); }
  },
  rotor: on => { if (rotorGain) rotorGain.gain.setTargetAtTime(on ? 0.5 : 0, actx.currentTime, 0.8); },
  // The lift: a motor winding up for as long as the ride lasts, and a bell at each landing
  lift: dur => { tone(62, dur, "sawtooth", 0.035, 84); hiss("lowpass", 180, dur, 0.12); },
  bell: () => { tone(1319, 0.9, "triangle", 0.07); tone(2637, 0.5, "sine", 0.02); },
  rain: on => { if (rainGain) rainGain.gain.setTargetAtTime(on ? 0.022 : 0, actx.currentTime, 0.6); },
  // What you picked up: "cash", "rounds", "med", "ledger"
  pickup: what => {
    if (what === "cash") { tone(1568, 0.3, "triangle", 0.05); tone(2093, 0.45, "triangle", 0.05, 0, 0.09); hiss("highpass", 5000, 0.05, 0.03); }   // a cash register
    else if (what === "rounds") { metal(0, 0.03, 3100); metal(0.07, 0.025, 2600); metal(0.13, 0.02, 3400); }
    else if (what === "loot") { metal(0, 0.03, 3600); tone(2637, 0.3, "triangle", 0.03, 0, 0.05); }
    else if (what === "med") { hiss("lowpass", 900, 0.16, 0.1); tone(660, 0.14, "sine", 0.04, 0, 0.1); }
    else if (what === "ledger") { hiss("bandpass", 2600, 0.2, 0.06); tone(784, 0.2, "triangle", 0.05, 0, 0.12); tone(1175, 0.4, "triangle", 0.05, 0, 0.26); }
    else { tone(880, 0.08); tone(1320, 0.12, "sine", 0.05, 0, 0.07); }
  },
  alarm: () => { for (let i = 0; i < 14; i++) { tone(1568, 0.11, "triangle", 0.07, 0, i * 0.12); tone(3136, 0.06, "sine", 0.02, 0, i * 0.12); } },
  whizz: () => { hiss("bandpass", 3200, 0.07, 0.16, 0, 3); tone(2100, 0.11, "sine", 0.025, 900); },
  hurt: () => { hiss("lowpass", 320, 0.16, 0.5); tone(120, 0.2, "sawtooth", 0.07, 70); },
  click: () => metal(0, 0.03, 1800),
  // Reloading, in the time each gun takes: thumb the cylinder open, rounds in, snap it shut;
  // or drum off, drum on, rack the bolt
  reload: (weapon, dur) => {
    if (weapon === 0) { metal(0, 0.035, 1500); for (let i = 0; i < 3; i++) metal(dur * (0.3 + i * 0.14), 0.02, 2900); metal(dur * 0.88, 0.04, 1200); }
    else { hiss("lowpass", 500, 0.1, 0.25); metal(0, 0.03, 900); hiss("lowpass", 500, 0.1, 0.3, dur * 0.55); metal(dur * 0.55, 0.03, 800); metal(dur * 0.82, 0.04, 1600); metal(dur * 0.9, 0.04, 2100); }
  },
  // A man going down: the cry cut short, then the body hitting the floor
  down: () => { tone(260, 0.28, "triangle", 0.05, 90); hiss("lowpass", 240, 0.22, 0.45, 0.38); tone(80, 0.16, "sine", 0.2, 40, 0.38); },
  // A door: the rumble of it sliding, and a dry hinge-and-runner creak that wavers as it goes
  door: d => { const v = clamp(0.05 - d * 0.004, 0.008, 0.05); tone(95, 0.45, "sawtooth", v, 70); hiss("lowpass", 500, 0.3, v * 3); creak(v * 1.6); },
  whip: hit => { hit ? (hiss("lowpass", 900, 0.12, 0.4), tone(140, 0.12, "sine", 0.3, 60)) : hiss("bandpass", 1600, 0.07, 0.1); },
  grind: () => { hiss("lowpass", 350, 1.6, 0.25); tone(55, 1.6, "sawtooth", 0.05, 45); },
  glass: () => { hiss("highpass", 4200, 0.25, 0.25); for (let i = 0; i < 4; i++) tone(rand(2600, 5200), 0.12, "sine", 0.02, 0, rand(0.02, 0.2)); },
};
