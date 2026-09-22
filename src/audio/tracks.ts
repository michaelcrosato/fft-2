/**
 * The score of Final Fealty Tactics — original compositions written in the
 * notation described in notation.ts (read its header first).
 *
 * Every melody here is original. The style aims at late-90s pseudo-orchestral
 * tactics scores: modal minor keys, marching snares, horn calls, harp
 * arpeggios, choir pads, Neapolitan and Picardy colour.
 */
import type { TrackDef } from './notation';

export type { TrackDef } from './notation';

// ===========================================================================
//  Shared themes (the "Oath" theme returns in credits / ending / chapter)
// ===========================================================================

/** main theme, first phrase (D minor): Dm | Bb | F | C | Gm | Dm/F | Eb | A */
const OATH_1 = 'a4q d5h e5q | f5h. e5i d5i | c5h a4h | e4q. f4i g4h | bb4h. a4i g4i | a4q d5q f5q e5q | g5h. f5i eb5i | d5q c#5q e5h';
const OATH_1_CH = 'Dm | Bb | F | C | Gm | Dm/F | Eb | A';
const OATH_1_VC = 'd3h a3h | d3h f3h | a3h c4h | g3h e3h | d3h g3h | f3h a3h | bb3h g3h | a3h. c#4q';
/** main theme, second phrase: Dm | Bb | Gm | F | Bb | C | Gm A7 | D */
const OATH_2 = 'a4q d5h e5q | f5q g5q a5h | bb5h. a5i g5i | a5h f5h | f5q. g5i f5q d5q | e5h c5h | bb4q d5q c#5q e5q | d5w';
const OATH_2_CH = 'Dm | Bb | Gm | F | Bb | C | Gm A7 | D';
const OATH_2_HN = 'f4q a4h c5q | d5q e5q f5h | d5h. c5i bb4i | c5h a4h | d5q. eb5i d5q bb4q | c5h g4h | g4q bb4q a4q c#5q | a4w';
/** lyrical bridge: Bb | C | Am | Dm | Gm | C | F | Asus4 A */
const OATH_B = 'd4q. c4i bb3q c4q | e4h. g4q | a4q. g4i e4q c4q | d4h. a3q | bb3q. c4i d4q g4q | g4q. f4i e4q c4q | f4q. e4i f4q a4q | d4h c#4h';
const OATH_B_CH = 'Bb | C | Am | Dm | Gm | C | F | Asus4 A';
const OATH_B_VLN = 'f5w | g5w | e5h c5h | f5h a5h | d5h. bb4q | c5h e5h | @< a5h. f5q | e5w @mf';

