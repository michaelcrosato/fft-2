// ============================================================================
//  Side-quest battles: the Colgrave colliery (Beorn & Rhosyn), Nevel Temple,
//  the Zargid flower market (Kestrel), the ten landings of the Midnight Deep
//  and the two rare battles of Chapter IV.
//  Party-level guide: colliery ≈ Ch.III (18–30), everything else Ch.IV (30–45+).
// ============================================================================
import type { BattleDef, SceneCmd, UnitSpawn } from '../types';

/** A Midnight Deep landing: the only way on is the hidden sigil (a `reach` cell). */
const SEARCH: SceneCmd[] = [
  ['narrate', 'The landing falls silent. Somewhere beneath the dust, a sigil still waits to be found.'],
];
const DEEP_HINT = 'A hidden sigil on this landing opens the stair below. Defeating every foe will not open the way — one of your own must stand upon the sigil.';

/** Drowned soldiers of the Deep's lost garrison. */
const drowned = (job: string, at: [number, number], extra: Partial<UnitSpawn> = {}): UnitSpawn =>
  ({ job, level: '+3', at, team: 1, name: 'Drowned Garrison', statuses: ['undead'], ...extra });

/** One of the Eleven of Grogmoor. */
const monk = (name: string, gender: 'm' | 'f', at: [number, number], facing: UnitSpawn['facing'], reaction: string): UnitSpawn =>
  ({ job: 'monk', name, gender, level: '+3', at, facing, team: 1, reaction, support: 'attackUp', movement: 'move1' });

