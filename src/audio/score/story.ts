// The frame of the tale: title, prologue, chapter cards, the ending and the credits.
import { arp, bassline, hits, hold, mel, part, prog, roll, type Song } from './dsl';
import { CHRONICLE, CHRONICLE_CHORDS, FEALTY, FEALTY_CHORDS, ORIANE, ORIANE_CHORDS } from './themes';

/** The Chronicle in D major: the theme's resolution, for the ending and the credits. */
export const CHRONICLE_MAJOR = 'D4:1.5 E4:.5 F#4:1 A4:1 | G4:2 F#4:1 E4:1 | D4:1 C#4:1 D4:1 F#4:1 | E4:3 r:1 | A4:1.5 B4:.5 C#5:1 D5:1 | C#5:1 A4:1 G4:1 E4:1 | F#4:1.5 G4:.5 E4:1 C#4:1 | D4:4';
export const CHRONICLE_MAJOR_CHORDS = 'D:4 G:2 A:2 D:4 A:4 D:2 Bm:2 A7:4 Bm:2 A:2 D:4';

export const title: Song = (() => {
  const intro = prog('Dm:4 C:4 Dm:4 C:4');
  const body = prog(`${CHRONICLE_CHORDS} ${CHRONICLE_CHORDS} F:4 C:4 G:4 A:4 Dm:4 C:4 Dm:4 A:4`);
  return {
    id: 'title', title: 'The Chronicle of the Twelve Braves', key: 'D Dorian', bpm: 72, room: 'hall',
    intro: { beats: 16, parts: [
      part('harp', arp(intro, '0 1 2 3 2 1 2 1', { center: 57, v: 0.45 }), { pan: -0.15, send: 0.45 }),
      part('pad', hold(intro, { center: 55, v: 0.45 }), { send: 0.5 }),
      part('timpani', mel("D2:4' r:8 A2:4'"), { send: 0.3 }),
    ] },
    body: { beats: 96, parts: [
      part('horn', mel(CHRONICLE, { v: 0.72 }), { pan: 0.1, send: 0.35 }),
      part('strings', mel(CHRONICLE, { at: 32, tr: 12, v: 0.68 }), { pan: -0.1, send: 0.4 }),
      part('horn', hold(prog(CHRONICLE_CHORDS, 32), { center: 60, v: 0.32 }), { pan: 0.25, send: 0.4 }),
      part('flute', mel('C5:2 A4:1 G4:1 | E4:2 G4:2 | D5:2 B4:1 G4:1 | A4:3 r:1', { at: 64, v: 0.62 }), { pan: 0.15, send: 0.45 }),
      part('flute', mel('D5:1.5 E5:.5 F5:1 A5:1 | G5:2 F5:1 E5:1 | D5:1 C5:1 D5:1 F5:1 | E5:3 r:1', { at: 80, v: 0.55 }), { pan: 0.15, send: 0.5 }),
      part('pad', hold(body, { center: 57, v: 0.4 }), { send: 0.5 }),
      part('harp', arp(body, '0 1 2 3 2 1 2 1', { center: 57, v: 0.38 }), { pan: -0.2, send: 0.45 }),
      part('bass', bassline(body, 'R . 5 .', { center: 38, v: 0.5 }), { send: 0.2 }),
      part('timpani', [...mel("D2:2' r:30 D2:2 r:30 F2:2' r:14 A2:2'", { v: 0.6 }), ...roll('A2', 92, 16, 0.25, 0.2, 0.75)], { send: 0.3 }),
    ] },
  };
})();

export const prologue: Song = (() => {
  const theme = 'A3:1.5 B3:.5 C4:1 E4:1 | D4:2 C4:1 B3:1 | A3:1 G3:1 A3:1 C4:1 | B3:3 r:1 | E4:1.5 F4:.5 G4:1 A4:1 | G4:1 E4:1 D4:1 B3:1 | C4:1.5 D4:.5 B3:1 G3:1 | A3:4';
  const chords = 'Am:4 G:4 Am:4 E:4 C:4 G:4 Am:2 G:2 Am:4';
  const body = prog(`Am:4 G:4 Am:4 E:4 F:4 C:4 G:4 E:4 ${chords} F:4 G:4 Am:8`);
  return {
    id: 'prologue', title: 'The Tale the Church Burned', key: 'A Aeolian', bpm: 66, room: 'hall',
    intro: { beats: 16, parts: [
      part('harp', arp(prog('Am:8 F:8'), '0 1 2 3 4 3 2 1', { center: 55, v: 0.4 }), { send: 0.5 }),
      part('bass', mel("A2:16'", { v: 0.4 }), { send: 0.3 }),
    ] },
    body: { beats: 80, parts: [
      part('flute', mel('A4:1.5 B4:.5 C5:1 E5:1 | D5:2 C5:1 B4:1 | A4:1 G4:1 A4:1 C5:1 | B4:3 r:1', { v: 0.62 }), { send: 0.5 }),
      part('flute', mel(theme, { at: 32, tr: 12, v: 0.66 }), { pan: 0.1, send: 0.5 }),
      part('harp', arp(body, '0 1 2 3 4 3 2 1', { center: 55, v: 0.36 }), { pan: -0.2, send: 0.5 }),
      part('strings', hold(body, { center: 52, v: 0.32 }), { send: 0.5 }),
      part('bass', bassline(body, 'R - - -', { center: 40, v: 0.38 }), { send: 0.3 }),
    ] },
  };
})();

