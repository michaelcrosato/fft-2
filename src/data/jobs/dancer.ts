import type { AbilityDef, EffectSpec, JobDef } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'dancer', name: 'Dancer', desc: 'A performer whose bewitching steps sap the will of every foe that watches. Dances on until she chooses to act again.',
    generic: true,
    gender: 'f',
    requires: [{ job: 'geomancer', level: 4 }, { job: 'lancer', level: 4 }],
    skillset: { id: 'dance', name: 'Dance', desc: 'Dances that afflict every foe at once. The Dancer keeps dancing, measure after measure, until she takes another action.' },
    abilities: [
      'witchsReel', 'bladeDance', 'slowDance', 'polka', 'disquiet', 'namelessDance', 'lastWaltz',
      'paSave', 'jump3', 'fly',
    ],
    move: 3, jump: 3, cev: 5,
    mult: { hp: 60, mp: 50, sp: 100, pa: 110, ma: 95 },
    growth: { hp: 20, mp: 20, sp: 100, pa: 50, ma: 50 },
    equip: ['knife', 'cloth', 'hat', 'clothes'],
    look: {
      headgear: 'circlet', torso: 'leotard', legs: 'tights', cape: 'none', shoulders: 'none',
      palette: { primary: '#e0609a', secondary: '#f4c0d8', accent: '#e8c050', metal: '#e8c050', leather: '#7a3a4a' },
      extras: ['sash', 'bells'],
      bulk: 0.9,
    },
  },
];

/** A dance: performed on every foe, repeating each time its charge completes. */
function dance(
  id: string, name: string, ct: number, desc: string, effects: EffectSpec[], hitPct: number, color = '#ff9ad0',
): AbilityDef {
  return {
    id, name, desc, kind: 'action', jp: 100, skillset: 'dance',
    perform: true, ct, range: 0, shape: 'allEnemies',
    hit: hitPct < 100 ? F.fixedHit(hitPct) : undefined,
    anim: 'dance', vfx: 'dance', color, mimic: true,
    effects, ai: { debuff: true },
  };
}

export const abilities: AbilityDef[] = [
  dance('witchsReel', "Witch's Reel", 6, 'A dizzying reel that drains the MP of every foe. ([(PA + MA) / 2] MP damage)',
    [{ type: 'damage', stat: 'mp', formula: F.paMa(1) }], 100, '#b090ff'),
  dance('bladeDance', 'Blade Dance', 6, 'Flashing, whirling steps that cut every foe. ([(PA + MA) / 2] damage)',
    [{ type: 'damage', formula: F.paMa(1) }], 100, '#ff7090'),
  dance('slowDance', 'Slow Dance', 8, 'A languid, drowsy measure. Each foe has a 50% chance to lose 1 Speed.',
    [{ type: 'stat', stat: 'speed', amount: -1 }], 50, '#90b0ff'),
  dance('polka', 'Polka', 8, 'A giddy, stamping round that tires the arm. Each foe has a 50% chance to lose 1 PA.',
    [{ type: 'stat', stat: 'pa', amount: -1 }], 50, '#ffb070'),
  dance('disquiet', 'Disquiet', 10, 'An unsettling dance that clouds the mind. Each foe has a 50% chance to lose 1 MA.',
    [{ type: 'stat', stat: 'ma', amount: -1 }], 50, '#c090e0'),
  dance('namelessDance', 'Nameless Dance', 10, 'A dance with no name and no end. Each foe has a 50% chance to suffer Poison, Blind, Silence, Stop, Slow, Confusion, Toad or Sleep.',
    [{ type: 'status', add: ['poison', 'blind', 'silence', 'stop', 'slow', 'confuse', 'frog', 'sleep'] }], 50, '#a0a0c0'),
  dance('lastWaltz', 'Last Waltz', 20, 'The final, fatal turn of the floor. Each foe has a one-in-three chance to have their CT reset to 0.',
    [{ type: 'ct', set: 0 }], 33, '#e0c0ff'),
  // ---- reaction / support / movement ----
  { id: 'paSave', name: 'PA Save', desc: 'When damaged, PA rises by 1.', kind: 'reaction', jp: 550, skillset: 'dancer' },
  { id: 'jump3', name: 'Jump +3', desc: 'Increases Jump by 3.', kind: 'movement', jp: 1000, skillset: 'dancer', params: { jump: 3 } },
  // 'fly' is defined in bard.ts (shared by both performers)
];
