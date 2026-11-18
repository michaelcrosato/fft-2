// The game-lines block (AI Hub Languages v1, *The line list*): every UI line and every content
// line, with notes, widths, the list of names and the translator's brief. The build writes it into
// index.html (vite.config.ts); tests check it with 52in1's own checker.
import { CHARACTERS, NODES } from '../data/db';
import { BRIEF, EXTRA_NAMES } from './brief';
import { contentFields } from './content';
import { SOURCE_LANGUAGE, type Block, type Lines } from './core';
import { UI_LINES, UI_MAX, UI_NOTES } from './ui';

export interface Built { block: Block; conflicts: string[] }

export function buildLines(): Built {
  const lines: Lines = { ...UI_LINES };
  const notes: Record<string, string> = { ...UI_NOTES };
  const conflicts: string[] = [];
  for (const f of contentFields()) {
    const text = f.get();
    if (f.id in lines && lines[f.id] !== text) { conflicts.push(f.id); continue; }
    lines[f.id] = text;
    if (f.note && !(f.id in notes)) notes[f.id] = f.note;
  }
  const names = new Set<string>(EXTRA_NAMES);
  for (const c of CHARACTERS.values()) { names.add(c.name); if (c.fullName) names.add(c.fullName); }
  for (const n of NODES.values()) names.add(n.name);
  return {
    block: {
      version: 1,
      language: SOURCE_LANGUAGE,
      lines,
      notes: Object.fromEntries(Object.entries(notes).filter(([id]) => id in lines)),
      max: Object.fromEntries(Object.entries(UI_MAX).filter(([id]) => id in lines)),
      names: [...names].sort(),
      brief: BRIEF,
    },
    conflicts,
  };
}
