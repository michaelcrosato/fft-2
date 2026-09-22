// ============================================================================
//  Weapons — the full armoury of Ivaldis, category by category.
//  Stats follow the classic tables (WP / weapon-evade / price / effects).
//  `dagger` and `broadsword` live in starter.ts and are not repeated here.
//
//  Shop tiers: 1 start · 2 Ch1 late · 3 Ch2 early · 4 Ch2 late · 5 Ch3 ·
//              6 Ch3 late · 7 Ch4 · 8 Ch4 late.  Rare = poach / steal / find.
//
//  Several weapons cast a spell on hit (25%): Thunder/Flame/Ice Rod
//  (thunder/fire/blizzard), Lightning Bow (thundara), Flame Whip (fira),
//  Ice Brand (blizzara), Holy Lance (holy). The spell guns' tiered spells are
//  folded into the magicGun damage formula instead.
// ============================================================================
import type { ItemDef, ItemLook, WeaponType } from '../types';

type WeaponSpec = Omit<ItemDef, 'kind' | 'cat' | 'look'> & { look?: ItemLook };

/** Per-category defaults: range, handedness and the renderer model family. */
const DEFAULTS: Record<Exclude<WeaponType, 'fist'>, Partial<ItemDef> & { model: string }> = {
  knife:       { model: 'knife',       range: 1, dualOk: true,  twoHandOk: false },
  ninjaBlade:  { model: 'ninjaBlade',  range: 1, dualOk: true,  twoHandOk: false },
  sword:       { model: 'sword',       range: 1, dualOk: true,  twoHandOk: true },
  knightSword: { model: 'knightSword', range: 1, dualOk: true,  twoHandOk: true },
  katana:      { model: 'katana',      range: 1, dualOk: true,  twoHandOk: true },
  axe:         { model: 'axe',         range: 1, twoHanded: true, twoHandOk: false },   // "axes always use both hands"
  rod:         { model: 'rod',         range: 1, dualOk: true,  twoHandOk: false },
  staff:       { model: 'staff',       range: 1, dualOk: false, twoHandOk: true },
  flail:       { model: 'flail',       range: 1, dualOk: true,  twoHandOk: true },
  gun:         { model: 'gun',         range: 8, dualOk: false, twoHandOk: false },
  magicGun:    { model: 'gun',         range: 8, dualOk: false, twoHandOk: false },
  crossbow:    { model: 'crossbow',    range: 4, dualOk: false, twoHandOk: false },
  bow:         { model: 'bow',         range: 5, twoHanded: true, twoHandOk: false },
  instrument:  { model: 'harp',        range: 3, twoHanded: true, twoHandOk: false },
  book:        { model: 'book',        range: 3, dualOk: false, twoHandOk: false },
  spear:       { model: 'spear',       range: 2, dualOk: false, twoHandOk: true },
  pole:        { model: 'pole',        range: 2, twoHanded: true, twoHandOk: false },
  bag:         { model: 'bag',         range: 1, dualOk: false, twoHandOk: false, gender: 'f' },
  cloth:       { model: 'cloth',       range: 2, dualOk: false, twoHandOk: false },
};

function group(cat: Exclude<WeaponType, 'fist'>, specs: WeaponSpec[]): ItemDef[] {
  const { model, ...def } = DEFAULTS[cat];
  return specs.map((s): ItemDef => ({ kind: 'weapon', cat, ...def, ...s, look: { model, ...s.look } }));
}

// ---------------------------------------------------------------------------
//  Knives — [(PA+Speed)/2] × WP
// ---------------------------------------------------------------------------
const knives = group('knife', [
  { id: 'mythrilKnife', name: 'Mythril Knife', desc: 'A knife of mythril, light as a thought and keen as a quarrel between brothers.', price: 500, shopTier: 2, wp: 4, wev: 5, look: { color: '#b8d8e8' } },
  { id: 'blindKnife', name: 'Blind Knife', desc: 'Its edge is smeared with a stinging tincture that steals the sight of any it cuts.', price: 800, shopTier: 2, wp: 4, wev: 5, onHit: { status: ['blind'], chance: 20 }, look: { color: '#9aa0a8', color2: '#3c3a44' } },
  { id: 'mageMasher', name: 'Mage Masher', desc: 'A hedge-knight\'s answer to sorcery; its bite stills a wizard\'s tongue.', price: 1500, shopTier: 3, wp: 4, wev: 5, onHit: { status: ['silence'], chance: 20 }, look: { color: '#c0c4d0', color2: '#6a4aa0' } },
  { id: 'platinumDagger', name: 'Platinum Dagger', desc: 'Mythril wed to platinum, its white blade gleams like frost upon a chapel bell.', price: 1800, shopTier: 3, wp: 5, wev: 10, look: { color: '#eef2f6' } },
  { id: 'mainGauche', name: 'Main Gauche', desc: 'A parrying dagger for the off hand, as apt to turn a blow as to deliver one.', price: 3000, shopTier: 4, wp: 6, wev: 40, look: { color: '#d4d8e0', color2: '#b08a3a' } },
  { id: 'orichalcumDirk', name: 'Orichalcum Dirk', desc: 'Forged of the fabled red-gold metal of the Lost Age; light in the hand and wicked sharp.', price: 4000, shopTier: 4, wp: 7, wev: 5, look: { color: '#e0a060' } },
  { id: 'assassinDagger', name: "Assassin's Dagger", desc: 'A narrow blade made for one purpose; those it marks begin counting their last breaths.', price: 5000, shopTier: 5, wp: 7, wev: 5, onHit: { status: ['doom'], chance: 20 }, look: { color: '#5a5a66', color2: '#8a1020' } },
  { id: 'airKnife', name: 'Air Knife', desc: 'Its curving edge draws a vacuum in its wake, and the very wind cuts alongside it.', price: 8000, shopTier: 6, wp: 10, wev: 5, element: 'wind', look: { color: '#c8f0dc', glow: '#a0ffd0' } },
  { id: 'slumberKris', name: 'Slumber Kris', desc: 'A wavy-bladed kris whose wounds bring on a sleep heavy as the grave.', price: 0, rare: true, wp: 12, wev: 10, onHit: { status: ['sleep'], chance: 20 }, look: { color: '#8c7ab8', glow: '#b8a0ff' } },
]);

