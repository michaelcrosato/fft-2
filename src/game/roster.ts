import type { CharLook, EquipCategory, EquipSlot, HairStyle, ItemDef, JobDef, Zodiac } from '../data/types';
import { ABILITIES, CHARACTERS, ITEMS, JOBS, job as getJob } from '../data/db';
import { Rng } from '../core/rng';
import { jobLevel, levelRawTo, newRaw, type RawStats, displayStats, MAX_JP } from '../battle/stats';
import { ZODIAC_ORDER } from '../battle/zodiac';

/** A persistent party member (saved in the game state). */
export interface RosterUnit {
  uid: string;
  name: string;
  gender: 'm' | 'f' | 'monster';
  zodiac: Zodiac;
  charId?: string;
  job: string;
  level: number;
  exp: number;
  brave: number;
  faith: number;
  raw: RawStats;
  jp: Record<string, number>;
  totalJp: Record<string, number>;
  learned: string[];
  equip: Partial<Record<EquipSlot, string>>;
  secondary?: string;
  reaction?: string;
  support?: string;
  movement?: string;
  kills: number;
  look: CharLook;
  /** birthday [month, day] */
  birthday?: [number, number];
  /** away on an errand */
  errand?: string;
  /** dead-permanently flag (crystallized) — removed from roster instead normally */
  joinedDay?: number;
}

let uidCounter = Date.now() % 100000;
export function newUid() { return 'u' + (uidCounter++).toString(36) + Math.floor(Math.random() * 1e4).toString(36); }

const MALE_NAMES = ['Aldo', 'Bram', 'Cassius', 'Dorn', 'Edric', 'Fennick', 'Gale', 'Hollis', 'Ivo', 'Jory', 'Kellan', 'Lucan', 'Marek', 'Niles', 'Osric', 'Piet', 'Quill', 'Rolan', 'Sten', 'Tobin', 'Ulric', 'Vance', 'Wendel', 'Yorick', 'Zeb', 'Anselm', 'Bastien', 'Corwin', 'Dace', 'Emeric', 'Faris', 'Gideon', 'Haldor', 'Jasper', 'Lorcan', 'Merrit', 'Orrin', 'Perrin', 'Roderic', 'Silas', 'Tamsin', 'Wystan'];
const FEMALE_NAMES = ['Annette', 'Brielle', 'Celestine', 'Delphine', 'Elodie', 'Fleur', 'Gisela', 'Hester', 'Isolde', 'Jessamy', 'Katrin', 'Liesel', 'Maren', 'Nadine', 'Odile', 'Perpetua', 'Rosalind', 'Sabine', 'Tamsin', 'Una', 'Vivienne', 'Wren', 'Yvaine', 'Zelie', 'Aveline', 'Blythe', 'Corinne', 'Dagny', 'Eira', 'Fenella', 'Greer', 'Imogen', 'Juniper', 'Linnea', 'Mireille', 'Noor', 'Oriel', 'Pell', 'Rhiannon', 'Solenne', 'Thessaly'];
const HAIR_COLORS = ['#3b2a1e', '#6b4a2b', '#a0723c', '#d9b56a', '#222222', '#8c3b1f', '#b8b0a0', '#5a3a28', '#c98f4a', '#403028'];
const SKIN = ['#f1d3b3', '#e8c39e', '#d9a877', '#c68c5c', '#a86f45', '#f5dcc4'];
const M_HAIR: HairStyle[] = ['short', 'spiky', 'shaggy', 'slick', 'curly', 'crest', 'wild', 'topknot'];
const F_HAIR: HairStyle[] = ['long', 'ponytail', 'bob', 'braid', 'bun', 'twintails', 'curly', 'short'];

export function randomLook(gender: 'm' | 'f', rng: Rng): CharLook {
  return {
    skin: rng.pick(SKIN),
    hair: rng.pick(HAIR_COLORS),
    hairStyle: rng.pick(gender === 'm' ? M_HAIR : F_HAIR),
    beard: gender === 'm' && rng.pct(15) ? rng.pick(['stubble', 'mustache', 'goatee'] as const) : 'none',
  };
}

export function randomName(gender: 'm' | 'f', rng: Rng, taken: string[] = []) {
  const pool = (gender === 'm' ? MALE_NAMES : FEMALE_NAMES).filter((n) => !taken.includes(n));
  return rng.pick(pool.length ? pool : gender === 'm' ? MALE_NAMES : FEMALE_NAMES);
}

