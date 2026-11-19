// Pixel Art (docs/PLAN-ART-STYLES.md, *The styles*): the frame drawn in square cells. Each pixel takes
// the colour at its cell's centre; a cell belongs to the layer at its centre, so a Pixel Art character
// gets a blocky silhouette over any background. The colour is quantized per channel with a 4×4 Bayer
// dither, and a cell on an object's silhouette, nearer than the cell beside it, darkens into a
// one-cell outline. Overlays (interface, effects) keep their colours: they take only the cells, and
// only when the Environment is Pixel Art. Runs after anti-aliasing, from the frame before it.
import { layerOf, overlayMask } from '../scenePass';
import { perLayer } from './edges';

export interface PixelUniforms {
  /** cell size in CSS pixels (scaled by the pixel ratio); 0: not Pixel Art */
  cell: any;
  /** colour steps per channel */
  levels: any;
  /** 0–1 dither amplitude */
  dither: any;
  /** 0–1 darkening of silhouette cells */
  outline: any;
}

export function pixelUniforms(TSL: any): PixelUniforms {
  const { uniform } = TSL;
  return { cell: uniform(0), levels: uniform(6), dither: uniform(1), outline: uniform(0.5) };
}

let bayerArray: any = null;
/** the classic 4×4 ordered-dither thresholds, 0–15 */
function BAYER(TSL: any) {
  bayerArray ??= TSL.uniformArray([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], 'float');
  return bayerArray;
}

export function pixelNode(TSL: any, a: { pre: any; aa: any; data: any; depth: any; near: any; far: any; overlay: any; glow: any; ratio: any; env: PixelUniforms; actors: PixelUniforms; overlayCells: any }) {
  const { Fn, vec2, vec3, vec4, float, int, floor, max, select, mix, screenUV, screenSize, clamp, perspectiveDepthToViewZ, mod } = TSL;
  return Fn(() => {
    const frag = screenUV.mul(screenSize);
    // the cell size is the larger of the two layers' (each layer keeps its own if only one is Pixel Art)
    const cellPx = max(max(a.env.cell, a.actors.cell).mul(a.ratio), 1);
    const cellIdx = floor(frag.div(cellPx));
    const centre = cellIdx.add(0.5).mul(cellPx).div(screenSize);
    const dC = a.data.sample(centre);
    const layerC = layerOf(TSL, dC);
    const cellOfLayer = perLayer(TSL, layerC, a.env.cell, a.actors.cell, float(0));
    // overlays at the centre: cells only, when the Environment is Pixel Art
    const ovC = overlayMask(TSL, a.overlay.sample(centre), a.glow.sample(centre));
    const pixelHere = cellOfLayer.greaterThan(0).or(ovC.greaterThan(0.5).and(a.overlayCells.greaterThan(0.5)));
    const col = a.pre.sample(centre).rgb.toVar();
    // palette: per-channel steps with a 4×4 ordered dither in cell coordinates
    const levels = perLayer(TSL, layerC, a.env.levels, a.actors.levels, float(8));
    const dither = perLayer(TSL, layerC, a.env.dither, a.actors.dither, float(0));
    const bx = mod(cellIdx.x, 4), by = mod(cellIdx.y, 4);
    // the 4×4 Bayer matrix, centred on zero
    const bayer = BAYER(TSL).element(int(bx.add(by.mul(4)))).div(16).sub(0.47);
    const steps = max(levels.sub(1), 1);
    const quant = floor(clamp(col.add(vec3(bayer.mul(dither).div(steps))), 0, 1).mul(steps).add(0.5)).div(steps);
    const paletted = mix(quant, col, ovC);
    // one-cell outline: a neighbour cell that is farther or another object
    const zC = perspectiveDepthToViewZ(a.depth.sample(centre).x, a.near, a.far);
    const tagC = dC.g;
    let edge: any = float(0);
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nUV = centre.add(vec2(ox, oy).mul(cellPx).div(screenSize));
      const zN = perspectiveDepthToViewZ(a.depth.sample(nUV).x, a.near, a.far);
      const tagN = a.data.sample(nUV).g;
      // the neighbour lies behind (more negative view z) by a tenth of the distance, or is another object behind
      const behind = zN.lessThan(zC.mul(1.08));
      edge = max(edge, select(behind.and(tagN.notEqual(tagC).or(zN.lessThan(zC.mul(1.25)))), float(1), float(0)));
    }
    const outline = perLayer(TSL, layerC, a.env.outline, a.actors.outline, float(0)).mul(edge).mul(float(1).sub(ovC));
    const cellCol = mix(paletted, paletted.mul(vec3(0.22, 0.2, 0.28)), outline);
    return select(pixelHere, vec4(cellCol, 1), a.aa);
  })();
}
