/**
 * Synthesized "orchestral-lite" instruments for Final Fealty Tactics.
 *
 * Everything is built from oscillators, a shared noise buffer, filters and
 * envelopes. Plucked instruments (harp, lute, pizzicato) use Karplus-Strong
 * strings rendered once per pitch into small cached AudioBuffers.
 *
 * Costly shared processing (ensemble chorus, choir formants, instrument body
 * EQ) lives in per-channel *inserts*, so a note only pays for its own
 * oscillators and envelope.
 *
 * Works with any BaseAudioContext (real-time or offline). Nothing here touches
 * the DOM or creates a context by itself.
 */

// ---------------------------------------------------------------------------
//  Basics
// ---------------------------------------------------------------------------

export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** velocity (0..~1.25) → amplitude, roughly 30 dB of range */
export const velAmp = (v: number): number => {
  const x = Math.max(0, Math.min(1.3, v));
  return x * x * 0.75 + x * 0.25;
};

const rnd = (a: number): number => (Math.random() * 2 - 1) * a;

export interface SynthCore {
  ctx: BaseAudioContext;
  /** 2 s of mono white noise, shared by every noisy voice */
  noise: AudioBuffer;
  waves: Record<string, PeriodicWave>;
  plucks: Map<string, AudioBuffer>;
}

/** harmonic amplitudes (1st harmonic first) for PeriodicWave timbres */
const WAVE_DEFS: Record<string, number[]> = {
  flute: [1, 0.26, 0.09, 0.04, 0.018, 0.008],
  oboe: [0.5, 1, 0.82, 0.52, 0.4, 0.26, 0.15, 0.09, 0.055, 0.03],
  clarinet: [1, 0.035, 0.48, 0.03, 0.27, 0.02, 0.13, 0.012, 0.06, 0.008, 0.03],
  bassoon: [0.75, 1, 0.72, 0.52, 0.36, 0.24, 0.15, 0.09, 0.05],
  recorder: [1, 0.14, 0.09, 0.03, 0.015],
  organ: [1, 0.6, 0.33, 0.4, 0.1, 0.18, 0.04, 0.15, 0.03, 0.05, 0, 0.04],
  organSub: [1, 0.06, 0.1, 0.02, 0.025],
  reed: [1, 0.7, 0.6, 0.45, 0.35, 0.28, 0.2, 0.14, 0.1, 0.07, 0.05, 0.03],
};

export function createCore(ctx: BaseAudioContext): SynthCore {
  const sr = ctx.sampleRate;
  const noise = ctx.createBuffer(1, Math.floor(sr * 2), sr);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const waves: Record<string, PeriodicWave> = {};
  for (const k of Object.keys(WAVE_DEFS)) {
    const amps = WAVE_DEFS[k];
    const real = new Float32Array(amps.length + 1);
    const imag = new Float32Array(amps.length + 1);
    amps.forEach((a, i) => (imag[i + 1] = a));
    waves[k] = ctx.createPeriodicWave(real, imag);
  }
  return { ctx, noise, waves, plucks: new Map() };
}

// ---------------------------------------------------------------------------
//  Node helpers
// ---------------------------------------------------------------------------

export function mkGain(ctx: BaseAudioContext, v = 1): GainNode {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}

export function mkFilter(ctx: BaseAudioContext, type: BiquadFilterType, freq: number, q = 0.707, gainDb = 0): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = Math.max(10, Math.min(20000, freq));
  f.Q.value = q;
  if (gainDb) f.gain.value = gainDb;
  return f;
}

export function mkOsc(
  ctx: BaseAudioContext,
  type: OscillatorType | PeriodicWave,
  freq: number,
  t: number,
  end: number,
  detune = 0,
): OscillatorNode {
  const o = ctx.createOscillator();
  if (typeof type === 'string') o.type = type;
  else o.setPeriodicWave(type);
  o.frequency.value = freq;
  if (detune) o.detune.value = detune;
  o.start(t);
  o.stop(end);
  return o;
}

export function mkNoise(core: SynthCore, t: number, end: number, rate = 1): AudioBufferSourceNode {
  const s = core.ctx.createBufferSource();
  s.buffer = core.noise;
  s.loop = true;
  if (rate !== 1) s.playbackRate.value = rate;
  s.start(t, Math.random() * 1.8);
  s.stop(end);
  return s;
}

export function makePanner(ctx: BaseAudioContext, pan: number): AudioNode {
  const c = ctx as BaseAudioContext & { createStereoPanner?: () => StereoPannerNode };
  if (typeof c.createStereoPanner === 'function') {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    return p;
  }
  const p = ctx.createPanner();
  p.panningModel = 'equalpower';
  const x = Math.max(-1, Math.min(1, pan));
  if (p.positionX) {
    p.positionX.value = x;
    p.positionZ.value = 1 - Math.abs(x);
  } else {
    (p as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(x, 0, 1 - Math.abs(x));
  }
  return p;
}

/** attack / decay / sustain / release; returns the time the voice is silent */
export function adsr(p: AudioParam, t: number, dur: number, a: number, d: number, s: number, r: number, peak: number): number {
  const aa = Math.min(a, Math.max(0.004, dur * 0.7));
  const aEnd = t + Math.max(0.003, aa);
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, aEnd);
  if (s < 1 && d > 0) p.setTargetAtTime(peak * s, aEnd, d / 3);
  const rel = Math.max(t + dur, aEnd + 0.005);
  p.setTargetAtTime(0, rel, Math.max(0.005, r / 5));
  return rel + r * 1.25 + 0.02;
}

/** percussive envelope: fast attack, exponential decay */
export function percEnv(p: AudioParam, t: number, peak: number, tau: number, atk = 0.002): number {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + atk);
  p.setTargetAtTime(0, t + atk, tau);
  return t + atk + tau * 7;
}

/** per-note vibrato (delayed onset) on the given detune params */
export function vibrato(ctx: BaseAudioContext, t: number, end: number, rate: number, cents: number, delay: number, targets: AudioParam[]): void {
  if (cents <= 0 || !targets.length) return;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = rate;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.setValueAtTime(0, t + delay);
  g.gain.linearRampToValueAtTime(cents, t + delay + 0.4);
  lfo.connect(g);
  for (const tg of targets) g.connect(tg);
  lfo.start(t);
  lfo.stop(end);
}

// ---------------------------------------------------------------------------
//  Inserts (per-channel shared processing)
// ---------------------------------------------------------------------------

export interface Insert {
  input: AudioNode;
  output: AudioNode;
  dispose(): void;
}

interface Tone {
  hp?: number;
  lp?: number;
  /** peaking EQ bands: [freq, gainDb, Q] */
  peaks?: Array<[number, number, number]>;
  /** high shelf [freq, gainDb] */
  shelf?: [number, number];
}

