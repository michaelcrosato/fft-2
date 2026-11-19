// The art style's part of the post graph (docs/PLAN-ART-STYLES.md, Decision 4). post.ts asks for three
// stages around its own effects:
//   linear(color)        banded light, then the overlays and glows laid over (before bloom)
//   display(color)       after the colour grade: colour, paint, hatching, outlines
//   final(preAA, aa)     after anti-aliasing: Pixel Art cells
// Each step exists if a layer needs it (the plan's key); its parameters are uniforms per layer, so a
// change of strength or of a style with the same steps never rebuilds the pipeline.
import { THREE } from '../three';
import { renderer, rinfo } from '../renderer';
import type { LayerPlan, StylePlan } from './resolve';
import { albedoOf, compositeOverlay, idOf, layerOf, overlayMask, type StyledPass } from './scenePass';
import { bandNode, bandScene, bandUniforms, fillBandScene, type BandUniforms } from './nodes/band';
import { edgeLinesNode, edgeMaskNode, edgeUniforms, perLayer, type EdgeUniforms } from './nodes/edges';
import { pixelNode, pixelUniforms, type PixelUniforms } from './nodes/pixel';
import { hatchNode, hatchUniforms, worldFromDepth, type HatchUniforms } from './nodes/hatch';
import { paintNode, paintUniforms, type PaintUniforms } from './nodes/paint';

export interface StyleGraph {
  /** final() samples the frame before anti-aliasing (as a texture) */
  needsPreAA: boolean;
  linear(color: any): any;
  display(color: any): any;
  final(preAA: any, aa: any): any;
  /** a developer's view replacing the frame (?styleDebug=), or null */
  debug: any | null;
  /** take a plan with the same key: uniforms only */
  update(plan: StylePlan): void;
}

export interface StyleInputs {
  styled: StyledPass;
  scene: any;
  camera: any;
  /** the debug view's name, if any */
  debug: string | null;
}

interface ColorUniforms { saturation: any; contrast: any; wash: any; washTint: any }

