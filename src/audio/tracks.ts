/**
 * The score of Final Fealty Tactics — original compositions written in the
 * notation described in notation.ts. All melodies are original.
 */
import type { TrackDef } from './notation';

export type { TrackDef } from './notation';

// ===========================================================================
//  TITLE — "The Oath of Ivaldis" (D minor, majestic & melancholy)
// ===========================================================================
const title: TrackDef = {
  id: 'title',
  title: 'The Oath of Ivaldis',
  bpm: 76,
  voices: {
    vln: { i: 'violin', pan: -0.32, vol: 1 },
    fl: { i: 'flute', pan: -0.1, vol: 0.55 },
    hn: { i: 'horn', pan: -0.18, vol: 0.85 },
    tpt: { i: 'trumpet', pan: 0.2, vol: 0.6 },
    tbn: { i: 'trombone', pan: 0.3, vol: 0.45 },
    str: { i: 'strings', pan: 0.05, vol: 0.45 },
    vc: { i: 'celli', pan: 0.3, vol: 0.7 },
    cb: { i: 'contrabass', pan: 0.38, vol: 0.7 },
    ch: { i: 'choir', pan: 0, vol: 0.4 },
    hp: { i: 'harp', pan: -0.45, vol: 1.1 },
    timp: { i: 'timpani', pan: 0.05, vol: 0.75 },
    sn: { i: 'snare', pan: 0.15, vol: 0.5 },
    cym: { i: 'cymbal', pan: 0.2, vol: 0.6 },
    bd: { i: 'bassDrum', pan: 0, vol: 0.6 },
  },
  sections: {
    I: {
      ch: 'Dm | Dm | Bb C | A',
      v: {
        timp: '@p d2w~< | ~w | rw | @mf a2i a a a @< a a a a @ff',
        cym: { pat: '....|....|....|RRRR', step: 'q' },
        ch: { pad: 4, at: 'd4', hi: 'd5', vel: 0.8 },
        str: { pad: 3, at: 'a3', hi: 'a4' },
        cb: '@mp d2w | ~w | bb1h c2h | a1w',
        tpt: 'rw | rw | @f d5i. d5s f5q e5i. e5s g5q | a5q. g5i f5q e5q',
        hn: { ref: 'tpt', tr: -12 },
        tbn: { pad: 3, at: 'd3', hi: 'd4', pat: 'rw | rw | ch ch | cq. ci ch' },
        sn: { pat: '................|................|................|RRRRRRRRRRRRRRRR', step: 's' },
      },
    },
    A: {
      ch: 'Dm | Bb | F | C | Gm | Dm/F | Eb | A',
      v: {
        vln: '@mp a4q d5h e5q | f5h. e5i d5i | c5h a4h | e4q. f4i g4h | bb4h. a4i g4i | a4q d5q f5q e5q | @< g5h. f5i eb5i | d5q c#5q e5h @mf',
        vc: '@p f3h e3h | d3h f3h | a3h c4h | g3h e3h | d3h g3h | f3h a3h | bb3h g3h | a3h. c#4q',
        str: { pad: 3, at: 'a3', hi: 'a4', vel: 0.8 },
        ch: { pad: 4, at: 'd4', hi: 'd5', vel: 0.55 },
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'd3', vel: 0.8 },
        cb: { pat: '0w', at: 'a1' },
        timp: '@p d2q rh. | rw | rw | rw | g2q rh. | rw | rw | a2h a2i a a a',
      },
    },
    A2: {
      ch: 'Dm | Bbmaj7 | Gm | F | Bb | C | Gm A7 | D',
      v: {
        vln: '@f a4q d5h e5q | f5q g5q a5h | bb5h. a5i g5i | a5h f5h | f5q. g5i f5q d5q | e5h c5h | bb4q d5q c#5q e5q | d5w',
        tpt: { ref: 'vln', vel: 0.9 },
        hn: '@f f4q a4h c5q | d5q e5q f5h | d5h. c5i bb4i | c5h a4h | d5q. eb5i d5q bb4q | c5h g4h | g4q bb4q a4q c#5q | a4w',
        tbn: { pad: 3, at: 'd3', hi: 'e4' },
        str: { pad: 4, at: 'd4', hi: 'd5', pat: 'cq ci ci cq cq' },
        vc: { pat: '1q 5 8 5', at: 'd3' },
        cb: { pat: '0h 0h', at: 'a1' },
        ch: { pad: 4, at: 'f4', hi: 'f5', vel: 0.9 },
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'd3', vel: 0.7 },
        timp: '@f d2q r d2i d a2q | bb2q r bb2i bb f2q | g2q r g2i g d2q | f2q r f2i f c2q | bb2q r bb2i bb f2q | c2q r c2i c g2q | g2h a2i a a a | d2w~>',
        sn: { pat: '[X...x.x.X...x.xx]*6 X...x.x.RRRRRRRR X...............', step: 's' },
        cym: { pat: 'X.......', step: 'w' },
        bd: { pat: 'X...X...', step: 'w' },
      },
    },
    B: {
      ch: 'Bb | C | Am | Dm | Gm | C | F | Asus4 A',
      v: {
        hn: '@mf d4q. c4i bb3q c4q | e4h. g4q | a4q. g4i e4q c4q | d4h. a3q | bb3q. c4i d4q g4q | g4q. f4i e4q c4q | f4q. e4i f4q a4q | d4h c#4h',
        vln: '@p f5w | g5w | e5h c5h | f5h a5h | d5h. bb4q | c5h e5h | @< a5h. f5q | e5w @mf',
        fl: { ref: 'hn', tr: 12, vel: 0.7 },
        str: { pad: 3, at: 'f3', hi: 'f4', vel: 0.8 },
        ch: { pad: 3, at: 'a3', hi: 'a4', vel: 0.5 },
        hp: { pat: '1 5 8 5 10 5 8 5', at: 'bb2', vel: 0.8 },
        vc: { pat: '1h 5h', at: 'd3', vel: 0.6 },
        cb: { pat: '0w', at: 'a1', vel: 0.7 },
        timp: '@p rw | rw | rw | d2h rh | rw | rw | rw | a2w~<',
      },
    },
    A3: {
      base: 'A2',
      v: {
        ch: { pad: 4, at: 'a4', hi: 'a5', vel: 1 },
        fl: { ref: 'vln', tr: 12, vel: 0.6 },
      },
    },
  },
  intro: ['I'],
  body: ['A', 'A2', 'B', 'A3'],
};

// ===========================================================================
//  Registry
// ===========================================================================

export const TRACKS: Record<string, TrackDef> = {
  title,
};

export const TRACK_IDS = Object.keys(TRACKS);
