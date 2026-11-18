// docs/TODO.md's last engine items: invite-proof gear, the `defect` battle-script command and a battle's
// fixed hero cell (with the content validator's check for it).
import { describe, it, expect } from 'vitest';
import { Battle } from '../src/battle/battle';
import { MapGrid } from '../src/battle/grid';
import { BattleUnit } from '../src/battle/unit';
import { planTurn } from '../src/battle/ai';
import { createGeneric } from '../src/game/roster';
import { Rng } from '../src/core/rng';
import { ABILITIES, BATTLES, ITEMS, mapDef } from '../src/data/db';
import type { BattleDef } from '../src/data/types';
import { deployCells } from '../src/game/setup';
import { t } from '../src/i18n';
import { battleProblems } from '../tools/battle-checks';

const rng = new Rng(42);
function mk(team: number, x: number, z: number, job = 'squire', extra: (r: ReturnType<typeof createGeneric>) => void = () => {}, gender: 'm' | 'f' = 'm') {
  const r = createGeneric({ gender, level: 20, job, rng });
  r.equip = { rhand: 'broadsword', head: 'leatherCap', body: 'clothes' };
  r.reaction = undefined; // no Deaf Ear
  extra(r);
  const u = new BattleUnit(r, team, team === 0);
  u.x = x; u.z = z; u.facing = team === 0 ? 'N' : 'S';
  return u;
}
function battle(units: BattleUnit[], def: Partial<BattleDef> = {}) {
  const d = { id: 't', name: 't', map: 'training', units: [], victory: { type: 'defeatAll' }, ...def } as BattleDef;
  return new Battle({ def: d, grid: new MapGrid(mapDef(d.map)), units, inventory: new Map(), seed: 7 });
}
/** an Orator whose Invite cannot miss ((MA + 20)%) */
function orator(team: number, x: number, z: number) {
  const o = mk(team, x, z, 'orator', (r) => { r.learned = ['invite']; r.equip = {}; });
  o.buff.ma = 200;
  return o;
}
const invite = ABILITIES.get('invite')!;

describe('invite-proof gear', () => {
  it('Invite fails on a wearer of the Nightshade Armlet and wins over the same foe without it', () => {
    const talker = orator(0, 3, 8);
    const foe = mk(1, 3, 6, 'squire', (r) => { r.equip.accessory = 'nightshadeArmlet'; });
    const b = battle([talker, foe, mk(1, 9, 0)]);
    expect(foe.recruitable).toBe(false);
    expect(b.previewOn(talker, foe, invite).status).toContain(t('engine.invite.refused'));
    b.doAction(talker, invite, foe.x, foe.z);
    expect(foe.team).toBe(1);
    expect(b.invited).toHaveLength(0);

    const talker2 = orator(0, 3, 8);
    const bare = mk(1, 3, 6);
    const b2 = battle([talker2, bare, mk(1, 9, 0)]);
    expect(bare.recruitable).toBe(true);
    expect(b2.previewOn(talker2, bare, invite).status).toContain(t('engine.preview.invite'));
    b2.doAction(talker2, invite, bare.x, bare.z);
    expect(bare.team).toBe(0);
    expect(b2.invited).toEqual([bare]);
  });

  it('protects the company from an enemy Orator, Barrette included, and is lost with the gear', () => {
    const talker = orator(1, 3, 6);
    const wearer = mk(0, 3, 8, 'squire', (r) => { r.equip.head = 'barrette'; }, 'f');
    const b = battle([talker, wearer, mk(0, 9, 9)]);
    expect(wearer.recruitable).toBe(false);
    b.doAction(talker, invite, wearer.x, wearer.z);
    expect(wearer.team).toBe(0);
    // stolen or broken: the protection goes with it
    delete wearer.roster.equip.head;
    wearer.recompute(false);
    expect(wearer.recruitable).toBe(true);
  });

  it('the AI does not waste Invite on a wearer', () => {
    const talker = mk(0, 3, 8, 'orator', (r) => { r.learned = ['invite']; r.equip = {}; });
    const foe = mk(1, 3, 6);
    const b = battle([talker, foe]);
    talker.moved = true; // outside melee reach, inside Speechcraft range
    expect(planTurn(b, talker).act?.ability.id).toBe('invite');
    foe.roster.equip.accessory = 'nightshadeArmlet';
    foe.recompute(false);
    expect(planTurn(b, talker).act?.ability.id).not.toBe('invite');
  });

  it('every invite-proof item says so, and one of them is sold', () => {
    const proof = [...ITEMS.values()].filter((it) => it.noInvite);
    expect(proof.map((it) => it.id).sort()).toEqual(['barrette', 'nightshadeArmlet']);
    for (const it of proof) expect(it.desc, it.id).toMatch(/\bInvite\b/);
    expect(proof.some((it) => it.kind === 'accessory' && it.shopTier && it.price > 0 && !it.rare)).toBe(true);
  });
});

