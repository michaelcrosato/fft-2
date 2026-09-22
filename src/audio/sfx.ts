/**
 * Synthesized sound effects. Every effect is a small function that builds a
 * throw-away node graph into `x.out` starting at `x.t` and returns the time
 * at which it is silent.
 *
 * `x.p` is a frequency multiplier (1 = normal, 1.12 ≈ +2 semitones).
 */
import {
  INSTRUMENTS,
  SynthCore,
  VOWELS,
  mkFilter,
  mkGain,
  mkNoise,
  mkOsc,
  percEnv,
  playRoll,
} from './synth';

export interface SfxArgs {
  core: SynthCore;
  ctx: BaseAudioContext;
  out: AudioNode;
  t: number;
  /** pitch multiplier */
  p: number;
}

export interface SfxDef {
  play: (x: SfxArgs) => number;
  /** output gain (default 1) */
  vol?: number;
  /** reverb send (default 0.18) */
  rev?: number;
  /** minimum retrigger interval in ms (default 25) */
  gap?: number;
}

const rnd = (a: number) => (Math.random() * 2 - 1) * a;
const semis = (p: number) => 12 * Math.log2(p || 1);

// ---------------------------------------------------------------------------
//  Building blocks
// ---------------------------------------------------------------------------

interface ToneOpts {
  type?: OscillatorType;
  f: number;
  /** glide target */
  f1?: number;
  /** glide time (default: dur) */
  glide?: number;
  dur: number;
  peak: number;
  a?: number;
  /** exponential decay time-constant instead of a flat sustain */
  tau?: number;
  lp?: number;
  q?: number;
  delay?: number;
  detune?: number;
}

function tone(x: SfxArgs, o: ToneOpts): number {
  const { ctx } = x;
  const t = x.t + (o.delay || 0);
  const a = o.a ?? 0.004;
  const end = t + (o.tau ? a + o.tau * 7 : o.dur + 0.06);
  const f0 = o.f * x.p;
  const osc = mkOsc(ctx, o.type || 'sine', f0, t, end, o.detune || 0);
  if (o.f1) {
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1 * x.p), t + (o.glide ?? o.dur));
  }
  const g = mkGain(ctx, 0);
  if (o.tau) percEnv(g.gain, t, o.peak, o.tau, a);
  else {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.peak, t + a);
    g.gain.setValueAtTime(o.peak, t + Math.max(a, o.dur - 0.02));
    g.gain.linearRampToValueAtTime(0, t + o.dur + 0.04);
  }
  let node: AudioNode = osc;
  if (o.lp) node = node.connect(mkFilter(ctx, 'lowpass', o.lp, o.q ?? 0.7));
  node.connect(g).connect(x.out);
  return end;
}

interface NoiseOpts {
  type?: BiquadFilterType;
  f: number;
  f1?: number;
  q?: number;
  dur: number;
  peak: number;
  a?: number;
  tau?: number;
  delay?: number;
  rate?: number;
}

function noise(x: SfxArgs, o: NoiseOpts): number {
  const { ctx } = x;
  const t = x.t + (o.delay || 0);
  const a = o.a ?? 0.003;
  const end = t + (o.tau ? a + o.tau * 7 : o.dur + 0.06);
  const src = mkNoise(x.core, t, end, o.rate ?? 1);
  const fl = mkFilter(ctx, o.type || 'bandpass', Math.min(18000, o.f * x.p), o.q ?? 1);
  if (o.f1) {
    fl.frequency.setValueAtTime(Math.min(18000, o.f * x.p), t);
    fl.frequency.exponentialRampToValueAtTime(Math.min(18000, Math.max(20, o.f1 * x.p)), t + o.dur);
  }
  const g = mkGain(ctx, 0);
  if (o.tau) percEnv(g.gain, t, o.peak, o.tau, a);
  else {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.peak, t + a);
    g.gain.setValueAtTime(o.peak, t + Math.max(a, o.dur * 0.5));
    g.gain.linearRampToValueAtTime(0, t + o.dur);
  }
  src.connect(fl).connect(g).connect(x.out);
  return end;
}

/** bell-like cluster of decaying sine partials */
function ping(x: SfxArgs, f: number, parts: Array<[number, number, number]>, peak: number, delay = 0): number {
  let end = x.t;
  for (const [r, g, tau] of parts) end = Math.max(end, tone(x, { f: f * r, dur: tau * 6, peak: peak * g, tau, delay }));
  return end;
}

/** play a note on one of the music instruments */
function inst(x: SfxArgs, id: string, midi: number, dur: number, vel: number, delay = 0, dest?: AudioNode): number {
  const i = INSTRUMENTS[id];
  if (!i) return x.t;
  return i.note(x.core, dest ?? x.out, x.t + delay, midi + semis(x.p), dur, vel);
}

/** a choir chord through a static formant bank */
function choirChord(x: SfxArgs, id: 'choir' | 'choirOo' | 'choirLow', vowel: keyof typeof VOWELS, notes: number[], dur: number, vel: number, delay = 0): number {
  const { ctx } = x;
  const input = mkGain(ctx, 1);
  const sum = mkGain(ctx, 1);
  for (const [f, g, q] of VOWELS[vowel]) input.connect(mkFilter(ctx, 'bandpass', f, q)).connect(mkGain(ctx, g * 3.2)).connect(sum);
  input.connect(mkFilter(ctx, 'lowpass', 700, 0.5)).connect(mkGain(ctx, 0.28)).connect(sum);
  sum.connect(x.out);
  let end = x.t;
  for (const m of notes) end = Math.max(end, inst(x, id, m, dur, vel, delay, input));
  return end;
}

