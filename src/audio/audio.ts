/**
 * The game's audio: an original score and original sound effects, all synthesized in the browser
 * (score/, sfx.ts, instruments.ts). Nothing is downloaded. Music is scheduled a quarter of a second
 * ahead from the score's timeline (sequencer.ts); effects are rendered once and cached.
 *
 * Inside 52in1, the player's music and effects volumes (window.AIHubSettings) multiply the game's
 * own; 52in1 applies its master volume itself, so the game never does.
 */
import { impulse, midiHz } from './dsp';
import { INSTRUMENTS, harmonicsAt, nearestRoot, renderSample, type InstrumentId, type OscSpec, type SampleSpec } from './instruments';
import { MUSIC } from './score';
import type { Part, Room, Song } from './score/dsl';
import { eventsBetween, finalSeconds, lengths, loops } from './sequencer';
import { FALLBACK_SFX, SFX, renderSfx } from './sfx';

export interface Volumes { master: number; music: number; sfx: number }
export interface MusicOptions { fade?: number; loop?: boolean; restart?: boolean }
export interface SfxOptions { pan?: number; pitch?: number; volume?: number }

interface HubSettings { music?: unknown; effects?: unknown; addEventListener?: (type: 'change', fn: () => void) => void }
const hub = (): HubSettings | undefined => (globalThis as { AIHubSettings?: HubSettings }).AIHubSettings;
const unit = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1);
const clamp = (v: number, min = 0, max = 1) => (Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min);

const LOOKAHEAD = 0.25;
const TICK_MS = 50;
const ROOMS: Record<Exclude<Room, 'dry'>, { seconds: number; predelay: number; damping: number; wet: number }> = {
  room: { seconds: 1.1, predelay: 0.008, damping: 0.5, wet: 0.5 },
  hall: { seconds: 2.4, predelay: 0.02, damping: 0.4, wet: 0.7 },
  cathedral: { seconds: 4.2, predelay: 0.035, damping: 0.3, wet: 0.85 },
  cave: { seconds: 3, predelay: 0.06, damping: 0.6, wet: 0.8 },
};

/** The node graph on one context, shared by live playback and offline rendering. */
export class Graph {
  readonly music: GainNode;
  readonly duck: GainNode;
  readonly effects: GainNode;
  readonly master: GainNode;
  readonly meter: AnalyserNode;
  private rooms = new Map<Room, AudioNode | null>();
  private waves = new Map<string, PeriodicWave>();
  private samples = new Map<string, AudioBuffer>();

  constructor(readonly ctx: BaseAudioContext, destination: AudioNode, public low = false) {
    this.music = ctx.createGain();
    this.duck = ctx.createGain();
    this.effects = ctx.createGain();
    this.master = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -4;
    limiter.knee.value = 6;
    limiter.ratio.value = 14;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    this.meter = ctx.createAnalyser();
    this.music.connect(this.duck).connect(limiter);
    this.effects.connect(limiter);
    limiter.connect(this.master).connect(this.meter).connect(destination);
  }

  /** The reverb for a room (built on first use); null when dry or on low quality. */
  room(kind: Room): AudioNode | null {
    if (kind === 'dry' || this.low) return null;
    if (!this.rooms.has(kind)) {
      const spec = ROOMS[kind];
      const sr = this.ctx.sampleRate;
      const [l, r] = impulse(sr, spec.seconds, { predelay: spec.predelay, damping: spec.damping, seed: kind.length * 97 });
      const buf = this.ctx.createBuffer(2, l.length, sr);
      buf.copyToChannel(l as Float32Array<ArrayBuffer>, 0);
      buf.copyToChannel(r as Float32Array<ArrayBuffer>, 1);
      const conv = this.ctx.createConvolver();
      conv.buffer = buf;
      const wet = this.ctx.createGain();
      wet.gain.value = spec.wet;
      conv.connect(wet).connect(this.music);
      this.rooms.set(kind, conv);
    }
    return this.rooms.get(kind) ?? null;
  }

