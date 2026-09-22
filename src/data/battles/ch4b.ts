// ============================================================================
//  Chapter IV, part B — battles from Castle Ygress to the last sky-ship.
//  Late-game named foes carry fixed, strong equipment; rank-and-file are
//  auto-equipped by the engine from job + shop tier.
// ============================================================================
import type { BattleDef } from '../types';

export const battles: BattleDef[] = [
  // --------------------------------------------------------------------------
  //  13. Castle Ygress — berserk Zander vs Dorian; Dorian becomes Azazel
  // --------------------------------------------------------------------------
  {
    id: 'b_ygress', name: 'Castle Ygress', map: 'ygress_keep', music: 'boss',
    maxDeploy: 5,
    hint: 'Dorian holds the dais. Zander fights at your side, but he is beyond reason and will not heed you.',
    units: [
      {
        char: 'dorian', level: '+4', at: [6, 2], facing: 'S', team: 1, boss: true, hpMult: 2,
        equip: { rhand: 'defender', lhand: 'aegisShield', head: 'circlet', body: 'carabineerMail', accessory: 'powerWrist' },
        secondary: 'wizard', reaction: 'catch', support: 'defenseUp', movement: 'move1',
      },
      { id: 'azazel', job: 'azazel', name: 'Azazel', level: '+5', at: [6, 2], facing: 'S', team: 1, boss: true, hpMult: 3.5, hidden: true, noLoot: true },
      {
        char: 'zander', level: '+3', at: [7, 6], facing: 'N', team: 0, ai: 'berserk', statuses: ['berserk'],
        equip: { rhand: 'runeBlade', lhand: 'crystalShield', head: 'crystalHelmet', body: 'crystalMail', accessory: 'germainBoots' },
      },
      { job: 'knight', name: 'Valorne Retainer', level: '+2', at: [4, 3], facing: 'S', team: 1, secondary: 'monk', reaction: 'counter' },
      { job: 'knight', name: 'Valorne Retainer', level: '+2', at: [9, 3], facing: 'S', team: 1, secondary: 'geomancer', reaction: 'weaponGuard' },
      { job: 'knight', name: 'Valorne Retainer', level: '+2', at: [2, 5], facing: 'S', team: 1, secondary: 'squire', reaction: 'counterTackle' },
      { job: 'archer', name: 'Household Archer', level: '+2', at: [1, 2], facing: 'S', team: 1, support: 'concentrate' },
      { job: 'wizard', name: 'Household Magus', level: '+2', at: [12, 2], facing: 'S', team: 1, support: 'magicAttackUp' },
      { job: 'lancer', name: 'Valorne Lancer', level: '+2', at: [11, 5], facing: 'S', team: 1 },
    ],
    victory: { type: 'defeat', ids: ['azazel'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'zander', 'Stand aside, Rhen! This is mine to finish — mine and Father\'s!', { mood: 'shout' }],
          ['say', 'rhen', 'Zander, wait! Look at his hand — he\'s holding something!', { mood: 'shout' }],
          ['say', 'dorian', 'Retainers. My brothers are overwrought. See that they rest.'],
        ],
      },
      {
        when: { hpBelow: ['dorian', 50] },
        script: [
          ['camera', { at: 'dorian', zoom: 1.2, time: 0.8 }],
          ['say', 'dorian', 'Enough. Father bled forty years for kings who never learned his name, and died in a borrowed bed for it.'],
          ['say', 'dorian', 'I will not end as he did. Stone of the Goat — you have whispered to me long enough. Take it. Take all of it.'],
          ['music', 'umbral'],
          ['vfx', 'dark', 'dorian'],
          ['shake', 0.4, 1.2],
          ['say', 'zander', 'Dorian — what are you — get away from it!', { mood: 'shout' }],
          ['flash', '#a01020', 0.8],
          ['retreat', 'dorian'],
          ['reveal', 'azazel'],
          ['sfx', 'demon'],
          ['say', 'azazel', 'Your brother is so very loud. Let him shout somewhere else.'],
          ['vfx', 'teleport', 'zander'],
          ['retreat', 'zander'],
          ['say', 'rhen', 'ZANDER!', { mood: 'shout' }],
          ['say', 'azazel', 'Come, youngest. Let us learn which of Baldric\'s sons was worth the poison.'],
        ],
      },
      {
        when: { hpBelow: ['azazel', 30] },
        script: [
          ['say', 'azazel', 'The goat of the old rite bore every sin of the flock into the wilderness. I bore his. Do you see? I carried him.'],
          ['say', 'rhen', 'You carried nothing but a cup of poison. Father carried all of us.'],
        ],
      },
    ],
    treasure: [[1, 10, 'hiEther', 'ribbon'], [12, 1, 'xPotion', 'featherMantle']],
    rewards: { gil: 8000, items: ['defender', 'elixir'] },
  },

  // --------------------------------------------------------------------------
  //  14. Murondel — the pilgrims' square: undead Zander
  // --------------------------------------------------------------------------
  {
    id: 'b_murondel1', name: 'Murondel — The Pilgrims\' Square', map: 'murondel_streets', music: 'boss',
    maxDeploy: 5,
    hint: 'Zander is undead: healing magic and potions will wound him, and he will not stay down for long unless you finish it.',
    units: [
      {
        char: 'zander', level: '+4', at: [7, 6], facing: 'S', team: 1, boss: true, hpMult: 2.5, statuses: ['undead'],
        equip: { rhand: 'runeBlade', lhand: 'crystalShield', head: 'crystalHelmet', body: 'crystalMail', accessory: 'germainBoots' },
        reaction: 'speedSave', support: 'defenseUp', movement: 'moveHpUp',
      },
      { job: 'sanctumKnight', name: 'Sanctum Knight', level: '+2', at: [4, 6], facing: 'S', team: 1, reaction: 'counter' },
      { job: 'sanctumKnight', name: 'Sanctum Knight', level: '+2', at: [10, 6], facing: 'S', team: 1, reaction: 'weaponGuard' },
      { job: 'orator', name: 'Sanctum Herald', level: '+2', at: [3, 3], facing: 'S', team: 1, support: 'equipGun', equip: { rhand: 'mythrilGun' } },
      { job: 'summoner', name: 'Sanctum Summoner', level: '+2', at: [1, 2], facing: 'S', team: 1, support: 'halfMp' },
      { job: 'geomancer', name: 'Sanctum Geomancer', level: '+2', at: [12, 4], facing: 'S', team: 1 },
      { job: 'priest', name: 'Sanctum Cleric', level: '+2', at: [7, 1], facing: 'S', team: 1, reaction: 'regenerator' },
    ],
    victory: { type: 'defeat', ids: ['zander'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'zander', 'My arm is not my own, Rhen. Something else holds the sword. Don\'t hold back — for Father\'s sake, don\'t!'],
          ['say', 'rhen', 'Zander… I\'ll bring you home. I swear it.', { mood: 'think' }],
        ],
      },
      {
        when: { hpBelow: ['zander', 50] },
        script: [
          ['camera', { at: 'zander', zoom: 1.2, time: 0.6 }],
          ['say', 'zander', 'Yes… like that. Strike true, little brother.'],
          ['say', 'zander', 'End it. End it, brother, and let me go to him.'],
          ['say', 'rhen', 'Zander…!', { mood: 'shout' }],
        ],
      },
    ],
    treasure: [[0, 5, 'xPotion', 'angelRing'], [13, 0, 'hiEther', 'sprintShoes']],
    rewards: { gil: 9000, items: ['runeBlade'] },
  },

  // --------------------------------------------------------------------------
  //  15. Murondel — the cloister: Rolf
  // --------------------------------------------------------------------------
  {
    id: 'b_murondel2', name: 'Murondel — The Cloister', map: 'murondel_cloister', music: 'battle3',
    maxDeploy: 5,
    hint: 'Rolf\'s arts shatter helmets and armour from three tiles away. Drive him from the loggia.',
    units: [
      {
        char: 'rolf', level: '+3', at: [6, 2], facing: 'S', team: 1, boss: true, hpMult: 1.8,
        equip: { rhand: 'iceBrand', lhand: 'platinumShield', head: 'platinumHelmet', body: 'platinumArmor', accessory: 'diamondArmlet' },
        reaction: 'counterFlood', support: 'defenseUp', movement: 'jump1',
      },
      { job: 'sanctumKnight', name: 'Sanctum Knight', level: '+2', at: [4, 2], facing: 'S', team: 1, reaction: 'counter' },
      { job: 'sanctumKnight', name: 'Sanctum Knight', level: '+2', at: [8, 2], facing: 'S', team: 1, reaction: 'weaponGuard' },
      { job: 'archer', name: 'Cloister Warden', level: '+2', at: [2, 1], facing: 'S', team: 1, support: 'concentrate' },
      { job: 'chemist', name: 'Cloister Apothecary', level: '+2', at: [10, 1], facing: 'S', team: 1, reaction: 'autoPotion' },
      { job: 'monk', name: 'Brother of the See', level: '+2', at: [4, 7], facing: 'S', team: 1, reaction: 'counter' },
      { job: 'mystic', name: 'Brother of the See', level: '+2', at: [9, 7], facing: 'S', team: 1 },
    ],
    victory: { type: 'defeat', ids: ['rolf'] },
    events: [
      {
        when: { hpBelow: ['rolf', 35] },
        script: [
          ['say', 'rolf', 'Hah… the old man\'s sword has not dulled with the years. Nor has the girl\'s temper.'],
          ['say', 'rolf', 'Very well. The chapel, then. Clement will teach you the rest of your manners.'],
          ['vfx', 'teleport', 'rolf'],
          ['retreat', 'rolf'],
          ['battleEnd', 'victory'],
        ],
      },
    ],
    treasure: [[6, 7, 'remedy', 'featherMantle'], [11, 2, 'hiEther', 'magicRing']],
    rewards: { gil: 9000, items: ['iceBrand'] },
  },

  // --------------------------------------------------------------------------
  //  16. Murondel — the great chapel: Clement
  // --------------------------------------------------------------------------
  {
    id: 'b_murondel3', name: 'Murondel — The Great Chapel', map: 'murondel_chapel', music: 'battle3',
    maxDeploy: 5,
    hint: 'Clement casts forbidden sorcery from behind the altar. Close the distance before his great spells resolve.',
    units: [
      {
        char: 'clement', level: '+3', at: [6, 2], facing: 'S', team: 1, boss: true, hpMult: 1.6,
        equip: { rhand: 'dragonRod', head: 'goldenHairpin', body: 'earthClothes', accessory: 'elvenMantle' },
        reaction: 'counterMagic', support: 'magicDefenseUp', movement: 'ignoreHeight',
      },
      { job: 'sanctumKnight', name: 'Sanctum Knight', level: '+2', at: [3, 5], facing: 'S', team: 1, reaction: 'counter' },
      { job: 'sanctumKnight', name: 'Sanctum Knight', level: '+2', at: [8, 5], facing: 'S', team: 1, reaction: 'weaponGuard' },
      { job: 'timeMage', name: 'Keeper of Hours', level: '+2', at: [2, 1], facing: 'S', team: 1, support: 'shortCharge' },
      { job: 'summoner', name: 'Choir Summoner', level: '+2', at: [9, 1], facing: 'S', team: 1, support: 'halfMp' },
      { job: 'wizard', name: 'Choir Magus', level: '+2', at: [10, 2], facing: 'S', team: 1, support: 'magicAttackUp' },
      { job: 'priest', name: 'Chapel Cleric', level: '+2', at: [2, 8], facing: 'S', team: 1, reaction: 'regenerator' },
    ],
    victory: { type: 'defeat', ids: ['clement'] },
    events: [
      {
        when: { hpBelow: ['clement', 35] },
        script: [
          ['say', 'clement', 'Enough, enough — I\'ve seen what I came to see. Rolf will be cross. I did promise him your head.'],
          ['say', 'clement', 'Do come to Orvelle, heretic. Bring the book. We\'ll be waiting at the bottom of the world.'],
          ['vfx', 'teleport', 'clement'],
          ['retreat', 'clement'],
          ['battleEnd', 'victory'],
        ],
      },
    ],
    treasure: [[9, 8, 'hiEther', 'holyMitre'], [1, 13, 'elixir', 'wizardRobe']],
    rewards: { gil: 10000, items: ['dragonRod'] },
  },

  // --------------------------------------------------------------------------
  //  17. Orvelle Abbey, fourth vault: Barrick
  // --------------------------------------------------------------------------
  {
    id: 'b_orvelle_b4', name: 'Orvelle Abbey — The Fourth Vault', map: 'orvelle_vault4', music: 'dungeon',
    maxDeploy: 5,
    hint: 'Barrick\'s relic gun reaches across the whole vault. Cross the bridge quickly, or go around the shaft.',
    units: [
      {
        char: 'barrick', level: '+3', at: [2, 3], facing: 'S', team: 1, boss: true, hpMult: 1.8,
        equip: { rhand: 'glacierGun', head: 'flashHat', body: 'blackRobe', accessory: 'defenseRing' },
        reaction: 'counter', support: 'concentrate', movement: 'moveHpUp',
      },
      { job: 'knight', name: 'Sanctum Man-at-Arms', level: '+2', at: [6, 2], facing: 'S', team: 1, secondary: 'samurai', reaction: 'weaponGuard' },
      { job: 'knight', name: 'Sanctum Man-at-Arms', level: '+2', at: [3, 6], facing: 'S', team: 1, secondary: 'geomancer', reaction: 'counter' },
      { job: 'monk', name: 'Vault Warden', level: '+2', at: [10, 6], facing: 'S', team: 1, reaction: 'counter' },
      { job: 'monk', name: 'Vault Warden', level: '+2', at: [1, 7], facing: 'S', team: 1, reaction: 'hpRestore' },
      { job: 'archer', name: 'Sanctum Marksman', level: '+2', at: [11, 1], facing: 'S', team: 1, support: 'concentrate', equip: { rhand: 'yoichiBow' } },
    ],
    victory: { type: 'defeat', ids: ['barrick'] },
    events: [
      {
        when: { hpBelow: ['barrick', 35] },
        script: [
          ['say', 'barrick', 'Bah! Shot\'s running short and the pay was never worth it. Keep your vault, then!'],
          ['say', 'barrick', 'I\'ll be further down, heretic. Everyone ends up further down.'],
          ['retreat', 'barrick'],
          ['battleEnd', 'victory'],
        ],
      },
    ],
    treasure: [[1, 1, 'elixir', 'ribbon'], [11, 12, 'xPotion', 'reflectRing'], [11, 3, 'hiEther', 'jadeArmlet']],
    rewards: { gil: 10000, items: ['yoichiBow'] },
  },

  // --------------------------------------------------------------------------
  //  18. Orvelle Abbey, fifth vault: Rolf & Clement
  // --------------------------------------------------------------------------
  {
    id: 'b_orvelle_b5', name: 'Orvelle Abbey — The Sealed Vault', map: 'orvelle_vault5', music: 'boss',
    maxDeploy: 5,
    hint: 'Defeat Rolf. Clement will not stay to die with him. The moat is deep — the causeways are the only dry roads to the dais.',
    units: [
      {
        char: 'rolf', level: '+4', at: [6, 7], facing: 'S', team: 1, boss: true, hpMult: 2,
        equip: { rhand: 'queensOath', lhand: 'crystalShield', head: 'crystalHelmet', body: 'crystalMail', accessory: 'germainBoots' },
        secondary: 'mystic', reaction: 'weaponGuard', support: 'defenseUp', movement: 'ignoreHeight',
      },
      {
        char: 'clement', level: '+4', at: [6, 5], facing: 'S', team: 1, boss: true, hpMult: 1.6,
        equip: { rhand: 'dragonRod', head: 'goldenHairpin', body: 'earthClothes', accessory: 'elvenMantle' },
        reaction: 'counterMagic', support: 'magicDefenseUp', movement: 'ignoreHeight',
      },
      { job: 'wizard', name: 'Sanctum Magus', level: '+3', at: [3, 1], facing: 'S', team: 1, support: 'magicAttackUp' },
      { job: 'wizard', name: 'Sanctum Magus', level: '+3', at: [9, 1], facing: 'S', team: 1, support: 'magicAttackUp' },
      { job: 'timeMage', name: 'Keeper of Hours', level: '+3', at: [1, 5], facing: 'S', team: 1, support: 'shortCharge' },
      { job: 'summoner', name: 'Sanctum Summoner', level: '+3', at: [11, 5], facing: 'S', team: 1, support: 'halfMp' },
      { job: 'summoner', name: 'Sanctum Summoner', level: '+3', at: [11, 1], facing: 'S', team: 1, support: 'halfMp' },
    ],
    victory: { type: 'defeat', ids: ['rolf'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'rolf', 'No more retreating, heretic. There is nowhere lower to go.'],
        ],
      },
      {
        when: { hpBelow: ['clement', 40] },
        script: [
          ['say', 'clement', 'No, no — I am not dying in a cellar. Not with the door so very close!'],
          ['say', 'rolf', 'Clement! Hold your ground, you coward!', { mood: 'shout' }],
          ['vfx', 'teleport', 'clement'],
          ['retreat', 'clement'],
        ],
      },
      {
        when: { hpBelow: ['rolf', 30] },
        script: [
          ['say', 'rolf', 'For the Commander… and for the Saint who will wake…'],
          ['say', 'rhen', 'There is no Saint to wake, Rolf. Only a demon, and the men who feed it.'],
        ],
      },
    ],
    treasure: [[1, 1, 'elixir', 'magicGauntlet'], [11, 10, 'hiEther', 'hundredGems']],
    rewards: { gil: 12000, items: ['queensOath'] },
  },

  // --------------------------------------------------------------------------
  //  19. The Necropolis of Murondel: Clement
  // --------------------------------------------------------------------------
  {
    id: 'b_necropolis', name: 'The Necropolis of Murondel', map: 'necropolis', music: 'boss',
    maxDeploy: 5,
    hint: 'Defeat Clement. His shadow-warriors move fast across the ruins, and the chasm to the east swallows the careless.',
    units: [
      {
        char: 'clement', level: '+5', at: [7, 1], facing: 'S', team: 1, boss: true, hpMult: 2,
        equip: { rhand: 'maceOfZeus', head: 'flashHat', body: 'blackGarb', accessory: 'featherMantle' },
        reaction: 'maSave', support: 'magicDefenseUp', movement: 'fly',
      },
      { job: 'ninja', name: 'Shadow of the See', level: '+3', at: [2, 3], facing: 'S', team: 1, reaction: 'reflexes' },
      { job: 'ninja', name: 'Shadow of the See', level: '+3', at: [13, 5], facing: 'S', team: 1, reaction: 'reflexes' },
      { job: 'timeMage', name: 'Keeper of Hours', level: '+3', at: [5, 2], facing: 'S', team: 1, secondary: 'lancer', support: 'shortCharge' },
      { job: 'timeMage', name: 'Keeper of Hours', level: '+3', at: [9, 2], facing: 'S', team: 1, support: 'shortCharge' },
      { job: 'samurai', name: 'Sanctum Blademaster', level: '+3', at: [4, 6], facing: 'S', team: 1, reaction: 'bladeGrasp' },
      { job: 'samurai', name: 'Sanctum Blademaster', level: '+3', at: [10, 7], facing: 'S', team: 1, reaction: 'bladeGrasp', equip: { rhand: 'kikuichimonji' } },
    ],
    victory: { type: 'defeat', ids: ['clement'] },
    events: [
      {
        when: { hpBelow: ['clement', 30] },
        script: [
          ['say', 'clement', 'There is no door left to run through… how perfectly dreadful.'],
          ['say', 'clement', 'Very well. If I must die in a tomb, I shall at least take a Valorne into it with me!'],
        ],
      },
    ],
    treasure: [[13, 8, 'elixir', 'masamune'], [1, 1, 'xPotion', 'bracer'], [13, 4, 'hiEther', 'featherBoots']],
    rewards: { gil: 12000, items: ['maceOfZeus'] },
  },

  // --------------------------------------------------------------------------
  //  20. The Lost Sanctum: Barrick's last stand
  // --------------------------------------------------------------------------
  {
    id: 'b_lostsanctum', name: 'The Lost Sanctum', map: 'lost_sanctum', music: 'boss',
    maxDeploy: 5,
    hint: 'Defeat Barrick. The beasts of the Sanctum fly over the void; your people must keep to the stairs between the islands.',
    units: [
      {
        char: 'barrick', level: '+5', at: [6, 2], facing: 'S', team: 1, boss: true, hpMult: 2.2,
        equip: { rhand: 'blastGun', head: 'thiefsCap', body: 'lightRobe', accessory: 'featherMantle' },
        reaction: 'counter', support: 'concentrate', movement: 'moveHpUp',
      },
      {
        job: 'chemist', name: 'Sanctum Apothecary', level: '+3', at: [7, 1], facing: 'S', team: 1,
        support: 'equipGun', reaction: 'autoPotion', equip: { rhand: 'glacierGun' },
      },
      { job: 'darkBehemoth', level: '+3', at: [1, 6], facing: 'E', team: 1 },
      { job: 'tiamat', level: '+3', at: [7, 6], facing: 'S', team: 1 },
      { job: 'hydra', level: '+2', at: [11, 6], facing: 'W', team: 1 },
      { job: 'greaterHydra', level: '+2', at: [12, 8], facing: 'W', team: 1 },
    ],
    victory: { type: 'defeat', ids: ['barrick'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'barrick', 'No tricks and no running, this time. The Sanctum owes you an honest fight, and I\'m all the Sanctum there is left.'],
        ],
      },
      {
        when: { hpBelow: ['barrick', 30] },
        script: [
          ['say', 'barrick', 'Ha! That stung. Come on, then — I\'ve still one more barrel of shot and a whole lot of spite!'],
        ],
      },
    ],
    treasure: [[13, 5, 'elixir', 'robeOfLords'], [0, 4, 'remedy', 'kikuichimonji'], [2, 2, 'xPotion', 'reflectMail']],
    rewards: { gil: 14000, items: ['blastGun'] },
  },

  // --------------------------------------------------------------------------
  //  21. The Airship Graveyard: Volmar becomes Astaroth
  // --------------------------------------------------------------------------
  {
    id: 'b_astaroth', name: 'The Airship Graveyard', map: 'airship_graveyard', music: 'boss',
    maxDeploy: 5,
    forced: ['melisande'],
    hint: 'Volmar will not fight long as a man. When the lion wakes, beware the Stasis Decree — spread your people out.',
    units: [
      {
        char: 'volmar', level: '+5', at: [8, 2], facing: 'S', team: 1, boss: true, hpMult: 2,
        equip: { rhand: 'runeBlade', lhand: 'crystalShield', head: 'crystalHelmet', body: 'crystalMail', accessory: 'elvenMantle' },
        reaction: 'counter', support: 'defenseUp', movement: 'move1',
      },
      { id: 'astaroth', job: 'astaroth', name: 'Astaroth', level: '+6', at: [8, 2], facing: 'S', team: 1, boss: true, hpMult: 4, hidden: true, noLoot: true },
      { job: 'sanctumKnight', name: 'Sanctum Knight', level: '+3', at: [4, 2], facing: 'S', team: 1, reaction: 'counter' },
      { job: 'sanctumKnight', name: 'Sanctum Knight', level: '+3', at: [12, 3], facing: 'S', team: 1, reaction: 'weaponGuard' },
      { job: 'revenant', name: 'Drowned Aeronaut', level: '+3', at: [6, 6], facing: 'S', team: 1 },
      { job: 'revenant', name: 'Drowned Aeronaut', level: '+3', at: [10, 7], facing: 'S', team: 1 },
    ],
    victory: { type: 'defeat', ids: ['astaroth'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'volmar', 'Come, daughter. Show me what the heretic has taught you that I could not.'],
          ['say', 'melisande', 'He taught me to look, Father. That is all. You never did.'],
        ],
      },
      {
        when: { hpBelow: ['volmar', 50] },
        script: [
          ['camera', { at: 'volmar', zoom: 1.2, time: 0.8 }],
          ['say', 'volmar', 'Hah… strong. Strong enough, at last, that I may stop pretending to be a man.'],
          ['say', 'volmar', 'Stone of the Lion — I am done with this flesh. Wake, and be hungry!'],
          ['music', 'umbral'],
          ['vfx', 'buff', 'volmar'],
          ['shake', 0.5, 1.4],
          ['flash', '#f0c850', 0.9],
          ['retreat', 'volmar'],
          ['reveal', 'astaroth'],
          ['sfx', 'roar'],
          ['say', 'astaroth', 'I am Astaroth, who binds the world in golden order. Kneel, little things, and be arranged.'],
          ['say', 'melisande', 'Father…', { mood: 'whisper' }],
        ],
      },
      {
        when: { hpBelow: ['astaroth', 25] },
        script: [
          ['say', 'astaroth', 'Disorder… everywhere, disorder… a heretic, a traitor\'s daughter, an old man who will not die…'],
          ['say', 'rhen', 'Then let there be disorder. Every living thing you tried to arrange is standing against you.'],
        ],
      },
    ],
    treasure: [[1, 1, 'elixir', 'crystalMail'], [12, 1, 'xPotion', 'reflectMail'], [8, 5, 'hiEther', 'angelRing']],
    rewards: { gil: 15000, items: ['ragnarok', 'elixir'] },
  },

  // --------------------------------------------------------------------------
  //  22. The last sky-ship: Altessa, the Crimson Seraph
  // --------------------------------------------------------------------------
  {
    id: 'b_altessa', name: 'Altessa, the Crimson Seraph', map: 'airship_deck', music: 'finalBoss',
    maxDeploy: 5,
    hint: 'The Seraph wears Alys\'s body. Break the saint\'s borrowed shape — and then face what lies beneath it.',
    units: [
      { id: 'altessaHost', job: 'altessaHost', name: 'Saint Altessa', level: '+7', at: [5, 2], facing: 'S', team: 1, boss: true, hpMult: 5, noLoot: true },
      { id: 'altessa', job: 'altessa', name: 'Altessa', level: '+8', at: [6, 2], facing: 'S', team: 1, boss: true, hpMult: 6, hidden: true, noLoot: true },
      { job: 'revenant', name: 'Shade of the Host', level: '+4', at: [2, 6], facing: 'S', team: 1 },
      { job: 'revenant', name: 'Shade of the Host', level: '+4', at: [9, 6], facing: 'S', team: 1 },
      {
        char: 'alys', job: 'cleric', level: '+2', at: [6, 11], facing: 'N', team: 0, ai: 'support', hidden: true,
        equip: { rhand: 'sageStaff', head: 'goldenHairpin', body: 'lightRobe', accessory: 'angelRing' },
        reaction: 'regenerator', support: 'shortCharge',
      },
    ],
    victory: { type: 'defeat', ids: ['altessa'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'altessaHost', 'Sing for me, Valorne. Everyone sings, at the end.'],
          ['say', 'rhen', 'Alys — if you can hear me — hold on. Just a little longer.', { mood: 'think' }],
        ],
      },
      {
        when: { ko: 'altessaHost' },
        script: [
          ['camera', { at: 'altessaHost', zoom: 1.3, time: 0.8 }],
          ['say', 'altessaHost', 'No… NO. This flesh is cracking — the girl — the girl is fighting me! How can a vessel—'],
          ['say', 'alys', 'Get… OUT… of me!', { mood: 'shout' }],
          ['flash', '#ff2040', 1.0],
          ['shake', 0.6, 1.5],
          ['vfx', 'holy', 'altessaHost'],
          ['retreat', 'altessaHost'],
          ['music', 'finalBoss'],
          ['reveal', 'altessa'],
          ['reveal', 'alys'],
          ['vfx', 'revive', 'alys'],
          ['say', 'alys', 'Brother! I\'m here — it\'s me! I heard you, the whole time. Every word.'],
          ['say', 'rhen', 'Alys! Stay behind me!', { mood: 'shout' }],
          ['say', 'alys', 'No. Beside you. I\'m a Valorne too, remember? We never suffer injustice.'],
          ['sfx', 'demon'],
          ['say', 'altessa', 'Insolent vessel. Then I shall take you back by force — and tear this sky in two to do it!'],
        ],
      },
      {
        when: { hpBelow: ['altessa', 30] },
        script: [
          ['say', 'altessa', 'Impossible… a thousand years of prayer… undone by a heretic and a novice…'],
          ['say', 'alys', 'Not a heretic. My brother.'],
        ],
      },
    ],
  },
];
