// Ink Wash's hatching and paper (docs/PLAN-ART-STYLES.md, *The styles*). Hatch lines are drawn in
// world space (triplanar, from the position and normal rebuilt from depth), so they stay on the
// surfaces as the camera turns instead of swimming over them: one set in the mid-dark tones, a cross
// set in the darkest. Paper grain is fixed to the screen, like the sheet the scene is drawn on.
import { layerOf } from '../scenePass';
import { perLayer } from './edges';

export interface HatchUniforms {
  /** lines per world unit (a tile is one unit) */
  density: any;
  /** 0–1: how dark the hatching is */
  darkness: any;
  /** 0–1: paper grain */
  paper: any;
  paperTint: any;
}

export function hatchUniforms(TSL: any, THREE: any): HatchUniforms {
  const { uniform } = TSL;
  return { density: uniform(7), darkness: uniform(0), paper: uniform(0), paperTint: uniform(new THREE.Vector3(0.96, 0.92, 0.84)) };
}

/** world position and normal at this pixel, rebuilt from the depth buffer */
export function worldFromDepth(TSL: any, a: { depth: any; projInv: any; camWorld: any }) {
  const { screenUV, getViewPosition, getNormalFromDepth, vec4 } = TSL;
  const d = a.depth.sample(screenUV).x;
  const viewPos = getViewPosition(screenUV, d, a.projInv);
  const world = a.camWorld.mul(vec4(viewPos, 1)).xyz;
  const viewN = getNormalFromDepth(screenUV, a.depth.value, a.projInv);
  const worldN = a.camWorld.mul(vec4(viewN, 0)).xyz.normalize();
  return { world, worldN };
}

export function hatchNode(TSL: any, a: { color: any; data: any; world: any; worldN: any; env: HatchUniforms; actors: HatchUniforms; envStrength: any; actorsStrength: any; cover: any }) {
  const { Fn, vec2, vec3, vec4, float, abs, fract, smoothstep, mix, max, luminance, screenUV, screenSize, mx_noise_float, fwidth, select } = TSL;
  return Fn(() => {
    const layer = layerOf(TSL, a.data);
    const s = perLayer(TSL, layer, a.envStrength, a.actorsStrength, float(0)).mul(float(1).sub(a.cover));
    const density = perLayer(TSL, layer, a.env.density, a.actors.density, float(7));
    const darkness = perLayer(TSL, layer, a.env.darkness, a.actors.darkness, float(0));
    const paper = perLayer(TSL, layer, a.env.paper, a.actors.paper, float(0));
    const tint = perLayer(TSL, layer, a.env.paperTint, a.actors.paperTint, vec3(1));
    const n = abs(a.worldN);
    // the plane the surface faces most: its two other axes carry the lines
    const uv = select(n.y.greaterThan(max(n.x, n.z)), a.world.xz, select(n.x.greaterThan(n.z), a.world.zy, a.world.xy));
    const line = (coord: any) => {
      const f = abs(fract(coord.mul(density)).sub(0.5));
      const w = fwidth(coord.mul(density)).mul(0.75).add(0.08);
      return float(1).sub(smoothstep(w, w.add(fwidth(coord.mul(density)).add(0.02)), f));
    };
    const l = luminance(a.color.rgb);
    const one = line(uv.x.add(uv.y)).mul(smoothstep(0.62, 0.42, l));
    const cross = line(uv.x.sub(uv.y)).mul(smoothstep(0.36, 0.18, l));
    const ink = max(one, cross).mul(darkness);
    // paper: fixed to the screen, a fine grain and soft fibres
    const p = screenUV.mul(screenSize);
    const grain = mx_noise_float(vec3(p.mul(0.7), 1.7)).mul(0.5).add(mx_noise_float(vec3(p.x.mul(0.05), p.y.mul(0.9), 3.1)).mul(0.5));
    const sheet = mix(vec3(1), tint.mul(float(1).add(grain.mul(0.06))), paper);
    const inked = mix(a.color.rgb.mul(sheet), vec3(0.08, 0.07, 0.09), ink);
    return vec4(mix(a.color.rgb, inked, s), a.color.a);
  })();
}