  private wave(id: InstrumentId, spec: OscSpec, hz: number): PeriodicWave {
    const key = typeof spec.harmonics === 'function' ? `${id}:${Math.round(hz)}` : id;
    let w = this.waves.get(key);
    if (!w) {
      const h = harmonicsAt(spec, hz);
      const real = new Float32Array(h.length + 1);
      const imag = new Float32Array(h.length + 1);
      h.forEach((a, k) => { imag[k + 1] = a; });
      w = this.ctx.createPeriodicWave(real, imag);
      this.waves.set(key, w);
    }
    return w;
  }

  sample(id: InstrumentId, root: number): AudioBuffer {
    const key = `${id}:${root}`;
    let b = this.samples.get(key);
    if (!b) {
      const data = renderSample(id, root, this.ctx.sampleRate);
      b = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate);
      b.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
      this.samples.set(key, b);
    }
    return b;
  }

  private queue: Array<[InstrumentId, number]> = [];
  /** Queue the samples a song needs, earliest notes first; `work` renders them a few at a time. */
  warm(song: Song) {
    const seen = new Set(this.queue.map(([id, root]) => `${id}:${root}`));
    const wanted: Array<[number, InstrumentId, number]> = [];
    const intro = song.intro ? song.intro.beats * 60 / (song.intro.bpm ?? song.bpm) : 0;
    for (const [section, offset] of [[song.intro, 0], [song.body, intro]] as const) for (const p of section?.parts ?? []) {
      const spec = INSTRUMENTS[p.inst];
      if (spec.kind !== 'sample') continue;
      const spb = 60 / ((section?.bpm ?? song.bpm) || 1);
      for (const n of p.notes) wanted.push([offset + n.t * spb, p.inst, nearestRoot(spec, n.p)]);
    }
    wanted.sort((a, b) => a[0] - b[0]);
    for (const [, id, root] of wanted) {
      const key = `${id}:${root}`;
      if (seen.has(key) || this.samples.has(key)) continue;
      seen.add(key);
      this.queue.push([id, root]);
    }
  }
  /** Render queued samples for up to `ms` milliseconds (a note still missing one renders it on demand). */
  work(ms: number) {
    const end = performance.now() + ms;
    while (this.queue.length && performance.now() < end) { const [id, root] = this.queue.shift()!; this.sample(id, root); }
  }

  /**
   * Schedule one note into `dest`; returns its sources so they can be cut short. `filtered`: the
   * part's channel already applies the instrument's fixed filter, so the note needs none of its own.
   */
  note(id: InstrumentId, midi: number, when: number, dur: number, vel: number, dest: AudioNode, filtered = false): AudioScheduledSourceNode[] {
    const spec = INSTRUMENTS[id];
    return spec.kind === 'osc' ? this.osc(id, spec, midi, when, dur, vel, dest, filtered) : this.sampled(id, spec, midi, when, dur, vel, dest);
  }

  private osc(id: InstrumentId, spec: OscSpec, midi: number, when: number, dur: number, vel: number, dest: AudioNode, filtered: boolean): AudioScheduledSourceNode[] {
    const ctx = this.ctx;
    const hz = midiHz(midi);
    const env = ctx.createGain();
    // fast notes gain nothing from a chorus of voices or from vibrato that would start after they end
    const short = dur < 0.3;
    const voices = this.low || short ? 1 : spec.unison;
    const peak = (spec.gain * vel) / Math.sqrt(voices);
    const g = env.gain;
    g.setValueAtTime(0, when);
    g.linearRampToValueAtTime(peak, when + spec.attack);
    g.setTargetAtTime(peak * spec.sustain, when + spec.attack, Math.max(0.01, spec.decay / 3));
    const off = when + Math.max(dur, spec.attack + 0.03);
    g.setTargetAtTime(0, off, Math.max(0.01, spec.release / 4));
    const stop = off + spec.release * 1.25 + 0.04;
    let input: AudioNode = env;
    if (spec.filter && !(filtered && !spec.filter.env)) {
      const f = ctx.createBiquadFilter();
      f.type = spec.filter.type;
      f.Q.value = spec.filter.q ?? 0.7;
      const base = Math.min(16000, spec.filter.freq * (hz / 261.63) ** (spec.filter.track ?? 0));
      if (spec.filter.env) {
        f.frequency.setValueAtTime(Math.min(18000, base + spec.filter.env * vel), when);
        f.frequency.setTargetAtTime(base, when, Math.max(0.01, (spec.filter.envTime ?? 0.2) / 3));
      } else f.frequency.value = base;
      f.connect(env);
      input = f;
    }
    env.connect(dest);
    const wave = this.wave(id, spec, hz);
    const sources: AudioScheduledSourceNode[] = [];
    let lfo: OscillatorNode | null = null, depth: GainNode | null = null;
    if (spec.vibrato && !this.low && dur > spec.vibrato.delay + 0.1) {
      lfo = ctx.createOscillator();
      lfo.frequency.value = spec.vibrato.rate * (0.96 + ((midi * 7) % 9) / 100);
      depth = ctx.createGain();
      depth.gain.setValueAtTime(0, when);
      depth.gain.linearRampToValueAtTime(0, when + spec.vibrato.delay);
      depth.gain.linearRampToValueAtTime(spec.vibrato.cents, when + spec.vibrato.delay + 0.25);
      lfo.connect(depth);
      lfo.start(when);
      lfo.stop(stop);
      sources.push(lfo);
    }
    for (let i = 0; i < voices; i++) {
      const o = ctx.createOscillator();
      o.setPeriodicWave(wave);
      o.frequency.value = hz;
      const detune = voices > 1 ? spec.spread * (i / (voices - 1) - 0.5) : 0;
      if (spec.scoop) {
        o.detune.setValueAtTime(detune - spec.scoop, when);
        o.detune.linearRampToValueAtTime(detune, when + 0.06);
      } else o.detune.value = detune;
      if (depth) depth.connect(o.detune);
      o.connect(input);
      o.start(when);
      o.stop(stop);
      sources.push(o);
    }
    const last = sources[sources.length - 1];
    last.onended = () => { for (const s of sources) s.disconnect(); depth?.disconnect(); input.disconnect(); env.disconnect(); };
    return sources;
  }

  private sampled(id: InstrumentId, spec: SampleSpec, midi: number, when: number, dur: number, vel: number, dest: AudioNode): AudioScheduledSourceNode[] {
    const ctx = this.ctx;
    const root = nearestRoot(spec, midi);
    const buf = this.sample(id, root);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 2 ** ((midi - root) / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(spec.gain * vel, when);
    const natural = when + buf.duration / src.playbackRate.value;
    let stop = natural;
    if (!spec.oneShot) {
      const off = when + Math.max(0.03, dur);
      g.gain.setTargetAtTime(0, off, Math.max(0.01, spec.release / 4));
      stop = Math.min(natural, off + spec.release * 1.25 + 0.04);
    }
    src.connect(g).connect(dest);
    src.start(when);
    src.stop(stop);
    src.onended = () => { src.disconnect(); g.disconnect(); };
    return [src];
  }
}

