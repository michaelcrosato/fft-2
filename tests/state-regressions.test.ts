import { afterEach, describe, expect, it, vi } from 'vitest';
import { BATTLES, ERRANDS, NODES, mapDef } from '../src/data/db';
import { Rng } from '../src/core/rng';
import {
  advanceDay, deleteSave, errandAptitude, joinCharacter, latestSave, leaveCharacter, listSaves,
  loadGame, newGame, saveGame,
} from '../src/game/state';
import { addExp, setLevel } from '../src/game/roster';
import { applyResults, setupBattle } from '../src/game/setup';
import { randomBattleDef } from '../src/game/flow';
import type { Game } from '../src/game/game';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function memoryStorage() {
  const slots = new Map<string, string>();
  const storage = {
    getItem: (key: string) => slots.get(key) ?? null,
    setItem: (key: string, value: string) => { slots.set(key, value); },
    removeItem: (key: string) => { slots.delete(key); },
  };
  vi.stubGlobal('window', { localStorage: storage });
  return { slots, storage };
}

describe('save compatibility and corruption handling', () => {
  it('round-trips the company, including a returning companion and active errands', () => {
    memoryStorage();
    const state = newGame('Ada', [9, 1], 7);
    joinCharacter(state, 'adria');
    const adria = state.roster.find((u) => u.charId === 'adria')!;
    adria.jp.knight = 777;
    adria.learned.push('equipSword');
    leaveCharacter(state, 'adria');
    const worker = state.roster[1];
    worker.errand = 'erCollierySurvey';
    state.errands.push({ id: worker.errand, units: [worker.uid], start: state.day, due: state.day + 8 });
    expect(saveGame(state, 2)).toBe(true);
    const restored = loadGame(2)!;
    expect(restored).toEqual(state);
    joinCharacter(restored, 'adria');
    const returned = restored.roster.find((u) => u.charId === 'adria')!;
    expect(returned.uid).toBe(adria.uid);
    expect(returned.jp.knight).toBe(777);
    expect(returned.learned).toContain('equipSword');
    expect(restored.away?.adria).toBeUndefined();
    expect(restored.errands[0].units).toEqual([worker.uid]);
    expect(latestSave()).toBe(2);
  });

  it('migrates older optional fields for active and away companions', () => {
    const { slots } = memoryStorage();
    const state = newGame('Rhen', [4, 12], 3);
    joinCharacter(state, 'adria');
    leaveCharacter(state, 'adria');
    const old = JSON.parse(JSON.stringify(state));
    for (const key of ['met', 'furStock', 'rumorsRead', 'sideDone', 'artefacts', 'errands', 'errandsDone', 'chronicle']) delete old[key];
    for (const unit of [...old.roster, old.away.adria]) {
      for (const key of ['uid', 'learned', 'jp', 'totalJp', 'equip']) delete unit[key];
    }
    slots.set('fft-fealty-save-0', JSON.stringify(old));
    const migrated = loadGame(0)!;
    expect(migrated).not.toBeNull();
    expect(migrated.errands).toEqual([]);
    for (const unit of [...migrated.roster, migrated.away!.adria]) {
      expect(unit.uid).toEqual(expect.any(String));
      expect(unit.learned).toEqual([]);
      expect(unit.equip).toEqual({});
    }
    expect(new Set(migrated.roster.map((u) => u.uid)).size).toBe(migrated.roster.length);
  });

  it('keeps title/save operations usable when storage denies reads or writes', () => {
    const { storage } = memoryStorage();
    const deny = () => { throw new DOMException('Storage disabled', 'SecurityError'); };
    vi.spyOn(storage, 'getItem').mockImplementation(deny);
    vi.spyOn(storage, 'setItem').mockImplementation(deny);
    vi.spyOn(storage, 'removeItem').mockImplementation(deny);
    expect(loadGame(0)).toBeNull();
    expect(listSaves()).toEqual(Array(8).fill(null));
    expect(latestSave()).toBeNull();
    const state = newGame('Rhen', [4, 12]);
    expect(saveGame(state, 0)).toBe(false);
    expect(state.savedAt).toBeUndefined();
    expect(deleteSave(0)).toBe(false);
    vi.stubGlobal('window', { get localStorage() { return deny(); } });
    expect(loadGame(0)).toBeNull();
    expect(saveGame(state, 0)).toBe(false);
  });

  it('rejects valid JSON with broken game state while preserving healthy slots', () => {
    const { slots } = memoryStorage();
    const state = newGame('Rhen', [4, 12], 3);
    expect(saveGame(state, 7)).toBe(true);
    const corruptions: unknown[] = [
      null, {}, { ...state, roster: [] }, { ...state, inventory: null },
      { ...state, flags: [] }, { ...state, unlocked: 'galwyn' },
      { ...state, location: 'missing-map' }, { ...state, storyIndex: -1 },
      { ...state, roster: [{ ...state.roster[0], raw: {} }] },
      { ...state, roster: [{ ...state.roster[0], job: 'missing-job' }] },
      { ...state, errands: [{ id: 'erCollierySurvey', units: null, due: 2 }] },
      { ...state, away: { adria: {} } },
    ];
    for (const value of corruptions) {
      slots.set('fft-fealty-save-0', JSON.stringify(value));
      expect(loadGame(0)).toBeNull();
      expect(listSaves()[0]).toBeNull();
      expect(latestSave()).toBe(7);
    }
    slots.set('fft-fealty-save-0', '{truncated');
    expect(loadGame(0)).toBeNull();
  });
});

