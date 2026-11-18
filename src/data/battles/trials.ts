import type { BattleDef, UnitSpawn } from '../types';

// Trials: short battles for 52in1 sessions (parallel mode). Every player gets the same company
// on the same field against the same foes; the quickest victory wins the round. Everything is
// fixed (levels, jobs, gear, abilities, places) so no copy differs and no draw decides the start.
// `npx vite-node tools/simtrials.ts` plays each one AI against AI to keep them winnable.

export interface TrialDef {
  /** the battle (foes only, in `units`); registered with the other battles */
  battle: BattleDef;
  /** the player's company, team 0, each on one of the field's deploy cells */
  company: UnitSpawn[];
  /** the company's bag */
  items: Record<string, number>;
}

const BAG = { potion: 4, hiPotion: 2, phoenixDown: 2, ether: 2 };

// a foe with no shield and no mantle, fixed gear and abilities
const foe = (s: UnitSpawn): UnitSpawn => ({ team: 1, ...s });
const ally = (s: UnitSpawn): UnitSpawn => ({ team: 0, ...s });

export const TRIALS: TrialDef[] = [
  {
    battle: {
      id: 'trial_barley', name: 'Trial of the Barley Road', map: 'rand_mandrel', music: 'battle1',
      units: [
        foe({ id: 'f1', job: 'squire', gender: 'm', name: 'Deserter', level: 7, at: [3, 10], facing: 'N', equip: { rhand: 'longsword', head: 'leatherHelmet', body: 'leatherArmor', accessory: 'battleBoots' }, learned: ['rush', 'stoneToss'] }),
        foe({ id: 'f2', job: 'squire', gender: 'f', name: 'Deserter', level: 7, at: [5, 11], facing: 'N', equip: { rhand: 'broadsword', head: 'leatherCap', body: 'leatherClothes', accessory: 'battleBoots' }, learned: ['rush'] }),
        foe({ id: 'f3', job: 'archer', gender: 'm', name: 'Deserter Bowman', level: 7, at: [0, 10], facing: 'N', equip: { rhand: 'longbow', head: 'plumedHat', body: 'leatherClothes', accessory: 'battleBoots' }, learned: ['aim1'] }),
        foe({ id: 'f4', job: 'chemist', gender: 'f', name: 'Camp Chemist', level: 7, at: [2, 12], facing: 'N', equip: { rhand: 'dagger', head: 'leatherCap', body: 'leatherClothes', accessory: 'battleBoots' }, learned: ['usePotion', 'usePhoenixDown'], ai: 'support' }),
        foe({ id: 'f5', job: 'wizard', gender: 'm', name: 'Hedge Wizard', level: 7, at: [1, 11], facing: 'N', equip: { rhand: 'rod', head: 'leatherCap', body: 'linenRobe', accessory: 'battleBoots' }, learned: ['fire', 'thunder'] }),
      ],
      victory: { type: 'defeatAll' },
      hint: 'Five deserters hold the gully. Strike from behind.',
    },
    company: [
      ally({ job: 'knight', gender: 'm', name: 'Aldric', level: 8, at: [9, 0], equip: { rhand: 'ironSword', lhand: 'buckler', head: 'bronzeHelmet', body: 'bronzeArmor', accessory: 'battleBoots' }, learned: ['sunderArmor', 'sunderSpeed'] }),
      ally({ job: 'archer', gender: 'f', name: 'Wren', level: 8, at: [10, 0], equip: { rhand: 'longbow', head: 'plumedHat', body: 'leatherVest', accessory: 'battleBoots' }, learned: ['aim1', 'aim2'] }),
      ally({ job: 'priest', gender: 'f', name: 'Ysolde', level: 8, at: [9, 1], equip: { rhand: 'whiteStaff', head: 'redHood', body: 'silkRobe', accessory: 'battleBoots' }, learned: ['cure', 'cura', 'raise', 'protect'] }),
      ally({ job: 'wizard', gender: 'm', name: 'Corvin', level: 8, at: [9, 2], equip: { rhand: 'flameRod', head: 'redHood', body: 'silkRobe', accessory: 'battleBoots' }, learned: ['fire', 'thunder', 'blizzard', 'fira'] }),
    ],
    items: BAG,
  },
  {
    battle: {
      id: 'trial_woods', name: 'Trial of the Brown Stream', map: 'rand_swiggle', music: 'battle2',
      units: [
        foe({ id: 'f1', job: 'goblin', name: 'Goblin', level: 7, at: [8, 1], facing: 'S' }),
        foe({ id: 'f2', job: 'goblin', name: 'Goblin', level: 7, at: [7, 2], facing: 'S' }),
        foe({ id: 'f3', job: 'hobgoblin', name: 'Hobgoblin', level: 8, at: [8, 3], facing: 'S' }),
        foe({ id: 'f4', job: 'redPanther', name: 'Red Panther', level: 7, at: [9, 3], facing: 'S' }),
        foe({ id: 'f5', job: 'bomb', name: 'Bomb', level: 7, at: [10, 4], facing: 'S' }),
      ],
      victory: { type: 'defeatAll' },
      hint: 'Beasts of the beechwood. The bomb bursts when it is hurt badly.',
    },
    company: [
      ally({ job: 'monk', gender: 'm', name: 'Tobin', level: 8, at: [1, 10], equip: { head: 'redHood', body: 'leatherVest', accessory: 'battleBoots' }, learned: ['spinningFist', 'aurablast', 'chakra'] }),
      ally({ job: 'thief', gender: 'f', name: 'Nell', level: 8, at: [2, 10], equip: { rhand: 'mythrilKnife', head: 'plumedHat', body: 'leatherVest', accessory: 'battleBoots' }, learned: ['stealGil', 'stealHeart'] }),
      ally({ job: 'priest', gender: 'm', name: 'Benedek', level: 8, at: [3, 10], equip: { rhand: 'whiteStaff', head: 'redHood', body: 'silkRobe', accessory: 'battleBoots' }, learned: ['cure', 'cura', 'raise', 'protect'] }),
      ally({ job: 'knight', gender: 'f', name: 'Maud', level: 8, at: [1, 8], equip: { rhand: 'ironSword', lhand: 'buckler', head: 'bronzeHelmet', body: 'bronzeArmor', accessory: 'battleBoots' }, learned: ['sunderArmor', 'sunderPower'] }),
    ],
    items: BAG,
  },
  {
    battle: {
      id: 'trial_dunes', name: 'Trial of the Bleached Dunes', map: 'rand_zekla', music: 'battle3',
      time: 'dusk',
      units: [
        foe({ id: 'f1', job: 'skeleton', name: 'Skeleton', level: 9, at: [9, 6], facing: 'W' }),
        foe({ id: 'f2', job: 'skeleton', name: 'Skeleton', level: 9, at: [10, 7], facing: 'W' }),
        foe({ id: 'f3', job: 'ghoul', name: 'Ghoul', level: 9, at: [8, 5], facing: 'W' }),
        foe({ id: 'f4', job: 'bonesnatch', name: 'Bonesnatch', level: 10, at: [11, 6], facing: 'W' }),
        foe({ id: 'f5', job: 'revenant', name: 'Revenant', level: 9, at: [10, 5], facing: 'W' }),
      ],
      victory: { type: 'defeatAll' },
      hint: 'The restless dead. Fire burns them, and healing magic sears them.',
    },
    company: [
      ally({ job: 'knight', gender: 'm', name: 'Aldric', level: 8, at: [0, 8], equip: { rhand: 'ironSword', lhand: 'buckler', head: 'bronzeHelmet', body: 'bronzeArmor', accessory: 'battleBoots' }, learned: ['sunderArmor', 'sunderSpeed'] }),
      ally({ job: 'monk', gender: 'f', name: 'Ilse', level: 8, at: [1, 8], equip: { head: 'redHood', body: 'leatherVest', accessory: 'battleBoots' }, learned: ['spinningFist', 'aurablast', 'chakra'] }),
      ally({ job: 'priest', gender: 'f', name: 'Ysolde', level: 8, at: [0, 9], equip: { rhand: 'whiteStaff', head: 'redHood', body: 'silkRobe', accessory: 'battleBoots' }, learned: ['cure', 'cura', 'raise', 'protect'] }),
      ally({ job: 'wizard', gender: 'm', name: 'Corvin', level: 8, at: [1, 9], equip: { rhand: 'flameRod', head: 'redHood', body: 'silkRobe', accessory: 'battleBoots' }, learned: ['fire', 'thunder', 'blizzard', 'fira'] }),
    ],
    items: BAG,
  },
  {
    battle: {
      id: 'trial_heather', name: 'Trial of the Heather Hill', map: 'rand_lenara', music: 'battle1',
      units: [
        foe({ id: 'f1', job: 'knight', gender: 'm', name: 'Hired Blade', level: 7, at: [8, 3], facing: 'S', equip: { rhand: 'longsword', head: 'leatherHelmet', body: 'leatherArmor', accessory: 'battleBoots' }, learned: ['sunderArmor'] }),
        foe({ id: 'f2', job: 'archer', gender: 'f', name: 'Hired Bow', level: 7, at: [10, 1], facing: 'S', equip: { rhand: 'longbow', head: 'plumedHat', body: 'leatherClothes', accessory: 'battleBoots' }, learned: ['aim1'] }),
        foe({ id: 'f3', job: 'wizard', gender: 'm', name: 'Hired Wizard', level: 7, at: [9, 2], facing: 'S', equip: { rhand: 'rod', head: 'leatherCap', body: 'linenRobe', accessory: 'battleBoots' }, learned: ['fire', 'blizzard'] }),
        foe({ id: 'f4', job: 'priest', gender: 'f', name: 'Hired Priest', level: 7, at: [8, 1], facing: 'S', equip: { rhand: 'oakStaff', head: 'leatherCap', body: 'linenRobe', accessory: 'battleBoots' }, learned: ['cure'], ai: 'support' }),
        foe({ id: 'f5', job: 'thief', gender: 'm', name: 'Hired Knife', level: 7, at: [7, 4], facing: 'S', equip: { rhand: 'dagger', head: 'leatherCap', body: 'leatherClothes', accessory: 'battleBoots' }, learned: ['stealGil'] }),
      ],
      victory: { type: 'defeatAll' },
      hint: 'Sellswords on the high ground. Bring down their healer first.',
    },
    company: [
      ally({ job: 'knight', gender: 'f', name: 'Maud', level: 8, at: [0, 10], equip: { rhand: 'ironSword', lhand: 'buckler', head: 'bronzeHelmet', body: 'bronzeArmor', accessory: 'battleBoots' }, learned: ['sunderArmor', 'sunderPower'] }),
      ally({ job: 'archer', gender: 'm', name: 'Fenn', level: 8, at: [1, 10], equip: { rhand: 'longbow', head: 'plumedHat', body: 'leatherVest', accessory: 'battleBoots' }, learned: ['aim1', 'aim2'] }),
      ally({ job: 'timeMage', gender: 'f', name: 'Odile', level: 8, at: [0, 11], equip: { rhand: 'whiteStaff', head: 'redHood', body: 'silkRobe', accessory: 'battleBoots' }, learned: ['haste', 'slow', 'immobilize'] }),
      ally({ job: 'chemist', gender: 'm', name: 'Pell', level: 8, at: [1, 11], equip: { rhand: 'mythrilKnife', head: 'plumedHat', body: 'leatherVest', accessory: 'battleBoots' }, learned: ['usePotion', 'useHiPotion', 'usePhoenixDown', 'useEther'] }),
    ],
    items: { potion: 6, hiPotion: 3, phoenixDown: 3, ether: 2 },
  },
  {
    battle: {
      id: 'trial_yews', name: 'Trial of the Yew Grove', map: 'rand_yewgrove', music: 'battle2',
      units: [
        foe({ id: 'f1', job: 'woodman', name: 'Woodman', level: 9, at: [5, 2], facing: 'S' }),
        foe({ id: 'f2', job: 'boarlet', name: 'Boarlet', level: 8, at: [6, 3], facing: 'S' }),
        foe({ id: 'f3', job: 'boarlet', name: 'Boarlet', level: 8, at: [3, 3], facing: 'S' }),
        foe({ id: 'f4', job: 'floateye', name: 'Floateye', level: 8, at: [9, 3], facing: 'S' }),
        foe({ id: 'f5', job: 'kwehbo', name: 'Wild Kwehbo', level: 8, at: [7, 2], facing: 'S' }),
        foe({ id: 'f6', job: 'porky', name: 'Porky', level: 8, at: [4, 2], facing: 'S' }),
      ],
      victory: { type: 'defeatAll' },
      hint: 'Wild things of the grove. The Woodman fears fire.',
    },
    company: [
      ally({ job: 'knight', gender: 'm', name: 'Aldric', level: 8, at: [3, 11], equip: { rhand: 'ironSword', lhand: 'buckler', head: 'bronzeHelmet', body: 'bronzeArmor', accessory: 'battleBoots' }, learned: ['sunderArmor', 'sunderSpeed'] }),
      ally({ job: 'thief', gender: 'f', name: 'Nell', level: 8, at: [4, 11], equip: { rhand: 'mythrilKnife', head: 'plumedHat', body: 'leatherVest', accessory: 'battleBoots' }, learned: ['stealGil', 'stealHeart'] }),
      ally({ job: 'priest', gender: 'm', name: 'Benedek', level: 8, at: [6, 11], equip: { rhand: 'whiteStaff', head: 'redHood', body: 'silkRobe', accessory: 'battleBoots' }, learned: ['cure', 'cura', 'raise', 'protect'] }),
      ally({ job: 'wizard', gender: 'f', name: 'Esme', level: 8, at: [7, 11], equip: { rhand: 'flameRod', head: 'redHood', body: 'silkRobe', accessory: 'battleBoots' }, learned: ['fire', 'thunder', 'blizzard', 'fira'] }),
    ],
    items: BAG,
  },
];

// the company stands where it is placed: those are the battle's deploy cells
for (const x of TRIALS) x.battle.deploy ??= x.company.map((c) => c.at);

export const battles: BattleDef[] = TRIALS.map((t) => t.battle);
