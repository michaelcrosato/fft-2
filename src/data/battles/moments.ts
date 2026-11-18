import type { BattleDef, UnitSpawn } from '../types';
import type { Battle } from '../../battle/battle';
import { ABILITIES } from '../db';

// Moments: one-turn tactical puzzles for 52in1 rounds of moments. Each opens with the player's unit
// about to act and one goal to clear before the turn passes (or, to defend, until time runs out).
// Each is fair: the same start on every copy, and a sure way to clear it (no hit left to chance),
// which tests/moments.test.ts finds by trying every move and action.

export type MomentKind = 'defeat' | 'reach' | 'collect' | 'defend';

export interface MomentDef {
  /** the hub:moment id */
  id: string;
  /** the hub:moment verb */
  verb: 'defeat' | 'climb' | 'collect' | 'defend';
  /** seconds the moment lasts (the hub's limit) */
  seconds: number;
  /** the goal in the hub:moment tag (at most 60 characters); the game shows its own line, moments.<id>.goal */
  goal: string;
  kind: MomentKind;
  battle: BattleDef;
  company: UnitSpawn[];
  items: Record<string, number>;
  /** the unit (sid) whose turn opens the moment */
  first: string;
  /** defeat: the foe to knock out; defend: the ward to keep standing */
  target?: string;
  /** reach and collect: the cells that clear it */
  cells?: Array<[number, number]>;
  /** last touches once the battle is built: a spell already charging, a chest on the ground */
  prepare?(b: Battle): void;
}

const ally = (s: UnitSpawn): UnitSpawn => ({ team: 0, ...s });
const foe = (s: UnitSpawn): UnitSpawn => ({ team: 1, ...s });
// fixed gear for humans: no shield and no mantle unless the puzzle wants them
const LIGHT = { head: 'leatherCap', body: 'leatherClothes', accessory: 'battleBoots' };

