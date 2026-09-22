import type { AbilityDef, JobDef } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'timeMage', name: 'Chronomancer', desc: 'A star-reader who has learned to pull on the threads of time and weight. Hastens friends, stills foes, calls down the sky.',
    generic: true,
    requires: [{ job: 'wizard', level: 2 }],
    skillset: { id: 'timeMagic', name: 'Time Magic', desc: 'Spells that quicken, slow and stop the flow of time, and bend gravity itself.' },
    abilities: [
      'haste', 'hasteja', 'slow', 'slowja', 'stop', 'immobilize', 'floatSpell', 'reflect', 'quick', 'gravity', 'graviga', 'meteor',
      'criticalQuick', 'mpRestore', 'shortCharge', 'nonCharge', 'teleport', 'float',
    ],
    move: 3, jump: 3, cev: 5,
    mult: { hp: 75, mp: 120, sp: 100, pa: 50, ma: 130 },
    growth: { hp: 12, mp: 10, sp: 100, pa: 65, ma: 50 },
    equip: ['staff', 'hat', 'ribbon', 'clothes', 'robe'],
    look: {
      headgear: 'cowl', torso: 'robe', legs: 'robe', cape: 'mantle', shoulders: 'none',
      palette: { primary: '#4b2f7a', secondary: '#262050', accent: '#dbb54a', leather: '#3a2a40' },
      extras: ['sash', 'book'],
      bulk: 0.92,
    },
  },
];

/** Time magic defaults: faith-based, reflectable, copied by Mimics. `calc` is set per spell (not Quick or Meteor). */
const T = { kind: 'action', skillset: 'timeMagic', magic: true, mimic: true, anim: 'cast', range: 4 } as const;