/** One song playing: its own gain (for fades) and reverb send, a channel per part. */
export class SongPlayer {
  readonly out: GainNode;
  private send: GainNode | null = null;
  private parts = new Map<Part, AudioNode>();
  private scheduled = 0;
  private sources = new Set<AudioScheduledSourceNode>();
  private stopAt = Infinity;
  readonly loop: boolean;

  constructor(private g: Graph, readonly id: string, readonly song: Song, readonly t0: number, loop: boolean | undefined, fade: number) {
    this.loop = loops(song, loop);
    const ctx = g.ctx;
    this.out = ctx.createGain();
    const level = song.gain ?? 1;
    this.out.gain.setValueAtTime(fade > 0 ? 0 : level, t0);
    if (fade > 0) this.out.gain.linearRampToValueAtTime(level, t0 + fade);
    this.out.connect(g.music);
    const room = g.room(song.room);
    if (room) {
      this.send = ctx.createGain();
      this.send.gain.setValueAtTime(fade > 0 ? 0 : 1, t0);
      if (fade > 0) this.send.gain.linearRampToValueAtTime(1, t0 + fade);
      this.send.connect(room);
    }
  }

  /** A part's channel: its gain, a shared filter when the instrument's is fixed, its pan and reverb send. */
  private channel(p: Part): AudioNode {
    let node = this.parts.get(p);
    if (!node) {
      const ctx = this.g.ctx;
      const gain = ctx.createGain();
      gain.gain.value = p.gain ?? 1;
      let tail: AudioNode = gain;
      const spec = INSTRUMENTS[p.inst];
      if (spec.kind === 'osc' && spec.filter && !spec.filter.env) {
        // one filter for the whole part, tuned to its middle note, instead of one per note
        const pitches = p.notes.map((n) => n.p).sort((x, y) => x - y);
        const mid = midiHz(pitches[pitches.length >> 1] ?? 60);
        const f = ctx.createBiquadFilter();
        f.type = spec.filter.type;
        f.Q.value = spec.filter.q ?? 0.7;
        f.frequency.value = Math.min(16000, spec.filter.freq * (mid / 261.63) ** (spec.filter.track ?? 0));
        gain.connect(f);
        tail = f;
      }
      if (p.pan && ctx.createStereoPanner) {
        const pan = ctx.createStereoPanner();
        pan.pan.value = clamp(p.pan, -1, 1);
        gain.connect(pan);
        tail = pan;
      }
      tail.connect(this.out);
      if (this.send) {
        const s = ctx.createGain();
        s.gain.value = p.send ?? 0.3;
        tail.connect(s).connect(this.send);
      }
      node = gain;
      this.parts.set(p, node);
    }
    return node;
  }

