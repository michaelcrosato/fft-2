// Pure signal helpers for the procedural instruments and sound effects. Everything here works on
// plain Float32Arrays, so it runs (and is tested) in Node as well as in the browser, and the same
// seed always renders the same samples.

export type Signal = Float32Array;

/** Seeded PRNG (mulberry32) returning [0, 1). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);
export const dbGain = (db: number) => 10 ** (db / 20);
export const len = (sr: number, seconds: number) => Math.max(1, Math.round(sr * seconds));

/** Exponential decay envelope multiplied in place: reaches 1/1000 (−60 dB) after `t60` seconds. */
export function decay(x: Signal, sr: number, t60: number, from = 0): Signal {
  const k = Math.exp(Math.log(0.001) / Math.max(1, t60 * sr));
  let g = 1;
  for (let i = from; i < x.length; i++) { x[i] *= g; g *= k; }
  return x;
}

/** Linear attack and release ramps in place, to avoid clicks at the ends. */
export function fades(x: Signal, sr: number, attack = 0.002, release = 0.01): Signal {
  const a = Math.min(x.length, len(sr, attack)), r = Math.min(x.length, len(sr, release));
  for (let i = 0; i < a; i++) x[i] *= i / a;
  for (let i = 0; i < r; i++) x[x.length - 1 - i] *= i / r;
  return x;
}

/** RBJ biquad filter, applied in place. */
export function biquad(x: Signal, sr: number, type: 'lowpass' | 'highpass' | 'bandpass' | 'peak', freq: number, q = 0.707, gainDb = 0): Signal {
  const w = (2 * Math.PI * Math.min(freq, sr * 0.45)) / sr;
  const cos = Math.cos(w), alpha = Math.sin(w) / (2 * q), A = 10 ** (gainDb / 40);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  if (type === 'lowpass') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; }
  else if (type === 'highpass') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; }
  else if (type === 'bandpass') { b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; }
  else { b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A; }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    const y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = y;
    x[i] = y;
  }
  return x;
}

/** One-pole lowpass whose cutoff glides from `f0` to `f1` across the signal (a sweeping filter). */
export function sweepLowpass(x: Signal, sr: number, f0: number, f1: number): Signal {
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    const f = f0 * (f1 / f0) ** (i / x.length);
    const a = 1 - Math.exp((-2 * Math.PI * f) / sr);
    y += a * (x[i] - y);
    x[i] = y;
  }
  return x;
}

/** Remove DC offset (one-pole highpass at ~20 Hz). */
export function dcBlock(x: Signal, sr: number): Signal {
  const r = 1 - (2 * Math.PI * 20) / sr;
  let px = 0, py = 0;
  for (let i = 0; i < x.length; i++) { const y = x[i] - px + r * py; px = x[i]; py = y; x[i] = y; }
  return x;
}

export function peak(x: Signal): number {
  let p = 0;
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > p) p = a; }
  return p;
}

/** Scale so the loudest sample sits at `target` (linear, default −1 dBFS). */
export function normalize(x: Signal, target = 0.89): Signal {
  const p = peak(x);
  if (p > 0) { const g = target / p; for (let i = 0; i < x.length; i++) x[i] *= g; }
  return x;
}

/** Sum `b` into `a` (starting at `at` samples) with gain `g`. */
export function mixInto(a: Signal, b: Signal, g = 1, at = 0): Signal {
  const n = Math.min(b.length, a.length - at);
  for (let i = 0; i < n; i++) a[at + i] += b[i] * g;
  return a;
}

export function noise(n: number, r: () => number): Signal {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = r() * 2 - 1;
  return x;
}

/**
 * Karplus–Strong plucked string, tuned exactly with an allpass fractional delay.
 * `brightness` (0–1) colours the excitation, `damping` (0–1) how fast the highs die,
 * `t60` the seconds to fade by 60 dB, `body` a wooden resonance (0–1).
 */
