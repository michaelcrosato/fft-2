// ============================================================================
//  Bestiary — the beasts of Ivaldis as monster "jobs" (one per species).
//
//  Sixteen families of three tiers each (base / mid / top). Stats: monsters
//  start from newRaw('monster') and grow with the job's `growth`; `mult` turns
//  raw values into displayed ones (see src/battle/stats.ts). Speed curves are
//  fitted to the old bestiary tables (level 1/10/30/50/99); HP/MP/PA/MA are
//  scaled by tier so each step up the family is a clear threat.
//
//  monsterSkills: the first skills are known from level 1; the last entry is
//  the family's secret art (needs Beast Lore — `monsterSkill` — nearby in the
//  classic rules), learned at level 20/22/25 for base/mid/top tiers.
//
//  Every monster has the innate reaction Counter and is immune to Vampire
//  (blood drinking), as in the old tales. `poach` = [common, rare].
// ============================================================================
import type { Element, JobDef, MonsterShape, Palette, StatusId } from '../types';

type Stats = [hpM: number, hpC: number, mpM: number, mpC: number, spM: number, spC: number, paM: number, paC: number, maM: number, maC: number];

interface Spec {
  id: string;
  name: string;
  desc: string;
  family: string;
  shape: MonsterShape;
  palette: Palette;
  scale?: number;
  variant?: number;
  tier: 1 | 2 | 3;
  move: number;
  jump: number;
  cev: number;
  stats: Stats;
  /** regular skills (known from level 1) */
  skills: string[];
  /** secret art */
  secret: string;
  poach: [string, string];
  always?: StatusId[];
  immune?: StatusId[];
  absorb?: Element[];
  halve?: Element[];
  nullify?: Element[];
  weak?: Element[];
  flying?: boolean;
  mMovement?: string;
  innate?: string[];
  noInvite?: boolean;
}

const SKILLSETS: Record<string, { name: string; desc: string }> = {
  kwehbo: { name: 'Kwehbo Arts', desc: 'Pecks, warbles and the kwehbo\'s startling knack for calling down stars.' },
  goblin: { name: 'Goblin Tricks', desc: 'Dirty fighting learned in ditches and ruined cellars.' },
  bomb: { name: 'Bomb Arts', desc: 'Fire, sparks — and, at the last, the bomb itself.' },
  panther: { name: 'Panther Arts', desc: 'Claws, venom and the hunter\'s baleful stare.' },
  squid: { name: 'Abyssal Arts', desc: 'Ink, tentacles and the cold intellect of the deep.' },
  skeleton: { name: 'Bone Arts', desc: 'Bony blows and restless spirits called up from the grave.' },
  ghost: { name: 'Phantom Arts', desc: 'The touches of the dead: sleep, grease, hunger and rot.' },
  eye: { name: 'Gaze Arts', desc: 'Looks that terrify, curse, or kill.' },
  bird: { name: 'Talon Arts', desc: 'Talons, quills and a magpie\'s love of shining things.' },
  boar: { name: 'Tusk Arts', desc: 'Charges, grunts and the strange kindness of swine.' },
  treant: { name: 'Grove Arts', desc: 'The patient magic of old wood and green sap.' },
  minotaur: { name: 'Horned Arts', desc: 'Horn, hoof and fury, with fire snorted from the nostrils.' },
  malboro: { name: 'Bloom Arts', desc: 'Vines, slime and a breath that fouls the very air.' },
  behemoth: { name: 'Behemoth Arts', desc: 'The terrible strength and star-fire of the great beasts.' },
  dragon: { name: 'Dragon Arts', desc: 'Claw, tail and the elemental breath of wyrms.' },
  hydra: { name: 'Hydra Arts', desc: 'Many heads, many strikes, and whispers from the void.' },
};

const SECRET_LEVEL = { 1: 20, 2: 22, 3: 25 } as const;

function monster(s: Spec): JobDef {
  const [hpM, hpC, mpM, mpC, spM, spC, paM, paC, maM, maC] = s.stats;
  const ss = SKILLSETS[s.family];
  return {
    id: s.id,
    name: s.name,
    desc: s.desc,
    generic: false,
    skillset: { id: s.family, name: ss.name, desc: ss.desc },
    abilities: [],
    move: s.move,
    jump: s.jump,
    cev: s.cev,
    mult: { hp: hpM, mp: mpM, sp: spM, pa: paM, ma: maM },
    growth: { hp: hpC, mp: mpC, sp: spC, pa: paC, ma: maC },
    equip: [],
    // JobLook is required by the schema; monsters are drawn from `monster` instead.
    look: { headgear: 'none', torso: 'tunic', legs: 'pants', palette: s.palette },
    monster: { shape: s.shape, palette: s.palette, scale: s.scale, variant: s.variant },
    family: s.family,
    poach: s.poach,
    flying: s.flying,
    monsterSkills: [...s.skills.map((a): [string, number] => [a, 1]), [s.secret, SECRET_LEVEL[s.tier]]],
    mReaction: 'counter',
    mMovement: s.mMovement,
    innate: s.innate,
    always: s.always,
    immune: [...new Set<StatusId>(['vampire', ...(s.immune ?? [])])],
    absorb: s.absorb,
    halve: s.halve,
    nullify: s.nullify,
    weak: s.weak,
    noInvite: s.noInvite,
  };
}