export function buildStyleGraph(TSL: any, plan: StylePlan, inp: StyleInputs): StyleGraph {
  const { screenUV, vec3, vec4, select, float, fract, sin, uniform, mix, luminance, convertToTexture } = TSL;
  const { styled } = inp;
  const data = styled.data.sample(screenUV);
  const ov = styled.overlay.sample(screenUV), glow = styled.glow.sample(screenUV);
  const layer = layerOf(TSL, data);
  const cover = overlayMask(TSL, ov, glow);
  const has = (step: keyof LayerPlan) => plan.env[step] !== undefined || plan.actors[step] !== undefined;
  // per-layer strength (0 where the layer has no style)
  const strength = { env: uniform(0), actors: uniform(0) };
  const ratio = uniform(1);

  // ---- banded light (linear)
  let band: { scene: ReturnType<typeof bandScene>; env: BandUniforms; actors: BandUniforms } | null = null;
  if (has('band')) band = { scene: bandScene(TSL), env: bandUniforms(TSL), actors: bandUniforms(TSL) };

  // ---- colour (display)
  const colorU = (): ColorUniforms => ({ saturation: uniform(1), contrast: uniform(1), wash: uniform(0), washTint: uniform(new THREE.Vector3(1, 1, 1)) });
  const color = has('color') ? { env: colorU(), actors: colorU() } : null;

  // ---- outlines (display)
  const edges = has('edges') ? { env: edgeUniforms(TSL, THREE), actors: edgeUniforms(TSL, THREE) } : null;
  const edgeMask = edges
    ? convertToTexture(edgeMaskNode(TSL, { depth: styled.depth, data: styled.data, near: styled.near, far: styled.far, env: edges.env, actors: edges.actors }))
    : null;

  // ---- Ink Wash's hatching and paper, Flat Paint's brush (display)
  const hatch = has('hatch') ? { env: hatchUniforms(TSL, THREE), actors: hatchUniforms(TSL, THREE) } : null;
  const paint = has('paint') ? { env: paintUniforms(TSL), actors: paintUniforms(TSL), hazeColor: uniform(new THREE.Vector3(0.8, 0.85, 0.9)), hazeNear: uniform(20), hazeFar: uniform(90) } : null;
  // world position and normal from depth: hatching that stays on the surfaces, brush wobble anchored to the world
  const needWorld = !!hatch || plan.env.edges?.wobble || plan.actors.edges?.wobble;
  const camU = needWorld ? { projInv: uniform(inp.camera.projectionMatrixInverse), camWorld: uniform(inp.camera.matrixWorld) } : null;
  const world = camU ? worldFromDepth(TSL, { depth: styled.depth, projInv: camU.projInv, camWorld: camU.camWorld }) : null;

  // ---- Pixel Art (after anti-aliasing)
  const pixel = has('pixel') ? { env: pixelUniforms(TSL), actors: pixelUniforms(TSL), overlayCells: uniform(0) } : null;

  const update = (p: StylePlan) => {
    ratio.value = Math.min(window.devicePixelRatio || 1, renderer?.getPixelRatio?.() ?? 1);
    for (const k of ['env', 'actors'] as const) {
      const l = p[k];
      strength[k].value = l.style === 'none' ? 0 : l.strength;
      if (band) {
        const u = band[k], b = l.band;
        u.strength.value = b ? l.strength : 0;
        if (b) {
          u.bands.value = b.bands; u.softness.value = b.softness; u.floor.value = b.floor; u.highlight.value = b.highlight;
          u.tint.value.set(b.tint[0], b.tint[1], b.tint[2]);
          const lt = b.litTint ?? [1, 1, 1];
          u.litTint.value.set(lt[0], lt[1], lt[2]);
        }
      }
      if (color) {
        const u = color[k], c = l.color;
        u.saturation.value = c?.saturation ?? 1; u.contrast.value = c?.contrast ?? 1; u.wash.value = c?.wash ?? 0;
        if (c) u.washTint.value.set(c.washTint[0], c.washTint[1], c.washTint[2]);
      }
      if (edges) {
        const u: EdgeUniforms = edges[k], e = l.edges;
        u.width.value = e?.width ?? 0; u.opacity.value = e?.opacity ?? 0; u.creases.value = e?.creases ?? 0;
        u.fill.value = e?.fill ?? 0; u.wobble.value = e?.wobble ?? 0;
        if (e) u.color.value.set(e.color[0], e.color[1], e.color[2]);
      }
    }
    if (hatch) {
      for (const k of ['env', 'actors'] as const) {
        const u: HatchUniforms = hatch[k], h = p[k].hatch;
        u.density.value = h?.density ?? 7; u.darkness.value = h?.darkness ?? 0; u.paper.value = h?.paper ?? 0;
        if (h) u.paperTint.value.set(h.paperTint[0], h.paperTint[1], h.paperTint[2]);
      }
    }
    if (paint) {
      for (const k of ['env', 'actors'] as const) {
        const u: PaintUniforms = paint[k], x = p[k].paint;
        u.radius.value = x?.radius ?? 0; u.canvas.value = x?.canvas ?? 0; u.haze.value = x?.haze ?? 0;
      }
      // the haze takes the scene's fog colour, brightened toward the sky, from its fog distances
      const fog = inp.scene.fog;
      if (fog?.isFog) {
        paint.hazeColor.value.set(Math.sqrt(fog.color.r) * 1.05, Math.sqrt(fog.color.g) * 1.05, Math.sqrt(fog.color.b) * 1.05);
        paint.hazeNear.value = fog.near * 0.35; paint.hazeFar.value = fog.far * 0.9;
      }
    }
    if (pixel) {
      for (const k of ['env', 'actors'] as const) {
        const u: PixelUniforms = pixel[k], x = p[k].pixel;
        u.cell.value = x?.cell ?? 0; u.levels.value = x?.levels ?? 8; u.dither.value = x?.dither ?? 0; u.outline.value = x?.outline ?? 0;
      }
      pixel.overlayCells.value = p.overlayPixel ? 1 : 0;
    }
    if (band) fillBandScene(band.scene, inp.scene);
  };
  update(plan);

  let debug: any = null;
  if (inp.debug === 'layer') {
    const pal = select(layer.equal(1), vec3(0.2, 0.75, 0.25), select(layer.equal(2), vec3(0.9, 0.2, 0.2), select(layer.equal(0), vec3(0.15), select(layer.equal(3), vec3(0.2, 0.3, 1), vec3(1, 0, 1)))));
    debug = vec4(pal.mul(float(0.75)).add(vec3(albedoOf(data).mul(0.25))), 1);
  } else if (inp.debug === 'id') {
    const id = idOf(TSL, data);
    debug = vec4(fract(sin(id.mul(12.9898)).mul(43758.5453)), fract(sin(id.mul(78.233)).mul(12543.1)), fract(id.mul(0.37)), 1);
  } else if (inp.debug === 'albedo') {
    debug = vec4(vec3(albedoOf(data)), 1);
  } else if (inp.debug === 'overlay') {
    debug = vec4(ov.rgb.add(glow.rgb).add(vec3(ov.a.mul(0.25))), 1);
  } else if (inp.debug === 'world' && world) {
    debug = vec4(fract(world.world.mul(0.5)), 1);
  } else if (inp.debug === 'normal' && world) {
    debug = vec4(world.worldN.mul(0.5).add(0.5), 1);
  } else if (inp.debug === 'edges' && edgeMask) {
    const m = edgeMask.sample(screenUV);
    debug = vec4(vec3(m.r), 1);
  }

  return {
    linear: (c) => {
      let col = c;
      if (band) col = bandNode(TSL, { color: styled.color.sample(screenUV), albedo: albedoOf(data), viewZ: styled.viewZ, layer, scene: band.scene, env: band.env, actors: band.actors });
      return compositeOverlay(TSL, col, ov, glow);
    },
    display: (c) => {
      let col = c;
      if (color) {
        const k = (f: (u: ColorUniforms) => any, none: any) => perLayer(TSL, layer, f(color.env), f(color.actors), none);
        const l = luminance(col.rgb);
        let adj = mix(vec3(l), col.rgb, k((u) => u.saturation, float(1)));
        adj = adj.sub(0.5).mul(k((u) => u.contrast, float(1))).add(0.5);
        adj = mix(adj, k((u) => u.washTint, vec3(1)).mul(l), k((u) => u.wash, float(0)));
        const s = perLayer(TSL, layer, strength.env, strength.actors, float(0)).mul(float(1).sub(cover));
        col = vec4(mix(col.rgb, adj, s), col.a);
      }
      if (paint) {
        const tex = convertToTexture(col);
        const halfRes = rinfo?.quality === 'medium' || rinfo?.quality === 'low' || !!plan.economy;
        // at half resolution a pixel of the brush covers two of the screen's: halve its radius to keep the look
        const painted = paintNode(TSL, { colorTex: tex, data: styled.data, viewZ: styled.viewZ, ratio: halfRes ? ratio.mul(0.5) : ratio, hazeColor: paint.hazeColor, hazeNear: paint.hazeNear, hazeFar: paint.hazeFar, env: paint.env, actors: paint.actors, envStrength: strength.env, actorsStrength: strength.actors, cover });
        if (halfRes) {
          // the brush at half resolution (a quarter of the work), laid over the full-resolution frame
          // only where a painted layer is, so crisp characters stay crisp; the line art comes after
          const half = convertToTexture(painted);
          half.setResolutionScale(0.5);
          const painting = perLayer(TSL, layer, paint.env.radius, paint.actors.radius, float(0)).greaterThan(0);
          col = select(painting, vec4(half.sample(screenUV).rgb, col.a), col);
        } else col = painted;
      }
      if (hatch && world) col = hatchNode(TSL, { color: col, data, world: world.world, worldN: world.worldN, env: hatch.env, actors: hatch.actors, envStrength: strength.env, actorsStrength: strength.actors, cover });
      // brush wobble: a slow noise over the world, so a line's width swells and thins along it
      const wobbleNoise = world ? TSL.mx_noise_float(world.world.mul(1.7)).mul(0.6).add(0.85) : undefined;
      // the outline's sample rings: one on Low (9 samples), two above (17)
      const rings = rinfo?.quality === 'low' || plan.economy ? [1] : [0.5, 1];
      if (edges && edgeMask) col = edgeLinesNode(TSL, { color: col, mask: edgeMask, ratio, env: edges.env, actors: edges.actors, envStrength: strength.env, actorsStrength: strength.actors, cover, wobbleNoise, rings });
      return col;
    },
    final: (preAA, aa) => (pixel
      ? pixelNode(TSL, { pre: preAA, aa, data: styled.data, depth: styled.depth, near: styled.near, far: styled.far, overlay: styled.overlay, glow: styled.glow, ratio, env: pixel.env, actors: pixel.actors, overlayCells: pixel.overlayCells })
      : aa),
    needsPreAA: !!pixel,
    debug,
    update,
  };
}
