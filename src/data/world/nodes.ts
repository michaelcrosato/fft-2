// ============================================================================
//  World map of Ivaldis — nodes (towns, castles, fields, special sites) and
//  the road network that joins them. Positions are on a 0..100 grid
//  (x = east, y = south). Layout mirrors the classic kingdom:
//    Galliard (west-centre) · Fovain (north-west) · Lesandre (centre)
//    Murondel (north) · Zeltmoor (east) · Bethel (south-centre)
//    Limbourne (south-east) · Lyonesse (south-west).
//  Field nodes carry random-battle tables; each uses exactly one map, whose id
//  is `rand_<nodeId>` (authored alongside the story maps).
// ============================================================================
import type { RandomPool, WorldEdge, WorldNode } from '../types';

type PoolUnit = RandomPool['units'][number];

/** weighted unit entry for a random-battle pool */
const u = (job: string, weight = 1, gender?: 'm' | 'f'): PoolUnit =>
  gender ? { job, weight, gender } : { job, weight };

/** a random-battle pool for a chapter window */
const pool = (chapterMin: number, chapterMax: number | undefined, count: [number, number], ...units: PoolUnit[]): RandomPool =>
  chapterMax === undefined ? { chapterMin, units, count } : { chapterMin, chapterMax, units, count };

/** random-battle table for a field node: always the single map `rand_<id>` */
const field = (id: string, ...pools: RandomPool[]): NonNullable<WorldNode['random']> =>
  ({ maps: [`rand_${id}`], pools, rate: 0.28 });

