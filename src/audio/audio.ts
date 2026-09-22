/**
 * AudioEngine — music & sound effects for Final Fealty Tactics.
 *
 *   import { audio } from './audio/audio';
 *   audio.attachUnlock();          // or call audio.unlock() from a user gesture
 *   audio.playMusic('title');      // crossfades; remembered until unlocked
 *   audio.sfx('confirm', { pan: -0.3, pitch: 1.1 });
 *   audio.duck(0.6, 1.5);          // dip the music under a big spell
 *   audio.setVolumes({ music: 0.5 });
 *   audio.setQuality('low');       // cheaper mixing for weak devices
 *
 * Track ids: see TRACKS in tracks.ts (audio.trackIds); sfx ids: SFX in sfx.ts.
 * Dev audition page: /audio-test.html (npm run dev).
 *
 * All sound is synthesized at runtime (see synth.ts / tracks.ts / sfx.ts).
 * No AudioContext exists before unlock(); without Web Audio the engine is a
 * silent no-op and never throws.
 */
import { compileTrack, type CompiledTrack, type NoteEvent } from './notation';
import { TRACKS } from './tracks';
import { GENERIC_SFX, SFX, type SfxDef } from './sfx';
import {
  INSTRUMENTS,
  createCore,
  createMasterBus,
  getPluck,
  makePanner,
  mkGain,
  playRoll,
  type Insert,
  type MasterBus,
  type SynthCore,
} from './synth';

export interface Volumes {
  master: number;
  music: number;
  sfx: number;
}

export interface MusicOptions {
  /** crossfade seconds (default 1) */
  fade?: number;
  /** override the track's loop flag */
  loop?: boolean;
  /** restart even if the same track is already playing */
  restart?: boolean;
}

export interface SfxOptions {
  /** -1 (left) .. 1 (right) */
  pan?: number;
  /** frequency multiplier, 1 = normal */
  pitch?: number;
  /** 0..1+ gain multiplier */
  volume?: number;
}

interface ActiveVoice {
  start: number;
  end: number;
  g: GainNode;
}

const MAX_MUSIC_VOICES = 72;
const MAX_MUSIC_VOICES_LOW = 44;
const MAX_SFX_VOICES = 40;
const TICK_MS = 40;
const LOOKAHEAD = 0.24;
const LOOKAHEAD_HIDDEN = 1.2;

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1);

/**
 * Legacy WebKit returned `undefined` from AudioNode.connect(); the synth
 * chains connections (`a.connect(b).connect(c)`), so patch it to return the
 * destination like the standard does.
 */
function shimConnect(ctx: BaseAudioContext): void {
  try {
    const probe = ctx.createGain();
    const other = ctx.createGain();
    const ret = probe.connect(other) as unknown;
    probe.disconnect();
    if (ret !== undefined) return;
    const proto = Object.getPrototypeOf(Object.getPrototypeOf(probe)) as { connect: (...a: unknown[]) => unknown };
    const orig = proto.connect;
    proto.connect = function (this: unknown, dest: unknown, ...rest: unknown[]) {
      orig.call(this, dest, ...rest);
      return dest;
    };
  } catch {
    /* ignore */
  }
}

/** low quality on small devices (≤ 4 logical cores), high elsewhere */
function defaultQuality(): 'high' | 'low' {
  try {
    const n = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined;
    return typeof n === 'number' && n > 0 && n <= 4 ? 'low' : 'high';
  } catch {
    return 'high';
  }
}

// ---------------------------------------------------------------------------
//  Channel: insert → volume → pan → player bus (+ reverb send)
// ---------------------------------------------------------------------------

class Channel {
  readonly input: AudioNode;
  private insert: Insert | null;
  private nodes: AudioNode[] = [];

  constructor(core: SynthCore, instId: string, vol: number, pan: number, rev: number, dry: AudioNode, wet: AudioNode) {
    const ctx = core.ctx;
    const inst = INSTRUMENTS[instId];
    this.insert = inst?.insert ? inst.insert(core) : null;
    const g = mkGain(ctx, vol);
    const p = makePanner(ctx, pan);
    const send = mkGain(ctx, rev);
    if (this.insert) {
      this.insert.output.connect(g);
      this.input = this.insert.input;
    } else this.input = g;
    g.connect(p).connect(dry);
    g.connect(send).connect(wet);
    this.nodes.push(g, p, send);
  }

