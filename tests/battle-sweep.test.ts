import { describe, expect, it, vi } from 'vitest';
import { Battle } from '../src/battle/battle';
import { MapGrid } from '../src/battle/grid';
import { BattleUnit } from '../src/battle/unit';
import { planTurn } from '../src/battle/ai';
import { Rng } from '../src/core/rng';
import { ABILITIES } from '../src/data/db';
import type { StatusId } from '../src/data/types';
import { createGeneric } from '../src/game/roster';

const ability = (id: string) => ABILITIES.get(id)!;
function unit(team: number, x: number, z: number, job = 'squire') {
  const roster = createGeneric({ gender: 'm', level: 20, job, rng: new Rng(42) });
  roster.equip = { rhand: 'broadsword' };
  roster.zodiac = 'aries';
  const u = new BattleUnit(roster, team, team === 0);
  u.x = x; u.z = z;
  u.hpMult = 5; u.recompute(true);
  u.faith = 100;
  return u;
}
function battle(units: BattleUnit[], inventory = new Map<string, number>()) {
  const grid = new MapGrid({ id: 'sweep', name: 'Sweep', rows: Array.from({ length: 8 }, () => '1g 1g 1g 1g 1g 1g 1g 1g'), deploy: [], theme: 'plains', time: 'day' });
  return new Battle({ def: { id: 'sweep', name: 'Sweep', map: 'sweep', units: [], victory: { type: 'defeatAll' } }, grid, units, inventory, seed: 7 });
}

