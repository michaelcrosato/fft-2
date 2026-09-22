// Simulates every authored battle AI-vs-AI with a party appropriate to its
// chapter, to catch content/engine crashes and flag unwinnable balance.
import { describe, it, expect } from 'vitest';
import { BATTLES, STORY, SIDE, mapDef } from '../src/data/db';
import { newGame, partyLevel } from '../src/game/state';
import { setupBattle, autoEquip, autoAbilities } from '../src/game/setup';
import { planTurn } from '../src/battle/ai';
import { MapGrid } from '../src/battle/grid';
import { Rng } from '../src/core/rng';
import { joinCharacter } from '../src/game/state';
import type { Battle } from '../src/battle/battle';

function run(b: Battle, maxSteps = 6000) {
  for (let i = 0; i < maxSteps && !b.result; i++) {
    const { unit } = b.advance();
    if (!unit) continue;
    const plan = planTurn(b, unit);
    if (plan.actFirst && plan.act) { b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts); if (plan.move && !b.result) b.doMove(unit, plan.move[0], plan.move[1]); }
    else { if (plan.move) b.doMove(unit, plan.move[0], plan.move[1]); if (plan.act && !b.result) b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts); }
    if (!b.result) b.endTurn(unit, plan.facing);
  }
  return b.result ?? 'timeout';
}

const LEVEL_BY_CHAPTER = [2, 5, 14, 25, 38];

describe('campaign battles', () => {
  const steps = [...STORY, ...SIDE].filter((s) => s.battle);
  const results: string[] = [];
  it('every story & side battle sets up and resolves', () => {
    for (const st of steps) {
      const def = BATTLES.get(st.battle!);
      expect(def, `battle ${st.battle}`).toBeTruthy();
      const chapter = (st as any).chapter ?? (st as any).chapterMin ?? 4;
      const s = newGame('Rhen', [4, 12]);
      s.chapter = chapter;
      s.tier = Math.min(8, 1 + chapter * 2);
      const lv = LEVEL_BY_CHAPTER[Math.min(4, chapter)];
      const rng = new Rng(7);
      for (const u of s.roster) { u.level = lv; autoEquip(u, s.tier, rng); if (!u.charId) autoAbilities(u, rng, {}); }
      const grid = new MapGrid(mapDef(def!.map));
      const cells = (def!.deploy ?? grid.def.deploy).filter(([x, z]) => grid.cell(x, z)?.standable && !def!.units.some((u) => u.at[0] === x && u.at[1] === z));
      const party = s.roster.slice(0, Math.min(def!.maxDeploy ?? 5, cells.length)).map((unit, i) => ({ unit, x: cells[i][0], z: cells[i][1] }));
      let res = 'error';
      try {
        const { battle } = setupBattle(s, def!, party, { seed: 11 });
        battle.heroSid = 'rhen';
        res = run(battle);
      } catch (e) {
        res = 'EXCEPTION ' + (e as Error).message + ' ' + (e as Error).stack?.split('\n').slice(1, 3).join(' ');
      }
      results.push(`${st.battle}: ${res}`);
    }
    console.log(results.join('\n'));
    const crashes = results.filter((r) => r.includes('EXCEPTION'));
    expect(crashes, crashes.join('\n')).toHaveLength(0);
  }, 600000);
});
