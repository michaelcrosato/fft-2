// The Gentle option reaches the battle through setupBattle (it used to be patched onto the battle
// afterwards, past its read-only field), and a fallen member then withdraws instead of crystallizing.
import { describe, expect, it } from 'vitest';
import { BATTLES } from '../src/data/db';
import { newGame } from '../src/game/state';
import { setupBattle } from '../src/game/setup';

describe('Gentle option', () => {
  it('is passed to the battle by setupBattle', () => {
    const def = BATTLES.get('b_training')!;
    const state = newGame('Rhen', [4, 12], 7);
    const party = [{ unit: state.roster[0], x: def.deploy?.[0]?.[0] ?? 3, z: def.deploy?.[0]?.[1] ?? 8 }];
    expect(setupBattle(state, def, party, { seed: 1 }).battle.gentle).toBe(false);
    expect(setupBattle(state, def, party, { seed: 1, gentle: true }).battle.gentle).toBe(true);
  });
});