describe('the defect script command', () => {
  it('turns a foe into an AI-led ally for good, emits teamChange, and can end the battle', () => {
    const hero = mk(0, 3, 8), foe = mk(1, 3, 1, 'knight', (r) => { r.equip = {}; });
    const b = battle([hero, foe]);
    b.addStatus(foe, 'charm', hero); // a charmed unit defects for good, the charm lifted
    b.events = [];
    b.scriptDefect(foe.sid, 0);
    expect(foe.team).toBe(0);
    expect(foe.baseTeam).toBe(0);
    expect(foe.has('charm')).toBe(false);
    expect(foe.controlled).toBe(false); // a guest, not one of the player's own
    expect(b.events).toContainEqual({ t: 'teamChange', uid: foe.uid, team: 0 });
    b.checkEnd();
    expect(b.result).toBe('victory');
  });

  it('sends one of the company to the enemy, and does nothing for a unit already there', () => {
    const hero = mk(0, 3, 8), turncoat = mk(0, 4, 8), foe = mk(1, 3, 1);
    const b = battle([hero, turncoat, foe]);
    b.events = [];
    b.scriptDefect(turncoat.sid, 1);
    expect([turncoat.team, turncoat.baseTeam]).toEqual([1, 1]);
    expect(b.enemiesOf(hero)).toContain(turncoat);
    b.events = [];
    b.scriptDefect(turncoat.sid, 1);
    b.scriptDefect('nobody', 0);
    expect(b.events).toEqual([]);
  });
});

describe('a fixed hero cell', () => {
  const def = (heroAt?: [number, number]) => ({ id: 'fixed', name: 'fixed', map: 'training', units: [{ job: 'squire', level: 1, at: [4, 1], team: 1 }], victory: { type: 'defeatAll' }, heroAt }) as BattleDef;
  const grid = new MapGrid(mapDef('training'));

  it('comes first among the deploy cells, which are otherwise unchanged', () => {
    const plain = deployCells(def(), grid);
    expect(plain).toEqual(mapDef('training').deploy);
    const fixed = deployCells(def([4, 9]), grid);
    expect(fixed[0]).toEqual([4, 9]);
    expect([...fixed].sort()).toEqual([...plain].sort());
  });

  it('the validator accepts a deploy cell and rejects any other', () => {
    expect(battleProblems(def([4, 9]), grid)).toEqual([]);
    expect(battleProblems(def([4, 1]), grid)).toEqual(['battle fixed: hero cell 4,1 is not one of its standable deploy cells']);
    expect(battleProblems({ ...def(), deploy: [[3, 8], [4, 8]], heroAt: [5, 9] }, grid)).toHaveLength(1);
  });

  it('the validator checks defect commands, and every shipped battle passes', () => {
    const scripted = { ...def(), units: [{ id: 'sq', job: 'squire', level: 1, at: [4, 1], team: 1 }], events: [{ when: { turn: 2 }, script: [['if', 'f', [['defect', 'sq', 0]], [['defect', 'ghost', 4]]]] }] } as BattleDef;
    expect(battleProblems(scripted, grid)).toEqual(['battle fixed: defect of unknown unit ghost', 'battle fixed: defect ghost to unknown team 4']);
    for (const b of BATTLES.values()) expect(battleProblems(b, new MapGrid(mapDef(b.map))), b.id).toEqual([]);
  });
});