/** Create a generic recruit. */
export function createGeneric(opts: { gender: 'm' | 'f'; level: number; job?: string; rng?: Rng; name?: string; brave?: number; faith?: number; zodiac?: Zodiac }): RosterUnit {
  const rng = opts.rng ?? new Rng();
  const raw = newRaw(opts.gender, rng);
  const jobId = opts.job ?? 'squire';
  const j = getJob(jobId);
  levelRawTo(raw, 1, opts.level, j.growth);
  const month = rng.int(1, 12), day = rng.int(1, 28);
  const u: RosterUnit = {
    uid: newUid(),
    name: opts.name ?? randomName(opts.gender, rng),
    gender: opts.gender,
    zodiac: opts.zodiac ?? rng.pick(ZODIAC_ORDER),
    job: jobId,
    level: opts.level,
    exp: rng.int(0, 60),
    brave: opts.brave ?? rng.int(45, 74),
    faith: opts.faith ?? rng.int(45, 74),
    raw,
    jp: {}, totalJp: {},
    learned: [],
    equip: {},
    kills: 0,
    look: randomLook(opts.gender, rng),
    birthday: [month, day],
  };
  // a little starting JP like the recruits of old
  u.jp.squire = rng.int(60, 150); u.totalJp.squire = u.jp.squire;
  u.jp.chemist = rng.int(60, 150); u.totalJp.chemist = u.jp.chemist;
  return u;
}

/** Create a roster unit for a monster species. */
export function createMonster(jobId: string, level: number, rng = new Rng()): RosterUnit {
  const j = getJob(jobId);
  const raw = newRaw('monster', rng);
  levelRawTo(raw, 1, level, j.growth);
  return {
    uid: newUid(),
    name: j.name,
    gender: 'monster',
    zodiac: rng.pick(ZODIAC_ORDER),
    job: jobId,
    level,
    exp: 0,
    brave: rng.int(50, 70),
    faith: rng.int(50, 70),
    raw,
    jp: {}, totalJp: {},
    learned: (j.monsterSkills ?? []).filter(([, lv]) => lv <= level).map(([a]) => a),
    equip: {},
    kills: 0,
    look: {},
  };
}

/** Create a roster unit for a named story character. */
export function createCharacter(charId: string, partyLevel: number, rng = new Rng(), exactLevel?: number): RosterUnit {
  const c = CHARACTERS.get(charId);
  if (!c) throw new Error('Unknown character ' + charId);
  const level = exactLevel !== undefined ? Math.max(1, Math.min(99, exactLevel)) : Math.max(1, Math.min(99, c.levelAbs ? (c.level ?? 1) : partyLevel + (c.level ?? 0)));
  const g = c.gender;
  const raw = newRaw(g, rng);
  const j = getJob(c.job);
  levelRawTo(raw, 1, level, j.growth);
  const learned = new Set<string>(c.learned ?? []);
  // named characters know their unique skillset in full
  if (j.unique || !j.generic) for (const a of j.abilities) if (ABILITIES.get(a)?.kind === 'action') learned.add(a);
  for (const a of [c.reaction, c.support, c.movement]) if (a) learned.add(a);
  const u: RosterUnit = {
    uid: newUid(),
    name: c.name,
    gender: g,
    zodiac: c.zodiac,
    charId: c.id,
    job: c.job,
    level,
    exp: 0,
    brave: c.brave,
    faith: c.faith,
    raw,
    jp: { [c.job]: 100 }, totalJp: { [c.job]: 100 },
    learned: [...learned],
    equip: { ...(c.equip ?? {}) },
    secondary: c.secondary,
    reaction: c.reaction,
    support: c.support,
    movement: c.movement,
    kills: 0,
    look: c.look,
  };
  if (c.monster) {
    const mj = getJob(c.monster);
    u.learned.push(...(mj.monsterSkills ?? []).map(([a]) => a));
  }
  return u;
}

/** raise a unit to `lv`, growing its hidden stats with its current job */
export function setLevel(u: RosterUnit, lv: number) {
  const target = Math.max(1, Math.min(99, lv));
  if (target > u.level) levelRawTo(u.raw, u.level, target, getJob(u.job).growth);
  u.level = target;
}

export function unitJobLevel(u: RosterUnit, jobId: string) {
  let lv = jobLevel(u.totalJp[jobId] ?? 0);
  // the hero's unique squire job counts as Squire for the job tree
  if (jobId === 'squire' && u.totalJp.hero) lv = Math.max(lv, jobLevel(u.totalJp.hero));
  return lv;
}

/** Is a job available to this unit (job tree + gender + uniqueness)? */
export function jobUnlocked(u: RosterUnit, j: JobDef): boolean {
  if (u.gender === 'monster') return j.id === u.job;
  if (j.monster) return false;
  if (j.unique) return j.unique === u.charId;
  if (!j.generic) return false;
  if (j.gender && j.gender !== u.gender) return false;
  for (const r of j.requires ?? []) if (unitJobLevel(u, r.job) < r.level) return false;
  return true;
}

