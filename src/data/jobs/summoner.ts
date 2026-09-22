import type { AbilityDef, Element, JobDef, VfxId } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'summoner', name: 'Summoner', desc: 'A keeper of old pacts who calls great beings across the veil. Slow to begin, terrible once begun.',
    generic: true,
    requires: [{ job: 'timeMage', level: 2 }],
    skillset: { id: 'summon', name: 'Summon', desc: 'Call forth beings of legend. Their wrath strikes only foes; their grace touches only friends.' },
    abilities: [
      'mogwen', 'shiva', 'ifrit', 'thorvald', 'titan', 'golem', 'carbuncle', 'bahamut',
      'odin', 'leviathan', 'salamander', 'sylph', 'faerie', 'lich', 'cyclops',
      'absorbMp', 'halfMp',
    ],
    move: 3, jump: 3, cev: 5,
    mult: { hp: 70, mp: 125, sp: 90, pa: 50, ma: 125 },
    growth: { hp: 13, mp: 8, sp: 100, pa: 70, ma: 50 },
    equip: ['rod', 'staff', 'hat', 'ribbon', 'clothes', 'robe'],
    look: {
      headgear: 'hornHelm', torso: 'robe', legs: 'robe', cape: 'long', shoulders: 'fur',
      palette: { primary: '#2f7a6e', secondary: '#3f5f34', accent: '#d8b040', leather: '#4a3423' },
      extras: ['sash', 'bells'],
      bulk: 0.95,
    },
  },
];

/** Summon defaults: faith-based magic that ignores Reflect; copied by Mimics; not usable by Arithmancers. */
const S = { kind: 'action', skillset: 'summon', magic: true, noReflect: true, mimic: true, anim: 'summon', range: 4 } as const;

/** Offensive summon: MA × Q × Faith to enemies in the area. */
function wrath(
  id: string, name: string, desc: string, q: number, jp: number, mp: number, ct: number,
  aoe: number, aoeV: number, vfx: VfxId, color: string, element?: Element,
): AbilityDef {
  return {
    ...S, id, name, jp, mp, ct, aoe, aoeV, element, vfx, color, target: 'enemy', enemiesOnly: true,
    desc: `${desc} ${element ? element[0].toUpperCase() + element.slice(1) + ' damage' : 'Damage'}: MA × ${q} × Faith, foes only.`,
    effects: [{ type: 'damage', formula: F.magic(q), element }],
  };
}

