// Shared rig utilities: bones built from merged primitives with an inverted
// hull outline, plus the UnitModel interface used by the battle view.
import { THREE } from '../three';
import { GeoBuilder, mat } from '../geo';
import type { BufferGeometry, Group, Material, Mesh, Object3D } from 'three/webgpu';
import { propMaterial } from '../materials';

export type BoneName =
  | 'root' | 'body' | 'hips' | 'torso' | 'head' | 'armL' | 'armR' | 'elbowL' | 'elbowR' | 'handL' | 'handR'
  | 'legL' | 'legR' | 'kneeL' | 'kneeR' | 'cape' | 'tail' | 'jaw' | 'wingL' | 'wingR'
  | 'legFL' | 'legFR' | 'legBL' | 'legBR' | 'neck' | 'extra1' | 'extra2' | 'extra3';

export interface UnitModel {
  root: Group;
  bones: Partial<Record<BoneName, Object3D>>;
  /** rest rotations/positions snapshot for the animator */
  rest: Map<Object3D, { rx: number; ry: number; rz: number; px: number; py: number; pz: number; sx: number; sy: number; sz: number }>;
  height: number;
  kind: 'humanoid' | 'monster';
  /** meshes for tinting / flashing */
  meshes: Mesh[];
  /** attach points */
  weaponSocket?: Object3D;
  shieldSocket?: Object3D;
  dispose(): void;
}

let outlineMat: Material | null = null;
export function getOutlineMaterial(): Material {
  if (!outlineMat) {
    const m = new THREE.MeshBasicMaterial({ color: '#141018', side: THREE.BackSide });
    outlineMat = m;
  }
  return outlineMat;
}

/** A bone: pivot Object3D with colour mesh + outline shell. */
export class BonePart {
  readonly obj: Object3D;
  readonly b = new GeoBuilder();
  readonly ob = new GeoBuilder();
  readonly glow = new GeoBuilder();
  outlineT: number;
  constructor(name: string, parent: Object3D | null, x = 0, y = 0, z = 0, outline = 0.014) {
    this.obj = new THREE.Group();
    this.obj.name = name;
    this.obj.position.set(x, y, z);
    if (parent) parent.add(this.obj);
    this.outlineT = outline;
  }
  /**
   * add a primitive (geometry is consumed) at local transform, coloured.
   */
  add(geo: BufferGeometry, x: number, y: number, z: number, color: string, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx, opts: { outline?: boolean; glow?: boolean; jitter?: number } = {}) {
    const target = opts.glow ? this.glow : this.b;
    target.add(geo, mat(x, y, z, rx, ry, rz, sx, sy, sz), color, opts.jitter ?? 0.04);
    if (opts.outline !== false && this.outlineT > 0) {
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const ex = Math.max(0.01, (bb.max.x - bb.min.x) * sx), ey = Math.max(0.01, (bb.max.y - bb.min.y) * sy), ez = Math.max(0.01, (bb.max.z - bb.min.z) * sz);
      const t = this.outlineT * 2;
      this.ob.add(geo, mat(x, y, z, rx, ry, rz, sx * (1 + t / ex), sy * (1 + t / ey), sz * (1 + t / ez)), '#000000', 0);
    }
    geo.dispose();
  }
  finish(material: Material, glowMat?: Material): Mesh[] {
    const out: Mesh[] = [];
    if (this.b.count) {
      const m = new THREE.Mesh(this.b.build(), material);
      m.castShadow = true; m.receiveShadow = true;
      this.obj.add(m); out.push(m);
    }
    if (this.ob.count) {
      const o = new THREE.Mesh(this.ob.build(), getOutlineMaterial());
      o.castShadow = false; o.receiveShadow = false;
      o.renderOrder = -1;
      this.obj.add(o);
    }
    if (this.glow.count) {
      const g = new THREE.Mesh(this.glow.build(), glowMat ?? propMaterial({ flat: true, emissive: '#ffffff', emissiveIntensity: 2 }));
      this.obj.add(g); out.push(g);
    }
    return out;
  }
}

export function snapshotRest(model: UnitModel) {
  for (const [name, b] of Object.entries(model.bones)) {
    if (!b || name === 'root') continue;
    model.rest.set(b, { rx: b.rotation.x, ry: b.rotation.y, rz: b.rotation.z, px: b.position.x, py: b.position.y, pz: b.position.z, sx: b.scale.x, sy: b.scale.y, sz: b.scale.z });
  }
}

export const G = {
  box: (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt: number, rb: number, h: number, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s),
  cone: (r: number, h: number, s = 7) => new THREE.ConeGeometry(r, h, s),
  ico: (r: number, d = 1) => new THREE.IcosahedronGeometry(r, d),
  sph: (r: number, w = 9, h = 7) => new THREE.SphereGeometry(r, w, h),
  hemi: (r: number, w = 9, h = 5) => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI / 2),
  torus: (r: number, t: number, rs = 5, ts = 12, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc),
  oct: (r: number) => new THREE.OctahedronGeometry(r, 0),
  dodec: (r: number) => new THREE.DodecahedronGeometry(r, 0),
};

/** lighten (+) or darken (-) a hex colour */
export function tone(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  if (amt >= 0) c.lerp(new THREE.Color('#ffffff'), amt);
  else c.lerp(new THREE.Color('#000000'), -amt);
  return '#' + c.getHexString();
}

export function disposeGroup(g: Object3D) {
  g.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); });
}
