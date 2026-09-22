// Rhen Valorne's unique squire job — the "Squire of Mettle".
// Reuses the Fundaments actions (focus/rush/stoneToss/salve) from squire.ts and
// adds Rhen's own rallying cries (source: Ramza's Guts skillset).
import type { AbilityDef, JobDef } from '../../types';
import { F } from '../../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'hero', name: 'Squire', desc: 'A squire of noble blood who has chosen his own road. Better grounded than any cadet, and able to rally a faltering line with a word.',
    generic: false,
    unique: 'rhen',
    skillset: { id: 'mettle', name: 'Mettle', desc: 'The fundamentals of war, and the rallying cries of a born leader.' },
    abilities: [
      'focus', 'rush', 'stoneToss', 'salve',
      'heroTailwind', 'heroCheer', 'heroWish', 'heroShout', 'heroLastLight',
      'counterTackle', 'equipAxe', 'monsterSkill', 'defend', 'jpBoost', 'move1',
    ],
    move: 4, jump: 3, cev: 5,
    mult: { hp: 110, mp: 80, sp: 100, pa: 100, ma: 85 },
    growth: { hp: 10, mp: 14, sp: 100, pa: 55, ma: 48 },
    equip: ['knife', 'sword', 'knightSword', 'axe', 'flail', 'shield', 'helmet', 'hat', 'robe', 'armor', 'clothes'],
    look: {
      headgear: 'none', torso: 'tunic', legs: 'pants', cape: 'short', shoulders: 'pads',
      palette: { primary: '#3f64a8', secondary: '#e8dcb8', accent: '#d8b04a', metal: '#c0c6d0', leather: '#6a4428' },
      extras: ['belt', 'gloves', 'bracers'],
    },
  },
];

export const abilities: AbilityDef[] = [
  {
    id: 'heroTailwind', name: 'Tailwind', desc: 'A sharp cry that quickens an ally\'s step. Raises Speed by 1 for the battle.', kind: 'action', jp: 200, skillset: 'mettle',
    range: 3, target: 'ally', anim: 'talk', vfx: 'buffBlue', color: '#9fd4ff', mimic: false,
    effects: [{ type: 'stat', stat: 'speed', amount: 1 }], ai: { buff: true, score: 10 },
  },
  {
    id: 'heroCheer', name: 'Cheer', desc: 'Words of courage that steady a wavering heart. Raises Brave by 5.', kind: 'action', jp: 200, skillset: 'mettle',
    range: 3, target: 'ally', anim: 'talk', vfx: 'buffRed', color: '#ffb070', mimic: false,
    effects: [{ type: 'stat', stat: 'brave', amount: 5 }], ai: { buff: true, score: 6 },
  },
  {
    id: 'heroWish', name: 'Wish', desc: 'Give of your own strength to mend another. Costs a fifth of your max HP and restores twice that to the target.', kind: 'action', jp: 150, skillset: 'mettle',
    range: 3, rangeV: 3, target: 'ally', anim: 'pray', vfx: 'heal', color: '#fff0b0', mimic: false,
    effects: [{ type: 'special', id: 'wish' }], ai: { heal: true },
  },
  {
    id: 'heroShout', name: 'Shout', desc: 'A roar of defiance. Raises your own PA, MA and Speed by 1 and Brave by 10.', kind: 'action', jp: 500, skillset: 'mettle',
    range: 0, shape: 'self', target: 'self', anim: 'roar', vfx: 'buffRed', color: '#ff7a40', mimic: false,
    effects: [
      { type: 'stat', stat: 'pa', amount: 1 },
      { type: 'stat', stat: 'ma', amount: 1 },
      { type: 'stat', stat: 'speed', amount: 1 },
      { type: 'stat', stat: 'brave', amount: 10 },
    ],
    ai: { buff: true, score: 14 },
  },
  {
    id: 'heroLastLight', name: 'Last Light', desc: 'The light the Braves carried, called down upon the field. Holy damage to all in the area.', kind: 'action', jp: 1000, skillset: 'mettle',
    range: 4, aoe: 2, ct: 5, mp: 10, magic: true, element: 'holy', target: 'any', anim: 'cast', vfx: 'ultima', color: '#fff4c0', mimic: false,
    triggersReaction: 'magic',
    effects: [{ type: 'damage', formula: F.magic(20) }],
  },
];
