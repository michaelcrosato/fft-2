// Between battles: the road, towns, taverns, the formation screen and the campfire.
import { arp, bassline, hits, hold, mel, part, prog, type Song } from './dsl';
import { FEALTY, FEALTY_CHORDS } from './themes';

export const worldmap: Song = (() => {
  const tune1 = 'G4:1 A4:.5 B4:.5 D5:1 B4:1 | C5:1 B4:.5 A4:.5 G4:2 | F4:1 G4:.5 A4:.5 C5:1 A4:1 | G4:3 r:1';
  const tune2 = 'D5:1 C5:.5 B4:.5 A4:1 G4:1 | F4:1 E4:.5 F4:.5 G4:2 | A4:1 C5:1 B4:1 A4:1 | G4:4';
  const chordsA = 'G:4 C:2 G:2 F:4 G:4 G:2 F:2 F:2 C:2 F:2 G:2 G:4';
  // the bridge quotes Fealty, moved to C
  const quote = 'G4:1 C5:2 B4:.5 A4:.5 | G4:1.5 E4:.5 F4:1 G4:1 | A4:1 D5:2 C5:.5 B4:.5 | A4:3 r:1';
  const body = prog(`${chordsA} ${chordsA} C:4 C:2 F:2 Dm:2 G:2 Am:4 F:4 Em:4 F:4 G:4`);
  return {
    id: 'worldmap', title: 'The Roads of Ivaldis', key: 'G Mixolydian', bpm: 96, room: 'room',
    intro: { beats: 8, parts: [
      part('lute', arp(prog('G:4 F:4'), '0 1 2 1', { center: 55, v: 0.5 }), { pan: -0.2 }),
      part('pizz', bassline(prog('G:4 F:4'), 'R . 5 .', { center: 43, v: 0.55 })),
    ] },
    body: { beats: 96, parts: [
      part('flute', mel(`${tune1} ${tune2}`, { v: 0.68 }), { pan: 0.15, send: 0.35 }),
      part('flute', mel(`${tune1} ${tune2}`, { at: 32, tr: 12, v: 0.6 }), { pan: 0.15, send: 0.35 }),
      part('strings', mel(`${tune1} ${tune2}`, { at: 32, v: 0.42 }), { pan: -0.1, send: 0.35 }),
      part('reed', mel(quote, { at: 64, v: 0.62 }), { pan: 0.1, send: 0.35 }),
      part('lute', arp(body, '0 1 2 1', { center: 55, v: 0.42 }), { pan: -0.2, send: 0.25 }),
      part('pad', hold(prog('C:4 C:2 F:2 Dm:2 G:2 Am:4 F:4 Em:4 F:4 G:4', 64), { center: 57, v: 0.3 }), { send: 0.4 }),
      part('pizz', bassline(body, 'R . 5 .', { center: 43, v: 0.55 })),
      part('framedrum', hits('x . . . o . . .', { beats: 96, v: 0.45 })),
      part('shaker', hits('. o . o', { beats: 96, v: 0.35 })),
    ] },
  };
})();

export const town: Song = (() => {
  const phrase1 = 'C5:.5 A4:.5 F4:.5 A4:.5 C5:1 F5:1 | E5:.5 D5:.5 C5:.5 Bb4:.5 A4:2 | Bb4:.5 C5:.5 D5:.5 Bb4:.5 G4:1 C5:1 | A4:.5 G4:.5 F4:.5 G4:.5 A4:2';
  const phrase2 = 'D5:.5 C5:.5 Bb4:.5 A4:.5 G4:1 Bb4:1 | A4:.5 G4:.5 F4:.5 E4:.5 D4:2 | E4:.5 F4:.5 G4:.5 A4:.5 Bb4:1 G4:1 | F4:3 r:1';
  const chords = 'F:4 C7:2 F:2 Bb:2 C:2 F:4 Gm:4 F:2 Dm:2 C:2 C7:2 F:4';
  const bridge = 'Bb:4 C:4 Am:4 Dm:4 Gm:4 C:4 F:4 C7:4';
  const body = prog(`${chords} ${chords} ${bridge}`);
  return {
    id: 'town', title: 'Market Day', key: 'F major', bpm: 108, room: 'room',
    body: { beats: 96, parts: [
      part('dulcimer', mel(`${phrase1} ${phrase2}`, { v: 0.7 }), { pan: 0.15, send: 0.25 }),
      part('flute', mel(`${phrase1} ${phrase2}`, { at: 32, v: 0.62 }), { pan: 0.2, send: 0.3 }),
      part('dulcimer', mel(`${phrase1} ${phrase2}`, { at: 32, tr: -12, v: 0.4 }), { pan: -0.15, send: 0.25 }),
      part('dulcimer', arp(prog(bridge, 64), '0 1 2 3 2 1', { center: 64, v: 0.5 }), { pan: 0.1, send: 0.3 }),
      part('lute', arp(body, '. 1 . 2', { center: 57, v: 0.4 }), { pan: -0.25, send: 0.2 }),
      part('pizz', bassline(body, 'R 5 R 5', { center: 41, v: 0.5 })),
      part('framedrum', hits('x . o . x . o .', { beats: 96, v: 0.4 })),
      part('shaker', hits('o o o o', { beats: 96, v: 0.22 })),
    ] },
  };
})();

