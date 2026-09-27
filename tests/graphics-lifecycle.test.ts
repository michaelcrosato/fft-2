import * as THREE from "three/webgpu";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { gameClock } from "../src/core/gameClock";
import { setThree } from "../src/gfx/three";
import { UnitView } from "../src/scenes/unitview";

beforeEach(() => setThree(THREE, "webgl2"));
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function view() {
	return Object.assign(Object.create(UnitView.prototype), {
		root: new THREE.Group(),
		model: { root: new THREE.Group(), height: 1 },
		marker: new THREE.Object3D(),
		team: 0,
	}) as UnitView;
}

it("releases replaced badges without disposing the shared sprite quad", () => {
	const context = { beginPath() {}, arc() {}, fill() {}, fillText() {} };
	vi.stubGlobal("document", {
		createElement: () => ({ getContext: () => context }),
	});
	const v = view();
	v.setBadges(["!"]);
	const badge = v.root.children[0] as THREE.Sprite;
	const material = vi.spyOn(badge.material, "dispose");
	if (!badge.material.map) throw new Error("Badge texture is missing");
	const texture = vi.spyOn(badge.material.map, "dispose");
	const quad = vi.spyOn(badge.geometry, "dispose");
	v.setBadges(["?"]);
	expect(badge.parent).toBeNull();
	expect(material).toHaveBeenCalledOnce();
	expect(texture).toHaveBeenCalledOnce();
	expect(quad).not.toHaveBeenCalled();
	v.setBadges([]);
	expect(v.root.children).toHaveLength(0);
});

it("releases crystal geometry and materials when the crystal is collected", () => {
	const v = view();
	v.becomeCrystal("crystal");
	const crystal = v.root.children[0] as THREE.Mesh<
		THREE.BufferGeometry,
		THREE.Material
	>;
	const geometry = vi.spyOn(crystal.geometry, "dispose");
	const material = vi.spyOn(crystal.material, "dispose");
	v.removeCrystal();
	v.removeCrystal();
	expect(geometry).toHaveBeenCalledOnce();
	expect(material).toHaveBeenCalledOnce();
	expect(v.root.children).toHaveLength(0);
});

it("pauses in-flight unit tweens and resumes without a wall-clock jump", async () => {
	let now = 0;
	let frame!: FrameRequestCallback;
	vi.spyOn(performance, "now").mockImplementation(() => now);
	vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
		frame = callback;
		return 1;
	});
	const progress = vi.fn();
	const finished = view().tween(1, progress);
	now = 400;
	frame(now);
	expect(progress).toHaveBeenLastCalledWith(0.4);
	const resume = gameClock.pause();
	try {
		now = 5400;
		// A background tab may deliver no frames during the pause.
		expect(progress).toHaveBeenCalledTimes(1);
	} finally {
		resume();
	}
	now = 5700;
	frame(now);
	expect(progress).toHaveBeenLastCalledWith(0.7);
	now = 6000;
	frame(now);
	await finished;
	expect(progress).toHaveBeenLastCalledWith(1);
});