function shaper(ctx: BaseAudioContext, amount: number): WaveShaperNode {
  const ws = ctx.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(v * amount) / Math.tanh(amount);
  }
  ws.curve = curve;
  return ws;
}

function sweep(x: SfxArgs, f0: number, fMid: number, f1: number, dur: number, peak: number, q = 2, delay = 0): number {
  const { ctx } = x;
  const t = x.t + delay;
  const end = t + dur + 0.05;
  const src = mkNoise(x.core, t, end);
  const bp = mkFilter(ctx, 'bandpass', f0 * x.p, q);
  bp.frequency.setValueAtTime(f0 * x.p, t);
  bp.frequency.exponentialRampToValueAtTime(fMid * x.p, t + dur * 0.45);
  bp.frequency.exponentialRampToValueAtTime(f1 * x.p, t + dur);
  const g = mkGain(ctx, 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + dur * 0.4);
  g.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(bp).connect(g).connect(x.out);
  return end;
}

function crackle(x: SfxArgs, count: number, span: number, peak: number, f = 2500, delay = 0): number {
  let end = x.t;
  for (let k = 0; k < count; k++) {
    end = Math.max(end, noise(x, { type: 'highpass', f: f * (0.7 + Math.random() * 0.8), q: 0.7, dur: 0.02, peak: peak * (0.4 + Math.random() * 0.6), tau: 0.004 + Math.random() * 0.006, delay: delay + Math.random() * span }));
  }
  return end;
}

const max = (...v: number[]) => Math.max(...v);

// ---------------------------------------------------------------------------
//  The catalogue
// ---------------------------------------------------------------------------

