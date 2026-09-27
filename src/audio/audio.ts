/** File-based audio. All asset paths, cue settings and provenance live in manifest.json. */
import { type AudioCue, assetUrl, manifest } from "./manifest";

export interface Volumes {
	master: number;
	music: number;
	sfx: number;
}
export interface MusicOptions {
	fade?: number;
	loop?: boolean;
	restart?: boolean;
}
export interface SfxOptions {
	pan?: number;
	pitch?: number;
	volume?: number;
}
interface MusicPlayer {
	id: string;
	media: HTMLAudioElement;
	source: MediaElementAudioSourceNode;
	gain: GainNode;
	timer?: ReturnType<typeof setTimeout>;
	loops: number;
	previousTime: number;
	released: boolean;
}
interface EffectVoice {
	source: AudioBufferSourceNode;
	gain: GainNode;
	pan: AudioNode;
}
const clamp = (v: number, min = 0, max = 1) =>
	Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min;

export class AudioEngine {
	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private musicBus: GainNode | null = null;
	private effectBus: GainNode | null = null;
	private duckBus: GainNode | null = null;
	private meter: AnalyserNode | null = null;
	private disabled = false;
	private vols: Volumes = { master: 0.9, music: 0.8, sfx: 0.9 };
	private wanted: { id: string; opts: MusicOptions } | null = null;
	private player: MusicPlayer | null = null;
	private pending: MusicPlayer | null = null;
	private fading = new Set<MusicPlayer>();
	private request = 0;
	private buffers = new Map<string, Promise<AudioBuffer>>();
	private voices: EffectVoice[] = [];
	private lastSfx = new Map<string, number>();
	private quality: "high" | "low" = "high";
	private duckUntil = 0;
	private duckLevel = 1;
	private error: string | null = null;

	get available(): boolean {
		return !this.disabled;
	}
	get unlocked(): boolean {
		return this.ctx?.state === "running";
	}
	get currentMusic(): string | null {
		return this.wanted?.id ?? null;
	}
	get trackIds(): string[] {
		return Object.keys(manifest.music);
	}
	get sfxIds(): string[] {
		return Object.keys(manifest.sfx);
	}
	get analyser(): AnalyserNode | null {
		return this.meter;
	}

	/** Create/resume synchronously inside the gesture, before starting media playback. */
	unlock(): Promise<void> {
		if (this.disabled) return Promise.resolve();
		if (this.ctx) {
			const resumed = this.resume();
			if (this.wanted && !this.player && !this.pending)
				this.startMusic(this.wanted.id, this.wanted.opts);
			return resumed;
		}
		const globals = globalThis as typeof globalThis & {
			webkitAudioContext?: typeof AudioContext;
		};
		const AC = globals.AudioContext ?? globals.webkitAudioContext;
		if (!AC) {
			this.disabled = true;
			return Promise.resolve();
		}
		try {
			const ctx = new AC();
			this.ctx = ctx;
			this.master = ctx.createGain();
			this.musicBus = ctx.createGain();
			this.effectBus = ctx.createGain();
			this.duckBus = ctx.createGain();
			this.meter = ctx.createAnalyser();
			this.musicBus.connect(this.duckBus);
			this.duckBus.connect(this.master);
			this.effectBus.connect(this.master);
			this.master.connect(this.meter);
			this.meter.connect(ctx.destination);
			this.applyVolumes();
			if (typeof document !== "undefined")
				document.addEventListener("visibilitychange", this.visibility);
			const resumed = this.resume();
			if (this.wanted) this.startMusic(this.wanted.id, this.wanted.opts);
			// Short effects decode once; music streams instead of retaining full PCM tracks.
			for (const id of new Set(
				Object.values(manifest.sfx).map((c) => c.asset),
			)) {
				void this.loadEffect(id).catch((e) => this.report(`load ${id}`, e));
			}
			return resumed;
		} catch (e) {
			this.report("Web Audio unavailable", e);
			this.disabled = true;
			this.dispose();
			return Promise.resolve();
		}
	}

