// ============================================================================
//  Battles for the first half of Chapter IV — "For Whom the Crown".
//  Dogol Pass → Bervaine → Finneth River → Zeltmoor → Bedlam Wastes →
//  Bethel (walls, sluice) → Germain Peak → Poskar Mere → Limbourne (gate,
//  hall, chapel of Zepar). Party level here runs roughly 30–40, so rank-and-
//  file enemies sit at +0..+2 and bosses at +3..+5.
// ============================================================================
import type { BattleDef } from '../types';

export const battles: BattleDef[] = [
  // --------------------------------------------------------------------------
  //  1. Dogol Pass — Melisande's first ambush. She withdraws when hurt; her
  //     Temple men fight on.
  // --------------------------------------------------------------------------
  {
    id: 'b_dogol', name: 'Dogol Pass', map: 'dogol_pass', music: 'boss',
    units: [
      { char: 'melisande', level: '+3', at: [5, 3], facing: 'S', boss: true, hpMult: 1.8, equip: { rhand: 'defender' } },
      { job: 'knight', name: 'Temple Guard', level: '+1', at: [4, 6], facing: 'S', secondary: 'squire' },
      { job: 'knight', name: 'Temple Guard', level: '+1', at: [6, 5], facing: 'S', reaction: 'weaponGuard' },
      { job: 'lancer', name: 'Temple Lancer', level: '+1', at: [2, 6], facing: 'S' },
      { job: 'lancer', name: 'Temple Lancer', level: '+1', at: [9, 6], facing: 'S' },
      { job: 'archer', name: 'Temple Archer', level: '+0', at: [10, 5], facing: 'S', support: 'concentrate' },
      { job: 'wizard', name: 'Temple Adept', level: '+1', at: [7, 1], facing: 'S' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { hpBelow: ['melisande', 45] },
        script: [
          ['say', 'melisande', 'Ngh...! You fight like a knight of the old orders — not like any heretic I was promised.'],
          ['say', 'rhen', 'Ask your father where Isidore died, Melisande. Ask him whose hand held the blade.'],
          ['say', 'melisande', 'I will ask him. And when he answers, I will come back for your head.', { mood: 'shout' }],
          ['retreat', 'melisande'],
        ],
      },
    ],
    treasure: [[2, 6, 'hiEther', 'elixir'], [9, 5, 'xPotion', 'angelRing']],
    rewards: { gil: 3200 },
    hint: 'Lancers wait on the ledge and the tower. Melisande will not fight to the death.',
  },

  // --------------------------------------------------------------------------
  //  2. Bervaine — Melisande again, with her sisters of the Sanctum on the
  //     rooftops. Wound her badly enough and she calls the retreat.
  // --------------------------------------------------------------------------
  {
    id: 'b_bervaine', name: 'Bervaine, Guildhall Square', map: 'bervaine_square', music: 'boss',
    units: [
      { char: 'melisande', level: '+3', at: [6, 5], facing: 'S', boss: true, hpMult: 2, equip: { rhand: 'defender', accessory: 'chansonPerfume' } },
      { job: 'ninja', gender: 'f', name: 'Sanctum Shadow', level: '+2', at: [12, 5], facing: 'W' },
      { job: 'archer', gender: 'f', name: 'Sanctum Archer', level: '+1', at: [4, 0], facing: 'S', support: 'concentrate' },
      { job: 'archer', gender: 'f', name: 'Sanctum Archer', level: '+1', at: [12, 1], facing: 'S' },
      { job: 'summoner', gender: 'f', name: 'Sanctum Summoner', level: '+1', at: [1, 1], facing: 'S', equip: { body: 'blackRobe' } },
      { job: 'summoner', gender: 'f', name: 'Sanctum Summoner', level: '+1', at: [1, 6], facing: 'E', equip: { body: 'blackRobe' } },
    ],
    victory: { type: 'defeat', ids: ['melisande'] },
    events: [
      {
        when: { hpBelow: ['melisande', 40] },
        script: [
          ['say', 'melisande', 'Why do you hold back? You could have finished me twice over.'],
          ['say', 'rhen', 'Because you are not my enemy. You have only been told that you are.'],
          ['say', 'melisande', '...Enough. Sisters, fall back!'],
          ['say', 'melisande', 'This isn\'t over, Valorne. I swear it on Isidore\'s grave.', { mood: 'shout' }],
          ['retreat', 'melisande'],
          ['battleEnd', 'victory'],
        ],
      },
    ],
    treasure: [[4, 1, 'hiPotion', 'reflectRing'], [11, 7, 'ether', 'magicShuriken']],
    rewards: { gil: 3600 },
    hint: 'Archers and summoners hold the high roofs. Drive Melisande off to win.',
  },

  // --------------------------------------------------------------------------
  //  3. Finneth River — Inquisitor Zalmon's last stand at the ancient bridge.
  // --------------------------------------------------------------------------
  {
    id: 'b_finneth', name: 'Finneth River', map: 'finneth_river', music: 'boss',
    units: [
      { char: 'zalmon', level: '+4', at: [5, 1], facing: 'S', boss: true, hpMult: 2.2 },
      { job: 'knight', name: 'Inquisition Knight', level: '+1', at: [4, 4], facing: 'S', reaction: 'weaponGuard' },
      { job: 'knight', name: 'Inquisition Knight', level: '+1', at: [5, 4], facing: 'S' },
      { job: 'mystic', name: 'Inquisition Mystic', level: '+1', at: [2, 2], facing: 'S' },
      { job: 'mystic', name: 'Inquisition Mystic', level: '+1', at: [8, 2], facing: 'S' },
      { job: 'archer', name: 'Inquisition Archer', level: '+1', at: [10, 0], facing: 'S', support: 'concentrate' },
      { job: 'monk', name: 'Inquisition Monk', level: '+2', at: [11, 4], facing: 'S' },
    ],
    victory: { type: 'defeat', ids: ['zalmon'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'zalmon', 'Hold the bridge, brothers! Let no heretic foot defile the northern bank!', { mood: 'shout' }],
        ],
      },
      {
        when: { hpBelow: ['zalmon', 50] },
        script: [
          ['say', 'zalmon', 'Saint Auren, lend me Thy fire! Let the heretic feel the weight of Heaven!', { mood: 'shout' }],
          ['vfx', 'holy', 'zalmon'],
          ['status', 'zalmon', 'faith', true],
          ['status', 'zalmon', 'protect', true],
        ],
      },
    ],
    treasure: [[10, 6, 'xPotion', 'healingStaff'], [0, 5, 'remedy', 'hiEther']],
    rewards: { gil: 4000 },
    hint: 'Knights hold the bridge; the ford to the east is shallow enough to wade. Defeat Zalmon.',
  },

  // --------------------------------------------------------------------------
  //  4. Zeltmoor Castle — the Black Lion's honour guard.
  // --------------------------------------------------------------------------
  {
    id: 'b_zeltmoor', name: 'Zeltmoor Castle', map: 'zeltmoor_court', music: 'battle2',
    units: [
      { id: 'stane', job: 'samurai', gender: 'm', name: 'Captain Stane', level: '+3', at: [6, 2], facing: 'S', hpMult: 1.3, reaction: 'bladeGrasp' },
      { job: 'knight', name: 'Honour Guard', level: '+1', at: [3, 5], facing: 'S' },
      { job: 'knight', name: 'Honour Guard', level: '+1', at: [10, 5], facing: 'S' },
      { job: 'knight', name: 'Honour Guard', level: '+2', at: [7, 3], facing: 'S', reaction: 'weaponGuard' },
      { job: 'archer', name: 'Rampart Archer', level: '+1', at: [1, 7], facing: 'E' },
      { job: 'archer', name: 'Rampart Archer', level: '+1', at: [12, 6], facing: 'W' },
      { job: 'priest', name: 'Castle Chaplain', level: '+1', at: [7, 1], facing: 'S' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { hpBelow: ['stane', 35] },
        script: [
          ['say', 'stane', 'Hold the stair! The Duke\'s honour is our own — no heretic sets foot in the keep!', { mood: 'shout' }],
        ],
      },
    ],
    treasure: [[11, 3, 'hiPotion', 'kotetsu'], [2, 9, 'phoenixDown', 'xPotion']],
    rewards: { gil: 4200 },
    hint: 'Archers man the west and east ramparts. Stairs at the sides of the ward lead up to them.',
  },

  // --------------------------------------------------------------------------
  //  5. Bedlam Wastes — Garrow Brask, a Cogsgard gunwright turned Church
  //     bounty-hunter. Behemoths and cockatrices follow the armies for carrion
  //     and attack anyone they find.
  // --------------------------------------------------------------------------
  {
    id: 'b_bedlam', name: 'Bedlam Wastes', map: 'bedlam_wastes', music: 'battle3',
    units: [
      { id: 'brask', job: 'gunKnight', gender: 'm', name: 'Garrow Brask', level: '+3', at: [10, 6], facing: 'W', boss: true, hpMult: 1.6, equip: { rhand: 'glacierGun' } },
      { job: 'knight', name: 'Bounty Hunter', level: '+1', at: [6, 5], facing: 'S' },
      { job: 'knight', name: 'Bounty Hunter', level: '+1', at: [7, 3], facing: 'S' },
      { job: 'archer', name: 'Bounty Hunter', level: '+1', at: [2, 2], facing: 'S', support: 'concentrate' },
      { job: 'wizard', name: 'Hedge Sorcerer', level: '+2', at: [5, 1], facing: 'S' },
      { job: 'behemoth', level: '+1', at: [13, 11], facing: 'W', team: 2 },
      { job: 'cockatrice', level: '+0', at: [8, 11], facing: 'W', team: 2 },
      { job: 'cockatrice', level: '+0', at: [13, 5], facing: 'W', team: 2 },
    ],
    victory: { type: 'defeat', ids: ['brask'] },
    events: [
      {
        when: { turn: 2 },
        script: [
          ['sfx', 'roar'],
          ['say', 'brask', 'Blast those beasts! Shoot anything with horns — and anything with a heretic\'s face!', { mood: 'shout' }],
        ],
      },
      {
        when: { hpBelow: ['brask', 35] },
        script: [
          ['say', 'brask', 'Ha! Bastian\'s boy taught you to fight, did he? The Church never mentioned that.'],
        ],
      },
    ],
    treasure: [[1, 1, 'xPotion', 'blazeGun'], [11, 8, 'hiEther', 'zephyrPerfume']],
    rewards: { gil: 4500 },
    hint: 'The beasts are nobody\'s allies. Defeat Garrow Brask on the eastern mesa.',
  },

  // --------------------------------------------------------------------------
  //  6. Bethel Garrison — the curtain wall, scaled through the siege breach.
  // --------------------------------------------------------------------------
  {
    id: 'b_bethel_wall', name: 'Bethel Garrison', map: 'bethel_wall', music: 'battle2',
    units: [
      { id: 'wallSergeant', job: 'knight', name: 'Southsky Sergeant', level: '+2', at: [6, 6], facing: 'S', reaction: 'weaponGuard' },
      { job: 'knight', name: 'Southsky Knight', level: '+1', at: [9, 7], facing: 'S' },
      { job: 'archer', name: 'Southsky Archer', level: '+1', at: [3, 8], facing: 'S', support: 'concentrate' },
      { job: 'archer', name: 'Southsky Archer', level: '+1', at: [10, 8], facing: 'S' },
      { job: 'ninja', name: 'Southsky Scout', level: '+2', at: [5, 7], facing: 'S' },
      { job: 'thief', name: 'Southsky Cutpurse', level: '+1', at: [8, 6], facing: 'S' },
      { job: 'summoner', name: 'Southsky Summoner', level: '+1', at: [12, 6], facing: 'S' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'wallSergeant', 'Climbers on the breach! Stones, arrows, anything — throw them off the wall!', { mood: 'shout' }],
        ],
      },
    ],
    treasure: [[4, 9, 'xPotion', 'iceBrand'], [12, 7, 'hiEther', 'lightRobe']],
    rewards: { gil: 4800 },
    hint: 'The rubble of the breach is the quickest way onto the wall-walk.',
  },

  // --------------------------------------------------------------------------
  //  7. Bethel Sluice — reach the lever atop the dam and flood the plain.
  // --------------------------------------------------------------------------
  {
    id: 'b_bethel_sluice', name: 'The Sluice of Bethel', map: 'bethel_sluice', music: 'battle3',
    units: [
      { id: 'warden', job: 'knight', name: 'Sluice Warden', level: '+2', at: [6, 1], facing: 'S', ai: 'guard', reaction: 'weaponGuard', equip: { rhand: 'iceBrand' } },
      { job: 'knight', name: 'Southsky Knight', level: '+2', at: [8, 1], facing: 'S', ai: 'guard', equip: { rhand: 'iceBrand' } },
      { job: 'knight', name: 'Southsky Knight', level: '+1', at: [5, 3], facing: 'S' },
      { job: 'knight', name: 'Southsky Knight', level: '+1', at: [8, 3], facing: 'S' },
      { job: 'wizard', name: 'Southsky Battlemage', level: '+2', at: [3, 1], facing: 'S', faith: 80 },
      { job: 'wizard', name: 'Southsky Battlemage', level: '+2', at: [10, 1], facing: 'S', faith: 80 },
      { job: 'archer', name: 'Southsky Archer', level: '+1', at: [0, 1], facing: 'S', support: 'concentrate' },
      { job: 'archer', name: 'Southsky Archer', level: '+1', at: [13, 1], facing: 'S', support: 'concentrate' },
    ],
    victory: { type: 'reach', cells: [[7, 1]] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'warden', 'Nobody touches that lever without the Duke\'s seal! Hold the dam!', { mood: 'shout' }],
        ],
      },
      {
        when: { turn: 3 },
        script: [
          ['sfx', 'explosion'],
          ['shake', 0.3, 0.8],
          ['say', 'warden', 'The Northsky\'s guns again... Hold, curse you! Whatever happens down there, the gate stays shut!'],
        ],
      },
    ],
    treasure: [[1, 8, 'xPotion', 'diamondArmor'], [12, 9, 'hiEther', 'defenseRing']],
    rewards: { gil: 5000 },
    hint: 'Victory: any ally stands on the lever atop the dam (the great gear-house, centre north).',
  },

  // --------------------------------------------------------------------------
  //  8. Germain Peak — the Church's shadow-hands come for the Thunder Saint.
  // --------------------------------------------------------------------------
  {
    id: 'b_germain', name: 'Germain Peak', map: 'germain_peak', music: 'battle1',
    units: [
      { id: 'shadowMaster', job: 'ninja', gender: 'm', name: 'Nameless Master', level: '+3', at: [10, 2], facing: 'S', hpMult: 1.3, reaction: 'reflexes' },
      { job: 'ninja', gender: 'm', name: 'Shadow of Murondel', level: '+2', at: [2, 4], facing: 'S' },
      { job: 'ninja', gender: 'm', name: 'Shadow of Murondel', level: '+2', at: [11, 5], facing: 'S' },
      { job: 'thief', gender: 'm', name: 'Shadow of Murondel', level: '+1', at: [8, 7], facing: 'S', secondary: 'samurai' },
      { job: 'archer', gender: 'm', name: 'Crag Archer', level: '+1', at: [3, 1], facing: 'S' },
      { job: 'archer', gender: 'm', name: 'Crag Archer', level: '+1', at: [12, 2], facing: 'S' },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { hpBelow: ['shadowMaster', 40] },
        script: [
          ['say', 'shadowMaster', 'The Thunder Saint... the tales undersold him.'],
        ],
      },
    ],
    treasure: [[9, 0, 'xPotion', 'kogaBlade'], [1, 5, 'hiEther', 'shinobiGarb']],
    rewards: { gil: 4200, items: ['germainBoots'] },
    hint: 'The crags are split by chasms. The summit path winds up the middle.',
  },

  // --------------------------------------------------------------------------
  //  9. Poskar Mere — the drowned knights of Limbourne. Undead rise again
  //     when their count runs out, and more climb out of the water.
  // --------------------------------------------------------------------------
  {
    id: 'b_poskar', name: 'Poskar Mere', map: 'poskar_mere', music: 'battle3',
    units: [
      { id: 'paleLady', job: 'summoner', gender: 'f', name: 'Pale Lady of Limbourne', level: '+2', at: [9, 1], facing: 'S', statuses: ['undead'] },
      { job: 'knight', name: 'Drowned Knight', level: '+1', at: [7, 6], facing: 'S', statuses: ['undead'] },
      { job: 'knight', name: 'Drowned Knight', level: '+1', at: [2, 4], facing: 'S', statuses: ['undead'] },
      { job: 'knight', name: 'Drowned Knight', level: '+2', at: [11, 6], facing: 'S', statuses: ['undead'] },
      { job: 'archer', name: 'Drowned Bowman', level: '+1', at: [8, 2], facing: 'S', statuses: ['undead'] },
      { job: 'revenant', level: '+1', at: [5, 3], facing: 'S' },
      { job: 'revenant', level: '+1', at: [12, 3], facing: 'S' },
      { id: 'drownedA', job: 'livingBone', level: '+1', at: [5, 5], facing: 'S', hidden: true },
      { id: 'drownedB', job: 'livingBone', level: '+1', at: [10, 5], facing: 'S', hidden: true },
    ],
    victory: { type: 'defeatAll' },
    events: [
      {
        when: { enemiesLeft: 3 },
        script: [
          ['sfx', 'bell'],
          ['say', 'paleLady', 'Rise, drowned ones. The bell has not finished ringing.'],
          ['vfx', 'dark', [5, 5]],
          ['reveal', 'drownedA'],
          ['vfx', 'dark', [10, 5]],
          ['reveal', 'drownedB'],
        ],
      },
    ],
    treasure: [[1, 7, 'holyWater', 'phoenixDown'], [10, 2, 'xPotion', 'vampireMantle']],
    rewards: { gil: 4600 },
    hint: 'The dead rise again unless finished quickly. Holy and fire bite deepest; Phoenix Down destroys them outright.',
  },

  // --------------------------------------------------------------------------
  //  10. Limbourne gate — Cerise and Lida hold the causeway gatehouse.
  // --------------------------------------------------------------------------
  {
    id: 'b_limbourne_gate', name: 'Limbourne Castle Gate', map: 'limbourne_gate', music: 'boss',
    units: [
      { char: 'cerise', level: '+3', at: [4, 1], facing: 'S', boss: true, hpMult: 1.5 },
      { char: 'lida', level: '+3', at: [10, 1], facing: 'S', boss: true, hpMult: 1.5 },
      { job: 'vampireCat', level: '+1', at: [7, 5], facing: 'S' },
      { job: 'vampireCat', level: '+1', at: [6, 7], facing: 'S' },
      { job: 'plague', level: '+1', at: [3, 6], facing: 'S' },
      { job: 'plague', level: '+1', at: [12, 7], facing: 'S' },
    ],
    victory: { type: 'defeatAny', ids: ['cerise', 'lida'] },
    events: [
      {
        when: { hpBelow: ['cerise', 35] },
        script: [
          ['say', 'cerise', 'Ah! He cut me, sister. He actually cut me.'],
          ['say', 'lida', 'Then we must tell Master. He will so want to see.'],
          ['anim', 'cerise', 'laugh'],
          ['retreat', 'cerise'],
          ['retreat', 'lida'],
          ['battleEnd', 'victory'],
        ],
      },
      {
        when: { hpBelow: ['lida', 35] },
        script: [
          ['say', 'lida', 'Oh... that stung. How rude of him.'],
          ['say', 'cerise', 'Come, sister. Let Master teach him manners.'],
          ['anim', 'lida', 'laugh'],
          ['retreat', 'lida'],
          ['retreat', 'cerise'],
          ['battleEnd', 'victory'],
        ],
      },
    ],
    treasure: [[3, 7, 'xPotion', 'sanguinePerfume'], [12, 8, 'hiEther', 'featherMantle']],
    rewards: { gil: 5000 },
    hint: 'Cerise and Lida leap from the towers. Wound either one badly and both withdraw.',
  },

  // --------------------------------------------------------------------------
  //  11. Limbourne great hall — the Marquis Elmond and his maids. When the
  //      Marquis is hurt he withdraws to his chapel; a fallen maid wakes
  //      something in the coffins.
  // --------------------------------------------------------------------------
  {
    id: 'b_limbourne_elmond', name: 'Limbourne Castle, the Great Hall', map: 'limbourne_hall', music: 'boss',
    units: [
      {
        char: 'elmond', level: '+4', at: [6, 2], facing: 'S', boss: true, hpMult: 2.2,
        equip: { rhand: 'masamune', lhand: 'shogunShield', head: 'shogunHelm', body: 'shogunArmor', accessory: 'shogunGauntlet' },
      },
      { char: 'cerise', level: '+3', at: [1, 5], facing: 'E', hpMult: 1.2 },
      { char: 'lida', level: '+3', at: [12, 1], facing: 'S', hpMult: 1.2 },
      { job: 'vampireCat', level: '+1', at: [3, 4], facing: 'S' },
      { job: 'vampireCat', level: '+1', at: [10, 4], facing: 'S' },
      { id: 'hallWraithA', job: 'plague', level: '+2', at: [12, 8], facing: 'W', hidden: true },
      { id: 'hallWraithB', job: 'plague', level: '+2', at: [2, 9], facing: 'E', hidden: true },
    ],
    victory: { type: 'defeat', ids: ['elmond'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'elmond', 'Do forgive the dust. We so rarely have living guests.'],
        ],
      },
      {
        when: { ko: 'cerise' },
        script: [
          ['say', 'lida', 'Sister...! Master — the guests in the boxes are waking!', { mood: 'shout' }],
          ['sfx', 'demon'],
          ['reveal', 'hallWraithA'],
        ],
      },
      {
        when: { ko: 'lida' },
        script: [
          ['say', 'cerise', 'Lida? Lida! Oh, you will pay for that, little heretic.', { mood: 'shout' }],
          ['sfx', 'demon'],
          ['reveal', 'hallWraithB'],
        ],
      },
      {
        when: { hpBelow: ['elmond', 40] },
        script: [
          ['say', 'elmond', 'Oh, well struck! Do you know, no one has drawn my blood in eighty years?'],
          ['say', 'elmond', 'I really must change for dinner. The chapel, I think. Do follow — you are the main course.'],
          ['vfx', 'teleport', 'elmond'],
          ['retreat', 'elmond'],
          ['battleEnd', 'victory'],
        ],
      },
    ],
    treasure: [[12, 10, 'hiEther', 'bloodSword'], [1, 12, 'xPotion', 'robeOfLords']],
    rewards: { gil: 5500 },
    hint: 'The Marquis teleports at will and parries blades. Magic finds him more surely than steel.',
  },

  // --------------------------------------------------------------------------
  //  12. Limbourne chapel — Zepar, the Death Seraph (Gemini). Melisande,
  //      who followed the company into the castle, fights at Rhen's side.
  // --------------------------------------------------------------------------
  {
    id: 'b_zepar', name: 'Zepar, the Twin-Souled', map: 'limbourne_chapel', music: 'umbral', time: 'void',
    units: [
      { job: 'zepar', id: 'zepar', boss: true, hpMult: 3.5, level: '+5', at: [6, 2], facing: 'S' },
      { char: 'melisande', level: '+2', at: [12, 8], facing: 'W', team: 0, ai: 'aggressive', equip: { rhand: 'defender' } },
      { job: 'knight', name: 'Risen Knight', level: '+2', at: [4, 5], facing: 'S', statuses: ['undead'] },
      { job: 'knight', name: 'Risen Knight', level: '+2', at: [9, 5], facing: 'S', statuses: ['undead'] },
      { job: 'livingBone', level: '+2', at: [2, 2], facing: 'S' },
      { job: 'bonesnatch', level: '+2', at: [12, 1], facing: 'S' },
      { job: 'revenant', level: '+2', at: [8, 4], facing: 'S' },
      { id: 'cryptDeadA', job: 'livingBone', level: '+2', at: [1, 1], facing: 'S', hidden: true },
      { id: 'cryptDeadB', job: 'bonesnatch', level: '+2', at: [3, 3], facing: 'S', hidden: true },
    ],
    victory: { type: 'defeat', ids: ['zepar'] },
    events: [
      {
        when: { start: true },
        script: [
          ['say', 'melisande', 'Whatever you are — in the name of my brother, I will cut you down!', { mood: 'shout' }],
        ],
      },
      {
        when: { hpBelow: ['zepar', 50] },
        script: [
          ['say', 'zepar', 'THE CRYPT REMEMBERS ITS LORD. RISE, AND SERVE.', { mood: 'shout' }],
          ['sfx', 'demon'],
          ['vfx', 'dark', [1, 1]],
          ['reveal', 'cryptDeadA'],
          ['vfx', 'dark', [3, 3]],
          ['reveal', 'cryptDeadB'],
        ],
      },
      {
        when: { hpBelow: ['zepar', 20] },
        script: [
          ['say', 'zepar', 'THIS FLESH WAS A THOUSAND YEARS IN THE MAKING... YOU WILL NOT... UNMAKE IT...'],
        ],
      },
    ],
    treasure: [[2, 1, 'elixir', 'saltRosePerfume'], [11, 2, 'hiEther', 'hundredGems']],
    rewards: { gil: 8000, items: ['elixir'] },
    hint: 'Zepar raises the dead and marks the living for the grave. Keep your fallen on their feet.',
  },
];
