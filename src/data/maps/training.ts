import type { MapDef } from '../types';

export const maps: MapDef[] = [
  {
    id: 'training', name: 'Training Grounds', theme: 'plains', time: 'day', backdrop: 'mountains',
    desc: 'A trampled meadow behind the academy where cadets drill.',
    rows: [
      '2g 2g 2g 2gT 2g 2g 2g 3g 3g 3g',
      '2g 2g 2g 2g 2g 2g 2g 3g 4g 3g',
      '1g 1g 2g 2g 2d 2d 2g 3g 3g 3g',
      '1w 1g 1g 2d 2d 2d 2d 2g 2g 2g',
      '0W 1w 1g 1g 2d 2d 2d 2d 2g 2gB',
      '0W 1w 1g 1g 1g 2d 2g 2g 2g 2g',
      '1w 1g 1g 1g 1g 1d 1g 1g 2g 2g',
      '1g 1g 1gT 1g 1g 1d 1g 1g 1g 2g',
      '1g 1g 1g 1g 1d 1d 1g 1g 1g 1g',
      '2g 1g 1g 1g 1d 1g 1g 1gR 1g 1g',
    ],
    deploy: [[3, 8], [4, 8], [5, 8], [3, 9], [4, 9], [5, 9]],
  },
];
