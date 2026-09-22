import type { AbilityDef, EffectSpec, FormulaCtx, JobDef } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'bard', name: 'Bard', desc: 'A wandering minstrel whose ballads stir the blood of every comrade on the field. Sings on until he chooses to act again.',
    generic: true,
    gender: 'm',
    requires: [{ job: 'summoner', level: 4 }, { job: 'orator', level: 4 }],
    skillset: { id: 'bardsong', name: 'Bardsong', desc: 'Songs that lift every ally at once. The Bard keeps singing, verse after verse, until he takes another action.' },
    abilities: [
      'seraphSong', 'hymnOfLife', 'rallySong', 'warChant', 'arcaneAir', 'namelessSong', 'finale',
      'faithUp', 'move3', 'fly',
    ],
    move: 3, jump: 3, cev: 5,
    mult: { hp: 55, mp: 50, sp: 100, pa: 30, ma: 115 },
    growth: { hp: 20, mp: 20, sp: 100, pa: 80, ma: 50 },
    equip: ['instrument', 'hat', 'clothes'],
    look: {
      headgear: 'featherCap', torso: 'jerkin', legs: 'tights', cape: 'short', shoulders: 'none',
      palette: { primary: '#1f7a74', secondary: '#c8a84a', accent: '#f0d878', leather: '#5a3b24' },
      extras: ['feather', 'belt', 'satchel'],
      bulk: 0.95,
    },
  },
];

/** A song: performed on every ally, repeating each time its charge completes. */
function song(
  id: string, name: string, ct: number, desc: string, effects: EffectSpec[],
  hitPct: number, ai: AbilityDef['ai'], color = '#9fe0d0',
): AbilityDef {
  return {
    id, name, desc, kind: 'action', jp: 100, skillset: 'bardsong',
    perform: true, ct, range: 0, shape: 'allAllies',
    hit: hitPct < 100 ? F.fixedHit(hitPct) : undefined,
    anim: 'sing', vfx: 'song', color, mimic: true,
    effects, ai,
  };
}

const maPlus = (k: number) => (x: FormulaCtx) => x.c.ma + k;

export const abilities: AbilityDef[] = [
  song('seraphSong', 'Seraph Song', 6, 'A hymn of the high choirs. Restores MP to every ally. (MA + 20)',
    [{ type: 'heal', stat: 'mp', formula: maPlus(20) }], 100, { heal: true }, '#bfe8ff'),
  song('hymnOfLife', 'Hymn of Life', 6, 'A warm and steady air. Restores HP to every ally. (MA + 10)',
    [{ type: 'heal', formula: maPlus(10) }], 100, { heal: true }, '#9ff0b0'),
  song('rallySong', 'Rally Song', 8, 'A quickstep marching tune. Each ally has a 50% chance to gain +1 Speed.',
    [{ type: 'stat', stat: 'speed', amount: 1 }], 50, { buff: true }),
  song('warChant', 'War Chant', 8, 'A thunderous battle-chant. Each ally has a 50% chance to gain +1 PA.',
    [{ type: 'stat', stat: 'pa', amount: 1 }], 50, { buff: true }, '#ffb080'),
  song('arcaneAir', 'Arcane Air', 10, 'An eerie, lilting melody. Each ally has a 50% chance to gain +1 MA.',
    [{ type: 'stat', stat: 'ma', amount: 1 }], 50, { buff: true }, '#d0a0ff'),
  song('namelessSong', 'Nameless Song', 10, 'A song with no name and no end. Each ally has a 50% chance to gain Regen, Haste, Protect, Shell or Reraise.',
    [{ type: 'status', add: ['regen', 'haste', 'protect', 'shell', 'reraise'] }], 50, { buff: true }, '#f0e0a0'),
  song('finale', 'Finale', 20, 'The last and grandest verse. Each ally has a one-in-three chance to be readied to act at once.',
    [{ type: 'ct', set: 100 }], 33, { buff: true }, '#ffe890'),
  // ---- reaction / support / movement ----
  { id: 'faithUp', name: 'Faith Up', desc: 'When damaged, Faith rises by 3.', kind: 'reaction', jp: 500, skillset: 'bard' },
  { id: 'move3', name: 'Move +3', desc: 'Increases Move by 3.', kind: 'movement', jp: 1000, skillset: 'bard', params: { move: 3 } },
  { id: 'fly', name: 'Fly', desc: 'Soar over any terrain and obstacle when moving; heights are no barrier.', kind: 'movement', jp: 1200, skillset: 'bard' },
];
