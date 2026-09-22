// Rhosyn — "Dragon Kin" (source: Reis's Dragoner) and her cursed form, the Holy Dragon.
// Dragoncraft abilities only take hold on dragons (monster family 'dragon'), except Holy Breath.
import type { AbilityDef, FormulaCtx, JobDef } from '../../types';
import { F } from '../../../battle/formulas';

const SK = 'dragoncraft';
/** hit chance that only lands on dragons */
const onDragon = (p: number) => (x: FormulaCtx) => (x.t.job.family === 'dragon' ? p : 0);

export const jobs: JobDef[] = [
  {
    id: 'dragonKin', name: 'Dragon Kin', desc: 'A woman who lived long years in a dragon\'s shape. Dragons still know her as one of their own and answer when she calls.',
    generic: false,
    unique: 'rhosyn',
    gender: 'f',
    skillset: { id: SK, name: 'Dragoncraft', desc: 'Tame, tend and embolden dragons — and breathe their holy fire.' },
    abilities: ['dragonkinWyrmbond', 'dragonkinTending', 'dragonkinMight', 'dragonkinAscent', 'dragonkinHolyBreath'],
    move: 4, jump: 4, cev: 12,
    mult: { hp: 100, mp: 100, sp: 100, pa: 95, ma: 105 },
    growth: { hp: 11, mp: 14, sp: 100, pa: 50, ma: 48 },
    equip: ['knife', 'sword', 'spear', 'hat', 'clothes', 'robe'],
    look: {
      headgear: 'circlet', torso: 'dress', legs: 'skirt', cape: 'short', shoulders: 'none',
      palette: { primary: '#f2eee4', secondary: '#c8b070', accent: '#e0c050', leather: '#6a5030' },
      extras: ['sash', 'bracers'],
    },
  },
  {
    id: 'holyDragon', name: 'Holy Dragon', desc: 'A dragon of white scale and golden eye, bound in this shape by an old curse. It fights with a knight\'s loyalty.',
    generic: false,
    unique: 'rhosyn',
    skillset: { id: 'holyDragonArts', name: 'Dragon Arts', desc: 'The tail, the breath and the blessing of a holy wyrm.' },
    abilities: ['holyDragonTail', 'holyDragonBreath', 'holyDragonBenison', 'holyDragonScales'],
    move: 4, jump: 3, cev: 10,
    mult: { hp: 160, mp: 90, sp: 100, pa: 120, ma: 120 },
    growth: { hp: 9, mp: 14, sp: 100, pa: 45, ma: 45 },
    equip: [],
    look: {
      headgear: 'none', torso: 'tunic', legs: 'pants',
      palette: { primary: '#f4f0e6', secondary: '#d8c078', accent: '#f0c840', metal: '#e8e0c8' },
    },
    monster: { shape: 'dragon', palette: { primary: '#f4f0e6', secondary: '#d8c078', accent: '#f0c840', metal: '#e8e0c8' }, scale: 1.15 },
    family: 'dragon',
    base: { hp: 180, mp: 40, speed: 7, pa: 9, ma: 9 },
    monsterSkills: [['holyDragonTail', 1], ['holyDragonBreath', 1], ['holyDragonBenison', 1], ['holyDragonScales', 1]],
    absorb: ['holy'],
    weak: ['dark'],
    immune: ['undead', 'frog', 'chicken', 'doom', 'vampire'],
    noEgg: true,
    noInvite: true,
  },
];

