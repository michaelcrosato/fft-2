// Automaton VIII ("Octo") — "Gearwork" (source: Worker 8's Work skillset).
// A Lost Age war machine. No equipment, immense strength, immune to most ailments.
import type { AbilityDef, JobDef, Palette } from '../../types';
import { F } from '../../../battle/formulas';

const SK = 'gearwork';
const PAL: Palette = { primary: '#8a7a4a', secondary: '#4a5a4a', accent: '#e0a030', metal: '#a89868', leather: '#3a3028' };

export const jobs: JobDef[] = [
  {
    id: 'automaton', name: 'Automaton', desc: 'A war engine of the Lost Age, woken from a thousand years of silence beneath Cogsgard. It obeys whoever holds the stone that stirred it.',
    generic: false,
    unique: 'octo',
    skillset: { id: SK, name: 'Gearwork', desc: 'Crushing mechanical arts powered by the heart-stone within.' },
    abilities: ['automatonRend', 'automatonCompress', 'automatonPurge', 'automatonPulverize'],
    move: 3, jump: 2, cev: 5,
    mult: { hp: 150, mp: 50, sp: 90, pa: 140, ma: 60 },
    growth: { hp: 9, mp: 20, sp: 110, pa: 35, ma: 60 },
    equip: [],
    look: { headgear: 'none', torso: 'plate', legs: 'armored', palette: PAL, bulk: 1.25 },
    monster: { shape: 'automaton', palette: PAL, scale: 1.1 },
    family: 'automaton',
    base: { hp: 220, mp: 10, speed: 6, pa: 12, ma: 4 },
    monsterSkills: [['automatonRend', 1], ['automatonCompress', 1], ['automatonPurge', 1], ['automatonPulverize', 1]],
    immune: [
      'petrify', 'confuse', 'blind', 'silence', 'frog', 'chicken', 'poison', 'sleep', 'berserk',
      'charm', 'doom', 'vampire', 'undead', 'faith', 'atheist', 'regen', 'reraise',
    ],
    weak: ['lightning', 'water'],
    halve: ['fire', 'ice'],
    noEgg: true,
    noInvite: true,
  },
];

export const abilities: AbilityDef[] = [
  {
    id: 'automatonRend', name: 'Rend', desc: 'Iron claws tear at an adjacent foe. [PA × PA/2] damage.', kind: 'action', jp: 100, skillset: SK,
    range: 1, target: 'enemy', anim: 'claw', vfx: 'slash', color: '#e0a030', evadable: true, mimic: false, triggersReaction: 'physical',
    effects: [{ type: 'damage', formula: F.paHalfPa(1) }],
  },
  {
    id: 'automatonCompress', name: 'Compress', desc: 'Seize a foe and crush them in a hydraulic grip. Heavy damage, may Immobilize.', kind: 'action', jp: 200, skillset: SK,
    range: 1, target: 'enemy', ct: 2, anim: 'punch', vfx: 'impact', color: '#c08040', mimic: false, triggersReaction: 'physical',
    effects: [{ type: 'damage', formula: F.paHalfPa(1.4) }],
    statusChance: [{ status: 'immobilize', chance: 35 }],
  },
  {
    id: 'automatonPurge', name: 'Purge', desc: 'Fire the arm-cannon at a distant foe. Line of fire required.', kind: 'action', jp: 300, skillset: SK,
    range: 6, rangeMin: 2, target: 'enemy', projectile: true, anim: 'shoot', vfx: 'beam', color: '#ffb040', evadable: true, mimic: false, triggersReaction: 'physical',
    effects: [{ type: 'damage', formula: F.paHalfPa(0.8) }],
  },
  {
    id: 'automatonPulverize', name: 'Pulverize', desc: 'Bring both fists down on the ground, hurling foes around the target aside.', kind: 'action', jp: 400, skillset: SK,
    range: 1, aoe: 2, target: 'enemy', ct: 3, enemiesOnly: true, anim: 'punch', vfx: 'quake', color: '#a08050', mimic: false, triggersReaction: 'physical',
    effects: [{ type: 'damage', formula: F.paHalfPa(1.1) }, { type: 'knockback', tiles: 1 }],
  },
];
