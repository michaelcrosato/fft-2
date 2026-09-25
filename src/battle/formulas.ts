// Formula helpers used by ability data. Every helper returns a function of FormulaCtx.
// The engine applies zodiac compatibility, elemental affinity, Protect/Shell,
// Attack Up/Defense Up and similar modifiers *after* these base values.
import type { FormulaCtx, ItemDef, WeaponType } from '../data/types';
import type { BattleUnit } from './unit';
import type { Rng } from '../core/rng';

type Fx = (x: FormulaCtx) => number;

/** Base physical damage for a weapon (FFT-style weapon formulas). */
export function weaponDamage(c: BattleUnit, w: ItemDef | null, rng: Rng | null, opts: { avg?: boolean; wp?: number } = {}): number {
  const type: WeaponType = (w?.cat as WeaponType) ?? 'fist';
  // effective weapon power (e.g. doubled by Two Hands) when the caller knows it
  const wp = opts.wp ?? w?.wp ?? 0;
  const pa = c.pa;
  const br = c.brave;
  const rnd = (n: number) => (opts.avg || !rng ? Math.max(1, Math.round((n + 1) / 2)) : rng.int(1, Math.max(1, n)));
  switch (type) {
    case 'fist': {
      let d = Math.floor((pa * br) / 100) * pa;
      if (c.hasSupport('martialArts')) d = Math.floor(d * 1.5);
      return d;
    }
    case 'knife': case 'ninjaBlade': case 'bow':
      return Math.floor((pa + c.speed) / 2) * wp;
    case 'sword': case 'rod': case 'crossbow': case 'spear':
      return pa * wp;
    case 'knightSword': case 'katana':
      return Math.floor((pa * br) / 100) * wp;
    case 'axe': case 'flail': case 'bag':
      return rnd(pa) * wp;
    case 'staff': case 'pole':
      return c.ma * wp;
    case 'gun':
      return wp * wp;
    case 'magicGun':
      // elemental spell-guns: scaled by the wielder's faith like a spell
      return Math.floor(wp * wp * 0.55 * (0.5 + c.effFaith / 100) * (0.8 + (rng ? rng.next() * 0.4 : 0.2)));
    case 'instrument': case 'book': case 'cloth':
      return Math.floor((pa + c.ma) / 2) * wp;
  }
  return pa * wp;
}

export const F = {
  /** attack with the equipped weapon (or thrown item's WP via x.wp) */
  weapon: (mult = 1): Fx => (x) => Math.floor(weaponDamage(x.c, x.c.weapon, x.rng, { wp: x.c.weapon ? x.wp : undefined }) * mult),
  /** PA * WP style for skills that use weapon power */
  paWp: (mult = 1): Fx => (x) => Math.floor(x.c.pa * x.wp * mult),
  /** (PA + k) * WP — archer's Aim */
  aim: (k: number): Fx => (x) => {
    const w = x.c.weapon; const t = w?.cat;
    const base = t === 'bow' || t === 'knife' || t === 'ninjaBlade' ? Math.floor((x.c.pa + x.c.speed) / 2) : x.c.pa;
    return (base + k) * Math.max(1, x.wp);
  },
  /** Speed * WP for thrown items */
  thrown: (): Fx => (x) => x.c.speed * x.wp,
  /** faith-scaled magic: MA * Q * Fc * Ft */
  magic: (q: number): Fx => (x) => Math.floor((x.c.ma * q * x.c.effFaith * x.t.effFaith) / 10000),
  /** magic ignoring faith */
  magicNoFaith: (q: number): Fx => (x) => x.c.ma * q,
  /** PA scaled (monk arts) */
  pa: (mult: number): Fx => (x) => Math.floor(x.c.pa * mult),
  /** PA * (PA/2) — martial arts */
  paHalfPa: (mult = 1): Fx => (x) => Math.floor(x.c.pa * Math.floor(x.c.pa / 2) * mult),
  /** (PA + MA)/2 * k */
  paMa: (k: number): Fx => (x) => Math.floor(((x.c.pa + x.c.ma) / 2) * k),
  /** MA * k */
  ma: (k: number): Fx => (x) => Math.floor(x.c.ma * k),
  fixed: (n: number): Fx => () => n,
  pctMaxHp: (p: number): Fx => (x) => Math.max(1, Math.floor(x.t.maxHp * p)),
  pctMaxMp: (p: number): Fx => (x) => Math.max(0, Math.floor(x.t.maxMp * p)),
  pctCurHp: (p: number): Fx => (x) => Math.max(1, Math.floor(x.t.hp * p)),
  /** damage = caster missing HP (e.g. sacrificial skills) */
  casterMissingHp: (): Fx => (x) => x.c.maxHp - x.c.hp,
  /** random range */
  rand: (a: number, b: number): Fx => (x) => x.rng.int(a, b),
  // ---- hit chance helpers (percent) ----
  hitMa: (base: number): Fx => (x) => Math.floor(((x.c.ma + base) * x.c.effFaith * x.t.effFaith) / 10000),
  hitMaNoFaith: (base: number): Fx => (x) => x.c.ma + base,
  hitPa: (base: number): Fx => (x) => x.c.pa + base,
  hitPaWp: (base: number): Fx => (x) => x.c.pa + x.wp + base,
  hitSp: (base: number): Fx => (x) => x.c.speed + base,
  hitPaMa: (base: number): Fx => (x) => Math.floor((x.c.pa + x.c.ma) / 2) + base,
  /** Orator talk skills: (MA + X) scaled by caster brave or faith */
  hitTalk: (base: number): Fx => (x) => x.c.ma + base,
  fixedHit: (p: number): Fx => () => p,
};

export function clampPct(p: number) { return Math.max(0, Math.min(100, Math.floor(p))); }