function toneChain(ctx: BaseAudioContext, tone: Tone | undefined, input: AudioNode): AudioNode {
  let node = input;
  if (!tone) return node;
  if (tone.hp) node = node.connect(mkFilter(ctx, 'highpass', tone.hp, 0.6));
  for (const [f, g, q] of tone.peaks || []) node = node.connect(mkFilter(ctx, 'peaking', f, q, g));
  if (tone.shelf) node = node.connect(mkFilter(ctx, 'highshelf', tone.shelf[0], 0.7, tone.shelf[1]));
  if (tone.lp) node = node.connect(mkFilter(ctx, 'lowpass', tone.lp, 0.6));
  return node;
}

/** static EQ insert */
export function eqInsert(core: SynthCore, tone: Tone): Insert {
  const input = mkGain(core.ctx, 1);
  const output = toneChain(core.ctx, tone, input);
  return { input, output, dispose: () => {} };
}

/**
 * Ensemble chorus: two slowly modulated delay lines (plus a faint 5-6 Hz
 * wobble) panned apart. Turns a couple of saws into a section.
 */
export function ensembleInsert(core: SynthCore, mix: number, tone?: Tone, preInput?: AudioNode): Insert {
  const ctx = core.ctx;
  const input = preInput ?? mkGain(ctx, 1);
  const source = preInput ? preInput : input;
  const output = mkGain(ctx, 1);
  const pre = toneChain(ctx, tone, source);
  const dry = mkGain(ctx, 1 - mix * 0.45);
  pre.connect(dry).connect(output);
  const lfos: OscillatorNode[] = [];
  const lines: Array<[number, number, number, number, number, number]> = [
    // base delay, slow rate, slow depth, fast rate, fast depth, pan
    [0.0115, 0.53 + rnd(0.08), 0.0012, 5.1 + rnd(0.3), 0.00011, -0.75],
    [0.0165, 0.79 + rnd(0.08), 0.0014, 5.8 + rnd(0.3), 0.0001, 0.75],
  ];
  const now = ctx.currentTime;
  for (const [base, r1, d1, r2, d2, pan] of lines) {
    const dl = ctx.createDelay(0.05);
    dl.delayTime.value = base;
    for (const [rate, depth] of [
      [r1, d1],
      [r2, d2],
    ]) {
      const l = ctx.createOscillator();
      l.frequency.value = rate;
      const lg = mkGain(ctx, depth);
      l.connect(lg).connect(dl.delayTime);
      l.start(now);
      lfos.push(l);
    }
    const wg = mkGain(ctx, mix * 0.62);
    pre.connect(dl).connect(wg).connect(makePanner(ctx, pan)).connect(output);
  }
  return {
    input,
    output,
    dispose: () => {
      for (const l of lfos) {
        try {
          l.stop();
        } catch {
          /* already stopped */
        }
      }
    },
  };
}

type Formant = [number, number, number]; // freq, gain, Q
export const VOWELS: Record<string, Formant[]> = {
  a: [
    [760, 1, 5],
    [1180, 0.55, 7],
    [2750, 0.3, 11],
    [3500, 0.12, 12],
  ],
  o: [
    [420, 1, 5],
    [780, 0.5, 7],
    [2600, 0.12, 11],
  ],
  u: [
    [330, 1, 5],
    [720, 0.32, 7],
    [2450, 0.08, 11],
  ],
  e: [
    [480, 1, 5],
    [1800, 0.45, 9],
    [2600, 0.25, 11],
  ],
};

/** parallel band-pass formant bank (choir); optional ensemble after it */
export function formantInsert(core: SynthCore, vowel: Formant[], chorus = 0.6, bodyLp = 700): Insert {
  const ctx = core.ctx;
  const input = mkGain(ctx, 1);
  const sum = mkGain(ctx, 1);
  for (const [f, g, q] of vowel) {
    input.connect(mkFilter(ctx, 'bandpass', f, q)).connect(mkGain(ctx, g * 3.2)).connect(sum);
  }
  input.connect(mkFilter(ctx, 'lowpass', bodyLp, 0.5)).connect(mkGain(ctx, 0.28)).connect(sum);
  if (chorus <= 0) return { input, output: sum, dispose: () => {} };
  const ens = ensembleInsert(core, chorus, { lp: 6500 }, sum);
  return { input, output: ens.output, dispose: ens.dispose };
}

// ---------------------------------------------------------------------------
//  Karplus-Strong plucked strings
// ---------------------------------------------------------------------------

export interface PluckSpec {
  /** cache key prefix */
  key: string;
  /** seconds to -60 dB (scaled by pitch) */
  decay: number;
  /** 0 (dark) .. 1 (bright) */
  bright: number;
  /** pluck position 0..0.5 (comb filter on the excitation) */
  pos: number;
  /** double-course detune in cents (lute) */
  course?: number;
  /** max rendered length (s) */
  len: number;
}

const PLUCK_SR = 24000;

function ksString(out: Float32Array, sr: number, f: number, decay: number, spec: PluckSpec, offset: number, amp: number): void {
  const w = (2 * Math.PI * f) / sr;
  const S = 0.5 - 0.42 * spec.bright;
  // loop lowpass (two-tap) magnitude & phase delay at the fundamental
  const lr = 1 - S + S * Math.cos(w);
  const li = -S * Math.sin(w);
  const lpMag = Math.hypot(lr, li);
  const lpDelay = -Math.atan2(li, lr) / w;
  // DC blocker (5 Hz) phase delay (negative = advance)
  const R = 1 - (2 * Math.PI * 5) / sr;
  const numArg = Math.atan2(Math.sin(w), 1 - Math.cos(w));
  const denArg = Math.atan2(R * Math.sin(w), 1 - R * Math.cos(w));
  const dcDelay = -(numArg - denArg) / w;
  const period = sr / f;
  const rest = period - lpDelay - dcDelay;
  const L = Math.max(2, Math.floor(rest - 0.1));
  const d = Math.max(0.05, rest - L);
  const C = (1 - d) / (1 + d);
  const rho = Math.pow(10, -3 / (decay * f));
  const g = Math.min(1.5, rho / lpMag);
  // excitation
  const buf = new Float32Array(L);
  let a = 0.12 + 0.8 * spec.bright;
  if (L < 40) a = Math.max(a, 0.55);
  let y = 0;
  for (let i = 0; i < L; i++) {
    y += a * (Math.random() * 2 - 1 - y);
    buf[i] = y;
  }
  if (spec.pos > 0) {
    const P = Math.max(1, Math.round(L * spec.pos));
    const tmp = buf.slice();
    for (let i = 0; i < L; i++) buf[i] = tmp[i] - (i >= P ? tmp[i - P] : 0) * 0.9;
  }
  let mean = 0;
  for (let i = 0; i < L; i++) mean += buf[i];
  mean /= L;
  let pk = 1e-9;
  for (let i = 0; i < L; i++) {
    buf[i] -= mean;
    pk = Math.max(pk, Math.abs(buf[i]));
  }
  for (let i = 0; i < L; i++) buf[i] /= pk;
  // loop
  let p = 0;
  let x1 = 0;
  let apx = 0;
  let apy = 0;
  let dcx = 0;
  let dcy = 0;
  const n = out.length;
  for (let k = offset; k < n; k++) {
    const x = buf[p];
    out[k] += x * amp;
    const lp = g * ((1 - S) * x + S * x1);
    x1 = x;
    const ap = C * lp + apx - C * apy;
    apx = lp;
    apy = ap;
    const dc = ap - dcx + R * dcy;
    dcx = ap;
    dcy = dc;
    buf[p] = dc;
    if (++p === L) p = 0;
  }
}