// ---------------------------------------------------------------------------
//  Ninja blades — [(PA+Speed)/2] × WP
// ---------------------------------------------------------------------------
const ninjaBlades = group('ninjaBlade', [
  { id: 'hiddenBlade', name: 'Hidden Blade', desc: 'Shorter than a soldier\'s sword and easily hid beneath a traveller\'s cloak.', price: 3000, shopTier: 3, wp: 8, wev: 5, look: { color: '#8a8e98', color2: '#2a2a30' } },
  { id: 'ninjaKnife', name: 'Ninja Knife', desc: 'A shadow-warrior\'s tool for all needs: blade, climbing spike and pry-bar alike.', price: 5000, shopTier: 4, wp: 9, wev: 5, look: { color: '#9aa0aa', color2: '#1e1e24' } },
  { id: 'shortEdge', name: 'Short Edge', desc: 'A light, short-bladed sword, carried with ease and drawn in a heartbeat.', price: 7000, shopTier: 5, wp: 10, wev: 5, look: { color: '#b0b6c0', color2: '#402020' } },
  { id: 'ninjaEdge', name: 'Ninja Edge', desc: 'Longer of blade than the common shinobi sword, and the better for open battle.', price: 10000, shopTier: 6, wp: 12, wev: 5, look: { color: '#c0c6d0', color2: '#202838' } },
  { id: 'spellEdge', name: 'Spell Edge', desc: 'Sigils along its spine bind the limbs of whomsoever it wounds.', price: 16000, shopTier: 7, wp: 13, wev: 5, onHit: { status: ['disable'], chance: 20 }, look: { color: '#b8a8e0', color2: '#301848', glow: '#c090ff' } },
  { id: 'sasukeBlade', name: "Sasuke's Blade", desc: 'Carried, the tale runs, by a shadow-warrior who could vanish between two blinks.', price: 0, rare: true, wp: 14, wev: 15, look: { color: '#d0d4dc', color2: '#6a1818' } },
  { id: 'igaBlade', name: 'Iga Blade', desc: 'Heirloom of a mountain school of shadow-warriors, balanced to a hair.', price: 0, rare: true, wp: 15, wev: 10, look: { color: '#d8dce4', color2: '#18283a' } },
  { id: 'kogaBlade', name: 'Koga Blade', desc: 'Rival to the Iga steel, forged by a clan that trusted none but its own.', price: 0, rare: true, wp: 15, wev: 5, look: { color: '#dcd8d0', color2: '#28381a' } },
]);

