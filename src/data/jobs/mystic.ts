import type { AbilityDef, JobDef, StatusId } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'mystic', name: 'Mystic', desc: 'A diviner of the hidden balance between light and shadow. Curses the body and clouds the mind from afar.',
    generic: true,
    requires: [{ job: 'priest', level: 2 }],
    skillset: { id: 'mysticism', name: 'Mysticism', desc: 'Hexes of the balance of shadow and light. Their success rests almost wholly on Faith.' },
    abilities: [
      'blind', 'spellAbsorb', 'lifeDrain', 'prayFaith', 'doubtFaith', 'zombie', 'silenceSong',
      'blindRage', 'foxbird', 'confusionSong', 'dispelMagic', 'paralyze', 'sleep', 'petrify',
      'mpSwitch', 'defenseUp', 'moveMpUp', 'anyWeather',
    ],
    move: 3, jump: 3, cev: 5,
    mult: { hp: 75, mp: 110, sp: 100, pa: 50, ma: 120 },
    growth: { hp: 12, mp: 10, sp: 100, pa: 60, ma: 50 },
    equip: ['pole', 'rod', 'book', 'hat', 'ribbon', 'clothes', 'robe'],
    look: {
      headgear: 'veil', torso: 'robe', legs: 'robe', cape: 'mantle', shoulders: 'none',
      palette: { primary: '#d49a2a', secondary: '#6b6b2f', accent: '#7a2a1f', leather: '#4a3423' },
      extras: ['feather', 'sash'],
      bulk: 0.95,
    },
  },
];

/** Mysticism defaults: 4 panels, unlimited height, faith-based success, reflectable, Arithmancer- and Mimic-usable. */
const M = { kind: 'action', skillset: 'mysticism', magic: true, calc: true, mimic: true, anim: 'cast', range: 4, target: 'enemy' } as const;

/** A single-status hex: (MA + base) × Faith success. */
function hex(
  id: string, name: string, desc: string, status: StatusId, base: number,
  jp: number, mp: number, ct: number, aoe: number, aoeV: number, color: string, vfx: AbilityDef['vfx'] = 'status',
): AbilityDef {
  return {
    ...M, id, name, jp, mp, ct, aoe, aoeV, color, vfx,
    desc: `${desc} Success: (MA + ${base}) × Faith.`,
    hit: F.hitMa(base),
    effects: [{ type: 'status', add: [status] }],
    ai: { debuff: true },
  };
}

const DISPEL: StatusId[] = ['float', 'haste', 'protect', 'shell', 'regen', 'reraise', 'invisible', 'faith', 'reflect', 'wall'];

export const abilities: AbilityDef[] = [
  hex('blind', 'Blind', 'A veil of shadow over the eyes of all in the area (Blind).', 'blind', 200, 100, 4, 2, 2, 1, '#555566', 'dark'),
  {
    ...M, id: 'spellAbsorb', name: 'Spell Absorb', desc: 'Draws a third of the target\'s maximum MP into the caster. Success: (MA + 160) × Faith.', jp: 200,
    mp: 2, ct: 2, vfx: 'drain', color: '#6a8aff',
    hit: F.hitMa(160),
    effects: [{ type: 'damage', stat: 'mp', formula: F.pctMaxMp(0.33), drain: true }],
  },
  {
    ...M, id: 'lifeDrain', name: 'Life Drain', desc: 'Draws a quarter of the target\'s maximum HP into the caster. Success: (MA + 160) × Faith.', jp: 350,
    mp: 16, ct: 2, vfx: 'drain', color: '#d0304a',
    hit: F.hitMa(160),
    effects: [{ type: 'damage', formula: F.pctMaxHp(0.25), drain: true }],
  },
  {
    ...M, id: 'prayFaith', name: 'Pray Faith', desc: 'Fills the target with fervent belief: Faith counts as 100. Success: (MA + 150) × Faith.', jp: 400,
    mp: 6, ct: 4, target: 'ally', vfx: 'holy', color: '#fff6c8',
    hit: F.hitMa(150),
    effects: [{ type: 'status', add: ['faith'] }], ai: { buff: true },
  },
  hex('doubtFaith', 'Doubt Faith', 'Plants a creeping doubt: Faith counts as 0, and magic hardly touches the target.', 'atheist', 150, 400, 6, 4, 1, 0, '#b8b89a'),
  hex('zombie', 'Zombie', 'Binds the target\'s soul to rotting flesh (Undead).', 'undead', 100, 300, 20, 5, 1, 0, '#7a9a5a', 'dark'),
  hex('silenceSong', 'Silence Song', 'A soundless hymn that stills every tongue in the area (Silence).', 'silence', 180, 170, 16, 3, 2, 1, '#aab0d0', 'song'),
  hex('blindRage', 'Blind Rage', 'Wakes a red fury in the target (Berserk).', 'berserk', 120, 400, 16, 5, 1, 0, '#ff4a3a'),
  {
    ...M, id: 'foxbird', name: 'Foxbird', desc: 'The cry of an ill-omened bird shakes the target\'s courage: Brave −30. Success: (MA + 140) × Faith.', jp: 200,
    mp: 20, ct: 4, vfx: 'debuff', color: '#ffa04a',
    hit: F.hitMa(140),
    effects: [{ type: 'stat', stat: 'brave', amount: -30 }], ai: { debuff: true },
  },
  hex('confusionSong', 'Confusion Song', 'A dizzying round that turns friend and foe alike (Confuse).', 'confuse', 130, 400, 20, 5, 1, 0, '#c98aff', 'song'),
  {
    ...M, id: 'dispelMagic', name: 'Dispel Magic', desc: 'Unravels beneficial enchantments: Float, Haste, Protect, Shell, Regen, Reraise, Vanish, Faith, Reflect and Wall. Success: (MA + 200) × Faith.', jp: 700,
    mp: 34, ct: 3, vfx: 'glyph', color: '#9ad0ff',
    hit: F.hitMa(200),
    effects: [{ type: 'status', remove: DISPEL }], ai: { debuff: true },
  },
  hex('paralyze', 'Paralyze', 'Locks the sinews of all in the area; they cannot act (Disable).', 'disable', 185, 100, 10, 5, 2, 0, '#e8d860'),
  hex('sleep', 'Sleep', 'A drowsy charm over the area (Sleep).', 'sleep', 170, 350, 24, 6, 2, 1, '#8a8ad0'),
  hex('petrify', 'Petrify', 'Turns the target to cold stone.', 'petrify', 120, 580, 16, 9, 1, 0, '#9a9a9a'),
  // ---- reaction / support / movement ----
  { id: 'mpSwitch', name: 'Mana Shield', desc: 'Damage is taken from MP instead of HP while MP lasts, Brave percent of the time.', kind: 'reaction', jp: 400, skillset: 'mystic' },
  { id: 'defenseUp', name: 'Defense Up', desc: 'Reduces damage taken from physical attacks.', kind: 'support', jp: 400, skillset: 'mystic' },
  { id: 'moveMpUp', name: 'Move-MP Up', desc: 'Recover a tenth of max MP with every move.', kind: 'movement', jp: 350, skillset: 'mystic' },
  { id: 'anyWeather', name: 'Any Weather', desc: 'Rain and storm no longer weaken or strengthen this unit\'s elemental attacks.', kind: 'movement', jp: 200, skillset: 'mystic' },
];