function renderPluck(ctx: BaseAudioContext, midi: number, spec: PluckSpec): AudioBuffer {
  const sr = PLUCK_SR;
  const f0 = mtof(midi);
  const decay = spec.decay * Math.min(1.6, Math.max(0.3, Math.pow(220 / f0, 0.4)));
  const lenSec = Math.min(spec.len, decay * 1.1 + 0.05);
  const n = Math.max(128, Math.floor(sr * lenSec));
  const out = new Float32Array(n);
  const courses = spec.course ? [-spec.course / 2, spec.course / 2] : [0];
  courses.forEach((cents, i) => {
    ksString(out, sr, f0 * Math.pow(2, cents / 1200), decay, spec, i ? Math.floor(sr * 0.0035) : 0, courses.length > 1 ? 0.6 : 1);
  });
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const g = 0.9 / peak;
  const fadeN = Math.floor(n * 0.2);
  for (let i = 0; i < n; i++) {
    let v = out[i] * g;
    if (i > n - fadeN) v *= (n - i) / fadeN;
    if (i < 16) v *= i / 16;
    out[i] = v;
  }
  const buf = ctx.createBuffer(1, n, sr);
  buf.getChannelData(0).set(out);
  return buf;
}

export function getPluck(core: SynthCore, midi: number, spec: PluckSpec): AudioBuffer {
  const k = `${spec.key}:${Math.round(midi * 10)}`;
  const hit = core.plucks.get(k);
  if (hit) {
    core.plucks.delete(k);
    core.plucks.set(k, hit);
    return hit;
  }
  const b = renderPluck(core.ctx, midi, spec);
  core.plucks.set(k, b);
  if (core.plucks.size > 180) {
    const first = core.plucks.keys().next().value;
    if (first !== undefined) core.plucks.delete(first);
  }
  return b;
}

// ---------------------------------------------------------------------------
//  Instruments
// ---------------------------------------------------------------------------

export type NoteFn = (core: SynthCore, dest: AudioNode, t: number, midi: number, dur: number, vel: number) => number;
export type RollFn = (core: SynthCore, dest: AudioNode, t: number, midi: number, dur: number, vel: number, kind: number) => number;

export interface Instrument {
  note: NoteFn;
  /** tremolo / drum roll (default: repeated notes at rollRate) */
  roll?: RollFn;
  rollRate?: number;
  insert?: (core: SynthCore) => Insert;
  /** default reverb send */
  rev: number;
  /** unpitched */
  perc?: boolean;
  /** plucked buffers used (for pre-rendering) */
  pluck?: PluckSpec;
  /** timing humanisation (s) */
  human?: number;
}

// ---- bowed strings ---------------------------------------------------------

interface BowedP {
  voices: number;
  spread: number;
  atk: number;
  rel: number;
  bright: number;
  base: number;
  amp: number;
  vib: number;
  vibDelay: number;
  dec?: number;
  sus?: number;
  q?: number;
}

function bowed(p: BowedP): NoteFn {
  return (core, dest, t, m, dur, vel) => {
    const ctx = core.ctx;
    const f = mtof(m);
    const atk = p.atk * (1.3 - 0.55 * Math.min(1, vel));
    const end = t + Math.max(dur, atk) + p.rel * 1.3 + 0.03;
    const cut = Math.min(12000, f * (1.4 + p.bright * (0.5 + vel)) + p.base);
    const lp = mkFilter(ctx, 'lowpass', cut * 0.5, p.q ?? 0.6);
    lp.frequency.setValueAtTime(cut * 0.5, t);
    lp.frequency.linearRampToValueAtTime(cut, t + Math.max(0.01, atk * 1.1));
    const g = mkGain(ctx, 0);
    const oscs: OscillatorNode[] = [];
    const n = p.voices;
    for (let k = 0; k < n; k++) {
      const det = n > 1 ? p.spread * ((k / (n - 1)) * 2 - 1) : 0;
      const o = mkOsc(ctx, 'sawtooth', f, t, end, det + rnd(2.5));
      o.connect(lp);
      oscs.push(o);
    }
    vibrato(ctx, t, end, 5 + rnd(0.5), p.vib, p.vibDelay, oscs.map((o) => o.detune));
    lp.connect(g).connect(dest);
    return adsr(g.gain, t, dur, atk, p.dec ?? 0.5, p.sus ?? 0.85, p.rel, (p.amp * velAmp(vel)) / Math.sqrt(n));
  };
}

// ---- brass -----------------------------------------------------------------

interface BrassP {
  bright: number;
  q: number;
  amp: number;
  atk: number;
  scoop: number;
  base: number;
  rel: number;
  voices: number;
}

function brass(p: BrassP): NoteFn {
  return (core, dest, t, m, dur, vel) => {
    const ctx = core.ctx;
    const f = mtof(m);
    const v = Math.min(1.2, vel);
    const atk = p.atk * (1.3 - 0.5 * Math.min(1, v));
    const aEnd = t + atk + 0.02;
    const rel = Math.max(t + dur, aEnd + 0.01);
    const end = rel + p.rel * 1.3 + 0.03;
    const fLo = f * 1.05 + 120;
    const fPk = Math.min(12000, f * (1.6 + p.bright * 4.5 * v * v) + p.base);
    const fSus = Math.min(10000, f * (1.35 + p.bright * 2.2 * v) + p.base * 0.7);
    const lp = mkFilter(ctx, 'lowpass', fLo, p.q);
    lp.frequency.setValueAtTime(fLo, t);
    lp.frequency.linearRampToValueAtTime(fPk, aEnd);
    lp.frequency.setTargetAtTime(fSus, aEnd, 0.16);
    lp.frequency.setTargetAtTime(fLo, rel, p.rel / 3);
    const g = mkGain(ctx, 0);
    for (let k = 0; k < p.voices; k++) {
      const det = p.voices > 1 ? (k ? 5 : -5) + rnd(2) : rnd(2);
      const o = mkOsc(ctx, 'sawtooth', f, t, end, det);
      o.detune.setValueAtTime(det - p.scoop, t);
      o.detune.linearRampToValueAtTime(det, t + 0.05 + atk * 0.3);
      o.connect(lp);
    }
    lp.connect(g).connect(dest);
    return Math.max(end, adsr(g.gain, t, dur, atk, 0.35, 0.78, p.rel, (p.amp * velAmp(v)) / Math.sqrt(p.voices)));
  };
}

