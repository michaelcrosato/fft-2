// Material factory. Uses TSL node materials when available (WebGPU/WebGL2
// backends) for animated water, wind-swayed foliage and glowing tiles; falls
// back to classic materials on WebGL1.
import { THREE, NODES } from './three';
import { getTexture, type TexId } from './textures';
import type { Material, Texture } from 'three/webgpu';
import { markShared } from './dispose';

let TSL: any = null;
export async function loadTSL() {
  if (NODES && !TSL) TSL = await import('three/tsl');
  return TSL;
}
const matCache = new Map<string, Material>();

export function terrainMaterial(tex: TexId, opts: { roughness?: number; metal?: number; emissive?: boolean } = {}): Material {
  const key = `terrain:${tex}`;
  const hit = matCache.get(key);
  if (hit) return hit;
  const t = getTexture(tex);
  const m = new THREE.MeshStandardMaterial({
    map: t.map,
    normalMap: t.normal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: opts.roughness ?? 0.92,
    metalness: opts.metal ?? 0,
    vertexColors: true,
  });
  if (t.emissive) {
    m.emissiveMap = t.emissive;
    m.emissive = new THREE.Color('#ff8a30');
    m.emissiveIntensity = 2.2;
  }
  matCache.set(key, markShared(m));
  return m;
}

/** Animated water. Node version: scrolling normals, fresnel, shore foam, depth tint. */
export function waterMaterial(kind: 'water' | 'poison' | 'lava' = 'water'): Material {
  const key = `water:${kind}`;
  const hit = matCache.get(key);
  if (hit) return hit;
  const deep = kind === 'poison' ? '#3a2a5a' : '#1d5a7a';
  const shallow = kind === 'poison' ? '#7a5aa0' : '#4aa8b8';
  let m: Material;
  if (NODES && TSL) {
    const { vec3, vec2, float, color, time, positionWorld, mix, sin, cos, normalize, attribute, uv, smoothstep, cameraPosition, dot, pow, mx_noise_float, transformNormalByViewMatrix, cameraViewMatrix } = TSL;
    const nm = new (THREE as any).MeshPhysicalNodeMaterial({ transparent: true, roughness: 0.08, metalness: 0.0, clearcoat: 0.6 });
    const p = positionWorld.xz;
    const t = time.mul(0.6);
    const n1 = mx_noise_float(vec3(p.x.mul(2.2).add(t), p.y.mul(2.2).sub(t.mul(0.7)), t.mul(0.3)));
    const n2 = mx_noise_float(vec3(p.x.mul(5.0).sub(t.mul(1.3)), p.y.mul(5.0).add(t), t.mul(0.5)));
    const ripple = n1.mul(0.6).add(n2.mul(0.4));
    const shore = attribute('shore', 'float');
    const foamNoise = mx_noise_float(vec3(p.x.mul(9), p.y.mul(9), t.mul(1.5))).mul(0.5).add(0.5);
    const foam = smoothstep(0.78, 0.98, shore.mul(shore).mul(foamNoise.mul(0.6).add(0.5)));
    const sparkle = smoothstep(0.62, 0.75, ripple.mul(0.5).add(0.5));
    const base = mix(color(deep), color(shallow), ripple.mul(0.5).add(0.5).mul(0.55).add(shore.mul(0.15)));
    nm.colorNode = mix(base.add(sparkle.mul(0.08)), color('#dff2f4'), foam.mul(0.7));
    // normalNode is read in view space: turn the rippled world-up normal with the camera
    nm.normalNode = transformNormalByViewMatrix(vec3(ripple.mul(0.22), float(1), n2.mul(0.22)), cameraViewMatrix);
    nm.opacityNode = float(0.8).add(foam.mul(0.15));
    nm.emissiveNode = color(shallow).mul(0.05);
    m = nm;
  } else {
    m = new THREE.MeshStandardMaterial({ color: shallow, transparent: true, opacity: 0.75, roughness: 0.15, metalness: 0.1 });
  }
  matCache.set(key, markShared(m));
  return m;
}

/**
 * Standard lit material for props/characters with vertex colours and optional
 * wind sway (node backend only). `sway` = amplitude at y=1.
 */
