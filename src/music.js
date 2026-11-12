// The piano accompaniment, as a silent picture would have had: three short tunes,
// synthesized note by note. A stride left hand (bass note, chord, bass note, chord)
// is generated from each tune's chords; the right hand is written out or arpeggiated.
//
//   street  slow and minor, for the rain and the title cards
//   joint   a rag, for the club, the pier and the hotel
//   chase   fast and minor, for the roof
import { audioContext } from "./audio.js";
import { settings } from "./settings.js";

const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// "C#5" -> MIDI note number
const midi = n => { const m = /^([A-G])([#b]?)(\d)$/.exec(n); return NAMES[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12 * (+m[3] + 1); };
const CHORDS = { maj: [0, 4, 7], min: [0, 3, 7], 7: [0, 4, 7, 10] };

// One bar per chord: [bass note, chord type]. `melody` is one list per bar of
// [eighth-note step 0-7, note, length in steps]. `arp` plays the chord's notes up and down instead.
const SCORES = {
  street: {
    bpm: 76,
    chords: [["A2", "min"], ["A2", "min"], ["D2", "min"], ["A2", "min"], ["F2", "maj"], ["E2", "7"], ["A2", "min"], ["E2", "7"]],
    melody: [
      [[0, "E5", 3], [3, "D5", 1], [4, "C5", 4]],
      [[0, "A4", 5], [6, "C5", 2]],
      [[0, "D5", 3], [3, "F5", 1], [4, "E5", 2], [6, "D5", 2]],
      [[0, "C5", 2], [2, "A4", 6]],
      [[0, "A5", 3], [3, "G5", 1], [4, "F5", 4]],
      [[0, "E5", 2], [2, "G#5", 2], [4, "B5", 4]],
      [[0, "A5", 2], [2, "E5", 2], [4, "C5", 2], [6, "A4", 2]],
      [[0, "B4", 4], [4, "E4", 4]],
    ],
  },
  joint: {
    bpm: 104,
    chords: [["C3", "maj"], ["C3", "maj"], ["F2", "maj"], ["C3", "maj"], ["C3", "maj"], ["A2", "7"], ["D3", "7"], ["G2", "7"]],
    melody: [
      [[0, "E5", 1], [1, "G5", 2], [3, "E5", 1], [4, "C6", 2], [6, "G5", 2]],
      [[0, "A5", 1], [1, "G5", 2], [3, "E5", 1], [4, "G5", 4]],
      [[0, "F5", 1], [1, "A5", 2], [3, "F5", 1], [4, "C6", 2], [6, "A5", 2]],
      [[0, "G5", 1], [1, "E5", 2], [3, "C5", 1], [4, "E5", 4]],
      [[0, "E5", 1], [1, "G5", 2], [3, "E5", 1], [4, "C6", 2], [6, "E6", 2]],
      [[0, "C#6", 1], [1, "A5", 2], [3, "E5", 1], [4, "A5", 4]],
      [[0, "D6", 1], [1, "A5", 2], [3, "F#5", 1], [4, "A5", 2], [6, "C6", 2]],
      [[0, "B5", 2], [2, "G5", 2], [4, "D5", 2], [6, "G5", 2]],
    ],
  },
  chase: {
    bpm: 138, arp: true,
    chords: [["D2", "min"], ["D2", "min"], ["G2", "min"], ["D2", "min"], ["Bb2", "maj"], ["A2", "7"], ["D2", "min"], ["A2", "7"]],
  },
};

// Turn a score into a list of steps (eighth notes), each a list of [midi note, length in steps, loudness]
function arrange(score) {
  const steps = [];
  score.chords.forEach(([bass, type], bar) => {
    const root = midi(bass), tones = CHORDS[type], at = bar * 8;
    for (let i = 0; i < 8; i++) steps[at + i] = [];
    const chord = (i, vel) => { for (const t of tones) steps[at + i].push([root + 12 + t, 1, vel]); };
    if (score.arp) {
      // Driving: a bass note on every beat, a chord stab between, and a running right hand
      for (let beat = 0; beat < 4; beat++) { steps[at + beat * 2].push([root + (beat % 2 ? 7 : 0), 1, 0.9]); chord(beat * 2 + 1, 0.32); }
      const run = [...tones.slice(0, 3), 12].map(t => root + 36 + t);
      [0, 1, 2, 3, 2, 1, 0, 1].forEach((k, i) => steps[at + i].push([run[k], 1, 0.6]));
    } else {
      steps[at].push([root, 2, 0.9]); chord(2, 0.4); steps[at + 4].push([root + 7, 2, 0.75]); chord(6, 0.4);
      for (const [i, note, len] of score.melody[bar]) steps[at + i].push([midi(note), len, 0.8]);
    }
  });
  return steps;
}
const TUNES = Object.fromEntries(Object.entries(SCORES).map(([k, s]) => [k, { step: 60 / s.bpm / 2, steps: arrange(s) }]));

const VOLUME = 0.2;
let want = null, playing = null, pos = 0, nextTime = 0, out = null, level = 1;

// A slightly out-of-tune upright: two detuned strings and an octave partial, struck and left to ring
function strike(ac, note, when, dur, vel) {
  const f = 440 * 2 ** ((note - 69) / 12), ring = Math.max(0.3, dur * 1.5);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(vel * 0.5, when + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, when + ring);
  g.connect(out);
  for (const [mult, type, amount] of [[1, "triangle", 1], [1.006, "triangle", 0.7], [2, "sine", 0.25]]) {
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = type; o.frequency.value = f * mult; og.gain.value = amount;
    o.connect(og).connect(g); o.start(when); o.stop(when + ring + 0.05);
  }
}

// Notes are scheduled a little ahead of time, so the tempo doesn't depend on the frame rate
function tick() {
  const ac = audioContext();
  if (!ac || ac.state !== "running") return;
  if (!out) {
    const tone = ac.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 2600;   // a worn soundtrack has no top end
    out = ac.createGain(); out.gain.value = VOLUME;
    out.connect(tone).connect(ac.destination);
  }
  out.gain.setTargetAtTime(settings.music ? VOLUME * level : 0, ac.currentTime, 0.25);
  if (want !== playing) { playing = want; pos = 0; nextTime = ac.currentTime + 0.3; }
  if (!playing) return;
  const tune = TUNES[playing];
  if (nextTime < ac.currentTime) nextTime = ac.currentTime + 0.1;   // the page was in the background: pick up from now
  while (nextTime < ac.currentTime + 0.4) {
    for (const [note, len, vel] of tune.steps[pos % tune.steps.length]) strike(ac, note, nextTime, len * tune.step, vel);
    nextTime += tune.step; pos++;
  }
}
setInterval(tick, 90);

export const music = {
  // Start a tune (or carry on, if it's already the one playing). `vol` is 0..1.
  play(name, vol = 1) { want = name; level = vol; },
  stop() { want = null; },
  get playing() { return playing; },
};