	attachUnlock(target?: EventTarget): () => void {
		const tgt = target ?? (typeof window !== "undefined" ? window : undefined);
		if (!tgt) return () => {};
		const events = ["pointerdown", "mousedown", "touchend", "keydown", "click"];
		const handler = () => {
			void this.unlock();
		};
		for (const name of events)
			tgt.addEventListener(name, handler, { capture: true, passive: true });
		return () => {
			for (const name of events) tgt.removeEventListener(name, handler, true);
		};
	}

	private resume(): Promise<void> {
		const ctx = this.ctx;
		if (!ctx || ctx.state === "closed") return Promise.resolve();
		if (typeof document !== "undefined" && document.hidden)
			return Promise.resolve();
		for (const p of [this.player, this.pending, ...this.fading]) {
			if (p?.media.paused)
				void p.media.play().catch((e) => this.report(`resume ${p.id}`, e));
		}
		if (ctx.state === "running") return Promise.resolve();
		// Some mobile engines leave resume pending until another gesture.
		return Promise.race([
			ctx.resume().catch(() => {}),
			new Promise<void>((r) => setTimeout(r, 1000)),
		]);
	}
	private visibility = () => {
		if (document.hidden) {
			for (const p of [this.player, this.pending, ...this.fading])
				p?.media.pause();
			void this.ctx?.suspend().catch(() => {});
		} else void this.resume();
	};

	playMusic(id: string, opts: MusicOptions = {}): void {
		if (!id) {
			this.stopMusic(opts.fade);
			return;
		}
		if (!Object.hasOwn(manifest.music, id)) {
			console.warn(`[audio] unknown music id "${id}"`);
			this.stopMusic(opts.fade);
			return;
		}
		if (
			this.wanted?.id === id &&
			!opts.restart &&
			(this.player || this.pending || !this.ctx)
		) {
			this.wanted = { id, opts };
			if (opts.loop !== undefined) {
				for (const p of [this.player, this.pending])
					if (p?.id === id) p.media.loop = opts.loop;
			}
			return;
		}
		this.wanted = { id, opts };
		if (this.ctx) this.startMusic(id, opts);
	}

	private startMusic(id: string, opts: MusicOptions): void {
		const ctx = this.ctx;
		if (!ctx || !this.musicBus) return;
		const revision = ++this.request;
		if (this.pending) this.releaseMusic(this.pending);
		this.pending = null;
		const cue = manifest.music[id];
		const asset = manifest.assets[cue.asset];
		try {
			const media = new Audio(assetUrl(asset));
			media.preload = "auto";
			media.loop = opts.loop ?? cue.loop ?? true;
			const gain = ctx.createGain();
			gain.gain.value = 0;
			const source = ctx.createMediaElementSource(media);
			source.connect(gain);
			gain.connect(this.musicBus);
			const player: MusicPlayer = {
				id,
				media,
				gain,
				source,
				loops: 0,
				previousTime: 0,
				released: false,
			};
			this.pending = player;
			media.onended = () => {
				if (this.player !== player) return;
				this.player = null;
				if (this.wanted?.id === id) this.wanted = null;
				this.releaseMusic(player);
			};
			media.onerror = () => {
				if (this.pending === player) this.pending = null;
				if (this.player === player) this.player = null;
				this.report(`music ${id}`, new Error(`Cannot play ${asset.src}`));
				this.releaseMusic(player);
			};
			void media
				.play()
				.then(() => {
					if (revision !== this.request || this.pending !== player) {
						this.releaseMusic(player);
						return;
					}
					const fade = clamp(opts.fade ?? 1, 0, 10);
					if (this.player) this.fadeOut(this.player, fade);
					this.player = player;
					this.pending = null;
					this.error = null;
					const now = ctx.currentTime;
					gain.gain.setValueAtTime(0, now);
					gain.gain.linearRampToValueAtTime(
						cue.gain ?? 1,
						now + Math.max(0.01, fade),
					);
				})
				.catch((e) => {
					if (revision === this.request && this.pending === player) {
						this.pending = null;
						// Background pause can abort play; the next gesture retries the requested cue.
						if (typeof document === "undefined" || !document.hidden)
							this.report(`music ${id}`, e);
					}
					this.releaseMusic(player);
				});
		} catch (e) {
			this.report(`music ${id}`, e);
		}
	}

