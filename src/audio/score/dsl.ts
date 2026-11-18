// A small notation for writing the score as data. Times and lengths are in beats.
//   mel('D4:1.5 E4:.5 F4 | A4:2 - r:1 [D4,F4,A4]:2!')
//     pitch[:beats][!|'] — `!` accents, `'` softens; `r` rests; `-` holds the last note longer;
//     [a,b,c] is a chord; `|` is only for reading. A length carries on until the next one.
import type { InstrumentId } from '../instruments';

export interface Note { t: number; d: number; p: number; v: number }
export interface Part { inst: InstrumentId; notes: Note[]; gain?: number; pan?: number; send?: number }
export interface Section { beats: number; bpm?: number; parts: Part[] }
export type Room = 'room' | 'hall' | 'cathedral' | 'cave' | 'dry';
export interface Song {
  id: string;
  title: string;
  /** for the audition page: the key or mode, and the meter */
  key: string;
  bpm: number;
  meter?: number;
  room: Room;
  gain?: number;
  /** played once before the body */
  intro?: Section;
  /** loops for ever, unless the song is `once` */
  body: Section;
  once?: boolean;
}

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MIDI number of a pitch name such as C4, F#3 or Bb5 (C4 = 60). */
export function P(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name.trim());
  if (!m) throw new Error(`bad pitch "${name}"`);
  return 12 * (Number(m[3]) + 1) + LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** Parse a melody line. */
