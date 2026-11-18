// Battle music, all built on the Banner (D), with the Sanctum (C) for the Church's demons.
import { arp, bassline, hits, hold, mel, part, prog, roll, stabs, transpose, type Song } from './dsl';
import { BANNER, BANNER_CHORDS, FEALTY_MINOR, FEALTY_MINOR_CHORDS, SANCTUM } from './themes';

/** A driving string ostinato over changes, in sixteenths. */
const ostinato = (p: ReturnType<typeof prog>, center: number, v = 0.42) => arp(p, '0 0 2 0 1 0 2 0', { step: 0.25, center, v, len: 0.22 });

export const battle1: Song = (() => {
  const dev = 'Bb:4 C:4 Dm:4 A:4 Bb:4 C:4 Gm:4 A:4';
  const body = prog(`${BANNER_CHORDS} ${BANNER_CHORDS} ${dev} ${BANNER_CHORDS} ${BANNER_CHORDS}`);
  const devLine = 'F5:1 E5:1 D5:1 C5:1 | E5:2 G5:2 | F5:1 E5:1 D5:1 A4:1 | C#5:4 | D5:1 C5:1 Bb4:1 A4:1 | G4:2 C5:2 | Bb4:1 A4:1 G4:1 F4:1 | E4:4';
  return {
    id: 'battle1', title: 'Steel and Banners', key: 'D minor', bpm: 132, room: 'hall',
    intro: { beats: 8, parts: [
      part('strings', ostinato(prog('Dm:4 A:4'), 50)),
      part('timpani', mel('D2:1 r:1 D2:1 r:1 A2:1 r:1 A2:.5 A2:.5 D2:1', { v: 0.7 }), { send: 0.25 }),
    ] },
    body: { beats: 96, parts: [
      part('brass', mel(`${BANNER} ${BANNER}`, { v: 0.78 }), { pan: 0.1, send: 0.3 }),
      part('strings', mel(BANNER, { at: 16, tr: 12, v: 0.55 }), { pan: -0.15, send: 0.3 }),
      part('strings', mel(devLine, { at: 32, v: 0.7 }), { pan: -0.1, send: 0.35 }),
      part('horn', mel(`${BANNER} ${BANNER}`, { at: 64, v: 0.72 }), { pan: 0.15, send: 0.3 }),
      part('strings', mel(`${BANNER} ${BANNER}`, { at: 64, tr: 12, v: 0.62 }), { pan: -0.15, send: 0.3 }),
      part('strings', ostinato(body, 50), { pan: -0.25, send: 0.15 }),
      part('brass', stabs(prog(dev, 32), 'x . . . x . o .', { center: 60, v: 0.5 }), { pan: 0.2, send: 0.25 }),
      part('bass', bassline(body, 'R . R 5', { step: 0.5, center: 38, v: 0.6 })),
      part('timpani', bassline(body, 'R . . . 5 . . .', { step: 0.5, center: 41, v: 0.65 }), { send: 0.25 }),
      part('kick', hits('x . . . x . . .', { beats: 96, v: 0.55 })),
      part('snare', hits('. . x . . . x .', { beats: 96, v: 0.5 })),
      part('snare', hits('. o . o . o . o', { step: 0.25, beats: 96, v: 0.16 })),
      part('cymbal', mel('C4:4 r:28 C4:4 r:28 C4:4', { v: 0.55 }), { send: 0.3 }),
    ] },
  };
})();

