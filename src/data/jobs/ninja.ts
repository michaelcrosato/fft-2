import type { AbilityDef, JobDef, VfxId } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'ninja', name: 'Ninja', desc: 'A shadow-warrior of blinding speed. Fights with a blade in each hand and hurls weapons with deadly precision.',
    generic: true,
    requires: [{ job: 'archer', level: 3 }, { job: 'thief', level: 4 }, { job: 'geomancer', level: 2 }],
    skillset: { id: 'throw', name: 'Throw', desc: 'Hurl weapons from the party stock at a foe as far away as the Ninja can move. Damage grows with Speed.' },
    abilities: [
      'throwShuriken', 'throwBall', 'throwKnife', 'throwSword', 'throwFlail', 'throwKatana',
      'throwNinjaBlade', 'throwAxe', 'throwSpear', 'throwPole', 'throwKnightSword', 'throwBook',
      'sunkenState', 'reflexes', 'dualWield', 'moveInWater',
    ],
    innate: ['dualWield'],
    move: 4, jump: 4, cev: 30,
    mult: { hp: 70, mp: 50, sp: 120, pa: 122, ma: 75 },
    growth: { hp: 12, mp: 13, sp: 80, pa: 43, ma: 50 },
    equip: ['knife', 'ninjaBlade', 'flail', 'hat', 'clothes'],
    look: {
      headgear: 'ninjaHood', torso: 'gi', legs: 'pants', cape: 'scarf', shoulders: 'none',
      palette: { primary: '#2b2d33', secondary: '#1b1c20', accent: '#7a2a2a', metal: '#6a6f78', leather: '#1e1a18' },
      extras: ['scarf', 'belt', 'bracers'],
      bulk: 0.95,
    },
  },
];

/** Throw: range = Move; damage = Speed × WP of the thrown item. */
function throwAb(id: string, name: string, cat: string, jp: number, what: string, vfx: VfxId = 'shuriken', color = '#c8ccd4'): AbilityDef {
  return {
    id, name, desc: `Hurl ${what} from the party stock at a foe within Move range. (Speed × WP)`,
    kind: 'action', jp, skillset: 'throw',
    special: 'throw', params: { cat }, target: 'enemy',
    evadable: true, counterable: true, anim: 'throw', vfx, color, mimic: true,
    effects: [{ type: 'damage', formula: F.thrown() }],
  };
}

export const abilities: AbilityDef[] = [
  throwAb('throwShuriken', 'Shuriken', 'shuriken', 50, 'a shuriken'),
  throwAb('throwBall', 'Bomb', 'ball', 70, 'an explosive ball', 'explosion', '#ff9a40'),
  throwAb('throwKnife', 'Knife', 'knife', 100, 'a knife'),
  throwAb('throwSword', 'Sword', 'sword', 100, 'a sword'),
  throwAb('throwFlail', 'Flail', 'flail', 100, 'a flail or hammer', 'stone', '#9a8a7a'),
  throwAb('throwKatana', 'Katana', 'katana', 100, 'a katana'),
  throwAb('throwNinjaBlade', 'Ninja Blade', 'ninjaBlade', 100, 'a ninja blade'),
  throwAb('throwAxe', 'Axe', 'axe', 120, 'an axe', 'shuriken', '#b0a090'),
  throwAb('throwSpear', 'Spear', 'spear', 100, 'a spear', 'pierce'),
  throwAb('throwPole', 'Pole', 'pole', 100, 'a pole', 'stone', '#8a6a4a'),
  throwAb('throwKnightSword', 'Knight Sword', 'knightSword', 100, 'a knight\'s greatsword'),
  throwAb('throwBook', 'Book', 'book', 100, 'a heavy tome', 'stone', '#7a5a8a'),
  // ---- reaction / support / movement ----
  { id: 'sunkenState', name: 'Vanish', desc: 'When damaged, may vanish from sight. Attacks made while unseen cannot be evaded.', kind: 'reaction', jp: 900, skillset: 'ninja' },
  { id: 'reflexes', name: 'Reflexes', desc: 'Doubles all evasion against physical attacks.', kind: 'reaction', jp: 400, skillset: 'ninja' },
  { id: 'dualWield', name: 'Dual Wield', desc: 'Wield a weapon in each hand and strike twice per attack.', kind: 'support', jp: 900, skillset: 'ninja' },
  { id: 'moveInWater', name: 'Swift Swimmer', desc: 'Move through water without penalty and act while submerged.', kind: 'movement', jp: 420, skillset: 'ninja' },
];
