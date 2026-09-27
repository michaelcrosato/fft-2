// Persistent game state + save slots.
import type { RosterUnit } from './roster';
import { addExp, addJp, createCharacter, createGeneric, newUid, randomName, setLevel } from './roster';
import { autoEquip } from './setup';
import { Rng } from '../core/rng';
import { zodiacFromDate } from '../battle/zodiac';
import { displayStats } from '../battle/stats';
import type { ErrandDef } from '../data/types';
import { STORY, CHARACTERS, ERRANDS, JOBS, NODES } from '../data/db';
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
  /** random ambushes when stopping at open-field locations */
  encounters: boolean;
}

export const DEFAULT_OPTIONS: Options = {
  difficulty: 'normal',
  gentle: false, battleSpeed: 1, textSpeed: 1, music: 0.7, sfx: 0.8, quality: 'auto', renderer: 'auto',
  confirmMoves: true, showGrid: true, camShake: true, encounters: true,
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
  /** companions who left the party, kept so they return as they were */
  away?: Record<string, RosterUnit>;
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

/** `seed` makes the starting company reproducible (simulations, tests); players get a random one */
export function newGame(heroName: string, birthday: [number, number], seed?: number): GameState {
  const rng = new Rng(seed);
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
    const u = createGeneric({ gender: genders[i], level: 1 + (i % 2), job: jobs[i], rng, name: randomName(genders[i], rng, taken) });
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

/** Add a named character to the party (idempotent) */
export function joinCharacter(s: GameState, charId: string, rng = new Rng()) {
  if (s.roster.some((u) => u.charId === charId)) return;
  const c = CHARACTERS.get(charId);
  if (!c) return;
  // a companion returning from time away keeps their JP, abilities and growth
  const back = s.away?.[charId];
  let u: RosterUnit;
  if (back) {
    u = back;
    delete s.away![charId];
    const pl = partyLevel(s) + (c.levelAbs ? 0 : (c.level ?? 0));
    if (u.level < pl) setLevel(u, pl);
  } else u = createCharacter(charId, partyLevel(s), rng);
  // companions who arrive without a kit are outfitted from the current shops
  if (!Object.values(u.equip).some(Boolean)) autoEquip(u, s.tier, rng);
  s.roster.push(u);
  if (!s.met.includes(charId)) s.met.push(charId);
}

export function leaveCharacter(s: GameState, charId: string) {
  const u = s.roster.find((r) => r.charId === charId);
  if (!u) return;
  // return equipment to inventory
  for (const id of Object.values(u.equip)) if (id) addItem(s, id, 1);
  u.equip = {};
  s.roster = s.roster.filter((r) => r !== u);
  (s.away ??= {})[charId] = u;
}

/** How well a soldier suits an errand's favoured attribute, on Brave's scale (a typical soldier scores about 60). */
export function errandAptitude(u: RosterUnit, stat: ErrandDef['stat']): number {
  if (stat === 'brave') return u.brave;
  if (stat === 'faith') return u.faith;
  if (stat === 'level') return u.level * 3;
  const job = JOBS.get(u.job);
  if (!job) return 60;
  const d = displayStats(u.raw, job);
  return stat === 'speed' ? d.speed * 9 : d[stat] * 11;
}

/** Resolve returning errand parties once, including rewards and level growth. */
export function advanceDay(s: GameState, n: number, rng = new Rng()): Array<{ id: string; success: boolean }> {
  s.day += n;
  const reports: Array<{ id: string; success: boolean }> = [];
  for (const run of [...s.errands]) {
    if (s.day < run.due) continue;
    const e = ERRANDS.get(run.id);
    s.errands = s.errands.filter((r) => r !== run);
    const units = s.roster.filter((u) => run.units.includes(u.uid));
    for (const u of units) u.errand = undefined;
    if (!e) continue;
    const score = units.reduce((acc, u) => acc + errandAptitude(u, e.stat) + ((e.jobs ?? []).includes(u.job) ? 25 : 0), 0) / Math.max(1, units.length);
    const success = units.length > 0 && rng.pct(Math.min(95, 40 + score * 0.6 + units.length * 8));
    if (success) {
      s.gil += e.reward.gil;
      for (const u of units) { addJp(u, u.job, e.reward.jp ?? 100); addExp(u, 30); }
      if (e.reward.item) addItem(s, e.reward.item);
      if (e.reward.artefact && !s.artefacts.includes(e.reward.artefact)) s.artefacts.push(e.reward.artefact);
      if (e.reward.flag) s.flags[e.reward.flag] = true;
      if (e.reward.unlock && NODES.has(e.reward.unlock) && !s.unlocked.includes(e.reward.unlock)) s.unlocked.push(e.reward.unlock);
      if (!s.errandsDone.includes(e.id)) s.errandsDone.push(e.id);
    }
    reports.push({ id: e.id, success });
  }
  return reports;
}

// ---------------------------------------------------------------------------
//  Save slots (localStorage; each slot is a JSON blob)
// ---------------------------------------------------------------------------
const KEY = 'fft-fealty-save-';
export const SLOTS = 8;
/** the last slot is written after every story step */
export const AUTOSAVE_SLOT = SLOTS - 1;

export interface SlotInfo { slot: number; heroName: string; chapter: number; location: string; playtime: number; savedAt: number; level: number; objective: string }

function storage(): Storage | null { try { return window.localStorage; } catch { return null; } }

export function saveGame(s: GameState, slot: number): boolean {
  const st = storage();
  if (!st) return false;
  const savedAt = Date.now();
  try { st.setItem(KEY + slot, JSON.stringify({ ...s, savedAt })); s.savedAt = savedAt; return true; } catch { return false; }
}

export function loadGame(slot: number): GameState | null {
  const st = storage();
  if (!st) return null;
  try {
    const raw = st.getItem(KEY + slot);
    if (!raw) return null;
    const s: unknown = JSON.parse(raw);
    return validSave(s) ? migrate(s) : null;
  } catch { return null; }
}

export function deleteSave(slot: number): boolean {
  const st = storage();
  if (!st) return false;
  try { st.removeItem(KEY + slot); return true; } catch { return false; }
}

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
  // older builds recorded every ambush victory (rand_<node>_<day>) as a flag nothing reads
  for (const k of Object.keys(s.flags)) if (/^rand_.+_\d+$/.test(k)) delete s.flags[k];
  delete (s as { __eggs?: unknown }).__eggs;
  for (const u of [...s.roster, ...Object.values(s.away ?? {})]) { u.uid ??= newUid(); u.learned ??= []; u.jp ??= {}; u.totalJp ??= {}; u.equip ??= {}; }
  return s;
}

/** Reject truncated/corrupt saves before their data reaches menus or battle setup. */
function validSave(value: unknown): value is GameState {
  const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  const number = (v: unknown, min = 0, max = Infinity): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const integer = (v: unknown, min = 0, max = Infinity): v is number => number(v, min, max) && Number.isInteger(v);
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
  const numbers = (v: unknown) => record(v) && Object.values(v).every((n) => number(n));
  const unit = (v: unknown): boolean => {
    if (!record(v) || typeof v.name !== 'string' || typeof v.job !== 'string' || !JOBS.has(v.job)) return false;
    if (!['m', 'f', 'monster'].includes(v.gender as string) || typeof v.zodiac !== 'string') return false;
    if (!integer(v.level, 1, 99) || !number(v.exp) || !number(v.brave, 0, 100) || !number(v.faith, 0, 100)) return false;
    if (!record(v.raw) || !['hp', 'mp', 'sp', 'pa', 'ma'].every((k) => number((v.raw as Record<string, unknown>)[k]))) return false;
    if (!record(v.look) || !integer(v.kills)) return false;
    if (v.charId !== undefined && (typeof v.charId !== 'string' || !CHARACTERS.has(v.charId))) return false;
    for (const k of ['uid', 'secondary', 'reaction', 'support', 'movement', 'errand']) if (v[k] !== undefined && typeof v[k] !== 'string') return false;
    if (v.learned != null && !strings(v.learned)) return false;
    if (v.jp != null && !numbers(v.jp) || v.totalJp != null && !numbers(v.totalJp)) return false;
    return v.equip == null || (record(v.equip) && Object.values(v.equip).every((id) => typeof id === 'string'));
  };
  if (!record(value) || value.version !== 1 || typeof value.heroName !== 'string') return false;
  if (!Array.isArray(value.heroBirthday) || value.heroBirthday.length !== 2 || !integer(value.heroBirthday[0], 1, 12) || !integer(value.heroBirthday[1], 1, 31)) return false;
  if (!integer(value.chapter, 0, 4) || !integer(value.storyIndex, 0, STORY.length) || !integer(value.tier, 1, 8)) return false;
  if (!integer(value.day, 1) || !integer(value.gil) || !integer(value.battlesWon) || !number(value.playtime) || !number(value.seed)) return false;
  if (!record(value.flags) || !Object.values(value.flags).every((v) => typeof v === 'boolean' || number(v))) return false;
  if (!numbers(value.inventory) || typeof value.location !== 'string' || !NODES.has(value.location)) return false;
  if (!strings(value.unlocked) || !value.unlocked.every((id) => NODES.has(id))) return false;
  if (!Array.isArray(value.roster) || !value.roster.every(unit) || !value.roster.some((u) => u.charId === 'rhen')) return false;
  if (value.away != null && (!record(value.away) || !Object.values(value.away).every(unit))) return false;
  for (const k of ['met', 'rumorsRead', 'sideDone', 'artefacts', 'errandsDone', 'chronicle']) if (value[k] != null && !strings(value[k])) return false;
  if (value.furStock != null && !numbers(value.furStock)) return false;
  if (value.savedAt != null && !number(value.savedAt)) return false;
  if (value.errands != null && (!Array.isArray(value.errands) || !value.errands.every((r) => record(r) && typeof r.id === 'string' && strings(r.units) && integer(r.start, 1) && integer(r.due, 1)))) return false;
  return true;
}

const OPT_KEY = 'fft-fealty-options';
/** in-memory copy: options keep working when storage is blocked, and hot paths don't re-parse localStorage */
let optCache: Options | null = null;
/** Saved preferences can outlive an old build or contain valid JSON of the wrong shape. */
function normalizeOptions(value: unknown): Options {
  const out = { ...DEFAULT_OPTIONS };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  const raw = value as Record<string, unknown>;
  const choice = <T extends string>(key: string, values: readonly T[], fallback: T): T =>
    typeof raw[key] === 'string' && values.includes(raw[key] as T) ? raw[key] as T : fallback;
  out.difficulty = choice('difficulty', ['easy', 'normal', 'hard'], out.difficulty);
  out.quality = choice('quality', ['auto', 'ultra', 'high', 'medium', 'low'], out.quality);
  out.renderer = choice('renderer', ['auto', 'webgpu', 'webgl2', 'webgl1'], out.renderer);
  for (const key of ['gentle', 'confirmMoves', 'showGrid', 'camShake', 'encounters'] as const) {
    if (typeof raw[key] === 'boolean') out[key] = raw[key];
  }
  for (const [key, min, max] of [['music', 0, 1], ['sfx', 0, 1], ['battleSpeed', 0.5, 2], ['textSpeed', 0.01, 2.5]] as const) {
    const v = raw[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max) out[key] = v;
  }
  return out;
}

export function loadOptions(): Options {
  if (!optCache) {
    try { const raw = storage()?.getItem(OPT_KEY); if (raw) optCache = normalizeOptions(JSON.parse(raw)); } catch { /* ignore */ }
    optCache ??= { ...DEFAULT_OPTIONS };
  }
  return { ...optCache };
}
export function saveOptions(o: Options) {
  optCache = normalizeOptions(o);
  try { storage()?.setItem(OPT_KEY, JSON.stringify(optCache)); } catch { /* ignore */ }
}