export const MOMENTS: MomentDef[] = [
  {
    id: 'archer-strike', verb: 'defeat', seconds: 20, kind: 'defeat',
    goal: 'Knock out the enemy archer this turn',
    first: 'hero', target: 'archer',
    battle: {
      id: 'moment_archer', name: 'The Archer on the Rise', map: 'training', music: 'battle1',
      units: [
        foe({ id: 'archer', job: 'archer', gender: 'm', name: 'Watch Archer', level: 8, at: [8, 1], facing: 'S', hpMult: 0.35, equip: { rhand: 'longbow', ...LIGHT }, learned: ['aim1'] }),
        foe({ id: 'guard1', job: 'squire', gender: 'm', name: 'Watch Guard', level: 8, at: [7, 2], facing: 'S', equip: { rhand: 'broadsword', ...LIGHT }, learned: ['rush'] }),
        foe({ id: 'guard2', job: 'squire', gender: 'f', name: 'Watch Guard', level: 8, at: [9, 3], facing: 'S', equip: { rhand: 'broadsword', ...LIGHT }, learned: ['rush'] }),
      ],
      victory: { type: 'defeat', ids: ['archer'] },
    },
    company: [
      ally({ id: 'hero', job: 'knight', gender: 'f', name: 'Maud', level: 9, at: [6, 4], facing: 'N', equip: { rhand: 'ironSword', lhand: 'buckler', head: 'bronzeHelmet', body: 'bronzeArmor', accessory: 'battleBoots' }, learned: ['sunderArmor'] }),
    ],
    items: {},
  },
  {
    id: 'spell-break', verb: 'defeat', seconds: 25, kind: 'defeat',
    goal: 'Defeat the wizard before his spell lands',
    first: 'hero', target: 'wizard',
    battle: {
      id: 'moment_spell', name: 'The Spell in the Dunes', map: 'rand_zekla', music: 'battle3',
      units: [
        foe({ id: 'wizard', job: 'wizard', gender: 'm', name: 'Dune Wizard', level: 9, at: [6, 6], facing: 'W', hpMult: 0.45, equip: { rhand: 'rod', head: 'leatherCap', body: 'linenRobe', accessory: 'battleBoots' }, learned: ['fira'] }),
        foe({ id: 'guard1', job: 'knight', gender: 'm', name: 'Dune Guard', level: 8, at: [5, 7], facing: 'W', equip: { rhand: 'longsword', head: 'leatherHelmet', body: 'leatherArmor', accessory: 'battleBoots' }, learned: [] }),
        foe({ id: 'guard2', job: 'archer', gender: 'f', name: 'Dune Archer', level: 8, at: [8, 4], facing: 'W', equip: { rhand: 'longbow', ...LIGHT }, learned: [] }),
      ],
      victory: { type: 'defeat', ids: ['wizard'] },
    },
    company: [
      ally({ id: 'hero', job: 'thief', gender: 'm', name: 'Nell', level: 9, at: [2, 8], facing: 'E', equip: { rhand: 'mythrilKnife', head: 'plumedHat', body: 'leatherVest', accessory: 'battleBoots' }, learned: ['stealGil'] }),
      ally({ id: 'ward', job: 'priest', gender: 'f', name: 'Ysolde', level: 7, at: [0, 9], facing: 'E', equip: { rhand: 'oakStaff', head: 'redHood', body: 'linenRobe', accessory: 'battleBoots' }, learned: ['cure'] }),
    ],
    items: {},
    prepare(b) {
      // the wizard is already gathering Fira on the company's priest
      const w = b.bySid('wizard'), ward = b.bySid('ward');
      const fira = ABILITIES.get('fira');
      if (!w || !ward || !fira) return;
      w.charging = { ability: fira, x: ward.x, z: ward.z, targetUid: ward.uid, ctLeft: 20 };
      w.statuses.set('charging', 0);
    },
  },
  {
    id: 'bell-tower', verb: 'climb', seconds: 15, kind: 'reach',
    goal: 'Climb to the top of the stone tower in one move',
    first: 'hero', cells: [[6, 5], [7, 5], [6, 6], [7, 6]],
    battle: {
      id: 'moment_tower', name: 'The Stone Tower', map: 'rand_lenara', music: 'heroic',
      units: [
        foe({ id: 'f1', job: 'goblin', name: 'Goblin', level: 6, at: [9, 2], facing: 'S' }),
        foe({ id: 'f2', job: 'goblin', name: 'Goblin', level: 6, at: [10, 3], facing: 'S' }),
      ],
      victory: { type: 'reach', cells: [[6, 5], [7, 5], [6, 6], [7, 6]] },
    },
    company: [
      ally({ id: 'hero', job: 'thief', gender: 'f', name: 'Nell', level: 9, at: [4, 8], facing: 'N', equip: { rhand: 'mythrilKnife', head: 'plumedHat', body: 'leatherVest', accessory: 'spikedBoots' }, learned: ['stealGil'] }),
    ],
    items: {},
  },
  {
    id: 'hold-the-gate', verb: 'defend', seconds: 30, kind: 'defend',
    goal: 'Keep the wounded squire standing until time runs out',
    first: 'hero', target: 'ward',
    battle: {
      id: 'moment_gate', name: 'The Wounded Squire', map: 'training', music: 'tension',
      units: [
        { id: 'ward', job: 'squire', gender: 'm', name: 'Wounded Squire', level: 7, at: [4, 8], facing: 'N', team: 0, vip: true, ai: 'coward', equip: { rhand: 'broadsword', ...LIGHT }, learned: [] },
        foe({ id: 'f1', job: 'goblin', name: 'Goblin', level: 7, at: [4, 3], facing: 'S' }),
        foe({ id: 'f2', job: 'squire', gender: 'm', name: 'Brigand', level: 7, at: [6, 3], facing: 'S', equip: { rhand: 'broadsword', ...LIGHT }, learned: ['rush'] }),
        foe({ id: 'f3', job: 'archer', gender: 'f', name: 'Brigand Archer', level: 7, at: [8, 1], facing: 'S', equip: { rhand: 'longbow', ...LIGHT }, learned: [] }),
      ],
      victory: { type: 'defeatAll' },
      protect: ['ward'],
    },
    company: [
      ally({ id: 'hero', job: 'knight', gender: 'm', name: 'Aldric', level: 9, at: [4, 7], facing: 'N', equip: { rhand: 'ironSword', lhand: 'buckler', head: 'bronzeHelmet', body: 'bronzeArmor', accessory: 'battleBoots' }, learned: ['sunderArmor', 'sunderPower'] }),
      ally({ id: 'healer', job: 'priest', gender: 'f', name: 'Ysolde', level: 9, at: [3, 9], facing: 'N', equip: { rhand: 'whiteStaff', head: 'redHood', body: 'silkRobe', accessory: 'battleBoots' }, learned: ['cure', 'cura', 'protect'] }),
    ],
    items: { potion: 3, hiPotion: 1 },
    prepare(b) {
      // the squire is badly hurt: one more blow could fell him
      const w = b.bySid('ward');
      if (w) { w.hp = Math.max(1, Math.floor(w.maxHp * 0.3)); b.updateCritical(w); }
    },
  },
  {
    id: 'last-chest', verb: 'collect', seconds: 20, kind: 'collect',
    goal: 'Open the treasure chest before it is lost',
    first: 'hero', cells: [[8, 3]],
    battle: {
      id: 'moment_chest', name: 'The Chest by the Stream', map: 'rand_swiggle', music: 'battle2',
      units: [
        foe({ id: 'chest', job: 'goblin', name: 'Goblin', level: 6, at: [8, 3], facing: 'S' }),
        foe({ id: 'f1', job: 'goblin', name: 'Goblin', level: 7, at: [9, 1], facing: 'S' }),
        foe({ id: 'f2', job: 'redPanther', name: 'Red Panther', level: 7, at: [10, 6], facing: 'W' }),
      ],
      victory: { type: 'reach', cells: [[8, 3]] },
    },
    company: [
      ally({ id: 'hero', job: 'thief', gender: 'm', name: 'Pell', level: 9, at: [5, 5], facing: 'E', equip: { rhand: 'mythrilKnife', head: 'plumedHat', body: 'leatherVest', accessory: 'battleBoots' }, learned: ['stealGil'] }),
    ],
    items: {},
    prepare(b) {
      // a goblin fell here last turn: its chest waits on the ground
      const g = b.bySid('chest');
      if (!g) return;
      g.hp = 0;
      g.statuses.clear();
      g.statuses.set('treasure', 0);
      b.pickups.set(b.grid.idx(g.x, g.z), { kind: 'chest', unit: g, item: 'hiPotion' });
    },
  },
];

// the company stands where it is placed: those are the battle's deploy cells
for (const x of MOMENTS) x.battle.deploy ??= x.company.map((c) => c.at);

export const battles: BattleDef[] = MOMENTS.map((m) => m.battle);