// ---- woodwinds -------------------------------------------------------------

interface WindP {
  wave: string;
  breath: number;
  atk: number;
  rel: number;
  vib: number;
  vibDelay: number;
  lpMul: number;
  lpBase: number;
  amp: number;
  breathF?: number;
}

function wind(p: WindP): NoteFn {
  return (core, dest, t, m, dur, vel) => {
    const ctx = core.ctx;
    const f = mtof(m);
    const atk = p.atk * (1.2 - 0.4 * Math.min(1, vel));
    const end = t + Math.max(dur, atk) + p.rel * 1.3 + 0.03;
    const o = mkOsc(ctx, core.waves[p.wave], f, t, end, rnd(3));
    vibrato(ctx, t, end, 4.8 + rnd(0.5), p.vib, p.vibDelay, [o.detune]);
    const lp = mkFilter(ctx, 'lowpass', Math.min(12000, f * p.lpMul * (0.6 + 0.6 * vel) + p.lpBase), 0.5);
    const g = mkGain(ctx, 0);
    o.connect(lp).connect(g);
    if (p.breath > 0) {
      const nz = mkNoise(core, t, end);
      const bp = mkFilter(ctx, 'bandpass', Math.min(9000, f * (p.breathF ?? 2)), 1.2);
      const ng = mkGain(ctx, 0);
      nz.connect(bp).connect(ng).connect(g);
      const b = p.breath * (0.5 + vel);
      ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(b * 2.2, t + Math.min(0.03, atk));
      ng.gain.setTargetAtTime(b * 0.6, t + 0.04, 0.05);
    }
    g.connect(dest);
    return adsr(g.gain, t, dur, atk, 0.3, 0.9, p.rel, p.amp * velAmp(vel));
  };
}

// ---- plucked ---------------------------------------------------------------

interface PluckP {
  spec: PluckSpec;
  amp: number;
  /** minimum ring time (s) — plucked notes ring past their written value */
  ring: number;
  rel: number;
  lp: number;
}

function plucked(p: PluckP): NoteFn {
  return (core, dest, t, m, dur, vel) => {
    const ctx = core.ctx;
    const buf = getPluck(core, m, p.spec);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = mkFilter(ctx, 'lowpass', p.lp * (0.35 + 0.8 * Math.min(1, vel)), 0.5);
    const g = mkGain(ctx, 0);
    const hold = Math.max(dur, p.ring);
    const peak = p.amp * velAmp(vel);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.003);
    g.gain.setValueAtTime(peak, t + hold);
    g.gain.setTargetAtTime(0, t + hold, p.rel / 5);
    const end = Math.min(t + buf.duration, t + hold + p.rel * 1.3) + 0.01;
    src.connect(lp).connect(g).connect(dest);
    src.start(t);
    src.stop(end);
    return end;
  };
}

// ---- organ -----------------------------------------------------------------

const organNote: NoteFn = (core, dest, t, m, dur, vel) => {
  const ctx = core.ctx;
  const f = mtof(m);
  const rel = 0.22;
  const end = t + Math.max(dur, 0.06) + rel * 1.4 + 0.03;
  const g = mkGain(ctx, 0);
  const lp = mkFilter(ctx, 'lowpass', Math.min(9000, 2600 + f * 3), 0.5);
  mkOsc(ctx, core.waves.organ, f, t, end, rnd(1)).connect(lp);
  const o2 = mkOsc(ctx, core.waves.organ, f * 2, t, end, 3 + rnd(1));
  o2.connect(mkGain(ctx, 0.22)).connect(lp);
  if (m < 62) mkOsc(ctx, core.waves.organSub, f / 2, t, end).connect(mkGain(ctx, 0.55)).connect(lp);
  // pipe "chiff"
  const nz = mkNoise(core, t, t + 0.15);
  const cg = mkGain(ctx, 0);
  nz.connect(mkFilter(ctx, 'bandpass', Math.min(8000, f * 3), 2.5)).connect(cg).connect(g);
  percEnv(cg.gain, t, 0.35 * vel, 0.025, 0.005);
  lp.connect(g).connect(dest);
  return adsr(g.gain, t, dur, 0.045, 0.1, 0.95, rel, 0.12 * velAmp(Math.max(0.5, vel)));
};

// ---- choir -----------------------------------------------------------------

function choirNote(amp: number, atkBase: number): NoteFn {
  return (core, dest, t, m, dur, vel) => {
    const ctx = core.ctx;
    const f = mtof(m);
    const atk = atkBase * (1.3 - 0.5 * Math.min(1, vel));
    const rel = 0.75;
    const end = t + Math.max(dur, atk) + rel * 1.3 + 0.03;
    const g = mkGain(ctx, 0);
    const o1 = mkOsc(ctx, 'sawtooth', f, t, end, -7 + rnd(3));
    const o2 = mkOsc(ctx, 'sawtooth', f, t, end, 7 + rnd(3));
    const o3 = mkOsc(ctx, 'triangle', f, t, end, rnd(4));
    vibrato(ctx, t, end, 4.6 + rnd(0.6), 9, 0.35, [o1.detune, o2.detune, o3.detune]);
    const lp = mkFilter(ctx, 'lowpass', Math.min(9000, 2800 + f * 2), 0.5);
    o1.connect(lp);
    o2.connect(lp);
    o3.connect(mkGain(ctx, 0.8)).connect(lp);
    lp.connect(g).connect(dest);
    return adsr(g.gain, t, dur, atk, 0.6, 0.9, rel, amp * velAmp(vel));
  };
}

// ---- tuned percussion ------------------------------------------------------

function partials(list: Array<[number, number, number]>, amp: number, strike = 0.15): NoteFn {
  // [ratio, gain, decay tau]
  return (core, dest, t, m, _dur, vel) => {
    const ctx = core.ctx;
    const f = mtof(m);
    const out = mkGain(ctx, 1);
    let end = t + 0.1;
    const a = amp * velAmp(vel);
    for (const [ratio, gg, tau] of list) {
      const fr = f * ratio;
      if (fr > 16000) continue;
      const e = t + 0.004 + tau * 7;
      const o = mkOsc(ctx, 'sine', fr, t, e, rnd(2));
      const g = mkGain(ctx, 0);
      percEnv(g.gain, t, a * gg, tau, 0.003);
      o.connect(g).connect(out);
      end = Math.max(end, e);
    }
    if (strike > 0) {
      const nz = mkNoise(core, t, t + 0.06);
      const ng = mkGain(ctx, 0);
      nz.connect(mkFilter(ctx, 'bandpass', Math.min(9000, f * 4), 1.5)).connect(ng).connect(out);
      percEnv(ng.gain, t, a * strike, 0.008);
    }
    out.connect(dest);
    return end;
  };
}

// ---- drums -----------------------------------------------------------------

