// All sound is synthesized: filtered noise for gunshots, oscillators for blips.
import { rand, clamp } from "./util.js";

let actx = null, noise = null;

// Browsers only allow audio after a click or tap, so input handlers call this.
export function initAudio() {
  if (actx) return;
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  noise = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // Projector clatter: band-passed noise chopped at 24 frames a second
  const src = actx.createBufferSource(); src.buffer = noise; src.loop = true;
  const bp = actx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2400; bp.Q.value = 0.8;
  const g = actx.createGain(); g.gain.value = 0.006;
  const lfo = actx.createOscillator(); lfo.type = "square"; lfo.frequency.value = 24;
  const lg = actx.createGain(); lg.gain.value = 0.004; lfo.connect(lg).connect(g.gain);
  src.connect(bp).connect(g).connect(actx.destination); src.start(); lfo.start();
}

function bang(cut, decay, vol, thump) {
  if (!actx) return;
  const t = actx.currentTime;
  const s = actx.createBufferSource(); s.buffer = noise; s.playbackRate.value = rand(0.8, 1.1);
  const f = actx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cut;
  const g = actx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  s.connect(f).connect(g).connect(actx.destination); s.start(t, rand(0, 0.5)); s.stop(t + decay);
  if (thump) {
    const o = actx.createOscillator(), og = actx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    og.gain.setValueAtTime(thump, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(og).connect(actx.destination); o.start(t); o.stop(t + 0.2);
  }
}

function tone(freq, dur, type = "sine", vol = 0.05, slide = 0) {
  if (!actx) return;
  const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur);
}

export const SND = {
  rev: () => bang(2600, 0.3, 0.5, 0.5),
  tommy: () => bang(3200, 0.09, 0.32, 0.25),
  enemy: d => bang(1500, 0.22, clamp(0.4 - d * 0.02, 0.06, 0.4), 0.15),
  shotgun: d => bang(1100, 0.35, clamp(0.5 - d * 0.03, 0.08, 0.5), 0.3),
  pickup: () => { tone(880, 0.08); setTimeout(() => tone(1320, 0.12), 70); },
  hurt: () => tone(170, 0.22, "sawtooth", 0.06, 80),
  click: () => tone(1800, 0.03, "square", 0.03),
  reload: () => { tone(900, 0.04, "square", 0.03); setTimeout(() => tone(600, 0.05, "square", 0.03), 300); },
  down: () => tone(220, 0.35, "triangle", 0.05, 70),
  door: d => { const v = clamp(0.05 - d * 0.004, 0.008, 0.05); tone(95, 0.45, "sawtooth", v, 70); bang(500, 0.3, v * 3, 0); },
  grind: () => { bang(350, 1.6, 0.25, 0); tone(55, 1.6, "sawtooth", 0.05, 45); },
};