/** Jobs that this unit may switch to */
/** a generic job replaced by the unit's own unique version of it (Rhen's Squire) */
export function supersededJob(u: RosterUnit, j: JobDef): boolean {
  if (!j.generic || !u.charId) return false;
  for (const o of JOBS.values()) if (o.unique === u.charId && o.name === j.name) return true;
  return false;
}

export function availableJobs(u: RosterUnit): JobDef[] {
  const out: JobDef[] = [];
  for (const j of JOBS.values()) if (jobUnlocked(u, j) && !supersededJob(u, j)) out.push(j);
  // named characters may also use generic jobs
  return out;
}

export function learnAbility(u: RosterUnit, jobId: string, abilityId: string): boolean {
  const a = ABILITIES.get(abilityId);
  if (!a || u.learned.includes(abilityId)) return false;
  const have = u.jp[jobId] ?? 0;
  if (have < a.jp) return false;
  u.jp[jobId] = have - a.jp;
  u.learned.push(abilityId);
  return true;
}

export function addJp(u: RosterUnit, jobId: string, amount: number) {
  u.jp[jobId] = Math.min(MAX_JP, (u.jp[jobId] ?? 0) + amount);
  u.totalJp[jobId] = Math.min(99999, (u.totalJp[jobId] ?? 0) + amount);
}

// ---------------------------------------------------------------------------
//  Equipment rules
// ---------------------------------------------------------------------------
export const EQUIP_SUPPORT: Partial<Record<EquipCategory, string>> = {
  armor: 'equipArmor', helmet: 'equipArmor', shield: 'equipShield', sword: 'equipSword',
  knightSword: 'equipSword', katana: 'equipKatana', axe: 'equipAxe', spear: 'equipSpear',
  crossbow: 'equipCrossbow', gun: 'equipGun', magicGun: 'equipGun', knife: 'equipKnife',
};

export function slotFor(it: ItemDef): EquipSlot[] {
  switch (it.kind) {
    case 'weapon': return ['rhand', 'lhand'];
    case 'shield': return ['lhand', 'rhand'];
    case 'head': return ['head'];
    case 'body': return ['body'];
    case 'accessory': return ['accessory'];
    default: return [];
  }
}

export function canEquip(u: RosterUnit, it: ItemDef, slot: EquipSlot, jobId = u.job): boolean {
  if (u.gender === 'monster') return false;
  if (!slotFor(it).includes(slot)) return false;
  if (it.gender && it.gender !== u.gender) return false;
  const j = getJob(jobId);
  const cat = it.cat;
  if (it.kind === 'accessory') return true;
  if (!cat) return false;
  if (it.jobs && !it.jobs.includes(jobId)) return false;
  // women may wear hair ornaments in any job
  if (cat === 'ribbon' && u.gender === 'f') return true;
  if (j.equip.includes(cat)) return (slot !== 'lhand' || it.kind !== 'weapon' || dualWield(u, jobId));
  const sup = EQUIP_SUPPORT[cat];
  if (sup && u.support === sup) return (slot !== 'lhand' || it.kind !== 'weapon' || dualWield(u, jobId));
  return false;
}

export function dualWield(u: RosterUnit, jobId = u.job) {
  const j = getJob(jobId);
  return u.support === 'dualWield' || (j.innate ?? []).includes('dualWield');
}

/** After a job change, drop invalid equipment into the inventory. Returns removed item ids. */
export function validateEquipment(u: RosterUnit): string[] {
  const removed: string[] = [];
  for (const slot of Object.keys(u.equip) as EquipSlot[]) {
    const id = u.equip[slot];
    if (!id) continue;
    const it = ITEMS.get(id);
    if (!it || !canEquip(u, it, slot)) { removed.push(id); delete u.equip[slot]; }
  }
  // two handed weapon blocks off-hand
  const r = u.equip.rhand && ITEMS.get(u.equip.rhand);
  if (r && r.twoHanded && u.equip.lhand) { removed.push(u.equip.lhand); delete u.equip.lhand; }
  return removed;
}

/** Validate the equipped abilities (secondary must be a job skillset with learned actions) */
export function validateAbilities(u: RosterUnit) {
  if (u.secondary === u.job) u.secondary = undefined;
  for (const k of ['reaction', 'support', 'movement'] as const) {
    const id = u[k];
    if (id && (!u.learned.includes(id) || ABILITIES.get(id)?.kind !== k)) u[k] = undefined;
  }
}

export function previewStats(u: RosterUnit, jobId = u.job) {
  return displayStats(u.raw, getJob(jobId));
}
