/**
 * Music notation for Final Fealty Tactics' synthesized score.
 *
 * Pure data → event-list compiler. No Web Audio here, so this module is
 * importable from node (tests) and from the browser alike.
 *
 * ---------------------------------------------------------------------------
 *  TRACKS
 * ---------------------------------------------------------------------------
 * A track has a tempo (quarter notes per minute), a time signature, a set of
 * named voices (instrument + mix settings), a dictionary of sections and an
 * arrangement: `intro` sections play once, `body` sections loop forever
 * (unless `loop: false`).
 *
 * A section has an optional chord line and one "part" per voice. Parts are
 * either literal melody notation or generators that follow the chord line
 * (patterns, voice-led pads). A section can inherit from another (`base`) and
 * override / mute parts, so arrangements (A, A', A'') stay compact.
 *
 * ---------------------------------------------------------------------------
 *  DURATIONS (quarter note = 1 beat)
 * ---------------------------------------------------------------------------
 *   w = 4   h = 2   q = 1   i = 1/2 (eighth)   s = 1/4   z = 1/8
 *   t = 1/3 (triplet eighth)   u = 2/3 (triplet quarter)
 *   A trailing `.` dots the preceding letter; letters add up: `hq` = 3 beats.
 *   Durations are sticky: a token without one reuses the previous duration.
 *
 * ---------------------------------------------------------------------------
 *  MELODY NOTATION  (part string, or `{ n: '...' }`)
 * ---------------------------------------------------------------------------
 *   d5q      D in octave 5 (C4 = middle C), quarter note
 *   f#i bbh. ebs     accidentals: # (sharp) b (flat) n (natural, no-op)
 *   e        octave omitted → nearest to previous note (≤ a fourth, by letter)
 *   c' g,    ' = an octave above the nearest, , = an octave below
 *   rq       rest               ~q   tie: extend the previous note/chord
 *   <d4 f a>h  chord (relative pitches inside, reference = first note after)
 *   suffixes: ! accent  ? soft  * staccato  = tenuto (legato overlap)
 *             ~ roll/tremolo, ~< crescendo roll, ~> diminuendo roll
 *   @pp @p @mp @mf @f @ff @0.8   dynamics;  @< @>  ramp to the next dynamic
 *   |        bar line (checked against the time signature)
 *   [ ... ]*3   repeat a group
 *
 * ---------------------------------------------------------------------------
 *  PATTERNS  (`{ pat: '...', at: 'd2', step: 'i' }`) — follow the chords
 * ---------------------------------------------------------------------------
 *   1 3 5 7 8 9 10 12 …  chord degrees (3 = the chord's third/sus note,
 *                        5 = its fifth, 7 = its seventh or the octave, 9 = 2nd+8va)
 *   0        the chord's bass note (slash chord) or root
 *   c        the whole chord in close position
 *   x X o    unpitched hit / accent / ghost (drums)
 *   . r      rest            -   tie (hold previous)
 *   suffixes: ' , octave, ! ? accent/soft, ~ roll (tremolo), ~< ~> cresc/dim roll
 *   `at` = lowest note of the window the chord root is placed in.
 *   Compact drum strings (only these chars; whitespace ignored):
 *            'X..x..x.'  x X o hit, . rest, - hold, r roll, R crescendo roll
 *
 * ---------------------------------------------------------------------------
 *  PADS  (`{ pad: 4, at: 'a3', hi: 'e5', pat?: 'ch ch' }`)
 * ---------------------------------------------------------------------------
 *   N-voice chords, voice-led (minimal motion) inside [at, hi]. With `pat`,
 *   the chords are re-struck on the rhythm (tokens `c`, `.`/`r`, `-`).
 *
 * ---------------------------------------------------------------------------
 *  CHORD LINES  ('Dm | Bb | F C | Gm/Bb . A7 .')
 * ---------------------------------------------------------------------------
 *   Bars separated by `|`; chords inside a bar split it evenly; `.` continues
 *   the previous chord for that slot; `N` = no chord.
 *   Qualities: (maj) m 5 dim aug + 7 maj7 m7 m7b5 dim7 sus2 sus4 sus 7sus4
 *   add9 madd9 6 m6 9 m9 maj9 mM7 m(b9) dim(b9) 7b9 mb6 (b5) sus4b9
 */

// ---------------------------------------------------------------------------
//  Public types
// ---------------------------------------------------------------------------

export interface VoiceDef {
  /** instrument id (see INSTRUMENTS in synth.ts) */
  i: string;
  /** stereo position -1..1 */
  pan?: number;
  /** channel gain multiplier (default 1) */
  vol?: number;
  /** reverb send 0..1 (default: instrument default) */
  rev?: number;
  /** sounding-length factor for melodic notes (default 0.96) */
  leg?: number;
}

export interface PartObj {
  /** melody notation */
  n?: string;
  /** chord-following pattern */
  pat?: string;
  /** voice-led chord pad with N voices */
  pad?: number;
  /** register anchor: pattern window bottom / pad low bound (note name) */
  at?: string;
  /** pad high bound (note name) */
  hi?: string;
  /** default step duration for patterns (default 'i') */
  step?: string;
  /** copy another part: 'voice' (same section) or 'Section.voice' */
  ref?: string;
  /** transpose in semitones */
  tr?: number;
  /** velocity multiplier */
  vel?: number;
}
export type PartSpec = string | PartObj;