  /** Seconds since the start, and the section playing (for the audition page). */
  position(now: number) {
    const t = Math.max(0, now - this.t0);
    const { intro, body } = lengths(this.song);
    if (t < intro) return { time: t, length: intro, section: 'intro', loops: 0 };
    const into = t - intro;
    return { time: body ? into % body : 0, length: body, section: 'body', loops: body ? Math.floor(into / body) : 0 };
  }

  /** Schedule every note starting before `until` (context time). */
  pump(until: number) {
    if (until >= this.stopAt) until = this.stopAt;
    const to = until - this.t0;
    if (to <= this.scheduled) return;
    for (const e of eventsBetween(this.song, this.scheduled, to, this.loop)) {
      const spec = INSTRUMENTS[e.part.inst];
      const shared = spec.kind === 'osc' && !!spec.filter && !spec.filter.env;
      for (const s of this.g.note(e.part.inst, e.p, this.t0 + e.at, e.d, e.v, this.channel(e.part), shared)) {
        this.sources.add(s);
        const prev = s.onended;
        s.onended = (ev) => { this.sources.delete(s); prev?.call(s, ev); };
      }
    }
    this.scheduled = to;
  }

  fadeOut(now: number, seconds: number) {
    const end = now + Math.max(0.01, seconds);
    for (const p of [this.out.gain, this.send?.gain]) {
      if (!p) continue;
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
      p.linearRampToValueAtTime(0, end);
    }
    this.stopAt = Math.min(this.stopAt, end);
  }

  /** True once it has faded out, or a song that plays once has finished, and its tails are done. */
  finished(now: number): boolean {
    if (now > this.stopAt + 0.1) return true;
    return !this.loop && now - this.t0 > finalSeconds(this.song) + 2.5;
  }

  release() {
    for (const s of this.sources) { try { s.stop(); } catch { /* not started */ } }
    this.sources.clear();
    this.out.disconnect();
    this.send?.disconnect();
    for (const n of this.parts.values()) n.disconnect();
  }
}

