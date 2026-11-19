// Art styles (docs/PLAN-ART-STYLES.md): settings, URL overrides, the plan, the page's steps, and every
// scene builder tagging what it draws with a style layer.
import * as THREE from "three/webgpu";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	DEFAULT_STYLE_SETTINGS,
	normalizeStyleSettings,
	withUrlOverrides,
	layerStyles,
	type StyleSettings,
} from "../src/gfx/styles/types";
import { resolveStyle, LAMP_CAP, stepsOf } from "../src/gfx/styles/resolve";
import { styleLayerOf, styleRoot, isOverlay, packTag, unpackTag, objectId, setStyleLayer } from "../src/gfx/styles/layers";

const S = (o: Partial<StyleSettings> = {}): StyleSettings => ({ ...DEFAULT_STYLE_SETTINGS, ...o });
const ctx = { quality: "medium" as const, backend: "webgl2" as const };

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("settings", () => {
	it("default to no style and today's lights, and survive old or broken saves", () => {
		expect(normalizeStyleSettings({})).toEqual(DEFAULT_STYLE_SETTINGS);
		const bad = normalizeStyleSettings({ styleEnv: "sparkles", styleActors: 3, styleEnvStrength: 7, styleActorsStrength: -1, styleBands: 9, styleOutline: "huge", lights: 4, lamps: 3, styleLinked: "yes" });
		expect(bad).toEqual(DEFAULT_STYLE_SETTINGS);
		const good = normalizeStyleSettings({ styleEnv: "pixel", styleActors: "boldCel", styleEnvStrength: 0.43, styleBands: 3, styleOutline: "thick", lights: 1, lamps: 0, styleLinked: false });
		expect(good).toMatchObject({ styleEnv: "pixel", styleActors: "boldCel", styleEnvStrength: 0.4, styleBands: 3, styleOutline: "thick", lights: 1, lamps: 0, styleLinked: false });
	});

	it("are part of the options, cleaned with them", async () => {
		vi.resetModules();
		vi.stubGlobal("window", { localStorage: { getItem: () => JSON.stringify({ music: 0.5, styleEnv: "inkWash", lamps: "lots" }), setItem: vi.fn() } });
		const { loadOptions } = await import("../src/game/state");
		const o = loadOptions();
		expect(o.music).toBe(0.5);
		expect(o.styleEnv).toBe("inkWash");
		expect(o.lamps).toBe("auto");
		expect(o.styleLinked).toBe(true);
	});

	it("take the URL's overrides for one visit", () => {
		expect(withUrlOverrides(S(), "?style=boldCel&styleStrength=60")).toMatchObject({ styleLinked: true, styleEnv: "boldCel", styleActors: "boldCel", styleEnvStrength: 0.6, styleActorsStrength: 0.6 });
		const mixed = withUrlOverrides(S(), "?styleEnv=pixel&styleActors=inkWash&lights=3&lamps=0&styleBands=4&styleOutline=thin");
		expect(mixed).toMatchObject({ styleLinked: false, styleEnv: "pixel", styleActors: "inkWash", lights: 3, lamps: 0, styleBands: 4, styleOutline: "thin" });
		expect(withUrlOverrides(S({ styleEnv: "pixel" }), "?style=nonsense&lights=9")).toEqual(S({ styleEnv: "pixel" }));
		expect(layerStyles(S({ styleEnv: "pixel", styleActors: "boldCel", styleLinked: true })).actors.style).toBe("pixel");
	});
});

