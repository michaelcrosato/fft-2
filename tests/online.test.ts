// Online versus in lockstep: two copies build the same battle from the hub's seed; on each turn the
// owner's copy plays it (here by the AI) and records what it did, and the other copy plays the
// recording back. The two fields must stay identical, turn after turn, to the end.
import { describe, expect, it } from 'vitest';
import { presetBattle } from '../src/game/trial';
import { versusPreset } from '../src/game/versus';
import { applySnapshot, fieldHash, planOf, recordTurns, snapshot, standingsFor, winnerOnLeave, sideOfSeat, type WirePlan } from '../src/game/online';
import { planTurn } from '../src/battle/ai';
import type { Battle } from '../src/battle/battle';
import type { BattleUnit } from '../src/battle/unit';

function copy(field: number, seed: number) {
  const { setup } = presetBattle(versusPreset(field), seed);
  for (const u of setup.battle.units) u.controlled = true;
  return setup.battle;
}
const side = (u: BattleUnit) => (u.baseTeam === 0 ? 0 : 1);

/** Play one turn on `b` from a plan, as the battle controller plays an AI's or a remote turn. */
function play(b: Battle, u: BattleUnit, plan: ReturnType<typeof planTurn>) {
  const act = () => { if (plan.act && !b.result && !u.acted && u.alive) b.doAction(u, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts); };
  const move = () => { if (plan.move && !u.moved && !b.result) b.doMove(u, plan.move[0], plan.move[1]); };
  if (plan.actFirst) { act(); move(); } else { move(); act(); }
  if (!b.result) b.endTurn(u, plan.facing);
}

describe('online versus lockstep', () => {
  for (const field of [0, 3]) {
    it(`two copies stay in step to the end (field ${field})`, () => {
      const seed = 123456 + field;
      const a = copy(field, seed), b = copy(field, seed);
      expect(fieldHash(a)).toBe(fieldHash(b));
      // copy A plays side 0 with the AI and records it; copy B plays side 1 and records it
      const wire: WirePlan[] = [];
      const recA = recordTurns(a, (u) => side(u) === 0, (p) => wire.push(p));
      const recB = recordTurns(b, (u) => side(u) === 1, (p) => wire.push(p));
      let turns = 0;
      for (let i = 0; i < 20000 && !a.result && turns < 300; i++) {
        const ua = a.advance().unit, ub = b.advance().unit;
        expect(ua ? a.units.indexOf(ua) : -1).toBe(ub ? b.units.indexOf(ub) : -1);
        if (!ua || !ub) continue;
        turns++;
        recA.begin(ua); recB.begin(ub);
        const [owner, other, ownU, otherU] = side(ua) === 0 ? [a, b, ua, ub] : [b, a, ub, ua];
        play(owner, ownU, planTurn(owner, ownU));
        const sent = wire.shift();
        expect(sent, `turn ${turns}: the owner sent its turn`).toBeDefined();
        play(other, otherU, planOf(otherU, sent!));
        expect(fieldHash(other), `turn ${turns}`).toBe(fieldHash(owner));
      }
      expect(a.result).toBe(b.result);
      expect(turns).toBeGreaterThan(10);
    });
  }

  it('a copy that drifted takes the host\'s field as the host\'s turn begins, and keeps in step after', () => {
    const host = copy(1, 777), guest = copy(1, 777);
    // something went wrong on the guest: a unit stands elsewhere with less HP
    const odd = guest.units[2];
    odd.hp = Math.max(1, odd.hp - 7);
    expect(fieldHash(guest)).not.toBe(fieldHash(host));
    let mended = 0;
    for (let i = 0; i < 20000 && !host.result && mended < 3; i++) {
      const uh = host.advance().unit, ug = guest.advance().unit;
      if (!uh || !ug) continue;
      // the host sends the field each of its turns begins on; the guest compares there, before it plays
      const s = fieldHash(host), units = snapshot(host);
      const plan = planTurn(host, uh);
      if (s !== fieldHash(guest)) { applySnapshot(guest, units); mended++; }
      expect(fieldHash(guest)).toBe(s);
      play(host, uh, plan);
      play(guest, ug, planOf(ug, { mv: plan.move, act: plan.act ? { id: plan.act.ability.id, x: plan.act.x, z: plan.act.z, ...plan.act.opts } : undefined, actFirst: plan.actFirst, f: plan.facing }));
      expect(fieldHash(guest)).toBe(fieldHash(host));
    }
    expect(mended).toBe(1);
  });

  it('the player who stays wins when the other leaves, and heads the standings', () => {
    const b = copy(0, 42);
    const seats = [11, 22]; // seat 0 (red), seat 1 (blue)
    expect(sideOfSeat(0)).toBe(1);
    expect(sideOfSeat(1)).toBe(0);
    // red leaves: blue (side 0, player 22) wins
    expect(winnerOnLeave(seats, 11)).toBe(0);
    expect(standingsFor(b, seats, winnerOnLeave(seats, 11)).standings).toEqual([[22], [11]]);
    // blue leaves: red (side 1, player 11) wins
    expect(winnerOnLeave(seats, 22)).toBe(1);
    expect(standingsFor(b, seats, winnerOnLeave(seats, 22)).standings).toEqual([[11], [22]]);
    // a server copy or a stranger leaving decides nothing
    expect(winnerOnLeave(seats, 99)).toBeNull();
    // time up on an untouched field: a shared place
    const tie = standingsFor(b, seats, null);
    expect(tie.standings).toHaveLength(1);
    expect([...tie.standings[0]].sort()).toEqual([11, 22]);
    expect(tie.scores).toEqual({ 11: 0, 22: 0 });
  });
});
