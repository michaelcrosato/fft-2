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
        ch: { pad: 4, at: 'c4', hi: 'e5', vel: 0.9 },
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
        ch: { pad: 4, at: 'e4', hi: 'a5', vel: 1 },
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
  gain: 1.5,
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
  gain: 1.45,
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
  gain: 1.46,
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
  gain: 1.2,
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
//  BATTLE 1 — "Steel and Banners" (C minor, snare-led 4/4)
// ===========================================================================
const battle1: TrackDef = {
  id: 'battle1',
  title: 'Steel and Banners',
  desc: 'Driving battle theme: spiccato ostinato, horn call, marching snare.',
  bpm: 144,
  voices: {
    hn: { i: 'horn', pan: -0.2, vol: 1 },
    tpt: { i: 'trumpet', pan: 0.22, vol: 0.75 },
    vln: { i: 'violin', pan: -0.35, vol: 0.95 },
    tbn: { i: 'trombone', pan: 0.3, vol: 0.5 },
    spi: { i: 'spicc', pan: -0.28, vol: 0.6 },
    vc: { i: 'celli', pan: 0.28, vol: 0.55 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.7 },
    str: { i: 'strings', pan: 0, vol: 0.55 },
    timp: { i: 'timpani', pan: 0, vol: 0.7 },
    sn: { i: 'snare', pan: 0.12, vol: 0.5 },
    bd: { i: 'bassDrum', pan: 0, vol: 0.5 },
    cym: { i: 'cymbal', pan: 0.2, vol: 0.5 },
  },
  sections: {
    I: {
      ch: 'Cm | Cm | Cm | G',
      v: {
        sn: { pat: 'X.xxX.x.X.xxX.xx X.xxX.x.X.xxX.xx X.xxX.x.X.xxXxxx X.x.X.x.RRRRRRRR', step: 's' },
        timp: { pat: '1q r 1i 1i 5,q', at: 'e2' },
        vc: 'rw | rw | [c3i]*8 | [g2i]*8',
        spi: 'rw | rw | @mf c4s g4 c5 g4 eb5 g4 c5 g4 c4 g4 c5 g4 eb5 g4 c5 g4 | b3s g4 d5 g4 b4 g4 d5 g4 b3 g4 d5 g4 b4 g4 d5 g4',
        bd: { pat: 'X.x.', step: 'q' },
      },
    },
    A: {
      ch: 'Cm | Ab | Bb | Cm | Cm | Ab | Fm | G',
      v: {
        hn: '@f g4q. c5i c5q d5q | eb5h. c5q | d5q. bb4i f4q bb4q | c5w | g4q. c5i c5q eb5q | f5q. eb5i c5q ab4q | ab4q. c5i f5q. eb5i | d5h b4h',
        spi: { pat: '1s 5 8 5 10 5 8 5 1 5 8 5 10 5 8 5', at: 'c4', vel: 0.7 },
        vc: { pat: '1i 1 5 1 8 1 5 1', at: 'c3' },
        cb: { pat: '1i 1 1 1 1 1 1 1', at: 'g1', vel: 0.7 },
        tbn: { pad: 3, at: 'c3', hi: 'c4', pat: 'cq.* cq.* cq*' },
        str: { pad: 3, at: 'g4', hi: 'g5', vel: 0.5 },
        timp: { pat: '1q r 1i 1i 5,q', at: 'e2' },
        sn: { pat: '[X.xxX.x.X.xxX.xx]*7 X.xxX.x.RRRRRRRR', step: 's' },
        bd: { pat: 'X.x.', step: 'q' },
        cym: { pat: 'X.......', step: 'w' },
      },
    },
    B: {
      base: 'A',
      ch: 'Ab | Eb | Fm | Cm | Ab | Bb | G | G7',
      v: {
        vln: '@f c5h eb5q c5q | bb4h. g4q | ab4q c5q f5q ab5q | g5h. eb5q | eb5q. f5i eb5q c5q | d5q. eb5i f5q bb5q | b5h g5h | f5q d5q b4q g4q',
        hn: '@mf ab4w | g4w | f4w | g4w | ab4w | f4w | g4w | b4w',
        tpt: { pad: 2, at: 'g4', hi: 'g5', pat: 'ri ci* ri ci* ri ci* ri ci*', vel: 0.8 },
      },
    },
    C: {
      ch: 'Cm | Db | Cm | Db | Ab | Bb | Cm | G',
      v: {
        tpt: '@f g4i g4 c5q c5q eb5q | f5h. db5q | eb5q. d5i c5q g4q | ab4h f4h | c5q. bb4i ab4q c5q | d5q. c5i bb4q d5q | eb5q g5q eb5q c5q | d5h b4h',
        hn: { ref: 'tpt', tr: -12, vel: 0.8 },
        vc: { pat: '1i 1 5 1 8 1 5 1', at: 'c3', vel: 0.8 },
        cb: { pat: '1q r 1 r', at: 'g1' },
        timp: { pat: '1i 1 1 1 5,q 1q', at: 'e2', vel: 0.9 },
        sn: { pat: 'X...........X...X...........RRRR', step: 's' },
        spi: { pat: '1h~ 5h~', at: 'c4', vel: 0.55 },
        bd: { pat: 'X...', step: 'q' },
        str: { pad: 4, at: 'c4', hi: 'c5', vel: 0.6 },
      },
    },
    A2: {
      base: 'A',
      v: {
        tpt: { ref: 'hn', vel: 0.85 },
        vln: '@mf eb5w | c5w | d5w | eb5w | g5w | ab5w | f5w | g5h f5h',
      },
    },
  },
  intro: ['I'],
  body: ['A', 'B', 'C', 'A2'],
};

// ===========================================================================
//  BATTLE 2 — "Dark Crusade" (F minor, galloping 6/8)
// ===========================================================================
const BT2_A = '@f f4q. ab4i g4 f4 | ab4q. db5q c5i | bb4q. f4q. | e4q. g4i c5 bb4 | ab4q. c5i bb4 ab4 | f5q. eb5i db5 c5 | db5q bb4i c5q. | f4q. rq.';
const battle2: TrackDef = {
  id: 'battle2',
  title: 'Dark Crusade',
  desc: 'Second battle theme: galloping 6/8, low choir, darker minor.',
  bpm: 144,
  gain: 0.95,
  sig: '6/8',
  voices: {
    hn: { i: 'horn', pan: -0.2, vol: 1 },
    vln: { i: 'violin', pan: -0.35, vol: 0.85 },
    tpt: { i: 'trumpet', pan: 0.22, vol: 0.7 },
    tbn: { i: 'trombone', pan: 0.3, vol: 0.6 },
    vc: { i: 'celli', pan: 0.25, vol: 0.6 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.55 },
    spi: { i: 'spicc', pan: -0.3, vol: 0.65 },
    str: { i: 'strings', pan: 0, vol: 0.55 },
    chL: { i: 'choirLow', pan: 0, vol: 0.55 },
    timp: { i: 'timpani', pan: 0, vol: 0.7 },
    sn: { i: 'snare', pan: 0.12, vol: 0.45 },
    bd: { i: 'bassDrum', pan: 0, vol: 0.5 },
    cym: { i: 'cymbal', pan: 0.2, vol: 0.5 },
  },
  sections: {
    I: {
      ch: 'Fm | Fm | Fm | C',
      v: {
        vc: { pat: '1q 1i 5,q 1i', at: 'f2' },
        timp: { pat: '1q. 1i 1i 1i', at: 'e2' },
        sn: { pat: '[X.x.xxX.x.xx]*3 X.x.xxRRRRRR', step: 's' },
        bd: { pat: 'X..X..', step: 'i' },
        chL: { pad: 3, at: 'f3', hi: 'f4', vel: 0.6 },
      },
    },
    A: {
      ch: 'Fm | Db | Bbm | C | Fm | Db | Bbm C | Fm',
      v: {
        hn: BT2_A,
        vc: { pat: '1q 1i 5,q 1i', at: 'f2' },
        cb: { pat: '1q. 1q.', at: 'c2' },
        spi: { pat: '1i 5 8 5 10 8', at: 'f3', vel: 0.6 },
        tbn: { pad: 3, at: 'c3', hi: 'c4', pat: 'cq.* ci* ci* ci*', vel: 0.7 },
        timp: { pat: '1q. 5,q.', at: 'e2' },
        sn: { pat: 'X.x.xxX.x.xx', step: 's' },
        bd: { pat: 'X..X..', step: 'i' },
        chL: { pad: 3, at: 'f3', hi: 'f4', vel: 0.55 },
        cym: { pat: 'X.......', step: 'h.' },
      },
    },
    A1: {
      base: 'A',
      v: {
        vln: { ref: 'hn', tr: 12, vel: 0.85 },
        str: { pad: 3, at: 'ab4', hi: 'ab5', vel: 0.5 },
      },
    },
    B: {
      base: 'A',
      ch: 'Ab | Eb | Fm | Db | Bbm | Fm | Gb | C',
      v: {
        vln: '@f c5q. eb5i c5 ab4 | bb4q. g4q. | ab4i c5 f5 ab5q. | f5q. db5q. | db5q. f5i eb5 db5 | c5q. ab4q. | bb4q. db5i bb4 gb4 | e4q. g4i c5 e5',
        hn: '@mf ab4q. eb4q. | g4q. bb4q. | ab4q. c5q. | ab4q. f4q. | f4q. bb4q. | ab4q. f4q. | gb4q. db5q. | e4q. g4q.',
        tpt: { pad: 2, at: 'c5', hi: 'c6', pat: 'ri ci* ri ri ci* ri', vel: 0.75 },
      },
    },
    C: {
      ch: 'Fm | Fm | Eb | Eb | Db | Db | C | C',
      v: {
        tbn: '@f f3q. c3i f3 ab3 | c4q. ab3q. | g3q. eb3i g3 bb3 | eb4q. bb3q. | ab3q. f3i ab3 db4 | f4q. db4q. | c3i e3 g3 c4q. | e4q. c4q.',
        cb: { ref: 'tbn', tr: -12, vel: 0.9 },
        hn: { pad: 3, at: 'f4', hi: 'f5', pat: 'cq.* rq.' },
        vc: { pat: '1i 1 1 1 1 1', at: 'f2' },
        timp: { pat: '1q. 1i 1 1', at: 'e2' },
        chL: { pad: 3, at: 'c3', hi: 'c4', vel: 0.8 },
        sn: { pat: 'X.....X.x.x.', step: 's' },
        bd: { pat: 'X..X..', step: 'i' },
        cym: { pat: 'X...X...', step: 'h.' },
      },
    },
    A2: {
      base: 'A',
      v: {
        tpt: { ref: 'hn', vel: 0.8 },
        vln: { ref: 'hn', tr: 12, vel: 0.9 },
        str: { pad: 4, at: 'c4', hi: 'c5', vel: 0.6 },
      },
    },
  },
  intro: ['I'],
  body: ['A', 'A1', 'B', 'C', 'A2'],
};