describe('battle bug sweep', () => {
  it('elemental throw previews account for absorption just like the actual hit', () => {
    const ninja = unit(0, 2, 2, 'ninja'), foe = unit(1, 3, 2);
    const b = battle([ninja, foe]);
    foe.absorb.add('fire'); foe.hp -= 200;
    const opts = { item: 'flameOrb' };
    const a = ability('throwBall');
    expect(a).toBeDefined();
    const preview = b.previewOn(ninja, foe, a, opts);
    const hit = b.hitUnit(ninja, foe, a, opts, []);
    expect(hit.heal).toBeGreaterThan(0);
    expect(preview.heal).toBe(hit.heal);
    expect(preview.dmg).toBeUndefined();
  });

  it('Gravity previews the same maximum-HP damage used on wounded targets', () => {
    const mage = unit(0, 2, 2), foe = unit(1, 3, 2);
    const b = battle([mage, foe]);
    foe.hp = Math.floor(foe.maxHp / 2);
    const a = [...ABILITIES.values()].find((a) => a.effects?.some((e) => e.type === 'special' && e.id === 'gravity'))!;
    vi.spyOn(b.rng, 'pct').mockReturnValue(true);
    const preview = b.previewOn(mage, foe, a);
    const hit = b.hitUnit(mage, foe, a, {}, []);
    expect(preview.dmg).toBe(hit.dmg);
  });

  it('healing previews include Magic Attack Up', () => {
    const cleric = unit(0, 2, 2, 'priest'), ally = unit(0, 3, 2), foe = unit(1, 7, 7);
    cleric.roster.support = 'magicAttackUp';
    ally.hp = 1;
    const b = battle([cleric, ally, foe]);
    const preview = b.previewOn(cleric, ally, ability('cure'));
    const hit = b.hitUnit(cleric, ally, ability('cure'), {}, []);
    expect(preview.heal).toBe(hit.heal);
  });

  it.each(['iaidoAsura', 'geoIvy'])('%s applies magic support modifiers without becoming a silenceable spell', (id) => {
    const caster = unit(0, 2, 2), foe = unit(1, 3, 2);
    const b = battle([caster, foe], new Map([['asura', 1]]));
    const a = ability(id);
    const base = b.previewOn(caster, foe, a).dmg!;
    caster.roster.support = 'magicAttackUp';
    const boosted = b.previewOn(caster, foe, a).dmg!;
    expect(boosted).toBe(Math.floor(base * 4 / 3));
    foe.roster.support = 'magicDefenseUp';
    expect(b.previewOn(caster, foe, a).dmg).toBeLessThan(boosted);
    b.addStatus(caster, 'silence');
    expect(b.unusableReason(caster, a)).toBeUndefined();
    expect(a.magic).toBeFalsy();
  });

  it('Arithmeticks Raise revives matching fallen units and ignores healthy living units', () => {
    const caster = unit(0, 2, 2, 'arithmancer'), fallen = unit(0, 3, 2), foe = unit(1, 7, 7);
    caster.roster.learned.push('calcAttrLevel', 'calcDiv5', 'raise');
    const b = battle([caster, fallen, foe]);
    b.knockOut(fallen);
    const calc = { attr: 'level', div: '5', spell: 'raise' };
    expect(b.calcTargets(caster, calc)).toEqual([fallen]);
    const previews = b.previewAction(caster, ability('arithmeticks'), caster.x, caster.z, { calc });
    expect(previews).toHaveLength(1);
    expect(previews[0].status).toContain('Revive');
    b.doAction(caster, ability('arithmeticks'), caster.x, caster.z, { calc });
    expect(fallen.alive).toBe(true);
    expect(fallen.hp).toBe(Math.floor(fallen.maxHp / 2));
  });

  it('Arithmeticks damage excludes fallen units so their KO countdown is preserved', () => {
    const caster = unit(0, 2, 2, 'arithmancer'), fallen = unit(0, 3, 2), foe = unit(1, 7, 7);
    const b = battle([caster, fallen, foe]);
    b.knockOut(fallen); fallen.koCount = 1;
    expect(b.calcTargets(caster, { attr: 'level', div: '5', spell: 'fire' })).not.toContain(fallen);
    expect(fallen.koCount).toBe(1);
  });

  it('Counter Tackle returns Rush rather than silently substituting a weapon strike', () => {
    const attacker = unit(0, 3, 2), defender = unit(1, 2, 2);
    defender.roster.reaction = 'counterTackle'; defender.brave = 100;
    const b = battle([attacker, defender]);
    vi.spyOn(b.rng, 'pct').mockImplementation((chance) => chance > 5);
    const events = b.doAction(attacker, ability('attack'), defender.x, defender.z);
    expect(events.some((e) => e.t === 'act' && e.uid === defender.uid && e.ability === 'rush')).toBe(true);
  });

  it.each<StatusId>(['sleep', 'stop', 'petrify'])('a unit afflicted by %s during its action cannot keep moving or acting', (status) => {
    const actor = unit(0, 2, 2), ally = unit(0, 0, 0), foe = unit(1, 3, 2);
    const b = battle([actor, ally, foe]);
    b.addStatus(actor, status);
    expect(actor.canMove).toBe(false);
    expect(actor.canAct).toBe(false);
    expect(b.doMove(actor, 2, 3)).toEqual([]);
    expect(b.doAction(actor, ability('attack'), foe.x, foe.z)).toEqual([]);
  });

  it('Disabled prevents direct actions and exhausted items cannot be used from stale plans', () => {
    const actor = unit(0, 2, 2), foe = unit(1, 3, 2);
    const b = battle([actor, foe]);
    b.addStatus(actor, 'disable');
    expect(b.doAction(actor, ability('attack'), foe.x, foe.z)).toEqual([]);
    actor.statuses.delete('disable'); actor.hp = 1;
    expect(b.doAction(actor, ability('usePotion'), actor.x, actor.z)).toEqual([]);
    expect(actor.hp).toBe(1);
    expect(actor.acted).toBe(false);
  });

  it('the AI can choose pure MP damage when it cannot reach the enemy with a weapon', () => {
    const mystic = unit(1, 2, 2, 'mystic'), foe = unit(0, 5, 2);
    mystic.moved = true;
    const b = battle([mystic, foe]);
    const drain = [...ABILITIES.values()].find((a) => a.skillset === 'mysticism' && a.effects?.some((e) => e.type === 'damage' && e.stat === 'mp'))!;
    expect(drain).toBeDefined();
    mystic.roster.learned = [drain.id];
    const plan = planTurn(b, mystic);
    expect(plan.act?.ability.id).toBe(drain.id);
  });

  it('the AI evaluates the selected Arithmeticks spell when choosing to cure an ally', () => {
    const caster = unit(0, 2, 2, 'arithmancer'), ally = unit(0, 3, 2), foe = unit(1, 7, 7);
    caster.roster.learned = ['calcAttrLevel', 'calcDiv5', 'esuna'];
    caster.moved = true;
    const b = battle([caster, ally, foe]);
    b.addStatus(ally, 'petrify');
    const plan = planTurn(b, caster);
    expect(plan.act?.ability.id).toBe('arithmeticks');
    expect(plan.act?.opts?.calc?.spell).toBe('esuna');
  });

  it('Mimic copies a charged spell when it resolves', () => {
    const caster = unit(0, 1, 1, 'wizard'), mime = unit(0, 1, 5, 'mime');
    const foe = unit(1, 2, 1), secondFoe = unit(1, 2, 5);
    const b = battle([caster, mime, foe, secondFoe]);
    caster.mp = 999;
    b.doAction(caster, ability('holy'), foe.x, foe.z);
    b.endTurn(caster);
    const events = [];
    for (let i = 0; i < 30 && caster.charging; i++) {
      const next = b.advance();
      events.push(...next.events);
      if (next.unit) b.endTurn(next.unit);
    }
    expect(caster.charging).toBeNull();
    expect(events.some((e) => e.t === 'act' && e.uid === mime.uid && e.ability === 'holy' && e.mimic)).toBe(true);
    expect(secondFoe.hp).toBeLessThan(secondFoe.maxHp);
  });
});
