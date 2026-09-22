import type { AbilityDef, EffectSpec, JobDef, StatusChance, VfxId } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'samurai', name: 'Samurai', desc: 'A swordsman of the far eastern isles. Draws forth the spirits bound within famed katana to smite foes and shield friends.',
    generic: true,
    requires: [{ job: 'knight', level: 3 }, { job: 'monk', level: 4 }, { job: 'lancer', level: 2 }],
    skillset: { id: 'iaido', name: 'Iaido', desc: 'Unsheathe a katana from the party stock to loose the spirit within. Never harms allies; the blade may shatter.' },
    abilities: [
      'iaidoAsura', 'iaidoKotetsu', 'iaidoBizenBoat', 'iaidoMurasame', 'iaidoHeavensCloud',
      'iaidoKiyomori', 'iaidoMuramasa', 'iaidoKikuichimonji', 'iaidoMasamune', 'iaidoChirijiraden',
      'bladeGrasp', 'bonecrusher', 'equipKatana', 'twoHands', 'waterWalk',
    ],
    // the source lists Two Hands as innate for the class
    innate: ['twoHands'],
    move: 3, jump: 3, cev: 20,
    mult: { hp: 75, mp: 75, sp: 100, pa: 128, ma: 90 },
    growth: { hp: 12, mp: 14, sp: 100, pa: 45, ma: 50 },
    equip: ['katana', 'helmet', 'armor'],
    look: {
      headgear: 'kabuto', torso: 'kimono', legs: 'hakama', cape: 'none', shoulders: 'pads',
      palette: { primary: '#8e1b1b', secondary: '#1c1a1f', accent: '#d8b24a', metal: '#3a3a42', leather: '#2a1a14' },
      extras: ['sash'],
      bulk: 1.02,
    },
  },
];

interface IaidoOpts {
  enemies?: boolean;
  line?: boolean;
  statusChance?: StatusChance[];
  ai?: AbilityDef['ai'];
}

/** Iaido: centred on the Samurai (radius 2 diamond, vertical 3) unless `line`; requires the katana in stock. */
function iaido(
  id: string, name: string, katana: string, jp: number, desc: string, effects: EffectSpec[],
  vfx: VfxId, color: string, o: IaidoOpts = {},
): AbilityDef {
  const enemies = o.enemies ?? true;
  return {
    id, name, desc, kind: 'action', jp, skillset: 'iaido',
    special: 'iaido', requires: { item: katana },
    ...(o.line
      ? { range: 1, shape: 'line' as const, aoe: 8, aoeV: 3 }
      : { range: 0, aoe: 3, aoeV: 3 }),
    ...(enemies ? { enemiesOnly: true } : { alliesOnly: true }),
    noReflect: true, anim: 'draw', vfx, color, mimic: true,
    effects, statusChance: o.statusChance, ai: o.ai,
  };
}

export const abilities: AbilityDef[] = [
  iaido('iaidoAsura', 'Asura', 'asura', 100,
    'The spirit of a wrathful war-god lashes every nearby foe. (MA × 8)',
    [{ type: 'damage', formula: F.ma(8) }], 'sword', '#d84a3a'),
  iaido('iaidoKotetsu', 'Kotetsu', 'kotetsu', 180,
    'A cold, keen spirit cuts through nearby foes. (MA × 12)',
    [{ type: 'damage', formula: F.ma(12) }], 'sword', '#c8d0e0'),
  iaido('iaidoBizenBoat', 'Bizen Boat', 'bizenBoat', 260,
    'A drifting phantom drains the magical strength of nearby foes. (MP damage MA × 4)',
    [{ type: 'damage', stat: 'mp', formula: F.ma(4) }], 'drain', '#8a7aff'),
  iaido('iaidoMurasame', 'Murasame', 'murasame', 340,
    'A soft rain falls upon nearby allies, washing their wounds. (Restores MA × 12 HP)',
    [{ type: 'heal', formula: F.ma(12) }], 'heal', '#8fe0ff', { enemies: false, ai: { heal: true } }),
  iaido('iaidoHeavensCloud', "Heaven's Cloud", 'heavensCloud', 420,
    'Storm-cloud spirits strike nearby foes and may Slow them. (MA × 14)',
    [{ type: 'damage', formula: F.ma(14) }], 'sword', '#9fb8e8', { statusChance: [{ status: 'slow', chance: 25 }] }),
  iaido('iaidoKiyomori', 'Kiyomori', 'kiyomori', 500,
    'A warding spirit grants Protect and Shell to nearby allies.',
    [{ type: 'status', add: ['protect', 'shell'], all: true }], 'buff', '#f0d878', { enemies: false, ai: { buff: true } }),
  iaido('iaidoMuramasa', 'Muramasa', 'muramasa', 580,
    'A cursed blade\'s hunger strikes nearby foes, and may bring Confusion or Doom. (MA × 18)',
    [{ type: 'damage', formula: F.ma(18) }], 'dark', '#a02050',
    { statusChance: [{ status: 'confuse', chance: 13 }, { status: 'doom', chance: 12 }] }),
  iaido('iaidoKikuichimonji', 'Kiku-ichimonji', 'kikuichimonji', 660,
    'A single chrysanthemum stroke carves through every foe in a line eight tiles long. (MA × 16)',
    [{ type: 'damage', formula: F.ma(16) }], 'slash', '#f4e0a0', { line: true }),
  iaido('iaidoMasamune', 'Masamune', 'masamune', 740,
    'The purest of blades lends nearby allies Haste and Regen.',
    [{ type: 'status', add: ['haste', 'regen'], all: true }], 'buff', '#ffe6a0', { enemies: false, ai: { buff: true } }),
  iaido('iaidoChirijiraden', 'Chirijiraden', 'chirijiraden', 820,
    'A blade inlaid with scattered pearl unleashes a storm of petals that shreds nearby foes. (MA × 30)',
    [{ type: 'damage', formula: F.ma(30) }], 'sword', '#ffd0e8'),
  // ---- reaction / support / movement ----
  { id: 'bladeGrasp', name: 'Blade Grasp', desc: 'Catch a physical blow barehanded — blocks attacks, jumps and throws Brave% of the time.', kind: 'reaction', jp: 700, skillset: 'samurai' },
  { id: 'bonecrusher', name: 'Bonecrusher', desc: 'When brought to critical HP by a nearby foe, strike back for damage equal to your max HP.', kind: 'reaction', jp: 200, skillset: 'samurai' },
  { id: 'equipKatana', name: 'Equip Katana', desc: 'Allows any job to equip katana.', kind: 'support', jp: 400, skillset: 'samurai' },
  { id: 'twoHands', name: 'Two Hands', desc: 'Grip a one-handed weapon with both hands to double its power.', kind: 'support', jp: 900, skillset: 'samurai' },
  { id: 'waterWalk', name: 'Water Walk', desc: 'Walk across the surface of water as though it were land.', kind: 'movement', jp: 300, skillset: 'samurai' },
];