export const nodes: WorldNode[] = [
  // --------------------------------------------------------------------------
  //  GALLIARD — the western downs, heartland of the Northsky houses
  // --------------------------------------------------------------------------
  {
    id: 'galwyn', name: 'Galwyn', kind: 'town', pos: [7, 52], region: 'Galliard', start: true,
    shop: true, tavern: true, guild: true,
    desc: 'A city of scholars and cadets on the western downs, home to the Academy where the sons of Northsky houses learn the sword and the stars. Its lamplit market smells of ink, ozone and roasted chestnuts, and its bell-tower hums whenever a spell goes astray.',
  },
  {
    id: 'ygress', name: 'Castle Ygress', kind: 'castle', pos: [11, 31], region: 'Galliard',
    shop: true, tavern: true, guild: true,
    desc: 'Seat of House Valorne: a grey keep of many towers above the Galliard downs, with a busy market town clustered at its skirts. Northsky banners hang from every wall, and old soldiers still salute the window where Lord Baldric lay dying.',
  },
  {
    id: 'mandrel', name: 'Mandrel Plains', kind: 'field', pos: [15, 43], region: 'Galliard',
    desc: 'Rolling grassland of wind-bent barley and lonely standing stones between Galwyn and Ygress. Wild kwehbos graze in its hollows, and deserters of the last war still hide in its gullies.',
    random: field('mandrel',
      pool(1, 1, [3, 5], u('goblin', 3), u('redPanther', 2), u('kwehbo', 2), u('squire', 2), u('chemist', 1)),
      pool(2, 2, [3, 5], u('goblin', 2), u('hobgoblin', 2), u('redPanther', 2), u('kwehbo', 2), u('archer', 2), u('knight', 1), u('squire', 1)),
      pool(3, 3, [4, 5], u('hobgoblin', 2), u('sabrecat', 2), u('blackKwehbo', 2), u('boarlet', 2), u('knight', 2), u('archer', 1), u('timeMage', 1)),
      pool(4, undefined, [4, 6], u('gobbledygook', 2), u('vampireCat', 2), u('redKwehbo', 2), u('porky', 1), u('knight', 1), u('lancer', 1), u('samurai', 1)),
    ),
  },
  {
    id: 'swiggle', name: 'Swiggle Woods', kind: 'field', pos: [23, 47], region: 'Galliard',
    desc: 'A tangled beechwood where a brown stream wanders across the old trade road to Dorhaven. Travellers swear the trees shift when no one is watching, and goblins make their dens among the roots.',
    random: field('swiggle',
      pool(1, 1, [3, 5], u('goblin', 3), u('bomb', 2), u('floateye', 2), u('redPanther', 1)),
      pool(2, 2, [3, 5], u('goblin', 2), u('hobgoblin', 2), u('bomb', 2), u('woodman', 2), u('floateye', 1), u('thief', 1)),
      pool(3, 3, [4, 5], u('hobgoblin', 1), u('grenade', 2), u('woodman', 2), u('treant', 1), u('ahriman', 1), u('boarlet', 1), u('archer', 1)),
      pool(4, undefined, [4, 6], u('gobbledygook', 1), u('explosive', 2), u('treant', 2), u('elderTree', 1), u('plague', 1), u('porky', 1), u('ninja', 1)),
    ),
  },
  {
    id: 'dorhaven', name: 'Dorhaven', kind: 'town', pos: [32, 41], region: 'Galliard',
    shop: true, tavern: true, guild: true, furShop: true,
    desc: 'A walled trade city at the crossroads of the west, all tiled roofs, washing lines and bonded warehouses. Its merchants will sell you anything, including your own good name, if the price is right.',
  },
  {
    id: 'sandrat', name: 'Sandrat Cellar', kind: 'special', pos: [37, 48], region: 'Galliard',
    desc: 'A warren of smugglers\' vaults beneath Dorhaven\'s southern quarter, first dug for bonded wine and since used for everything else. Sand sifts down through the street grates, and the rats are said to be the best-fed in Ivaldis.',
  },
  {
    id: 'zekla', name: 'Zekla Dunes', kind: 'field', pos: [29, 31], region: 'Galliard',
    desc: 'A pocket of wandering dunes north of Dorhaven, where the priests say the ancients salted the earth. Each night the wind carves the sand anew, uncovering bleached bones, rusted blades and now and then the roof of some Lost Age ruin.',
    random: field('zekla',
      pool(1, 1, [3, 5], u('bomb', 2), u('stormhawk', 2), u('redPanther', 2), u('squire', 1), u('archer', 1)),
      pool(2, 2, [3, 5], u('bomb', 2), u('stormhawk', 2), u('steelHawk', 1), u('skeleton', 1), u('thief', 2), u('archer', 1)),
      pool(3, 3, [4, 5], u('grenade', 2), u('steelHawk', 2), u('bonesnatch', 2), u('cockatrice', 1), u('bullDemon', 1), u('thief', 1), u('wizard', 1)),
      pool(4, undefined, [4, 6], u('explosive', 2), u('cockatrice', 2), u('livingBone', 1), u('minotaur', 1), u('behemoth', 1), u('ninja', 1), u('geomancer', 1)),
    ),
  },
  {
    id: 'arawen', name: 'Arawen Woods', kind: 'field', pos: [28, 57], region: 'Galliard',
    desc: 'An old oak forest south of Dorhaven, dim even at noon. Kwehbo herders once drove their flocks beneath its canopy; now panthers and goblins hold it, and the herders\' shrines are green with moss.',
    random: field('arawen',
      pool(1, 2, [3, 5], u('goblin', 2), u('redPanther', 3), u('kwehbo', 1), u('boarlet', 2), u('woodman', 1), u('archer', 1)),
      pool(3, 3, [4, 5], u('hobgoblin', 2), u('sabrecat', 2), u('blackKwehbo', 1), u('porky', 1), u('treant', 2), u('thief', 1)),
      pool(4, undefined, [4, 6], u('gobbledygook', 1), u('vampireCat', 2), u('redKwehbo', 1), u('wildboar', 2), u('elderTree', 1), u('ninja', 1)),
    ),
  },

  // --------------------------------------------------------------------------
  //  FOVAIN — the cold north-west, windmills and border forts
  // --------------------------------------------------------------------------
  {
    id: 'thieveskeep', name: 'Thieves\' Keep', kind: 'special', pos: [32, 21], region: 'Fovain',
    desc: 'A hilltop fort abandoned after the Fifty Winters\' War and claimed first by outlaws, then by the Ashen Brigade. Its walls are patched with cartwheels and barn doors, and its gate still bears the scorched arms of a forgotten baron.',
  },
  {
    id: 'lenara', name: 'Lenara Plateau', kind: 'field', pos: [22, 21], region: 'Fovain',
    desc: 'A high, windswept tableland of heather and purple thistle where the sky seems close enough to touch. Shepherds leave it before dusk, for they say the wind up here carries the voices of the fallen.',
    random: field('lenara',
      pool(1, 1, [3, 5], u('kwehbo', 2), u('stormhawk', 2), u('goblin', 1), u('squire', 2), u('knight', 1), u('wizard', 1)),
      pool(2, 2, [3, 5], u('kwehbo', 1), u('blackKwehbo', 1), u('stormhawk', 2), u('boarlet', 2), u('knight', 1), u('archer', 1), u('wizard', 1)),
      pool(3, 3, [4, 5], u('blackKwehbo', 2), u('steelHawk', 2), u('porky', 1), u('bullDemon', 1), u('monk', 1), u('lancer', 1)),
      pool(4, undefined, [4, 6], u('redKwehbo', 2), u('cockatrice', 1), u('wildboar', 2), u('sacredBull', 1), u('samurai', 1), u('lancer', 1)),
    ),
  },
  {
    id: 'fovain', name: 'Fovain Mill', kind: 'special', pos: [14, 13], region: 'Fovain',
    desc: 'A great windmill standing alone on the Fovain plain, its sails still turning though the miller is long buried. The Ashen Brigade keeps it as a waystation on the road north, and its flour-dusted loft makes a fine archer\'s nest.',
  },
  {
    id: 'ziekhold', name: 'Fort Ziekhold', kind: 'special', pos: [6, 5], region: 'Fovain',
    desc: 'A snowbound border fort at the edge of the northern wastes, raised against an invasion that never came. Its storerooms are packed with black powder, and its standing orders have not changed in thirty years: hold.',
  },
  {
    id: 'riverain', name: 'Riverain Castle', kind: 'castle', pos: [60, 9], region: 'Fovain',
    desc: 'A soaring fortress of pale stone above the northern river gorge, seat of Grand Duke Barrington. Its halls are lavish and its dungeons deep; few invited guests have ever left by the gate they entered.',
  },
  {
    id: 'yewgrove', name: 'Yewgrove', kind: 'field', pos: [62, 21], region: 'Fovain',
    desc: 'An ancient grove of yews planted over graves older than the kingdom itself. Mist pools between the red trunks, and in Yewgrove the dead do not rest easily.',
    random: field('yewgrove',
      pool(1, 2, [3, 5], u('skeleton', 2), u('ghoul', 2), u('woodman', 2), u('floateye', 1)),
      pool(3, 3, [4, 5], u('bonesnatch', 2), u('gust', 2), u('treant', 2), u('ahriman', 1), u('wizard', 1), u('timeMage', 1)),
      pool(4, undefined, [4, 6], u('livingBone', 2), u('revenant', 2), u('elderTree', 2), u('plague', 1), u('summoner', 1)),
    ),
  },

  // --------------------------------------------------------------------------
  //  LESANDRE — the royal heartland around the capital
  // --------------------------------------------------------------------------
  {
    id: 'grogmoor', name: 'Grogmoor Hill', kind: 'field', pos: [42, 36], region: 'Lesandre',
    desc: 'Brown moorland hills cut by drovers\' tracks between Dorhaven, the capital and Yardale. Mercenaries, pilgrims and wandering monks share the road here, not always peaceably.',
    random: field('grogmoor',
      pool(1, 2, [3, 5], u('boarlet', 2), u('stormhawk', 2), u('monk', 2), u('chemist', 2), u('bullDemon', 1)),
      pool(3, 3, [4, 5], u('porky', 1), u('steelHawk', 1), u('minotaur', 1), u('monk', 3), u('chemist', 2), u('priest', 1)),
      pool(4, undefined, [4, 6], u('wildboar', 1), u('cockatrice', 1), u('sacredBull', 1), u('monk', 3), u('chemist', 1), u('samurai', 1), u('arithmancer', 1)),
    ),
  },
  {
    id: 'orvelle', name: 'Orvelle Abbey', kind: 'special', pos: [46, 26], region: 'Lesandre', start: true,
    desc: 'A venerable abbey of the Glorian Church on a wooded northern ridge, its library the finest outside the Holy See. Beneath its chapel, stair upon stair descends into vaults the brothers will not speak of.',
  },
  {
    id: 'yardale', name: 'Yardale', kind: 'town', pos: [56, 32], region: 'Lesandre',
    shop: true, tavern: true, guild: true,
    desc: 'A fortified market town on the northern road, its walls thick and its streets narrow. Yardale sells boots, bows and whispered news to everyone bound to or from Riverain.',
  },
  {
    id: 'lesandre', name: 'Lesandre', kind: 'town', pos: [56, 46], region: 'Lesandre',
    shop: true, tavern: true, guild: true,
    desc: 'The royal capital of Ivaldis, a city of white stone, gilded domes and anxious courtiers. While King Ondrel dies in his palace, the two Lions gather their banners in its squares and the Church counts the cost.',
  },
  {
    id: 'colgrave', name: 'Colgrave', kind: 'town', pos: [46, 60], region: 'Lesandre',
    shop: true, tavern: true, guild: true,
    desc: 'A soot-black mining town built into terraced hills, where colliery horns sound at every change of shift. Its miners are hard folk with long memories, and something has begun to walk in the deepest shafts.',
  },
  {
    id: 'dogol', name: 'Dogol Pass', kind: 'field', pos: [68, 38], region: 'Lesandre',
    desc: 'A narrow pass on the eastern road, hemmed by sheer cliffs and crumbling watchtowers. Whoever holds Dogol holds the way between the capital and the free cities.',
    random: field('dogol',
      pool(1, 3, [3, 5], u('steelHawk', 2), u('bullDemon', 2), u('knight', 2), u('lancer', 1), u('archer', 1)),
      pool(4, undefined, [4, 6], u('cockatrice', 1), u('minotaur', 2), u('behemoth', 1), u('knight', 1), u('lancer', 2), u('samurai', 1)),
    ),
  },

  // --------------------------------------------------------------------------
  //  MURONDEL — the Holy See on the northern headland
  // --------------------------------------------------------------------------
  {
    id: 'murondel', name: 'Murondel, the Holy See', kind: 'special', pos: [46, 8], region: 'Murondel',
    desc: 'The holy city of the Glorian Church, raised on the headland where Saint Auren is said to have ascended. Its cathedral is the tallest building in Ivaldis, and beneath it lies an older city that belongs to the dead.',
  },
  {
    id: 'airship', name: 'The Airship Graveyard', kind: 'special', pos: [35, 5], region: 'Murondel',
    desc: 'A blasted plain on the northern cliffs, strewn with the rusted hulls of Lost Age flying ships. Here the ancients fought the war that ended their world, and the ground still hums with their sleeping engines.',
  },

  // --------------------------------------------------------------------------
  //  ZELTMOOR — the Black Lion's east, free cities and wild marches
  // --------------------------------------------------------------------------
  {
    id: 'bervaine', name: 'Bervaine', kind: 'town', pos: [75, 28], region: 'Zeltmoor',
    shop: true, tavern: true, guild: true,
    desc: 'A free city that bows to no duke, ruled by its guilds and famous for clockmakers and cathedral spires. Its neutrality is prized, and much abused, by every faction in the kingdom.',
  },
  {
    id: 'mtbervaine', name: 'Mount Bervaine', kind: 'field', pos: [80, 15], region: 'Zeltmoor',
    desc: 'A jagged peak north of Bervaine, crowned with snow in every season. Stairways older than the Church are cut into its flanks, climbing towards places the maps no longer name.',
    random: field('mtbervaine',
      pool(1, 3, [3, 5], u('blackKwehbo', 2), u('steelHawk', 2), u('dragon', 1), u('behemoth', 1), u('lancer', 1)),
      pool(4, undefined, [4, 6], u('redKwehbo', 2), u('blueDragon', 1), u('redDragon', 1), u('darkBehemoth', 1), u('kingBehemoth', 1), u('tiamat', 1), u('lancer', 1)),
    ),
  },
  {
    id: 'nevel', name: 'Nevel Temple', kind: 'special', pos: [92, 7], region: 'Zeltmoor',
    desc: 'A temple of the Lost Age half-buried in cliff and ice beyond Mount Bervaine. Its bronze doors open of their own accord for those who carry the right key, and its guardians have never been known to sleep.',
  },
  {
    id: 'dolbar', name: 'Dolbar Marsh', kind: 'field', pos: [90, 26], region: 'Zeltmoor',
    desc: 'A foul, steaming fen east of Bervaine where the peat bubbles and marsh-lights dance. The Zeltmoor road skirts its edge, and more than one patrol has followed the lights and never returned.',
    random: field('dolbar',
      pool(1, 3, [3, 5], u('mawbloom', 2), u('gnashbloom', 1), u('octopod', 2), u('ghoul', 1), u('mystic', 1)),
      pool(4, undefined, [4, 6], u('greatMawbloom', 2), u('brainleech', 1), u('hydra', 2), u('tiamat', 1), u('revenant', 1), u('arithmancer', 1)),
    ),
  },
  {
    id: 'finneth', name: 'Finneth River', kind: 'field', pos: [80, 39], region: 'Zeltmoor',
    desc: 'A broad, fast river between Bervaine and Zeltmoor, crossed by shallow fords and a single ancient bridge. In spring its waters run red with iron silt; in wartime they run red with worse.',
    random: field('finneth',
      pool(1, 3, [3, 5], u('octopod', 2), u('krakenling', 2), u('ahriman', 1), u('geomancer', 1), u('archer', 1)),
      pool(4, undefined, [4, 6], u('krakenling', 1), u('brainleech', 2), u('hydra', 2), u('greaterHydra', 1), u('plague', 1), u('geomancer', 1), u('ninja', 1)),
    ),
  },
  {
    id: 'zeltmoor', name: 'Zeltmoor Castle', kind: 'castle', pos: [91, 45], region: 'Zeltmoor',
    shop: true, tavern: true, guild: true,
    desc: 'The eastern seat of Duke Galtran, the Black Lion, with a garrison town sheltering in the lee of its walls. Its black ramparts rise from the moor like a clenched fist, and the Southsky banners never come down.',
  },
  {
    id: 'zargid', name: 'Zargid', kind: 'town', pos: [93, 59], region: 'Zeltmoor',
    shop: true, tavern: true, guild: true, furShop: true,
    desc: 'A bustling eastern trade city of caravanserais, spice stalls and flower sellers on every corner. Merchants from beyond the mountains pass through, bringing curious goods and curiouser tales.',
  },
  {
    id: 'bedlam', name: 'Bedlam Wastes', kind: 'field', pos: [81, 53], region: 'Zeltmoor',
    desc: 'A desert of red sand and wind-scoured rock between Zeltmoor and Bethel. It takes its name from the howl of the wind in its canyons, which has driven more than one lost traveller mad.',
    random: field('bedlam',
      pool(1, 3, [3, 5], u('grenade', 2), u('steelHawk', 2), u('bonesnatch', 1), u('bullDemon', 1), u('thief', 1)),
      pool(4, undefined, [4, 6], u('explosive', 2), u('cockatrice', 1), u('behemoth', 2), u('kingBehemoth', 1), u('redDragon', 1), u('dancer', 1, 'f'), u('bard', 1, 'm'), u('mime', 1)),
    ),
  },

  // --------------------------------------------------------------------------
  //  BETHEL — the southern marches where the Lions' armies meet
  // --------------------------------------------------------------------------
  {
    id: 'sedge', name: 'Sedge Weald', kind: 'field', pos: [60, 58], region: 'Bethel',
    desc: 'A sprawling wetland wood south of the capital, where the reeds grow taller than a mounted man. Deserters from both Lions\' armies hide here, and the weald\'s beasts are not choosy about whose flesh they take.',
    random: field('sedge',
      pool(1, 2, [3, 5], u('mawbloom', 2), u('woodman', 2), u('boarlet', 1), u('thief', 2), u('archer', 1)),
      pool(3, 3, [4, 5], u('gnashbloom', 2), u('treant', 1), u('porky', 1), u('thief', 1), u('lancer', 1), u('archer', 1), u('geomancer', 1)),
      pool(4, undefined, [4, 6], u('greatMawbloom', 2), u('elderTree', 1), u('wildboar', 1), u('lancer', 1), u('ninja', 1), u('samurai', 1), u('dancer', 1, 'f')),
    ),
  },
  {
    id: 'bethel', name: 'Bethel Garrison', kind: 'castle', pos: [70, 66], region: 'Bethel',
    desc: 'A vast fortress astride the southern river, its walls pierced by great sluice gates that can drown the plain below. Whoever holds Bethel holds the south, and so both Lions have bled for it.',
  },

  // --------------------------------------------------------------------------
  //  LIMBOURNE — the lake country of the south-east
  // --------------------------------------------------------------------------
  {
    id: 'germain', name: 'Germain Peak', kind: 'field', pos: [79, 72], region: 'Limbourne',
    desc: 'A lonely, crag-crowned mountain named — the Church insists — for some other Germain entirely. Hermits, hunters and black-clad assassins all seek its heights, each for their own reasons.',
    random: field('germain',
      pool(1, 3, [3, 5], u('steelHawk', 2), u('dragon', 1), u('ninja', 1), u('monk', 1)),
      pool(4, undefined, [4, 6], u('cockatrice', 1), u('dragon', 1), u('blueDragon', 1), u('ninja', 3), u('samurai', 1), u('mystic', 1)),
    ),
  },
  {
    id: 'poskar', name: 'Poskar Mere', kind: 'field', pos: [85, 82], region: 'Limbourne',
    desc: 'A still, mist-veiled lake lying over the ruins of a drowned village. On windless nights the old church bell can be heard tolling beneath the water, and the drowned rise to answer it.',
    random: field('poskar',
      pool(1, 3, [3, 5], u('ghoul', 2), u('gust', 1), u('octopod', 2), u('skeleton', 1), u('knight', 1)),
      pool(4, undefined, [4, 6], u('revenant', 2), u('livingBone', 2), u('brainleech', 1), u('greaterHydra', 1), u('tiamat', 1), u('knight', 1)),
    ),
  },
  {
    id: 'limbourne', name: 'Limbourne Castle', kind: 'castle', pos: [93, 91], region: 'Limbourne',
    desc: 'A white castle on an island among the south-eastern lakes, seat of the Marquis Elmond. Its beauty is famous across the kingdom; so is the fact that its master has not aged a day in forty years.',
  },

  // --------------------------------------------------------------------------
  //  LYONESSE — the Cardinal's south-west coast
  // --------------------------------------------------------------------------
  {
    id: 'zirkel', name: 'Zirkel Falls', kind: 'field', pos: [36, 65], region: 'Lyonesse',
    desc: 'A thundering waterfall where the river plunges into a gorge, spanned by an old timber bridge. Many an ambush has been laid here, where the roar of the water drowns every warning shout.',
    random: field('zirkel',
      pool(1, 2, [3, 5], u('octopod', 3), u('floateye', 2), u('goblin', 1), u('archer', 2), u('knight', 1)),
      pool(3, 3, [4, 5], u('octopod', 1), u('krakenling', 2), u('ahriman', 1), u('grenade', 1), u('geomancer', 1), u('archer', 1), u('knight', 1)),
      pool(4, undefined, [4, 6], u('krakenling', 2), u('brainleech', 1), u('plague', 1), u('explosive', 1), u('hydra', 1), u('geomancer', 1), u('lancer', 1)),
    ),
  },
  {
    id: 'zelland', name: 'Zelland', kind: 'town', pos: [30, 72], region: 'Lyonesse',
    shop: true, tavern: true, guild: true,
    desc: 'A walled fort-city on the Lyonesse road, rebuilt three times since the Fifty Winters\' War. Soldiers, smiths and the Baird Trading Company\'s smiling agents crowd its streets.',
  },
  {
    id: 'barrowhill', name: 'Barrow Hill', kind: 'field', pos: [20, 65], region: 'Lyonesse',
    desc: 'Grassy downs studded with ancient burial mounds along the road to Lyonesse. The barrows are said to hold the kings of an age before the Church, and some of them do not like visitors.',
    random: field('barrowhill',
      pool(1, 2, [3, 5], u('skeleton', 2), u('ghoul', 2), u('bullDemon', 1), u('floateye', 1), u('knight', 2), u('archer', 1)),
      pool(3, 3, [4, 5], u('bonesnatch', 2), u('gust', 2), u('minotaur', 1), u('bullDemon', 1), u('knight', 1), u('priest', 1)),
      pool(4, undefined, [4, 6], u('livingBone', 2), u('revenant', 2), u('sacredBull', 1), u('minotaur', 1), u('behemoth', 1), u('samurai', 1)),
    ),
  },
  {
    id: 'barrowvale', name: 'Barrow Vale', kind: 'field', pos: [25, 91], region: 'Lyonesse',
    desc: 'A sheltered valley below the southern barrows, its river fringed with willow and tumbled stone walls. The Cardinal\'s patrols use it as a hunting ground, and not only for deer.',
    random: field('barrowvale',
      pool(1, 2, [3, 5], u('boarlet', 2), u('stormhawk', 2), u('woodman', 2), u('bullDemon', 1), u('thief', 1), u('priest', 1)),
      pool(3, 3, [4, 5], u('porky', 2), u('steelHawk', 1), u('cockatrice', 1), u('treant', 1), u('minotaur', 1), u('monk', 1), u('orator', 1)),
      pool(4, undefined, [4, 6], u('wildboar', 2), u('cockatrice', 2), u('elderTree', 1), u('sacredBull', 1), u('behemoth', 1), u('mystic', 1)),
    ),
  },
  {
    id: 'lyonesse', name: 'Castle Lyonesse', kind: 'castle', pos: [10, 73], region: 'Lyonesse',
    shop: true, tavern: true, guild: true,
    desc: 'A proud sea-castle on the south-west coast, held for the Glorian Church by Cardinal Dracomir rather than by any lord. Its chapel is richer than most cathedrals, and its dungeons are busier still.',
  },
  {
    id: 'golgrand', name: 'Golgrand Gallows', kind: 'special', pos: [18, 82], region: 'Lyonesse',
    desc: 'An execution ground on a bare hill outside Lyonesse, where the gibbets creak in the salt wind. Church heretics and ducal rebels hang here side by side, and the crows are fat on both.',
  },
  {
    id: 'zigor', name: 'Zigor Fen', kind: 'field', pos: [6, 87], region: 'Lyonesse',
    desc: 'A poisonous swamp of drowned trees and sucking black mud between Lyonesse and Cogsgard. Pilgrims pay guides handsomely to cross it; those who do not are seldom seen again.',
    random: field('zigor',
      pool(1, 2, [3, 5], u('octopod', 2), u('mawbloom', 2), u('skeleton', 2), u('ghoul', 2), u('floateye', 1)),
      pool(3, 3, [4, 5], u('krakenling', 2), u('gnashbloom', 2), u('bonesnatch', 1), u('gust', 1), u('ahriman', 1), u('mystic', 1)),
      pool(4, undefined, [4, 6], u('brainleech', 2), u('greatMawbloom', 2), u('livingBone', 1), u('revenant', 1), u('hydra', 1), u('plague', 1)),
    ),
  },
  {
    id: 'cogsgard', name: 'Cogsgard', kind: 'town', pos: [13, 95], region: 'Lyonesse',
    shop: true, tavern: true, guild: true,
    desc: 'A city of artificers built on, and inside, the bones of Lost Age machines. Steam whistles shriek and gears grind day and night, and every workshop hides some relic that could make its owner rich or dead.',
  },
  {
    id: 'wargill', name: 'Wargill Port', kind: 'town', pos: [37, 87], region: 'Lyonesse',
    shop: true, tavern: true, guild: true, furShop: true,
    desc: 'The kingdom\'s great southern port, reeking of fish, tar and money. Beneath its oldest quay a sealed stair winds down into the Midnight Deep, and the dockhands will not load a ship moored above it.',
  },
];

