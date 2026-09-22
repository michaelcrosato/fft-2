/** Small, fast, seedable PRNG (mulberry32). Deterministic battles make testing & replays possible. */
export class Rng {
  private s: number;
  constructor(seed = (Math.random() * 2 ** 32) >>> 0) { this.s = seed >>> 0; }
  get seed() { return this.s; }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** integer in [a, b] inclusive */
  int(a: number, b: number): number { return a + Math.floor(this.next() * (b - a + 1)); }
  /** true with probability pct/100 */
  pct(p: number): boolean { return this.next() * 100 < p; }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  weighted<T>(arr: readonly T[], w: (t: T) => number): T {
    let total = 0; for (const a of arr) total += w(a);
    let r = this.next() * total;
    for (const a of arr) { r -= w(a); if (r <= 0) return a; }
    return arr[arr.length - 1];
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }
}

/** Deterministic hash → [0,1) for procedural decoration. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
