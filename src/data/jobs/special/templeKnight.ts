// Beorn Kadmas's Temple Knight — "Spellblade" (source: Beowulf's Magic Sword).
// Spells channelled through the knight's blade: faith-scaled status strikes and drains.
import type { AbilityDef, JobDef, StatusId, VfxId } from '../../types';
import { F } from '../../../battle/formulas';

const SK = 'spellblade';
const BLADE = { weapon: ['sword', 'knightSword'] as Array<'sword' | 'knightSword'> };

function brand(id: string, name: string, jp: number, mp: number, base: number, add: StatusId, vfx: VfxId, color: string, desc: string): AbilityDef {
  return {
    id, name, desc: `${desc} Success (MA + ${base})%, Faith-scaled.`, kind: 'action', jp, skillset: SK,
    range: 3, target: 'enemy', mp, magic: true, anim: 'swing', vfx, color, mimic: false, triggersReaction: 'magic',
    requires: BLADE,
    hit: F.hitMa(base),
    effects: [{ type: 'status', add: [add] }],
    ai: { debuff: true },
  };
}

export const jobs: JobDef[] = [
  {
    id: 'templeKnight', name: 'Temple Knight', desc: 'A knight of the old temple orders who hunts heretics and beasts alike, spells running down the length of his sword.',
    generic: false,
    unique: 'beorn',
    gender: 'm',
    skillset: { id: SK, name: 'Spellblade', desc: 'Spells cast along the blade — blinding, silencing, stopping and draining. Requires a sword.' },
    abilities: [
      'templeBlindingEdge', 'templeManaLeech', 'templeLifeLeech', 'templeFaithBrand', 'templeGraveBrand',
      'templeHushBlade', 'templeRageBrand', 'templeCravenBrand', 'templeSirenEdge', 'templeDeathsChill', 'templeStasisBrand',
    ],
    move: 4, jump: 3, cev: 12,
    mult: { hp: 112, mp: 105, sp: 100, pa: 110, ma: 105 },
    growth: { hp: 10, mp: 14, sp: 100, pa: 45, ma: 47 },
    equip: ['sword', 'knightSword', 'shield', 'helmet', 'armor', 'robe', 'clothes'],
    look: {
      headgear: 'none', torso: 'mail', legs: 'armored', cape: 'tabard', shoulders: 'pads',
      palette: { primary: '#6a7a4a', secondary: '#3a3a30', accent: '#d8c070', metal: '#a8aeb4', leather: '#4a3423' },
      extras: ['belt', 'gloves'],
    },
  },
];

export const abilities: AbilityDef[] = [
  brand('templeBlindingEdge', 'Blinding Edge', 100, 4, 200, 'blind', 'dark', '#403050', 'A flash of darkness along the blade blinds the foe.'),
  {
    id: 'templeManaLeech', name: 'Mana Leech', desc: 'The blade drinks the foe\'s mana. Absorbs MP.', kind: 'action', jp: 200, skillset: SK,
    range: 3, target: 'enemy', mp: 2, magic: true, anim: 'swing', vfx: 'drain', color: '#6080ff', mimic: false, triggersReaction: 'magic',
    requires: BLADE, hit: F.hitMa(180),
    effects: [{ type: 'damage', stat: 'mp', formula: F.magic(8), drain: true }],
  },
  {
    id: 'templeLifeLeech', name: 'Life Leech', desc: 'The blade drinks the foe\'s blood. Absorbs HP, Faith-scaled.', kind: 'action', jp: 300, skillset: SK,
    range: 3, target: 'enemy', mp: 12, magic: true, anim: 'swing', vfx: 'drain', color: '#c02040', mimic: false, triggersReaction: 'magic',
    requires: BLADE, hit: F.hitMa(160),
    effects: [{ type: 'damage', formula: F.magic(24), drain: true }],
  },
  {
    id: 'templeFaithBrand', name: 'Faith Brand', desc: 'Touch an ally with the blessed blade: their Faith is treated as 100 for a while.', kind: 'action', jp: 200, skillset: SK,
    range: 3, target: 'ally', mp: 10, magic: true, anim: 'pray', vfx: 'buff', color: '#fff0b0', mimic: false,
    requires: BLADE,
    effects: [{ type: 'status', add: ['faith'] }],
    ai: { buff: true },
  },
  brand('templeGraveBrand', 'Grave Brand', 300, 20, 100, 'undead', 'dark', '#708060', 'Marks the foe with the grave: healing will burn them.'),
  brand('templeHushBlade', 'Hush Blade', 200, 16, 190, 'silence', 'status', '#a0a8c0', 'A soundless cut that steals the voice.'),
  brand('templeRageBrand', 'Rage Brand', 400, 16, 160, 'berserk', 'buffRed', '#ff4040', 'Kindles blind rage in the foe.'),
  {
    id: 'templeCravenBrand', name: 'Craven Brand', desc: 'A cut that bleeds away courage. Brave -30. Success (MA + 160)%, Faith-scaled.', kind: 'action', jp: 250, skillset: SK,
    range: 3, target: 'enemy', mp: 20, magic: true, anim: 'swing', vfx: 'debuff', color: '#e0d060', mimic: false, triggersReaction: 'magic',
    requires: BLADE, hit: F.hitMa(160),
    effects: [{ type: 'stat', stat: 'brave', amount: -30 }],
    ai: { debuff: true },
  },
  brand('templeSirenEdge', 'Siren Edge', 400, 20, 140, 'charm', 'song', '#ff90c0', 'A blade that sings sweetly; the foe turns to your side.'),
  brand('templeDeathsChill', "Death's Chill", 600, 24, 120, 'doom', 'dark', '#402060', 'A cold that settles in the bones and counts down to death.'),
  brand('templeStasisBrand', 'Stasis Brand', 800, 28, 120, 'stop', 'time', '#90b8ff', 'The blade traces a star and time halts for the foe.'),
];