export const battles: BattleDef[] = [
  // ==========================================================================
  //  The Ghost of the Colliery
  // ==========================================================================
  {
    id: 'b_colliery1', name: 'The Pithead Gallery', map: 'colliery1', music: 'battle2',
    hint: 'Scavengers in the Brood\'s pay hold the loading stage. Beorn fights at your side.',
    units: [
      { char: 'beorn', level: '+1', at: [3, 2], facing: 'S', team: 0, ai: 'aggressive' },
      { id: 'snuff', job: 'thief', name: 'Snuff Karrow', level: '+2', at: [10, 1], facing: 'W', team: 1, reaction: 'gilSnapper', support: 'equipKnife', hpMult: 1.4 },
      { job: 'thief', name: 'Lamp-Snuffer', level: '+0', at: [12, 2], facing: 'W', team: 1, reaction: 'counterTackle' },
      { job: 'thief', name: 'Lamp-Snuffer', level: '+0', at: [6, 9], facing: 'N', team: 1 },
      { job: 'chemist', name: 'Pit Scavenger', level: '+1', at: [11, 4], facing: 'W', team: 1, equip: { rhand: 'blazeGun' }, reaction: 'autoPotion' },
      { job: 'chemist', name: 'Pit Scavenger', level: '+0', at: [3, 9], facing: 'N', team: 1, reaction: 'autoPotion' },
      { job: 'archer', name: 'Seam Sniper', level: '+1', at: [2, 8], facing: 'N', team: 1, support: 'concentrate' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      { when: { ko: 'snuff' }, once: true, script: [
        ['say', 'snuff', 'The Warden... said the pit would keep us fed...'],
        ['say', 'beorn', 'The pit keeps everyone, in the end. Rest easy.'],
      ] },
    ],
    treasure: [[12, 1, 'hiPotion', 'hiEther'], [0, 9, 'phoenixDown', 'remedy']],
    rewards: { gil: 1200 },
  },
  {
    id: 'b_colliery2', name: 'The Second Seam', map: 'colliery2', music: 'battle2',
    hint: 'Firedamp breeds bombs in the old seam. The plank bridges are the quickest way across the sinkhole — and the most exposed.',
    units: [
      { char: 'beorn', level: '+1', at: [5, 12], facing: 'N', team: 0, ai: 'aggressive' },
      { id: 'acolyte', job: 'wizard', name: 'Brood Acolyte', level: '+2', at: [2, 7], facing: 'S', team: 1, reaction: 'counterMagic', support: 'magicAttackUp' },
      { job: 'bomb', level: '+0', at: [4, 2], facing: 'S', team: 1 },
      { job: 'bomb', level: '+0', at: [10, 6], facing: 'W', team: 1 },
      { job: 'grenade', level: '+1', at: [8, 8], facing: 'W', team: 1 },
      { job: 'thief', name: 'Lamp-Snuffer', level: '+1', at: [11, 1], facing: 'S', team: 1 },
      { job: 'thief', name: 'Lamp-Snuffer', level: '+1', at: [9, 3], facing: 'S', team: 1, reaction: 'counterTackle' },
      { job: 'chemist', name: 'Pit Scavenger', level: '+1', at: [10, 2], facing: 'S', team: 1, equip: { rhand: 'blazeGun' }, reaction: 'autoPotion' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      { when: { hpBelow: ['acolyte', 50] }, once: true, script: [
        ['say', 'acolyte', 'Burn, then! The Wyrm below will drink the smoke!'],
      ] },
    ],
    treasure: [[2, 7, 'ether', 'elixir'], [12, 12, 'hiPotion', 'xPotion']],
    rewards: { gil: 1400, items: ['hiEther'] },
  },
  {
    id: 'b_colliery3', name: 'The Drowned Gallery', map: 'colliery3', music: 'battle2',
    hint: 'The Brood\'s beasts hunt in the flooded gallery. The stream is deep; the footbridge and the timber walk are dry.',
    units: [
      { char: 'beorn', level: '+1', at: [11, 3], facing: 'W', team: 0, ai: 'aggressive' },
      { id: 'tamer', job: 'orator', name: 'Brood Tamer', level: '+2', at: [1, 3], facing: 'E', team: 1, support: 'train', reaction: 'fingerGuard' },
      { job: 'boarlet', level: '+0', at: [2, 5], facing: 'E', team: 1 },
      { job: 'porky', level: '+1', at: [3, 6], facing: 'E', team: 1 },
      { job: 'bullDemon', level: '+1', at: [4, 9], facing: 'N', team: 1 },
      { job: 'sabrecat', level: '+1', at: [2, 9], facing: 'E', team: 1 },
      { job: 'sabrecat', level: '+1', at: [8, 10], facing: 'N', team: 1 },
      { job: 'ahriman', level: '+1', at: [1, 7], facing: 'E', team: 1 },
    ],
    victory: { type: 'defeatAll' },
    events: [
      { when: { turn: 3 }, once: true, script: [
        ['sfx', 'roar'],
        ['narrate', 'From somewhere far below, through water and stone, comes a long, grieving cry.'],
        ['say', 'beorn', 'Hold on, love. Hold on. I\'m nearly there.', { mood: 'whisper' }],
      ] },
    ],
    treasure: [[0, 2, 'eyeDrop', 'cachouBand'], [13, 6, 'remedy', 'hiEther']],
    rewards: { gil: 1600, items: ['remedy'] },
  },
  {
    id: 'b_colliery4', name: 'The Wyrm\'s Hollow', map: 'colliery4', music: 'boss',
    hint: 'Defeat Vorgund Hask, Warden of the Brood. His beasts guard the stair to his dais.',
    units: [
      { char: 'beorn', level: '+1', at: [6, 11], facing: 'N', team: 0, ai: 'aggressive' },
      { id: 'vorgund', job: 'summoner', name: 'Vorgund Hask', level: '+3', at: [6, 2], facing: 'S', team: 1, boss: true, hpMult: 2.5,
        secondary: 'wizard', reaction: 'counterMagic', support: 'halfMp', movement: 'teleport', brave: 60, faith: 75 },
      { job: 'hydra', name: 'Brood-Wyrm', level: '+1', at: [9, 4], facing: 'S', team: 1 },
      { job: 'minotaur', level: '+1', at: [3, 5], facing: 'S', team: 1 },
      { job: 'bullDemon', level: '+1', at: [10, 6], facing: 'S', team: 1 },
      { job: 'wizard', name: 'Brood Acolyte', level: '+2', at: [2, 3], facing: 'S', team: 1, reaction: 'counterMagic' },
      { job: 'priest', name: 'Brood Chanter', level: '+2', at: [11, 3], facing: 'S', team: 1, reaction: 'regenerator' },
    ],
    victory: { type: 'defeat', ids: ['vorgund'] },
    events: [
      { when: { hpBelow: ['vorgund', 50] }, once: true, script: [
        ['say', 'vorgund', 'Kill me, then! It changes nothing. The curse was written in the Church\'s own ink, Kadmas — and the Church does not cross out its own words.'],
        ['say', 'beorn', 'Then I\'ll find a bigger pen.', { mood: 'shout' }],
      ] },
      { when: { ko: 'vorgund' }, once: true, script: [
        ['say', 'vorgund', 'My Brood... will sing... of me...'],
        ['say', 'beorn', 'Your Brood is running, Hask. Listen. Not a note.'],
      ] },
    ],
    treasure: [[1, 3, 'phoenixDown', 'elixir'], [12, 9, 'hiEther', 'saltRosePerfume']],
    rewards: { gil: 3000, items: ['elixir', 'hiEther'] },
  },

  // ==========================================================================
  //  Nevel Temple
  // ==========================================================================
  {
    id: 'b_nevel', name: 'Nevel Temple', map: 'nevel', music: 'boss',
    forced: ['beorn', 'rhosyn'],
    hint:'Silence the Warden, an ancient automaton. Treasures of the Lost Age lie atop the tall pillars — only a great Jump or teleportation will reach them, and only Move-Find will uncover them.',
    units: [
      { id: 'warden', job: 'automaton', name: 'Automaton VII, the Warden', level: '+4', at: [6, 1], facing: 'S', team: 1, boss: true, hpMult: 3, brave: 80 },
      { job: 'steelHawk', level: '+2', at: [3, 1], facing: 'S', team: 1 },
      { job: 'steelHawk', level: '+2', at: [10, 1], facing: 'S', team: 1 },
      { job: 'cockatrice', level: '+2', at: [4, 4], facing: 'S', team: 1 },
      { job: 'cockatrice', level: '+2', at: [9, 4], facing: 'S', team: 1 },
    ],
    victory: { type: 'defeat', ids: ['warden'] },
    events: [
      { when: { start: true }, once: true, script: [
        ['say', 'warden', '...Seven. Seven. Zero. Zero. Zero.'],
        ['say', 'beorn', 'I\'ve no idea what that means, and I don\'t like it.'],
      ] },
      { when: { hpBelow: ['warden', 50] }, once: true, script: [
        ['shake', 0.3, 0.8],
        ['say', 'warden', 'Seven. Seven. Seven. Seven. Seven.'],
        ['emote', 'rhosyn', '!'],
        ['say', 'beorn', 'It\'s counting down to something. Finish it — now!', { mood: 'shout' }],
      ] },
    ],
    treasure: [[3, 3, 'phoenixDown', 'gungnir'], [10, 3, 'hiEther', 'chaosBlade'], [3, 10, 'elixir', 'ribbon'], [10, 10, 'elixir', 'masamune']],
    rewards: { gil: 5000, items: ['dragonRod'] },
  },

  // ==========================================================================
  //  A Flower for a Stranger — the Zargid flower market
  // ==========================================================================
  {
    id: 'b_zargid_kestrel', name: 'The Flower Market', map: 'sq_zargid_square', music: 'battle1',
    hint: 'Drive off the Brotherhood of the Scales. Aline must not fall.',
    units: [
      { char: 'aline', level: '+0', at: [6, 4], facing: 'N', team: 0, ai: 'coward', vip: true },
      { char: 'kestrel', level: '+2', at: [5, 4], facing: 'N', team: 0, ai: 'aggressive' },
      { id: 'mallow', job: 'knight', name: 'Dirk Mallow', level: '+2', at: [5, 1], facing: 'S', team: 1, boss: true, hpMult: 1.5, reaction: 'counter' },
      { job: 'knight', name: 'Scales Bravo', level: '+1', at: [10, 3], facing: 'W', team: 1 },
      { job: 'thief', name: 'Scales Cutpurse', level: '+1', at: [3, 1], facing: 'S', team: 1 },
      { job: 'thief', name: 'Scales Cutpurse', level: '+1', at: [8, 1], facing: 'S', team: 1 },
      { job: 'archer', name: 'Scales Bowman', level: '+1', at: [10, 0], facing: 'S', team: 1 },
      { job: 'monk', name: 'Scales Bruiser', level: '+1', at: [1, 3], facing: 'E', team: 1 },
    ],
    victory: { type: 'defeatAll' },
    protect: ['aline'],
    events: [
      { when: { start: true }, once: true, script: [
        ['say', 'kestrel', 'Stay behind me. ...Please.'],
        ['say', 'aline', 'Behind you is where all the running is. I\'ll manage!'],
      ] },
      { when: { ko: 'mallow' }, once: true, script: [
        ['say', 'mallow', 'Market dues... are... cancelled...'],
      ] },
    ],
    rewards: { gil: 1000, items: ['otherworldBlade'] },
  },

  // ==========================================================================
  //  The Midnight Deep
  // ==========================================================================
  {
    id: 'b_deep1', name: 'The Midnight Deep: Nywlag', map: 'deep1', music: 'battle3', hint: DEEP_HINT,
    units: [
      { job: 'livingBone', level: '+2', at: [2, 4], facing: 'E', team: 1 },
      { job: 'livingBone', level: '+2', at: [5, 6], facing: 'N', team: 1 },
      { job: 'revenant', level: '+2', at: [1, 7], facing: 'E', team: 1 },
      { job: 'revenant', level: '+2', at: [8, 8], facing: 'N', team: 1 },
      { job: 'bonesnatch', level: '+2', at: [3, 3], facing: 'E', team: 1 },
      { job: 'plague', level: '+2', at: [0, 5], facing: 'E', team: 1 },
    ],
    victory: { type: 'reach', cells: [[1, 8]] },
    events: [{ when: { enemiesLeft: 0 }, once: true, script: SEARCH }],
    treasure: [[0, 0, 'phoenixDown', 'glacierGun'], [0, 3, 'phoenixDown', 'elixir'], [2, 7, 'phoenixDown', 'blazeGun'], [9, 5, 'phoenixDown', 'kiyomori']],
    rewards: { gil: 2500 },
  },
  {
    id: 'b_deep2', name: 'The Midnight Deep: Aranel', map: 'deep2', music: 'battle3', hint: DEEP_HINT,
    units: [
      { job: 'kingBehemoth', level: '+3', at: [4, 8], facing: 'N', team: 1 },
      { job: 'behemoth', level: '+2', at: [1, 6], facing: 'N', team: 1 },
      { job: 'behemoth', level: '+2', at: [7, 7], facing: 'N', team: 1 },
      { job: 'sacredBull', level: '+2', at: [6, 10], facing: 'N', team: 1 },
      { job: 'cockatrice', level: '+2', at: [2, 9], facing: 'N', team: 1 },
    ],
    victory: { type: 'reach', cells: [[0, 11]] },
    events: [{ when: { enemiesLeft: 0 }, once: true, script: SEARCH }],
    treasure: [[2, 1, 'phoenixDown', 'elixir'], [6, 4, 'phoenixDown', 'bloodSword'], [0, 10, 'phoenixDown', 'queensOath'], [4, 11, 'phoenixDown', 'elixir']],
    rewards: { gil: 3000 },
  },
  {
    id: 'b_deep3', name: 'The Midnight Deep: Eladray', map: 'deep3', music: 'battle3', hint: DEEP_HINT,
    units: [
      { job: 'plague', level: '+3', at: [1, 6], facing: 'N', team: 1 },
      { job: 'plague', level: '+3', at: [8, 8], facing: 'N', team: 1 },
      { job: 'ahriman', level: '+3', at: [5, 9], facing: 'N', team: 1 },
      { job: 'ninja', name: 'Pit Shade', level: '+3', at: [3, 12], facing: 'N', team: 1, reaction: 'reflexes', secondary: 'thief' },
      { job: 'ninja', name: 'Pit Shade', level: '+3', at: [8, 13], facing: 'N', team: 1, reaction: 'sunkenState' },
      { job: 'tiamat', level: '+3', at: [2, 14], facing: 'N', team: 1 },
    ],
    victory: { type: 'reach', cells: [[1, 14]] },
    events: [{ when: { enemiesLeft: 0 }, once: true, script: SEARCH }],
    treasure: [[2, 0, 'phoenixDown', 'elixir'], [7, 6, 'phoenixDown', 'yoichiBow'], [1, 9, 'phoenixDown', 'maceOfZeus'], [5, 12, 'phoenixDown', 'elixir']],
    rewards: { gil: 3500 },
  },
  {
    id: 'b_deep4', name: 'The Midnight Deep: Lehteb', map: 'deep4', music: 'battle3', hint: DEEP_HINT,
    units: [
      drowned('knight', [7, 2], { facing: 'W' }),
      drowned('knight', [8, 5], { facing: 'W' }),
      drowned('lancer', [11, 5], { facing: 'W' }),
      drowned('lancer', [12, 8], { facing: 'W' }),
      drowned('archer', [9, 0], { facing: 'W', support: 'concentrate' }),
      drowned('knight', [13, 7], { name: 'Drowned Castellan', level: '+4', hpMult: 1.5, reaction: 'weaponGuard', facing: 'W' }),
    ],
    victory: { type: 'reach', cells: [[14, 6]] },
    events: [
      { when: { start: true }, once: true, script: [
        ['say', 'rhen', 'Soldiers... in no colours I know. How long have they stood watch down here?', { mood: 'think' }],
      ] },
      { when: { enemiesLeft: 0 }, once: true, script: SEARCH },
    ],
    treasure: [[3, 8, 'phoenixDown', 'elixir'], [11, 2, 'phoenixDown', 'faithRod'], [10, 0, 'phoenixDown', 'kaiserPlate'], [10, 1, 'phoenixDown', 'fairyHarp']],
    rewards: { gil: 4000 },
  },
  {
    id: 'b_deep5', name: 'The Midnight Deep: Lekriz', map: 'deep5', music: 'battle3', hint: DEEP_HINT,
    units: [
      { job: 'krakenling', level: '+3', at: [0, 2], facing: 'E', team: 1 },
      { job: 'krakenling', level: '+3', at: [1, 8], facing: 'N', team: 1 },
      { job: 'brainleech', level: '+3', at: [5, 0], facing: 'S', team: 1 },
      { job: 'greaterHydra', level: '+3', at: [5, 8], facing: 'N', team: 1 },
      { job: 'hydra', level: '+3', at: [1, 11], facing: 'N', team: 1 },
    ],
    victory: { type: 'reach', cells: [[6, 7]] },
    events: [{ when: { enemiesLeft: 0 }, once: true, script: SEARCH }],
    treasure: [[2, 3, 'phoenixDown', 'excalibur'], [6, 0, 'phoenixDown', 'elixir'], [0, 0, 'phoenixDown', 'igaBlade'], [0, 11, 'phoenixDown', 'elixir']],
    rewards: { gil: 4500 },
  },
  {
    id: 'b_deep6', name: 'The Midnight Deep: Digraz', map: 'deep6', music: 'battle3', hint: DEEP_HINT,
    units: [
      { job: 'vampireCat', level: '+4', at: [8, 1], facing: 'W', team: 1 },
      { job: 'vampireCat', level: '+4', at: [5, 4], facing: 'N', team: 1 },
      { job: 'darkBehemoth', level: '+4', at: [4, 7], facing: 'N', team: 1 },
      { job: 'wildboar', level: '+4', at: [1, 6], facing: 'N', team: 1 },
      { job: 'sabrecat', level: '+4', at: [8, 9], facing: 'N', team: 1 },
    ],
    victory: { type: 'reach', cells: [[9, 10]] },
    events: [{ when: { enemiesLeft: 0 }, once: true, script: SEARCH }],
    treasure: [[0, 0, 'phoenixDown', 'elixir'], [0, 1, 'phoenixDown', 'shinobiGarb'], [1, 0, 'phoenixDown', 'blastGun'], [1, 1, 'phoenixDown', 'cursedRing']],
    rewards: { gil: 5000 },
  },
  {
    id: 'b_deep7', name: 'The Midnight Deep: Sidlavi', map: 'deep7', music: 'battle3', hint: DEEP_HINT,
    units: [
      { job: 'redDragon', level: '+4', at: [7, 4], facing: 'W', team: 1 },
      { job: 'blueDragon', level: '+4', at: [10, 5], facing: 'W', team: 1 },
      { job: 'dragon', level: '+4', at: [5, 7], facing: 'N', team: 1 },
      { job: 'tiamat', level: '+4', at: [12, 7], facing: 'W', team: 1 },
      { job: 'lancer', name: 'Wyrm-Rider of the Deep', level: '+4', at: [13, 4], facing: 'W', team: 1, reaction: 'dragonSpirit', support: 'attackUp', movement: 'jump2' },
    ],
    victory: { type: 'reach', cells: [[12, 4]] },
    events: [{ when: { enemiesLeft: 0 }, once: true, script: SEARCH }],
    treasure: [[0, 4, 'phoenixDown', 'elixir'], [2, 4, 'phoenixDown', 'kogaBlade'], [4, 4, 'phoenixDown', 'sageStaff'], [10, 4, 'phoenixDown', 'elixir']],
    rewards: { gil: 5500 },
  },
  {
    id: 'b_deep8', name: 'The Midnight Deep: Lligraw', map: 'deep8', music: 'battle3', hint: DEEP_HINT,
    units: [
      { id: 'farseer', job: 'archer', name: 'The Far-Seer', level: '+5', at: [11, 5], facing: 'W', team: 1, equip: { rhand: 'yoichiBow' }, support: 'concentrate', reaction: 'arrowGuard', hpMult: 1.3 },
      { job: 'archer', name: 'Wrecker', level: '+4', at: [10, 8], facing: 'W', team: 1, support: 'concentrate' },
      { job: 'thief', name: 'Wrecker', level: '+4', at: [4, 6], facing: 'N', team: 1, reaction: 'catch' },
      { job: 'thief', name: 'Wrecker', level: '+4', at: [7, 7], facing: 'N', team: 1 },
      { job: 'ninja', name: 'Wrecker', level: '+4', at: [9, 11], facing: 'N', team: 1, reaction: 'reflexes' },
      { job: 'summoner', name: 'Drowned Navigator', level: '+4', at: [12, 12], facing: 'N', team: 1, support: 'halfMp' },
    ],
    victory: { type: 'reach', cells: [[8, 8]] },
    events: [
      { when: { start: true }, once: true, script: [
        ['say', 'farseer', 'Another ship come down the stair. I have not missed one yet.'],
      ] },
      { when: { enemiesLeft: 0 }, once: true, script: SEARCH },
    ],
    treasure: [[2, 3, 'phoenixDown', 'elixir'], [3, 5, 'phoenixDown', 'ragnarok'], [6, 6, 'phoenixDown', 'robeOfLords'], [8, 7, 'phoenixDown', 'perseusBow']],
    rewards: { gil: 6000 },
  },
  {
    id: 'b_deep9', name: 'The Midnight Deep: Nerua', map: 'deep9', music: 'battle3', hint: DEEP_HINT,
    units: [
      { job: 'ninja', name: 'Shade of the Deep', level: '+5', at: [6, 1], facing: 'W', team: 1, reaction: 'reflexes', secondary: 'thief' },
      { job: 'ninja', name: 'Shade of the Deep', level: '+5', at: [10, 2], facing: 'W', team: 1, reaction: 'sunkenState' },
      { job: 'ninja', name: 'Shade of the Deep', level: '+5', at: [1, 5], facing: 'E', team: 1, reaction: 'reflexes' },
      { job: 'ninja', name: 'Shade of the Deep', level: '+5', at: [8, 6], facing: 'W', team: 1, reaction: 'reflexes', secondary: 'samurai' },
      { job: 'ninja', name: 'Shade of the Deep', level: '+5', at: [9, 9], facing: 'N', team: 1, reaction: 'sunkenState' },
      { job: 'ninja', name: 'Shade of the Deep', level: '+5', at: [5, 8], facing: 'N', team: 1, reaction: 'reflexes', secondary: 'thief' },
    ],
    victory: { type: 'reach', cells: [[2, 8]] },
    events: [
      { when: { start: true }, once: true, script: [
        ['narrate', 'No footstep sounds on this landing. Only breathing — and not all of it yours.'],
      ] },
      { when: { enemiesLeft: 0 }, once: true, script: SEARCH },
    ],
    treasure: [[8, 4, 'phoenixDown', 'venetianShield'], [8, 5, 'phoenixDown', 'grandHelm'], [2, 9, 'phoenixDown', 'maximilian'], [1, 6, 'phoenixDown', 'elixir']],
    rewards: { gil: 6500 },
  },
  {
    id: 'b_deep10', name: 'The Midnight Deep: End', map: 'deep10', music: 'umbral',
    hint: 'Destroy Ophion, the Coiled One — Umbral Lord of the thirteenth sign.',
    units: [
      { id: 'ophion', job: 'ophion', name: 'Ophion, the Coiled One', level: '+8', at: [5, 2], facing: 'S', team: 1, boss: true, hpMult: 5 },
      { job: 'tiamat', name: 'Coil of the Thirteenth', level: '+5', at: [3, 2], facing: 'S', team: 1 },
      { job: 'tiamat', name: 'Coil of the Thirteenth', level: '+5', at: [8, 2], facing: 'S', team: 1 },
      { job: 'darkBehemoth', name: 'Hound of the Last Landing', level: '+5', at: [6, 4], facing: 'S', team: 1 },
    ],
    victory: { type: 'defeat', ids: ['ophion'] },
    events: [
      { when: { hpBelow: ['ophion', 60] }, once: true, script: [
        ['say', 'ophion', 'You read my names upside-down all the way to the bottom of the world. Did you never wonder who was meant to read them the right way up?'],
      ] },
      { when: { hpBelow: ['ophion', 25] }, once: true, script: [
        ['shake', 0.4, 1.0],
        ['say', 'ophion', 'Twelve signs, twelve lords, twelve lies! I am the one they left off the calendar — and I will not be left off again!', { mood: 'shout' }],
      ] },
    ],
    rewards: { gil: 20000, items: ['omnilexicon', 'elixir', 'elixir'] },
  },

  // ==========================================================================
  //  Rare battles (Chapter IV)
  // ==========================================================================
  {
    id: 'b_rare_monks', name: 'The Eleven of Grogmoor', map: 'sq_rare_grogmoor', music: 'battle3',
    hint: 'Eleven wandering monks bar the drovers\' road. Their fists are their blessing.',
    units: [
      { ...monk('Brother Hesk', 'm', [7, 2], 'S', 'hpRestore'), id: 'hesk', level: '+4', hpMult: 1.5, boss: true },
      monk('Brother Aldo', 'm', [6, 0], 'S', 'counter'),
      monk('Sister Maren', 'f', [8, 0], 'S', 'firstStrike'),
      monk('Brother Colm', 'm', [5, 1], 'S', 'counter'),
      monk('Sister Ives', 'f', [9, 1], 'S', 'hpRestore'),
      monk('Brother Wynn', 'm', [4, 2], 'S', 'counter'),
      monk('Sister Petra', 'f', [10, 2], 'S', 'firstStrike'),
      monk('Brother Oswin', 'm', [5, 3], 'S', 'counter'),
      monk('Sister Dagny', 'f', [9, 3], 'S', 'hpRestore'),
      monk('Brother Rurik', 'm', [6, 4], 'S', 'firstStrike'),
      monk('Sister Selde', 'f', [8, 4], 'S', 'counter'),
    ],
    victory: { type: 'defeatAll' },
    events: [
      { when: { hpBelow: ['hesk', 40] }, once: true, script: [
        ['say', 'hesk', 'Yes! Yes — this is the lesson we have waited eleven winters to learn!'],
      ] },
      { when: { enemiesLeft: 3 }, once: true, script: [
        ['say', 'hesk', 'Brothers, sisters — do not yield yet. A lesson half-learned is a lesson wasted!'],
      ] },
    ],
    rewards: { gil: 8000, items: ['shogunGauntlet', 'elixir'] },
  },
  {
    id: 'b_rare_beasts', name: 'The Barrow Hill Beast Parade', map: 'sq_rare_barrowhill', music: 'battle3',
    hint: 'The kings\' mounds have opened, and their menagerie walks again. Every beast here is a champion of its kind.',
    units: [
      { id: 'crownhorn', job: 'kingBehemoth', name: 'Old Crownhorn', level: '+4', at: [3, 3], facing: 'S', team: 1, hpMult: 1.5 },
      { job: 'darkBehemoth', level: '+3', at: [10, 4], facing: 'W', team: 1 },
      { job: 'behemoth', level: '+3', at: [8, 8], facing: 'W', team: 1 },
      { job: 'redDragon', level: '+3', at: [10, 3], facing: 'S', team: 1 },
      { job: 'blueDragon', level: '+3', at: [11, 10], facing: 'W', team: 1 },
      { job: 'hydra', level: '+3', at: [6, 8], facing: 'W', team: 1 },
      { job: 'greaterHydra', level: '+3', at: [12, 9], facing: 'W', team: 1 },
      { job: 'tiamat', level: '+3', at: [7, 4], facing: 'S', team: 1 },
    ],
    victory: { type: 'defeatAll' },
    events: [
      { when: { start: true }, once: true, script: [
        ['sfx', 'roar'],
        ['shake', 0.3, 0.8],
      ] },
    ],
    rewards: { gil: 10000, items: ['dragonWhisker', 'defender'] },
  },
];