describe("the plan", () => {
	it("is off with no style: today's pipeline", () => {
		const p = resolveStyle(S(), ctx);
		expect(p.active).toBe(false);
		expect(p.key).toBe("off");
		expect(p.lights).toBe("today");
		expect(p.frame).toEqual({ ao: true, dof: 1, grain: 1, vignette: 1, bloom: 1 });
	});

	it("is off on WebGL 1, with the reason", () => {
		const p = resolveStyle(S({ styleEnv: "boldCel" }), { ...ctx, backend: "webgl1" });
		expect(p.active).toBe(false);
		expect(p.unavailable).toBe("webgl1");
	});

	it("treats strength 0 as no style for that layer", () => {
		const p = resolveStyle(S({ styleEnv: "boldCel", styleEnvStrength: 0 }), ctx);
		expect(p.env.style).toBe("none");
		expect(stepsOf(p.env)).toEqual([]);
	});

	it("gives lamps by quality on Auto, and the setting otherwise", () => {
		for (const q of ["low", "medium", "high", "ultra"] as const) expect(resolveStyle(S(), { ...ctx, quality: q }).lamps).toBe(LAMP_CAP[q]);
		expect(resolveStyle(S({ lamps: 0 }), ctx).lamps).toBe(0);
		expect(resolveStyle(S({ lights: 1 }), ctx).lights).toBe(1);
	});
});

describe("style layers", () => {
	it("pack the layer and object id into one byte", () => {
		for (const layer of [0, 1, 2, 3]) for (const id of [1, 17, 31]) expect(unpackTag(packTag(layer, id))).toEqual({ layer, id });
		const a = new THREE.Group(), b = new THREE.Group();
		expect(objectId(a)).toBeGreaterThanOrEqual(1);
		expect(objectId(a)).toBeLessThanOrEqual(31);
		expect(objectId(null)).toBe(0);
		expect(objectId(a) === objectId(b) && a.id !== b.id ? (a.id - b.id) % 31 === 0 : true).toBe(true);
	});

	it("are inherited, and overlays are interface, effects and additive glows", () => {
		const root = setStyleLayer(new THREE.Group(), "actors");
		const child = new THREE.Mesh();
		const ring = setStyleLayer(new THREE.Mesh(), "interface");
		root.add(child, ring);
		expect(styleLayerOf(child)).toBe("actors");
		expect(styleRoot(child)).toBe(root);
		expect(styleLayerOf(ring)).toBe("interface");
		expect(styleLayerOf(new THREE.Mesh())).toBe("interface");
		expect(isOverlay("env", false)).toBe(false);
		expect(isOverlay("env", true)).toBe(true);
		expect(isOverlay("effects", false)).toBe(true);
		expect(isOverlay("actors", false)).toBe(false);
	});
});

// ---------------------------------------------------------------------------------------------
// Every builder tags what it draws. Node has no canvas: a permissive 2D context stands in.
function fakeCanvas() {
	const grad = { addColorStop() {} };
	const ctx2d: any = new Proxy({}, {
		get(target: any, k) {
			if (k in target) return target[k];
			if (k === "createRadialGradient" || k === "createLinearGradient" || k === "createPattern") return () => grad;
			if (k === "getImageData" || k === "createImageData") return (_x: number, _y: number, w = 1, h = 1) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
			if (k === "measureText") return () => ({ width: 10 });
			if (k === "canvas") return canvas;
			return () => {};
		},
		set(target: any, k, v) { target[k] = v; return true; },
	});
	const canvas: any = { width: 64, height: 64, style: {}, getContext: () => ctx2d, toDataURL: () => "data:," };
	return canvas;
}

