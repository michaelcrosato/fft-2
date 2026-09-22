// ============================================================================
//  Chapter II — "Pawn and Player": the eleven story battles on the road from
//  Dorhaven to the chapel of Castle Lyonesse. Maps: src/data/maps/ch2.ts.
//  Scenes: src/data/scenes/ch2.ts. Story order: src/data/story/10_ch2.ts.
// ============================================================================
import type { BattleDef, EquipSlot } from '../types';

/** Garmond's own kit: the Blood Sword can be stolen from him, and from no one else. */
const GARMOND_KIT: Partial<Record<EquipSlot, string>> = {
  rhand: 'bloodSword', lhand: 'roundShield', head: 'ironHelmet', body: 'chainMail', accessory: 'battleBoots',
};

/** Delan in Chapter II: a Lion Knight in a borrowed Black Lion surcoat. */
const DELAN_KIT: Partial<Record<EquipSlot, string>> = {
  rhand: 'mythrilSword', lhand: 'bronzeShield', head: 'ironHelmet', body: 'chainMail', accessory: 'spikedBoots',
};

export const battles: BattleDef[] = [
  // ==========================================================================
  //  1. Dorhaven again
  // ==========================================================================
  {
    id: 'b_dorhaven2', name: 'Dorhaven, the Tanners\' Row', map: 'dorhaven_alley', music: 'battle1',
    maxDeploy: 5, forced: ['rhen'],
    hint: 'Archers hold the rooftops. Climb the wooden landings to reach them, and keep your people spread against the wizards.',
    units: [
      { char: 'garmond', level: '+2', at: [3, 9], facing: 'N', team: 0, ai: 'aggressive', equip: GARMOND_KIT },
      { id: 'wenzel', job: 'thief', name: 'Wenzel the Fence', level: '+1', at: [3, 5], facing: 'S', reaction: 'gilSnapper', support: 'equipKnife' },
      { job: 'thief', level: '+0', at: [11, 5], facing: 'S' },
      { job: 'knight', name: 'Black Lion Sellsword', level: '+0', at: [6, 4], facing: 'S' },
      { job: 'archer', gender: 'f', level: '+0', at: [1, 1], facing: 'S' },
      { job: 'archer', gender: 'f', level: '+0', at: [12, 1], facing: 'S' },
      { job: 'wizard', gender: 'm', level: '+0', at: [5, 1], facing: 'S' },
      { job: 'wizard', gender: 'm', level: '+0', at: [9, 3], facing: 'S' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true }, once: true,
        script: [
          ['say', 'wenzel', 'Those are the ones asking after the girl! The knight pays double for anyone who follows her — bleed them!', { mood: 'shout' }],
          ['say', 'garmond', 'Mind the rooftops, lad. Bows up there, and fire-throwers in the alley. Earn your wage.'],
        ],
      },
      {
        when: { hpBelow: ['wenzel', 40] }, once: true,
        script: [
          ['say', 'wenzel', 'This was meant to be easy money! A girl, a rider, and a purse. Nobody said anything about Royal Guard!'],
        ],
      },
    ],
    treasure: [[0, 5, 'potion', 'hiPotion'], [4, 0, 'phoenixDown', 'mageMasher'], [13, 1, 'ether', 'leatherMantle']],
    rewards: { gil: 1500 },
  },

  // ==========================================================================
  //  2. Arawen Woods — save Bocco
  // ==========================================================================
  {
    id: 'b_arawen', name: 'Arawen Woods', map: 'arawen_woods', music: 'battle2',
    maxDeploy: 5, forced: ['rhen'],
    protect: ['bocco'],
    hint: 'The kwehbo must not fall. Goblins are slow over the brook; panthers are not.',
    units: [
      { char: 'garmond', level: '+2', at: [2, 12], facing: 'N', team: 0, ai: 'aggressive', equip: GARMOND_KIT },
      { char: 'bocco', level: '+0', at: [6, 6], facing: 'S', team: 0, ai: 'defensive', vip: true },
      { id: 'gristlejaw', job: 'hobgoblin', name: 'Gristlejaw', level: '+1', at: [5, 3], facing: 'S' },
      { job: 'goblin', level: '+0', at: [4, 5], facing: 'E' },
      { job: 'goblin', level: '+0', at: [8, 5], facing: 'W' },
      { job: 'goblin', level: '+0', at: [6, 3], facing: 'S' },
      { job: 'redPanther', level: '+0', at: [1, 4], facing: 'E' },
      { job: 'redPanther', level: '+0', at: [12, 4], facing: 'W' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true }, once: true,
        script: [
          ['sfx', 'kweh'],
          ['say', 'bocco', 'Kweh! Kwehhh!', { mood: 'shout' }],
          ['say', 'gristlejaw', 'Grrk! More meat come to the larder. Big bird first. Soft ones after!', { mood: 'shout' }],
        ],
      },
      {
        when: { hpBelow: ['bocco', 40] }, once: true,
        script: [
          ['say', 'bocco', 'Kweh... kweh...'],
          ['say', 'rhen', 'Hold on, old bird! We\'re coming!', { mood: 'shout' }],
        ],
      },
    ],
    treasure: [[4, 0, 'hiPotion', 'spikedBoots'], [12, 13, 'potion', 'ether']],
    rewards: { gil: 1000 },
  },

  // ==========================================================================
  //  3. Zirkel Falls — Garmond's betrayal
  // ==========================================================================
  {
    id: 'b_zirkel', name: 'Zirkel Falls', map: 'zirkel_falls', music: 'battle3',
    maxDeploy: 5, forced: ['rhen'],
    protect: ['oriane'],
    hint: 'Protect Princess Oriane. Delan holds the bridge; climb the terraces to reach them before the Northsky blades do.',
    units: [
      { char: 'delan', job: 'lionKnight', level: '+2', at: [9, 4], facing: 'W', team: 0, ai: 'aggressive', equip: DELAN_KIT },
      { char: 'oriane', level: '+0', at: [10, 5], facing: 'W', team: 0, ai: 'support', vip: true },
      { char: 'garmond', level: '+2', at: [13, 7], facing: 'S', team: 1, boss: true, hpMult: 1.5, equip: GARMOND_KIT },
      { id: 'nsCaptain', job: 'knight', name: 'Northsky Captain', level: '+1', at: [3, 2], facing: 'E', secondary: 'squire', reaction: 'counterTackle' },
      { job: 'knight', name: 'Northsky Knight', level: '+0', at: [4, 5], facing: 'E' },
      { job: 'knight', name: 'Northsky Knight', level: '+0', at: [2, 6], facing: 'E' },
      { job: 'knight', name: 'Northsky Knight', level: '+0', at: [12, 1], facing: 'S' },
      { job: 'knight', name: 'Northsky Knight', level: '+0', at: [14, 4], facing: 'W' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true }, once: true,
        script: [
          ['say', 'nsCaptain', 'The Duke\'s orders stand. The girl does not leave this gorge. Cut down anyone who stands between.', { mood: 'shout' }],
          ['say', 'delan', 'Stay behind me, Princess. Whatever happens — do not run for the bridge.'],
          ['say', 'garmond', 'Nothing personal, lad. It never is.'],
        ],
      },
      {
        when: { hpBelow: ['garmond', 35] }, once: true,
        script: [
          ['say', 'garmond', 'Ha! You fight like a man who still thinks it matters. I\'m not paid to die for Northsky pride.'],
          ['say', 'garmond', 'We\'ll finish this another day, lad. Every man has his price — you\'ll learn yours.'],
          ['retreat', 'garmond'],
        ],
      },
      {
        when: { hpBelow: ['oriane', 50] }, once: true,
        script: [
          ['say', 'oriane', 'Please... not here. Not like this.'],
          ['say', 'delan', 'Princess! Stay down!', { mood: 'shout' }],
        ],
      },
    ],
    treasure: [[2, 0, 'hiPotion', 'silverBow'], [15, 9, 'phoenixDown', 'hiEther']],
    rewards: { gil: 2000 },
  },

  // ==========================================================================
  //  4. Zelland — save Mattis
  // ==========================================================================
  {
    id: 'b_zelland', name: 'Zelland, the North Gate', map: 'zelland_gate', music: 'battle2',
    maxDeploy: 5, forced: ['rhen'],
    protect: ['mattis'],
    hint: 'Keep the young artificer alive. The wizards will target him first; the archers on the wall-walk see the whole plaza.',
    units: [
      { char: 'mattis', level: '+0', at: [6, 8], facing: 'N', team: 0, ai: 'aggressive', vip: true, equip: { rhand: 'ormandyGun', head: 'leatherCap', body: 'leatherVest' } },
      { id: 'bairdBravo', job: 'knight', name: 'Baird Company Bravo', level: '+1', at: [5, 3], facing: 'S', reaction: 'counterTackle' },
      { job: 'knight', name: 'Baird Company Bravo', level: '+0', at: [8, 4], facing: 'S' },
      { job: 'archer', gender: 'f', name: 'Bought Watchwoman', level: '+0', at: [2, 0], facing: 'S' },
      { job: 'archer', gender: 'f', name: 'Bought Watchwoman', level: '+0', at: [11, 1], facing: 'S' },
      { job: 'wizard', gender: 'm', name: 'Company Hedge-Mage', level: '+1', at: [6, 1], facing: 'S' },
      { job: 'wizard', gender: 'm', name: 'Company Hedge-Mage', level: '+0', at: [9, 6], facing: 'W' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true }, once: true,
        script: [
          ['say', 'bairdBravo', 'Master Baird wants the boy breathing. He didn\'t say anything about the rest of you.', { mood: 'shout' }],
          ['say', 'mattis', 'Whoever you are, you picked a strange day to be kind. Keep their mages off me and I\'ll keep their heads down!'],
        ],
      },
      {
        when: { hpBelow: ['mattis', 40] }, once: true,
        script: [
          ['say', 'mattis', 'Ah — that one stung. If I die here, somebody tell my father it wasn\'t the gun\'s fault!'],
        ],
      },
    ],
    treasure: [[0, 2, 'hiPotion', 'headgear'], [13, 12, 'potion', 'bowgun']],
    rewards: { gil: 2000 },
  },

  // ==========================================================================
  //  5. Barrow Hill — ambush on the Lyonesse road
  // ==========================================================================
  {
    id: 'b_barrowhill', name: 'Barrow Hill', map: 'barrow_hill', music: 'battle3',
    maxDeploy: 5, forced: ['rhen'],
    hint: 'Summoners wait on the barrow tops. Their spells reach far and strike wide — spread out, and close the distance quickly.',
    units: [
      { id: 'hiredCaptain', job: 'knight', name: 'Colourless Captain', level: '+1', at: [7, 7], facing: 'W', secondary: 'squire', reaction: 'weaponGuard' },
      { job: 'knight', name: 'Hired Blade', level: '+1', at: [10, 8], facing: 'W' },
      { job: 'archer', gender: 'm', name: 'Hired Bow', level: '+1', at: [4, 3], facing: 'S', support: 'concentrate' },
      { job: 'archer', gender: 'm', name: 'Hired Bow', level: '+0', at: [9, 7], facing: 'S' },
      { job: 'summoner', gender: 'f', name: 'Hired Conjurer', level: '+1', at: [6, 6], facing: 'S' },
      { job: 'summoner', gender: 'f', name: 'Hired Conjurer', level: '+0', at: [11, 2], facing: 'S' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true }, once: true,
        script: [
          ['say', 'hiredCaptain', 'No colours, no names, no witnesses. The one with the gold hair is the girl\'s guard — the rest are whoever they are.'],
        ],
      },
      {
        when: { enemiesLeft: 2 }, once: true,
        script: [
          ['say', 'hiredCaptain', 'This wasn\'t the job we were sold! They said a sellsword, a woman and a child!'],
        ],
      },
    ],
    treasure: [[11, 2, 'hiPotion', 'magicRing'], [0, 0, 'phoenixDown', 'triangleHat']],
    rewards: { gil: 2400 },
  },

  // ==========================================================================
  //  6. Zigor Fen — the drowned road
  // ==========================================================================
  {
    id: 'b_zigor', name: 'Zigor Fen', map: 'zigor_fen', music: 'battle2',
    maxDeploy: 5, forced: ['rhen'],
    hint: 'The dead rise again unless finished off — fire, holy water or a Phoenix Down lays them to rest. The purple mire poisons all who wade in it.',
    units: [
      { job: 'skeleton', level: '+0', at: [8, 1], facing: 'S' },
      { job: 'skeleton', level: '+1', at: [10, 2], facing: 'S' },
      { job: 'ghoul', level: '+0', at: [3, 6], facing: 'S' },
      { job: 'ghoul', level: '+1', at: [9, 7], facing: 'W' },
      { job: 'octopod', level: '+0', at: [6, 5], facing: 'S' },
      { job: 'floateye', level: '+0', at: [12, 4], facing: 'W' },
      { job: 'mawbloom', level: '+0', at: [5, 9], facing: 'W' },
    ],
    victory: { type: 'defeatAll' },
    treasure: [[9, 1, 'holyWater', 'hiEther'], [13, 0, 'antidote', 'remedy'], [2, 7, 'potion', 'jadeArmlet']],
    rewards: { gil: 1600 },
  },

  // ==========================================================================
  //  7. Cogsgard — the false stone
  // ==========================================================================
  {
    id: 'b_cogsgard', name: 'Cogsgard, the Nine-Gear Yard', map: 'cogsgard_works', music: 'battle3',
    maxDeploy: 5, forced: ['rhen', 'mattis'],
    hint: 'Summoners on the upper platform, archers on the gantries, thieves in the yard. Ludo Baird hides behind his crates on the loading dock.',
    units: [
      { char: 'ludo', level: '+1', at: [12, 6], facing: 'W', ai: 'coward', secondary: 'thief' },
      { id: 'bairdKnife', job: 'thief', name: 'Baird Knife', level: '+1', at: [4, 4], facing: 'S', equip: { rhand: 'mageMasher' } },
      { job: 'thief', name: 'Baird Knife', level: '+0', at: [9, 6], facing: 'S' },
      { job: 'archer', gender: 'f', name: 'Company Markswoman', level: '+0', at: [2, 3], facing: 'S', equip: { rhand: 'poisonBow' } },
      { job: 'archer', gender: 'f', name: 'Company Markswoman', level: '+0', at: [11, 1], facing: 'S' },
      { job: 'summoner', gender: 'm', name: 'Company Conjurer', level: '+1', at: [5, 1], facing: 'S' },
      { job: 'summoner', gender: 'm', name: 'Company Conjurer', level: '+0', at: [8, 0], facing: 'S' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true }, once: true,
        script: [
          ['say', 'ludo', 'Lamp-glass! You\'d sell lamp-glass to a Baird? Kill them — the true stone\'s on the boy, or in the old man\'s head!', { mood: 'shout' }],
          ['say', 'mattis', 'Rhen, the old man is my father. If they so much as scratch him, I\'m not leaving one of them standing.'],
        ],
      },
      {
        when: { hpBelow: ['ludo', 50] }, once: true,
        script: [
          ['say', 'ludo', 'Stay back! I have friends in Lyonesse — friends in the Church! Do you know whose coin paid for this morning\'s work?'],
        ],
      },
    ],
    treasure: [[13, 13, 'hiPotion', 'blazeGun'], [0, 1, 'ether', 'defenseArmlet']],
    rewards: { gil: 3000 },
  },

  // ==========================================================================
  //  8. Barrow Vale — rescue Adria
  // ==========================================================================
  {
    id: 'b_barrowvale', name: 'Barrow Vale, the Willow Ford', map: 'barrow_vale', music: 'battle3',
    maxDeploy: 5, forced: ['rhen'],
    protect: ['adria'],
    weather: 'rain',
    hint: 'Save Adria. Your company comes down both banks of the vale; the archer on the crag commands the whole ford, and lightning loves the rain.',
    units: [
      { char: 'adria', level: '+1', at: [5, 6], facing: 'E', team: 0, ai: 'aggressive', vip: true, equip: { rhand: 'ironSword', lhand: 'bronzeShield', head: 'bronzeHelmet', body: 'bronzeArmor' } },
      { id: 'valeSergeant', job: 'knight', name: 'Cardinal\'s Sergeant', level: '+1', at: [3, 3], facing: 'S', secondary: 'chemist' },
      { job: 'knight', name: 'Cardinal\'s Man-at-Arms', level: '+0', at: [8, 6], facing: 'W' },
      { job: 'archer', gender: 'f', name: 'Crag Archer', level: '+1', at: [12, 0], facing: 'W', equip: { rhand: 'lightningBow' }, support: 'concentrate' },
      { job: 'archer', gender: 'f', name: 'Cardinal\'s Archer', level: '+0', at: [9, 3], facing: 'W' },
      { job: 'wizard', gender: 'm', name: 'Cardinal\'s Wizard', level: '+1', at: [10, 4], facing: 'W' },
      { job: 'wizard', gender: 'm', name: 'Cardinal\'s Wizard', level: '+0', at: [2, 2], facing: 'S' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true }, once: true,
        script: [
          ['say', 'valeSergeant', 'His Eminence sends his regrets, Holy Knight. The princess needs no guard where she\'s going — and neither will you.'],
          ['say', 'adria', 'So this is the Church\'s mercy. Come, then — I have been waiting three days to strike something!', { mood: 'shout' }],
        ],
      },
      {
        when: { hpBelow: ['adria', 40] }, once: true,
        script: [
          ['say', 'adria', 'Not yet... I will not fall in a ditch at the Cardinal\'s pleasure!'],
        ],
      },
    ],
    treasure: [[13, 0, 'hiPotion', 'lightningBow'], [0, 3, 'phoenixDown', 'wizardMantle']],
    rewards: { gil: 2600 },
  },

  // ==========================================================================
  //  9. Golgrand Gallows — the ambush
  // ==========================================================================
  {
    id: 'b_golgrand', name: 'Golgrand Gallows', map: 'golgrand_gallows', music: 'battle3',
    maxDeploy: 5, forced: ['rhen'],
    hint: 'Garmond\'s Duskblade drinks the life it takes. Break or steal his sword, or keep your wounded out of his reach. The chronomancers will haste their allies — silence them early.',
    units: [
      { char: 'garmond', level: '+3', at: [7, 5], facing: 'S', boss: true, hpMult: 1.6, equip: GARMOND_KIT, reaction: 'counter' },
      { id: 'decoy', job: 'archer', gender: 'f', name: 'Veiled Decoy', level: '+1', at: [6, 3], facing: 'S', equip: { head: 'greenBeret' } },
      { id: 'gallowsKnight', job: 'knight', name: 'Northsky Headsman', level: '+1', at: [4, 6], facing: 'S', secondary: 'squire' },
      { job: 'knight', name: 'Northsky Knight', level: '+1', at: [9, 6], facing: 'S' },
      { job: 'knight', name: 'Northsky Knight', level: '+0', at: [8, 2], facing: 'S' },
      { job: 'archer', gender: 'f', name: 'Northsky Archer', level: '+0', at: [2, 2], facing: 'S' },
      { job: 'timeMage', gender: 'f', name: 'Hired Chronomancer', level: '+1', at: [5, 1], facing: 'S' },
      { job: 'timeMage', gender: 'f', name: 'Hired Chronomancer', level: '+0', at: [10, 3], facing: 'S' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true }, once: true,
        script: [
          ['say', 'garmond', 'The old tricks are the best ones. A veil, a gallows, and a knight who can\'t help but run to the rescue.'],
          ['say', 'decoy', 'Her Highness sends her regrets.'],
        ],
      },
      {
        when: { hpBelow: ['garmond', 25] }, once: true,
        script: [
          ['say', 'garmond', 'Enough! I\'ve had my coin\'s worth of this hill.'],
          ['say', 'garmond', 'Come to the castle if you want me, lad. I\'ll be at the gate — I always did like a doorway.'],
          ['retreat', 'garmond'],
        ],
      },
    ],
    treasure: [[1, 5, 'hiPotion', 'elvenMantle'], [12, 3, 'phoenixDown', 'hiEther']],
    rewards: { gil: 3000 },
  },

  // ==========================================================================
  //  10. Castle Lyonesse — the gate: Garmond's last stand
  // ==========================================================================
  {
    id: 'b_lyonesse', name: 'Castle Lyonesse, the Sea Gate', map: 'lyonesse_gate', music: 'boss',
    maxDeploy: 5, forced: ['rhen'],
    hint: 'Garmond holds the gate passage. The knights\' blades and the archers\' bows are charged with lightning; the conjurer on the wall-walk strikes from afar.',
    units: [
      { char: 'garmond', level: '+3', at: [7, 4], facing: 'S', boss: true, hpMult: 1.8, equip: GARMOND_KIT, reaction: 'counter' },
      { id: 'gateKnight', job: 'knight', name: 'Castle Knight', level: '+1', at: [7, 7], facing: 'S', equip: { rhand: 'coralSword' } },
      { job: 'knight', name: 'Castle Knight', level: '+1', at: [8, 6], facing: 'S', equip: { rhand: 'coralSword' } },
      { job: 'archer', gender: 'm', name: 'Barbican Archer', level: '+1', at: [2, 9], facing: 'E', equip: { rhand: 'lightningBow' } },
      { job: 'archer', gender: 'm', name: 'Barbican Archer', level: '+1', at: [13, 9], facing: 'W', equip: { rhand: 'lightningBow' } },
      { job: 'summoner', gender: 'f', name: 'Cardinal\'s Conjurer', level: '+2', at: [4, 4], facing: 'S' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true }, once: true,
        script: [
          ['say', 'garmond', 'Told you I\'d be at the door. Come on, then, lad. Show me what a year of my coin bought you.', { mood: 'shout' }],
        ],
      },
      {
        when: { hpBelow: ['garmond', 40] }, once: true,
        script: [
          ['say', 'garmond', 'You\'ve got better. Or I\'ve got old. Either way, the Cardinal\'s paying me the same.'],
        ],
      },
    ],
    treasure: [[4, 1, 'hiPotion', 'goldHelmet'], [15, 12, 'phoenixDown', 'plateMail']],
    rewards: { gil: 3500 },
  },

  // ==========================================================================
  //  11. The chapel — Vepar, the Defiled King
  // ==========================================================================
  {
    id: 'b_vepar', name: 'Castle Lyonesse, the Chapel', map: 'lyonesse_chapel', music: 'umbral',
    maxDeploy: 5, forced: ['rhen'],
    hint: 'Vepar\'s Nightmare brings sleep or doom; its Craven\'s Snare stops a warrior\'s arm. It is weak to holy light and cannot be held by ordinary curses — but it can be rooted in place.',
    units: [
      { job: 'vepar', id: 'vepar', level: '+4', boss: true, hpMult: 3, at: [5, 2], facing: 'S' },
      { id: 'crypt1', job: 'ghoul', name: 'Crypt-Risen', level: '+1', at: [1, 2], facing: 'S', hidden: true },
      { id: 'crypt2', job: 'ghoul', name: 'Crypt-Risen', level: '+1', at: [10, 2], facing: 'S', hidden: true },
    ],
    victory: { type: 'defeat', ids: ['vepar'] },
    events: [
      {
        when: { start: true }, once: true,
        script: [
          ['say', 'vepar', 'Kneel, little heretic. Every knee in Lyonesse has bent to me for twenty years. Yours will learn.', { mood: 'shout' }],
        ],
      },
      {
        when: { hpBelow: ['vepar', 60] }, once: true,
        script: [
          ['shake', 0.3, 0.8],
          ['say', 'vepar', 'Rise, faithful dead of Lyonesse! Your Cardinal has need of you!', { mood: 'shout' }],
          ['reveal', 'crypt1'],
          ['reveal', 'crypt2'],
        ],
      },
      {
        when: { hpBelow: ['vepar', 25] }, once: true,
        script: [
          ['say', 'vepar', 'This flesh was a poor vessel... a fat old priest, pickled in wine and flattery... it fails me...'],
        ],
      },
    ],
    rewards: { gil: 5000, items: ['elixir'] },
  },
];
