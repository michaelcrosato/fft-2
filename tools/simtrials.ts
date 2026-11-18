// Plays every Trial AI against AI over a range of seeds and prints how often and how fast the company
// wins: a Trial should be won most of the time, in 25 to 60 unit turns (4 to 8 minutes at 1.5×).
// Run: npx vite-node tools/simtrials.ts [runs]
import { TRIALS } from '../src/data/battles/trials';
import { presetBattle } from '../src/game/trial';
import { planTurn } from '../src/battle/ai';
import type { Battle } from '../src/battle/battle';
import { writeSync } from 'node:fs';

const RUNS = Number(process.argv[2] ?? 40);

function play(b: Battle) {
  let turns = 0;
  for (let i = 0; i < 4000 && !b.result && turns < 300; i++) {
    const { unit } = b.advance();
    if (!unit) continue;
    turns++;
    const plan = planTurn(b, unit);
    if (plan.actFirst && plan.act) { b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts); if (plan.move && !b.result) b.doMove(unit, plan.move[0], plan.move[1]); }
    else { if (plan.move) b.doMove(unit, plan.move[0], plan.move[1]); if (plan.act && !b.result) b.doAction(unit, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts); }
    if (!b.result) b.endTurn(unit, plan.facing);
  }
  return { res: b.result ?? 'timeout', turns };
}

let bad = 0;
for (const trial of TRIALS) {
  let wins = 0, losses = 0, stalls = 0;
  const winTurns: number[] = [];
  for (let s = 1; s <= RUNS; s++) {
    const { setup } = presetBattle(trial, s * 7919);
    const r = play(setup.battle);
    if (r.res === 'victory') { wins++; winTurns.push(r.turns); } else if (r.res === 'defeat') losses++; else stalls++;
  }
  winTurns.sort((a, b) => a - b);
  const med = winTurns.length ? winTurns[winTurns.length >> 1] : 0;
  const ok = wins / RUNS >= 0.6 && med >= 20 && med <= 70;
  if (!ok) bad++;
  writeSync(1, `${ok ? 'ok ' : 'BAD'} ${trial.battle.id.padEnd(16)} won ${wins}/${RUNS}, lost ${losses}, stalled ${stalls}; turns to win: median ${med}, range ${winTurns[0] ?? '-'}–${winTurns[winTurns.length - 1] ?? '-'}\n`);
}
process.exitCode = bad ? 1 : 0;