export function propMaterial(opts: { sway?: number; flat?: boolean; roughness?: number; metal?: number; emissive?: string; emissiveIntensity?: number; transparent?: boolean; opacity?: number; side?: 'double' | 'front' } = {}): Material {
  const key = `prop:${JSON.stringify(opts)}`;
  const hit = matCache.get(key);
  if (hit) return hit;
  let m: any;
  if (NODES && TSL && opts.sway) {
    const { positionLocal, positionWorld, time, sin, vec3, float, attribute } = TSL;
    m = new (THREE as any).MeshStandardNodeMaterial({ vertexColors: true, flatShading: opts.flat ?? true, roughness: opts.roughness ?? 0.85, metalness: opts.metal ?? 0 });
    const h = attribute('sway', 'float');
    const phase = positionWorld.x.mul(0.7).add(positionWorld.z.mul(0.9));
    const w = sin(time.mul(1.7).add(phase)).mul(0.6).add(sin(time.mul(3.1).add(phase.mul(1.7))).mul(0.25));
    m.positionNode = positionLocal.add(vec3(w.mul(h).mul(opts.sway), float(0), w.mul(h).mul(opts.sway * 0.6)));
  } else {
    m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: opts.flat ?? true, roughness: opts.roughness ?? 0.85, metalness: opts.metal ?? 0 });
  }
  if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity ?? 1; }
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 1; m.depthWrite = false; }
  if (opts.side === 'double') m.side = THREE.DoubleSide;
  matCache.set(key, markShared(m));
  return m;
}

/** Instanced grass blades with wind (node) */
export function grassMaterial(): Material {
  const key = 'grass';
  const hit = matCache.get(key);
  if (hit) return hit;
  let m: any;
  if (NODES && TSL) {
    const { positionLocal, positionWorld, time, sin, vec3, float, mx_noise_float, mix, color, vertexColor, uv } = TSL;
    m = new (THREE as any).MeshStandardNodeMaterial({ vertexColors: true, side: THREE.FrontSide, roughness: 0.9 });
    const h = uv().y;
    const gust = mx_noise_float(vec3(positionWorld.x.mul(0.35).add(time.mul(0.6)), positionWorld.z.mul(0.35), time.mul(0.2))).mul(0.5).add(0.5);
    const w = sin(time.mul(2.3).add(positionWorld.x.mul(1.3)).add(positionWorld.z)).mul(0.35).add(gust.mul(0.8));
    m.positionNode = positionLocal.add(vec3(w.mul(h).mul(0.35), float(0), w.mul(h).mul(0.18)));
  } else {
    m = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.FrontSide, roughness: 0.9 });
  }
  matCache.set(key, markShared(m));
  return m;
}

/** Glowing, pulsing tile highlight (move range, targets, AoE). */
export function tileMaterial(colorHex: string, pulse = true, opacity = 0.5): Material {
  const key = `tile:${colorHex}:${pulse}:${opacity}`;
  const hit = matCache.get(key);
  if (hit) return hit;
  let m: any;
  if (NODES && TSL) {
    const { color, time, sin, uv, float, smoothstep, max, abs, vec2 } = TSL;
    m = new (THREE as any).MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const u = uv();
    const edge = max(abs(u.x.sub(0.5)), abs(u.y.sub(0.5))).mul(2);
    const border = smoothstep(0.72, 0.95, edge);
    const p = pulse ? sin(time.mul(4)).mul(0.15).add(0.85) : float(1);
    m.colorNode = color(colorHex).mul(float(1.4).add(border.mul(1.2)));
    m.opacityNode = float(opacity * 0.55).add(border.mul(opacity * 0.9)).mul(p);
  } else {
    m = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity, depthWrite: false });
  }
  m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2;
  matCache.set(key, markShared(m));
  return m;
}

export function basicMaterial(colorHex: string, opts: { additive?: boolean; opacity?: number; map?: Texture; side?: 'double' } = {}): Material {
  const m = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: opts.opacity ?? 1, depthWrite: false, ...(opts.map ? { map: opts.map } : {}) });
  if (opts.additive) m.blending = THREE.AdditiveBlending;
  if (opts.side === 'double') m.side = THREE.DoubleSide;
  return m;
}
