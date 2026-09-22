// Enemy / story knight classes: Fell Knight (Garmond), White Knight (Wolfram),
// Arc Knight (Zander, Dorian, Elmond), Sanctum Knight (Isidore, Rolf) and the
// Sanctum Commander (Volmar). Not available to generic recruits.
import type { AbilityDef, JobDef, WeaponType } from '../../types';
import { F } from '../../../battle/formulas';
import { paWp } from './common';

const BLADES: WeaponType[] = ['sword', 'knightSword'];
const ARC_BLADES: WeaponType[] = ['sword', 'knightSword', 'katana'];
const SANCTUM_ARMS: WeaponType[] = ['sword', 'knightSword', 'spear'];

export const jobs: JobDef[] = [
  // ---------------------------------------------------------------- Fell Knight
  {
    id: 'fellKnight', name: 'Fell Knight',
    desc: 'A sellsword knight who learned the forbidden dusk-blade techniques on the battlefields of the Fifty Winters\' War. His steel drinks the life of whoever it cuts.',
    generic: false,
    skillset: { id: 'duskBlade', name: 'Dusk Blade', desc: 'Forbidden sword arts that devour the vigour and spirit of the foe. Requires a sword or knight\'s sword.' },
    abilities: ['fellShadowblade', 'fellDuskblade'],
    move: 4, jump: 3, cev: 12,
    mult: { hp: 200, mp: 130, sp: 120, pa: 145, ma: 105 },
    growth: { hp: 10, mp: 14, sp: 100, pa: 40, ma: 50 },
    equip: ['sword', 'knightSword', 'shield', 'helmet', 'armor', 'robe'],
    immune: ['charm', 'frog', 'chicken'],
    look: {
      headgear: 'none', torso: 'plate', legs: 'armored', cape: 'long', shoulders: 'spikes',
      palette: { primary: '#1b1b21', secondary: '#2b2a31', accent: '#8e1b22', metal: '#34343d', leather: '#3a1f16' },
      extras: ['belt', 'gloves'],
      bulk: 1.12,
    },
  },
  // ---------------------------------------------------------------- White Knight
  {
    id: 'whiteKnight', name: 'White Knight',
    desc: 'A holy knight of the old wars who turned his consecrated blade against the nobles he once served. Commander of the Ashen Brigade.',
    generic: false,
    skillset: { id: 'ashenBlade', name: 'Sacred Blade', desc: 'Consecrated sword arts, turned to the cause of the Ashen Brigade. Requires a sword or knight\'s sword.' },
    abilities: ['ashenStasis', 'ashenSplit', 'ashenCrush', 'ashenLightning', 'ashenHoly'],
    move: 4, jump: 3, cev: 12,
    mult: { hp: 190, mp: 120, sp: 122, pa: 140, ma: 110 },
    growth: { hp: 10, mp: 13, sp: 100, pa: 40, ma: 50 },
    equip: ['sword', 'knightSword', 'shield', 'helmet', 'armor'],
    // the source knight shrugs off most mind- and body-altering afflictions
    immune: ['petrify', 'confuse', 'frog', 'chicken', 'sleep', 'berserk', 'charm', 'doom'],
    look: {
      headgear: 'none', torso: 'plate', legs: 'armored', cape: 'mantle', shoulders: 'pauldrons',
      palette: { primary: '#ece9e1', secondary: '#cbc3ad', accent: '#d4a93a', metal: '#e4dfd0', leather: '#6b4e2e' },
      extras: ['belt'],
      bulk: 1.1,
    },
  },
  // ---------------------------------------------------------------- Arc Knight
  {
    id: 'arcKnight', name: 'Arc Knight',
    desc: 'A knight of the highest nobility, schooled in the moon-cut sword arts reserved for royal blood. Their blades wound the spirit as surely as the flesh.',
    generic: false,
    skillset: { id: 'arcBlade', name: 'Arc Blade', desc: 'Moon-cut sword arts of the high nobility: spirit waves that sap HP and MP, and ruinous cuts that sap strength.' },
    abilities: [
      'arcNightfall', 'arcSoulreave', 'arcGreyTide', 'arcMoonscar', 'arcRegalWard',
      'arcCrimsonKiss', 'arcFleetbane', 'arcSinewRend', 'arcHollowMind',
    ],
    move: 4, jump: 4, cev: 16,
    mult: { hp: 200, mp: 140, sp: 128, pa: 136, ma: 120 },
    growth: { hp: 10, mp: 13, sp: 100, pa: 40, ma: 48 },
    equip: ['sword', 'knightSword', 'katana', 'shield', 'helmet', 'armor'],
    // not immune to undead / vampire: undead Zander and vampire Elmond rely on them
    immune: ['charm', 'frog', 'chicken', 'petrify'],
    look: {
      headgear: 'none', torso: 'plate', legs: 'armored', cape: 'long', shoulders: 'pauldrons',
      palette: { primary: '#3b2a5c', secondary: '#23232b', accent: '#c9a646', metal: '#4b505b', leather: '#2b1d14' },
      extras: ['belt', 'gloves'],
      bulk: 1.08,
    },
  },
  // ---------------------------------------------------------------- Sanctum Knight
  {
    id: 'sanctumKnight', name: 'Sanctum Knight',
    desc: 'A secret knight of the Glorian Church, sworn to the Pontiff and not to any crown. Their arts shatter the armour of heretics at a distance.',
    generic: false,
    skillset: { id: 'sanctumArts', name: 'Sanctum Arts', desc: 'Church sword arts that strike from three tiles away and destroy the equipment they hit. Requires a sword, knight\'s sword or spear.' },
    abilities: ['sanctumMailrend', 'sanctumCrownsplitter', 'sanctumSwordbane', 'sanctumFrostfang', 'sanctumSkyfall', 'sanctumAegisOath'],
    move: 4, jump: 4, cev: 15,
    mult: { hp: 195, mp: 120, sp: 128, pa: 133, ma: 118 },
    growth: { hp: 10, mp: 14, sp: 100, pa: 40, ma: 50 },
    equip: ['sword', 'knightSword', 'spear', 'shield', 'helmet', 'armor'],
    immune: ['charm', 'frog', 'chicken'],
    look: {
      headgear: 'helm', torso: 'plate', legs: 'armored', cape: 'tabard', shoulders: 'pauldrons',
      palette: { primary: '#2f4f8a', secondary: '#9aa3b2', accent: '#f4f4f0', metal: '#c4ccd6', leather: '#3b2d22' },
      extras: ['belt'],
      bulk: 1.06,
    },
  },
  // ---------------------------------------------------------------- Sanctum Commander
  {
    id: 'sanctumCommander', name: 'Sanctum Commander',
    desc: 'Grand master of the Sanctum Knights. Where his knights break a heretic\'s arms, he breaks the heretic.',
    generic: false,
    skillset: { id: 'highSanctum', name: 'High Sanctum Arts', desc: 'The full canon of the Sanctum Knights: equipment-breaking arts, the Judgement Blade and the commands of the Order.' },
    abilities: [
      'sanctumCmdJudgement', 'sanctumCmdLionsRoar', 'sanctumCmdChains', 'sanctumCmdRally',
      'sanctumMailrend', 'sanctumCrownsplitter', 'sanctumSwordbane', 'sanctumFrostfang',
    ],
    innate: ['defenseUp'],
    move: 5, jump: 3, cev: 20,
    mult: { hp: 205, mp: 135, sp: 120, pa: 135, ma: 120 },
    growth: { hp: 9, mp: 13, sp: 100, pa: 40, ma: 48 },
    equip: ['sword', 'knightSword', 'spear', 'shield', 'helmet', 'armor', 'robe'],
    immune: ['charm', 'frog', 'chicken', 'petrify', 'doom'],
    look: {
      headgear: 'none', torso: 'plate', legs: 'armored', cape: 'long', shoulders: 'pauldrons',
      palette: { primary: '#2a3f78', secondary: '#b8bfcc', accent: '#d9b44a', metal: '#d4d9e1', leather: '#3b2a1c' },
      extras: ['belt', 'gloves'],
      bulk: 1.14,
    },
  },
];

