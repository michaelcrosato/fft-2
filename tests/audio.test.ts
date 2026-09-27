import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioEngine } from "../src/audio/audio";
import { manifest } from "../src/audio/manifest";
import { validateAudioAssets } from "../tools/audio-assets";

const REQUIRED_TRACKS =
	"title prologue worldmap town tavern battle1 battle2 battle3 boss umbral finalBoss victory defeat somber tension church heroic romance campfire dungeon ending credits chapter formation".split(
		" ",
	);
const REQUIRED_SFX =
	"cursor confirm cancel error menuOpen step jump land swing hit hitHeavy crit miss block arrow gun throw magic charge fire ice bolt water earth wind holy dark poison heal buff debuff status time summon explosion meteor song dance steal item ko crystal chest levelUp jobUp learn gil victory defeat turn textBlip door kweh roar demon thunderclap bell gunshot stone".split(
		" ",
	);

describe("single audio manifest", () => {
	it("has every existing cue and exact, complete on-disk attribution", () => {
		for (const id of REQUIRED_TRACKS)
			expect(manifest.music[id], id).toBeDefined();
		for (const id of REQUIRED_SFX) expect(manifest.sfx[id], id).toBeDefined();
		expect(validateAudioAssets()).toEqual([]);
		expect(manifest.music.defeat.loop).toBe(false);
		expect(manifest.music.chapter.loop).toBe(false);
	});
	it("covers literal gameplay and scene references (including old fallback-only aliases)", () => {
		for (const file of readdirSync("src", {
			recursive: true,
			withFileTypes: true,
		})) {
			if (
				!file.isFile() ||
				!file.name.endsWith(".ts") ||
				file.parentPath.endsWith("/audio")
			)
				continue;
			const source = readFileSync(resolve(file.parentPath, file.name), "utf8");
			for (const match of source.matchAll(
				/(?:audio\.sfx\(|\['sfx',\s*)'([^']+)'/g,
			))
				expect(manifest.sfx[match[1]], match[1]).toBeDefined();
			for (const match of source.matchAll(
				/(?:audio\.playMusic\(|music:\s*|\['music',\s*)'([^']+)'/g,
			))
				expect(manifest.music[match[1]], match[1]).toBeDefined();
		}
	});
	it("detects broken replacements and out-of-range excerpts", () => {
		const data = structuredClone(manifest);
		data.assets[data.music.title.asset].sha256 = "invalid";
		data.sfx.cursor.duration = 9999;
		data.music.battle1.asset = "missing";
		expect(validateAudioAssets(process.cwd(), data)).toEqual(
			expect.arrayContaining([
				expect.stringContaining("checksum mismatch"),
				expect.stringContaining("excerpt exceeds"),
				expect.stringContaining("missing asset"),
			]),
		);
	});
});

describe("without Web Audio", () => {
	it("is safe before unlock, remembers music, and clamps settings", async () => {
		const e = new AudioEngine();
		e.sfx("confirm");
		e.playMusic("title");
		e.duck(0.5, 1);
		expect(e.currentMusic).toBe("title");
		e.setVolumes({ master: 0.5, music: 2, sfx: -1 });
		expect(e.getVolumes()).toEqual({ master: 0.5, music: 1, sfx: 0 });
		e.setQuality("low");
		expect(e.getQuality()).toBe("low");
		expect(e.debug().state).toBe("locked");
		await e.unlock();
		expect(e.available).toBe(false);
		e.stopMusic();
		expect(e.currentMusic).toBeNull();
	});
});

