// Delan Harrow's later job — "Lion Knight" (source: Delita's Holy Knight / Knight Blade).
// Sacred-blade arts turned to ambition, and an oath that hardens his resolve.
import type { AbilityDef, JobDef } from '../../types';
import { sacredArt } from './holyKnight';

const SK = 'lionsOath';

export const jobs: JobDef[] = [
  {
    id: 'lionKnight', name: 'Lion Knight', desc: 'A low-born soldier who clawed his way into a holy knight\'s mantle. He swims against the current, and the current is losing.',
    generic: false,
    unique: 'delan',
    gender: 'm',
    skillset: { id: SK, name: "Lion's Oath", desc: 'Consecrated sword arts sworn to his own crown. Requires a sword or knight\'s sword.' },
    abilities: ['lionFang', 'lionCrownCleaver', 'lionThunder', 'lionLowbornJudgement', 'lionOath'],
    move: 4, jump: 3, cev: 15,
    mult: { hp: 118, mp: 85, sp: 100, pa: 118, ma: 90 },
    growth: { hp: 10, mp: 15, sp: 100, pa: 42, ma: 50 },
    equip: ['sword', 'knightSword', 'shield', 'helmet', 'armor', 'clothes'],
    look: {
      headgear: 'none', torso: 'plate', legs: 'armored', cape: 'long', shoulders: 'pauldrons',
      palette: { primary: '#2a2a2e', secondary: '#6a1e24', accent: '#d8b04a', metal: '#8a8e96', leather: '#3a2a1c' },
      extras: ['belt', 'gloves'],
    },
  },
];

export const abilities: AbilityDef[] = [
  sacredArt({
    id: 'lionFang', name: "Lion's Fang", skillset: SK, jp: 150, range: 3, aoe: 1, mult: 1.1, status: 'slow', chance: 35,
    desc: 'A lunging cut that bites deep. [PA × WP × 1.1] damage, may Slow.', vfx: 'slash', color: '#e0c070',
  }),
  sacredArt({
    id: 'lionCrownCleaver', name: 'Crown Cleaver', skillset: SK, jp: 300, range: 3, aoe: 2, status: 'doom', chance: 25,
    desc: 'The stroke he means for kings. [PA × WP] damage around the target, may inflict Doom.', vfx: 'explosion', color: '#c04040',
  }),
  sacredArt({
    id: 'lionThunder', name: 'Thunder of Ambition', skillset: SK, jp: 450, range: 3, aoe: 2, mult: 1.1, element: 'lightning', status: 'silence', chance: 35,
    desc: 'Lightning answers his blade. Lightning [PA × WP] damage, may Silence.', vfx: 'thunder', color: '#fff080',
  }),
  sacredArt({
    id: 'lionLowbornJudgement', name: 'Lowborn\'s Judgement', skillset: SK, jp: 700, range: 5, aoe: 2, mult: 1.2, element: 'holy', status: 'confuse', chance: 30,
    desc: 'The judgement of those the nobles called animals. Holy [PA × WP] damage at long range, may Confuse.', vfx: 'holy', color: '#fff0d0',
  }),
  {
    id: 'lionOath', name: "Lion's Oath", desc: 'He swears it again: he will not be swept along. PA +2, Speed +1 and Brave +10 for himself.', kind: 'action', jp: 500, skillset: SK,
    range: 0, shape: 'self', target: 'self', anim: 'roar', vfx: 'buffRed', color: '#d8b04a', mimic: false,
    effects: [
      { type: 'stat', stat: 'pa', amount: 2 },
      { type: 'stat', stat: 'speed', amount: 1 },
      { type: 'stat', stat: 'brave', amount: 10 },
    ],
    ai: { buff: true, score: 14 },
  },
];
