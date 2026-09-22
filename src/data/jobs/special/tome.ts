// Grimwald — a living book from the Midnight Deep. "Grimoire" (source: Byblos's skills).
import type { AbilityDef, JobDef, Palette } from '../../types';
import { F } from '../../../battle/formulas';

const SK = 'grimoire';
const PAL: Palette = { primary: '#5a2a3a', secondary: '#e8dcc0', accent: '#d8b040', leather: '#3a1e20' };

export const jobs: JobDef[] = [
  {
    id: 'tome', name: 'Grimoire', desc: 'A book that reads its readers. Bound in something that is not quite leather, it drifts a hand\'s breadth above the ground, muttering.',
    generic: false,
    unique: 'grimwald',
    skillset: { id: SK, name: 'Grimoire', desc: 'Pages of strange arithmetic: life for life, pain for pain.' },
    abilities: ['tomeInvigorate', 'tomeParasite', 'tomeRetort', 'tomeDifference'],
    move: 3, jump: 3, cev: 15,
    mult: { hp: 110, mp: 130, sp: 100, pa: 70, ma: 125 },
    growth: { hp: 11, mp: 11, sp: 100, pa: 60, ma: 42 },
    equip: [],
    look: { headgear: 'none', torso: 'robe', legs: 'robe', palette: PAL },
    monster: { shape: 'tome', palette: PAL, scale: 1 },
    family: 'tome',
    base: { hp: 140, mp: 80, speed: 8, pa: 5, ma: 11 },
    monsterSkills: [['tomeInvigorate', 1], ['tomeParasite', 1], ['tomeRetort', 1], ['tomeDifference', 1]],
    always: ['float'],
    immune: ['blind', 'poison', 'sleep', 'frog', 'chicken', 'petrify', 'undead', 'vampire', 'berserk'],
    weak: ['fire'],
    absorb: ['dark'],
    noEgg: true,
    noInvite: true,
  },
];

export const abilities: AbilityDef[] = [
  {
    id: 'tomeInvigorate', name: 'Invigorate', desc: 'Tear out a page of its own life and press it into an ally: costs a fifth of max HP, restores twice that.', kind: 'action', jp: 150, skillset: SK,
    range: 3, target: 'ally', anim: 'cast', vfx: 'heal', color: '#e0f0a0', mimic: false,
    effects: [{ type: 'special', id: 'wish' }], ai: { heal: true },
  },
  {
    id: 'tomeParasite', name: 'Parasite', desc: 'A word crawls off the page and burrows into the foe, inflicting a random ailment. Success (MA + 50)%.', kind: 'action', jp: 250, skillset: SK,
    range: 4, target: 'enemy', ct: 2, mp: 8, anim: 'cast', vfx: 'poison', color: '#80a040', mimic: false, triggersReaction: 'magic',
    hit: F.hitMaNoFaith(50),
    effects: [{ type: 'status', add: ['poison', 'slow', 'blind', 'silence', 'confuse', 'frog', 'sleep'] }],
    ai: { debuff: true },
  },
  {
    id: 'tomeRetort', name: 'Retort', desc: 'Every wound it has suffered, written down and read back. Damage equal to the HP the caster has lost.', kind: 'action', jp: 300, skillset: SK,
    range: 4, target: 'enemy', anim: 'cast', vfx: 'glyph', color: '#d04040', mimic: false, triggersReaction: 'magic',
    effects: [{ type: 'special', id: 'balance' }],
  },
  {
    id: 'tomeDifference', name: 'Difference', desc: 'Every spell the foe has cast is tallied in its margins. Damage equal to the target\'s spent MP.', kind: 'action', jp: 300, skillset: SK,
    range: 4, target: 'enemy', mp: 4, anim: 'cast', vfx: 'glyph', color: '#6060d0', mimic: false, triggersReaction: 'magic',
    effects: [{ type: 'damage', formula: (x) => Math.max(1, x.t.maxMp - x.t.mp) }],
  },
];