// A 6/8 jig: one beat is an eighth note, 330 a minute (55 bars of 6/8).
export const tavern: Song = (() => {
  const a = 'D4:1 F4:1 A4:1 D5:2 A4:1 | G4:1 B4:1 D5:1 C5:2 A4:1 | F4:1 A4:1 D5:1 C5:1 A4:1 F4:1 | G4:1 E4:1 C4:1 E4:3 | D4:1 F4:1 A4:1 D5:2 E5:1 | F5:1 E5:1 D5:1 C5:2 A4:1 | G4:1 A4:1 C5:1 B4:1 G4:1 E4:1 | D4:3 A3:3';
  const b = 'A4:1 D5:1 E5:1 F5:2 E5:1 | D5:1 C5:1 A4:1 G4:2 E4:1 | F4:1 G4:1 A4:1 B4:1 C5:1 D5:1 | E5:3 A4:3 | A4:1 D5:1 E5:1 F5:2 G5:1 | A5:1 G5:1 F5:1 E5:2 C5:1 | D5:1 C5:1 A4:1 G4:1 E4:1 C4:1 | D4:6';
  const ca = 'Dm:6 G:6 Dm:6 C:6 Dm:6 F:6 C:6 Dm:6';
  const cb = 'Dm:6 Am:6 G:6 A:6 Dm:6 F:6 C:6 Dm:6';
  const body = prog(`${ca} ${ca} ${cb} ${cb}`);
  return {
    id: 'tavern', title: 'The Gilded Tankard', key: 'D Dorian', bpm: 330, meter: 6, room: 'room',
    intro: { beats: 12, parts: [part('lute', arp(prog('Dm:6 Dm:6'), '0 . 2 0 . 2', { step: 1, center: 55, v: 0.5 }), { pan: -0.2 })] },
    body: { beats: 192, parts: [
      part('lead', mel(a, { v: 0.62 }), { pan: 0.15, send: 0.2 }),
      part('reed', mel(a, { at: 48, v: 0.6 }), { pan: 0.1, send: 0.2 }),
      part('lead', mel(b, { at: 96, v: 0.62 }), { pan: 0.15, send: 0.2 }),
      part('reed', mel(b, { at: 144, v: 0.58 }), { pan: 0.1, send: 0.2 }),
      part('lead', mel(b, { at: 144, tr: -12, v: 0.35 }), { pan: 0.25, send: 0.2 }),
      part('lute', arp(body, '0 . 2 0 . 2', { step: 1, center: 55, v: 0.42 }), { pan: -0.2, send: 0.15 }),
      part('pizz', bassline(body, 'R . . 5 . .', { center: 38, v: 0.55 })),
      part('framedrum', hits('x . o x . o', { step: 1, beats: 192, v: 0.45 })),
      part('shaker', hits('. o . . o .', { step: 1, beats: 192, v: 0.3 })),
    ] },
  };
})();

export const formation: Song = (() => {
  const tune = 'G4:.75 G4:.25 E5:1 D5:1 C5:1 | F#4:.75 G4:.25 A4:1 D5:2 | B4:.75 B4:.25 F#5:1 E5:1 D5:1 | G5:2 E5:2 | C5:.75 C5:.25 E5:1 D5:1 C5:1 | D5:1 F#5:1 A5:2 | B4:1 D5:1 G5:1 F#5:1 | E5:4';
  const chords = 'C:4 D:4 Bm:4 Em:4 Am:4 D:4 G:4 C:4';
  const body = prog(`${chords} ${chords} Am:4 Em:4 D:4 D:4 Am:4 Bm:4 C:4 D:4`);
  return {
    id: 'formation', title: 'Council of War', key: 'C Lydian', bpm: 88, room: 'hall',
    intro: { beats: 8, parts: [part('harp', arp(prog('C:4 D:4'), '0 1 2 3 4 3 2 1', { center: 60, v: 0.42 }), { send: 0.45 })] },
    body: { beats: 96, parts: [
      part('flute', mel(tune, { v: 0.6 }), { pan: 0.15, send: 0.45 }),
      part('strings', mel(tune, { at: 32, tr: -12, v: 0.5 }), { pan: -0.1, send: 0.45 }),
      part('harp', arp(body, '0 1 2 3 4 3 2 1', { center: 60, v: 0.36 }), { pan: -0.2, send: 0.45 }),
      part('pad', hold(body, { center: 57, v: 0.3 }), { send: 0.5 }),
      part('pizz', bassline(body, 'R . 5 .', { center: 40, v: 0.45 })),
      part('shaker', hits('o . o .', { beats: 96, v: 0.25 })),
      part('snare', hits('. . o . . . o .', { beats: 96, v: 0.18 })),
    ] },
  };
})();

export const campfire: Song = (() => {
  const later = 'Em:4 C:4 G:4 D:4 Em:4 C:4 Am:4 D:4';
  const body = prog(`${FEALTY_CHORDS} ${FEALTY_CHORDS} ${later}`);
  return {
    id: 'campfire', title: 'Under the Same Stars', key: 'G major', bpm: 70, room: 'room',
    body: { beats: 96, parts: [
      part('lute', mel(FEALTY, { v: 0.62 }), { pan: 0.05, send: 0.25 }),
      part('flute', mel(FEALTY, { at: 32, tr: 12, v: 0.42 }), { pan: 0.2, send: 0.4 }),
      part('lute', arp(prog(`${FEALTY_CHORDS} ${later}`, 32), '0 1 2 1', { center: 55, v: 0.36 }), { pan: -0.15, send: 0.25 }),
      part('pizz', bassline(body, 'R . . .', { center: 43, v: 0.35 })),
      part('night', hits('x . . .', { step: 1, beats: 96, v: 0.7 })),
    ] },
  };
})();
