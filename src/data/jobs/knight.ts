import type { AbilityDef, EquipSlot, JobDef, StatKey } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'knight', name: 'Knight', desc: 'A sworn blade in heavy plate. Breaks the arms and armour of the foe as readily as the foe himself.',
    generic: true,
    requires: [{ job: 'squire', level: 2 }],
    skillset: { id: 'arts', name: 'Arts of War', desc: 'Weapon techniques that sunder equipment and sap an enemy\'s strength.' },
    abilities: [
      'sunderHelm', 'sunderArmor', 'sunderShield', 'sunderWeapon', 'sunderMana', 'sunderSpeed', 'sunderPower', 'sunderMind',
      'weaponGuard', 'braveUp', 'equipArmor', 'equipShield', 'equipSword',
    ],
    move: 3, jump: 3, cev: 10,
    mult: { hp: 120, mp: 80, sp: 100, pa: 120, ma: 80 },
    growth: { hp: 10, mp: 15, sp: 100, pa: 40, ma: 50 },
    equip: ['knightSword', 'sword', 'shield', 'helmet', 'ribbon', 'armor', 'robe'],
    look: {
      headgear: 'fullHelm', torso: 'plate', legs: 'armored', cape: 'long', shoulders: 'pauldrons',
      palette: { primary: '#8e97a4', secondary: '#34405c', accent: '#c9a54a', metal: '#c6ccd4', leather: '#4a3423' },
      extras: ['belt', 'gloves'],
      bulk: 1.12,
    },
  },
];

/** Equipment-breaking art: (PA + WP + base)% — evadable, blocked by Safeguard. */
function sunder(id: string, name: string, slot: EquipSlot, jp: number, base: number, desc: string, color: string): AbilityDef {
  return {
    id, name, desc, kind: 'action', jp, skillset: 'arts',
    range: 'weapon', target: 'enemy', anim: 'swing', vfx: 'slash', color,
    evadable: true, counterable: true, triggersReaction: 'physical', mimic: true,
    hit: F.hitPaWp(base),
    effects: [{ type: 'breakEquip', slot }],
    ai: { debuff: true },
  };
}

/** Stat-sapping art: (PA + base)% — evadable. */
function sap(id: string, name: string, stat: StatKey, amount: number, jp: number, desc: string, color: string): AbilityDef {
  return {
    id, name, desc, kind: 'action', jp, skillset: 'arts',
    range: 'weapon', target: 'enemy', anim: 'swing', vfx: 'debuff', color,
    evadable: true, counterable: true, triggersReaction: 'physical', mimic: true,
    hit: F.hitPa(50),
    effects: [{ type: 'stat', stat, amount }],
    ai: { debuff: true },
  };
}

export const abilities: AbilityDef[] = [
  sunder('sunderHelm', 'Sunder Helm', 'head', 300, 45, 'Cleave the foe\'s headgear in two. Success: 45 + PA + WP %.', '#d8dde6'),
  sunder('sunderArmor', 'Sunder Armor', 'body', 400, 40, 'Split the rivets of the foe\'s body armour. Success: 40 + PA + WP %.', '#c9ccd2'),
  sunder('sunderShield', 'Sunder Shield', 'lhand', 300, 55, 'Shatter the shield upon the foe\'s arm. Success: 55 + PA + WP %.', '#b9c4d6'),
  sunder('sunderWeapon', 'Sunder Weapon', 'rhand', 400, 30, 'Strike the foe\'s blade at its weakest point and snap it. Success: 30 + PA + WP %.', '#e6e0cf'),
  {
    id: 'sunderMana', name: 'Sunder Mana', desc: 'A blow to the spirit that scatters half of the target\'s MP. Success: 50 + PA %.', kind: 'action', jp: 250, skillset: 'arts',
    range: 'weapon', target: 'enemy', anim: 'swing', vfx: 'debuff', color: '#7a8cff',
    evadable: true, counterable: true, triggersReaction: 'physical', mimic: true,
    hit: F.hitPa(50),
    effects: [{ type: 'damage', stat: 'mp', formula: (x) => Math.floor(x.t.mp / 2) }],
    ai: { debuff: true },
  },
  sap('sunderSpeed', 'Sunder Speed', 'speed', -2, 250, 'Hamstring the foe, lowering Speed by 2. Success: 50 + PA %.', '#6fb7ff'),
  sap('sunderPower', 'Sunder Power', 'pa', -3, 250, 'Batter the foe\'s sword-arm, lowering PA by 3. Success: 50 + PA %.', '#ff7a5c'),
  sap('sunderMind', 'Sunder Mind', 'ma', -3, 250, 'Ring the foe\'s skull like a bell, lowering MA by 3. Success: 50 + PA %.', '#c38cff'),
  // ---- reaction / support / movement ----
  { id: 'weaponGuard', name: 'Weapon Guard', desc: 'Parry blows from the front with the weapon in hand, adding its evasion.', kind: 'reaction', jp: 200, skillset: 'knight' },
  { id: 'braveUp', name: 'Brave Up', desc: 'Pain only hardens resolve: when struck, Brave may rise by 3.', kind: 'reaction', jp: 500, skillset: 'knight' },
  { id: 'equipArmor', name: 'Equip Armor', desc: 'Allows any job to wear helmets and heavy armour.', kind: 'support', jp: 500, skillset: 'knight' },
  { id: 'equipShield', name: 'Equip Shields', desc: 'Allows any job to bear a shield.', kind: 'support', jp: 250, skillset: 'knight' },
  { id: 'equipSword', name: 'Equip Swords', desc: 'Allows any job to wield swords.', kind: 'support', jp: 400, skillset: 'knight' },
];
