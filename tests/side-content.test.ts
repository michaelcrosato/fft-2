import { describe, expect, it } from 'vitest';
import { ARTEFACTS, BATTLES, EDGES, ERRANDS, JOBS, NODES, SCENES, SIDE, STORY, mapDef } from '../src/data/db';
import type { SceneCmd, SideQuestStep } from '../src/data/types';
import { newGame } from '../src/game/state';
import { setLevel } from '../src/game/roster';
import { setupBattle } from '../src/game/setup';

const step = (id: string) => SIDE.find((q) => q.id === id)!;

// Walk the authored graph, including flags and recruits produced inside scenes.
// This catches a prerequisite whose producer exists only on an unchosen branch,
// an unreachable destination, or a recruit referenced before joining.
function questRoute() {
  const flags = new Set(['ch3_lesandre_done', 'ch4_germain_done']);
  const party = new Set(['rhen', 'mattis']);
  const done = new Set<string>();
  const unlocked = new Set([...NODES.values()].filter((n) => n.start).map((n) => n.id));
  for (const st of STORY) {
    for (const n of st.unlock ?? []) unlocked.add(n);
    if (st.flags?.includes('ch4_germain_done')) break;
  }
  let location = 'cogsgard';
  const eligible = (q: SideQuestStep) => !done.has(q.id) && q.needs.every((f) => flags.has(f)) &&
    (q.needChar ?? []).every((id) => party.has(id)) && (q.chapterMin ?? 0) <= 4 && (q.chapterMax ?? 4) >= 4;
  const commands = (cmds: SceneCmd[], choice: number) => {
    for (const c of cmds) {
      if (c[0] === 'flag') { if (c[2] === false) flags.delete(c[1]); else flags.add(c[1]); }
      if (c[0] === 'join') party.add(c[1]);
      if (c[0] === 'choice') commands(c[2][choice][1], choice);
      if (c[0] === 'if') commands(flags.has(c[1]) ? c[2] : c[3] ?? [], choice);
    }
  };
  const complete = (id: string, choice = 0) => {
    const q = step(id);
    expect(q, id).toBeDefined();
    expect(eligible(q), `${id} prerequisites`).toBe(true);
    const visited = new Set([location]);
    for (const node of visited) for (const edge of EDGES) {
      const next = edge.a === node ? edge.b : edge.b === node ? edge.a : null;
      if (next && unlocked.has(next)) visited.add(next);
    }
    expect(visited.has(q.at), `${id} has a world route to ${q.at}`).toBe(true);
    for (const scene of [q.pre, q.post]) if (scene) commands(SCENES.get(scene)!.cmds, choice);
    for (const f of q.flags) flags.add(f);
    for (const n of q.unlock ?? []) unlocked.add(n);
    if (!q.repeat) done.add(id);
    location = q.at;
  };
  return { flags, party, eligible, complete };
}