// ===========================================================================
//  BATTLE 3 — "The Last Stand" (D minor, urgent brass)
// ===========================================================================
const battle3: TrackDef = {
  id: 'battle3',
  title: 'The Last Stand',
  desc: 'Late-game battle: urgent trumpets, choir chant, relentless strings.',
  bpm: 156,
  voices: {
    tpt: { i: 'trumpet', pan: 0.2, vol: 1 },
    hn: { i: 'horn', pan: -0.2, vol: 0.65 },
    tbn: { i: 'trombone', pan: 0.3, vol: 0.5 },
    tuba: { i: 'tuba', pan: 0.2, vol: 0.85 },
    vln: { i: 'violin', pan: -0.38, vol: 0.6 },
    spi: { i: 'spicc', pan: -0.28, vol: 0.6 },
    vc: { i: 'celli', pan: 0.28, vol: 0.55 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.62 },
    str: { i: 'strings', pan: 0, vol: 0.55 },
    ch: { i: 'choir', pan: 0, vol: 0.75 },
    timp: { i: 'timpani', pan: 0, vol: 0.7 },
    sn: { i: 'snare', pan: 0.12, vol: 0.5 },
    bd: { i: 'bassDrum', pan: 0, vol: 0.5 },
    cym: { i: 'cymbal', pan: 0.2, vol: 0.5 },
  },
  sections: {
    I: {
      ch: 'Dm | Dm | Bb | A',
      v: {
        spi: { pat: '1s 1 8 1 5 1 8 1 1 1 8 1 5 1 8 1', at: 'd4', vel: 0.65 },
        vc: { pat: '1i 1 1 1 1 1 1 1', at: 'd3' },
        cb: { pat: '1i 1 1 1 1 1 1 1', at: 'a1', vel: 0.7 },
        timp: '@mf rw | rw | bb2i bb bb bb bb bb bb bb | a2i a a a @< a a a a @ff',
        sn: { pat: 'X.xxX.xxX.xxX.xx X.xxX.xxX.xxX.xx X.xxX.xxX.xxXxxx RRRRRRRRRRRRRRRR', step: 's' },
        tbn: { pad: 3, at: 'd3', hi: 'd4', pat: 'rw | rw | ch ch | cw' },
      },
    },
    A: {
      ch: 'Dm | Bb | Gm | A | Dm | F | Gm | A7',
      v: {
        tpt: '@f d5i. d5s d5i a4i d5q f5q | f5q. e5i d5q bb4q | g5q. f5i d5q bb4q | a4h. c#5q | d5i. d5s d5i a4i d5q a5q | a5q. g5i f5q c5q | bb5q. a5i g5q d5q | e5h c#5h',
        hn: '@f a4i. a4s a4i f4i a4q d5q | d5q. c5i bb4q f4q | d5q. c5i bb4q g4q | e4h. a4q | a4i. a4s a4i f4i a4q f5q | f5q. e5i c5q a4q | d5q. c5i bb4q g4q | c#5h a4h',
        spi: { pat: '1s 5 8 5 10 5 8 5 1 5 8 5 10 5 8 5', at: 'd4', vel: 0.65 },
        vc: { pat: '1i 1 5 1 8 1 5 1', at: 'd3' },
        cb: { pat: '1i 1 1 1 1 1 1 1', at: 'a1', vel: 0.7 },
        tbn: { pad: 3, at: 'd3', hi: 'e4', pat: 'cq.* cq.* cq*' },
        tuba: { pat: '1q. 1q. 5,q', at: 'd2', vel: 0.8 },
        timp: { pat: '1i 1 r 1 5,q 1q', at: 'd2' },
        sn: { pat: '[X.xxX.x.X.xxX.xx]*7 X.xxX.xxRRRRRRRR', step: 's' },
        bd: { pat: 'X.x.', step: 'q' },
        cym: { pat: 'X...X...', step: 'w' },
      },
    },
    B: {
      base: 'A',
      ch: 'Bb | C | Am | Dm | Gm | C | F | A',
      v: {
        hn: '@f f4h bb4h | c5h g4h | a4h. c5q | d5w | bb4h d5h | g4h c5h | c5h a4h | c#5w',
        tpt: { pad: 2, at: 'f4', hi: 'f5', pat: 'cq.* cq.* cq*', vel: 0.8 },
        vln: { pat: '1 3 5 3 1 3 5 3', at: 'd5', vel: 0.55 },
        str: { pad: 4, at: 'd4', hi: 'd5', vel: 0.6 },
      },
    },
    C: {
      ch: 'Dm | Dm | Eb | Eb | Dm | Dm | Eb | A',
      v: {
        ch: '@f d4h. f4q | a4w | g4h bb4h | g4h. eb4q | f4h d4h | a4h. f4q | bb4h g4h | a4h c#5h',
        tbn: { pad: 3, at: 'd3', hi: 'd4', vel: 0.8 },
        tuba: { pat: '1w', at: 'd2' },
        spi: { pad: 3, at: 'a4', hi: 'a5', pat: 'cw~', vel: 0.5 },
        vc: { pat: '1i 1 1 1 1 1 1 1', at: 'd3', vel: 0.7 },
        cb: { pat: '1w', at: 'a1' },
        timp: { pat: '1q. 1i 1q 1q', at: 'd2' },
        sn: { pat: 'X...............X.......RRRRRRRR', step: 's' },
        bd: { pat: 'X...', step: 'q' },
        cym: { pat: 'X...X...', step: 'w', vel: 0.8 },
      },
    },
    A2: {
      base: 'A',
      v: {
        vln: { ref: 'tpt', vel: 0.8 },
        ch: { pad: 4, at: 'd4', hi: 'd5', vel: 0.7 },
      },
    },
  },
  intro: ['I'],
  body: ['A', 'B', 'C', 'A2'],
};

// ===========================================================================
//  BOSS — "Wrath of the Anointed" (G minor / Phrygian, menacing)
// ===========================================================================
const OST: Record<string, string> = {
  Gm: 'g2i g2 d3 g2 ab2 g2 f2 g2',
  Eb: 'eb2i eb2 bb2 eb2 f2 eb2 d2 eb2',
  Ab: 'ab2i ab2 eb3 ab2 bb2 ab2 g2 ab2',
  D: 'd2i d2 a2 d2 f#2 d2 a2 d2',
  Cm: 'c2i c2 g2 c2 db2 c2 bb1 c2',
  Bb: 'bb1i bb1 f2 bb1 c2 bb1 a1 bb1',
};
const ost = (chords: string) =>
  chords
    .split('|')
    .map((c) => OST[c.trim()])
    .join(' | ');
