// ============================================================================
//  Accessories — mantles, armlets & gauntlets, rings, footwear, perfumes.
//  Any job may wear an accessory (perfumes: women only).
//
//  Shop tiers: 1 start · 2 Ch1 late · 3 Ch2 early · 4 Ch2 late · 5 Ch3 ·
//              6 Ch3 late · 7 Ch4 · 8 Ch4 late.  Rare = poach / steal / find.
// ============================================================================
import type { ItemDef } from '../types';

// ---------------------------------------------------------------------------
//  Mantles — aev / amev evasion from every side.
// ---------------------------------------------------------------------------
const mantles: ItemDef[] = [
  { id: 'smallMantle', name: 'Small Mantle', desc: 'A short woollen cape whose swirl can spoil an enemy\'s aim.', kind: 'accessory', cat: 'mantle', price: 300, shopTier: 2, aev: 10, amev: 10, look: { color: '#7a5a40' } },
  { id: 'leatherMantle', name: 'Leather Mantle', desc: 'A sturdy leather cape, good against rain, thorns and arrows.', kind: 'accessory', cat: 'mantle', price: 800, shopTier: 3, aev: 15, amev: 15, look: { color: '#5a3a24' } },
  { id: 'wizardMantle', name: 'Wizard Mantle', desc: 'A hooded sorcerer\'s cape, lined with a lattice of quiet sigils.', kind: 'accessory', cat: 'mantle', price: 2000, shopTier: 4, aev: 18, amev: 18, stats: { ma: 1 }, look: { color: '#403060', color2: '#8060c0' } },
  { id: 'elvenMantle', name: 'Elven Mantle', desc: 'A thin, short cape of a cloth said to be spun by the fair folk.', kind: 'accessory', cat: 'mantle', price: 8000, shopTier: 5, aev: 25, amev: 25, look: { color: '#60a070', color2: '#e0f0c0' } },
  { id: 'vampireMantle', name: 'Vampire Mantle', desc: 'Black without and blood-red within, it billows as though stirred by bat-wings.', kind: 'accessory', cat: 'mantle', price: 15000, shopTier: 6, aev: 28, amev: 28, look: { color: '#18181e', color2: '#a01830' } },
  { id: 'featherMantle', name: 'Feather Mantle', desc: 'A cape as light and soft as down, which seems to lift its wearer from harm\'s way.', kind: 'accessory', cat: 'mantle', price: 20000, shopTier: 7, aev: 40, amev: 30, look: { color: '#f0f0f8', color2: '#c0d0e0' } },
  { id: 'vanishMantle', name: 'Vanish Mantle', desc: 'A cape woven from mist on Germain Peak; its wearer fades from sight.', kind: 'accessory', cat: 'mantle', price: 0, rare: true, aev: 35, amev: 0, start: ['invisible'], look: { color: '#a0b0c0', glow: '#e0f0ff' } },
];

