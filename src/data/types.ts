// ============================================================================
//  Final Fealty Tactics — core content schemas.
//  Every piece of game content (jobs, abilities, items, maps, battles, story
//  scenes, world map, shops, errands) is plain typed data conforming to these
//  interfaces. Engine code lives in src/battle, src/game, src/gfx, src/ui.
// ============================================================================

export type Element = 'fire' | 'ice' | 'lightning' | 'water' | 'earth' | 'wind' | 'holy' | 'dark';
export type Gender = 'm' | 'f' | 'monster';
export type Zodiac =
  | 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo'
  | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces'
  | 'serpentarius';
export type Facing = 'N' | 'E' | 'S' | 'W';   // N = -z (row 0 side), S = +z, E = +x, W = -x

export type WeaponType =
  | 'fist' | 'knife' | 'ninjaBlade' | 'sword' | 'knightSword' | 'katana' | 'axe'
  | 'rod' | 'staff' | 'flail' | 'gun' | 'magicGun' | 'crossbow' | 'bow'
  | 'instrument' | 'book' | 'spear' | 'pole' | 'bag' | 'cloth';
export type ArmorType =
  | 'shield' | 'helmet' | 'hat' | 'ribbon' | 'armor' | 'clothes' | 'robe'
  | 'mantle' | 'armlet' | 'ring' | 'shoes' | 'perfume';
export type EquipCategory = WeaponType | ArmorType;
export type EquipSlot = 'rhand' | 'lhand' | 'head' | 'body' | 'accessory';

export type StatusId =
  | 'ko' | 'crystal' | 'treasure' | 'undead' | 'petrify' | 'confuse' | 'blind'
  | 'silence' | 'oil' | 'frog' | 'chicken' | 'poison' | 'regen' | 'protect'
  | 'shell' | 'haste' | 'slow' | 'stop' | 'sleep' | 'immobilize' | 'disable'
  | 'reflect' | 'float' | 'invisible' | 'berserk' | 'charm' | 'faith'
  | 'atheist' | 'doom' | 'reraise' | 'critical' | 'defending' | 'charging'
  | 'performing' | 'jumping' | 'vampire' | 'wall';

export type StatKey = 'hp' | 'mp' | 'speed' | 'pa' | 'ma' | 'move' | 'jump' | 'brave' | 'faith';

// ---------------------------------------------------------------------------
//  Visual specs (used by the procedural model builder in src/gfx/models)
// ---------------------------------------------------------------------------
export type HeadgearStyle =
  | 'none' | 'hood' | 'wizardHat' | 'helm' | 'fullHelm' | 'bandana' | 'featherCap'
  | 'circlet' | 'turban' | 'ninjaHood' | 'kabuto' | 'dragoonHelm' | 'jesterCap'
  | 'crown' | 'tiara' | 'veil' | 'beret' | 'mitre' | 'headband' | 'goggles'
  | 'hornHelm' | 'wingedHelm' | 'cowl' | 'tricorn' | 'straw';
export type TorsoStyle =
  | 'tunic' | 'robe' | 'armor' | 'plate' | 'gi' | 'vest' | 'coat' | 'dress'
  | 'leotard' | 'kimono' | 'jerkin' | 'apron' | 'cassock' | 'gown' | 'mail';
export type LegStyle = 'pants' | 'skirt' | 'robe' | 'armored' | 'hakama' | 'shorts' | 'tights' | 'gown';
export type HairStyle =
  | 'short' | 'spiky' | 'long' | 'ponytail' | 'braid' | 'bald' | 'bob' | 'wild'
  | 'bun' | 'twintails' | 'slick' | 'curly' | 'mohawk' | 'topknot' | 'shaggy' | 'crest';
export type CapeStyle = 'none' | 'short' | 'long' | 'scarf' | 'mantle' | 'tabard';

export interface Palette {
  primary: string;     // main garment colour
  secondary: string;   // second garment colour (pants / undershirt)
  accent: string;      // trim / emblem
  metal?: string;      // armour plates, helmet
  leather?: string;    // belts, boots, gloves
}