class Param {
	value = 1;
	setValueAtTime = vi.fn((v: number) => {
		this.value = v;
	});
	linearRampToValueAtTime = vi.fn((v: number) => {
		this.value = v;
	});
	setTargetAtTime = vi.fn((v: number) => {
		this.value = v;
	});
	cancelScheduledValues = vi.fn();
}
class Node {
	gain = new Param();
	pan = new Param();
	playbackRate = new Param();
	buffer: unknown;
	onended: (() => void) | null = null;
	connect = vi.fn();
	disconnect = vi.fn();
	start = vi.fn();
	stop = vi.fn();
}
class Context {
	static current: Context;
	state = "running";
	currentTime = 1;
	destination = new Node();
	sources: Node[] = [];
	gains: Node[] = [];
	constructor() {
		Context.current = this;
	}
	createGain() {
		const n = new Node();
		this.gains.push(n);
		return n;
	}
	createAnalyser() {
		return new Node();
	}
	createMediaElementSource() {
		return new Node();
	}
	createStereoPanner() {
		return new Node();
	}
	createBufferSource() {
		const n = new Node();
		this.sources.push(n);
		return n;
	}
	decodeAudioData = vi.fn(async () => ({ duration: 5 }));
	resume = vi.fn(async () => {
		this.state = "running";
	});
	suspend = vi.fn(async () => {
		this.state = "suspended";
	});
	close = vi.fn(async () => {
		this.state = "closed";
	});
}
class Media {
	static all: Media[] = [];
	static deferred = false;
	paused = true;
	loop = false;
	duration = 10;
	currentTime = 0;
	onended: (() => void) | null = null;
	onerror: (() => void) | null = null;
	resolvePlay: () => void = () => {};
	rejectPlay: (e: Error) => void = () => {};
	constructor(public src: string) {
		Media.all.push(this);
	}
	play = vi.fn(() => {
		this.paused = false;
		return Media.deferred
			? new Promise<void>((res, rej) => {
					this.resolvePlay = res;
					this.rejectPlay = rej;
				})
			: Promise.resolve();
	});
	pause = vi.fn(() => {
		this.paused = true;
	});
	removeAttribute = vi.fn(() => {
		this.src = "";
	});
	load = vi.fn();
}

