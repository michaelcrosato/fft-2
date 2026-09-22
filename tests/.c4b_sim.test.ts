import { writeFileSync } from 'fs';
import { describe, it, expect } from 'vitest';
import { BATTLES, mapDef } from '../src/data/db';
import { newGame } from '../src/game/state';
import { setupBattle, autoEquip, autoAbilities } from '../src/game/setup';
import { planTurn } from '../src/battle/ai';
import { MapGrid } from '../src/battle/grid';
import { Rng } from '../src/core/rng';
import type { Battle } from '../src/battle/battle';
function run(b: Battle, maxSteps = 4000) {
  let scripts = 0;
  for (let i = 0; i < maxSteps && !b.result; i++) {
    const { unit, events } = b.advance() as any;
    for (const e of events ?? []) if (e.t === 'script') scripts++;
    if (!unit) continue;
    const plan = planTurn(b, unit);
    let evs: any[] = [];
    if (plan.actFirst && plan.act) { evs.push(...(b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts) as any ?? [])); if (plan.move && !b.result) b.doMove(unit, plan.move[0], plan.move[1]); }
    else { if (plan.move) b.doMove(unit, plan.move[0], plan.move[1]); if (plan.act && !b.result) evs.push(...(b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts) as any ?? [])); }
    if (!b.result) evs.push(...(b.endTurn(unit, plan.facing) as any ?? []));
    // emulate the presentation: run reveal / retreat / battleEnd from fired scripts
    for (const e of evs) if (e?.t === 'script') {
      scripts++;
      for (const c of b.def.events![e.index].script) {
        if (c[0] === 'reveal') b.scriptReveal(c[1]);
        if (c[0] === 'retreat') b.scriptRetreat(c[1]);
        if (c[0] === 'battleEnd') (b as any).forced = c[1];
      }
      b.checkEnd();
    }
  }
  return `${b.result ?? 'timeout'} (scripts ${scripts})`;
}
describe('ch4b battles', () => {
  it('set up and resolve', () => {
    const ids = ['b_ygress', 'b_murondel1', 'b_murondel2', 'b_murondel3', 'b_orvelle_b4', 'b_orvelle_b5', 'b_necropolis', 'b_lostsanctum', 'b_astaroth', 'b_altessa'];
    const out: string[] = [];
    for (const id of ids) {
      const def = BATTLES.get(id)!;
      const s = newGame('Rhen', [4, 12]); s.chapter = 4; s.tier = 8;
      const rng = new Rng(7);
      for (const u of s.roster) { u.level = 40; autoEquip(u, s.tier, rng); if (!u.charId) autoAbilities(u, rng, {}); }
      const grid = new MapGrid(mapDef(def.map));
      const cells = (def.deploy ?? grid.def.deploy).filter(([x, z]) => grid.cell(x, z)?.standable && !def.units.some((u) => u.at[0] === x && u.at[1] === z));
      const party = s.roster.slice(0, Math.min(def.maxDeploy ?? 5, cells.length)).map((unit, i) => ({ unit, x: cells[i][0], z: cells[i][1] }));
      try {
        const { battle } = setupBattle(s, def, party, { seed: 11 });
        battle.heroSid = 'rhen';
        const hidden = battle.units.filter((u) => u.hidden).map((u) => u.sid);
        out.push(`${id}: ${run(battle)} hidden=[${hidden}] units=${battle.units.length}`);
      } catch (e) { out.push(`${id}: EXCEPTION ${(e as Error).message} ${(e as Error).stack?.split('\n').slice(1, 3).join(' ')}`); }
    }
    writeFileSync('/tmp/claude-1000/-home-micha-dev-cco55-t1/02e3d6ce-fc4a-4165-b907-2ec752063b1c/scratchpad/sim.txt', out.join('\n'));
    expect(out.filter((r) => r.includes('EXCEPTION'))).toHaveLength(0);
  }, 300000);
});
