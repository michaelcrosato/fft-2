// Regression tests for battle-engine bugs found in the 2026-09 audit.
import { describe, it, expect } from 'vitest';
import { Battle } from '../src/battle/battle';
import { MapGrid } from '../src/battle/grid';
import { BattleUnit } from '../src/battle/unit';
import { planTurn } from '../src/battle/ai';
import { createGeneric, createMonster } from '../src/game/roster';
import { Rng } from '../src/core/rng';
import { ABILITIES, BATTLES, JOBS, mapDef } from '../src/data/db';
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
  it('does not waste Invite on a protected target', () => {
    const orator = mk(0, 3, 8, 'orator', (r) => { r.learned = ['invite']; r.equip = {}; });
    const foe = mk(1, 3, 6);
    const b = battle([orator, foe]);
    orator.moved = true; // outside melee reach, but inside Speechcraft range
    expect(planTurn(b, orator).act?.ability.id).toBe('invite');
    foe.boss = true;
    expect(planTurn(b, orator).act?.ability.id).not.toBe('invite');
    foe.boss = false; foe.vip = true;
    expect(planTurn(b, orator).act?.ability.id).not.toBe('invite');
    foe.vip = false; foe.roster.charId = 'rhen';
    expect(planTurn(b, orator).act?.ability.id).not.toBe('invite');
    delete foe.roster.charId;
    Object.defineProperty(foe, 'job', { value: { ...foe.job, noInvite: true } });
    expect(planTurn(b, orator).act?.ability.id).not.toBe('invite');
  });

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

