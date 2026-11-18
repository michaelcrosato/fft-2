// Every sound effect, made in code: each recipe renders a short mono or stereo buffer from the
// procedures in dsp.ts the first time it is played. No recordings, and no voices: creature calls
// are wings and rumbles, and the dialogue typewriter is silent.
import {
  biquad, chirp, dbGain, decay, dcBlock, fades, fm, len, midiHz, mixInto, noise, normalize, partials, pluck, sweepLowpass,
  type Signal,
} from './dsp';

export interface SfxSpec {
  render: (sr: number, r: () => number) => Signal | [Signal, Signal];
  /** relative loudness (linear), after the render is normalized */
  gain?: number;
  /** a repeat sooner than this is dropped */
  gapMs?: number;
  /** a musical sting: lowers the music by `amount` for `seconds` */
  duck?: [number, number];
}

const S = (sr: number, seconds: number) => new Float32Array(len(sr, seconds));
/** A struck tone: a few partials, decaying. */
const tone = (sr: number, hz: number, seconds: number, bright = 0.5, t60 = seconds) =>
  partials(sr, hz, seconds, [[1, 1, t60], [2, 0.3 * bright, t60 * 0.5], [3, 0.15 * bright, t60 * 0.35], [4.2, 0.06 * bright, t60 * 0.2]]);
/** Filtered noise burst with an exponential decay. */
const burst = (sr: number, seconds: number, r: () => number, type: 'lowpass' | 'highpass' | 'bandpass', hz: number, q = 0.8, t60 = seconds) =>
  decay(biquad(noise(len(sr, seconds), r), sr, type, hz, q), sr, t60);
/** A noise "whoosh": a bandpass sweeping from f0 to f1 with a swell in the middle. */
function whoosh(sr: number, seconds: number, r: () => number, f0: number, f1: number, q = 1.6): Signal {
  const x = noise(len(sr, seconds), r);
  const out = new Float32Array(x.length);
  const chunk = 256;
  for (let i = 0; i < x.length; i += chunk) {
    const seg = x.slice(i, i + chunk);
    biquad(seg, sr, 'bandpass', f0 * (f1 / f0) ** (i / x.length), q);
    const env = Math.sin(Math.PI * Math.min(1, (i + chunk / 2) / x.length));
    for (let k = 0; k < seg.length; k++) out[i + k] = seg[k] * env * env;
  }
  return out;
}
/** Notes in sequence: [start seconds, midi, seconds, velocity] rendered with a voice. */
function phrase(sr: number, seconds: number, list: Array<[number, number, number, number]>, voice: (hz: number, d: number) => Signal): Signal {
  const out = S(sr, seconds);
  for (const [at, m, d, v] of list) mixInto(out, voice(midiHz(m), d), v, len(sr, at));
  return out;
}
const bellVoice = (sr: number) => (hz: number, d: number) => partials(sr, hz, d, [[1, 1, d], [2.01, 0.4, d * 0.6], [3.02, 0.18, d * 0.4], [4.1, 0.08, d * 0.25]]);
const pluckVoice = (sr: number, r: () => number) => (hz: number, d: number) => pluck(sr, hz, d, r, { brightness: 0.7, damping: 0.3, t60: d });
const stereo = (l: Signal, rr: Signal): [Signal, Signal] => [l, rr];
/** Short random pops: crackle for fire, sparks and shards. */
function crackle(sr: number, seconds: number, r: () => number, rate: number, hz = 3000): Signal {
  const out = S(sr, seconds);
  const n = Math.floor(seconds * rate);
  for (let k = 0; k < n; k++) {
    const at = Math.floor(r() * (out.length - sr * 0.02));
    mixInto(out, decay(biquad(noise(len(sr, 0.012), r), sr, 'bandpass', hz * (0.6 + r()), 1.5), sr, 0.01), 0.4 + r() * 0.6, at);
  }
  return out;
}

