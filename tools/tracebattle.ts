// Trace one battle turn by turn (AI vs AI, party as in simcampaign). Run: npx vite-node tools/tracebattle.ts <battleId> [maxTurns]
import type { Battle, BEvent } from '../src/battle/battle';
import type { SceneCmd } from '../src/data/types';
import { BATTLES, STORY, SIDE, JOBS, mapDef } from '../src/data/db';
import { newGame, joinCharacter } from '../src/game/state';
import { setupBattle, autoEquip, autoAbilities } from '../src/game/setup';
import { planTurn } from '../src/battle/ai';
import { MapGrid } from '../src/battle/grid';
import { Rng } from '../src/core/rng';
import { setLevel } from '../src/game/roster';
const id = process.argv[2];
const st = [...STORY, ...SIDE].find((s) => s.battle === id)!;
const def = BATTLES.get(id)!;
const chapter = (st as any).chapter ?? (st as any).chapterMin ?? 4;
const s = newGame('Rhen', [4, 12]);
s.chapter = chapter; s.tier = Math.min(8, 1 + chapter * 2);
const comp = chapter >= 2 ? ['adria', 'mattis'] : [];
if (chapter >= 3) comp.push('rana', 'malik');
if (chapter >= 4) comp.push('orland', 'melisande');
for (const c of comp) joinCharacter(s, c);
const lv = [3, 6, 15, 26, 38][Math.min(4, chapter)];
const JB = [['squire', 'chemist'], ['knight', 'priest', 'archer', 'wizard'], ['knight', 'priest', 'monk', 'wizard', 'thief'], ['lancer', 'priest', 'monk', 'summoner', 'samurai'], ['ninja', 'priest', 'samurai', 'summoner', 'lancer']][Math.min(4, chapter)];
const rng = new Rng(7);
let gi = 0;
for (const u of s.roster) { if (!u.charId) { const j = JB[gi++ % JB.length]; const jd = JOBS.get(j); if (jd && (!jd.gender || jd.gender === u.gender)) u.job = j; } if (!u.charId || u.charId === 'rhen') u.equip = {}; setLevel(u, lv); autoEquip(u, s.tier, rng); if (!u.charId) autoAbilities(u, rng, {}); }
const grid = new MapGrid(mapDef(def.map));
const cells = (def.deploy ?? grid.def.deploy).filter(([x, z]) => grid.cell(x, z)?.standable && !def.units.some((u) => u.at[0] === x && u.at[1] === z));
const pick = [s.roster[0], ...s.roster.filter((r) => r.charId && r.charId !== 'rhen'), ...s.roster.filter((r) => !r.charId)];
const party = pick.slice(0, Math.min(def.maxDeploy ?? 5, cells.length)).map((unit, i) => ({ unit, x: cells[i][0], z: cells[i][1] }));
const { battle: b } = setupBattle(s, def, party, { seed: 11 });
b.heroSid = 'rhen';
const desc = (u: any) => `${u.name.padEnd(12)} t${u.team} ${u.job.id.padEnd(12)} L${u.level} HP${u.hp}/${u.maxHp} PA${u.pa} MA${u.ma} SP${u.speed} W:${u.roster.equip.rhand ?? '-'} ${u.roster.equip.body ?? ''} R:${u.roster.reaction ?? ''} S:${u.roster.support ?? ''}`;
for (const u of b.units) console.log(desc(u));
/** apply the rules-relevant parts of mid-battle scripts (reveals, retreats, forced endings) */
function applyScript(b: Battle, cmds: SceneCmd[]) {
  for (const c of cmds) {
    switch (c[0]) {
      case 'reveal': b.scriptReveal(c[1]); break;
      case 'retreat': b.scriptRetreat(c[1]); break;
      case 'battleEnd': b.forced = c[1]; break;
      case 'heal': for (const u of c[1] === '*' || c[1] === 'party' ? b.units.filter((o) => o.baseTeam === 0 && !o.gone) : [b.bySid(c[1])]) if (u) { if (u.has('ko')) b.revive(u, 1); u.hp = u.maxHp; } break;
      case 'status': { const u = b.bySid(c[1]); if (u) { if (c[3]) b.addStatus(u, c[2]); else u.statuses.delete(c[2]); } break; }
      case 'if': applyScript(b, c[3] ?? []); break;
      case 'choice': if (c[2][0]) applyScript(b, c[2][0][1]); break;
    }
  }
}
function pump(b: Battle, evs: BEvent[]) {
  for (const ev of evs) if (ev.t === 'script') { applyScript(b, b.def.events![ev.index].script); b.scriptDone(ev.index); b.checkEnd(); }
}
let turns = 0;
for (let i = 0; i < 4000 && !b.result && turns < +(process.argv[3] ?? 400); i++) {
  const adv = b.advance(); pump(b, adv.events); const unit = adv.unit;
  if (!unit) continue;
  turns++;
  const plan = planTurn(b, unit);
  const before = b.units.map((x) => x.hp);
  if (plan.actFirst && plan.act) { pump(b, b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts)); if (plan.move && !b.result) pump(b, b.doMove(unit, plan.move[0], plan.move[1])); }
  else { if (plan.move) pump(b, b.doMove(unit, plan.move[0], plan.move[1])); if (plan.act && !b.result) pump(b, b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts)); }
  const diffs = b.units.map((x, k) => x.hp - before[k] ? `${x.name}${x.hp - before[k] > 0 ? '+' : ''}${x.hp - before[k]}` : '').filter(Boolean).join(' ');
  console.log(`${String(turns).padStart(3)} t${unit.team} ${unit.name.padEnd(12)} ${plan.move ? 'mv' + plan.move : '      '} ${plan.act ? plan.act.ability.id + '@' + plan.act.x + ',' + plan.act.z : '-'}  ${diffs}`);
  if (!b.result) pump(b, b.endTurn(unit, plan.facing));
}
console.log('result', b.result, 'turns', turns);
for (const u of b.units) console.log(desc(u), !u.alive ? 'DOWN' : '', u.gone ? 'GONE' : '', [...u.statuses.keys()].join(','));
