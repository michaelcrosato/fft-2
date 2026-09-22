import type { AbilityDef, EquipSlot, JobDef } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'thief', name: 'Thief', desc: 'A quick-fingered rogue of the back streets. Lightly armed, hard to catch, and never leaves a battle empty-handed.',
    generic: true,
    requires: [{ job: 'archer', level: 2 }],
    skillset: { id: 'steal', name: 'Steal', desc: 'Lift gil, gear and even hearts from the unwary.' },
    abilities: [
      'stealGil', 'stealHeart', 'stealHelmet', 'stealArmor', 'stealShield', 'stealWeapon', 'stealAccessory', 'stealExp',
      'gilSnapper', 'catch', 'poach', 'equipKnife', 'move2', 'jump2',
    ],
    move: 4, jump: 4, cev: 25,
    mult: { hp: 90, mp: 50, sp: 110, pa: 100, ma: 60 },
    growth: { hp: 11, mp: 16, sp: 90, pa: 50, ma: 50 },
    equip: ['knife', 'hat', 'ribbon', 'clothes'],
    look: {
      headgear: 'bandana', torso: 'vest', legs: 'pants', cape: 'scarf', shoulders: 'none',
      palette: { primary: '#a02c26', secondary: '#2e2724', accent: '#d8b56a', leather: '#3b2a1e' },
      extras: ['scarf', 'belt', 'gloves'],
      bulk: 0.92,
    },
  },
];

/** Equipment theft: (Speed + base)%, reduced by the target's evasion. Foes only. */
function lift(id: string, name: string, slot: EquipSlot, jp: number, base: number, what: string): AbilityDef {
  return {
    id, name, kind: 'action', jp, skillset: 'steal',
    desc: `Snatch the ${what} from an adjacent foe. Success: Speed + ${base} %, less their evasion.`,
    range: 1, target: 'enemy', enemiesOnly: true, anim: 'steal', vfx: 'steal', color: '#ffd76a',
    evadable: true, mimic: true,
    hit: F.hitSp(base),
    effects: [{ type: 'steal', slot }],
    ai: { debuff: true },
  };
}

export const abilities: AbilityDef[] = [
  {
    id: 'stealGil', name: 'Steal Gil', desc: 'Relieve an adjacent foe of their purse. Success: Speed + 200 %, less their evasion.', kind: 'action', jp: 10, skillset: 'steal',
    range: 1, target: 'enemy', enemiesOnly: true, anim: 'steal', vfx: 'steal', color: '#ffe27a',
    evadable: true, mimic: true,
    hit: F.hitSp(200),
    effects: [{ type: 'steal', slot: 'gil' }],
  },
  {
    id: 'stealHeart', name: 'Steal Heart', desc: 'A wink and a smile: an adjacent foe of the other sex (or a beast) is Charmed. Success: MA + 50 %.', kind: 'action', jp: 150, skillset: 'steal',
    range: 1, target: 'enemy', enemiesOnly: true, anim: 'steal', vfx: 'status', color: '#ff8ac0', mimic: true,
    hit: (x) => (x.c.gender === x.t.gender ? 0 : x.c.ma + 50),
    effects: [{ type: 'status', add: ['charm'] }],
    ai: { debuff: true },
  },
  lift('stealHelmet', 'Steal Helmet', 'head', 350, 40, 'helmet or hat'),
  lift('stealArmor', 'Steal Armor', 'body', 450, 35, 'armour or clothing'),
  lift('stealShield', 'Steal Shield', 'lhand', 350, 35, 'shield'),
  lift('stealWeapon', 'Steal Weapon', 'rhand', 600, 30, 'weapon'),
  lift('stealAccessory', 'Steal Accessory', 'accessory', 500, 40, 'accessory'),
  {
    id: 'stealExp', name: 'Steal EXP', desc: 'Filch hard-won experience from an adjacent unit. Success: Speed + 70 %.', kind: 'action', jp: 250, skillset: 'steal',
    range: 1, target: 'enemy', anim: 'steal', vfx: 'drain', color: '#bfe0ff', mimic: true,
    hit: F.hitSp(70),
    effects: [{ type: 'steal', slot: 'exp' }],
  },
  // ---- reaction / support / movement ----
  { id: 'gilSnapper', name: 'Gil Snapper', desc: 'Every blow taken is paid for: gain gil equal to the damage suffered.', kind: 'reaction', jp: 200, skillset: 'thief' },
  { id: 'catch', name: 'Catch', desc: 'Snatch thrown weapons out of the air and keep them, Brave percent of the time.', kind: 'reaction', jp: 200, skillset: 'thief' },
  { id: 'poach', name: 'Poach', desc: 'Monsters felled by this unit are skinned for the fur trader instead of crystallizing.', kind: 'support', jp: 200, skillset: 'thief' },
  { id: 'equipKnife', name: 'Equip Knives', desc: 'Allows any job to wield knives.', kind: 'support', jp: 400, skillset: 'thief' },
  { id: 'move2', name: 'Move +2', desc: 'Increases Move by 2.', kind: 'movement', jp: 520, skillset: 'thief', params: { move: 2 } },
  { id: 'jump2', name: 'Jump +2', desc: 'Increases Jump by 2.', kind: 'movement', jp: 480, skillset: 'thief', params: { jump: 2 } },
];
