// The game's instruments, all made in code. Sustained instruments are oscillator voices (a
// harmonic spectrum, unison detune, a filter, an envelope and vibrato); plucked, struck and
// percussion instruments are short samples rendered once from the procedures in dsp.ts.
import { biquad, chirp, decay, fades, midiHz, mixInto, noise, normalize, partials, pluck, rng, sweepLowpass, type Signal } from './dsp';

export type InstrumentId =
  | 'strings' | 'pad' | 'choir' | 'flute' | 'reed' | 'horn' | 'brass' | 'organ' | 'bass' | 'lead' | 'drone'
  | 'harp' | 'lute' | 'pizz' | 'dulcimer' | 'bell' | 'celesta' | 'timpani'
  | 'kick' | 'tom' | 'snare' | 'framedrum' | 'cymbal' | 'shaker' | 'night';

export interface OscSpec {
  kind: 'osc';
  /** amplitudes of harmonics 1…n; a function gets the note's frequency (formants are fixed in Hz) */
  harmonics: number[] | ((hz: number) => number[]);
  unison: number;
  /** cents between the outermost unison voices */
  spread: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number; /** cutoff follows pitch by this fraction */ track?: number; /** extra cutoff at the attack, decaying over envTime */ env?: number; envTime?: number };
  vibrato?: { rate: number; cents: number; delay: number };
  /** cents the pitch starts below and slides up from, over 60 ms (brass) */
  scoop?: number;
  gain: number;
}

export interface SampleSpec {
  kind: 'sample';
  /** MIDI notes rendered; a note plays the nearest one, re-pitched */
  roots: number[];
  seconds: number;
  render: (sr: number, hz: number, r: () => number) => Signal;
  /** percussion: ignore the note's length and let the sample ring out */
  oneShot?: boolean;
  release: number;
  gain: number;
}

export type InstrumentSpec = OscSpec | SampleSpec;

const saw = (n: number, tilt = 1) => Array.from({ length: n }, (_, k) => 1 / (k + 1) ** tilt);
/** Formant spectrum: a glottal-like source shaped by resonances [Hz, bandwidth Hz, gain]. */
function formants(list: Array<[number, number, number]>, tilt = 0.6) {
  return (hz: number) => {
    const out: number[] = [];
    for (let k = 1; k * hz < 6000 && k <= 64; k++) {
      const f = k * hz;
      let g = 0.04;
      for (const [fc, bw, amp] of list) g += amp / (1 + ((f - fc) / bw) ** 2);
      out.push(g / k ** tilt);
    }
    return out;
  };
}
const span = (lo: number, hi: number, step = 6) => { const r: number[] = []; for (let m = lo; m <= hi; m += step) r.push(m); return r; };