export const SFX: Record<string, SfxSpec> = {
  // ---------------------------------------------------------------- interface
  cursor: { gapMs: 30, gain: 0.35, render: (sr) => fades(decay(chirp(sr, 0.05, 1900, 1500, 0.02), sr, 0.045), sr, 0.001, 0.008) },
  confirm: { gain: 0.45, render: (sr) => phrase(sr, 0.4, [[0, 88, 0.3, 0.8], [0.055, 95, 0.32, 0.9]], (hz, d) => tone(sr, hz, d, 0.6, d * 0.8)) },
  cancel: { gain: 0.4, render: (sr) => phrase(sr, 0.36, [[0, 79, 0.25, 0.8], [0.06, 74, 0.28, 0.75]], (hz, d) => biquad(tone(sr, hz, d, 0.3, d * 0.7), sr, 'lowpass', 2400)) },
  error: { gain: 0.35, render: (sr) => { const a = decay(chirp(sr, 0.09, 220, 200, 0.09, 'square'), sr, 0.12); const out = S(sr, 0.26); mixInto(out, a, 1); mixInto(out, a, 0.9, len(sr, 0.12)); return biquad(out, sr, 'lowpass', 1800); } },
  menuOpen: { gain: 0.38, render: (sr, r) => mixInto(whoosh(sr, 0.3, r, 400, 2400), tone(sr, midiHz(86), 0.3, 0.4, 0.25), 0.5, len(sr, 0.08)) },
  turn: { gain: 0.42, render: (sr, r) => mixInto(bellVoice(sr)(midiHz(83), 0.9), crackle(sr, 0.5, r, 18, 6000), 0.12) },
  bell: { gain: 0.5, render: (sr) => partials(sr, midiHz(69), 2.2, [[0.5, 0.5, 2.2], [1, 1, 1.8], [1.183, 0.55, 1.4], [1.506, 0.4, 1.1], [2, 0.3, 0.9], [2.66, 0.15, 0.6]]) },
  gil: { gapMs: 60, gain: 0.4, render: (sr, r) => { const out = S(sr, 0.45); for (let k = 0; k < 3; k++) mixInto(out, partials(sr, 2400 + r() * 900, 0.3, [[1, 1, 0.25], [1.51, 0.5, 0.2], [2.27, 0.3, 0.12]], r), 0.8 - k * 0.15, len(sr, k * 0.05 + r() * 0.02)); return out; } },
  item: { gain: 0.4, render: (sr) => phrase(sr, 0.7, [[0, 84, 0.45, 0.8], [0.07, 88, 0.45, 0.8], [0.14, 91, 0.5, 0.9]], bellVoice(sr)) },
  chest: { gain: 0.45, render: (sr, r) => { const out = S(sr, 0.9); mixInto(out, decay(chirp(sr, 0.25, 140, 70, 0.08), sr, 0.2), 0.9); mixInto(out, phrase(sr, 0.8, [[0, 79, 0.5, 0.7], [0.08, 83, 0.5, 0.75], [0.16, 86, 0.6, 0.85]], pluckVoice(sr, r)), 0.8, len(sr, 0.12)); return out; } },
  crystal: { gain: 0.42, render: (sr, r) => mixInto(decay(fm(sr, 1.2, 1320, 3.5, 2.5, 0.2), sr, 1.1), crackle(sr, 1, r, 14, 7000), 0.25) },
  stone: { gain: 0.5, render: (sr, r) => mixInto(partials(sr, midiHz(50), 2.6, [[1, 1, 2.6], [2.01, 0.5, 2], [3.02, 0.3, 1.5], [4.98, 0.15, 1]], r), decay(fm(sr, 2.2, midiHz(74), 2, 1.5, 0), sr, 2), 0.35) },

  // ---------------------------------------------------------------- movement and world
  step: { gapMs: 60, gain: 0.28, render: (sr, r) => mixInto(burst(sr, 0.07, r, 'lowpass', 900, 0.7, 0.06), decay(chirp(sr, 0.07, 120, 80, 0.03), sr, 0.06), 0.5) },
  jump: { gain: 0.35, render: (sr, r) => whoosh(sr, 0.28, r, 300, 1500, 1.2) },
  land: { gain: 0.45, render: (sr, r) => mixInto(decay(chirp(sr, 0.3, 95, 48, 0.08), sr, 0.25), burst(sr, 0.12, r, 'lowpass', 1200, 0.7, 0.1), 0.6) },
  door: { gain: 0.45, render: (sr, r) => { const creak = decay(fm(sr, 0.7, 170, 0.51, 4, 2), sr, 1.2); biquad(creak, sr, 'bandpass', 900, 0.9); for (let i = 0; i < creak.length; i++) creak[i] *= 0.6 + 0.4 * Math.sin(i / sr * 2 * Math.PI * 11); const out = S(sr, 0.9); mixInto(out, creak, 0.6); mixInto(out, mixInto(decay(chirp(sr, 0.25, 110, 60, 0.05), sr, 0.2), burst(sr, 0.1, r, 'lowpass', 700), 0.5), 1, len(sr, 0.62)); return out; } },
  wind: { gain: 0.4, render: (sr, r) => whoosh(sr, 0.7, r, 1800, 500, 0.9) },
  water: { gain: 0.4, render: (sr, r) => { const out = burst(sr, 0.5, r, 'highpass', 1500, 0.7, 0.35); for (let k = 0; k < 9; k++) mixInto(out, decay(chirp(sr, 0.06, 300 + r() * 500, 700 + r() * 900), sr, 0.06), 0.35, len(sr, r() * 0.42)); return out; } },

  // ---------------------------------------------------------------- combat
  swing: { gapMs: 40, gain: 0.4, render: (sr, r) => whoosh(sr, 0.2, r, 900, 2600, 1.8) },
  hit: { gapMs: 40, gain: 0.55, render: (sr, r) => mixInto(decay(chirp(sr, 0.18, 130, 60, 0.05), sr, 0.15), burst(sr, 0.12, r, 'bandpass', 1400, 0.7, 0.07), 0.8) },
  hitHeavy: { gain: 0.6, render: (sr, r) => { const out = mixInto(decay(chirp(sr, 0.5, 95, 38, 0.12), sr, 0.45), burst(sr, 0.3, r, 'lowpass', 2600, 0.6, 0.2), 0.9); return mixInto(out, crackle(sr, 0.25, r, 40, 1800), 0.3); } },
  crit: { gain: 0.55, render: (sr, r) => mixInto(mixInto(decay(chirp(sr, 0.2, 140, 60, 0.05), sr, 0.16), burst(sr, 0.1, r, 'highpass', 2500, 0.8, 0.06), 0.8), partials(sr, 1850, 0.6, [[1, 1, 0.5], [1.48, 0.6, 0.4], [2.21, 0.35, 0.3]], r), 0.4) },
  miss: { gapMs: 40, gain: 0.32, render: (sr, r) => whoosh(sr, 0.22, r, 2200, 700, 2.2) },
  block: { gain: 0.5, render: (sr, r) => mixInto(partials(sr, 920, 0.45, [[1, 1, 0.4], [1.37, 0.7, 0.3], [2.02, 0.45, 0.22], [2.81, 0.25, 0.15]], r), burst(sr, 0.03, r, 'highpass', 3000), 0.6) },
  arrow: { gain: 0.42, render: (sr, r) => mixInto(pluck(sr, 180, 0.25, r, { brightness: 0.8, damping: 0.6, t60: 0.2 }), decay(chirp(sr, 0.32, 2100, 1300, 0.3), sr, 0.4), 0.25, len(sr, 0.03)) },
  throw: { gain: 0.38, render: (sr, r) => { const w = whoosh(sr, 0.3, r, 700, 1900, 1.4); for (let i = 0; i < w.length; i++) w[i] *= 0.6 + 0.4 * Math.sin(i / sr * 2 * Math.PI * 22); return w; } },
  gun: { gain: 0.6, render: (sr, r) => mixInto(burst(sr, 0.5, r, 'lowpass', 5000, 0.6, 0.22), decay(chirp(sr, 0.5, 90, 40, 0.1), sr, 0.4), 0.9) },
  gunshot: { gain: 0.6, render: (sr, r) => mixInto(burst(sr, 0.35, r, 'highpass', 1500, 0.7, 0.12), decay(chirp(sr, 0.3, 160, 60, 0.05), sr, 0.2), 0.6) },
  steal: { gain: 0.4, render: (sr, r) => mixInto(whoosh(sr, 0.18, r, 1200, 3200, 2), partials(sr, 3100, 0.3, [[1, 1, 0.25], [1.5, 0.4, 0.15]], r), 0.5, len(sr, 0.12)) },
  ko: { gain: 0.45, render: (sr, r) => mixInto(decay(chirp(sr, 0.7, 420, 110, 0.55, 'tri'), sr, 0.8), decay(chirp(sr, 0.25, 80, 45, 0.05), sr, 0.2), 0.7, len(sr, 0.45)) },
  earth: { gain: 0.6, render: (sr, r) => { const x = burst(sr, 1, r, 'lowpass', 160, 0.9, 0.9); for (let i = 0; i < x.length; i++) x[i] *= 0.7 + 0.3 * Math.sin(i / sr * 2 * Math.PI * 13); return mixInto(normalize(x), crackle(sr, 0.6, r, 50, 900), 0.4); } },
  explosion: { gain: 0.65, render: (sr, r) => { const n = sweepLowpass(decay(noise(len(sr, 1.3), r), sr, 1.1), sr, 5000, 180); return mixInto(normalize(n), decay(chirp(sr, 1, 70, 30, 0.4), sr, 0.9), 0.8); } },
  meteor: { gain: 0.6, render: (sr, r) => { const out = S(sr, 1.6); mixInto(out, decay(chirp(sr, 0.6, 2000, 300, 0.6), sr, 0.9), 0.5); mixInto(out, normalize(sweepLowpass(decay(noise(len(sr, 1), r), sr, 0.9), sr, 4000, 160)), 0.9, len(sr, 0.55)); return out; } },

  // ---------------------------------------------------------------- magic
  magic: { gain: 0.45, render: (sr, r) => mixInto(decay(fm(sr, 0.9, 600, 1.5, 3, 0.4), sr, 0.9), crackle(sr, 0.8, r, 16, 6500), 0.2) },
  fire: { gain: 0.5, render: (sr, r) => { const roar = biquad(noise(len(sr, 1), r), sr, 'lowpass', 900); for (let i = 0; i < roar.length; i++) roar[i] *= Math.sin(Math.PI * i / roar.length) ** 1.5; return mixInto(normalize(roar, 0.6), crackle(sr, 1, r, 45, 2500), 0.6); } },
  ice: { gain: 0.45, render: (sr, r) => { const out = S(sr, 1); for (let k = 0; k < 6; k++) mixInto(out, partials(sr, 1800 + r() * 3000, 0.6, [[1, 1, 0.5], [2.4, 0.4, 0.3], [3.7, 0.2, 0.2]], r), 0.4, len(sr, k * 0.06)); return mixInto(out, crackle(sr, 0.8, r, 30, 8000), 0.3); } },
  bolt: { gain: 0.5, render: (sr, r) => mixInto(decay(chirp(sr, 0.3, 3000, 180, 0.15, 'square'), sr, 0.3), crackle(sr, 0.4, r, 90, 4000), 0.7) },
  thunderclap: { gain: 0.65, render: (sr, r) => { const out = burst(sr, 2.2, r, 'lowpass', 300, 0.6, 2); for (let i = 0; i < out.length; i++) out[i] *= 0.6 + 0.4 * Math.sin(i / sr * 2 * Math.PI * 3.3); return mixInto(normalize(out), burst(sr, 0.15, r, 'highpass', 1800, 0.7, 0.12), 0.9); } },
  poison: { gain: 0.42, render: (sr, r) => { const out = biquad(burst(sr, 0.9, r, 'lowpass', 500, 0.7, 0.8), sr, 'peak', 300, 2, 6); for (let k = 0; k < 10; k++) mixInto(out, decay(chirp(sr, 0.09, 180 + r() * 150, 400 + r() * 300), sr, 0.08), 0.5, len(sr, r() * 0.8)); return out; } },
  holy: { gain: 0.45, render: (sr, r) => mixInto(phrase(sr, 1.5, [[0, 74, 1.4, 0.7], [0.04, 78, 1.4, 0.6], [0.08, 81, 1.4, 0.6], [0.12, 86, 1.3, 0.5]], bellVoice(sr)), crackle(sr, 1.2, r, 20, 9000), 0.15) },
  dark: { gain: 0.5, render: (sr) => { const x = mixInto(mixInto(chirp(sr, 1.1, 55, 52, 1.1, 'tri'), chirp(sr, 1.1, 58.3, 56, 1.1, 'tri'), 0.8), fm(sr, 1.1, 110, 0.5, 4, 1), 0.3); for (let i = 0; i < x.length; i++) { const p = i / x.length; x[i] *= p < 0.8 ? p / 0.8 : (1 - p) / 0.2; } return biquad(x, sr, 'lowpass', 700); } },
  time: { gain: 0.42, render: (sr, r) => { const out = S(sr, 1.1); for (let k = 0; k < 8; k++) mixInto(out, burst(sr, 0.02, r, 'highpass', 4000, 0.7, 0.015), 0.6, len(sr, k * 0.12)); return mixInto(out, phrase(sr, 1.1, [[0.1, 91, 0.6, 0.6], [0.3, 86, 0.6, 0.6], [0.5, 83, 0.7, 0.6]], bellVoice(sr)), 0.7); } },
  heal: { gain: 0.42, render: (sr, r) => mixInto(phrase(sr, 1.2, [[0, 72, 0.8, 0.6], [0.1, 76, 0.8, 0.6], [0.2, 79, 0.8, 0.65], [0.3, 84, 0.9, 0.7]], (hz, d) => decay(fm(sr, d, hz, 2, 0.6, 0.1), sr, d)), crackle(sr, 1, r, 12, 8000), 0.12) },
  buff: { gain: 0.4, render: (sr) => phrase(sr, 0.6, [[0, 79, 0.4, 0.7], [0.09, 86, 0.45, 0.8]], (hz, d) => tone(sr, hz, d, 0.5)) },
  debuff: { gain: 0.4, render: (sr) => biquad(phrase(sr, 0.6, [[0, 75, 0.4, 0.7], [0.1, 70, 0.45, 0.7]], (hz, d) => tone(sr, hz, d, 0.4)), sr, 'lowpass', 2000) },
  status: { gain: 0.38, render: (sr) => { const x = tone(sr, midiHz(81), 0.45, 0.4); for (let i = 0; i < x.length; i++) x[i] *= 0.75 + 0.25 * Math.sin(i / sr * 2 * Math.PI * 9); return x; } },
  charge: { gain: 0.4, render: (sr, r) => mixInto(whoosh(sr, 0.65, r, 300, 3000, 2.5), chirp(sr, 0.65, 220, 880, 0.65, 'tri'), 0.25) },
  summon: { gain: 0.55, render: (sr, r) => { const out = S(sr, 1.8); const swell = biquad(chirp(sr, 1.8, 55, 110, 1.6, 'tri'), sr, 'lowpass', 600); for (let i = 0; i < swell.length; i++) swell[i] *= Math.sin(Math.PI * i / swell.length); mixInto(out, swell, 0.8); mixInto(out, decay(fm(sr, 1.2, 440, 2, 4, 0.5), sr, 1.2), 0.4, len(sr, 0.5)); return mixInto(out, crackle(sr, 1.6, r, 25, 7000), 0.15); } },
  demon: { gain: 0.55, render: (sr) => { const growl = fm(sr, 1.5, 55, 1.414, 8, 3); for (let i = 0; i < growl.length; i++) growl[i] *= Math.sin(Math.PI * i / growl.length) ** 0.7; return mixInto(biquad(growl, sr, 'lowpass', 900), mixInto(chirp(sr, 1.5, 233, 220, 1.5, 'tri'), chirp(sr, 1.5, 247, 233, 1.5, 'tri'), 0.8), 0.15); } },

  // ---------------------------------------------------------------- performances (instrumental)
  song: { gain: 0.42, render: (sr, r) => phrase(sr, 1.4, [[0, 74, 0.8, 0.8], [0.18, 78, 0.8, 0.75], [0.36, 81, 0.8, 0.8], [0.54, 86, 0.9, 0.85], [0.72, 83, 0.7, 0.7]], pluckVoice(sr, r)) },
  dance: { gain: 0.4, render: (sr, r) => { const out = S(sr, 0.8); for (let k = 0; k < 6; k++) mixInto(out, fades(burst(sr, 0.08, r, 'bandpass', 6000, 1.2, 0.07), sr, 0.01, 0.02), k % 2 ? 0.5 : 0.8, len(sr, k * 0.12)); for (const k of [0, 3]) mixInto(out, decay(chirp(sr, 0.3, 105, 72, 0.05), sr, 0.25), 0.8, len(sr, k * 0.12)); return out; } },

  // ---------------------------------------------------------------- creatures, without voices
  kweh: { gain: 0.4, render: (sr, r) => { const out = S(sr, 0.45); for (let k = 0; k < 5; k++) mixInto(out, fades(burst(sr, 0.06, r, 'bandpass', 1100, 0.6, 0.05), sr, 0.008, 0.02), 0.7, len(sr, k * 0.075)); return out; } },
  roar: { gain: 0.55, render: (sr, r) => { const x = burst(sr, 1.1, r, 'lowpass', 220, 0.9, 1); for (let i = 0; i < x.length; i++) x[i] *= Math.sin(Math.PI * i / x.length) * (0.75 + 0.25 * Math.sin(i / sr * 2 * Math.PI * 17)); return mixInto(normalize(x), decay(chirp(sr, 0.4, 70, 40, 0.1), sr, 0.35), 0.7, len(sr, 0.5)); } },

  // ---------------------------------------------------------------- stings
  victory: { gain: 0.5, duck: [0.6, 1.6], render: (sr, r) => stereo(phrase(sr, 1.8, [[0, 74, 0.5, 0.8], [0.14, 78, 0.5, 0.8], [0.28, 81, 0.5, 0.85], [0.42, 86, 1.3, 1]], pluckVoice(sr, r)), phrase(sr, 1.8, [[0.42, 69, 1.3, 0.7], [0.42, 78, 1.3, 0.6], [0.42, 81, 1.3, 0.6]], bellVoice(sr))) },
  defeat: { gain: 0.5, duck: [0.7, 2], render: (sr) => mixInto(phrase(sr, 2, [[0, 69, 0.9, 0.7], [0.4, 65, 0.9, 0.65], [0.8, 62, 1.2, 0.7]], bellVoice(sr)), biquad(chirp(sr, 2, 73.4, 73.4, 2, 'tri'), sr, 'lowpass', 400), 0.25) },
  levelUp: { gain: 0.5, duck: [0.5, 1.1], render: (sr, r) => phrase(sr, 1.2, [[0, 79, 0.6, 0.7], [0.08, 83, 0.6, 0.75], [0.16, 86, 0.6, 0.8], [0.24, 91, 0.9, 0.95]], (hz, d) => mixInto(tone(sr, hz, d, 0.6), pluckVoice(sr, r)(hz, d), 0.5)) },
  jobUp: { gain: 0.5, duck: [0.5, 1.3], render: (sr, r) => mixInto(phrase(sr, 1.4, [[0, 84, 0.6, 0.75], [0.08, 88, 0.6, 0.8], [0.16, 91, 0.6, 0.85], [0.26, 96, 1.1, 1]], bellVoice(sr)), burst(sr, 1.2, r, 'highpass', 6000, 0.6, 1), 0.08, len(sr, 0.26)) },
  learn: { gain: 0.45, duck: [0.4, 1], render: (sr) => phrase(sr, 1, [[0, 88, 0.6, 0.7], [0.1, 92, 0.6, 0.75], [0.2, 95, 0.8, 0.85]], (hz, d) => decay(fm(sr, d, hz, 3.01, 1.2, 0.1), sr, d)) },
};