const boss: TrackDef = {
  id: 'boss',
  title: 'Wrath of the Anointed',
  desc: 'Boss battle: Phrygian low-string ostinato, choir stabs, low brass.',
  bpm: 132,
  gain: 1.1,
  voices: {
    tbn: { i: 'trombone', pan: 0.25, vol: 0.8 },
    hn: { i: 'horn', pan: -0.2, vol: 0.75 },
    tpt: { i: 'trumpet', pan: 0.2, vol: 0.85 },
    tuba: { i: 'tuba', pan: 0.15, vol: 0.8 },
    vc: { i: 'celli', pan: 0.3, vol: 0.65 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.6 },
    spi: { i: 'spicc', pan: -0.3, vol: 0.6 },
    str: { i: 'strings', pan: 0, vol: 0.55 },
    ch: { i: 'choir', pan: 0, vol: 0.5 },
    chL: { i: 'choirLow', pan: 0, vol: 0.4 },
    timp: { i: 'timpani', pan: 0, vol: 0.75 },
    sn: { i: 'snare', pan: 0.12, vol: 0.45 },
    bd: { i: 'bassDrum', pan: 0, vol: 0.55 },
    cym: { i: 'cymbal', pan: 0.2, vol: 0.5 },
  },
  sections: {
    I: {
      ch: 'Gm | Gm | Gm | D',
      v: {
        vc: ost('Gm | Gm | Gm | D'),
        cb: { ref: 'vc', tr: -12, vel: 0.8 },
        timp: '@mf g2q rh. | g2q rh. | g2q r g2 g2 | @< d2i d d d d d d d @ff',
        ch: { pad: 4, at: 'g3', hi: 'g4', pat: 'cq rq rh | rw | cq rq rh | ch ch' },
        sn: { pat: '................ ................ ................ RRRRRRRRRRRRRRRR', step: 's' },
        bd: { pat: 'X...X...X...X.X.', step: 'q' },
      },
    },
    A: {
      ch: 'Gm | Gm | Eb | Eb | Gm | Gm | Ab | D',
      v: {
        tbn: '@f g3q. a3i bb3q. c4i | d4h. c4i bb3i | eb4q. d4i c4q bb3q | g3w | g3q. a3i bb3q. d4i | g4h. f4i d4i | eb4q. f4i eb4q c4q | d4h. a3q',
        hn: { ref: 'tbn', tr: 12, vel: 0.75 },
        vc: ost('Gm | Gm | Eb | Eb | Gm | Gm | Ab | D'),
        cb: { ref: 'vc', tr: -12, vel: 0.8 },
        tuba: { pat: '1h 1h', at: 'g1' },
        ch: { pad: 4, at: 'g3', hi: 'a4', pat: 'cq. ri rh', vel: 0.8 },
        timp: { pat: '1q r 1i 1 1q', at: 'd2' },
        sn: { pat: '[X..x..x.X..x..xx]*7 X..x..x.RRRRRRRR', step: 's' },
        bd: { pat: 'X..x..x.', step: 'i' },
        cym: { pat: 'X...X...', step: 'w' },
        str: { pad: 3, at: 'd4', hi: 'd5', vel: 0.45 },
      },
    },
    B: {
      base: 'A',
      ch: 'Cm | Cm | Gm | Gm | Ab | Bb | Cm | D',
      v: {
        tpt: '@f c5q. c5i eb5q. d5i | c5h g4h | bb4q. bb4i d5q. c5i | bb4h g4h | c5q. eb5i ab5q. g5i | f5h d5h | eb5q. d5i c5q g4q | f#4h a4h',
        hn: '@f eb4q. eb4i g4q. f4i | eb4h c4h | g4q. g4i bb4q. a4i | g4h d4h | ab4q. c5i eb5q. eb5i | d5h bb4h | c5q. bb4i g4q eb4q | d4h f#4h',
        tbn: { pad: 3, at: 'c3', hi: 'd4', pat: 'cq.* cq.* cq*' },
        vc: ost('Cm | Cm | Gm | Gm | Ab | Bb | Cm | D'),
      },
    },
    C: {
      ch: 'Gm | Ab | Gm | Ab | Eb | Ab | Gm | D',
      v: {
        ch: '@f d5w | eb5w | d5h bb4h | c5h eb5h | bb4w | c5w | bb4h d5h | d5h a4h',
        chL: { pad: 3, at: 'g2', hi: 'g3', vel: 0.8 },
        vc: '@mp ' + ost('Gm | Ab | Gm | Ab | Eb | Ab | Gm | D'),
        cb: { ref: 'vc', tr: -12, vel: 0.8 },
        tuba: { pat: '1w', at: 'g1' },
        timp: { pat: '1h 5,h', at: 'd2' },
        spi: { pad: 3, at: 'g4', hi: 'g5', pat: 'cw~', vel: 0.45 },
        bd: { pat: 'X.......', step: 'i' },
        cym: { pat: '......RR', step: 'w' },
      },
    },
    A2: {
      base: 'A',
      v: {
        tpt: { ref: 'tbn', tr: 12, vel: 0.9 },
        spi: { pad: 3, at: 'g4', hi: 'g5', pat: 'cw~', vel: 0.45 },
      },
    },
  },
  intro: ['I'],
  body: ['A', 'B', 'C', 'A2'],
};

// ===========================================================================
//  UMBRAL — "Umbral Lord" (C phrygian / locrian: organ, choir, low brass)
// ===========================================================================
const UMB_ORG = '<c3 g3 c4 eb4>w | <db3 ab3 db4 f4>w | <c3 g3 c4 eb4>w | <gb2 db3 gb3 bb3>w | <c3 g3 c4 eb4>w | <db3 ab3 db4 f4>w | <b2 f3 b3 d4>w | <c3 g3 c4 eb4>h <c3 gb3 c4 eb4>h';
const umbral: TrackDef = {
  id: 'umbral',
  title: 'Umbral Lord',
  desc: 'Demonic transformation: church organ, chanting choir, low brass, tritones.',
  bpm: 92,
  voices: {
    org: { i: 'organ', pan: -0.1, vol: 0.55 },
    ped: { i: 'organ', pan: 0.1, vol: 0.6 },
    ch: { i: 'choir', pan: 0, vol: 0.85 },
    chL: { i: 'choirLow', pan: 0, vol: 0.5 },
    cho: { i: 'choirOo', pan: 0, vol: 0.6 },
    tbn: { i: 'trombone', pan: 0.25, vol: 0.9 },
    tuba: { i: 'tuba', pan: 0.2, vol: 0.8 },
    hn: { i: 'horn', pan: -0.25, vol: 0.7 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.45 },
    spi: { i: 'spicc', pan: -0.35, vol: 0.3 },
    wind: { i: 'windPad', pan: 0, vol: 0.6 },
    timp: { i: 'timpani', pan: 0, vol: 0.8 },
    bd: { i: 'bassDrum', pan: 0, vol: 0.6 },
    cym: { i: 'cymbal', pan: 0.2, vol: 0.5 },
    bell: { i: 'bell', pan: -0.3, vol: 0.8 },
  },
  sections: {
    I: {
      bars: 4,
      v: {
        bell: '@f c4h rh | gb3h rh | c4h rh | gb3h rh',
        wind: '@mp c4w | ~w | db4w | ~w',
        org: '@mf rw | rw | <c3 g3 db4>w | <c3 gb3 c4>w',
        timp: '@mp rw | rw | c2w~< | ~w',
        cb: '@mp c2w | ~w | ~w | ~w',
      },
    },
    A: {
      bars: 8,
      v: {
        org: '@f ' + UMB_ORG,
        ped: '@f c2w | db2w | c2w | gb1w | c2w | db2w | b1w | c2w',
        cb: { ref: 'ped', vel: 0.8 },
        ch: '@f g4w | ab4w | g4h eb4h | gb4h db4h | g4w | ab4h f4h | f4h d4h | eb4h c4h',
        chL: '@f c3h c3 | db3h db3 | c3h c3 | gb2h gb2 | c3h c3 | db3h db3 | b2h b2 | c3h c3',
        tbn: '@f c3q. db3i c3h | db3q. eb3i db3h | c3q. db3i eb3q f3q | gb3h. f3q | c3q. db3i c3h | db3q. eb3i f3h | f3q. d3i b2h | c3w',
        tuba: { ref: 'tbn', tr: -12, vel: 0.9 },
        timp: '@f c2q. c2i c2h | db2q. db2i db2h | c2q. c2i c2h | gb2q. gb2i gb2h | c2q. c2i c2h | db2q. db2i db2h | b1q. b1i b1h | c2h c2i c c c',
        bell: '@mf c4w | rw | c4w | gb3w | c4w | rw | b3w | c4w',
        spi: '@mp <g4 ab4>w~ | <ab4 bb4>w~ | <g4 ab4>w~ | <gb4 ab4>w~ | <g4 ab4>w~ | <ab4 bb4>w~ | <f4 gb4>w~ | <g4 ab4>w~',
        bd: { pat: 'X...x...', step: 'i' },
        cym: { pat: 'X.......', step: 'w' },
      },
    },
    B: {
      ch: 'Cm | Ab | Fm | Db | Cm | Ab | Bdim | G',
      v: {
        org: { pat: '1s 3 5 8 10 8 5 3 1 3 5 8 10 8 5 3', at: 'c4', vel: 0.8 },
        ped: { pat: '1w', at: 'c2' },
        cb: { pat: '1h 1h', at: 'g1', vel: 0.8 },
        tbn: '@f c3h. eb3q | ab2h c3h | f3h ab3h | db3h. f3q | g3h. eb3q | ab3h c4h | b3h d4h | b3h g3h',
        hn: { ref: 'tbn', tr: 12, vel: 0.7 },
        tuba: { pat: '1w', at: 'g1' },
        ch: { pad: 4, at: 'c4', hi: 'c5', vel: 0.8 },
        chL: { pad: 3, at: 'c3', hi: 'c4', vel: 0.8 },
        timp: { pat: '1q r 1 5,', at: 'c2' },
        bd: { pat: 'X.......', step: 'i' },
        cym: { pat: 'X...X...', step: 'w' },
      },
    },
    C: {
      bars: 8,
      v: {
        wind: '@mf c4w | db4w | c4w | b3w | c4w | db4w | d4w | eb4w',
        org: '@p <c3 g3 db4>w | <c3 ab3 d4>w | <c3 g3 db4>w | <b2 f3 c4>w | <c3 g3 db4>w | <c3 ab3 d4>w | <c3 gb3 eb4>w | <c3 g3 d4>w',
        cho: '@mp g4w | ab4w | g4w | f4w | g4w | ab4w | a4w | g4w',
        bell: '@mp c5w | rw | rw | rw | gb4w | rw | rw | rw',
        timp: '@p rw | rw | rw | rw | rw | rw | c2w~< | ~w',
        cb: '@p c2w | ~w | ~w | b1w | c2w | ~w | ~w | ~w',
        cym: { pat: '......RR', step: 'w' },
      },
    },
    A2: {
      base: 'A',
      v: {
        hn: { ref: 'ch', vel: 0.8 },
      },
    },
  },
  intro: ['I'],
  body: ['A', 'B', 'C', 'A2'],
};

