// Princess Oriane — "Royal Prayer". A frail fighter but a steady healer and warder.
import type { AbilityDef, JobDef } from '../../types';
import { F } from '../../../battle/formulas';

const SK = 'royalPrayer';

export const jobs: JobDef[] = [
  {
    id: 'princess', name: 'Princess', desc: 'A daughter of the crown raised behind abbey walls. She has never held a sword, but her prayers are heard.',
    generic: false,
    unique: 'oriane',
    gender: 'f',
    skillset: { id: SK, name: 'Royal Prayer', desc: 'Holy prayers of the royal chapel: mending, warding and a gentle light.' },
    abilities: ['princessMend', 'princessAegis', 'princessVeil', 'princessVesper'],
    move: 3, jump: 3, cev: 5,
    mult: { hp: 80, mp: 120, sp: 100, pa: 50, ma: 115 },
    growth: { hp: 13, mp: 11, sp: 100, pa: 80, ma: 45 },
    equip: ['staff', 'rod', 'hat', 'clothes', 'robe'],
    look: {
      headgear: 'tiara', torso: 'gown', legs: 'gown', cape: 'long', shoulders: 'none',
      palette: { primary: '#f4f2ee', secondary: '#9ab8e0', accent: '#e0c060', leather: '#8a7050' },
      extras: ['sash'],
      bulk: 0.9,
    },
  },
];

export const abilities: AbilityDef[] = [
  {
    id: 'princessMend', name: 'Royal Mend', desc: 'A prayer for the wounded. Restores HP to allies in a small area.', kind: 'action', jp: 100, skillset: SK,
    range: 4, aoe: 2, ct: 3, mp: 8, magic: true, target: 'ally', anim: 'pray', vfx: 'heal', color: '#c0ffd0', mimic: false,
    effects: [{ type: 'heal', formula: F.magic(15) }], ai: { heal: true },
  },
  {
    id: 'princessAegis', name: 'Royal Aegis', desc: 'The crown\'s protection upon the faithful. Grants Protect in a small area.', kind: 'action', jp: 150, skillset: SK,
    range: 3, aoe: 2, ct: 2, mp: 8, magic: true, target: 'ally', anim: 'pray', vfx: 'guard', color: '#ffe8a0', mimic: false,
    effects: [{ type: 'status', add: ['protect'] }], ai: { buff: true },
  },
  {
    id: 'princessVeil', name: 'Royal Veil', desc: 'A veil of prayer against sorcery. Grants Shell in a small area.', kind: 'action', jp: 150, skillset: SK,
    range: 3, aoe: 2, ct: 2, mp: 8, magic: true, target: 'ally', anim: 'pray', vfx: 'guard', color: '#b0d8ff', mimic: false,
    effects: [{ type: 'status', add: ['shell'] }], ai: { buff: true },
  },
  {
    id: 'princessVesper', name: 'Vesper Light', desc: 'The evening light of the abbey chapel, turned upon a foe. Weak holy damage.', kind: 'action', jp: 200, skillset: SK,
    range: 4, ct: 3, mp: 6, magic: true, element: 'holy', target: 'enemy', anim: 'pray', vfx: 'holy', color: '#fff4d0', mimic: false,
    triggersReaction: 'magic',
    effects: [{ type: 'damage', formula: F.magic(12) }],
  },
];
