import type { BattleDef } from '../types';

// Training skirmish (debug & tutorial)
export const battles: BattleDef[] = [
  {
    id: 'b_training', name: 'Training Grounds', map: 'training', music: 'battle1',
    units: [
      { job: 'squire', level: '+0', at: [3, 1], facing: 'S', team: 1, name: 'Sparring Squire' },
      { job: 'archer', level: '+0', at: [8, 1], facing: 'S', team: 1, name: 'Sparring Archer' },
      { job: 'wizard', level: '+0', at: [5, 0], facing: 'S', team: 1, name: 'Sparring Wizard' },
      { job: 'goblin', level: '+0', at: [6, 2], facing: 'S', team: 1 },
      { job: 'priest', level: '+0', at: [4, 2], facing: 'S', team: 1, name: 'Sparring Cleric' },
    ],
    victory: { type: 'defeatAll' },
    rewards: { gil: 200 },
    hint: 'Strike from behind — evasion is weakest there.',
  },
];
