import { describe, it, expect } from 'vitest';
import { Battle } from '../src/battle/battle';
import { MapGrid } from '../src/battle/grid';
import { BattleUnit } from '../src/battle/unit';
import { planTurn } from '../src/battle/ai';
import { createGeneric } from '../src/game/roster';
import { Rng } from '../src/core/rng';
import { mapDef } from '../src/data/db';

function runAuto(b: Battle, maxSteps = 4000) {
  for (let i = 0; i < maxSteps && !b.result; i++) {
    const { unit } = b.advance();
    if (!unit) continue;
    const plan = planTurn(b, unit);
    if (plan.actFirst && plan.act) {
      b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts);
      if (plan.move) b.doMove(unit, plan.move[0], plan.move[1]);
    } else {
      if (plan.move) b.doMove(unit, plan.move[0], plan.move[1]);
      if (plan.act && !b.result) b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts);
    }
    if (!b.result) b.endTurn(unit, plan.facing);
  }
  return b.result;
}

describe('battle engine', () => {
  it('parses maps and computes move ranges', () => {
    const g = new MapGrid(mapDef('training'));
    expect(g.w).toBe(10);
    expect(g.d).toBe(10);
    const r = g.moveRange(4, 8, { move: 4, jump: 3, occupant: () => 0 });
    expect(r.size).toBeGreaterThan(10);
  });

  it('runs an AI vs AI skirmish to completion', () => {
    const rng = new Rng(42);
    const mk = (team: number, x: number, z: number, job = 'squire') => {
      const r = createGeneric({ gender: rng.pct(50) ? 'm' : 'f', level: 3, job, rng });
      r.equip = { rhand: 'broadsword', head: 'leatherCap', body: 'clothes' };
      r.learned.push('rush', 'stoneToss', 'usePotion');
      const u = new BattleUnit(r, team, team === 0);
      u.x = x; u.z = z; u.facing = team === 0 ? 'N' : 'S';
      return u;
    };
    const units = [mk(0, 3, 8), mk(0, 4, 8), mk(0, 5, 9, 'chemist'), mk(1, 3, 1), mk(1, 5, 1), mk(1, 6, 2, 'chemist')];
    const inv = new Map<string, number>([['potion', 5]]);
    const b = new Battle({ def: { id: 't', name: 't', map: 'training', units: [], victory: { type: 'defeatAll' } }, grid: new MapGrid(mapDef('training')), units, inventory: inv, seed: 7 });
    const res = runAuto(b);
    expect(res === 'victory' || res === 'defeat').toBe(true);
    const totalJp = units.filter((u) => u.team === 0).reduce((s, u) => s + u.jpGained, 0);
    expect(totalJp).toBeGreaterThan(0);
  });
});
