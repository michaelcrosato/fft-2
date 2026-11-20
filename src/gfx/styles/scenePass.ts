// The tagged scene pass (docs/PLAN-ART-STYLES.md, Decision 1 and the Phase 1 log). While a style is
// on, the scene pass writes four outputs instead of one (WebGL 2 guarantees four):
//   output   the scene's colour without overlays (linear HDR, as today)
//   overlay  interface and effects drawn with normal blending, to lay over the styled frame
//   glow     additive glows (spells, sparks, motes), added over the styled frame
//   data     r: √(albedo luminance), g: layer × 32 + object id, a: write flag
// Every output blends as the drawing material does. Opaque draws therefore overwrite all four (which is
// also what hides an overlay behind a wall), and transparent draws blend: overlays write zero colour
// into `output` and flag 0 into `data`, so the surface beneath them keeps its colour and its tag.
// Other transparent surfaces (water, clouds) take the data when they are at least half opaque.
import { THREE } from '../three';
import { LAYER_CODE, isOverlay, objectId, styleRoot, type StyleLayer } from './layers';

export interface StyledPass {
  /** linear HDR colour without overlays */
  color: any;
  overlay: any;
  glow: any;
  data: any;
  /** view depth (negative in front of the camera) */
  viewZ: any;
  depth: any;
  /** the scene camera's near and far planes (the pass keeps them current) */
  near: any;
  far: any;
}

/** Turn `scenePass` into the tagged pass. TSL is the three/tsl module. */
export function tagScenePass(TSL: any, scenePass: any): StyledPass {
  const { mrt, output, diffuseColor, uniform, vec4, float, select, step, sqrt, luminance } = TSL;
  // per object, before each draw: x layer code, y object id, z overlay (0/1), w 0 opaque · 1 transparent · 2 additive
  const tag = uniform(new THREE.Vector4()).onObjectUpdate((frame: any, self: any) => {
    const root = styleRoot(frame.object);
    const m = frame.material;
    const layer = (root?.userData.styleLayer as StyleLayer | undefined) ?? 'interface';
    const transparent = !!m?.transparent;
    const additive = transparent && m.blending === THREE.AdditiveBlending;
    self.value.set(LAYER_CODE[layer], objectId(root), isOverlay(layer, additive) ? 1 : 0, additive ? 2 : transparent ? 1 : 0);
  });
  const over = tag.z.greaterThan(0.5);
  const additive = tag.w.greaterThan(1.5);
  const flag = select(over, float(0), select(tag.w.greaterThan(0.5), step(0.5, output.a), float(1)));
  const zero = vec4(0);
  const m = mrt({
    output: select(over, zero, output),
    overlay: select(over.and(additive.not()), output, zero),
    glow: select(additive, output, zero),
    data: vec4(sqrt(luminance(diffuseColor.rgb).clamp(0, 1)), tag.x.mul(32).add(tag.y).div(255), 0, flag),
  });
  const material = new THREE.BlendMode(THREE.MaterialBlending);
  for (const name of ['overlay', 'glow', 'data']) m.setBlendMode(name, material);
  scenePass.setMRT(m);
  scenePass.getTexture('data').type = THREE.UnsignedByteType;
  return {
    color: scenePass.getTextureNode('output'),
    overlay: scenePass.getTextureNode('overlay'),
    glow: scenePass.getTextureNode('glow'),
    data: scenePass.getTextureNode('data'),
    viewZ: scenePass.getViewZNode(),
    depth: scenePass.getTextureNode('depth'),
    near: scenePass._cameraNear,
    far: scenePass._cameraFar,
  };
}

/** layer code (0–3) from a data sample; -1 where no surface took the pixel */
export function layerOf(TSL: any, data: any) {
  const { floor, select, float } = TSL;
  return select(data.a.greaterThan(0.5), floor(data.g.mul(255).add(0.5).div(32)), float(-1));
}

/** object id (1–31) from a data sample */
export function idOf(TSL: any, data: any) {
  const { floor, mod } = TSL;
  return mod(floor(data.g.mul(255).add(0.5)), 32);
}

/** albedo luminance from a data sample */
export function albedoOf(data: any) {
  return data.r.mul(data.r);
}

/** lay the overlays over a colour: normal-blended overlays (premultiplied by their blending), then glows */
export function compositeOverlay(TSL: any, color: any, ov: any, glow: any) {
  const { vec4, float } = TSL;
  return vec4(color.rgb.mul(float(1).sub(ov.a)).add(ov.rgb).add(glow.rgb), color.a);
}

/**
 * How much a pixel belongs to an overlay or a glow (0–1), for the steps that should spare it. A move
 * highlight's centre is only about 30% opaque, so its alpha counts three times: the display steps
 * (wash, hatching, palette, outlines) leave the whole highlight its colour.
 */
export function overlayMask(TSL: any, ov: any, glow: any) {
  const { clamp, luminance } = TSL;
  return clamp(ov.a.mul(3).add(luminance(glow.rgb).mul(0.8)), 0, 1);
}
