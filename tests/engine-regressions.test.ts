// Regression tests for battle-engine bugs found in the 2026-09 audit.
import { describe, it, expect } from 'vitest';
import { Battle } from '../src/battle/battle';
import { MapGrid } from '../src/battle/grid';
import { BattleUnit } from '../src/battle/unit';
import { planTurn } from '../src/battle/ai';
import { createGeneric } from '../src/game/roster';
import { Rng } from '../src/core/rng';
import { ABILITIES, BATTLES, mapDef } from '../src/data/db';
import type { BattleDef } from '../src/data/types';
import { newGame } from '../src/game/state';
import { setupBattle, applyResults } from '../src/game/setup';

const rng = new Rng(42);
function mk(team: number, x: number, z: number, job = 'squire', extra: (r: ReturnType<typeof createGeneric>) => void = () => {}) {
  const r = createGeneric({ gender: 'm', level: 20, job, rng });
  r.equip = { rhand: 'broadsword', head: 'leatherCap', body: 'clothes' };
  extra(r);
  const u = new BattleUnit(r, team, team === 0);
  u.x = x; u.z = z; u.facing = team === 0 ? 'N' : 'S';
  return u;
}
function battle(units: BattleUnit[], def: Partial<BattleDef> = {}, seed = 7, inventory = new Map([['potion', 5]])) {
  const d = { id: 't', name: 't', map: 'training', units: [], victory: { type: 'defeatAll' }, ...def } as BattleDef;
  return new Battle({ def: d, grid: new MapGrid(mapDef(d.map)), units, inventory, seed });
}
const A = (id: string) => ABILITIES.get(id)!;
const tickStatuses = (b: Battle, n: number) => { for (let i = 0; i < n; i++) (b as unknown as { statusTick(): void }).statusTick(); };