export interface JobLook {
  headgear: HeadgearStyle;
  torso: TorsoStyle;
  legs: LegStyle;
  cape?: CapeStyle;
  shoulders?: 'none' | 'pads' | 'pauldrons' | 'fur' | 'spikes';
  palette: Palette;
  /** faces hidden in shadow with glowing eyes (the classic black-mage look) */
  shadowFace?: boolean;
  /** extra accessories drawn on the model */
  extras?: Array<'belt' | 'satchel' | 'quiver' | 'scarf' | 'sash' | 'bells' | 'book' | 'feather' | 'gloves' | 'bracers' | 'mask' | 'wings' | 'tail' | 'halo'>;
  /** body proportions tweak */
  bulk?: number;       // 0.85 .. 1.25
}

export interface CharLook {
  skin?: string;
  hair?: string;
  hairStyle?: HairStyle;
  eyes?: string;
  beard?: 'none' | 'stubble' | 'full' | 'goatee' | 'mustache';
  height?: number;     // 0.8 (child) .. 1.15 (tall)
  bulk?: number;
  /** override bits of the job look (for named characters with unique outfits) */
  outfit?: Partial<JobLook>;
}

export type MonsterShape =
  | 'chocobo' | 'goblin' | 'bomb' | 'panther' | 'boar' | 'skeleton' | 'ghost'
  | 'eye' | 'treant' | 'minotaur' | 'malboro' | 'behemoth' | 'dragon' | 'hydra'
  | 'bird' | 'squid' | 'bull' | 'wolf' | 'golem' | 'demon' | 'automaton' | 'tome'
  | 'serpent' | 'seraph';

export interface MonsterLook {
  shape: MonsterShape;
  palette: Palette;
  scale?: number;
  /** shape-specific knobs e.g. heads for hydra, horns etc */
  variant?: number;
}

// ---------------------------------------------------------------------------
//  Jobs
// ---------------------------------------------------------------------------
export interface StatMultipliers { hp: number; mp: number; sp: number; pa: number; ma: number; }

export interface JobDef {
  id: string;
  name: string;
  desc: string;
  /** available to generic recruits through the job tree */
  generic: boolean;
  gender?: 'm' | 'f';
  /** job-tree unlock requirements (job levels) */
  requires?: Array<{ job: string; level: number }>;
  /** primary action skillset */
  skillset: { id: string; name: string; desc: string };
  /** every ability learnable in this job: action (skillset), reaction, support, movement ids */
  abilities: string[];
  /** always-on abilities for this job, e.g. ninja dual-wield, monster innate */
  innate?: string[];
  move: number;
  jump: number;
  cev: number;              // class evasion %
  mult: StatMultipliers;    // % multipliers applied to raw stats
  growth: StatMultipliers;  // growth constants (lower = faster growth)
  equip: EquipCategory[];
  look: JobLook;
  /** statuses always active / immunities / elemental affinities (mostly monsters + special jobs) */
  always?: StatusId[];
  immune?: StatusId[];
  absorb?: Element[];
  halve?: Element[];
  nullify?: Element[];
  weak?: Element[];
  /** special job only for a named character */
  unique?: string;
  // ---- monsters (a monster "job" is its species) ----
  monster?: MonsterLook;
  family?: string;
  /** [common, rare] fur-shop loot when poached */
  poach?: [string, string];
  flying?: boolean;
  /** monsters: base level-1 stats instead of raw human stats */
  base?: { hp: number; mp: number; speed: number; pa: number; ma: number };
  /** abilities monster knows at which level [abilityId, level] */
  monsterSkills?: Array<[string, number]>;
  /** innate reaction/support/movement for monsters */
  mReaction?: string;
  mSupport?: string;
  mMovement?: string;
  /** zodiac enemy? egg-laying */
  noEgg?: boolean;
  /** can be recruited by Invite */
  noInvite?: boolean;
}

// ---------------------------------------------------------------------------
//  Abilities
// ---------------------------------------------------------------------------
export type AbilityKind = 'action' | 'reaction' | 'support' | 'movement';
export type TargetFilter = 'enemy' | 'ally' | 'any' | 'self' | 'tile' | 'ko' | 'item';
export type AoeShape = 'diamond' | 'line' | 'self' | 'all' | 'allAllies' | 'allEnemies' | 'cross' | 'ring';

