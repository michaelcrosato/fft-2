// Geometry accumulation helpers: build merged, vertex-coloured, flat-shaded
// low-poly meshes from primitives (one draw call per material).
import { THREE } from './three';
import type { BufferGeometry, Matrix4 } from 'three/webgpu';

export class GeoBuilder {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  extra: Record<string, { size: number; data: number[] }> = {};

  get count() { return this.pos.length / 3; }

  vertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number, r: number, g: number, b: number) {
    this.pos.push(x, y, z); this.nor.push(nx, ny, nz); this.uv.push(u, v); this.col.push(r, g, b);
  }

  /** quad a,b,c,d counter-clockwise when seen from the front */
  quad(
    a: [number, number, number], b: [number, number, number], c: [number, number, number], d: [number, number, number],
    uvs: [number, number][], cols: [number, number, number][], normal?: [number, number, number],
  ) {
    const n = normal ?? faceNormal(a, b, c);
    const idx = [0, 1, 2, 0, 2, 3];
    const P = [a, b, c, d];
    for (const i of idx) this.vertex(P[i][0], P[i][1], P[i][2], n[0], n[1], n[2], uvs[i][0], uvs[i][1], cols[i][0], cols[i][1], cols[i][2]);
  }

  tri(a: [number, number, number], b: [number, number, number], c: [number, number, number], col: [number, number, number]) {
    const n = faceNormal(a, b, c);
    for (const p of [a, b, c]) this.vertex(p[0], p[1], p[2], n[0], n[1], n[2], 0, 0, col[0], col[1], col[2]);
  }

  pushExtra(name: string, size: number, ...vals: number[]) {
    (this.extra[name] ??= { size, data: [] }).data.push(...vals);
  }

  /** zero-fill an extra attribute up to the current vertex count (parts added without it) */
  private alignExtra(name: string, size: number) {
    const e = (this.extra[name] ??= { size, data: [] });
    const want = this.count * e.size;
    while (e.data.length < want) e.data.push(0);
  }

  /** Append a three.js primitive geometry transformed by matrix, painted a flat colour. */
  add(geo: BufferGeometry, m: Matrix4, color: string | [number, number, number], jitter = 0, extra?: Record<string, number>) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.getAttribute('position');
    const uvA = g.getAttribute('uv');
    const c = typeof color === 'string' ? hexRgb(color) : color;
    if (extra) for (const k in extra) this.alignExtra(k, 1);
    const v = new THREE.Vector3();
    const tmp: number[] = [];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p as any, i).applyMatrix4(m);
      tmp.push(v.x, v.y, v.z);
    }
    // flat normals per triangle
    for (let i = 0; i < p.count; i += 3) {
      const a: [number, number, number] = [tmp[i * 3], tmp[i * 3 + 1], tmp[i * 3 + 2]];
      const b: [number, number, number] = [tmp[i * 3 + 3], tmp[i * 3 + 4], tmp[i * 3 + 5]];
      const cc: [number, number, number] = [tmp[i * 3 + 6], tmp[i * 3 + 7], tmp[i * 3 + 8]];
      const n = faceNormal(a, b, cc);
      const j = jitter ? 1 + (Math.sin((a[0] + a[1] * 3.1 + a[2] * 7.7) * 91.3) * 0.5) * jitter : 1;
      for (let k = 0; k < 3; k++) {
        const pp = [a, b, cc][k];
        const u = uvA ? uvA.getX(i + k) : 0, vv = uvA ? uvA.getY(i + k) : 0;
        this.vertex(pp[0], pp[1], pp[2], n[0], n[1], n[2], u, vv, Math.min(1, c[0] * j), Math.min(1, c[1] * j), Math.min(1, c[2] * j));
        if (extra) for (const k in extra) this.pushExtra(k, 1, extra[k]);
      }
    }
    if (g !== geo) g.dispose();
  }

  build(): BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    // every attribute must cover every vertex, or WebGPU rejects the draw
    for (const [k, e] of Object.entries(this.extra)) { this.alignExtra(k, e.size); g.setAttribute(k, new THREE.Float32BufferAttribute(e.data.slice(0, this.count * e.size), e.size)); }
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export function faceNormal(a: number[], b: number[], c: number[]): [number, number, number] {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

const rgbCache = new Map<string, [number, number, number]>();
/** hex → linear rgb triple (for vertex colours, which three treats as linear) */
export function hexRgb(h: string): [number, number, number] {
  const hit = rgbCache.get(h);
  if (hit) return hit;
  const c = new THREE.Color(h);
  const out: [number, number, number] = [c.r, c.g, c.b];
  rgbCache.set(h, out);
  return out;
}

export function shade(c: [number, number, number], f: number): [number, number, number] {
  return [c[0] * f, c[1] * f, c[2] * f];
}

/** matrix helper: translate / rotate(euler xyz) / scale */
export function mat(tx = 0, ty = 0, tz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx): Matrix4 {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  m.compose(new THREE.Vector3(tx, ty, tz), q, new THREE.Vector3(sx, sy, sz));
  return m;
}
