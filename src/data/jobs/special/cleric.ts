// Alys Valorne — "Benediction". White magic of the abbey, and at the very end, Seraph's Ward.
import type { AbilityDef, JobDef } from '../../types';
import { F } from '../../../battle/formulas';

const SK = 'benediction';

export const jobs: JobDef[] = [
  {
    id: 'cleric', name: 'Abbey Cleric', desc: 'A novice of Orvelle Abbey whose prayers carry further than her teachers\' — as if something vast were listening.',
    generic: false,
    unique: 'alys',
    gender: 'f',
    skillset: { id: SK, name: 'Benediction', desc: 'Blessings of healing, cleansing and protection learned at the abbey.' },
    abilities: ['clericBlessing', 'clericGrace', 'clericRekindle', 'clericPurify', 'clericRadiance', 'clericSeraphsWard'],
    move: 3, jump: 3, cev: 5,
    mult: { hp: 85, mp: 125, sp: 105, pa: 55, ma: 120 },
    growth: { hp: 12, mp: 10, sp: 95, pa: 75, ma: 44 },
    equip: ['staff', 'rod', 'book', 'hat', 'clothes', 'robe'],
    look: {
      headgear: 'veil', torso: 'robe', legs: 'robe', cape: 'none', shoulders: 'none',
      palette: { primary: '#f4f0e8', secondary: '#c8b890', accent: '#b03040', leather: '#6a5040' },
      extras: ['sash', 'book'],
      bulk: 0.9,
    },
  },
];

export const abilities: AbilityDef[] = [
  {
    id: 'clericBlessing', name: 'Blessing', desc: 'A simple blessing that closes wounds. Restores HP in a small area.', kind: 'action', jp: 50, skillset: SK,
    range: 4, aoe: 2, ct: 3, mp: 6, magic: true, target: 'ally', anim: 'pray', vfx: 'heal', color: '#c0ffd0', mimic: false,
    effects: [{ type: 'heal', formula: F.magic(15) }], ai: { heal: true },
  },
  {
    id: 'clericGrace', name: 'Grace', desc: 'A deeper prayer of healing. Restores much HP in a small area.', kind: 'action', jp: 300, skillset: SK,
    range: 4, aoe: 2, ct: 5, mp: 16, magic: true, target: 'ally', anim: 'pray', vfx: 'healBig', color: '#d0ffe0', mimic: false,
    effects: [{ type: 'heal', formula: F.magic(26) }], ai: { heal: true },
  },
  {
    id: 'clericRekindle', name: 'Rekindle', desc: 'Call a fallen ally back from the threshold with half their HP. Fells the undead.', kind: 'action', jp: 300, skillset: SK,
    range: 4, ct: 4, mp: 12, magic: true, target: 'ko', anim: 'pray', vfx: 'revive', color: '#fff4b0', mimic: false,
    hit: F.hitMa(150),
    effects: [{ type: 'revive', pct: 0.5 }], ai: { revive: true },
  },
  {
    id: 'clericPurify', name: 'Purify', desc: 'Cleanses body and soul of most ailments in a small area.', kind: 'action', jp: 250, skillset: SK,
    range: 4, aoe: 2, ct: 3, mp: 16, magic: true, target: 'ally', anim: 'pray', vfx: 'sparkleGreen', color: '#e0ffe0', mimic: false,
    effects: [{ type: 'status', remove: ['petrify', 'confuse', 'blind', 'silence', 'oil', 'frog', 'chicken', 'poison', 'slow', 'stop', 'sleep', 'immobilize', 'disable', 'berserk', 'doom'] }],
    ai: { heal: true },
  },
  {
    id: 'clericRadiance', name: 'Radiance', desc: 'The light of the high altar, loosed upon the foe. Heavy holy damage.', kind: 'action', jp: 600, skillset: SK,
    range: 5, ct: 6, mp: 40, magic: true, element: 'holy', target: 'enemy', anim: 'cast', vfx: 'holy', color: '#ffffff', mimic: false,
    triggersReaction: 'magic',
    effects: [{ type: 'damage', formula: F.magic(36) }],
  },
  {
    id: 'clericSeraphsWard', name: "Seraph's Ward", desc: 'The last blessing, spoken with a voice not wholly her own. Grants Protect, Shell, Haste, Regen and Reraise to one ally.', kind: 'action', jp: 1000, skillset: SK,
    range: 4, mp: 20, magic: true, noReflect: true, target: 'ally', anim: 'pray', vfx: 'phoenix', color: '#ffd8e0', mimic: false,
    effects: [{ type: 'status', add: ['protect', 'shell', 'haste', 'regen', 'reraise'], all: true }],
    ai: { buff: true, score: 30 },
  },
];