export const chapter: Song = {
  id: 'chapter', title: 'A New Chapter', key: 'D major', bpm: 92, room: 'hall', once: true,
  body: { beats: 16, parts: [
    part('brass', mel('D4:1.5 E4:.5 F#4:1 A4:1 | G4:2 F#4:1 E4:1 | D5:4!', { v: 0.85 }), { send: 0.35 }),
    part('horn', mel('[D3,A3]:4 [G3,B3]:2 [A3,C#4]:2 [D3,A3,D4]:4!', { v: 0.6 }), { send: 0.35 }),
    part('strings', hold(prog('D:4 G:2 A:2 D:6'), { center: 62, v: 0.5 }), { send: 0.4 }),
    part('timpani', [...mel('D2:1! r:3 r:4 A2:1 r:1 A2:1 r:1 D2:2!', { v: 0.8 }), ...roll('A2', 10, 8, 0.25, 0.3, 0.8)], { send: 0.3 }),
    part('cymbal', mel('r:12 C4:4', { v: 0.7 }), { send: 0.4 }),
  ] },
};

export const ending: Song = (() => {
  const fealty = prog(`${FEALTY_CHORDS} ${FEALTY_CHORDS}`);
  const major = prog(`${CHRONICLE_MAJOR_CHORDS} ${CHRONICLE_MAJOR_CHORDS} D:4`);
  return {
    id: 'ending', title: 'Two Riders on the Hill', key: 'G major, then D major', bpm: 70, room: 'hall', once: true,
    intro: { beats: 64, bpm: 70, parts: [
      part('flute', mel(FEALTY, { tr: 12, v: 0.6 }), { send: 0.5 }),
      part('strings', mel(FEALTY, { at: 32, tr: 12, v: 0.62 }), { send: 0.5 }),
      part('harp', arp(fealty, '0 1 2 3 2 1 2 1', { center: 55, v: 0.36 }), { send: 0.5 }),
      part('choir', hold(prog(FEALTY_CHORDS, 32), { center: 59, v: 0.4 }), { send: 0.6 }),
      part('bass', bassline(fealty, 'R . . .', { center: 40, v: 0.4 })),
    ] },
    body: { beats: 68, bpm: 84, parts: [
      part('horn', mel(CHRONICLE_MAJOR, { v: 0.7 }), { send: 0.4 }),
      part('strings', mel(CHRONICLE_MAJOR, { at: 32, tr: 12, v: 0.72 }), { send: 0.45 }),
      part('choir', hold(major, { center: 62, v: 0.42 }), { send: 0.6 }),
      part('harp', arp(major, '0 1 2 3 2 1 2 1', { center: 57, v: 0.34 }), { send: 0.5 }),
      part('bass', bassline(major, 'R . 5 .', { center: 38, v: 0.45 })),
      part('timpani', [...mel('D2:2 r:30 D2:2 r:26', { v: 0.55 }), ...roll('A2', 60, 16, 0.25, 0.2, 0.7), ...mel('D2:4!', { at: 64, v: 0.8 })], { send: 0.3 }),
      part('cymbal', mel('C4:4', { at: 64, v: 0.6 }), { send: 0.4 }),
    ] },
  };
})();

export const credits: Song = (() => {
  const banner = 'D4:.75 D4:.25 A4:1 G4:.75 F#4:.25 E4:1 | F#4:.75 G4:.25 A4:1 B4:.75 A4:.25 G4:1 | A4:.75 A4:.25 D5:1 C#5:.75 B4:.25 A4:1 | G4:.5 F#4:.5 E4:.5 C#4:.5 D4:2';
  const bannerChords = 'D:2 A:2 D:2 G:2 D:2 A:2 A7:2 D:2';
  const a = prog(CHRONICLE_MAJOR_CHORDS);
  const b = prog(FEALTY_CHORDS, 32);
  const e = prog(`${ORIANE_CHORDS} ${ORIANE_CHORDS}`, 64);
  const d = prog(`${bannerChords} ${bannerChords}`, 96);
  const f = prog(`${CHRONICLE_MAJOR_CHORDS}`, 128);
  const all = [...a, ...b, ...e, ...d, ...f];
  return {
    id: 'credits', title: 'The Twelve Braves (credits)', key: 'D major, G major, F major', bpm: 96, room: 'hall',
    body: { beats: 160, parts: [
      part('horn', mel(CHRONICLE_MAJOR, { v: 0.7 }), { send: 0.35 }),
      part('flute', mel(FEALTY, { at: 32, tr: 12, v: 0.62 }), { send: 0.45 }),
      part('flute', mel(ORIANE, { at: 64, tr: 12, v: 0.6 }), { send: 0.45 }),
      part('strings', mel(ORIANE, { at: 80, tr: 12, v: 0.62 }), { send: 0.45 }),
      part('brass', mel(`${banner} ${banner}`, { at: 96, v: 0.72 }), { send: 0.35 }),
      part('strings', mel(CHRONICLE_MAJOR, { at: 128, tr: 12, v: 0.72 }), { send: 0.45 }),
      part('pad', hold(all, { center: 58, v: 0.38 }), { send: 0.5 }),
      part('harp', arp([...a, ...b, ...e], '0 1 2 3 2 1 2 1', { center: 57, v: 0.32 }), { send: 0.45 }),
      part('strings', arp([...d, ...f], '0 0 2 0 1 0 2 0', { step: 0.25, center: 52, v: 0.32 }), { send: 0.3 }),
      part('bass', bassline(all, 'R . 5 .', { center: 38, v: 0.45 })),
      part('snare', hits('. . x . . . x .', { beats: 32, at: 96, v: 0.35 })),
      part('timpani', [...mel('D2:2 r:30 G2:2 r:30 F2:2 r:30 D2:2 r:30', { v: 0.5 }), ...roll('A2', 156, 16, 0.25, 0.2, 0.7)], { send: 0.3 }),
    ] },
  };
})();