export const abilities: AbilityDef[] = [
  // ---- Dragoncraft (Dragon Kin) ----
  {
    id: 'dragonkinWyrmbond', name: 'Wyrmbond', desc: 'Speak to a hostile dragon in its own tongue; it lays down its anger and joins you. Dragons only.', kind: 'action', jp: 300, skillset: SK,
    range: 3, target: 'enemy', anim: 'talk', vfx: 'talk', color: '#f0e0a0', mimic: false,
    hit: onDragon(90),
    effects: [{ type: 'invite' }],
  },
  {
    id: 'dragonkinTending', name: 'Wyrm Tending', desc: 'Soothe a dragon\'s wounds and ailments. Restores HP and cures most statuses. Dragons only.', kind: 'action', jp: 200, skillset: SK,
    range: 3, target: 'ally', anim: 'pray', vfx: 'heal', color: '#b0ffb0', mimic: false,
    hit: onDragon(100),
    effects: [
      { type: 'status', remove: ['petrify', 'confuse', 'blind', 'silence', 'oil', 'frog', 'chicken', 'poison', 'slow', 'stop', 'sleep', 'immobilize', 'disable', 'berserk', 'charm', 'doom'] },
      { type: 'heal', formula: F.ma(6) },
    ],
    ai: { heal: true },
  },
  {
    id: 'dragonkinMight', name: 'Wyrm Might', desc: 'Stir the fire in a dragon\'s heart. PA and MA +2. Dragons only.', kind: 'action', jp: 300, skillset: SK,
    range: 3, target: 'ally', anim: 'pray', vfx: 'buffRed', color: '#ff9060', mimic: false,
    hit: onDragon(100),
    effects: [{ type: 'stat', stat: 'pa', amount: 2 }, { type: 'stat', stat: 'ma', amount: 2 }],
    ai: { buff: true },
  },
  {
    id: 'dragonkinAscent', name: 'Wyrm Ascent', desc: 'Remind a dragon of the sky it was born to. Speed +1 and Brave +10. Dragons only.', kind: 'action', jp: 400, skillset: SK,
    range: 3, target: 'ally', anim: 'pray', vfx: 'buffBlue', color: '#a0d0ff', mimic: false,
    hit: onDragon(100),
    effects: [{ type: 'stat', stat: 'speed', amount: 1 }, { type: 'stat', stat: 'brave', amount: 10 }],
    ai: { buff: true },
  },
  {
    id: 'dragonkinHolyBreath', name: 'Holy Breath', desc: 'Breathe the white fire of her dragon years in a line. Holy damage [MA × 10].', kind: 'action', jp: 600, skillset: SK,
    range: 1, shape: 'line', aoe: 4, target: 'enemy', element: 'holy', ct: 2, mp: 12, anim: 'breath', vfx: 'breath', color: '#fff8d0', mimic: false,
    triggersReaction: 'none',
    effects: [{ type: 'damage', formula: F.ma(10) }],
  },
  // ---- Holy Dragon (monster form) ----
  {
    id: 'holyDragonTail', name: 'Tail Sweep', desc: 'A sweep of the great tail. Damage and knockback.', kind: 'action', jp: 150, skillset: 'holyDragonArts',
    range: 1, target: 'enemy', anim: 'spin', vfx: 'impact', color: '#f0e8d0', evadable: true, mimic: false, triggersReaction: 'physical',
    effects: [{ type: 'damage', formula: F.paHalfPa(1.2) }, { type: 'knockback', tiles: 1 }],
  },
  {
    id: 'holyDragonBreath', name: 'Holy Breath', desc: 'A torrent of white fire in a line. Holy damage [MA × 12].', kind: 'action', jp: 300, skillset: 'holyDragonArts',
    range: 1, shape: 'line', aoe: 4, target: 'enemy', element: 'holy', anim: 'breath', vfx: 'breath', color: '#fff8d0', mimic: false,
    triggersReaction: 'none',
    effects: [{ type: 'damage', formula: F.ma(12) }],
  },
  {
    id: 'holyDragonBenison', name: "Dragon's Benison", desc: 'The dragon spreads its wings over nearby allies, restoring HP and granting Regen.', kind: 'action', jp: 250, skillset: 'holyDragonArts',
    range: 0, aoe: 3, alliesOnly: true, target: 'ally', ct: 2, anim: 'roar', vfx: 'healBig', color: '#fff0b0', mimic: false,
    effects: [{ type: 'heal', formula: F.ma(6) }, { type: 'status', add: ['regen'] }],
    ai: { heal: true },
  },
  {
    id: 'holyDragonScales', name: 'Radiant Scales', desc: 'The dragon\'s scales blaze with light. Grants itself Protect and Shell.', kind: 'action', jp: 200, skillset: 'holyDragonArts',
    range: 0, shape: 'self', target: 'self', anim: 'roar', vfx: 'guard', color: '#fff4c0', mimic: false,
    effects: [{ type: 'status', add: ['protect', 'shell'], all: true }],
    ai: { buff: true },
  },
];
