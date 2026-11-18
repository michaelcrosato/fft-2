// Scene moods and the two battle stings.
import { arp, bassline, hits, hold, mel, part, prog, roll, type Song } from './dsl';
import { FEALTY_MINOR, FEALTY_MINOR_CHORDS, ORIANE, ORIANE_CHORDS, SANCTUM, SANCTUM_CHORDS } from './themes';

export const victory: Song = {
  id: 'victory', title: 'The Field Is Ours', key: 'D major', bpm: 120, room: 'hall', once: true,
  body: { beats: 20, parts: [
    part('brass', mel('D4:.5 D4:.25 D4:.25 A4:1 G4:.5 F#4:.5 E4:1 | F#4:.5 G4:.5 A4:1 D5:2! | D5:1.5 E5:.5 F#5:1 A5:1 | D5:4!', { v: 0.8 }), { send: 0.35 }),
    part('horn', mel('[D3,A3]:3 [A3,C#4]:1 [D3,F#3]:2 [A3,E4]:2 [D3,A3]:4 [D3,F#3,A3]:4 [D3,A3,D4]:4!', { v: 0.6 }), { send: 0.35 }),
    part('strings', hold(prog('D:3 A:1 D:2 A:2 D:4 D:4 D:4'), { center: 62, v: 0.5 }), { send: 0.4 }),
    part('timpani', [...mel('D2:1! r:3 A2:1 r:1 D2:2 r:4 r:4', { v: 0.8 }), ...roll('A2', 12, 16, 0.25, 0.3, 0.85), ...mel('D2:4!', { at: 16, v: 0.9 })], { send: 0.3 }),
    part('cymbal', mel('C4:4', { at: 16, v: 0.65 }), { send: 0.4 }),
  ] },
};

export const defeat: Song = {
  id: 'defeat', title: 'The Chronicle Falls Silent', key: 'D minor', bpm: 60, room: 'hall', once: true,
  body: { beats: 12, parts: [
    part('reed', mel('A3:1 D4:2 C#4:.5 Bb3:.5 | A3:1.5 F3:.5 G3:1 A3:1 | D4:4', { v: 0.62 }), { send: 0.5 }),
    part('strings', hold(prog('Dm:4 Dm:2 Gm:2 Dm:4'), { center: 52, v: 0.45 }), { send: 0.5 }),
    part('bass', mel('D2:8 D2:4', { v: 0.45 }), { send: 0.3 }),
  ] },
};

export const somber: Song = (() => {
  const tail = 'C:4 Am:4 B7:4 Em:4';
  const body = prog(`${FEALTY_MINOR_CHORDS} ${FEALTY_MINOR_CHORDS} ${tail}`);
  return {
    id: 'somber', title: 'Ashes', key: 'E minor', bpm: 60, room: 'hall',
    body: { beats: 80, parts: [
      part('reed', mel(FEALTY_MINOR, { v: 0.58 }), { pan: 0.1, send: 0.5 }),
      part('strings', mel(FEALTY_MINOR, { at: 32, tr: 12, v: 0.55 }), { pan: -0.1, send: 0.55 }),
      part('strings', hold(body, { center: 52, v: 0.32 }), { send: 0.55 }),
      part('harp', arp(prog(tail, 64), '0 1 2 3 2 1', { step: 0.667, center: 55, v: 0.3 }), { send: 0.5 }),
      part('bass', bassline(body, 'R - - -', { center: 40, v: 0.35 }), { send: 0.3 }),
    ] },
  };
})();

