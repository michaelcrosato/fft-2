// Simulate all story & side battles AI-vs-AI; prints one line per battle.
// Run: npx vite-node tools/simcampaign.ts [filter]
import { BATTLES, STORY, SIDE, mapDef } from '../src/data/db';
import { newGame } from '../src/game/state';
import { setupBattle, autoEquip, autoAbilities } from '../src/game/setup';
import { planTurn } from '../src/battle/ai';
import { MapGrid } from '../src/battle/grid';
import { Rng } from '../src/core/rng';
import { setLevel } from '../src/game/roster';
import { joinCharacter } from '../src/game/state';
import type { Battle } from '../src/battle/battle';
import { writeSync } from 'node:fs';

const LEVEL_BY_CHAPTER = [3, 6, 15, 26, 38];
const filter = process.argv[2];
function run(b: Battle) {
  let turns = 0;
  const t0 = performance.now();
  for (let i = 0; i < 4000 && !b.result && turns < 400; i++) {
    if (performance.now() - t0 > 30000) { writeSync(1, '   (time budget exceeded)\n'); break; }
    const { unit } = b.advance();
    if (!unit) continue;
    turns++;
    if (process.env.TRACE) writeSync(1, `   turn ${turns} ${unit.name} ${unit.job.id}\n`);
    const plan = planTurn(b, unit);
    if (plan.actFirst && plan.act) { b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts); if (plan.move && !b.result) b.doMove(unit, plan.move[0], plan.move[1]); }
    else { if (plan.move) b.doMove(unit, plan.move[0], plan.move[1]); if (plan.act && !b.result) b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts); }
    if (!b.result) b.endTurn(unit, plan.facing);
  }
  return { res: b.result ?? 'timeout', turns };
}
const steps = [...STORY, ...SIDE].filter((s) => s.battle && (!filter || s.battle.includes(filter)));
let wins = 0, losses = 0, stalls = 0, errs = 0;
for (const st of steps) {
  const def = BATTLES.get(st.battle!);
  if (!def) { console.log(`${st.battle}: MISSING`); errs++; continue; }
  const chapter = (st as any).chapter ?? (st as any).chapterMin ?? 4;
  const s = newGame('Rhen', [4, 12]);
  s.chapter = chapter; s.tier = Math.min(8, 1 + chapter * 2);
  const comp = chapter >= 2 ? ['adria', 'mattis'] : [];
  if (chapter >= 3) comp.push('rana', 'malik');
  if (chapter >= 4) comp.push('orland', 'melisande');
  for (const c of comp) joinCharacter(s, c);
  const lv = LEVEL_BY_CHAPTER[Math.min(4, chapter)];
  const rng = new Rng(7);
  for (const u of s.roster) { setLevel(u, lv); autoEquip(u, s.tier, rng); if (!u.charId) autoAbilities(u, rng, {}); }
  const grid = new MapGrid(mapDef(def.map));
  const cells = (def.deploy ?? grid.def.deploy).filter(([x, z]) => grid.cell(x, z)?.standable && !def.units.some((u) => u.at[0] === x && u.at[1] === z));
  const pick = [s.roster[0], ...s.roster.filter((r) => r.charId && r.charId !== 'rhen'), ...s.roster.filter((r) => !r.charId)];
  const party = pick.slice(0, Math.min(def.maxDeploy ?? 5, cells.length)).map((unit, i) => ({ unit, x: cells[i][0], z: cells[i][1] }));
  const t0 = performance.now();
  writeSync(1, `… ${st.battle}\n`);
  try {
    const { battle } = setupBattle(s, def, party, { seed: 11 });
    battle.heroSid = 'rhen';
    const r = run(battle);
    const ms = performance.now() - t0;
    if (r.res === 'victory') wins++; else if (r.res === 'defeat') losses++; else stalls++;
    const foes = battle.units.filter((u) => u.baseTeam !== 0);
    console.log(`${st.battle!.padEnd(22)} ch${chapter} lv${lv} ${String(r.res).padEnd(8)} turns ${String(r.turns).padStart(3)} ${ms.toFixed(0)}ms foes ${foes.length} foeLv ${Math.round(foes.reduce((a, u) => a + u.level, 0) / Math.max(1, foes.length))}`);
  } catch (e) {
    errs++;
    console.log(`${st.battle}: EXCEPTION ${(e as Error).message} ${(e as Error).stack?.split('\n').slice(1, 4).join(' | ')}`);
  }
}
console.log(`wins ${wins} losses ${losses} stalls ${stalls} errors ${errs}`);
