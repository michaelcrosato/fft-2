import type { AbilityDef, Element, FormulaCtx, JobDef, StatusId, VfxId } from '../types';

export const jobs: JobDef[] = [
  {
    id: 'geomancer', name: 'Geomancer', desc: 'A wanderer who reads the veins of the land. Calls upon the very ground beneath a foe — water, stone, root and flame — to strike and bind.',
    generic: true,
    requires: [{ job: 'monk', level: 3 }],
    skillset: { id: 'geomancy', name: 'Geomancy', desc: 'Rouse the land itself. The art used depends on the ground of the targeted tile.' },
    abilities: [
      'geoSinkhole', 'geoWaterBall', 'geoIvy', 'geoStoneSculpt', 'geoQuake', 'geoWindBlade',
      'geoWisp', 'geoQuicksand', 'geoSandstorm', 'geoBlizzard', 'geoGustyWind', 'geoLavaBall',
      'counterFlood', 'attackUp', 'anyGround', 'lavaWalk',
    ],
    move: 4, jump: 3, cev: 10,
    mult: { hp: 110, mp: 95, sp: 100, pa: 110, ma: 105 },
    growth: { hp: 10, mp: 11, sp: 100, pa: 45, ma: 50 },
    equip: ['axe', 'sword', 'shield', 'hat', 'clothes', 'robe'],
    look: {
      headgear: 'turban', torso: 'coat', legs: 'pants', cape: 'short', shoulders: 'none',
      palette: { primary: '#9a3a26', secondary: '#6b4a2a', accent: '#d9a93a', metal: '#b89a5a', leather: '#4a2e1a' },
      extras: ['sash', 'belt'],
    },
  },
];

/** Geomancy damage: ([PA / 2] + 1) * MA — never misses, ignores Faith. */
const geoDamage = (x: FormulaCtx) => (Math.floor(x.c.pa / 2) + 1) * x.c.ma;

/** Terrain arts: range 5, AoE 2 (vertical tolerance 0), ~25% chance of an added ailment. */
function geo(
  id: string, name: string, group: string, desc: string, status: StatusId, vfx: VfxId, color: string, element?: Element,
): AbilityDef {
  return {
    id, name, desc, kind: 'action', jp: 150, skillset: 'geomancy',
    special: 'geo', params: { groups: group },
    range: 5, aoe: 2, aoeV: 0, target: 'tile', noReflect: true,
    element, anim: 'cast', vfx, color, mimic: true,
    effects: [{ type: 'damage', formula: geoDamage }],
    statusChance: [{ status, chance: 25 }],
  };
}

export const abilities: AbilityDef[] = [
  geo('geoSinkhole', 'Sinkhole', 'soil',
    'Open the earth beneath a foe on soil or road. Damages and may leave them Immobile.', 'immobilize', 'quake', '#7a5a3a', 'earth'),
  geo('geoWaterBall', 'Water Ball', 'water',
    'Heave a sphere of river or lake water at a foe. Damages and may turn them into a Toad.', 'frog', 'water', '#4aa3ff', 'water'),
  geo('geoIvy', 'Strangling Ivy', 'grass',
    'Wake the grass and brambles to seize a foe. Damages and may Stop them in place.', 'stop', 'ivy', '#3c8f3c'),
  geo('geoStoneSculpt', 'Stone Sculpt', 'stone',
    'Draw the stone of floor or grave up around a foe. Damages and may turn them to Stone.', 'petrify', 'stone', '#9a9a9a'),
  geo('geoQuake', 'Local Quake', 'rock',
    'Shake loose the rock of a cliff face. Damages and may Confuse.', 'confuse', 'quake', '#a07a4a', 'earth'),
  geo('geoWindBlade', 'Wind Blade', 'brick',
    'Loose a whirling blade of wind off brick and moss. Damages and may Disable.', 'disable', 'wind', '#bfe8d0', 'wind'),
  geo('geoWisp', "Will-o'-Wisp", 'wood',
    'Kindle ghost-fire from boards, rugs and timbers. Damages and may lull a foe to Sleep.', 'sleep', 'flames', '#7fd0ff', 'fire'),
  geo('geoQuicksand', 'Quicksand', 'marsh',
    'Let the fen swallow a foe. Damages and may lay Doom upon them.', 'doom', 'sand', '#6b5a3a', 'water'),
  geo('geoSandstorm', 'Sandstorm', 'sand',
    'Whip the sand and salt into a blinding gale. Damages and may Blind.', 'blind', 'sand', '#d8c080', 'wind'),
  geo('geoBlizzard', 'Blizzard', 'snow',
    'Raise the snow into a howling squall. Damages and may Silence.', 'silence', 'blizzard', '#cfefff', 'ice'),
  geo('geoGustyWind', 'Gusty Wind', 'roof',
    'Call the high winds that sweep the rooftops. Damages and may Slow.', 'slow', 'wind', '#e0f0ff', 'wind'),
  geo('geoLavaBall', 'Lava Ball', 'lava',
    'Hurl molten rock from lava or furnace-metal. Damages and may fell a foe outright.', 'ko', 'lava', '#ff5a1a', 'fire'),

  // Internal: automatic geomancy used by Counter Flood (picks the art from the target tile). Not learnable.
  {
    id: 'geomancy', name: 'Geomancy', desc: 'The land answers on its own, striking with whatever lies beneath the foe.', kind: 'action', jp: 0,
    skillset: 'geomancy', special: 'geoAuto', range: 5, aoe: 2, aoeV: 0, target: 'tile', noReflect: true,
    // a counter strikes the attacker's side only (the reactor is often inside the AoE)
    enemiesOnly: true,
    anim: 'cast', vfx: 'quake', color: '#a07a4a',
    // fallback when resolved outside the geoAuto handler (e.g. reaction sub-actions)
    effects: [{ type: 'damage', formula: geoDamage }],
  },

  // ---- reaction / support / movement ----
  { id: 'counterFlood', name: 'Counter Flood', desc: 'When struck by a physical attack, answer with the geomancy of the ground beneath the attacker.', kind: 'reaction', jp: 300, skillset: 'geomancer' },
  { id: 'attackUp', name: 'Attack Up', desc: 'Raises the damage of physical attacks by a third.', kind: 'support', jp: 400, skillset: 'geomancer' },
  { id: 'anyGround', name: 'Any Ground', desc: 'Moves through water and difficult ground without penalty.', kind: 'movement', jp: 220, skillset: 'geomancer' },
  { id: 'lavaWalk', name: 'Lava Walk', desc: 'Walk upon lava unharmed.', kind: 'movement', jp: 150, skillset: 'geomancer' },
];
