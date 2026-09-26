// Special-case ability handlers referenced by AbilityDef.special.
import type { AbilityDef } from '../data/types';
import type { Battle, ActionOpts, HitInfo } from './battle';
import type { BattleUnit } from './unit';
import type { Cell } from './grid';
import { MapGrid } from './grid';
import { ABILITIES, ITEMS } from '../data/db';

export interface Special {
  /** return a reason string if the ability can't be used */
  usable?(b: Battle, u: BattleUnit, a: AbilityDef): string | undefined;
  range?(b: Battle, u: BattleUnit, a: AbilityDef): { r: number; min: number; v: number; line: boolean };
  /** restrict which tiles may be targeted */
  targetFilter?(b: Battle, u: BattleUnit, a: AbilityDef, c: Cell): boolean;
  aoeFilter?(b: Battle, u: BattleUnit, a: AbilityDef, c: Cell): boolean;
  /** replaces the normal act flow entirely */
  start?(b: Battle, u: BattleUnit, a: AbilityDef, x: number, z: number, opts: ActionOpts): void;
  /** replaces per-target resolution */
  resolve?(b: Battle, u: BattleUnit, a: AbilityDef, x: number, z: number, targets: BattleUnit[], opts: ActionOpts): void;
  /** effect: {type:'special', id} */
  effect?(b: Battle, c: BattleUnit, t: BattleUnit, a: AbilityDef, h: HitInfo, opts: ActionOpts): void;
}

function learnedMax(u: BattleUnit, prefix: string, def: number) {
  let best = def;
  for (const id of u.roster.learned) {
    const a = ABILITIES.get(id);
    if (a?.special === 'passive' && id.startsWith(prefix)) best = Math.max(best, Number(a.params?.value ?? 0));
  }
  return best;
}

const throwCat = (id: string, cat: string) => {
  const it = ITEMS.get(id);
  if (!it) return false;
  if (cat === 'shuriken') return it.kind === 'throwable' && !!it.look?.model?.includes('shuriken');
  if (cat === 'ball') return it.kind === 'throwable' && !it.look?.model?.includes('shuriken');
  return it.kind === 'weapon' && it.cat === cat;
};

/**
 * Items a unit can throw from a category. The player's units throw from the party
 * inventory; enemies and guests carry their own supply (the cheapest item of the kind).
 */
export function throwables(b: Battle, cat: string, u?: BattleUnit): string[] {
  if (u && !b.usesStock(u)) {
    const own = [...ITEMS.values()].filter((it) => it.price > 0 && throwCat(it.id, cat)).sort((p, q) => p.price - q.price)[0];
    return own && b.stockOf(u, own.id) > 0 ? [own.id] : [];
  }
  const out: string[] = [];
  for (const [id, n] of b.inventory) if (n > 0 && throwCat(id, cat)) out.push(id);
  return out;
}