export const abilities: AbilityDef[] = [
  // ======================================================= Fell Knight — Dusk Blade
  {
    id: 'fellShadowblade', name: 'Shadowblade', kind: 'action', jp: 500, skillset: 'duskBlade',
    desc: 'A black arc of steel tears the life from a foe up to two tiles away and pours it into the wielder. (PA × WP, HP drained)',
    range: 2, target: 'enemy', anim: 'swing', vfx: 'drain', color: '#9a1030',
    requires: { weapon: BLADES }, noReflect: true, triggersReaction: 'physical',
    effects: [{ type: 'damage', formula: paWp(1), drain: true }],
    ai: { score: 12 },
  },
  {
    id: 'fellDuskblade', name: 'Duskblade', kind: 'action', jp: 400, skillset: 'duskBlade',
    desc: 'A grey cut that drinks the foe\'s magic and leaves a shallow wound. (MP damage PA × WP, drained; HP damage PA × WP × 0.4)',
    range: 2, target: 'enemy', anim: 'swing', vfx: 'drain', color: '#5a4aa8',
    requires: { weapon: BLADES }, noReflect: true, triggersReaction: 'physical',
    effects: [
      { type: 'damage', stat: 'mp', formula: paWp(1), drain: true },
      { type: 'damage', formula: paWp(0.4) },
    ],
  },

  // ======================================================= White Knight — Sacred Blade (Ashen)
  {
    id: 'ashenStasis', name: 'Stasis Brand', kind: 'action', jp: 300, skillset: 'ashenBlade',
    desc: 'A consecrated cut that freezes the air around the target. Hits a small area; may Stop. (PA × WP, Stop 25%)',
    range: 2, aoe: 2, aoeV: 1, target: 'enemy', anim: 'swing', vfx: 'time', color: '#a8d4ff',
    requires: { weapon: BLADES }, noReflect: true,
    effects: [{ type: 'damage', formula: paWp(1) }],
    statusChance: [{ status: 'stop', chance: 25 }],
  },
  {
    id: 'ashenSplit', name: 'Sundering Strike', kind: 'action', jp: 400, skillset: 'ashenBlade',
    desc: 'A shockwave rips through the ground in a line three tiles long, marking those it cuts for death. (PA × WP, Doom 25%)',
    range: 1, shape: 'line', aoe: 3, target: 'enemy', anim: 'swing', vfx: 'slash', color: '#efe4c0',
    requires: { weapon: BLADES }, noReflect: true,
    effects: [{ type: 'damage', formula: paWp(1) }],
    statusChance: [{ status: 'doom', chance: 25 }],
  },
  {
    id: 'ashenCrush', name: 'Crushing Verdict', kind: 'action', jp: 500, skillset: 'ashenBlade',
    desc: 'Pale fire gathers above a foe up to three tiles away and falls like a headsman\'s axe. (PA × WP, KO 20%)',
    range: 3, target: 'enemy', anim: 'swing', vfx: 'explosion', color: '#fff0c0',
    requires: { weapon: BLADES }, noReflect: true,
    effects: [{ type: 'damage', formula: paWp(1) }],
    statusChance: [{ status: 'ko', chance: 20 }],
  },
  {
    id: 'ashenLightning', name: 'Stormbrand', kind: 'action', jp: 600, skillset: 'ashenBlade',
    desc: 'The blade calls down lightning on a small area up to three tiles away, searing throats silent. (PA × WP lightning, Silence 25%)',
    range: 3, aoe: 2, aoeV: 1, target: 'enemy', element: 'lightning', anim: 'swing', vfx: 'thunder', color: '#fff7a0',
    requires: { weapon: BLADES }, noReflect: true,
    effects: [{ type: 'damage', formula: paWp(1), element: 'lightning' }],
    statusChance: [{ status: 'silence', chance: 25 }],
  },
  {
    id: 'ashenHoly', name: 'Ashen Radiance', kind: 'action', jp: 800, skillset: 'ashenBlade',
    desc: 'A column of ash-grey holy fire races five tiles ahead, scorching and bewildering all in its path. (PA × WP holy, Confuse 25%)',
    range: 1, shape: 'line', aoe: 5, target: 'enemy', element: 'holy', anim: 'swing', vfx: 'holy', color: '#f2e2b0',
    requires: { weapon: BLADES }, noReflect: true,
    effects: [{ type: 'damage', formula: paWp(1), element: 'holy' }],
    statusChance: [{ status: 'confuse', chance: 25 }],
  },

  // ======================================================= Arc Knight — Arc Blade
  {
    id: 'arcNightfall', name: 'Nightfall', kind: 'action', jp: 500, skillset: 'arcBlade',
    desc: 'The knight lets the dark within the blade spill out, drowning every foe within two tiles. ((PA + MA) / 2 × 10 dark, Blind 20%)',
    range: 0, aoe: 3, aoeV: 3, target: 'enemy', enemiesOnly: true, element: 'dark', anim: 'draw', vfx: 'dark', color: '#4a2070',
    noReflect: true,
    effects: [{ type: 'damage', formula: F.paMa(10), element: 'dark' }],
    statusChance: [{ status: 'blind', chance: 20 }],
  },
  {
    id: 'arcSoulreave', name: 'Soulreave', kind: 'action', jp: 400, skillset: 'arcBlade',
    desc: 'A spectral tide tears at the spirits of nearby foes, drinking their MP. (MP damage (PA + MA) / 2 × 5, drained; HP damage × 3)',
    range: 0, aoe: 3, aoeV: 3, target: 'enemy', enemiesOnly: true, anim: 'draw', vfx: 'drain', color: '#7a6ad8',
    noReflect: true,
    effects: [
      { type: 'damage', stat: 'mp', formula: F.paMa(5), drain: true },
      { type: 'damage', formula: F.paMa(3) },
    ],
  },
  {
    id: 'arcGreyTide', name: 'Grey Tide', kind: 'action', jp: 350, skillset: 'arcBlade',
    desc: 'A cold grey mist rolls from the blade over nearby foes, weighing down their limbs. ((PA + MA) / 2 × 7 water, Slow 35%)',
    range: 0, aoe: 3, aoeV: 3, target: 'enemy', enemiesOnly: true, element: 'water', anim: 'draw', vfx: 'water', color: '#8a96ae',
    noReflect: true,
    effects: [{ type: 'damage', formula: F.paMa(7), element: 'water' }],
    statusChance: [{ status: 'slow', chance: 35 }],
  },
  {
    id: 'arcMoonscar', name: 'Moonscar', kind: 'action', jp: 600, skillset: 'arcBlade',
    desc: 'A crescent of pale light scars every nearby foe, clouding minds and marking souls. ((PA + MA) / 2 × 8, Confuse 20%, Doom 15%)',
    range: 0, aoe: 3, aoeV: 3, target: 'enemy', enemiesOnly: true, anim: 'draw', vfx: 'sword', color: '#c0b4ff',
    noReflect: true,
    effects: [{ type: 'damage', formula: F.paMa(8) }],
    statusChance: [{ status: 'confuse', chance: 20 }, { status: 'doom', chance: 15 }],
  },
  {
    id: 'arcRegalWard', name: 'Regal Ward', kind: 'action', jp: 700, skillset: 'arcBlade',
    desc: 'The knight raises the blade in a royal salute; nearby allies are quickened and their wounds knit. (Haste and Regen to allies within two tiles)',
    range: 0, aoe: 3, aoeV: 3, target: 'ally', alliesOnly: true, anim: 'draw', vfx: 'buff', color: '#e8c860',
    noReflect: true,
    effects: [{ type: 'status', add: ['haste', 'regen'], all: true }],
    ai: { buff: true },
  },
  {
    id: 'arcCrimsonKiss', name: 'Crimson Kiss', kind: 'action', jp: 800, skillset: 'arcBlade',
    desc: 'Sinks fangs into an adjacent foe on the same level, drinking blood and passing on the curse of the vampire. (PA × 8, HP drained; Vampire)',
    range: 1, rangeV: 0, target: 'enemy', anim: 'bite', vfx: 'drain', color: '#b0102a',
    noReflect: true,
    effects: [
      { type: 'damage', formula: F.pa(8), drain: true },
      { type: 'status', add: ['vampire'] },
    ],
    ai: { debuff: true },
  },
  {
    id: 'arcFleetbane', name: 'Fleetbane', kind: 'action', jp: 450, skillset: 'arcBlade',
    desc: 'A cut to the hamstring of a foe up to two tiles away. (PA × WP × 0.6, Speed -2; hit PA + 50%)',
    range: 2, target: 'enemy', anim: 'swing', vfx: 'debuff', color: '#80c0ff',
    requires: { weapon: ARC_BLADES }, noReflect: true, hit: F.hitPa(50),
    effects: [{ type: 'damage', formula: paWp(0.6) }, { type: 'stat', stat: 'speed', amount: -2 }],
    ai: { debuff: true },
  },
  {
    id: 'arcSinewRend', name: 'Sinew Rend', kind: 'action', jp: 450, skillset: 'arcBlade',
    desc: 'Severs the sword-arm tendons of a foe up to two tiles away. (PA × WP × 0.6, PA -3; hit PA + 50%)',
    range: 2, target: 'enemy', anim: 'swing', vfx: 'debuff', color: '#ff8a60',
    requires: { weapon: ARC_BLADES }, noReflect: true, hit: F.hitPa(50),
    effects: [{ type: 'damage', formula: paWp(0.6) }, { type: 'stat', stat: 'pa', amount: -3 }],
    ai: { debuff: true },
  },
  {
    id: 'arcHollowMind', name: 'Hollow Mind', kind: 'action', jp: 450, skillset: 'arcBlade',
    desc: 'A cut that bleeds the wits and magic from a foe up to two tiles away. (PA × WP × 0.5, MA -3; hit PA + 50%)',
    range: 2, target: 'enemy', anim: 'swing', vfx: 'debuff', color: '#c080ff',
    requires: { weapon: ARC_BLADES }, noReflect: true, hit: F.hitPa(50),
    effects: [{ type: 'damage', formula: paWp(0.5) }, { type: 'stat', stat: 'ma', amount: -3 }],
    ai: { debuff: true },
  },

  // ======================================================= Sanctum Knight — Sanctum Arts
  {
    id: 'sanctumMailrend', name: 'Mailrend', kind: 'action', jp: 400, skillset: 'sanctumArts',
    desc: 'A thrust of blessed force three tiles long that bursts the target\'s body armour. (PA × WP × 0.8, destroys body armour; hit PA + WP + 40%)',
    range: 3, target: 'enemy', anim: 'thrust', vfx: 'pierce', color: '#dce4f4',
    requires: { weapon: SANCTUM_ARMS }, noReflect: true, hit: F.hitPaWp(40),
    effects: [{ type: 'damage', formula: paWp(0.8) }, { type: 'breakEquip', slot: 'body' }],
    ai: { debuff: true },
  },
  {
    id: 'sanctumCrownsplitter', name: 'Crownsplitter', kind: 'action', jp: 350, skillset: 'sanctumArts',
    desc: 'A descending blow from up to three tiles away that splits the target\'s helm. (PA × WP × 0.8, destroys headgear; hit PA + WP + 40%)',
    range: 3, target: 'enemy', anim: 'swing', vfx: 'impact', color: '#f0f0ff',
    requires: { weapon: SANCTUM_ARMS }, noReflect: true, hit: F.hitPaWp(40),
    effects: [{ type: 'damage', formula: paWp(0.8) }, { type: 'breakEquip', slot: 'head' }],
    ai: { debuff: true },
  },
  {
    id: 'sanctumSwordbane', name: 'Swordbane', kind: 'action', jp: 500, skillset: 'sanctumArts',
    desc: 'A ringing counter-cut from up to three tiles away that shatters the target\'s weapon. (PA × WP × 0.8, destroys weapon; hit PA + WP + 40%)',
    range: 3, target: 'enemy', anim: 'swing', vfx: 'slash', color: '#ffd8a8',
    requires: { weapon: SANCTUM_ARMS }, noReflect: true, hit: F.hitPaWp(40),
    effects: [{ type: 'damage', formula: paWp(0.8) }, { type: 'breakEquip', slot: 'rhand' }],
    ai: { debuff: true },
  },
  {
    id: 'sanctumFrostfang', name: 'Frostfang', kind: 'action', jp: 450, skillset: 'sanctumArts',
    desc: 'A wolf of hoarfrost leaps from the blade and bites the target\'s trinkets to splinters. (PA × WP × 0.8 ice, destroys accessory; hit PA + WP + 40%)',
    range: 3, target: 'enemy', element: 'ice', anim: 'thrust', vfx: 'ice', color: '#a8e0ff',
    requires: { weapon: SANCTUM_ARMS }, noReflect: true, hit: F.hitPaWp(40),
    effects: [{ type: 'damage', formula: paWp(0.8), element: 'ice' }, { type: 'breakEquip', slot: 'accessory' }],
    ai: { debuff: true },
  },
  {
    id: 'sanctumSkyfall', name: 'Skyfall Lance', kind: 'action', jp: 600, skillset: 'sanctumArts',
    desc: 'Leaps high above the field and falls on a foe up to four tiles away. Cannot be evaded. (Weapon damage × 1.5, short charge)',
    range: 4, rangeV: 99, ct: 3, target: 'enemy', anim: 'jump', vfx: 'jumpImpact', color: '#c0d8ff',
    noReflect: true,
    effects: [{ type: 'damage', formula: F.weapon(1.5) }],
  },
  {
    id: 'sanctumAegisOath', name: 'Aegis Oath', kind: 'action', jp: 300, skillset: 'sanctumArts',
    desc: 'The knight recites the oath of the Sanctum; allies within one tile are warded in body and spirit. (Protect and Shell)',
    range: 0, aoe: 2, aoeV: 2, target: 'ally', alliesOnly: true, anim: 'pray', vfx: 'guard', color: '#e8f0ff',
    noReflect: true,
    effects: [{ type: 'status', add: ['protect', 'shell'], all: true }],
    ai: { buff: true },
  },

  // ======================================================= Sanctum Commander — High Sanctum Arts
  {
    id: 'sanctumCmdJudgement', name: 'Judgement Blade', kind: 'action', jp: 800, skillset: 'highSanctum',
    desc: 'A blade of white light falls on a small area up to three tiles away, halting heretics where they stand. (PA × WP × 1.1 holy, Stop 20%)',
    range: 3, aoe: 2, aoeV: 2, target: 'enemy', element: 'holy', anim: 'swing', vfx: 'holy', color: '#fff0b0',
    requires: { weapon: SANCTUM_ARMS }, noReflect: true,
    effects: [{ type: 'damage', formula: paWp(1.1), element: 'holy' }],
    statusChance: [{ status: 'stop', chance: 20 }],
  },
  {
    id: 'sanctumCmdLionsRoar', name: 'Lion\'s Roar', kind: 'action', jp: 600, skillset: 'highSanctum',
    desc: 'A roar of command batters every foe within two tiles and shakes their courage. (PA × 8, Brave -8)',
    range: 0, aoe: 3, aoeV: 3, target: 'enemy', enemiesOnly: true, anim: 'roar', vfx: 'wind', color: '#e8c060',
    noReflect: true,
    effects: [{ type: 'damage', formula: F.pa(8) }, { type: 'stat', stat: 'brave', amount: -8 }],
  },
  {
    id: 'sanctumCmdChains', name: 'Chains of Order', kind: 'action', jp: 700, skillset: 'highSanctum',
    desc: 'Golden sigil-chains bind a foe up to four tiles away hand and foot. (Immobilize and Disable; hit PA + 45%)',
    range: 4, target: 'enemy', anim: 'charge', vfx: 'glyph', color: '#e0c870',
    noReflect: true, hit: F.hitPa(45),
    effects: [{ type: 'status', add: ['immobilize', 'disable'], all: true }],
    ai: { debuff: true },
  },
  {
    id: 'sanctumCmdRally', name: 'Rally the Order', kind: 'action', jp: 500, skillset: 'highSanctum',
    desc: 'The commander\'s voice drives every ally within three tiles to greater speed. (Haste)',
    range: 0, aoe: 4, aoeV: 3, mp: 12, target: 'ally', alliesOnly: true, anim: 'charge', vfx: 'buffRed', color: '#ffe080',
    noReflect: true,
    effects: [{ type: 'status', add: ['haste'] }],
    ai: { buff: true },
  },
];
