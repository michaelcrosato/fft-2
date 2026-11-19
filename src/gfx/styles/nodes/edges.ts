// Outlines (docs/PLAN-ART-STYLES.md, *The styles*, Outlines). Two passes:
//  1. a one-pixel edge mask: the Laplacian of 1/depth (zero on any plane, so it finds silhouettes and
//     creases but never a slope), plus a change of layer or object id; each edge belongs to the
//     nearer of the surfaces it separates, and carries that surface's layer;
//  2. the lines: each pixel looks for edge pixels within its owner layer's width, on a ring of
//     samples, so each layer draws its own width; the line's colour is ink, or the surface's own
//     colour darkened (Flat Paint).
import { idOf, layerOf } from '../scenePass';

export interface EdgeUniforms {
  /** CSS pixels (scaled by the pixel ratio); 0: no outlines on this layer */
  width: any;
  opacity: any;
  /** 0–1: how readily a crease (a fold between faces) becomes a line */
  creases: any;
  color: any;
  /** 0–1: darken the surface's own colour instead of drawing `color` */
  fill: any;
  /** 0–1: brush wobble of the line's width, anchored to the world (Ink Wash) */
  wobble: any;
}

export function edgeUniforms(TSL: any, THREE: any): EdgeUniforms {
  const { uniform } = TSL;
  return { width: uniform(0), opacity: uniform(0), creases: uniform(0), color: uniform(new THREE.Vector3(0.03, 0.025, 0.04)), fill: uniform(0), wobble: uniform(0) };
}

/** pick a per-layer uniform by layer code (1 Environment, 2 Characters & objects; else none) */
export function perLayer(TSL: any, layer: any, env: any, actors: any, none: any) {
  const { select } = TSL;
  return select(layer.equal(1), env, select(layer.equal(2), actors, none));
}

/**
 * The edge mask (pass 1): r = edge strength, g = owner layer / 4. `depth` and `data` are texture nodes
 * of the tagged pass; near/far its camera's.
 */
export function edgeMaskNode(TSL: any, a: { depth: any; data: any; near: any; far: any; env: EdgeUniforms; actors: EdgeUniforms }) {
  const { Fn, vec2, vec4, float, abs, max, smoothstep, select, screenUV, screenSize, perspectiveDepthToViewZ } = TSL;
  return Fn(() => {
    const px = vec2(1).div(screenSize);
    const viewZ = (uv: any) => perspectiveDepthToViewZ(a.depth.sample(uv).x, a.near, a.far);
    const uvL = screenUV.sub(vec2(px.x, 0)), uvR = screenUV.add(vec2(px.x, 0)), uvU = screenUV.sub(vec2(0, px.y)), uvD = screenUV.add(vec2(0, px.y));
    // one depth sample per tap: view z, and 1/z from it
    const zs = [viewZ(screenUV), viewZ(uvL), viewZ(uvR), viewZ(uvU), viewZ(uvD)].map((z) => z.toVar());
    const inv = zs.map((z) => float(1).div(z));
    const c = inv[0];
    const lap = abs(inv[1].add(inv[2]).sub(c.mul(2))).add(abs(inv[3].add(inv[4]).sub(c.mul(2))));
    const rel = lap.div(max(abs(c), 1e-6));
    const dC = a.data.sample(screenUV), dL = a.data.sample(uvL), dR = a.data.sample(uvR), dU = a.data.sample(uvU), dD = a.data.sample(uvD);
    const tag = (d: any) => d.g.mul(255).add(0.5).floor().add(d.a.greaterThan(0.5).select(float(0), float(500)));
    const tc = tag(dC);
    const idEdge = select(tag(dL).notEqual(tc).or(tag(dR).notEqual(tc)).or(tag(dU).notEqual(tc)).or(tag(dD).notEqual(tc)), float(1), float(0));
    // the owner: the nearest of the five surfaces (view Z is negative: nearer is larger)
    const ds = [dC, dL, dR, dU, dD];
    let ownerZ = zs[0], owner = layerOf(TSL, dC);
    for (let i = 1; i < 5; i++) {
      const nearer = zs[i].greaterThan(ownerZ);
      owner = select(nearer, layerOf(TSL, ds[i]), owner);
      ownerZ = select(nearer, zs[i], ownerZ);
    }
    const creases = perLayer(TSL, owner, a.env.creases, a.actors.creases, float(0));
    const silhouette = smoothstep(0.02, 0.06, rel);
    const crease = smoothstep(0.004, 0.011, rel).mul(creases);
    const edge = max(max(idEdge, silhouette), crease);
    return vec4(edge, owner.add(1).div(4), idOf(TSL, dC).div(32), 1);
  })();
}

/**
 * The lines (pass 2) over a display-space colour. `mask` is the edge mask as a texture node, `world`
 * a world-anchored noise for the brush wobble (0–1), `cover` how much an overlay covers the pixel.
 */
export function edgeLinesNode(TSL: any, a: { color: any; mask: any; ratio: any; env: EdgeUniforms; actors: EdgeUniforms; envStrength: any; actorsStrength: any; cover: any; wobbleNoise?: any; rings?: number[] }) {
  const { Fn, vec2, vec3, vec4, float, max, min, smoothstep, screenUV, screenSize, mix, cos, sin, clamp } = TSL;
  return Fn(() => {
    const px = vec2(1).div(screenSize);
    const maxW = max(a.env.width, a.actors.width).mul(a.ratio);
    let line: any = float(0);
    let ownerOfLine: any = float(0);
    // 8 directions at each ring's distance, plus the centre (fewer rings on lower quality)
    const taps: Array<[number, number]> = [[0, 0]];
    for (let k = 0; k < 8; k++) for (const r of a.rings ?? [0.5, 1]) taps.push([Math.cos((k * Math.PI) / 4) * r, Math.sin((k * Math.PI) / 4) * r]);
    for (const [ox, oy] of taps) {
      const off = vec2(ox, oy).mul(maxW);
      const m = a.mask.sample(screenUV.add(off.mul(px)));
      const owner = m.g.mul(4).sub(1).round();
      const w = perLayer(TSL, owner, a.env.width, a.actors.width, float(0)).mul(a.ratio);
      const op = perLayer(TSL, owner, a.env.opacity, a.actors.opacity, float(0)).mul(perLayer(TSL, owner, a.envStrength, a.actorsStrength, float(0)));
      const wob = a.wobbleNoise ? mix(float(1), a.wobbleNoise, perLayer(TSL, owner, a.env.wobble, a.actors.wobble, float(0))) : float(1);
      const dist = off.length();
      // inside the owner's width (soft by half a pixel)
      const inside = float(1).sub(smoothstep(w.mul(wob).mul(0.5).sub(0.5), w.mul(wob).mul(0.5).add(0.5), dist));
      const contrib = m.r.mul(inside).mul(op);
      ownerOfLine = contrib.greaterThan(line).select(owner, ownerOfLine);
      line = max(line, contrib);
    }
    line = clamp(line.mul(float(1).sub(a.cover)), 0, 1);
    const ink = perLayer(TSL, ownerOfLine, a.env.color, a.actors.color, vec3(0));
    const fill = perLayer(TSL, ownerOfLine, a.env.fill, a.actors.fill, float(0));
    const lineColor = mix(ink, a.color.rgb.mul(0.28).mul(vec3(0.9, 0.85, 1.0)), fill);
    return vec4(mix(a.color.rgb, lineColor, min(line, 1)), a.color.a);
  })();
}
