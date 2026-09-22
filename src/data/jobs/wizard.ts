import type { AbilityDef, Element, JobDef, VfxId } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'wizard', name: 'Wizard', desc: 'A scholar of the Galwyn academy who bends the elements to ruin. Frail of body, dreadful of word.',
    generic: true,
    requires: [{ job: 'chemist', level: 2 }],
    skillset: { id: 'blackMagic', name: 'Black Magic', desc: 'Destructive sorcery of fire, ice and lightning. Power grows with Faith.' },
    abilities: [
      'fire', 'fira', 'firaga', 'firaja',
      'thunder', 'thundara', 'thundaga', 'thundaja',
      'blizzard', 'blizzara', 'blizzaga', 'blizzaja',
      'poison', 'frogSpell', 'death', 'flare',
      'counterMagic', 'maSave', 'magicAttackUp',
    ],
    move: 3, jump: 3, cev: 5,
    mult: { hp: 75, mp: 120, sp: 100, pa: 60, ma: 150 },
    growth: { hp: 12, mp: 9, sp: 100, pa: 60, ma: 50 },
    equip: ['rod', 'hat', 'ribbon', 'clothes', 'robe'],
    look: {
      headgear: 'wizardHat', torso: 'robe', legs: 'robe', cape: 'none', shoulders: 'none',
      palette: { primary: '#2c3c7e', secondary: '#1d2446', accent: '#d9c46e', leather: '#4a3423' },
      shadowFace: true,
      extras: ['belt'],
      bulk: 0.92,
    },
  },
];

/** Black magic defaults: faith-based, reflectable, castable by Arithmancers, copied by Mimics. */
const B = { kind: 'action', skillset: 'blackMagic', magic: true, calc: true, mimic: true, anim: 'cast', target: 'enemy', range: 4 } as const;

/** One tier of an elemental spell line: MA × Q × Faith damage. */
function bolt(
  id: string, name: string, element: Element, tier: string, q: number,
  jp: number, mp: number, ct: number, aoe: number, aoeV: number, vfx: VfxId, color: string,
): AbilityDef {
  const noun = element === 'fire' ? 'flame' : element === 'ice' ? 'frost' : 'lightning';
  return {
    ...B, id, name, jp, mp, ct, aoe, aoeV, element, vfx, color,
    desc: `${tier} ${noun} upon an area. ${element[0].toUpperCase()}${element.slice(1)} damage: MA × ${q} × Faith.`,
    effects: [{ type: 'damage', formula: F.magic(q), element }],
  };
}

export const abilities: AbilityDef[] = [
  bolt('fire', 'Fire', 'fire', 'Calls a burst of', 14, 50, 6, 4, 2, 1, 'flames', '#ff8a3a'),
  bolt('fira', 'Fira', 'fire', 'Calls a gout of', 18, 200, 12, 5, 2, 2, 'flames', '#ff6a2a'),
  bolt('firaga', 'Firaga', 'fire', 'Calls a pillar of', 24, 480, 24, 7, 2, 3, 'inferno', '#ff4a1a'),
  bolt('firaja', 'Firaja', 'fire', 'Calls a firestorm of', 32, 850, 48, 10, 3, 3, 'inferno', '#ff3010'),
  bolt('thunder', 'Thunder', 'lightning', 'Calls a crackle of', 14, 50, 6, 4, 2, 1, 'bolt', '#fff27a'),
  bolt('thundara', 'Thundara', 'lightning', 'Calls a fork of', 18, 200, 12, 5, 2, 2, 'bolt', '#fff05a'),
  bolt('thundaga', 'Thundaga', 'lightning', 'Calls a storm of', 24, 480, 24, 7, 2, 3, 'thunder', '#ffe83a'),
  bolt('thundaja', 'Thundaja', 'lightning', 'Calls heaven\'s wrath of', 32, 850, 48, 10, 3, 3, 'thunder', '#fffbd0'),
  bolt('blizzard', 'Blizzard', 'ice', 'Calls a flurry of', 14, 50, 6, 4, 2, 1, 'ice', '#9fe0ff'),
  bolt('blizzara', 'Blizzara', 'ice', 'Calls spears of', 18, 200, 12, 5, 2, 2, 'ice', '#86d4ff'),
  bolt('blizzaga', 'Blizzaga', 'ice', 'Calls a glacier of', 24, 480, 24, 7, 2, 3, 'glacier', '#6ec8ff'),
  bolt('blizzaja', 'Blizzaja', 'ice', 'Calls a howling blizzard of', 32, 850, 48, 10, 3, 3, 'blizzard', '#d8f4ff'),
  {
    ...B, id: 'poison', name: 'Poison', desc: 'A miasma that seeps into the blood of all in the area. Inflicts Poison. Success: (MA + 160) × Faith.', jp: 150,
    mp: 6, ct: 3, aoe: 2, aoeV: 2, vfx: 'poison', color: '#8ccf3a',
    hit: F.hitMa(160),
    effects: [{ type: 'status', add: ['poison'] }], ai: { debuff: true },
  },
  {
    ...B, id: 'frogSpell', name: 'Toad', desc: 'Turns the target into a croaking toad. Success: (MA + 120) × Faith.', jp: 500,
    mp: 12, ct: 5, range: 3, vfx: 'status', color: '#5fb83a',
    hit: F.hitMa(120),
    effects: [{ type: 'status', add: ['frog'] }], ai: { debuff: true },
  },
  {
    ...B, id: 'death', name: 'Death', desc: 'Speaks the target\'s true name to the grave. Instant KO; restores the undead. Success: (MA + 100) × Faith.', jp: 600,
    mp: 24, ct: 10, vfx: 'dark', color: '#6a2a8a',
    hit: F.hitMa(100),
    effects: [{ type: 'special', id: 'instantKo' }], ai: { debuff: true },
  },
  {
    ...B, id: 'flare', name: 'Flare', desc: 'The mightiest word of black magic: a searing star upon one foe. MA × 46 × Faith.', jp: 900,
    mp: 60, ct: 7, range: 5, vfx: 'flare', color: '#ffd0a0',
    effects: [{ type: 'damage', formula: F.magic(46) }],
  },
  // ---- reaction / support / movement ----
  { id: 'counterMagic', name: 'Counter Magic', desc: 'When struck by a spell, cast the same spell back at its caster (paying its MP).', kind: 'reaction', jp: 800, skillset: 'wizard' },
  { id: 'maSave', name: 'MA Save', desc: 'When wounded, anger sharpens the mind: MA may rise by 1.', kind: 'reaction', jp: 450, skillset: 'wizard' },
  { id: 'magicAttackUp', name: 'Magic Attack Up', desc: 'Increases the potency of spells and magical healing.', kind: 'support', jp: 400, skillset: 'wizard' },
];
