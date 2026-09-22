// Low-poly prop library for battle maps. Every prop is assembled from
// primitives into merged buckets (solid / foliage(sway) / glow) so a whole map
// is a handful of draw calls.
import { THREE } from './three';
import { GeoBuilder, mat } from './geo';
import { propMaterial, basicMaterial } from './materials';
import type { MapTheme } from '../data/types';
import { hash2 } from '../core/rng';
import type { Object3D, Vector3, Mesh } from 'three/webgpu';

export class PropBuckets {
  solid = new GeoBuilder();
  foliage = new GeoBuilder();
  glow = new GeoBuilder();
  metal = new GeoBuilder();
  extra: Object3D[] = [];
  meshes(): Object3D[] {
    const out: Object3D[] = [];
    const mk = (b: GeoBuilder, m: any, cast = true) => {
      if (!b.count) return;
      const mesh = new THREE.Mesh(b.build(), m) as Mesh;
      mesh.castShadow = cast; mesh.receiveShadow = true;
      out.push(mesh);
    };
    mk(this.solid, propMaterial({ flat: true }));
    mk(this.foliage, propMaterial({ flat: true, sway: 0.06 }));
    mk(this.metal, propMaterial({ flat: true, metal: 0.7, roughness: 0.35 }));
    mk(this.glow, propMaterial({ flat: true, emissive: '#ffb050', emissiveIntensity: 3 }), false);
    out.push(...this.extra);
    return out;
  }
}

type Light = { pos: Vector3; color: string; intensity: number; flicker: boolean };

const G = {
  box: (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt: number, rb: number, h: number, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s),
  cone: (r: number, h: number, s = 7) => new THREE.ConeGeometry(r, h, s),
  ico: (r: number, d = 0) => new THREE.IcosahedronGeometry(r, d),
  dodec: (r: number) => new THREE.DodecahedronGeometry(r, 0),
  sph: (r: number, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h),
  torus: (r: number, t: number, rs = 6, ts = 10) => new THREE.TorusGeometry(r, t, rs, ts),
};

function rot2(x: number, z: number, a: number): [number, number] {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, -x * s + z * c];
}