export interface SectionDef {
  /** chord line; its bar count defines the section length */
  ch?: string;
  /** explicit length in bars (when there is no chord line) */
  bars?: number;
  /** inherit chords & parts from another section */
  base?: string;
  /** parts by voice name */
  v?: Record<string, PartSpec>;
  /** voices of the base section to drop */
  mute?: string[];
  /** tempo override (quarter notes per minute) */
  bpm?: number;
  /** ritardando: tempo factor reached at the end of the section (e.g. 0.7) */
  rit?: number;
  /** transpose the whole section (semitones) */
  tr?: number;
}

export interface TrackDef {
  id: string;
  title: string;
  desc?: string;
  /** quarter notes per minute */
  bpm: number;
  /** time signature, default '4/4' */
  sig?: string;
  voices: Record<string, VoiceDef>;
  sections: Record<string, SectionDef>;
  /** played once */
  intro?: string[];
  /** looped (or played once when loop === false) */
  body: string[];
  /** default true */
  loop?: boolean;
}

export interface NoteEvent {
  /** start (seconds from track start) */
  t: number;
  /** duration (seconds) */
  d: number;
  /** voice index */
  v: number;
  /** midi pitch */
  m: number;
  /** velocity 0..~1.2 */
  vel: number;
  /** 0 = normal, 1 = roll, 2 = crescendo roll, 3 = diminuendo roll */
  roll: number;
}

export interface CompiledTrack {
  id: string;
  title: string;
  voiceNames: string[];
  voices: VoiceDef[];
  events: NoteEvent[];
  /** seconds */
  loopStart: number;
  /** seconds (end of body) */
  length: number;
  /** first event index at/after loopStart */
  loopIndex: number;
  loop: boolean;
  markers: Array<{ name: string; t: number }>;
  errors: string[];
}

// ---------------------------------------------------------------------------
//  Pitch helpers
// ---------------------------------------------------------------------------

const LETTER_PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const LETTER_IDX: Record<string, number> = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };

function accOffset(acc: string | undefined): number {
  if (!acc || acc === 'n') return 0;
  if (acc[0] === '#') return acc.length;
  return -acc.length;
}

