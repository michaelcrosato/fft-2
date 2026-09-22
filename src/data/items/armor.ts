// ============================================================================
//  Armour — shields, helmets, hats, ribbons, armour, clothes and robes.
//  `leatherCap` (Leather Hat) and `clothes` live in starter.ts.
//
//  Shop tiers: 1 start · 2 Ch1 late · 3 Ch2 early · 4 Ch2 late · 5 Ch3 ·
//              6 Ch3 late · 7 Ch4 · 8 Ch4 late.  Rare = poach / steal / find.
// ============================================================================
import type { ItemDef } from '../types';

// ---------------------------------------------------------------------------
//  Shields — sev (physical) / smev (magic) evasion, front and flanks only.
// ---------------------------------------------------------------------------
const shields: ItemDef[] = [
  { id: 'escutcheon', name: 'Escutcheon', desc: 'The cheapest of shields, a painted board more fit for heraldry than for war.', kind: 'shield', cat: 'shield', price: 400, shopTier: 2, sev: 10, smev: 3, look: { model: 'kiteShield', color: '#8a6a40', color2: '#c03030' } },
  { id: 'buckler', name: 'Buckler', desc: 'A small round shield borne by the foot-soldiers of the Northsky; light and quick to raise.', kind: 'shield', cat: 'shield', price: 700, shopTier: 2, sev: 13, smev: 3, look: { model: 'buckler', color: '#a0a4ac', color2: '#6a4a2a' } },
  { id: 'bronzeShield', name: 'Bronze Shield', desc: 'A shield of bronze, kept small that it may be swung swiftly into a blow\'s path.', kind: 'shield', cat: 'shield', price: 1200, shopTier: 3, sev: 16, smev: 0, look: { model: 'roundShield', color: '#c08a4a' } },
  { id: 'roundShield', name: 'Round Shield', desc: 'Small and sturdy, its face worked over with knotted patterns.', kind: 'shield', cat: 'shield', price: 1600, shopTier: 3, sev: 19, smev: 0, look: { model: 'roundShield', color: '#8a8e96', color2: '#c0a040' } },
  { id: 'mythrilShield', name: 'Mythril Shield', desc: 'Lighter than it looks and easy on the arm through a long day\'s fighting.', kind: 'shield', cat: 'shield', price: 2500, shopTier: 4, sev: 22, smev: 5, look: { model: 'kiteShield', color: '#b8dcef' } },
  { id: 'goldShield', name: 'Gold Shield', desc: 'A mythril shield rimmed in gold, stouter against steel than against sorcery.', kind: 'shield', cat: 'shield', price: 3500, shopTier: 5, sev: 25, smev: 0, look: { model: 'kiteShield', color: '#b8dcef', color2: '#e8c050' } },
  { id: 'iceShield', name: 'Ice Shield', desc: 'Its inlaid gems hold the cold of the north, drinking frost and scorning flame.', kind: 'shield', cat: 'shield', price: 6000, shopTier: 6, sev: 28, smev: 0, absorb: ['ice'], halve: ['fire'], weak: ['lightning'], look: { model: 'kiteShield', color: '#a0d8f0', color2: '#e0f8ff', glow: '#8fe3ff' } },
  { id: 'flameShield', name: 'Flame Shield', desc: 'Magenta gems burn within its mythril face; fire feeds it, frost barely touches it.', kind: 'shield', cat: 'shield', price: 6500, shopTier: 6, sev: 31, smev: 0, absorb: ['fire'], halve: ['ice'], weak: ['water'], look: { model: 'kiteShield', color: '#c04030', color2: '#ffa040', glow: '#ff8040' } },
  { id: 'diamondShield', name: 'Diamond Shield', desc: 'Set with diamonds whose divine lustre turns aside spell as well as sword.', kind: 'shield', cat: 'shield', price: 12000, shopTier: 6, sev: 34, smev: 15, look: { model: 'kiteShield', color: '#e8f4ff', glow: '#d0f0ff' } },
  { id: 'aegisShield', name: 'Aegis Shield', desc: 'A replica of the shield of the gods; magick breaks upon it like surf upon rock.', kind: 'shield', cat: 'shield', price: 10000, shopTier: 7, sev: 10, smev: 50, stats: { ma: 1 }, look: { model: 'roundShield', color: '#d0c8a0', color2: '#6080c0', glow: '#a0c0ff' } },
  { id: 'platinumShield', name: 'Platinum Shield', desc: 'Mythril and platinum together, with a white lustre like a winter moon.', kind: 'shield', cat: 'shield', price: 16000, shopTier: 7, sev: 37, smev: 10, look: { model: 'towerShield', color: '#f0f2f6' } },
  { id: 'crystalShield', name: 'Crystal Shield', desc: 'Inlaid with crystals like new-mined gems, the finest shield a smith will sell.', kind: 'shield', cat: 'shield', price: 21000, shopTier: 8, sev: 40, smev: 15, look: { model: 'towerShield', color: '#c0f0ff', color2: '#80c0e0', glow: '#c0f8ff' } },
  { id: 'shogunShield', name: 'Shogun Shield', desc: 'A black shield of foreign make, lacquered steel of a shape unknown in Ivaldis.', kind: 'shield', cat: 'shield', price: 0, rare: true, sev: 43, smev: 0, look: { model: 'towerShield', color: '#1a1a22', color2: '#c03030' } },
  { id: 'kaiserPlate', name: 'Kaiser Plate', desc: 'Named for an emperor of old; fire, frost and thunder burn brighter for its bearer.', kind: 'shield', cat: 'shield', price: 0, rare: true, sev: 46, smev: 20, boost: ['fire', 'ice', 'lightning'], look: { model: 'towerShield', color: '#c0a040', color2: '#402060', glow: '#ffe0a0' } },
  { id: 'venetianShield', name: 'Venetian Shield', desc: 'Painted in pigments of a secret recipe that dull the bite of fire, frost and thunder.', kind: 'shield', cat: 'shield', price: 0, rare: true, sev: 50, smev: 25, halve: ['fire', 'ice', 'lightning'], look: { model: 'kiteShield', color: '#3060a0', color2: '#f0d060' } },
  { id: 'hallowedEscutcheon', name: 'Hallowed Escutcheon', desc: 'The last and greatest of shields; blade and spell alike seem to lose their way against it.', kind: 'shield', cat: 'shield', price: 0, rare: true, sev: 75, smev: 50, look: { model: 'kiteShield', color: '#f8f8ff', color2: '#e0c060', glow: '#fff4c0' } },
];

