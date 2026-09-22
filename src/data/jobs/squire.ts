import type { AbilityDef, JobDef } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'squire', name: 'Squire', desc: 'A soldier in training. Masters the fundamentals of war that every warrior builds upon.',
    generic: true,
    skillset: { id: 'fundaments', name: 'Fundaments', desc: 'Basic battlefield techniques every soldier learns.' },
    abilities: ['focus', 'rush', 'stoneToss', 'salve', 'counterTackle', 'equipAxe', 'monsterSkill', 'defend', 'jpBoost', 'move1'],
    move: 4, jump: 3, cev: 5,
    mult: { hp: 100, mp: 75, sp: 100, pa: 90, ma: 80 },
    growth: { hp: 11, mp: 15, sp: 100, pa: 60, ma: 50 },
    equip: ['knife', 'sword', 'axe', 'flail', 'helmet', 'hat', 'clothes', 'armor'],
    look: {
      headgear: 'none', torso: 'tunic', legs: 'pants', cape: 'none', shoulders: 'pads',
      palette: { primary: '#6b8fb8', secondary: '#8a6a45', accent: '#e8d9a8', metal: '#b8bcc4', leather: '#5a3b24' },
      extras: ['belt'],
    },
  },
];

export const abilities: AbilityDef[] = [
  {
    id: 'focus', name: 'Focus', desc: 'Steady your breathing and raise PA by 1 for the battle.', kind: 'action', jp: 300, skillset: 'fundaments',
    range: 0, shape: 'self', target: 'self', anim: 'charge', vfx: 'buffRed', mimic: true,
    effects: [{ type: 'stat', stat: 'pa', amount: 1 }], ai: { buff: true, score: 8 },
  },
  {
    id: 'rush', name: 'Rush', desc: 'Barrel into an adjacent foe. Deals light damage and may knock them back.', kind: 'action', jp: 80, skillset: 'fundaments',
    range: 1, target: 'enemy', anim: 'thrust', vfx: 'impact', evadable: true, mimic: true,
    hit: F.fixedHit(100),
    effects: [{ type: 'damage', formula: (x) => x.rng.int(1, Math.max(1, Math.floor(x.c.pa / 2))) * x.c.pa }, { type: 'knockback', tiles: 1 }],
  },
  {
    id: 'stoneToss', name: 'Stone Toss', desc: 'Hurl a stone at a target up to four tiles away.', kind: 'action', jp: 90, skillset: 'fundaments',
    range: 4, target: 'enemy', anim: 'throw', vfx: 'stone', evadable: true, projectile: true, mimic: true,
    effects: [{ type: 'damage', formula: (x) => x.rng.int(1, Math.max(1, Math.floor(x.c.pa / 2))) * x.c.pa }, { type: 'knockback', tiles: 1 }],
  },
  {
    id: 'salve', name: 'Salve', desc: 'Field medicine that cures Blind, Silence, Poison and restores a little HP.', kind: 'action', jp: 150, skillset: 'fundaments',
    range: 1, target: 'ally', anim: 'item', vfx: 'sparkleGreen', mimic: true,
    effects: [{ type: 'status', remove: ['blind', 'silence', 'poison'] }, { type: 'heal', formula: (x) => Math.floor(x.c.ma * 2) }],
    ai: { heal: true },
  },
  // ---- reaction / support / movement ----
  { id: 'counterTackle', name: 'Counter Tackle', desc: 'When struck in melee, rush the attacker in return.', kind: 'reaction', jp: 180, skillset: 'squire' },
  { id: 'equipAxe', name: 'Equip Axes', desc: 'Allows any job to equip axes.', kind: 'support', jp: 170, skillset: 'squire' },
  { id: 'monsterSkill', name: 'Beast Lore', desc: 'Allied monsters within three tiles may use their secret techniques.', kind: 'support', jp: 200, skillset: 'squire' },
  { id: 'defend', name: 'Defend', desc: 'Adds the Defend command, doubling evasion until the next turn.', kind: 'support', jp: 50, skillset: 'squire' },
  { id: 'jpBoost', name: 'JP Boost', desc: 'Increases JP earned in battle by half.', kind: 'support', jp: 200, skillset: 'squire' },
  { id: 'move1', name: 'Move +1', desc: 'Increases Move by 1.', kind: 'movement', jp: 200, skillset: 'squire', params: { move: 1 } },
];