export const abilities: AbilityDef[] = [
  {
    ...S, id: 'mogwen', name: 'Mogwen', desc: 'A small winged sprite of the hearth dances over allies, restoring HP (MA × 12 × Faith).', jp: 110,
    mp: 12, ct: 2, aoe: 3, aoeV: 2, target: 'ally', alliesOnly: true, vfx: 'heal', color: '#ffd6f0',
    effects: [{ type: 'heal', formula: F.magic(12) }], ai: { heal: true },
  },
  wrath('shiva', 'Shiva', 'The maiden of the frozen wastes breathes a killing frost.', 24, 200, 24, 4, 3, 2, 'glacier', '#9fe8ff', 'ice'),
  wrath('ifrit', 'Ifrit', 'The djinn of the burning deep rakes the field with hellfire.', 24, 200, 24, 4, 3, 2, 'inferno', '#ff6a2a', 'fire'),
  wrath('thorvald', 'Thorvald', 'The old storm-sage strikes down with his staff of thunder.', 24, 200, 24, 4, 3, 2, 'thunder', '#fff27a', 'lightning'),
  wrath('titan', 'Titan', 'The giant of the mountain roots heaves the earth beneath the foe.', 28, 220, 30, 5, 3, 2, 'quake', '#b08a55', 'earth'),
  {
    ...S, id: 'golem', name: 'Golem', desc: 'A stone guardian rises to shield every ally from blades and blows (grants Protect). Success: (MA + 200) × Faith.', jp: 500,
    mp: 40, ct: 3, range: 0, shape: 'allAllies', target: 'ally', alliesOnly: true, vfx: 'guard', color: '#b9a88a',
    hit: F.hitMa(200),
    effects: [{ type: 'status', add: ['protect'] }], ai: { buff: true },
  },
  {
    ...S, id: 'carbuncle', name: 'Carbuncle', desc: 'The ruby-browed beast lends its mirror hide to every ally (grants Reflect). Success: (MA + 150) × Faith.', jp: 350,
    mp: 30, ct: 4, range: 0, shape: 'allAllies', target: 'ally', alliesOnly: true, vfx: 'glyph', color: '#ff5a7a',
    hit: F.hitMa(150),
    effects: [{ type: 'status', add: ['reflect'] }], ai: { buff: true },
  },
  wrath('bahamut', 'Bahamut', 'The king of dragons looses a beam that scours the land.', 46, 1200, 60, 10, 4, 3, 'beam', '#9ab8ff'),
  wrath('odin', 'Odin', 'The one-eyed lord of the slain rides through the foe, blade drawn.', 40, 900, 50, 9, 4, 3, 'sword', '#d8d8ff'),
  wrath('leviathan', 'Leviathan', 'The serpent of the abyss raises a tidal wave.', 38, 850, 48, 9, 4, 3, 'water', '#3a8aff', 'water'),
  wrath('salamander', 'Salamander', 'The fire-drake of the forge breathes molten flame.', 38, 820, 48, 9, 3, 2, 'lava', '#ff4a10', 'fire'),
  {
    ...S, id: 'sylph', name: 'Sylph', desc: 'A wind spirit steals the breath from foes\' throats, inflicting Silence. Success: (MA + 150) × Faith.', jp: 400,
    mp: 26, ct: 5, aoe: 3, aoeV: 2, target: 'enemy', enemiesOnly: true, vfx: 'wind', color: '#b8ffd0',
    hit: F.hitMa(150),
    effects: [{ type: 'status', add: ['silence'] }], ai: { debuff: true },
  },
  {
    ...S, id: 'faerie', name: 'Faerie', desc: 'A faerie of the green wood scatters healing dust over allies (MA × 24 × Faith).', jp: 400,
    mp: 28, ct: 4, aoe: 3, aoeV: 2, target: 'ally', alliesOnly: true, vfx: 'healBig', color: '#c8ffb0',
    effects: [{ type: 'heal', formula: F.magic(24) }], ai: { heal: true },
  },
  {
    ...S, id: 'lich', name: 'Lich', desc: 'The deathless sorcerer drains half the life of every foe in the area. Dark. Success: (MA + 160) × Faith.', jp: 600,
    mp: 40, ct: 9, aoe: 3, aoeV: 2, target: 'enemy', enemiesOnly: true, element: 'dark', vfx: 'dark', color: '#6a3a9a',
    hit: F.hitMa(160),
    effects: [{ type: 'damage', formula: F.pctMaxHp(0.5), element: 'dark' }],
  },
  wrath('cyclops', 'Cyclops', 'The one-eyed titan brings down its club with a force that splits hills.', 50, 1000, 62, 9, 3, 2, 'explosion', '#ffb070'),
  // The ultimate summon. Not in the Summoner's list: learned only by surviving it in the side quest.
  wrath('twelvefold', 'Twelvefold', 'The twelve signs align and their bearer is called down in judgement.', 96, 0, 99, 10, 4, 3, 'ultima', '#ffe8a0'),
  // ---- reaction / support / movement ----
  { id: 'absorbMp', name: 'Absorb MP', desc: 'When struck by a spell, absorb MP equal to what its caster spent.', kind: 'reaction', jp: 250, skillset: 'summoner' },
  { id: 'halfMp', name: 'Half MP', desc: 'All abilities cost half as much MP.', kind: 'support', jp: 900, skillset: 'summoner' },
];