// ===========================================================================
//  FINAL BOSS — "Altessa, the Crimson Seraph" (E minor: organ, choir, tutti)
// ===========================================================================
const finalBoss: TrackDef = {
  id: 'finalBoss',
  title: 'The Crimson Seraph',
  desc: 'Final battle: organ toccata, choir, full orchestra; the Oath theme corrupted.',
  bpm: 148,
  gain: 0.85,
  voices: {
    org: { i: 'organ', pan: -0.1, vol: 0.7 },
    ped: { i: 'organ', pan: 0.1, vol: 0.7 },
    ch: { i: 'choir', pan: 0, vol: 0.75 },
    chL: { i: 'choirLow', pan: 0, vol: 0.4 },
    tpt: { i: 'trumpet', pan: 0.2, vol: 0.95 },
    hn: { i: 'horn', pan: -0.2, vol: 0.8 },
    vln: { i: 'violin', pan: -0.35, vol: 0.7 },
    tbn: { i: 'trombone', pan: 0.3, vol: 0.5 },
    tuba: { i: 'tuba', pan: 0.2, vol: 0.8 },
    spi: { i: 'spicc', pan: -0.28, vol: 0.6 },
    vc: { i: 'celli', pan: 0.28, vol: 0.55 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.65 },
    timp: { i: 'timpani', pan: 0, vol: 0.75 },
    sn: { i: 'snare', pan: 0.12, vol: 0.45 },
    bd: { i: 'bassDrum', pan: 0, vol: 0.55 },
    cym: { i: 'cymbal', pan: 0.2, vol: 0.5 },
    bell: { i: 'bell', pan: -0.3, vol: 0.8 },
  },
  sections: {
    I: {
      ch: 'Em | C | Am | B',
      v: {
        org: '@f e5s d#5 e5 b4 g4 b4 e4 b4 g4 b4 e5 b4 g5 e5 b5 g5 | c6s b5 c6 g5 e5 g5 c5 g5 e5 g5 c6 g5 e6 c6 g5 e5 | a5s g#5 a5 e5 c5 e5 a4 e5 c5 e5 a5 e5 c6 a5 e5 c5 | b5s a5 g5 f#5 e5 d#5 c5 b4 a4 g4 f#4 e4 d#4 c4 b3 a3',
        ped: '@f e2w | c2w | a1w | b1w',
        timp: '@mp rw | rw | rw | b2w~<',
        cym: { pat: '...R', step: 'w' },
      },
    },
    A: {
      ch: 'Em | C | Am | B | Em | C | F | B7',
      v: {
        ch: '@f b4h e5h | e5h. g5q | a5h e5h | f#5h. d#5q | g5h e5h | e5h c5h | f5h a5h | a5h d#5h',
        chL: { pad: 3, at: 'e3', hi: 'e4', vel: 0.8 },
        org: { pad: 4, at: 'b3', hi: 'b4', vel: 0.7 },
        ped: { pat: '1w', at: 'c2' },
        spi: { pat: '1s 5 8 5 10 5 8 5 1 5 8 5 10 5 8 5', at: 'e3', vel: 0.65 },
        vc: { pat: '1i 1 5 1 8 1 5 1', at: 'e2' },
        cb: { pat: '1i 1 1 1 1 1 1 1', at: 'a1', vel: 0.7 },
        tbn: { pad: 3, at: 'e3', hi: 'e4', pat: 'cq.* cq.* cq*' },
        timp: { pat: '1q r 1i 1 5,q', at: 'e2' },
        sn: { pat: '[X.xxX.x.X.xxX.xx]*7 X.xxX.xxRRRRRRRR', step: 's' },
        bd: { pat: 'X.x.', step: 'q' },
        cym: { pat: 'X...X...', step: 'w' },
      },
    },
    B: {
      base: 'A',
      ch: 'Em | G | Am | C | Em | D | C | B',
      v: {
        tpt: '@f b4q e5h f#5q | g5h. f#5i e5i | c5h a4h | e5q. f#5i g5h | b5h. a5i g5i | a5q f#5q d5q a4q | g5h. f#5i e5i | d#5h f#5h',
        hn: '@f g4q b4h d5q | d5h. c5i b4i | a4h e4h | c5q. d5i e5h | e5h. d5i b4i | f#5q d5q a4q f#4q | e5h. d5i c5i | b4h d#5h',
        ch: { pad: 4, at: 'e4', hi: 'e5', vel: 0.7 },
        tbn: { pad: 3, at: 'e3', hi: 'e4' },
        tuba: { pat: '1h 5,h', at: 'a1' },
      },
    },
    C: {
      ch: 'Em | Cmaj7 | Am | F | Em | C | F | B',
      v: {
        ch: '@mp b4q e5h f#5q | g5h. b4q | c5h. e5q | f5h a5h | g5q f#5q e5q b4q | c5h e5h | f5h c5h | b4w',
        org: { pad: 4, at: 'e3', hi: 'e4', vel: 0.6 },
        ped: { pat: '1w', at: 'c2' },
        bell: '@mf e4w | rw | rw | rw | e4w | rw | rw | b3w',
        vc: { pat: '1h 5,h', at: 'e2', vel: 0.6 },
        cb: { pat: '1w', at: 'a1', vel: 0.6 },
        timp: '@p e2w | rw | rw | rw | e2w | rw | rw | b2w~<',
        spi: { pad: 3, at: 'e4', hi: 'e5', pat: 'cw~', vel: 0.4 },
      },
    },
    D: {
      base: 'A',
      ch: 'C | D | Bm | Em | C | D | B | B',
      v: {
        tpt: '@ff e5q. g5i c6h | a5q. f#5i d5h | f#5q. d5i b4h | e5h g5h | c6q. b5i g5h | a5q. f#5i a5h | b5h. a5q | f#5h d#5h',
        hn: { ref: 'tpt', tr: -12, vel: 0.85 },
        vln: { ref: 'tpt', vel: 0.8 },
        ch: { pad: 4, at: 'g4', hi: 'g5', vel: 1 },
        chL: { pad: 3, at: 'e3', hi: 'e4', vel: 1 },
        org: { pad: 4, at: 'e3', hi: 'e4', vel: 0.9 },
        ped: { pat: '1h 1h', at: 'c2' },
        tuba: { pat: '1q. 1q. 5,q', at: 'a1' },
      },
    },
    A2: { base: 'A', tr: 2 },
  },
  intro: ['I'],
  body: ['A', 'B', 'C', 'D', 'A2'],
};

// ===========================================================================
//  VICTORY — fanfare, then a gentle pastoral loop (B-flat major)
// ===========================================================================
const victory: TrackDef = {
  id: 'victory',
  title: 'The Field Is Ours',
  desc: 'Short brass fanfare, then a gentle loop for the spoils screen.',
  bpm: 88,
  gain: 1.26,
  voices: {
    tpt: { i: 'trumpet', pan: 0.2, vol: 0.95 },
    hn: { i: 'horn', pan: -0.2, vol: 0.8 },
    tbn: { i: 'trombone', pan: 0.3, vol: 0.4 },
    fl: { i: 'flute', pan: -0.1, vol: 1.5 },
    ob: { i: 'oboe', pan: 0.12, vol: 1.2 },
    hp: { i: 'harp', pan: -0.4, vol: 0.9 },
    str: { i: 'strings', pan: 0, vol: 0.3 },
    vc: { i: 'celli', pan: 0.3, vol: 0.5 },
    bpz: { i: 'bassPizz', pan: 0.25, vol: 0.6 },
    cel: { i: 'celesta', pan: 0.35, vol: 1.1 },
    timp: { i: 'timpani', pan: 0, vol: 0.55 },
    sn: { i: 'snare', pan: 0.12, vol: 0.45 },
    cym: { i: 'cymbal', pan: 0.2, vol: 0.5 },
  },
  sections: {
    F: {
      bpm: 120,
      ch: 'Bb | Cm7 F7 | Bb | Bb',
      v: {
        tpt: '@f f4q. bb4i d5q f5q | eb5q. d5i c5q eb5q | d5q. bb4i f5q. f5i | bb5w',
        hn: '@f d4q. f4i bb4q d5q | c5q. bb4i a4q c5q | bb4q. f4i d5q. d5i | f5w',
        tbn: { pad: 3, at: 'bb2', hi: 'bb3', pat: 'cq. ci cq cq | cq. ci cq cq | cq. ci cq cq | cw' },
        timp: '@f bb2q. bb2i f2q bb2q | c3q. c3i f2q f2q | bb2q. bb2i f2q. f2i | bb2w~>',
        cym: { pat: 'X..X', step: 'w' },
        sn: { pat: 'X...x.x.X...x.x. X...x.x.X...x.x. X...x.x.RRRRRRRR X...............', step: 's' },
        str: { pad: 4, at: 'd4', hi: 'd5' },
        vc: { pat: '1q. 1i 1q 1q', at: 'bb2' },
      },
    },
    A: {
      ch: 'Bb | F/A | Gm | Eb | Bb/D | Eb | Cm7 | F',
      v: {
        fl: '@mf d5h. f5q | c5h. a4q | bb4q. c5i d5q g5q | g5h f5q eb5q | f5h. d5q | eb5q. f5i g5q bb5q | bb5h. g5q | a5h c5h',
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'd2', vel: 0.7 },
        str: { pad: 3, at: 'f3', hi: 'f4', vel: 0.5 },
        hn: '@p d4w | c4w | d4w | eb4w | d4w | g4w | g4w | f4w',
        bpz: { pat: '0q r 5 r', at: 'd2' },
        cel: '@p rh f6q rq | rh c6q rq | rh d6q rq | rh bb5q rq | rh f6q rq | rh g6q rq | rh bb5q rq | rh a5q rq',
      },
    },
    B: {
      base: 'A',
      ch: 'Eb | Bb | Cm | Gm | Eb | Bb/D | Cm7 F | Bb',
      v: {
        ob: '@mf g4h bb4h | d5h. bb4q | c5q. d5i eb5q g5q | d5h bb4h | eb5q. f5i g5q eb5q | f5h d5h | c5h a4h | bb4w',
        fl: '@p g5w | f5w | g5w | d5h bb4h | g5w | f5w | eb5h f5h | d5w',
        hn: '@p eb4w | d4w | eb4w | d4w | eb4w | d4w | eb4h c4h | d4w',
        cel: '@p rh g6q rq | rh f6q rq | rh eb6q rq | rh d6q rq | rh g6q rq | rh f6q rq | rh c6q rq | rh bb5q rq',
      },
    },
  },
  intro: ['F'],
  body: ['A', 'B'],
};