// ---------------------------------------------------------------------------
//  Armlets & gauntlets.
// ---------------------------------------------------------------------------
const armlets: ItemDef[] = [
  { id: 'powerWrist', name: 'Power Wrist', desc: 'A studded gauntlet that puts more weight behind every blow.', kind: 'accessory', cat: 'armlet', price: 5000, shopTier: 5, stats: { pa: 1 }, look: { color: '#8a5a30', color2: '#c0c4cc' } },
  { id: 'diamondArmlet', name: 'Diamond Armlet', desc: 'An armlet set with diamonds of high spirit that keep both arm and mind from slowing.', kind: 'accessory', cat: 'armlet', price: 5000, shopTier: 5, stats: { pa: 1, ma: 1 }, immune: ['slow'], look: { color: '#e8f4ff' } },
  { id: 'defenseArmlet', name: 'Defense Armlet', desc: 'A magenta-jewelled armlet that no binding hex can hold.', kind: 'accessory', cat: 'armlet', price: 7000, shopTier: 6, immune: ['immobilize', 'disable'], look: { color: '#c04080', color2: '#c0c4cc' } },
  { id: 'jadeArmlet', name: 'Jade Armlet', desc: 'Polished jade that keeps the blood warm against stone and the stopping of time.', kind: 'accessory', cat: 'armlet', price: 10000, shopTier: 6, immune: ['petrify', 'stop'], look: { color: '#40a070' } },
  { id: 'nightshadeArmlet', name: 'Nightshade Armlet', desc: 'A ceremonial armlet worn in honour of the lord of shadows; darkness spares its wearer.', kind: 'accessory', cat: 'armlet', price: 10000, shopTier: 6, halve: ['dark'], immune: ['charm', 'confuse'], look: { color: '#302040', color2: '#8050a0' } },
  { id: 'hundredGems', name: 'Hundred Gems', desc: 'A string of a hundred and eight linden-seed beads that sharpens every element and wards off many a curse.', kind: 'accessory', cat: 'armlet', price: 15000, shopTier: 7, immune: ['vampire', 'frog', 'poison', 'undead'], boost: ['fire', 'ice', 'lightning', 'water', 'earth', 'wind', 'holy', 'dark'], look: { color: '#8a5a30', color2: '#e0c060', glow: '#ffe0a0' } },
  { id: 'magicGauntlet', name: 'Magic Gauntlet', desc: 'A gauntlet inscribed with words of power that swell its wearer\'s sorcery.', kind: 'accessory', cat: 'armlet', price: 20000, shopTier: 7, stats: { ma: 2 }, look: { color: '#403060', color2: '#c0a0ff' } },
  { id: 'bracer', name: 'Bracer', desc: 'A thin leather bracer, yet the arm it girds strikes like a smith\'s hammer.', kind: 'accessory', cat: 'armlet', price: 50000, shopTier: 8, stats: { pa: 3 }, look: { color: '#6a4424', color2: '#e0c060' } },
  { id: 'shogunGauntlet', name: 'Shogun Gauntlet', desc: 'A crimson gauntlet of foreign make, strengthening both sword-arm and spell.', kind: 'accessory', cat: 'armlet', price: 0, rare: true, stats: { pa: 2, ma: 2 }, look: { color: '#a01820', color2: '#1a1a22' } },
];

// ---------------------------------------------------------------------------
//  Rings.
// ---------------------------------------------------------------------------
const rings: ItemDef[] = [
  { id: 'defenseRing', name: 'Defense Ring', desc: 'A metal ring of quiet power that bars both sleep and the death-knell.', kind: 'accessory', cat: 'ring', price: 5000, shopTier: 5, immune: ['doom', 'sleep'], look: { color: '#a0a4ac' } },
  { id: 'magicRing', name: 'Magic Ring', desc: 'A ring of spirit that keeps the tongue free and the temper cool.', kind: 'accessory', cat: 'ring', price: 10000, shopTier: 6, immune: ['berserk', 'silence'], look: { color: '#8060c0' } },
  { id: 'reflectRing', name: 'Reflect Ring', desc: 'Its band is engraved with a covenant that turns all spells back upon their casters.', kind: 'accessory', cat: 'ring', price: 10000, shopTier: 6, always: ['reflect'], look: { color: '#c0e0ff', glow: '#c0e0ff' } },
  { id: 'angelRing', name: 'Angel Ring', desc: 'A ring blessed by an angel\'s touch; once in battle it will call its bearer back from death.', kind: 'accessory', cat: 'ring', price: 20000, shopTier: 8, start: ['reraise'], immune: ['blind', 'ko'], look: { color: '#f8f0d0', glow: '#fff4c0' } },
  { id: 'cursedRing', name: 'Cursed Ring', desc: 'A ring of black iron that lends great strength — and makes its wearer one of the walking dead.', kind: 'accessory', cat: 'ring', price: 0, rare: true, mp: 10, stats: { pa: 1, ma: 1 }, always: ['undead'], look: { color: '#302030', glow: '#a040a0' } },
];