export type AnimKind =
  | 'swing' | 'thrust' | 'shoot' | 'bow' | 'gun' | 'cast' | 'pray' | 'punch' | 'kick'
  | 'throw' | 'item' | 'jump' | 'dance' | 'sing' | 'talk' | 'steal' | 'charge'
  | 'draw' | 'summon' | 'roar' | 'breath' | 'bite' | 'claw' | 'spin' | 'guard' | 'none';

/**
 * Visual effect recipes implemented by src/gfx/vfx. Combine with AbilityDef.color.
 * Keep to this list — the compiler will reject unknown ids.
 */
export type VfxId =
  // weapons & physical
  | 'slash' | 'impact' | 'pierce' | 'arrow' | 'bullet' | 'stone' | 'shuriken' | 'punch' | 'jumpImpact' | 'sword'
  // elements
  | 'flames' | 'inferno' | 'ice' | 'glacier' | 'bolt' | 'thunder' | 'water' | 'quake' | 'wind' | 'holy'
  | 'dark' | 'poison' | 'meteor' | 'flare' | 'ultima' | 'explosion' | 'breath' | 'beam' | 'lava' | 'sand'
  | 'ivy' | 'blizzard'
  // support & status
  | 'heal' | 'healBig' | 'revive' | 'buff' | 'debuff' | 'status' | 'time' | 'gravity' | 'teleport' | 'drain'
  | 'steal' | 'song' | 'dance' | 'talk' | 'summon' | 'glyph' | 'potion' | 'phoenix' | 'elixir' | 'guard'
  | 'sparkleGreen' | 'buffRed' | 'buffBlue' | 'none';

/** Context passed to formula functions. */
export interface FormulaCtx {
  /** caster */
  c: import('../battle/unit').BattleUnit;
  /** target */
  t: import('../battle/unit').BattleUnit;
  /** weapon power of caster's weapon (or the thrown/drawn item) */
  wp: number;
  /** zodiac compatibility multiplier (already includes 1.0 = neutral) */
  zodiac: number;
  /** random helper */
  rng: import('../core/rng').Rng;
  battle: import('../battle/battle').Battle;
  /** height difference caster - target (in h units) */
  dh: number;
}

export interface StatusChance { status: StatusId; chance?: number; /** if true, removes instead */ remove?: boolean }

/**
 * Declarative effect of an action ability. The engine applies them in order.
 * Most abilities need only one effect.
 */
export type EffectSpec =
  | { type: 'damage'; formula: (x: FormulaCtx) => number; stat?: 'hp' | 'mp'; drain?: boolean; element?: Element; }
  | { type: 'heal'; formula: (x: FormulaCtx) => number; stat?: 'hp' | 'mp'; }
  | { type: 'status'; add?: StatusId[]; remove?: StatusId[]; all?: boolean; /** chance evaluated once for the whole list */ }
  | { type: 'revive'; pct: number }
  | { type: 'stat'; stat: StatKey; amount: number; /** permanent (brave/faith drift) */ permanent?: boolean }
  | { type: 'ct'; set?: number; add?: number }
  | { type: 'breakEquip'; slot: EquipSlot }
  | { type: 'steal'; slot: EquipSlot | 'gil' | 'exp' | 'any' }
  | { type: 'invite' }
  | { type: 'knockback'; tiles: number }
  | { type: 'special'; id: string };

export interface AbilityDef {
  id: string;
  name: string;
  desc: string;
  kind: AbilityKind;
  jp: number;                   // learn cost
  /** Skillset id for actions. For R/S/M abilities, the job they're learned from (informational). */
  skillset?: string;