describe("file playback lifecycle", () => {
	let e: AudioEngine;
	let fakeDocument: {
		baseURI: string;
		hidden: boolean;
		addEventListener: ReturnType<typeof vi.fn>;
		removeEventListener: ReturnType<typeof vi.fn>;
	};
	beforeEach(() => {
		Media.all = [];
		Media.deferred = false;
		fakeDocument = {
			baseURI: "https://example.test/game/",
			hidden: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		};
		vi.stubGlobal("document", fakeDocument);
		vi.stubGlobal("AudioContext", Context);
		vi.stubGlobal("Audio", Media);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(8),
			})),
		);
		vi.spyOn(console, "warn").mockImplementation(() => {});
		e = new AudioEngine();
	});
	afterEach(() => {
		e.dispose();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});
	it("starts the queued track on unlock and resolves paths beneath the deployed base", async () => {
		vi.stubEnv("BASE_URL", "./");
		e.playMusic("title");
		expect(Media.all).toHaveLength(0);
		await e.unlock();
		expect(e.debug().track).toBe("title");
		expect(Media.all[0].src).toBe(
			`https://example.test/game/${manifest.assets[manifest.music.title.asset].src}`,
		);
		expect(Media.all[0].loop).toBe(true);
		e.playMusic("title", { loop: false });
		expect(Media.all).toHaveLength(1);
		expect(Media.all[0].loop).toBe(false);
		vi.unstubAllEnvs();
	});
	it("ignores an obsolete music load and cancels pending playback on stop", async () => {
		await e.unlock();
		Media.deferred = true;
		e.playMusic("title");
		const first = Media.all[0];
		e.playMusic("battle1");
		const second = Media.all[1];
		second.resolvePlay();
		await Promise.resolve();
		first.resolvePlay();
		await Promise.resolve();
		expect(e.debug().track).toBe("battle1");
		expect(first.paused).toBe(true);
		e.playMusic("boss");
		const pending = Media.all[2];
		e.stopMusic(0);
		pending.resolvePlay();
		await Promise.resolve();
		expect(e.currentMusic).toBeNull();
		expect(e.debug().track).toBeNull();
		expect(pending.paused).toBe(true);
	});
	it("keeps the playing track until the replacement is ready, then crossfades", async () => {
		await e.unlock();
		e.playMusic("title");
		await Promise.resolve();
		Media.deferred = true;
		e.playMusic("battle1", { fade: 0.05 });
		expect(e.debug().track).toBe("title");
		Media.all[1].resolvePlay();
		await Promise.resolve();
		expect(e.debug().track).toBe("battle1");
		expect(e.debug().musicVoices).toBe(2);
		await vi.waitFor(() => expect(Media.all[0].paused).toBe(true));
		expect(e.debug().musicVoices).toBe(1);
	});
	it("clears a completed one-shot and retries a failed request on the next gesture", async () => {
		await e.unlock();
		e.playMusic("chapter");
		await Promise.resolve();
		expect(Media.all[0].loop).toBe(false);
		expect(Media.all[0].onended).not.toBeNull();
		Media.all[0].onended?.();
		expect(e.currentMusic).toBeNull();
		Media.deferred = true;
		e.playMusic("town");
		Media.all[1].rejectPlay(new Error("failed"));
		await vi.waitFor(() => expect(e.debug().loading).toBeNull());
		expect(e.debug().error).toContain("failed");
		Media.deferred = false;
		await e.unlock();
		expect(e.debug().track).toBe("town");
	});
	it("caches shared SFX, applies pitch/pan, limits voices, and supports the manifest fallback", async () => {
		await e.unlock();
		await vi.waitFor(() =>
			expect(Context.current.decodeAudioData).toHaveBeenCalledTimes(
				new Set(Object.values(manifest.sfx).map((c) => c.asset)).size,
			),
		);
		const fetchCount = vi.mocked(fetch).mock.calls.length;
		e.sfx("confirm", { pitch: 1.5, pan: -0.5 });
		e.sfx("confirm"); // throttled
		await Promise.resolve();
		expect(Context.current.sources).toHaveLength(1);
		expect(Context.current.sources[0].playbackRate.value).toBe(1.5);
		e.setQuality("low");
		for (let i = 0; i < 20; i++) {
			Context.current.currentTime++;
			e.sfx("unknown");
			await Promise.resolve();
		}
		expect(e.debug().sfxVoices).toBe(16);
		expect(Context.current.sources[0].stop).toHaveBeenCalled();
		expect(vi.mocked(fetch)).toHaveBeenCalledTimes(fetchCount);
	});
	it("reports missing effects without throwing, and allows a later retry", async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response);
		await e.unlock();
		await vi.waitFor(() => expect(e.debug().error).toContain("HTTP 404"));
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(8),
		} as Response);
		e.sfx("hit");
		await vi.waitFor(() => expect(e.debug().sfxVoices).toBe(1));
	});
	it("suspends music in a hidden tab and resumes from the same media position", async () => {
		await e.unlock();
		e.playMusic("title");
		await Promise.resolve();
		Media.all[0].currentTime = 4;
		const visibility = fakeDocument.addEventListener.mock.calls[0][1];
		fakeDocument.hidden = true;
		visibility();
		expect(Media.all[0].paused).toBe(true);
		fakeDocument.hidden = false;
		visibility();
		expect(Media.all[0].paused).toBe(false);
		expect(e.debug().time).toBe(4);
		e.setVolumes({ master: 0.5, music: 0, sfx: 0.2 });
		expect(Context.current.gains[0].gain.value).toBe(0.25);
		expect(Context.current.gains[1].gain.value).toBe(0);
		e.duck(0.8, 1);
		expect(
			Context.current.gains[3].gain.linearRampToValueAtTime,
		).toHaveBeenCalledWith(0.19999999999999996, 1.08);
	});
});