const timpaniNote: NoteFn = (core, dest, t, m, _dur, vel) => {
  const ctx = core.ctx;
  const f = mtof(m);
  const a = 0.62 * velAmp(vel);
  const out = mkGain(ctx, 1);
  const tau = 0.45 + 0.35 * Math.min(1, vel);
  const end = t + tau * 7;
  const o1 = mkOsc(ctx, 'sine', f, t, end);
  o1.frequency.setValueAtTime(f * 1.035, t);
  o1.frequency.exponentialRampToValueAtTime(f, t + 0.12);
  const g1 = mkGain(ctx, 0);
  percEnv(g1.gain, t, a, tau, 0.004);
  o1.connect(g1).connect(out);
  const o2 = mkOsc(ctx, 'sine', f * 1.505, t, end);
  const g2 = mkGain(ctx, 0);
  percEnv(g2.gain, t, a * 0.33, tau * 0.55, 0.004);
  o2.connect(g2).connect(out);
  const o3 = mkOsc(ctx, 'sine', f * 1.985, t, t + tau * 3);
  const g3 = mkGain(ctx, 0);
  percEnv(g3.gain, t, a * 0.14, tau * 0.35, 0.004);
  o3.connect(g3).connect(out);
  const nz = mkNoise(core, t, t + 0.4);
  const ng = mkGain(ctx, 0);
  nz.connect(mkFilter(ctx, 'bandpass', f * 3.5, 0.9)).connect(ng).connect(out);
  percEnv(ng.gain, t, a * 0.55, 0.025);
  const nz2 = mkNoise(core, t, t + 0.9);
  const ng2 = mkGain(ctx, 0);
  nz2.connect(mkFilter(ctx, 'lowpass', 220, 0.7)).connect(ng2).connect(out);
  percEnv(ng2.gain, t, a * 0.7, 0.09);
  out.connect(dest);
  return end;
};

function rollEnvelope(p: AudioParam, t: number, dur: number, kind: number, peak: number): void {
  const lo = peak * 0.14;
  p.setValueAtTime(0, t);
  if (kind === 2) {
    p.linearRampToValueAtTime(lo, t + 0.03);
    p.exponentialRampToValueAtTime(peak, t + Math.max(0.05, dur));
  } else if (kind === 3) {
    p.linearRampToValueAtTime(peak, t + 0.03);
    p.exponentialRampToValueAtTime(lo, t + Math.max(0.05, dur));
  } else {
    p.linearRampToValueAtTime(peak * 0.62, t + 0.04);
    p.setValueAtTime(peak * 0.62, t + Math.max(0.05, dur));
  }
}

/** amplitude-modulated sustained noise/tones (buzz roll) */
function rollAM(ctx: BaseAudioContext, t: number, end: number, rate: number, depth: number): GainNode {
  const g = mkGain(ctx, 1 - depth);
  const l = mkOsc(ctx, 'triangle', rate, t, end);
  l.connect(mkGain(ctx, depth)).connect(g.gain);
  return g;
}

const timpaniRoll: RollFn = (core, dest, t, m, dur, vel, kind) => {
  const ctx = core.ctx;
  const f = mtof(m);
  const peak = 0.5 * velAmp(vel);
  const end = t + dur + 3;
  const env = mkGain(ctx, 0);
  rollEnvelope(env.gain, t, dur, kind, peak);
  env.gain.setTargetAtTime(0, t + dur, 0.5);
  const am = rollAM(ctx, t, end, 13 + rnd(1.5), 0.35);
  mkOsc(ctx, 'sine', f, t, end).connect(am);
  mkOsc(ctx, 'sine', f * 1.505, t, end).connect(mkGain(ctx, 0.3)).connect(am);
  const nz = mkNoise(core, t, end);
  nz.connect(mkFilter(ctx, 'bandpass', f * 3, 0.8)).connect(mkGain(ctx, 0.35)).connect(am);
  nz.connect(mkFilter(ctx, 'lowpass', 200, 0.7)).connect(mkGain(ctx, 0.4)).connect(am);
  am.connect(env).connect(dest);
  return end;
};

const snareNote: NoteFn = (core, dest, t, _m, _dur, vel) => {
  const ctx = core.ctx;
  const a = 0.5 * velAmp(vel);
  const out = mkGain(ctx, 1);
  const tau = 0.055 + 0.04 * Math.min(1, vel);
  const nz = mkNoise(core, t, t + 0.6);
  const ng = mkGain(ctx, 0);
  nz.connect(mkFilter(ctx, 'highpass', 900, 0.7)).connect(mkFilter(ctx, 'peaking', 4800, 1, 5)).connect(ng).connect(out);
  percEnv(ng.gain, t, a, tau);
  const wires = mkGain(ctx, 0);
  nz.connect(mkFilter(ctx, 'bandpass', 3200, 0.8)).connect(wires).connect(out);
  percEnv(wires.gain, t, a * 0.35, tau * 2.2, 0.004);
  const b = mkOsc(ctx, 'triangle', 215, t, t + 0.3);
  b.frequency.setValueAtTime(215, t);
  b.frequency.exponentialRampToValueAtTime(168, t + 0.04);
  const bg = mkGain(ctx, 0);
  percEnv(bg.gain, t, a * 0.9, 0.035);
  b.connect(bg).connect(out);
  out.connect(dest);
  return t + 0.6;
};

const snareRoll: RollFn = (core, dest, t, _m, dur, vel, kind) => {
  const ctx = core.ctx;
  const peak = 0.34 * velAmp(vel);
  const end = t + dur + 0.4;
  const env = mkGain(ctx, 0);
  rollEnvelope(env.gain, t, dur, kind, peak);
  env.gain.setTargetAtTime(0, t + dur, 0.04);
  const am = rollAM(ctx, t, end, 23 + rnd(2), 0.55);
  const nz = mkNoise(core, t, end);
  nz.connect(mkFilter(ctx, 'highpass', 1000, 0.7)).connect(mkFilter(ctx, 'peaking', 4500, 1, 4)).connect(am);
  am.connect(env).connect(dest);
  return end;
};

const bassDrumNote: NoteFn = (core, dest, t, _m, _dur, vel) => {
  const ctx = core.ctx;
  const a = 0.95 * velAmp(vel);
  const out = mkGain(ctx, 1);
  const end = t + 2.2;
  const o = mkOsc(ctx, 'sine', 62, t, end);
  o.frequency.setValueAtTime(64, t);
  o.frequency.exponentialRampToValueAtTime(41, t + 0.35);
  const og = mkGain(ctx, 0);
  percEnv(og.gain, t, a, 0.32, 0.006);
  o.connect(og).connect(out);
  const nz = mkNoise(core, t, t + 1.2);
  const ng = mkGain(ctx, 0);
  nz.connect(mkFilter(ctx, 'lowpass', 140, 0.8)).connect(ng).connect(out);
  percEnv(ng.gain, t, a * 1.2, 0.16, 0.004);
  const cg = mkGain(ctx, 0);
  nz.connect(mkFilter(ctx, 'bandpass', 900, 1)).connect(cg).connect(out);
  percEnv(cg.gain, t, a * 0.18, 0.01);
  out.connect(dest);
  return end;
};

