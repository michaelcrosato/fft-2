// Adria Oakhelm's Holy Knight — "Sacred Blade" (source: Agrias's Holy Sword).
// Ranged sword arts: [PA * WP] damage that cannot be evaded, each with a status rider.
import type { AbilityDef, Element, JobDef, StatusId, VfxId } from '../../types';
import { F } from '../../../battle/formulas';

export interface SacredArtSpec {
  id: string;
  name: string;
  desc: string;
  skillset: string;
  jp: number;
  range: number;
  aoe?: number;
  mult?: number;
  element?: Element;
  status?: StatusId;
  chance?: number;
  vfx: VfxId;
  color: string;
}

/** Shared builder for ranged sword arts (Sacred Blade, Sword Canon, Lion's Oath). */
export function sacredArt(s: SacredArtSpec): AbilityDef {
  return {
    id: s.id, name: s.name, desc: s.desc, kind: 'action', jp: s.jp, skillset: s.skillset,
    range: s.range, aoe: s.aoe ?? 1, aoeV: 2, target: 'enemy', element: s.element,
    anim: 'swing', vfx: s.vfx, color: s.color, mimic: false, triggersReaction: 'physical',
    requires: { weapon: ['sword', 'knightSword'] },
    effects: [{ type: 'damage', formula: F.paWp(s.mult ?? 1) }],
    statusChance: s.status ? [{ status: s.status, chance: s.chance ?? 30 }] : undefined,
  };
}

const SK = 'sacredBlade';

export const jobs: JobDef[] = [
  {
    id: 'holyKnight', name: 'Holy Knight', desc: 'A knight consecrated to the royal house. Her blade carries the light of the Braves across the field.',
    generic: false,
    unique: 'adria',
    gender: 'f',
    skillset: { id: SK, name: 'Sacred Blade', desc: 'Consecrated sword arts that strike at range. Requires a sword or knight\'s sword.' },
    abilities: ['holyStasisEdge', 'holyRendingLight', 'holyCrushingRadiance', 'holyLightningLunge', 'holyCataclysm'],
    move: 3, jump: 3, cev: 15,
    mult: { hp: 120, mp: 85, sp: 100, pa: 120, ma: 90 },
    growth: { hp: 10, mp: 15, sp: 100, pa: 42, ma: 50 },
    equip: ['sword', 'knightSword', 'shield', 'helmet', 'armor'],
    look: {
      headgear: 'none', torso: 'plate', legs: 'armored', cape: 'long', shoulders: 'pauldrons',
      palette: { primary: '#3b5fa8', secondary: '#f2f0ea', accent: '#d8b85a', metal: '#dfe4ec', leather: '#4a3423' },
      extras: ['belt', 'gloves'],
      bulk: 1.02,
    },
  },
];

export const abilities: AbilityDef[] = [
  sacredArt({
    id: 'holyStasisEdge', name: 'Stasis Edge', skillset: SK, jp: 100, range: 3, aoe: 2, status: 'stop', chance: 30,
    desc: 'A frozen arc of light that halts the foe in time. [PA × WP] damage around the target, may Stop.', vfx: 'time', color: '#a8d8ff',
  }),
  sacredArt({
    id: 'holyRendingLight', name: 'Rending Light', skillset: SK, jp: 300, range: 3, aoe: 2, element: 'holy', status: 'doom', chance: 30,
    desc: 'Light splits the earth beneath the foe and marks them for death. Holy [PA × WP] damage, may inflict Doom.', vfx: 'holy', color: '#fff2b0',
  }),
  sacredArt({
    id: 'holyCrushingRadiance', name: 'Crushing Radiance', skillset: SK, jp: 400, range: 3, aoe: 2, mult: 1.1, status: 'disable', chance: 30,
    desc: 'Descending radiance that crushes all it touches. [PA × WP] damage, may pin the foe\'s arms (Disable).', vfx: 'explosion', color: '#ffe9c0',
  }),
  sacredArt({
    id: 'holyLightningLunge', name: 'Lightning Lunge', skillset: SK, jp: 500, range: 3, aoe: 2, mult: 1.1, element: 'lightning', status: 'silence', chance: 35,
    desc: 'A thrust that carries a stroke of lightning. Lightning [PA × WP] damage, may Silence.', vfx: 'thunder', color: '#fff080',
  }),
  sacredArt({
    id: 'holyCataclysm', name: 'Holy Cataclysm', skillset: SK, jp: 800, range: 5, aoe: 2, mult: 1.2, element: 'holy', status: 'confuse', chance: 35,
    desc: 'Pillars of holy fire erupt around the foe. Holy [PA × WP] damage at long range, may Confuse.', vfx: 'holy', color: '#ffffff',
  }),
];
