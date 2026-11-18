// The score's timeline, as pure functions: which notes start in a window of time. The engine
// asks for the next ~0.2 s at a time and schedules exactly those, so playback never drifts and
// a looped body repeats seamlessly.
import type { Note, Part, Section, Song } from './score/dsl';

export interface Timed {
  /** seconds from the song's start */
  at: number;
  /** seconds */
  d: number;
  p: number;
  v: number;
  part: Part;
  section: 'intro' | 'body';
  /** which pass of the body (0 for the intro) */
  pass: number;
}

interface Indexed { section: Section; notes: Array<{ n: Note; part: Part }> }
const index = new WeakMap<Section, Indexed>();
function indexed(section: Section): Indexed {
  let ix = index.get(section);
  if (!ix) {
    const notes = section.parts.flatMap((part) => part.notes.map((n) => ({ n, part })));
    notes.sort((a, b) => a.n.t - b.n.t);
    ix = { section, notes };
    index.set(section, ix);
  }
  return ix;
}

const spb = (song: Song, s: Section) => 60 / (s.bpm ?? song.bpm);
export const sectionSeconds = (song: Song, s: Section) => s.beats * spb(song, s);

/** Seconds of the intro and of one pass of the body. */
export function lengths(song: Song): { intro: number; body: number } {
  return { intro: song.intro ? sectionSeconds(song, song.intro) : 0, body: sectionSeconds(song, song.body) };
}

/** Whether the body repeats: songs loop unless they are `once`; the caller may override. */
export const loops = (song: Song, override?: boolean) => override ?? !song.once;

/** Seconds until a song that does not loop has played its last note (plus its tails). */
export function finalSeconds(song: Song): number {
  const { intro } = lengths(song);
  const s = spb(song, song.body);
  return intro + song.body.parts.reduce((e, p) => Math.max(e, ...p.notes.map((n) => (n.t + n.d) * s)), sectionSeconds(song, song.body));
}

function first(notes: Indexed['notes'], beat: number): number {
  let lo = 0, hi = notes.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (notes[mid].n.t < beat) lo = mid + 1; else hi = mid; }
  return lo;
}

/** Notes that start in [from, to) seconds from the song's start. */
export function eventsBetween(song: Song, from: number, to: number, loop = loops(song)): Timed[] {
  const out: Timed[] = [];
  if (to <= from) return out;
  const { intro, body } = lengths(song);
  const take = (section: Section, start: number, kind: 'intro' | 'body', pass: number) => {
    const s = spb(song, section);
    const ix = indexed(section);
    const lo = Math.max(0, (from - start) / s);
    const hi = (to - start) / s;
    for (let i = first(ix.notes, lo); i < ix.notes.length; i++) {
      const { n, part } = ix.notes[i];
      if (n.t >= hi) break;
      if (n.t >= section.beats) break; // a body note past its length would double up with the next pass
      out.push({ at: start + n.t * s, d: n.d * s, p: n.p, v: n.v, part, section: kind, pass });
    }
  };
  if (song.intro && from < intro) take(song.intro, 0, 'intro', 0);
  if (body <= 0) return out;
  const firstPass = Math.max(0, Math.floor((from - intro) / body));
  const lastPass = loop ? Math.floor((to - intro) / body) : 0;
  for (let k = firstPass; k <= lastPass; k++) {
    const start = intro + k * body;
    if (start >= to) break;
    if (start + body <= from) continue;
    take(song.body, start, 'body', k);
  }
  return out;
}