export const tension: Song = (() => {
  // the Sanctum, moved to A Phrygian and broken into fragments
  const frag = (at: number, tr = 5) => mel('E4:1 F4:1 E4:1 D4:1 | E4:2', { at, tr, v: 0.55 });
  const chords = 'Am:4 Bb:4 Am:4 Gm:4 Am:4 F:4 E:4 E:4';
  const body = prog(`${chords} ${chords} ${chords} Dm:4 Bb:4 E:8`);
  return {
    id: 'tension', title: 'Whispers in the Cloister', key: 'A Phrygian', bpm: 90, room: 'hall',
    body: { beats: 112, parts: [
      part('reed', [...frag(4), ...frag(36, 10), ...frag(68), ...frag(84)], { pan: 0.15, send: 0.45 }),
      part('celesta', [...mel('A5:1 r:7 Bb5:1 r:7 A5:1 r:7 E5:1 r:7', { v: 0.4 }), ...mel('A5:1 r:7 Bb5:1 r:7 A5:1 r:7 E5:1 r:7', { at: 64, v: 0.4 })], { pan: -0.2, send: 0.6 }),
      part('strings', arp(body, '0 0 0 0', { step: 0.25, center: 45, v: 0.28, len: 0.22 }), { pan: -0.1, send: 0.3 }),
      part('pad', hold(body, { center: 52, v: 0.28 }), { send: 0.5 }),
      part('bass', bassline(body, 'R - - -', { center: 33, v: 0.42 })),
      part('shaker', hits('. o . o', { beats: 112, v: 0.2 })),
      part('tom', hits('x . . . . . . . . . . . . . . .', { beats: 112, p: 40, v: 0.45 }), { send: 0.4 }),
    ] },
  };
})();

export const church: Song = (() => {
  const answer = 'G4:1 A4:1 G4:1 F4:1 | E4:2 D4:1 E4:1 | F4:1 G4:1 A4:1 G4:1 | E4:4';
  const answerChords = 'C:4 Dm:2 Am:2 F:2 G:2 E5:4';
  const bridge = 'Am:4 Dm:4 F:4 G:4';
  const body = prog(`${SANCTUM_CHORDS} ${answerChords} ${SANCTUM_CHORDS} ${answerChords} ${bridge} ${SANCTUM_CHORDS}`);
  return {
    id: 'church', title: 'The Glorian Liturgy', key: 'E Phrygian', bpm: 70, room: 'cathedral',
    body: { beats: 96, parts: [
      part('choir', [...mel(SANCTUM, { v: 0.6 }), ...mel(answer, { at: 16, v: 0.6 }), ...mel(answer, { at: 48, tr: 12, v: 0.5 }), ...mel(SANCTUM, { at: 80, v: 0.62 })], { send: 0.65 }),
      part('organ', [...mel(SANCTUM, { at: 32, tr: 12, v: 0.5 })], { send: 0.6 }),
      part('organ', hold(body, { center: 52, v: 0.45, bass: true }), { send: 0.6 }),
      part('bell', mel('E4:4 r:28 E4:4 r:28 E4:4', { v: 0.5 }), { send: 0.7 }),
    ] },
  };
})();

export const heroic: Song = (() => {
  const major = 'D4:1.5 E4:.5 F#4:1 A4:1 | G4:2 F#4:1 E4:1 | D4:1 C#4:1 D4:1 F#4:1 | E4:3 r:1 | A4:1.5 B4:.5 C#5:1 D5:1 | C#5:1 A4:1 G4:1 E4:1 | F#4:1.5 G4:.5 E4:1 C#4:1 | D4:4';
  const chords = 'D:4 G:2 A:2 D:4 A:4 D:2 Bm:2 A7:4 Bm:2 A:2 D:4';
  const rise = 'G4:2 B4:2 | D5:4 | E5:2 D5:1 B4:1 | C#5:4 | B4:2 D5:2 | F#5:4 | E5:2 D5:1 C#5:1 | A4:4';
  const riseChords = 'G:4 D:4 Em:4 A:4 G:4 D:4 Bm:4 A:4';
  const body = prog(`${chords} ${chords} ${riseChords} ${chords}`);
  return {
    id: 'heroic', title: 'For the Low-Born', key: 'D major', bpm: 112, room: 'hall',
    body: { beats: 128, parts: [
      part('brass', mel(major, { v: 0.76 }), { pan: 0.1, send: 0.3 }),
      part('strings', mel(major, { at: 32, tr: 12, v: 0.68 }), { pan: -0.1, send: 0.35 }),
      part('horn', mel(rise, { at: 64, v: 0.7 }), { pan: 0.1, send: 0.35 }),
      part('brass', mel(major, { at: 96, v: 0.8 }), { pan: 0.1, send: 0.3 }),
      part('strings', mel(major, { at: 96, tr: 12, v: 0.62 }), { pan: -0.15, send: 0.35 }),
      part('strings', arp(body, '0 1 2 1', { step: 0.5, center: 55, v: 0.34 }), { pan: -0.25, send: 0.25 }),
      part('horn', hold(prog(chords, 32), { center: 60, v: 0.3 }), { pan: 0.25, send: 0.35 }),
      part('bass', bassline(body, 'R . 5 .', { center: 38, v: 0.55 })),
      part('timpani', bassline(body, 'R . . . 5 . . .', { step: 0.5, center: 41, v: 0.5 }), { send: 0.3 }),
      part('snare', hits('. . o . . . x .', { beats: 128, v: 0.35 })),
      part('cymbal', mel('C4:4 r:60 C4:4 r:28 C4:4', { v: 0.5 }), { send: 0.35 }),
    ] },
  };
})();