	stopMusic(fade = 1): void {
		this.wanted = null;
		this.request++;
		if (this.pending) this.releaseMusic(this.pending);
		this.pending = null;
		if (this.player) this.fadeOut(this.player, clamp(fade, 0, 10));
		this.player = null;
	}
	private fadeOut(p: MusicPlayer, fade: number): void {
		const now = this.ctx?.currentTime ?? 0;
		p.gain.gain.cancelScheduledValues(now);
		p.gain.gain.setValueAtTime(p.gain.gain.value, now);
		p.gain.gain.linearRampToValueAtTime(0, now + Math.max(0.01, fade));
		this.fading.add(p);
		p.timer = setTimeout(() => this.releaseMusic(p), fade * 1000 + 30);
	}
	private releaseMusic(p: MusicPlayer): void {
		if (p.released) return;
		p.released = true;
		clearTimeout(p.timer);
		this.fading.delete(p);
		p.media.onended = null;
		p.media.onerror = null;
		p.media.pause();
		p.media.removeAttribute("src");
		p.media.load();
		p.source.disconnect();
		p.gain.disconnect();
	}

	/** Warm an effect without playing it (music streams when requested). */
	preload(id: string): void {
		const cue = manifest.sfx[id];
		if (this.ctx && cue)
			void this.loadEffect(cue.asset).catch((e) =>
				this.report(`preload ${id}`, e),
			);
	}
	private loadEffect(id: string): Promise<AudioBuffer> {
		const cached = this.buffers.get(id);
		if (cached) return cached;
		const ctx = this.ctx;
		if (!ctx) return Promise.reject(new Error("Audio is locked"));
		const promise = (async () => {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 15000);
			try {
				const response = await fetch(assetUrl(manifest.assets[id]), {
					signal: controller.signal,
				});
				if (!response.ok)
					throw new Error(
						`HTTP ${response.status}: ${manifest.assets[id].src}`,
					);
				return await ctx.decodeAudioData(await response.arrayBuffer());
			} finally {
				clearTimeout(timeout);
			}
		})().catch((e) => {
			this.buffers.delete(id);
			throw e;
		});
		this.buffers.set(id, promise);
		return promise;
	}
	sfx(id: string, opts: SfxOptions = {}): void {
		const ctx = this.ctx;
		if (!ctx || !this.effectBus || ctx.state !== "running") return;
		const key = Object.hasOwn(manifest.sfx, id) ? id : manifest.fallbackSfx;
		const cue = manifest.sfx[key];
		const now = ctx.currentTime;
		if ((now - (this.lastSfx.get(key) ?? -Infinity)) * 1000 < (cue.gapMs ?? 25))
			return;
		this.lastSfx.set(key, now);
		const requestedAt = performance.now();
		void this.loadEffect(cue.asset)
			.then((buffer) => {
				// Don't burst stale effects after a slow download, hidden tab or disposed context.
				if (
					ctx !== this.ctx ||
					ctx.state !== "running" ||
					performance.now() - requestedAt > 750
				)
					return;
				this.playEffect(buffer, cue, opts);
			})
			.catch((e) => this.report(`sfx ${id}`, e));
	}
	private playEffect(
		buffer: AudioBuffer,
		cue: AudioCue,
		opts: SfxOptions,
	): void {
		const ctx = this.ctx;
		const bus = this.effectBus;
		if (!ctx || !bus) return;
		const limit = this.quality === "low" ? 16 : 32;
		while (this.voices.length >= limit) this.releaseVoice(this.voices[0]);
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.playbackRate.value = clamp(
			(opts.pitch ?? 1) * (cue.pitch ?? 1),
			0.1,
			4,
		);
		const gain = ctx.createGain();
		gain.gain.value = clamp((cue.gain ?? 1) * (opts.volume ?? 1), 0, 4);
		const pan = ctx.createStereoPanner
			? ctx.createStereoPanner()
			: ctx.createGain();
		if ("pan" in pan) pan.pan.value = clamp(opts.pan ?? 0, -1, 1);
		source.connect(gain);
		gain.connect(pan);
		pan.connect(bus);
		const voice = { source, gain, pan };
		this.voices.push(voice);
		source.onended = () => this.releaseVoice(voice);
		const offset = clamp(cue.offset ?? 0, 0, buffer.duration);
		const duration = Math.min(
			cue.duration ?? buffer.duration,
			buffer.duration - offset,
		);
		const end = ctx.currentTime + duration / source.playbackRate.value;
		gain.gain.setValueAtTime(
			gain.gain.value,
			Math.max(ctx.currentTime, end - 0.01),
		);
		gain.gain.linearRampToValueAtTime(0, end);
		source.start(0, offset, duration);
	}
	private releaseVoice(v: EffectVoice): void {
		v.source.onended = null;
		try {
			v.source.stop();
		} catch {
			/* already stopped */
		}
		v.source.disconnect();
		v.gain.disconnect();
		v.pan.disconnect();
		this.voices = this.voices.filter((candidate) => candidate !== v);
	}

	duck(amount: number, seconds: number): void {
		if (!this.ctx || !this.duckBus) return;
		const now = this.ctx.currentTime;
		const active = now < this.duckUntil;
		this.duckLevel = active
			? Math.min(this.duckLevel, 1 - clamp(amount))
			: 1 - clamp(amount);
		this.duckUntil = Math.max(
			active ? this.duckUntil : 0,
			now + clamp(seconds, 0, 60),
		);
		const gain = this.duckBus.gain;
		gain.cancelScheduledValues(now);
		gain.setValueAtTime(gain.value, now);
		gain.linearRampToValueAtTime(this.duckLevel, now + 0.08);
		gain.setValueAtTime(this.duckLevel, Math.max(now + 0.08, this.duckUntil));
		gain.linearRampToValueAtTime(1, Math.max(now + 0.08, this.duckUntil) + 0.6);
	}
	setVolumes(v: Partial<Volumes>): void {
		for (const key of ["master", "music", "sfx"] as const)
			if (v[key] !== undefined) this.vols[key] = clamp(v[key]);
		this.applyVolumes();
	}
	getVolumes(): Volumes {
		return { ...this.vols };
	}
	private applyVolumes(): void {
		if (!this.ctx) return;
		for (const [node, value] of [
			[this.master, this.vols.master],
			[this.musicBus, this.vols.music],
			[this.effectBus, this.vols.sfx],
		] as const) {
			node?.gain.setTargetAtTime(value * value, this.ctx.currentTime, 0.015);
		}
	}
	/** Low quality reduces simultaneous effects; the files stay identical. */
	setQuality(q: "high" | "low"): void {
		this.quality = q === "low" ? "low" : "high";
	}
	getQuality(): "high" | "low" {
		return this.quality;
	}
	private report(action: string, error: unknown): void {
		this.error = `${action}: ${error instanceof Error ? error.message : String(error)}`;
		console.warn(`[audio] ${this.error}`);
	}
	debug() {
		const p = this.player;
		const time = p?.media.currentTime ?? 0;
		if (p) {
			if (time < p.previousTime) p.loops++;
			p.previousTime = time;
		}
		return {
			state: this.ctx?.state ?? (this.disabled ? "unavailable" : "locked"),
			track: p?.id ?? null,
			time,
			length: p && Number.isFinite(p.media.duration) ? p.media.duration : 0,
			section: p ? manifest.assets[manifest.music[p.id].asset].title : null,
			loops: p?.loops ?? 0,
			musicVoices: (p ? 1 : 0) + this.fading.size,
			sfxVoices: this.voices.length,
			loading: this.pending?.id ?? null,
			error: this.error,
		};
	}
	dispose(): void {
		this.request++;
		for (const p of [this.player, this.pending, ...this.fading])
			if (p) this.releaseMusic(p);
		this.player = null;
		this.pending = null;
		this.wanted = null;
		for (const v of [...this.voices]) this.releaseVoice(v);
		if (typeof document !== "undefined")
			document.removeEventListener("visibilitychange", this.visibility);
		void this.ctx?.close().catch(() => {});
		this.ctx = null;
		this.buffers.clear();
		this.lastSfx.clear();
		this.master =
			this.musicBus =
			this.effectBus =
			this.duckBus =
			this.meter =
				null;
	}
}
export const audio = new AudioEngine();