/** 'd4' / 'F#3' / 'bb2' → midi */
export function noteToMidi(name: string): number {
  const m = /^([a-gA-G])(#{1,2}|b{1,2}|n)?(-?\d)$/.exec(name.trim());
  if (!m) throw new Error(`bad note name "${name}"`);
  const letter = m[1].toLowerCase();
  return 12 * (parseInt(m[3], 10) + 1) + LETTER_PC[letter] + accOffset(m[2]);
}

// ---------------------------------------------------------------------------
//  Durations
// ---------------------------------------------------------------------------

const DUR: Record<string, number> = { w: 4, h: 2, q: 1, i: 0.5, s: 0.25, z: 0.125, t: 1 / 3, u: 2 / 3 };

/** returns beats, null for an empty string, NaN when invalid */
export function parseDur(s: string): number | null {
  if (!s) return null;
  let total = 0;
  let i = 0;
  while (i < s.length) {
    const base = DUR[s[i]];
    if (base === undefined) return NaN;
    i++;
    let val = base;
    let add = base / 2;
    while (s[i] === '.') {
      val += add;
      add /= 2;
      i++;
    }
    total += val;
  }
  return total;
}

export function sigToBarBeats(sig: string | undefined): number {
  const m = /^(\d+)\/(\d+)$/.exec(sig || '4/4');
  if (!m) return 4;
  return (parseInt(m[1], 10) * 4) / parseInt(m[2], 10);
}

const EPS = 1e-6;
const approx = (a: number, b: number) => Math.abs(a - b) < 1e-4;

// ---------------------------------------------------------------------------
//  Chords
// ---------------------------------------------------------------------------

export interface Chord {
  /** root pitch class */
  root: number;
  /** intervals above the root, [0, third-ish, fifth-ish, (seventh), (extensions)] */
  iv: number[];
  /** bass pitch class */
  bass: number;
  name: string;
}

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  maj: [0, 4, 7],
  M: [0, 4, 7],
  m: [0, 3, 7],
  min: [0, 3, 7],
  '5': [0, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  '+': [0, 4, 8],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  M7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  sus: [0, 5, 7],
  '7sus4': [0, 5, 7, 10],
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '9': [0, 4, 7, 10, 14],
  m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  mM7: [0, 3, 7, 11],
  'm(b9)': [0, 3, 7, 13],
  'dim(b9)': [0, 3, 6, 13],
  '7b9': [0, 4, 7, 10, 13],
  mb6: [0, 3, 8],
  '(b5)': [0, 4, 6],
  sus4b9: [0, 5, 7, 13],
};

const chordCache = new Map<string, Chord | null>();

export function parseChord(sym: string): Chord | null {
  if (chordCache.has(sym)) return chordCache.get(sym)!;
  const m = /^([A-G])(#|b)?([^/]*)(?:\/([A-G])(#|b)?)?$/.exec(sym);
  let res: Chord | null = null;
  if (m) {
    const root = (LETTER_PC[m[1].toLowerCase()] + accOffset(m[2]) + 12) % 12;
    const iv = QUALITIES[m[3]];
    if (iv) {
      const bass = m[4] ? (LETTER_PC[m[4].toLowerCase()] + accOffset(m[5]) + 12) % 12 : root;
      res = { root, iv, bass, name: sym };
    }
  }
  chordCache.set(sym, res);
  return res;
}

/** semitone offset above the root for a chord degree (1,3,5,7,2,4,6 + octaves) */
export function degreeInterval(ch: Chord, deg: number): number {
  const oct = Math.floor((deg - 1) / 7);
  const d = ((deg - 1) % 7) + 1;
  const iv = ch.iv;
  let s: number;
  switch (d) {
    case 1: s = 0; break;
    case 3: s = iv[1] ?? 4; break;
    case 5: s = iv.length >= 3 ? iv[2] : iv[1] ?? 7; break;
    case 7: s = iv.length >= 4 && iv[3] < 12 ? iv[3] : 12; break;
    case 2: s = 2; break;
    case 4: s = 5; break;
    case 6: s = iv[1] === 3 && !iv.includes(9) ? 8 : 9; break;
    default: s = 0;
  }
  if (iv.length === 2 && d === 3) s = 7; // power chord
  return s + 12 * oct;
}

interface ChordSeg {
  s: number;
  e: number;
  ch: Chord | null;
}

function parseChordLine(line: string, barBeats: number, errors: string[], where: string): { segs: ChordSeg[]; bars: number } {
  const bars = line.split('|').map((b) => b.trim()).filter((b) => b.length > 0);
  const segs: ChordSeg[] = [];
  let prev: Chord | null = null;
  bars.forEach((bar, bi) => {
    const toks = bar.split(/\s+/);
    const slot = barBeats / toks.length;
    toks.forEach((tk, ti) => {
      const s = bi * barBeats + ti * slot;
      let ch: Chord | null;
      if (tk === '.' || tk === '%') ch = prev;
      else if (tk === 'N' || tk === 'NC') ch = null;
      else {
        ch = parseChord(tk);
        if (!ch) errors.push(`${where}: bad chord "${tk}"`);
      }
      const last = segs[segs.length - 1];
      if (last && last.ch === ch && (tk === '.' || tk === '%')) last.e = s + slot;
      else segs.push({ s, e: s + slot, ch });
      prev = ch;
    });
  });
  return { segs, bars: bars.length };
}

function chordAt(segs: ChordSeg[], pos: number): ChordSeg | null {
  for (const sg of segs) if (pos >= sg.s - EPS && pos < sg.e - EPS) return sg;
  return segs.length ? segs[segs.length - 1] : null;
}

// ---------------------------------------------------------------------------
//  Internal note representation (beats, section-relative)
// ---------------------------------------------------------------------------

interface RawNote {
  b: number; // start beat
  d: number; // sounding duration (beats)
  m: number;
  vel: number;
  roll: number;
  /** written duration (for ties) */
  w: number;
  /** unpitched hit (drums) */
  hit?: boolean;
}

// ---------------------------------------------------------------------------
//  Melody parser
// ---------------------------------------------------------------------------

const DYN: Record<string, number> = { ppp: 0.22, pp: 0.32, p: 0.45, mp: 0.58, mf: 0.7, f: 0.84, ff: 0.97, fff: 1.08 };

function expandRepeats(src: string): string {
  let s = src;
  const re = /\[([^\[\]]*)\]\*(\d+)/g;
  for (let guard = 0; guard < 20 && re.test(s); guard++) {
    re.lastIndex = 0;
    s = s.replace(re, (_m, body: string, n: string) => Array(parseInt(n, 10)).fill(body).join(' '));
  }
  return s;
}

const NOTE_RE = /^([a-g])(#{1,2}|b{1,2}|n)?(\d)?([',]*)([whqiszut.]*)([!?*=~<>]*)$/;

export interface MelodyResult {
  notes: RawNote[];
  length: number;
}

export function parseMelody(src: string, barBeats: number, errors: string[], where: string, leg = 0.96): MelodyResult {
  const text = expandRepeats(src);
  const tokens = text.match(/<[^>]*>[^\s|]*|\||[^\s|]+/g) || [];
  const notes: RawNote[] = [];
  let pos = 0;
  let lastDur = 1;
  let refDia = 4 + 7 * 4; // e4-ish reference
  let vel = DYN.mf;
  let lastGroup: RawNote[] = [];
  let barStart = 0;
  let barNo = 1;
  // dynamics ramps: [startIndexInNotes, startVel]
  let ramp: { idx: number; pos: number; from: number } | null = null;
  const rampSegments: Array<{ idx0: number; idx1: number; p0: number; p1: number; v0: number; v1: number }> = [];

  const resolvePitch = (letter: string, acc: string | undefined, oct: string | undefined, marks: string): number => {
    let o: number;
    const li = LETTER_IDX[letter];
    if (oct !== undefined && oct !== '') o = parseInt(oct, 10);
    else {
      o = Math.round((refDia - li) / 7);
    }
    for (const mk of marks) o += mk === "'" ? 1 : -1;
    refDia = li + 7 * o;
    return 12 * (o + 1) + LETTER_PC[letter] + accOffset(acc);
  };

  const applyArt = (n: RawNote, art: string, writ: number) => {
    let v = n.vel;
    let d = writ * leg;
    for (let k = 0; k < art.length; k++) {
      const a = art[k];
      if (a === '!') v *= 1.22;
      else if (a === '?') v *= 0.62;
      else if (a === '*') d = writ * 0.42;
      else if (a === '=') d = writ * 1.04;
      else if (a === '~') {
        n.roll = art[k + 1] === '<' ? 2 : art[k + 1] === '>' ? 3 : 1;
        if (n.roll > 1) k++;
      }
    }
    n.vel = Math.min(1.25, v);
    n.d = n.roll ? writ : d;
  };

  for (const tk of tokens) {
    if (tk === '|') {
      const len = pos - barStart;
      if (!approx(len, barBeats) && !approx(len, 0)) {
        errors.push(`${where}: bar ${barNo} has ${+len.toFixed(3)} beats (expected ${barBeats})`);
      }
      barStart = pos;
      barNo++;
      continue;
    }
    if (tk[0] === '@') {
      const d = tk.slice(1);
      let target: number | null = null;
      if (d === '<' || d === '>') {
        ramp = { idx: notes.length, pos, from: vel };
        continue;
      }
      if (DYN[d] !== undefined) target = DYN[d];
      else if (/^\d*\.?\d+$/.test(d)) target = parseFloat(d);
      else {
        errors.push(`${where}: bad dynamic "${tk}"`);
        continue;
      }
      if (ramp) {
        rampSegments.push({ idx0: ramp.idx, idx1: notes.length, p0: ramp.pos, p1: pos, v0: ramp.from, v1: target });
        ramp = null;
      }
      vel = target;
      continue;
    }
    if (tk[0] === '<') {
      const m = /^<([^>]*)>([whqiszut.]*)([!?*=~<>]*)$/.exec(tk);
      if (!m) {
        errors.push(`${where}: bad chord token "${tk}"`);
        continue;
      }
      const d = parseDur(m[2]);
      if (d !== null && isNaN(d)) {
        errors.push(`${where}: bad duration in "${tk}"`);
        continue;
      }
      if (d !== null) lastDur = d;
      const members = m[1].trim().split(/\s+/);
      const group: RawNote[] = [];
      let firstDia: number | null = null;
      for (const mem of members) {
        const nm = /^([a-g])(#{1,2}|b{1,2}|n)?(\d)?([',]*)$/.exec(mem);
        if (!nm) {
          errors.push(`${where}: bad chord member "${mem}" in "${tk}"`);
          continue;
        }
        const midi = resolvePitch(nm[1], nm[2], nm[3], nm[4]);
        if (firstDia === null) firstDia = refDia;
        const n: RawNote = { b: pos, d: lastDur, m: midi, vel, roll: 0, w: lastDur };
        applyArt(n, m[3], lastDur);
        group.push(n);
        notes.push(n);
      }
      if (firstDia !== null) refDia = firstDia;
      lastGroup = group;
      pos += lastDur;
      continue;
    }
    if (tk[0] === 'r' && /^r[whqiszut.]*$/.test(tk)) {
      const d = parseDur(tk.slice(1));
      if (d !== null && isNaN(d)) {
        errors.push(`${where}: bad rest "${tk}"`);
        continue;
      }
      if (d !== null) lastDur = d;
      pos += lastDur;
      lastGroup = [];
      continue;
    }
    if (tk[0] === '~') {
      const d = parseDur(tk.slice(1));
      if (d !== null && isNaN(d)) {
        errors.push(`${where}: bad tie "${tk}"`);
        continue;
      }
      if (d !== null) lastDur = d;
      if (!lastGroup.length) errors.push(`${where}: tie without a note at beat ${pos}`);
      for (const n of lastGroup) {
        n.w += lastDur;
        n.d = n.roll ? n.w : n.w * leg;
      }
      pos += lastDur;
      continue;
    }
    const m = NOTE_RE.exec(tk);
    if (!m) {
      errors.push(`${where}: bad token "${tk}"`);
      continue;
    }
    const d = parseDur(m[5]);
    if (d !== null && isNaN(d)) {
      errors.push(`${where}: bad duration in "${tk}"`);
      continue;
    }
    if (d !== null) lastDur = d;
    const midi = resolvePitch(m[1], m[2], m[3], m[4]);
    const n: RawNote = { b: pos, d: lastDur, m: midi, vel, roll: 0, w: lastDur };
    applyArt(n, m[6], lastDur);
    notes.push(n);
    lastGroup = [n];
    pos += lastDur;
  }
  if (!approx(pos, barStart) && barNo > 1) {
    const len = pos - barStart;
    if (!approx(len, barBeats)) errors.push(`${where}: last bar ${barNo} has ${+len.toFixed(3)} beats (expected ${barBeats})`);
  }
  // apply dynamic ramps
  for (const r of rampSegments) {
    const span = r.p1 - r.p0 || 1;
    for (let k = r.idx0; k < r.idx1; k++) {
      const n = notes[k];
      const f = Math.min(1, Math.max(0, (n.b - r.p0) / span));
      const base = r.v0 + (r.v1 - r.v0) * f;
      // keep accents relative
      n.vel = Math.min(1.25, (n.vel / r.v0) * base);
    }
  }
  return { notes, length: pos };
}

// ---------------------------------------------------------------------------
//  Pattern generator
// ---------------------------------------------------------------------------

interface PatToken {
  kind: 'deg' | 'bass' | 'chord' | 'hit' | 'rest' | 'tie';
  deg: number;
  oct: number;
  dur: number;
  vel: number;
  roll: number;
}

const PAT_RE = /^(\d{1,2}|[xXoc]|\.|-|r)([',]*)([whqiszut.]*)([!?~<>*]*)$/;

function parsePattern(src: string, stepDefault: number, errors: string[], where: string): { toks: PatToken[]; staccato: boolean[] } {
  const toks: PatToken[] = [];
  const stac: boolean[] = [];
  let text = expandRepeats(src).trim();
  const compact = /^[xXo.\-rR|\s]+$/.test(text);
  if (compact) {
    text = text.replace(/\s+/g, '');
    let runR = false;
    for (const c of text) {
      if (c === '|') continue;
      const t: PatToken = { kind: 'hit', deg: 0, oct: 0, dur: stepDefault, vel: 0.75, roll: 0 };
      if (c === 'X') t.vel = 1;
      else if (c === 'o') t.vel = 0.4;
      else if (c === '.') t.kind = 'rest';
      else if (c === '-') t.kind = 'tie';
      else if (c === 'r') {
        t.roll = 1;
        t.vel = 0.7;
      } else if (c === 'R') {
        t.roll = 2;
        t.vel = 1;
      }
      runR = c === 'R';
      toks.push(t);
      stac.push(false);
    }
    void runR;
    return { toks, staccato: stac };
  }
  let lastDur = stepDefault;
  for (const tk of text.split(/[\s|]+/).filter(Boolean)) {
    const m = PAT_RE.exec(tk);
    if (!m) {
      errors.push(`${where}: bad pattern token "${tk}"`);
      continue;
    }
    const d = parseDur(m[3]);
    if (d !== null && isNaN(d)) {
      errors.push(`${where}: bad duration in "${tk}"`);
      continue;
    }
    if (d !== null) lastDur = d;
    const t: PatToken = { kind: 'deg', deg: 1, oct: 0, dur: lastDur, vel: 0.72, roll: 0 };
    const head = m[1];
    if (/^\d+$/.test(head)) {
      const n = parseInt(head, 10);
      if (n === 0) t.kind = 'bass';
      else t.deg = n;
    } else if (head === 'c') t.kind = 'chord';
    else if (head === 'x') {
      t.kind = 'hit';
      t.vel = 0.75;
    } else if (head === 'X') {
      t.kind = 'hit';
      t.vel = 1;
    } else if (head === 'o') {
      t.kind = 'hit';
      t.vel = 0.4;
    } else if (head === '.' || head === 'r') t.kind = 'rest';
    else if (head === '-') t.kind = 'tie';
    for (const mk of m[2]) t.oct += mk === "'" ? 1 : -1;
    let st = false;
    const suf = m[4];
    for (let k = 0; k < suf.length; k++) {
      const c = suf[k];
      if (c === '!') t.vel *= 1.25;
      else if (c === '?') t.vel *= 0.6;
      else if (c === '*') st = true;
      else if (c === '~') {
        t.roll = 1;
        if (suf[k + 1] === '<') {
          t.roll = 2;
          k++;
        } else if (suf[k + 1] === '>') {
          t.roll = 3;
          k++;
        }
      }
    }
    toks.push(t);
    stac.push(st);
  }
  return { toks, staccato: stac };
}

/** lowest midi >= anchor with the given pitch class */
function placeAbove(pc: number, anchor: number): number {
  const d = (((pc - anchor) % 12) + 12) % 12;
  return anchor + d;
}

function genPattern(
  spec: PartObj,
  len: number,
  segs: ChordSeg[],
  errors: string[],
  where: string,
  leg: number,
): RawNote[] {
  const step = spec.step ? parseDur(spec.step) : 0.5;
  if (step === null || isNaN(step) || step <= 0) {
    errors.push(`${where}: bad step "${spec.step}"`);
    return [];
  }
  const { toks, staccato } = parsePattern(spec.pat || '', step, errors, where);
  if (!toks.length) return [];
  const patLen = toks.reduce((a, t) => a + t.dur, 0);
  if (patLen <= 0) return [];
  const reps = len / patLen;
  if (!approx(reps, Math.round(reps)) && !approx(len % patLen, 0)) {
    errors.push(`${where}: pattern length ${+patLen.toFixed(3)} does not divide section length ${len}`);
  }
  let anchor = 48;
  if (spec.at) {
    try {
      anchor = noteToMidi(spec.at);
    } catch {
      errors.push(`${where}: bad anchor "${spec.at}"`);
    }
  }
  const out: RawNote[] = [];
  let last: RawNote[] = [];
  let pos = 0;
  let i = 0;
  let guard = 0;
  while (pos < len - EPS && guard++ < 100000) {
    const tk = toks[i % toks.length];
    const st = staccato[i % toks.length];
    i++;
    const dur = Math.min(tk.dur, len - pos);
    if (tk.kind === 'rest') {
      last = [];
    } else if (tk.kind === 'tie') {
      for (const n of last) {
        n.w += dur;
        n.d = n.w * leg;
      }
    } else if (tk.kind === 'hit') {
      const n: RawNote = { b: pos, d: dur * (st ? 0.42 : leg), m: 60, vel: tk.vel, roll: tk.roll, w: dur, hit: true };
      out.push(n);
      last = [n];
    } else {
      const sg = chordAt(segs, pos);
      const ch = sg?.ch;
      if (!ch) {
        last = [];
      } else {
        const rootMidi = placeAbove(ch.root, anchor);
        let pitches: number[];
        if (tk.kind === 'bass') pitches = [placeAbove(ch.bass, anchor)];
        else if (tk.kind === 'chord') pitches = ch.iv.filter((x) => x < 12).map((x) => rootMidi + x);
        else pitches = [rootMidi + degreeInterval(ch, tk.deg)];
        last = [];
        for (const p of pitches) {
          const n: RawNote = { b: pos, d: dur * (st ? 0.42 : leg), m: p + 12 * tk.oct, vel: tk.vel, roll: tk.roll, w: dur };
          out.push(n);
          last.push(n);
        }
      }
    }
    pos += tk.dur;
  }
  return mergeRolls(splitAtChords(out, segs, anchor));
}

/** re-articulate held chord-relative notes when the harmony changes under them */
function splitAtChords(notes: RawNote[], segs: ChordSeg[], _anchor: number): RawNote[] {
  // Held pattern notes simply stop at a chord boundary; the pattern normally
  // strikes again there. This avoids sustained clashes.
  const out: RawNote[] = [];
  for (const n of notes) {
    const sg = chordAt(segs, n.b);
    if (sg && n.roll === 0 && !n.hit && n.b + n.d > sg.e + EPS) {
      const cut = sg.e - n.b;
      if (cut > 0.1) {
        out.push({ ...n, d: Math.max(cut * 0.98, 0.05) });
        continue;
      }
    }
    out.push(n);
  }
  return out;
}

function mergeRolls(notes: RawNote[]): RawNote[] {
  const out: RawNote[] = [];
  for (const n of notes) {
    const prev = out[out.length - 1];
    if (prev && n.roll > 0 && prev.roll === n.roll && prev.m === n.m && approx(prev.b + prev.w, n.b)) {
      prev.w += n.w;
      prev.d = prev.w;
      prev.vel = Math.max(prev.vel, n.vel);
      continue;
    }
    if (n.roll > 0) n.d = n.w;
    out.push(n);
  }
  return out;
}

// ---------------------------------------------------------------------------
//  Pad generator (voice-led chords)
// ---------------------------------------------------------------------------

function combos(n: number, k: number, start: number, acc: number[], out: number[][]) {
  if (acc.length === k) {
    out.push(acc.slice());
    return;
  }
  for (let i = start; i <= n - (k - acc.length); i++) {
    acc.push(i);
    combos(n, k, i + 1, acc, out);
    acc.pop();
  }
}

export function voiceChord(ch: Chord, n: number, lo: number, hi: number, prev: number[] | null): number[] {
  const pcs = ch.iv.map((x) => (ch.root + x) % 12);
  const uniq = Array.from(new Set(pcs));
  const cand: number[] = [];
  for (let m = lo; m <= hi; m++) if (uniq.includes(((m % 12) + 12) % 12)) cand.push(m);
  const required = new Set<number>();
  if (uniq.length > 1) required.add(pcs[1]); // third / sus
  if (pcs.length >= 4) required.add(pcs[3]); // seventh / colour
  if (n >= 3) required.add(pcs[0]);
  let best: number[] | null = null;
  let bestCost = Infinity;
  if (cand.length >= n) {
    const idx: number[][] = [];
    combos(cand.length, n, 0, [], idx);
    const center = (lo + hi) / 2;
    for (const c of idx) {
      const v = c.map((k) => cand[k]);
      let ok = true;
      for (let k = 1; k < v.length; k++) {
        const gap = v[k] - v[k - 1];
        if (gap > 12 || (gap < 2 && uniq.length >= 3 && n <= uniq.length + 1)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      const set = new Set(v.map((m) => m % 12));
      let cost = 0;
      for (const r of required) if (!set.has(r)) cost += 8;
      if (uniq.length >= 3 && !set.has(pcs[2] % 12) && n >= 4) cost += 1.5;
      // penalise doubled thirds
      const thirds = v.filter((m) => m % 12 === pcs[1]).length;
      if (thirds > 1) cost += 2.5;
      if (prev && prev.length === n) {
        for (let k = 0; k < n; k++) cost += Math.abs(v[k] - prev[k]);
      } else {
        const mean = v.reduce((a, b) => a + b, 0) / n;
        cost += Math.abs(mean - center) * 0.8;
        if (v[0] % 12 !== pcs[0]) cost += 3;
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = v;
      }
    }
  }
  if (best) return best;
  // fallback: close position from the root above lo
  const r = placeAbove(ch.root, lo);
  const res: number[] = [];
  for (let k = 0; k < n; k++) res.push(r + ch.iv[k % ch.iv.length] + 12 * Math.floor(k / ch.iv.length));
  return res;
}

function genPad(spec: PartObj, len: number, segs: ChordSeg[], errors: string[], where: string, leg: number): RawNote[] {
  const n = Math.max(1, Math.min(6, spec.pad || 3));
  let lo = 55;
  let hi = 76;
  try {
    if (spec.at) lo = noteToMidi(spec.at);
    if (spec.hi) hi = noteToMidi(spec.hi);
  } catch {
    errors.push(`${where}: bad pad range`);
  }
  if (hi - lo < 7) errors.push(`${where}: pad range too narrow`);
  const vel = 0.62;
  const voicings = new Map<ChordSeg, number[]>();
  let prev: number[] | null = null;
  for (const sg of segs) {
    if (!sg.ch) continue;
    const v = voiceChord(sg.ch, n, lo, hi, prev);
    voicings.set(sg, v);
    prev = v;
  }
  const out: RawNote[] = [];
  if (!spec.pat) {
    for (const sg of segs) {
      const v = voicings.get(sg);
      if (!v || sg.s >= len - EPS) continue;
      const e = Math.min(sg.e, len);
      for (const m of v) out.push({ b: sg.s, d: (e - sg.s) * Math.max(leg, 1), m, vel, roll: 0, w: e - sg.s });
    }
    return out;
  }
  const step = spec.step ? parseDur(spec.step) : 0.5;
  const { toks, staccato } = parsePattern(spec.pat, step && !isNaN(step) ? step : 0.5, errors, where);
  const patLen = toks.reduce((a, t) => a + t.dur, 0);
  if (patLen <= 0) return out;
  if (!approx(len % patLen, 0) && !approx(len % patLen, patLen)) errors.push(`${where}: pad pattern length ${patLen} does not divide ${len}`);
  let pos = 0;
  let i = 0;
  let last: RawNote[] = [];
  let guard = 0;
  while (pos < len - EPS && guard++ < 100000) {
    const tk = toks[i % toks.length];
    const st = staccato[i % toks.length];
    i++;
    const dur = Math.min(tk.dur, len - pos);
    if (tk.kind === 'rest') last = [];
    else if (tk.kind === 'tie') {
      for (const nn of last) {
        nn.w += dur;
        nn.d = nn.w * leg;
      }
    } else {
      const sg = chordAt(segs, pos);
      const v = sg ? voicings.get(sg) : undefined;
      last = [];
      if (v) {
        for (const m of v) {
          const nn: RawNote = { b: pos, d: dur * (st ? 0.42 : leg), m: m + 12 * tk.oct, vel: tk.vel, roll: tk.roll, w: dur };
          out.push(nn);
          last.push(nn);
        }
      }
    }
    pos += tk.dur;
  }
  return splitAtChords(out, segs, lo);
}

// ---------------------------------------------------------------------------
//  Section & track compilation
// ---------------------------------------------------------------------------

interface ResolvedSection extends SectionDef {
  v: Record<string, PartSpec>;
}

function resolveSection(def: TrackDef, name: string, errors: string[], depth = 0): ResolvedSection | null {
  const s = def.sections[name];
  if (!s) {
    errors.push(`${def.id}: unknown section "${name}"`);
    return null;
  }
  if (!s.base) return { ...s, v: { ...(s.v || {}) } };
  if (depth > 8) {
    errors.push(`${def.id}: section inheritance too deep at "${name}"`);
    return null;
  }
  const b = resolveSection(def, s.base, errors, depth + 1);
  if (!b) return null;
  const v: Record<string, PartSpec> = {};
  const baseV = b.v || {};
  for (const k of Object.keys(baseV)) {
    if (s.mute && s.mute.includes(k)) continue;
    v[k] = baseV[k];
  }
  Object.assign(v, s.v || {});
  return {
    ch: s.ch ?? b.ch,
    bars: s.bars ?? b.bars,
    bpm: s.bpm ?? b.bpm,
    tr: s.tr ?? b.tr,
    rit: s.rit,
    v,
  };
}

function normPart(p: PartSpec): PartObj {
  return typeof p === 'string' ? { n: p } : p;
}

function findRaw(def: TrackDef, secName: string, voice: string, errors: string[]): { raw: PartSpec; sec: string } | null {
  // look in the (resolved) section, then up its base chain (for muted voices)
  let name: string | undefined = secName;
  for (let k = 0; name && k < 10; k++) {
    const sec = resolveSection(def, name, errors);
    if (!sec) return null;
    if (sec.v[voice] !== undefined) return { raw: sec.v[voice], sec: name };
    name = def.sections[name]?.base;
  }
  return null;
}

function resolvePart(def: TrackDef, secName: string, voice: string, errors: string[], depth = 0): PartObj | null {
  const found = findRaw(def, secName, voice, errors);
  if (!found) {
    errors.push(`${def.id}: ref to missing part ${secName}.${voice}`);
    return null;
  }
  const raw = found.raw;
  const p = normPart(raw);
  if (!p.ref) return p;
  if (depth > 8) {
    errors.push(`${def.id}: ref chain too deep at ${secName}.${voice}`);
    return null;
  }
  const [rs, rv] = p.ref.includes('.') ? p.ref.split('.') : [secName, p.ref];
  const target = resolvePart(def, rs, rv, errors, depth + 1);
  if (!target) return null;
  const merged: PartObj = { ...target, ...p };
  delete merged.ref;
  merged.tr = (target.tr || 0) + (p.tr || 0);
  merged.vel = (target.vel ?? 1) * (p.vel ?? 1);
  return merged;
}

interface CompiledSection {
  len: number;
  notes: Array<RawNote & { v: number }>;
}

function compileSection(def: TrackDef, name: string, voiceIndex: Map<string, number>, errors: string[]): CompiledSection | null {
  const sec = resolveSection(def, name, errors);
  if (!sec) return null;
  const barBeats = sigToBarBeats(def.sig);
  const where = `${def.id}.${name}`;
  let segs: ChordSeg[] = [];
  let bars = sec.bars ?? 0;
  if (sec.ch) {
    const r = parseChordLine(sec.ch, barBeats, errors, where);
    segs = r.segs;
    if (!sec.bars) bars = r.bars;
    else if (r.bars !== sec.bars) errors.push(`${where}: chord line has ${r.bars} bars, section says ${sec.bars}`);
  }
  const parts: Array<{ voice: string; notes: RawNote[] }> = [];
  let maxLen = 0;
  const melodies: Array<{ voice: string; res: MelodyResult; spec: PartObj }> = [];
  for (const voice of Object.keys(sec.v)) {
    if (!voiceIndex.has(voice)) {
      errors.push(`${where}: unknown voice "${voice}"`);
      continue;
    }
    const spec = resolvePart(def, name, voice, errors);
    if (!spec) continue;
    const leg = def.voices[voice].leg ?? 0.96;
    if (spec.n !== undefined) {
      const res = parseMelody(spec.n, barBeats, errors, `${where}.${voice}`, leg);
      melodies.push({ voice, res, spec });
      maxLen = Math.max(maxLen, res.length);
    }
  }
  const len = bars > 0 ? bars * barBeats : Math.ceil(maxLen / barBeats - EPS) * barBeats;
  if (len <= 0) {
    errors.push(`${where}: section has no length`);
    return { len: 0, notes: [] };
  }
  for (const { voice, res, spec } of melodies) {
    let notes = res.notes;
    if (res.length > len + EPS) errors.push(`${where}.${voice}: melody is ${+res.length.toFixed(3)} beats, section is ${len}`);
    else if (res.length < len - EPS) {
      const reps = len / res.length;
      if (res.length > 0 && approx(reps, Math.round(reps))) {
        const all: RawNote[] = [];
        for (let k = 0; k < Math.round(reps); k++) for (const n of notes) all.push({ ...n, b: n.b + k * res.length });
        notes = all;
      } else {
        errors.push(`${where}.${voice}: melody is ${+res.length.toFixed(3)} beats, section is ${len}`);
      }
    }
    parts.push({ voice, notes: applyPartMods(notes, spec) });
  }
  for (const voice of Object.keys(sec.v)) {
    if (!voiceIndex.has(voice)) continue;
    const spec = resolvePart(def, name, voice, errors);
    if (!spec || spec.n !== undefined) continue;
    const leg = def.voices[voice].leg ?? 0.96;
    const w = `${where}.${voice}`;
    let notes: RawNote[] = [];
    if (spec.pad) {
      if (!segs.length) errors.push(`${w}: pad without chords`);
      notes = genPad(spec, len, segs, errors, w, leg);
    } else if (spec.pat !== undefined) {
      const needsChords = /(^|\s)(\d|c)/.test(spec.pat);
      if (needsChords && !segs.length) errors.push(`${w}: chord pattern without chords`);
      notes = genPattern(spec, len, segs, errors, w, leg);
    } else {
      errors.push(`${w}: part has no content`);
    }
    parts.push({ voice, notes: applyPartMods(notes, spec) });
  }
  const tr = sec.tr || 0;
  const out: Array<RawNote & { v: number }> = [];
  for (const p of parts) {
    const vi = voiceIndex.get(p.voice)!;
    for (const n of p.notes) {
      if (n.b >= len - EPS) continue;
      out.push({ ...n, m: n.m + tr, d: n.roll ? Math.min(n.d, len - n.b) : n.d, v: vi });
    }
  }
  return { len, notes: out };
}

function applyPartMods(notes: RawNote[], spec: PartObj): RawNote[] {
  const tr = spec.tr || 0;
  const vel = spec.vel ?? 1;
  if (!tr && vel === 1) return notes;
  return notes.map((n) => ({ ...n, m: n.m + tr, vel: Math.min(1.25, n.vel * vel) }));
}

/** beat → seconds inside a section with optional ritardando */
function beatTime(b: number, bpm: number, len: number, rit?: number): number {
  const spb = 60 / bpm;
  if (!rit || rit === 1 || len <= 0) return b * spb;
  // tempo falls linearly from bpm to bpm*rit over the section
  const k = (1 - rit) / len;
  return (-spb / k) * Math.log(1 - k * b);
}

const compiledCache = new Map<TrackDef, CompiledTrack>();

export function compileTrack(def: TrackDef): CompiledTrack {
  const cached = compiledCache.get(def);
  if (cached) return cached;
  const errors: string[] = [];
  const voiceNames = Object.keys(def.voices);
  const voiceIndex = new Map(voiceNames.map((n, i) => [n, i] as [string, number]));
  const secCache = new Map<string, CompiledSection | null>();
  const order = [...(def.intro || []), ...def.body];
  const introCount = (def.intro || []).length;
  const events: NoteEvent[] = [];
  const markers: Array<{ name: string; t: number }> = [];
  let t = 0;
  let loopStart = 0;
  if (!def.body.length) errors.push(`${def.id}: empty body`);
  order.forEach((name, k) => {
    if (k === introCount) loopStart = t;
    if (!secCache.has(name)) secCache.set(name, compileSection(def, name, voiceIndex, errors));
    const cs = secCache.get(name);
    if (!cs) return;
    const sec = resolveSection(def, name, [])!;
    const bpm = sec.bpm ?? def.bpm;
    markers.push({ name, t });
    for (const n of cs.notes) {
      const t0 = beatTime(n.b, bpm, cs.len, sec.rit);
      const t1 = beatTime(Math.min(n.b + n.d, cs.len * 0.9999), bpm, cs.len, sec.rit);
      const extra = n.b + n.d > cs.len ? ((n.b + n.d - cs.len) * 60) / (bpm * (sec.rit || 1)) : 0;
      events.push({ t: t + t0, d: Math.max(0.02, t1 - t0 + extra), v: n.v, m: n.m, vel: n.vel, roll: n.roll });
    }
    t += beatTime(cs.len, bpm, cs.len, sec.rit);
  });
  if (introCount >= order.length) loopStart = t;
  events.sort((a, b) => a.t - b.t || a.v - b.v);
  let loopIndex = events.findIndex((e) => e.t >= loopStart - 1e-6);
  if (loopIndex < 0) loopIndex = events.length;
  const res: CompiledTrack = {
    id: def.id,
    title: def.title,
    voiceNames,
    voices: voiceNames.map((n) => def.voices[n]),
    events,
    loopStart,
    length: t,
    loopIndex,
    loop: def.loop !== false,
    markers,
    errors,
  };
  compiledCache.set(def, res);
  return res;
}