// ---------------------------------------------------------------------------
//  Swords — PA × WP
// ---------------------------------------------------------------------------
const swords = group('sword', [
  { id: 'longsword', name: 'Longsword', desc: 'Double-edged and straight, the honest blade of every hedge-knight and sellsword.', price: 500, shopTier: 2, wp: 5, wev: 10, look: { color: '#d4d8e0' } },
  { id: 'ironSword', name: 'Iron Sword', desc: 'Heavy and broad, it wants a strong arm more than a skilled one.', price: 900, shopTier: 2, wp: 6, wev: 5, look: { color: '#a8acb4' } },
  { id: 'mythrilSword', name: 'Mythril Sword', desc: 'Wrought of rare mythril, it shines like moonlight and weighs scarce more.', price: 1600, shopTier: 3, wp: 7, wev: 8, look: { color: '#b8dcef' } },
  { id: 'coralSword', name: 'Coral Sword', desc: 'A single-edged blade chased with coral; lightning crackles along its fuller.', price: 3300, shopTier: 4, wp: 8, wev: 5, element: 'lightning', look: { color: '#f08870', glow: '#ffe070' } },
  { id: 'ancientSword', name: 'Ancient Sword', desc: 'Forged by forgotten methods; its wounds root a foe fast to the earth.', price: 5000, shopTier: 5, wp: 9, wev: 5, onHit: { status: ['immobilize'], chance: 20 }, look: { color: '#b0a080', color2: '#5a4a30' } },
  { id: 'sleepSword', name: 'Sleep Sword', desc: 'A wide blade of jet-black design that lulls its victims into unbidden slumber.', price: 5000, shopTier: 5, wp: 9, wev: 5, onHit: { status: ['sleep'], chance: 20 }, look: { color: '#3a3a48', color2: '#8070c0' } },
  { id: 'diamondSword', name: 'Diamond Sword', desc: 'A small diamond set in the blade lends it an edge that parts mail like linen.', price: 8000, shopTier: 5, wp: 10, wev: 10, look: { color: '#e8f4ff', glow: '#d0f0ff' } },
  { id: 'platinumSword', name: 'Platinum Sword', desc: 'Platinum and mythril folded together; broad, lustrous and terribly keen.', price: 11000, shopTier: 6, wp: 12, wev: 10, look: { color: '#f0f2f6' } },
  { id: 'iceBrand', name: 'Ice Brand', desc: 'A blade as clear as winter ice, and as merciless as the northern frost.', price: 14000, shopTier: 7, wp: 13, wev: 10, element: 'ice', onHit: { spell: 'blizzara', chance: 25 }, look: { color: '#bfefff', glow: '#8fe3ff' } },
  { id: 'runeBlade', name: 'Rune Blade', desc: 'Graven with runes older than the Church; it quickens the wielder\'s sorcery.', price: 20000, shopTier: 8, wp: 14, wev: 15, stats: { ma: 2 }, look: { color: '#c8c0e8', glow: '#9a80ff' } },
  // source: attacks drain HP to the wielder (engine lacks weapon drain)
  { id: 'bloodSword', name: 'Blood Sword', desc: 'Its magenta blade drinks the life of the wounded and pours it into its bearer.', price: 0, rare: true, wp: 9, wev: 5, look: { color: '#c02040', glow: '#ff3040' } },
  // Kestrel Stryde's oversized blade (Move-Find at Mount Bervaine). Source WP 10; raised per design brief.
  { id: 'otherworldBlade', name: 'Otherworld Blade', desc: 'A foreigner\'s great sword of strange make; none in Ivaldis can say what forge birthed it.', price: 0, rare: true, wp: 16, wev: 10, look: { color: '#9aa4b0', color2: '#4a3a2a', glow: '#70ffb0' } },
  { id: 'nagarok', name: 'Nagarok', desc: 'An ebony sword out of the world\'s last days; it cuts poorly, yet turns men into toads.', price: 0, rare: true, wp: 1, wev: 50, onHit: { status: ['frog'], chance: 20 }, look: { color: '#1a1a22', glow: '#60c060' } },
]);

// ---------------------------------------------------------------------------
//  Knight swords — [PA × Brave/100] × WP. None are sold.
// ---------------------------------------------------------------------------
const knightSwords = group('knightSword', [
  { id: 'defender', name: 'Defender', desc: 'A wide knight\'s blade with a jewel in its pommel, as much a shield as a sword.', price: 0, rare: true, wp: 16, wev: 60, look: { color: '#d8dce4', color2: '#3060c0', glow: '#80b0ff' } },
  { id: 'queensOath', name: "Queen's Oath", desc: 'A knight\'s sword given in pledge of loyalty; the vow itself wards its bearer.', price: 0, rare: true, wp: 18, wev: 30, always: ['protect'], look: { color: '#f0e8d0', color2: '#c0a040', glow: '#ffe8a0' } },
  { id: 'excalibur', name: 'Excalibur', desc: 'The legendary sword of the true king; holy light quickens the arm that bears it.', price: 0, rare: true, wp: 21, wev: 35, element: 'holy', boost: ['holy'], absorb: ['holy'], always: ['haste'], look: { color: '#f8f8ff', color2: '#d0b050', glow: '#fff4c0' } },
  { id: 'ragnarok', name: 'Ragnarok', desc: 'A knight\'s sword named for the doom of the gods; a veil of warding hangs about it.', price: 0, rare: true, wp: 24, wev: 20, always: ['shell'], look: { color: '#c0c8e0', color2: '#402060', glow: '#b0a0ff' } },
  { id: 'chaosBlade', name: 'Chaos Blade', desc: 'Said to be a gift from heaven, yet what it strikes turns to cold stone.', price: 0, rare: true, wp: 40, wev: 20, always: ['regen'], onHit: { status: ['petrify'], chance: 20 }, look: { color: '#2a2030', color2: '#c03030', glow: '#ff4060' } },
]);