interface Voice { source: AudioBufferSourceNode; gain: GainNode; pan: AudioNode }

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private graph: Graph | null = null;
  private disabled = false;
  private vols: Volumes = { master: 0.9, music: 0.8, sfx: 0.9 };
  private wanted: { id: string; opts: MusicOptions } | null = null;
  private player: SongPlayer | null = null;
  private fading = new Set<SongPlayer>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private voices: Voice[] = [];
  private lastSfx = new Map<string, number>();
  private quality: 'high' | 'low' = 'high';
  private duckUntil = 0;
  private duckLevel = 1;
  private error: string | null = null;
  private hubWatched = false;

  get available(): boolean { return !this.disabled; }
  get unlocked(): boolean { return this.ctx?.state === 'running'; }
  get currentMusic(): string | null { return this.wanted?.id ?? null; }
  get trackIds(): string[] { return Object.keys(MUSIC); }
  get sfxIds(): string[] { return Object.keys(SFX); }
  get analyser(): AnalyserNode | null { return this.graph?.meter ?? null; }
  /** The score's details, for the audition page. */
  song(id: string): Song | undefined { return MUSIC[id]; }

  /** Create or resume the context inside a user gesture. */
  unlock(): Promise<void> {
    if (this.disabled) return Promise.resolve();
    if (this.ctx) {
      const resumed = this.resume();
      if (this.wanted && !this.player) this.startMusic(this.wanted.id, this.wanted.opts);
      return resumed;
    }
    const globals = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AC = globals.AudioContext ?? globals.webkitAudioContext;
    if (!AC) { this.disabled = true; return Promise.resolve(); }
    try {
      const ctx = new AC({ latencyHint: 'interactive' });
      this.ctx = ctx;
      this.graph = new Graph(ctx, ctx.destination, this.quality === 'low');
      this.applyVolumes();
      this.watchHub();
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.visibility);
      const resumed = this.resume();
      if (this.wanted) this.startMusic(this.wanted.id, this.wanted.opts);
      return resumed;
    } catch (e) {
      this.report('Web Audio unavailable', e);
      this.disabled = true;
      this.dispose();
      return Promise.resolve();
    }
  }

  attachUnlock(target?: EventTarget): () => void {
    const tgt = target ?? (typeof window !== 'undefined' ? window : undefined);
    if (!tgt) return () => {};
    const events = ['pointerdown', 'mousedown', 'touchend', 'keydown', 'click'];
    const handler = () => { void this.unlock(); };
    for (const name of events) tgt.addEventListener(name, handler, { capture: true, passive: true });
    return () => { for (const name of events) tgt.removeEventListener(name, handler, true); };
  }

  /** Resume only for a gesture or a returning page: 52in1 holds the sound while its cards are up. */
  private resume(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || ctx.state === 'closed') return Promise.resolve();
    if (typeof document !== 'undefined' && document.hidden) return Promise.resolve();
    if (ctx.state === 'running') return Promise.resolve();
    return Promise.race([ctx.resume().catch(() => {}), new Promise<void>((r) => setTimeout(r, 1000))]);
  }

  private visibility = () => {
    if (document.hidden) void this.ctx?.suspend().catch(() => {});
    else void this.resume();
  };

  private watchHub() {
    if (this.hubWatched) return;
    const h = hub();
    if (h?.addEventListener) { h.addEventListener('change', () => this.applyVolumes()); this.hubWatched = true; }
  }

  playMusic(id: string, opts: MusicOptions = {}): void {
    if (!id) { this.stopMusic(opts.fade); return; }
    if (!Object.hasOwn(MUSIC, id)) { console.warn(`[audio] unknown music id "${id}"`); this.stopMusic(opts.fade); return; }
    if (this.wanted?.id === id && !opts.restart && (this.player || !this.ctx)) { this.wanted = { id, opts }; return; }
    this.wanted = { id, opts };
    if (this.ctx) this.startMusic(id, opts);
  }

  private startMusic(id: string, opts: MusicOptions): void {
    const ctx = this.ctx, graph = this.graph;
    if (!ctx || !graph) return;
    const song = MUSIC[id];
    const fade = clamp(opts.fade ?? 1, 0, 10);
    try {
      graph.warm(song);
      graph.work(12);
      const now = ctx.currentTime;
      if (this.player) { this.player.fadeOut(now, fade); this.fading.add(this.player); }
      this.player = new SongPlayer(graph, id, song, now + 0.06, opts.loop, fade);
      this.error = null;
      this.tick();
      this.run();
    } catch (e) {
      this.report(`music ${id}`, e);
    }
  }

  stopMusic(fade = 1): void {
    this.wanted = null;
    const now = this.ctx?.currentTime ?? 0;
    if (this.player) { this.player.fadeOut(now, clamp(fade, 0, 10)); this.fading.add(this.player); }
    this.player = null;
  }

  private run() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.graph?.work(6);
    const now = ctx.currentTime;
    if (this.player) {
      this.player.pump(now + LOOKAHEAD);
      if (this.player.finished(now)) {
        this.player.release();
        this.player = null;
        this.wanted = null;
      }
    }
    for (const p of this.fading) {
      p.pump(now + LOOKAHEAD);
      if (p.finished(now)) { p.release(); this.fading.delete(p); }
    }
    if (!this.player && !this.fading.size && this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  /** Render an effect ahead of its first use. */
  preload(id: string): void {
    if (this.ctx && Object.hasOwn(SFX, id)) this.effect(id);
  }

  private effect(id: string): AudioBuffer {
    let b = this.buffers.get(id);
    if (!b) {
      const ctx = this.ctx!;
      const [l, r] = renderSfx(id, ctx.sampleRate);
      b = ctx.createBuffer(2, l.length, ctx.sampleRate);
      b.copyToChannel(l as Float32Array<ArrayBuffer>, 0);
      b.copyToChannel(r as Float32Array<ArrayBuffer>, 1);
      this.buffers.set(id, b);
    }
    return b;
  }

  sfx(id: string, opts: SfxOptions = {}): void {
    const ctx = this.ctx, graph = this.graph;
    if (!ctx || !graph || ctx.state !== 'running') return;
    const key = Object.hasOwn(SFX, id) ? id : FALLBACK_SFX;
    const spec = SFX[key];
    const now = ctx.currentTime;
    if ((now - (this.lastSfx.get(key) ?? -Infinity)) * 1000 < (spec.gapMs ?? 25)) return;
    this.lastSfx.set(key, now);
    try {
      const buffer = this.effect(key);
      const limit = this.quality === 'low' ? 16 : 32;
      while (this.voices.length >= limit) this.releaseVoice(this.voices[0]);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = clamp(opts.pitch ?? 1, 0.1, 4);
      const gain = ctx.createGain();
      gain.gain.value = clamp((spec.gain ?? 0.5) * (opts.volume ?? 1), 0, 4);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if ('pan' in pan) pan.pan.value = clamp(opts.pan ?? 0, -1, 1);
      source.connect(gain).connect(pan).connect(graph.effects);
      const voice = { source, gain, pan };
      this.voices.push(voice);
      source.onended = () => this.releaseVoice(voice);
      source.start();
      if (spec.duck) this.duck(spec.duck[0], spec.duck[1]);
    } catch (e) {
      this.report(`sfx ${id}`, e);
    }
  }

  private releaseVoice(v: Voice): void {
    v.source.onended = null;
    try { v.source.stop(); } catch { /* already stopped */ }
    v.source.disconnect();
    v.gain.disconnect();
    v.pan.disconnect();
    this.voices = this.voices.filter((c) => c !== v);
  }

  duck(amount: number, seconds: number): void {
    const graph = this.graph;
    if (!this.ctx || !graph) return;
    const now = this.ctx.currentTime;
    const active = now < this.duckUntil;
    this.duckLevel = active ? Math.min(this.duckLevel, 1 - clamp(amount)) : 1 - clamp(amount);
    this.duckUntil = Math.max(active ? this.duckUntil : 0, now + clamp(seconds, 0, 60));
    const g = graph.duck.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(this.duckLevel, now + 0.08);
    g.setValueAtTime(this.duckLevel, Math.max(now + 0.08, this.duckUntil));
    g.linearRampToValueAtTime(1, Math.max(now + 0.08, this.duckUntil) + 0.6);
  }

  setVolumes(v: Partial<Volumes>): void {
    for (const key of ['master', 'music', 'sfx'] as const) if (v[key] !== undefined) this.vols[key] = clamp(v[key]!);
    this.applyVolumes();
  }
  getVolumes(): Volumes { return { ...this.vols }; }

  /** The game's own volumes, squared for a natural taper, times the player's 52in1 volumes. */
  private applyVolumes(): void {
    const ctx = this.ctx, graph = this.graph;
    if (!ctx || !graph) return;
    const h = hub();
    for (const [node, value] of [
      [graph.master, this.vols.master ** 2],
      [graph.music, this.vols.music ** 2 * unit(h?.music)],
      [graph.effects, this.vols.sfx ** 2 * unit(h?.effects)],
    ] as const) node.gain.setTargetAtTime(value, ctx.currentTime, 0.015);
  }

  /** Low quality: one voice per note, no vibrato, no reverb, fewer effects at once. */
  setQuality(q: 'high' | 'low'): void {
    this.quality = q === 'low' ? 'low' : 'high';
    if (this.graph) this.graph.low = this.quality === 'low';
  }
  getQuality(): 'high' | 'low' { return this.quality; }

  private report(action: string, error: unknown): void {
    this.error = `${action}: ${error instanceof Error ? error.message : String(error)}`;
    console.warn(`[audio] ${this.error}`);
  }

  debug() {
    const p = this.player;
    const now = this.ctx?.currentTime ?? 0;
    const pos = p?.position(now);
    return {
      state: this.ctx?.state ?? (this.disabled ? 'unavailable' : 'locked'),
      track: p?.id ?? null,
      time: pos?.time ?? 0,
      length: pos?.length ?? 0,
      section: pos?.section ?? null,
      loops: pos?.loops ?? 0,
      musicVoices: (p ? 1 : 0) + this.fading.size,
      sfxVoices: this.voices.length,
      loading: null as string | null,
      error: this.error,
    };
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const p of [this.player, ...this.fading]) p?.release();
    this.player = null;
    this.fading.clear();
    this.wanted = null;
    for (const v of [...this.voices]) this.releaseVoice(v);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.visibility);
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.graph = null;
    this.buffers.clear();
    this.lastSfx.clear();
  }
}