describe("scene builders", () => {
	beforeEach(async () => {
		// a fresh module graph (another test resets modules): bind three.js in the instance the builders import
		vi.resetModules();
		(await import("../src/gfx/three")).setThree(THREE, "webgl2");
		vi.stubGlobal("document", { createElement: () => fakeCanvas() });
	});

	/** every drawable under `root`, with its layer */
	const drawables = (root: THREE.Object3D) => {
		const out: Array<{ o: THREE.Object3D; layer: string }> = [];
		root.traverse((o: any) => { if (o.isMesh || o.isPoints || o.isSprite || o.isLine) out.push({ o, layer: styleLayerOf(o) }); });
		return out;
	};

	it("terrain and the environment are Environment", async () => {
		const { MapGrid } = await import("../src/battle/grid");
		const { mapDef } = await import("../src/data/db");
		const { TerrainView } = await import("../src/gfx/terrain");
		const { Environment } = await import("../src/gfx/env");
		const scene = new THREE.Scene();
		const def = mapDef("galwyn_market");
		const terrain = new TerrainView(new MapGrid(def));
		scene.add(terrain.group);
		new Environment(scene, terrain, def, "night");
		const all = drawables(scene);
		expect(all.length).toBeGreaterThan(5);
		expect(all.filter((d) => d.layer !== "env").map((d) => d.o.type + ":" + d.o.name)).toEqual([]);
	});

	it("a unit is Characters & objects, its ring, shadow and badges Interface", async () => {
		const { UnitView } = await import("../src/scenes/unitview");
		const { JOBS } = await import("../src/data/db");
		const { MapGrid } = await import("../src/battle/grid");
		const { mapDef } = await import("../src/data/db");
		const { TerrainView } = await import("../src/gfx/terrain");
		const terrain = new TerrainView(new MapGrid(mapDef("galwyn_market")));
		const v = new UnitView({ job: JOBS.get("knight")!, team: 0, look: { hairStyle: "short", hair: "#553311", skin: "#e0b090" }, gender: "m" } as any, terrain);
		v.setBadges(["!"]);
		const all = drawables(v.root);
		const iface = all.filter((d) => d.layer === "interface").map((d) => d.o);
		expect(iface).toContain(v.marker);
		expect(iface.length).toBe(3); // ring, blob shadow, badge
		expect(all.filter((d) => d.layer === "actors").length).toBeGreaterThan(10);
		expect(all.every((d) => d.layer === "actors" || d.layer === "interface")).toBe(true);
	});

	it("effects are Effects", async () => {
		const { Vfx } = await import("../src/gfx/vfx");
		const scene = new THREE.Scene();
		new Vfx(scene);
		const all = drawables(scene);
		expect(all.length).toBeGreaterThan(3);
		expect(all.every((d) => d.layer === "effects")).toBe(true);
	});
});

describe("the light rig", () => {
	beforeEach(async () => {
		vi.resetModules();
		(await import("../src/gfx/three")).setThree(THREE, "webgl2");
	});

	it("gives 1, 2 or 3 sources, keeps each scene's own, and never removes a light", async () => {
		const { LightRig } = await import("../src/gfx/lights");
		const lightsIn = (s: THREE.Scene) => s.children.filter((o: any) => o.isLight).length;
		// a battle map: sun and rim today
		const scene = new THREE.Scene();
		const sun = new THREE.DirectionalLight("#fff", 3);
		sun.position.set(10, 20, 5);
		const rim = new THREE.DirectionalLight("#ccd", 0.35);
		scene.add(sun, rim);
		const rig = new LightRig(scene as any, sun as any, { rim: rim as any, rimColor: "#ccd", rimIntensity: 0.35, frontColor: "#fed", frontIntensity: 0.7 });
		rig.apply("today");
		expect(rig.count).toBe(2);
		rig.apply(1);
		expect(rig.count).toBe(1);
		expect(rim.intensity).toBe(0);
		rig.apply(3);
		expect(rig.count).toBe(3);
		expect(lightsIn(scene)).toBe(3);
		rig.apply(2);
		expect(rig.count).toBe(2);
		expect(lightsIn(scene)).toBe(3); // the front fill is dimmed, not removed
		// the world map: the sun alone today, a rim when asked
		const world = new THREE.Scene();
		const wsun = new THREE.DirectionalLight("#fff", 3);
		world.add(wsun);
		const wrig = new LightRig(world as any, wsun as any, { rim: null, rimColor: "#ccd", rimIntensity: 0.35, frontColor: "#fed", frontIntensity: 0.7 });
		wrig.apply("today");
		expect(wrig.count).toBe(1);
		wrig.apply(2);
		expect(wrig.count).toBe(2);
		expect(lightsIn(world)).toBe(2);
	});
});