// ---------------------------------------------------------------------------
//  Katana — [PA × Brave/100] × WP. Ids are fixed (Iaido references them).
// ---------------------------------------------------------------------------
const katana = group('katana', [
  { id: 'asura', name: 'Asura', desc: 'A bright white blade; they say a fighting spirit dwells within its steel.', price: 1600, shopTier: 3, wp: 7, wev: 15, look: { color: '#f0f0f4' } },
  { id: 'kotetsu', name: 'Kotetsu', desc: 'A tiger prowls along its engraved blade, and its bite is no gentler.', price: 3000, shopTier: 3, wp: 8, wev: 15, look: { color: '#dcdce4', color2: '#c08030' } },
  { id: 'bizenBoat', name: 'Bizen Osafune', desc: 'Folded from fine iron sand by a master smith of the Osafune line.', price: 5000, shopTier: 4, wp: 9, wev: 15, look: { color: '#d8d8e0', color2: '#502828' } },
  { id: 'murasame', name: 'Murasame', desc: 'A strange sword whose edge seems always wet, as with the rain before a slaughter.', price: 7000, shopTier: 5, wp: 10, wev: 15, look: { color: '#c8e0f0', glow: '#a0d0ff' } },
  { id: 'heavensCloud', name: "Heaven's Cloud", desc: 'Copied from the blade once drawn from a great serpent\'s tail.', price: 8000, shopTier: 5, wp: 11, wev: 15, look: { color: '#e8eef8', color2: '#6080b0' } },
  { id: 'kiyomori', name: 'Kiyomori', desc: 'A famed blade, lovely to behold and cutting as clean as a winter wind.', price: 10000, shopTier: 6, wp: 12, wev: 15, look: { color: '#e4e8f0', color2: '#305030' } },
  { id: 'muramasa', name: 'Muramasa', desc: 'A cursed and peculiar sword that thirsts for blood and is never sated.', price: 15000, shopTier: 7, wp: 14, wev: 15, look: { color: '#d0c8d0', color2: '#801020', glow: '#ff5060' } },
  { id: 'kikuichimonji', name: 'Kiku-ichimonji', desc: 'Its tang bears the chrysanthemum crest of a line of emperors across the sea.', price: 22000, shopTier: 8, wp: 15, wev: 15, look: { color: '#f0f0f8', color2: '#c0a040' } },
  { id: 'masamune', name: 'Masamune', desc: 'The masterwork of the greatest swordsmith who ever lived; blade and scabbard alike are art.', price: 0, rare: true, wp: 18, wev: 15, look: { color: '#f8f8ff', color2: '#304870', glow: '#c0e0ff' } },
  { id: 'chirijiraden', name: 'Chirijiraden', desc: 'An ornamental sword wrought with delicate care, yet deadlier than any in the land.', price: 0, rare: true, wp: 25, wev: 15, look: { color: '#fff8f0', color2: '#b02030', glow: '#ffd0a0' } },
]);

// ---------------------------------------------------------------------------
//  Axes — (1..PA) × WP. Two-handed.
// ---------------------------------------------------------------------------
const axes = group('axe', [
  { id: 'battleAxe', name: 'Battle Axe', desc: 'An ornamented war-axe, swung with both hands and small regard for finesse.', price: 1500, shopTier: 3, wp: 9, wev: 0, look: { color: '#a0a4ac', color2: '#6a4a2a' } },
  { id: 'giantAxe', name: 'Giant Axe', desc: 'A brute of an axe with a head the size of a shield; its blows are ruin or nothing.', price: 4000, shopTier: 5, wp: 12, wev: 0, look: { color: '#8a8e96', color2: '#4a3420' } },
  { id: 'slasher', name: 'Slasher', desc: 'A dread axe whose wounds make the limbs heavy and the heart slow.', price: 12000, shopTier: 7, wp: 16, wev: 0, onHit: { status: ['slow'], chance: 20 }, look: { color: '#707888', color2: '#302030', glow: '#8060c0' } },
]);

// ---------------------------------------------------------------------------
//  Rods — PA × WP. Elemental rods strengthen their element.
// ---------------------------------------------------------------------------
const rods = group('rod', [
  { id: 'rod', name: 'Rod', desc: 'A plain oaken rod, the first companion of every apprentice of Galwyn.', price: 200, shopTier: 1, wp: 3, wev: 20, look: { color: '#8a6a40' } },
  { id: 'thunderRod', name: 'Thunder Rod', desc: 'A rod with a storm caught in its head; lightning answers the one who bears it.', price: 400, shopTier: 2, wp: 3, wev: 20, element: 'lightning', boost: ['lightning'], onHit: { spell: 'thunder', chance: 25 }, look: { color: '#8a7a50', color2: '#ffe060', glow: '#fff080' } },
  { id: 'flameRod', name: 'Flame Rod', desc: 'Its ruby tip is ever warm to the touch, and fire leaps gladly from it.', price: 400, shopTier: 2, wp: 3, wev: 20, element: 'fire', boost: ['fire'], onHit: { spell: 'fire', chance: 25 }, look: { color: '#8a5a40', color2: '#ff5020', glow: '#ff8040' } },
  { id: 'iceRod', name: 'Ice Rod', desc: 'Rime gathers on this rod even in summer; the cold obeys it.', price: 400, shopTier: 2, wp: 3, wev: 20, element: 'ice', boost: ['ice'], onHit: { spell: 'blizzard', chance: 25 }, look: { color: '#7a8aa0', color2: '#a0e8ff', glow: '#8fe3ff' } },
  { id: 'poisonRod', name: 'Poison Rod', desc: 'A viper\'s venom is sealed in its tip, and a touch is enough.', price: 500, shopTier: 3, wp: 3, wev: 20, onHit: { status: ['poison'], chance: 20 }, look: { color: '#5a6a40', color2: '#80e040' } },
  { id: 'wizardRod', name: 'Wizard Rod', desc: 'A rod of the old academies that draws the wielder\'s magick to a fine, bright point.', price: 8000, shopTier: 6, wp: 4, wev: 20, stats: { ma: 2 }, look: { color: '#403060', color2: '#e0c060', glow: '#c0a0ff' } },
  { id: 'faithRod', name: 'Faith Rod', desc: 'Whoso carries this rod believes utterly, for good or ill.', price: 0, rare: true, wp: 3, wev: 20, always: ['faith'], look: { color: '#f0e8d0', color2: '#ffffff', glow: '#fff8d0' } },
  { id: 'dragonRod', name: 'Dragon Rod', desc: 'Carved of dragon-bone and borne by those whom dragons deign to serve.', price: 0, rare: true, wp: 5, wev: 20, look: { color: '#e0d8c0', color2: '#3080a0', glow: '#80d0ff' } },
]);