  // ---- action fields ----
  /** horizontal range in tiles. 'weapon' = weapon range. 0 = self only */
  range?: number | 'weapon';
  rangeMin?: number;
  /** vertical tolerance of the range (h units). default: unlimited for magic, 2 for melee */
  rangeV?: number;
  /** AoE size in FFT terms: 1 = single tile, 2 = radius 1 diamond, 3 = radius 2... */
  aoe?: number;
  aoeV?: number;
  shape?: AoeShape;
  /** projectile: needs line of fire (arrows/guns) — height matters */
  projectile?: boolean;
  /** does not affect the caster's allies (e.g., summons, songs, some geomancy) */
  enemiesOnly?: boolean;
  alliesOnly?: boolean;
  target?: TargetFilter;
  /** charge time in clockticks (FFT CTR). 0/undefined = instant */
  ct?: number;
  mp?: number;
  element?: Element;
  /** hit chance formula (percent 0..100). Omitted = always hits (still evasion for physical if evadable) */
  hit?: (x: FormulaCtx) => number;
  /** physical attack that can be evaded / blocked by shields */
  evadable?: boolean;
  /** magical: uses faith, can be reflected unless noReflect, blocked by silence */
  magic?: boolean;
  noReflect?: boolean;
  /** can be used by the Arithmancer skillset */
  calc?: boolean;
  /** can be copied by Mimic */
  mimic?: boolean;
  /** Blade Grasp / Arrow Guard style parry-able */
  counterable?: boolean;
  /** this ability triggers Counter Magic / Counter Flood reactions */
  triggersReaction?: 'physical' | 'magic' | 'flood' | 'none';
  effects?: EffectSpec[];
  statusChance?: StatusChance[];
  /** additional requirements to use */
  requires?: { weapon?: WeaponType[]; item?: string; notWeapon?: WeaponType[] };
  /** uses an item from inventory (Item, Throw, Iaido) */
  consumes?: string;
  anim?: AnimKind;
  vfx?: VfxId;
  /** colour hint for vfx */
  color?: string;
  sfx?: string;
  /** for performers: song/dance persists as long as the performer doesn't act */
  perform?: boolean;
  /** special-case engine handler id (see src/battle/specials.ts) */
  special?: string;
  /** passive ability parameters (for R/S/M engine hooks) */
  params?: Record<string, number | string | boolean>;
  /** AI hints */
  ai?: { heal?: boolean; buff?: boolean; debuff?: boolean; revive?: boolean; avoid?: boolean; score?: number };
}

// ---------------------------------------------------------------------------
//  Items
// ---------------------------------------------------------------------------
export type ItemKind = 'weapon' | 'shield' | 'head' | 'body' | 'accessory' | 'consumable' | 'throwable' | 'key' | 'loot';

export interface ItemLook {
  /** model family for weapons & shields, e.g. 'broadsword', 'longbow', 'kiteShield' */
  model?: string;
  color?: string;
  color2?: string;
  glow?: string;
}

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  kind: ItemKind;
  cat?: EquipCategory;
  price: number;
  /** earliest chapter/stage it appears in shops (0 = never sold) */
  shopTier?: number;
  rare?: boolean;
  // weapon
  wp?: number;
  wev?: number;
  range?: number;
  element?: Element;
  twoHanded?: boolean;       // must be used with both hands
  twoHandOk?: boolean;       // can be two-handed with Two Hands support
  dualOk?: boolean;          // can be dual wielded
  onHit?: { status?: StatusId[]; spell?: string; chance: number };
  // armour
  hp?: number;
  mp?: number;
  sev?: number;              // shield physical evade
  smev?: number;             // shield magic evade
  aev?: number;              // accessory physical evade
  amev?: number;             // accessory magic evade
  stats?: Partial<Record<'pa' | 'ma' | 'speed' | 'move' | 'jump' | 'brave' | 'faith', number>>;
  always?: StatusId[];
  start?: StatusId[];
  immune?: StatusId[];
  absorb?: Element[];
  halve?: Element[];
  nullify?: Element[];
  boost?: Element[];
  weak?: Element[];
  gender?: 'm' | 'f';
  /** consumable: ability id used when consumed */
  use?: string;
  look?: ItemLook;
}

// ---------------------------------------------------------------------------
//  Named characters
// ---------------------------------------------------------------------------
export interface CharacterDef {
  id: string;
  name: string;
  fullName?: string;
  title?: string;
  gender: 'm' | 'f' | 'monster';
  zodiac: Zodiac;
  job: string;
  /** level offset relative to party average when joining (or absolute if `levelAbs`) */
  level?: number;
  levelAbs?: boolean;
  brave: number;
  faith: number;
  equip?: Partial<Record<EquipSlot, string>>;
  secondary?: string;          // job id whose skillset is used as secondary
  reaction?: string;
  support?: string;
  movement?: string;
  learned?: string[];          // abilities known on joining
  look: CharLook;
  monster?: string;            // for monster-type characters (e.g. dragon Rhosyn)
  /** Chronicle entries unlocked by story flags: [flag, text] */
  bio: Array<[string, string]>;
  /** will not be dismissible */
  story?: boolean;
  /** portrait tint for dialog boxes */
  color?: string;
}

