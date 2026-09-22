// Shared helpers for the enemy / boss job files in this folder.
// (No `jobs`/`abilities` exports here — this module only provides building blocks.)
import type { FormulaCtx, JobLook, Palette, StatusId } from '../../types';

/** Every harmful status in the engine (see src/battle/status.ts). */
export const BAD_STATUSES: StatusId[] = [
  'undead', 'petrify', 'confuse', 'blind', 'silence', 'oil', 'frog', 'chicken', 'poison', 'slow',
  'stop', 'sleep', 'immobilize', 'disable', 'berserk', 'charm', 'atheist', 'doom', 'vampire',
];

/** Statuses no Umbral Lord can ever be afflicted with, whatever the source says. */
export const LORD_IMMUNE_BASE: StatusId[] = [
  'ko', 'petrify', 'stop', 'charm', 'confuse', 'doom', 'frog', 'chicken', 'sleep', 'berserk',
];

/**
 * Immunity list for an Umbral Lord: everything harmful (plus KO) except the
 * statuses the source lists it as vulnerable to. The base set above always stays.
 */
export function lordImmune(vulnerable: StatusId[]): StatusId[] {
  const out = new Set<StatusId>(['ko', ...BAD_STATUSES]);
  for (const v of vulnerable) if (!LORD_IMMUNE_BASE.includes(v)) out.delete(v);
  return [...out];
}

/** The eight afflictions of the "grand cross" family of Umbral spells. */
export const CROSS_STATUSES: StatusId[] = ['petrify', 'blind', 'confuse', 'berserk', 'frog', 'poison', 'sleep', 'slow'];

/** Placeholder humanoid look for monster jobs (the monster model uses `monster` instead). */
export function lordLook(palette: Palette): JobLook {
  return { headgear: 'none', torso: 'robe', legs: 'robe', cape: 'none', palette };
}

/** Equipped weapon power with a floor, so blade arts still bite if a spawn forgot the weapon. */
export const wpOr = (x: FormulaCtx, min: number) => Math.max(min, x.wp);

/** PA × WP (weapon floor 5) — the classic sword-art formula. */
export const paWp = (mult = 1) => (x: FormulaCtx) => Math.floor(x.c.pa * wpOr(x, 5) * mult);

/** Gun WP used by gun arts: floor 8, capped at 14 so the relic guns (WP 20+) don't explode the WP² curve. */
export const gunWp = (x: FormulaCtx) => Math.min(14, Math.max(8, x.wp));

/** Gun-art power: WP² (WP clamped 8..14) with an optional multiplier. */
export const gunPow = (mult = 1) => (x: FormulaCtx) => { const w = gunWp(x); return Math.floor(w * w * mult); };

/**
 * Spell-gun volley: the chamber fires a lesser (70%), middling (20%) or greater (10%)
 * charge of the element. Faith is ignored, like the relic guns of the Lost Age.
 */
export const spellGun = (mult = 1) => (x: FormulaCtx) => {
  const w = gunWp(x);
  const roll = x.rng.int(1, 10);
  const tier = roll <= 7 ? 1 : roll <= 9 ? 1.4 : 2;
  return Math.floor(w * w * tier * mult);
};
