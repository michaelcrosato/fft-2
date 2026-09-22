// Church casters: the Sorcerer (Clement), the Inquisitor (Zalmon) and the
// Cardinal (Dracomir in human form). Not available to generic recruits.
import type { AbilityDef, JobDef, StatusId } from '../../types';
import { F } from '../../../battle/formulas';

const CURABLE: StatusId[] = [
  'petrify', 'confuse', 'blind', 'silence', 'poison', 'slow', 'stop', 'sleep',
  'immobilize', 'disable', 'berserk', 'charm', 'doom', 'frog', 'atheist', 'oil',
];

export const jobs: JobDef[] = [
  // ---------------------------------------------------------------- Sorcerer
  {
    id: 'sorcerer', name: 'Sorcerer',
    desc: 'A Sanctum Knight who reads the forbidden grimoires the Church confiscates. Commands black and temporal magic that no academy would dare to teach.',
    generic: false,
    skillset: { id: 'sorcery', name: 'Sorcery', desc: 'Forbidden black and time magic: Flare, Meteor, gravity and the stopping of hours.' },
    abilities: [
      'sorcererFlare', 'sorcererMeteor', 'sorcererBlackSanctus', 'sorcererHellfire', 'sorcererFrostgrave',
      'sorcererStormcall', 'sorcererGraviton', 'sorcererStillTime', 'sorcererQuicken', 'sorcererMadness',
    ],
    innate: ['magicDefenseUp'],
    move: 3, jump: 3, cev: 10,
    mult: { hp: 155, mp: 250, sp: 130, pa: 95, ma: 155 },
    growth: { hp: 12, mp: 10, sp: 100, pa: 50, ma: 45 },
    equip: ['rod', 'staff', 'knife', 'hat', 'clothes', 'robe'],
    immune: ['charm', 'frog', 'chicken'],
    look: {
      headgear: 'cowl', torso: 'robe', legs: 'robe', cape: 'mantle', shoulders: 'none',
      palette: { primary: '#141418', secondary: '#2b2433', accent: '#7a5ccc', metal: '#6a6a78', leather: '#1e1614' },
      extras: ['book', 'sash'],
    },
  },
  // ---------------------------------------------------------------- Inquisitor
  {
    id: 'inquisitor', name: 'Inquisitor',
    desc: 'A priest of the Glorian Church charged with rooting out heresy. Heals the faithful, brands the doubter, and burns the rest.',
    generic: false,
    skillset: { id: 'inquisition', name: 'Inquisition', desc: 'Holy magic of judgement: Holy, the heretic\'s brand, Faith and Doubt, and the absolution of the faithful.' },
    abilities: [
      'inquisitorHoly', 'inquisitorPyre', 'inquisitorBrand', 'inquisitorCensure',
      'inquisitorZeal', 'inquisitorAbsolution', 'inquisitorPenance', 'inquisitorShriving',
    ],
    innate: ['halfMp'],
    move: 3, jump: 3, cev: 8,
    mult: { hp: 170, mp: 240, sp: 120, pa: 92, ma: 155 },
    growth: { hp: 11, mp: 10, sp: 100, pa: 50, ma: 45 },
    equip: ['staff', 'rod', 'flail', 'book', 'hat', 'clothes', 'robe'],
    immune: ['charm', 'frog', 'chicken'],
    look: {
      headgear: 'mitre', torso: 'cassock', legs: 'robe', cape: 'mantle', shoulders: 'none',
      palette: { primary: '#16161a', secondary: '#2a2520', accent: '#d4af37', metal: '#c8a848', leather: '#2a1a10' },
      extras: ['book', 'sash'],
    },
  },
  // ---------------------------------------------------------------- Cardinal
  {
    id: 'cardinal', name: 'Cardinal',
    desc: 'A prince of the Glorian Church, robed in crimson. His blessings are genuine; so is the rot beneath them.',
    generic: false,
    skillset: { id: 'holyRites', name: 'Holy Rites', desc: 'The high rites of the See: blessing, resurrection, warding — and anathema.' },
    abilities: ['cardinalBlessing', 'cardinalRising', 'cardinalAegisPrayer', 'cardinalHoly', 'cardinalAnathema'],
    move: 3, jump: 3, cev: 5,
    mult: { hp: 185, mp: 280, sp: 108, pa: 90, ma: 165 },
    growth: { hp: 11, mp: 10, sp: 100, pa: 50, ma: 45 },
    equip: ['staff', 'rod', 'book', 'hat', 'clothes', 'robe'],
    immune: ['charm', 'frog', 'chicken'],
    look: {
      headgear: 'mitre', torso: 'gown', legs: 'gown', cape: 'mantle', shoulders: 'none',
      palette: { primary: '#8b1020', secondary: '#f0e6d8', accent: '#d4af37', metal: '#d8b850', leather: '#3a1a14' },
      extras: ['sash'],
      bulk: 1.12,
    },
  },
];

