// Persistent game state + save slots.
import type { RosterUnit } from './roster';
import { createCharacter, createGeneric, newUid } from './roster';
import { Rng } from '../core/rng';
import { zodiacFromDate } from '../battle/zodiac';
import { STORY, CHARACTERS } from '../data/db';
import type { Quality } from '../gfx/renderer';

export interface Options {
  /** enemy strength relative to the party */
  difficulty: 'easy' | 'normal' | 'hard';
  gentle: boolean;         // fallen units never crystallize
  battleSpeed: number;     // 0.5 .. 2
  textSpeed: number;       // chars per second multiplier
  music: number;
  sfx: number;
  quality: Quality | 'auto';
  renderer: 'auto' | 'webgpu' | 'webgl2' | 'webgl1';
  confirmMoves: boolean;
  showGrid: boolean;
  camShake: boolean;
}

export const DEFAULT_OPTIONS: Options = {
  difficulty: 'normal',
  gentle: false, battleSpeed: 1, textSpeed: 1, music: 0.7, sfx: 0.8, quality: 'auto', renderer: 'auto',
  confirmMoves: true, showGrid: true, camShake: true,
};

export interface ErrandRun { id: string; units: string[]; start: number; due: number }

export interface GameState {
  version: 1;
  heroName: string;
  heroBirthday: [number, number];
  chapter: number;
  storyIndex: number;
  flags: Record<string, boolean | number>;
  roster: RosterUnit[];
  inventory: Record<string, number>;
  gil: number;
  day: number;
  location: string;
  unlocked: string[];
  tier: number;
  errands: ErrandRun[];
  errandsDone: string[];
  artefacts: string[];
  chronicle: string[];
  sideDone: string[];
  playtime: number;
  battlesWon: number;
  seed: number;
  /** named characters met (Chronicle persons) */
  met: string[];
  /** fur shop stock from poaching */
  furStock: Record<string, number>;
  /** rumours read */
  rumorsRead: string[];
  savedAt?: number;
}

export function newGame(heroName: string, birthday: [number, number]): GameState {
  const rng = new Rng();
  const hero = createCharacter('rhen', 1, rng);
  hero.name = heroName || 'Rhen';
  hero.zodiac = zodiacFromDate(birthday[0], birthday[1]);
  hero.birthday = birthday;
  hero.level = 1;
  hero.equip = { rhand: 'broadsword', head: 'leatherCap', body: 'clothes' };
  const roster: RosterUnit[] = [hero];
  const jobs = ['squire', 'squire', 'chemist', 'squire', 'chemist', 'squire'];
  const genders: Array<'m' | 'f'> = ['m', 'f', 'f', 'm', 'm', 'f'];
  const taken: string[] = [hero.name];
  for (let i = 0; i < 6; i++) {
    const u = createGeneric({ gender: genders[i], level: 1 + (i % 2), job: jobs[i], rng });
    while (taken.includes(u.name)) u.name = u.name + '';
    taken.push(u.name);
    u.equip = jobs[i] === 'chemist' ? { rhand: 'dagger', head: 'leatherCap', body: 'clothes' } : { rhand: 'broadsword', head: 'leatherCap', body: 'clothes' };
    // chemists know Potion from the start; squires know Rush
    if (jobs[i] === 'chemist') u.learned.push('usePotion');
    else u.learned.push('rush');
    roster.push(u);
  }
  hero.learned.push('rush');
  return {
    version: 1,
    heroName: hero.name,
    heroBirthday: birthday,
    chapter: 0,
    storyIndex: 0,
    flags: {},
    roster,
    inventory: { potion: 10, phoenixDown: 3, antidote: 2, eyeDrop: 2 },
    gil: 1500,
    day: 1,
    location: 'orvelle',
    unlocked: ['orvelle', 'galwyn'],
    tier: 1,
    errands: [],
    errandsDone: [],
    artefacts: [],
    chronicle: [],
    sideDone: [],
    playtime: 0,
    battlesWon: 0,
    seed: rng.int(1, 1e9),
    met: ['rhen'],
    furStock: {},
    rumorsRead: [],
  };
}