// ---------------------------------------------------------------------------
//  Staves — MA × WP.
// ---------------------------------------------------------------------------
const staves = group('staff', [
  { id: 'oakStaff', name: 'Oak Staff', desc: 'A stout staff of oak, a pilgrim\'s prop and a cleric\'s first defence.', price: 120, shopTier: 1, wp: 3, wev: 15, look: { color: '#7a5a34' } },
  // source: 25% chance to cancel Doom on hit (not yet supported by onHit)
  { id: 'whiteStaff', name: 'White Staff', desc: 'Carried by those in holy orders; its meaning outweighs its might in battle.', price: 800, shopTier: 2, wp: 3, wev: 15, look: { color: '#f0ece0', color2: '#d0b060' } },
  // source: attacks heal the target instead of harming (engine gap)
  { id: 'healingStaff', name: 'Healing Staff', desc: 'A spirit of mending dwells within; whomever it strikes is made whole.', price: 0, rare: true, wp: 4, wev: 15, look: { color: '#d0f0c0', color2: '#60c060', glow: '#a0ffa0' } },
  { id: 'rainbowStaff', name: 'Rainbow Staff', desc: 'Its head is set with serpent scales that shimmer in every hue.', price: 2200, shopTier: 4, wp: 5, wev: 15, look: { color: '#a080c0', color2: '#60e0c0' } },
  { id: 'wizardStaff', name: 'Wizard Staff', desc: 'A staff of cypress that sharpens the magick of the hand that holds it.', price: 4000, shopTier: 5, wp: 4, wev: 15, stats: { ma: 1 }, look: { color: '#5a4a30', color2: '#8060d0' } },
  { id: 'goldStaff', name: 'Gold Staff', desc: 'A glittering staff of gold, fit for a bishop\'s procession.', price: 7000, shopTier: 6, wp: 6, wev: 15, look: { color: '#e8c050' } },
  { id: 'maceOfZeus', name: 'Mace of Zeus', desc: 'The sky-father\'s sceptre, lending strength to both sinew and spell.', price: 0, rare: true, wp: 6, wev: 15, stats: { pa: 2, ma: 1 }, look: { color: '#f0d060', color2: '#4080ff', glow: '#a0c0ff' } },
  { id: 'sageStaff', name: 'Sage Staff', desc: 'A stick such as one finds by any roadside; in a sage\'s hand it is anything but.', price: 0, rare: true, wp: 7, wev: 15, look: { color: '#8a7050', color2: '#c0e0a0', glow: '#e0ffc0' } },
]);

// ---------------------------------------------------------------------------
//  Flails — (1..PA) × WP.
// ---------------------------------------------------------------------------
const flails = group('flail', [
  { id: 'flail', name: 'Flail', desc: 'A wooden haft chained to an iron head; crude, cruel and effective.', price: 1200, shopTier: 3, wp: 9, wev: 0, look: { color: '#8a8e96', color2: '#6a4a2a' } },
  { id: 'flameWhip', name: 'Flame Whip', desc: 'Its iron head smoulders like a coal fresh from the forge.', price: 4000, shopTier: 5, wp: 11, wev: 0, element: 'fire', onHit: { spell: 'fira', chance: 25 }, look: { color: '#a04020', color2: '#ff7030', glow: '#ff8040' } },
  { id: 'morningStar', name: 'Morning Star', desc: 'A spiked mace of the old wars, as fond of helms as of the heads within.', price: 9000, shopTier: 6, wp: 16, wev: 0, look: { color: '#9aa0a8', color2: '#5a4030' } },
  { id: 'scorpionTail', name: 'Scorpion Tail', desc: 'Like a morning star, save that one spike is longer, and crueller, than the rest.', price: 0, rare: true, wp: 23, wev: 0, look: { color: '#6a3040', color2: '#e0c060' } },
]);

// ---------------------------------------------------------------------------
//  Guns — WP × WP, never miss. Artifice of the Lost Age.
// ---------------------------------------------------------------------------
const guns = group('gun', [
  { id: 'ormandyGun', name: 'Ormandy Gun', desc: 'A fire-lance brought south from Ormandy after the Fifty Winters\' War.', price: 5000, shopTier: 5, wp: 6, wev: 5, look: { color: '#6a6e76', color2: '#6a4a2a' } },
  { id: 'mythrilGun', name: 'Mythril Gun', desc: 'Cogsgard work: a mythril barrel that hurls shot true across the whole field.', price: 15000, shopTier: 6, wp: 8, wev: 5, look: { color: '#b8d8e8', color2: '#4a3a2a' } },
  { id: 'petrifyGun', name: 'Petrify Gun', desc: 'Its bullets are cast from a basilisk\'s eye; those they strike become statues.', price: 0, rare: true, wp: 16, wev: 5, onHit: { status: ['petrify'], chance: 20 }, look: { color: '#8a8a80', color2: '#c0b8a0', glow: '#e0d8b0' } },
]);