// ---------------------------------------------------------------------------
//  Footwear.
// ---------------------------------------------------------------------------
const shoes: ItemDef[] = [
  { id: 'battleBoots', name: 'Battle Boots', desc: 'Layered leather boots made for long marches and short tempers.', kind: 'accessory', cat: 'shoes', price: 1000, shopTier: 2, stats: { move: 1 }, look: { color: '#5a3a24' } },
  { id: 'spikedBoots', name: 'Spiked Boots', desc: 'Cleated boots whose firm grip lends a higher leap.', kind: 'accessory', cat: 'shoes', price: 1200, shopTier: 3, stats: { jump: 1 }, look: { color: '#4a3a30', color2: '#a0a4ac' } },
  { id: 'rubberBoots', name: 'Rubber Boots', desc: 'Boots soaked in rosin; lightning finds no path through them, and no hex can root them.', kind: 'accessory', cat: 'shoes', price: 1500, shopTier: 4, nullify: ['lightning'], immune: ['immobilize'], look: { color: '#202028' } },
  { id: 'featherBoots', name: 'Feather Boots', desc: 'Soft boots so light their wearer drifts a hand\'s breadth above the ground.', kind: 'accessory', cat: 'shoes', price: 2500, shopTier: 4, always: ['float'], look: { color: '#f0f0f8', color2: '#a0c0e0' } },
  { id: 'germainBoots', name: 'Germain Boots', desc: 'Close-fitted boots from the Germain highlands, easy to run and climb in.', kind: 'accessory', cat: 'shoes', price: 5000, shopTier: 5, stats: { move: 1, jump: 1 }, look: { color: '#6a5030', color2: '#3a6a30' } },
  { id: 'sprintShoes', name: 'Sprint Shoes', desc: 'Costly shoes of a famed cobbler; the feet in them fairly fly.', kind: 'accessory', cat: 'shoes', price: 7000, shopTier: 6, stats: { speed: 1 }, look: { color: '#f0f0f0', color2: '#3060c0' } },
  { id: 'redShoes', name: 'Red Shoes', desc: 'Shoes dyed a bewitching red; they carry their wearer far and fill the mind with magick.', kind: 'accessory', cat: 'shoes', price: 10000, shopTier: 7, stats: { move: 1, ma: 1 }, look: { color: '#c02030' } },
];

// ---------------------------------------------------------------------------
//  Perfumes — women only. Poached from great beasts, never sold.
// ---------------------------------------------------------------------------
const perfumes: ItemDef[] = [
  { id: 'chansonPerfume', name: 'Chanson Perfume', desc: 'A scent as peaceful as a lullaby; its wearer mends ever, and will not stay fallen.', kind: 'accessory', cat: 'perfume', gender: 'f', price: 0, rare: true, always: ['regen', 'reraise'], look: { color: '#ffc0d8', glow: '#ffe0f0' } },
  { id: 'zephyrPerfume', name: 'Zephyr Perfume', desc: 'A fresh, airy scent that lifts its wearer from the ground and turns spells aside.', kind: 'accessory', cat: 'perfume', gender: 'f', price: 0, rare: true, always: ['float', 'reflect'], look: { color: '#c0f0e0', glow: '#e0fff8' } },
  { id: 'sanguinePerfume', name: 'Sanguine Perfume', desc: 'An exotic, heady scent that quickens the blood and hides its wearer from prying eyes.', kind: 'accessory', cat: 'perfume', gender: 'f', price: 0, rare: true, stats: { ma: 1 }, always: ['haste'], start: ['invisible'], look: { color: '#c02040', glow: '#ff6080' } },
  { id: 'saltRosePerfume', name: 'Salt Rose Perfume', desc: 'A deep yet gentle scent of sea-roses that wraps its wearer in twofold warding.', kind: 'accessory', cat: 'perfume', gender: 'f', price: 0, rare: true, always: ['protect', 'shell'], look: { color: '#80c0e0', glow: '#c0e8ff' } },
];

export const items: ItemDef[] = [...mantles, ...armlets, ...rings, ...shoes, ...perfumes];
