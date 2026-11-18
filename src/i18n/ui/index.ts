// Every UI line, gathered from the area files beside this one. Each file exports `lines` (id →
// English, or plural forms) and may export `notes` (who says it, where it shows) and `max` (the
// width a tight label has room for). Ids are lowercase words joined by dots, starting with the area.
import type { Lines } from '../core';

type Area = { lines?: Lines; notes?: Record<string, string>; max?: Record<string, number> };
const areas = import.meta.glob<Area>(['./*.ts', '!./index.ts'], { eager: true });

export const UI_LINES: Lines = {};
export const UI_NOTES: Record<string, string> = {};
export const UI_MAX: Record<string, number> = {};
/** Ids given by more than one area file; tests reject them. */
export const UI_DUPLICATES: string[] = [];

for (const path of Object.keys(areas).sort()) {
  const a = areas[path];
  for (const [id, line] of Object.entries(a.lines ?? {})) {
    if (id in UI_LINES) UI_DUPLICATES.push(`${id} (${path})`);
    UI_LINES[id] = line;
  }
  Object.assign(UI_NOTES, a.notes ?? {});
  Object.assign(UI_MAX, a.max ?? {});
}