// ---------------------------------------------------------------------------
//  Magic guns — fire elemental bolts (magic damage in the source:
//  60% tier-1 / 30% tier-2 / 10% tier-3 spell of the element).
// ---------------------------------------------------------------------------
const magicGuns = group('magicGun', [
  { id: 'blazeGun', name: 'Blaze Gun', desc: 'A Lost-Age relic whose every shot erupts in a gout of flame.', price: 0, rare: true, wp: 20, wev: 5, element: 'fire', look: { color: '#8a3020', color2: '#e0a040', glow: '#ff7040' } },
  { id: 'glacierGun', name: 'Glacier Gun', desc: 'It spits shards of the eternal ice, and frost blooms where they land.', price: 0, rare: true, wp: 21, wev: 5, element: 'ice', look: { color: '#406080', color2: '#c0e8ff', glow: '#8fe3ff' } },
  { id: 'blastGun', name: 'Blast Gun', desc: 'Stormlight crackles in its chamber; each shot is a thunderbolt unleashed.', price: 0, rare: true, wp: 22, wev: 5, element: 'lightning', look: { color: '#50506a', color2: '#ffe060', glow: '#fff080' } },
]);

// ---------------------------------------------------------------------------
//  Crossbows — PA × WP.
// ---------------------------------------------------------------------------
const crossbows = group('crossbow', [
  { id: 'bowgun', name: 'Bowgun', desc: 'A small crossbow that may be loosed with one hand; it shoots short, stubby bolts.', price: 400, shopTier: 2, wp: 3, wev: 5, look: { color: '#7a5a34', color2: '#a0a4ac' } },
  { id: 'nightKiller', name: 'Night Killer', desc: 'Its bolts are dipped in squid-ink and nightshade, and blind all they touch.', price: 1500, shopTier: 3, wp: 3, wev: 5, onHit: { status: ['blind'], chance: 20 }, look: { color: '#2a2a34', color2: '#6a6a80' } },
  { id: 'crossbow', name: 'Crossbow', desc: 'A crossbow of improved mechanism, stiffer of string and harder of strike.', price: 2000, shopTier: 3, wp: 4, wev: 5, look: { color: '#6a4a2a', color2: '#a0a4ac' } },
  { id: 'poisonBow', name: 'Poison Bow', desc: 'Fitted with a reservoir that envenoms each bolt as it is drawn.', price: 4000, shopTier: 4, wp: 4, wev: 5, onHit: { status: ['poison'], chance: 20 }, look: { color: '#4a5a30', color2: '#90e050' } },
  { id: 'huntingBow', name: 'Hunting Bow', desc: 'A heavy crossbow made for the hunting of monsters in the deep woods.', price: 8000, shopTier: 6, wp: 6, wev: 5, look: { color: '#5a4020', color2: '#8a8e96' } },
  { id: 'gastraphetes', name: 'Gastraphetes', desc: 'The mightiest of crossbows, braced against the belly; its kick could fell a mule.', price: 20000, shopTier: 8, wp: 10, wev: 5, look: { color: '#4a3a2a', color2: '#c0c4cc' } },
]);

// ---------------------------------------------------------------------------
//  Bows — [(PA+Speed)/2] × WP. Two-handed, arcing shots.
// ---------------------------------------------------------------------------
const bows = group('bow', [
  { id: 'longbow', name: 'Longbow', desc: 'The yeoman\'s longbow: long of reach and longer of service.', price: 800, shopTier: 2, wp: 4, wev: 0, look: { color: '#8a6a40' } },
  { id: 'silverBow', name: 'Silver Bow', desc: 'Its limbs are sheathed in thin silver and horn for a sweeter, stronger draw.', price: 1500, shopTier: 3, wp: 5, wev: 0, look: { color: '#d0d4dc', color2: '#6a4a2a' } },
  { id: 'iceBow', name: 'Ice Bow', desc: 'Arrows loosed from it grow a skin of frost in flight.', price: 2000, shopTier: 4, wp: 5, wev: 0, element: 'ice', look: { color: '#a0d0f0', glow: '#8fe3ff' } },
  { id: 'lightningBow', name: 'Lightning Bow', desc: 'It looses arrows swift as the thunderbolt, and as bright.', price: 3000, shopTier: 4, wp: 6, wev: 0, element: 'lightning', onHit: { spell: 'thundara', chance: 25 }, look: { color: '#c0b060', glow: '#fff080' } },
  { id: 'mythrilBow', name: 'Mythril Bow', desc: 'A bow reinforced with mythril that never warps in rain nor cracks in frost.', price: 5000, shopTier: 5, wp: 7, wev: 0, look: { color: '#b8dcef' } },
  { id: 'windslashBow', name: 'Windslash Bow', desc: 'Its arrows fly so fast they drag a cutting gale behind them.', price: 8000, shopTier: 6, wp: 8, wev: 0, element: 'wind', look: { color: '#80c0a0', glow: '#a0ffd0' } },
  { id: 'artemisBow', name: 'Artemis Bow', desc: 'The bow of the huntress of the old tales, who never missed her quarry.', price: 0, rare: true, wp: 10, wev: 0, look: { color: '#e8e4f0', color2: '#8090d0', glow: '#d0d8ff' } },
  { id: 'yoichiBow', name: 'Yoichi Bow', desc: 'The great bow of a famed archer who once struck a fan from a ship\'s mast at a hundred paces.', price: 0, rare: true, wp: 12, wev: 0, look: { color: '#3a2a20', color2: '#c03030' } },
  { id: 'perseusBow', name: 'Perseus Bow', desc: 'Made all of metal for a hero of legend; few living arms can draw it.', price: 0, rare: true, wp: 16, wev: 0, look: { color: '#c8b070', color2: '#f0f0f8', glow: '#ffe8a0' } },
]);