// ---------------------------------------------------------------------------
//  Helmets — knights, lancers and samurai.
// ---------------------------------------------------------------------------
const helmets: ItemDef[] = [
  { id: 'leatherHelmet', name: 'Leather Helmet', desc: 'A helm of rosined leather, springy enough to turn a glancing blow.', kind: 'head', cat: 'helmet', price: 200, shopTier: 2, hp: 10, look: { color: '#7a5634' } },
  { id: 'bronzeHelmet', name: 'Bronze Helmet', desc: 'The plain bronze helm of the common man-at-arms.', kind: 'head', cat: 'helmet', price: 500, shopTier: 2, hp: 20, look: { color: '#c08a4a' } },
  { id: 'ironHelmet', name: 'Iron Helmet', desc: 'A sturdy helm of iron, dented by the wars of better men.', kind: 'head', cat: 'helmet', price: 1000, shopTier: 2, hp: 30, look: { color: '#8a8e96' } },
  { id: 'barbuta', name: 'Barbuta', desc: 'A deep helm with a T-shaped opening for the eyes and mouth.', kind: 'head', cat: 'helmet', price: 1500, shopTier: 3, hp: 40, look: { color: '#a0a4ac' } },
  { id: 'mythrilHelmet', name: 'Mythril Helmet', desc: 'A light, strong helm of mythril that rings like a bell when struck.', kind: 'head', cat: 'helmet', price: 2100, shopTier: 4, hp: 50, look: { color: '#b8dcef' } },
  { id: 'goldHelmet', name: 'Gold Helmet', desc: 'A gilded helm, the pride of many a knight of good family.', kind: 'head', cat: 'helmet', price: 2800, shopTier: 4, hp: 60, look: { color: '#e8c050' } },
  { id: 'crossHelmet', name: 'Cross Helmet', desc: 'A helm that guards head and neck, with a cruciform visor to shield the face.', kind: 'head', cat: 'helmet', price: 4000, shopTier: 5, hp: 70, look: { color: '#c0c4cc', color2: '#c03030' } },
  { id: 'diamondHelmet', name: 'Diamond Helmet', desc: 'A cross helm set with gems whose spiritual weight lends it strength.', kind: 'head', cat: 'helmet', price: 6000, shopTier: 6, hp: 80, look: { color: '#e8f4ff' } },
  { id: 'platinumHelmet', name: 'Platinum Helmet', desc: 'Mythril and platinum, with a white lustre that shames the dawn.', kind: 'head', cat: 'helmet', price: 8000, shopTier: 7, hp: 90, look: { color: '#f0f2f6' } },
  { id: 'circlet', name: 'Circlet', desc: 'A light helm with a gem upon the brow that leaves the ears bare to hear the battle.', kind: 'head', cat: 'helmet', price: 10000, shopTier: 7, hp: 100, look: { color: '#e0c060', color2: '#60a0e0' } },
  { id: 'crystalHelmet', name: 'Crystal Helmet', desc: 'A helm inlaid with crystals like new-mined gems, the best that coin can buy.', kind: 'head', cat: 'helmet', price: 14000, shopTier: 8, hp: 120, look: { color: '#c0f0ff' } },
  { id: 'shogunHelm', name: 'Shogun Helm', desc: 'A black foreign helm of lacquered steel, horned and fearsome.', kind: 'head', cat: 'helmet', price: 0, rare: true, hp: 130, look: { color: '#1a1a22', color2: '#c0a040' } },
  { id: 'grandHelm', name: 'Grand Helm', desc: 'A great helm that keeps the wits clear and the eyes open through any sorcery.', kind: 'head', cat: 'helmet', price: 0, rare: true, hp: 150, immune: ['blind', 'sleep'], look: { color: '#d0d4dc', color2: '#e0c060' } },
];