export const audio = new AudioEngine();

/** Silence before a cue in an offline render, so the limiter has settled as it has in play. */
export const OFFLINE_LEAD = 0.3;

/**
 * Render a cue offline (the audition page and `npm run audio:verify` use it), after OFFLINE_LEAD
 * seconds of silence. Music renders `seconds` of the song, scheduled half a second at a time as in
 * play; an effect renders whole.
 */
export async function renderOffline(kind: 'music' | 'sfx', id: string, seconds: number, opts: { sampleRate?: number; low?: boolean; loop?: boolean } = {}): Promise<AudioBuffer> {
  const sr = opts.sampleRate ?? 44100;
  const OAC = (globalThis as { OfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext;
  if (!OAC) throw new Error('OfflineAudioContext is unavailable');
  if (kind === 'sfx') {
    const [l, r] = renderSfx(id, sr);
    const lead = OFFLINE_LEAD;
    const ctx = new OAC(2, l.length + Math.round(sr * lead), sr);
    const b = ctx.createBuffer(2, l.length, sr);
    b.copyToChannel(l as Float32Array<ArrayBuffer>, 0);
    b.copyToChannel(r as Float32Array<ArrayBuffer>, 1);
    const g = new Graph(ctx, ctx.destination, opts.low);
    const src = ctx.createBufferSource();
    src.buffer = b;
    const gain = ctx.createGain();
    gain.gain.value = SFX[id]?.gain ?? 0.5;
    src.connect(gain).connect(g.effects);
    src.start(lead);
    return ctx.startRendering();
  }
  const song = MUSIC[id];
  if (!song) throw new Error(`unknown music id ${id}`);
  const lead = OFFLINE_LEAD, total = lead + seconds;
  const ctx = new OAC(2, Math.round(sr * total), sr);
  const g = new Graph(ctx, ctx.destination, opts.low);
  g.music.gain.value = 1;
  g.warm(song);
  g.work(Infinity);
  const p = new SongPlayer(g, id, song, lead, opts.loop, 0);
  // schedule as the live engine does, a little at a time, so the graph holds only what is sounding
  const step = 0.5;
  p.pump(Math.min(total, step + LOOKAHEAD));
  for (let t = step; t < total; t += step) {
    const at = t;
    void ctx.suspend(at).then(() => { p.pump(Math.min(total, at + step + LOOKAHEAD)); void ctx.resume(); });
  }
  return ctx.startRendering();
}