// ===========================================================================
//  DEFEAT — "Ashes" (A minor, slow, does not loop)
// ===========================================================================
const defeat: TrackDef = {
  id: 'defeat',
  title: 'Ashes',
  desc: 'Game over: a slow lament for cello and oboe, dying away.',
  bpm: 58,
  gain: 1.6,
  loop: false,
  voices: {
    vc: { i: 'celli', pan: 0.2, vol: 1 },
    ob: { i: 'oboe', pan: -0.1, vol: 1.3 },
    str: { i: 'strings', pan: 0, vol: 0.5 },
    hn: { i: 'horn', pan: -0.25, vol: 0.45 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.6 },
    hp: { i: 'harp', pan: -0.4, vol: 1.2 },
    timp: { i: 'timpani', pan: 0, vol: 0.5 },
  },
  sections: {
    A: {
      ch: 'Am | F | Dm | E | Am | Dm E',
      v: {
        vc: '@mp e4h. c4q | a3h. c4q | f4h. d4q | g#3h b3h | c4h. a3q | f3h e3h',
        str: { pad: 3, at: 'e4', hi: 'e5', vel: 0.5 },
        cb: { pat: '0w', at: 'a1', vel: 0.5 },
        hp: { pat: '1q 5 8 r', at: 'a2', vel: 0.5 },
        hn: '@pp rw | rw | rw | rw | e4w | d4h e4h',
      },
    },
    B: {
      ch: 'F | C/E | Dm | Am/C | Dm E | Am',
      rit: 0.62,
      v: {
        ob: '@mp c5h. a4q | g4h e4h | f4h d4q f4q | e4h. c4q | a4h g#4h | @> a4w @pp',
        vc: '@p f3h a3h | e3h g3h | d3h f3h | c3h e3h | f3h e3h | a2w',
        str: { pad: 3, at: 'e4', hi: 'e5', vel: 0.45 },
        cb: { pat: '0w', at: 'a1', vel: 0.45 },
        hp: { pat: '1q 5 8 r', at: 'a2', vel: 0.45 },
        hn: '@pp c4w | c4w | d4w | c4w | d4h e4h | e4w',
        timp: '@pp rw | rw | rw | rw | rw | a2w~>',
      },
    },
  },
  body: ['A', 'B'],
};

// ===========================================================================
//  SOMBER — "Tears Upon the Snow" (G minor, 3/4)
// ===========================================================================
const SOM_A = '@mp d5h bb4q | g4h. | c5q. d5i eb5q | d5h a4q | bb4h d5q | g5q. f5i eb5q | eb5h c5q | c5q. bb4i a4q';
const somber: TrackDef = {
  id: 'somber',
  title: 'Tears Upon the Snow',
  desc: 'Sad scenes: oboe and violin laments over harp.',
  bpm: 63,
  gain: 1.43,
  sig: '3/4',
  voices: {
    ob: { i: 'oboe', pan: 0.12, vol: 1.8 },
    vln: { i: 'violin', pan: -0.25, vol: 0.95 },
    vc: { i: 'celli', pan: 0.3, vol: 0.55 },
    str: { i: 'strings', pan: 0, vol: 0.5 },
    hp: { i: 'harp', pan: -0.4, vol: 1.1 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.6 },
    hn: { i: 'horn', pan: -0.2, vol: 0.6 },
  },
  sections: {
    I: {
      ch: 'Gm | Gm',
      v: { hp: { pat: '1 5 8 10 8 5', at: 'g2', vel: 0.7 } },
    },
    A: {
      ch: 'Gm | Eb | Cm | D | Gm | Eb | Am7b5 | D',
      v: {
        ob: SOM_A,
        hp: { pat: '1 5 8 10 8 5', at: 'g2', vel: 0.7 },
        str: { pad: 3, at: 'g3', hi: 'g4', vel: 0.45 },
        vc: '@p g3h. | g3h. | eb3h. | f#3h. | g3h. | g3h. | a3h. | f#3h.',
        cb: { pat: '0h.', at: 'g1', vel: 0.5 },
      },
    },
    B: {
      base: 'A',
      ch: 'Eb | Bb | Cm | Gm | Eb | Bb/D | Cm | D7',
      v: {
        vln: '@mp bb4q. c5i eb5q | f5h d5q | eb5q. f5i g5q | g5h. | @< bb5q. g5i eb5q | f5h d5q @mf | @> eb5q. d5i c5q | d5q c5q a4q @p',
        ob: '@p g4h. | f4h. | g4h. | bb4h. | g4h. | f4h. | g4h. | f#4h.',
        vc: '@p eb3h. | d3h. | c3h. | d3h. | eb3h. | d3h. | c3h. | d3h.',
        hn: '@pp bb3h. | bb3h. | c4h. | d4h. | bb3h. | bb3h. | c4h. | c4h.',
      },
    },
    A2: {
      base: 'A',
      v: {
        vln: SOM_A,
        ob: '@p bb4h. | bb4h. | g4h. | a4h. | g4h. | bb4h. | c5h. | a4h f#4q',
      },
    },
  },
  intro: ['I'],
  body: ['A', 'B', 'A2'],
};

// ===========================================================================
//  TENSION — "Whispers in the Cloister" (E minor: pizzicato & low strings)
// ===========================================================================
const tension: TrackDef = {
  id: 'tension',
  title: 'Whispers in the Cloister',
  desc: 'Conspiracy scenes: creeping pizzicato, sly clarinet, tremolo strings.',
  bpm: 92,
  gain: 1.95,
  voices: {
    cl: { i: 'clarinet', pan: -0.15, vol: 1.1 },
    bsn: { i: 'bassoon', pan: 0.2, vol: 1 },
    pz: { i: 'pizz', pan: 0.25, vol: 1.0 },
    bpz: { i: 'bassPizz', pan: 0.3, vol: 0.55 },
    vc: { i: 'celli', pan: 0.3, vol: 0.45 },
    spi: { i: 'spicc', pan: -0.35, vol: 0.45 },
    str: { i: 'strings', pan: 0, vol: 0.4 },
    cel: { i: 'celesta', pan: -0.3, vol: 0.9 },
    timp: { i: 'timpani', pan: 0, vol: 0.6 },
  },
  sections: {
    I: {
      ch: 'Em | Em',
      v: {
        pz: { pat: '1 3 5 3 1 3 6 3', at: 'e3', vel: 0.75 },
        timp: { pat: '1i 1 rq rh', at: 'e2', vel: 0.55 },
      },
    },
    A: {
      ch: 'Em | Em | C | C | Am | Am | B7 | B7',
      v: {
        cl: '@mp rq e4i* g4* b4q. a4i | g4q. f#4i e4h | rq e4i* g4* b4q. c5i | b4q. a4i g4h | rq a4i* c5* e5q. d5i | c5q. b4i a4h | f#4q. g4i a4q d#4q | b3h. rq',
        pz: { pat: '1 3 5 3 1 3 6 3', at: 'e3', vel: 0.75 },
        bpz: { pat: '1q r 1 r', at: 'b1' },
        vc: { pat: '1w', at: 'e2', vel: 0.5 },
        timp: { pat: '1i 1 rq rh', at: 'e2', vel: 0.5 },
        str: { pad: 3, at: 'g3', hi: 'g4', vel: 0.35 },
      },
    },
    B: {
      ch: 'Am | Em | F | Em | Am | Em | C | B',
      v: {
        bsn: '@mp a2h c3h | b2h e3h | f3h a3h | g3h. b2q | c3q. d3i e3h | g3q. f#3i e3h | e3h g3h | f#3h d#3h',
        vc: { ref: 'bsn', vel: 0.7 },
        cel: '@p rh c6q rq | rw | rh a5q rq | rw | rh e6q rq | rw | rh g5q rq | rh f#5q rq',
        spi: '@pp e5w~ | ~w | f5w~ | e5w~ | e5w~ | ~w | e5w~ | d#5w~',
        pz: { pat: '1 . 5 . 1 . 6 .', at: 'e3', vel: 0.6 },
        bpz: { pat: '1q r 1 r', at: 'b1' },
        timp: { pat: '1i 1 rq rh', at: 'e2', vel: 0.5 },
      },
    },
    A2: {
      base: 'A',
      v: {
        bsn: '@p e3w | e3w | e3w | e3w | a2w | a2w | b2w | b2w',
        spi: '@pp b4w~ | ~w | b4w~ | ~w | c5w~ | ~w | a4w~ | ~w',
      },
    },
  },
  intro: ['I'],
  body: ['A', 'B', 'A2'],
};

// ===========================================================================
//  CHURCH — "Saint Auren's Mercy" (F major chorale: organ & choir)
// ===========================================================================
const church: TrackDef = {
  id: 'church',
  title: "Saint Auren's Mercy",
  desc: 'Sacred chorale: pipe organ and choir, distant bells.',
  bpm: 66,
  gain: 1.23,
  voices: {
    ch: { i: 'choir', pan: 0, vol: 0.9 },
    chA: { i: 'choir', pan: 0.05, vol: 0.55 },
    org: { i: 'organ', pan: -0.12, vol: 0.45 },
    ped: { i: 'organ', pan: 0.12, vol: 0.6 },
    fl: { i: 'flute', pan: -0.2, vol: 1.3 },
    hn: { i: 'horn', pan: 0.25, vol: 0.6 },
    str: { i: 'strings', pan: 0, vol: 0.45 },
    bell: { i: 'bell', pan: -0.35, vol: 0.8 },
  },
  sections: {
    I: {
      ch: 'F | C/E',
      v: {
        org: { pad: 4, at: 'f3', hi: 'd5', vel: 0.7 },
        ped: { pat: '0h', at: 'c2' },
        bell: '@mp f4w | rw',
      },
    },
    A: {
      ch: 'F | Bb F/A | Gm C | F | Dm | Am | Bb C | F',
      v: {
        ch: '@mf a4h c5h | d5h c5h | bb4h g4h | a4w | f4h a4h | c5h a4h | d5h e5h | f5w',
        chA: { pad: 3, at: 'c3', hi: 'g4', vel: 0.7 },
        org: { pad: 4, at: 'f3', hi: 'd5', vel: 0.7 },
        ped: { pat: '0h', at: 'c2' },
        str: { pad: 3, at: 'f4', hi: 'f5', vel: 0.4 },
        bell: '@mp f4w | rw | rw | rw | d4w | rw | rw | rw',
      },
    },
    B: {
      base: 'A',
      ch: 'Bb | F/A | Gm | A | Dm | Bb | Gm C | F',
      v: {
        ch: '@mf f5h d5h | c5h a4h | bb4h d5h | c#5w | d5h a4h | bb4h d5h | d5h c5h | a4w',
        bell: '@mp bb3w | rw | rw | rw | d4w | rw | rw | f4w',
      },
    },
    A2: {
      base: 'A',
      mute: ['ch', 'chA'],
      v: {
        fl: { ref: 'A.ch', tr: 12, vel: 0.9 },
        hn: { pad: 3, at: 'c3', hi: 'g4', vel: 0.55 },
      },
    },
  },
  intro: ['I'],
  body: ['A', 'B', 'A2'],
};

