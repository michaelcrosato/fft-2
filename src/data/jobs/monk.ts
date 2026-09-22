import type { AbilityDef, FormulaCtx, JobDef, StatusId } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'monk', name: 'Monk', desc: 'A fighter of the mountain cloisters who needs no weapon. Fists that break stone, hands that mend flesh.',
    generic: true,
    requires: [{ job: 'knight', level: 2 }],
    skillset: { id: 'martial', name: 'Martial Arts', desc: 'Disciplined unarmed techniques: strikes near and far, and the healing breath of the cloister.' },
    abilities: [
      'spinningFist', 'shockwave', 'aurablast', 'earthRend', 'secretFist', 'stigmata', 'chakra', 'revive',
      'hpRestore', 'counter', 'firstStrike', 'martialArts', 'moveHpUp',
    ],
    innate: ['martialArts'],
    move: 3, jump: 4, cev: 20,
    mult: { hp: 135, mp: 80, sp: 110, pa: 129, ma: 80 },
    growth: { hp: 9, mp: 13, sp: 100, pa: 48, ma: 50 },
    equip: ['clothes', 'ribbon'],
    look: {
      headgear: 'headband', torso: 'gi', legs: 'pants', cape: 'none', shoulders: 'none',
      palette: { primary: '#b8642e', secondary: '#5e3d26', accent: '#ecd6a4', leather: '#3e2a1c' },
      extras: ['sash', 'bracers'],
      bulk: 1.1,
    },
  },
];

type Fx = (x: FormulaCtx) => number;
/** Brawler (Martial Arts support, innate for Monks) multiplies unarmed-art power by 1.5. */
const brawl = (f: Fx): Fx => (x) => {
  const d = f(x);
  return x.c.hasSupport('martialArts') ? Math.floor(d * 1.5) : d;
};
const PURIFY: StatusId[] = ['petrify', 'blind', 'confuse', 'silence', 'oil', 'frog', 'poison', 'sleep'];

export const abilities: AbilityDef[] = [
  {
    id: 'spinningFist', name: 'Spinning Fist', desc: 'Whirl with fists outstretched, striking every foe on adjacent panels of equal height. PA × (PA/2).',
    kind: 'action', jp: 150, skillset: 'martial',
    range: 0, aoe: 2, aoeV: 0, shape: 'ring', target: 'enemy', anim: 'spin', vfx: 'impact', color: '#ffcf8a', mimic: true,
    effects: [{ type: 'damage', formula: brawl(F.paHalfPa()) }],
  },
  {
    id: 'shockwave', name: 'Shockwave', desc: 'A storm of blows into one foe; how many land is anyone\'s guess. (1..9) × (PA + PA/2).',
    kind: 'action', jp: 300, skillset: 'martial',
    range: 1, target: 'enemy', anim: 'punch', vfx: 'punch', color: '#ffb36b', mimic: true,
    effects: [{ type: 'damage', formula: brawl((x) => x.rng.int(1, 9) * (x.c.pa + Math.floor(x.c.pa / 2))) }],
  },
  {
    id: 'aurablast', name: 'Aurablast', desc: 'Hurl a ball of gathered spirit at a foe up to three panels away. PA × ((PA+2)/2).',
    kind: 'action', jp: 300, skillset: 'martial',
    range: 3, rangeV: 3, target: 'enemy', anim: 'punch', vfx: 'beam', color: '#9fd8ff', mimic: true,
    effects: [{ type: 'damage', formula: brawl((x) => x.c.pa * Math.floor((x.c.pa + 2) / 2)) }],
  },
  {
    id: 'earthRend', name: 'Earth Rend', desc: 'Strike the ground and split it in a line eight panels long. Earth damage, PA × (PA/2).',
    kind: 'action', jp: 600, skillset: 'martial',
    range: 1, aoe: 8, aoeV: 2, shape: 'line', target: 'enemy', element: 'earth', anim: 'punch', vfx: 'quake', color: '#b08a55', mimic: true,
    effects: [{ type: 'damage', formula: brawl(F.paHalfPa()), element: 'earth' }],
  },
  {
    id: 'secretFist', name: 'Secret Fist', desc: 'A strike to a hidden meridian. The victim\'s days are numbered: inflicts Doom. Success: MA + 50 %.',
    kind: 'action', jp: 300, skillset: 'martial',
    range: 1, target: 'enemy', anim: 'punch', vfx: 'dark', color: '#b26bff', mimic: true,
    hit: F.hitMaNoFaith(50),
    effects: [{ type: 'status', add: ['doom'] }],
    ai: { debuff: true },
  },
  {
    id: 'stigmata', name: 'Stigmata', desc: 'Press palms together and purge body and mind: cures Stone, Blind, Confuse, Silence, Oil, Toad, Poison and Sleep on and around the user.',
    kind: 'action', jp: 200, skillset: 'martial',
    range: 0, aoe: 2, aoeV: 0, target: 'ally', anim: 'pray', vfx: 'sparkleGreen', color: '#bfffd0', mimic: true,
    hit: F.hitMaNoFaith(120),
    effects: [{ type: 'status', remove: PURIFY }],
    ai: { heal: true },
  },
  {
    id: 'chakra', name: 'Chakra', desc: 'Breathe deep and share the breath: restores HP (PA × 5) and MP (PA × 5/2) to the user and adjacent units.',
    kind: 'action', jp: 350, skillset: 'martial',
    range: 0, aoe: 2, aoeV: 0, target: 'ally', anim: 'charge', vfx: 'heal', color: '#ffe7a0', mimic: true,
    effects: [
      { type: 'heal', formula: brawl((x) => x.c.pa * 5) },
      { type: 'heal', stat: 'mp', formula: brawl((x) => Math.floor((x.c.pa * 5) / 2)) },
    ],
    ai: { heal: true },
  },
  {
    id: 'revive', name: 'Revive', desc: 'A sharp blow to the heart of a fallen ally that jolts the spirit back into the body. Success: PA + 70 %.',
    kind: 'action', jp: 500, skillset: 'martial',
    range: 1, target: 'ko', anim: 'punch', vfx: 'revive', color: '#fff2b0', mimic: true,
    hit: F.hitPa(70),
    effects: [{ type: 'revive', pct: 0.2 }],
    ai: { revive: true },
  },
  // ---- reaction / support / movement ----
  { id: 'hpRestore', name: 'HP Restore', desc: 'When brought to critical HP, fully restores HP, Brave percent of the time.', kind: 'reaction', jp: 500, skillset: 'monk' },
  { id: 'counter', name: 'Counter', desc: 'Strike back at any foe who lands a blow within weapon reach.', kind: 'reaction', jp: 300, skillset: 'monk' },
  { id: 'firstStrike', name: 'First Strike', desc: 'Read the enemy\'s intent and strike first, cancelling their attack. Brave percent of the time.', kind: 'reaction', jp: 1200, skillset: 'monk' },
  { id: 'martialArts', name: 'Brawler', desc: 'Unarmed attacks and Martial Arts deal half again as much damage.', kind: 'support', jp: 200, skillset: 'monk' },
  { id: 'moveHpUp', name: 'Move-HP Up', desc: 'Recover a tenth of max HP with every move.', kind: 'movement', jp: 300, skillset: 'monk' },
];