// ---------------------------------------------------------------------------
//  Hats — most jobs.
// ---------------------------------------------------------------------------
const hats: ItemDef[] = [
  { id: 'plumedHat', name: 'Plumed Hat', desc: 'A stout hat crowned with a white feather, beloved of cadets and minstrels.', kind: 'head', cat: 'hat', price: 350, shopTier: 2, hp: 16, mp: 5, look: { color: '#6a4a2a', color2: '#f0f0f0' } },
  { id: 'redHood', name: 'Red Hood', desc: 'A hood of red cloth, warm against the wind off the Mandrel Plains.', kind: 'head', cat: 'hat', price: 800, shopTier: 2, hp: 24, mp: 8, look: { color: '#b02828' } },
  { id: 'headgear', name: 'Headgear', desc: 'A close leather cap, sturdy and snug, that lends weight to a swing.', kind: 'head', cat: 'hat', price: 1200, shopTier: 3, hp: 32, stats: { pa: 1 }, look: { color: '#5a3a24' } },
  { id: 'triangleHat', name: 'Triangle Hat', desc: 'A pointed hat stitched with a sigil that stirs the magick of its wearer.', kind: 'head', cat: 'hat', price: 1800, shopTier: 4, hp: 40, mp: 12, stats: { ma: 1 }, look: { color: '#403060', color2: '#e0c060' } },
  { id: 'greenBeret', name: 'Green Beret', desc: 'The beret of a company of scouts, and a lighter step comes with it.', kind: 'head', cat: 'hat', price: 3000, shopTier: 4, hp: 48, stats: { speed: 1 }, look: { color: '#3a6a30' } },
  { id: 'twistHeadband', name: 'Twist Headband', desc: 'A twisted cloth knotted about the brow; tie it tight and strike harder.', kind: 'head', cat: 'hat', price: 5000, shopTier: 5, hp: 56, stats: { pa: 2 }, look: { color: '#f0f0f0', color2: '#c03030' } },
  { id: 'holyMitre', name: 'Holy Mitre', desc: 'The tall hat of Glorian clergy who conduct the high rites.', kind: 'head', cat: 'hat', price: 6000, shopTier: 6, hp: 64, mp: 20, stats: { ma: 1 }, look: { color: '#f0ece0', color2: '#e0c060' } },
  { id: 'blackHood', name: 'Black Hood', desc: 'A hood of black cloth that hides the face and keeps its counsel.', kind: 'head', cat: 'hat', price: 7000, shopTier: 6, hp: 72, look: { color: '#1e1e26' } },
  { id: 'goldenHairpin', name: 'Golden Hairpin', desc: 'A lovely golden pin that keeps the wearer\'s voice free of any silencing hex.', kind: 'head', cat: 'hat', price: 12000, shopTier: 7, hp: 80, mp: 50, immune: ['silence'], look: { color: '#e8c050' } },
  { id: 'flashHat', name: 'Flash Hat', desc: 'A hat of crystal whose spirit quickens both the feet and the mind.', kind: 'head', cat: 'hat', price: 16000, shopTier: 7, hp: 88, mp: 15, stats: { speed: 1, ma: 1 }, look: { color: '#c0f0ff', color2: '#ffffff' } },
  { id: 'thiefsCap', name: "Thief's Cap", desc: 'A cap of the finest thieves\' guild; its wearer is never bound, never stilled, never caught.', kind: 'head', cat: 'hat', price: 35000, shopTier: 8, hp: 100, stats: { speed: 2 }, immune: ['disable', 'immobilize'], look: { color: '#3a2a4a', color2: '#e0c060' } },
];

