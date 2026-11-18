// A Trial or a Moment as a running battle: the fixed company, its bag and the foes, set up from one
// seed so that every copy in a 52in1 session, and every run of tools/simtrials.ts, starts the same.
import type { BattleDef, UnitSpawn } from '../data/types';
import type { MomentDef } from '../data/battles/moments';
import { Rng } from '../core/rng';
import { newGame, type GameState } from './state';
import { setupBattle, spawnRoster, type BattleSetup, type DeployChoice } from './setup';

export interface PresetBattle {
  battle: BattleDef;
  company: UnitSpawn[];
  items: Record<string, number>;
}

/** The shop tier gear is drawn from when a spawn leaves a slot empty (presets fill every slot). */
const TIER = 3;

/** The game state, company and running battle for a preset, all drawn from `seed`. */
export function presetBattle(p: PresetBattle, seed: number): { state: GameState; party: DeployChoice[]; setup: BattleSetup } {
  const rng = new Rng(seed >>> 0);
  const state = newGame('', [1, 1], rng.int(1, 2 ** 31));
  state.tier = TIER;
  state.gil = 0;
  state.inventory = { ...p.items };
  const party: DeployChoice[] = p.company.map((sp) => ({ unit: spawnRoster(sp, sp.level as number, TIER, rng), x: sp.at[0], z: sp.at[1] }));
  state.roster = party.map((c) => c.unit);
  // a knocked-out member leaves the field rather than turning to crystal: nothing to pick up
  (state as GameState & { __gentle?: boolean }).__gentle = true;
  const setup = setupBattle(state, p.battle, party, { seed: rng.int(1, 1e9), difficulty: 'normal' });
  // the company answers to the ids its spawns give (a moment's goal names them)
  party.forEach((c, i) => { const id = p.company[i].id; const u = setup.battle.units.find((o) => o.roster === c.unit); if (id && u) u.sid = id; });
  return { state, party, setup };
}

/** A moment, built and set: its last touches made, and its first unit about to act. */
export function presetMoment(m: MomentDef, seed: number) {
  const r = presetBattle(m, seed);
  const b = r.setup.battle;
  m.prepare?.(b);
  for (const u of b.units) u.ct = u.sid === m.first ? 100 : Math.min(u.ct, 50);
  return r;
}