// Audit pass 3: the AI's previews must match resolution, and plans must stay legal.
describe('previews and AI plans match what actually happens', () => {
  it('previews Reflect as a bounce onto the caster, so the AI does not burn itself', () => {
    const wiz = mk(1, 3, 3, 'wizard', (r) => { r.equip = {}; r.learned.push('fire', 'fira'); });
    const tgt = mk(0, 3, 6);
    tgt.statuses.set('reflect', 32);
    const b = battle([wiz, tgt]);
    const [p] = b.previewAction(wiz, A('fira'), tgt.x, tgt.z);
    expect(p.uid).toBe(wiz.uid);
    expect(p.status).toContain('Reflected');
    wiz.moved = true;
    const plan = planTurn(b, wiz);
    expect(plan.act && plan.act.ability.magic && plan.act.x === tgt.x && plan.act.z === tgt.z).toBeFalsy();
  });

  it('rejects an action out of reach after a failed Teleport', () => {
    let failures = 0;
    for (let seed = 1; seed < 6; seed++) {
      const att = mk(1, 7, 3, 'knight', (r) => { r.movement = 'teleport'; r.learned.push('teleport'); });
      const tgt = mk(0, 3, 6);
      const b = battle([att, tgt], {}, seed);
      const plan = planTurn(b, att);
      expect(plan.move && plan.act).toBeTruthy();
      b.doMove(att, plan.move![0], plan.move![1]);
      const hp = tgt.hp;
      b.doAction(att, plan.act!.ability, plan.act!.x, plan.act!.z, plan.act!.opts);
      if (att.x === plan.move![0] && att.z === plan.move![1]) continue;
      failures++;
      expect(tgt.hp).toBe(hp);
      expect(att.acted).toBe(false);
    }
    expect(failures).toBeGreaterThan(0);
  });

  it('lets an AI performance finish instead of restarting it every turn', () => {
    const bard = mk(1, 3, 1, 'bard', (r) => { r.learned = ['finale']; r.equip = {}; });
    const b = battle([bard, mk(1, 4, 1), mk(1, 2, 1), mk(0, 9, 9)]);
    let casts = 0, resolved = 0;
    for (let i = 0; i < 4000 && b.tick < 600; i++) {
      const { events, unit } = b.advance();
      resolved += events.filter((e) => e.t === 'hits' && e.ability === 'finale').length;
      if (!unit) continue;
      if (unit === bard) {
        const plan = planTurn(b, bard);
        if (plan.move) b.doMove(bard, plan.move[0], plan.move[1]);
        if (plan.act) { casts++; b.doAction(bard, plan.act.ability, plan.act.x, plan.act.z, plan.act.opts); }
        b.endTurn(bard, plan.facing);
      } else b.endTurn(unit);
    }
    expect(casts).toBe(1);
    expect(resolved).toBeGreaterThan(1);
  });

  it('previews Death as a full heal on the undead and a resist against KO immunity', () => {
    const wiz = mk(1, 3, 3, 'wizard', (r) => { r.learned.push('death'); r.equip = {}; });
    const und = mk(0, 3, 5);
    und.statuses.set('undead', 0);
    const rib = mk(0, 5, 5);
    rib.immune.add('ko');
    const b = battle([wiz, und, rib]);
    und.hp = Math.floor(und.maxHp / 2);
    const onUndead = b.previewOn(wiz, und, A('death'));
    expect(onUndead.ko).toBeFalsy();
    expect(onUndead.heal).toBe(und.maxHp - und.hp);
    const onImmune = b.previewOn(wiz, rib, A('death'));
    expect(onImmune.ko).toBeFalsy();
    expect(onImmune.status).toContain('Resisted');
  });

  it('does not preview a revive for a fallen undead unit', () => {
    const priest = mk(1, 3, 3, 'priest', (r) => { r.learned.push('raise'); r.equip = {}; });
    const knight = mk(1, 3, 5);
    knight.statuses.set('undead', 0);
    const b = battle([priest, knight, mk(0, 9, 9)]);
    b.knockOut(knight);
    const p = b.previewOn(priest, knight, A('raise'));
    expect(p.heal).toBeUndefined();
    expect(p.status ?? '').not.toContain('Revive');
  });

  it('does not plan a skill from deep water, where only Attack works', () => {
    const monk = mk(1, 1, 4, 'monk', (r) => { r.equip = {}; r.learned = ['shockwave']; });
    const b = battle([monk, mk(0, 0, 6), mk(1, 1, 6), mk(1, 0, 7)]);
    const plan = planTurn(b, monk);
    const from = plan.move ? b.grid.cell(plan.move[0], plan.move[1])! : b.cellOf(monk);
    if (plan.act) expect(b.deepWaterBlocks(monk, plan.act.ability, from)).toBe(false);
  });

  it('gives talk skills no chance on monsters without Beast Speech', () => {
    const talker = mk(1, 3, 3, 'knight', (r) => { r.learned = ['invite', 'persuade']; r.secondary = 'orator'; });
    const job = [...JOBS.values()].find((j) => j.monster && !j.noInvite)!;
    const mon = new BattleUnit(createMonster(job.id, 20, rng), 0, true);
    mon.x = 3; mon.z = 6;
    const b = battle([talker, mon]);
    expect(b.previewOn(talker, mon, A('persuade')).hit).toBe(0);
    talker.moved = true;
    expect(planTurn(b, talker).act?.ability.id).not.toBe('persuade');
  });

  it("leaves a fallen unit's KO counter alone when it is hit again", () => {
    const hero = mk(0, 3, 3), foe = mk(1, 3, 6);
    const b = battle([hero, foe]);
    b.knockOut(foe);
    foe.koCount = 1;
    expect(b.damage(foe, 50)).toBe(0);
    expect(foe.koCount).toBe(1);
  });

  it('does not re-arm a performance whose performer was knocked out by a reaction', () => {
    const dancer = mk(0, 3, 8, 'dancer', (r) => { r.learned.push('bladeDance'); });
    const foe = mk(1, 3, 1, 'squire', (r) => { r.reaction = 'damageSplit'; r.learned.push('damageSplit'); r.brave = 100; });
    const b = battle([dancer, foe, mk(1, 5, 1), mk(0, 9, 9)]);
    b.doAction(dancer, A('bladeDance'), dancer.x, dancer.z);
    dancer.hp = 1;
    b.endTurn(dancer);
    for (let i = 0; i < 200 && dancer.alive; i++) { const { unit } = b.advance(); if (unit) b.endTurn(unit); }
    expect(dancer.alive).toBe(false);
    expect(dancer.charging).toBeNull();
  });

  it("sends a charmed unit to its charmer's side in a three-sided battle", () => {
    const p = mk(0, 3, 8), beast = mk(2, 5, 5), foe = mk(1, 9, 0);
    const b = battle([p, beast, foe]);
    b.addStatus(p, 'charm', beast);
    expect(p.team).toBe(2);
    b.unCharm(p);
    b.addStatus(p, 'charm');
    expect(p.team).toBe(1);
  });

  it('lets Invite recruit a foe that is currently charmed onto the party side', () => {
    const orator = mk(0, 3, 8, 'orator', (r) => { r.learned = ['invite']; r.equip = {}; });
    const foe = mk(1, 3, 7);
    const b = battle([orator, foe, mk(1, 9, 0)]);
    b.addStatus(foe, 'charm', orator);
    expect(foe.team).toBe(0);
    let hit;
    for (let i = 0; i < 40 && foe.baseTeam !== 0; i++) hit = b.hitUnit(orator, foe, A('invite'), {}, []);
    expect(foe.baseTeam).toBe(0);
    expect(foe.has('charm')).toBe(false);
    expect(hit?.text).toContain('Joins your cause!');
  });

  it('makes a Vampire strike at its own side', () => {
    let hitsAlly = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const v = mk(0, 3, 5), ally = mk(0, 3, 6);
      const b = battle([v, ally, mk(1, 9, 0)], {}, seed);
      v.statuses.set('vampire', 0);
      const plan = planTurn(b, v);
      if (plan.act && plan.act.x === ally.x && plan.act.z === ally.z) hitsAlly++;
    }
    expect(hitsAlly).toBeGreaterThan(0);
  });
});