// ---------------------------------------------------------------------------
//  Ribbons — women only. Never sold.
// ---------------------------------------------------------------------------
const ribbons: ItemDef[] = [
  { id: 'cachouBand', name: 'Cachou Band', desc: 'A hairband scented with cachou that wards off many a lingering curse.', kind: 'head', cat: 'ribbon', gender: 'f', price: 0, rare: true, hp: 20, immune: ['undead', 'blind', 'slow', 'disable', 'frog', 'doom', 'immobilize', 'poison', 'silence'], look: { color: '#e060a0' } },
  { id: 'barrette', name: 'Barrette', desc: 'A jewelled hair-clasp that keeps the mind one\'s own against charm, fury and stone.', kind: 'head', cat: 'ribbon', gender: 'f', price: 0, rare: true, hp: 20, immune: ['ko', 'petrify', 'confuse', 'vampire', 'berserk', 'stop', 'sleep', 'charm'], look: { color: '#c0a0e0', color2: '#e0c060' } },
  { id: 'ribbon', name: 'Ribbon', desc: 'A simple silk ribbon, and yet no curse, hex nor venom in all the world can touch its wearer.', kind: 'head', cat: 'ribbon', gender: 'f', price: 0, rare: true, hp: 10, immune: ['ko', 'undead', 'petrify', 'blind', 'confuse', 'vampire', 'berserk', 'stop', 'sleep', 'charm', 'slow', 'disable', 'frog', 'doom', 'immobilize', 'poison', 'silence'], look: { color: '#ff4070', glow: '#ffc0d0' } },
];

// ---------------------------------------------------------------------------
//  Clothes — light jobs.
// ---------------------------------------------------------------------------
const clothes: ItemDef[] = [
  { id: 'leatherClothes', name: 'Leather Clothes', desc: 'A jerkin and breeches of good leather, proof against thorn and knife alike.', kind: 'body', cat: 'clothes', price: 300, shopTier: 2, hp: 10, look: { color: '#7a5634' } },
  { id: 'leatherVest', name: 'Leather Vest', desc: 'Layered leather, stitched thick over the heart.', kind: 'body', cat: 'clothes', price: 500, shopTier: 2, hp: 18, look: { color: '#6a4424' } },
  { id: 'chainVest', name: 'Chain Vest', desc: 'A shirt of linked rings worn beneath a tabard, light enough to run in.', kind: 'body', cat: 'clothes', price: 900, shopTier: 3, hp: 24, look: { color: '#8a8e96', color2: '#5a4a3a' } },
  { id: 'mythrilVest', name: 'Mythril Vest', desc: 'A vest with small plates of mythril sewn across the breast.', kind: 'body', cat: 'clothes', price: 1500, shopTier: 4, hp: 30, look: { color: '#b8dcef', color2: '#4a4a5a' } },
  { id: 'adamantVest', name: 'Adamant Vest', desc: 'A heavy vest of adamant links; the wearer sweats, but lives.', kind: 'body', cat: 'clothes', price: 1600, shopTier: 4, hp: 36, look: { color: '#606878' } },
  { id: 'wizardClothes', name: 'Wizard Clothes', desc: 'The hooded garb of a sorcerer, lined with thread that holds a little magick.', kind: 'body', cat: 'clothes', price: 1900, shopTier: 4, hp: 42, mp: 15, look: { color: '#403060', color2: '#8060c0' } },
  { id: 'brigandine', name: 'Brigandine', desc: 'Mythril cloth riveted with platinum plates, hidden beneath honest fabric.', kind: 'body', cat: 'clothes', price: 2500, shopTier: 5, hp: 50, look: { color: '#6a3a2a', color2: '#c0c4cc' } },
  { id: 'judoGi', name: 'Judo Gi', desc: 'A wrestler\'s garb from over the sea; they say its wearer cannot be struck dead outright.', kind: 'body', cat: 'clothes', price: 4000, shopTier: 5, hp: 60, stats: { pa: 1 }, immune: ['ko'], look: { color: '#f0f0f0', color2: '#202020' } },
  { id: 'powerSleeve', name: 'Power Sleeve', desc: 'A garment with its loose folds bound tight, freeing the arms for a mighty blow.', kind: 'body', cat: 'clothes', price: 7000, shopTier: 6, hp: 70, stats: { pa: 2 }, look: { color: '#c03030', color2: '#f0d060' } },
  { id: 'earthClothes', name: 'Earth Clothes', desc: 'Woven with the patterns of hill and furrow; the land itself answers the wearer.', kind: 'body', cat: 'clothes', price: 10000, shopTier: 7, hp: 85, mp: 10, boost: ['earth'], absorb: ['earth'], look: { color: '#7a6a3a', color2: '#4a7a3a' } },
  { id: 'blackGarb', name: 'Black Garb', desc: 'The black fighting-clothes of a night company; time itself cannot hold its wearer.', kind: 'body', cat: 'clothes', price: 12000, shopTier: 7, hp: 100, immune: ['stop'], look: { color: '#18181e', color2: '#402040' } },
  { id: 'rubberSuit', name: 'Rubber Suit', desc: 'A close-fitting suit of rosined gum through which no lightning can pass.', kind: 'body', cat: 'clothes', price: 0, rare: true, hp: 150, mp: 30, nullify: ['lightning'], look: { color: '#202028', color2: '#e0c040' } },
  { id: 'shinobiGarb', name: 'Shinobi Garb', desc: 'The garb of a shadow-warrior, made for deeds done unseen.', kind: 'body', cat: 'clothes', price: 0, rare: true, hp: 20, stats: { speed: 2 }, start: ['invisible'], look: { color: '#1a1a2a', color2: '#3a3a5a' } },
];