// ===========================================================================
//  TITLE — "The Oath of Ivaldis" (D minor, majestic & melancholy)
// ===========================================================================
const title: TrackDef = {
  id: 'title',
  title: 'The Oath of Ivaldis',
  desc: 'Main theme: choir, strings and brass; Neapolitan colour, Picardy close.',
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
      ch: OATH_1_CH,
      v: {
        vln: '@mp ' + OATH_1.replace('| g5h.', '| @< g5h.') + ' @mf',
        vc: '@p ' + OATH_1_VC,
        str: { pad: 3, at: 'a3', hi: 'a4', vel: 0.8 },
        ch: { pad: 4, at: 'd4', hi: 'd5', vel: 0.55 },
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'd3', vel: 0.8 },
        cb: { pat: '0w', at: 'a1' },
        timp: '@p d2q rh. | rw | rw | rw | g2q rh. | rw | rw | a2h a2i a a a',
      },
    },
    A2: {
      ch: OATH_2_CH,
      v: {
        vln: '@f ' + OATH_2,
        tpt: { ref: 'vln', vel: 0.9 },
        hn: '@f ' + OATH_2_HN,
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
      ch: OATH_B_CH,
      v: {
        hn: '@mf ' + OATH_B,
        vln: '@p ' + OATH_B_VLN,
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
//  PROLOGUE — "The Chronicle They Burned" (A minor, 3/4, harp & strings)
// ===========================================================================
const prologue: TrackDef = {
  id: 'prologue',
  title: 'The Chronicle They Burned',
  desc: "The historian's narration: harp, solo cello, hushed strings.",
  bpm: 66,
  sig: '3/4',
  voices: {
    hp: { i: 'harp', pan: -0.3, vol: 1.2 },
    vc: { i: 'celli', pan: 0.25, vol: 0.9 },
    vln: { i: 'violin', pan: -0.2, vol: 0.85 },
    ob: { i: 'oboe', pan: 0.1, vol: 1.4 },
    str: { i: 'strings', pan: 0, vol: 0.3 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.5 },
    cho: { i: 'choirOo', pan: 0, vol: 0.3 },
  },
  sections: {
    I: {
      ch: 'Am | Am',
      v: { hp: { pat: '1 5 8 10 8 5', at: 'a2', vel: 0.75 } },
    },
    A: {
      ch: 'Am | F | C | G | F | Dm | Esus4 | E',
      v: {
        vc: '@mp e4h d4q | c4h a3q | g3q c4q e4q | d4h. | c4h f4q | a4q. g4i f4q | e4h a4q | g#4h.',
        hp: { pat: '1 5 8 10 8 5', at: 'a2', vel: 0.75 },
        str: { pad: 3, at: 'c4', hi: 'c5', vel: 0.55 },
        cb: { pat: '0h.', at: 'g1', vel: 0.6 },
      },
    },
    B: {
      ch: 'F | G | Em | Am | Dm | G | C | E7',
      v: {
        ob: '@mp c5h a4q | b4q. a4i g4q | e4h g4q | a4h. | f4q a4q d5q | d5q. c5i b4q | e5h c5q | b4h g#4q',
        vc: '@p f3h a3q | g3h b3q | e3h g3q | a3h. | d3h f3q | g3h f3q | e3h g3q | g#3h d4q',
        hp: { pat: '1 5 8 5 10 5', at: 'a2', vel: 0.7 },
        str: { pad: 3, at: 'e3', hi: 'e4', vel: 0.5 },
        cb: { pat: '0h.', at: 'g1', vel: 0.55 },
      },
    },
    A2: {
      base: 'A',
      v: {
        vln: { ref: 'A.vc', tr: 12 },
        vc: '@mp a3h. | a3h. | g3h. | g3h. | f3h. | f3h. | e3h. | e3h.',
        cho: { pad: 3, at: 'e4', hi: 'e5', vel: 0.6 },
        str: { pad: 3, at: 'a3', hi: 'a4', vel: 0.45 },
      },
    },
  },
  intro: ['I'],
  body: ['A', 'B', 'A2'],
};

// ===========================================================================
//  WORLD MAP — "Roads of Ivaldis" (F major march, woodwinds lead)
// ===========================================================================
const WM_A = '@mf c5q. a4i f4q a4q | g4q. e4i c4q e4q | f4q a4q d5q. c5i | bb4q d5q f5h | f5q. e5i d5q c5q | e5q. d5i c5q g4q | bb4q d5q c5q e5q | f5h rh';
const worldmap: TrackDef = {
  id: 'worldmap',
  title: 'Roads of Ivaldis',
  desc: 'Journeying march: flute & oboe over pizzicato and a light snare.',
  bpm: 100,
  voices: {
    fl: { i: 'flute', pan: -0.15, vol: 1.25 },
    ob: { i: 'oboe', pan: 0.12, vol: 1.1 },
    cl: { i: 'clarinet', pan: -0.25, vol: 0.75 },
    hn: { i: 'horn', pan: -0.3, vol: 0.5 },
    bsn: { i: 'bassoon', pan: 0.25, vol: 0.7 },
    pz: { i: 'pizz', pan: 0.2, vol: 0.55 },
    bpz: { i: 'bassPizz', pan: 0.3, vol: 0.8 },
    str: { i: 'strings', pan: 0, vol: 0.28 },
    hp: { i: 'harp', pan: -0.45, vol: 0.8 },
    sn: { i: 'snare', pan: 0.15, vol: 0.42 },
    timp: { i: 'timpani', pan: 0, vol: 0.55 },
    cym: { i: 'cymbal', pan: 0.2, vol: 0.45 },
  },
  sections: {
    I: {
      ch: 'F | C',
      v: {
        sn: { pat: 'X..ox.x.X..oxxx.', step: 's' },
        pz: { pat: '. c . c', step: 'q', at: 'a3' },
        bpz: { pat: "1q 5, 1 5,", at: 'e2' },
      },
    },
    A: {
      ch: 'F | C/E | Dm | Bb | F | C | Bb C | F',
      v: {
        fl: WM_A,
        pz: { pat: '. c . c', step: 'q', at: 'a3' },
        bpz: { pat: "0q 5, 1 5,", at: 'e2' },
        sn: { pat: '[X..ox.x.X..oxxx.]*7 X..ox.x.XRRRRRRR', step: 's' },
        str: { pad: 3, at: 'a3', hi: 'a4', vel: 0.6 },
        timp: '@mp f2q rh. | rw | d2q rh. | bb1q rh. | f2q rh. | c2q rh. | rw | f2q rh.',
      },
    },
    B: {
      ch: 'Dm | Am | Bb | F | Gm | Dm | Gm | C7',
      v: {
        ob: '@mf a4h f4q. e4i | e4h. a4q | bb4q. a4i g4q f4q | a4h. c5q | d5q. c5i bb4q g4q | a4q. g4i f4q d4q | g4q bb4q d5q g5q | e5h c5h',
        cl: '@mp d4w | c4h e4h | d4w | c4h f4h | bb3w | d4h f4h | d4h bb3h | c4h bb3h',
        hp: { pat: '1 5 8 5', at: 'd3', vel: 0.6 },
        pz: { pat: '. c . c', step: 'q', at: 'a3', vel: 0.8 },
        bpz: { pat: '0h 5,h', at: 'e2' },
        sn: { pat: 'x...o...x...o.o.', step: 's', vel: 0.8 },
        str: { pad: 3, at: 'f3', hi: 'f4', vel: 0.55 },
      },
    },
    A2: {
      base: 'A',
      v: {
        ob: { ref: 'fl', vel: 0.75 },
        cl: '@mf a4q. f4i c4q f4q | e4q. c4i g3q c4q | d4q f4q a4q. a4i | f4q bb4q d5h | a4q. c5i bb4q a4q | c5q. bb4i g4q e4q | f4q bb4q g4q c5q | a4h rh',
        hn: '@mf f3h. g3q | g3h. e3q | f3h a3h | bb3h d4h | c4w | c4h e4h | d4h e4h | f4h rh',
        cym: { pat: 'X.......', step: 'w' },
      },
    },
    C: {
      ch: 'Bb | F/A | Gm | Dm | Eb | Bb | Csus4 | C',
      v: {
        hn: '@f d4q. f4i bb4h | a4q. g4i f4h | g4q. a4i bb4q d5q | a4h. f4q | g4q. bb4i eb5h | d5q. c5i bb4h | c5q f4q g4q c5q | e4h g4h',
        fl: '@mp f5w | f5h c5h | d5w | f5w | g5w | f5w | f5h g5h | g5w',
        bsn: { pat: '1q 5 8 5', at: 'bb1', vel: 0.8 },
        pz: { pat: 'c . c .', step: 'q', at: 'a3' },
        bpz: { pat: '0h 5,h', at: 'e2' },
        timp: { pat: '1q r r 5,', step: 'q', at: 'c2', vel: 0.7 },
        sn: { pat: 'X.......x.......', step: 's', vel: 0.8 },
        str: { pad: 4, at: 'd4', hi: 'd5', vel: 0.7 },
      },
    },
  },
  intro: ['I'],
  body: ['A', 'B', 'A2', 'C'],
};

// ===========================================================================
//  TOWN — "Market Day" (G mixolydian bustle: lute, recorder, flute)
// ===========================================================================
const TOWN_A = '@mf d5i b4 g4 b4 d5q g5q | f5i e5 d5 c5 a4q f4q | e5i d5 c5 d5 e5q g5q | f#5q. e5i d5h | d5i b4 g4 b4 d5q g5q | a5i g5 f5 e5 f5q c5q | e5i g5 e5 c5 d5 f#5 a5 f#5 | g5h rh';
const town: TrackDef = {
  id: 'town',
  title: 'Market Day',
  desc: 'Bustling town: plucked lute, recorder and flute, tambourine & frame drum.',
  bpm: 116,
  voices: {
    rec: { i: 'recorder', pan: -0.1, vol: 1.2 },
    fl: { i: 'flute', pan: 0.15, vol: 0.85 },
    lute: { i: 'lute', pan: -0.3, vol: 0.9 },
    bsn: { i: 'bassoon', pan: 0.25, vol: 0.6 },
    bpz: { i: 'bassPizz', pan: 0.2, vol: 0.75 },
    str: { i: 'strings', pan: 0, vol: 0.22 },
    tamb: { i: 'tambourine', pan: 0.35, vol: 0.5 },
    fdr: { i: 'frameDrum', pan: -0.15, vol: 0.45 },
  },
  sections: {
    I: {
      ch: 'G | F',
      v: {
        lute: { pat: '1 5 8 5 10 5 8 5', at: 'g3' },
        fdr: { pat: 'X..x.x..', step: 'i' },
        bpz: { pat: "1q 5, 1 5,", at: 'e2' },
      },
    },
    A: {
      ch: 'G | F | C | D | G | F | C D | G',
      v: {
        rec: TOWN_A,
        lute: { pat: '1 5 8 5 10 5 8 5', at: 'g3', vel: 0.85 },
        bpz: { pat: "1q 5, 1 5,", at: 'e2' },
        tamb: { pat: 'x.X.x.Xx', step: 'i' },
        fdr: { pat: 'X..x.x..', step: 'i' },
        str: { pad: 3, at: 'g3', hi: 'g4', vel: 0.55 },
      },
    },
    B: {
      ch: 'Em | C | G | D | Em | C | Am | D',
      v: {
        fl: '@mf b4q. c5i b4q g4q | e5h. g4q | d5q. e5i d5q b4q | a4h. f#4q | g4q. a4i b4q e5q | g5q. f#5i e5q c5q | a4q. b4i c5q e5q | d5h f#5h',
        bsn: '@mp e3h g3h | c3h e3h | g3h b2h | d3h f#3h | e3h b2h | c3h g3h | a2h c3h | d3h a2h',
        lute: { pat: 'cq ci ci cq cq', at: 'e3', vel: 0.7 },
        bpz: { pat: '1h 5,h', at: 'e2' },
        tamb: { pat: 'x...x.x.', step: 'i', vel: 0.8 },
        fdr: { pat: 'X...x...', step: 'i' },
        str: { pad: 3, at: 'e3', hi: 'e4', vel: 0.5 },
      },
    },
    A2: {
      base: 'A',
      v: {
        fl: '@mp b4h d5h | a4h c5h | c5h e5h | d5h a4h | b4h d5h | c5h a4h | c5h d5h | b4h rh',
      },
    },
    C: {
      ch: 'C | G/B | Am | Em | F | C | Dsus4 | D',
      v: {
        lute: '@mf e4i g4 c5 g4 e5q c5q | d5i b4 g4 b4 d5q g4q | c5i a4 e4 a4 c5q e5q | b4i g4 e4 g4 b4h | a4i c5 f5 c5 a4q f4q | g4i c5 e5 c5 g4q e4q | d4i g4 a4 g4 d5q a4q | f#4i a4 d5 a4 f#5h',
        rec: '@mp g5w | g5w | e5w | e5w | f5w | e5w | d5w | d5h f#5h',
        bpz: { pat: '0h 5,h', at: 'e2' },
        tamb: { pat: 'x.x.X.x.', step: 'i', vel: 0.8 },
        fdr: { pat: 'X..x.x..', step: 'i' },
        str: { pad: 3, at: 'g3', hi: 'g4', vel: 0.5 },
      },
    },
  },
  intro: ['I'],
  body: ['A', 'B', 'A2', 'C'],
};

// ===========================================================================
//  TAVERN — "The Leaping Kwehbo" (D mixolydian jig, 6/8)
// ===========================================================================
const JIG_A = '@mf a4i f#4 a4 d5 a4 f#4 | g4i e4 g4 c5 g4 e4 | f#4i a4 d5 f#5 e5 d5 | e5i b4 g4 a4q. | a4i f#4 a4 d5 a4 f#4 | g4i e4 g4 c5 d5 e5 | d5i b4 g4 b4 a4 g4 | e4i c#4 e4 d4q.';
const JIG_A_CH = 'D | C | D | Em A | D | C | G | A7 D';
const JIG_B = '@f d5i e5 f#5 a5q f#5i | g5i f#5 e5 d5 b4 g4 | a4i d5 f#5 a5 f#5 d5 | e5i a5 e5 c#5 b4 a4 | d5i e5 f#5 a5q f#5i | g5i e5 c5 e5 g5 e5 | d5i b4 d5 g5 f#5 e5 | c#5i e5 a4 d5q.';
const JIG_B_CH = 'D | G | D | A | D | C | G | A7 D';
const tavern: TrackDef = {
  id: 'tavern',
  title: 'The Leaping Kwehbo',
  desc: 'Lively jig: fiddle, recorder, lute, bodhran.',
  bpm: 168,
  sig: '6/8',
  voices: {
    fid: { i: 'fiddle', pan: -0.12, vol: 1 },
    rec: { i: 'recorder', pan: 0.18, vol: 0.75 },
    lute: { i: 'lute', pan: -0.35, vol: 0.6 },
    bpz: { i: 'bassPizz', pan: 0.25, vol: 0.8 },
    fdr: { i: 'frameDrum', pan: 0.05, vol: 0.55 },
    tamb: { i: 'tambourine', pan: 0.4, vol: 0.7 },
  },
  sections: {
    I: {
      ch: 'D | D',
      v: {
        lute: { pat: 'cq ci cq ci', at: 'd3' },
        fdr: { pat: 'X.ox.o', step: 'i' },
      },
    },
    A: {
      ch: JIG_A_CH,
      v: {
        fid: JIG_A,
        lute: { pat: 'cq ci cq ci', at: 'd3', vel: 0.8 },
        bpz: { pat: '1q. 5,q.', at: 'c2' },
        fdr: { pat: 'X.ox.o', step: 'i' },
      },
    },
    A1: {
      base: 'A',
      v: { tamb: { pat: '..x..x', step: 'i' } },
    },
    B: {
      ch: JIG_B_CH,
      v: {
        fid: JIG_B,
        lute: { pat: 'cq ci cq ci', at: 'd3', vel: 0.85 },
        bpz: { pat: '1q. 5,q.', at: 'c2' },
        fdr: { pat: 'X.oxoo', step: 'i' },
        tamb: { pat: '..x..x', step: 'i' },
      },
    },
    B1: {
      base: 'B',
      v: { rec: { ref: 'fid', vel: 0.85 } },
    },
    A2: {
      base: 'A1',
      v: { rec: { ref: 'fid', tr: 12, vel: 0.8 } },
    },
    B2: {
      base: 'B',
      v: {
        rec: { ref: 'fid', vel: 0.9 },
        lute: { pat: '1 5 8 1 5 8', at: 'd3', vel: 0.8 },
      },
    },
  },
  intro: ['I'],
  body: ['A', 'A1', 'B', 'B1', 'A2', 'B2'],
};

// ===========================================================================
//  Registry
// ===========================================================================

export const TRACKS: Record<string, TrackDef> = {
  title,
  prologue,
  worldmap,
  town,
  tavern,
};

export const TRACK_IDS = Object.keys(TRACKS);
