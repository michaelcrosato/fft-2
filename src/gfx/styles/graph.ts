// The art style's part of the post graph (docs/PLAN-ART-STYLES.md, Decision 4). post.ts asks for three
// stages around its own effects:
//   linear(color)        banded light, then the overlays and glows laid over (before bloom)
//   display(color)       after the colour grade: colour, paint, hatching, outlines
//   final(preAA, aa)     after anti-aliasing: Pixel Art cells
// Each step exists if a layer needs it (the plan's key); its parameters are uniforms per layer, so a
// change of strength or of a style with the same steps never rebuilds the pipeline.
import type { StylePlan } from './resolve';
import { albedoOf, compositeOverlay, idOf, layerOf, type StyledPass } from './scenePass';

export interface StyleGraph {
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

export function buildStyleGraph(TSL: any, plan: StylePlan, inp: StyleInputs): StyleGraph {
  const { screenUV, vec3, vec4, select, float, fract, sin } = TSL;
  const { styled } = inp;
  const data = styled.data.sample(screenUV);
  const ov = styled.overlay.sample(screenUV), glow = styled.glow.sample(screenUV);
  const layer = layerOf(TSL, data);
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
  }
  void plan;
  return {
    linear: (color) => compositeOverlay(TSL, color, ov, glow),
    display: (color) => color,
    final: (_preAA, aa) => aa,
    debug,
    update: () => {},
  };
}