export const romance: Song = (() => {
  const answer = 'A4:1 Bb4:.5 C5:.5 D5:1 C5:1 | Bb4:2 A4:1 G4:1 | F4:1 G4:.5 A4:.5 Bb4:1 G4:1 | C5:4';
  const answerChords = 'F:2 Bb:2 Gm:2 C:2 Dm:2 Gm:2 C:4';
  const bridge = 'Dm:4 Am:4 Bb:4 F:4 Gm:4 C:4 F:4 C7:4';
  const bridgeLine = 'D5:2 C5:1 A4:1 | C5:2 A4:2 | Bb4:2 D5:1 C5:1 | A4:4 | G4:2 Bb4:1 A4:1 | G4:2 E4:2 | F4:2 A4:1 C5:1 | E5:4';
  const body = prog(`${ORIANE_CHORDS} ${answerChords} ${ORIANE_CHORDS} ${answerChords} ${bridge}`);
  return {
    id: 'romance', title: 'A Princess Who Was Never Wanted', key: 'F major', bpm: 76, room: 'hall',
    body: { beats: 96, parts: [
      part('flute', [...mel(ORIANE, { tr: 12, v: 0.6 }), ...mel(answer, { at: 16, v: 0.58 })], { pan: 0.15, send: 0.5 }),
      part('strings', [...mel(ORIANE, { at: 32, tr: 12, v: 0.6 }), ...mel(answer, { at: 48, v: 0.58 })], { pan: -0.1, send: 0.5 }),
      part('reed', mel(bridgeLine, { at: 64, v: 0.55 }), { pan: 0.1, send: 0.5 }),
      part('harp', arp(body, '0 1 2 3 2 1 2 1', { center: 57, v: 0.34 }), { pan: -0.2, send: 0.5 }),
      part('pad', hold(body, { center: 55, v: 0.3 }), { send: 0.55 }),
      part('pizz', bassline(body, 'R . 5 .', { center: 41, v: 0.38 })),
    ] },
  };
})();

export const dungeon: Song = (() => {
  const line = 'D5:2 Eb5:1 C5:1 | D5:4 | A4:2 Bb4:1 G4:1 | A4:4 | F4:2 G4:1 Eb4:1 | D4:4 | r:4 | r:4';
  return {
    id: 'dungeon', title: 'The Midnight Deep', key: 'D Phrygian', bpm: 84, room: 'cave',
    body: { beats: 128, parts: [
      part('bell', [...mel(line, { v: 0.45 }), ...mel(line, { at: 64, tr: -7, v: 0.4 })], { send: 0.75 }),
      part('celesta', [...mel(line, { at: 34, v: 0.3 }), ...mel(line, { at: 98, tr: -7, v: 0.28 })], { pan: 0.3, send: 0.8 }),
      part('choir', hold(prog('Dm:8 Eb:8 Cm:8 Dm:8 Dm:8 Eb:8 Bb:8 Dm:8 Dm:8 Eb:8 Cm:8 Dm:8 Dm:8 Eb:8 Bb:8 Dm:8'), { center: 50, v: 0.32 }), { send: 0.7 }),
      part('drone', mel('D2:64 D2:32 A1:32', { v: 0.5 }), { send: 0.5 }),
      part('tom', hits('x . . . . . . . . . . . o . . .', { beats: 128, p: 38, v: 0.45 }), { send: 0.6 }),
    ] },
  };
})();