const bassDrumRoll: RollFn = (core, dest, t, _m, dur, vel, kind) => {
  const ctx = core.ctx;
  const peak = 0.75 * velAmp(vel);
  const end = t + dur + 2;
  const env = mkGain(ctx, 0);
  rollEnvelope(env.gain, t, dur, kind, peak);
  env.gain.setTargetAtTime(0, t + dur, 0.35);
  const am = rollAM(ctx, t, end, 11 + rnd(1), 0.4);
  mkOsc(ctx, 'sine', 46, t, end).connect(am);
  mkNoise(core, t, end).connect(mkFilter(ctx, 'lowpass', 130, 0.8)).connect(mkGain(ctx, 1.1)).connect(am);
  am.connect(env).connect(dest);
  return end;
};

const cymbalNote: NoteFn = (core, dest, t, _m, _dur, vel) => {
  const ctx = core.ctx;
  const a = 0.26 * velAmp(vel);
  const soft = vel < 0.5;
  const tau = soft ? 0.35 : 0.55 + 0.5 * Math.min(1, vel);
  const end = t + tau * 7;
  const out = mkGain(ctx, 0);
  percEnv(out.gain, t, a, tau, soft ? 0.02 : 0.003);
  const nz = mkNoise(core, t, end);
  nz.connect(mkFilter(ctx, 'highpass', 3800, 0.6)).connect(out);
  nz.connect(mkFilter(ctx, 'bandpass', 7800, 0.8)).connect(mkGain(ctx, 0.6)).connect(out);
  const metal = mkFilter(ctx, 'highpass', 5200, 0.7);
  for (const fr of [587, 845, 1253, 1640]) mkOsc(ctx, 'square', fr * (1 + rnd(0.01)), t, end).connect(metal);
  metal.connect(mkGain(ctx, 0.12)).connect(out);
  // brighter initial splash
  const sp = mkGain(ctx, 0);
  nz.connect(mkFilter(ctx, 'highpass', 6000, 0.7)).connect(sp).connect(dest);
  percEnv(sp.gain, t, a * 0.8, 0.08);
  out.connect(dest);
  return end;
};

const cymbalRoll: RollFn = (core, dest, t, _m, dur, vel, kind) => {
  const ctx = core.ctx;
  const peak = 0.2 * velAmp(vel);
  const end = t + dur + 3.5;
  const env = mkGain(ctx, 0);
  rollEnvelope(env.gain, t, dur, kind === 1 ? 2 : kind, peak);
  env.gain.setTargetAtTime(0, t + dur, 0.55);
  const nz = mkNoise(core, t, end);
  nz.connect(mkFilter(ctx, 'highpass', 3000, 0.6)).connect(env);
  nz.connect(mkFilter(ctx, 'bandpass', 6500, 1.2)).connect(mkGain(ctx, 0.7)).connect(env);
  env.connect(dest);
  return end;
};

const tambourineNote: NoteFn = (core, dest, t, _m, _dur, vel) => {
  const ctx = core.ctx;
  const a = 0.3 * velAmp(vel);
  const out = mkGain(ctx, 1);
  const nz = mkNoise(core, t, t + 0.5);
  const bp = mkFilter(ctx, 'bandpass', 8200, 1.4);
  const hp = mkFilter(ctx, 'highpass', 5200, 0.7);
  nz.connect(bp).connect(hp);
  for (let k = 0; k < 3; k++) {
    const g = mkGain(ctx, 0);
    hp.connect(g).connect(out);
    percEnv(g.gain, t + k * (0.007 + rnd(0.002)), a * (1 - k * 0.22), 0.035 + k * 0.01);
  }
  out.connect(dest);
  return t + 0.5;
};

const frameDrumNote: NoteFn = (core, dest, t, _m, _dur, vel) => {
  const ctx = core.ctx;
  const a = 0.7 * velAmp(vel);
  const out = mkGain(ctx, 1);
  const o = mkOsc(ctx, 'sine', 120, t, t + 0.9);
  o.frequency.setValueAtTime(122, t);
  o.frequency.exponentialRampToValueAtTime(78, t + 0.12);
  const og = mkGain(ctx, 0);
  percEnv(og.gain, t, a, 0.11, 0.003);
  o.connect(og).connect(out);
  const nz = mkNoise(core, t, t + 0.3);
  const ng = mkGain(ctx, 0);
  nz.connect(mkFilter(ctx, 'bandpass', 600, 1.2)).connect(ng).connect(out);
  percEnv(ng.gain, t, a * 0.5, 0.025);
  out.connect(dest);
  return t + 0.9;
};

const windPadNote: NoteFn = (core, dest, t, m, dur, vel) => {
  const ctx = core.ctx;
  const f = mtof(m);
  const end = t + dur + 2.2;
  const g = mkGain(ctx, 0);
  const nz = mkNoise(core, t, end);
  const b1 = mkFilter(ctx, 'bandpass', f, 22);
  const b2 = mkFilter(ctx, 'bandpass', f * 2.01, 26);
  b1.frequency.setValueAtTime(f * 0.985, t);
  b1.frequency.linearRampToValueAtTime(f * 1.01, t + dur + 1);
  nz.connect(b1).connect(mkGain(ctx, 11)).connect(g);
  nz.connect(b2).connect(mkGain(ctx, 5)).connect(g);
  g.connect(dest);
  return adsr(g.gain, t, dur, 1.1, 0.5, 0.9, 1.6, 0.5 * velAmp(vel));
};

// ---- generic roll (tremolo) -------------------------------------------------

function genericRoll(inst: Instrument): RollFn {
  return (core, dest, t, m, dur, vel, kind) => {
    const rate = inst.rollRate ?? 12;
    const n = Math.max(1, Math.round(dur * rate));
    const step = dur / n;
    let end = t;
    for (let k = 0; k < n; k++) {
      const f = n > 1 ? k / (n - 1) : 1;
      const vv = kind === 2 ? 0.3 + 0.7 * f : kind === 3 ? 1 - 0.7 * f : 0.75 + 0.1 * (k % 2);
      end = Math.max(end, inst.note(core, dest, t + k * step, m, step * 0.9, vel * vv));
    }
    return end;
  };
}

export function playRoll(inst: Instrument, core: SynthCore, dest: AudioNode, t: number, m: number, dur: number, vel: number, kind: number): number {
  return (inst.roll ?? genericRoll(inst))(core, dest, t, m, dur, vel, kind);
}

// ---- instrument table ------------------------------------------------------

const STR_TONE: Tone = { hp: 55, peaks: [[320, -2, 1]], shelf: [6500, -4] };
const BRASS_TONE: Tone = { hp: 45, shelf: [5500, -3] };