export const INSTRUMENTS: Record<InstrumentId, InstrumentSpec> = {
  // ---- sustained voices
  strings: { kind: 'osc', harmonics: saw(28, 1.05), unison: 3, spread: 14, attack: 0.18, decay: 0.3, sustain: 0.85, release: 0.45, filter: { type: 'lowpass', freq: 1500, q: 0.6, track: 0.6 }, vibrato: { rate: 5.4, cents: 9, delay: 0.25 }, gain: 0.16 },
  pad: { kind: 'osc', harmonics: [1, 0.45, 0.3, 0.16, 0.1, 0.05, 0.03], unison: 3, spread: 16, attack: 0.7, decay: 0.6, sustain: 0.9, release: 1.1, filter: { type: 'lowpass', freq: 1200, q: 0.5, track: 0.4 }, vibrato: { rate: 4.6, cents: 6, delay: 0.5 }, gain: 0.13 },
  choir: { kind: 'osc', harmonics: formants([[730, 90, 1], [1090, 110, 0.55], [2440, 160, 0.25]]), unison: 3, spread: 18, attack: 0.45, decay: 0.4, sustain: 0.88, release: 0.8, vibrato: { rate: 5.1, cents: 12, delay: 0.3 }, gain: 0.11 },
  flute: { kind: 'osc', harmonics: [1, 0.22, 0.09, 0.04, 0.015], unison: 1, spread: 0, attack: 0.07, decay: 0.15, sustain: 0.85, release: 0.18, vibrato: { rate: 5.2, cents: 14, delay: 0.2 }, gain: 0.2 },
  reed: { kind: 'osc', harmonics: formants([[1250, 260, 1], [2900, 420, 0.4], [600, 200, 0.25]], 0.4), unison: 1, spread: 0, attack: 0.05, decay: 0.12, sustain: 0.8, release: 0.15, vibrato: { rate: 5.6, cents: 11, delay: 0.18 }, gain: 0.16 },
  horn: { kind: 'osc', harmonics: saw(22, 1.25), unison: 2, spread: 6, attack: 0.07, decay: 0.25, sustain: 0.8, release: 0.3, filter: { type: 'lowpass', freq: 700, q: 0.8, track: 0.5, env: 1400, envTime: 0.25 }, vibrato: { rate: 5, cents: 6, delay: 0.35 }, scoop: 35, gain: 0.17 },
  brass: { kind: 'osc', harmonics: saw(30, 1.0), unison: 3, spread: 10, attack: 0.04, decay: 0.2, sustain: 0.75, release: 0.22, filter: { type: 'lowpass', freq: 1100, q: 1.1, track: 0.6, env: 2600, envTime: 0.18 }, scoop: 25, gain: 0.14 },
  organ: { kind: 'osc', harmonics: [1, 0.75, 0.45, 0.42, 0, 0.22, 0, 0.18, 0, 0, 0, 0.08], unison: 2, spread: 5, attack: 0.03, decay: 0.05, sustain: 1, release: 0.25, gain: 0.12 },
  bass: { kind: 'osc', harmonics: saw(18, 1.1), unison: 2, spread: 8, attack: 0.05, decay: 0.3, sustain: 0.8, release: 0.25, filter: { type: 'lowpass', freq: 520, q: 0.7, track: 0.3, env: 500, envTime: 0.15 }, gain: 0.22 },
  lead: { kind: 'osc', harmonics: formants([[2400, 700, 1], [900, 300, 0.5]], 0.75), unison: 2, spread: 7, attack: 0.04, decay: 0.12, sustain: 0.8, release: 0.14, vibrato: { rate: 6, cents: 16, delay: 0.12 }, gain: 0.13 },
  drone: { kind: 'osc', harmonics: saw(16, 1.3), unison: 4, spread: 30, attack: 1.2, decay: 1, sustain: 0.9, release: 1.6, filter: { type: 'lowpass', freq: 420, q: 1.4, track: 0.2 }, gain: 0.12 },

  // ---- rendered samples
  harp: { kind: 'sample', roots: span(36, 96), seconds: 3.2, render: (sr, hz, r) => pluck(sr, hz, 3.2, r, { brightness: 0.75, damping: 0.25, t60: 3, body: 0.3 }), release: 0.4, gain: 0.32 },
  lute: { kind: 'sample', roots: span(40, 84), seconds: 2, render: (sr, hz, r) => pluck(sr, hz, 2, r, { brightness: 0.5, damping: 0.55, t60: 1.6, body: 0.8 }), release: 0.15, gain: 0.34 },
  pizz: { kind: 'sample', roots: span(28, 84), seconds: 0.9, render: (sr, hz, r) => pluck(sr, hz, 0.9, r, { brightness: 0.35, damping: 0.75, t60: 0.55, body: 0.6 }), release: 0.08, gain: 0.36 },
  dulcimer: {
    kind: 'sample', roots: span(48, 96), seconds: 2.4, release: 0.3, gain: 0.26,
    render: (sr, hz, r) => mixInto(pluck(sr, hz, 2.4, r, { brightness: 0.95, damping: 0.18, t60: 2.2 }), pluck(sr, hz * 1.0025, 2.4, r, { brightness: 0.9, damping: 0.2, t60: 2 }), 0.8),
  },
  bell: { kind: 'sample', roots: span(48, 96, 12), seconds: 4, render: (sr, hz) => partials(sr, hz, 4, [[0.5, 0.5, 3.6], [1, 1, 3], [1.183, 0.6, 2.4], [1.506, 0.45, 1.8], [2, 0.35, 1.5], [2.514, 0.22, 1.1], [2.662, 0.18, 0.9], [3.011, 0.12, 0.7]]), release: 1, gain: 0.2 },
  celesta: { kind: 'sample', roots: span(60, 108, 12), seconds: 2, render: (sr, hz) => partials(sr, hz, 2, [[1, 1, 1.6], [2.756, 0.32, 0.5], [5.404, 0.12, 0.25], [8.933, 0.05, 0.12]]), release: 0.5, gain: 0.22 },
  timpani: {
    kind: 'sample', roots: span(36, 60), seconds: 2.6, release: 0.4, gain: 0.5,
    render: (sr, hz, r) => {
      const body = partials(sr, hz, 2.6, [[1, 1, 2.4], [1.5, 0.5, 1.6], [1.98, 0.35, 1.2], [2.44, 0.2, 0.8], [2.9, 0.12, 0.5]], r);
      const thump = decay(biquad(noise(body.length, r), sr, 'lowpass', 400), sr, 0.25);
      return normalize(mixInto(body, thump, 0.6), 0.8);
    },
  },
  kick: { kind: 'sample', roots: [36], seconds: 0.6, oneShot: true, release: 0.05, gain: 0.5, render: (sr, _hz, r) => normalize(mixInto(decay(chirp(sr, 0.6, 130, 46, 0.12), sr, 0.5), decay(biquad(noise(len0(sr, 0.02), r), sr, 'highpass', 1800), sr, 0.02), 0.3)) },
  tom: {
    kind: 'sample', roots: span(38, 62, 6), seconds: 0.9, oneShot: true, release: 0.05, gain: 0.42,
    render: (sr, hz, r) => normalize(mixInto(decay(chirp(sr, 0.9, hz * 1.5, hz, 0.06), sr, 0.65), decay(biquad(noise(len0(sr, 0.08), r), sr, 'bandpass', 900, 0.8), sr, 0.07), 0.35)),
  },
  snare: {
    kind: 'sample', roots: [38], seconds: 0.5, oneShot: true, release: 0.05, gain: 0.32,
    render: (sr, _hz, r) => normalize(mixInto(decay(biquad(noise(len0(sr, 0.5), r), sr, 'bandpass', 2600, 0.6), sr, 0.22), decay(chirp(sr, 0.15, 260, 170, 0.04), sr, 0.12), 0.5)),
  },
  framedrum: {
    kind: 'sample', roots: [45], seconds: 0.7, oneShot: true, release: 0.05, gain: 0.45,
    render: (sr, _hz, r) => normalize(mixInto(decay(chirp(sr, 0.7, 105, 72, 0.05), sr, 0.45), decay(biquad(noise(len0(sr, 0.12), r), sr, 'lowpass', 1500), sr, 0.1), 0.45)),
  },
  cymbal: {
    kind: 'sample', roots: [60], seconds: 2.4, oneShot: true, release: 0.3, gain: 0.16,
    render: (sr, _hz, r) => {
      const n = decay(biquad(noise(len0(sr, 2.4), r), sr, 'highpass', 5200, 0.6), sr, 1.8);
      return normalize(mixInto(n, partials(sr, 3150, 2.4, [[1, 0.3, 1.2], [1.47, 0.25, 1], [2.09, 0.2, 0.8], [2.56, 0.15, 0.6]], r), 0.4));
    },
  },
  shaker: { kind: 'sample', roots: [60], seconds: 0.14, oneShot: true, release: 0.02, gain: 0.14, render: (sr, _hz, r) => normalize(fades(decay(biquad(noise(len0(sr, 0.14), r), sr, 'bandpass', 6200, 1.2), sr, 0.1), sr, 0.02, 0.03)) },
  night: {
    kind: 'sample', roots: [60], seconds: 4, oneShot: true, release: 0.4, gain: 0.08,
    render: (sr, _hz, r) => {
      const out = sweepLowpass(noise(len0(sr, 4), r), sr, 900, 700);
      for (let i = 0; i < out.length; i++) out[i] *= 0.18;
      // crickets: short bursts of a high, quickly pulsing tone
      for (let k = 0; k < 7; k++) {
        const at = Math.floor(r() * (out.length - sr * 0.4));
        const chirps = chirp(sr, 0.32, 4300 + r() * 600, 4300 + r() * 600);
        for (let i = 0; i < chirps.length; i++) chirps[i] *= (Math.sin((i / sr) * 2 * Math.PI * 28) > 0 ? 0.5 : 0) * Math.sin((Math.PI * i) / chirps.length);
        mixInto(out, chirps, 0.6, at);
      }
      return normalize(fades(out, sr, 0.3, 0.3), 0.6);
    },
  },
};

function len0(sr: number, seconds: number) { return Math.max(1, Math.round(sr * seconds)); }

/** The rendered root nearest to `midi` (samples are re-pitched from it). */
export function nearestRoot(spec: SampleSpec, midi: number): number {
  let best = spec.roots[0];
  for (const r of spec.roots) if (Math.abs(r - midi) < Math.abs(best - midi)) best = r;
  return best;
}

/** Render one sample of an instrument at a root (deterministic: seeded by instrument and root). */
export function renderSample(id: InstrumentId, root: number, sr: number): Signal {
  const spec = INSTRUMENTS[id];
  if (spec.kind !== 'sample') throw new Error(`${id} is not a sampled instrument`);
  let seed = 0;
  for (const c of id) seed = (seed * 31 + c.charCodeAt(0)) | 0;
  return normalize(spec.render(sr, midiHz(root), rng(seed ^ (root * 2654435761))), 0.9);
}

/** Harmonic amplitudes of an oscillator instrument at a frequency. */
export function harmonicsAt(spec: OscSpec, hz: number): number[] {
  const h = typeof spec.harmonics === 'function' ? spec.harmonics(hz) : spec.harmonics;
  return h.length ? h : [1];
}
