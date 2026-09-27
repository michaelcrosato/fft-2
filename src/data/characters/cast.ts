// The named cast of Final Fealty Tactics (see docs/DESIGN.md §1 "Cast").
// Equipment is intentionally sparse: battle/story files set gear per battle.
// Bio entries are [storyFlag, text]; a battle id is set as a flag when that battle is won.
// Side-quest flags used here: sq_colliery (Beorn & Rhosyn join), sq_nevel (Rhosyn restored),
// sq_octo (Automaton VIII activated), sq_flower (Aline's flower bought), sq_kestrel (Kestrel joins),
// sq_deep (Midnight Deep cleared, Grimwald joins).
import type { CharacterDef } from '../types';

// Unique-job action ids, so a character keeps them when a battle spawns them in another job
// (e.g. Delan is a squire in Chapter I and a Lion Knight later; Rhosyn is a dragon until Nevel).
const LION_ARTS = ['lionFang', 'lionCrownCleaver', 'lionThunder', 'lionLowbornJudgement', 'lionOath'];
const DRAGONCRAFT = ['dragonkinWyrmbond', 'dragonkinTending', 'dragonkinMight', 'dragonkinAscent', 'dragonkinHolyBreath'];

// Palettes shared by factions
const ROYAL_GUARD = { primary: '#3b5fa8', secondary: '#e8e4dc', accent: '#d8b85a', metal: '#d0d6de', leather: '#4a3423' };
const SANCTUM = { primary: '#e8e4dc', secondary: '#2a2a38', accent: '#a01a2a', metal: '#c8ccd4', leather: '#2a2020' };
const LIMBOURNE_MAID = { secondary: '#1a1a1e', accent: '#e8d0a0', leather: '#2a1a1a' };