export const SFX: Record<string, SfxDef> = {
  // ---- UI --------------------------------------------------------------
  cursor: {
    vol: 0.7,
    rev: 0.05,
    gap: 30,
    play: (x) =>
      max(tone(x, { type: 'sine', f: 1500, f1: 1250, glide: 0.025, dur: 0.03, peak: 0.12, tau: 0.012 }), tone(x, { type: 'triangle', f: 3000, dur: 0.02, peak: 0.025, tau: 0.006 })),
  },
  confirm: {
    vol: 0.8,
    rev: 0.12,
    play: (x) =>
      max(
        tone(x, { type: 'triangle', f: 880, dur: 0.06, peak: 0.16, lp: 4000, tau: 0.04 }),
        tone(x, { type: 'triangle', f: 1318.5, dur: 0.1, peak: 0.16, lp: 5000, tau: 0.08, delay: 0.055 }),
        inst(x, 'celesta', 88, 0.2, 0.45, 0.055),
      ),
  },
  cancel: {
    vol: 0.8,
    rev: 0.08,
    play: (x) =>
      max(
        tone(x, { type: 'triangle', f: 740, dur: 0.05, peak: 0.15, lp: 3000, tau: 0.03 }),
        tone(x, { type: 'triangle', f: 494, f1: 440, dur: 0.1, peak: 0.15, lp: 2500, tau: 0.06, delay: 0.05 }),
      ),
  },
  error: {
    vol: 0.8,
    rev: 0.05,
    play: (x) =>
      max(
        tone(x, { type: 'sawtooth', f: 185, dur: 0.08, peak: 0.16, lp: 900, q: 2 }),
        tone(x, { type: 'sawtooth', f: 175, dur: 0.12, peak: 0.16, lp: 800, q: 2, delay: 0.12 }),
      ),
  },
  menuOpen: {
    vol: 0.75,
    rev: 0.2,
    play: (x) =>
      max(
        noise(x, { f: 500, f1: 2600, q: 2, dur: 0.14, peak: 0.1, a: 0.05 }),
        inst(x, 'celesta', 83, 0.2, 0.4, 0.05),
        inst(x, 'celesta', 88, 0.3, 0.35, 0.1),
      ),
  },
  turn: {
    vol: 0.8,
    rev: 0.3,
    play: (x) => max(inst(x, 'celesta', 81, 0.3, 0.55), inst(x, 'celesta', 88, 0.5, 0.5, 0.09), inst(x, 'harp', 69, 0.5, 0.35, 0.09)),
  },
  textBlip: {
    vol: 0.5,
    rev: 0.02,
    gap: 28,
    play: (x) => tone(x, { type: 'triangle', f: 620 * (1 + rnd(0.03)), dur: 0.018, peak: 0.1, lp: 2400, a: 0.002, tau: 0.01 }),
  },

  // ---- movement ----------------------------------------------------------
  step: {
    vol: 0.6,
    rev: 0.06,
    gap: 40,
    play: (x) => {
      const r = 1 + rnd(0.1);
      return max(
        noise(x, { type: 'lowpass', f: 520 * r, q: 0.8, dur: 0.05, peak: 0.3, tau: 0.018 }),
        tone(x, { f: 120 * r, f1: 70, dur: 0.05, peak: 0.16, tau: 0.02 }),
      );
    },
  },
  jump: {
    vol: 0.7,
    rev: 0.1,
    play: (x) => max(noise(x, { f: 380, f1: 1700, q: 1.4, dur: 0.18, peak: 0.16, a: 0.04 }), tone(x, { f: 170, f1: 360, dur: 0.14, peak: 0.07, a: 0.01, lp: 1200 })),
  },
  land: {
    vol: 0.8,
    rev: 0.1,
    play: (x) =>
      max(
        tone(x, { f: 100, f1: 46, glide: 0.12, dur: 0.18, peak: 0.42, tau: 0.06 }),
        noise(x, { type: 'lowpass', f: 450, q: 0.8, dur: 0.12, peak: 0.35, tau: 0.03 }),
        noise(x, { type: 'bandpass', f: 1500, q: 1, dur: 0.05, peak: 0.08, tau: 0.01, delay: 0.005 }),
      ),
  },

  // ---- combat ------------------------------------------------------------
  swing: { vol: 0.8, rev: 0.1, play: (x) => max(sweep(x, 600, 2900, 800, 0.2, 0.32, 2.4), sweep(x, 1200, 4200, 1600, 0.18, 0.08, 3)) },
  hit: {
    vol: 0.9,
    rev: 0.14,
    play: (x) =>
      max(
        noise(x, { type: 'bandpass', f: 1400, q: 0.8, dur: 0.15, peak: 0.5, tau: 0.04 }),
        tone(x, { f: 165, f1: 55, glide: 0.1, dur: 0.14, peak: 0.55, tau: 0.045 }),
        noise(x, { type: 'highpass', f: 4000, q: 0.7, dur: 0.02, peak: 0.25, tau: 0.006 }),
      ),
  },
  hitHeavy: {
    vol: 1,
    rev: 0.18,
    play: (x) => {
      const { ctx } = x;
      const drive = shaper(ctx, 2.5);
      const pre = mkGain(ctx, 1);
      pre.connect(drive).connect(mkGain(ctx, 0.7)).connect(x.out);
      const sub: SfxArgs = { ...x, out: pre };
      return max(
        tone(sub, { f: 120, f1: 34, glide: 0.2, dur: 0.3, peak: 0.8, tau: 0.12 }),
        noise(sub, { type: 'lowpass', f: 2200, q: 0.7, dur: 0.25, peak: 0.7, tau: 0.07 }),
        noise(sub, { type: 'bandpass', f: 600, q: 1, dur: 0.3, peak: 0.35, tau: 0.1 }),
        noise(x, { type: 'highpass', f: 3500, q: 0.7, dur: 0.02, peak: 0.3, tau: 0.008 }),
      );
    },
  },
  crit: {
    vol: 1,
    rev: 0.25,
    play: (x) =>
      max(
        SFX.hit.play(x),
        SFX.hit.play({ ...x, t: x.t + 0.045, p: x.p * 0.8 }),
        ping(x, 2100, [
          [1, 1, 0.12],
          [1.51, 0.6, 0.09],
          [2.23, 0.4, 0.05],
        ], 0.12, 0.03),
        noise(x, { f: 2000, f1: 8000, q: 2, dur: 0.18, peak: 0.12, a: 0.02 }),
      ),
  },
  miss: { vol: 0.7, rev: 0.12, play: (x) => max(sweep(x, 1500, 4200, 2500, 0.15, 0.14, 3), tone(x, { f: 900, f1: 1400, dur: 0.12, peak: 0.03, a: 0.03 })) },
  block: {
    vol: 0.9,
    rev: 0.25,
    play: (x) =>
      max(
        ping(x, 520, [
          [1, 1, 0.09],
          [2.4, 0.7, 0.07],
          [3.52, 0.5, 0.05],
          [5.02, 0.35, 0.035],
          [6.54, 0.2, 0.02],
        ], 0.2),
        noise(x, { type: 'highpass', f: 3000, q: 0.7, dur: 0.03, peak: 0.35, tau: 0.008 }),
        noise(x, { type: 'bandpass', f: 900, q: 1, dur: 0.06, peak: 0.2, tau: 0.02 }),
      ),
  },
  arrow: {
    vol: 0.85,
    rev: 0.15,
    play: (x) => max(inst(x, 'lute', 40, 0.15, 0.9), noise(x, { f: 3200, f1: 1300, q: 5, dur: 0.28, peak: 0.16, a: 0.04, delay: 0.03 })),
  },
  gun: {
    vol: 1,
    rev: 0.35,
    play: (x) =>
      max(
        noise(x, { type: 'highpass', f: 1200, q: 0.7, dur: 0.1, peak: 0.85, tau: 0.025, a: 0.001 }),
        noise(x, { type: 'lowpass', f: 900, q: 0.8, dur: 0.3, peak: 0.6, tau: 0.09 }),
        tone(x, { f: 95, f1: 38, glide: 0.15, dur: 0.2, peak: 0.6, tau: 0.08 }),
      ),
  },
  throw: { vol: 0.75, rev: 0.1, play: (x) => max(sweep(x, 900, 2600, 1200, 0.16, 0.22, 2), tone(x, { f: 380, f1: 620, dur: 0.1, peak: 0.04, a: 0.02 })) },

  // ---- magic -------------------------------------------------------------
  magic: {
    vol: 0.8,
    rev: 0.4,
    play: (x) => {
      const scale = [81, 83, 86, 88, 90, 93, 95, 98];
      let end = noise(x, { f: 2000, f1: 7000, q: 3, dur: 0.45, peak: 0.06, a: 0.15 });
      for (let k = 0; k < 7; k++) end = max(end, inst(x, k % 2 ? 'glock' : 'celesta', scale[Math.min(7, k + Math.floor(Math.random() * 2))], 0.2, 0.4 + k * 0.05, k * 0.038));
      return end;
    },
  },
  charge: {
    vol: 0.75,
    rev: 0.3,
    play: (x) => {
      const { ctx, t } = x;
      const end = t + 1.05;
      const o = mkOsc(ctx, 'sawtooth', 110 * x.p, t, end);
      const o2 = mkOsc(ctx, 'sawtooth', 165 * x.p, t, end, 6);
      const lp = mkFilter(ctx, 'lowpass', 300, 4);
      lp.frequency.setValueAtTime(300, t);
      lp.frequency.exponentialRampToValueAtTime(3800, t + 0.95);
      const am = mkGain(ctx, 0.6);
      mkOsc(ctx, 'sine', 11, t, end).connect(mkGain(ctx, 0.4)).connect(am.gain);
      const g = mkGain(ctx, 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.8);
      g.gain.linearRampToValueAtTime(0, t + 1.0);
      o.connect(lp);
      o2.connect(lp);
      lp.connect(am).connect(g).connect(x.out);
      return max(end, tone(x, { f: 220, f1: 880, dur: 0.95, peak: 0.05, a: 0.6 }));
    },
  },
  fire: {
    vol: 0.9,
    rev: 0.3,
    play: (x) => {
      const { ctx, t } = x;
      const end = t + 0.95;
      const src = mkNoise(x.core, t, end);
      const lp = mkFilter(ctx, 'lowpass', 400, 1.5);
      lp.frequency.setValueAtTime(400 * x.p, t);
      lp.frequency.exponentialRampToValueAtTime(3200 * x.p, t + 0.25);
      lp.frequency.exponentialRampToValueAtTime(900 * x.p, t + 0.9);
      const g = mkGain(ctx, 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.12);
      g.gain.linearRampToValueAtTime(0.3, t + 0.5);
      g.gain.linearRampToValueAtTime(0, t + 0.9);
      src.connect(lp).connect(g).connect(x.out);
      return max(end, crackle(x, 16, 0.75, 0.25), tone(x, { type: 'sawtooth', f: 70, dur: 0.7, peak: 0.12, lp: 260, a: 0.1 }));
    },
  },
  ice: {
    vol: 0.85,
    rev: 0.45,
    play: (x) => {
      let end = noise(x, { type: 'highpass', f: 5000, q: 0.7, dur: 0.6, peak: 0.07, a: 0.25 });
      for (let k = 0; k < 9; k++) {
        const f = 2400 + Math.random() * 2800;
        end = max(end, tone(x, { f, dur: 0.3, peak: 0.07, tau: 0.06 + Math.random() * 0.08, delay: Math.random() * 0.5 }));
      }
      return max(end, inst(x, 'glock', 88, 0.4, 0.45, 0.05), inst(x, 'glock', 95, 0.4, 0.4, 0.12));
    },
  },
  bolt: {
    vol: 0.9,
    rev: 0.35,
    play: (x) => {
      const { ctx, t } = x;
      const end = t + 0.3;
      const o = mkOsc(ctx, 'sawtooth', 1200 * x.p, t, end);
      o.frequency.setValueAtTime(1200 * x.p, t);
      o.frequency.exponentialRampToValueAtTime(180 * x.p, t + 0.2);
      const fm = mkOsc(ctx, 'square', 43, t, end);
      fm.connect(mkGain(ctx, 400 * x.p)).connect(o.frequency);
      const g = mkGain(ctx, 0);
      percEnv(g.gain, t, 0.13, 0.07);
      o.connect(mkFilter(ctx, 'lowpass', 5000, 0.7)).connect(g).connect(x.out);
      return max(
        end,
        noise(x, { type: 'highpass', f: 2000, q: 0.7, dur: 0.12, peak: 0.55, tau: 0.035 }),
        crackle(x, 8, 0.15, 0.3, 4000),
        noise(x, { type: 'lowpass', f: 280, q: 0.7, dur: 0.9, peak: 0.45, tau: 0.3, delay: 0.05, a: 0.05 }),
      );
    },
  },
  water: {
    vol: 0.85,
    rev: 0.35,
    play: (x) => {
      let end = noise(x, { type: 'lowpass', f: 1300, q: 0.8, dur: 0.7, peak: 0.16, a: 0.2 });
      for (let k = 0; k < 11; k++) {
        const f = 300 + Math.random() * 650;
        end = max(end, tone(x, { f, f1: f * 1.9, glide: 0.05, dur: 0.07, peak: 0.1, tau: 0.03, delay: Math.random() * 0.6 }));
      }
      return end;
    },
  },
  earth: {
    vol: 1,
    rev: 0.25,
    play: (x) =>
      max(
        noise(x, { type: 'lowpass', f: 180, q: 0.8, dur: 1.0, peak: 0.8, a: 0.08 }),
        tone(x, { f: 46, f1: 38, dur: 0.9, peak: 0.35, a: 0.05 }),
        crackle(x, 10, 0.8, 0.3, 1200),
        noise(x, { type: 'bandpass', f: 700, q: 1, dur: 0.3, peak: 0.3, tau: 0.08 }),
      ),
  },
  wind: { vol: 0.85, rev: 0.35, play: (x) => max(sweep(x, 400, 1900, 600, 1.0, 0.4, 4), sweep(x, 800, 2800, 1100, 0.9, 0.15, 6, 0.08)) },
  holy: {
    vol: 0.85,
    rev: 0.6,
    play: (x) => {
      let end = choirChord(x, 'choir', 'a', [69, 73, 76, 81], 0.8, 0.7);
      const arp = [93, 97, 100, 105];
      arp.forEach((m, k) => (end = max(end, inst(x, 'glock', m, 0.3, 0.4, 0.1 + k * 0.07))));
      return max(end, noise(x, { type: 'highpass', f: 6000, q: 0.7, dur: 1.0, peak: 0.05, a: 0.4 }));
    },
  },
  dark: {
    vol: 0.9,
    rev: 0.45,
    play: (x) => {
      const { ctx, t } = x;
      const end = t + 1.4;
      const lp = mkFilter(ctx, 'lowpass', 150, 3);
      lp.frequency.setValueAtTime(150, t);
      lp.frequency.exponentialRampToValueAtTime(900, t + 0.9);
      lp.frequency.exponentialRampToValueAtTime(200, t + 1.3);
      const g = mkGain(ctx, 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.8);
      g.gain.linearRampToValueAtTime(0, t + 1.3);
      for (const f of [65.4, 69.3, 98]) mkOsc(ctx, 'sawtooth', f * x.p, t, end, rnd(8)).connect(lp);
      lp.connect(g).connect(x.out);
      return max(end, choirChord(x, 'choirLow', 'o', [48, 49, 54], 0.7, 0.55, 0.1), noise(x, { type: 'lowpass', f: 300, f1: 1200, q: 2, dur: 0.9, peak: 0.12, a: 0.8 }));
    },
  },
  poison: {
    vol: 0.85,
    rev: 0.3,
    play: (x) => {
      let end = x.t;
      for (let k = 0; k < 3; k++) {
        const { ctx } = x;
        const t = x.t + k * 0.13;
        const e = t + 0.4;
        const o = mkOsc(ctx, 'triangle', 700 * x.p, t, e);
        o.frequency.setValueAtTime(700 * x.p * (1 - k * 0.1), t);
        o.frequency.exponentialRampToValueAtTime(240 * x.p, t + 0.35);
        mkOsc(ctx, 'sine', 9, t, e).connect(mkGain(ctx, 60)).connect(o.frequency);
        const g = mkGain(ctx, 0);
        percEnv(g.gain, t, 0.1, 0.12, 0.02);
        o.connect(mkFilter(ctx, 'lowpass', 1500, 1)).connect(g).connect(x.out);
        end = max(end, e);
      }
      for (let k = 0; k < 5; k++) end = max(end, tone(x, { f: 180 + Math.random() * 200, f1: 400, glide: 0.04, dur: 0.05, peak: 0.08, tau: 0.02, delay: 0.1 + Math.random() * 0.45 }));
      return end;
    },
  },
  heal: {
    vol: 0.85,
    rev: 0.5,
    play: (x) => {
      let end = noise(x, { type: 'highpass', f: 5500, q: 0.7, dur: 0.9, peak: 0.04, a: 0.3 });
      [84, 88, 91, 96, 100].forEach((m, k) => {
        end = max(end, inst(x, 'celesta', m, 0.4, 0.5, k * 0.075), inst(x, 'harp', m - 12, 0.5, 0.45, k * 0.075));
      });
      return end;
    },
  },
  buff: {
    vol: 0.8,
    rev: 0.4,
    play: (x) =>
      max(
        tone(x, { type: 'triangle', f: 523, dur: 0.12, peak: 0.12, lp: 3000, tau: 0.1 }),
        tone(x, { type: 'triangle', f: 784, dur: 0.25, peak: 0.12, lp: 3500, tau: 0.18, delay: 0.1 }),
        inst(x, 'celesta', 91, 0.3, 0.5, 0.1),
        inst(x, 'glock', 96, 0.3, 0.3, 0.16),
      ),
  },
  debuff: {
    vol: 0.8,
    rev: 0.3,
    play: (x) =>
      max(
        tone(x, { type: 'sawtooth', f: 523, dur: 0.14, peak: 0.07, lp: 1400, tau: 0.1 }),
        tone(x, { type: 'sawtooth', f: 370, f1: 330, dur: 0.35, peak: 0.08, lp: 1100, tau: 0.2, delay: 0.13 }),
        tone(x, { type: 'sine', f: 185, dur: 0.35, peak: 0.1, tau: 0.18, delay: 0.13 }),
      ),
  },
  status: {
    vol: 0.75,
    rev: 0.3,
    play: (x) => {
      const { ctx, t } = x;
      const end = t + 0.5;
      const o = mkOsc(ctx, 'triangle', 620 * x.p, t, end);
      mkOsc(ctx, 'sine', 11, t, end).connect(mkGain(ctx, 70 * x.p)).connect(o.frequency);
      const g = mkGain(ctx, 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.1, t + 0.04);
      g.gain.linearRampToValueAtTime(0, t + 0.45);
      o.connect(mkFilter(ctx, 'lowpass', 2500, 0.7)).connect(g).connect(x.out);
      return max(end, tone(x, { type: 'sine', f: 930, dur: 0.3, peak: 0.04, tau: 0.08, delay: 0.05 }));
    },
  },
  time: {
    vol: 0.85,
    rev: 0.45,
    play: (x) => {
      let end = x.t;
      for (let k = 0; k < 6; k++) {
        end = max(end, noise(x, { type: 'highpass', f: 3500, q: 0.7, dur: 0.02, peak: 0.2, tau: 0.004, delay: k * 0.09 }), tone(x, { f: k % 2 ? 1800 : 2200, dur: 0.03, peak: 0.06, tau: 0.01, delay: k * 0.09 }));
      }
      const { ctx, t } = x;
      const o = mkOsc(ctx, 'sine', 400 * x.p, t, t + 1.0);
      o.frequency.setValueAtTime(400 * x.p, t);
      o.frequency.exponentialRampToValueAtTime(1200 * x.p, t + 0.5);
      o.frequency.exponentialRampToValueAtTime(300 * x.p, t + 0.95);
      const g = mkGain(ctx, 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.4);
      g.gain.linearRampToValueAtTime(0, t + 0.95);
      o.connect(g).connect(x.out);
      return max(end, t + 1.0, inst(x, 'glock', 86, 0.4, 0.4, 0.55), inst(x, 'glock', 81, 0.4, 0.35, 0.62));
    },
  },
  summon: {
    vol: 0.9,
    rev: 0.55,
    play: (x) => {
      let end = choirChord(x, 'choirLow', 'o', [50, 57, 62], 1.2, 0.8);
      end = max(end, noise(x, { f: 200, f1: 4200, q: 2, dur: 1.15, peak: 0.14, a: 0.9 }));
      end = max(end, playRoll(INSTRUMENTS.timpani, x.core, x.out, x.t, 38 + semis(x.p), 1.0, 0.8, 2));
      end = max(end, inst(x, 'bell', 74, 1.0, 0.9, 1.1), inst(x, 'timpani', 38, 0.5, 1, 1.1), inst(x, 'cymbal', 60, 1, 0.8, 1.1));
      return end;
    },
  },
  explosion: {
    vol: 1,
    rev: 0.35,
    play: (x) => {
      const { ctx, t } = x;
      const end = t + 1.6;
      const src = mkNoise(x.core, t, end);
      const lp = mkFilter(ctx, 'lowpass', 3000, 0.8);
      lp.frequency.setValueAtTime(3000 * x.p, t);
      lp.frequency.exponentialRampToValueAtTime(250 * x.p, t + 1.2);
      const g = mkGain(ctx, 0);
      percEnv(g.gain, t, 0.9, 0.35, 0.004);
      src.connect(lp).connect(g).connect(x.out);
      return max(end, tone(x, { f: 75, f1: 28, glide: 0.5, dur: 0.6, peak: 0.8, tau: 0.25 }), crackle(x, 14, 0.9, 0.18, 1800, 0.1));
    },
  },
  meteor: {
    vol: 1,
    rev: 0.4,
    play: (x) => {
      const fall = max(tone(x, { f: 1900, f1: 240, glide: 0.9, dur: 0.9, peak: 0.1, a: 0.2 }), noise(x, { f: 3000, f1: 400, q: 3, dur: 0.9, peak: 0.12, a: 0.5 }));
      return max(fall, SFX.explosion.play({ ...x, t: x.t + 0.88, p: x.p * 0.8 }));
    },
  },
  song: {
    vol: 0.8,
    rev: 0.45,
    play: (x) => {
      let end = x.t;
      const mel: Array<[number, number, number]> = [
        [76, 0, 0.14],
        [80, 0.13, 0.14],
        [83, 0.26, 0.14],
        [88, 0.39, 0.4],
      ];
      for (const [m, d, l] of mel) end = max(end, inst(x, 'flute', m, l, 0.7, d));
      for (const [m, d] of [
        [64, 0],
        [71, 0.13],
        [76, 0.26],
      ] as Array<[number, number]>)
        end = max(end, inst(x, 'harp', m, 0.5, 0.5, d));
      return end;
    },
  },
  dance: {
    vol: 0.85,
    rev: 0.2,
    play: (x) => {
      let end = x.t;
      [0, 0.09, 0.18, 0.3].forEach((d, k) => (end = max(end, inst(x, 'tambourine', 60, 0.1, k === 3 ? 1 : 0.7, d))));
      [62, 66, 69, 74].forEach((m, k) => (end = max(end, inst(x, 'lute', m, 0.3, 0.7, 0.3 + k * 0.018))));
      return end;
    },
  },
  steal: {
    vol: 0.8,
    rev: 0.15,
    play: (x) => max(sweep(x, 1800, 5200, 3000, 0.12, 0.15, 3), ping(x, 3100, [[1, 1, 0.04], [1.5, 0.5, 0.03]], 0.1, 0.1), ping(x, 4100, [[1, 1, 0.05]], 0.08, 0.15)),
  },
  item: {
    vol: 0.8,
    rev: 0.3,
    play: (x) => max(tone(x, { f: 420, f1: 950, glide: 0.05, dur: 0.07, peak: 0.12, tau: 0.03 }), inst(x, 'celesta', 91, 0.3, 0.5, 0.06), inst(x, 'celesta', 98, 0.4, 0.45, 0.12)),
  },
  ko: {
    vol: 0.9,
    rev: 0.35,
    play: (x) =>
      max(
        tone(x, { type: 'triangle', f: 440, f1: 105, glide: 0.5, dur: 0.5, peak: 0.16, lp: 1400 }),
        SFX.land.play({ ...x, t: x.t + 0.45, p: x.p * 0.85 }),
        inst(x, 'celli', 45, 0.6, 0.45, 0.05),
      ),
  },

  // ---- rewards & world -------------------------------------------------
  crystal: {
    vol: 0.85,
    rev: 0.55,
    play: (x) => {
      let end = noise(x, { type: 'highpass', f: 6000, q: 0.7, dur: 1.4, peak: 0.05, a: 0.5 });
      [88, 92, 95, 100, 104, 107].forEach((m, k) => (end = max(end, inst(x, k % 2 ? 'celesta' : 'glock', m, 0.4, 0.5, k * 0.065))));
      for (const m of [76, 80, 83]) {
        const { ctx, t } = x;
        const e = t + 1.6;
        const o = mkOsc(ctx, 'sine', 440 * Math.pow(2, (m - 69) / 12) * x.p, t, e);
        const g = mkGain(ctx, 0);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.03, t + 0.5);
        g.gain.linearRampToValueAtTime(0, t + 1.55);
        const am = mkGain(ctx, 0.6);
        mkOsc(ctx, 'sine', 6 + Math.random() * 3, t, e).connect(mkGain(ctx, 0.4)).connect(am.gain);
        o.connect(am).connect(g).connect(x.out);
        end = max(end, e);
      }
      return end;
    },
  },
  chest: {
    vol: 0.85,
    rev: 0.3,
    play: (x) => {
      const { ctx, t } = x;
      const e = t + 0.3;
      const o = mkOsc(ctx, 'sawtooth', 110 * x.p, t, e);
      mkOsc(ctx, 'square', 31, t, e).connect(mkGain(ctx, 25)).connect(o.frequency);
      const g = mkGain(ctx, 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.1, t + 0.05);
      g.gain.linearRampToValueAtTime(0, t + 0.25);
      o.connect(mkFilter(ctx, 'bandpass', 900, 4)).connect(g).connect(x.out);
      let end = e;
      [72, 76, 79].forEach((m, k) => (end = max(end, inst(x, 'trumpet', m, 0.08, 0.6, 0.28 + k * 0.08))));
      end = max(end, inst(x, 'trumpet', 84, 0.35, 0.75, 0.52), inst(x, 'celesta', 96, 0.4, 0.5, 0.52));
      return end;
    },
  },
  levelUp: {
    vol: 0.9,
    rev: 0.4,
    play: (x) => {
      let end = x.t;
      [67, 72, 76, 79].forEach((m, k) => (end = max(end, inst(x, 'trumpet', m, 0.07, 0.75, k * 0.07))));
      for (const m of [72, 76, 79, 84]) end = max(end, inst(x, m > 80 ? 'trumpet' : 'horn', m, 0.55, 0.85, 0.3));
      [91, 96, 100].forEach((m, k) => (end = max(end, inst(x, 'glock', m, 0.4, 0.4, 0.3 + k * 0.06))));
      return end;
    },
  },
  jobUp: {
    vol: 0.9,
    rev: 0.45,
    play: (x) => {
      let end = x.t;
      const chords = [
        [65, 69, 72],
        [67, 71, 74],
        [72, 76, 79, 84],
      ];
      chords.forEach((c, k) => {
        const d = k * 0.2;
        const l = k === 2 ? 0.9 : 0.16;
        for (const m of c) end = max(end, inst(x, m >= 76 ? 'trumpet' : 'horn', m, l, 0.85, d));
        end = max(end, inst(x, 'trombone', c[0] - 12, l, 0.8, d));
      });
      end = max(end, inst(x, 'timpani', 36, 0.5, 1, 0.4), inst(x, 'cymbal', 60, 1, 0.75, 0.4));
      return end;
    },
  },
  learn: {
    vol: 0.85,
    rev: 0.45,
    play: (x) => max(SFX.magic.play({ ...x, p: x.p * 1.1 }), inst(x, 'celesta', 84, 0.3, 0.55, 0.1), inst(x, 'celesta', 91, 0.3, 0.55, 0.22), inst(x, 'celesta', 96, 0.6, 0.6, 0.34)),
  },
  gil: {
    vol: 0.8,
    rev: 0.2,
    gap: 40,
    play: (x) => {
      let end = x.t;
      [0, 0.07, 0.13].forEach((d, k) => {
        const f = 2600 + k * 350 + rnd(120);
        end = max(end, ping(x, f, [[1, 1, 0.07], [1.48, 0.45, 0.05], [2.7, 0.25, 0.03]], 0.09, d));
      });
      return end;
    },
  },
  victory: {
    vol: 0.9,
    rev: 0.45,
    play: (x) => {
      let end = x.t;
      [0, 0.1, 0.2].forEach((d) => (end = max(end, inst(x, 'trumpet', 67, 0.07, 0.8, d))));
      for (const m of [72, 76, 79]) end = max(end, inst(x, m > 74 ? 'trumpet' : 'horn', m, 0.8, 0.9, 0.3));
      end = max(end, inst(x, 'trombone', 48, 0.8, 0.85, 0.3), inst(x, 'timpani', 36, 0.5, 1, 0.3), inst(x, 'cymbal', 60, 1, 0.8, 0.3));
      return end;
    },
  },
  defeat: {
    vol: 0.9,
    rev: 0.5,
    play: (x) => {
      let end = x.t;
      [67, 63, 60].forEach((m, k) => (end = max(end, inst(x, 'horn', m, k === 2 ? 1.0 : 0.3, 0.7, k * 0.32))));
      end = max(end, inst(x, 'trombone', 48, 1.2, 0.6, 0.64), inst(x, 'celli', 36, 1.3, 0.6, 0.64), inst(x, 'timpani', 36, 0.5, 0.7, 0.64));
      return end;
    },
  },
  door: {
    vol: 0.85,
    rev: 0.25,
    play: (x) => {
      const { ctx, t } = x;
      const e = t + 0.55;
      const o = mkOsc(ctx, 'sawtooth', 85 * x.p, t, e);
      const j = mkNoise(x.core, t, e, 0.02);
      j.connect(mkFilter(ctx, 'lowpass', 40, 0.7)).connect(mkGain(ctx, 60)).connect(o.frequency);
      const g = mkGain(ctx, 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.08);
      g.gain.linearRampToValueAtTime(0.08, t + 0.35);
      g.gain.linearRampToValueAtTime(0, t + 0.45);
      o.connect(mkFilter(ctx, 'bandpass', 750, 5)).connect(g).connect(x.out);
      return max(e, SFX.land.play({ ...x, t: t + 0.42, p: x.p * 0.8 }));
    },
  },
  kweh: {
    vol: 0.9,
    rev: 0.2,
    play: (x) => {
      const { ctx, t } = x;
      const e = t + 0.4;
      const f0 = 620 * x.p;
      const o = mkOsc(ctx, 'sawtooth', f0, t, e);
      o.frequency.setValueAtTime(f0 * 0.85, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.25, t + 0.07);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.95, t + 0.3);
      mkOsc(ctx, 'sine', 32, t, e).connect(mkGain(ctx, 18)).connect(o.frequency);
      const f1 = mkFilter(ctx, 'bandpass', 420, 4);
      f1.frequency.setValueAtTime(380, t);
      f1.frequency.exponentialRampToValueAtTime(700, t + 0.1);
      const f2 = mkFilter(ctx, 'bandpass', 900, 6);
      f2.frequency.setValueAtTime(850, t);
      f2.frequency.exponentialRampToValueAtTime(1900, t + 0.1);
      const g = mkGain(ctx, 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.03);
      g.gain.setValueAtTime(0.5, t + 0.2);
      g.gain.linearRampToValueAtTime(0, t + 0.33);
      o.connect(f1).connect(mkGain(ctx, 1.4)).connect(g);
      o.connect(f2).connect(mkGain(ctx, 1.0)).connect(g);
      g.connect(x.out);
      return e;
    },
  },
  roar: {
    vol: 1,
    rev: 0.35,
    play: (x) => {
      const { ctx, t } = x;
      const e = t + 1.4;
      const drive = shaper(ctx, 3);
      const src = mkGain(ctx, 1);
      for (const [f, d] of [
        [105, 0],
        [108, 8],
        [52, 0],
      ]) {
        const o = mkOsc(ctx, 'sawtooth', f * x.p, t, e, d);
        o.frequency.setValueAtTime(f * x.p * 1.1, t);
        o.frequency.exponentialRampToValueAtTime(f * x.p * 0.72, t + 1.2);
        o.connect(src);
      }
      mkNoise(x.core, t, e).connect(mkGain(ctx, 0.5)).connect(src);
      const am = mkGain(ctx, 0.6);
      mkOsc(ctx, 'sine', 27, t, e).connect(mkGain(ctx, 0.4)).connect(am.gain);
      const g = mkGain(ctx, 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.12);
      g.gain.linearRampToValueAtTime(0.22, t + 0.8);
      g.gain.linearRampToValueAtTime(0, t + 1.3);
      const out = mkGain(ctx, 1);
      src.connect(drive).connect(am);
      am.connect(mkFilter(ctx, 'bandpass', 520, 3)).connect(mkGain(ctx, 1.5)).connect(out);
      am.connect(mkFilter(ctx, 'bandpass', 900, 4)).connect(mkGain(ctx, 0.8)).connect(out);
      am.connect(mkFilter(ctx, 'lowpass', 300, 0.7)).connect(mkGain(ctx, 0.6)).connect(out);
      out.connect(g).connect(x.out);
      return e;
    },
  },
  demon: {
    vol: 1,
    rev: 0.55,
    play: (x) =>
      max(
        SFX.roar.play({ ...x, p: x.p * 0.6 }),
        SFX.dark.play({ ...x, t: x.t + 0.1 }),
        choirChord(x, 'choirLow', 'a', [48, 49, 55, 56], 1.6, 0.7, 0.05),
        noise(x, { type: 'lowpass', f: 200, f1: 2000, q: 3, dur: 1.3, peak: 0.18, a: 1.1 }),
      ),
  },
  thunderclap: {
    vol: 1,
    rev: 0.4,
    play: (x) => {
      let end = noise(x, { type: 'highpass', f: 1500, q: 0.7, dur: 0.15, peak: 0.85, tau: 0.05, a: 0.002 });
      for (let k = 0; k < 5; k++) end = max(end, noise(x, { type: 'lowpass', f: 900, q: 0.8, dur: 0.3, peak: 0.5 - k * 0.07, tau: 0.08, delay: 0.03 + k * (0.08 + Math.random() * 0.08) }));
      return max(end, noise(x, { type: 'lowpass', f: 160, q: 0.8, dur: 2.5, peak: 0.9, tau: 0.75, a: 0.05, delay: 0.05 }));
    },
  },
  bell: { vol: 1, rev: 0.55, play: (x) => max(inst(x, 'bell', 55, 2, 0.95), inst(x, 'bell', 67, 2, 0.35, 0.01)) },
};

/** fallback for unknown ids */
export const GENERIC_SFX: SfxDef = {
  vol: 0.7,
  rev: 0.1,
  play: (x) => tone(x, { type: 'triangle', f: 880, dur: 0.06, peak: 0.12, lp: 3000, tau: 0.04 }),
};

export const SFX_IDS = Object.keys(SFX);
