// Plays every story and side battle AI against AI (CHAOS=1: half the turns take a random usable
// action instead) and checks the engine's invariants after every step: HP and MP in range, KO and
// statuses consistent, charges and performances paired, one unit per tile on standable ground, teams
// changed only by Charm, pickups only of crystals and chests. Prints each broken invariant with an
// example and exits 1 if there is any.
// Run: npm run sim:fuzz   (SEEDS=11,22 by default; CHAOS=1 for random actions)
import { BATTLES, STORY, SIDE, JOBS, mapDef } from '../src/data/db';
import { newGame, joinCharacter } from '../src/game/state';
import { setupBattle, autoEquip, autoAbilities } from '../src/game/setup';
import { planTurn } from '../src/battle/ai';
import { MapGrid } from '../src/battle/grid';
import { Rng } from '../src/core/rng';
import { setLevel } from '../src/game/roster';
import type { Battle, BEvent } from '../src/battle/battle';
import type { SceneCmd } from '../src/data/types';
import { STATUS } from '../src/battle/status';

const LEVEL_BY_CHAPTER = [3, 6, 15, 26, 38];
const JOBS_BY_CHAPTER = [['squire', 'chemist'], ['knight', 'priest', 'archer', 'wizard'], ['knight', 'priest', 'monk', 'wizard', 'thief'], ['lancer', 'priest', 'monk', 'summoner', 'samurai'], ['ninja', 'priest', 'samurai', 'summoner', 'lancer']];
const issues = new Map<string, number>();
const examples = new Map<string, string>();
function flag(k: string, ex: string) { issues.set(k, (issues.get(k) ?? 0) + 1); if (!examples.has(k)) examples.set(k, ex); }
function applyScript(b: Battle, cmds: SceneCmd[]) {
  for (const c of cmds) {
    switch (c[0]) {
      case 'reveal': b.scriptReveal(c[1]); break;
      case 'retreat': b.scriptRetreat(c[1]); break;
      case 'battleEnd': b.forced = c[1]; break;
      case 'status': { const u = b.bySid(c[1]); if (u) { if (c[3]) b.addStatus(u, c[2]); else u.statuses.delete(c[2]); } break; }
      case 'if': applyScript(b, c[3] ?? []); break;
    }
  }
}
function pump(b: Battle, evs: BEvent[]) { for (const ev of evs) if (ev.t === 'script') { applyScript(b, b.def.events![ev.index].script); b.scriptDone(ev.index); b.checkEnd(); } }
function check(b: Battle, where: string) {
  const id = b.def.id;
  const occ = new Map<string, string>();
  for (const u of b.units) {
    const tag = `${id}@${where} ${u.name}#${u.uid}`;
    if (!Number.isFinite(u.ct)) flag('ct not finite', tag);
    if (u.hp < 0 || u.hp > u.maxHp) flag('hp out of range', `${tag} ${u.hp}/${u.maxHp}`);
    if (u.mp < 0 || u.mp > u.maxMp) flag('mp out of range', `${tag} ${u.mp}/${u.maxMp}`);
    if (u.has('ko') && u.hp > 0) flag('ko with hp', `${tag} hp ${u.hp} last ${lastAct}`);
    if (u.alive && u.hp <= 0) flag('alive with 0 hp', tag);
    // a performer's next repeat is held as a charge without the Charging status (Performing covers it)
    if (!!u.charging !== u.has('charging') && !(u.performing && u.charging && !u.has('charging'))) flag("charging flag mismatch", `${tag} obj=${u.charging?.ability.id} status=${u.has("charging")} ${[...u.statuses.keys()]} last ${lastAct}`);
    if (!!u.performing !== u.has('performing')) flag('performing flag mismatch', tag);
    if (!!u.jumping !== u.has('jumping')) flag('jumping flag mismatch', tag);
    if (u.performing && !u.charging && u.alive) flag('performing without charge', `${tag} ${[...u.statuses.keys()]}`);
    if (u.charging && !u.alive) flag('charging while down', tag);
    if (u.team !== u.baseTeam && !u.has('charm')) flag('team changed without charm', `${tag} team ${u.team} base ${u.baseTeam}`);
    if (u.has('charm') && u.team === u.baseTeam) flag('charmed but on own team', tag);
    if (u.alive && u.critical !== u.has('critical')) flag('critical mismatch', `${tag} ${u.hp}/${u.maxHp}`);
    for (const s of u.statuses.keys()) if (!STATUS[s]) flag('unknown status', `${tag} ${s}`);
    for (const [s, n] of u.statuses) if (n < 0) flag('negative status ticks', `${tag} ${s}`);
    if (u.has('ko')) for (const s of u.statuses.keys()) if (!['ko', 'undead', 'reraise'].includes(s) && !u.always.has(s)) flag('status on a KO unit', `${tag} ${s}`);
    if (u.alive && u.brave < 10 && !u.has('chicken')) flag('brave<10 without chicken', `${tag} ${u.brave}`);
    if (u.alive && u.has('chicken') && u.brave >= 10) flag('chicken with brave', `${tag} ${u.brave}`);
    if (u.gone && (u.charging || u.jumping)) flag('gone unit still charging/jumping', tag);
    if (!u.gone && !u.hidden && !u.jumping && !u.has('crystal') && !u.has('treasure')) {
      const c = b.grid.cell(u.x, u.z);
      if (!c || !c.standable) flag('standing on unstandable', `${tag} ${u.x},${u.z}`);
      const k = u.x + ',' + u.z;
      if (occ.has(k)) flag('two units on a tile', `${tag} with ${occ.get(k)} at ${k}`);
      occ.set(k, u.name);
    }
  }
  for (const [idx, p] of b.pickups) { if (p.unit.gone) flag('pickup of gone unit', `${id} ${idx}`); if (!p.unit.has('crystal') && !p.unit.has('treasure')) flag('pickup of a non-crystal', `${id} ${p.unit.name}`); }
}
const chaosRng = new Rng(99);
let lastAct = '';
function run(b: Battle) {
  let turns = 0;
  for (let i = 0; i < 4000 && !b.result && turns < 400; i++) {
    const adv = b.advance(); pump(b, adv.events); check(b, 'advance'); const unit = adv.unit;
    if (!unit) continue;
    turns++;
    let plan = planTurn(b, unit);
    if (process.env.CHAOS && chaosRng.pct(50) && unit.canAct && !unit.acted) {
      const abs = b.commandGroups(unit).flatMap((g) => g.abilities).filter((a) => !b.unusableReason(unit, a) && a.special !== 'calc');
      if (abs.length) {
        const a = chaosRng.pick(abs);
        const cells = b.targetCells(unit, a);
        if (cells.length) {
          const c = chaosRng.pick(cells);
          let opts: any = undefined;
          if (a.special === 'throw') opts = {};
          plan = { act: { ability: a, x: c.x, z: c.z, opts }, facing: unit.facing, score: 0, actFirst: true, move: plan.move };
        }
      }
    }
    if (!plan.act && !plan.move && unit.canAct && !unit.acted && unit.performing && !unit.charging) flag('idle performer', `${b.def.id} ${unit.name} charging=${!!unit.charging}`);
    lastAct = plan.act ? `${unit.name}:${plan.act.ability.id}` : '';
    if (plan.actFirst && plan.act) { pump(b, b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts)); check(b, 'act'); if (plan.move && !b.result) pump(b, b.doMove(unit, plan.move[0], plan.move[1])); check(b, 'move'); }
    else { if (plan.move) { pump(b, b.doMove(unit, plan.move[0], plan.move[1])); check(b, 'move'); } if (plan.act && !b.result) { pump(b, b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts)); check(b, 'act'); } }
    if (!b.result) { pump(b, b.endTurn(unit, plan.facing)); check(b, 'end'); }
  }
  return b.result ?? 'timeout';
}
const steps = [...STORY, ...SIDE].filter((s) => s.battle);
const SEEDS = (process.env.SEEDS ?? '11,22').split(',').map(Number);
for (const st of steps) {
  const def = BATTLES.get(st.battle!)!;
  const chapter = (st as any).chapter ?? (st as any).chapterMin ?? 4;
  for (const seed of SEEDS) {
    const s = newGame('Rhen', [4, 12], 20260925);
    s.chapter = chapter; s.tier = Math.min(8, 1 + chapter * 2);
    const comp = chapter >= 2 ? ['adria', 'mattis'] : [];
    if (chapter >= 3) comp.push('rana', 'malik');
    if (chapter >= 4) comp.push('orland', 'melisande');
    for (const c of comp) joinCharacter(s, c, new Rng(c.length * 7919));
    const lv = LEVEL_BY_CHAPTER[Math.min(4, chapter)];
    const rng = new Rng(seed);
    const jobsFor = JOBS_BY_CHAPTER[Math.min(4, chapter)];
    let gi = 0;
    for (const u of s.roster) {
      if (!u.charId) { const j = jobsFor[gi++ % jobsFor.length]; const jd = JOBS.get(j); if (jd && (!jd.gender || jd.gender === u.gender)) u.job = j; }
      if (!u.charId || u.charId === 'rhen') u.equip = {};
      setLevel(u, lv); autoEquip(u, s.tier, rng); if (!u.charId) autoAbilities(u, rng, {});
    }
    const grid = new MapGrid(mapDef(def.map));
    const cells = (def.deploy ?? grid.def.deploy).filter(([x, z]) => grid.cell(x, z)?.standable && !def.units.some((u) => u.at[0] === x && u.at[1] === z));
    const pick = [s.roster[0], ...s.roster.filter((r) => r.charId && r.charId !== 'rhen'), ...s.roster.filter((r) => !r.charId)];
    const party = pick.slice(0, Math.min(def.maxDeploy ?? 5, cells.length)).map((unit, i) => ({ unit: JSON.parse(JSON.stringify(unit)), x: cells[i][0], z: cells[i][1] }));
    const { battle } = setupBattle(s, def, party, { seed });
    battle.heroSid = 'rhen';
    try { run(battle); } catch (e) { flag('exception', `${def.id} ${(e as Error).message}`); }
  }
}
for (const [k, n] of issues) console.log(`${n}\t${k}\t${examples.get(k)}`);
console.log(issues.size ? `${issues.size} invariant(s) broken` : 'every invariant held');
process.exitCode = issues.size ? 1 : 0;