export const abilities: AbilityDef[] = [
  // ======================================================= Sorcerer — Sorcery
  {
    id: 'sorcererFlare', name: 'Flare', kind: 'action', jp: 900, skillset: 'sorcery',
    desc: 'A point of white-hot fusion bursts on a single target. (Magic Q46)',
    range: 5, ct: 7, mp: 60, target: 'enemy', magic: true, anim: 'cast', vfx: 'flare', color: '#ffb060',
    effects: [{ type: 'damage', formula: F.magic(46) }],
  },
  {
    id: 'sorcererMeteor', name: 'Meteor', kind: 'action', jp: 1500, skillset: 'sorcery',
    desc: 'Calls a burning star down upon a wide area after a long incantation. Friend and foe alike. (Magic Q42, radius 2)',
    range: 4, aoe: 3, aoeV: 3, ct: 12, mp: 70, target: 'enemy', magic: true, noReflect: true, anim: 'cast', vfx: 'meteor', color: '#ff8040',
    effects: [{ type: 'damage', formula: F.magic(42) }],
  },
  {
    id: 'sorcererBlackSanctus', name: 'Black Sanctus', kind: 'action', jp: 800, skillset: 'sorcery',
    desc: 'An inverted blessing: a column of black light that burns like holy fire. (Magic Q44 dark, Blind 20%)',
    range: 5, ct: 6, mp: 44, target: 'enemy', element: 'dark', magic: true, anim: 'cast', vfx: 'dark', color: '#40104a',
    effects: [{ type: 'damage', formula: F.magic(44), element: 'dark' }],
    statusChance: [{ status: 'blind', chance: 20 }],
  },
  {
    id: 'sorcererHellfire', name: 'Hellfire', kind: 'action', jp: 480, skillset: 'sorcery',
    desc: 'A storm of fire engulfs a small area. (Magic Q24 fire)',
    range: 5, aoe: 2, aoeV: 3, ct: 6, mp: 24, target: 'enemy', element: 'fire', magic: true, anim: 'cast', vfx: 'inferno', color: '#ff5020',
    effects: [{ type: 'damage', formula: F.magic(24), element: 'fire' }],
  },
  {
    id: 'sorcererFrostgrave', name: 'Frostgrave', kind: 'action', jp: 480, skillset: 'sorcery',
    desc: 'Spears of black ice erupt across a small area. (Magic Q24 ice)',
    range: 5, aoe: 2, aoeV: 3, ct: 6, mp: 24, target: 'enemy', element: 'ice', magic: true, anim: 'cast', vfx: 'glacier', color: '#90d8ff',
    effects: [{ type: 'damage', formula: F.magic(24), element: 'ice' }],
  },
  {
    id: 'sorcererStormcall', name: 'Stormcall', kind: 'action', jp: 480, skillset: 'sorcery',
    desc: 'A crown of lightning strikes a small area. (Magic Q24 lightning)',
    range: 5, aoe: 2, aoeV: 3, ct: 6, mp: 24, target: 'enemy', element: 'lightning', magic: true, anim: 'cast', vfx: 'thunder', color: '#fff080',
    effects: [{ type: 'damage', formula: F.magic(24), element: 'lightning' }],
  },
  {
    id: 'sorcererGraviton', name: 'Graviton', kind: 'action', jp: 550, skillset: 'sorcery',
    desc: 'Crushing gravity halves the current HP of everyone in a small area. Bosses resist. (Hit MA + 120)',
    range: 4, aoe: 2, aoeV: 2, ct: 6, mp: 50, target: 'enemy', magic: true, anim: 'cast', vfx: 'gravity', color: '#503070',
    hit: F.hitMa(120), params: { pct: 0.5 },
    effects: [{ type: 'special', id: 'gravity' }],
  },
  {
    id: 'sorcererStillTime', name: 'Still Time', kind: 'action', jp: 330, skillset: 'sorcery',
    desc: 'Halts the flow of time around one target. (Stop; hit MA + 110)',
    range: 4, ct: 3, mp: 14, target: 'enemy', magic: true, anim: 'cast', vfx: 'time', color: '#6080ff',
    hit: F.hitMa(110),
    effects: [{ type: 'status', add: ['stop'] }],
    ai: { debuff: true },
  },
  {
    id: 'sorcererQuicken', name: 'Quicken', kind: 'action', jp: 600, skillset: 'sorcery',
    desc: 'Hastens the flow of time for allies in a small area. (Haste)',
    range: 4, aoe: 2, aoeV: 3, ct: 4, mp: 30, target: 'ally', alliesOnly: true, magic: true, anim: 'cast', vfx: 'time', color: '#ffb060',
    effects: [{ type: 'status', add: ['haste'] }],
    ai: { buff: true },
  },
  {
    id: 'sorcererMadness', name: 'Madness', kind: 'action', jp: 400, skillset: 'sorcery',
    desc: 'Whispers from the grimoire drive one target to confusion or berserk rage. (Hit MA + 130)',
    range: 4, ct: 3, mp: 20, target: 'enemy', magic: true, anim: 'cast', vfx: 'status', color: '#d060ff',
    hit: F.hitMa(130),
    effects: [{ type: 'status', add: ['confuse', 'berserk'] }],
    ai: { debuff: true },
  },

  // ======================================================= Inquisitor — Inquisition
  {
    id: 'inquisitorHoly', name: 'Holy', kind: 'action', jp: 600, skillset: 'inquisition',
    desc: 'Sacred light sears a single sinner. (Magic Q50 holy)',
    range: 5, ct: 6, mp: 56, target: 'enemy', element: 'holy', magic: true, anim: 'pray', vfx: 'holy', color: '#fff8d0',
    effects: [{ type: 'damage', formula: F.magic(50), element: 'holy' }],
  },
  {
    id: 'inquisitorPyre', name: 'Purging Pyre', kind: 'action', jp: 350, skillset: 'inquisition',
    desc: 'Raises a heretic\'s pyre over a small area. (Magic Q20 fire)',
    range: 4, aoe: 2, aoeV: 2, ct: 5, mp: 24, target: 'enemy', element: 'fire', magic: true, anim: 'pray', vfx: 'flames', color: '#ffa040',
    effects: [{ type: 'damage', formula: F.magic(20), element: 'fire' }],
  },
  {
    id: 'inquisitorBrand', name: 'Brand Heretic', kind: 'action', jp: 500, skillset: 'inquisition',
    desc: 'Burns the heretic\'s mark onto one soul; it will fall when the count runs out. (Doom; hit MA + 100)',
    range: 4, ct: 3, mp: 20, target: 'enemy', magic: true, anim: 'cast', vfx: 'glyph', color: '#c04040',
    hit: F.hitMa(100),
    effects: [{ type: 'status', add: ['doom'] }],
    ai: { debuff: true },
  },
  {
    id: 'inquisitorCensure', name: 'Censure', kind: 'action', jp: 300, skillset: 'inquisition',
    desc: 'Declares one target faithless: magic will scarcely touch them, nor answer them. (Doubt, Faith -5; hit MA + 150)',
    range: 4, ct: 2, mp: 12, target: 'enemy', magic: true, anim: 'talk', vfx: 'debuff', color: '#b0a070',
    hit: F.hitMa(150),
    effects: [{ type: 'status', add: ['atheist'] }, { type: 'stat', stat: 'faith', amount: -5 }],
    ai: { debuff: true },
  },
  {
    id: 'inquisitorZeal', name: 'Zeal', kind: 'action', jp: 300, skillset: 'inquisition',
    desc: 'Kindles fanatic zeal in one ally; their spells burn brighter and so do they. (Faith status, Faith +5)',
    range: 4, ct: 2, mp: 12, target: 'ally', magic: true, anim: 'pray', vfx: 'buff', color: '#fff0a0',
    effects: [{ type: 'status', add: ['faith'] }, { type: 'stat', stat: 'faith', amount: 5 }],
    ai: { buff: true },
  },
  {
    id: 'inquisitorAbsolution', name: 'Absolution', kind: 'action', jp: 400, skillset: 'inquisition',
    desc: 'Grants absolution to the faithful in a small area, closing their wounds. (Heal Q20)',
    range: 4, aoe: 2, aoeV: 2, ct: 4, mp: 16, target: 'ally', alliesOnly: true, magic: true, anim: 'pray', vfx: 'heal', color: '#c8ffc8',
    effects: [{ type: 'heal', formula: F.magic(20) }],
    ai: { heal: true },
  },
  {
    id: 'inquisitorPenance', name: 'Penance', kind: 'action', jp: 300, skillset: 'inquisition',
    desc: 'Imposes a vow of silence on everyone in a small area. (Silence; hit MA + 140)',
    range: 4, aoe: 2, aoeV: 2, ct: 3, mp: 16, target: 'enemy', enemiesOnly: true, magic: true, anim: 'cast', vfx: 'status', color: '#a0a0c8',
    hit: F.hitMa(140),
    effects: [{ type: 'status', add: ['silence'] }],
    ai: { debuff: true },
  },
  {
    id: 'inquisitorShriving', name: 'Shriving', kind: 'action', jp: 350, skillset: 'inquisition',
    desc: 'Hears the confessions of allies in a small area and lifts every affliction from them.',
    range: 4, aoe: 2, aoeV: 2, ct: 3, mp: 18, target: 'ally', alliesOnly: true, magic: true, anim: 'pray', vfx: 'sparkleGreen', color: '#b0ffb0',
    effects: [{ type: 'status', remove: CURABLE }],
    ai: { heal: true },
  },

  // ======================================================= Cardinal — Holy Rites
  {
    id: 'cardinalBlessing', name: 'Blessing', kind: 'action', jp: 200, skillset: 'holyRites',
    desc: 'A cardinal\'s blessing mends the wounds of allies in a small area. (Heal Q16)',
    range: 4, aoe: 2, aoeV: 2, ct: 3, mp: 10, target: 'ally', alliesOnly: true, magic: true, anim: 'pray', vfx: 'heal', color: '#c8ffc8',
    effects: [{ type: 'heal', formula: F.magic(16) }],
    ai: { heal: true },
  },
  {
    id: 'cardinalRising', name: 'Rite of Rising', kind: 'action', jp: 600, skillset: 'holyRites',
    desc: 'Calls a fallen ally back to life with half their HP. Destroys the undead.',
    range: 4, ct: 4, mp: 20, target: 'ko', magic: true, anim: 'pray', vfx: 'revive', color: '#fff4c0',
    effects: [{ type: 'revive', pct: 0.5 }],
    ai: { revive: true },
  },
  {
    id: 'cardinalAegisPrayer', name: 'Aegis Prayer', kind: 'action', jp: 400, skillset: 'holyRites',
    desc: 'Wards allies in a small area in body and spirit. (Protect and Shell)',
    range: 3, aoe: 2, aoeV: 2, ct: 3, mp: 16, target: 'ally', alliesOnly: true, magic: true, anim: 'pray', vfx: 'guard', color: '#e8f0ff',
    effects: [{ type: 'status', add: ['protect', 'shell'], all: true }],
    ai: { buff: true },
  },
  {
    id: 'cardinalHoly', name: 'Holy', kind: 'action', jp: 600, skillset: 'holyRites',
    desc: 'Sacred light sears a single foe. (Magic Q46 holy)',
    range: 5, ct: 6, mp: 50, target: 'enemy', element: 'holy', magic: true, anim: 'pray', vfx: 'holy', color: '#fff8d0',
    effects: [{ type: 'damage', formula: F.magic(46), element: 'holy' }],
  },
  {
    id: 'cardinalAnathema', name: 'Anathema', kind: 'action', jp: 450, skillset: 'holyRites',
    desc: 'Pronounces anathema on a small area; something sickly answers the curse. (Poison, Blind or Silence; hit MA + 140)',
    range: 4, aoe: 2, aoeV: 2, ct: 4, mp: 20, target: 'enemy', enemiesOnly: true, magic: true, anim: 'cast', vfx: 'poison', color: '#70a040',
    hit: F.hitMa(140),
    effects: [{ type: 'status', add: ['poison', 'blind', 'silence'] }],
    ai: { debuff: true },
  },
];