// ---------------------------------------------------------------------------
//  Armour — knights, lancers, samurai.
// ---------------------------------------------------------------------------
const armor: ItemDef[] = [
  { id: 'leatherArmor', name: 'Leather Armour', desc: 'Layers of boiled leather, the harness of a poor man\'s son gone soldiering.', kind: 'body', cat: 'armor', price: 200, shopTier: 2, hp: 10, look: { color: '#7a5634' } },
  { id: 'linenCuirass', name: 'Linen Cuirass', desc: 'A shell of bronze over quilted linen, cool in summer and stubborn in battle.', kind: 'body', cat: 'armor', price: 600, shopTier: 2, hp: 20, look: { color: '#d8ccb0', color2: '#c08a4a' } },
  { id: 'bronzeArmor', name: 'Bronze Armour', desc: 'Plain bronze plate, green at the seams from many a wet campaign.', kind: 'body', cat: 'armor', price: 800, shopTier: 2, hp: 30, look: { color: '#c08a4a' } },
  { id: 'chainMail', name: 'Chain Mail', desc: 'A hauberk of riveted rings that sighs as its wearer walks.', kind: 'body', cat: 'armor', price: 1300, shopTier: 3, hp: 40, look: { color: '#8a8e96' } },
  { id: 'mythrilArmor', name: 'Mythril Armour', desc: 'Mythril plate, sturdy and light enough for a long march.', kind: 'body', cat: 'armor', price: 2000, shopTier: 4, hp: 50, look: { color: '#b8dcef' } },
  { id: 'plateMail', name: 'Plate Mail', desc: 'Improved mythril plate, each piece fitted by a master armourer.', kind: 'body', cat: 'armor', price: 3000, shopTier: 4, hp: 60, look: { color: '#c0c4cc' } },
  { id: 'goldArmor', name: 'Gold Armour', desc: 'Plate reinforced and gilded, as much for the court as for the field.', kind: 'body', cat: 'armor', price: 3600, shopTier: 5, hp: 70, look: { color: '#e8c050' } },
  { id: 'diamondArmor', name: 'Diamond Armour', desc: 'Plate studded with diamonds whose hardness blunts the keenest edge.', kind: 'body', cat: 'armor', price: 6000, shopTier: 6, hp: 80, look: { color: '#e8f4ff' } },
  { id: 'platinumArmor', name: 'Platinum Armour', desc: 'Mythril and platinum plate with a white lustre like a saint\'s halo.', kind: 'body', cat: 'armor', price: 9000, shopTier: 7, hp: 90, look: { color: '#f0f2f6' } },
  { id: 'carabineerMail', name: 'Carabineer Mail', desc: 'Thick mythril plate made to endure the shot of Lost-Age guns.', kind: 'body', cat: 'armor', price: 13000, shopTier: 7, hp: 100, look: { color: '#a0a8b8', color2: '#3a4a6a' } },
  { id: 'crystalMail', name: 'Crystal Mail', desc: 'Platinum plate inlaid with crystal, glittering like a frozen waterfall.', kind: 'body', cat: 'armor', price: 18000, shopTier: 8, hp: 110, look: { color: '#c0f0ff' } },
  { id: 'reflectMail', name: 'Reflect Mail', desc: 'Its mirrored plates cast every spell back whence it came.', kind: 'body', cat: 'armor', price: 19000, shopTier: 8, hp: 130, always: ['reflect'], look: { color: '#e0e8f0', glow: '#c0e0ff' } },
  { id: 'shogunArmor', name: 'Shogun Armour', desc: 'Black lacquered armour from a far land, laced tight to guard the belly.', kind: 'body', cat: 'armor', price: 0, rare: true, hp: 150, look: { color: '#1a1a22', color2: '#c03030' } },
  { id: 'maximilian', name: 'Maximilian', desc: 'Fluted plate of the highest craft, made to boast its maker\'s art and its wearer\'s strength.', kind: 'body', cat: 'armor', price: 0, rare: true, hp: 200, look: { color: '#d0d4dc', color2: '#e0c060' } },
];