const UNDEAD: StatusId[] = ['undead'];

export const monsters: JobDef[] = [
  // ==========================================================================
  //  Kwehbos — swift riding birds of the plains
  // ==========================================================================
  monster({
    id: 'kwehbo', name: 'Kwehbo', family: 'kwehbo', shape: 'chocobo', tier: 1,
    desc: 'The great golden riding bird of Ivaldis, beloved of couriers and knights alike. Gentle when tame, it will still peck an enemy bloody and heal its flock with a warble.',
    palette: { primary: '#f2c94c', secondary: '#e8a33a', accent: '#f5efe0', leather: '#c07a2a' },
    move: 6, jump: 5, cev: 15,
    stats: [115, 9, 60, 26, 92, 63, 90, 30, 110, 9],
    skills: ['beakJab', 'kwehCure'], secret: 'kwehCleanse',
    poach: ['kwehboFeatherLoot', 'hiPotion'],
    mMovement: 'waterWalk',
  }),
  monster({
    id: 'blackKwehbo', name: 'Black Kwehbo', family: 'kwehbo', shape: 'chocobo', tier: 2, scale: 1.05,
    desc: 'A sooty-plumed breed that can take to the air in short, flapping bounds, clearing walls and rivers where its golden kin must go round.',
    palette: { primary: '#2b2b35', secondary: '#4a4a5a', accent: '#d8b64a', leather: '#6a5a3a' },
    move: 6, jump: 5, cev: 25,
    stats: [125, 9, 65, 25, 74, 66, 100, 29, 105, 10],
    skills: ['beakJab', 'kwehBall', 'kwehCleanse'], secret: 'kwehMeteor',
    poach: ['blackKwehboPlumeLoot', 'xPotion'],
    mMovement: 'fly', innate: ['waterWalk'],
  }),
  monster({
    id: 'redKwehbo', name: 'Red Kwehbo', family: 'kwehbo', shape: 'chocobo', tier: 3, scale: 1.1,
    desc: 'A crimson terror of the highlands. Many a green squire has laughed at the sight of a "wild chick" and been flattened by the stars it calls from the sky.',
    palette: { primary: '#c2412e', secondary: '#8a2a1e', accent: '#f0c060', leather: '#5a2a1a' },
    move: 6, jump: 5, cev: 10,
    stats: [135, 8, 70, 24, 109, 75, 105, 28, 125, 8],
    skills: ['beakJab', 'kwehBall', 'kwehMeteor'], secret: 'kwehCure',
    poach: ['redKwehboPlumeLoot', 'barrette'],
    mMovement: 'ignoreHeight', innate: ['waterWalk'],
  }),

  // ==========================================================================
  //  Goblins — spiteful little raiders of woods and ruins
  // ==========================================================================
  monster({
    id: 'goblin', name: 'Goblin', family: 'goblin', shape: 'goblin', tier: 1, scale: 0.85,
    desc: 'A wiry, green-skinned scavenger that haunts the roadside woods. Alone it is a nuisance; in a pack, with its fingers in your eyes, it is something worse.',
    palette: { primary: '#6f8f3a', secondary: '#5a3b24', accent: '#e0d060', leather: '#3a2a1a' },
    move: 3, jump: 3, cev: 18,
    stats: [105, 10, 45, 30, 84, 70, 100, 30, 75, 24],
    skills: ['goblinTackle', 'eyeGouge'], secret: 'gobPunch',
    poach: ['goblinEarLoot', 'hiPotion'],
    weak: ['ice'],
  }),
  monster({
    id: 'hobgoblin', name: 'Hobgoblin', family: 'goblin', shape: 'goblin', tier: 2, scale: 0.92,
    desc: 'A larger, darker cousin of the goblin with a boxer\'s shoulders. It fights with a spinning flurry of fists and grows more dangerous the more it bleeds.',
    palette: { primary: '#3a3f4a', secondary: '#2a1e14', accent: '#e05030', leather: '#1a1410' },
    move: 3, jump: 3, cev: 20,
    stats: [115, 9, 45, 30, 89, 71, 110, 28, 80, 22],
    skills: ['goblinTackle', 'turnPunch'], secret: 'gobPunch',
    poach: ['hobgoblinTuskLoot', 'hiPotion'],
    weak: ['ice'],
  }),
  monster({
    id: 'gobbledygook', name: 'Gobbledygook', family: 'goblin', shape: 'goblin', tier: 3,
    desc: 'The gibbering chieftain of goblin-kind, named for the nonsense it screams in battle. Its frenzied mauling can strip a knight to the bone.',
    palette: { primary: '#a0522d', secondary: '#3d2a50', accent: '#ffd040', leather: '#2a1a14' },
    move: 3, jump: 3, cev: 20,
    stats: [130, 8, 50, 28, 106, 81, 120, 26, 90, 20],
    skills: ['goblinTackle', 'eyeGouge', 'gobPunch'], secret: 'mutilate',
    poach: ['gobbledygookFetishLoot', 'ancientSword'],
    weak: ['ice'],
  }),

  // ==========================================================================
  //  Bombs — living embers that drift over the wastes
  // ==========================================================================
  monster({
    id: 'bomb', name: 'Bomb', family: 'bomb', shape: 'bomb', tier: 1,
    desc: 'A floating ball of living flame with a leering face. Wounded, it swells with rage — and when it bursts, it takes its killers with it.',
    palette: { primary: '#e0782a', secondary: '#ffd060', accent: '#fff4c0' },
    move: 3, jump: 3, cev: 10,
    stats: [100, 10, 80, 20, 84, 83, 80, 34, 105, 11],
    skills: ['bombBite', 'detonate'], secret: 'smallBomb',
    poach: ['bombCinderLoot', 'flameRod'],
    always: ['float'], absorb: ['fire'], halve: ['ice'], weak: ['water'],
  }),
  monster({
    id: 'grenade', name: 'Grenade', family: 'bomb', shape: 'bomb', tier: 2, scale: 1.1,
    desc: 'A bomb grown cold and blue at the heart, its flame burning hotter for being hidden. It spits fire across the field before it thinks of bursting.',
    palette: { primary: '#4a6fb5', secondary: '#9fc8ff', accent: '#ffffff' },
    move: 3, jump: 3, cev: 11,
    stats: [110, 9, 85, 19, 91, 81, 85, 33, 115, 10],
    skills: ['bombBite', 'smallBomb', 'detonate'], secret: 'flameAttack',
    poach: ['grenadeCinderLoot', 'flameWhip'],
    always: ['float'], absorb: ['fire'], halve: ['ice'], weak: ['water'],
  }),
  monster({
    id: 'explosive', name: 'Explosive', family: 'bomb', shape: 'bomb', tier: 3, scale: 1.2,
    desc: 'The largest of the bombs, a crackling furnace the size of a hay-cart. Sparks leap from its hide at anyone who ventures near.',
    palette: { primary: '#b0302a', secondary: '#ffb040', accent: '#fff0a0' },
    move: 3, jump: 3, cev: 12,
    stats: [125, 8, 90, 18, 84, 83, 90, 32, 125, 9],
    skills: ['bombBite', 'detonate', 'bombSpark'], secret: 'smallBomb',
    poach: ['explosiveCoreLoot', 'flameShield'],
    always: ['float'], absorb: ['fire'], halve: ['ice'], weak: ['water'],
  }),

  // ==========================================================================
  //  Panthers — great cats of the plains and cliffs
  // ==========================================================================
  monster({
    id: 'redPanther', name: 'Red Panther', family: 'panther', shape: 'panther', tier: 1,
    desc: 'A rust-coloured hunting cat that bounds up cliffs as though they were stairs. Its claws carry a venom that weakens prey for the long chase.',
    palette: { primary: '#b8483a', secondary: '#6a2a20', accent: '#f0e0a0' },
    move: 4, jump: 4, cev: 23,
    stats: [100, 10, 40, 30, 89, 68, 110, 28, 75, 24],
    skills: ['pantherScratch', 'poisonNail'], secret: 'catKick',
    poach: ['redPantherPeltLoot', 'battleBoots'],
    mMovement: 'ignoreHeight',
  }),
  monster({
    id: 'sabrecat', name: 'Sabrecat', family: 'panther', shape: 'panther', tier: 2, scale: 1.08,
    desc: 'A tawny cat with fangs like daggers. Hunters say its stare alone can stop a man\'s heart, or turn him to stone where he stands.',
    palette: { primary: '#c8a060', secondary: '#6a5030', accent: '#ffffff' },
    move: 4, jump: 4, cev: 26,
    stats: [110, 9, 45, 29, 106, 81, 120, 26, 80, 22],
    skills: ['pantherScratch', 'catKick', 'poisonNail'], secret: 'blaster',
    poach: ['sabrecatFangLoot', 'germainBoots'],
    mMovement: 'ignoreHeight',
  }),
  monster({
    id: 'vampireCat', name: 'Vampire Cat', family: 'panther', shape: 'panther', tier: 3, scale: 1.12,
    desc: 'A dusky, red-eyed panther that drinks the blood of its kills. Those it bites and leaves alive are said to hunger ever after.',
    palette: { primary: '#4a2a5a', secondary: '#1a1020', accent: '#e03040' },
    move: 4, jump: 4, cev: 29,
    stats: [120, 8, 50, 28, 104, 69, 125, 25, 90, 20],
    skills: ['pantherScratch', 'catKick', 'blaster'], secret: 'bloodDrain',
    poach: ['vampireCatPeltLoot', 'conjurerBag'],
    mMovement: 'ignoreHeight',
  }),

  // ==========================================================================
  //  Squid — tentacled things from mere and marsh
  // ==========================================================================
  monster({
    id: 'octopod', name: 'Octopod', family: 'squid', shape: 'squid', tier: 1,
    desc: 'A squat, many-armed creature of the marshes that walks the lake-bed as easily as the shore, spraying ink at anything that disturbs it.',
    palette: { primary: '#5a8aa8', secondary: '#c0d8e0', accent: '#ffcc40' },
    move: 3, jump: 3, cev: 8,
    stats: [110, 9, 70, 22, 91, 81, 95, 30, 95, 16],
    skills: ['squidTentacle'], secret: 'blackInk',
    poach: ['octopodInkLoot', 'hiPotion'],
    mMovement: 'moveInWater', absorb: ['water'], weak: ['lightning'],
  }),
  monster({
    id: 'krakenling', name: 'Krakenling', family: 'squid', shape: 'squid', tier: 2, scale: 1.08,
    desc: 'A young kraken, violet and cunning. Its warbling cry unravels blessings, and its mind can reach into a man\'s own and twist it.',
    palette: { primary: '#8a5aa8', secondary: '#e0c0e8', accent: '#40ff90' },
    move: 3, jump: 3, cev: 9,
    stats: [120, 9, 80, 21, 84, 83, 100, 29, 105, 14],
    skills: ['squidTentacle', 'blackInk', 'dissonance'], secret: 'mindBlast',
    poach: ['krakenlingBeakLoot', 'sleepSword'],
    mMovement: 'moveInWater', absorb: ['water'], weak: ['lightning'],
  }),
  monster({
    id: 'brainleech', name: 'Brainleech', family: 'squid', shape: 'squid', tier: 3, scale: 1.15,
    desc: 'A pallid horror of the deep places whose feeding tendrils drink memory itself. Veterans it touches forget the lessons of a lifetime.',
    palette: { primary: '#6a3a5a', secondary: '#d09ab0', accent: '#ff4060' },
    move: 3, jump: 3, cev: 10,
    stats: [130, 8, 90, 20, 91, 81, 105, 28, 115, 12],
    skills: ['squidTentacle', 'blackInk', 'mindBlast'], secret: 'levelBlast',
    poach: ['brainleechTendrilLoot', 'vampireMantle'],
    mMovement: 'moveInWater', absorb: ['water'], weak: ['lightning'],
  }),

  // ==========================================================================
  //  Skeletons — the restless bones of old battlefields
  // ==========================================================================
  monster({
    id: 'skeleton', name: 'Skeleton', family: 'skeleton', shape: 'skeleton', tier: 1,
    desc: 'The bones of a soldier who fell in the Fifty Winters\' War and would not lie down. It calls lesser spirits of storm and flood to fight beside it.',
    palette: { primary: '#e8e0c8', secondary: '#8a8070', accent: '#ff4020', metal: '#7a7a70' },
    move: 3, jump: 4, cev: 11,
    stats: [95, 10, 60, 24, 100, 83, 100, 30, 105, 11],
    skills: ['knifeHand', 'thunderSoul'], secret: 'aquaSoul',
    poach: ['skeletonBoneLoot', 'ether'],
    always: UNDEAD, absorb: ['dark'], weak: ['holy', 'fire'],
  }),
  monster({
    id: 'bonesnatch', name: 'Bonesnatch', family: 'skeleton', shape: 'skeleton', tier: 2, scale: 1.05,
    desc: 'A skeleton that has gathered to itself the bones of many dead, grown tall and crooked with borrowed limbs.',
    palette: { primary: '#c8b890', secondary: '#5a5040', accent: '#40c0ff', metal: '#6a6a60' },
    move: 3, jump: 4, cev: 13,
    stats: [105, 9, 65, 23, 84, 70, 110, 29, 110, 10],
    skills: ['knifeHand', 'aquaSoul'], secret: 'iceSoul',
    poach: ['bonesnatchSkullLoot', 'partisan'],
    always: UNDEAD, absorb: ['dark'], weak: ['holy', 'fire'],
  }),
  monster({
    id: 'livingBone', name: 'Living Bone', family: 'skeleton', shape: 'skeleton', tier: 3, scale: 1.1,
    desc: 'A frost-blue skeleton of terrible age, in whose empty ribs a violet light still beats like a heart.',
    palette: { primary: '#b0b8c8', secondary: '#3a4050', accent: '#a040ff', metal: '#5a6070' },
    move: 3, jump: 4, cev: 13,
    stats: [120, 8, 70, 22, 84, 82, 120, 27, 115, 9],
    skills: ['knifeHand', 'iceSoul'], secret: 'windSoul',
    poach: ['livingBoneMarrowLoot', 'elvenMantle'],
    always: UNDEAD, absorb: ['dark'], weak: ['holy', 'fire'],
  }),

  // ==========================================================================
  //  Ghosts — shades that drift between the living and the grave
  // ==========================================================================
  monster({
    id: 'ghoul', name: 'Ghoul', family: 'ghost', shape: 'ghost', tier: 1,
    desc: 'A grey-green shade that flickers from place to place without crossing the space between. Its touch brings a sleep from which some never wake.',
    palette: { primary: '#9aa89a', secondary: '#4a5a4a', accent: '#e0ff80' },
    move: 4, jump: 4, cev: 26,
    stats: [95, 11, 70, 22, 84, 74, 105, 30, 95, 16],
    skills: ['throwSpirit', 'sleepTouch'], secret: 'greaseTouch',
    poach: ['ghoulShroudLoot', 'ninjaKnife'],
    always: ['undead', 'float'], absorb: ['dark'], weak: ['fire', 'holy'],
    mMovement: 'teleport',
  }),
  monster({
    id: 'gust', name: 'Gust', family: 'ghost', shape: 'ghost', tier: 2, scale: 1.05,
    desc: 'A cold draught that has taken shape and malice. Candles gutter where it passes, and the living feel their warmth drawn out of them.',
    palette: { primary: '#8aa0c8', secondary: '#3a4a6a', accent: '#c0e0ff' },
    move: 4, jump: 4, cev: 27,
    stats: [105, 10, 75, 21, 91, 81, 110, 29, 100, 15],
    skills: ['throwSpirit', 'greaseTouch'], secret: 'drainTouch',
    poach: ['gustWispLoot', 'mainGauche'],
    always: ['undead', 'float'], absorb: ['dark'], weak: ['fire', 'holy'],
    mMovement: 'teleport',
  }),
  monster({
    id: 'revenant', name: 'Revenant', family: 'ghost', shape: 'ghost', tier: 3, scale: 1.12,
    desc: 'The vengeful dead, still wrapped in the chains of its execution. Whomever it touches, it would make as it is.',
    palette: { primary: '#6a4a7a', secondary: '#2a1a3a', accent: '#ff5a5a' },
    move: 5, jump: 4, cev: 28,
    stats: [120, 9, 80, 20, 100, 83, 115, 28, 110, 14],
    skills: ['throwSpirit', 'drainTouch'], secret: 'zombieTouch',
    poach: ['revenantChainLoot', 'mythrilGun'],
    always: ['undead', 'float'], absorb: ['dark'], weak: ['fire', 'holy'],
    mMovement: 'teleport',
  }),

  // ==========================================================================
  //  Eyes — winged, staring things of ill omen
  // ==========================================================================
  monster({
    id: 'floateye', name: 'Floateye', family: 'eye', shape: 'eye', tier: 1,
    desc: 'A great bloodshot eye borne aloft on bat-wings. Its unblinking stare saps the courage of all it fixes upon.',
    palette: { primary: '#c05a8a', secondary: '#f0e0c0', accent: '#40a0ff' },
    move: 5, jump: 5, cev: 12,
    stats: [95, 10, 70, 22, 84, 74, 90, 32, 105, 15],
    skills: ['wingAttack'], secret: 'lookOfFright',
    poach: ['floateyeLensLoot', 'platinumDagger'],
    flying: true, halve: ['wind'], weak: ['ice'],
  }),
  monster({
    id: 'ahriman', name: 'Ahriman', family: 'eye', shape: 'eye', tier: 2, scale: 1.1,
    desc: 'A dark-winged eye named for an old devil of the east. It curses with a glance, and its gaze can mark a man for death.',
    palette: { primary: '#4a3a8a', secondary: '#f0e8d0', accent: '#ffcc00' },
    move: 5, jump: 5, cev: 13,
    stats: [110, 9, 80, 21, 74, 66, 95, 31, 115, 14],
    skills: ['wingAttack', 'lookOfDevil', 'lookOfFright'], secret: 'graveChill',
    poach: ['ahrimanWingLoot', 'airKnife'],
    flying: true, halve: ['wind'], weak: ['ice'],
  }),
  monster({
    id: 'plague', name: 'Plague', family: 'eye', shape: 'eye', tier: 3, scale: 1.2,
    desc: 'A sickly, pestilent eye that drifts ahead of epidemics. Where it looks, men wither; where it lingers, they die.',
    palette: { primary: '#5a7a3a', secondary: '#e8e0b0', accent: '#ff3030' },
    move: 5, jump: 5, cev: 14,
    stats: [125, 8, 90, 20, 84, 70, 100, 30, 125, 13],
    skills: ['wingAttack', 'lookOfDevil', 'graveChill'], secret: 'eyeCircle',
    poach: ['plagueEyeLoot', 'slumberKris'],
    flying: true, halve: ['wind'], weak: ['ice'],
  }),

  // ==========================================================================
  //  Birds — raptors of the high crags
  // ==========================================================================
  monster({
    id: 'stormhawk', name: 'Stormhawk', family: 'bird', shape: 'bird', tier: 1,
    desc: 'A great brown hawk of the mountain passes that rides the storm-winds and looses a volley of razor quills upon its prey.',
    palette: { primary: '#a86a3a', secondary: '#f0d8a0', accent: '#ffd040' },
    move: 6, jump: 6, cev: 30,
    stats: [100, 10, 60, 24, 89, 71, 100, 30, 100, 11],
    skills: ['talonRake'], secret: 'featherBomb',
    poach: ['stormhawkFeatherLoot', 'rubberBoots'],
    flying: true, halve: ['wind'], weak: ['earth'],
  }),
  monster({
    id: 'steelHawk', name: 'Steel Hawk', family: 'bird', shape: 'bird', tier: 2, scale: 1.08,
    desc: 'A grey hawk whose feathers ring like mail. Like a magpie it cannot abide a glint of coin in another\'s purse.',
    palette: { primary: '#8a98a8', secondary: '#d0d8e0', accent: '#ffcc30', metal: '#b8c0c8' },
    move: 6, jump: 6, cev: 28,
    stats: [115, 9, 60, 24, 104, 69, 110, 28, 100, 11],
    skills: ['talonRake', 'shineLover'], secret: 'stoneBeak',
    poach: ['steelHawkTalonLoot', 'huntingBow'],
    flying: true, halve: ['wind'], weak: ['earth'],
  }),
  monster({
    id: 'cockatrice', name: 'Cockatrice', family: 'bird', shape: 'bird', tier: 3, scale: 1.15,
    desc: 'A white, red-combed monster of cock and serpent. Its beak carries the basilisk\'s curse, and the fields where it nests are full of stone men.',
    palette: { primary: '#e8e0d0', secondary: '#c84030', accent: '#ffcc40' },
    move: 6, jump: 6, cev: 33,
    stats: [125, 8, 70, 23, 109, 75, 115, 27, 110, 10],
    skills: ['talonRake', 'stoneBeak', 'featherBomb'], secret: 'cripplingPeck',
    poach: ['cockatriceCombLoot', 'featherMantle'],
    flying: true, halve: ['wind'], weak: ['earth'],
  }),

  // ==========================================================================
  //  Boars — the swine of the deep woods
  // ==========================================================================
  monster({
    id: 'boarlet', name: 'Boarlet', family: 'boar', shape: 'boar', tier: 1, scale: 0.8,
    desc: 'A striped piglet, quick and hard to hit. Foresters say its snuffling can rouse the fallen, and they are not wholly jesting.',
    palette: { primary: '#a07850', secondary: '#6a4a2a', accent: '#f0e0c0' },
    move: 3, jump: 3, cev: 42,
    stats: [105, 10, 40, 30, 117, 86, 95, 31, 75, 24],
    skills: ['straightDash'], secret: 'oink',
    poach: ['boarletBristleLoot', 'cachouBand'],
  }),
  monster({
    id: 'porky', name: 'Porky', family: 'boar', shape: 'boar', tier: 2,
    desc: 'A round, pink hog of such placid good humour that those who stand near it find themselves dozing, or following it about like lovesick fools.',
    palette: { primary: '#e8a8a0', secondary: '#b07068', accent: '#ffffff' },
    move: 3, jump: 3, cev: 36,
    stats: [125, 9, 45, 30, 109, 75, 105, 29, 85, 22],
    skills: ['straightDash', 'grunt'], secret: 'snoutHook',
    poach: ['chansonPerfume', 'nagarok'],
  }),
  monster({
    id: 'wildboar', name: 'Wild Boar', family: 'boar', shape: 'boar', tier: 3, scale: 1.15,
    desc: 'A great, black-bristled tusker, the terror of the hunt. Its kin will give of their own strength to keep it fighting.',
    palette: { primary: '#5a4a3a', secondary: '#3a2a1a', accent: '#f0f0e0' },
    move: 3, jump: 3, cev: 39,
    stats: [145, 8, 50, 28, 109, 75, 115, 27, 95, 20],
    skills: ['straightDash', 'snoutHook'], secret: 'offering',
    poach: ['ribbon', 'battleSatchel'],
  }),

  // ==========================================================================
  //  Treants — trees that woke
  // ==========================================================================
  monster({
    id: 'woodman', name: 'Woodman', family: 'treant', shape: 'treant', tier: 1, scale: 1.1,
    desc: 'A young tree that pulled up its roots and walked. It whirls its leaves like knives and hardens its bark against blows.',
    palette: { primary: '#7a5a3a', secondary: '#4a7a3a', accent: '#c0e070' },
    move: 3, jump: 3, cev: 0,
    stats: [140, 8, 60, 22, 74, 66, 90, 34, 105, 12],
    skills: ['leafDance'], secret: 'protectSpirit',
    poach: ['woodmanBarkLoot', 'healingStaff'],
    absorb: ['earth'], weak: ['fire'],
  }),
  monster({
    id: 'treant', name: 'Treant', family: 'treant', shape: 'treant', tier: 2, scale: 1.25,
    desc: 'An old oak of the deep forest with a face in its bark. It tends the grove as a shepherd tends a flock, and heals what the axe has hurt.',
    palette: { primary: '#5a4a3a', secondary: '#2a6a3a', accent: '#80ff80' },
    move: 3, jump: 3, cev: 0,
    stats: [155, 7, 70, 21, 76, 82, 95, 33, 115, 10],
    skills: ['leafDance', 'spiritOfLife'], secret: 'calmSpirit',
    poach: ['treantHeartwoodLoot', 'fairyHarp'],
    absorb: ['earth'], weak: ['fire'],
  }),
  monster({
    id: 'elderTree', name: 'Elder Tree', family: 'treant', shape: 'treant', tier: 3, scale: 1.4,
    desc: 'A pale, vast tree older than the kingdom, whose roots are said to drink from the wells of the Lost Age. It wards its grove with bark and hush and quiet strength.',
    palette: { primary: '#8a8a7a', secondary: '#6a9a4a', accent: '#ffe080' },
    move: 3, jump: 3, cev: 0,
    stats: [170, 6, 80, 20, 76, 82, 100, 32, 125, 9],
    skills: ['leafDance', 'protectSpirit', 'calmSpirit'], secret: 'magicSpirit',
    poach: ['elderTreeSapLoot', 'defender'],
    absorb: ['earth'], weak: ['fire'],
  }),

  // ==========================================================================
  //  Minotaurs — bull-headed brutes
  // ==========================================================================
  monster({
    id: 'bullDemon', name: 'Bull Demon', family: 'minotaur', shape: 'minotaur', tier: 1, scale: 1.1,
    desc: 'A hulking bull-man that works itself into a stamping fury before it charges. Its horns have gored many an unwary sentry.',
    palette: { primary: '#6a3a2a', secondary: '#3a2a20', accent: '#e0d0b0', metal: '#8a8a8a' },
    move: 3, jump: 3, cev: 11,
    stats: [140, 8, 40, 30, 84, 70, 125, 25, 90, 18],
    skills: ['gore'], secret: 'gatherPower',
    poach: ['bullDemonHornLoot', 'giantAxe'],
    weak: ['water'],
  }),
  monster({
    id: 'minotaur', name: 'Minotaur', family: 'minotaur', shape: 'minotaur', tier: 2, scale: 1.2,
    desc: 'The bull-headed giant of the old labyrinths, swinging its arms like a flail. Some snort fire from their nostrils.',
    palette: { primary: '#8a5a3a', secondary: '#4a3020', accent: '#f0f0e0', metal: '#9a9a9a' },
    move: 3, jump: 3, cev: 15,
    stats: [155, 7, 45, 29, 84, 70, 135, 24, 95, 17],
    skills: ['gore', 'wildSwing'], secret: 'blowFire',
    poach: ['minotaurHideLoot', 'slasher'],
    weak: ['water'],
  }),
  monster({
    id: 'sacredBull', name: 'Sacred Bull', family: 'minotaur', shape: 'minotaur', tier: 3, scale: 1.3,
    desc: 'A white bull-man with gilded horns, worshipped as a god by the hill-tribes before the Church came. When it stamps, the earth itself answers.',
    palette: { primary: '#e0d8c8', secondary: '#c0a060', accent: '#ffd700', metal: '#d4b050' },
    move: 3, jump: 3, cev: 12,
    stats: [170, 6, 55, 27, 100, 73, 140, 23, 105, 16],
    skills: ['gore', 'earthshaker', 'gatherPower'], secret: 'blowFire',
    poach: ['ivoryPole', 'holyLance'],
    weak: ['water'],
  }),

  // ==========================================================================
  //  Mawblooms — carnivorous plants of the fens
  // ==========================================================================
  monster({
    id: 'mawbloom', name: 'Mawbloom', family: 'malboro', shape: 'malboro', tier: 1, scale: 1.05,
    desc: 'A squat, tentacled plant of the fens, all mouth and teeth. Its breath is so foul that brave men have been struck mad by it.',
    palette: { primary: '#5a8a3a', secondary: '#a04a6a', accent: '#e0e060' },
    move: 3, jump: 3, cev: 0,
    stats: [140, 8, 60, 24, 74, 66, 100, 31, 95, 16],
    skills: ['mawTentacle', 'mawLick'], secret: 'foulBreath',
    poach: ['mawbloomSeedLoot', 'iceShield'],
    mMovement: 'moveInWater', weak: ['ice'],
  }),
  monster({
    id: 'gnashbloom', name: 'Gnashbloom', family: 'malboro', shape: 'malboro', tier: 2, scale: 1.15,
    desc: 'A yellow-green bloom with a ring of grinding teeth, whose sap binds its prey fast to the ground while it feeds.',
    palette: { primary: '#8a9a3a', secondary: '#6a4a2a', accent: '#ff8040' },
    move: 3, jump: 3, cev: 0,
    stats: [155, 7, 65, 23, 76, 82, 105, 30, 100, 15],
    skills: ['mawTentacle', 'mawGoo'], secret: 'mawLick',
    poach: ['gnashbloomTendrilLoot', 'chameleonRobe'],
    mMovement: 'moveInWater', weak: ['ice'],
  }),
  monster({
    id: 'greatMawbloom', name: 'Great Mawbloom', family: 'malboro', shape: 'malboro', tier: 3, scale: 1.3,
    desc: 'A mawbloom grown monstrous over centuries in the black water. Its spores take root in living flesh, and what they grow into does not bear telling.',
    palette: { primary: '#3a5a2a', secondary: '#6a2a4a', accent: '#c0ff40' },
    move: 3, jump: 3, cev: 0,
    stats: [175, 6, 75, 22, 76, 82, 110, 29, 110, 14],
    skills: ['mawTentacle', 'foulBreath'], secret: 'sporeBlight',
    poach: ['elixir', 'omnilexicon'],
    mMovement: 'moveInWater', weak: ['ice'],
  }),

  // ==========================================================================
  //  Behemoths — the great horned beasts of legend
  // ==========================================================================
  monster({
    id: 'behemoth', name: 'Behemoth', family: 'behemoth', shape: 'behemoth', tier: 1, scale: 1.3,
    desc: 'A purple-maned beast the size of a siege tower, with horns like a ram\'s. Scholars whisper that it can gather the fire of a sun between them.',
    palette: { primary: '#6a4a8a', secondary: '#3a2a4a', accent: '#e0d0b0' },
    move: 4, jump: 3, cev: 13,
    stats: [165, 6, 50, 28, 89, 68, 140, 23, 100, 16],
    skills: ['hornThrust', 'dreadRoar'], secret: 'gigaflare',
    poach: ['behemothHornLoot', 'pilgrimBag'],
  }),
  monster({
    id: 'kingBehemoth', name: 'King Behemoth', family: 'behemoth', shape: 'behemoth', tier: 2, scale: 1.4,
    desc: 'The crimson lord of the behemoths. Its roar is a storm, and armies have broken and fled at the mere sound of it.',
    palette: { primary: '#8a2a3a', secondary: '#4a1a20', accent: '#ffd700' },
    move: 4, jump: 3, cev: 13,
    stats: [180, 5, 55, 27, 100, 73, 150, 22, 105, 15],
    skills: ['hornThrust', 'dreadRoar'], secret: 'hurricane',
    poach: ['zephyrPerfume', 'artemisBow'],
  }),
  monster({
    id: 'darkBehemoth', name: 'Dark Behemoth', family: 'behemoth', shape: 'behemoth', tier: 3, scale: 1.45,
    desc: 'A behemoth black as the void between stars. The more it is wounded, the brighter burns the star-wrath it calls down upon its tormentors.',
    palette: { primary: '#2a2a3a', secondary: '#101018', accent: '#ff3030' },
    move: 4, jump: 3, cev: 18,
    stats: [195, 5, 60, 26, 100, 73, 155, 21, 115, 14],
    skills: ['hornThrust', 'dreadRoar'], secret: 'starflare',
    poach: ['darkBehemothManeLoot', 'petrifyGun'],
  }),

  // ==========================================================================
  //  Dragons — the wyrms of mountain and sea
  // ==========================================================================
  monster({
    id: 'dragon', name: 'Dragon', family: 'dragon', shape: 'dragon', tier: 1, scale: 1.35,
    desc: 'A green wyrm of the high plateaus, wingless and heavy as a landslide. Its tail can sweep a file of pikemen from their feet.',
    palette: { primary: '#4a8a4a', secondary: '#c8b870', accent: '#f0e0a0' },
    move: 5, jump: 3, cev: 5,
    stats: [165, 6, 55, 26, 89, 68, 135, 24, 110, 14],
    skills: ['dragonDash'], secret: 'tailSwing',
    poach: ['dragonScaleLoot', 'harehideBag'],
  }),
  monster({
    id: 'blueDragon', name: 'Blue Dragon', family: 'dragon', shape: 'dragon', tier: 2, scale: 1.4,
    desc: 'A sea-blue wyrm of the northern coasts whose breath freezes the surf to glass, and in storms, calls down the lightning.',
    palette: { primary: '#3a6ab8', secondary: '#a0c8f0', accent: '#e0f0ff' },
    move: 5, jump: 3, cev: 9,
    stats: [180, 6, 60, 25, 100, 73, 140, 23, 115, 13],
    skills: ['dragonDash', 'iceBreath'], secret: 'thunderBreath',
    poach: ['blueDragonScaleLoot', 'dragonRod'],
    absorb: ['ice'], weak: ['fire'],
  }),
  monster({
    id: 'redDragon', name: 'Red Dragon', family: 'dragon', shape: 'dragon', tier: 3, scale: 1.45,
    desc: 'The fire-wyrm of the volcanic south, scaled like cooling lava. Knights who seek its hoard are seldom seen again, save as ash upon the wind.',
    palette: { primary: '#b8302a', secondary: '#e0a060', accent: '#ffd040' },
    move: 5, jump: 3, cev: 8,
    stats: [190, 5, 65, 24, 104, 69, 145, 22, 125, 12],
    skills: ['dragonDash', 'fireBreath'], secret: 'thunderBreath',
    poach: ['saltRosePerfume', 'dragonWhisker'],
    absorb: ['fire'], weak: ['ice'],
  }),

  // ==========================================================================
  //  Hydras — many-headed serpents of the deep places
  // ==========================================================================
  monster({
    id: 'hydra', name: 'Hydra', family: 'hydra', shape: 'hydra', tier: 1, scale: 1.3, variant: 2,
    desc: 'A two-headed serpent-drake of the ruins. Both heads bite as one, and a sweep of their breath can flay all who stand near.',
    palette: { primary: '#6a8a5a', secondary: '#c0b080', accent: '#e0e060' },
    move: 4, jump: 4, cev: 0,
    stats: [170, 6, 55, 26, 100, 73, 130, 25, 100, 16],
    skills: ['tripleAttack'], secret: 'tripleBreath',
    poach: ['bloodSword', 'scorpionTail'],
    mMovement: 'fly', weak: ['ice', 'wind'],
  }),
  monster({
    id: 'greaterHydra', name: 'Greater Hydra', family: 'hydra', shape: 'hydra', tier: 2, scale: 1.38, variant: 3,
    desc: 'A three-headed hydra whose heads breathe fire and lightning in turn, raining ruin at random across the field.',
    palette: { primary: '#4a6a8a', secondary: '#b0c0a0', accent: '#80e0ff' },
    move: 4, jump: 4, cev: 0,
    stats: [185, 5, 60, 25, 104, 69, 140, 24, 105, 15],
    skills: ['tripleAttack', 'tripleFlame'], secret: 'tripleThunder',
    poach: ['sanguinePerfume', 'rubberSuit'],
    mMovement: 'fly', weak: ['ice', 'wind'],
  }),
  monster({
    id: 'tiamat', name: 'Tiamat', family: 'hydra', shape: 'hydra', tier: 3, scale: 1.45, variant: 3,
    desc: 'The mother of serpents, named for the dragon of chaos in the oldest songs. Its three heads speak fire, storm and, in the dark, whispers that end lives.',
    palette: { primary: '#6a2a5a', secondary: '#d0a050', accent: '#ffcc00' },
    move: 4, jump: 4, cev: 0,
    stats: [200, 5, 70, 24, 109, 75, 150, 22, 115, 14],
    skills: ['tripleBreath', 'tripleThunder', 'tripleFlame'], secret: 'darkWhisper',
    poach: ['wyrmsilk', 'whaleWhisker'],
    mMovement: 'fly', weak: ['ice', 'wind'],
  }),
];