// ---------------------------------------------------------------------------
//  Harps (instruments) — [(PA+MA)/2] × WP. Two-handed.
// ---------------------------------------------------------------------------
const harps = group('instrument', [
  { id: 'lamiaHarp', name: 'Lamia Harp', desc: 'Its strings sing a song that tangles the wits of all who hear it.', price: 5000, shopTier: 5, wp: 10, wev: 10, onHit: { status: ['confuse'], chance: 20 }, look: { color: '#c09040', color2: '#60c080' } },
  // source: attacks drain HP to the wielder (engine lacks weapon drain)
  { id: 'bloodyStrings', name: 'Bloody Strings', desc: 'A harp strung with sinew; its dark music feeds the player upon the listener.', price: 10000, shopTier: 6, wp: 13, wev: 10, look: { color: '#6a2030', color2: '#c02040', glow: '#ff3040' } },
  { id: 'fairyHarp', name: 'Fairy Harp', desc: 'Its pure tones enthral the heart, and foes forget whose side they fight on.', price: 0, rare: true, wp: 15, wev: 10, onHit: { status: ['charm'], chance: 20 }, look: { color: '#f0e0f0', color2: '#ff90d0', glow: '#ffc0f0' } },
]);

// ---------------------------------------------------------------------------
//  Books (dictionaries) — [(PA+MA)/2] × WP.
// ---------------------------------------------------------------------------
const books = group('book', [
  { id: 'battleDictionary', name: 'Battle Dictionary', desc: 'A lexicon of war bound in iron boards; its words wound as surely as its covers.', price: 3000, shopTier: 4, wp: 7, wev: 15, look: { color: '#6a3a2a', color2: '#c0a060' } },
  { id: 'bestiary', name: 'Bestiary', desc: 'A thick catalogue of every beast that walks, swims or crawls, and heavy with it.', price: 6000, shopTier: 5, wp: 8, wev: 15, look: { color: '#3a5a2a', color2: '#d0c080' } },
  { id: 'papyrusCodex', name: 'Papyrus Codex', desc: 'An ancient codex whose covers are plates of polished stone.', price: 10000, shopTier: 6, wp: 9, wev: 15, look: { color: '#c0b080', color2: '#6a6a70' } },
  { id: 'omnilexicon', name: 'Omnilexicon', desc: 'Every word of every tongue lies within; the weight of all that knowing is terrible.', price: 0, rare: true, wp: 11, wev: 15, look: { color: '#402060', color2: '#e0c060', glow: '#c0a0ff' } },
]);

// ---------------------------------------------------------------------------
//  Spears — PA × WP. Reach of two panels; Jump deals extra with them.
// ---------------------------------------------------------------------------
const spears = group('spear', [
  { id: 'javelin', name: 'Javelin', desc: 'A light and cheap spear that strikes a foe a pace away.', price: 1000, shopTier: 3, wp: 8, wev: 10, look: { color: '#8a6a40', color2: '#a8acb4' } },
  { id: 'spear', name: 'Spear', desc: 'The honest spear of the levy, longer than any sword and cheaper to make.', price: 2000, shopTier: 3, wp: 9, wev: 10, look: { color: '#7a5a34', color2: '#c0c4cc' } },
  { id: 'mythrilSpear', name: 'Mythril Spear', desc: 'A spear with a head of mythril that parts plate like parchment.', price: 4500, shopTier: 4, wp: 10, wev: 10, look: { color: '#6a4a2a', color2: '#b8dcef' } },
  { id: 'partisan', name: 'Partisan', desc: 'A broad, double-edged spearhead made to leave grievous wounds.', price: 7000, shopTier: 5, wp: 11, wev: 10, look: { color: '#5a4020', color2: '#d0d4dc' } },
  { id: 'obelisk', name: 'Obelisk', desc: 'A huge steeple-shaped spear, as much monument as weapon.', price: 10000, shopTier: 6, wp: 12, wev: 10, look: { color: '#4a3a30', color2: '#e0e4ec' } },
  { id: 'holyLance', name: 'Holy Lance', desc: 'A radiant lance blessed at the altar of Saint Auren; the unholy flee its light.', price: 0, rare: true, wp: 14, wev: 10, element: 'holy', onHit: { spell: 'holy', chance: 25 }, look: { color: '#f0e8c0', color2: '#ffffff', glow: '#fff4c0' } },
  { id: 'dragonWhisker', name: 'Dragon Whisker', desc: 'Neither wood nor metal; they say it was plucked from a dragon\'s own lip.', price: 0, rare: true, wp: 17, wev: 10, look: { color: '#3a6a5a', color2: '#e0d0a0', glow: '#80ffc0' } },
  { id: 'gungnir', name: 'Gungnir', desc: 'The spear of the one-eyed king of the old gods, found in Nevel Temple; it never misses its mark.', price: 0, rare: true, wp: 30, wev: 10, look: { color: '#c0a060', color2: '#f8f8ff', glow: '#ffe8a0' } },
]);