// ---------------------------------------------------------------------------
//  Robes — casters and some knights.
// ---------------------------------------------------------------------------
const robes: ItemDef[] = [
  { id: 'linenRobe', name: 'Linen Robe', desc: 'A simple robe of linen such as novices wear at Orvelle.', kind: 'body', cat: 'robe', price: 1200, shopTier: 2, hp: 10, mp: 10, look: { color: '#d8ccb0' } },
  { id: 'silkRobe', name: 'Silk Robe', desc: 'A smooth silken robe that whispers of wealth and study.', kind: 'body', cat: 'robe', price: 2400, shopTier: 3, hp: 20, mp: 16, look: { color: '#a0c0e0' } },
  { id: 'wizardRobe', name: 'Wizard Robe', desc: 'A hooded robe of the Galwyn academy, embroidered with sigils of power.', kind: 'body', cat: 'robe', price: 4000, shopTier: 4, hp: 30, mp: 22, stats: { ma: 2 }, look: { color: '#403060', color2: '#e0c060' } },
  { id: 'chameleonRobe', name: 'Chameleon Robe', desc: 'Dyed with the essence of a shining green stone; holy light only nourishes its wearer.', kind: 'body', cat: 'robe', price: 5000, shopTier: 5, hp: 40, mp: 28, absorb: ['holy'], immune: ['ko'], look: { color: '#40a060', color2: '#a0e0a0' } },
  { id: 'whiteRobe', name: 'White Robe', desc: 'A pure white gown that dulls the fury of fire, frost and thunder.', kind: 'body', cat: 'robe', price: 9000, shopTier: 6, hp: 50, mp: 34, halve: ['fire', 'ice', 'lightning'], look: { color: '#f4f4f0', color2: '#c0c8e0' } },
  { id: 'blackRobe', name: 'Black Robe', desc: 'An ebon gown that feeds its wearer\'s fire, frost and thunder.', kind: 'body', cat: 'robe', price: 13000, shopTier: 7, hp: 60, mp: 30, boost: ['fire', 'ice', 'lightning'], look: { color: '#1a1a24', color2: '#8040c0' } },
  { id: 'lightRobe', name: 'Light Robe', desc: 'Woven from a glistening thread that seems to hold a little of the dawn.', kind: 'body', cat: 'robe', price: 30000, shopTier: 8, hp: 75, mp: 50, look: { color: '#f8f0d0', glow: '#fff8e0' } },
  { id: 'robeOfLords', name: 'Robe of Lords', desc: 'An exquisite robe of the elder prelates, wrapping its wearer in twofold warding.', kind: 'body', cat: 'robe', price: 0, rare: true, hp: 100, mp: 80, stats: { pa: 2, ma: 1 }, always: ['protect', 'shell'], look: { color: '#8a1a2a', color2: '#e0c060', glow: '#ffe0a0' } },
];

export const items: ItemDef[] = [...shields, ...helmets, ...hats, ...ribbons, ...clothes, ...armor, ...robes];