// ===========================================================================
//  HEROIC — "Resolve" (B-flat major, rising to C)
// ===========================================================================
const heroic: TrackDef = {
  id: 'heroic',
  title: 'Resolve',
  desc: 'Determination: horn anthem, soaring violins, a key lift.',
  bpm: 108,
  gain: 1.06,
  voices: {
    hn: { i: 'horn', pan: -0.2, vol: 1 },
    tpt: { i: 'trumpet', pan: 0.2, vol: 0.7 },
    tbn: { i: 'trombone', pan: 0.3, vol: 0.38 },
    vln: { i: 'violin', pan: -0.35, vol: 0.9 },
    fl: { i: 'flute', pan: -0.1, vol: 0.6 },
    ob: { i: 'oboe', pan: 0.1, vol: 1.4 },
    str: { i: 'strings', pan: 0, vol: 0.5 },
    vc: { i: 'celli', pan: 0.28, vol: 0.55 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.5 },
    hp: { i: 'harp', pan: -0.45, vol: 1.1 },
    timp: { i: 'timpani', pan: 0, vol: 0.65 },
    sn: { i: 'snare', pan: 0.12, vol: 0.42 },
    bd: { i: 'bassDrum', pan: 0, vol: 0.45 },
    cym: { i: 'cymbal', pan: 0.2, vol: 0.5 },
  },
  sections: {
    I: {
      ch: 'Bb | F',
      v: {
        tbn: { pad: 3, at: 'bb2', hi: 'bb3', pat: 'cq. ci ch | cw' },
        timp: '@mf bb2q. bb2i bb2h | f2i f f f @< f f f f @f',
        sn: { pat: 'X...x.x.X...x.x. RRRRRRRRRRRRRRRR', step: 's' },
        str: { pad: 4, at: 'd4', hi: 'd5' },
      },
    },
    A: {
      ch: 'Bb | Gm | Eb | F | Bb | Gm | Cm7 | F',
      v: {
        hn: '@f f4q bb4h c5q | d5h. bb4q | g4q. bb4i eb5q. d5i | c5w | f4q bb4h c5q | d5q. eb5i f5q d5q | eb5q. d5i c5q g4q | a4h c5h',
        vln: { pat: '8 5 10 5 12 10 8 5', at: 'bb3', vel: 0.55 },
        str: { pad: 3, at: 'f3', hi: 'f4', vel: 0.55 },
        vc: { pat: '1q 5 8 5', at: 'bb2' },
        cb: { pat: '0h 0h', at: 'a1' },
        tbn: { pad: 3, at: 'bb2', hi: 'c4', pat: 'cq. ci ch' },
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'bb2', vel: 0.6 },
        timp: { pat: '1q r 5,q r', at: 'e2' },
        sn: { pat: '[X...x.x.X..xx.x.]*7 X...x.x.RRRRRRRR', step: 's' },
        cym: { pat: 'X.......', step: 'w' },
        bd: { pat: 'X...X...', step: 'w' },
      },
    },
    B: {
      base: 'A',
      ch: 'Eb | F | Dm | Gm | Eb | F | G | G',
      v: {
        vln: '@f g5h. eb5q | f5q. g5i a5h | a5q f5q d5q f5q | g5h. d5q | eb5q. f5i g5q bb5q | a5h. c6q | b5h. d6q | d6h b5h',
        fl: { ref: 'vln', vel: 0.7 },
        hn: '@mf eb4w | f4w | f4w | d4w | eb4w | f4w | d4w | d4h f4h',
      },
    },
    A2: {
      base: 'A',
      tr: 2,
      v: { tpt: { ref: 'hn', vel: 0.9 } },
    },
    C: {
      ch: 'Am | F | C | G | Am | F | Dm | G',
      v: {
        ob: '@mf e5h. c5q | a4h c5h | e5q. d5i c5h | d5h. b4q | c5q. d5i e5q a5q | a5h. f5q | f5q. e5i d5q a4q | b4h d5h',
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'a2', vel: 0.6 },
        str: { pad: 3, at: 'e3', hi: 'e4', vel: 0.5 },
        vc: { pat: '1h 5h', at: 'c3', vel: 0.55 },
        cb: { pat: '1w', at: 'a1', vel: 0.55 },
        hn: '@p c4w | c4w | c4w | b3w | c4w | c4w | d4w | d4w',
        timp: '@p rw | rw | rw | rw | rw | rw | rw | g2w~<',
      },
    },
  },
  intro: ['I'],
  body: ['A', 'B', 'A2', 'C'],
};

// ===========================================================================
//  ROMANCE — "Petals on the Wind" (E-flat major, 3/4)
// ===========================================================================
const romance: TrackDef = {
  id: 'romance',
  title: 'Petals on the Wind',
  desc: 'Tender scenes: flute and violin over harp, a clarinet interlude.',
  bpm: 76,
  gain: 1.66,
  sig: '3/4',
  voices: {
    fl: { i: 'flute', pan: -0.12, vol: 1.45 },
    vln: { i: 'violin', pan: -0.3, vol: 0.95 },
    cl: { i: 'clarinet', pan: 0.15, vol: 1.2 },
    vc: { i: 'celli', pan: 0.3, vol: 0.5 },
    hp: { i: 'harp', pan: -0.4, vol: 1 },
    str: { i: 'strings', pan: 0, vol: 0.45 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.55 },
    cel: { i: 'celesta', pan: 0.35, vol: 0.9 },
  },
  sections: {
    A: {
      ch: 'Eb | Cm | Ab | Bb | Eb | Gm | Ab | Bb',
      v: {
        fl: '@mp bb4h g5q | g5q. f5i eb5q | c5h. | bb4q c5q d5q | eb5h g5q | bb5q. g5i d5q | c5q. eb5i ab5q | f5h.',
        hp: { pat: '1 5 8 10 8 5', at: 'eb2', vel: 0.6 },
        str: { pad: 3, at: 'g3', hi: 'g4', vel: 0.45 },
        cb: { pat: '0h.', at: 'g1', vel: 0.45 },
      },
    },
    B: {
      base: 'A',
      ch: 'Ab | Bb | Gm | Cm | Fm7 | Bb | Eb | Bb7',
      mute: ['fl'],
      v: {
        vln: '@mp c6q. bb5i ab5q | f5h d5q | g5q. f5i d5q | eb5h g5q | ab5q. g5i f5q | d5h bb4q | eb5q g5q bb5q | ab5h.',
        cl: '@p ab4h. | f4h. | bb4h. | g4h. | ab4h. | f4h. | g4h. | f4h d4q',
      },
    },
    A2: {
      base: 'A',
      v: {
        vc: '@mp g3h. | eb3h. | eb3h. | d3h f3q | g3h. | d3h. | c3h eb3q | d3h.',
        cel: '@p rh g6q | rh. | rh eb6q | rh. | rh bb5q | rh. | rh c6q | rh.',
      },
    },
    C: {
      base: 'A',
      ch: 'Cm | Ab | Eb | Bb | Cm | Fm | Ab | Bb',
      v: {
        cl: '@mp g4h eb4q | c5h. | bb4q. ab4i g4q | f4h. | c5q. d5i eb5q | f5h c5q | eb5q. c5i ab4q | d5h.',
        fl: '@p eb5h. | eb5h. | eb5h. | d5h. | eb5h. | c5h. | c5h. | d5h.',
      },
    },
  },
  body: ['A', 'B', 'A2', 'C'],
};

// ===========================================================================
//  CAMPFIRE — "Beneath the Twelve Stars" (E major, lilting 6/8)
// ===========================================================================
const campfire: TrackDef = {
  id: 'campfire',
  title: 'Beneath the Twelve Stars',
  desc: 'Starry night by the fire: harp, flute, oboe, celesta twinkles.',
  bpm: 84,
  gain: 1.85,
  sig: '6/8',
  voices: {
    fl: { i: 'flute', pan: -0.12, vol: 1.2 },
    ob: { i: 'oboe', pan: 0.12, vol: 1.2 },
    hp: { i: 'harp', pan: -0.35, vol: 1.1 },
    vc: { i: 'celli', pan: 0.3, vol: 0.55 },
    str: { i: 'strings', pan: 0, vol: 0.45 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.55 },
    cel: { i: 'celesta', pan: 0.4, vol: 0.9 },
  },
  sections: {
    A: {
      ch: 'E | C#m | A | B | E | G#m | A | B',
      v: {
        fl: '@mp b4q. e5i f#5 g#5 | g#5q. e5q. | c#5q. e5i c#5 a4 | f#4q. b4q. | e5q. g#5i f#5 e5 | d#5q. b4q. | c#5i e5 a5 c#6q. | b5q. f#5q.',
        hp: { pat: '1 5 8 10 8 5', at: 'e2', vel: 0.65 },
        str: { pad: 3, at: 'g#3', hi: 'g#4', vel: 0.4 },
        cb: { pat: '0h.', at: 'a1', vel: 0.4 },
      },
    },
    B: {
      base: 'A',
      ch: 'A | E/G# | F#m | B | A | E/G# | F#m7 | B7',
      mute: ['fl'],
      v: {
        ob: '@mp e5q. c#5q. | b4q. g#4q. | a4i c#5 f#5 a5q. | f#5q. d#5q. | e5q. a4i b4 c#5 | b4q. e5q. | e5q. c#5i b4 a4 | f#4q. a4q.',
        hp: { pat: '1 5 8 5 10 5', at: 'e2', vel: 0.6 },
        cel: '@p rq. c#7q. | rh. | rq. a6q. | rh. | rq. e6q. | rh. | rq. c#6q. | rq. d#6q.',
      },
    },
    A2: {
      base: 'A',
      v: {
        vc: '@p e3q. g#3q. | c#3q. e3q. | a2q. c#3q. | b2q. d#3q. | e3q. b2q. | g#2q. d#3q. | a2q. e3q. | b2q. f#3q.',
        cel: '@p rq. g#6q. | rh. | rq. e6q. | rh. | rq. b6q. | rh. | rq. c#7q. | rh.',
      },
    },
    B2: {
      base: 'B',
      v: {
        fl: '@p c#6q. a5q. | b5q. g#5q. | a5q. c#6q. | b5q. f#5q. | c#6q. a5q. | g#5q. b5q. | a5q. e5q. | d#5q. f#5q.',
      },
    },
  },
  body: ['A', 'B', 'A2', 'B2'],
};