// ---------------------------------------------------------------------------
//  Poles (sticks) — MA × WP. Two-handed, reach of two panels.
// ---------------------------------------------------------------------------
const poles = group('pole', [
  { id: 'cypressPole', name: 'Cypress Pole', desc: 'A long cypress pole, fragrant and supple.', price: 1000, shopTier: 3, wp: 6, wev: 20, look: { color: '#8a7050' } },
  { id: 'battleBamboo', name: 'Battle Bamboo', desc: 'A long, slender bamboo that bends and whips back upon the unwary.', price: 1400, shopTier: 3, wp: 7, wev: 20, look: { color: '#a0b060' } },
  { id: 'muskPole', name: 'Musk Pole', desc: 'Cut from the musk tree and shaped like a great dipper; it smells of incense.', price: 2400, shopTier: 4, wp: 8, wev: 20, look: { color: '#6a4a30' } },
  { id: 'ironFan', name: 'Iron Fan', desc: 'A gigantic iron-framed fan, wielded folded like a cudgel.', price: 4000, shopTier: 5, wp: 9, wev: 20, look: { color: '#50545c', color2: '#c03030' } },
  { id: 'ruyiPole', name: 'Ruyi Pole', desc: 'The monkey king\'s staff of the old tales; a knock from it shakes the faith right out of one.', price: 7500, shopTier: 6, wp: 10, wev: 20, onHit: { status: ['atheist'], chance: 20 }, look: { color: '#c03030', color2: '#e0c040' } },
  // source: 25% chance to cancel Frog/Oil/Poison/Silence/Immobilize/Disable/Stop/Slow (engine gap)
  { id: 'octagonPole', name: 'Octagon Pole', desc: 'An eight-sided pole shod in steel; its blow shakes ill humours from friend and foe.', price: 20000, shopTier: 8, wp: 12, wev: 20, look: { color: '#3a3a44', color2: '#c0c4cc' } },
  { id: 'ivoryPole', name: 'Ivory Pole', desc: 'A pole of yellowed ivory, frail to the eye and surprisingly strong.', price: 0, rare: true, wp: 11, wev: 20, look: { color: '#f0e8d0' } },
  { id: 'whaleWhisker', name: 'Whale Whisker', desc: 'Neither wood nor metal; said to be the whisker of a whale larger than an island.', price: 0, rare: true, wp: 16, wev: 20, look: { color: '#1a1a24', color2: '#8090b0', glow: '#80a0ff' } },
]);

// ---------------------------------------------------------------------------
//  Bags — (1..PA) × WP. Women only. Never sold; poached from great beasts.
// ---------------------------------------------------------------------------
const bags = group('bag', [
  { id: 'pilgrimBag', name: "Pilgrim's Satchel", desc: 'A plain but handsome satchel; a pilgrim\'s blessing sewn in its lining mends the bearer.', price: 52000, rare: true, wp: 12, wev: 0, always: ['regen'], look: { color: '#8a6a40', color2: '#60c060' } },
  { id: 'conjurerBag', name: "Conjurer's Bag", desc: 'A bag of the finest make, stitched with charms that whet a lady\'s magick.', price: 53000, rare: true, wp: 10, wev: 0, stats: { ma: 1 }, look: { color: '#402060', color2: '#e0c060' } },
  { id: 'harehideBag', name: 'Harehide Bag', desc: 'A rare bag of hare-hide sold dear and seldom; it quickens the step.', price: 58000, rare: true, wp: 14, wev: 0, stats: { speed: 1 }, look: { color: '#d8c8a8', color2: '#8a6a40' } },
  { id: 'battleSatchel', name: 'Battle Satchel', desc: 'A satchel made to order for war, weighted with lead and swung like a mace.', price: 0, rare: true, wp: 20, wev: 0, look: { color: '#5a3a2a', color2: '#a0a4ac' } },
]);

// ---------------------------------------------------------------------------
//  Cloth — [(PA+MA)/2] × WP. Dancers' veils; high weapon evasion.
// ---------------------------------------------------------------------------
const cloths = group('cloth', [
  { id: 'persianCloth', name: 'Persian Cloth', desc: 'A brightly patterned carpet-cloth, thick and bold, swirled in a dancer\'s hands.', price: 7000, shopTier: 7, wp: 8, wev: 50, look: { color: '#c03040', color2: '#e0b040' } },
  { id: 'cashmere', name: 'Cashmere', desc: 'Soft, supple wool that is pleasant to the touch and terrible to the eye in battle.', price: 15000, shopTier: 8, wp: 10, wev: 50, look: { color: '#e0d0c0', color2: '#a080c0' } },
  { id: 'wyrmsilk', name: 'Wyrmsilk', desc: 'Silk spun thin and smooth, reinforced by a craft known only to the dragon-tamers.', price: 0, rare: true, wp: 15, wev: 50, look: { color: '#f0f0ff', color2: '#60a0e0', glow: '#c0e0ff' } },
]);

export const items: ItemDef[] = [
  ...knives, ...ninjaBlades, ...swords, ...knightSwords, ...katana, ...axes,
  ...rods, ...staves, ...flails, ...guns, ...magicGuns, ...crossbows, ...bows,
  ...harps, ...books, ...spears, ...poles, ...bags, ...cloths,
];
