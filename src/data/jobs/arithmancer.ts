import type { AbilityDef, JobDef } from '../types';

export const jobs: JobDef[] = [
  {
    id: 'arithmancer', name: 'Arithmancer', desc: 'A scholar who has found the numbers beneath the world. Casts learned spells instantly, without cost, upon every soul whose figures fit the formula.',
    generic: true,
    requires: [{ job: 'priest', level: 4 }, { job: 'wizard', level: 4 }, { job: 'timeMage', level: 3 }, { job: 'mystic', level: 3 }],
    skillset: { id: 'arithmeticks', name: 'Arithmeticks', desc: 'Pair an attribute with a divisor; any learned spell resolves at once on every unit whose value divides evenly.' },
    abilities: [
      'arithmeticks',
      'calcAttrCt', 'calcAttrLevel', 'calcAttrExp', 'calcAttrHeight',
      'calcDivPrime', 'calcDiv5', 'calcDiv4', 'calcDiv3',
      'distribute', 'damageSplit', 'expBoost', 'moveGetExp', 'moveGetJp',
    ],
    move: 3, jump: 3, cev: 5,
    mult: { hp: 65, mp: 80, sp: 50, pa: 50, ma: 70 },
    growth: { hp: 14, mp: 10, sp: 100, pa: 70, ma: 50 },
    equip: ['pole', 'book', 'hat', 'clothes', 'robe'],
    look: {
      headgear: 'tricorn', torso: 'coat', legs: 'robe', cape: 'mantle', shoulders: 'none',
      palette: { primary: '#6e4e2e', secondary: '#d8c9a0', accent: '#b08a3a', leather: '#3e2a1a' },
      extras: ['book', 'satchel'],
    },
  },
];

function attr(id: string, name: string, value: string, jp: number, what: string): AbilityDef {
  return {
    id, name, desc: `Arithmeticks may reckon by ${what}.`,
    kind: 'action', jp, skillset: 'arithmeticks', special: 'passive', params: { value },
  };
}
function div(id: string, name: string, value: string, jp: number, what: string): AbilityDef {
  return {
    id, name, desc: `Arithmeticks may strike units whose figure is ${what}.`,
    kind: 'action', jp, skillset: 'arithmeticks', special: 'passive', params: { value },
  };
}

export const abilities: AbilityDef[] = [
  {
    id: 'arithmeticks', name: 'Arithmeticks', desc: 'Choose an attribute, a divisor and a learned spell. The spell resolves instantly and without MP on every unit that fits.',
    kind: 'action', jp: 0, skillset: 'arithmeticks', special: 'calc',
    range: 0, shape: 'self', target: 'self', anim: 'cast', vfx: 'glyph', color: '#e8d8a0', mimic: true,
  },
  attr('calcAttrCt', 'CT', 'ct', 250, 'each unit\'s current CT'),
  attr('calcAttrLevel', 'Level', 'level', 350, 'each unit\'s level'),
  attr('calcAttrExp', 'EXP', 'exp', 200, 'each unit\'s current experience'),
  attr('calcAttrHeight', 'Height', 'height', 250, 'the height of the ground each unit stands on'),
  div('calcDivPrime', 'Prime', 'prime', 300, 'a prime number'),
  div('calcDiv5', 'Multiple of 5', '5', 200, 'a multiple of 5'),
  div('calcDiv4', 'Multiple of 4', '4', 400, 'a multiple of 4'),
  div('calcDiv3', 'Multiple of 3', '3', 600, 'a multiple of 3'),
  // ---- reaction / support / movement ----
  { id: 'distribute', name: 'Distribute', desc: 'When damaged, share a portion of your vigour, restoring HP to allies within three tiles.', kind: 'reaction', jp: 200, skillset: 'arithmancer' },
  { id: 'damageSplit', name: 'Damage Split', desc: 'When damaged, recover half the damage and deal that half back to the attacker.', kind: 'reaction', jp: 300, skillset: 'arithmancer' },
  { id: 'expBoost', name: 'EXP Boost', desc: 'Increases experience earned per action by half.', kind: 'support', jp: 350, skillset: 'arithmancer' },
  { id: 'moveGetExp', name: 'Accrue EXP', desc: 'Gain experience for every tile moved.', kind: 'movement', jp: 400, skillset: 'arithmancer' },
  { id: 'moveGetJp', name: 'Accrue JP', desc: 'Gain JP for every tile moved.', kind: 'movement', jp: 360, skillset: 'arithmancer' },
];