// ===========================================================================
//  DUNGEON — "The Midnight Deep" (C-sharp minor, eerie)
// ===========================================================================
const dungeon: TrackDef = {
  id: 'dungeon',
  title: 'The Midnight Deep',
  desc: 'Deep dungeon: whistling winds, music-box celesta, dripping pizzicato.',
  bpm: 72,
  gain: 2.5,
  voices: {
    cel: { i: 'celesta', pan: -0.2, vol: 1.4 },
    wind: { i: 'windPad', pan: 0.1, vol: 0.55 },
    cho: { i: 'choirOo', pan: 0, vol: 0.5 },
    pz: { i: 'pizz', pan: 0.35, vol: 1.0 },
    hp: { i: 'harp', pan: -0.4, vol: 1.0 },
    vc: { i: 'celli', pan: 0.25, vol: 0.45 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.4 },
    str: { i: 'strings', pan: 0, vol: 0.4 },
    timp: { i: 'timpani', pan: 0, vol: 0.8 },
    bell: { i: 'bell', pan: -0.35, vol: 0.7 },
  },
  sections: {
    I: {
      bars: 2,
      v: {
        wind: '@mp c#4w | ~w',
        vc: '@p c#2w | ~w',
        bell: '@p rh g#3h | rw',
      },
    },
    A: {
      ch: 'C#m | Dmaj7 | C#m | Dmaj7 | Amaj7 | F#m | Dmaj7 | G#',
      v: {
        cel: '@mp g#5q e5q c#5q rq | c#6h. rq | e5q g#5q b5q rq | a5h. rq | g#5q e5q c#5q rq | a5h f#5q rq | f#5q a5q c#6q rq | b#5h. rq',
        wind: '@mp c#4w | a3w | c#4w | a3w | a3w | f#3w | a3w | g#3w',
        cho: { pad: 3, at: 'g#3', hi: 'g#4', vel: 0.55 },
        pz: { pat: '. . 8 . . . 5 . . 10 . . . . . .', at: 'c#4', vel: 0.5 },
        vc: { pat: '1w', at: 'c#2', vel: 0.5 },
        cb: { pat: '1w', at: 'g#1', vel: 0.4 },
        timp: { pat: '1q r rh', at: 'c#2', vel: 0.35 },
      },
    },
    B: {
      base: 'A',
      ch: 'F#m | G | F#m | G | D | Bm | C | G#',
      v: {
        cho: '@mp f#4w | g4w | a4h f#4h | g4h d4h | f#4w | d4w | e4w | g#4w',
        cel: '@p rw | rh b5q rq | rw | rh d6q rq | rw | rh f#5q rq | rw | rh b#5q rq',
        hp: { pat: '1q 5 9 12', at: 'f#2', vel: 0.45 },
        wind: '@mp f#3w | g3w | f#3w | g3w | d4w | b3w | c4w | g#3w',
        bell: '@p f#3w | rw | rw | rw | d3w | rw | rw | g#3w',
        str: { pad: 3, at: 'c#4', hi: 'c#5', vel: 0.3 },
      },
    },
    A2: {
      base: 'A',
      v: {
        hp: { pat: '1 5 8 5', at: 'c#3', vel: 0.4 },
        bell: '@p c#4w | rw | rw | rw | a3w | rw | rw | g#3w',
      },
    },
  },
  intro: ['I'],
  body: ['A', 'B', 'A2'],
};

// ===========================================================================
//  ENDING — "The Tale Unburned" (F major, bittersweet; the Oath in major)
// ===========================================================================
const END_A = '@mp a4q c5q f5h | e5h. c5q | d5q. c5i bb4q d5q | c5w | bb4q d5q g5h | f5h. a4q | bb4q. c5i d5q f5q | e5h g5h';
const END_A_CH = 'F | Am | Bb | F/A | Gm | Dm | Bb | C';
const OATH_1_MAJ = OATH_1.replace('d5q c#5q e5h', 'd5q c5q e5h');
const OATH_1_VC_MAJ = OATH_1_VC.replace('a3h. c#4q', 'g3h. e3q');
const OATH_2_MAJ = OATH_2.replace('bb4q d5q c#5q e5q | d5w', 'bb4q d5q c5q e5q | f5w');
const OATH_2_HN_MAJ = OATH_2_HN.replace('g4q bb4q a4q c#5q | a4w', 'g4q bb4q g4q c5q | a4w');
const ending: TrackDef = {
  id: 'ending',
  title: 'The Tale Unburned',
  desc: 'Bittersweet ending theme; the Oath returns in F major.',
  bpm: 72,
  gain: 1.24,
  voices: {
    vln: { i: 'violin', pan: -0.3, vol: 0.85 },
    fl: { i: 'flute', pan: -0.1, vol: 1.5 },
    ob: { i: 'oboe', pan: 0.12, vol: 1.2 },
    hn: { i: 'horn', pan: -0.2, vol: 0.7 },
    str: { i: 'strings', pan: 0, vol: 0.5 },
    vc: { i: 'celli', pan: 0.3, vol: 0.55 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.45 },
    hp: { i: 'harp', pan: -0.45, vol: 1.3 },
    ch: { i: 'choir', pan: 0, vol: 0.35 },
    timp: { i: 'timpani', pan: 0, vol: 0.55 },
    cym: { i: 'cymbal', pan: 0.2, vol: 0.45 },
    cel: { i: 'celesta', pan: 0.35, vol: 1.0 },
  },
  sections: {
    A: {
      ch: END_A_CH,
      v: {
        vln: END_A,
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'f2', vel: 0.6 },
        str: { pad: 3, at: 'f3', hi: 'f4', vel: 0.45 },
        vc: { pat: '0h 5h', at: 'c3', vel: 0.5 },
        cb: { pat: '0w', at: 'a1', vel: 0.5 },
        hn: '@p c4w | c4w | d4w | c4w | d4w | d4w | d4w | e4w',
      },
    },
    B: {
      base: 'A',
      ch: 'F6 | Bb | F | C | Gm | Dm/F | Eb | C',
      mute: ['vln', 'hn'],
      v: {
        fl: '@mf ' + OATH_1_MAJ,
        ob: '@p ' + OATH_1_VC_MAJ.replace(/(\w)(\d)/g, (_m, l: string, o: string) => l + (+o + 1)),
        ch: { pad: 4, at: 'c4', hi: 'c5', vel: 0.5 },
      },
    },
    C: {
      ch: 'Dm | Bb | Gm | F | Bb | C | Gm C | F',
      v: {
        vln: '@f ' + OATH_2_MAJ,
        hn: '@mf ' + OATH_2_HN_MAJ,
        ch: { pad: 4, at: 'f4', hi: 'f5', vel: 0.8 },
        str: { pad: 4, at: 'd4', hi: 'd5', vel: 0.6 },
        vc: { pat: '1q 5 8 5', at: 'c3' },
        cb: { pat: '0h 0h', at: 'a1' },
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'f2', vel: 0.6 },
        timp: '@mf d2q rh. | bb2q rh. | g2q rh. | f2q rh. | bb2q rh. | c3q rh. | g2h c3h | f2w~>',
        cym: { pat: 'X.......', step: 'w', vel: 0.7 },
      },
    },
    D: {
      base: 'A',
      ch: 'Bb | F/A | Gm | F | Bb | F/A | Gm7 | C',
      mute: ['vln'],
      v: {
        fl: '@mp d5h. f5q | c5h a4h | bb4q. a4i g4q d5q | c5w | f5h d5h | c5h. a4q | bb4h f4h | g4h e4h',
        hn: '@p d4w | c4w | d4w | c4w | d4w | c4w | d4w | e4w',
        cel: '@p rh d6q rq | rh c6q rq | rh bb5q rq | rh a5q rq | rh f6q rq | rh c6q rq | rh bb5q rq | rh g5q rq',
      },
    },
  },
  body: ['A', 'B', 'C', 'D'],
};

