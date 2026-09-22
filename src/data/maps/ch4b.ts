// ============================================================================
//  Chapter IV, part B — "For Whom the Crown" (second half) and the Epilogue.
//  Castle Ygress, the Holy See of Murondel, the deep vaults of Orvelle, the
//  Necropolis, the Lost Sanctum and the Airship Graveyard; plus the scene-only
//  stages for the Valorne tomb, the hill above Orvelle and the throne room.
//  Tall structures stand on the north (z = 0) and west (x = 0) edges so the
//  default south-east camera looks into each diorama.
// ============================================================================
import type { MapDef } from '../types';

const PI = Math.PI;

export const maps: MapDef[] = [
  // --------------------------------------------------------------------------
  //  Castle Ygress — the great hall of House Valorne (Azazel arena)
  // --------------------------------------------------------------------------
  {
    id: 'ygress_keep', name: 'Castle Ygress — The Great Hall', theme: 'castle', time: 'interior', backdrop: 'castle',
    desc: 'The great hall of House Valorne: a lord\'s dais beneath the family banners, galleries for the household, and a long carpet down which three generations of Valornes have walked to be knighted. Tonight it is empty of everyone but family.',
    rows: [
      '10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b',
      '10b 5s 5s 5s 6s 6c 6c 6c 6c 6s 5s 5s 5s 7b',
      '10b 5s 5s 5s 6s 6c 6c 6c 6c 6s 5s 5s 5s 7b',
      '10b 5s 5x 5s 6s 6s 6c 6c 6s 6s 5s 5x 5s 7b',
      '10b 5s 5s 5s 5s 5s 5c 5c 5s 5s 5s 5s 5s 7b',
      '10b 5s 5s 5s 4s 4s 4c 4c 4s 4s 5s 5s 5s 7b',
      '10b 4s 2s 2s 3s 3s 3c 3c 3s 3s 2s 2s 4s 3b',
      '10b 3s 2sL 2s 2s 2s 2c 2c 2s 2s 2s 2sL 3s 3b',
      '10b 2s 2s 2x 2s 2s 2c 2c 2s 2s 2x 2s 2s 3b',
      '10b 3o 2s 2s 2sL 2s 2c 2c 2s 2sL 2s 2s 2s 3b',
      '10b 4o 4o 2s 2s 2s 2c 2c 2s 2s 2s 2s 2s 3b',
      '10b 4o 4o 2s 2x 2s 2c 2c 2s 2x 2s 2s 2s 3b',
      '10b 4o 4o 2s 2s 2s 2c 2c 2s 2s 2s 2sK 2sC 3b',
      '10b 2s 2s 2s 2s 2s 2c 2c 2s 2s 2s 2s 2s 3b',
    ],
    decor: [
      { type: 'throne', at: [6, 1], scale: 1.1 },
      { type: 'banner', at: [4, 1], color: '#2a3a6a' }, { type: 'banner', at: [9, 1], color: '#2a3a6a' },
      { type: 'banner', at: [1, 1], color: '#5a1e2a' }, { type: 'banner', at: [12, 1], color: '#5a1e2a' },
      { type: 'stainedGlass', at: [2, 1], scale: 1.2 }, { type: 'stainedGlass', at: [11, 1], scale: 1.2 },
      { type: 'pillar', at: [2, 3], scale: 1.35 }, { type: 'pillar', at: [11, 3], scale: 1.35 },
      { type: 'pillar', at: [3, 8], scale: 1.35 }, { type: 'pillar', at: [10, 8], scale: 1.35 },
      { type: 'pillar', at: [4, 11], scale: 1.35 }, { type: 'pillar', at: [9, 11], scale: 1.35 },
      { type: 'chandelier', at: [6, 8] }, { type: 'chandelier', at: [7, 11] },
      { type: 'brazier', at: [4, 4] }, { type: 'brazier', at: [9, 4] },
      { type: 'brazier', at: [3, 13] }, { type: 'brazier', at: [10, 13] },
      { type: 'table', at: [3, 10] }, { type: 'table', at: [10, 10], rot: PI / 2 },
      { type: 'bookshelf', at: [1, 10] }, { type: 'bookshelf', at: [1, 12] },
      { type: 'rug', at: [6, 2], color: '#5a1e2a' },
    ],
    deploy: [[5, 12], [6, 12], [7, 12], [8, 12], [5, 13], [6, 13], [7, 13], [8, 13]],
  },

  // --------------------------------------------------------------------------
  //  Murondel — streets of the Holy See (undead Zander)
  // --------------------------------------------------------------------------
  {
    id: 'murondel_streets', name: 'Murondel — The Pilgrims\' Square', theme: 'town', time: 'overcast', backdrop: 'cathedral',
    desc: 'The pilgrims\' square below the great cathedral, where a fountain of Saint Auren has blessed the thirsty for six hundred years. The stalls are shuttered and the streets empty; the Sanctum Knights have cleared them.',
    rows: [
      '8t/s 8t/s 8t/s 8t/s 4s 3s 3s 3s 3s 4s 7t/s 7t/s 7t/s 7t/s',
      '8t/n 8t/n 8t/n 8t/n 4s 3s 3s 3s 3s 4s 7t/n 7t/n 7t/n 7t/n',
      '6b 6b 6b 6b 5s 3kP 3s 3s 3s 3kP 3s 3s 3s 3s',
      '6b 6b 6bL 6b 4s 3s 2.5w 2.5w 2.5w 3s 3sL 5t/s 5t/s 5t/s',
      '2s 2s 2s 3s 3s 3s 2.5w 4sS 2.5w 3s 3s 5t/n 5t/n 5t/n',
      '5t/s 5t/s 2s 3s 3kP 3s 2.5w 2.5w 2.5w 3s 3kP 2s 2s 2s',
      '5t/n 5t/n 2s 2s 3s 3s 3s 3s 3s 3s 3s 2s 4t/s 4t/s',
      '2s 2s 2s 2sK 2s 3s 3s 3s 3s 3s 2s 2s 4t/n 4t/n',
      '1gB 1s 1s 2s 2s 2s 2s 2s 2s 2s 2s 1s 1s 1gB',
      '1s 1s 1s 1s 1s 1s 1s 1s 1s 1s 1s 1s 1gF 1gB',
      '-1W -1W 0w 1s 1s 1s 1s 1s 1s 1s 1s 1sC 1gF 1gT',
      '-1W -1W 0w 1s 1s 1s 1s 1s 1s 1s 1s 1sK 1s 1s',
      '1s 1s 1s 1s 1s 1s 1s 1s 1s 1s 1s 1s 1s 1s',
      '1sL 1s 1s 1s 1s 1s 1s 1s 1s 1s 1s 1s 1s 1sL',
    ],
    decor: [
      { type: 'banner', at: [5, 0], color: '#e8e4dc' }, { type: 'banner', at: [8, 0], color: '#e8e4dc' },
      { type: 'banner', at: [4, 2], color: '#a01a2a' }, { type: 'banner', at: [10, 2], color: '#a01a2a' },
      { type: 'chimney', at: [1, 0], y: 0.5 }, { type: 'chimney', at: [12, 1], y: 0.3 },
      { type: 'chimney', at: [0, 6], y: 0.2 }, { type: 'chimney', at: [13, 7], y: 0.2 },
      { type: 'market', at: [3, 10], rot: PI / 2 }, { type: 'market', at: [13, 12], rot: -PI / 2 },
      { type: 'cart', at: [12, 11], rot: 0.4 },
      { type: 'signpost', at: [3, 12] },
      { type: 'barrel', at: [0, 12] }, { type: 'crate', at: [10, 8] },
      { type: 'lamp', at: [4, 8] }, { type: 'lamp', at: [9, 8] },
      { type: 'flowers', at: [12, 9] },
    ],
    deploy: [[4, 12], [5, 12], [6, 12], [7, 12], [8, 12], [5, 13], [6, 13], [7, 13]],
  },

  // --------------------------------------------------------------------------
  //  Murondel — the cloister (Rolf)
  // --------------------------------------------------------------------------
  {
    id: 'murondel_cloister', name: 'Murondel — The Cloister of the Saint', theme: 'church', time: 'overcast', backdrop: 'cathedral',
    desc: 'A square garden of cypress and white roses, walled by an arcade of fluted columns. The brothers of the See walk its paths in meditation; above them, on the chapter-house loggia, the Sanctum Knights keep watch.',
    rows: [
      '10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b',
      '10b 5sS 5s 5s 5s 5c 5c 5c 5s 5s 5s 5sS 7b',
      '10b 5s 5s 5x 5s 5c 5c 5c 5s 5x 5s 5s 7b',
      '10b 4s 2s 1gF 1g 4s 4c 4s 1g 1gF 2s 4s 3b',
      '10b 3s 2x 1g 1gB 3s 3c 3s 1gB 1g 2x 3s 3b',
      '10b 2s 2s 1gF 1g 2s 2c 2s 1g 1gF 2s 2s 3b',
      '10b 2s 2x 1g 1gP 1g 1g 1g 1gP 1g 2x 2s 3b',
      '10b 2s 2s 1g 1g 1g 1g 1g 1g 1g 2s 2s 3b',
      '10b 2s 2x 1gF 1g 1g 1g 1g 1g 1gF 2x 2s 3b',
      '10b 2s 2s 1g 1gP 1g 1g 1g 1gP 1g 2s 2s 3b',
      '10b 2s 2x 1g 1g 1gF 1g 1gF 1g 1g 2x 2s 3b',
      '10b 2s 2s 2s 2x 2s 2x 2s 2x 2s 2s 2s 3b',
      '10b 2sL 2s 2s 2s 2s 2s 2s 2s 2s 2s 2sL 3b',
      '10b 2s 2s 2s 2s 2s 2s 2s 2s 2s 2s 2s 3b',
    ],
    decor: [
      { type: 'stainedGlass', at: [6, 1], scale: 1.3 },
      { type: 'banner', at: [3, 1], color: '#a01a2a' }, { type: 'banner', at: [9, 1], color: '#a01a2a' },
      { type: 'brazier', at: [4, 1] }, { type: 'brazier', at: [8, 1] },
      { type: 'pillar', at: [3, 2], scale: 1.3 }, { type: 'pillar', at: [9, 2], scale: 1.3 },
      { type: 'pillar', at: [2, 4], scale: 1.3 }, { type: 'pillar', at: [10, 4], scale: 1.3 },
      { type: 'pillar', at: [2, 6], scale: 1.3 }, { type: 'pillar', at: [10, 6], scale: 1.3 },
      { type: 'pillar', at: [2, 8], scale: 1.3 }, { type: 'pillar', at: [10, 8], scale: 1.3 },
      { type: 'pillar', at: [2, 10], scale: 1.3 }, { type: 'pillar', at: [10, 10], scale: 1.3 },
      { type: 'pillar', at: [4, 11], scale: 1.3 }, { type: 'pillar', at: [6, 11], scale: 1.3 },
      { type: 'pillar', at: [8, 11], scale: 1.3 },
      { type: 'well', at: [6, 7] },
      { type: 'flowers', at: [5, 6] }, { type: 'flowers', at: [7, 9] },
    ],
    deploy: [[3, 12], [4, 12], [5, 12], [6, 12], [7, 12], [8, 12], [9, 12], [5, 13], [6, 13], [7, 13]],
  },

  // --------------------------------------------------------------------------
  //  Murondel — the great chapel of the Holy See (Clement)
  // --------------------------------------------------------------------------
  {
    id: 'murondel_chapel', name: 'Murondel — The Great Chapel', theme: 'church', time: 'interior', backdrop: 'cathedral',
    desc: 'The heart of the Glorian faith: a nave of white columns under windows that tell the life of Saint Auren in coloured glass, from the humble shepherd to the ascension in fire. The great organ has not been played in a week.',
    rows: [
      '10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b',
      '10b 6o 6o 5c 5c 5c 5c 5c 5c 6o 6o 8b',
      '10b 6o 6o 5c 5c 5c 5c 5c 5c 6o 6o 8b',
      '10b 5s 5s 5s 5c 5c 5c 5c 5s 5s 5s 8b',
      '10b 4s 4s 4s 4s 4c 4c 4s 4s 4s 4s 8b',
      '10b 3s 3s 3s 3s 3c 3c 3s 3s 3s 3s 8b',
      '10b 2s 2s 2x 2s 2c 2c 2s 2x 2s 2s 3b',
      '10b 3s 3s 2s 2s 2c 2c 2s 2s 2s 2s 3b',
      '10b 3sL 3s 2x 2s 2c 2c 2s 2x 4o 2s 3b',
      '10b 3s 3s 2s 2s 2c 2c 2s 2s 3o 2s 3b',
      '10b 2s 2s 2x 2s 2c 2c 2s 2x 2s 2s 3b',
      '10b 2s 2s 2s 2s 2c 2c 2s 2s 3s 3s 3b',
      '10b 2s 2s 2x 2s 2c 2c 2s 2x 3s 3sL 3b',
      '10b 2s 2s 2s 2s 2c 2c 2s 2s 2s 2s 3b',
      '10b 2s 2s 2s 2s 2c 2c 2s 2s 2s 2s 3b',
    ],
    decor: [
      { type: 'altar', at: [5, 1] }, { type: 'altar', at: [6, 1] },
      { type: 'stainedGlass', at: [4, 1], scale: 1.6 }, { type: 'stainedGlass', at: [7, 1], scale: 1.6 },
      { type: 'stainedGlass', at: [3, 1], scale: 1.3 }, { type: 'stainedGlass', at: [8, 1], scale: 1.3 },
      { type: 'organ', at: [1, 1], scale: 1.3 },
      { type: 'bookshelf', at: [10, 1] },
      { type: 'pillar', at: [3, 6], scale: 1.7 }, { type: 'pillar', at: [8, 6], scale: 1.7 },
      { type: 'pillar', at: [3, 8], scale: 1.7 }, { type: 'pillar', at: [8, 8], scale: 1.7 },
      { type: 'pillar', at: [3, 10], scale: 1.7 }, { type: 'pillar', at: [8, 10], scale: 1.7 },
      { type: 'pillar', at: [3, 12], scale: 1.7 }, { type: 'pillar', at: [8, 12], scale: 1.7 },
      { type: 'chandelier', at: [5, 7] }, { type: 'chandelier', at: [6, 11] },
      { type: 'brazier', at: [3, 3] }, { type: 'brazier', at: [8, 3] },
      { type: 'banner', at: [1, 3], color: '#e8e4dc' }, { type: 'banner', at: [10, 3], color: '#e8e4dc' },
      { type: 'bookshelf', at: [1, 7] },
      { type: 'coffin', at: [10, 11], rot: PI / 2, color: '#d8c890' },
      { type: 'statue', at: [1, 13] }, { type: 'statue', at: [10, 13] },
    ],
    deploy: [[4, 13], [5, 13], [6, 13], [7, 13], [4, 14], [5, 14], [6, 14], [7, 14]],
  },

  // --------------------------------------------------------------------------
  //  Orvelle Abbey — the fourth vault (Barrick)
  // --------------------------------------------------------------------------
  {
    id: 'orvelle_vault4', name: 'Orvelle Abbey — The Fourth Vault', theme: 'dungeon', time: 'interior', backdrop: 'cavern',
    desc: 'Below the vaults the brothers knew lies a library of stone older than the abbey: shelves of crumbling scrolls around a shaft that drops into the dark, lit only by crystals that have grown through the walls like frost.',
    rows: [
      '10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b',
      '10b 7s 7s 7s 6s 5s 5s 5s 5s 5s 5s 5s 9b',
      '10b 7s 7y 7s 6s 5s 5s 5s 5s 5s 5s 5s 9b',
      '10b 7s 7s 7s 6s 5s 5x 5s 5x 5s 5s 5s 9b',
      '10b 5s 5s 5s 4s . . . . 4s 5s 5s 9b',
      '10b 5s 5y 5s 4s . . . . 4s 4s 4s 9b',
      '10b 5s 5s 4o 4o 4o 4o 4o 4o 4o 4s 4s 9b',
      '10b 5s 5s 5s 4s . . . . 4s 4s 3s 9b',
      '10b 4s 4s 4s 4s . . . . 4s 3s 3s 9b',
      '10b 4s 4y 3s 3s 3s 3s 3s 3s 3s 3s 3s 4b',
      '10b 3x 3s 3s 3sL 3s 3s 3s 3s 3sL 3s 3s 4b',
      '10b 3s 3s 3s 3s 3s 3s 3s 3s 3x 4s 4s 5b',
      '10b 3s 3s 3s 3s 3s 3s 3s 3s 3s 4s 4s 5b',
    ],
    decor: [
      { type: 'portcullis', at: [2, 1], scale: 1.3 },
      { type: 'bookshelf', at: [5, 1] }, { type: 'bookshelf', at: [7, 1] }, { type: 'bookshelf', at: [9, 1] },
      { type: 'bookshelf', at: [1, 10], rot: PI / 2 }, { type: 'bookshelf', at: [9, 11] },
      { type: 'pillar', at: [6, 3], scale: 1.4 }, { type: 'pillar', at: [8, 3], scale: 1.4 },
      { type: 'crystal', at: [2, 2], scale: 1.4, color: '#8fd8ff' },
      { type: 'crystal', at: [1, 5], scale: 1.5, color: '#a08fff' },
      { type: 'crystal', at: [2, 9], scale: 1.3, color: '#8fd8ff' },
      { type: 'crystal', at: [11, 4], scale: 1.2, color: '#7fffd0' },
      { type: 'crystal', at: [1, 12], scale: 1.2, color: '#a08fff' },
      { type: 'crystal', at: [11, 9], scale: 1.0, color: '#8fd8ff' },
      { type: 'torch', at: [4, 1] }, { type: 'torch', at: [4, 8] }, { type: 'torch', at: [9, 7] },
      { type: 'coffin', at: [11, 10], rot: PI / 2 }, { type: 'coffin', at: [10, 9], rot: PI / 2 },
      { type: 'bones', at: [3, 12] },
    ],
    deploy: [[5, 11], [6, 11], [7, 11], [8, 11], [5, 12], [6, 12], [7, 12], [8, 12], [10, 11], [11, 11]],
  },

  // --------------------------------------------------------------------------
  //  Orvelle Abbey — the fifth vault (Rolf & Clement; the Scriptures' seal)
  // --------------------------------------------------------------------------
  {
    id: 'orvelle_vault5', name: 'Orvelle Abbey — The Sealed Vault', theme: 'dungeon', time: 'interior', backdrop: 'cavern',
    desc: 'The lowest vault: a temple of glittering crystal floor, where a still black moat rings a dais and an altar carved before the Church had a name. Four rune-pillars keep watch, and the air tastes of thunder.',
    rows: [
      '10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b 10b',
      '10b 4y 4y 4s 4s 4s 4s 4s 4s 4s 4y 4y 9b',
      '10b 4y 8x 4s 1W 1W 3s 1W 1W 4s 8x 4y 9b',
      '10b 4s 4s 4sS 1W 1W 3s 1W 1W 4sS 4s 4s 9b',
      '10b 4s 1W 1W 5y 5y 5y 5y 5y 1W 1W 4s 9b',
      '10b 4s 1W 1W 5y 6y 6y 6y 5y 1W 1W 4s 9b',
      '10b 3s 3s 3s 5y 6y 6y 6y 5y 3s 3s 3s 9b',
      '10b 4s 1W 1W 5y 6y 6y 6y 5y 1W 1W 4s 9b',
      '10b 4s 1W 1W 5y 5y 5y 5y 5y 1W 1W 4s 9b',
      '10b 4s 4s 4sS 1W 1W 3s 1W 1W 4sS 4s 4s 5b',
      '10b 4y 8x 4s 1W 1W 3s 1W 1W 4s 8x 4y 5b',
      '10b 3s 3s 3s 3s 3s 3s 3s 3s 3s 3s 3s 5b',
      '10b 3s 3s 3s 3s 3s 3s 3s 3s 3s 3s 3s 5b',
    ],
    decor: [
      { type: 'altar', at: [6, 6], scale: 1.25, color: '#b8b0c8' },
      { type: 'crystal', at: [2, 2], scale: 1.7, color: '#b08fff' },
      { type: 'crystal', at: [10, 2], scale: 1.7, color: '#8fd8ff' },
      { type: 'crystal', at: [2, 10], scale: 1.7, color: '#8fd8ff' },
      { type: 'crystal', at: [10, 10], scale: 1.7, color: '#b08fff' },
      { type: 'crystal', at: [1, 1], scale: 1.2, color: '#7fffd0' }, { type: 'crystal', at: [11, 1], scale: 1.2, color: '#7fffd0' },
      { type: 'crystal', at: [1, 10], scale: 1.1, color: '#a08fff' }, { type: 'crystal', at: [11, 10], scale: 1.1, color: '#a08fff' },
      { type: 'brazier', at: [4, 4] }, { type: 'brazier', at: [8, 4] },
      { type: 'brazier', at: [4, 8] }, { type: 'brazier', at: [8, 8] },
      { type: 'bones', at: [1, 7] }, { type: 'bones', at: [11, 3] },
      { type: 'ruinWall', at: [3, 12], rot: 0.2 },
    ],
    deploy: [[3, 12], [4, 12], [5, 12], [6, 12], [7, 12], [8, 12], [9, 12], [2, 11], [10, 11]],
  },

  // --------------------------------------------------------------------------
  //  The Necropolis of Murondel (Clement)
  // --------------------------------------------------------------------------
  {
    id: 'necropolis', name: 'The Necropolis of Murondel', theme: 'ruins', time: 'void', weather: 'motes', backdrop: 'cavern',
    desc: 'A city of the Lost Age, buried whole beneath the Holy See: broken houses, a processional avenue choked with bones, and at its head a temple whose steps no living foot has climbed in a thousand years. Pale motes drift in the dark like snow that has forgotten how to fall.',
    rows: [
      '9b 9b 8b 9b 8b 7s 7s 7s 7s 7s 8b 9b 8b 9b 9b',
      '8b 5b 7b 6b 5b 6s 6s 6s 6s 6s 5b 7b 6b 5b 8b',
      '7b 4r 4u 5b 4u 5s 5s 5s 5s 5s 4u 4r . . 7b',
      '6b 6b 4u 3u 3u 4s 4s 4s 4s 4s 3u . . . 6b',
      '7b 3u 3u 3uX 2u 3s 3s 3s 3s 3s 2u . . 3r 5b',
      '5b 4b 3u 3u 2u 2s 2s 2s 2s 2s 2u 2u . 3r 4b',
      '6b 3u 3uX 2u 2u 2s 2u 2s 2u 2s 2u 2u 1u 1u 2r',
      '4b 4b 3u 2u 2uX 2s 2u 2s 2uX 2s 2u 1u 1uX 1u 1u',
      '5b 3u 3u 2u 2u 2s 2u 2s 2u 2s 2u 1u 1u 1uX 1u',
      '6b 5b 4b 2u 2u 2s 2s 2s 2s 2s 2u 1u 1uX 1u 2r',
      '4b 3u 3u 2u 2uX 2u 2u 2s 2u 2u 2u 2u 1u 1u 2r',
      '3b 3u 2u 2u 2u 2u 2u 2s 2u 2u 2u 2u 2u 2r 3r',
      '2u 2u 2u 2uM 2u 2u 2u 2s 2u 2u 2uM 2u 2u 2u 3r',
      '2u 2uD 2u 2u 2u 2u 2u 2s 2u 2u 2u 2uD 2u 2u 2u',
      '2u 2u 2u 2u 2u 2u 2u 2s 2u 2u 2u 2u 2u 2u 2u',
    ],
    decor: [
      { type: 'statue', at: [6, 0], scale: 1.3 }, { type: 'statue', at: [8, 0], scale: 1.3 },
      { type: 'pillar', at: [5, 0], scale: 1.5, color: '#9a948a' }, { type: 'pillar', at: [9, 0], scale: 1.5, color: '#9a948a' },
      { type: 'brazier', at: [6, 3] }, { type: 'brazier', at: [8, 3] },
      { type: 'coffin', at: [12, 7], rot: 0.3 }, { type: 'coffin', at: [13, 9], rot: 1.2 }, { type: 'coffin', at: [11, 10], rot: 1.7 },
      { type: 'bones', at: [3, 6] }, { type: 'bones', at: [2, 10] }, { type: 'bones', at: [12, 12] },
      { type: 'bones', at: [4, 4] }, { type: 'bones', at: [9, 11] }, { type: 'bones', at: [6, 8] },
      { type: 'ruinWall', at: [3, 7], rot: 0.4 }, { type: 'ruinWall', at: [10, 3], rot: -0.3 },
      { type: 'ruinWall', at: [1, 11], rot: 1.4 }, { type: 'ruinWall', at: [13, 11], rot: 0.9 },
      { type: 'grave', at: [11, 7] }, { type: 'grave', at: [14, 8] },
      { type: 'deadTree', at: [0, 12] },
      { type: 'lamp', at: [4, 9] }, { type: 'lamp', at: [10, 9] },
      // will-o'-wisps over the old graves
      { type: 'crystal', at: [2, 7], y: 1, scale: 0.6, color: '#a0ffc0' }, { type: 'crystal', at: [12, 6], y: 1.2, scale: 0.6, color: '#a0ffc0' },
      { type: 'crystal', at: [4, 12], y: 0.8, scale: 0.5, color: '#a0ffc0' }, { type: 'crystal', at: [13, 10], y: 1, scale: 0.6, color: '#c0a0ff' },
    ],
    deploy: [[5, 13], [6, 13], [7, 13], [8, 13], [9, 13], [6, 14], [7, 14], [8, 14]],
  },

  // --------------------------------------------------------------------------
  //  The Lost Sanctum (Barrick's last stand)
  // --------------------------------------------------------------------------
  {
    id: 'lost_sanctum', name: 'The Lost Sanctum', theme: 'void', time: 'void', weather: 'motes', backdrop: 'void',
    desc: 'The oldest holy ground in Ivaldis: islands of broken pavement hanging over nothing, joined by crumbling stairs, where men knelt to the Umbrals before the Umbrals had names. Shattered columns drift in the dark like the bones of a drowned god.',
    rows: [
      '. . . . 10x 7sS 7y 7y 7sS 10x . . . .',
      '. . . . 7s 7s 7s 7s 7s 7s . . . .',
      '. . 6s 7s 7s 7k 7s 7s 7k 7s . . . .',
      '. . 6s . 7s 7s 7s 7s 7s 7s 7s 6s . .',
      '5k 5s 5s 5s . . 5s . . . . 5s . .',
      '5s 5y 5s 5s . 4s 4s 4s 4s . 4s 4s 4s 4k',
      '5s 5s 5s 5s 4s 4s 4y 4y 4s 4s 4s 4y 4s 4s',
      '5k 5s 8x 5s . 4s 4s 4s 4s . 4s 4s 7x 4s',
      '. 5s 5s 5s . . 4s . . . 4k 4s 4s .',
      '. . 4s . . . 3s . . . . 4s . .',
      '. . 3s 3s 3s 3k 3s 3s 3s 3s . 4s . .',
      '. . . 3s 3s 3s 3s 3s 3s 3s 3s 3s . .',
      '. . . 3s 3s 3s 3s 3s 3s 3k . . . .',
      '. . . . 3s 3s 3s 3s 3s . . . . .',
    ],
    decor: [
      { type: 'altar', at: [6, 0], color: '#6a2a3a' }, { type: 'altar', at: [7, 0], color: '#6a2a3a' },
      { type: 'brazier', at: [4, 1] }, { type: 'brazier', at: [9, 1] },
      // broken columns adrift in the void
      { type: 'pillar', at: [1, 1], y: 5, scale: 1.2, rot: 0.4, color: '#8a8478' },
      { type: 'pillar', at: [12, 1], y: 3, scale: 1.4, rot: 1.1, color: '#8a8478' },
      { type: 'pillar', at: [0, 10], y: 1, scale: 1.1, color: '#8a8478' },
      { type: 'pillar', at: [12, 12], y: 2, scale: 1.3, rot: 0.7, color: '#8a8478' },
      { type: 'pillar', at: [9, 9], y: 1.5, scale: 0.9, color: '#8a8478' },
      { type: 'pillar', at: [4, 9], y: 0.5, scale: 1.0, rot: 2.1, color: '#8a8478' },
      { type: 'boulder', at: [13, 3], y: 4, scale: 1.2 }, { type: 'boulder', at: [1, 12], y: 0.5 },
      { type: 'boulder', at: [8, 4], y: 2, scale: 0.8 },
      { type: 'ruinWall', at: [0, 4], rot: 1.2 }, { type: 'ruinWall', at: [13, 6], rot: -0.4 },
      { type: 'ruinWall', at: [3, 12], rot: 0.3 },
      { type: 'crystal', at: [1, 5], scale: 1.4, color: '#ff6aa0' }, { type: 'crystal', at: [0, 6], scale: 1.1, color: '#b08fff' },
      { type: 'crystal', at: [13, 5], scale: 1.2, color: '#ff6aa0' }, { type: 'crystal', at: [3, 10], scale: 1.0, color: '#b08fff' },
      { type: 'bones', at: [9, 12] },
    ],
    deploy: [[4, 12], [5, 12], [6, 12], [7, 12], [8, 12], [5, 13], [6, 13], [7, 13]],
  },

  // --------------------------------------------------------------------------
  //  The Airship Graveyard (Volmar / Astaroth)
  // --------------------------------------------------------------------------
  {
    id: 'airship_graveyard', name: 'The Airship Graveyard', theme: 'airship', time: 'storm', weather: 'rain', backdrop: 'clouds',
    desc: 'A blasted headland on the northern cliffs, strewn with the hulls of Lost Age sky-ships. Their decks are warped and their engines cold, and the storm howls through their ribs like a dirge for the world that built them.',
    rows: [
      '5a 5a 5a 5a 5a 4a 2r 2r 3r 3r 2r 4a 5a 4a 3r',
      '6o 6o 6o 6oC 6o 6o 5a 2r 2d 2d 3r 5a 6o 5a 3r',
      '6o 6o 6o 6o 6o 6o 6o 5a 2d 2r 2d 5a 6o 5a 2r',
      '6o 6oK 6o 6o 6o 6o 5a 2d 2d 1d 2r 5a 6o 5a 2r',
      '5a 5a 5a 4o 4a 3a 2r 2d 1d 1d 2d 5a 6o 5a 2r',
      '2r 2r 2d 3o 2d 2r 2d 1d 0d 1d 2d 4a 5o 4a 2r',
      '2r 2d 2d 2r 2d 1d 1d 1d 1d 1d 2r 4a 5o 4a 2r',
      '3r 2r 2dC 2d 2r 2d 1d 1r 1d 2d 2d 3a 4o 3a 2r',
      '3r 3r 2d 2d 2a 2a 2r 2d 2d 2r 2d 2r 3a 2d 2r',
      '4r 3r 2r 2d 3a 3a 2d 2d 2r 2dK 2d 2d 2r 2d .',
      '4r 3r 2d 2r 2d 2d 2r 2d 2d 2d 2r 2d 2r . .',
      '3r 2r 2d 2d 2d 2r 2d 2d 2r 2d 2d 2r . . .',
      '3r 2d 2r 2d 2d 2d 2d 2r 2d 2d 2r . . . .',
      '2r 2r 2d 2d 2r 2d 2d 2d 2d 2r . . . . .',
      '2r 2d 2d 2r 2d 2d 2r 2d 2d . . . . . .',
    ],
    decor: [
      // small skiffs half-buried where they fell
      { type: 'airship', at: [9, 11], y: -1.6, scale: 1.3, rot: 0.8 },
      { type: 'airship', at: [1, 7], y: -1.4, scale: 1.1, rot: 1.9 },
      // Lost Age engine cores still leaking light
      { type: 'crystal', at: [8, 5], scale: 1.5, color: '#7fe0ff' },
      { type: 'crystal', at: [5, 8], scale: 1.1, color: '#7fe0ff' },
      { type: 'crystal', at: [13, 8], scale: 1.0, color: '#ffb060' },
      { type: 'crystal', at: [0, 5], scale: 1.0, color: '#7fe0ff' },
      { type: 'brazier', at: [7, 6] }, { type: 'brazier', at: [10, 3] },
      { type: 'cannon', at: [2, 1] }, { type: 'cannon', at: [4, 3], rot: PI },
      { type: 'cannon', at: [12, 2], rot: PI / 2 },
      { type: 'banner', at: [5, 1], color: '#6a5a3a' }, { type: 'banner', at: [12, 5], color: '#6a5a3a' },
      { type: 'gear', at: [8, 8], scale: 1.3, rot: 0.4 }, { type: 'gear', at: [2, 6], scale: 0.9, rot: 1.2 },
      { type: 'gear', at: [5, 9], scale: 1.1 },
      { type: 'pipe', at: [4, 8] }, { type: 'pipe', at: [11, 7] }, { type: 'pipe', at: [6, 2], scale: 1.3 },
      { type: 'rock', at: [9, 4] }, { type: 'rock', at: [1, 10] }, { type: 'boulder', at: [10, 12] },
      { type: 'crate', at: [9, 1] }, { type: 'barrel', at: [7, 10] },
    ],
    deploy: [[2, 12], [3, 12], [4, 12], [5, 12], [6, 12], [3, 13], [4, 13], [5, 13], [6, 13]],
  },

  // --------------------------------------------------------------------------
  //  The Airship Graveyard — the last ship's deck (Altessa)
  // --------------------------------------------------------------------------
  {
    id: 'airship_deck', name: 'The Last Sky-Ship', theme: 'airship', time: 'void', weather: 'embers', backdrop: 'void',
    desc: 'The deck of a sky-ship of the Lost Age, torn from the graveyard and lifted into a sky that is no longer quite the sky. Its engines burn with a red that is not fire, and there is nothing below but light.',
    rows: [
      '. . . . . 7a 7a . . . . .',
      '. . . . 7a 6o 6o 7a . . . .',
      '. . . 7a 6o 6o 6o 6o 7a . . .',
      '. . 6a 6o 6o 6o 6o 6o 6o 6a . .',
      '. . 6a 5o 5o 5o 5o 5o 5o 6a . .',
      '. 5a 4o 4o 4o 4x 4o 4o 4o 4o 5a .',
      '. 5aL 4o 4o 4o 4o 4o 4o 4o 4o 5aL .',
      '5a 4o 4o 4o 5a 5a 5a 5a 4o 4o 4o 5a',
      '5a 4oC 4o 4o 5a 6a 6a 5a 4o 4o 4oK 5a',
      '5a 4o 4o 4o 5a 5a 5a 5a 4o 4o 4o 5a',
      '. 5a 4o 4o 4o 4o 4x 4o 4o 4o 5a .',
      '. 5aL 4o 4o 4o 4o 4o 4o 4o 4o 5aL .',
      '. 6a 5o 5o 5o 5o 5o 5o 5o 5o 6a .',
      '. 6a 6o 6o 6o 6o 6o 6o 6o 6o 6a .',
      '. . 7a 7a 7aL 7a 7a 7aL 7a 7a . .',
    ],
    decor: [
      // masts, their torn sails still flying
      { type: 'banner', at: [5, 5], scale: 3.2, color: '#d8c8a8' }, { type: 'banner', at: [6, 10], scale: 3.0, rot: PI, color: '#d8c8a8' },
      { type: 'barrel', at: [5, 5], scale: 1.4, color: '#5a3a24' }, { type: 'barrel', at: [6, 10], scale: 1.4, color: '#5a3a24' },
      { type: 'banner', at: [5, 0], scale: 1.3, color: '#a8101e' }, { type: 'banner', at: [6, 0], scale: 1.3, color: '#a8101e' },
      { type: 'banner', at: [2, 13], color: '#a8101e' }, { type: 'banner', at: [9, 13], color: '#a8101e' },
      { type: 'gear', at: [5, 8], scale: 1.3 }, { type: 'gear', at: [6, 8], scale: 1.3, rot: PI / 2 },
      { type: 'pipe', at: [4, 7] }, { type: 'pipe', at: [7, 7] }, { type: 'pipe', at: [4, 9] }, { type: 'pipe', at: [7, 9] },
      { type: 'crystal', at: [5, 7], scale: 1.3, color: '#ff3050' }, { type: 'crystal', at: [6, 9], scale: 1.3, color: '#ff3050' },
      { type: 'crystal', at: [6, 7], scale: 0.9, color: '#ffd080' }, { type: 'crystal', at: [5, 9], scale: 0.9, color: '#ffd080' },
      { type: 'cannon', at: [1, 7], rot: PI }, { type: 'cannon', at: [10, 7] },
      { type: 'cannon', at: [1, 10], rot: PI }, { type: 'cannon', at: [10, 10] },
      { type: 'crate', at: [3, 12] }, { type: 'barrel', at: [8, 12] },
      // debris of the graveyard, dragged up into the void in the ship's wake
      { type: 'boulder', at: [0, 2], y: 3, scale: 1.2 }, { type: 'boulder', at: [11, 5], y: -1, scale: 0.9 },
      { type: 'gear', at: [0, 10], y: 2, scale: 1.1, rot: 0.8 }, { type: 'gear', at: [11, 1], y: 4, scale: 0.9, rot: 2.1 },
      { type: 'pillar', at: [11, 13], y: 1, scale: 1.2, rot: 0.6, color: '#6a4a30' },
    ],
    deploy: [[3, 13], [4, 13], [5, 13], [6, 13], [7, 13], [8, 13], [4, 12], [7, 12]],
  },

  // --------------------------------------------------------------------------
  //  Scene stages
  // --------------------------------------------------------------------------
  {
    id: 'scene_valorne_tomb', name: 'Castle Ygress — The Valorne Tombs', theme: 'plains', time: 'dusk', weather: 'rain', backdrop: 'castle',
    desc: 'The family graveyard beneath the castle wall, where Lord Baldric Valorne lies under the effigy of a knight who looks nothing like him.',
    rows: [
      '5b 5b 5b 5b 5b 5b 5b 5b 5b 5b 5b',
      '2g 2gX 2g 2gX 2g 3s 3s 2g 2gX 2gD 2g',
      '2gX 2g 2g 2g 2g 3s 3s 2g 2g 2g 2gX',
      '2g 2g 2gX 2g 2d 2d 2d 2d 2gX 2g 2g',
      '2gD 2g 2g 2g 2d 2g 2g 2d 2g 2gX 2g',
      '2g 2gX 2g 2gX 2d 2g 2g 2d 2g 2g 2g',
      '1g 2g 2g 2g 2d 2d 2d 2d 2g 2gX 2g',
      '1g 1g 2g 2g 2g 2d 2d 2g 2g 2g 1g',
      '1g 1g 1g 2g 2g 2d 2d 2g 2g 1g 1g',
      '1g 1g 1g 1g 1g 2d 2d 1g 1g 1g 1g',
    ],
    decor: [
      { type: 'statue', at: [5, 1], scale: 1.25 },
      { type: 'grave', at: [6, 1], scale: 1.3 },
      { type: 'flowers', at: [6, 2] },
      { type: 'mushroom', at: [5, 3], color: '#d8e0c0' }, { type: 'mushroom', at: [6, 3], color: '#d8e0c0' },
      { type: 'lamp', at: [4, 3] }, { type: 'lamp', at: [7, 3] },
      { type: 'fence', at: [4, 1], rot: PI / 2 }, { type: 'fence', at: [4, 2], rot: PI / 2 },
      { type: 'fence', at: [7, 1], rot: PI / 2 }, { type: 'fence', at: [7, 2], rot: PI / 2 },
      { type: 'banner', at: [2, 0], color: '#2a3a6a' }, { type: 'banner', at: [8, 0], color: '#2a3a6a' },
    ],
    deploy: [[4, 7], [5, 7], [6, 7], [4, 8], [5, 8], [6, 8]],
  },
  {
    id: 'scene_epilogue_hill', name: 'The Hill above Orvelle', theme: 'plains', time: 'dawn', weather: 'leaves', backdrop: 'mountains',
    desc: 'A green hill above Orvelle Abbey, crowned with wildflowers, where a princess once picked posies and a novice once read her letters in the sun. At its foot lies the abbey graveyard.',
    rows: [
      '7g 7g 7g 7gF 7g 7g 7g 7g 7gF 7g 7g 7g',
      '7gF 7g 7g 7g 7d 7d 7d 7d 7g 7g 7gF 7g',
      '6g/n 6gF/n 7g 7g 7gF 7gF 7g 7gF 7g 6gF/n 6g/n 6g/n',
      '5g/n 6g 6g/n 6gF/n 6g/n 6d/n 6g/n 6g/n 6gF/n 6g 5g/n 5gT/n',
      '4g/n 5g/n 5gF/n 5g/n 5g/n 5d/n 5g/n 5gF/n 5g/n 5g/n 4g/n 4g/n',
      '3gT/n 4g/n 4g/n 4g/n 4d/n 4g/n 4g/n 4g/n 4g/n 4g/n 3g/n 3g/n',
      '2g/n 3g/n 3g/n 3g/n 3d/n 3g/n 3gF/n 3g/n 3g/n 3g/n 2g/n 2g/n',
      '3b 2g/n 2g/n 2d/n 2d/n 2g/n 2g/n 2g/n 2g/n 2g/n 2g 1g/n',
      '3b 1g/n 1gX/n 1d/n 1g/n 1gX/n 1g/n 1gX/n 1g/n 1gX/n 1g/n 1g',
      '3b 1g 1g 1d 1g 1g 1g 1g 1g 1g 1g 1g',
      '3b 1gX 1g 1d 1gX 1g 1gX 1g 1gX 1g 1gX 1g',
      '3b 1g 1g 1d 1d 1d 1d 1d 1d 1d 1d 1d',
    ],
    decor: [
      { type: 'coffin', at: [6, 9], rot: PI / 2 },
      { type: 'flowers', at: [7, 9] }, { type: 'flowers', at: [5, 9] },
      { type: 'grave', at: [6, 8], scale: 1.1 },
      { type: 'tree', at: [11, 1], scale: 1.2 }, { type: 'tree', at: [0, 3] },
      { type: 'flowers', at: [5, 1] }, { type: 'flowers', at: [6, 2] }, { type: 'flowers', at: [4, 2] },
      { type: 'fence', at: [1, 7] }, { type: 'fence', at: [2, 7] }, { type: 'fence', at: [8, 7] }, { type: 'fence', at: [9, 7] },
      { type: 'statue', at: [0, 8], y: 0, scale: 0.9 },
    ],
    deploy: [[2, 9], [4, 9], [5, 9], [2, 11], [4, 11], [5, 11]],
  },
  {
    id: 'scene_throne_room', name: 'The Throne Room', theme: 'castle', time: 'interior', backdrop: 'castle',
    desc: 'A high hall of state: a dais with two thrones, a carpet the colour of old wine, and banners enough to hide the bloodstains of every reign that came before.',
    rows: [
      '9b 9b 9b 9b 9b 9b 9b 9b 9b 9b',
      '9b 4s 4s 4c 4c 4c 4c 4s 4s 7b',
      '9b 4s 4s 4c 4c 4c 4c 4s 4s 7b',
      '9b 3s 3s 3s 3c 3c 3s 3s 3s 7b',
      '9b 2s 2x 2s 2c 2c 2s 2x 2s 3b',
      '9b 2s 2s 2s 2c 2c 2s 2s 2s 3b',
      '9b 2sL 2x 2s 2c 2c 2s 2x 2sL 3b',
      '9b 2s 2s 2s 2c 2c 2s 2s 2s 3b',
      '9b 2s 2x 2s 2c 2c 2s 2x 2s 3b',
      '9b 2s 2s 2s 2c 2c 2s 2s 2s 3b',
      '9b 2s 2s 2s 2c 2c 2s 2s 2s 3b',
      '9b 2s 2s 2s 2c 2c 2s 2s 2s 3b',
    ],
    decor: [
      { type: 'throne', at: [4, 1] }, { type: 'throne', at: [5, 1] },
      { type: 'stainedGlass', at: [2, 1], scale: 1.4 }, { type: 'stainedGlass', at: [7, 1], scale: 1.4 },
      { type: 'banner', at: [1, 1], color: '#e8e4dc' }, { type: 'banner', at: [8, 1], color: '#1a1a1e' },
      { type: 'banner', at: [3, 1], color: '#3b5fa8' }, { type: 'banner', at: [6, 1], color: '#3b5fa8' },
      { type: 'pillar', at: [2, 4], scale: 1.6 }, { type: 'pillar', at: [7, 4], scale: 1.6 },
      { type: 'pillar', at: [2, 6], scale: 1.6 }, { type: 'pillar', at: [7, 6], scale: 1.6 },
      { type: 'pillar', at: [2, 8], scale: 1.6 }, { type: 'pillar', at: [7, 8], scale: 1.6 },
      { type: 'chandelier', at: [4, 6] }, { type: 'chandelier', at: [5, 9] },
      { type: 'brazier', at: [3, 3] }, { type: 'brazier', at: [6, 3] },
    ],
    deploy: [[4, 10], [5, 10], [3, 11], [4, 11], [5, 11], [6, 11]],
  },
];
