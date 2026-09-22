// Count Cedric Orland's Thunder Saint — "Sword Canon" (source: Orlandu's All Swordskill).
// Every sword art of the realm: the Sacred Blade, the Dusk Blade and the Blade Sunder.
import type { AbilityDef, JobDef } from '../../types';
import { F } from '../../../battle/formulas';
import { sacredArt } from './holyKnight';
import { sunderArt } from './divineKnight';

const SK = 'swordCanon';

export const jobs: JobDef[] = [
  {
    id: 'thunderSaint', name: 'Thunder Saint', desc: 'The Thunder Saint of the Fifty Winters\' War. Every sword art ever set down in Ivaldis answers to his hand.',
    generic: false,
    unique: 'orland',
    gender: 'm',
    skillset: { id: SK, name: 'Sword Canon', desc: 'The complete canon of sword arts — holy, dusk and sundering. Requires a sword or knight\'s sword.' },
    abilities: [
      'canonStasisEdge', 'canonRendingLight', 'canonCrushingRadiance', 'canonLightningLunge', 'canonHolyCataclysm',
      'canonNightBlade', 'canonShadeBlade',
      'canonHauberkBreaker', 'canonHelmSplitter', 'canonArmsbane', 'canonFrostfang',
    ],
    move: 3, jump: 3, cev: 15,
    mult: { hp: 125, mp: 90, sp: 100, pa: 125, ma: 100 },
    growth: { hp: 9, mp: 14, sp: 100, pa: 40, ma: 48 },
    equip: ['sword', 'knightSword', 'shield', 'helmet', 'armor', 'robe', 'clothes'],
    look: {
      headgear: 'none', torso: 'plate', legs: 'armored', cape: 'long', shoulders: 'pauldrons',
      palette: { primary: '#1e2c52', secondary: '#34405c', accent: '#d8b04a', metal: '#a8b0bc', leather: '#3a2a1c' },
      extras: ['belt', 'gloves'],
      bulk: 1.1,
    },
  },
];

export const abilities: AbilityDef[] = [
  // ---- Sacred Blade ----
  sacredArt({
    id: 'canonStasisEdge', name: 'Stasis Edge', skillset: SK, jp: 100, range: 3, aoe: 2, status: 'stop', chance: 30,
    desc: 'A frozen arc of light that halts the foe in time. [PA × WP] damage around the target, may Stop.', vfx: 'time', color: '#a8d8ff',
  }),
  sacredArt({
    id: 'canonRendingLight', name: 'Rending Light', skillset: SK, jp: 300, range: 3, aoe: 2, element: 'holy', status: 'doom', chance: 30,
    desc: 'Light splits the earth beneath the foe and marks them for death. Holy [PA × WP] damage, may inflict Doom.', vfx: 'holy', color: '#fff2b0',
  }),
  sacredArt({
    id: 'canonCrushingRadiance', name: 'Crushing Radiance', skillset: SK, jp: 400, range: 3, aoe: 2, mult: 1.1, status: 'disable', chance: 30,
    desc: 'Descending radiance that crushes all it touches. [PA × WP] damage, may pin the foe\'s arms (Disable).', vfx: 'explosion', color: '#ffe9c0',
  }),
  sacredArt({
    id: 'canonLightningLunge', name: 'Lightning Lunge', skillset: SK, jp: 500, range: 3, aoe: 2, mult: 1.1, element: 'lightning', status: 'silence', chance: 35,
    desc: 'A thrust that carries a stroke of lightning. Lightning [PA × WP] damage, may Silence.', vfx: 'thunder', color: '#fff080',
  }),
  sacredArt({
    id: 'canonHolyCataclysm', name: 'Holy Cataclysm', skillset: SK, jp: 800, range: 5, aoe: 2, mult: 1.2, element: 'holy', status: 'confuse', chance: 35,
    desc: 'Pillars of holy fire erupt around the foe. Holy [PA × WP] damage at long range, may Confuse.', vfx: 'holy', color: '#ffffff',
  }),
  // ---- Dusk Blade ----
  {
    id: 'canonNightBlade', name: 'Night Blade', desc: 'A blade of shadow that drinks the foe\'s life. [PA × WP] damage; the caster absorbs the HP dealt.', kind: 'action', jp: 500, skillset: SK,
    range: 2, target: 'enemy', element: 'dark', anim: 'swing', vfx: 'drain', color: '#8a1a3a', mimic: false, triggersReaction: 'physical',
    requires: { weapon: ['sword', 'knightSword'] },
    effects: [{ type: 'damage', formula: F.paWp(1), drain: true }],
  },
  {
    id: 'canonShadeBlade', name: 'Shade Blade', desc: 'A blade of shadow that drinks the foe\'s spirit. [PA × WP] damage to MP; the caster absorbs the MP dealt.', kind: 'action', jp: 300, skillset: SK,
    range: 2, target: 'enemy', element: 'dark', anim: 'swing', vfx: 'drain', color: '#3a2a8a', mimic: false, triggersReaction: 'physical',
    requires: { weapon: ['sword', 'knightSword'] },
    effects: [{ type: 'damage', stat: 'mp', formula: F.paWp(1), drain: true }],
  },
  // ---- Blade Sunder ----
  sunderArt({
    id: 'canonHauberkBreaker', name: 'Hauberk Breaker', skillset: SK, jp: 300, slot: 'body', vfx: 'impact', color: '#d0d4dc',
    desc: 'A stroke that bursts the rivets of the foe\'s body armour. Light damage; the armour is destroyed.',
  }),
  sunderArt({
    id: 'canonHelmSplitter', name: 'Helm Splitter', skillset: SK, jp: 250, slot: 'head', vfx: 'impact', color: '#e0e4ec',
    desc: 'A blast of force that splits the foe\'s helm. Light damage; the headgear is destroyed.',
  }),
  sunderArt({
    id: 'canonArmsbane', name: 'Armsbane', skillset: SK, jp: 400, slot: 'rhand', vfx: 'slash', color: '#f0d0a0',
    desc: 'A howling cut aimed at the foe\'s weapon. Light damage; the weapon is destroyed.',
  }),
  sunderArt({
    id: 'canonFrostfang', name: 'Frostfang', skillset: SK, jp: 350, slot: 'accessory', vfx: 'ice', color: '#a8e0ff',
    desc: 'A wolf of frost that bites away charms and trinkets. Light damage; the accessory is destroyed.',
  }),
];