// ---------------------------------------------------------------------------
//  Battle maps
// ---------------------------------------------------------------------------
/**
 * Terrain letters for map cells:
 *  g grass   d dirt/road   s stone floor   r rock/cliff   n sand     i snow/ice
 *  w shallow water   W deep water   m marsh   p poison marsh   l lava
 *  b brick/castle wall   o wooden floor/deck   t roof tiles   c carpet
 *  k moss   f farmland   a machine/metal   y salt/crystal   u bones/grave soil
 *  x impassable & untargetable (void column, still rendered as a pillar if height>0)
 *  . hole — no tile at all
 *
 * A cell token is  <height><terrain>[flags]  e.g.  "2g", "3.5s", "1gT", "0W", "4t/n"
 *   height : number in h units, halves allowed (0 .. 20)
 *   flags  : T tree (unstandable, targetable)   P pine   D dead tree   B bush
 *            R boulder (unstandable)  C crate  K barrel  F flowers  G tall grass
 *            L lamp/torch   S statue (unstandable)  M mushroom  X grave
 *            /n /e /s /w  slope: tile top rises by 0.5h toward that side
 */
export type EnvTime = 'day' | 'dawn' | 'dusk' | 'night' | 'overcast' | 'interior' | 'storm' | 'void';
export type Weather = 'none' | 'rain' | 'snow' | 'fog' | 'sand' | 'ash' | 'leaves' | 'embers' | 'motes';
export type MapTheme =
  | 'plains' | 'forest' | 'town' | 'castle' | 'desert' | 'swamp' | 'mountain'
  | 'snow' | 'cave' | 'church' | 'mine' | 'ruins' | 'airship' | 'machine' | 'dungeon'
  | 'river' | 'coast' | 'volcano' | 'void';

export interface DecorDef {
  type:
    | 'tree' | 'pine' | 'deadTree' | 'bush' | 'rock' | 'boulder' | 'crate' | 'barrel'
    | 'fence' | 'lamp' | 'torch' | 'banner' | 'statue' | 'well' | 'cart' | 'tent'
    | 'grave' | 'pillar' | 'altar' | 'windmill' | 'chimney' | 'bridge' | 'haystack'
    | 'flowers' | 'mushroom' | 'crystal' | 'ruinWall' | 'gear' | 'pipe' | 'airship'
    | 'stainedGlass' | 'bookshelf' | 'throne' | 'brazier' | 'coffin' | 'bones'
    | 'cauldron' | 'anvil' | 'signpost' | 'market' | 'waterfall' | 'portcullis'
    | 'organ' | 'chandelier' | 'rug' | 'bed' | 'table' | 'cannon';
  at: [number, number];
  rot?: number;            // radians
  scale?: number;
  /** vertical offset from cell top (h) */
  y?: number;
  color?: string;
}

export interface MapDef {
  id: string;
  name: string;
  /** rows of whitespace separated cell tokens; rows[z][x] */
  rows: string[];
  theme: MapTheme;
  time: EnvTime;
  weather?: Weather;
  decor?: DecorDef[];
  /** default player deployment cells */
  deploy: Array<[number, number]>;
  /** backdrop scenery around the diorama */
  backdrop?: 'mountains' | 'sea' | 'city' | 'forest' | 'clouds' | 'void' | 'castle' | 'desert' | 'snowpeaks' | 'cathedral' | 'cavern';
  /** optional ambient light tint override */
  tint?: string;
  /** description of the location (shown on load) */
  desc?: string;
}

// ---------------------------------------------------------------------------
//  Battles
// ---------------------------------------------------------------------------
export type AiMode = 'aggressive' | 'defensive' | 'support' | 'coward' | 'guard' | 'berserk' | 'protect';

