import type { AbilityDef, JobDef, StatusId } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'priest', name: 'Cleric', desc: 'A healer ordained by the Glorian Church. Mends wounds, calls back the fallen and wards allies with holy light.',
    generic: true,
    requires: [{ job: 'chemist', level: 2 }],
    skillset: { id: 'whiteMagic', name: 'White Magic', desc: 'Prayers of healing and protection. Power grows with Faith.' },
    abilities: [
      'cure', 'cura', 'curaga', 'curaja', 'raise', 'arise', 'reraise', 'regen',
      'protect', 'protectja', 'shell', 'shellja', 'wall', 'esuna', 'holy',
      'regenerator', 'caution', 'magicDefenseUp',
    ],
    move: 3, jump: 3, cev: 5,
    mult: { hp: 80, mp: 120, sp: 110, pa: 90, ma: 110 },
    growth: { hp: 10, mp: 10, sp: 100, pa: 50, ma: 50 },
    equip: ['staff', 'hat', 'ribbon', 'clothes', 'robe'],
    look: {
      headgear: 'hood', torso: 'robe', legs: 'robe', cape: 'none', shoulders: 'none',
      palette: { primary: '#f2efe6', secondary: '#dcd5c2', accent: '#b0302a', leather: '#6a4a30' },
      extras: ['sash'],
      bulk: 0.95,
    },
  },
];

/** White magic defaults: faith-based, reflectable, castable by Arithmancers, copied by Mimics. */
const W = { kind: 'action', skillset: 'whiteMagic', magic: true, calc: true, mimic: true, anim: 'pray', target: 'ally' } as const;

const ESUNA: StatusId[] = ['petrify', 'blind', 'confuse', 'silence', 'frog', 'poison', 'sleep', 'immobilize', 'disable', 'berserk'];