const HARP: PluckSpec = { key: 'harp', decay: 2.6, bright: 0.38, pos: 0.23, len: 4.2 };
const LUTE: PluckSpec = { key: 'lute', decay: 1.5, bright: 0.62, pos: 0.16, course: 4, len: 2.6 };
const PIZZ: PluckSpec = { key: 'pizz', decay: 0.55, bright: 0.3, pos: 0.3, len: 1.0 };
const BPIZZ: PluckSpec = { key: 'bpizz', decay: 1.3, bright: 0.22, pos: 0.25, len: 2.0 };

export const INSTRUMENTS: Record<string, Instrument> = {
  // --- strings
  strings: {
    note: bowed({ voices: 2, spread: 8, atk: 0.3, rel: 0.6, bright: 1.1, base: 450, amp: 0.13, vib: 0, vibDelay: 0 }),
    insert: (c) => ensembleInsert(c, 0.6, STR_TONE),
    rev: 0.4,
    rollRate: 12,
  },
  violin: {
    note: bowed({ voices: 3, spread: 9, atk: 0.09, rel: 0.32, bright: 1.35, base: 800, amp: 0.15, vib: 13, vibDelay: 0.22 }),
    insert: (c) => ensembleInsert(c, 0.4, STR_TONE),
    rev: 0.38,
    rollRate: 13,
  },
  celli: {
    note: bowed({ voices: 2, spread: 9, atk: 0.11, rel: 0.36, bright: 1.25, base: 380, amp: 0.17, vib: 11, vibDelay: 0.22 }),
    insert: (c) => ensembleInsert(c, 0.45, STR_TONE),
    rev: 0.36,
    rollRate: 12,
  },
  spicc: {
    note: bowed({ voices: 2, spread: 8, atk: 0.012, rel: 0.1, bright: 1.6, base: 700, amp: 0.2, vib: 0, vibDelay: 0, dec: 0.13, sus: 0.35 }),
    insert: (c) => ensembleInsert(c, 0.45, STR_TONE),
    rev: 0.3,
    rollRate: 14,
    human: 0.004,
  },
  contrabass: {
    note: bowed({ voices: 2, spread: 7, atk: 0.07, rel: 0.3, bright: 1.3, base: 200, amp: 0.3, vib: 6, vibDelay: 0.3 }),
    insert: (c) => ensembleInsert(c, 0.25, { hp: 30, lp: 3500 }),
    rev: 0.22,
    rollRate: 11,
  },
  fiddle: {
    note: bowed({ voices: 2, spread: 6, atk: 0.03, rel: 0.14, bright: 1.7, base: 900, amp: 0.15, vib: 14, vibDelay: 0.14, q: 0.9 }),
    insert: (c) => eqInsert(c, { hp: 180, peaks: [[2600, 3, 1.2]], shelf: [7000, -4] }),
    rev: 0.22,
    rollRate: 14,
  },
  pizz: {
    note: plucked({ spec: PIZZ, amp: 0.55, ring: 0.2, rel: 0.25, lp: 5000 }),
    insert: (c) => eqInsert(c, { hp: 70, peaks: [[250, 3, 1]] }),
    rev: 0.35,
    pluck: PIZZ,
    human: 0.005,
  },
  bassPizz: {
    note: plucked({ spec: BPIZZ, amp: 0.8, ring: 0.5, rel: 0.3, lp: 2200 }),
    insert: (c) => eqInsert(c, { hp: 30, peaks: [[110, 3, 1]] }),
    rev: 0.2,
    pluck: BPIZZ,
  },
  // --- brass
  horn: {
    note: brass({ bright: 0.55, q: 0.9, amp: 0.15, atk: 0.055, scoop: 22, base: 250, rel: 0.28, voices: 2 }),
    insert: (c) => ensembleInsert(c, 0.3, BRASS_TONE),
    rev: 0.42,
    rollRate: 10,
  },
  trumpet: {
    note: brass({ bright: 1.0, q: 1.5, amp: 0.13, atk: 0.03, scoop: 28, base: 500, rel: 0.2, voices: 2 }),
    insert: (c) => ensembleInsert(c, 0.25, BRASS_TONE),
    rev: 0.36,
    rollRate: 10,
  },
  trombone: {
    note: brass({ bright: 0.8, q: 1.2, amp: 0.17, atk: 0.05, scoop: 18, base: 200, rel: 0.25, voices: 2 }),
    insert: (c) => ensembleInsert(c, 0.25, BRASS_TONE),
    rev: 0.36,
    rollRate: 10,
  },
  tuba: {
    note: brass({ bright: 0.45, q: 0.8, amp: 0.26, atk: 0.06, scoop: 12, base: 120, rel: 0.25, voices: 1 }),
    insert: (c) => eqInsert(c, { hp: 28, lp: 2500 }),
    rev: 0.28,
  },
  // --- woodwinds
  flute: {
    note: wind({ wave: 'flute', breath: 0.05, atk: 0.06, rel: 0.14, vib: 11, vibDelay: 0.18, lpMul: 5, lpBase: 1500, amp: 0.2, breathF: 2 }),
    rev: 0.42,
  },
  oboe: {
    note: wind({ wave: 'oboe', breath: 0.02, atk: 0.04, rel: 0.1, vib: 8, vibDelay: 0.2, lpMul: 6, lpBase: 900, amp: 0.13 }),
    insert: (c) => eqInsert(c, { hp: 200, peaks: [[1250, 3, 1.3]], shelf: [5000, -5] }),
    rev: 0.38,
  },
  clarinet: {
    note: wind({ wave: 'clarinet', breath: 0.02, atk: 0.05, rel: 0.12, vib: 3, vibDelay: 0.3, lpMul: 5, lpBase: 700, amp: 0.17 }),
    insert: (c) => eqInsert(c, { hp: 120, shelf: [4500, -4] }),
    rev: 0.38,
  },
  bassoon: {
    note: wind({ wave: 'bassoon', breath: 0.015, atk: 0.05, rel: 0.12, vib: 4, vibDelay: 0.3, lpMul: 5, lpBase: 400, amp: 0.2 }),
    insert: (c) => eqInsert(c, { hp: 50, peaks: [[500, 2, 1.2]], shelf: [3000, -6] }),
    rev: 0.34,
  },
  recorder: {
    note: wind({ wave: 'recorder', breath: 0.07, atk: 0.025, rel: 0.07, vib: 7, vibDelay: 0.15, lpMul: 6, lpBase: 1500, amp: 0.17, breathF: 3 }),
    rev: 0.3,
  },
  // --- plucked
  harp: {
    note: plucked({ spec: HARP, amp: 0.5, ring: 1.6, rel: 0.6, lp: 7000 }),
    insert: (c) => eqInsert(c, { hp: 60, peaks: [[180, 2, 1]], shelf: [6000, -3] }),
    rev: 0.45,
    pluck: HARP,
    human: 0.006,
  },
  lute: {
    note: plucked({ spec: LUTE, amp: 0.42, ring: 0.5, rel: 0.25, lp: 6500 }),
    insert: (c) => eqInsert(c, { hp: 85, peaks: [[230, 3, 1.1], [2400, 2, 1.2]], shelf: [7000, -4] }),
    rev: 0.28,
    pluck: LUTE,
    human: 0.008,
  },
  // --- keyboards & tuned percussion
  organ: {
    note: organNote,
    insert: (c) => ensembleInsert(c, 0.22, { hp: 30, shelf: [5000, -4] }),
    rev: 0.55,
    rollRate: 12,
  },
  celesta: {
    note: partials(
      [
        [1, 1, 0.42],
        [2, 0.12, 0.2],
        [4, 0.22, 0.07],
      ],
      0.22,
      0.08,
    ),
    rev: 0.45,
    rollRate: 12,
  },
  glock: {
    note: partials(
      [
        [1, 1, 0.5],
        [2.76, 0.25, 0.1],
        [5.4, 0.12, 0.04],
      ],
      0.17,
      0.12,
    ),
    rev: 0.45,
    rollRate: 14,
  },
  bell: {
    note: partials(
      [
        [0.5, 0.55, 1.3],
        [1, 1, 0.95],
        [1.19, 0.5, 0.7],
        [1.5, 0.3, 0.55],
        [2, 0.35, 0.45],
        [2.52, 0.18, 0.3],
        [3.01, 0.12, 0.22],
      ],
      0.13,
      0.2,
    ),
    rev: 0.55,
  },
  // --- choir
  choir: {
    note: choirNote(0.2, 0.38),
    insert: (c) => formantInsert(c, VOWELS.a, 0.6),
    rev: 0.52,
    rollRate: 8,
  },
  choirOo: {
    note: choirNote(0.24, 0.45),
    insert: (c) => formantInsert(c, VOWELS.u, 0.6, 600),
    rev: 0.55,
  },
  choirLow: {
    note: choirNote(0.26, 0.35),
    insert: (c) => formantInsert(c, VOWELS.o, 0.5, 600),
    rev: 0.5,
  },
  // --- percussion
  timpani: { note: timpaniNote, roll: timpaniRoll, rev: 0.4, human: 0.004 },
  snare: { note: snareNote, roll: snareRoll, rev: 0.26, perc: true, human: 0.003 },
  bassDrum: { note: bassDrumNote, roll: bassDrumRoll, rev: 0.35, perc: true, human: 0.003 },
  cymbal: { note: cymbalNote, roll: cymbalRoll, rev: 0.4, perc: true, human: 0.002 },
  tambourine: { note: tambourineNote, rev: 0.2, perc: true, human: 0.006 },
  frameDrum: { note: frameDrumNote, rev: 0.22, perc: true, human: 0.005 },
  windPad: { note: windPadNote, rev: 0.6 },
};

