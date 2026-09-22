// Flat 14x14 showcase field used by the dev preview's model gallery
// (dev.html?gallery=monsters). Not referenced by any battle.
import type { MapDef } from '../types';

const W = 14;
const row = () => Array.from({ length: W }, () => '1g').join(' ');

export const maps: MapDef[] = [
  {
    id: 'gallery', name: 'Gallery Field', theme: 'plains', time: 'day', backdrop: 'mountains',
    desc: 'An empty, level meadow for inspecting models.',
    rows: Array.from({ length: W }, row),
    deploy: [[5, 12], [6, 12], [7, 12], [8, 12], [6, 13], [7, 13]],
  },
];
