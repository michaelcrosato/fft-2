import { describe, it, expect } from 'vitest';
import { TRACKS } from '../src/audio/tracks';
import { compileTrack, parseMelody, parseChord, parseDur, noteToMidi, sigToBarBeats } from '../src/audio/notation';
import { SFX } from '../src/audio/sfx';
import { INSTRUMENTS } from '../src/audio/synth';
import { audio, AudioEngine } from '../src/audio/audio';

const REQUIRED_TRACKS = [
  'title', 'prologue', 'worldmap', 'town', 'tavern', 'battle1', 'battle2', 'battle3', 'boss', 'umbral',
  'finalBoss', 'victory', 'defeat', 'somber', 'tension', 'church', 'heroic', 'romance', 'campfire',
  'dungeon', 'ending', 'credits', 'chapter', 'formation',
];

const REQUIRED_SFX = [
  'cursor', 'confirm', 'cancel', 'error', 'menuOpen', 'step', 'jump', 'land', 'swing', 'hit', 'hitHeavy',
  'crit', 'miss', 'block', 'arrow', 'gun', 'throw', 'magic', 'charge', 'fire', 'ice', 'bolt', 'water',
  'earth', 'wind', 'holy', 'dark', 'poison', 'heal', 'buff', 'debuff', 'status', 'time', 'summon',
  'explosion', 'meteor', 'song', 'dance', 'steal', 'item', 'ko', 'crystal', 'chest', 'levelUp', 'jobUp',
  'learn', 'gil', 'victory', 'defeat', 'turn', 'textBlip', 'door', 'kweh', 'roar', 'demon', 'thunderclap',
  'bell',
];

/** tracks that intentionally do not follow the 45–120 s rule */
const SHORT_OK = new Set(['chapter']);

describe('audio notation', () => {
  it('parses durations, notes and chords', () => {
    expect(parseDur('q')).toBe(1);
    expect(parseDur('h.')).toBe(3);
    expect(parseDur('hq')).toBe(3);
    expect(parseDur('i.')).toBe(0.75);
    expect(parseDur('')).toBeNull();
    expect(noteToMidi('c4')).toBe(60);
    expect(noteToMidi('a4')).toBe(69);
    expect(noteToMidi('bb3')).toBe(58);
    expect(noteToMidi('f#2')).toBe(42);
    expect(sigToBarBeats('6/8')).toBe(3);
    expect(parseChord('Dm')?.iv).toEqual([0, 3, 7]);
    expect(parseChord('Bbmaj7')?.root).toBe(10);
    expect(parseChord('Dm/F')?.bass).toBe(5);
    expect(parseChord('Xyz')).toBeNull();
  });

  it('resolves relative octaves and checks bar lengths', () => {
    const errors: string[] = [];
    const r = parseMelody("a4q d5h e5q | f g a b | c' c, d~ ~q", 4, errors, 'test');
    expect(r.notes.map((n) => n.m).slice(0, 8)).toEqual([69, 74, 76, 77, 79, 81, 83, 96]);
    expect(r.notes[8].m).toBe(84);
    expect(r.notes[9].m).toBe(86);
    expect(r.notes[9].roll).toBe(1);
    expect(r.notes[9].d).toBe(2);
    expect(r.length).toBe(12);
    expect(errors).toEqual([]);
    const bad: string[] = [];
    parseMelody('c4q d e | f g a b', 4, bad, 'bad');
    expect(bad.length).toBeGreaterThan(0);
  });
});

describe('audio tracks', () => {
  it('defines every required track id', () => {
    for (const id of REQUIRED_TRACKS) {
      expect(TRACKS[id], `missing track ${id}`).toBeDefined();
      expect(TRACKS[id].id).toBe(id);
    }
  });

  for (const id of REQUIRED_TRACKS) {
    it(`compiles "${id}" without notation errors and with a sane length`, () => {
      const def = TRACKS[id];
      const tr = compileTrack(def);
      expect(tr.errors, tr.errors.join('\n')).toEqual([]);
      expect(tr.length).toBeGreaterThan(0);
      expect(tr.events.length).toBeGreaterThan(0);
      if (!SHORT_OK.has(id)) {
        expect(tr.length).toBeGreaterThanOrEqual(45);
        expect(tr.length).toBeLessThanOrEqual(120);
      }
      if (tr.loop) {
        expect(tr.loopStart).toBeLessThan(tr.length);
        expect(tr.loopIndex).toBeLessThan(tr.events.length);
      }
      for (const v of tr.voices) expect(INSTRUMENTS[v.i], `${id}: unknown instrument ${v.i}`).toBeDefined();
      for (const e of tr.events) {
        expect(Number.isFinite(e.t) && e.t >= 0).toBe(true);
        expect(Number.isFinite(e.d) && e.d > 0).toBe(true);
        expect(e.m).toBeGreaterThanOrEqual(12);
        expect(e.m).toBeLessThanOrEqual(115);
        expect(e.vel).toBeGreaterThan(0);
        expect(e.t).toBeLessThan(tr.length + 1e-6);
      }
    });
  }

  it('does not loop defeat and chapter', () => {
    expect(compileTrack(TRACKS.defeat).loop).toBe(false);
    expect(compileTrack(TRACKS.chapter).loop).toBe(false);
  });
});

describe('audio sfx', () => {
  it('defines every required sfx id', () => {
    for (const id of REQUIRED_SFX) expect(typeof SFX[id]?.play, `missing sfx ${id}`).toBe('function');
  });
});

describe('audio engine without an AudioContext', () => {
  it('is a safe no-op before unlock', () => {
    expect(() => audio.sfx('x')).not.toThrow();
    expect(() => audio.sfx('confirm', { pan: -1, pitch: 1.5, volume: 0.5 })).not.toThrow();
    expect(() => audio.playMusic('title')).not.toThrow();
    expect(audio.currentMusic).toBe('title');
    expect(() => audio.playMusic('battle1', { fade: 0.5 })).not.toThrow();
    expect(audio.currentMusic).toBe('battle1');
    expect(() => audio.duck(0.5, 1)).not.toThrow();
    expect(() => audio.setVolumes({ master: 0.5, music: 2, sfx: -1 })).not.toThrow();
    expect(audio.getVolumes()).toEqual({ master: 0.5, music: 1, sfx: 0 });
    expect(() => audio.stopMusic()).not.toThrow();
    expect(audio.currentMusic).toBeNull();
    expect(() => audio.setQuality('low')).not.toThrow();
    expect(audio.getQuality()).toBe('low');
    audio.setQuality('high');
    expect(audio.debug().state).toBe('locked');
  });

  it('warns and stops on unknown music ids', () => {
    const e = new AudioEngine();
    const warn = console.warn;
    const msgs: unknown[] = [];
    console.warn = (...a: unknown[]) => msgs.push(a);
    try {
      e.playMusic('title');
      e.playMusic('no-such-track');
    } finally {
      console.warn = warn;
    }
    expect(msgs.length).toBe(1);
    expect(e.currentMusic).toBeNull();
  });

  it('unlock() without Web Audio resolves into no-op mode', async () => {
    const e = new AudioEngine();
    await expect(e.unlock()).resolves.toBeUndefined();
    expect(e.available).toBe(false);
    expect(() => e.playMusic('town')).not.toThrow();
    expect(() => e.sfx('hit')).not.toThrow();
  });
});
