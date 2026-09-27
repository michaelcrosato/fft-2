import { createHash } from "node:crypto";
import * as THREE from "three/webgpu";
import { afterEach, expect, it, vi } from "vitest";
import { setThree } from "../src/gfx/three";

afterEach(() => vi.unstubAllGlobals());

// Pixel hashes of the procedural textures before the noise lattices were cached.
// A speed-up must reproduce them exactly; an intentional art change updates this table.
const EXPECTED: Record<string, string> = {
	grass: "b91ed8db1f15e9e9",
	dirt: "416bce50c3215dbb",
	cobble: "303a1dad461117a4",
	rock: "965e01dec20b98b8",
	brick: "1ca6e9ebcbcb4a00",
	planks: "b82aaacf97eb2ca9",
	roof: "18dca7b90ce1b325",
	plaster: "58090def5422c683",
	stoneWall: "3f4bb42fe2ba78a4",
	riverbed: "9b751021c65302fa",
	sand: "30580be1f81080ba",
	sandstone: "03fa44b331a3b034",
	moss: "cd54c6af6c80a5c0",
	carpet: "5b5d666037cbf0cd",
	snow: "8796135f2b06fa47",
	marsh: "8bb87b689e1de318",
	lava: "7ac2895405d34118",
	metal: "6498ce30dfb6b109",
	salt: "7589bc1bff013633",
	bones: "c8b5032e362f52ea",
	farm: "05d5bd54de786b58",
	ice: "068a56139081b48b",
	poison: "d25d522644d41a40",
};

it("generates the same texture pixels", async () => {
	vi.stubGlobal("document", {
		createElement: () => {
			const canvas = { width: 0, height: 0, pixels: null as Uint8ClampedArray | null, getContext: () => context };
			const context = {
				createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
				putImageData: (image: { data: Uint8ClampedArray }) => { canvas.pixels = image.data; },
			};
			return canvas;
		},
	});
	setThree(THREE, "webgl2");
	const { getTexture } = await import("../src/gfx/textures");
	const actual: Record<string, string> = {};
	for (const id of Object.keys(EXPECTED)) {
		const texture = getTexture(id as Parameters<typeof getTexture>[0]);
		const hash = createHash("sha256");
		for (const t of [texture.map, texture.normal, texture.emissive])
			if (t) hash.update((t.image as { pixels: Uint8ClampedArray }).pixels);
		actual[id] = hash.digest("hex").slice(0, 16);
	}
	expect(actual).toEqual(EXPECTED);
});