export const edges: WorldEdge[] = [
  // Galliard
  { a: 'galwyn', b: 'mandrel' },
  { a: 'mandrel', b: 'ygress' },
  { a: 'mandrel', b: 'swiggle' },
  { a: 'swiggle', b: 'dorhaven' },
  { a: 'dorhaven', b: 'sandrat' },
  { a: 'dorhaven', b: 'zekla' },
  { a: 'dorhaven', b: 'arawen' },
  // Fovain (the Chapter I road north)
  { a: 'zekla', b: 'thieveskeep' },
  { a: 'thieveskeep', b: 'lenara' },
  { a: 'ygress', b: 'lenara' },
  { a: 'lenara', b: 'fovain' },
  { a: 'fovain', b: 'ziekhold' },
  // Lyonesse (the Chapter II road south)
  { a: 'arawen', b: 'zirkel' },
  { a: 'zirkel', b: 'zelland' },
  { a: 'zelland', b: 'barrowhill' },
  { a: 'barrowhill', b: 'lyonesse' },
  { a: 'lyonesse', b: 'zigor' },
  { a: 'zigor', b: 'cogsgard' },
  { a: 'cogsgard', b: 'barrowvale' },
  { a: 'barrowvale', b: 'golgrand' },
  { a: 'golgrand', b: 'lyonesse' },
  { a: 'barrowvale', b: 'wargill' },
  { a: 'wargill', b: 'zelland' },
  // Lesandre & the north
  { a: 'zirkel', b: 'colgrave' },
  { a: 'colgrave', b: 'lesandre' },
  { a: 'dorhaven', b: 'grogmoor' },
  { a: 'grogmoor', b: 'lesandre' },
  { a: 'grogmoor', b: 'orvelle' },
  { a: 'grogmoor', b: 'yardale' },
  { a: 'orvelle', b: 'murondel' },
  { a: 'murondel', b: 'airship' },
  { a: 'yardale', b: 'yewgrove' },
  { a: 'yewgrove', b: 'riverain' },
  { a: 'yardale', b: 'dogol' },
  { a: 'lesandre', b: 'dogol' },
  // Zeltmoor
  { a: 'dogol', b: 'bervaine' },
  { a: 'bervaine', b: 'mtbervaine' },
  { a: 'mtbervaine', b: 'nevel' },
  { a: 'bervaine', b: 'dolbar' },
  { a: 'dolbar', b: 'zeltmoor' },
  { a: 'bervaine', b: 'finneth' },
  { a: 'finneth', b: 'zeltmoor' },
  { a: 'zeltmoor', b: 'zargid' },
  { a: 'zeltmoor', b: 'bedlam' },
  { a: 'zargid', b: 'bedlam' },
  // Bethel & Limbourne
  { a: 'bedlam', b: 'bethel' },
  { a: 'lesandre', b: 'sedge' },
  { a: 'colgrave', b: 'sedge' },
  { a: 'sedge', b: 'bethel' },
  { a: 'bethel', b: 'germain' },
  { a: 'germain', b: 'poskar' },
  { a: 'poskar', b: 'limbourne' },
];
