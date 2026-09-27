import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

async function optionsWith(value: unknown) {
	vi.resetModules();
	const storage = {
		getItem: vi.fn(() => JSON.stringify(value)),
		setItem: vi.fn(),
	};
	vi.stubGlobal("window", { localStorage: storage });
	return { ...(await import("../src/game/state")), storage };
}

it("replaces malformed preferences instead of letting zero/negative speeds stall gameplay", async () => {
	const { loadOptions, DEFAULT_OPTIONS } = await optionsWith({
		battleSpeed: 0,
		textSpeed: -2,
		music: 20,
		sfx: "loud",
		quality: "invalid",
		renderer: null,
		difficulty: false,
		gentle: "false",
		camShake: [],
		encounters: {},
	});
	expect(loadOptions()).toEqual(DEFAULT_OPTIONS);
});

it("rejects non-object option JSON and infinite speeds", async () => {
	for (const value of [
		null,
		["low"],
		{ battleSpeed: 1e100 },
		{ battleSpeed: 1e-100, textSpeed: 1e-100 },
	]) {
		const { loadOptions, DEFAULT_OPTIONS } = await optionsWith(value);
		expect(loadOptions()).toEqual(DEFAULT_OPTIONS);
	}
});

it("preserves valid preferences and returns copies without re-reading storage", async () => {
	const { loadOptions, saveOptions, storage } = await optionsWith({
		textSpeed: 0.01,
		music: 0,
		quality: "low",
		gentle: true,
	});
	const options = loadOptions();
	expect(options).toMatchObject({
		textSpeed: 0.01,
		music: 0,
		quality: "low",
		gentle: true,
	});
	options.battleSpeed = 0;
	expect(loadOptions().battleSpeed).toBe(1);
	expect(storage.getItem).toHaveBeenCalledOnce();
	saveOptions({ ...loadOptions(), battleSpeed: Number.NaN });
	expect(JSON.parse(storage.setItem.mock.calls[0][1]).battleSpeed).toBe(1);
});