describe('errand rewards', () => {
  it('levels returning soldiers immediately and grants each completion once', () => {
    const state = newGame('Rhen', [4, 12], 2);
    const worker = state.roster[1];
    worker.exp = 85;
    const expected = structuredClone(worker);
    setLevel(expected, worker.level + 1);
    const errand = ERRANDS.get('erCollierySurvey')!;
    const beforeGil = state.gil;
    const beforeJp = worker.jp[worker.job];
    worker.errand = errand.id;
    state.errands.push({ id: errand.id, units: [worker.uid], start: state.day, due: state.day + 2 });
    const rng = new Rng(42);
    vi.spyOn(rng, 'pct').mockReturnValue(true);
    expect(advanceDay(state, 1, rng)).toEqual([]);
    expect(worker.errand).toBe(errand.id);
    expect(advanceDay(state, 1, rng)).toEqual([{ id: errand.id, success: true }]);
    expect(worker.errand).toBeUndefined();
    expect(worker.level).toBe(expected.level);
    expect(worker.raw).toEqual(expected.raw);
    expect(worker.exp).toBe(15);
    expect(worker.jp[worker.job]).toBe(beforeJp + errand.reward.jp!);
    expect(state.flags[errand.reward.flag!]).toBe(true);
    expect(state.gil).toBe(beforeGil + errand.reward.gil);
    expect(state.errandsDone).toEqual([errand.id]);
    expect(advanceDay(state, 10, rng)).toEqual([]);
    expect(state.gil).toBe(beforeGil + errand.reward.gil);
  });

  it('scores PA, MA and Speed errands by those stats, not a flat value', () => {
    const errand = [...ERRANDS.values()].find((e) => e.stat === 'pa')!;
    const unit = newGame('Rhen', [4, 12], 4).roster[1];
    const strong = structuredClone(unit), weak = structuredClone(unit);
    strong.uid = 'strong'; weak.uid = 'weak';
    strong.raw.pa *= 3; weak.raw.pa = Math.floor(weak.raw.pa / 3);
    expect(errandAptitude(strong, 'pa')).toBeGreaterThan(errandAptitude(weak, 'pa'));
    const chance = (u: typeof unit) => {
      const rng = new Rng(1);
      const pct = vi.spyOn(rng, 'pct');
      const state = newGame('Rhen', [4, 12], 4);
      state.roster.push(u);
      state.errands.push({ id: errand.id, units: [u.uid], start: state.day, due: state.day + 1 });
      advanceDay(state, 1, rng);
      return pct.mock.calls[0][0];
    };
    expect(chance(strong)).toBeGreaterThan(chance(weak));
  });

  it('cannot earn rewards after every dispatched soldier has left the roster', () => {
    const state = newGame('Rhen', [4, 12], 3);
    const beforeGil = state.gil;
    state.errands.push({ id: 'erCollierySurvey', units: ['missing-recruit'], start: 1, due: 2 });
    const rng = new Rng(42);
    vi.spyOn(rng, 'pct').mockReturnValue(true);
    expect(advanceDay(state, 1, rng)).toEqual([{ id: 'erCollierySurvey', success: false }]);
    expect(state.gil).toBe(beforeGil);
    expect(state.errandsDone).toEqual([]);
    expect(state.errands).toEqual([]);
  });

  it('caps EXP at the maximum level without growing stats beyond level 99', () => {
    const unit = newGame('Rhen', [4, 12], 3).roster[1];
    setLevel(unit, 99);
    unit.exp = 90;
    const raw = { ...unit.raw };
    addExp(unit, 30);
    expect(unit.level).toBe(99);
    expect(unit.exp).toBe(99);
    expect(unit.raw).toEqual(raw);
  });
});

