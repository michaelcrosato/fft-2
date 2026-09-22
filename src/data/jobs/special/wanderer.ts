// Kestrel Stryde's Wanderer — "Overdrive" (source: Cloud's Limit).
// Techniques from another world. Long charges, heavy blows. Requires a sword.
import type { AbilityDef, JobDef } from '../../types';
import { F } from '../../../battle/formulas';

const SK = 'overdrive';
const BLADE = { weapon: ['sword', 'knightSword'] as Array<'sword' | 'knightSword'> };

export const jobs: JobDef[] = [
  {
    id: 'wanderer', name: 'Wanderer', desc: 'A soldier from a world that is not this one, carrying a sword too large for any sane man. He does not remember how he came here.',
    generic: false,
    unique: 'kestrel',
    gender: 'm',
    skillset: { id: SK, name: 'Overdrive', desc: 'Otherworldly sword techniques with long charges and devastating force. Requires a sword.' },
    abilities: [
      'wandererValorStrike', 'wandererCrossfang', 'wandererBladeWave', 'wandererSkyfall',
      'wandererStarfall', 'wandererFinalTouch', 'wandererSevenfold', 'wandererSakuraFlurry',
    ],
    move: 3, jump: 3, cev: 10,
    mult: { hp: 118, mp: 80, sp: 100, pa: 118, ma: 90 },
    growth: { hp: 10, mp: 15, sp: 100, pa: 42, ma: 50 },
    equip: ['sword', 'knightSword', 'helmet', 'hat', 'armor', 'clothes'],
    look: {
      headgear: 'none', torso: 'vest', legs: 'pants', cape: 'none', shoulders: 'pauldrons',
      palette: { primary: '#26345a', secondary: '#1c2233', accent: '#b8c0cc', metal: '#9aa2ac', leather: '#3a2a20' },
      extras: ['belt', 'gloves'],
    },
  },
];

const base = { kind: 'action' as const, skillset: SK, target: 'enemy' as const, requires: BLADE, anim: 'swing' as const, mimic: false, triggersReaction: 'physical' as const };

export const abilities: AbilityDef[] = [
  {
    ...base, id: 'wandererValorStrike', name: 'Valor Strike', jp: 150, desc: 'Leap high and bring the blade down on a single foe. [PA × WP × 1.1] damage.',
    range: 3, ct: 2, vfx: 'jumpImpact', color: '#c8d8ff',
    effects: [{ type: 'damage', formula: F.paWp(1.1) }],
  },
  {
    ...base, id: 'wandererCrossfang', name: 'Crossfang', jp: 200, desc: 'Three cuts that leave a cross of light. Damage in a small cross, may Confuse.',
    range: 2, aoe: 2, ct: 3, vfx: 'slash', color: '#e0e8ff',
    effects: [{ type: 'damage', formula: F.paWp(0.9) }],
    statusChance: [{ status: 'confuse', chance: 30 }],
  },
  {
    ...base, id: 'wandererBladeWave', name: 'Blade Wave', jp: 250, desc: 'Hurl a crescent of force from the edge of the sword. [PA × WP × 1.2] damage at long range.',
    range: 5, ct: 4, vfx: 'beam', color: '#a0c8ff',
    effects: [{ type: 'damage', formula: F.paWp(1.2) }],
  },
  {
    ...base, id: 'wandererSkyfall', name: 'Skyfall', jp: 350, desc: 'Launch the foe skyward with an upward cut and follow them down. [PA × WP × 1.4] damage.',
    range: 3, ct: 5, vfx: 'jumpImpact', color: '#ffe0a0',
    effects: [{ type: 'damage', formula: F.paWp(1.4) }],
  },
  {
    ...base, id: 'wandererStarfall', name: 'Starfall', jp: 450, desc: 'Call down a rain of burning stars. Five strikes fall at random on foes in a wide area.',
    range: 4, aoe: 3, ct: 6, vfx: 'meteor', color: '#ffb060', enemiesOnly: true,
    special: 'randomStrikes', params: { hits: 5 },
    effects: [{ type: 'damage', formula: F.paWp(0.7) }],
  },
  {
    ...base, id: 'wandererFinalTouch', name: 'Final Touch', jp: 550, desc: 'A whirlwind that ends things. Inflicts Stop, Stone or Doom on foes around the target. Success (PA + 40)%.',
    range: 3, aoe: 2, ct: 7, vfx: 'wind', color: '#c0ffd0', enemiesOnly: true,
    hit: F.hitPa(40),
    effects: [{ type: 'status', add: ['stop', 'petrify', 'doom'] }],
    ai: { debuff: true },
  },
  {
    ...base, id: 'wandererSevenfold', name: 'Sevenfold Slash', jp: 700, desc: 'Seven blinding cuts, too fast to follow. Seven strikes fall at random on foes around the target.',
    range: 3, aoe: 2, ct: 8, vfx: 'sword', color: '#d0e0ff', enemiesOnly: true,
    special: 'randomStrikes', params: { hits: 7 },
    effects: [{ type: 'damage', formula: F.paWp(0.55) }],
  },
  {
    ...base, id: 'wandererSakuraFlurry', name: 'Sakura Flurry', jp: 900, desc: 'A storm of petals and steel. [PA × WP × 1.8] damage to all foes in a wide area.',
    range: 3, aoe: 3, ct: 10, vfx: 'wind', color: '#ffb0d0', enemiesOnly: true,
    effects: [{ type: 'damage', formula: F.paWp(1.8) }],
  },
];