export const characters: CharacterDef[] = [
  // =========================================================================
  //  The Valornes and their household
  // =========================================================================
  {
    id: 'rhen', name: 'Rhen', fullName: 'Rhen Valorne', title: 'Youngest Son of House Valorne',
    gender: 'm', zodiac: 'capricorn', job: 'hero', level: 0, brave: 72, faith: 64,
    equip: { rhand: 'broadsword', head: 'leatherCap', body: 'clothes' },
    look: { skin: '#f1d3b3', hair: '#e0c070', hairStyle: 'ponytail', eyes: '#4a78b0', beard: 'none', height: 1.0, bulk: 1.0 },
    story: true, color: '#3f64a8',
    bio: [
      ['', 'Youngest son of Lord Baldric Valorne, by a mother not of noble blood. A cadet of the Galwyn academy under the Northsky banner, sworn to his father\'s last words: never shame the name, never suffer injustice.'],
      ['b_ziekhold', 'At Fort Ziekhold he watched his own brother trade a commoner girl\'s life for a point of pride. He laid down the Valorne name that day and walked away from Ygress without looking back.'],
      ['b_zirkel', 'A year a sellsword under Garmond\'s banner, he found Delan alive at Zirkel Falls — and chose, for the first time in his life, whose side he stood on.'],
      ['b_lesandre', 'For slaying a Cardinal who was no longer a man, the Glorian Church has branded him a heretic. He carries the charge the way he once carried his name.'],
      ['b_orvelle_b1', 'Brother Simeon entrusted him with the Germaine Scriptures. Saving Alys and preserving the testimony the Church wished to destroy became parts of the same struggle.'],
      ['b_riverain_roof', 'Rana\'s stone restored Malik without taking possession of her. Rhen had seen nobles turn the relics toward domination; now he had seen a sister use one to save a life. He could no longer call the stones themselves wholly evil.'],
      ['b_altessa', 'The Church records that Rhen Valorne died a heretic and was forgotten. The Church has been wrong before.'],
    ],
  },
  {
    id: 'alys', name: 'Alys', fullName: 'Alys Valorne', title: 'Novice of Orvelle Abbey',
    gender: 'f', zodiac: 'virgo', job: 'cleric', level: 0, brave: 55, faith: 82,
    reaction: 'regenerator', support: 'shortCharge',
    look: { skin: '#f5dcc4', hair: '#e8cc80', hairStyle: 'long', eyes: '#4a78b0', height: 0.92, bulk: 0.88 },
    color: '#e8cc80',
    bio: [
      ['', 'Rhen\'s younger sister, a student at Orvelle Abbey. Kind and stubborn in equal measure, she writes to her brother every month whether he answers or not.'],
      ['b_lesandre', 'Branded a heretic\'s accomplice for standing at her brother\'s side in Lesandre. She did not hesitate for a moment.'],
      ['b_orvelle_b1', 'Taken from Orvelle by Isidore Tengel. The Sanctum Knights call her "the Vessel", and will not say of what.'],
      ['b_beleth', 'Even in captivity at Riverain she tended the wounded Isidore, the knight who had taken her from home. His doubts did not save him from his father, but Alys heard them before he died.'],
      ['b_altessa', 'Altessa, the Crimson Seraph, was reborn through her body — and yet at the last it was Alys\'s own voice that spoke through the light. Her grave at Orvelle is empty.'],
    ],
  },
  {
    id: 'baldric', name: 'Baldric', fullName: 'Lord Baldric Valorne', title: 'Lord of House Valorne',
    gender: 'm', zodiac: 'aries', job: 'knight', level: 10, brave: 80, faith: 60,
    look: {
      skin: '#e8c39e', hair: '#c8c4b8', hairStyle: 'short', eyes: '#4a6a8a', beard: 'full', height: 1.08, bulk: 1.1,
      outfit: { headgear: 'none', torso: 'plate', cape: 'long', palette: { primary: '#2a3a6a', secondary: '#e8dcb8', accent: '#d8b04a', metal: '#c0c4cc', leather: '#4a3423' } },
    },
    bio: [
      ['', 'Hero of the Fifty Winters\' War and the most respected knight in Ivaldis. A lingering sickness took him in the winter before this tale begins.'],
      ['b_galwyn', 'On his deathbed he charged his elder sons with the house and his youngest with its honour: "Never shame your name. Never suffer injustice."'],
      ['b_bethel_sluice', 'The dying White Lion spoke a truth with his last breath: Lord Baldric\'s sickness was poison, and the hand that poured it was his eldest son\'s.'],
    ],
  },
  {
    id: 'dorian', name: 'Dorian', fullName: 'Dorian Valorne', title: 'Lord of House Valorne',
    gender: 'm', zodiac: 'scorpio', job: 'arcKnight', level: 4, brave: 66, faith: 77,
    reaction: 'bladeGrasp', support: 'attackUp', movement: 'move1',
    look: {
      skin: '#f1d3b3', hair: '#c8a860', hairStyle: 'slick', eyes: '#6a8a60', beard: 'mustache', height: 1.08, bulk: 1.02,
      outfit: { headgear: 'none', cape: 'long', palette: { primary: '#5a1e2a', secondary: '#2a2a2e', accent: '#d8b04a', metal: '#b0a890', leather: '#2a1e18' } },
    },
    color: '#5a1e2a',
    bio: [
      ['', 'Eldest son of House Valorne and its lord since his father\'s death. A cold, capable statesman and the White Lion\'s right hand.'],
      ['b_sandrat', 'The Marquis\'s kidnapping was no brigand\'s whim: Dorian and Duke Laurent paid Gustin Marr to stage it, and so blacken the Ashen Brigade\'s name.'],
      ['b_bethel_sluice', 'At Bethel he murdered Duke Laurent with his own hand and took command of the Northsky.'],
      ['b_ygress', 'Revealed as his father\'s poisoner, he took up a Zodiac Stone and became Azazel of the Umbral host. He died in the hall where he was born.'],
    ],
  },
  {
    id: 'zander', name: 'Zander', fullName: 'Zander Valorne', title: 'Knight-Commander of the Northsky',
    gender: 'm', zodiac: 'cancer', job: 'arcKnight', level: 3, brave: 72, faith: 64,
    reaction: 'weaponGuard', support: 'attackUp', movement: 'move1',
    look: {
      skin: '#e8c39e', hair: '#8a6a3a', hairStyle: 'short', eyes: '#4a6a8a', beard: 'stubble', height: 1.1, bulk: 1.12,
      outfit: { headgear: 'none', cape: 'long', palette: { primary: '#2a4a8a', secondary: '#e8e4dc', accent: '#d8b04a', metal: '#c8ccd4', leather: '#4a3423' } },
    },
    color: '#2a4a8a',
    bio: [
      ['', 'Second son of House Valorne and Knight-Commander of the Northsky Knights. Honest, proud and rigid — a man who has never once doubted the order of the world.'],
      ['b_ziekhold', 'He refused to bargain for a commoner\'s life at Fort Ziekhold. The order he gave there killed Tessa Harrow.'],
      ['b_lesandre', 'He would not hear Rhen\'s warning in Lesandre, and named his half-brother a disgrace to their father\'s blood.'],
      ['b_ygress', 'Too late he learned that Dorian had poisoned their father. He fell upon his brother in a fury — and was swept away by the demon Dorian became.'],
      ['b_murondel1', 'Raised as a dead thing by the Sanctum Knights and set against Rhen in Murondel. His last words were a plea to be ended, and an apology.'],
    ],
  },
  {
    id: 'delan', name: 'Delan', fullName: 'Delan Harrow', title: 'Commoner-Born Cadet',
    gender: 'm', zodiac: 'sagittarius', job: 'squire', level: 0, brave: 70, faith: 58,
    equip: { rhand: 'broadsword', body: 'clothes' },
    reaction: 'counterTackle', movement: 'move1',
    learned: ['focus', 'rush', 'stoneToss', ...LION_ARTS],
    look: {
      skin: '#e8c39e', hair: '#6b4a2b', hairStyle: 'shaggy', eyes: '#5a3a20', beard: 'none', height: 1.02, bulk: 1.0,
      outfit: { cape: 'scarf', palette: { primary: '#4a5a7a', secondary: '#7a5a3a', accent: '#c8b080', metal: '#b8bcc4', leather: '#5a3b24' } },
    },
    color: '#6b4a2b',
    bio: [
      ['', 'Rhen\'s dearest friend, a commoner raised in the Valorne household with his sister Tessa after the plague took their parents. Clever, proud, and quicker with a blade than any noble cadet.'],
      ['b_orvelle', 'At Orvelle Abbey a rider with a dead man\'s face carried off the princess on a kwehbo. Rhen knew him at once.'],
      ['b_ziekhold', 'He held Tessa as she died, shot by a noble\'s bolt from his own side of the line. Then the fort burned, and Delan Harrow was gone.'],
      ['b_cogsgard', '"Everyone is swept along by the current. I\'m swimming against it." He guards Oriane now — or guards his claim upon her.'],
      ['b_bervaine', 'He exposed the Church\'s design to let both Lions exhaust themselves and then choose the victor. He means to escape the place allotted to him by birth by mastering the very bargains that destroyed Tessa.'],
      ['b_bethel_sluice', 'At Bethel he put a knife in the Black Lion and took his army for his own. The commoner cadet stands a single step from the throne. In time he will be King Delan of Ivaldis, and the histories will call him the hero who ended the Pride War.'],
    ],
  },
  {
    id: 'tessa', name: 'Tessa', fullName: 'Tessa Harrow', title: 'Delan\'s Sister',
    gender: 'f', zodiac: 'pisces', job: 'chemist', level: 0, brave: 50, faith: 70,
    look: {
      skin: '#f1d3b3', hair: '#6b4a2b', hairStyle: 'long', eyes: '#5a3a20', height: 0.9, bulk: 0.85,
      outfit: { headgear: 'none', torso: 'dress', legs: 'skirt', cape: 'none', extras: [], palette: { primary: '#d8c8a0', secondary: '#8a6a4a', accent: '#b04a4a', leather: '#6a4a30' } },
    },
    bio: [
      ['', 'Delan\'s younger sister: gentle, bookish, and the only soul who can make her brother laugh at himself. The Valornes took her in as a ward; the academy never let her forget she was not family.'],
      ['b_thieveskeep', 'Carried off from Ygress by the Ashen Brigade, who mistook the commoner girl for a Valorne daughter.'],
      ['b_ziekhold', 'She died at Fort Ziekhold, struck by Argan Vire\'s bolt while Knight-Commander Zander looked on. Her brother never forgave the world for it.'],
    ],
  },
  // =========================================================================
  //  Chapter I — Galwyn cadets and the Ashen Brigade
  // =========================================================================
  {
    id: 'argan', name: 'Argan', fullName: 'Argan Vire', title: 'Squire to the Marquis of Limbourne',
    gender: 'm', zodiac: 'leo', job: 'knight', level: 1, brave: 62, faith: 48,
    reaction: 'counterTackle', support: 'equipCrossbow', movement: 'move1',
    look: {
      skin: '#f5dcc4', hair: '#3b2a1e', hairStyle: 'slick', eyes: '#2a2a2a', height: 1.0,
      outfit: { headgear: 'none', palette: { primary: '#6a1e24', secondary: '#2a2a2e', accent: '#c0c0c8', metal: '#b0b4bc', leather: '#3a2a20' } },
    },
    bio: [
      ['', 'A squire in the service of the Marquis of Limbourne. Well-born, well-spoken, and utterly convinced that commoners are cattle.'],
      ['b_mandrel', 'Rescued from brigands on the Mandrel Plains by Rhen and Delan, he begged House Valorne to save his kidnapped lord.'],
      ['b_thieveskeep', 'When Tessa was taken he sneered that she was "only a commoner". Delan struck him down, and Rhen sent him away.'],
      ['b_ziekhold', 'He loosed the bolt that killed Tessa Harrow at Fort Ziekhold, and died on Delan\'s blade for it.'],
    ],
  },
  {
    id: 'wolfram', name: 'Wolfram', fullName: 'Wolfram Fell', title: 'Captain of the Ashen Brigade',
    gender: 'm', zodiac: 'virgo', job: 'whiteKnight', level: 2, brave: 71, faith: 64,
    reaction: 'weaponGuard', support: 'attackUp', movement: 'move1',
    look: {
      skin: '#e8c39e', hair: '#e8d890', hairStyle: 'long', eyes: '#5a8ab0', beard: 'none', height: 1.1, bulk: 1.1,
      outfit: { headgear: 'none', torso: 'plate', cape: 'long', shoulders: 'pauldrons', palette: { primary: '#f0eee8', secondary: '#8a96a8', accent: '#4a6a9a', metal: '#e4e8ee', leather: '#5a4a3a' } },
    },
    color: '#e8e4d8',
    bio: [
      ['', 'Captain of the Ashen Brigade and once the finest of the old Holy Knights. He leads veterans abandoned by the crown they bled for.'],
      ['b_sandrat', 'He executed his own officer, Gustin Marr, for dishonouring the Brigade with a kidnapping for ransom, and freed the Marquis unharmed.'],
      ['b_fovain', 'At Fovain Mill he crossed blades with Rhen and left the field bloodied, swearing vengeance for his sister.'],
      ['b_orvelle_b1', 'He returned wearing the colours of the Sanctum Knights, and took the Virgo stone from Orvelle\'s vault.'],
      ['b_beleth', 'At Riverain he gave himself wholly to a stone and became Beleth. Whatever remained of the man died with the demon.'],
    ],
  },
  {
    id: 'mirelle', name: 'Mirelle', fullName: 'Mirelle Fell', title: 'Lieutenant of the Ashen Brigade',
    gender: 'f', zodiac: 'virgo', job: 'knight', level: 1, brave: 68, faith: 58,
    reaction: 'counterTackle', support: 'defend', movement: 'move1',
    look: {
      skin: '#f1d3b3', hair: '#e0c880', hairStyle: 'long', eyes: '#5a8ab0', height: 0.98,
      outfit: { headgear: 'none', palette: { primary: '#7a6a58', secondary: '#4a4a52', accent: '#c85a3a', metal: '#9aa0a8', leather: '#4a3423' } },
    },
    bio: [
      ['', 'Wolfram\'s younger sister and his lieutenant. She believes the Brigade fights for every commoner in Ivaldis, not merely for bread.'],
      ['b_thieveskeep', 'Defeated at Thieves\' Keep, she escaped with her life — and Delan began to wonder which side was the right one.'],
      ['b_lenara', 'She died on the Lenara Plateau still arguing that nobles and commoners are made of the same clay. Rhen could not answer her.'],
    ],
  },
  {
    id: 'gustin', name: 'Gustin', fullName: 'Gustin Marr', title: 'Officer of the Ashen Brigade',
    gender: 'm', zodiac: 'taurus', job: 'knight', level: 1, brave: 58, faith: 42,
    reaction: 'counterTackle',
    look: {
      skin: '#d9a877', hair: '#3b2a1e', hairStyle: 'shaggy', eyes: '#3a2a1a', beard: 'stubble', height: 1.05, bulk: 1.1,
      outfit: { headgear: 'bandana', palette: { primary: '#5a4a38', secondary: '#3a3a3a', accent: '#8a2f2a', metal: '#8a8e96', leather: '#3a2a20' } },
    },
    bio: [
      ['', 'An officer of the Ashen Brigade, grown bitter and greedy in the lean years after the war.'],
      ['b_sandrat', 'He kidnapped the Marquis of Limbourne for ransom — on coin paid by the very nobles he claimed to hate. Wolfram executed him for it.'],
    ],
  },
  // =========================================================================
  //  The Prologue — Orvelle Abbey
  // =========================================================================
  {
    id: 'oriane', name: 'Oriane', fullName: 'Princess Oriane', title: 'Princess of Ivaldis',
    gender: 'f', zodiac: 'aquarius', job: 'princess', level: -2, brave: 45, faith: 78,
    look: { skin: '#f5dcc4', hair: '#c8a060', hairStyle: 'long', eyes: '#7a9ac0', height: 0.95, bulk: 0.9 },
    color: '#9ab8e0',
    bio: [
      ['', 'Princess of Ivaldis, raised quietly behind the walls of Orvelle Abbey, far from a court that has little use for her. She believes no one in the world truly wants her.'],
      ['b_orvelle', 'Carried off from Orvelle by a rider in Black Lion colours — who was, in truth, Delan Harrow.'],
      ['b_vepar', 'Delan brought her to Duke Galtran, who named her the rightful heir. Her name became the banner of the Pride War.'],
      ['b_bethel_sluice', 'With the two Lions dead, the woman each faction had treated as a claim to the throne stood beside the man who had taken their place. A crown offered no assurance that anyone had begun to regard her as a person.'],
      ['b_altessa', 'Queen Oriane of Ivaldis, wife to King Delan. The histories are silent on whether she was ever happy, and on the knife.'],
    ],
  },
  {
    id: 'adria', name: 'Adria', fullName: 'Adria Oakhelm', title: 'Holy Knight of the Royal Guard',
    gender: 'f', zodiac: 'cancer', job: 'holyKnight', level: 2, brave: 72, faith: 62,
    reaction: 'weaponGuard', support: 'maintenance', movement: 'move1',
    secondary: 'chemist', learned: ['usePotion', 'useHiPotion', 'usePhoenixDown'],
    look: { skin: '#f1d3b3', hair: '#e4c878', hairStyle: 'braid', eyes: '#3a6ea5', height: 1.02, bulk: 1.0 },
    color: '#3b5fa8',
    bio: [
      ['', 'Holy Knight of the Royal Guard and sworn protector of Princess Oriane. Upright, fearless, and very nearly humourless.'],
      ['b_orvelle', 'She failed to stop the princess\'s abduction at Orvelle, and has not forgiven herself.'],
      ['b_barrowvale', '"Released" by Cardinal Dracomir\'s men as bait, she was ambushed at Barrow Vale and saved by Rhen. She has followed him since.'],
      ['b_vepar', 'With the princess gone to the Black Lion and the Church revealed as rotten to the root, she chose the heretic\'s road — for Oriane\'s sake.'],
    ],
  },
  {
    id: 'alisse', name: 'Alisse', fullName: 'Alisse', title: 'Knight of the Royal Guard',
    gender: 'f', zodiac: 'gemini', job: 'knight', level: 1, brave: 60, faith: 60,
    reaction: 'weaponGuard', support: 'defend',
    look: { skin: '#f1d3b3', hair: '#8c5a2b', hairStyle: 'bob', eyes: '#4a6a4a', height: 0.98, outfit: { headgear: 'none', palette: ROYAL_GUARD } },
    bio: [
      ['', 'A knight of the Royal Guard under Adria\'s command. Steady, dutiful, and quietly devoted to the princess.'],
      ['b_orvelle', 'She fought at Orvelle beside Adria, and afterwards carried word of the abduction to Lesandre.'],
    ],
  },
  {
    id: 'lavinia', name: 'Lavinia', fullName: 'Lavinia', title: 'Knight of the Royal Guard',
    gender: 'f', zodiac: 'libra', job: 'knight', level: 1, brave: 62, faith: 55,
    reaction: 'weaponGuard', support: 'defend',
    look: { skin: '#e8c39e', hair: '#a0402a', hairStyle: 'ponytail', eyes: '#5a4a3a', height: 1.0, outfit: { headgear: 'none', palette: ROYAL_GUARD } },
    bio: [
      ['', 'A knight of the Royal Guard under Adria\'s command. Quick to laugh, and quicker to draw steel.'],
      ['b_orvelle', 'She fought at Orvelle beside Adria, then rode north alone to hunt the abductors.'],
    ],
  },
  {
    id: 'garmond', name: 'Garmond', fullName: 'Garmond', title: 'Mercenary Captain',
    gender: 'm', zodiac: 'virgo', job: 'fellKnight', level: 3, brave: 70, faith: 48,
    reaction: 'counter', support: 'attackUp', movement: 'move1',
    look: {
      skin: '#c68c5c', hair: '#8a8a88', hairStyle: 'short', eyes: '#2a2a2a', beard: 'full', height: 1.08, bulk: 1.18,
      outfit: { headgear: 'none', cape: 'long', palette: { primary: '#2a2830', secondary: '#4a3a3a', accent: '#8a2020', metal: '#5a5a60', leather: '#2a1e18' } },
    },
    color: '#4a3a3a',
    bio: [
      ['', 'A dark knight and captain of a mercenary company, hired to guard the princess at Orvelle. He fights for coin, and says so.'],
      ['b_orvelle', 'He took Rhen into his company when the young man had nowhere else to go, and taught him that honour is a luxury for the well-fed.'],
      ['b_zirkel', 'At Zirkel Falls he turned his blade on the princess. He had been in the White Lion\'s pay all along.'],
      ['b_lyonesse', 'He died at the gate of Castle Lyonesse, still insisting that every man has his price.'],
    ],
  },
  // =========================================================================
  //  Chapter II — Pawn and Player
  // =========================================================================
  {
    id: 'bocco', name: 'Bocco', fullName: 'Bocco', title: 'Kwehbo',
    gender: 'monster', zodiac: 'gemini', job: 'kwehbo', monster: 'kwehbo', level: 0, brave: 62, faith: 60,
    look: {},
    bio: [
      ['b_arawen', 'A yellow kwehbo, once Wolfram Fell\'s own mount, rescued from goblins in Arawen Woods. Stubborn, loyal, and fond of searching Rhen\'s pockets.'],
      ['b_beleth', 'He knew his old master\'s scent at Riverain, even through the demon\'s stench, and would not stop calling.'],
    ],
  },
  {
    id: 'mattis', name: 'Mattis', fullName: 'Mattis Brunel', title: 'Artificer of Cogsgard',
    gender: 'm', zodiac: 'libra', job: 'engineer', level: 0, brave: 64, faith: 55,
    reaction: 'autoPotion', support: 'concentrate', movement: 'move1',
    secondary: 'chemist', learned: ['usePotion', 'useHiPotion', 'usePhoenixDown', 'useAntidote', 'useEyeDrop'],
    look: { skin: '#e8c39e', hair: '#c8a060', hairStyle: 'spiky', eyes: '#6a8a4a', height: 0.98, outfit: { headgear: 'goggles' } },
    color: '#b0834a',
    bio: [
      ['b_zelland', 'A young artificer from Cogsgard with a relic gun and a secret, rescued from Baird Company thugs in Zelland. Cheerful, talkative, and a better shot than he lets on.'],
      ['b_cogsgard', 'The stone he carried was a Zodiac Stone — Taurus — and the Baird Company would kill for it. With his father safe, he chose to stay at Rhen\'s side.'],
      ['b_vepar', 'He saw the Cardinal become a demon. He does not talk about it, which for Mattis is saying a great deal.'],
      ['sq_colliery_bastian', 'His father\'s urgent summons brought the company back to the workshop and toward the troubled Colgrave coal mines. Mattis remains the link between Rhen\'s journeys and Bastian\'s excavations.'],
      ['sq_octo', 'He named the newly awakened Automaton VIII "Octo". A relic that might have been sold as a weapon left the workshop as a member of the company.'],
    ],
  },
  {
    id: 'bastian', name: 'Bastian', fullName: 'Bastian Brunel', title: 'Master Artificer',
    gender: 'm', zodiac: 'taurus', job: 'chemist', level: 0, brave: 50, faith: 55,
    look: {
      skin: '#e8c39e', hair: '#a8a090', hairStyle: 'short', eyes: '#6a8a4a', beard: 'mustache', height: 1.0, bulk: 1.1,
      outfit: { headgear: 'goggles', torso: 'apron', legs: 'pants', palette: { primary: '#8a6a4a', secondary: '#4a4a4a', accent: '#c8a050', leather: '#4a3423' } },
    },
    bio: [
      ['b_zelland', 'Mattis\'s father, a master artificer of Cogsgard who has spent his life coaxing the relics of the Lost Age back to life.'],
      ['b_cogsgard', 'Held hostage by the Baird Trading Company for his son\'s stone. He tells anyone who will listen that the old machines are only dreaming.'],
      ['sq_colliery_bastian', 'After eleven years excavating an ancient war engine, he had recovered its body but not the means to wake it. The failure of Colgrave\'s coal shipments drew his visitors into the search for the white creature below the mines.'],
      ['sq_octo', 'Aquarius supplied the power his sleeping automaton lacked. He let the machine leave with Rhen, content to have heard it speak after all those silent years.'],
      ['sq_kestrel_machine', 'His next discovery was a brass-and-glass ring bearing the Cancer sign. He believes it a doorway; until its empty socket receives the right stone, he can only repair its coils.'],
      ['sq_kestrel_arrived', 'The recovered Cancer Stone opened the ring, and Kestrel Stryde fell out of it. Bastian had repaired a door without knowing where its other side was.'],
    ],
  },
  {
    id: 'ludo', name: 'Ludo', fullName: 'Ludo Baird', title: 'Master of the Baird Trading Company',
    gender: 'm', zodiac: 'capricorn', job: 'chemist', level: 1, brave: 40, faith: 35,
    look: {
      skin: '#f1d3b3', hair: '#5a3a28', hairStyle: 'bald', eyes: '#3a2a1a', beard: 'mustache', height: 0.98, bulk: 1.25,
      outfit: { headgear: 'beret', torso: 'coat', palette: { primary: '#8a2a2a', secondary: '#3a2a20', accent: '#e0c050', leather: '#3a2a20' } },
    },
    bio: [
      ['b_zelland', 'Master of the Baird Trading Company, the richest and least scrupulous merchant house in the south. Every watchman in Zelland is on his books.'],
      ['b_cogsgard', 'He sought the Zodiac Stone for the Church\'s coin, and died in the machine yards of Cogsgard with it a pace out of reach.'],
    ],
  },
  {
    id: 'dracomir', name: 'Dracomir', fullName: 'Cardinal Dracomir', title: 'Cardinal of Lyonesse',
    gender: 'm', zodiac: 'scorpio', job: 'cardinal', level: 3, brave: 60, faith: 80,
    reaction: 'counterMagic', support: 'magicDefenseUp',
    look: {
      skin: '#e8c39e', hair: '#a8a098', hairStyle: 'short', eyes: '#5a4a3a', beard: 'goatee', height: 1.02, bulk: 1.05,
      outfit: { headgear: 'mitre', torso: 'cassock', legs: 'robe', palette: { primary: '#9a1a2a', secondary: '#f0e8d8', accent: '#e0c050', leather: '#3a2020' } },
    },
    bio: [
      ['b_barrowhill', 'Cardinal of Lyonesse, a soft-spoken prince of the Church who received Rhen and the princess with open arms.'],
      ['b_barrowvale', 'His "protection" was a cage. He used Adria as bait to lure Rhen to his death.'],
      ['b_vepar', 'In his own chapel he took up the Scorpio stone and became Vepar, the Defiled King. The Church has since declared him a martyr.'],
    ],
  },
  // =========================================================================
  //  Chapter III — The Brave and the Damned
  // =========================================================================
  {
    id: 'oren', name: 'Oren', fullName: 'Oren Durant', title: 'Astrologer and Chronicler',
    gender: 'm', zodiac: 'aquarius', job: 'astrologer', level: 1, brave: 58, faith: 66,
    reaction: 'autoPotion', support: 'shortCharge', movement: 'move1',
    look: { skin: '#f1d3b3', hair: '#a0723c', hairStyle: 'shaggy', eyes: '#4a6a4a', height: 1.0 },
    color: '#2a4a6a',
    bio: [
      ['b_colgrave', 'Scholar, stargazer and adopted son of the Thunder Saint. Rhen saved him from thieves in the coal streets of Colgrave.'],
      ['b_grogmoor', 'His work takes him between armies, collecting testimony that their commanders would prefer never reached paper. His father\'s standing among the Southsky gives that testimony an audience and makes it dangerous.'],
      ['b_zeltmoor', 'He tried to clear his father\'s name, and came within a knife\'s edge of Delan\'s ambitions.'],
      ['b_altessa', 'He wrote down everything. The Church burned him for it. His chronicle survived him, and is the root of this tale.'],
    ],
  },
  {
    id: 'zalmon', name: 'Zalmon', fullName: 'Inquisitor Zalmon', title: 'Heretic-Hunter of the Glorian Church',
    gender: 'm', zodiac: 'libra', job: 'inquisitor', level: 3, brave: 60, faith: 78,
    reaction: 'counterMagic', support: 'magicAttackUp', movement: 'move1',
    look: {
      skin: '#f1d3b3', hair: '#4a3a30', hairStyle: 'short', eyes: '#2a2a2a', beard: 'goatee', height: 1.02,
      outfit: { headgear: 'cowl', palette: { primary: '#1a1a1e', secondary: '#6a1a1a', accent: '#c8a050', leather: '#2a1a1a' } },
    },
    bio: [
      ['b_lesandre', 'Inquisitor of the Glorian Church, who branded Rhen a heretic in the streets of Lesandre.'],
      ['b_bervaine', 'He came for Rhen again at Bervaine, interrupting a conversation between old friends.'],
      ['b_finneth', 'He died at the Finneth River, still reciting the charges.'],
    ],
  },
  {
    id: 'isidore', name: 'Isidore', fullName: 'Isidore Tengel', title: 'Sanctum Knight',
    gender: 'm', zodiac: 'libra', job: 'sanctumKnight', level: 2, brave: 68, faith: 64,
    reaction: 'counter', support: 'defend', movement: 'move1',
    look: { skin: '#f5dcc4', hair: '#d8b870', hairStyle: 'shaggy', eyes: '#4a78b0', height: 1.0, outfit: { headgear: 'none', palette: SANCTUM } },
    bio: [
      ['b_orvelle_b3', 'Volmar\'s son, youngest of the Sanctum Knights. Earnest, devout, and certain the stones are holy.'],
      ['b_orvelle_b1', 'He abducted Alys from Orvelle on his father\'s orders.'],
      ['b_beleth', 'Wounded and held captive at Riverain, he was slain by his own father. Alys tended him to the end.'],
    ],
  },
  {
    id: 'rana', name: 'Rana', fullName: 'Rana Galthane', title: 'Heaven Knight',
    gender: 'f', zodiac: 'pisces', job: 'heavenKnight', level: 1, brave: 55, faith: 68,
    reaction: 'autoPotion', support: 'magicAttackUp', movement: 'move1',
    look: { skin: '#8a5a3a', hair: '#2a1e1a', hairStyle: 'ponytail', eyes: '#c8a040', height: 0.95, bulk: 0.95 },
    color: '#6a3a8a',
    bio: [
      ['b_yardale', 'A Heaven Knight of the Galthane line, trained as an assassin by Grand Duke Barrington. Her brother tried to kill her in Yardale; Rhen would not let him.'],
      ['b_riverain_gate', 'She fought her way to Riverain\'s gate beside Rhen, resolved to end the man who destroyed her family.'],
      ['b_riverain_roof', 'Over her fallen brother she held a Zodiac Stone and wished — and Malik breathed again.'],
      ['b_riverain_roof', 'Neither the Duke\'s training nor the Church\'s account of miracles prepared her for that answer. Her wish preserved her brother without surrendering herself, showing the company another face of the stones.'],
    ],
  },
  {
    id: 'malik', name: 'Malik', fullName: 'Malik Galthane', title: 'Hell Knight',
    gender: 'm', zodiac: 'aries', job: 'hellKnight', level: 1, brave: 65, faith: 35,
    reaction: 'counterMagic', support: 'magicDefenseUp', movement: 'move1',
    look: { skin: '#7e5034', hair: '#221a18', hairStyle: 'short', eyes: '#c8a040', height: 1.05 },
    color: '#4a2a5e',
    bio: [
      ['b_grogmoor', 'A Hell Knight in the Grand Duke\'s service. He came to Dorhaven with a demand: the Germaine Scriptures, in exchange for Alys\'s life.'],
      ['b_yardale', 'He tried to kill his own sister in Yardale, to keep her from betraying their master.'],
      ['b_riverain_roof', 'He took the Grand Duke\'s bullet meant for Rana. A Zodiac Stone, answering her wish, brought him back.'],
      ['b_riverain_roof', 'He follows his sister now by choice. Barrington\'s claim that the siblings owed him their lives ended upon the roof; the second life Malik received belonged to no lord.'],
    ],
  },
  {
    id: 'barrington', name: 'Barrington', fullName: 'Grand Duke Barrington', title: 'Grand Duke of Riverain',
    gender: 'm', zodiac: 'capricorn', job: 'knight', level: 2, brave: 60, faith: 40,
    reaction: 'counter', support: 'equipGun',
    look: {
      skin: '#f1d3b3', hair: '#8a8478', hairStyle: 'curly', eyes: '#3a3a3a', beard: 'mustache', height: 1.0, bulk: 1.2,
      outfit: { headgear: 'none', torso: 'coat', legs: 'pants', cape: 'mantle', palette: { primary: '#4a2a5a', secondary: '#2a2a2a', accent: '#d8b04a', leather: '#2a1e18' } },
    },
    bio: [
      ['b_yardale', 'Grand Duke of Riverain, who raised Rana and Malik after burning their village. He calls it kindness.'],
      ['b_riverain_roof', 'He shot Malik on the rooftops of Riverain and was thrown from them by Cerise. No one mourned him.'],
    ],
  },
  {
    id: 'elmond', name: 'Elmond', fullName: 'Marquis Elmond', title: 'Marquis of Limbourne',
    gender: 'm', zodiac: 'gemini', job: 'arcKnight', level: 5, brave: 70, faith: 70,
    reaction: 'bladeGrasp', support: 'attackUp', movement: 'teleport',
    look: {
      skin: '#f5e8e0', hair: '#d8dce4', hairStyle: 'long', eyes: '#a02030', height: 1.1,
      outfit: { headgear: 'none', cape: 'long', palette: { primary: '#141418', secondary: '#6a0e1a', accent: '#c8ccd4', metal: '#8a8e96', leather: '#1a1214' } },
    },
    color: '#6a0e1a',
    bio: [
      ['b_mandrel', 'The Marquis of Limbourne, kidnapped by the Ashen Brigade and rescued at last by Rhen\'s hand.'],
      ['b_riverain_roof', 'Reported dead in battle, he appeared on Riverain\'s roof with his maids — unchanged, unaged, and smiling.'],
      ['b_zepar', 'The Marquis had been a vessel of Zepar for longer than anyone could say. In Limbourne\'s chapel the demon finally showed its face.'],
    ],
  },
  {
    id: 'cerise', name: 'Cerise', fullName: 'Cerise', title: 'Handmaiden of Limbourne',
    gender: 'f', zodiac: 'virgo', job: 'assassin', level: 3, brave: 65, faith: 70,
    reaction: 'reflexes', support: 'attackUp', movement: 'jump3',
    look: { skin: '#f1d3b3', hair: '#7a1e2e', hairStyle: 'bob', eyes: '#c03050', height: 1.0, outfit: { palette: { primary: '#8a1a2a', ...LIMBOURNE_MAID } } },
    bio: [
      ['b_riverain_roof', 'One of the Marquis\'s two handmaidens, and the one who threw the Grand Duke from the rooftop without breaking stride.'],
      ['b_limbourne_gate', 'She met Rhen again at Limbourne\'s gate. She fights like something that has forgotten how to die.'],
    ],
  },
  {
    id: 'lida', name: 'Lida', fullName: 'Lida', title: 'Handmaiden of Limbourne',
    gender: 'f', zodiac: 'sagittarius', job: 'assassin', level: 3, brave: 65, faith: 70,
    reaction: 'reflexes', support: 'attackUp', movement: 'jump3',
    look: { skin: '#e8c39e', hair: '#e0d8c0', hairStyle: 'ponytail', eyes: '#6040a0', height: 1.0, outfit: { palette: { primary: '#3a1e4a', ...LIMBOURNE_MAID } } },
    bio: [
      ['b_riverain_roof', 'The second of the Marquis\'s handmaidens: quiet, smiling, and deadly with a whispered word.'],
      ['b_limbourne_gate', 'At Limbourne\'s gate she and Cerise stood between Rhen and their master for the last time.'],
    ],
  },
  {
    id: 'volmar', name: 'Volmar', fullName: 'Volmar Tengel', title: 'Commander of the Sanctum Knights',
    gender: 'm', zodiac: 'leo', job: 'sanctumCommander', level: 6, brave: 65, faith: 70,
    reaction: 'bladeGrasp', support: 'attackUp', movement: 'move2',
    look: {
      skin: '#e8c39e', hair: '#6a6a70', hairStyle: 'long', eyes: '#3a3a4a', beard: 'full', height: 1.12, bulk: 1.15,
      outfit: { headgear: 'none', cape: 'long', palette: SANCTUM },
    },
    color: '#a01a2a',
    bio: [
      ['b_orvelle_b1', 'Commander of the Sanctum Knights, the Church\'s hidden sword. Isidore and Melisande are his children.'],
      ['b_beleth', 'At Riverain he cut down his own son and carried Alys away, calling her "the Vessel".'],
      ['b_astaroth', 'In the Airship Graveyard he became Astaroth, the Leo demon, and with his dying breath opened the way for Altessa.'],
    ],
  },
  // =========================================================================
  //  Chapter IV — For Whom the Crown
  // =========================================================================
  {
    id: 'melisande', name: 'Melisande', fullName: 'Melisande Tengel', title: 'Divine Knight of the Sanctum',
    gender: 'f', zodiac: 'capricorn', job: 'divineKnight', level: 2, brave: 70, faith: 60,
    reaction: 'counter', support: 'attackUp', movement: 'move1',
    look: { skin: '#f1d3b3', hair: '#3a2a24', hairStyle: 'long', eyes: '#4a3a2a', height: 1.0 },
    color: '#b0243a',
    bio: [
      ['b_dogol', 'Volmar\'s daughter, a Divine Knight of the Sanctum. She hunted Rhen for her brother\'s death, certain it was his doing.'],
      ['b_bervaine', 'She withdrew from Bervaine unconvinced, but troubled.'],
      ['b_zepar', 'She saw Zepar with her own eyes in Limbourne\'s chapel. Then she believed — and joined Rhen to learn the truth about her father.'],
      ['b_murondel2', 'Rolf called Alys only a vessel. Melisande remembered that Isidore had called her by name. Her brother\'s final doubt had become a better guide than the certainty with which the Sanctum had armed her.'],
    ],
  },
  {
    id: 'orland', name: 'Orland', fullName: 'Count Cedric Orland', title: 'The Thunder Saint',
    gender: 'm', zodiac: 'scorpio', job: 'thunderSaint', level: 4, brave: 75, faith: 62,
    reaction: 'bladeGrasp', support: 'attackUp', movement: 'move3',
    look: { skin: '#e8c39e', hair: '#b8b4ac', hairStyle: 'short', eyes: '#3a4a6a', beard: 'full', height: 1.08, bulk: 1.12 },
    color: '#1e2c52',
    bio: [
      ['b_zeltmoor', 'Count Cedric Orland, the Thunder Saint: greatest swordsman of the Fifty Winters\' War, Lord Baldric\'s oldest friend, and Oren\'s adoptive father. Arrested by the Black Lion on a charge of treason.'],
      ['b_bethel_sluice', 'Freed from the cells at Bethel, he joined Rhen — and the whole balance of the war tilted with him.'],
      ['b_bethel_sluice', 'He had served the Southsky through the Fifty Winters\' War, but would not let loyalty to its banner excuse another war spent upon the poor. His decision to follow Rhen put the judgement of a veteran above a duke\'s command.'],
      ['b_altessa', 'The histories record that the Thunder Saint was executed for treason at Bethel. The histories are mistaken.'],
    ],
  },
  {
    id: 'rolf', name: 'Rolf', fullName: 'Rolf Wodring', title: 'Sanctum Knight',
    gender: 'm', zodiac: 'capricorn', job: 'sanctumKnight', level: 4, brave: 60, faith: 68,
    reaction: 'bladeGrasp', support: 'attackUp', movement: 'move1',
    look: { skin: '#f5dcc4', hair: '#c8c8c0', hairStyle: 'long', eyes: '#6a6a8a', height: 1.08, outfit: { headgear: 'none', palette: { ...SANCTUM, primary: '#d8d4cc' } } },
    bio: [
      ['b_bethel_sluice', 'Volmar\'s most trusted blade. He brought Dorian a Zodiac Stone, and a hint of how Lord Baldric truly died.'],
      ['b_murondel2', 'He barred the cloister of Murondel against Rhen.'],
      ['b_orvelle_b5', 'He fell at the bottom of Orvelle\'s vault, guarding a door into the dark.'],
    ],
  },
  {
    id: 'clement', name: 'Clement', fullName: 'Clement Duran', title: 'Sanctum Knight',
    gender: 'm', zodiac: 'gemini', job: 'sorcerer', level: 4, brave: 51, faith: 81,
    reaction: 'counterMagic', support: 'magicAttackUp', movement: 'teleport',
    look: { skin: '#f5e8e0', hair: '#2a2a38', hairStyle: 'long', eyes: '#8a3a6a', height: 1.02, bulk: 0.95, outfit: { headgear: 'none', palette: { ...SANCTUM, primary: '#3a2a4a', secondary: '#d8d4cc' } } },
    bio: [
      ['b_murondel1', 'A Sanctum Knight and sorcerer, who helped torture the Pontiff for the way into the Lost Sanctum.'],
      ['b_orvelle_b5', 'It was his spell that hurled Rhen down into the Necropolis beneath Orvelle.'],
      ['b_necropolis', 'He died among the dead of the Necropolis of Murondel.'],
    ],
  },
  {
    id: 'barrick', name: 'Barrick', fullName: 'Barrick Fendsor', title: 'Sanctum Knight',
    gender: 'm', zodiac: 'sagittarius', job: 'gunKnight', level: 4, brave: 64, faith: 62,
    reaction: 'arrowGuard', support: 'concentrate', movement: 'move1',
    look: { skin: '#d9a877', hair: '#3b2a1e', hairStyle: 'bald', eyes: '#3a2a1a', beard: 'full', height: 1.05, bulk: 1.2, outfit: { headgear: 'none', palette: { ...SANCTUM, primary: '#5a5a4a' } } },
    bio: [
      ['b_orvelle_b4', 'A Sanctum Knight, gunner and relic-hunter, who carries a weapon of the Lost Age.'],
      ['b_lostsanctum', 'His last stand in the Lost Sanctum was loud, brief and bitter.'],
    ],
  },
  {
    id: 'marcellus', name: 'Marcellus', fullName: 'Pontiff Marcellus', title: 'Pontiff of the Glorian Church',
    gender: 'm', zodiac: 'pisces', job: 'priest', level: 5, brave: 45, faith: 85,
    look: {
      skin: '#f1d3b3', hair: '#e8e4dc', hairStyle: 'bald', eyes: '#6a6a7a', beard: 'full', height: 0.95, bulk: 1.05,
      outfit: { headgear: 'mitre', torso: 'cassock', legs: 'robe', cape: 'mantle', palette: { primary: '#f4f0e8', secondary: '#d8b04a', accent: '#a01a2a', leather: '#6a5040' } },
    },
    bio: [
      ['b_bervaine', 'Pontiff of the Glorian Church, who let the Pride War burn so that the Church might be seen to end it.'],
      ['b_murondel1', 'Tortured by his own Sanctum Knights for the way into the Lost Sanctum. He learned too late whom they truly served.'],
    ],
  },
  {
    id: 'simeon', name: 'Simeon', fullName: 'Brother Simeon', title: 'Abbot of Orvelle',
    gender: 'm', zodiac: 'taurus', job: 'priest', level: 3, brave: 50, faith: 88,
    look: {
      skin: '#e8c39e', hair: '#c8c4b8', hairStyle: 'bald', eyes: '#5a6a5a', beard: 'full', height: 0.95,
      outfit: { headgear: 'none', torso: 'robe', legs: 'robe', palette: { primary: '#6a5a44', secondary: '#4a3a2a', accent: '#d8c080', leather: '#4a3423' } },
    },
    bio: [
      ['', 'The old abbot of Orvelle Abbey, a gentle scholar who taught Alys her letters and prayed with the princess.'],
      ['b_orvelle_b1', 'Mortally wounded when the Sanctum Knights sacked his vault, he gave Rhen the Germaine Scriptures with his last strength.'],
    ],
  },
  // =========================================================================
  //  The crown and the lions
  // =========================================================================
  {
    id: 'laurent', name: 'Laurent', fullName: 'Duke Laurent', title: 'The White Lion',
    gender: 'm', zodiac: 'leo', job: 'knight', level: 3, brave: 55, faith: 55,
    look: {
      skin: '#f5dcc4', hair: '#d9b56a', hairStyle: 'slick', eyes: '#5a6a8a', beard: 'mustache', height: 1.02, bulk: 1.1,
      outfit: { headgear: 'circlet', torso: 'coat', legs: 'pants', cape: 'mantle', palette: { primary: '#f0ece0', secondary: '#3a4a7a', accent: '#d8b04a', leather: '#4a3423' } },
    },
    bio: [
      ['', 'Duke Laurent, the White Lion: regent-in-waiting for the infant Prince Orin, master of the Northsky, and Dorian\'s patron.'],
      ['b_sandrat', 'He praised Rhen for rescuing the Marquis, knowing full well the kidnapping was his own design.'],
      ['b_bethel_sluice', 'Murdered by Dorian Valorne at Bethel. With his last breath he named his killer a poisoner.'],
    ],
  },
  {
    id: 'galtran', name: 'Galtran', fullName: 'Duke Galtran', title: 'The Black Lion',
    gender: 'm', zodiac: 'taurus', job: 'knight', level: 3, brave: 68, faith: 50,
    look: {
      skin: '#d9a877', hair: '#222222', hairStyle: 'short', eyes: '#2a2a2a', beard: 'full', height: 1.1, bulk: 1.2,
      outfit: { headgear: 'circlet', torso: 'coat', cape: 'mantle', palette: { primary: '#1a1a1e', secondary: '#6a1a1a', accent: '#d8b04a', leather: '#2a1a14' } },
    },
    bio: [
      ['', 'Duke Galtran, the Black Lion: master of the Southsky and the White Lion\'s rival for the regency.'],
      ['b_vepar', 'He took up Princess Oriane\'s cause the moment Delan delivered her to him, and so the Pride War began.'],
      ['b_bethel_sluice', 'Slain by Delan\'s hand at Bethel, in the chaos of the flood.'],
    ],
  },
  {
    id: 'louvaine', name: 'Louvaine', fullName: 'Queen Louvaine', title: 'Queen of Ivaldis',
    gender: 'f', zodiac: 'scorpio', job: 'chemist', level: 0, brave: 50, faith: 60,
    look: {
      skin: '#f5dcc4', hair: '#3b2a1e', hairStyle: 'bun', eyes: '#5a4a6a', height: 1.0,
      outfit: { headgear: 'crown', torso: 'gown', legs: 'gown', cape: 'long', extras: [], palette: { primary: '#4a1a4a', secondary: '#d8c8a0', accent: '#e0c050', leather: '#3a2a20' } },
    },
    bio: [
      ['', 'Queen of Ivaldis and mother of the infant Prince Orin. She means her son to reign, and her brother the White Lion to reign for him.'],
      ['b_vepar', 'Her quarrel with the Black Lion over the succession became the Pride War.'],
    ],
  },
  {
    id: 'ondrel', name: 'Ondrel', fullName: 'King Ondrel', title: 'King of Ivaldis',
    gender: 'm', zodiac: 'cancer', job: 'squire', level: 0, brave: 30, faith: 70,
    look: {
      skin: '#f1d3b3', hair: '#e8e4dc', hairStyle: 'long', eyes: '#6a6a7a', beard: 'full', height: 0.95, bulk: 0.9,
      outfit: { headgear: 'crown', torso: 'robe', legs: 'robe', cape: 'mantle', shoulders: 'fur', extras: [], palette: { primary: '#6a1a2a', secondary: '#f0e8d8', accent: '#e0c050', leather: '#4a3423' } },
    },
    bio: [
      ['', 'King Ondrel of Ivaldis, long bedridden and failing. The whole kingdom holds its breath and waits for him to die.'],
      ['b_vepar', 'His death left two heirs, two lions, and a war.'],
    ],
  },
  // =========================================================================
  //  Side quests
  // =========================================================================
  {
    id: 'beorn', name: 'Beorn', fullName: 'Beorn Kadmas', title: 'Temple Knight',
    gender: 'm', zodiac: 'libra', job: 'templeKnight', level: 2, brave: 68, faith: 62,
    reaction: 'counter', support: 'magicAttackUp', movement: 'move2',
    look: { skin: '#e8c39e', hair: '#c09050', hairStyle: 'shaggy', eyes: '#4a6a8a', beard: 'stubble', height: 1.08, bulk: 1.08 },
    color: '#6a7a4a',
    bio: [
      ['sq_colliery_hunter', 'A Temple Knight who recognised Rhen in a Lesandre tavern and declined to claim the bounty. He seeks the white creature beneath Colgrave and the sorcerer Vorgund Hask who holds it.'],
      ['sq_colliery', 'A Temple Knight of the old orders who hunts heretics for bounty — and a heretic himself, for loving a woman the Church cursed.'],
      ['sq_colliery', 'He tracked the "Ghost of the Colliery" to its lair beneath Colgrave, and found an old enemy there, and his dragon.'],
      ['sq_colliery', 'For three years he financed his search by delivering other people to the inquisitors. Freeing Rhosyn did not make that service innocent; it gave him a reason to put his sword beside a man the same Church condemned.'],
      ['sq_nevel', 'At Nevel Temple the Cancer Stone broke Rhosyn\'s curse. Beorn had sought the woman he loved, not the destruction of everything she had become: her remaining kinship with dragons did not trouble him.'],
    ],
  },
  {
    id: 'rhosyn', name: 'Rhosyn', fullName: 'Rhosyn', title: 'Cursed Wyrm',
    gender: 'monster', zodiac: 'aries', job: 'holyDragon', monster: 'holyDragon', level: 2, brave: 60, faith: 66,
    learned: [...DRAGONCRAFT],
    look: { skin: '#f5dcc4', hair: '#f0ecd8', hairStyle: 'long', eyes: '#d8b040', height: 0.96, bulk: 0.9 },
    color: '#f0ecd8',
    bio: [
      ['sq_colliery', 'A white dragon who follows Beorn Kadmas with a knight\'s loyalty. Beorn swears she was a noblewoman once, before the Church\'s curse.'],
      ['sq_colliery', 'Her family delivered her to the Church\'s judgement for loving Beorn. Vorgund Hask changed her shape and kept her chained below Colgrave. The voice the miners feared was that of a captive woman.'],
      ['sq_nevel', 'Restored to her own shape at Nevel Temple, Rhosyn is slowly remembering how to be a woman — but dragons still bow their heads to her.'],
      ['sq_nevel', 'She has laid aside the title of the house that surrendered her. As a Dragonkin she retains the wyrm\'s bond with her scaled kin, a part of her life the cure did not erase.'],
    ],
  },
  {
    id: 'octo', name: 'Octo', fullName: 'Automaton VIII', title: 'War Engine of the Lost Age',
    gender: 'monster', zodiac: 'taurus', job: 'automaton', monster: 'automaton', level: 1, brave: 70, faith: 30,
    look: {},
    color: '#8a7a4a',
    bio: [
      ['sq_octo', 'Automaton VIII, a war engine of the Lost Age, woken in Bastian\'s Cogsgard workshop by the Aquarius Stone recovered beneath Colgrave. It follows Rhen, and speaks — when it speaks — in numbers.'],
      ['sq_octo', 'Bastian Brunel believes there were once many such machines. Octo will not say what became of the others.'],
      ['sq_nevel', 'Automaton VII, the guardian of Nevel, supplied an answer: another engine had remained at its appointed post long after the people who ordered it there were gone. Octo travels with living companions instead.'],
    ],
  },
  {
    id: 'aline', name: 'Aline', fullName: 'Aline', title: 'Flower Seller of Zargid',
    gender: 'f', zodiac: 'gemini', job: 'chemist', level: 0, brave: 50, faith: 72,
    look: {
      skin: '#f5dcc4', hair: '#8a5a30', hairStyle: 'braid', eyes: '#5a8a5a', height: 0.94, bulk: 0.88,
      outfit: { headgear: 'none', torso: 'dress', legs: 'skirt', cape: 'none', extras: ['sash'], palette: { primary: '#e8a0b0', secondary: '#f4ece0', accent: '#c04060', leather: '#6a4a30' } },
    },
    bio: [
      ['sq_flower', 'A flower seller in the streets of Zargid. She sold Rhen a single flower and a smile, and said the strangest things about the sky.'],
      ['sq_kestrel', 'When Kestrel saw her in the market, he could not say why he wept.'],
    ],
  },
  {
    id: 'kestrel', name: 'Kestrel', fullName: 'Kestrel Stryde', title: 'Wanderer from Elsewhere',
    gender: 'm', zodiac: 'aquarius', job: 'wanderer', level: 2, brave: 70, faith: 50,
    reaction: 'counter', support: 'attackUp', movement: 'move2',
    look: { skin: '#f1d3b3', hair: '#e8e0a0', hairStyle: 'spiky', eyes: '#7ac8e8', height: 1.02 },
    color: '#26345a',
    bio: [
      ['sq_kestrel_arrived', 'A stranger brought into Cogsgard through Bastian\'s ancient ring when the Cancer Stone supplied its power. Disoriented, he fled in search of someone he remembered selling flowers.'],
      ['sq_kestrel', 'A spiky-haired swordsman who staggered out of a Cogsgard machine accident carrying a sword taller than a man, with no memory of how he came to Ivaldis.'],
      ['sq_kestrel', 'He speaks, rarely, of a city of iron and a flower girl he could not save. He is looking for a way home. He is no longer sure there is one.'],
      ['sq_kestrel', 'In Zargid he defended Aline from the Brotherhood of the Scales before Rhen reached him. He knew almost nothing of this kingdom; he knew enough to stand between a flower seller and armed men.'],
    ],
  },
  {
    id: 'grimwald', name: 'Grimwald', fullName: 'Grimwald', title: 'The Living Grimoire',
    gender: 'monster', zodiac: 'serpentarius', job: 'tome', monster: 'tome', level: 3, brave: 60, faith: 60,
    look: {},
    color: '#5a2a3a',
    bio: [
      ['sq_deep', 'A living book that drifted out of the lowest dark of the Midnight Deep after Ophion fell, and simply... attached itself to the party.'],
      ['sq_deep', 'Its pages are written in a tongue older than the Glorian Church. Oren has been trying to read them. The book has been reading Oren.'],
    ],
  },
  // =========================================================================
  //  The frame
  // =========================================================================
  {
    id: 'alazar', name: 'Alazar', fullName: 'Alazar Durant', title: 'Historian',
    gender: 'm', zodiac: 'aquarius', job: 'chemist', level: 0, brave: 50, faith: 55,
    look: {
      skin: '#f1d3b3', hair: '#6b4a2b', hairStyle: 'short', eyes: '#4a4a3a', beard: 'goatee', height: 1.0,
      outfit: { headgear: 'none', torso: 'coat', legs: 'pants', cape: 'none', extras: ['book', 'satchel'], palette: { primary: '#3a4a3a', secondary: '#8a7a5a', accent: '#c8a050', leather: '#4a3423' } },
    },
    bio: [
      ['', 'Alazar Durant, historian, descendant of the astrologer Oren Durant. He has spent his life assembling the tale the Church burned.'],
      ['b_altessa', '"The Braves of legend were never twelve. There was one, and his name was struck from every record. I restore it here."'],
    ],
  },
];