export interface UnitSpawn {
  /** unique id within the battle (for victory conditions / events) */
  id?: string;
  /** named character id (src/data/characters) — takes precedence */
  char?: string;
  /** job id for generics or monster id */
  job?: string;
  gender?: 'm' | 'f';
  name?: string;
  /** absolute level, or relative to party level if string like "+2" / "-1" */
  level: number | string;
  at: [number, number];
  facing?: Facing;
  team?: number;               // 0 = player side (guests), 1 = enemy, 2 = third party
  ai?: AiMode;
  brave?: number;
  faith?: number;
  zodiac?: Zodiac;
  equip?: Partial<Record<EquipSlot, string>>;
  secondary?: string;
  reaction?: string;
  support?: string;
  movement?: string;
  /** extra action abilities known (for generics beyond job defaults) */
  learned?: string[];
  statuses?: StatusId[];
  boss?: boolean;
  /** guest must survive */
  vip?: boolean;
  /** enters later via an event */
  hidden?: boolean;
  /** this unit won't crystallize/leave loot */
  noLoot?: boolean;
  /** hp multiplier for bosses */
  hpMult?: number;
}

export type VictoryCond =
  | { type: 'defeatAll' }
  | { type: 'defeat'; ids: string[] }          // defeat all listed ids
  | { type: 'defeatAny'; ids: string[] }       // defeat any one of listed ids
  | { type: 'survive'; turns: number }         // hero survives N of his turns
  | { type: 'reach'; cells: Array<[number, number]> };

export interface BattleEvent {
  when:
    | { turn: number }                         // at the start of global round N (hero turns)
    | { hpBelow: [string, number] }            // unit id + % threshold
    | { ko: string }                           // unit KO'd
    | { enemiesLeft: number }
    | { start: true };
  /** cutscene commands executed mid-battle (dialogue etc) */
  script: SceneCmd[];
  once?: boolean;
}

export interface BattleDef {
  id: string;
  name: string;
  map: string;
  music?: string;
  /** overrides map deploy cells */
  deploy?: Array<[number, number]>;
  maxDeploy?: number;
  /** characters that must be deployed (hero always) */
  forced?: string[];
  units: UnitSpawn[];
  victory: VictoryCond;
  /** protected unit ids (guest VIPs): battle lost if KO'd */
  protect?: string[];
  events?: BattleEvent[];
  /** Move-Find items: [x,z, commonItem, rareItem] */
  treasure?: Array<[number, number, string, string]>;
  rewards?: { gil?: number; items?: string[] };
  /** optional override */
  time?: EnvTime;
  weather?: Weather;
  /** level of enemies scales with party (random battles) */
  scaled?: boolean;
  /** hint text on the deploy screen */
  hint?: string;
}

// ---------------------------------------------------------------------------
//  Cutscenes
// ---------------------------------------------------------------------------
export type Emote = '!' | '?' | '...' | 'note' | 'anger' | 'sweat' | 'heart' | 'zzz' | 'tear';
export type ActorAnim =
  | 'idle' | 'walk' | 'kneel' | 'bow' | 'nod' | 'shake' | 'surprised' | 'attack'
  | 'cast' | 'fall' | 'dead' | 'jump' | 'raise' | 'point' | 'laugh' | 'cry' | 'hurt'
  | 'pray' | 'sit' | 'crouch' | 'victory' | 'guard' | 'shoot' | 'throw' | 'float';

/** Scene commands. Tuples keep the story scripts compact and readable. */
export interface CmdList extends Array<SceneCmd> {}
export interface ChoiceList extends Array<[string, CmdList]> {}
export type SceneCmd =
  | ['narrate', string]                                   // full screen narration text on black/parchment
  | ['title', string, string?]                            // chapter/title card
  | ['map', string, { time?: EnvTime; weather?: Weather }?]
  | ['actor', string, string, number, number, Facing?, { job?: string; team?: number; name?: string; hidden?: boolean }?]
  | ['remove', string]
  | ['hide', string] | ['show', string]
  | ['move', string, number, number, { run?: boolean; wait?: boolean }?]
  | ['face', string, Facing | string]
  | ['say', string, string, { mood?: 'normal' | 'shout' | 'whisper' | 'think'; pos?: 'top' | 'bottom' }?]
  | ['anim', string, ActorAnim, { wait?: boolean }?]
  | ['emote', string, Emote]
  | ['camera', { at?: string | [number, number]; zoom?: number; rot?: number; tilt?: number; time?: number }]
  | ['wait', number]
  | ['fade', 'in' | 'out', number?, string?]
  | ['music', string | null]
  | ['sfx', string]
  | ['vfx', string, string | [number, number]]
  | ['flag', string, (boolean | number)?]
  | ['choice', string, ChoiceList]
  | ['join', string]
  | ['leave', string]
  | ['item', string, number?]
  | ['gil', number]
  | ['shake', number, number?]
  | ['flash', string?, number?]
  | ['weather', Weather]
  | ['time', EnvTime]
  | ['chronicle', string]                                   // unlock an event entry in the Chronicle
  | ['if', string, CmdList, CmdList?]                         // flag condition
  // ---- battle-only commands (inside BattleEvent scripts) ----
  | ['reveal', string]                                      // hidden spawn enters the battle
  | ['retreat', string]                                     // unit leaves the battlefield
  | ['battleEnd', 'victory' | 'defeat']
  | ['heal', string]                                        // fully restore a unit
  | ['status', string, StatusId, boolean];                  // add/remove a status on a battle unit