describe('optional content progression', () => {
  it('connects the colliery, both machines, temple and flower rescue without a dead end', () => {
    const route = questRoute();
    route.complete('sq_flower_offer', 1);
    expect(route.eligible(step('sq_kestrel_arrival'))).toBe(false);
    route.complete('sq_flower_again');
    expect(route.flags.has('sq_flower')).toBe(true);
    expect(route.eligible(step('sq_flower_again'))).toBe(false);
    expect(route.eligible(step('sq_kestrel_arrival'))).toBe(false);
    for (const id of ['sq_colliery_bastian', 'sq_colliery_rumor', 'sq_colliery_hunter',
      'sq_colliery_f1', 'sq_colliery_f2', 'sq_colliery_f3', 'sq_colliery_f4', 'sq_octo',
      'sq_kestrel_machine', 'sq_nevel_rumor', 'sq_nevel', 'sq_kestrel_arrival', 'sq_kestrel']) route.complete(id);
    expect([...route.party]).toEqual(expect.arrayContaining(['beorn', 'rhosyn', 'octo', 'kestrel']));
    expect(route.flags.has('sq_aquarius_stone')).toBe(true);
    expect(route.flags.has('sq_cancer_stone')).toBe(true);
    expect(route.eligible(step('sq_kestrel_arrival'))).toBe(false);
  });

  it('lets an older temple-complete save discover the machine without replaying stone rewards', () => {
    const route = questRoute();
    for (const f of ['sq_octo', 'sq_nevel', 'sq_flower']) route.flags.add(f);
    route.complete('sq_kestrel_machine');
    expect(route.eligible(step('sq_kestrel_arrival'))).toBe(true);
    expect(route.flags.has('sq_cancer_stone')).toBe(false);
    route.complete('sq_kestrel_arrival');
    route.complete('sq_kestrel');
  });

  it('keeps an already summoned stranger rescuable in an older save', () => {
    const route = questRoute();
    route.flags.add('sq_kestrel_arrived');
    route.complete('sq_kestrel');
    expect(route.party.has('kestrel')).toBe(true);
  });

  it('makes the mining follow-up and both new discoveries obtainable from taverns', () => {
    const first = ERRANDS.get('erCollierySurvey')!;
    const followup = ERRANDS.get('erSealedSurveyRoom')!;
    expect(step('sq_colliery_f4').flags).toEqual(expect.arrayContaining(first.needs!));
    expect(followup.needs).toEqual([first.reward.flag]);
    for (const id of ['erGreyPetrel', 'erFoundryMoulds', 'erCountingLessons', 'erSurveyorsJournal', first.id, followup.id]) {
      const errand = ERRANDS.get(id)!;
      expect(errand.towns.some((town) => NODES.get(town)?.tavern), id).toBe(true);
      for (const job of errand.jobs ?? []) expect(JOBS.has(job), `${id}/${job}`).toBe(true);
      if (errand.reward.artefact) expect(ARTEFACTS.has(errand.reward.artefact), id).toBe(true);
    }
    expect(followup.reward.artefact).toBe('minersSurveyLens');
    expect(ERRANDS.get('erSurveyorsJournal')!.reward.artefact).toBe('wonderHangingArchive');
  });
});

function setup(id: string, level = 38, difficulty: 'easy' | 'normal' | 'hard' = 'normal') {
  const state = newGame('Rhen', [4, 12]);
  for (const unit of state.roster) setLevel(unit, level);
  const def = BATTLES.get(id)!;
  const [x, z] = mapDef(def.map).deploy[0];
  return setupBattle(state, def, [{ unit: state.roster[0], x, z }], { seed: 7, difficulty }).battle;
}

describe('optional battle objectives', () => {
  it('requires the temple guardian emergency restart to be defeated', () => {
    const battle = setup('b_nevel');
    const warden = battle.bySid('warden')!;
    battle.damage(warden, warden.hp);
    battle.fireEvents();
    battle.checkEnd();
    expect(battle.result).toBeNull();
    const index = battle.def.events!.findIndex((e) => 'ko' in e.when && e.when.ko === 'warden');
    for (const c of battle.def.events![index].script) {
      if (c[0] === 'retreat') battle.scriptRetreat(c[1]);
      if (c[0] === 'reveal') battle.scriptReveal(c[1]);
    }
    battle.scriptDone(index);
    battle.checkEnd();
    expect(battle.result).toBeNull();
    const reserve = battle.bySid('wardenReserve')!;
    expect(reserve.hidden).toBe(false);
    expect(reserve.hp).toBe(1);
    battle.damage(reserve, reserve.hp);
    battle.checkEnd();
    expect(battle.result).toBe('victory');
  });

  it('keeps the exhausted reserve at one HP across levels and difficulty', () => {
    for (const level of [1, 38, 99]) for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      expect(setup('b_nevel', level, difficulty).bySid('wardenReserve')!.maxHp).toBe(1);
    }
  });

  it.each([['b_colliery4', 'rhosyn'], ['b_zargid_kestrel', 'aline'], ['b_zargid_kestrel', 'kestrel']])(
    'fails %s if the rescue target %s falls', (id, ward) => {
      const battle = setup(id);
      const target = battle.bySid(ward)!;
      battle.damage(target, target.hp);
      battle.checkEnd();
      expect(battle.result).toBe('defeat');
    },
  );
});