export const battle2: Song = (() => {
  const theme = transpose(mel(BANNER), -2);
  const chords = 'Cm:2 Bb:2 Eb:2 Fm:2 Cm:2 Eb:2 G7:2 Cm:2';
  const dev = 'Ab:4 Bb:4 Cm:4 G:4 Ab:4 Fm:4 G:4 G7:4';
  const body = prog(`${chords} ${chords} ${dev} ${chords} ${chords}`);
  const line = 'Eb5:2 D5:1 C5:1 | D5:2 Bb4:2 | C5:1 D5:1 Eb5:1 G5:1 | F5:4 | Eb5:2 D5:1 C5:1 | Ab4:2 C5:2 | B4:2 D5:2 | G4:4';
  return {
    id: 'battle2', title: 'Iron Rain', key: 'C minor', bpm: 120, room: 'hall',
    intro: { beats: 8, parts: [
      part('choir', hold(prog('Cm:4 G:4'), { center: 55, v: 0.5 }), { send: 0.5 }),
      part('bass', mel('C2:4 G1:4', { v: 0.6 })),
      part('timpani', roll('C2', 4, 16, 0.25, 0.2, 0.8), { send: 0.3 }),
    ] },
    body: { beats: 96, parts: [
      part('horn', transpose(theme, -12).concat(transpose(theme, -12).map((n) => ({ ...n, t: n.t + 16 }))), { send: 0.3 }),
      part('brass', mel(line, { at: 32, v: 0.66 }), { pan: 0.1, send: 0.3 }),
      part('brass', theme.concat(theme.map((n) => ({ ...n, t: n.t + 16 }))).map((n) => ({ ...n, t: n.t + 64, v: 0.75 })), { pan: 0.1, send: 0.3 }),
      part('strings', ostinato(body, 48, 0.4), { pan: -0.2, send: 0.15 }),
      part('choir', hold(body, { center: 55, v: 0.34 }), { send: 0.5 }),
      part('bass', bassline(body, 'R - . R', { step: 0.5, center: 36, v: 0.62 })),
      part('timpani', bassline(body, 'R . . . R . 5 .', { step: 0.5, center: 40, v: 0.6 }), { send: 0.25 }),
      part('kick', hits('x . . x x . . .', { beats: 96, v: 0.55 })),
      part('snare', hits('. . x . . . x .', { beats: 96, v: 0.48 })),
      part('cymbal', mel('C4:4 r:28 C4:4 r:28 C4:4', { v: 0.5 }), { send: 0.3 }),
    ] },
  };
})();

export const battle3: Song = (() => {
  const theme = mel(BANNER, { tr: 2 });
  const chords = 'Em:2 D:2 G:2 Am:2 Em:2 G:2 B7:2 Em:2';
  const body = prog(`${chords} ${chords} ${FEALTY_MINOR_CHORDS} ${chords} ${chords}`);
  return {
    id: 'battle3', title: 'No Quarter', key: 'E minor', bpm: 144, room: 'hall',
    intro: { beats: 8, parts: [
      part('strings', ostinato(prog('Em:4 B7:4'), 52, 0.45)),
      part('tom', hits('x o o x o o x o', { beats: 8, p: 45, v: 0.6 })),
    ] },
    body: { beats: 96, parts: [
      part('brass', theme.concat(theme.map((n) => ({ ...n, t: n.t + 16 }))), { pan: 0.1, send: 0.3 }),
      part('strings', mel(FEALTY_MINOR, { at: 32, tr: 12, v: 0.72 }), { pan: -0.1, send: 0.35 }),
      part('horn', hold(prog(FEALTY_MINOR_CHORDS, 32), { center: 57, v: 0.35 }), { send: 0.35 }),
      part('brass', theme.concat(theme.map((n) => ({ ...n, t: n.t + 16 }))).map((n) => ({ ...n, t: n.t + 64 })), { pan: 0.1, send: 0.3 }),
      part('strings', theme.concat(theme.map((n) => ({ ...n, t: n.t + 16 }))).map((n) => ({ ...n, t: n.t + 64, p: n.p + 12, v: 0.55 })), { pan: -0.15, send: 0.3 }),
      part('strings', ostinato(body, 52, 0.4), { pan: -0.25, send: 0.15 }),
      part('bass', bassline(body, 'R R 5 R', { step: 0.5, center: 40, v: 0.6 })),
      part('tom', hits('x o o x o o x o', { beats: 96, p: 45, v: 0.5 })),
      part('kick', hits('x . . . x . x .', { beats: 96, v: 0.5 })),
      part('snare', hits('. . x . . . x x', { beats: 96, v: 0.45 })),
      part('cymbal', mel('C4:4 r:28 C4:4 r:28 C4:4', { v: 0.5 }), { send: 0.3 }),
    ] },
  };
})();