/** Cue played for an id the registry lacks. */
export const FALLBACK_SFX = 'confirm';

/** Words scene scripts use for a sound, and the effect that plays for each. */
export const SFX_ALIASES: Record<string, string> = {
  sword: 'swing', slash: 'swing', splash: 'water', scream: 'hitHeavy', knock: 'door', footsteps: 'step',
  crowd: 'bell', thunder: 'thunderclap', lightning: 'bolt',
};
/** The effect a scene's sound word plays. */
export const sfxFor = (word: string) => SFX_ALIASES[word] ?? word;

/** Render a cue: deterministic, normalized, DC-free, with soft edges. */
export function renderSfx(id: string, sr: number): [Signal, Signal] {
  const spec = SFX[id] ?? SFX[FALLBACK_SFX];
  let seed = 0;
  for (const c of id) seed = (seed * 33 + c.charCodeAt(0)) | 0;
  const r = (() => { let s = seed >>> 0; return () => { let t = (s += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const out = spec.render(sr, r);
  const [l, rr] = Array.isArray(out) ? out : [out, out];
  const chans = [...new Set([l, rr])];
  for (const ch of chans) { dcBlock(ch, sr); fades(ch, sr, 0.0015, 0.02); }
  // normalize both channels together, after the DC block and fades have had their say
  const both = Math.max(...chans.map((x) => x.reduce((p, v) => Math.max(p, Math.abs(v)), 0)));
  const target = dbGain(-1.5);
  if (both > 0) for (const ch of chans) for (let i = 0; i < ch.length; i++) ch[i] *= target / both;
  return [l, rr];
}
