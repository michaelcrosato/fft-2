// Flat Paint's brush, canvas and haze (docs/PLAN-ART-STYLES.md, *The styles*). The brush is a
// Kuwahara filter: four quadrants around the pixel, six samples each (scaled by the radius); the
// pixel takes the mean of the quadrant whose colours vary least, so textures settle into flat fields
// while edges stay sharp. Only samples of the pixel's own layer count, so a painted backdrop never
// smears into a crisp character. Canvas grain is fixed to the screen; the haze lays the sky's colour
// over distant surfaces, in layers.
import { layerOf } from '../scenePass';
import { perLayer } from './edges';

export interface PaintUniforms {
  /** brush radius in CSS pixels (scaled by the pixel ratio); 0: no brush */
  radius: any;
  /** 0–1 canvas grain */
  canvas: any;
  /** 0–1 distance haze */
  haze: any;
}

export function paintUniforms(TSL: any): PaintUniforms {
  const { uniform } = TSL;
  return { radius: uniform(0), canvas: uniform(0), haze: uniform(0) };
}

/** `colorTex` is the display colour as a texture node, `data` the tagged pass's data texture node */
export function paintNode(TSL: any, a: { colorTex: any; data: any; viewZ: any; ratio: any; hazeColor: any; hazeNear: any; hazeFar: any; env: PaintUniforms; actors: PaintUniforms; envStrength: any; actorsStrength: any; cover: any }) {
  const { Fn, vec2, vec3, vec4, float, dot, select, mix, screenUV, screenSize, smoothstep, mx_noise_float, max } = TSL;
  return Fn(() => {
    const dC = a.data.sample(screenUV);
    const layer = layerOf(TSL, dC);
    const s = perLayer(TSL, layer, a.envStrength, a.actorsStrength, float(0)).mul(float(1).sub(a.cover));
    const r = perLayer(TSL, layer, a.env.radius, a.actors.radius, float(0)).mul(a.ratio);
    const px = vec2(1).div(screenSize);
    const centre = a.colorTex.sample(screenUV).rgb;
    // six offsets in the first quadrant, mirrored into the other three
    const base: Array<[number, number]> = [[0.25, 0.25], [0.75, 0.2], [0.2, 0.75], [0.6, 0.6], [1, 0.45], [0.45, 1]];
    const quads: Array<[number, number]> = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    let bestMean: any = centre, bestVar: any = float(1e9);
    for (const [qx, qy] of quads) {
      let sum: any = vec3(0), sum2: any = float(0), n: any = float(0);
      for (const [bx, by] of base) {
        const uv = screenUV.add(vec2(bx * qx, by * qy).mul(r).mul(px));
        const c = a.colorTex.sample(uv).rgb;
        const same = select(layerOf(TSL, a.data.sample(uv)).equal(layer), float(1), float(0));
        sum = sum.add(c.mul(same));
        sum2 = sum2.add(dot(c, c).mul(same));
        n = n.add(same);
      }
      const mean = sum.div(max(n, 1));
      const variance = select(n.greaterThan(2.5), sum2.div(max(n, 1)).sub(dot(mean, mean)), float(1e8));
      const better = variance.lessThan(bestVar);
      bestMean = select(better, mean, bestMean);
      bestVar = select(better, variance, bestVar);
    }
    let col: any = select(r.greaterThan(0.5), bestMean, centre);
    // haze: distant surfaces take the sky's colour, in soft layers
    const haze = perLayer(TSL, layer, a.env.haze, a.actors.haze, float(0));
    const dist = a.viewZ.negate();
    const layered = smoothstep(a.hazeNear, a.hazeFar, dist);
    col = mix(col, a.hazeColor, layered.mul(haze).mul(0.55));
    // canvas: a fine weave and a soft tooth, fixed to the screen
    const canvas = perLayer(TSL, layer, a.env.canvas, a.actors.canvas, float(0));
    const p = screenUV.mul(screenSize);
    const weave = mx_noise_float(vec3(p.x.mul(0.9), p.y.mul(0.12), 0.3)).mul(0.5).add(mx_noise_float(vec3(p.x.mul(0.12), p.y.mul(0.9), 2.3)).mul(0.5));
    col = col.mul(float(1).add(weave.mul(0.07).mul(canvas)));
    return vec4(mix(centre, col, s), 1);
  })();
}