export const abilities: AbilityDef[] = [
  // ---- healing ----
  {
    ...W, id: 'cure', name: 'Cure', desc: 'Restores HP in a small area; sears the undead. Heal: MA × 14 × Faith.', jp: 50,
    mp: 6, ct: 4, range: 4, aoe: 2, aoeV: 1, vfx: 'heal', color: '#a8ffb8',
    effects: [{ type: 'heal', formula: F.magic(14) }], ai: { heal: true },
  },
  {
    ...W, id: 'cura', name: 'Cura', desc: 'Restores more HP in a small area. Heal: MA × 20 × Faith.', jp: 180,
    mp: 10, ct: 5, range: 4, aoe: 2, aoeV: 2, vfx: 'heal', color: '#b8ffc8',
    effects: [{ type: 'heal', formula: F.magic(20) }], ai: { heal: true },
  },
  {
    ...W, id: 'curaga', name: 'Curaga', desc: 'A great prayer of mending. Heal: MA × 30 × Faith.', jp: 400,
    mp: 16, ct: 7, range: 4, aoe: 2, aoeV: 2, vfx: 'healBig', color: '#c8ffd8',
    effects: [{ type: 'heal', formula: F.magic(30) }], ai: { heal: true },
  },
  {
    ...W, id: 'curaja', name: 'Curaja', desc: 'The highest prayer of mending, heard even on high ground. Heal: MA × 40 × Faith.', jp: 700,
    mp: 20, ct: 10, range: 4, aoe: 2, aoeV: 3, vfx: 'healBig', color: '#e0ffe8',
    effects: [{ type: 'heal', formula: F.magic(40) }], ai: { heal: true },
  },
  // ---- revival ----
  {
    ...W, id: 'raise', name: 'Raise', desc: 'Calls a fallen ally back with half their HP. Fells the undead. Success: (MA + 180) × Faith.', jp: 180,
    mp: 10, ct: 4, range: 4, target: 'ko', vfx: 'revive', color: '#fff6c0',
    hit: F.hitMa(180),
    effects: [{ type: 'revive', pct: 0.5 }], ai: { revive: true },
  },
  {
    ...W, id: 'arise', name: 'Arise', desc: 'Calls a fallen ally back in full health. Success: (MA + 160) × Faith.', jp: 500,
    mp: 20, ct: 10, range: 4, target: 'ko', vfx: 'revive', color: '#ffffff',
    hit: F.hitMa(160),
    effects: [{ type: 'revive', pct: 1 }], ai: { revive: true },
  },
  {
    ...W, id: 'reraise', name: 'Reraise', desc: 'A blessing that revives its bearer once when they fall. Success: (MA + 140) × Faith.', jp: 800,
    mp: 16, ct: 7, range: 4, vfx: 'phoenix', color: '#ffe38a',
    hit: F.hitMa(140),
    effects: [{ type: 'status', add: ['reraise'] }], ai: { buff: true },
  },
  {
    ...W, id: 'regen', name: 'Regen', desc: 'Grants Regen: HP returns at the end of each turn. Success: (MA + 170) × Faith.', jp: 300,
    mp: 8, ct: 4, range: 4, aoe: 2, aoeV: 0, vfx: 'sparkleGreen', color: '#7dffa8',
    hit: F.hitMa(170),
    effects: [{ type: 'status', add: ['regen'] }], ai: { buff: true },
  },
  // ---- wards ----
  {
    ...W, id: 'protect', name: 'Protect', desc: 'A ward against blades: physical damage is cut by a third. Success: (MA + 200) × Faith.', jp: 70,
    mp: 6, ct: 4, range: 4, aoe: 2, aoeV: 0, vfx: 'guard', color: '#ffd76a',
    hit: F.hitMa(200),
    effects: [{ type: 'status', add: ['protect'] }], ai: { buff: true },
  },
  {
    ...W, id: 'protectja', name: 'Protectja', desc: 'Protect cast over a wide area and across heights. Success: (MA + 120) × Faith.', jp: 500,
    mp: 24, ct: 7, range: 4, aoe: 2, aoeV: 3, vfx: 'guard', color: '#ffe08a',
    hit: F.hitMa(120),
    effects: [{ type: 'status', add: ['protect'] }], ai: { buff: true },
  },
  {
    ...W, id: 'shell', name: 'Shell', desc: 'A ward against sorcery: magic damage is cut by a third. Success: (MA + 200) × Faith.', jp: 70,
    mp: 6, ct: 4, range: 4, aoe: 2, aoeV: 0, vfx: 'guard', color: '#7ad8ff',
    hit: F.hitMa(200),
    effects: [{ type: 'status', add: ['shell'] }], ai: { buff: true },
  },
  {
    ...W, id: 'shellja', name: 'Shellja', desc: 'Shell cast over a wide area and across heights. Success: (MA + 120) × Faith.', jp: 500,
    mp: 20, ct: 7, range: 4, aoe: 2, aoeV: 3, vfx: 'guard', color: '#9ae4ff',
    hit: F.hitMa(120),
    effects: [{ type: 'status', add: ['shell'] }], ai: { buff: true },
  },
  {
    ...W, id: 'wall', name: 'Wall', desc: 'Grants both Protect and Shell to one ally. Success: (MA + 140) × Faith.', jp: 380,
    mp: 24, ct: 4, range: 3, vfx: 'guard', color: '#f4f4f4',
    hit: F.hitMa(140),
    effects: [{ type: 'status', add: ['protect', 'shell'], all: true }], ai: { buff: true },
  },
  {
    ...W, id: 'esuna', name: 'Esuna', desc: 'Lifts curses and afflictions: Stone, Blind, Confuse, Silence, Toad, Poison, Sleep, Immobilize, Disable and Berserk. Success: (MA + 190) × Faith.', jp: 280,
    mp: 18, ct: 3, range: 3, aoe: 2, aoeV: 2, vfx: 'sparkleGreen', color: '#d8ffe0',
    hit: F.hitMa(190),
    effects: [{ type: 'status', remove: ESUNA }], ai: { heal: true },
  },
  // ---- judgement ----
  {
    ...W, id: 'holy', name: 'Holy', desc: 'Calls down a pillar of sacred light upon a single foe. Holy damage: MA × 50 × Faith.', jp: 600,
    mp: 56, ct: 6, range: 5, target: 'enemy', element: 'holy', vfx: 'holy', color: '#fff8d8',
    effects: [{ type: 'damage', formula: F.magic(50), element: 'holy' }],
  },
  // ---- reaction / support / movement ----
  { id: 'regenerator', name: 'Regenerator', desc: 'When wounded, gain Regen, Brave percent of the time.', kind: 'reaction', jp: 400, skillset: 'priest' },
  { id: 'caution', name: 'Caution', desc: 'When wounded, fall into a guarded stance, doubling evasion until the next turn.', kind: 'reaction', jp: 200, skillset: 'priest' },
  { id: 'magicDefenseUp', name: 'Magic Defense Up', desc: 'Reduces damage taken from magic.', kind: 'support', jp: 400, skillset: 'priest' },
];