export function mel(src: string, o: { at?: number; v?: number; tr?: number } = {}): Note[] {
  const out: Note[] = [];
  let t = o.at ?? 0, d = 1;
  const base = o.v ?? 0.8, tr = o.tr ?? 0;
  let last: Note[] = [];
  for (const raw of src.split(/\s+/)) {
    if (!raw || raw === '|') continue;
    const m = /^(\[[^\]]+\]|[A-G](?:#|b)?-?\d|r|-)(?::([\d.]+))?([!']?)$/.exec(raw);
    if (!m) throw new Error(`bad token "${raw}" in "${src}"`);
    if (m[2]) d = Number(m[2]);
    const v = m[3] === '!' ? Math.min(1, base * 1.25) : m[3] === "'" ? base * 0.6 : base;
    if (m[1] === 'r') { last = []; t += d; continue; }
    if (m[1] === '-') { for (const n of last) n.d += d; t += d; continue; }
    const pitches = m[1].startsWith('[') ? m[1].slice(1, -1).split(',').map(P) : [P(m[1])];
    last = pitches.map((p) => ({ t, d, p: p + tr, v }));
    out.push(...last);
    t += d;
  }
  return out;
}

/** End of a run of notes, in beats. */
export const end = (notes: Note[]) => notes.reduce((e, n) => Math.max(e, n.t + n.d), 0);
export const shift = (notes: Note[], beats: number) => notes.map((n) => ({ ...n, t: n.t + beats }));
export const transpose = (notes: Note[], semis: number) => notes.map((n) => ({ ...n, p: n.p + semis }));
export const louder = (notes: Note[], k: number) => notes.map((n) => ({ ...n, v: Math.min(1, n.v * k) }));
/** Play note runs one after another; each starts where the last one's `length` (or end) was. */
export function seq(...chunks: Array<Note[] | [Note[], number]>): Note[] {
  const out: Note[] = [];
  let t = 0;
  for (const c of chunks) {
    const [notes, length] = Array.isArray(c[0]) ? (c as [Note[], number]) : [c as Note[], end(c as Note[])];
    out.push(...shift(notes, t));
    t += length;
  }
  return out;
}
/** Repeat a run `times` times, `every` beats apart. */
export function rep(notes: Note[], times: number, every: number): Note[] {
  const out: Note[] = [];
  for (let i = 0; i < times; i++) out.push(...shift(notes, i * every));
  return out;
}

const QUALITY: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9],
  sus4: [0, 5, 7], sus2: [0, 2, 7], dim: [0, 3, 6], aug: [0, 4, 8], '5': [0, 7], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], m7b5: [0, 3, 6, 10],
};
/** Pitch classes of a chord symbol such as Dm, Bb, A7, Fmaj7, Gsus4 or C/E, with the bass pitch class. */
export function chord(sym: string): { tones: number[]; bass: number } {
  const m = /^([A-G])(#|b)?([a-z0-9]*)(?:\/([A-G])(#|b)?)?$/.exec(sym.trim());
  if (!m || !(m[3] in QUALITY)) throw new Error(`bad chord "${sym}"`);
  const root = (LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const tones = QUALITY[m[3]].map((i) => root + i);
  const bass = m[4] ? (LETTER[m[4]] + (m[5] === '#' ? 1 : m[5] === 'b' ? -1 : 0) + 12) % 12 : root;
  return { tones, bass };
}

export interface Change { sym: string; t: number; d: number }
/** "Dm:4 C:4 Bb:2 A:2" → chord changes with their start and length. */
export function prog(src: string, at = 0): Change[] {
  const out: Change[] = [];
  let t = at, d = 4;
  for (const tok of src.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const [sym, len] = tok.split(':');
    if (len) d = Number(len);
    if (sym !== 'r') out.push({ sym, t, d });
    t += d;
  }
  return out;
}
export const progEnd = (p: Change[]) => p.reduce((e, c) => Math.max(e, c.t + c.d), 0);

/** Each tone placed in the octave nearest `center`: simple voice leading between chords. */
function voiced(tones: number[], center: number): number[] {
  return tones.map((pc) => { let p = pc % 12; while (p < center - 6) p += 12; while (p >= center + 6) p -= 12; return p; }).sort((a, b) => a - b);
}

/** Sustained chords (a pad), voiced around `center`. */
export function hold(p: Change[], o: { center?: number; v?: number; bass?: boolean; gap?: number } = {}): Note[] {
  const out: Note[] = [];
  for (const c of p) {
    const { tones, bass } = chord(c.sym);
    for (const pitch of voiced(tones, o.center ?? 64)) out.push({ t: c.t, d: c.d - (o.gap ?? 0.05), p: pitch, v: o.v ?? 0.6 });
    if (o.bass) out.push({ t: c.t, d: c.d - (o.gap ?? 0.05), p: voiced([bass], (o.center ?? 64) - 12)[0], v: o.v ?? 0.6 });
  }
  return out;
}

/**
 * Arpeggios over the changes. `pattern` indexes the chord's tones from low to high (they
 * continue into higher octaves: index 3 of a triad is the root an octave up); `.` rests.
 */
export function arp(p: Change[], pattern: string, o: { step?: number; center?: number; v?: number; len?: number; accent?: number } = {}): Note[] {
  const steps = pattern.split(/\s+/).filter(Boolean);
  const step = o.step ?? 0.5;
  const out: Note[] = [];
  for (const c of p) {
    const tones = voiced(chord(c.sym).tones, o.center ?? 60);
    const n = Math.round(c.d / step);
    for (let i = 0; i < n; i++) {
      const s = steps[i % steps.length];
      if (s === '.') continue;
      const k = Number(s);
      const pitch = tones[k % tones.length] + 12 * Math.floor(k / tones.length);
      const accent = i % steps.length === 0 ? o.accent ?? 1.1 : 1;
      out.push({ t: c.t + i * step, d: o.len ?? step * 0.95, p: pitch, v: Math.min(1, (o.v ?? 0.55) * accent) });
    }
  }
  return out;
}

/**
 * A bass line from the changes. In `rhythm`, each character is one `step`: `R` the root (or
 * slash bass), `5` the fifth, `8` the octave, `3` the third, `-` hold, `.` rest. It repeats.
 */
export function bassline(p: Change[], rhythm: string, o: { step?: number; center?: number; v?: number } = {}): Note[] {
  const step = o.step ?? 1;
  const cells = rhythm.replace(/\s+/g, '').split('');
  const out: Note[] = [];
  for (const c of p) {
    const { tones, bass } = chord(c.sym);
    const root = voiced([bass], o.center ?? 40)[0];
    const n = Math.round(c.d / step);
    let last: Note | null = null;
    for (let i = 0; i < n; i++) {
      const ch = cells[i % cells.length];
      if (ch === '-') { if (last) last.d += step; continue; }
      if (ch === '.') { last = null; continue; }
      const third = tones[1] - tones[0];
      const off = ch === '5' ? 7 : ch === '8' ? 12 : ch === '3' ? third : 0;
      last = { t: c.t + i * step, d: step * 0.92, p: root + off, v: o.v ?? 0.7 };
      out.push(last);
    }
  }
  return out;
}

/** Whole chords struck on a rhythm (`x` hit, `o` softer, `.` rest), repeating within each change. */
export function stabs(p: Change[], pattern: string, o: { step?: number; center?: number; v?: number; len?: number } = {}): Note[] {
  const cells = pattern.replace(/\s+/g, '').split('');
  const step = o.step ?? 0.5;
  const out: Note[] = [];
  for (const c of p) {
    const tones = voiced(chord(c.sym).tones, o.center ?? 62);
    const n = Math.round(c.d / step);
    for (let i = 0; i < n; i++) {
      const ch = cells[i % cells.length];
      if (ch === '.') continue;
      for (const pitch of tones) out.push({ t: c.t + i * step, d: o.len ?? step * 0.8, p: pitch, v: (o.v ?? 0.7) * (ch === 'o' ? 0.65 : 1) });
    }
  }
  return out;
}

/** A crescendo roll: `n` strokes `step` apart, velocity rising from `v0` to `v1`. */
export function roll(pitch: string, at: number, n: number, step: number, v0: number, v1: number): Note[] {
  return Array.from({ length: n }, (_, i) => ({ t: at + i * step, d: step, p: P(pitch), v: v0 + ((v1 - v0) * i) / Math.max(1, n - 1) }));
}

/** A percussion line on a grid: `x` hit, `o` softer hit, `.` rest; it repeats over `beats`. */
export function hits(pattern: string, o: { step?: number; beats: number; p?: number; v?: number; at?: number }): Note[] {
  const cells = pattern.replace(/\s+/g, '').split('');
  const step = o.step ?? 0.5;
  const out: Note[] = [];
  const n = Math.round(o.beats / step);
  for (let i = 0; i < n; i++) {
    const ch = cells[i % cells.length];
    if (ch === '.') continue;
    out.push({ t: (o.at ?? 0) + i * step, d: step, p: o.p ?? 60, v: (o.v ?? 0.8) * (ch === 'o' ? 0.6 : 1) });
  }
  return out;
}

export const part = (inst: InstrumentId, notes: Note[], o: { gain?: number; pan?: number; send?: number } = {}): Part => ({ inst, notes, ...o });
