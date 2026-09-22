// ============================================================================
//  Poach loot — pelts, horns, feathers and stranger trophies taken from beasts
//  felled by a hunter with the Poach support. Each is the *common* poach of
//  its species (see src/data/monsters/bestiary.ts) and is sold on at the fur
//  traders of the trade cities (Dorhaven, Wargill Port, Zargid).
//
//  Rare poaches, and the few common ones that are treasures in their own
//  right (perfumes, ribbons, silks, legendary weapons), are ordinary items
//  defined in weapons.ts / armor.ts / accessories.ts / consumables.ts.
//
//  `price` is the item's full value; loot is never stocked by ordinary shops.
// ============================================================================
import type { ItemDef } from '../types';

function loot(id: string, name: string, price: number, color: string, desc: string, color2?: string): ItemDef {
  return { id, name, desc, kind: 'loot', price, shopTier: 0, look: { color, color2 } };
}

export const items: ItemDef[] = [
  // ---- kwehbos ----
  loot('kwehboFeatherLoot', 'Kwehbo Feather', 300, '#f2c94c', 'A long golden flight-feather. Fletchers and milliners alike prize them, and every courier\'s hat in Ivaldis sports one.'),
  loot('blackKwehboPlumeLoot', 'Black Kwehbo Plume', 900, '#2b2b35', 'A glossy black plume with a sheen of green. Mourning bonnets and knights\' crests are trimmed with them.', '#4a6a5a'),
  loot('redKwehboPlumeLoot', 'Red Kwehbo Plume', 2200, '#c2412e', 'A crimson tail-plume, warm to the touch. Hedge-witches swear it holds a spark of the star-fire the bird can call.', '#f0c060'),

  // ---- goblins ----
  loot('goblinEarLoot', 'Goblin Ear', 200, '#6f8f3a', 'A pointed green ear. Village reeves pay a bounty on them, and apothecaries grind them into questionable tonics.'),
  loot('hobgoblinTuskLoot', 'Hobgoblin Tusk', 600, '#e8e0c8', 'A chipped, yellowing tusk. Carved into dice, it is said to bring the rolls of a cheat.'),
  loot('gobbledygookFetishLoot', 'Goblin Fetish', 1600, '#a0522d', 'A grotesque idol of bone and feathers carried by a goblin chieftain. Collectors of curiosities pay well; priests would rather it were burned.', '#ffd040'),

  // ---- bombs ----
  loot('bombCinderLoot', 'Bomb Cinder', 350, '#e0782a', 'A lump of cinder that never quite goes cold. Smiths buy them to light their forges on winter mornings.', '#ffd060'),
  loot('grenadeCinderLoot', 'Blue Cinder', 950, '#4a6fb5', 'A cinder burning with a cold blue flame. Alchemists value its steady, smokeless heat.', '#9fc8ff'),
  loot('explosiveCoreLoot', 'Explosive Core', 2400, '#b0302a', 'The still-crackling heart of an explosive, sealed in a lead-lined box. Artificers of Cogsgard pay handsomely — and handle it gingerly.', '#ffb040'),

  // ---- panthers ----
  loot('redPantherPeltLoot', 'Red Panther Pelt', 500, '#b8483a', 'A supple rust-red pelt. Furriers in Dorhaven make fine riding cloaks of them.', '#6a2a20'),
  loot('sabrecatFangLoot', 'Sabrecat Fang', 1200, '#f0f0e0', 'A curved fang as long as a dagger. Mounted on a hilt, it makes a hunter\'s knife of great renown.'),
  loot('vampireCatPeltLoot', 'Vampire Cat Pelt', 2600, '#4a2a5a', 'A dusky pelt that never takes a stain of blood. Nobles of Limbourne are said to line their coffers with them.', '#e03040'),

  // ---- squid ----
  loot('octopodInkLoot', 'Octopod Ink Sac', 350, '#1a1a2a', 'A bladder of rich black ink. Scribes of the Glorian Church buy it by the barrel for their scriptoria.'),
  loot('krakenlingBeakLoot', 'Krakenling Beak', 1000, '#8a5aa8', 'A hooked beak of dark chitin. Sailors wear them as charms against drowning.'),
  loot('brainleechTendrilLoot', 'Brainleech Tendril', 2400, '#d09ab0', 'A pallid feeding tendril preserved in brine. Physicians study them; the superstitious will not stay in the same room.', '#ff4060'),

  // ---- skeletons ----
  loot('skeletonBoneLoot', 'Old Bone', 250, '#e8e0c8', 'A thighbone yellowed with age. Relic-sellers pass such things off as the bones of saints to credulous pilgrims.'),
  loot('bonesnatchSkullLoot', 'Grinning Skull', 800, '#c8b890', 'A skull that seems to grin no matter how it is turned. Necromancers pay in silence and in gold.'),
  loot('livingBoneMarrowLoot', 'Frost Marrow', 2000, '#b0b8c8', 'Marrow from a living bone, cold as midwinter and faintly glowing violet. Used in the costliest cooling salves.', '#a040ff'),

  // ---- ghosts ----
  loot('ghoulShroudLoot', 'Grave Shroud', 400, '#9aa89a', 'A tattered winding-sheet left behind when a ghoul was laid to rest. It smells of damp earth and lilies.'),
  loot('gustWispLoot', 'Captured Wisp', 1000, '#c0e0ff', 'A cold, pale light trapped in a stoppered bottle. It drifts from side to side as if looking for a way out.', '#8aa0c8'),
  loot('revenantChainLoot', "Revenant's Chain", 2200, '#6a6a7a', 'A length of rusted execution chain that rattles by itself on moonless nights. Fetches a fine price from collectors of the macabre.', '#ff5a5a'),

  // ---- eyes ----
  loot('floateyeLensLoot', 'Floateye Lens', 400, '#f0e0c0', 'The hardened lens of a floateye\'s eye. Ground and polished, it makes a spyglass of uncanny clarity.', '#40a0ff'),
  loot('ahrimanWingLoot', 'Ahriman Wing', 1100, '#4a3a8a', 'A leathery, veined wing. Hatters and hedge-magi both have their uses for it; neither will say what.'),
  loot('plagueEyeLoot', 'Plague Eye', 2400, '#5a7a3a', 'A sickly eye kept in a sealed jar of spirits. Scholars of pestilence at Galwyn pay well to study them.', '#ff3030'),

  // ---- birds ----
  loot('stormhawkFeatherLoot', 'Stormhawk Feather', 450, '#a86a3a', 'A barred brown pinion that crackles faintly in dry weather. The finest arrow-fletching in the realm.', '#f0d8a0'),
  loot('steelHawkTalonLoot', 'Steel Talon', 1100, '#8a98a8', 'A talon hard as tempered steel. Jewellers set them in silver as clasps for great lords\' cloaks.'),
  loot('cockatriceCombLoot', 'Cockatrice Comb', 2200, '#c84030', 'The red comb of a cockatrice. Powdered, it is the chief ingredient of the softening salve that turns stone back to flesh.'),

  // ---- boars ----
  loot('boarletBristleLoot', 'Boarlet Bristles', 300, '#a07850', 'A bundle of stiff striped bristles, the stuff of the best brushes a painter can buy.'),

  // ---- treants ----
  loot('woodmanBarkLoot', 'Woodman Bark', 450, '#7a5a3a', 'A slab of bark that still puts out green shoots if left in the rain. Herbalists brew a strengthening tea from it.', '#4a7a3a'),
  loot('treantHeartwoodLoot', 'Treant Heartwood', 1300, '#5a4a3a', 'Dense heartwood that sings when struck. Luthiers will pay almost anything for a piece.'),
  loot('elderTreeSapLoot', 'Elder Sap', 2800, '#ffe080', 'Golden sap from a tree older than the kingdom, gathered in a crystal vial. A single drop is said to restore a dying man\'s colour.', '#6a9a4a'),

  // ---- minotaurs ----
  loot('bullDemonHornLoot', 'Bull Demon Horn', 700, '#e0d0b0', 'A great curved horn. Hollowed out, it makes a war-horn whose blast carries for leagues.'),
  loot('minotaurHideLoot', 'Minotaur Hide', 1600, '#8a5a3a', 'A thick, scarred hide that turns a knife. Armourers stretch it over shields.'),

  // ---- mawblooms ----
  loot('mawbloomSeedLoot', 'Mawbloom Seed', 700, '#5a8a3a', 'A fist-sized seed that twitches now and then. Selling it is legal; planting it is not.', '#a04a6a'),
  loot('gnashbloomTendrilLoot', 'Gnashbloom Tendril', 1500, '#8a9a3a', 'A length of tough, sticky vine. Rope-makers of Wargill braid it into cables that never rot.'),

  // ---- behemoths ----
  loot('behemothHornLoot', 'Behemoth Horn', 3200, '#e0d0b0', 'A horn as long as a man is tall, ridged like a ram\'s. Lords hang them in their great halls as proof of a hunt no one believes.'),
  loot('darkBehemothManeLoot', 'Dark Mane', 6000, '#2a2a3a', 'A hank of mane black as the void between stars. Weavers of the Holy See spin it into vestments for the highest clergy.', '#ff3030'),

  // ---- dragons ----
  loot('dragonScaleLoot', 'Dragon Scale', 3000, '#4a8a4a', 'A green scale the size of a buckler, hard as steel and light as horn. Armourers fight over them.', '#c8b870'),
  loot('blueDragonScaleLoot', 'Azure Dragon Scale', 4200, '#3a6ab8', 'A sea-blue scale rimed with frost that never melts. Shield-makers of the north set them as bosses.', '#e0f0ff'),
];