export const abilities: AbilityDef[] = [
  {
    ...T, id: 'haste', name: 'Haste', desc: 'Quickens the target\'s time: Speed × 1.5. Success: (MA + 180) × Faith.', jp: 100,
    mp: 8, ct: 2, range: 3, aoe: 2, aoeV: 0, target: 'ally', calc: true, vfx: 'time', color: '#ffb05a',
    hit: F.hitMa(180),
    effects: [{ type: 'status', add: ['haste'] }], ai: { buff: true },
  },
  {
    ...T, id: 'hasteja', name: 'Hasteja', desc: 'Haste across a wide area and every height. Success: (MA + 240) × Faith.', jp: 550,
    mp: 30, ct: 7, range: 3, aoe: 2, aoeV: 3, target: 'ally', calc: true, vfx: 'time', color: '#ffc87a',
    hit: F.hitMa(240),
    effects: [{ type: 'status', add: ['haste'] }], ai: { buff: true },
  },
  {
    ...T, id: 'slow', name: 'Slow', desc: 'Drags on the target\'s time: Speed halved. Success: (MA + 180) × Faith.', jp: 80,
    mp: 8, ct: 2, range: 3, aoe: 2, aoeV: 0, target: 'enemy', calc: true, vfx: 'time', color: '#6a9aff',
    hit: F.hitMa(180),
    effects: [{ type: 'status', add: ['slow'] }], ai: { debuff: true },
  },
  {
    ...T, id: 'slowja', name: 'Slowja', desc: 'Slow across a wide area and every height. Success: (MA + 240) × Faith.', jp: 520,
    mp: 30, ct: 7, range: 3, aoe: 2, aoeV: 3, target: 'enemy', calc: true, vfx: 'time', color: '#5a86ee',
    hit: F.hitMa(240),
    effects: [{ type: 'status', add: ['slow'] }], ai: { debuff: true },
  },
  {
    ...T, id: 'stop', name: 'Stop', desc: 'Halts time around the target: no moving, acting or gaining CT. Success: (MA + 110) × Faith.', jp: 330,
    mp: 14, ct: 7, range: 3, aoe: 2, aoeV: 0, target: 'enemy', calc: true, vfx: 'time', color: '#3a5aff',
    hit: F.hitMa(110),
    effects: [{ type: 'status', add: ['stop'] }], ai: { debuff: true },
  },
  {
    ...T, id: 'immobilize', name: 'Immobilize', desc: 'Roots the target\'s feet to the ground. Success: (MA + 190) × Faith.', jp: 100,
    mp: 10, ct: 3, range: 3, aoe: 2, aoeV: 1, target: 'enemy', calc: true, vfx: 'debuff', color: '#b08a60',
    hit: F.hitMa(190),
    effects: [{ type: 'status', add: ['immobilize'] }], ai: { debuff: true },
  },
  {
    ...T, id: 'floatSpell', name: 'Float', desc: 'Lifts the target a hand\'s breadth off the ground, above earth and water. Success: (MA + 140) × Faith.', jp: 200,
    mp: 8, ct: 2, aoe: 2, aoeV: 1, target: 'ally', calc: true, vfx: 'buff', color: '#cdefff',
    hit: F.hitMa(140),
    effects: [{ type: 'status', add: ['float'] }], ai: { buff: true },
  },
  {
    ...T, id: 'reflect', name: 'Reflect', desc: 'Wraps the target in a mirror that turns most spells back on their caster. Success: (MA + 180) × Faith.', jp: 300,
    mp: 12, ct: 2, target: 'ally', calc: true, vfx: 'glyph', color: '#e0ffff',
    hit: F.hitMa(180),
    effects: [{ type: 'status', add: ['reflect'] }], ai: { buff: true },
  },
  {
    ...T, id: 'quick', name: 'Quick', desc: 'Steals a moment from the world and gives it to an ally, who acts at once. Cannot target the caster. Success: (MA + 140) × Faith.', jp: 800,
    mp: 24, ct: 4, target: 'ally', vfx: 'time', color: '#ffe46a',
    hit: (x) => (x.c === x.t ? 0 : F.hitMa(140)(x)),
    effects: [{ type: 'ct', set: 100 }], ai: { buff: true },
  },
  {
    ...T, id: 'gravity', name: 'Gravity', desc: 'Crushes all in the area beneath their own weight: a quarter of current HP. Success: (MA + 190) × Faith.', jp: 250,
    mp: 24, ct: 6, aoe: 2, aoeV: 1, target: 'enemy', calc: true, vfx: 'gravity', color: '#5a3a8a',
    hit: F.hitMa(190), params: { pct: 0.25 },
    effects: [{ type: 'special', id: 'gravity' }],
  },
  {
    ...T, id: 'graviga', name: 'Graviga', desc: 'A crushing well of weight over a wide area: half of current HP. Success: (MA + 120) × Faith.', jp: 550,
    mp: 50, ct: 9, aoe: 2, aoeV: 3, target: 'enemy', vfx: 'gravity', color: '#3a2060', calc: true,
    hit: F.hitMa(120), params: { pct: 0.5 },
    effects: [{ type: 'special', id: 'gravity' }],
  },
  {
    ...T, id: 'meteor', name: 'Meteor', desc: 'Tears a burning stone from the heavens and drops it on the field. MA × 60 × Faith.', jp: 1500,
    mp: 70, ct: 13, aoe: 4, aoeV: 3, target: 'enemy', noReflect: true, vfx: 'meteor', color: '#ff7a3a',
    effects: [{ type: 'damage', formula: F.magic(60) }],
  },
  // ---- reaction / support / movement ----
  { id: 'criticalQuick', name: 'Critical Quick', desc: 'When brought to critical HP, seize the next turn at once.', kind: 'reaction', jp: 700, skillset: 'timeMage' },
  { id: 'mpRestore', name: 'MP Restore', desc: 'When brought to critical HP, fully restores MP.', kind: 'reaction', jp: 400, skillset: 'timeMage' },
  { id: 'shortCharge', name: 'Short Charge', desc: 'Halves the charge time of all abilities.', kind: 'support', jp: 800, skillset: 'timeMage' },
  { id: 'nonCharge', name: 'Non-Charge', desc: 'Abilities resolve at once, with no charge time at all.', kind: 'support', jp: 1500, skillset: 'timeMage' },
  { id: 'teleport', name: 'Teleport', desc: 'Blink to any panel within reach, ignoring height and obstacles. Beyond Move, success falls with distance.', kind: 'movement', jp: 600, skillset: 'timeMage' },
  { id: 'float', name: 'Float', desc: 'Hover permanently, crossing water and lava untroubled.', kind: 'movement', jp: 540, skillset: 'timeMage' },
];
