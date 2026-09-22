import type { AbilityDef, JobDef } from '../types';

export const jobs: JobDef[] = [
  {
    id: 'mime', name: 'Mimic', desc: 'A silent, painted performer who echoes every deed of his comrades — sword-stroke, spell and song alike — mirrored from where he stands.',
    generic: true,
    requires: [
      { job: 'squire', level: 8 }, { job: 'chemist', level: 8 }, { job: 'summoner', level: 4 },
      { job: 'orator', level: 4 }, { job: 'geomancer', level: 4 }, { job: 'lancer', level: 4 },
    ],
    skillset: { id: 'mimicry', name: 'Mimicry', desc: 'Has no commands of its own. Whenever an ally acts, the Mimic repeats the deed, mirrored relative to his own position.' },
    abilities: [],
    innate: ['martialArts', 'monsterTalk'],
    move: 4, jump: 4, cev: 5,
    mult: { hp: 140, mp: 50, sp: 120, pa: 120, ma: 115 },
    growth: { hp: 6, mp: 30, sp: 100, pa: 35, ma: 40 },
    // Mimics cannot equip weapons or armour of any kind.
    equip: [],
    look: {
      headgear: 'jesterCap', torso: 'tunic', legs: 'tights', cape: 'none', shoulders: 'none',
      palette: { primary: '#1a1a1e', secondary: '#f2f2f2', accent: '#c02a3a', leather: '#1a1a1e' },
      extras: ['mask', 'gloves'],
    },
  },
];

/** Mimics learn nothing: they mirror their allies' actions automatically. */
export const abilities: AbilityDef[] = [];