export function buildProp(b: PropBuckets, type: string, x: number, y: number, z: number, rot: number, s: number, theme: MapTheme, color: string | undefined, lights: Light[]) {
  const P = (dx: number, dy: number, dz: number): [number, number, number] => { const [rx, rz] = rot2(dx * s, dz * s, rot); return [x + rx, y + dy * s, z + rz]; };
  const add = (bucket: GeoBuilder, geo: any, dx: number, dy: number, dz: number, col: string, rx = 0, ry = 0, rz = 0, sc = 1, jitter = 0.08, extra?: Record<string, number>) => {
    const [px, py, pz] = P(dx, dy, dz);
    bucket.add(geo, mat(px, py, pz, rx, rot + ry, rz, s * sc), col, jitter, extra);
    geo.dispose();
  };
  const leaf = (geo: any, dx: number, dy: number, dz: number, col: string, sway = 1, sc = 1) => add(b.foliage, geo, dx, dy, dz, col, 0, 0, 0, sc, 0.18, { sway });
  const snow = theme === 'snow';
  const autumn = theme === 'swamp';
  const h = (k: number) => hash2(Math.round(x * 13) + k, Math.round(z * 17), 91);

  switch (type) {
    case 'tree': {
      if (theme === 'desert') { // palm
        for (let i = 0; i < 5; i++) add(b.solid, G.cyl(0.05 - i * 0.004, 0.06 - i * 0.004, 0.32, 6), i * 0.03, 0.16 + i * 0.3, 0, '#8a6a44', 0, 0, -0.1 * i);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; leaf(G.box(0.7, 0.03, 0.16), Math.cos(a) * 0.35 + 0.15, 1.62, Math.sin(a) * 0.35, '#4a8a3a', 1); }
        break;
      }
      const trunk = autumn ? '#4a3a2a' : '#6a4a30';
      add(b.solid, G.cyl(0.07, 0.11, 0.8, 6), 0, 0.4, 0, trunk);
      add(b.solid, G.cyl(0.03, 0.05, 0.35, 5), 0.12, 0.7, 0, trunk, 0, 0, -0.7);
      const greens = autumn ? ['#6a6a2a', '#8a6a2a', '#5a5a24'] : snow ? ['#4a6a52', '#5a7a60', '#dde8ee'] : ['#3f7a2e', '#4f8f36', '#6aa844'];
      leaf(G.ico(0.42, 1), 0, 1.05, 0, greens[0], 0.8);
      leaf(G.ico(0.3, 1), 0.22, 0.95 + h(1) * 0.1, 0.15, greens[1], 1);
      leaf(G.ico(0.28, 1), -0.2, 1.2, -0.12, greens[2], 1.2);
      leaf(G.ico(0.22, 1), 0.05, 1.38, 0.05, greens[1], 1.4);
      break;
    }
    case 'pine': {
      add(b.solid, G.cyl(0.05, 0.08, 0.5, 6), 0, 0.25, 0, '#5a3e28');
      const pc = theme === 'swamp' ? '#2f4a2a' : '#2e5a34';
      for (let i = 0; i < 4; i++) {
        const r = 0.46 - i * 0.1;
        leaf(G.cone(r, 0.5, 7), 0, 0.5 + i * 0.3, 0, i % 2 ? pc : '#3a6a3e', 0.5 + i * 0.3);
        if (snow) leaf(G.cone(r * 0.75, 0.22, 7), 0, 0.64 + i * 0.3, 0, '#f0f6fa', 0.5 + i * 0.3);
      }
      break;
    }
    case 'deadTree': {
      const c = '#4a3c30';
      add(b.solid, G.cyl(0.05, 0.1, 1.0, 5), 0, 0.5, 0, c);
      add(b.solid, G.cyl(0.02, 0.04, 0.5, 4), 0.15, 0.85, 0, c, 0, 0, -0.9);
      add(b.solid, G.cyl(0.02, 0.035, 0.45, 4), -0.12, 0.95, 0.05, c, 0.2, 0, 0.8);
      add(b.solid, G.cyl(0.015, 0.03, 0.3, 4), 0.05, 1.1, -0.1, c, -0.6, 0, 0.1);
      break;
    }
    case 'bush': {
      const c = theme === 'desert' ? '#8a8a4a' : snow ? '#8aa8a0' : '#4a7a32';
      leaf(G.ico(0.24, 1), 0, 0.16, 0, c, 0.4);
      leaf(G.ico(0.17, 1), 0.16, 0.12, 0.08, '#5a8e3a', 0.5);
      leaf(G.ico(0.15, 1), -0.14, 0.12, -0.06, '#3e6a2a', 0.5);
      if (h(3) > 0.5) for (let i = 0; i < 4; i++) add(b.solid, G.ico(0.03, 0), (h(i) - 0.5) * 0.3, 0.26, (h(i + 5) - 0.5) * 0.3, '#d04040');
      break;
    }
    case 'rock': case 'boulder': {
      const big = type === 'boulder';
      const c = theme === 'desert' ? '#b0906a' : theme === 'volcano' ? '#3a3230' : '#8a857a';
      add(b.solid, G.dodec(big ? 0.38 : 0.18), 0, big ? 0.26 : 0.1, 0, c, h(1), h(2), h(3), 1, 0.12);
      if (big) add(b.solid, G.dodec(0.2), 0.25, 0.12, 0.15, c, h(4), 0, 0, 1, 0.12);
      if (snow) add(b.solid, G.dodec(big ? 0.28 : 0.12), 0, big ? 0.44 : 0.18, 0, '#eef4f8', 0, 0, 0, 1, 0.05);
      break;
    }
    case 'crate': {
      add(b.solid, G.box(0.3, 0.3, 0.3), 0, 0.15, 0, '#8a6038');
      add(b.solid, G.box(0.32, 0.04, 0.32), 0, 0.29, 0, '#6a4424');
      add(b.solid, G.box(0.32, 0.04, 0.32), 0, 0.02, 0, '#6a4424');
      if (h(1) > 0.5) add(b.solid, G.box(0.22, 0.22, 0.22), 0.05, 0.41, 0.02, '#9a7040', 0, 0.5);
      break;
    }
    case 'barrel': {
      add(b.solid, G.cyl(0.13, 0.13, 0.36, 8), 0, 0.18, 0, '#7a5030');
      add(b.metal, G.cyl(0.14, 0.14, 0.03, 8), 0, 0.06, 0, '#5a5a60');
      add(b.metal, G.cyl(0.14, 0.14, 0.03, 8), 0, 0.3, 0, '#5a5a60');
      break;
    }
    case 'fence': {
      for (const dx of [-0.45, 0, 0.45]) add(b.solid, G.box(0.06, 0.4, 0.06), dx, 0.2, 0, '#7a5a38');
      add(b.solid, G.box(1.0, 0.05, 0.04), 0, 0.3, 0, '#8a6a44');
      add(b.solid, G.box(1.0, 0.05, 0.04), 0, 0.14, 0, '#8a6a44');
      break;
    }
    case 'lamp': case 'torch': {
      const tall = type === 'lamp';
      add(b.metal, G.cyl(0.025, 0.035, tall ? 0.9 : 0.5, 6), 0, tall ? 0.45 : 0.25, 0, '#3a3530');
      if (tall) { add(b.metal, G.box(0.14, 0.16, 0.14), 0, 0.98, 0, '#3a3530'); add(b.glow, G.box(0.1, 0.12, 0.1), 0, 0.98, 0, '#ffd070'); }
      else add(b.glow, G.cone(0.06, 0.16, 6), 0, 0.58, 0, '#ffa040');
      lights.push({ pos: new THREE.Vector3(...P(0, tall ? 1.0 : 0.62, 0)), color: '#ffb060', intensity: tall ? 2.2 : 2.6, flicker: !tall });
      break;
    }
    case 'brazier': {
      add(b.metal, G.cyl(0.2, 0.12, 0.18, 8), 0, 0.5, 0, '#4a4038');
      for (const a of [0, 2.1, 4.2]) add(b.metal, G.cyl(0.02, 0.02, 0.45, 4), Math.cos(a) * 0.12, 0.22, Math.sin(a) * 0.12, '#3a3530', 0, 0, Math.cos(a) * 0.2);
      add(b.glow, G.ico(0.14, 0), 0, 0.64, 0, '#ff9030');
      lights.push({ pos: new THREE.Vector3(...P(0, 0.85, 0)), color: '#ff9a40', intensity: 3.2, flicker: true });
      break;
    }
    case 'banner': {
      add(b.metal, G.cyl(0.02, 0.02, 1.4, 5), 0, 0.7, 0, '#6a6a70');
      add(b.foliage, G.box(0.02, 0.6, 0.36), 0, 1.05, 0.19, color ?? '#2a4a8a', 0, 0, 0, 1, 0.05, { sway: 1.2 });
      add(b.solid, G.box(0.03, 0.12, 0.12), 0, 1.1, 0.19, '#d8c070');
      break;
    }
    case 'statue': {
      add(b.solid, G.box(0.5, 0.3, 0.5), 0, 0.15, 0, '#8a8680');
      add(b.solid, G.cyl(0.12, 0.16, 0.5, 7), 0, 0.55, 0, color ?? '#b0aca4');
      add(b.solid, G.ico(0.13, 1), 0, 0.9, 0, color ?? '#b0aca4');
      add(b.solid, G.box(0.5, 0.06, 0.08), 0, 0.72, 0, color ?? '#b0aca4', 0, 0, 0.2);
      add(b.solid, G.cyl(0.02, 0.02, 0.8, 4), 0.22, 0.75, 0, '#9a968e');
      break;
    }
    case 'well': {
      add(b.solid, G.cyl(0.32, 0.34, 0.35, 10), 0, 0.17, 0, '#8a8478');
      add(b.solid, G.cyl(0.26, 0.26, 0.36, 10), 0, 0.19, 0, '#2a3a4a');
      for (const dx of [-0.3, 0.3]) add(b.solid, G.box(0.05, 0.7, 0.05), dx, 0.55, 0, '#6a4a2c');
      add(b.solid, G.cone(0.48, 0.3, 4), 0, 1.02, 0, '#8c3a26', 0, Math.PI / 4);
      break;
    }
    case 'cart': {
      add(b.solid, G.box(0.7, 0.2, 0.45), 0, 0.32, 0, '#8a6038');
      for (const dz of [-0.26, 0.26]) add(b.solid, G.cyl(0.18, 0.18, 0.05, 10), -0.1, 0.18, dz, '#5a3a20', Math.PI / 2);
      add(b.solid, G.box(0.6, 0.05, 0.05), 0.55, 0.3, 0, '#6a4424', 0, 0, 0.3);
      if (h(2) > 0.4) add(b.solid, G.ico(0.18, 0), 0, 0.5, 0, '#c8a860');
      break;
    }
    case 'tent': {
      add(b.solid, G.cone(0.6, 0.9, 4), 0, 0.45, 0, color ?? '#b8a888', 0, Math.PI / 4);
      add(b.solid, G.box(0.25, 0.4, 0.05), 0, 0.2, 0.43, '#3a2a1a');
      add(b.metal, G.cyl(0.015, 0.015, 0.3, 4), 0, 1.0, 0, '#5a5a5a');
      break;
    }
    case 'grave': {
      add(b.solid, G.box(0.28, 0.36, 0.08), 0, 0.18, 0, '#8a8a88', 0, 0, (h(1) - 0.5) * 0.2);
      add(b.solid, G.cyl(0.14, 0.14, 0.08, 8, ), 0, 0.36, 0, '#8a8a88', Math.PI / 2);
      break;
    }
    case 'pillar': {
      add(b.solid, G.box(0.4, 0.12, 0.4), 0, 0.06, 0, '#a09a90');
      add(b.solid, G.cyl(0.14, 0.15, 1.6, 8), 0, 0.9, 0, color ?? '#b8b2a6');
      add(b.solid, G.box(0.4, 0.12, 0.4), 0, 1.74, 0, '#a09a90');
      break;
    }
    case 'ruinWall': {
      add(b.solid, G.box(0.9, 0.9 + h(1) * 0.5, 0.25), 0, 0.5, 0, '#8a8478', 0, 0, (h(2) - 0.5) * 0.08, 1, 0.1);
      add(b.solid, G.box(0.35, 0.3, 0.26), 0.3, 1.1, 0, '#7a746a');
      if (h(3) > 0.5) add(b.foliage, G.ico(0.15, 0), -0.3, 0.95, 0.12, '#4a6a3a', 0.2);
      break;
    }
    case 'altar': {
      add(b.solid, G.box(0.8, 0.45, 0.45), 0, 0.22, 0, '#d8d0c0');
      add(b.solid, G.box(0.86, 0.06, 0.5), 0, 0.47, 0, '#b8a888');
      add(b.metal, G.box(0.05, 0.3, 0.05), 0, 0.65, 0, '#d8b060');
      add(b.metal, G.box(0.18, 0.05, 0.05), 0, 0.7, 0, '#d8b060');
      add(b.glow, G.cyl(0.02, 0.02, 0.1, 5), -0.3, 0.55, 0, '#fff0c0');
      add(b.glow, G.cyl(0.02, 0.02, 0.1, 5), 0.3, 0.55, 0, '#fff0c0');
      lights.push({ pos: new THREE.Vector3(...P(0, 0.8, 0)), color: '#ffe0a0', intensity: 1.2, flicker: true });
      break;
    }
    case 'windmill': {
      add(b.solid, G.cyl(0.55, 0.8, 2.6, 8), 0, 1.3, 0, '#d8ccb0');
      add(b.solid, G.cone(0.75, 0.8, 8), 0, 3.0, 0, '#7a3a28');
      add(b.solid, G.box(0.35, 0.6, 0.05), 0, 0.3, 0.72, '#4a2e1a');
      const sails = new THREE.Group();
      const sb = new GeoBuilder();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        sb.add(G.box(0.08, 1.5, 0.04), mat(Math.sin(a) * 0.75, Math.cos(a) * 0.75, 0, 0, 0, -a), '#6a4a2c');
        sb.add(G.box(0.36, 1.1, 0.02), mat(Math.sin(a) * 0.95 + Math.cos(a) * 0.2, Math.cos(a) * 0.95 - Math.sin(a) * 0.2, 0.02, 0, 0, -a), '#e8e0c8');
      }
      const sm = new THREE.Mesh(sb.build(), propMaterial({ flat: true, side: 'double' }));
      sm.castShadow = true;
      sails.add(sm);
      const [px, py, pz] = P(0, 2.4, 0.85);
      sails.position.set(px, py, pz);
      sails.rotation.y = rot;
      (sails as any).userData.spin = 0.6;
      b.extra.push(sails);
      break;
    }
    case 'chimney': {
      add(b.solid, G.box(0.22, 0.55, 0.22), 0, 0.27, 0, '#8a6a5a');
      add(b.solid, G.box(0.28, 0.06, 0.28), 0, 0.56, 0, '#6a5a4a');
      break;
    }
    case 'bridge': {
      add(b.solid, G.box(1.02, 0.08, 0.9), 0, -0.04, 0, '#8a6038');
      for (const dz of [-0.42, 0.42]) { add(b.solid, G.box(1.02, 0.05, 0.05), 0, 0.3, dz, '#6a4424'); for (const dx of [-0.45, 0.45]) add(b.solid, G.box(0.06, 0.36, 0.06), dx, 0.14, dz, '#6a4424'); }
      break;
    }
    case 'haystack': {
      add(b.solid, G.sph(0.35, 8, 5), 0, 0.2, 0, '#d8b860', 0, 0, 0, 1, 0.1);
      add(b.solid, G.cone(0.3, 0.3, 8), 0, 0.5, 0, '#c8a850');
      break;
    }
    case 'flowers': {
      for (let i = 0; i < 9; i++) {
        const fx = (h(i) - 0.5) * 0.8, fz = (h(i + 20) - 0.5) * 0.8;
        leaf(G.cyl(0.006, 0.006, 0.18, 3), fx, 0.09, fz, '#3a6a2a', 0.9);
        leaf(G.ico(0.04, 0), fx, 0.19, fz, ['#f2e27a', '#e88aa8', '#f4f4f4', '#9ab8f0', '#f07050'][i % 5], 1);
      }
      break;
    }
    case 'mushroom': {
      add(b.solid, G.cyl(0.03, 0.04, 0.12, 5), 0, 0.06, 0, '#e8e0d0');
      add(b.solid, G.sph(0.08, 7, 4), 0, 0.13, 0, color ?? '#c83a30', 0, 0, 0, 1, 0.05);
      add(b.solid, G.cyl(0.02, 0.03, 0.08, 5), 0.1, 0.04, 0.05, '#e8e0d0');
      add(b.solid, G.sph(0.05, 6, 3), 0.1, 0.09, 0.05, color ?? '#c83a30');
      break;
    }
    case 'crystal': {
      const c = color ?? '#8fd8ff';
      add(b.glow, G.cone(0.1, 0.6, 5), 0, 0.3, 0, c, 0.1, 0, 0.1);
      add(b.glow, G.cone(0.07, 0.4, 5), 0.12, 0.2, 0.05, c, -0.3, 0, -0.4);
      add(b.glow, G.cone(0.06, 0.35, 5), -0.1, 0.18, -0.05, c, 0.3, 0, 0.3);
      lights.push({ pos: new THREE.Vector3(...P(0, 0.4, 0)), color: c, intensity: 1.2, flicker: false });
      break;
    }
    case 'gear': {
      add(b.metal, G.torus(0.35, 0.08, 5, 12), 0, 0.45, 0, '#8a7a5a', 0, 0, 0);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add(b.metal, G.box(0.1, 0.12, 0.1), Math.cos(a) * 0.45, 0.45 + Math.sin(a) * 0.45, 0, '#7a6a4a', 0, 0, a); }
      add(b.metal, G.cyl(0.08, 0.08, 0.2, 8), 0, 0.45, 0, '#5a5040', Math.PI / 2);
      break;
    }
    case 'pipe': {
      add(b.metal, G.cyl(0.1, 0.1, 1.0, 8), 0, 0.5, 0, '#6a6a60');
      add(b.metal, G.cyl(0.13, 0.13, 0.08, 8), 0, 0.2, 0, '#8a7a5a');
      add(b.metal, G.cyl(0.13, 0.13, 0.08, 8), 0, 0.8, 0, '#8a7a5a');
      break;
    }
    case 'airship': {
      add(b.solid, G.box(2.4, 0.6, 1.0), 0, 0.3, 0, '#6a4a30', 0, 0, 0, 1, 0.05);
      add(b.solid, G.cone(0.5, 1.0, 4), 1.6, 0.3, 0, '#5a3a24', 0, Math.PI / 4, -Math.PI / 2);
      add(b.metal, G.cyl(0.05, 0.05, 1.8, 6), 0, 1.2, 0, '#5a5040');
      add(b.foliage, G.box(0.04, 1.0, 1.2), 0.1, 1.4, 0, '#c8b890', 0, 0, 0, 1, 0.05, { sway: 0.3 });
      break;
    }
    case 'stainedGlass': {
      const cols = ['#c83a3a', '#3a5ac8', '#d8b040', '#3a9a5a', '#8a3ac8'];
      add(b.solid, G.box(0.8, 1.4, 0.08), 0, 0.9, 0, '#5a5048');
      for (let i = 0; i < 9; i++) add(b.glow, G.box(0.2, 0.3, 0.1), ((i % 3) - 1) * 0.22, 0.55 + Math.floor(i / 3) * 0.34, 0, cols[i % cols.length]);
      break;
    }
    case 'bookshelf': {
      add(b.solid, G.box(0.9, 1.3, 0.3), 0, 0.65, 0, '#5a3a22');
      for (let r = 0; r < 4; r++) for (let i = 0; i < 7; i++) add(b.solid, G.box(0.09, 0.22, 0.2), -0.35 + i * 0.115, 0.2 + r * 0.3, 0.03, ['#8a2a2a', '#2a4a7a', '#3a6a3a', '#8a6a2a', '#5a3a6a'][(i + r) % 5]);
      break;
    }
    case 'throne': {
      add(b.solid, G.box(0.6, 0.4, 0.55), 0, 0.2, 0, '#6a1e22');
      add(b.solid, G.box(0.6, 1.1, 0.12), 0, 0.75, -0.24, '#7a2226');
      add(b.metal, G.box(0.66, 0.08, 0.16), 0, 1.3, -0.24, '#d8b060');
      add(b.metal, G.cone(0.08, 0.2, 4), 0, 1.44, -0.24, '#d8b060');
      break;
    }
    case 'coffin': {
      add(b.solid, G.box(0.36, 0.2, 0.85), 0, 0.1, 0, '#4a3a2a');
      add(b.metal, G.box(0.05, 0.02, 0.3), 0, 0.21, -0.1, '#c8b060');
      add(b.metal, G.box(0.18, 0.02, 0.05), 0, 0.21, -0.15, '#c8b060');
      break;
    }
    case 'bones': {
      for (let i = 0; i < 5; i++) add(b.solid, G.cyl(0.02, 0.02, 0.28, 4), (h(i) - 0.5) * 0.5, 0.02, (h(i + 9) - 0.5) * 0.5, '#e0d8c4', Math.PI / 2, h(i + 3) * 3, 0);
      add(b.solid, G.ico(0.08, 1), 0.1, 0.07, -0.05, '#e8e0cc');
      break;
    }
    case 'cauldron': {
      add(b.metal, G.sph(0.25, 8, 6), 0, 0.28, 0, '#2a2a2e');
      add(b.glow, G.cyl(0.2, 0.2, 0.02, 10), 0, 0.46, 0, '#60f080');
      lights.push({ pos: new THREE.Vector3(...P(0, 0.6, 0)), color: '#60f080', intensity: 1.2, flicker: true });
      break;
    }
    case 'anvil': {
      add(b.solid, G.box(0.25, 0.25, 0.25), 0, 0.12, 0, '#5a4a3a');
      add(b.metal, G.box(0.45, 0.12, 0.2), 0, 0.3, 0, '#3a3a40');
      add(b.metal, G.cone(0.08, 0.18, 4), 0.28, 0.3, 0, '#3a3a40', 0, 0, -Math.PI / 2);
      break;
    }
    case 'signpost': {
      add(b.solid, G.box(0.06, 0.8, 0.06), 0, 0.4, 0, '#6a4a2c');
      add(b.solid, G.box(0.5, 0.14, 0.03), 0.18, 0.66, 0, '#8a6a44');
      add(b.solid, G.box(0.45, 0.14, 0.03), -0.14, 0.46, 0, '#8a6a44', 0, 0.2, 0);
      break;
    }
    case 'market': {
      for (const [dx, dz] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]]) add(b.solid, G.box(0.05, 0.9, 0.05), dx, 0.45, dz, '#6a4a2c');
      add(b.foliage, G.box(1.0, 0.04, 0.8), 0, 0.95, 0, color ?? '#c84a3a', 0.12, 0, 0, 1, 0.05, { sway: 0.15 });
      add(b.solid, G.box(0.9, 0.3, 0.5), 0, 0.3, 0, '#8a6038');
      for (let i = 0; i < 6; i++) add(b.solid, G.ico(0.07, 0), -0.35 + i * 0.14, 0.5, (h(i) - 0.5) * 0.3, ['#e04a2a', '#f0c030', '#6ab030', '#a04ab0'][i % 4]);
      break;
    }
    case 'waterfall': {
      const wf = new THREE.Mesh(new THREE.PlaneGeometry(1, 3), basicMaterial('#bfe8f0', { opacity: 0.55, side: 'double' }));
      const [px, py, pz] = P(0, -1.5, 0);
      wf.position.set(px, py, pz);
      wf.rotation.y = rot;
      (wf as any).userData.waterfall = true;
      b.extra.push(wf);
      break;
    }
    case 'portcullis': {
      for (let i = 0; i < 6; i++) add(b.metal, G.box(0.04, 1.2, 0.04), -0.4 + i * 0.16, 0.6, 0, '#3a3a40');
      for (let j = 0; j < 4; j++) add(b.metal, G.box(0.9, 0.04, 0.04), 0, 0.2 + j * 0.3, 0, '#3a3a40');
      break;
    }
    case 'organ': {
      add(b.solid, G.box(1.0, 0.5, 0.4), 0, 0.25, 0, '#4a2e1a');
      for (let i = 0; i < 9; i++) add(b.metal, G.cyl(0.04, 0.04, 0.6 + Math.sin(i / 8 * Math.PI) * 0.6, 6), -0.4 + i * 0.1, 0.8 + Math.sin(i / 8 * Math.PI) * 0.3, -0.1, '#c8b070');
      break;
    }
    case 'chandelier': {
      add(b.metal, G.torus(0.35, 0.03, 4, 12), 0, 2.2, 0, '#c8a050', Math.PI / 2);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(b.glow, G.cone(0.03, 0.08, 5), Math.cos(a) * 0.35, 2.28, Math.sin(a) * 0.35, '#ffd080'); }
      add(b.metal, G.cyl(0.01, 0.01, 1.2, 4), 0, 2.8, 0, '#6a6a6a');
      lights.push({ pos: new THREE.Vector3(...P(0, 2.2, 0)), color: '#ffd090', intensity: 2.5, flicker: true });
      break;
    }
    case 'rug': {
      add(b.solid, G.box(0.9, 0.015, 0.9), 0, 0.008, 0, color ?? '#8a2a2a');
      add(b.solid, G.box(0.7, 0.018, 0.7), 0, 0.01, 0, '#c8a050');
      break;
    }
    case 'bed': {
      add(b.solid, G.box(0.5, 0.22, 0.9), 0, 0.11, 0, '#6a4a2c');
      add(b.solid, G.box(0.46, 0.08, 0.86), 0, 0.26, 0, color ?? '#e8e0d0');
      add(b.solid, G.box(0.3, 0.07, 0.18), 0, 0.33, -0.3, '#f4f0e8');
      break;
    }
    case 'table': {
      add(b.solid, G.box(0.7, 0.05, 0.5), 0, 0.42, 0, '#7a5030');
      for (const [dx, dz] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) add(b.solid, G.box(0.05, 0.4, 0.05), dx, 0.2, dz, '#5a3a20');
      add(b.solid, G.cyl(0.05, 0.04, 0.1, 6), 0.1, 0.5, 0, '#c8c0b0');
      break;
    }
    case 'cannon': {
      add(b.solid, G.box(0.5, 0.2, 0.4), 0, 0.2, 0, '#5a3a20');
      add(b.metal, G.cyl(0.1, 0.13, 0.8, 8), 0.1, 0.42, 0, '#2a2a30', 0, 0, Math.PI / 2 - 0.2);
      break;
    }
    default: {
      add(b.solid, G.box(0.3, 0.3, 0.3), 0, 0.15, 0, '#888');
    }
  }
}
