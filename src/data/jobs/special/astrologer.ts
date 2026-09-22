// Oren Durant's Astrologer — "Stargazing" (source: Olan's Astrology / Galaxy Stop).
import type { AbilityDef, JobDef } from '../../types';
import { F } from '../../../battle/formulas';

const SK = 'stargazing';

export const jobs: JobDef[] = [
  {
    id: 'astrologer', name: 'Astrologer', desc: 'A reader of the heavens and keeper of chronicles. Where he looks, the stars hold still — and so does the enemy.',
    generic: false,
    unique: 'oren',
    gender: 'm',
    skillset: { id: SK, name: 'Stargazing', desc: 'Arts of the night sky that freeze the foe in the moment.' },
    abilities: ['astroStarStop'],
    move: 3, jump: 3, cev: 10,
    mult: { hp: 90, mp: 110, sp: 100, pa: 85, ma: 110 },
    growth: { hp: 12, mp: 13, sp: 100, pa: 55, ma: 47 },
    equip: ['knife', 'rod', 'staff', 'book', 'hat', 'clothes', 'robe'],
    look: {
      headgear: 'none', torso: 'coat', legs: 'pants', cape: 'mantle', shoulders: 'none',
      palette: { primary: '#2a4a6a', secondary: '#c8c0a8', accent: '#e0d080', leather: '#5a3b24' },
      extras: ['book', 'satchel', 'belt'],
    },
  },
];

export const abilities: AbilityDef[] = [
  {
    id: 'astroStarStop', name: 'Star Stop', desc: 'Read the stars aloud and hold every foe in their light. Stops all enemies, may also Slow them. Success (MA + 30)%.', kind: 'action', jp: 800, skillset: SK,
    range: 0, shape: 'allEnemies', target: 'enemy', ct: 4, mp: 20, anim: 'pray', vfx: 'time', color: '#c8d8ff', mimic: false,
    hit: F.hitMaNoFaith(30),
    effects: [{ type: 'status', add: ['stop'] }],
    statusChance: [{ status: 'slow', chance: 30 }],
    ai: { debuff: true, score: 30 },
  },
];