export const boss: Song = (() => {
  const theme = mel(BANNER, { tr: -3 });
  const chant = mel(SANCTUM, { tr: -5 - 12, v: 0.7 });
  const chords = 'Bm:2 A:2 D:2 Em:2 Bm:2 D:2 F#7:2 Bm:2';
  const ominous = 'Bm:4 C:4 Bm:4 F#:4 Bm:4 C:4 Em:4 F#7:4';
  const body = prog(`${chords} ${chords} ${ominous} ${chords} ${chords}`);
  return {
    id: 'boss', title: 'The Sworn Blade', key: 'B minor', bpm: 150, room: 'hall',
    intro: { beats: 16, parts: [
      part('choir', mel(SANCTUM, { tr: -5, v: 0.6 }), { send: 0.55 }),
      part('drone', mel('B1:16', { v: 0.6 }), { send: 0.3 }),
      part('timpani', [...mel('B1:1 r:3 B1:1 r:3 F#2:1 r:3', { v: 0.7 }), ...roll('B1', 12, 16, 0.25, 0.2, 0.9)], { send: 0.3 }),
    ] },
    body: { beats: 96, parts: [
      part('brass', theme.concat(theme.map((n) => ({ ...n, t: n.t + 16 }))), { pan: 0.1, send: 0.3 }),
      part('choir', [...chant, ...chant.map((n) => ({ ...n, t: n.t + 16 }))].map((n) => ({ ...n, t: n.t + 32, p: n.p + 12 })), { send: 0.55 }),
      part('horn', hold(prog(ominous, 32), { center: 47, v: 0.5 }), { send: 0.35 }),
      part('strings', theme.concat(theme.map((n) => ({ ...n, t: n.t + 16 }))).map((n) => ({ ...n, t: n.t + 64, p: n.p + 12 })), { pan: -0.1, send: 0.3 }),
      part('brass', stabs(prog(`${chords} ${chords}`, 64), 'x . . x . . x .', { center: 59, v: 0.55 }), { pan: 0.2, send: 0.25 }),
      part('strings', ostinato(body, 50, 0.42), { pan: -0.25, send: 0.15 }),
      part('bass', bassline(body, 'R R . R', { step: 0.5, center: 35, v: 0.62 })),
      part('timpani', bassline(body, 'R . . R . . 5 .', { step: 0.5, center: 40, v: 0.65 }), { send: 0.25 }),
      part('kick', hits('x . x . x . x .', { beats: 96, v: 0.5 })),
      part('snare', hits('. . x . . x x .', { beats: 96, v: 0.48 })),
      part('cymbal', mel('C4:4 r:28 C4:4 r:28 C4:4', { v: 0.55 }), { send: 0.3 }),
    ] },
  };
})();

// 7/8, grouped 2+2+3: one beat is an eighth note.
export const umbral: Song = (() => {
  const chant = 'B3:7 C4:7 B3:7 A3:7 | B3:14 D4:7 C4:7 | B3:7 A3:7 G3:7 A3:7 | B3:28';
  const bells = 'F5:1 r:6 B4:1 r:6 C5:1 r:6 F5:1 r:3 E5:1 r:2';
  return {
    id: 'umbral', title: 'What Sleeps in the Stones', key: 'B Locrian, 7/8', bpm: 300, meter: 7, room: 'cathedral',
    body: { beats: 224, parts: [
      part('choir', mel(chant, { v: 0.62 }), { send: 0.6 }),
      part('choir', mel(chant, { at: 112, tr: 6, v: 0.55 }), { send: 0.6 }),
      part('choir', mel(chant, { at: 112, v: 0.4 }), { send: 0.6 }),
      part('drone', mel('B1:112 F2:112', { v: 0.55 }), { send: 0.4 }),
      part('drone', mel('F2:112 B1:112', { v: 0.35 }), { send: 0.4 }),
      part('bell', [...mel(bells, { v: 0.45 }), ...mel(bells, { at: 28, tr: -1, v: 0.4 }), ...mel(bells, { at: 56, v: 0.45 }), ...mel(bells, { at: 84, tr: 1, v: 0.4 }), ...mel(bells, { at: 140, v: 0.45 }), ...mel(bells, { at: 196, tr: 6, v: 0.4 })], { send: 0.7 }),
      part('tom', hits('x . o . x . .', { step: 1, beats: 224, p: 40, v: 0.55 }), { send: 0.3 }),
      part('kick', hits('x . . . x . .', { step: 1, beats: 224, v: 0.4 })),
      part('timpani', mel('B1:28 r:84 F2:28 r:84', { v: 0.6 }), { send: 0.4 }),
    ] },
  };
})();