// ---------------------------------------------------------------------------
//  Reverb & master bus
// ---------------------------------------------------------------------------

/** procedural stereo hall impulse (early reflections + damped noise tail) */
export function makeImpulse(ctx: BaseAudioContext, seconds = 2.5, t60 = 2.1, predelay = 0.022): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, len, sr);
  const pre = Math.floor(predelay * sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / sr;
      const env = Math.pow(10, (-3 * t) / t60);
      const fc = 1400 + 7800 * Math.exp(-t * 2.4);
      const a = Math.exp((-2 * Math.PI * fc) / sr);
      lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
      const fadeIn = Math.min(1, t / 0.012);
      d[i] = lp * env * fadeIn * 2.2;
    }
    // early reflections
    for (let k = 0; k < 14; k++) {
      const tt = 0.006 + Math.random() * 0.075;
      const i = pre + Math.floor(tt * sr);
      if (i < len) d[i] += (Math.random() < 0.5 ? -1 : 1) * 0.5 * Math.exp(-tt * 18);
    }
  }
  return buf;
}

function widener(ctx: BaseAudioContext, width: number): { input: GainNode; output: AudioNode } {
  const input = mkGain(ctx, 1);
  input.channelCount = 2;
  input.channelCountMode = 'explicit';
  input.channelInterpretation = 'speakers';
  const split = ctx.createChannelSplitter(2);
  const merge = ctx.createChannelMerger(2);
  input.connect(split);
  const a = (1 + width) / 2;
  const b = (1 - width) / 2;
  const LL = mkGain(ctx, a);
  const LR = mkGain(ctx, b);
  const RR = mkGain(ctx, a);
  const RL = mkGain(ctx, b);
  split.connect(LL, 0);
  split.connect(LR, 0);
  split.connect(RR, 1);
  split.connect(RL, 1);
  LL.connect(merge, 0, 0);
  RL.connect(merge, 0, 0);
  RR.connect(merge, 0, 1);
  LR.connect(merge, 0, 1);
  return { input, output: merge };
}

export interface MasterBus {
  /** music players connect their dry output here */
  music: GainNode;
  /** …and their reverb send here */
  musicSend: GainNode;
  sfx: GainNode;
  sfxSend: GainNode;
  /** volume stages */
  musicVol: GainNode[];
  sfxVol: GainNode[];
  master: GainNode;
  /** duck stages (music dry & wet) */
  duck: GainNode[];
  analyser: AnalyserNode;
}

export function createMasterBus(core: SynthCore, destination: AudioNode): MasterBus {
  const ctx = core.ctx;
  const pre = mkGain(ctx, 1);
  const reverbIn = mkGain(ctx, 1);
  const conv = ctx.createConvolver();
  conv.buffer = makeImpulse(ctx);
  const reverbOut = mkGain(ctx, 0.9);
  reverbIn.connect(mkFilter(ctx, 'highpass', 180, 0.6)).connect(conv).connect(reverbOut).connect(pre);

  const music = mkGain(ctx, 1); // duck (dry)
  const musicSend = mkGain(ctx, 1); // duck (wet)
  const mvDry = mkGain(ctx, 1);
  const mvWet = mkGain(ctx, 1);
  music.connect(mvDry).connect(pre);
  musicSend.connect(mvWet).connect(reverbIn);

  const sfx = mkGain(ctx, 1);
  const sfxSend = mkGain(ctx, 1);
  sfx.connect(pre);
  sfxSend.connect(reverbIn);

  const hp = mkFilter(ctx, 'highpass', 24, 0.7);
  const wide = widener(ctx, 1.22);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 12;
  comp.ratio.value = 2.5;
  comp.attack.value = 0.02;
  comp.release.value = 0.3;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -2.5;
  lim.knee.value = 1;
  lim.ratio.value = 20;
  lim.attack.value = 0.002;
  lim.release.value = 0.12;
  const trim = mkGain(ctx, 0.72);
  const master = mkGain(ctx, 1);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  pre.connect(hp).connect(wide.input);
  wide.output.connect(comp).connect(trim).connect(lim).connect(master).connect(destination);
  master.connect(analyser);
  return {
    music,
    musicSend,
    sfx,
    sfxSend,
    musicVol: [mvDry, mvWet],
    sfxVol: [sfx, sfxSend],
    master,
    duck: [music, musicSend],
    analyser,
  };
}