describe('engine regressions', () => {
  it('charm wears off and the unit returns to its own side', () => {
    const p = mk(0, 3, 8), foe = mk(1, 9, 0);
    const b = battle([p, foe]);
    b.addStatus(p, 'charm');
    expect(p.team).toBe(1);
    tickStatuses(b, 60);
    expect(p.has('charm')).toBe(false);
    expect(p.team).toBe(0);
  });

  it('bosses keep their immunities through setup, difficulty scaling and stolen gear', () => {
    const s = newGame('Rhen', [4, 12]);
    let bosses = 0;
    for (const def of BATTLES.values()) {
      const { battle: b } = setupBattle(s, def, [], { seed: 3 });
      for (const u of b.units.filter((x) => x.boss)) {
        bosses++;
        expect(u.immune.has('stop'), `${def.id}/${u.sid}`).toBe(true);
        expect(u.immune.has('charm'), `${def.id}/${u.sid}`).toBe(true);
        u.recompute(false); // what a steal/break does
        expect(u.immune.has('doom'), `${def.id}/${u.sid} after recompute`).toBe(true);
      }
    }
    expect(bosses).toBeGreaterThan(10);
  });

  it('a performing bard still gets turns', () => {
    const bard = mk(0, 3, 8, 'bard', (r) => { r.learned.push('hymnOfLife'); r.equip = {}; });
    const ally = mk(0, 4, 8), foe = mk(1, 9, 0);
    const b = battle([bard, ally, foe]);
    let bardTurns = 0, started = false;
    for (let i = 0; i < 3000 && !b.result && b.tick < 1500; i++) {
      const { unit } = b.advance();
      if (!unit) continue;
      if (unit === bard) {
        bardTurns++;
        if (!started && ABILITIES.has('hymnOfLife')) { b.doAction(bard, A('hymnOfLife'), bard.x, bard.z); started = true; }
      }
      b.endTurn(unit);
    }
    expect(bardTurns).toBeGreaterThan(5);
  });

  it('enemies use their own items, not the party inventory', () => {
    const inv = new Map([['potion', 3]]);
    const p = mk(0, 3, 8), foe = mk(1, 3, 1, 'chemist', (r) => r.learned.push('usePotion'));
    const b = battle([p, foe], {}, 7, inv);
    foe.hp = Math.floor(foe.maxHp / 3);
    expect(b.unusableReason(foe, A('usePotion'))).toBeUndefined();
    b.doAction(foe, A('usePotion'), foe.x, foe.z);
    expect(inv.get('potion')).toBe(3);
    // the player's units still spend from it
    b.doAction(p, A('usePotion'), p.x, p.z);
    expect(inv.get('potion')).toBe(2);
  });

  it('easy difficulty lowers enemy HP; normal is unchanged', () => {
    const s = newGame('Rhen', [4, 12]);
    const def = BATTLES.get('b_dorhaven') ?? [...BATTLES.values()][3];
    const hp = (difficulty: string) => {
      const { battle: b } = setupBattle(s, def, [], { seed: 5, difficulty } as never);
      const u = b.units.find((x) => x.team !== 0 && !x.boss && !x.roster.charId)!;
      return { hp: u.maxHp, mult: u.hpMult };
    };
    const easy = hp('easy'), normal = hp('normal');
    expect(normal.mult).toBe(1);
    expect(easy.mult).toBeLessThan(1);
    expect(easy.hp).toBeLessThan(normal.hp);
  });

  it('a unit KO\'d during its own action cannot move or act again', () => {
    const p = mk(0, 3, 8), foe = mk(1, 9, 0);
    const b = battle([p, foe]);
    b.knockOut(p);
    expect(p.canMove).toBe(false);
    expect(p.canAct).toBe(false);
    expect(b.doMove(p, 3, 7)).toEqual([]);
    expect(b.doAction(p, A('attack'), 3, 7)).toEqual([]);
    expect([p.x, p.z]).toEqual([3, 8]);
  });

  it('a confused unit only swings at units within weapon reach', () => {
    let swings = 0;
    for (let seed = 1; seed < 80; seed++) {
      const c = mk(0, 3, 8), near = mk(1, 3, 7), far = mk(1, 6, 8), far2 = mk(0, 3, 5);
      const b = battle([c, near, far, far2], {}, seed);
      b.addStatus(c, 'confuse');
      const plan = planTurn(b, c);
      if (!plan.act) continue;
      swings++;
      const reach = b.targetCells(c, A('attack')).map((cc) => `${cc.x},${cc.z}`);
      expect(reach).toContain(`${plan.act.x},${plan.act.z}`);
    }
    expect(swings).toBeGreaterThan(5);
  });

  it('an invisible attacker gets its accuracy bonus', () => {
    let hits = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const p = mk(0, 3, 8), foe = mk(1, 3, 7);
      foe.cev = 60; foe.facing = 'S';
      const b = battle([p, foe], {}, seed);
      p.statuses.set('invisible', 0);
      const ev = b.doAction(p, A('attack'), 3, 7);
      const h = ev.find((e) => e.t === 'hits') as Extract<(typeof ev)[number], { t: 'hits' }> | undefined;
      if (h && !h.hits[0].miss) hits++;
      expect(p.has('invisible')).toBe(false);
    }
    expect(hits).toBe(60);
  });

  it('Two Hands doubles Attack damage', () => {
    const a = mk(0, 3, 8, 'knight', (r) => { r.equip = { rhand: 'broadsword' }; });
    const b2 = mk(0, 4, 8, 'knight', (r) => { r.equip = { rhand: 'broadsword' }; r.support = 'twoHands'; r.learned.push('twoHands'); });
    b2.roster.raw = a.roster.raw; b2.roster.brave = a.roster.brave; b2.roster.zodiac = a.roster.zodiac; a.recompute(true); b2.recompute(true);
    const foe = mk(1, 3, 7);
    foe.hpMult = 20; foe.recompute(true); // previews cap damage at the target's HP
    const b = battle([a, b2, foe]);
    expect(b2.hasSupport('twoHands')).toBe(true);
    const one = b.previewOn(a, foe, A('attack')).dmg!, two = b.previewOn(b2, foe, A('attack')).dmg!;
    expect(two).toBeGreaterThan(one * 1.6);
  });

  it('a recruit who crystallizes later in the battle does not join', () => {
    const s = newGame('Rhen', [4, 12]);
    const p = mk(0, 3, 8), foe = mk(1, 3, 7);
    const b = battle([p, foe]);
    foe.team = 0; foe.baseTeam = 0; foe.controlled = true; b.invited.push(foe);
    foe.statuses.set('crystal', 0);
    b.result = 'victory';
    applyResults(s, b, { battle: b, grid: b.grid, temp: [] });
    expect(s.roster.includes(foe.roster)).toBe(false);
  });

  it('losing a Reflect Ring to a thief removes its Reflect', () => {
    const thief = mk(1, 3, 7), p = mk(0, 3, 8, 'squire', (r) => { r.equip = { ...r.equip, accessory: 'reflectRing' }; });
    const b = battle([p, thief]);
    expect(p.has('reflect')).toBe(true);
    const h = { uid: p.uid } as never;
    (b as unknown as { doSteal(c: BattleUnit, t: BattleUnit, slot: string, h: unknown): void }).doSteal(thief, p, 'accessory', h);
    expect(p.roster.equip.accessory).toBeUndefined();
    expect(p.has('reflect')).toBe(false);
  });

  it('revealed reinforcements appear on the nearest free tile', () => {
    const block = mk(0, 5, 5), hidden = mk(1, 5, 5), foe = mk(1, 0, 0);
    hidden.hidden = true; hidden.sid = 'reinf';
    const b = battle([block, hidden, foe]);
    b.scriptReveal('reinf');
    expect(Math.abs(hidden.x - 5) + Math.abs(hidden.z - 5)).toBe(1);
  });
});
