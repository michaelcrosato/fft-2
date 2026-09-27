import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { MapGrid } from '../src/battle/grid';
import { BattleUnit } from '../src/battle/unit';
import { JOBS, mapDef, NODES } from '../src/data/db';
import {
  atlasEntries,
  bestiaryEntries,
  locationReference,
  monsterReference,
} from '../src/game/reference';
import { createGeneric, createMonster } from '../src/game/roster';
import { newGame } from '../src/game/state';

describe('Chronicle field references', () => {
  it('covers every ordinary species without revealing story bosses', () => {
    const entries = bestiaryEntries();
    expect(entries).toHaveLength(48);
    expect(new Set(entries.map((j) => j.family)).size).toBe(16);
    const state = newGame('Rhen', [4, 12]);
    for (const entry of entries) {
      const text = monsterReference(entry, state);
      expect(text).not.toMatch(/undefined/);
      expect(text).toContain(entry.desc);
      expect(text).toContain('Poaching');
    }
    expect(entries.some((j) => j.id === 'vepar')).toBe(false);
  });

  it('hides unknown roads and updates encounters as the chapter changes', () => {
    const state = newGame('Rhen', [4, 12]);
    expect(
      atlasEntries(state)
        .map((n) => n.id)
        .sort(),
    ).toEqual(['galwyn', 'orvelle']);
    const mandrel = NODES.get('mandrel')!;
    expect(locationReference(NODES.get('galwyn')!, state)).not.toContain(
      'Mandrel Plains',
    );
    expect(monsterReference(JOBS.get('goblin')!, state)).not.toContain(
      'Mandrel Plains',
    );
    state.unlocked.push('mandrel');
    state.chapter = 1;
    expect(monsterReference(JOBS.get('goblin')!, state)).toContain(
      'Mandrel Plains',
    );
    expect(locationReference(mandrel, state)).not.toContain('Red Kwehbo');
    state.chapter = 4;
    expect(locationReference(mandrel, state)).toContain('Red Kwehbo');
    expect(monsterReference(JOBS.get('goblin')!, state)).not.toContain(
      'Mandrel Plains',
    );
  });
});

describe('documented monster secret arts', () => {
  it('requires both the listed level and Beast Lore, including three-art families', () => {
    for (const job of bestiaryEntries()) {
      const [secret, level] = job.monsterSkills!.at(-1)!;
      const unit = new BattleUnit(createMonster(job.id, level), 0, true);
      expect(
        unit.monsterActions(false).some((a) => a.id === secret),
        job.id,
      ).toBe(false);
      expect(
        unit.monsterActions(true).some((a) => a.id === secret),
        job.id,
      ).toBe(true);
      unit.roster.level = level - 1;
      expect(
        unit.monsterActions(true).some((a) => a.id === secret),
        job.id,
      ).toBe(false);
    }
  });

  it('makes the art available only while a living Beast Lore ally is within three tiles', () => {
    const monster = new BattleUnit(createMonster('kwehbo', 20), 0, true);
    monster.x = 3;
    monster.z = 3;
    const ally = new BattleUnit(
      createGeneric({ gender: 'm', job: 'squire', level: 20 }),
      0,
      true,
    );
    ally.roster.support = 'monsterSkill';
    ally.x = 3;
    ally.z = 6;
    const battle = new Battle({
      def: {
        id: 'test',
        name: 'test',
        map: 'training',
        units: [],
        victory: { type: 'defeatAll' },
      },
      grid: new MapGrid(mapDef('training')),
      units: [monster, ally],
      inventory: new Map(),
      seed: 1,
    });
    const knowsSecret = () =>
      battle
        .commandGroups(monster)
        .flatMap((g) => g.abilities)
        .some((a) => a.id === 'kwehCleanse');
    expect(knowsSecret()).toBe(true);
    ally.z = 7;
    expect(knowsSecret()).toBe(false);
    ally.z = 6;
    ally.hp = 0;
    ally.statuses.set('ko', 0);
    expect(knowsSecret()).toBe(false);
    monster.team = 1;
    expect(knowsSecret()).toBe(true);
  });
});