  dispose(): void {
    this.insert?.dispose();
    for (const n of this.nodes) {
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
  }
}

// ---------------------------------------------------------------------------
//  MusicPlayer: one playing track (several may overlap during crossfades)
// ---------------------------------------------------------------------------

class MusicPlayer {
  readonly dry: GainNode;
  readonly wet: GainNode;
  readonly channels: Channel[];
  idx = 0;
  iter = 0;
  done = false;
  stopAt = Infinity;
  disposeAt = Infinity;

  constructor(
    readonly engine: AudioEngine,
    readonly core: SynthCore,
    readonly bus: MasterBus,
    readonly track: CompiledTrack,
    readonly start: number,
    readonly loop: boolean,
    fadeIn: number,
  ) {
    const ctx = core.ctx;
    this.dry = mkGain(ctx, 0);
    this.wet = mkGain(ctx, 0);
    const now = ctx.currentTime;
    const level = track.gain;
    for (const g of [this.dry, this.wet]) {
      g.gain.setValueAtTime(0, now);
      if (fadeIn > 0.02) {
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(level, start + fadeIn);
      } else g.gain.setValueAtTime(level, Math.max(now, start - 0.01));
    }
    this.dry.connect(bus.music);
    this.wet.connect(bus.musicSend);
    this.channels = track.voices.map((v) => {
      const inst = INSTRUMENTS[v.i];
      return new Channel(core, v.i, v.vol ?? 1, v.pan ?? 0, v.rev ?? inst?.rev ?? 0.3, this.dry, this.wet);
    });
  }

  get loopLen(): number {
    return this.track.length - this.track.loopStart;
  }

  /** schedule every event that starts before `until` */
  pump(until: number): void {
    const tr = this.track;
    const ev = tr.events;
    const now = this.core.ctx.currentTime;
    for (let guard = 0; guard < 4000 && !this.done; guard++) {
      if (this.idx >= ev.length) {
        if (!this.loop || tr.loopIndex >= ev.length || this.loopLen < 0.5) {
          this.done = true;
          return;
        }
        this.iter++;
        this.idx = tr.loopIndex;
        continue;
      }
      const e = ev[this.idx];
      const time = this.start + e.t + (this.iter > 0 ? this.iter * this.loopLen : 0);
      if (time > until) return;
      if (time >= this.stopAt) {
        this.done = true;
        return;
      }
      this.idx++;
      if (time < now - 0.05) continue; // fell behind (tab hiccup): skip, don't pile up
      this.engine._playEvent(this, e, time);
    }
  }

  fadeOut(now: number, fade: number): void {
    const f = Math.max(0.03, fade);
    for (const g of [this.dry, this.wet]) {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + f);
    }
    this.stopAt = Math.min(this.stopAt, now + f);
    this.disposeAt = now + f + 0.3;
  }

  /** track position (s) within the arrangement, accounting for loops */
  position(now: number): number {
    const t = now - this.start;
    if (t < this.track.length || !this.loop || this.loopLen <= 0) return Math.max(0, t);
    return this.track.loopStart + ((t - this.track.loopStart) % this.loopLen);
  }

  dispose(): void {
    for (const c of this.channels) c.dispose();
    try {
      this.dry.disconnect();
      this.wet.disconnect();
    } catch {
      /* ignore */
    }
  }
}

