// ============================================================================
//  Chapter III — "The Brave and the Damned": the eleven story battles.
//  Levels are relative to the party (Ch.III party ≈ 18–30). Generic enemies
//  get their gear from the shop tier; named units keep their CharacterDef kit
//  unless overridden here.
// ============================================================================
import type { BattleDef } from '../types';

export const battles: BattleDef[] = [
  // --------------------------------------------------------------------------
  //  1. Colgrave — save Oren Durant from a gang of cutpurses and fences.
  // --------------------------------------------------------------------------
  {
    id: 'b_colgrave', name: 'Colgrave, the Coal Streets', map: 'colgrave_streets', music: 'battle1', maxDeploy: 5,
    hint: 'Oren must not fall. Cutpurses hold the street and the roofs; two fences with guns watch from the colliery yard above.',
    units: [
      { char: 'oren', level: '+0', at: [11, 7], facing: 'W', team: 0, ai: 'defensive', vip: true },
      { id: 'cutpurse1', job: 'thief', gender: 'f', name: 'Coal-Street Cutpurse', level: '-1', at: [6, 6], facing: 'E', team: 1, learned: ['stealHeart', 'stealGil'], reaction: 'catch' },
      { id: 'cutpurse2', job: 'thief', gender: 'f', name: 'Coal-Street Cutpurse', level: '+0', at: [14, 4], facing: 'W', team: 1, learned: ['stealArmor', 'stealGil'] },
      { id: 'cutpurse3', job: 'thief', gender: 'f', name: 'Rooftop Cutpurse', level: '-1', at: [6, 4], facing: 'S', team: 1, learned: ['stealHeart', 'stealWeapon'], movement: 'jump2' },
      { id: 'fence1', job: 'chemist', gender: 'm', name: 'Colliery Fence', level: '+0', at: [8, 2], facing: 'S', team: 1, equip: { rhand: 'ormandyGun' }, learned: ['useHiPotion', 'usePhoenixDown'] },
      { id: 'fence2', job: 'chemist', gender: 'm', name: 'Colliery Fence', level: '-1', at: [13, 1], facing: 'S', team: 1, equip: { rhand: 'ormandyGun' }, learned: ['usePotion', 'useRemedy'] },
      { id: 'haggler', job: 'orator', gender: 'm', name: 'Gang Boss', level: '+1', at: [2, 3], facing: 'E', team: 1, learned: ['intimidate', 'insult', 'condemn'] },
    ],
    victory: { type: 'defeatAll' },
    protect: ['oren'],
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'haggler', 'A scholar\'s purse, a scholar\'s boots and a scholar\'s fancy spyglass. Take the lot, girls. Leave him the stars.'],
          ['say', 'oren', 'The stars were never mine to leave! Though I would dearly like to keep the spyglass.'],
          ['say', 'rhen', 'Hold on, stargazer — we\'re coming up!', { mood: 'shout' }],
        ],
      },
      {
        when: { hpBelow: ['oren', 40] },
        script: [['say', 'oren', 'Ah — that is my blood, isn\'t it. How very instructive. Quickly, if you please!']],
      },
    ],
    treasure: [[0, 6, 'hiPotion', 'remedy'], [10, 0, 'ether', 'hiEther'], [14, 8, 'phoenixDown', 'elixir']],
    rewards: { gil: 2400, items: ['xPotion', 'xPotion'] },
  },

  // --------------------------------------------------------------------------
  //  2. Lesandre — Inquisitor Zalmon names Rhen a heretic. Alys fights beside him.
  // --------------------------------------------------------------------------
  {
    id: 'b_lesandre', name: 'Lesandre, the Royal Plaza', map: 'lesandre_plaza', music: 'tension', maxDeploy: 5,
    hint: 'Drive Inquisitor Zalmon off the terrace. Keep Alys alive — she will shield you if she can.',
    units: [
      { char: 'alys', job: 'cleric', level: '+0', at: [8, 13], facing: 'N', team: 0, ai: 'support', vip: true, hpMult: 1.5, statuses: ['protect', 'shell'] },
      { char: 'zalmon', level: '+2', at: [8, 2], facing: 'S', team: 1, boss: true, hpMult: 1.3, movement: 'moveHpUp' },
      { id: 'churchKnight1', job: 'knight', gender: 'm', name: 'Church Knight', level: '+0', at: [8, 5], facing: 'S', team: 1, learned: ['sunderArmor', 'sunderPower'] },
      { id: 'churchKnight2', job: 'knight', gender: 'm', name: 'Church Knight', level: '+0', at: [4, 5], facing: 'S', team: 1, learned: ['sunderWeapon', 'sunderSpeed'] },
      { id: 'churchKnight3', job: 'knight', gender: 'm', name: 'Church Knight', level: '-1', at: [12, 5], facing: 'S', team: 1, learned: ['sunderHelm', 'sunderMind'] },
      { id: 'sister1', job: 'monk', gender: 'f', name: 'Sister of the Rod', level: '+0', at: [6, 6], facing: 'S', team: 1, learned: ['shockwave', 'stigmata', 'chakra'] },
      { id: 'sister2', job: 'monk', gender: 'f', name: 'Sister of the Rod', level: '-1', at: [10, 6], facing: 'S', team: 1, learned: ['spinningFist', 'earthRend', 'revive'] },
    ],
    victory: { type: 'defeat', ids: ['zalmon'] },
    protect: ['alys'],
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'zalmon', 'Brothers, sisters — the heretic stands in the king\'s own square! Seize him, and the girl who shields him!', { mood: 'shout' }],
          ['say', 'alys', 'Then you will have to seize me first, Inquisitor. I am not afraid of you.'],
        ],
      },
      {
        when: { hpBelow: ['zalmon', 40] },
        script: [
          ['say', 'zalmon', 'Gah — the devil lends his servants strength! This changes nothing, Valorne. Your name is written, and the Church does not unwrite.'],
          ['say', 'zalmon', 'Run, then. Run to the ends of Ivaldis. There is no road on which the Glorian Church will not be waiting.'],
          ['retreat', 'zalmon'],
          ['battleEnd', 'victory'],
        ],
      },
    ],
    treasure: [[15, 13, 'holyWater', 'remedy'], [3, 1, 'hiEther', 'elixir']],
    rewards: { gil: 3000, items: ['holyMitre'] },
  },

  // --------------------------------------------------------------------------
  //  3. Orvelle Abbey, second vault — Sanctum retainers in the undercroft library.
  // --------------------------------------------------------------------------
  {
    id: 'b_orvelle_b2', name: 'Orvelle Abbey — Second Vault', map: 'orvelle_vault2', music: 'dungeon', maxDeploy: 5,
    hint: 'Sanctum lancers and chronomancers. The ramp to the south and the stair to the north both lead down from the gallery.',
    units: [
      { id: 'lancer1', job: 'lancer', gender: 'm', name: 'Sanctum Lancer', level: '+0', at: [7, 3], facing: 'E', team: 1, learned: ['jump', 'jumpH3', 'jumpV3'] },
      { id: 'lancer2', job: 'lancer', gender: 'm', name: 'Sanctum Lancer', level: '+0', at: [8, 8], facing: 'E', team: 1, learned: ['jump', 'jumpH3', 'jumpV4'] },
      { id: 'lancer3', job: 'lancer', gender: 'm', name: 'Sanctum Lancer', level: '-1', at: [4, 6], facing: 'E', team: 1, learned: ['jump', 'jumpH2', 'jumpV3'] },
      { id: 'vaultChemist', job: 'chemist', gender: 'm', name: 'Sanctum Almoner', level: '-1', at: [2, 10], facing: 'E', team: 1, learned: ['useHiPotion', 'usePhoenixDown', 'useRemedy'] },
      { id: 'chrono1', job: 'timeMage', gender: 'm', name: 'Sanctum Chronomancer', level: '+0', at: [1, 5], facing: 'E', team: 1, learned: ['haste', 'slow', 'stop', 'immobilize'] },
      { id: 'chrono2', job: 'timeMage', gender: 'm', name: 'Sanctum Chronomancer', level: '-1', at: [2, 7], facing: 'E', team: 1, learned: ['haste', 'slow', 'quick', 'gravity'] },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'lancer1', 'Intruders on the gallery! Brothers, quicken us — let not one of them reach the lower stair!', { mood: 'shout' }],
        ],
      },
    ],
    treasure: [[13, 3, 'hiEther', 'magicRing'], [1, 11, 'phoenixDown', 'elixir']],
    rewards: { gil: 3200, items: ['hiEther'] },
  },

  // --------------------------------------------------------------------------
  //  4. Orvelle Abbey, third vault — Isidore Tengel among the tombs.
  // --------------------------------------------------------------------------
  {
    id: 'b_orvelle_b3', name: 'Orvelle Abbey — Third Vault', map: 'orvelle_vault3', music: 'boss', maxDeploy: 5,
    hint: 'Isidore leaps from afar and strikes from above. Wound him badly and he will break off. The summoner below the tombs is closer than he looks.',
    units: [
      {
        char: 'isidore', level: '+2', at: [2, 2], facing: 'S', team: 1, boss: true, hpMult: 1.2,
        secondary: 'lancer', learned: ['jump', 'jumpH5', 'jumpV5'], movement: 'ignoreHeight', support: 'maintenance',
      },
      { id: 'cryptKnight1', job: 'knight', gender: 'm', name: 'Sanctum Man-at-Arms', level: '+0', at: [7, 4], facing: 'S', team: 1, learned: ['sunderWeapon', 'sunderArmor'] },
      { id: 'cryptKnight2', job: 'knight', gender: 'm', name: 'Sanctum Man-at-Arms', level: '+0', at: [10, 5], facing: 'S', team: 1, learned: ['sunderShield', 'sunderSpeed'] },
      { id: 'cryptArcher1', job: 'archer', gender: 'm', name: 'Sanctum Bowman', level: '+1', at: [8, 2], facing: 'S', team: 1, learned: ['aim2', 'aim4'], support: 'concentrate' },
      { id: 'cryptArcher2', job: 'archer', gender: 'm', name: 'Sanctum Bowman', level: '+0', at: [4, 8], facing: 'E', team: 1, learned: ['aim2', 'aim3'] },
      { id: 'cryptSummoner', job: 'summoner', gender: 'm', name: 'Sanctum Invoker', level: '+0', at: [7, 12], facing: 'E', team: 1, learned: ['shiva', 'ifrit', 'titan'] },
    ],
    victory: { type: 'defeat', ids: ['isidore'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'isidore', 'In the name of Saint Auren and the Sanctum, I will not let a heretic walk these tombs. Have at you!'],
        ],
      },
      {
        when: { hpBelow: ['isidore', 50] },
        script: [
          ['say', 'isidore', 'Ngh... You fight like a man with nothing left to lose. I, however, have a duty yet undone.'],
          ['say', 'isidore', 'The stone was never down here — the old abbot lied to us all. Then it lies above... beneath the Saint\'s own altar!'],
          ['retreat', 'isidore'],
          ['battleEnd', 'victory'],
        ],
      },
    ],
    treasure: [[3, 11, 'hiPotion', 'nightshadeArmlet'], [13, 1, 'ether', 'jadeArmlet']],
    rewards: { gil: 3600, items: ['diamondHelmet'] },
  },

  // --------------------------------------------------------------------------
  //  5. Orvelle Abbey chapel — Wolfram Fell, now in Sanctum white.
  // --------------------------------------------------------------------------
  {
    id: 'b_orvelle_b1', name: 'Orvelle Abbey — The Chapel', map: 'orvelle_chapel', music: 'boss', maxDeploy: 5,
    hint: 'Wolfram\'s sacred blade reaches far and cuts through ranks. Spread out. Archers hold the choir gallery; a wizard hides on the book-press.',
    units: [
      {
        char: 'wolfram', level: '+2', at: [6, 7], facing: 'S', team: 1, boss: true, hpMult: 1.2,
        secondary: 'sanctumKnight', learned: ['sanctumMailrend', 'sanctumSwordbane', 'sanctumCrownsplitter'],
        reaction: 'counter', support: 'maintenance', movement: 'move1',
      },
      { id: 'chapelKnight1', job: 'knight', gender: 'f', name: 'Sanctum Sister-at-Arms', level: '-1', at: [2, 5], facing: 'S', team: 1, learned: ['sunderArmor', 'sunderMana'] },
      { id: 'chapelKnight2', job: 'knight', gender: 'f', name: 'Sanctum Sister-at-Arms', level: '-1', at: [8, 5], facing: 'S', team: 1, learned: ['sunderWeapon', 'sunderPower'] },
      { id: 'chapelArcher1', job: 'archer', gender: 'f', name: 'Sanctum Bowwoman', level: '+0', at: [10, 6], facing: 'W', team: 1, learned: ['aim2', 'aim4'] },
      { id: 'chapelArcher2', job: 'archer', gender: 'f', name: 'Sanctum Bowwoman', level: '-1', at: [11, 8], facing: 'W', team: 1, learned: ['aim2', 'aim3'] },
      { id: 'chapelWizard', job: 'wizard', gender: 'f', name: 'Sanctum Magus', level: '+0', at: [2, 9], facing: 'E', team: 1, learned: ['fira', 'thundara', 'blizzara', 'poison'] },
    ],
    victory: { type: 'defeat', ids: ['wolfram'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'wolfram', 'At Fovain you ran from me with your cadets. There is nowhere to run in a chapel, Valorne.'],
        ],
      },
      {
        when: { hpBelow: ['wolfram', 50] },
        script: [
          ['say', 'wolfram', 'Hah... You have grown. So have I. But I did not come here to die for the Church — only to take what it is owed.'],
          ['say', 'wolfram', 'Hold them, sisters. I have an altar to rob.'],
          ['retreat', 'wolfram'],
          ['battleEnd', 'victory'],
        ],
      },
    ],
    treasure: [[11, 1, 'holyWater', 'whiteRobe'], [1, 14, 'hiPotion', 'reflectRing']],
    rewards: { gil: 4200, items: ['diamondArmor'] },
  },

  // --------------------------------------------------------------------------
  //  6. Grogmoor Hill — mendicant brothers in the Church's pay want the book.
  // --------------------------------------------------------------------------
  {
    id: 'b_grogmoor', name: 'Grogmoor Hill', map: 'grogmoor_hill', music: 'battle2', maxDeploy: 5,
    hint: 'The moor rises in three great steps. The track is the slow way up; units that can jump four will find quicker ones.',
    units: [
      { id: 'brother1', job: 'monk', gender: 'm', name: 'Mendicant Brother', level: '+1', at: [3, 5], facing: 'S', team: 1, learned: ['spinningFist', 'shockwave', 'chakra'] },
      { id: 'brother2', job: 'monk', gender: 'm', name: 'Mendicant Brother', level: '+1', at: [8, 5], facing: 'S', team: 1, learned: ['aurablast', 'earthRend', 'revive'] },
      { id: 'brother3', job: 'monk', gender: 'm', name: 'Mendicant Brother', level: '+0', at: [11, 6], facing: 'S', team: 1, learned: ['spinningFist', 'secretFist', 'stigmata'] },
      { id: 'almoner1', job: 'chemist', gender: 'm', name: 'Mendicant Almoner', level: '+1', at: [7, 1], facing: 'S', team: 1, equip: { rhand: 'mythrilGun' }, learned: ['useXPotion', 'usePhoenixDown'] },
      { id: 'almoner2', job: 'chemist', gender: 'm', name: 'Mendicant Almoner', level: '+0', at: [13, 4], facing: 'S', team: 1, equip: { rhand: 'ormandyGun' }, learned: ['useHiPotion', 'useRemedy'] },
      { id: 'prior', job: 'priest', gender: 'm', name: 'Prior Anselm', level: '+2', at: [4, 2], facing: 'S', team: 1, learned: ['cura', 'raise', 'protect', 'holy'] },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'prior', 'Give up the book, children, and walk on in peace. Keep it, and you shall have the peace of the grave instead.'],
        ],
      },
    ],
    treasure: [[13, 0, 'ether', 'germainBoots'], [0, 12, 'hiPotion', 'xPotion']],
    rewards: { gil: 3400, items: ['twistHeadband'] },
  },

  // --------------------------------------------------------------------------
  //  7. Yardale — Malik hunts his sister Rana with Riverain's shadows.
  // --------------------------------------------------------------------------
  {
    id: 'b_yardale', name: 'Yardale, the South Gate', map: 'yardale_town', music: 'battle3', maxDeploy: 5,
    hint: 'Rana is cornered in the square beyond the gate. The ninjas are swift and throw from afar; the summoners on the roofs strike wide. Reach her quickly.',
    units: [
      { char: 'rana', level: '+0', at: [7, 6], facing: 'N', team: 0, ai: 'defensive', vip: true },
      { char: 'malik', level: '+1', at: [7, 1], facing: 'S', team: 1, boss: true, hpMult: 1.3 },
      { id: 'shade1', job: 'ninja', gender: 'm', name: 'Riverain Shade', level: '+0', at: [2, 3], facing: 'E', team: 1, learned: ['throwShuriken', 'throwKnife', 'throwSword'] },
      { id: 'shade2', job: 'ninja', gender: 'm', name: 'Riverain Shade', level: '+0', at: [12, 5], facing: 'W', team: 1, learned: ['throwShuriken', 'throwBall', 'throwKnife'] },
      { id: 'shade3', job: 'ninja', gender: 'm', name: 'Riverain Shade', level: '-1', at: [5, 1], facing: 'S', team: 1, learned: ['throwShuriken', 'throwFlail'] },
      { id: 'caller1', job: 'summoner', gender: 'f', name: 'Riverain Caller', level: '+0', at: [4, 4], facing: 'S', team: 1, learned: ['titan', 'ifrit', 'shiva'] },
      { id: 'caller2', job: 'summoner', gender: 'f', name: 'Riverain Caller', level: '-1', at: [10, 5], facing: 'S', team: 1, learned: ['titan', 'thorvald', 'mogwen'] },
    ],
    victory: { type: 'defeatAll' },
    protect: ['rana'],
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'malik', 'Finish it quickly. She is fast, and she knows every trick we know — she taught us half of them.'],
          ['say', 'rana', 'Then come and learn the other half, Malik!', { mood: 'shout' }],
        ],
      },
      {
        when: { hpBelow: ['malik', 30] },
        script: [
          ['say', 'malik', 'Damn you, heretic. Damn you both... This is not finished, Rana. He will not let it be finished.'],
          ['retreat', 'malik'],
        ],
      },
      {
        when: { hpBelow: ['rana', 35] },
        script: [['say', 'rana', 'I\'m not dying in Yardale... Not before he answers for it!']],
      },
    ],
    treasure: [[0, 13, 'hiEther', 'sprintShoes'], [14, 2, 'xPotion', 'jadeArmlet']],
    rewards: { gil: 4000, items: ['nightfallStar', 'nightfallStar'] },
  },

  // --------------------------------------------------------------------------
  //  8. Yewgrove — Barrington's hirelings and the dead they have raised.
  // --------------------------------------------------------------------------
  {
    id: 'b_yewgrove', name: 'Yewgrove', map: 'yewgrove_woods', music: 'dungeon', maxDeploy: 5,
    hint: 'The dead may rise again when their count runs out. Fire, holy water and phoenix down will keep them down. The mages hold the barrow mound.',
    units: [
      { id: 'hireling1', job: 'timeMage', gender: 'f', name: 'Riverain Hireling', level: '+1', at: [2, 2], facing: 'S', team: 1, learned: ['haste', 'slow', 'stop', 'immobilize'] },
      { id: 'hireling2', job: 'timeMage', gender: 'f', name: 'Riverain Hireling', level: '+0', at: [5, 1], facing: 'S', team: 1, learned: ['haste', 'slowja', 'gravity'] },
      { id: 'hexer1', job: 'wizard', gender: 'm', name: 'Grave-Hexer', level: '+1', at: [11, 2], facing: 'S', team: 1, learned: ['firaga', 'thundara', 'blizzara', 'death'] },
      { id: 'hexer2', job: 'wizard', gender: 'm', name: 'Grave-Hexer', level: '+1', at: [12, 3], facing: 'S', team: 1, learned: ['fira', 'thundaga', 'poison', 'frogSpell'] },
      { id: 'ghoul', job: 'ghoul', level: '+1', at: [3, 7], facing: 'S', team: 1, name: 'Yewgrove Dead' },
      { id: 'revenant', job: 'revenant', level: '+0', at: [10, 5], facing: 'S', team: 1, name: 'Yewgrove Dead' },
      { id: 'gust', job: 'gust', level: '+0', at: [6, 5], facing: 'S', team: 1, name: 'Yewgrove Dead' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'hexer1', 'The Grand Duke pays by the head, and he is not particular whether the heads are still attached. Up, you sleepers — up!'],
        ],
      },
    ],
    treasure: [[3, 1, 'holyWater', 'vampireMantle'], [13, 13, 'phoenixDown', 'elixir']],
    rewards: { gil: 3800, items: ['holyWater', 'holyWater', 'powerSleeve'] },
  },

  // --------------------------------------------------------------------------
  //  9. Riverain Castle gate — Malik and the Grand Duke's garrison.
  // --------------------------------------------------------------------------
  {
    id: 'b_riverain_gate', name: 'Riverain Castle — The Gate', map: 'riverain_gate', music: 'battle3', maxDeploy: 5, forced: ['rana'],
    hint: 'Archers hold the wall-walk; stairs climb to it at either end of the ledge. The moat is deep — the drawbridge is the dry road. Rana will not strike her brother down if she can help it.',
    units: [
      { char: 'malik', level: '+2', at: [7, 2], facing: 'S', team: 1, boss: true, hpMult: 1.4 },
      { id: 'wallArcher1', job: 'archer', gender: 'f', name: 'Riverain Crossbow', level: '+1', at: [2, 2], facing: 'S', team: 1, equip: { rhand: 'nightKiller' }, learned: ['aim3', 'aim5'] },
      { id: 'wallArcher2', job: 'archer', gender: 'f', name: 'Riverain Crossbow', level: '+1', at: [10, 2], facing: 'S', team: 1, learned: ['aim3', 'aim4'] },
      { id: 'wallArcher3', job: 'archer', gender: 'f', name: 'Riverain Crossbow', level: '+0', at: [12, 3], facing: 'S', team: 1, learned: ['aim2', 'aim4'] },
      { id: 'gateKnight1', job: 'knight', gender: 'm', name: 'Riverain Guardsman', level: '+1', at: [3, 4], facing: 'S', team: 1, learned: ['sunderArmor', 'sunderSpeed'] },
      { id: 'gateKnight2', job: 'knight', gender: 'm', name: 'Riverain Guardsman', level: '+1', at: [7, 4], facing: 'S', team: 1, learned: ['sunderWeapon', 'sunderMind'] },
      { id: 'gateKnight3', job: 'knight', gender: 'm', name: 'Moat Warden', level: '+2', at: [11, 5], facing: 'S', team: 1, equip: { accessory: 'featherBoots' }, learned: ['sunderShield', 'sunderPower'] },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'malik', 'Shoot the heretic first. Leave my sister for me.'],
          ['say', 'rana', 'Malik — please. Don\'t make me do this.'],
        ],
      },
      {
        when: { hpBelow: ['malik', 40] },
        script: [
          ['say', 'rana', 'Malik, stop! It\'s over — you\'re bleeding!', { mood: 'shout' }],
          ['say', 'malik', 'Over? Nothing is over while he lives... Stay out of the castle, Rana. For once in your life, listen to me.'],
          ['retreat', 'malik'],
        ],
      },
    ],
    treasure: [[0, 4, 'hiEther', 'defenseArmlet'], [14, 13, 'xPotion', 'diamondShield']],
    rewards: { gil: 4400, items: ['diamondSword'] },
  },

  // --------------------------------------------------------------------------
  // 10. Riverain keep — Wolfram alone. When he falls, the Ram rises.
  // --------------------------------------------------------------------------
  {
    id: 'b_beleth', name: 'Riverain Castle — The Throne Hall', map: 'riverain_keep', music: 'boss', maxDeploy: 5,
    hint: 'Wolfram fights alone and holds nothing back. Whatever happens when he falls — be ready. Silence and immobility are said to bind the Ram.',
    units: [
      {
        char: 'wolfram', level: '+2', at: [6, 3], facing: 'S', team: 1, boss: true, hpMult: 1.0,
        secondary: 'monk', learned: ['shockwave', 'earthRend'], reaction: 'counter', support: 'maintenance', movement: 'move1',
      },
      { job: 'beleth', id: 'beleth', boss: true, hpMult: 3, level: '+4', at: [6, 2], facing: 'S', team: 1, hidden: true, noLoot: true },
    ],
    victory: { type: 'defeat', ids: ['beleth'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'wolfram', 'Come, then. No sisters-at-arms, no Sanctum at my back. Only you, and me, and the thing between us.'],
        ],
      },
      {
        when: { ko: 'wolfram' },
        script: [
          ['say', 'wolfram', 'No... not like this. Not on my knees before a Valorne...'],
          ['say', 'wolfram', 'You want the rest of me, stone? Then take it. Take all of it — only give me the strength to finish this!', { mood: 'shout' }],
          ['sfx', 'thunderclap'],
          ['flash', '#ff5020', 1.0],
          ['shake', 0.6, 1.2],
          ['retreat', 'wolfram'],
          ['reveal', 'beleth'],
          ['vfx', 'dark', 'beleth'],
          ['music', 'umbral'],
          ['say', 'beleth', 'Ahh... a vessel burned down to its last ember, and still it clutches at hate. Such fine kindling.'],
          ['say', 'beleth', 'I am Beleth, the Horned Tyrant. The knight you knew is ash, little Valorne. Come — warm yourselves at what is left of him.'],
        ],
      },
      {
        when: { hpBelow: ['beleth', 30] },
        script: [
          ['say', 'beleth', 'This flesh... still resists me? Be still, knight. Your sister is dust. There is nothing left for you to want.'],
        ],
      },
    ],
    treasure: [[1, 12, 'elixir', 'elixir']],
    rewards: { gil: 6000, items: ['elixir', 'holyMitre'] },
  },

  // --------------------------------------------------------------------------
  // 11. Riverain rooftop — the Marquis Elmond and his handmaidens.
  // --------------------------------------------------------------------------
  {
    id: 'b_riverain_roof', name: 'Riverain Castle — The Rooftop', map: 'riverain_roof', music: 'boss', maxDeploy: 5,
    forced: ['rana'],
    hint: 'Cerise and Lida move before almost anyone and kill with a kiss — and they will go for Rana first. Wound any of the three badly and the Marquis will call the dance to an end.',
    units: [
      { char: 'elmond', level: '+5', at: [9, 9], facing: 'W', team: 1, boss: true, hpMult: 2 },
      { char: 'cerise', level: '+4', at: [10, 6], facing: 'W', team: 1, boss: true, hpMult: 1.3 },
      { char: 'lida', level: '+4', at: [8, 10], facing: 'W', team: 1, boss: true, hpMult: 1.3 },
    ],
    victory: { type: 'defeat', ids: ['elmond'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'cerise', 'Oh, the little knight has friends. May we, my lord? Only a few of them. Only the loud ones.'],
          ['say', 'elmond', 'Be gentle with the Galthane girl, Cerise. The others you may break however you like.'],
        ],
      },
      {
        when: { hpBelow: ['elmond', 50] },
        script: [
          ['say', 'elmond', 'Ah. You have drawn my blood, Valorne. It has been a very long while since anyone did that.'],
          ['say', 'elmond', 'Enough, my dears. We came for a book and a stone, not a brawl on the slates. Let us leave them to their rain.'],
          ['retreat', 'elmond'], ['retreat', 'cerise'], ['retreat', 'lida'],
          ['battleEnd', 'victory'],
        ],
      },
      {
        when: { hpBelow: ['cerise', 30] },
        script: [
          ['say', 'cerise', 'He cut me! My lord, he cut me — may I kill him now? Properly?'],
          ['say', 'elmond', 'No, Cerise. Enough. We have lingered past our welcome, and we were never welcome to begin with.'],
          ['retreat', 'elmond'], ['retreat', 'cerise'], ['retreat', 'lida'],
          ['battleEnd', 'victory'],
        ],
      },
      {
        when: { hpBelow: ['lida', 30] },
        script: [
          ['say', 'lida', 'My lord... forgive me. I have spoiled my dress.'],
          ['say', 'elmond', 'Then we shall go home and mend it. Come away, both of you. Another night.'],
          ['retreat', 'elmond'], ['retreat', 'cerise'], ['retreat', 'lida'],
          ['battleEnd', 'victory'],
        ],
      },
    ],
    rewards: { gil: 5000, items: ['vampireMantle'] },
  },
];
