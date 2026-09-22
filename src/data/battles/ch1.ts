// ============================================================================
//  Battles of the Prologue and Chapter I — "The Low-Born".
//  Unit placement follows the source's Chapter I fields; the hero is always
//  deployed by the engine. Delan fights as an AI guest through Chapter I, and
//  Argan Vire as a guest from Mandrel until he is sent away after Thieves' Keep.
// ============================================================================
import type { BattleDef } from '../types';

export const battles: BattleDef[] = [
  // ==========================================================================
  //  PROLOGUE — Orvelle Abbey
  // ==========================================================================
  {
    id: 'b_orvelle', name: 'Orvelle Abbey', map: 'orvelle_court', music: 'battle1',
    units: [
      {
        char: 'garmond', level: '+2', at: [8, 6], facing: 'S', team: 0, ai: 'aggressive',
        equip: { rhand: 'ironSword', head: 'bronzeHelmet', body: 'linenCuirass' },
      },
      {
        char: 'adria', level: '+2', at: [5, 4], facing: 'S', team: 0, ai: 'aggressive',
        equip: { rhand: 'longsword', lhand: 'buckler', head: 'bronzeHelmet', body: 'linenCuirass' },
      },
      { id: 'raiderCaptain', job: 'knight', name: 'Black-Lion Captain', level: '+1', at: [6, 10], facing: 'N', team: 1, secondary: 'squire' },
      { id: 'raider2', job: 'knight', name: 'Black-Lion Raider', level: '+0', at: [5, 11], facing: 'N', team: 1 },
      { id: 'raider3', job: 'archer', name: 'Black-Lion Bowman', level: '+0', at: [9, 10], facing: 'N', team: 1 },
      { id: 'raider4', job: 'archer', name: 'Black-Lion Bowman', level: '-1', at: [2, 10], facing: 'N', team: 1 },
      { id: 'raider5', job: 'chemist', name: 'Black-Lion Chemist', level: '-1', at: [7, 11], facing: 'N', team: 1 },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'raiderCaptain', 'Cut down the sellswords and bring out the girl! Duke Galtran pays for her alive — the rest of you he pays for dead!', { mood: 'shout' }],
          ['say', 'adria', 'Not one of them passes the chapel door. Garmond — earn your coin.'],
          ['say', 'garmond', 'Every crown of it, my lady. {hero}, take the left. Watch their bowmen on the wall.'],
        ],
      },
      {
        when: { enemiesLeft: 2 },
        script: [
          ['say', 'raiderCaptain', 'This was meant to be an abbey full of monks and one knight! Who hired these dogs?'],
          ['say', 'garmond', 'Someone who reads his reports more carefully than your master does.'],
        ],
      },
    ],
    rewards: { gil: 300, items: ['potion', 'potion'] },
    hint: 'Garmond and Adria fight at your side. Attacks from a foe\'s flank or back land far more often — check who acts next in the turn order.',
  },

  // ==========================================================================
  //  CHAPTER I
  // ==========================================================================
  {
    id: 'b_galwyn', name: 'Galwyn Market', map: 'galwyn_market', music: 'battle1',
    units: [
      { char: 'delan', level: '+0', at: [1, 12], facing: 'N', team: 0, ai: 'aggressive', equip: { rhand: 'broadsword', head: 'leatherCap', body: 'clothes' } },
      { id: 'looterChem', job: 'chemist', name: 'Brigade Straggler', level: '-1', at: [2, 4], facing: 'S', team: 1 },
      { id: 'looterSgt', job: 'squire', name: 'Brigade Sergeant', level: '+0', at: [4, 4], facing: 'S', team: 1 },
      { id: 'looter2', job: 'squire', name: 'Brigade Straggler', level: '-1', at: [3, 5], facing: 'S', team: 1 },
      { id: 'looter3', job: 'squire', gender: 'f', name: 'Brigade Straggler', level: '-1', at: [6, 3], facing: 'S', team: 1 },
      { id: 'looter4', job: 'squire', name: 'Brigade Straggler', level: '-1', at: [8, 1], facing: 'S', team: 1 },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'looterSgt', 'Academy brats! Grab what you can carry and make for the north bridge!', { mood: 'shout' }],
          ['say', 'delan', 'Mind the one on the rooftop, {hero}. The canals will slow anyone who wades them.'],
        ],
      },
      {
        when: { enemiesLeft: 1 },
        script: [
          ['say', 'delan', 'One left. Don\'t let him reach the bridge — he\'ll tell the rest where the Academy keeps its silver.'],
        ],
      },
    ],
    rewards: { gil: 400, items: ['potion'] },
    hint: 'Four brigands and a chemist loot the canal market. Bridges cross the canals; wading costs no extra moves but leaves you low. Gang up on one foe at a time.',
  },
  {
    id: 'b_mandrel', name: 'Mandrel Plains', map: 'mandrel_plains', music: 'battle1',
    units: [
      { char: 'delan', level: '+0', at: [7, 2], facing: 'S', team: 0, ai: 'aggressive', equip: { rhand: 'broadsword', head: 'leatherCap', body: 'clothes' } },
      { char: 'argan', level: '+0', at: [2, 8], facing: 'N', team: 0, ai: 'aggressive', equip: { rhand: 'broadsword', head: 'leatherHelmet', body: 'leatherArmor' } },
      { id: 'squireA', job: 'squire', name: 'Brigade Squire', level: '+0', at: [2, 7], facing: 'S', team: 1 },
      { id: 'thiefA', job: 'thief', name: 'Brigade Cutpurse', level: '+1', at: [3, 8], facing: 'W', team: 1 },
      { id: 'squireB', job: 'squire', name: 'Brigade Squire', level: '+0', at: [7, 9], facing: 'N', team: 1 },
      { id: 'squireC', job: 'squire', name: 'Brigade Squire', level: '-1', at: [9, 10], facing: 'N', team: 1 },
      { id: 'panther', job: 'redPanther', level: '+0', at: [11, 8], facing: 'W', team: 1 },
      { id: 'squireD', job: 'squire', name: 'Brigade Squire', level: '-1', at: [6, 12], facing: 'N', team: 1 },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true },
        script: [
          ['if', 'ch1_save_argan',
            [['say', 'argan', 'Hurry, damn you! I cannot hold them off forever!', { mood: 'shout' }]],
            [['say', 'squireA', 'The cadets are leaving the noble pup to us. Wise lads!'], ['say', 'argan', 'Cowards! Is this how the Northsky keeps its oaths?', { mood: 'shout' }]],
          ],
        ],
      },
      {
        when: { ko: 'argan' },
        script: [
          ['if', 'ch1_save_argan',
            [
              ['say', 'rhen', 'Argan! No — we swore we would bring him out alive!', { mood: 'shout' }],
              ['say', 'delan', 'It\'s over, {hero}. We came too late.'],
              ['battleEnd', 'defeat'],
            ],
            [
              ['say', 'argan', 'Curse you... curse you both...'],
              ['say', 'delan', 'He\'s down, not dead. Finish the brigands, then see to him.'],
            ],
          ],
        ],
      },
      {
        when: { enemiesLeft: 2 },
        script: [
          ['say', 'thiefA', 'This was to be an easy purse! Nobody said the Valornes rode these roads!'],
        ],
      },
    ],
    treasure: [
      [11, 0, 'potion', 'dagger'],
      [7, 4, 'hiPotion', 'broadsword'],
      [3, 6, 'eyeDrop', 'oakStaff'],
      [7, 12, 'antidote', 'rod'],
    ],
    rewards: { gil: 600, items: ['phoenixDown'] },
    hint: 'If you swore to save Argan, his fall loses the battle — reach him quickly. The red panther counters and poisons; strike it from behind.',
  },
  {
    id: 'b_swiggle', name: 'Swiggle Woods', map: 'swiggle_woods', music: 'battle1',
    units: [
      { char: 'delan', level: '+0', at: [2, 1], facing: 'S', team: 0, ai: 'aggressive', equip: { rhand: 'longsword', head: 'leatherCap', body: 'leatherClothes' } },
      { char: 'argan', level: '+0', at: [6, 1], facing: 'S', team: 0, ai: 'aggressive', equip: { rhand: 'broadsword', head: 'leatherHelmet', body: 'leatherArmor' } },
      { id: 'hobgoblin', job: 'hobgoblin', level: '+0', at: [4, 8], facing: 'N', team: 1 },
      { id: 'bombA', job: 'bomb', level: '+0', at: [3, 9], facing: 'N', team: 1 },
      { id: 'pantherA', job: 'redPanther', level: '+0', at: [7, 9], facing: 'N', team: 1 },
      { id: 'goblinA', job: 'goblin', level: '+0', at: [9, 9], facing: 'N', team: 1 },
      { id: 'goblinB', job: 'goblin', level: '-1', at: [6, 10], facing: 'N', team: 1 },
      { id: 'bombB', job: 'bomb', level: '-1', at: [8, 10], facing: 'N', team: 1 },
      { id: 'pantherB', job: 'redPanther', level: '-1', at: [11, 9], facing: 'W', team: 1, hidden: true },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'argan', 'Beasts. We lose half a day to beasts while my lord rots in a brigand\'s cellar.'],
          ['say', 'delan', 'Then let\'s not lose the other half. Keep clear of the bombs when they start to glow.'],
        ],
      },
      {
        when: { turn: 3 },
        script: [
          ['say', 'delan', 'Something in the brush to the east — another panther!', { mood: 'shout' }],
          ['reveal', 'pantherB'],
        ],
      },
    ],
    treasure: [
      [1, 0, 'echoHerb', 'bowgun'],
      [9, 1, 'phoenixDown', 'escutcheon'],
      [11, 5, 'potion', 'leatherHelmet'],
      [6, 6, 'hiPotion', 'plumedHat'],
    ],
    rewards: { gil: 700 },
    hint: 'Monsters have no side or back evasion. A wounded bomb may explode for the HP it has lost — finish it in one blow or keep your distance.',
  },
  {
    id: 'b_dorhaven', name: 'Dorhaven', map: 'dorhaven_streets', music: 'battle2',
    units: [
      { char: 'delan', level: '+0', at: [3, 2], facing: 'S', team: 0, ai: 'aggressive', equip: { rhand: 'longsword', head: 'leatherCap', body: 'leatherClothes' } },
      { char: 'argan', level: '+0', at: [1, 2], facing: 'S', team: 0, ai: 'aggressive', equip: { rhand: 'longsword', head: 'leatherHelmet', body: 'leatherArmor' } },
      { id: 'roofArcher', job: 'archer', name: 'Brigade Bowman', level: '+1', at: [9, 1], facing: 'W', team: 1, support: 'concentrate' },
      { id: 'wizardA', job: 'wizard', name: 'Brigade Hedge-Mage', level: '+0', at: [9, 11], facing: 'N', team: 1 },
      { id: 'archerB', job: 'archer', name: 'Brigade Bowman', level: '+0', at: [8, 11], facing: 'N', team: 1 },
      { id: 'wizardB', job: 'wizard', name: 'Brigade Hedge-Mage', level: '+0', at: [1, 12], facing: 'N', team: 1 },
      { id: 'knightA', job: 'knight', name: 'Brigade Veteran', level: '+1', at: [2, 11], facing: 'N', team: 1, secondary: 'chemist' },
      { id: 'archerC', job: 'archer', name: 'Brigade Bowman', level: '+0', at: [8, 8], facing: 'N', team: 1 },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'roofArcher', 'Northsky blue! Loose, lads — the rain\'s on our side today!', { mood: 'shout' }],
          ['say', 'rhen', 'Their mages will be the death of us in this rain. Bring them down first.'],
        ],
      },
      {
        when: { ko: 'wizardA' },
        script: [
          ['say', 'knightA', 'They\'ve dropped Brannoc! Hold the square — hold it, I said!'],
        ],
      },
    ],
    treasure: [
      [6, 1, 'echoHerb', 'mythrilKnife'],
      [0, 4, 'antidote', 'leatherArmor'],
      [4, 12, 'eyeDrop', 'clothes'],
      [7, 14, 'phoenixDown', 'longsword'],
    ],
    rewards: { gil: 800, items: ['hiPotion'] },
    hint: 'The first truly hard fight. Rain strengthens lightning, and the hedge-mages will have spells charged before you move. Spread out, and send someone up the rooftops for the high bowman.',
  },
  {
    id: 'b_sandrat', name: 'Sandrat Cellar', map: 'sandrat_cellar', music: 'dungeon',
    units: [
      { char: 'delan', level: '+0', at: [4, 1], facing: 'S', team: 0, ai: 'aggressive', equip: { rhand: 'longsword', head: 'leatherCap', body: 'leatherClothes' } },
      { char: 'argan', level: '+0', at: [9, 7], facing: 'W', team: 0, ai: 'aggressive', equip: { rhand: 'longsword', head: 'leatherHelmet', body: 'leatherArmor' } },
      {
        char: 'gustin', level: '+2', at: [0, 9], facing: 'E', team: 1, boss: true, hpMult: 1.4,
        equip: { rhand: 'ironSword', lhand: 'buckler', head: 'bronzeHelmet', body: 'linenCuirass' },
        secondary: 'squire', support: 'defend',
      },
      { id: 'monkA', job: 'monk', name: 'Brigade Brawler', level: '+0', at: [1, 5], facing: 'E', team: 1 },
      { id: 'monkB', job: 'monk', name: 'Brigade Brawler', level: '+0', at: [1, 8], facing: 'E', team: 1 },
      { id: 'knightA', job: 'knight', name: 'Brigade Veteran', level: '+0', at: [2, 7], facing: 'N', team: 1, secondary: 'chemist' },
      { id: 'archerA', job: 'archer', name: 'Brigade Bowman', level: '+0', at: [2, 9], facing: 'N', team: 1 },
      { id: 'knightB', job: 'knight', name: 'Brigade Veteran', level: '+0', at: [3, 8], facing: 'N', team: 1 },
      { id: 'knightC', job: 'knight', name: 'Brigade Veteran', level: '-1', at: [4, 10], facing: 'N', team: 1 },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'gustin', 'Boys. They sent boys. Break their legs and throw them in with the Marquis — two more heads to ransom!'],
          ['say', 'argan', 'Where is he, you jackal? Where is my lord?', { mood: 'shout' }],
        ],
      },
      {
        when: { hpBelow: ['gustin', 45] },
        script: [
          ['say', 'gustin', 'Enough! I\'ll not bleed out in a wine cellar for a pack of Northsky pups. Hold them here — I\'ve a guest to move!'],
          ['retreat', 'gustin'],
          ['say', 'delan', 'He\'s running for the back vault. Clear the rest and go after him!'],
        ],
      },
    ],
    treasure: [
      [9, 10, 'eyeDrop', 'leatherClothes'],
      [2, 6, 'hiPotion', 'plumedHat'],
      [0, 10, 'antidote', 'linenCuirass'],
      [4, 5, 'potion', 'bronzeHelmet'],
    ],
    rewards: { gil: 1000, items: ['phoenixDown'] },
    hint: 'Your party enters by two stairs. Monks strike every adjacent tile at once; knights carry shields. Spells cast from the stairs can reach foes hiding among the pillars.',
  },
  {
    id: 'b_thieveskeep', name: 'Thieves\' Keep', map: 'thieveskeep_fort', music: 'battle2',
    units: [
      { char: 'delan', level: '+0', at: [6, 1], facing: 'S', team: 0, ai: 'aggressive', equip: { rhand: 'ironSword', head: 'bronzeHelmet', body: 'leatherClothes' } },
      { char: 'argan', level: '+0', at: [4, 1], facing: 'S', team: 0, ai: 'aggressive', equip: { rhand: 'longsword', lhand: 'buckler', head: 'leatherHelmet', body: 'linenCuirass' } },
      {
        char: 'mirelle', level: '+2', at: [5, 10], facing: 'N', team: 1, boss: true, hpMult: 1.6,
        equip: { rhand: 'ironSword', lhand: 'bronzeShield', head: 'ironHelmet', body: 'chainMail', accessory: 'powerWrist' },
        reaction: 'weaponGuard', support: 'equipChange', movement: 'move1',
      },
      { id: 'clericA', job: 'priest', gender: 'f', name: 'Brigade Cleric', level: '+0', at: [6, 10], facing: 'N', team: 1, secondary: 'wizard' },
      { id: 'mageA', job: 'wizard', name: 'Brigade Hedge-Mage', level: '+0', at: [5, 7], facing: 'N', team: 1 },
      { id: 'thiefA', job: 'thief', name: 'Brigade Cutpurse', level: '+0', at: [3, 9], facing: 'N', team: 1 },
      { id: 'thiefB', job: 'thief', name: 'Brigade Cutpurse', level: '+0', at: [8, 9], facing: 'N', team: 1 },
      { id: 'knightA', job: 'knight', name: 'Brigade Veteran', level: '+1', at: [6, 7], facing: 'N', team: 1 },
    ],
    victory: { type: 'defeat', ids: ['mirelle'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'mirelle', 'Hold the gate! They\'re children in borrowed colours — make them earn every step!', { mood: 'shout' }],
          ['say', 'delan', 'That\'s their commander, the woman by the tent. Take her and the rest will scatter.'],
        ],
      },
      {
        when: { hpBelow: ['mirelle', 50] },
        script: [
          ['say', 'mirelle', 'You fight well for a lord\'s errand-boy. Ask your masters who they are sending you to kill — and why!'],
          ['say', 'argan', 'Rebels do not ask questions of their betters. They hang.'],
        ],
      },
    ],
    treasure: [
      [0, 0, 'phoenixDown', 'longbow'],
      [8, 10, 'antidote', 'flameRod'],
      [4, 9, 'echoHerb', 'whiteStaff'],
      [7, 9, 'eyeDrop', 'iceRod'],
    ],
    rewards: { gil: 1200, items: ['hiPotion', 'phoenixDown'] },
    hint: 'Defeat Mirelle to win. The only way into the courtyard is the north gate — or the walls, for those who can climb. Her cleric will keep her standing; silence or kill the cleric first.',
  },
  {
    id: 'b_lenara', name: 'Lenara Plateau', map: 'lenara_plateau', music: 'battle2',
    units: [
      { char: 'delan', level: '+1', at: [6, 1], facing: 'S', team: 0, ai: 'aggressive', equip: { rhand: 'ironSword', lhand: 'escutcheon', head: 'bronzeHelmet', body: 'linenCuirass' } },
      {
        char: 'mirelle', level: '+3', at: [2, 9], facing: 'N', team: 1, boss: true, hpMult: 1.8,
        equip: { rhand: 'mythrilSword', lhand: 'bronzeShield', head: 'barbuta', body: 'chainMail', accessory: 'powerWrist' },
        secondary: 'monk', reaction: 'counter', support: 'equipChange', movement: 'jump1',
      },
      { id: 'mageA', job: 'wizard', name: 'Brigade Hedge-Mage', level: '+1', at: [4, 9], facing: 'N', team: 1 },
      { id: 'knightA', job: 'knight', gender: 'f', name: 'Brigade Shieldmaiden', level: '+1', at: [5, 8], facing: 'N', team: 1 },
      { id: 'chronoA', job: 'timeMage', gender: 'f', name: 'Brigade Chronomancer', level: '+1', at: [5, 10], facing: 'N', team: 1 },
      { id: 'mageB', job: 'wizard', name: 'Brigade Hedge-Mage', level: '+1', at: [7, 10], facing: 'N', team: 1 },
      { id: 'knightB', job: 'knight', gender: 'f', name: 'Brigade Shieldmaiden', level: '+1', at: [9, 8], facing: 'N', team: 1 },
    ],
    victory: { type: 'defeat', ids: ['mirelle'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'mirelle', 'Up here the wind is honest, Valorne. Come and ask me where the girl is. I dare you to climb.'],
          ['say', 'delan', 'She\'s taunting us onto the slope. Their mages will have the whole hillside in range.'],
        ],
      },
      {
        when: { hpBelow: ['mirelle', 50] },
        script: [
          ['say', 'mirelle', 'Every one of these soldiers bled for a king who never learned their names. And you would bleed them again!'],
          ['say', 'rhen', 'Then lay down your sword and let us end it without more blood!'],
          ['say', 'mirelle', 'End it? Your kind never ends it. You only win it.'],
        ],
      },
    ],
    treasure: [
      [6, 4, 'hiPotion', 'ironHelmet'],
      [0, 6, 'eyeDrop', 'bronzeArmor'],
      [5, 10, 'antidote', 'redHood'],
      [8, 8, 'potion', 'buckler'],
    ],
    rewards: { gil: 1500, items: ['hiPotion'] },
    hint: 'Defeat Mirelle to win. She counters blows at close quarters. The chronomancer will haste her allies and pin yours — strike the casters on the slope before they strike you.',
  },
  {
    id: 'b_fovain', name: 'Fovain Mill', map: 'fovain_mill', music: 'boss',
    units: [
      { char: 'delan', level: '+1', at: [6, 1], facing: 'S', team: 0, ai: 'aggressive', equip: { rhand: 'ironSword', lhand: 'escutcheon', head: 'bronzeHelmet', body: 'linenCuirass' } },
      {
        char: 'wolfram', level: '+3', at: [5, 8], facing: 'N', team: 1, boss: true, hpMult: 2.4,
        equip: { rhand: 'mythrilSword', lhand: 'roundShield', head: 'barbuta', body: 'chainMail', accessory: 'smallMantle' },
        secondary: 'knight', reaction: 'counter', support: 'jpBoost', movement: 'jump1',
      },
      { id: 'knightA', job: 'knight', gender: 'f', name: 'Brigade Shieldmaiden', level: '+1', at: [3, 5], facing: 'N', team: 1 },
      { id: 'monkA', job: 'monk', gender: 'f', name: 'Brigade Brawler', level: '+1', at: [2, 4], facing: 'N', team: 1 },
      { char: 'bocco', level: '+1', at: [6, 9], facing: 'N', team: 1, noLoot: true },
      { id: 'knightB', job: 'knight', gender: 'f', name: 'Brigade Shieldmaiden', level: '+1', at: [7, 8], facing: 'N', team: 1 },
    ],
    victory: { type: 'defeat', ids: ['wolfram'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'wolfram', 'Mirelle wrote to me of a Valorne boy who spared her once. I see she was not mistaken in your face.'],
          ['say', 'wolfram', 'She was mistaken in your heart. Draw, and let us see what the Northsky teaches its children.'],
          ['say', 'delan', 'That\'s Wolfram Fell himself. Don\'t stand in a line — his blade-arts carry.'],
        ],
      },
      {
        when: { hpBelow: ['bocco', 40] },
        script: [
          ['say', 'wolfram', 'Bocco! Away, old friend — this is no fight for you!', { mood: 'shout' }],
          ['sfx', 'kweh'],
          ['retreat', 'bocco'],
        ],
      },
      {
        when: { hpBelow: ['wolfram', 50] },
        script: [
          ['say', 'wolfram', 'Enough. You have drawn my blood, and I will not spend the last of it on a windmill in the dusk.'],
          ['say', 'wolfram', 'Remember this, Valorne: my sister\'s blood is on your house. I will come to collect it.'],
          ['vfx', 'teleport', 'wolfram'],
          ['retreat', 'wolfram'],
          ['battleEnd', 'victory'],
        ],
      },
    ],
    treasure: [
      [1, 0, 'hiPotion', 'ether'],
      [4, 4, 'antidote', 'linenRobe'],
      [7, 9, 'echoHerb', 'remedy'],
      [2, 8, 'potion', 'hiPotion'],
    ],
    rewards: { gil: 2000, items: ['ether', 'hiPotion'] },
    hint: 'Wolfram\'s holy sword-arts strike from range and inflict grievous ailments. Wound him deeply enough and he will withdraw. Keep your healers out of his reach.',
  },
  {
    id: 'b_ziekhold', name: 'Fort Ziekhold', map: 'ziekhold_fort', music: 'boss',
    units: [
      { char: 'delan', level: '+2', at: [6, 11], facing: 'N', team: 0, ai: 'berserk', equip: { rhand: 'ironSword', lhand: 'escutcheon', head: 'bronzeHelmet', body: 'linenCuirass' } },
      {
        char: 'argan', level: '+3', at: [6, 6], facing: 'S', team: 1, boss: true, hpMult: 2,
        equip: { rhand: 'crossbow', head: 'barbuta', body: 'chainMail', accessory: 'smallMantle' },
        secondary: 'chemist', reaction: 'autoPotion', support: 'equipCrossbow', movement: 'move1',
      },
      { id: 'nsKnightA', job: 'knight', name: 'Northsky Knight', level: '+1', at: [4, 7], facing: 'S', team: 1 },
      { id: 'nsKnightB', job: 'knight', name: 'Northsky Knight', level: '+1', at: [9, 7], facing: 'S', team: 1 },
      { id: 'nsKnightC', job: 'knight', name: 'Northsky Knight', level: '+1', at: [6, 8], facing: 'S', team: 1, secondary: 'squire' },
      { id: 'nsMageA', job: 'wizard', gender: 'f', name: 'Northsky Battlemage', level: '+1', at: [3, 5], facing: 'S', team: 1 },
      { id: 'nsMageB', job: 'wizard', gender: 'f', name: 'Northsky Battlemage', level: '+1', at: [10, 5], facing: 'S', team: 1 },
    ],
    victory: { type: 'defeat', ids: ['argan'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'argan', 'You heard the Knight-Commander. Traitors to the Northsky, the both of you. I will enjoy writing that in my report.'],
          ['say', 'delan', 'ARGAN!', { mood: 'shout' }],
          ['say', 'rhen', 'Delan, wait — !', { mood: 'shout' }],
          ['say', 'nsKnightC', 'Lord Valorne\'s own brother... Gods forgive us. Form up!'],
        ],
      },
      {
        when: { hpBelow: ['argan', 50] },
        script: [
          ['say', 'argan', 'You would kill a nobleman for a steward\'s brat? Think, Valorne — think what you are throwing away!'],
          ['say', 'rhen', 'I am thinking of her. That is all I am thinking of.'],
        ],
      },
    ],
    rewards: { gil: 2500 },
    hint: 'Defeat Argan. He keeps to his rock and heals himself when struck; the Northsky battlemages\' ice bites harder in the cold. Delan will not be held back.',
  },
];