// ===========================================================================
//  CREDITS — reprise of the title theme
// ===========================================================================
const credits: TrackDef = {
  id: 'credits',
  title: 'The Chronicle of the Twelve Braves',
  desc: 'Credits: the Oath theme reprised, flute, oboe, strings, then full orchestra.',
  bpm: 88,
  gain: 1.13,
  voices: {
    fl: { i: 'flute', pan: -0.12, vol: 1.6 },
    ob: { i: 'oboe', pan: 0.12, vol: 1.2 },
    vln: { i: 'violin', pan: -0.32, vol: 1 },
    hn: { i: 'horn', pan: -0.18, vol: 0.8 },
    tpt: { i: 'trumpet', pan: 0.2, vol: 0.6 },
    tbn: { i: 'trombone', pan: 0.3, vol: 0.45 },
    str: { i: 'strings', pan: 0.05, vol: 0.4 },
    vc: { i: 'celli', pan: 0.3, vol: 0.65 },
    cb: { i: 'contrabass', pan: 0.38, vol: 0.6 },
    ch: { i: 'choir', pan: 0, vol: 0.4 },
    hp: { i: 'harp', pan: -0.45, vol: 1.1 },
    timp: { i: 'timpani', pan: 0.05, vol: 0.7 },
    sn: { i: 'snare', pan: 0.15, vol: 0.4 },
    cym: { i: 'cymbal', pan: 0.2, vol: 0.55 },
    cel: { i: 'celesta', pan: 0.35, vol: 1.0 },
  },
  sections: {
    I: {
      ch: 'Dm | A',
      v: {
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'd3', vel: 0.7 },
        ch: { pad: 4, at: 'd4', hi: 'd5', vel: 0.6 },
        timp: '@p rw | a2w~<',
      },
    },
    A: {
      ch: OATH_1_CH,
      v: {
        fl: '@mf ' + OATH_1,
        vc: '@p ' + OATH_1_VC,
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'd3', vel: 0.7 },
        str: { pad: 3, at: 'a3', hi: 'a4', vel: 0.6 },
        cb: { pat: '0w', at: 'a1', vel: 0.6 },
        cel: '@p rh a6q rq | rh f6q rq | rh c6q rq | rh g6q rq | rh d6q rq | rh a6q rq | rh bb6q rq | rh c#6q rq',
      },
    },
    A2: {
      ch: OATH_2_CH,
      v: {
        vln: '@mf ' + OATH_2,
        hn: '@mf ' + OATH_2_HN,
        str: { pad: 4, at: 'd4', hi: 'd5', vel: 0.6 },
        vc: { pat: '1q 5 8 5', at: 'd3', vel: 0.6 },
        cb: { pat: '0h 0h', at: 'a1', vel: 0.6 },
        ch: { pad: 4, at: 'f4', hi: 'f5', vel: 0.6 },
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'd3', vel: 0.6 },
        sn: { pat: '[x...o.o.x...o.oo]*7 x...o.o.RRRRRRRR', step: 's', vel: 0.8 },
        timp: '@mp d2q rh. | bb2q rh. | g2q rh. | f2q rh. | bb2q rh. | c3q rh. | g2h a2h | d2w',
      },
    },
    B: {
      ch: OATH_B_CH,
      v: {
        ob: '@mf ' + OATH_B.replace(/(\w)(\d)/g, (_m, l: string, o: string) => l + (+o + 1)),
        vln: '@p ' + OATH_B_VLN,
        str: { pad: 3, at: 'f3', hi: 'f4', vel: 0.6 },
        hp: { pat: '1 5 8 5 10 5 8 5', at: 'bb2', vel: 0.7 },
        vc: { pat: '1h 5h', at: 'd3', vel: 0.55 },
        cb: { pat: '0w', at: 'a1', vel: 0.6 },
        timp: '@p rw | rw | rw | d2h rh | rw | rw | rw | a2w~<',
      },
    },
    E: {
      ch: END_A_CH,
      v: {
        vln: END_A,
        fl: { ref: 'vln', tr: 12, vel: 0.6 },
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'f2', vel: 0.6 },
        str: { pad: 3, at: 'f3', hi: 'f4', vel: 0.5 },
        vc: { pat: '0h 5h', at: 'c3', vel: 0.5 },
        cb: { pat: '0w', at: 'a1', vel: 0.5 },
        hn: '@p c4w | c4w | d4w | c4w | d4w | d4w | d4w | e4w',
        timp: '@p rw | rw | rw | rw | rw | rw | rw | a2w~<',
      },
    },
    A3: {
      ch: OATH_2_CH,
      v: {
        vln: '@f ' + OATH_2,
        tpt: { ref: 'vln', vel: 0.9 },
        fl: { ref: 'vln', tr: 12, vel: 0.55 },
        hn: '@f ' + OATH_2_HN,
        tbn: { pad: 3, at: 'd3', hi: 'e4' },
        str: { pad: 4, at: 'd4', hi: 'd5', pat: 'cq ci ci cq cq' },
        vc: { pat: '1q 5 8 5', at: 'd3' },
        cb: { pat: '0h 0h', at: 'a1' },
        ch: { pad: 4, at: 'e4', hi: 'a5', vel: 0.9 },
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'd3', vel: 0.7 },
        timp: '@f d2q r d2i d a2q | bb2q r bb2i bb f2q | g2q r g2i g d2q | f2q r f2i f c2q | bb2q r bb2i bb f2q | c2q r c2i c g2q | g2h a2i a a a | d2w~>',
        sn: { pat: '[X...x.x.X...x.xx]*6 X...x.x.RRRRRRRR X...............', step: 's' },
        cym: { pat: 'X.......', step: 'w' },
      },
    },
  },
  intro: ['I'],
  body: ['A', 'A2', 'B', 'E', 'A3'],
};

// ===========================================================================
//  CHAPTER — title-card sting (does not loop)
// ===========================================================================
const chapter: TrackDef = {
  id: 'chapter',
  title: 'A New Chapter',
  desc: 'Chapter card sting: timpani swell, the Oath motif in brass, D major close.',
  bpm: 72,
  loop: false,
  voices: {
    tpt: { i: 'trumpet', pan: 0.2, vol: 0.9 },
    hn: { i: 'horn', pan: -0.2, vol: 0.85 },
    tbn: { i: 'trombone', pan: 0.3, vol: 0.5 },
    ch: { i: 'choir', pan: 0, vol: 0.45 },
    str: { i: 'strings', pan: 0, vol: 0.4 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.6 },
    hp: { i: 'harp', pan: -0.4, vol: 0.9 },
    timp: { i: 'timpani', pan: 0, vol: 0.8 },
    cym: { i: 'cymbal', pan: 0.2, vol: 0.55 },
    bd: { i: 'bassDrum', pan: 0, vol: 0.55 },
  },
  sections: {
    S: {
      ch: 'Dm | Dm | Bb C | D',
      rit: 0.72,
      v: {
        tpt: '@ff rw | a4q d5h. | f5h e5h | d5w',
        hn: { ref: 'tpt', tr: -12, vel: 0.9 },
        tbn: { pad: 3, at: 'd3', hi: 'd4', pat: 'rw | cw | ch ch | cw' },
        ch: { pad: 4, at: 'd4', hi: 'f5', vel: 0.9 },
        str: { pad: 4, at: 'a3', hi: 'a4', vel: 0.8 },
        cb: '@mf d2w | d2w | bb1h c2h | d2w',
        timp: '@p d2w~< | @ff d2q rh. | bb2h c3h | d2q rh.',
        cym: { pat: 'RX.X', step: 'w' },
        bd: { pat: '.X.X', step: 'w' },
        hp: 'rw | rw | rw | @f d4s f#4 a4 d5 f#5 a5 d6 f#6 rh',
      },
    },
  },
  body: ['S'],
};

// ===========================================================================
//  FORMATION — "Council of Arms" (D dorian, calm & contemplative menu)
// ===========================================================================
const FORM_A = '@mp a4h. f4q | g4q. a4i b4h | a4q. g4i f4q d4q | d4w | f4q. g4i bb4q d5q | e5h. c5q | c5q. b4i a4q e4q | f4h d4h';
const formation: TrackDef = {
  id: 'formation',
  title: 'Council of Arms',
  desc: 'Formation / party menu: calm dorian clarinet and flute over harp.',
  bpm: 80,
  gain: 1.88,
  voices: {
    cl: { i: 'clarinet', pan: 0.12, vol: 1.4 },
    fl: { i: 'flute', pan: -0.15, vol: 1.1 },
    vln: { i: 'violin', pan: -0.3, vol: 0.75 },
    hp: { i: 'harp', pan: -0.4, vol: 1 },
    str: { i: 'strings', pan: 0, vol: 0.45 },
    vc: { i: 'celli', pan: 0.3, vol: 0.55 },
    cb: { i: 'contrabass', pan: 0.35, vol: 0.55 },
    hn: { i: 'horn', pan: 0.2, vol: 0.4 },
    cel: { i: 'celesta', pan: 0.35, vol: 0.9 },
  },
  sections: {
    A: {
      ch: 'Dm | G | Dm | G | Bb | C | Am | Dm',
      v: {
        cl: FORM_A,
        hp: { pat: '1 5 8 10 12 10 8 5', at: 'd2', vel: 0.6 },
        str: { pad: 3, at: 'f3', hi: 'f4', vel: 0.4 },
        cb: { pat: '0w', at: 'a1', vel: 0.45 },
        cel: '@p rw | rh d6q rq | rw | rh b5q rq | rw | rh g6q rq | rw | rh a5q rq',
      },
    },
    B: {
      base: 'A',
      ch: 'F | C | G | Dm | F | C | Em | A',
      mute: ['cl', 'cel'],
      v: {
        fl: '@mp c5h. a4q | e5q. d5i c5h | d5h b4h | a4w | f5h. c5q | e5q. g5i e5q c5q | b4h e5h | c#5h e5h',
        vc: '@p f3h a3h | e3h g3h | g3h d3h | f3w | a3h f3h | g3h e3h | e3h g3h | e3h c#3h',
      },
    },
    A2: {
      base: 'A',
      mute: ['cel'],
      v: {
        fl: { ref: 'A.cl', tr: 12, vel: 0.9 },
        cl: '@p d4w | d4w | d4w | d4w | d4w | e4w | e4w | d4w',
      },
    },
    C: {
      base: 'A',
      ch: 'Gm | Dm | Gm | A | Bb | F | Gm | A',
      mute: ['cl', 'cel'],
      v: {
        vln: '@mp d5h. bb4q | a4h f4h | g4q. a4i bb4q d5q | c#5w | d5q. f5i d5q bb4q | c5h a4h | bb4q. c5i d5q g5q | e5h c#5h',
        hn: '@p bb3w | a3w | bb3w | a3w | bb3w | a3w | bb3w | a3w',
      },
    },
  },
  body: ['A', 'B', 'A2', 'C'],
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
  battle1,
  battle2,
  battle3,
  boss,
  umbral,
  finalBoss,
  victory,
  defeat,
  somber,
  tension,
  church,
  heroic,
  romance,
  campfire,
  dungeon,
  ending,
  credits,
  chapter,
  formation,
};

export const TRACK_IDS = Object.keys(TRACKS);