export const finalBoss: Song = (() => {
  // the Chronicle, forced into C minor
  const fallen = 'C4:1.5 D4:.5 Eb4:1 G4:1 | F4:2 Eb4:1 D4:1 | C4:1 Bb3:1 C4:1 Eb4:1 | D4:3 r:1 | G4:1.5 Ab4:.5 Bb4:1 C5:1 | Bb4:1 G4:1 F4:1 D4:1 | Eb4:1.5 F4:.5 D4:1 Bb3:1 | C4:4';
  const fallenChords = 'Cm:4 Bb:4 Cm:4 G:4 Ab:4 Bb:4 Cm:2 Bb:2 Cm:4';
  // the Sanctum, turned upside down
  const inverted = 'C5:2 B4:2 C5:2 D5:2 | C5:4 Ab4:2 B4:2 | C5:2 D5:2 Eb5:2 D5:2 | C5:8';
  const pound = 'Cm:4 Ab:4 Fm:4 G:4 Cm:4 Ab:4 Fm:4 G:4';
  // Fealty in grief, moved to C minor with its own chords
  const grief = 'Cm:4 Cm:2 Fm:2 Dm7b5:2 G7:2 Ab:4 Cm:4 G:2 Ab:2 Fm:2 G7:2 Cm:4';
  const body = prog(`${fallenChords} ${pound} ${fallenChords} ${grief}`);
  return {
    id: 'finalBoss', title: 'The Crimson Seraph', key: 'C minor', bpm: 160, room: 'cathedral',
    intro: { beats: 16, parts: [
      part('organ', hold(prog('Cm:4 Db:4 Cm:4 G:4'), { center: 55, v: 0.6, bass: true }), { send: 0.5 }),
      part('timpani', roll('C2', 8, 32, 0.25, 0.25, 0.95), { send: 0.3 }),
      part('cymbal', mel('r:15 C4:1', { v: 0.6 }), { send: 0.3 }),
    ] },
    body: { beats: 128, parts: [
      part('brass', mel(fallen, { v: 0.8 }), { pan: 0.1, send: 0.3 }),
      part('choir', mel(inverted, { at: 32, v: 0.7 }), { send: 0.55 }),
      part('organ', hold(prog(pound, 32), { center: 52, v: 0.5, bass: true }), { send: 0.45 }),
      part('strings', mel(fallen, { at: 64, tr: 12, v: 0.72 }), { pan: -0.1, send: 0.3 }),
      part('brass', stabs(prog(fallenChords, 64), 'x . . x . . x .', { center: 58, v: 0.55 }), { pan: 0.2, send: 0.25 }),
      part('strings', mel(FEALTY_MINOR, { at: 96, tr: 8, v: 0.7 }), { pan: -0.1, send: 0.4 }),
      part('choir', hold(prog(grief, 96), { center: 57, v: 0.42 }), { send: 0.55 }),
      part('strings', ostinato(body, 48, 0.4), { pan: -0.25, send: 0.15 }),
      part('bass', bassline(body, 'R R . R', { step: 0.5, center: 36, v: 0.62 })),
      part('timpani', bassline(body, 'R . . R . . 5 .', { step: 0.5, center: 40, v: 0.65 }), { send: 0.25 }),
      part('kick', hits('x . x . x . x .', { beats: 128, v: 0.5 })),
      part('snare', hits('. . x . . x x x', { beats: 128, v: 0.45 })),
      part('cymbal', mel('C4:4 r:28 C4:4 r:28 C4:4 r:28 C4:4', { v: 0.55 }), { send: 0.3 }),
    ] },
  };
})();

