// Every moment is fair: a sure way to clear it in the opening turn (it clears on every seed, so no hit
// is left to chance), and standing still does not clear it. The ward of a moment to defend outlives
// the time when both sides play by the AI.
import { describe, expect, it } from 'vitest';
import { MOMENTS, type MomentDef } from '../src/data/battles/moments';
import { presetMoment } from '../src/game/trial';
import { planTurn } from '../src/battle/ai';
import type { Battle } from '../src/battle/battle';
import type { BattleUnit } from '../src/battle/unit';

const SEEDS = [11, 222, 3333, 44444, 555555, 6666666];

/** The moment at its opening turn: the battle and the unit about to act. */
function open(m: MomentDef, seed: number): { b: Battle; u: BattleUnit } {
  const { setup } = presetMoment(m, seed);
  const b = setup.battle;
  for (let i = 0; i < 50; i++) {
    const { unit } = b.advance();
    if (unit) return { b, u: unit };
  }
  throw new Error(`${m.id}: no opening turn`);
}

function cleared(m: MomentDef, b: Battle, u: BattleUnit) {
  if (m.kind === 'defeat') { const t = b.bySid(m.target!); return !t || !t.active || t.gone; }
  return (m.cells ?? []).some(([x, z]) => u.x === x && u.z === z);
}

type Plan = { move?: [number, number]; act?: { ability: string; x: number; z: number } };
const label = (p: Plan) => `${p.move ? `move ${p.move}` : 'stay'}${p.act ? `, ${p.act.ability} at ${p.act.x},${p.act.z}` : ''}`;

/** Every move, and every action from there, that the opening unit can take. */
function plans(m: MomentDef): Plan[] {
  const { b, u } = open(m, SEEDS[0]);
  const out: Plan[] = [{}];
  const cells: Array<[number, number] | undefined> = [undefined, ...b.moveRange(u).map((c) => [c.x, c.z] as [number, number])];
  for (const cell of cells) {
    if (cell) out.push({ move: cell });
    if (m.kind !== 'defeat') continue;
    const from = cell ?? [u.x, u.z];
    for (const g of b.commandGroups(u)) for (const a of g.abilities) {
      if (b.unusableReason(u, a)) continue;
      for (const c of b.targetCells(u, a, from[0], from[1])) out.push({ move: cell, act: { ability: a.id, x: c.x, z: c.z } });
    }
  }
  return out;
}

function tryPlan(m: MomentDef, seed: number, p: Plan): boolean {
  const { b, u } = open(m, seed);
  if (p.move) b.doMove(u, p.move[0], p.move[1]);
  if (p.act) {
    const a = b.commandGroups(u).flatMap((g) => g.abilities).find((x) => x.id === p.act!.ability)!;
    b.doAction(u, a, p.act.x, p.act.z);
  }
  return cleared(m, b, u);
}

describe('moments', () => {
  it('have unique ids and tags that read', () => {
    expect(MOMENTS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(MOMENTS.map((m) => m.id)).size).toBe(MOMENTS.length);
    for (const m of MOMENTS) {
      expect(m.id).toMatch(/^[a-z0-9-]{1,24}$/);
      expect(m.seconds).toBeGreaterThanOrEqual(3);
      expect(m.seconds).toBeLessThanOrEqual(30);
      expect(m.goal.length).toBeLessThanOrEqual(60);
    }
  });

  for (const m of MOMENTS.filter((x) => x.kind !== 'defend')) {
    it(`${m.id}: opens on its unit, has a sure way to clear it, and is not cleared standing still`, () => {
      for (const seed of SEEDS) expect(open(m, seed).u.sid, `seed ${seed}`).toBe(m.first);
      expect(tryPlan(m, SEEDS[0], {})).toBe(false);
      const all = plans(m);
      const sure = all.filter((p) => SEEDS.every((s) => tryPlan(m, s, p)));
      const lucky = all.filter((p) => !sure.includes(p) && SEEDS.some((s) => tryPlan(m, s, p)));
      console.log(`${m.id}: ${all.length} plans, ${sure.length} sure (${sure.slice(0, 3).map(label).join('; ')}), ${lucky.length} lucky`);
      expect(sure.length).toBeGreaterThan(0);
      // a puzzle, not a gimme: most of what the unit can do does not clear it
      expect(sure.length).toBeLessThan(all.length / 2);
    });
  }

  for (const m of MOMENTS.filter((x) => x.kind === 'defend')) {
    it(`${m.id}: the ward can be kept standing`, () => {
      let kept = 0;
      for (const seed of SEEDS) {
        const { b } = open(m, seed);
        // a round of moments lasts seconds: about eight turns at the session's battle speed
        let turns = 0;
        let unit: BattleUnit | null = open(m, seed).u;
        const bb = b; void bb;
        const { b: run, u: first } = open(m, seed);
        unit = first;
        while (turns < 8 && !run.result) {
          if (unit) {
            turns++;
            const plan = planTurn(run, unit);
            if (plan.move) run.doMove(unit, plan.move[0], plan.move[1]);
            if (plan.act && !run.result) run.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts);
            if (!run.result) run.endTurn(unit, plan.facing);
          }
          unit = run.result ? null : run.advance().unit;
        }
        if (run.result !== 'defeat') kept++;
      }
      console.log(`${m.id}: ward kept in ${kept} of ${SEEDS.length}`);
      expect(kept).toBeGreaterThanOrEqual(SEEDS.length / 2);
    });
  }
});
