import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/audio/audio';
import { pluck, rng } from '../src/audio/dsp';
import { INSTRUMENTS, renderSample } from '../src/audio/instruments';
import { MUSIC } from '../src/audio/score';
import { chord, mel, prog } from '../src/audio/score/dsl';
import { eventsBetween, lengths } from '../src/audio/sequencer';
import { SFX, renderSfx, sfxFor } from '../src/audio/sfx';

const REQUIRED_TRACKS = 'title prologue worldmap town tavern battle1 battle2 battle3 boss umbral finalBoss victory defeat somber tension church heroic romance campfire dungeon ending credits chapter formation'.split(' ');
const ONCE = ['victory', 'defeat', 'chapter', 'ending'];

// ---------------------------------------------------------------- a minimal Web Audio stand-in
class Param {
  value: number;
  ramps: number[] = [];
  constructor(v = 1) { this.value = v; }
  setValueAtTime(v: number) { this.value = v; return this; }
  linearRampToValueAtTime(v: number) { this.ramps.push(v); this.value = v; return this; }
  setTargetAtTime(v: number) { this.value = v; return this; }
  cancelScheduledValues() { return this; }
}
class Node {
  outputs: Node[] = [];
  connect(n: Node) { this.outputs.push(n); return n; }
  disconnect() { this.outputs = []; }
}
class Source extends Node {
  started = 0;
  stopped: number | null = null;
  onended: ((e?: unknown) => void) | null = null;
  start(t = 0) { this.started = t; ctxLog.started++; }
  stop(t = 0) { this.stopped = t; }
}
const ctxLog = { started: 0, oscillators: 0 };
class FakeContext {
  static last: FakeContext | null = null;
  state: 'running' | 'suspended' | 'closed' = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new Node();
  constructor() { FakeContext.last = this; }
  createGain() { return Object.assign(new Node(), { gain: new Param() }); }
  createDynamicsCompressor() { return Object.assign(new Node(), { threshold: new Param(), knee: new Param(), ratio: new Param(), attack: new Param(), release: new Param() }); }
  createAnalyser() { return Object.assign(new Node(), { fftSize: 2048 }); }
  createBiquadFilter() { return Object.assign(new Node(), { type: 'lowpass', Q: new Param(), frequency: new Param() }); }
  createStereoPanner() { return Object.assign(new Node(), { pan: new Param(0) }); }
  createConvolver() { return Object.assign(new Node(), { buffer: null }); }
  createPeriodicWave() { return {}; }
  createOscillator() { ctxLog.oscillators++; return Object.assign(new Source(), { frequency: new Param(440), detune: new Param(0), setPeriodicWave() {} }); }
  createBufferSource() { return Object.assign(new Source(), { buffer: null as unknown, playbackRate: new Param(1) }); }
  createBuffer(_c: number, length: number, sr: number) { return { duration: length / sr, length, copyToChannel() {}, getChannelData: () => new Float32Array(length) }; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
const g = globalThis as Record<string, unknown>;
function withAudio() {
  g.AudioContext = FakeContext;
  ctxLog.started = 0;
  ctxLog.oscillators = 0;
  const engine = new AudioEngine();
  void engine.unlock();
  const ctx = FakeContext.last!;
  const tick = (to: number) => { ctx.currentTime = to; (engine as unknown as { tick(): void }).tick(); };
  return { engine, ctx, tick };
}
afterEach(() => { delete g.AudioContext; delete g.AIHubSettings; });

// ---------------------------------------------------------------- the score
describe('the score', () => {
  it('has every cue the game plays, original and complete', () => {
    for (const id of REQUIRED_TRACKS) expect(MUSIC[id], id).toBeDefined();
    for (const [id, song] of Object.entries(MUSIC)) {
      expect(song.id).toBe(id);
      expect(!!song.once, id).toBe(ONCE.includes(id));
      const { body } = lengths(song);
      expect(body, id).toBeGreaterThan(song.once ? 5 : 30);
      for (const section of [song.intro, song.body]) for (const p of section?.parts ?? []) {
        expect(INSTRUMENTS[p.inst], `${id}: ${p.inst}`).toBeDefined();
        for (const n of p.notes) {
          expect([n.t, n.d, n.p, n.v].every(Number.isFinite), id).toBe(true);
          expect(n.t, `${id} ${p.inst}`).toBeLessThan(section!.beats);
          expect(n.v).toBeGreaterThan(0);
          expect(n.v).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('covers every cue named in the game code (scene and battle scripts are checked by the validator)', () => {
    for (const file of readdirSync('src', { recursive: true, withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith('.ts') || file.parentPath.includes('/audio')) continue;
      const source = readFileSync(resolve(file.parentPath, file.name), 'utf8');
      for (const m of [...source.matchAll(/audio\.sfx\(\s*'([^']+)'/g), ...source.matchAll(/\['sfx',\s*'([^']+)'\s*\]/g)]) expect(SFX[sfxFor(m[1])], m[1]).toBeDefined();
      for (const m of [...source.matchAll(/(?:audio\.playMusic\(|music:\s*)'([^']+)'/g), ...source.matchAll(/\['music',\s*'([^']+)'\s*\]/g)]) expect(MUSIC[m[1]], m[1]).toBeDefined();
    }
  });

  it('reads the notation: lengths carry on, ties extend, chords stack, accents and rests', () => {
    const n = mel("D4:1.5 E4:.5 [F4,A4]:2! - r:1 C5'");
    expect(n.map((x) => [x.t, x.d, x.p])).toEqual([[0, 1.5, 62], [1.5, 0.5, 64], [2, 4, 65], [2, 4, 69], [7, 1, 72]]);
    expect(n[2].v).toBeGreaterThan(n[0].v);
    expect(n[4].v).toBeLessThan(n[0].v);
    expect(() => mel('H4:1')).toThrow();
    expect(chord('F#m7b5').tones).toEqual([6, 9, 12, 16]);
    expect(chord('C/E').bass).toBe(4);
    expect(prog('Dm:4 C:2 r:2 A').map((c) => [c.sym, c.t, c.d])).toEqual([['Dm', 0, 4], ['C', 4, 2], ['A', 8, 2]]);
  });
});

// ---------------------------------------------------------------- the timeline
describe('the timeline', () => {
  it('schedules every note exactly once, however the time is sliced', () => {
    for (const id of ['title', 'tavern', 'umbral', 'victory']) {
      const song = MUSIC[id];
      const { intro, body } = lengths(song);
      const span = intro + body * 2.5;
      const whole = eventsBetween(song, 0, span).map((e) => `${e.at.toFixed(6)}:${e.p}:${e.part.inst}`);
      const sliced: string[] = [];
      for (let t = 0; t < span; t += 0.137) sliced.push(...eventsBetween(song, t, Math.min(span, t + 0.137)).map((e) => `${e.at.toFixed(6)}:${e.p}:${e.part.inst}`));
      expect(sliced.sort()).toEqual(whole.sort());
    }
  });

  it('repeats the body seamlessly, and plays a once-song only once', () => {
    const song = MUSIC.battle1;
    const { intro, body } = lengths(song);
    const pass0 = eventsBetween(song, intro, intro + body).map((e) => e.at - intro);
    const pass1 = eventsBetween(song, intro + body, intro + 2 * body).map((e) => e.at - intro - body);
    expect(pass1.map((x) => x.toFixed(6))).toEqual(pass0.map((x) => x.toFixed(6)));
    const v = MUSIC.victory;
    expect(eventsBetween(v, lengths(v).body + 0.01, 60)).toEqual([]);
    expect(eventsBetween(v, lengths(v).body + 0.01, 60, true).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------- instruments and effects
describe('instruments and effects', () => {
  it('render every effect: deterministic, normalized, finite, short', () => {
    for (const id of Object.keys(SFX)) {
      const [l, r] = renderSfx(id, 8000);
      const peak = Math.max(...[l, r].map((x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
      expect(peak, id).toBeGreaterThan(0.2);
      expect(peak, id).toBeLessThanOrEqual(1);
      expect(l.every(Number.isFinite) && r.every(Number.isFinite), id).toBe(true);
      expect(l.length / 8000, id).toBeLessThan(4);
    }
    expect(renderSfx('hit', 8000)[0]).toEqual(renderSfx('hit', 8000)[0]);
    expect(SFX.textBlip).toBeUndefined(); // no voices: the typewriter is silent
  });

  it('render every sampled instrument, and tune plucked strings exactly', () => {
    for (const [id, spec] of Object.entries(INSTRUMENTS)) if (spec.kind === 'sample') {
      const x = renderSample(id as never, spec.roots[0], 8000);
      expect(x.every(Number.isFinite), id).toBe(true);
      expect(x.reduce((m, v) => Math.max(m, Math.abs(v)), 0), id).toBeGreaterThan(0.5);
    }
    // the strongest autocorrelation lag of a pluck is its period: within 5 cents of the note
    const sr = 44100;
    for (const hz of [110, 220, 523.25, 987.77]) {
      const x = pluck(sr, hz, 0.8, rng(3), { brightness: 0.5, damping: 0.5, t60: 4 });
      const from = Math.round(sr * 0.25), n = Math.round(sr * 0.25);
      const ac = (lag: number) => { let s = 0; for (let i = 0; i < n; i++) s += x[from + i] * x[from + i + lag]; return s; };
      const expected = sr / hz;
      let best = 0, bestLag = 0;
      for (let lag = Math.floor(expected * 0.9); lag <= Math.ceil(expected * 1.1); lag++) { const v = ac(lag); if (v > best) { best = v; bestLag = lag; } }
      const [a, b, c] = [ac(bestLag - 1), best, ac(bestLag + 1)];
      const lag = bestLag + (a - c) / (2 * (a - 2 * b + c));
      expect(Math.abs(1200 * Math.log2(expected / lag)), `${hz} Hz`).toBeLessThan(5);
    }
  });
});

// ---------------------------------------------------------------- the engine
describe('the engine without Web Audio', () => {
  it('is safe before unlock, remembers the music asked for, and clamps settings', async () => {
    const engine = new AudioEngine();
    expect(engine.unlocked).toBe(false);
    engine.playMusic('battle1');
    expect(engine.currentMusic).toBe('battle1');
    engine.sfx('hit');
    engine.setVolumes({ music: 3, sfx: -1 });
    expect(engine.getVolumes()).toMatchObject({ music: 1, sfx: 0 });
    await engine.unlock();
    expect(engine.available).toBe(false);
    engine.playMusic('no-such-cue');
    expect(engine.currentMusic).toBeNull();
  });
});

describe('the engine', () => {
  it('starts the music asked for before unlock, and schedules only a little ahead', () => {
    g.AudioContext = FakeContext;
    const engine = new AudioEngine();
    engine.playMusic('battle1');
    ctxLog.started = 0;
    void engine.unlock();
    const first = ctxLog.started;
    expect(first).toBeGreaterThan(0);
    const ctx = FakeContext.last!;
    ctx.currentTime = 2;
    (engine as unknown as { tick(): void }).tick();
    expect(ctxLog.started).toBeGreaterThan(first);
    expect(engine.debug().track).toBe('battle1');
    engine.dispose();
  });

  it('crossfades to the next cue and releases the old one', () => {
    const { engine, tick } = withAudio();
    engine.playMusic('title', { fade: 0 });
    tick(1);
    engine.playMusic('battle1', { fade: 1 });
    expect(engine.debug()).toMatchObject({ track: 'battle1', musicVoices: 2 });
    tick(3);
    expect(engine.debug().musicVoices).toBe(1);
    engine.playMusic('battle1');
    expect(engine.debug().musicVoices).toBe(1); // the same cue keeps playing
    engine.stopMusic(0.5);
    expect(engine.currentMusic).toBeNull();
    tick(5);
    expect(engine.debug()).toMatchObject({ track: null, musicVoices: 0 });
  });

  it('ends a once-song by itself', () => {
    const { engine, tick } = withAudio();
    engine.playMusic('victory');
    for (let t = 0.5; t < 20; t += 0.5) tick(t);
    expect(engine.currentMusic).toBeNull();
    expect(engine.debug().track).toBeNull();
  });

  it('multiplies its volumes by the player\'s 52in1 volumes, and follows their changes', () => {
    const listeners: Array<() => void> = [];
    const hub = { music: 0.5, effects: 0.25, addEventListener: (_: string, fn: () => void) => listeners.push(fn) };
    g.AIHubSettings = hub;
    const { engine } = withAudio();
    engine.setVolumes({ master: 1, music: 0.8, sfx: 0.6 });
    const graph = (engine as unknown as { graph: { music: { gain: Param }; effects: { gain: Param }; master: { gain: Param } } }).graph;
    expect(graph.music.gain.value).toBeCloseTo(0.8 ** 2 * 0.5);
    expect(graph.effects.gain.value).toBeCloseTo(0.6 ** 2 * 0.25);
    expect(graph.master.gain.value).toBeCloseTo(1);
    hub.music = 1;
    hub.effects = 0;
    for (const fn of listeners) fn();
    expect(graph.music.gain.value).toBeCloseTo(0.64);
    expect(graph.effects.gain.value).toBe(0);
  });

  it('ducks the music under a sting, limits effect voices and falls back for unknown effects', () => {
    const { engine, ctx } = withAudio();
    const graph = (engine as unknown as { graph: { duck: { gain: Param } } }).graph;
    engine.sfx('victory');
    expect(Math.min(...graph.duck.gain.ramps)).toBeLessThan(1);
    const ids = Object.keys(SFX);
    for (let i = 0; i < 60; i++) { ctx.currentTime += 0.1; engine.sfx(ids[i % ids.length]); }
    expect(engine.debug().sfxVoices).toBeLessThanOrEqual(32);
    expect(() => engine.sfx('no-such-effect')).not.toThrow();
  });

  it('plays one voice per note, with no reverb, on low quality', () => {
    g.AudioContext = FakeContext;
    const engine = new AudioEngine();
    engine.setQuality('low');
    void engine.unlock();
    ctxLog.oscillators = 0;
    engine.playMusic('church', { fade: 0 }); // organ and choir only: oscillator voices
    const lowCount = ctxLog.oscillators;
    engine.dispose();
    const high = new AudioEngine();
    void high.unlock();
    ctxLog.oscillators = 0;
    high.playMusic('church', { fade: 0 });
    expect(ctxLog.oscillators).toBeGreaterThan(lowCount);
    high.dispose();
  });
});