describe('battle result ownership', () => {
  function scenario() {
    const state = newGame('Rhen', [4, 12], 3);
    const def = BATTLES.get('b_galwyn')!;
    const cells = mapDef(def.map).deploy;
    const setup = setupBattle(state, def, state.roster.slice(0, 2).map((unit, i) => ({ unit, x: cells[i][0], z: cells[i][1] })), { seed: 3 });
    const b = setup.battle;
    const recruit = b.units.find((u) => u.baseTeam === 1 && !u.roster.charId)!;
    const soldier = b.units.find((u) => u.roster.uid === state.roster[1].uid)!;
    return { state, setup, b, recruit, soldier };
  }

  it('does not keep a recruit who permanently returned to the enemy', () => {
    const { state, setup, b, recruit } = scenario();
    recruit.baseTeam = 0; recruit.team = 0; recruit.controlled = true;
    b.invited.push(recruit);
    recruit.baseTeam = 1; recruit.team = 1; recruit.controlled = false;
    b.result = 'victory';
    const results = applyResults(state, b, setup);
    expect(state.roster).not.toContain(recruit.roster);
    expect(results.recruited).toEqual([]);
  });

  it('keeps temporary charm separate from a soldier permanently changing sides', () => {
    const { state, setup, b, recruit, soldier } = scenario();
    recruit.baseTeam = 0; recruit.team = 0; recruit.controlled = true;
    b.invited.push(recruit, recruit);
    b.addStatus(recruit, 'charm');
    expect(recruit.team).toBe(1);
    soldier.baseTeam = 1; soldier.team = 1; soldier.controlled = false;
    b.result = 'victory';
    const results = applyResults(state, b, setup);
    expect(state.roster).toContain(recruit.roster);
    expect(state.roster).not.toContain(soldier.roster);
    expect(results.recruited).toEqual([recruit.roster]);
    expect(results.defected).toBe(1);
    expect(results.lost).toBe(0);
  });
});

describe('random encounter levels', () => {
  it('spawns weaker random foes with a real negative offset', () => {
    const state = newGame('Rhen', [4, 12], 2);
    for (const unit of state.roster) setLevel(unit, 20);
    state.chapter = 1;
    let lowerEnemies = 0;
    for (let day = 1; day <= 20; day++) {
      state.day = day;
      const def = randomBattleDef({ state } as Game, NODES.get('mandrel')!)!;
      const { battle } = setupBattle(state, def, [], { seed: 3, difficulty: 'normal' });
      for (let i = 0; i < def.units.length; i++) {
        const offset = Number(def.units[i].level);
        expect(Number.isFinite(offset), String(def.units[i].level)).toBe(true);
        expect(battle.units[i].level).toBe(19 + offset);
        if (offset < 0) lowerEnemies++;
      }
    }
    expect(lowerEnemies).toBeGreaterThan(0);
  });
});