export function pluck(sr: number, freq: number, seconds: number, r: () => number, o: { brightness?: number; damping?: number; t60?: number; body?: number } = {}): Signal {
  const n = len(sr, seconds);
  const out = new Float32Array(n);
  const P = sr / freq;
  const S = 0.5 * Math.min(1, Math.max(0, o.damping ?? 0.5)); // two-point lowpass: delay ≈ S
  const N = Math.max(2, Math.floor(P - S - 0.1));
  const D = P - S - N; // the rest of the period, as an allpass delay
  const C = (1 - D) / (1 + D);
  const buf = new Float32Array(N);
  const bright = o.brightness ?? 0.6;
  let lp = 0;
  for (let i = 0; i < N; i++) { lp += (0.1 + 0.9 * bright) * (r() * 2 - 1 - lp); buf[i] = lp; }
  const loss = 0.001 ** (1 / (freq * (o.t60 ?? 3)));
  let idx = 0, last = 0, apx = 0, apy = 0;
  for (let i = 0; i < n; i++) {
    const v = buf[idx];
    out[i] = v;
    const f = (1 - S) * v + S * last;
    last = v;
    const ap = C * f + apx - C * apy;
    apx = f; apy = ap;
    buf[idx] = ap * loss;
    idx = idx + 1 === N ? 0 : idx + 1;
  }
  if (o.body) { biquad(out, sr, 'peak', 220, 1.2, o.body * 6); biquad(out, sr, 'peak', 520, 1.4, o.body * 4); }
  return fades(dcBlock(out, sr), sr, 0.0005, 0.02);
}

/** Additive partials: [ratio to `freq`, amplitude, seconds to −60 dB] each. */
export function partials(sr: number, freq: number, seconds: number, parts: Array<[number, number, number]>, r?: () => number): Signal {
  const n = len(sr, seconds);
  const out = new Float32Array(n);
  for (const [ratio, amp, t60] of parts) {
    const f = freq * ratio;
    if (f >= sr * 0.45) continue;
    const w = (2 * Math.PI * f) / sr;
    const k = Math.exp(Math.log(0.001) / Math.max(1, t60 * sr));
    const ph = r ? r() * Math.PI * 2 : 0;
    // a decaying sinusoid by recurrence: y[n] = 2k·cos(w)·y[n−1] − k²·y[n−2]
    const c = 2 * k * Math.cos(w), k2 = k * k;
    let y2 = amp * Math.sin(ph - w) / k, y1 = amp * Math.sin(ph);
    for (let i = 0; i < n; i++) { out[i] += y1; const y = c * y1 - k2 * y2; y2 = y1; y1 = y; }
  }
  return fades(out, sr, 0.0008, 0.02);
}

/** A sine whose frequency glides exponentially from `f0` to `f1` over `glide` seconds. */
export function chirp(sr: number, seconds: number, f0: number, f1: number, glide = seconds, wave: 'sine' | 'tri' | 'square' = 'sine'): Signal {
  const n = len(sr, seconds);
  const out = new Float32Array(n);
  const g = Math.max(1, len(sr, glide));
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const f = i < g ? f0 * (f1 / f0) ** (i / g) : f1;
    ph += (2 * Math.PI * f) / sr;
    const s = Math.sin(ph);
    out[i] = wave === 'sine' ? s : wave === 'square' ? (s >= 0 ? 0.6 : -0.6) : (2 / Math.PI) * Math.asin(s);
  }
  return out;
}

/** Simple FM tone: carrier `f`, modulator at `ratio`·f with index decaying from `i0` to `i1`. */
export function fm(sr: number, seconds: number, f: number, ratio: number, i0: number, i1: number): Signal {
  const n = len(sr, seconds);
  const out = new Float32Array(n);
  let pc = 0, pm = 0;
  for (let i = 0; i < n; i++) {
    const idx = i0 + (i1 - i0) * (i / n);
    pm += (2 * Math.PI * f * ratio) / sr;
    pc += (2 * Math.PI * f) / sr;
    out[i] = Math.sin(pc + idx * Math.sin(pm));
  }
  return out;
}

/** Stereo reverb impulse: decaying, decorrelated noise with a few early reflections. */
export function impulse(sr: number, seconds: number, opts: { predelay?: number; damping?: number; seed?: number } = {}): [Signal, Signal] {
  const r = rng(opts.seed ?? 7);
  const n = len(sr, seconds);
  const pre = len(sr, opts.predelay ?? 0.012);
  const chans: [Signal, Signal] = [new Float32Array(n), new Float32Array(n)];
  for (const ch of chans) {
    for (let i = pre; i < n; i++) ch[i] = (r() * 2 - 1) * Math.exp((-6.9 * (i - pre)) / (n - pre));
    // early reflections
    for (let k = 0; k < 6; k++) { const at = pre + Math.floor(r() * sr * 0.06); if (at < n) ch[at] += (r() > 0.5 ? 1 : -1) * (0.5 - k * 0.06); }
    // darker tail: more damping later on
    sweepLowpass(ch, sr, 9000, 1800 * (1 - (opts.damping ?? 0.4)) + 600);
    normalize(ch, 0.5);
  }
  return chans;
}