export function partyLevel(s: GameState): number {
  const lv = s.roster.filter((u) => !u.errand).map((u) => u.level).sort((a, b) => b - a).slice(0, 5);
  if (!lv.length) return 1;
  return Math.max(1, Math.round(lv.reduce((a, b) => a + b, 0) / lv.length));
}

export function hero(s: GameState): RosterUnit {
  return s.roster.find((u) => u.charId === 'rhen') ?? s.roster[0];
}

export function addItem(s: GameState, id: string, n = 1) {
  s.inventory[id] = (s.inventory[id] ?? 0) + n;
  if (s.inventory[id] <= 0) delete s.inventory[id];
}

export function flag(s: GameState, f: string): boolean { return !!s.flags[f]; }

/** Add a named character to the party (idempotent) */
export function joinCharacter(s: GameState, charId: string, rng = new Rng()) {
  if (s.roster.some((u) => u.charId === charId)) return;
  if (!CHARACTERS.has(charId)) return;
  const u = createCharacter(charId, partyLevel(s), rng);
  s.roster.push(u);
  if (!s.met.includes(charId)) s.met.push(charId);
}

export function leaveCharacter(s: GameState, charId: string) {
  const u = s.roster.find((r) => r.charId === charId);
  if (!u) return;
  // return equipment to inventory
  for (const id of Object.values(u.equip)) if (id) addItem(s, id, 1);
  s.roster = s.roster.filter((r) => r !== u);
}

// ---------------------------------------------------------------------------
//  Save slots (localStorage; each slot is a JSON blob)
// ---------------------------------------------------------------------------
const KEY = 'fft-fealty-save-';
export const SLOTS = 8;

export interface SlotInfo { slot: number; heroName: string; chapter: number; location: string; playtime: number; savedAt: number; level: number; objective: string }

function storage(): Storage | null { try { return window.localStorage; } catch { return null; } }

export function saveGame(s: GameState, slot: number): boolean {
  const st = storage();
  if (!st) return false;
  s.savedAt = Date.now();
  try { st.setItem(KEY + slot, JSON.stringify(s)); return true; } catch { return false; }
}

export function loadGame(slot: number): GameState | null {
  const st = storage();
  if (!st) return null;
  const raw = st.getItem(KEY + slot);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as GameState;
    return migrate(s);
  } catch { return null; }
}

export function deleteSave(slot: number) { storage()?.removeItem(KEY + slot); }

export function listSaves(): Array<SlotInfo | null> {
  const out: Array<SlotInfo | null> = [];
  for (let i = 0; i < SLOTS; i++) {
    const s = loadGame(i);
    if (!s) { out.push(null); continue; }
    out.push({ slot: i, heroName: s.heroName, chapter: s.chapter, location: s.location, playtime: s.playtime, savedAt: s.savedAt ?? 0, level: partyLevel(s), objective: STORY[s.storyIndex]?.objective ?? 'The tale is told.' });
  }
  return out;
}

export function latestSave(): number | null {
  let best: number | null = null, t = -1;
  listSaves().forEach((s, i) => { if (s && s.savedAt > t) { t = s.savedAt; best = i; } });
  return best;
}

function migrate(s: GameState): GameState {
  s.met ??= [];
  s.furStock ??= {};
  s.rumorsRead ??= [];
  s.sideDone ??= [];
  s.artefacts ??= [];
  s.errands ??= [];
  s.errandsDone ??= [];
  s.chronicle ??= [];
  for (const u of s.roster) { u.uid ??= newUid(); u.learned ??= []; u.jp ??= {}; u.totalJp ??= {}; u.equip ??= {}; }
  return s;
}

const OPT_KEY = 'fft-fealty-options';
export function loadOptions(): Options {
  try { const raw = storage()?.getItem(OPT_KEY); if (raw) return { ...DEFAULT_OPTIONS, ...JSON.parse(raw) }; } catch { /* ignore */ }
  return { ...DEFAULT_OPTIONS };
}
export function saveOptions(o: Options) { try { storage()?.setItem(OPT_KEY, JSON.stringify(o)); } catch { /* ignore */ } }