export interface SceneDef {
  id: string;
  /** map to stage on; omitted = narration only (black backdrop) */
  map?: string;
  time?: EnvTime;
  weather?: Weather;
  music?: string;
  cmds: SceneCmd[];
}

// ---------------------------------------------------------------------------
//  Story & world
// ---------------------------------------------------------------------------
export interface StoryStep {
  id: string;
  chapter: number;
  /** world node where the step triggers (undefined = immediately after previous) */
  at?: string;
  pre?: string;                 // scene id before battle
  battle?: string;
  post?: string;                // scene id after battle
  /** world nodes unlocked after this step */
  unlock?: string[];
  /** flags set when complete */
  flags?: string[];
  /** a short objective shown on world map */
  objective: string;
  /** after this step the player cannot return to the world map until the next step is done (forced sequence) */
  chain?: boolean;
  /** move the party to this node afterwards */
  moveTo?: string;
  /** shop tier (1..8) unlocked when this step completes */
  tier?: number;
  /** characters joining the party permanently when the step completes (also possible via ['join'] in scenes) */
  join?: string[];
}

export interface SideQuestStep {
  id: string;
  quest: string;                // quest id
  at: string;                   // world node
  /** all flags required */
  needs: string[];
  /** chapter window */
  chapterMin?: number;
  chapterMax?: number;
  /** requires a character in the party */
  needChar?: string[];
  pre?: string;
  battle?: string;
  post?: string;
  flags: string[];
  unlock?: string[];
  objective?: string;
  /** repeatable (e.g. dungeon floors) */
  repeat?: boolean;
}

export type NodeKind = 'town' | 'castle' | 'field' | 'special' | 'dungeon';
export interface WorldNode {
  id: string;
  name: string;
  kind: NodeKind;
  /** position on the world map (0..100 x 0..100, x=east, y=south) */
  pos: [number, number];
  region: string;
  desc: string;
  shop?: boolean;
  tavern?: boolean;
  guild?: boolean;              // soldier office (recruit)
  furShop?: boolean;
  /** maps + monster/human pools for random battles (field nodes) */
  random?: { maps: string[]; pools: RandomPool[]; rate?: number };
  /** initially visible */
  start?: boolean;
}
export interface RandomPool {
  chapterMin: number;
  chapterMax?: number;
  units: Array<{ job: string; gender?: 'm' | 'f'; weight?: number }>;
  count: [number, number];
}
export interface WorldEdge { a: string; b: string; }

export interface ShopStock { tier: number; items: string[] }

export interface ErrandDef {
  id: string;
  title: string;
  desc: string;
  towns: string[];
  /** chapter & flag window */
  chapterMin: number;
  chapterMax?: number;
  needs?: string[];
  fee: number;
  days: number;
  /** stat emphasised for success */
  stat: 'brave' | 'faith' | 'pa' | 'ma' | 'speed' | 'level';
  jobs?: string[];              // jobs that increase odds
  reward: { gil: number; jp?: number; item?: string; unlock?: string; artefact?: string; flag?: string };
  report: string;               // result text on success
}

export interface ArtefactDef { id: string; name: string; desc: string }

export interface ChronicleEvent { id: string; chapter: number; title: string; text: string }