// ---------------------------------------------------------------------------
//  Engine
// ---------------------------------------------------------------------------

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private core: SynthCore | null = null;
  private bus: MasterBus | null = null;
  private disabled = false;
  private unlocking: Promise<void> | null = null;
  private vols: Volumes = { master: 0.9, music: 0.8, sfx: 0.9 };
  private wanted: { id: string; opts: MusicOptions } | null = null;
  private player: MusicPlayer | null = null;
  private fading: MusicPlayer[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private musicVoices: ActiveVoice[] = [];
  private sfxVoices: ActiveVoice[] = [];
  private lastSfx = new Map<string, number>();
  private duckUntil = 0;
  private duckLevel = 1;
  private quality: 'high' | 'low' = defaultQuality();

  /** Web Audio is present (or unknown before unlock) and not failed */
  get available(): boolean {
    return !this.disabled;
  }

  /** an AudioContext exists and is running */
  get unlocked(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** id of the requested / playing track (null when stopped) */
  get currentMusic(): string | null {
    return this.wanted ? this.wanted.id : null;
  }

  /** all track ids */
  get trackIds(): string[] {
    return Object.keys(TRACKS);
  }

  /** all sfx ids */
  get sfxIds(): string[] {
    return Object.keys(SFX);
  }

  /** master analyser (null before unlock) — for meters / visualisers */
  get analyser(): AnalyserNode | null {
    return this.bus ? this.bus.analyser : null;
  }

  // -------------------------------------------------------------------------
  //  Unlock
  // -------------------------------------------------------------------------

  /** Create / resume the AudioContext. Call from a user gesture; safe to repeat. */
  unlock(): Promise<void> {
    if (this.disabled) return Promise.resolve();
    if (this.ctx) return this.resume();
    if (this.unlocking) return this.unlocking;
    this.unlocking = this.create().finally(() => {
      this.unlocking = null;
    });
    return this.unlocking;
  }

  /**
   * Listen for the first (and later) user gestures and unlock/resume audio.
   * Returns a function that removes the listeners.
   */
  attachUnlock(target?: EventTarget): () => void {
    const tgt: EventTarget | undefined = target ?? (typeof window !== 'undefined' ? window : undefined);
    if (!tgt || typeof tgt.addEventListener !== 'function') return () => {};
    const events = ['pointerdown', 'mousedown', 'touchend', 'keydown', 'click'];
    const handler = () => {
      void this.unlock();
    };
    for (const e of events) tgt.addEventListener(e, handler, { capture: true, passive: true } as AddEventListenerOptions);
    return () => {
      for (const e of events) tgt.removeEventListener(e, handler, { capture: true } as EventListenerOptions);
    };
  }

  private async create(): Promise<void> {
    const g = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AC = g.AudioContext || g.webkitAudioContext;
    if (!AC) {
      this.disabled = true;
      return;
    }
    let ctx: AudioContext;
    try {
      ctx = new AC({ latencyHint: 'interactive' });
    } catch {
      try {
        ctx = new AC();
      } catch (e) {
        console.warn('[audio] Web Audio unavailable', e);
        this.disabled = true;
        return;
      }
    }
    shimConnect(ctx);
    try {
      // iOS: a silent buffer started inside the gesture unlocks output
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(ctx.destination);
      s.start(0);
    } catch {
      /* ignore */
    }
    try {
      this.core = createCore(ctx);
      this.core.lite = this.quality === 'low';
      this.bus = createMasterBus(this.core, ctx.destination);
    } catch (e) {
      console.warn('[audio] failed to build audio graph', e);
      this.disabled = true;
      this.core = null;
      this.bus = null;
      try {
        void ctx.close();
      } catch {
        /* ignore */
      }
      return;
    }
    this.ctx = ctx;
    this.applyVolumes(0);
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) void this.resume();
      });
    }
    const resumed = this.resume();
    if (this.wanted) this.startPlayer(this.wanted.id, 0.05, this.wanted.opts.loop);
    await resumed;
  }

  /** resume the context; never waits more than ~1 s (some engines leave the promise pending) */
  private resume(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve();
    const st = ctx.state as string;
    if (st === 'running' || st === 'closed') return Promise.resolve();
    try {
      const p = ctx.resume().catch(() => {});
      return Promise.race([p, new Promise<void>((r) => setTimeout(r, 1000))]);
    } catch {
      return Promise.resolve();
    }
  }

  // -------------------------------------------------------------------------
  //  Music
  // -------------------------------------------------------------------------

  playMusic(id: string, opts: MusicOptions = {}): void {
    try {
      const fade = opts.fade ?? 1;
      if (!id) {
        this.stopMusic(fade);
        return;
      }
      if (!TRACKS[id]) {
        console.warn(`[audio] unknown music id "${id}"`);
        this.stopMusic(fade);
        return;
      }
      const same = this.wanted && this.wanted.id === id;
      if (same && !opts.restart && (this.player || !this.ctx)) {
        this.wanted = { id, opts };
        return;
      }
      this.wanted = { id, opts };
      if (!this.ctx || !this.core) return; // remembered until unlock()
      this.startPlayer(id, fade, opts.loop);
    } catch (e) {
      console.warn('[audio] playMusic failed', e);
    }
  }

  stopMusic(fade = 1): void {
    this.wanted = null;
    if (!this.ctx) return;
    try {
      if (this.player) {
        this.player.fadeOut(this.ctx.currentTime, fade);
        this.fading.push(this.player);
        this.player = null;
      }
    } catch (e) {
      console.warn('[audio] stopMusic failed', e);
    }
  }

  /** compile a track (and pre-render its plucked notes) ahead of time */
  preload(id: string): void {
    const def = TRACKS[id];
    if (!def) return;
    const tr = compileTrack(def);
    if (this.core) this.prerender(tr, 12);
  }

  private prerender(tr: CompiledTrack, seconds: number): void {
    const core = this.core;
    if (!core) return;
    for (const e of tr.events) {
      if (e.t > seconds) break;
      const inst = INSTRUMENTS[tr.voices[e.v].i];
      if (inst?.pluck) getPluck(core, e.m, inst.pluck);
    }
  }

  private startPlayer(id: string, fade: number, loop?: boolean): void {
    const ctx = this.ctx;
    const core = this.core;
    const bus = this.bus;
    if (!ctx || !core || !bus) return;
    const def = TRACKS[id];
    if (!def) return;
    const tr = compileTrack(def);
    if (tr.errors.length) console.warn(`[audio] track "${id}" has notation errors`, tr.errors);
    this.prerender(tr, 3);
    const now = ctx.currentTime;
    const had = !!this.player;
    if (this.player) {
      this.player.fadeOut(now, fade);
      this.fading.push(this.player);
      this.player = null;
    }
    const delay = had && fade > 0 ? Math.min(fade * 0.4, 0.6) : 0;
    const start = now + 0.08 + delay;
    const fadeIn = had && fade > 0 ? Math.min(fade * 0.5, 0.8) : 0;
    this.player = new MusicPlayer(this, core, bus, tr, start, loop ?? tr.loop, fadeIn);
    this.ensureTimer();
    this.tick();
  }

  private ensureTimer(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private tick(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const hidden = typeof document !== 'undefined' && !!document.hidden;
      const until = now + (hidden ? LOOKAHEAD_HIDDEN : LOOKAHEAD);
      const p = this.player;
      if (p) {
        p.pump(until);
        if (p.done && !p.loop && now > p.start + p.track.length + 0.2) {
          // one-shot track finished
          this.player = null;
          p.disposeAt = now + 4;
          this.fading.push(p);
          if (this.wanted && this.wanted.id === p.track.id) this.wanted = null;
        }
      }
      for (const f of this.fading) if (!f.done) f.pump(until);
      this.fading = this.fading.filter((f) => {
        if (now >= f.disposeAt) {
          f.dispose();
          return false;
        }
        return true;
      });
      if (!this.player && !this.fading.length && this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
    } catch (e) {
      console.warn('[audio] scheduler error', e);
    }
  }

  /** @internal called by MusicPlayer */
  _playEvent(p: MusicPlayer, e: NoteEvent, time: number): void {
    const ctx = this.ctx;
    const core = this.core;
    if (!ctx || !core) return;
    const vd = p.track.voices[e.v];
    const inst = INSTRUMENTS[vd.i];
    if (!inst) return;
    const h = inst.human ?? 0.007;
    const t = Math.max(ctx.currentTime + 0.002, time + (Math.random() * 2 - 1) * h);
    const vel = e.vel * (1 + (Math.random() * 2 - 1) * 0.06);
    this.reserve(this.musicVoices, this.quality === 'low' ? MAX_MUSIC_VOICES_LOW : MAX_MUSIC_VOICES, t);
    const vg = mkGain(ctx, 1);
    vg.connect(p.channels[e.v].input);
    let end = t + e.d;
    try {
      end = e.roll ? playRoll(inst, core, vg, t, e.m, e.d, vel, e.roll) : inst.note(core, vg, t, e.m, e.d, vel);
    } catch (err) {
      console.warn('[audio] note failed', vd.i, err);
    }
    this.musicVoices.push({ start: t, end, g: vg });
  }

  /** voice limiting: drop finished voices, steal the oldest when full */
  private reserve(list: ActiveVoice[], limit: number, t: number): void {
    const now = this.ctx ? this.ctx.currentTime : 0;
    if (list.length >= limit * 0.75) {
      let w = 0;
      for (let r = 0; r < list.length; r++) if (list[r].end > now) list[w++] = list[r];
      list.length = w;
    }
    while (list.length >= limit) {
      let oldest = 0;
      for (let k = 1; k < list.length; k++) if (list[k].start < list[oldest].start) oldest = k;
      const v = list[oldest];
      list.splice(oldest, 1);
      try {
        const at = Math.max(now, Math.min(t, v.end));
        v.g.gain.setValueAtTime(1, at);
        v.g.gain.linearRampToValueAtTime(0, at + 0.03);
      } catch {
        /* ignore */
      }
    }
  }

  /** duck the music by `amount` (0..1) for `seconds` */
  duck(amount: number, seconds: number): void {
    const ctx = this.ctx;
    const bus = this.bus;
    if (!ctx || !bus) return;
    try {
      const now = ctx.currentTime;
      const target = 1 - clamp01(amount);
      const active = now < this.duckUntil;
      const level = active ? Math.min(this.duckLevel, target) : target;
      const until = Math.max(active ? this.duckUntil : 0, now + Math.max(0, seconds));
      this.duckLevel = level;
      this.duckUntil = until;
      for (const g of bus.duck) {
        const p = g.gain;
        p.cancelScheduledValues(now);
        p.setValueAtTime(p.value, now);
        p.linearRampToValueAtTime(level, now + 0.08);
        p.setValueAtTime(level, until);
        p.linearRampToValueAtTime(1, until + 0.6);
      }
    } catch (e) {
      console.warn('[audio] duck failed', e);
    }
  }

  // -------------------------------------------------------------------------
  //  SFX
  // -------------------------------------------------------------------------

  sfx(id: string, opts: SfxOptions = {}): void {
    const ctx = this.ctx;
    const core = this.core;
    const bus = this.bus;
    if (!ctx || !core || !bus || ctx.state !== 'running') return;
    try {
      const def: SfxDef = SFX[id] ?? GENERIC_SFX;
      const nowMs = ctx.currentTime * 1000;
      const key = SFX[id] ? id : '?';
      const last = this.lastSfx.get(key);
      if (last !== undefined && nowMs - last < (def.gap ?? 25)) return;
      this.lastSfx.set(key, nowMs);
      const t = ctx.currentTime + 0.004;
      this.reserve(this.sfxVoices, MAX_SFX_VOICES, t);
      const vol = (def.vol ?? 1) * (opts.volume ?? 1);
      const out = mkGain(ctx, Math.max(0, vol));
      const pan = makePanner(ctx, opts.pan ?? 0);
      out.connect(pan).connect(bus.sfx);
      out.connect(mkGain(ctx, def.rev ?? 0.18)).connect(bus.sfxSend);
      const p = opts.pitch && opts.pitch > 0 ? opts.pitch : 1;
      const end = def.play({ core, ctx, out, t, p });
      this.sfxVoices.push({ start: t, end, g: out });
    } catch (e) {
      console.warn(`[audio] sfx "${id}" failed`, e);
    }
  }

  // -------------------------------------------------------------------------
  //  Volumes
  // -------------------------------------------------------------------------

  setVolumes(v: Partial<Volumes>): void {
    if (v.master !== undefined) this.vols.master = clamp01(v.master);
    if (v.music !== undefined) this.vols.music = clamp01(v.music);
    if (v.sfx !== undefined) this.vols.sfx = clamp01(v.sfx);
    this.applyVolumes(0.04);
  }

  getVolumes(): Volumes {
    return { ...this.vols };
  }

  private applyVolumes(tau: number): void {
    const ctx = this.ctx;
    const bus = this.bus;
    if (!ctx || !bus) return;
    const now = ctx.currentTime;
    const set = (g: GainNode, v: number) => {
      // perceptual curve
      const x = v * v;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(x, now + Math.max(0.005, tau));
    };
    set(bus.master, this.vols.master);
    for (const g of bus.musicVol) set(g, this.vols.music);
    for (const g of bus.sfxVol) set(g, this.vols.sfx);
  }

  // -------------------------------------------------------------------------
  //  Quality
  // -------------------------------------------------------------------------

  /**
   * 'high' (default on desktops) or 'low' (default on ≤4-core devices): low
   * drops the ensemble chorus inserts, uses a shorter reverb and a smaller
   * voice budget. Takes effect for the next track started.
   */
  setQuality(q: 'high' | 'low'): void {
    this.quality = q === 'low' ? 'low' : 'high';
    if (this.core) this.core.lite = this.quality === 'low';
  }

  getQuality(): 'high' | 'low' {
    return this.quality;
  }

  // -------------------------------------------------------------------------
  //  Debug
  // -------------------------------------------------------------------------

  /** snapshot for dev tools */
  debug(): { state: string; track: string | null; time: number; length: number; section: string | null; loops: number; musicVoices: number; sfxVoices: number } {
    const ctx = this.ctx;
    const p = this.player;
    const now = ctx ? ctx.currentTime : 0;
    let section: string | null = null;
    let pos = 0;
    if (p) {
      pos = p.position(now);
      for (const m of p.track.markers) if (m.t <= pos + 1e-3) section = m.name;
    }
    return {
      state: ctx ? ctx.state : this.disabled ? 'unavailable' : 'locked',
      track: p ? p.track.id : null,
      time: pos,
      length: p ? p.track.length : 0,
      section,
      loops: p ? Math.max(0, p.iter) : 0,
      musicVoices: this.musicVoices.filter((v) => v.end > now).length,
      sfxVoices: this.sfxVoices.filter((v) => v.end > now).length,
    };
  }
}

export const audio = new AudioEngine();
