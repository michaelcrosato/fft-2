// Melisande Tengel's Divine Knight — "Blade Sunder" (source: Meliadoul's Mighty Sword).
// Ranged arts that shatter a chosen piece of equipment outright, plus spirit-rending strikes.
import type { AbilityDef, EquipSlot, JobDef, VfxId } from '../../types';
import { F } from '../../../battle/formulas';

export interface SunderArtSpec {
  id: string;
  name: string;
  desc: string;
  skillset: string;
  jp: number;
  slot: EquipSlot;
  vfx: VfxId;
  color: string;
}

/** Shared builder: [PA × WP × 0.8] damage and the chosen equipment is destroyed. Unevadable. */
export function sunderArt(s: SunderArtSpec): AbilityDef {
  return {
    id: s.id, name: s.name, desc: s.desc, kind: 'action', jp: s.jp, skillset: s.skillset,
    range: 3, target: 'enemy', anim: 'swing', vfx: s.vfx, color: s.color, mimic: false, triggersReaction: 'physical',
    requires: { weapon: ['sword', 'knightSword'] },
    effects: [{ type: 'damage', formula: F.paWp(0.8) }, { type: 'breakEquip', slot: s.slot }],
    ai: { debuff: true },
  };
}

const SK = 'bladeSunder';

export const jobs: JobDef[] = [
  {
    id: 'divineKnight', name: 'Divine Knight', desc: 'A Sanctum Knight trained to unmake heretics piece by piece — first their armour, then their arms, then their will.',
    generic: false,
    unique: 'melisande',
    gender: 'f',
    skillset: { id: SK, name: 'Blade Sunder', desc: 'Ranged sword arts that destroy equipment or rend the spirit. Requires a sword or knight\'s sword.' },
    abilities: ['divineHauberkBreaker', 'divineHelmSplitter', 'divineArmsbane', 'divineFrostfang', 'divineSoulrend', 'divineWitherStroke'],
    move: 3, jump: 3, cev: 15,
    mult: { hp: 118, mp: 85, sp: 100, pa: 118, ma: 90 },
    growth: { hp: 10, mp: 15, sp: 100, pa: 42, ma: 50 },
    equip: ['sword', 'knightSword', 'shield', 'helmet', 'armor'],
    look: {
      headgear: 'circlet', torso: 'plate', legs: 'armored', cape: 'long', shoulders: 'pauldrons',
      palette: { primary: '#2e2a3a', secondary: '#e8e4dc', accent: '#b0243a', metal: '#b8bec8', leather: '#3a2a22' },
      extras: ['belt', 'gloves'],
    },
  },
];

export const abilities: AbilityDef[] = [
  sunderArt({
    id: 'divineHauberkBreaker', name: 'Hauberk Breaker', skillset: SK, jp: 300, slot: 'body', vfx: 'impact', color: '#d0d4dc',
    desc: 'A stroke that bursts the rivets of the foe\'s body armour. Light damage; the armour is destroyed.',
  }),
  sunderArt({
    id: 'divineHelmSplitter', name: 'Helm Splitter', skillset: SK, jp: 250, slot: 'head', vfx: 'impact', color: '#e0e4ec',
    desc: 'A blast of force that splits the foe\'s helm. Light damage; the headgear is destroyed.',
  }),
  sunderArt({
    id: 'divineArmsbane', name: 'Armsbane', skillset: SK, jp: 400, slot: 'rhand', vfx: 'slash', color: '#f0d0a0',
    desc: 'A howling cut aimed at the foe\'s weapon. Light damage; the weapon is destroyed.',
  }),
  sunderArt({
    id: 'divineFrostfang', name: 'Frostfang', skillset: SK, jp: 350, slot: 'accessory', vfx: 'ice', color: '#a8e0ff',
    desc: 'A wolf of frost that bites away charms and trinkets. Light damage; the accessory is destroyed.',
  }),
  {
    id: 'divineSoulrend', name: 'Soulrend', desc: 'A cut that bleeds the spirit rather than the flesh. [PA × WP] damage to MP.', kind: 'action', jp: 300, skillset: SK,
    range: 3, target: 'enemy', anim: 'swing', vfx: 'drain', color: '#8090ff', mimic: false, triggersReaction: 'physical',
    requires: { weapon: ['sword', 'knightSword'] },
    effects: [{ type: 'damage', stat: 'mp', formula: F.paWp(1) }],
    ai: { debuff: true },
  },
  {
    id: 'divineWitherStroke', name: 'Wither Stroke', desc: 'A blow that saps strength and wit alike. Light damage; PA and MA -2.', kind: 'action', jp: 450, skillset: SK,
    range: 3, target: 'enemy', anim: 'swing', vfx: 'debuff', color: '#a060c0', mimic: false, triggersReaction: 'physical',
    requires: { weapon: ['sword', 'knightSword'] },
    effects: [
      { type: 'damage', formula: F.paWp(0.6) },
      { type: 'stat', stat: 'pa', amount: -2 },
      { type: 'stat', stat: 'ma', amount: -2 },
    ],
    ai: { debuff: true },
  },
];