export const SPECIALS: Record<string, Special> = {
  /** learnable passive component (jump ranges, arithmancer terms) — never shown as a command */
  passive: { usable: () => 'Passive' },

  jump: {
    range: (b, u) => {
      const h = learnedMax(u, 'jumpH', 1);
      const v = learnedMax(u, 'jumpV', 2);
      return { r: h, min: 1, v, line: false };
    },
    start: (b, u, a, x, z) => {
      b.beginJump(u, x, z);
    },
  },

  /** Ninja throw — item chosen by UI/AI (opts.item) */
  throw: {
    usable: (b, u, a) => (throwables(b, String(a.params?.cat ?? 'shuriken'), u).length ? undefined : 'Nothing to throw'),
    range: (b, u) => ({ r: Math.max(1, u.move), min: 1, v: 99, line: false }),
    start: (b, u, a, x, z, opts) => {
      const list = throwables(b, String(a.params?.cat ?? 'shuriken'), u);
      const item = opts.item && list.includes(opts.item) ? opts.item : list.sort((p, q) => (ITEMS.get(q)?.wp ?? 0) - (ITEMS.get(p)?.wp ?? 0))[0];
      if (!item) return;
      b.spendItem(u, item);
      b.resolveAbility(u, a, x, z, { ...opts, item });
    },
  },

  /** Iaido: draws a katana spirit; 1 in 8 chance the blade shatters */
  iaido: {
    start: (b, u, a, x, z, opts) => {
      b.resolveAbility(u, a, x, z, opts);
      const kat = a.requires?.item;
      if (kat && b.usesStock(u) && b.rng.pct(12)) {
        b.takeItem(kat);
        b.emit({ t: 'text', uid: u.uid, text: `${ITEMS.get(kat)?.name ?? 'Katana'} shattered!`, color: '#faa' });
      }
    },
  },

  /** Geomancy: usable only on tiles of the matching terrain */
  geo: {
    targetFilter: (b, u, a, c) => {
      const groups = String(a.params?.groups ?? '').split(',');
      return groups.includes(MapGrid.terrainGroup(c.terrain));
    },
  },

  /** Counter Flood / automatic geomancy: picks the effect from the target tile */
  geoAuto: {
    resolve: (b, u, a, x, z, targets) => {
      const c = b.grid.cell(x, z);
      const group = c ? MapGrid.terrainGroup(c.terrain) : 'soil';
      const sub = [...ABILITIES.values()].find((d) => d.special === 'geo' && String(d.params?.groups ?? '').split(',').includes(group));
      if (!sub) return;
      const hits: HitInfo[] = [];
      for (const t of targets) hits.push(b.hitUnit(u, t, sub, { depth: 1 }, []));
      b.emit({ t: 'hits', src: u.uid, ability: sub.id, hits, vfx: sub.vfx, color: sub.color, x, z });
    },
  },

  /** Arithmancer command: needs at least one attribute + divisor learned */
  calc: {
    usable: (b, u) => {
      const attrs = u.roster.learned.filter((id) => id.startsWith('calcAttr'));
      const divs = u.roster.learned.filter((id) => id.startsWith('calcDiv'));
      return attrs.length && divs.length ? undefined : 'Learn an attribute and a divisor';
    },
    range: () => ({ r: 0, min: 0, v: 99, line: false }),
  },

  /** Holy/unholy random strikes (Heaven Knight / Hell Knight style) */
  randomStrikes: {
    resolve: (b, u, a, x, z, targets) => {
      const n = Number(a.params?.hits ?? 5);
      const hits: HitInfo[] = [];
      const pool = targets.filter((t) => t.team !== u.team);
      for (let i = 0; i < n && pool.length; i++) {
        const t = b.rng.pick(pool);
        if (!t.alive) continue;
        hits.push(b.hitUnit(u, t, a, { depth: 0 }, []));
      }
      b.emit({ t: 'hits', src: u.uid, ability: a.id, hits, vfx: a.vfx, color: a.color, x, z });
    },
  },

  /** Squire "Wish": heal target by an amount equal to damage the caster takes */
  wish: {
    effect: (b, c, t, a, h) => {
      const amt = Math.max(1, Math.floor(c.maxHp / 5));
      const d = b.damage(c, amt);
      b.heal(t, d * 2, undefined, false);
      h.heal = (h.heal ?? 0) + d * 2;
    },
  },

  /** Chemist "Elixir": full HP and MP */
  fullRestore: {
    effect: (b, c, t, a, h) => {
      if (!t.alive) return;
      const hp = t.maxHp - t.hp, mp = t.maxMp - t.mp;
      b.heal(t, hp, undefined, false); b.healMp(t, mp);
      h.heal = hp; h.mpHeal = mp;
    },
  },

  /** Demi-like: percentage of current HP */
  gravity: {
    effect: (b, c, t, a, h) => {
      const p = Number(a.params?.pct ?? 0.25);
      if (t.boss) { h.text = [...(h.text ?? []), 'Resisted']; return; }
      const d = b.damage(t, Math.max(1, Math.floor(t.maxHp * p)));
      h.dmg = (h.dmg ?? 0) + d;
    },
  },

  /** Death / instant KO — bosses immune */
  instantKo: {
    effect: (b, c, t, a, h) => {
      if (t.boss || t.immune.has('ko')) { h.text = [...(h.text ?? []), 'Resisted']; return; }
      if (t.has('undead')) { b.heal(t, t.maxHp, undefined, false); h.heal = t.maxHp; return; }
      b.knockOut(t); h.ko = true;
    },
  },

  /** swap HP ratios / balance — the "Balance" art */
  balance: {
    effect: (b, c, t, a, h) => {
      const d = c.maxHp - c.hp;
      const real = b.damage(t, Math.min(999, d));
      h.dmg = (h.dmg ?? 0) + real;
    },
  },

  /** Mediator "Solution"/"Negotiate" style gil theft */
  gilSteal: {
    effect: (b, c, t, a, h) => { b.doSteal(c, t, 'gil', h); },
  },

  /** Teleport caster to the target tile */
  blink: {
    start: (b, u, a, x, z) => {
      const c = b.grid.cell(x, z);
      if (!c || !c.standable || b.unitAt(x, z)) return;
      b.emit({ t: 'act', uid: u.uid, ability: a.id, name: a.name, x, z, targets: [], anim: a.anim, vfx: a.vfx });
      b.emit({ t: 'move', uid: u.uid, path: [[u.x, u.z], [x, z]], teleport: true });
      u.x = x; u.z = z;
    },
  },

  /** Ultima-like: damage everyone in area, including allies */
  none: {},
};
