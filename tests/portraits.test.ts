import * as THREE from "three/webgpu";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { UnitModel } from "../src/gfx/models/rig";

const harness = vi.hoisted(() => ({ renderer: {} as Record<string, unknown> }));
vi.mock("../src/gfx/renderer", () => ({
	get renderer() {
		return harness.renderer;
	},
}));
vi.mock("../src/gfx/models/anim", () => ({
	Animator: class {
		update() {}
	},
}));

let frameTarget: unknown;
let clearColor: THREE.Color;
let clearAlpha: number;
let model: UnitModel;
let build: ReturnType<typeof vi.fn<() => UnitModel>>;
let render: ReturnType<typeof vi.fn>;
let portrait: typeof import("../src/gfx/portraits").portrait;
let portraitCached: typeof import("../src/gfx/portraits").portraitCached;

beforeEach(async () => {
	vi.resetModules();
	const { setThree } = await import("../src/gfx/three");
	setThree(THREE, "webgl2");
	frameTarget = { name: "main-frame" };
	clearColor = new THREE.Color("#204060");
	clearAlpha = 0.75;
	render = vi.fn();
	harness.renderer = {
		toneMapping: THREE.ACESFilmicToneMapping,
		getRenderTarget: () => frameTarget,
		setRenderTarget: (target: unknown) => {
			frameTarget = target;
		},
		getClearColor: (target: THREE.Color) => target.copy(clearColor),
		getClearAlpha: () => clearAlpha,
		setClearColor: (color: THREE.ColorRepresentation, alpha: number) => {
			clearColor.set(color);
			clearAlpha = alpha;
		},
		clear: vi.fn(),
		render,
		readRenderTargetPixels: vi.fn(),
	};
	let image = 0;
	const context = {
		createRadialGradient: () => ({ addColorStop() {} }),
		fillRect() {},
		drawImage() {},
		putImageData() {},
		createImageData: (w: number, h: number) => ({
			data: new Uint8ClampedArray(w * h * 4),
		}),
	};
	vi.stubGlobal("document", {
		createElement: () => ({
			getContext: () => context,
			toDataURL: () => `portrait-${++image}`,
		}),
	});
	vi.spyOn(console, "warn").mockImplementation(() => {});
	build = vi.fn(() => {
		model = {
			root: new THREE.Group(),
			bones: {},
			rest: new Map(),
			height: 1,
			kind: "humanoid",
			meshes: [],
			dispose: vi.fn(),
		};
		return model;
	});
	({ portrait, portraitCached } = await import("../src/gfx/portraits"));
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it("restores the main render target and clear state after a rendering failure, then retries", async () => {
	const target = frameTarget;
	render.mockImplementationOnce(() => {
		throw new Error("shader failure");
	});
	expect(await portrait("unit", build)).toBe("");
	expect(frameTarget).toBe(target);
	expect(clearColor.getHexString()).toBe("204060");
	expect(clearAlpha).toBe(0.75);
	expect(model.root.parent).toBeNull();
	expect(model.dispose).toHaveBeenCalledOnce();
	expect(await portrait("unit", build)).toMatch(/^portrait-/);
	expect(build).toHaveBeenCalledTimes(2);
});

it("returns the canvas to the game before GPU readback completes and cleans up a rejected read", async () => {
	let reject!: (reason: Error) => void;
	const read = vi.fn(
		() =>
			new Promise<Uint8Array>((_, fail) => {
				reject = fail;
			}),
	);
	harness.renderer.readRenderTargetPixelsAsync = read;
	const target = frameTarget;
	const job = portrait("unit", build);
	await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
	expect(frameTarget).toBe(target);
	expect(clearAlpha).toBe(0.75);
	reject(new Error("readback failed"));
	expect(await job).toBe("");
	expect(model.root.parent).toBeNull();
	expect(model.dispose).toHaveBeenCalledOnce();
	delete harness.renderer.readRenderTargetPixelsAsync;
	expect(await portrait("unit", build)).toMatch(/^portrait-/);
});

it("bounds long-session portrait memory while preserving recently used portraits", async () => {
	for (let i = 0; i < 256; i++) await portrait(`unit-${i}`, build);
	const recent = portraitCached("unit-0");
	await portrait("unit-256", build);
	expect(portraitCached("unit-0")).toBe(recent);
	expect(portraitCached("unit-1")).toBeUndefined();
	const count = build.mock.calls.length;
	await portrait("unit-0", build);
	expect(build).toHaveBeenCalledTimes(count);
	await portrait("unit-1", build);
	expect(build).toHaveBeenCalledTimes(count + 1);
});
