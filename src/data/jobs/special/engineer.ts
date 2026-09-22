// Mattis Brunel's Engineer — "Marksman" (source: Mustadio's Snipe).
// Crippling gunshots; success (50 + Speed)% / Seal Evil (70 + Speed)% on the undead only.
import type { AbilityDef, JobDef } from '../../types';
import { F } from '../../../battle/formulas';

const SK = 'marksman';
const GUNS = { weapon: ['gun', 'magicGun'] as Array<'gun' | 'magicGun'> };

export const jobs: JobDef[] = [
  {
    id: 'engineer', name: 'Engineer', desc: 'An artificer of Cogsgard who has learned to make the relics of the Lost Age sing — and shoot.',
    generic: false,
    unique: 'mattis',
    gender: 'm',
    skillset: { id: SK, name: 'Marksman', desc: 'Precise gunshots that cripple rather than kill. Requires a gun.' },
    abilities: ['engineerLegShot', 'engineerArmShot', 'engineerSealEvil'],
    move: 4, jump: 3, cev: 8,
    mult: { hp: 105, mp: 75, sp: 100, pa: 105, ma: 80 },
    growth: { hp: 11, mp: 16, sp: 100, pa: 50, ma: 50 },
    equip: ['gun', 'magicGun', 'knife', 'hat', 'clothes'],
    look: {
      headgear: 'goggles', torso: 'vest', legs: 'pants', cape: 'none', shoulders: 'none',
      palette: { primary: '#b0834a', secondary: '#4a5a6a', accent: '#d8c070', metal: '#9aa4ae', leather: '#5a3b24' },
      extras: ['belt', 'satchel', 'gloves'],
    },
  },
];

export const abilities: AbilityDef[] = [
  {
    id: 'engineerLegShot', name: 'Leg Shot', desc: 'A shot to the legs that pins the target in place. Immobilize, success (50 + Speed)%.', kind: 'action', jp: 200, skillset: SK,
    range: 'weapon', target: 'enemy', projectile: true, evadable: true, anim: 'gun', vfx: 'bullet', color: '#e0c890', mimic: false,
    requires: GUNS, triggersReaction: 'physical',
    hit: F.hitSp(50),
    effects: [{ type: 'status', add: ['immobilize'] }], ai: { debuff: true },
  },
  {
    id: 'engineerArmShot', name: 'Arm Shot', desc: 'A shot to the sword arm that leaves the target unable to act. Disable, success (50 + Speed)%.', kind: 'action', jp: 300, skillset: SK,
    range: 'weapon', target: 'enemy', projectile: true, evadable: true, anim: 'gun', vfx: 'bullet', color: '#e0c890', mimic: false,
    requires: GUNS, triggersReaction: 'physical',
    hit: F.hitSp(50),
    effects: [{ type: 'status', add: ['disable'] }], ai: { debuff: true },
  },
  {
    id: 'engineerSealEvil', name: 'Seal Evil', desc: 'A blessed round of Cogsgard make. Turns the undead to stone; harmless to the living. Success (70 + Speed)%.', kind: 'action', jp: 200, skillset: SK,
    range: 'weapon', target: 'enemy', projectile: true, evadable: true, anim: 'gun', vfx: 'holy', color: '#f0f0d0', mimic: false,
    requires: GUNS, triggersReaction: 'physical',
    hit: (x) => (x.t.has('undead') ? x.c.speed + 70 : 0),
    effects: [{ type: 'status', add: ['petrify'] }], ai: { debuff: true },
  },
];
