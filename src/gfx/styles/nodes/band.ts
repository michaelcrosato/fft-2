// Banded light (docs/PLAN-ART-STYLES.md, Decision 2). Light = colour ÷ albedo, per channel. Its
// luminance, relative to the scene's fully lit level, is quantized into N bands with a softness; the
// hue of the light is kept, the shadow bands take a tint, and the result goes back onto the albedo.
// Linear fog is undone before and redone after, so distant surfaces band like near ones.
import { THREE } from '../../three';

/** per-layer banding parameters (uniform nodes) */
export interface BandUniforms {
  /** 0–1: how much of the banded result replaces the scene's light */
  strength: any;
  /** number of bands, 2–5 */
  bands: any;
  /** half-width of each band edge, in units of the lit range (0.005 hard … 0.12 soft) */
  softness: any;
  /** level of the darkest band, relative to fully lit */
  floor: any;
  /** colour the shadow bands are multiplied by (linear) */
  tint: any;
  /** 1: light above fully lit (specular, emissive) becomes a single highlight band; 0: kept; -1: clipped */
  highlight: any;
}

export function bandUniforms(TSL: any): BandUniforms {
  const { uniform } = TSL;
  return {
    strength: uniform(0), bands: uniform(2), softness: uniform(0.02), floor: uniform(0.45),
    tint: uniform(new THREE.Vector3(1, 1, 1)), highlight: uniform(0),
  };
}

/** scene-wide inputs: the fully lit level of light (luminance) and the linear fog */
export interface BandScene { lit: any; fogNear: any; fogFar: any; fogColor: any; fogOn: any }

export function bandScene(TSL: any): BandScene {
  const { uniform } = TSL;
  return { lit: uniform(1), fogNear: uniform(60), fogFar: uniform(170), fogColor: uniform(new THREE.Vector3(0.6, 0.7, 0.8)), fogOn: uniform(0) };
}

const lum = (c: { r: number; g: number; b: number }) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/**
 * Fill the scene-wide inputs from the scene: the light a surface facing the shadow-casting sun gets
 * (sun plus the sky half of the hemisphere fill, through the Lambert 1/π), and the linear fog.
 */
export function fillBandScene(sc: BandScene, scene: any) {
  let key = 0, sky = 0;
  scene.traverse((o: any) => {
    if (o.isDirectionalLight && o.castShadow) key += lum(o.color) * o.intensity;
    if (o.isHemisphereLight) sky += lum(o.color) * o.intensity;
  });
  sc.lit.value = Math.max(0.05, (key + sky) / Math.PI);
  const fog = scene.fog;
  if (fog?.isFog) {
    sc.fogOn.value = 1; sc.fogNear.value = fog.near; sc.fogFar.value = fog.far;
    sc.fogColor.value.set(fog.color.r, fog.color.g, fog.color.b);
  } else sc.fogOn.value = 0;
}

/**
 * The banded colour. `color` is a sample (vec4), `albedo` the albedo luminance at that pixel, `viewZ` its view depth,
 * `layer` its layer code; `env`/`actors` the two layers' parameters.
 */
export function bandNode(TSL: any, a: { color: any; albedo: any; viewZ: any; layer: any; scene: BandScene; env: BandUniforms; actors: BandUniforms }) {
  const { Fn, vec3, vec4, float, max, min, clamp, smoothstep, select, luminance, mix } = TSL;
  return Fn(() => {
    const c = a.color.rgb.toVar();
    const isEnv = a.layer.equal(1);
    const isAct = a.layer.equal(2);
    const pick = (k: keyof BandUniforms) => select(isEnv, a.env[k], a.actors[k]);
    const strength = select(isEnv.or(isAct), pick('strength'), float(0));
    const bands = pick('bands'), soft = pick('softness'), floorL = pick('floor'), tint = select(isEnv, a.env.tint, a.actors.tint), hl = pick('highlight');
    // undo the fog
    const f = select(a.scene.fogOn.greaterThan(0.5), min(smoothstep(a.scene.fogNear, a.scene.fogFar, a.viewZ.negate()), 0.92), float(0));
    const lit = max(c.sub(a.scene.fogColor.mul(f)).div(float(1).sub(f)), vec3(0));
    // the light falling on the surface: its colour's luminance over its albedo's
    const L = luminance(lit).div(max(a.albedo, 0.02));
    const t = L.div(a.scene.lit);
    // soft-edged staircase: boundaries at k/N for k = 1 … N-1 (N ≤ 5)
    const step = (k: number) => select(bands.greaterThan(k), smoothstep(float(k).div(bands).sub(soft), float(k).div(bands).add(soft), t), float(0));
    const level = step(1).add(step(2)).add(step(3)).add(step(4)).div(max(bands.sub(1), 1));
    let target = mix(floorL, float(1), level);
    // above fully lit: a highlight band, kept as it is, or clipped
    const over = t.greaterThan(1.08);
    target = select(over.and(hl.greaterThan(0.5)), float(1.35), select(over.and(hl.greaterThan(-0.5)), t, target));
    // scale the colour so its light lands on the band (hue and albedo kept), shadows tinted
    const k = target.mul(a.scene.lit).div(max(L, 1e-4));
    const banded = lit.mul(k).mul(mix(tint, vec3(1), clamp(level, 0, 1)));
    const fogged = mix(banded, a.scene.fogColor, f);
    return vec4(mix(c, fogged, strength), a.color.a);
  })();
}
