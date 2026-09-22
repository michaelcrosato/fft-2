// Procedural low-poly monsters: one builder per MonsterShape. Every model is
// made of the same BonePart primitives + inverted-hull outline as the
// humanoids, rigged with the bone names the CLIPS in anim.ts drive:
//   body (bob / lunge), head / neck / jaw (bite, roar, breath), tail (sway),
//   wingL / wingR (flap, rz), legFL..legBR (quadruped walk) and, for bipeds,
//   hips / torso / armL|R / elbowL|R / handL|R / legL|R / kneeL|R.
// Secondary pieces (extra heads, extra wing pairs, tentacles, flames, halos)
// are un-registered pivots that either copy a rig bone's motion ("follow") or
// run a small procedural wiggle — both applied in updateMatrixWorld, so the
// Animator never fights over them.
// Facing +Z, feet at y = 0, look.scale applied on the 'body' bone.
import { THREE } from '../three';
import type { MonsterLook, MonsterShape } from '../../data/types';
import { BonePart, G, snapshotRest, tone, type UnitModel, type BoneName } from './rig';
import { propMaterial } from '../materials';
import { mat } from '../geo';
import type { BufferGeometry, Group, Mesh, Object3D, Vector3 } from 'three/webgpu';

type V3 = [number, number, number];
type Part = BonePart;
interface Opt { outline?: boolean; glow?: boolean; jitter?: number }
interface Off { rx: number; ry: number; rz: number; px: number; py: number; pz: number; s: number }
type Driver = (t: number, o: Off) => void;

const NO: Opt = { outline: false };
const GL: Opt = { glow: true, outline: false };
const DARK = '#1c1418';
const VOID = '#0c0810';
const WHITE = '#f6f2ea';
const IVORY = '#eee4c8';
const MOUTH = '#4a1620';
const CLAW = '#e6dcc4';
const GOLD = '#d8b040';
const PI = Math.PI;

// ---------------------------------------------------------------------------
//  sizes (geometry height above the body origin, before look.scale)
// ---------------------------------------------------------------------------
const SHAPE_H: Record<MonsterShape, number | ((v: number) => number)> = {
  chocobo: 1.22, goblin: 0.78, bomb: 0.82, panther: 0.72, boar: 0.66, skeleton: 1.02, ghost: 0.78,
  eye: 0.62, treant: 1.22, minotaur: 1.2, malboro: 0.98, behemoth: 1.04, dragon: 1.12, hydra: 1.08,
  bird: 0.9, squid: 0.88, bull: 0.98, wolf: 0.78, golem: 1.22, demon: (v) => (v === 2 ? 1.26 : 1.34), automaton: 1.1,
  tome: 0.5, serpent: 1.25, seraph: (v) => (v === 3 ? 1.38 : 1.12),
};
const HOVER: Partial<Record<MonsterShape, number>> = { bomb: 0.3, ghost: 0.3, eye: 0.32, tome: 0.34, seraph: 0.32 };

/** approximate model height in world units (for UI bubble placement) */
export function monsterHeight(look: MonsterLook): number {
  const h = SHAPE_H[look.shape] ?? 1;
  const base = typeof h === 'function' ? h(look.variant ?? 1) : h;
  return (HOVER[look.shape] ?? 0) + base * (look.scale ?? 1);
}

// ---------------------------------------------------------------------------
//  geometry helpers
// ---------------------------------------------------------------------------
const vec = (p: V3 | Vector3): Vector3 => (Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone());
const add3 = (a: V3, b: V3 | Vector3, k = 1): V3 => {
  const b3: V3 = Array.isArray(b) ? b : [b.x, b.y, b.z];
  return [a[0] + b3[0] * k, a[1] + b3[1] * k, a[2] + b3[2] * k];
};
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const X = (p: V3, s: number): V3 => [p[0] * s, p[1], p[2]];

/** Euler (XYZ) that maps local +Y onto `dir`, local +Z towards `face` */
function orient(dir: V3 | Vector3, face: V3 = [0, 1, 0]): V3 {
  const y = vec(dir).normalize();
  let z = vec(face);
  z.addScaledVector(y, -z.dot(y));
  if (z.lengthSq() < 1e-5) {
    z = Math.abs(y.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    z.addScaledVector(y, -z.dot(y));
  }
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  const e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z), 'XYZ');
  return [e.x, e.y, e.z];
}

/** cylinder from a (radius r0) to b (radius r1) */
function seg(bp: Part, a: V3, b: V3, r0: number, r1: number, col: string, sides = 6, o: Opt = {}, face?: V3, flat = 1) {
  const d = vec(b).sub(vec(a));
  const len = d.length();
  if (len < 1e-5) return;
  const e = orient(d, face);
  bp.add(G.cyl(r1, r0, len, sides), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, col, e[0], e[1], e[2], 1, 1, flat, o);
}
/** cone with its base centred at a and its tip at b; `flat` squashes it along `face` */
function spike(bp: Part, a: V3, b: V3, r: number, col: string, sides = 5, o: Opt = {}, face?: V3, flat = 1) {
  const d = vec(b).sub(vec(a));
  const len = d.length();
  if (len < 1e-5) return;
  const e = orient(d, face);
  bp.add(G.cone(r, len, sides), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, col, e[0], e[1], e[2], 1, 1, flat, o);
}
/** box spanning a→b (length), width along local x, thickness along `face` */
function slab(bp: Part, a: V3, b: V3, w: number, t: number, col: string, face: V3 = [1, 0, 0], o: Opt = {}) {
  const d = vec(b).sub(vec(a));
  const len = d.length();
  if (len < 1e-5) return;
  const e = orient(d, face);
  bp.add(G.box(w, len, t), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, col, e[0], e[1], e[2], 1, 1, 1, o);
}
/** sphere helper */
function ball(bp: Part, p: V3, r: number, col: string, s: V3 = [1, 1, 1], o: Opt = {}, w = 8, h = 6, rot: V3 = [0, 0, 0]) {
  bp.add(G.sph(r, w, h), p[0], p[1], p[2], col, rot[0], rot[1], rot[2], s[0], s[1], s[2], o);
}

/** tapered tube through points (own geometry with a proper outline shell) */
function tubeGeo(pts: V3[], radii: number[], sides: number, grow = 0): BufferGeometry {
  const n = pts.length;
  const P = pts.map((p) => vec(p));
  const T = P.map((_, i) => P[Math.min(n - 1, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize());
  const up = Math.abs(T[0].y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const nrm = up.addScaledVector(T[0], -up.dot(T[0])).normalize();
  const pos: number[] = [];
  const idx: number[] = [];
  const q = new THREE.Quaternion();
  const pointy = radii[n - 1] <= 0.0015;
  const rings = pointy ? n - 1 : n;
  for (let i = 0; i < rings; i++) {
    if (i > 0) {
      q.setFromUnitVectors(T[i - 1], T[i]);
      nrm.applyQuaternion(q);
      nrm.addScaledVector(T[i], -nrm.dot(T[i])).normalize();
    }
    const bin = new THREE.Vector3().crossVectors(T[i], nrm);
    const r = radii[i] + grow;
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * PI * 2;
      const c = Math.cos(a) * r, s = Math.sin(a) * r;
      pos.push(P[i].x + nrm.x * c + bin.x * s, P[i].y + nrm.y * c + bin.y * s, P[i].z + nrm.z * c + bin.z * s);
    }
  }
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + ((j + 1) % sides), c = (i + 1) * sides + ((j + 1) % sides), d = (i + 1) * sides + j;
      idx.push(a, b, d, b, c, d);
    }
  }
  const sc = pos.length / 3;
  const s0 = P[0].clone().addScaledVector(T[0], -grow);
  pos.push(s0.x, s0.y, s0.z);
  for (let j = 0; j < sides; j++) idx.push(sc, (j + 1) % sides, j);
  const last = (rings - 1) * sides;
  const ec = pos.length / 3;
  const e0 = P[n - 1].clone().addScaledVector(T[n - 1], grow * (pointy ? 1.6 : 1));
  pos.push(e0.x, e0.y, e0.z);
  for (let j = 0; j < sides; j++) idx.push(pointy ? last + j : ec, pointy ? last + ((j + 1) % sides) : last + j, pointy ? ec : last + ((j + 1) % sides));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function tube(bp: Part, pts: V3[], r: number[], col: string, sides = 6, o: Opt = {}, subdiv = 1) {
  let P = pts;
  const R0 = r.length === pts.length ? r : pts.map((_, i) => r[0] + (r[r.length - 1] - r[0]) * (i / (pts.length - 1)));
  let R = R0;
  if (subdiv > 1 && pts.length > 2) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => vec(p)));
    const n = (pts.length - 1) * subdiv;
    P = curve.getPoints(n).map((v) => [v.x, v.y, v.z] as V3);
    R = P.map((_, i) => {
      const f = (i / n) * (pts.length - 1);
      const k = Math.min(pts.length - 2, Math.floor(f));
      return R0[k] + (R0[k + 1] - R0[k]) * (f - k);
    });
  }
  const g = tubeGeo(P, R, sides);
  (o.glow ? bp.glow : bp.b).add(g, mat(), col, o.jitter ?? 0.04);
  g.dispose();
  if (!o.glow && o.outline !== false && bp.outlineT > 0) {
    const go = tubeGeo(P, R, sides, bp.outlineT);
    bp.ob.add(go, mat(), '#000000', 0);
    go.dispose();
  }
}

/** thin plate through a (roughly planar, star-shaped around `center`) polygon */
function plateGeo(pts: V3[], center: V3, th: number, grow = 0): BufferGeometry {
  const P = pts.map((p) => vec(p));
  const m = P.length;
  const n = new THREE.Vector3();
  for (let i = 0; i < m; i++) {
    const a = P[i], b = P[(i + 1) % m];
    n.x += (a.y - b.y) * (a.z + b.z); n.y += (a.z - b.z) * (a.x + b.x); n.z += (a.x - b.x) * (a.y + b.y);
  }
  n.normalize();
  let Q = P;
  if (grow > 0) {
    Q = P.map((p, i) => {
      const e1 = p.clone().sub(P[(i + m - 1) % m]).normalize();
      const e2 = P[(i + 1) % m].clone().sub(p).normalize();
      const o1 = new THREE.Vector3().crossVectors(e1, n), o2 = new THREE.Vector3().crossVectors(e2, n);
      const mm = o1.clone().add(o2);
      if (mm.lengthSq() < 1e-6) mm.copy(o1);
      mm.normalize();
      return p.clone().addScaledVector(mm, grow / Math.max(0.35, mm.dot(o1)));
    });
  }
  const C = vec(center);
  const h = th / 2 + grow;
  const top = Q.map((p) => p.clone().addScaledVector(n, h)), bot = Q.map((p) => p.clone().addScaledVector(n, -h));
  const ct = C.clone().addScaledVector(n, h), cb = C.clone().addScaledVector(n, -h);
  const pos: number[] = [];
  const tri = (a: Vector3, b: Vector3, c: Vector3) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m;
    tri(ct, top[i], top[j]); tri(cb, bot[j], bot[i]);
    tri(top[i], bot[i], bot[j]); tri(top[i], bot[j], top[j]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

function membrane(bp: Part, pts: V3[], col: string, th = 0.012, center?: V3, o: Opt = {}) {
  const c: V3 = center ?? pts.reduce((acc, p) => add3(acc, p, 1 / pts.length), [0, 0, 0] as V3);
  const g = plateGeo(pts, c, th);
  (o.glow ? bp.glow : bp.b).add(g, mat(), col, o.jitter ?? 0.03);
  g.dispose();
  if (!o.glow && o.outline !== false && bp.outlineT > 0) {
    const go = plateGeo(pts, c, th, bp.outlineT);
    bp.ob.add(go, mat(), '#000000', 0);
    go.dispose();
  }
}

/** cartoon eye: flattened dark dot with a white glint, bulging along `dir` */
function eyeDot(bp: Part, p: V3, r: number, dir: V3, col = DARK, shine = true) {
  const e = orient(dir);
  bp.add(G.sph(r, 7, 5), p[0], p[1], p[2], col, e[0], e[1], e[2], 1, 0.6, 1.2, NO);
  if (shine) {
    const d = vec(dir).normalize();
    bp.add(G.box(r * 0.5, r * 0.5, r * 0.5), p[0] + d.x * r * 0.45 - d.z * r * 0.25, p[1] + r * 0.45, p[2] + d.z * r * 0.45 + d.x * r * 0.25, WHITE, 0, 0, 0, 1, 1, 1, NO);
  }
}

/** colour check: pale / unsaturated accents make poor glow colours */
function vivid(hex: string, fallback: string): string {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(hex).getHSL(hsl);
  return hsl.s < 0.3 || hsl.l > 0.86 ? fallback : hex;
}
function mix(a: string, b: string, t: number): string {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
}

// ---------------------------------------------------------------------------
//  build kit
// ---------------------------------------------------------------------------
class Kit {
  readonly root: Group;
  readonly bones: Partial<Record<BoneName, Object3D>>;
  readonly parts: Part[] = [];
  private glowParts: Array<{ part: Part; owner: Part; col: string; k: number }> = [];
  private drivers = new Map<Object3D, Driver[]>();
  private armers: Array<() => void> = [];
  readonly P: string; readonly S: string; readonly A: string; readonly M: string; readonly L: string;
  readonly v: number;
  readonly sc: number;
  readonly seed = Math.random() * 100;
  readonly body: Part;
  hover = false;

  constructor(readonly look: MonsterLook) {
    const pal = look.palette;
    this.P = pal.primary; this.S = pal.secondary; this.A = pal.accent;
    this.M = pal.metal ?? '#9a9aa4'; this.L = pal.leather ?? '#5a3b24';
    this.v = look.variant ?? 1;
    this.sc = look.scale ?? 1;
    this.root = new THREE.Group();
    this.root.name = 'unit';
    this.bones = { root: this.root };
    this.body = this.bone('body', this.root);
    this.body.obj.scale.setScalar(this.sc);
  }

  private objOf(p: Part | Object3D): Object3D { return p instanceof BonePart ? p.obj : p; }

  /** registered rig bone (animated by the Animator) */
  bone(name: BoneName, parent: Part | Object3D, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): Part {
    const p = new BonePart(name, this.objOf(parent), x, y, z);
    p.obj.rotation.set(rx, ry, rz);
    this.parts.push(p);
    this.bones[name] = p.obj;
    return p;
  }
  /** plain pivot (not driven by clips) */
  node(parent: Part | Object3D, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): Part {
    const p = new BonePart('part', this.objOf(parent), x, y, z);
    p.obj.rotation.set(rx, ry, rz);
    this.parts.push(p);
    return p;
  }
  /** glow sub-part of `owner` with its own emissive colour */
  gp(owner: Part, col: string, k = 2.2): Part {
    let g = this.glowParts.find((q) => q.owner === owner && q.col === col && q.k === k);
    if (!g) {
      g = { part: new BonePart('glow', owner.obj, 0, 0, 0, 0), owner, col, k };
      this.glowParts.push(g);
    }
    return g.part;
  }
  glowBall(owner: Part, p: V3, r: number, col: string, s: V3 = [1, 1, 1], k = 2.2, w = 7, h = 5) {
    ball(this.gp(owner, col, k), p, r, col, s, GL, w, h);
  }
  glowEye(owner: Part, p: V3, r: number, dir: V3, col: string, k = 2.6, stretch: V3 = [1, 0.6, 1.2]) {
    const e = orient(dir);
    this.gp(owner, col, k).add(G.sph(r, 7, 5), p[0], p[1], p[2], col, e[0], e[1], e[2], stretch[0], stretch[1], stretch[2], GL);
  }
  drive(obj: Object3D, fn: Driver) {
    const l = this.drivers.get(obj);
    if (l) l.push(fn); else this.drivers.set(obj, [fn]);
  }
  wiggle(p: Part, amp: Partial<Off>, freq = 1, phase = 0) {
    const keys = Object.keys(amp) as Array<keyof Off>;
    this.drive(p.obj, (t, o) => {
      const w = Math.sin(t * freq * PI * 2 + phase);
      for (const k of keys) o[k] += (amp[k] as number) * w;
    });
  }
  spin(p: Part, axis: 'rx' | 'ry' | 'rz', speed: number) { this.drive(p.obj, (t, o) => { o[axis] += t * speed; }); }
  /** copy a rig bone's rotation offset from rest (k scales it) */
  follow(p: Part, master: Object3D | undefined, kx = 1, ky = kx, kz = kx) {
    if (!master) return;
    let rx = 0, ry = 0, rz = 0;
    this.armers.push(() => { rx = master.rotation.x; ry = master.rotation.y; rz = master.rotation.z; });
    this.drive(p.obj, (_t, o) => {
      o.rx += (master.rotation.x - rx) * kx; o.ry += (master.rotation.y - ry) * ky; o.rz += (master.rotation.z - rz) * kz;
    });
  }
  /** raise the body for floating shapes; returns a gently bobbing pivot */
  float(y: number, amp = 0.03): Part {
    this.hover = true;
    this.body.obj.position.y = y;
    const bob = this.node(this.body);
    this.wiggle(bob, { py: amp }, 0.38);
    return bob;
  }

  finish(height: number): UnitModel {
    const material = propMaterial({ flat: true, roughness: 0.78 });
    const meshes: Mesh[] = [];
    for (const p of this.parts) meshes.push(...p.finish(material));
    for (const g of this.glowParts) meshes.push(...g.part.finish(material, propMaterial({ flat: true, emissive: g.col, emissiveIntensity: g.k })));
    for (const a of this.armers) a();
    for (const [obj, fns] of this.drivers) {
      const r = { rx: obj.rotation.x, ry: obj.rotation.y, rz: obj.rotation.z, px: obj.position.x, py: obj.position.y, pz: obj.position.z, sx: obj.scale.x, sy: obj.scale.y, sz: obj.scale.z };
      const o: Off = { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, s: 1 };
      const seed = this.seed;
      const base = obj.updateMatrixWorld.bind(obj);
      obj.updateMatrixWorld = (force?: boolean) => {
        const t = performance.now() / 1000 + seed;
        o.rx = 0; o.ry = 0; o.rz = 0; o.px = 0; o.py = 0; o.pz = 0; o.s = 1;
        for (const f of fns) f(t, o);
        obj.rotation.set(r.rx + o.rx, r.ry + o.ry, r.rz + o.rz);
        obj.position.set(r.px + o.px, r.py + o.py, r.pz + o.pz);
        obj.scale.set(r.sx * o.s, r.sy * o.s, r.sz * o.s);
        base(force);
      };
    }
    const root = this.root;
    const model: UnitModel = {
      root, bones: this.bones, rest: new Map(), height, kind: 'monster', meshes,
      dispose() { root.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); }); },
    };
    if (this.hover) (model as any).hover = true;
    snapshotRest(model);
    return model;
  }
}

// ---------------------------------------------------------------------------
//  shared rigs & body parts
// ---------------------------------------------------------------------------
interface Bip { hips: Part; torso: Part; head: Part; armR: Part; armL: Part; elbowR: Part; elbowL: Part; handR: Part; handL: Part; legR: Part; legL: Part; kneeR: Part; kneeL: Part }
interface BipDims { hipY: number; hipX: number; thigh: number; headY: number; shX: number; shY: number; upper: number; fore: number; splay?: number; bend?: number; parent?: Part }

function biped(K: Kit, d: BipDims): Bip {
  const hips = K.bone('hips', d.parent ?? K.body, 0, d.hipY, 0);
  const torso = K.bone('torso', hips);
  const head = K.bone('head', torso, 0, d.headY, 0);
  const sp = d.splay ?? 0.12, bd = d.bend ?? -0.25;
  const armR = K.bone('armR', torso, -d.shX, d.shY, 0, 0, 0, -sp);
  const armL = K.bone('armL', torso, d.shX, d.shY, 0, 0, 0, sp);
  const elbowR = K.bone('elbowR', armR, 0, -d.upper, 0, bd);
  const elbowL = K.bone('elbowL', armL, 0, -d.upper, 0, bd);
  const handR = K.bone('handR', elbowR, 0, -d.fore, 0.01);
  const handL = K.bone('handL', elbowL, 0, -d.fore, 0.01);
  const legR = K.bone('legR', hips, -d.hipX, 0, 0);
  const legL = K.bone('legL', hips, d.hipX, 0, 0);
  const kneeR = K.bone('kneeR', legR, 0, -d.thigh, 0);
  const kneeL = K.bone('kneeL', legL, 0, -d.thigh, 0);
  return { hips, torso, head, armR, armL, elbowR, elbowL, handR, handL, legR, legL, kneeR, kneeL };
}
/** [side sign, arm, elbow, hand, leg, knee] for right (-x) then left (+x) */
function limbs(b: Bip): Array<[number, Part, Part, Part, Part, Part]> {
  return [[-1, b.armR, b.elbowR, b.handR, b.legR, b.kneeR], [1, b.armL, b.elbowL, b.handL, b.legL, b.kneeL]];
}

interface Quad { FL: Part; FR: Part; BL: Part; BR: Part }
function quad(K: Kit, y: number, fz: number, bz: number, fx: number, bx = fx, parent?: Part): Quad {
  const p = parent ?? K.body;
  return { FL: K.bone('legFL', p, fx, y, fz), FR: K.bone('legFR', p, -fx, y, fz), BL: K.bone('legBL', p, bx, y, bz), BR: K.bone('legBR', p, -bx, y, bz) };
}
function quadLegs(Q: Quad): Array<[Part, number, boolean]> {
  return [[Q.FL, 1, true], [Q.FR, -1, true], [Q.BL, 1, false], [Q.BR, -1, false]];
}
/** leg hanging from a pivot at height h: paws, hooves or clawed feet */
function quadLeg(bp: Part, h: number, r: number, col: string, front: boolean, foot: 'paw' | 'hoof' | 'claw', footCol: string, thigh = true) {
  if (front) {
    tube(bp, [[0, 0.03, 0], [0, -h * 0.5, 0.02], [0, -h + 0.05, 0]], [r * 1.3, r, r * 0.85], col, 6);
  } else {
    if (thigh) ball(bp, [0, -h * 0.1, -0.01], r * 1.9, col, [0.8, 1.25, 1.1], {}, 7, 5);
    tube(bp, [[0, 0.02, 0], [0, -h * 0.42, 0.05], [0, -h * 0.74, -0.04], [0, -h + 0.05, 0]], [r * 1.4, r * 1.05, r * 0.9, r * 0.85], col, 6);
  }
  if (foot === 'hoof') {
    bp.add(G.cyl(r * 0.95, r * 1.15, 0.07, 6), 0, -h + 0.035, 0.01, footCol);
  } else {
    ball(bp, [0, -h + r * 0.72, 0.02], r * 1.3, col, [1, 0.6, 1.3], {}, 7, 5);
    if (foot === 'claw') for (const x of [-1, 0, 1]) spike(bp, [x * r * 0.7, -h + r * 0.5, r * 1.2], [x * r * 0.95, -h + 0.006, r * 2.3], r * 0.3, footCol, 4, NO);
  }
}

/**
 * Feathered wing: three stacked scalloped plates (flight feathers / secondaries /
 * coverts) along an arched leading edge. Lies roughly in the local XZ plane,
 * sweeping outward (+x·s) and back (-z), so an rz rotation flaps it.
 */
function featherWing(w: Part, s: number, o: { span: number; col: string; col2: string; tip?: string; n?: number; droop?: number; arch?: number; sec?: number }) {
  const sp = o.span, n = Math.max(3, o.n ?? 6), dr = o.droop ?? 0.18, arch = o.arch ?? 0.14;
  const LE: Array<[number, number]> = [[0, 0], [0.3, -0.05], [0.6, -0.03], [0.86, 0.08], [1.04, 0.22]];
  const lev = (u: number) => {
    for (let i = 1; i < LE.length; i++) if (u <= LE[i][0]) { const [u0, v0] = LE[i - 1], [u1, v1] = LE[i]; return v0 + (v1 - v0) * ((u - u0) / (u1 - u0)); }
    return LE[LE.length - 1][1];
  };
  const chord = (u: number) => 0.14 + 0.46 * Math.pow(Math.max(0, 1.04 - u), 0.85);
  const P3 = (u: number, v: number, lift = 0): V3 => [s * u * sp, sp * (arch * Math.sin(Math.min(u, 1) * PI * 0.85) - v * dr) + lift, -v * sp];
  const layer = (depth: number, col: string, lift: number, tipOut: number) => {
    const pts: V3[] = LE.map(([u, v]) => P3(u, v, lift));
    const us = Array.from({ length: n }, (_, k) => 1.04 - (0.98 * k) / (n - 1));
    us.forEach((u, k) => {
      const out = k === 0 ? tipOut : 0;
      pts.push(P3(u + out * 0.6, lev(u) + chord(u) * depth + out * 0.3, lift));
      if (k < n - 1) { const um = (u + us[k + 1]) / 2; pts.push(P3(um, lev(um) + chord(um) * depth * 0.74, lift)); }
    });
    pts.push(P3(0.0, chord(0.06) * depth * 0.8, lift));
    membrane(w, pts, col, Math.max(0.012, sp * 0.022), P3(0.5, lev(0.5) + chord(0.5) * depth * 0.4, lift));
  };
  layer(1, o.tip ?? o.col2, 0, 0.14);
  layer(0.74, o.col, sp * 0.022, 0.06);
  layer(0.36, o.sec !== undefined ? tone(o.col, 0.1) : o.col2, sp * 0.044, 0);
  tube(w, [P3(0, 0.02, sp * 0.03), P3(0.3, -0.03, sp * 0.03), P3(0.6, -0.01, sp * 0.03)], [sp * 0.07, sp * 0.055, sp * 0.03], o.col, 6);
}

/** bat / dragon wing: arm + finger spars with a scalloped membrane swept back */
function batWing(w: Part, s: number, sp: number, bone: string, mem: string, claw = CLAW, o: Opt = {}, memPart?: Part) {
  const E: V3 = [s * sp * 0.42, sp * 0.24, -sp * 0.02];
  const W: V3 = [s * sp * 0.86, sp * 0.22, -sp * 0.16];
  const F: V3[] = [[s * sp * 1.24, sp * 0.02, -sp * 0.44], [s * sp * 1.0, -sp * 0.06, -sp * 0.74], [s * sp * 0.6, -sp * 0.06, -sp * 0.84]];
  const Bk: V3 = [s * sp * 0.1, -sp * 0.06, -sp * 0.52];
  tube(w, [[0, 0, 0], E, W], [sp * 0.055, sp * 0.042, sp * 0.03], bone, 6);
  for (const f of F) tube(w, [W, f], [sp * 0.026, 0.0], bone, 5);
  spike(w, W, add3(W, [s * sp * 0.03, sp * 0.13, sp * 0.06]), sp * 0.028, claw, 4);
  const sc = (a: V3, b: V3) => lerp3(lerp3(a, b, 0.5), W, 0.26);
  const pts: V3[] = [[0, 0, 0], E, W, F[0], sc(F[0], F[1]), F[1], sc(F[1], F[2]), F[2], sc(F[2], Bk), Bk];
  membrane(memPart ?? w, pts, mem, Math.max(0.01, sp * 0.022), [s * sp * 0.55, sp * 0.06, -sp * 0.42], o);
}

// ---------------------------------------------------------------------------
//  builders
// ---------------------------------------------------------------------------
function chocobo(K: Kit) {
  const { P, S } = K;
  const B = K.look.palette.leather ?? '#d0902a';
  const lite = tone(P, 0.28);
  const hips = K.bone('hips', K.body, 0, 0.56, 0);
  const torso = K.bone('torso', hips, 0, 0.06, 0);
  for (const s of [-1, 1]) {
    const leg = K.bone(s < 0 ? 'legR' : 'legL', hips, s * 0.1, 0, -0.02);
    ball(leg, [0, -0.03, 0], 0.1, P, [0.85, 1.2, 1]);
    tube(leg, [[0, -0.08, 0], [0, -0.3, -0.05]], [0.036, 0.03], B);
    const knee = K.bone(s < 0 ? 'kneeR' : 'kneeL', leg, 0, -0.3, -0.05);
    ball(knee, [0, 0, 0], 0.036, B, [1, 1, 1], {}, 6, 4);
    tube(knee, [[0, 0, 0], [0, -0.235, 0.05]], [0.03, 0.026], B);
    for (const tx of [-0.055, 0, 0.055]) tube(knee, [[0, -0.235, 0.05], [tx, -0.244, 0.17]], [0.024, 0.0], B, 5);
    tube(knee, [[0, -0.235, 0.05], [0, -0.244, -0.04]], [0.02, 0.0], B, 5);
  }
  ball(torso, [0, 0.02, -0.03], 0.26, P, [1, 0.86, 1.22], {}, 10, 8, [-0.18, 0, 0]);
  ball(torso, [0, 0.03, 0.17], 0.16, lite, [1.05, 1.05, 0.8]);
  const tail = K.bone('tail', torso, 0, 0.1, -0.28);
  for (let i = -2; i <= 2; i++) spike(tail, [i * 0.035, 0, 0], [i * 0.1, 0.22 - Math.abs(i) * 0.05, -0.2 + Math.abs(i) * 0.03], 0.06, i % 2 ? S : P, 4, {}, [0, 1, 0.5], 0.45);
  for (const s of [-1, 1]) {
    const w = K.bone(s < 0 ? 'wingR' : 'wingL', torso, s * 0.22, 0.1, 0.02, 0, 0, s * 0.12);
    ball(w, [s * 0.02, -0.04, -0.06], 0.1, P, [0.45, 0.9, 1.3], {}, 7, 5, [0.3, 0, 0]);
    for (let i = 0; i < 3; i++) spike(w, [s * 0.03, -0.05 - i * 0.025, -0.12 + i * 0.02], [s * (0.08 + i * 0.02), -0.12 - i * 0.05, -0.29 + i * 0.05], 0.045, i === 1 ? S : P, 4, {}, [s, 0, 0], 0.4);
  }
  const neck = K.bone('neck', torso, 0, 0.13, 0.19);
  tube(neck, [[0, -0.05, -0.03], [0, 0.1, 0.02], [0, 0.22, 0.05]], [0.1, 0.085, 0.075], P, 7, {}, 2);
  neck.add(G.ico(0.115, 0), 0, 0.0, 0.04, lite, 0, 0, 0, 1.05, 0.85, 1);
  const head = K.bone('head', neck, 0, 0.25, 0.06);
  ball(head, [0, 0.02, 0], 0.125, P, [0.95, 0.95, 1.1], {}, 9, 7);
  spike(head, [0, 0.0, 0.08], [0, -0.035, 0.27], 0.055, B, 6, {}, [0, 1, 0], 0.62);
  const jaw = K.bone('jaw', head, 0, -0.035, 0.07);
  spike(jaw, [0, 0, 0], [0, -0.01, 0.16], 0.04, tone(B, -0.15), 6, {}, [0, 1, 0], 0.5);
  for (const s of [-1, 1]) eyeDot(head, [s * 0.086, 0.05, 0.062], 0.032, [s * 0.75, 0.1, 0.65]);
  for (let i = -1; i <= 1; i++) spike(head, [i * 0.03, 0.11, 0.0], [i * 0.08, 0.3 - Math.abs(i) * 0.06, -0.13], 0.048, i ? S : P, 4, {}, [1, 0, 0], 0.45);
  spike(head, [0, 0.08, 0.06], [0, 0.2, 0.1], 0.035, P, 4, {}, [1, 0, 0], 0.45);
}

function goblin(K: Kit) {
  const { P, S, A, L } = K;
  const skin = P, dk = tone(P, -0.35), lt = tone(P, 0.12);
  const B = biped(K, { hipY: 0.25, hipX: 0.065, thigh: 0.11, headY: 0.23, shX: 0.125, shY: 0.2, upper: 0.1, fore: 0.1, splay: 0.22 });
  for (const [, arm, elbow, hand, leg, knee] of limbs(B)) {
    tube(leg, [[0, 0.01, 0], [0, -0.11, 0.01]], [0.045, 0.038], skin);
    tube(knee, [[0, 0, 0.01], [0, -0.1, 0]], [0.038, 0.034], skin);
    ball(knee, [0, -0.112, 0.03], 0.05, lt, [0.9, 0.55, 1.5], {}, 7, 5);
    ball(arm, [0, -0.005, 0], 0.048, S, [1, 0.9, 1], {}, 6, 4);
    tube(arm, [[0, 0, 0], [0, -0.1, 0]], [0.035, 0.03], skin);
    tube(elbow, [[0, 0, 0], [0, -0.1, 0]], [0.03, 0.027], skin);
    elbow.add(G.cyl(0.035, 0.035, 0.045, 6), 0, -0.07, 0, L);
    ball(hand, [0, -0.01, 0.005], 0.045, skin, [1, 1.1, 1], {}, 7, 5);
  }
  B.hips.add(G.cyl(0.105, 0.135, 0.11, 7), 0, -0.02, 0, S, 0, 0, 0, 1, 1, 0.85);
  B.hips.add(G.cyl(0.11, 0.11, 0.03, 7), 0, 0.03, 0, L, 0, 0, 0, 1, 1, 0.9, NO);
  ball(B.torso, [0, 0.1, 0.02], 0.135, skin, [1, 1, 0.95]);
  B.torso.add(G.cyl(0.108, 0.124, 0.13, 7), 0, 0.155, -0.018, S, 0, 0, 0, 1, 1, 0.85);
  const h = B.head;
  ball(h, [0, 0.12, 0], 0.155, skin, [1.12, 0.92, 1], {}, 9, 7);
  h.add(G.box(0.21, 0.035, 0.06), 0, 0.165, 0.112, dk, 0.25, 0, 0);
  for (const s of [-1, 1]) {
    ball(h, [s * 0.058, 0.128, 0.13], 0.032, VOID, [1.25, 0.9, 0.5], NO, 6, 4);
    K.glowEye(h, [s * 0.058, 0.128, 0.142], 0.019, [s * 0.3, 0, 1], vivid(A, '#ffe040'));
    spike(h, [s * 0.15, 0.13, -0.01], [s * 0.37, 0.21, -0.06], 0.056, skin, 4, {}, [0, 0.2, 1], 0.35);
    spike(h, [s * 0.165, 0.132, 0.004], [s * 0.33, 0.2, -0.04], 0.03, tone(P, -0.15), 4, NO, [0, 0.2, 1], 0.3);
  }
  spike(h, [0, 0.12, 0.13], [0, 0.06, 0.25], 0.036, lt, 5);
  h.add(G.box(0.11, 0.022, 0.02), 0, 0.055, 0.14, MOUTH, 0, 0, 0, 1, 1, 1, NO);
  const jaw = K.bone('jaw', h, 0, 0.05, 0.09);
  jaw.add(G.box(0.12, 0.035, 0.06), 0, -0.015, 0.012, skin);
  for (const s of [-1, 1]) spike(jaw, [s * 0.04, 0.0, 0.035], [s * 0.042, 0.045, 0.04], 0.012, IVORY, 4, NO);
  for (let i = -1; i <= 1; i++) spike(h, [i * 0.04, 0.22, -0.02], [i * 0.07, 0.31, -0.08], 0.025, dk, 4);
  // spiked club
  const wood = '#7a5230';
  tube(B.handR, [[0, -0.03, -0.07], [0, 0.03, 0.12], [0, 0.09, 0.34]], [0.022, 0.035, 0.068], wood, 6);
  for (const [x, y, z] of [[0.06, 0.08, 0.28], [-0.06, 0.07, 0.25], [0, 0.14, 0.3]] as V3[]) spike(B.handR, [x * 0.5, 0.075 + (y - 0.075) * 0.5, z], [x, y, z], 0.012, '#b0b0b8', 4, NO);
}

function bomb(K: Kit) {
  const { P, S, A } = K;
  const bob = K.float(HOVER.bomb!);
  const head = K.bone('head', bob, 0, 0.28, 0);
  ball(head, [0, 0, 0], 0.28, P, [1, 1, 1], {}, 12, 9);
  ball(head, [0, -0.1, 0.0], 0.24, tone(P, -0.12), [1.08, 0.7, 1.08], NO, 10, 5);
  const eyeC = vivid(A, '#fff4c0') === A ? A : '#fff6d0';
  for (const s of [-1, 1]) {
    head.add(G.sph(0.058, 7, 5), s * 0.1, 0.06, 0.245, eyeC, 0, s * 0.35, s * 0.4, 1.15, 0.72, 0.45, NO);
    K.glowBall(head, [s * 0.1, 0.06, 0.25], 0.05, eyeC, [1.1, 0.65, 0.45], 1.6);
    ball(head, [s * 0.092, 0.052, 0.283], 0.022, DARK, [1, 1, 0.5], NO, 5, 4);
    head.add(G.box(0.13, 0.036, 0.04), s * 0.1, 0.135, 0.235, tone(P, -0.55), -0.35, 0, s * 0.42);
  }
  ball(head, [0, -0.08, 0.215], 0.13, MOUTH, [1.15, 0.5, 0.4], NO, 8, 5);
  for (let i = -2; i <= 2; i++) spike(head, [i * 0.045, -0.045, 0.262 - Math.abs(i) * 0.02], [i * 0.045, -0.095, 0.27 - Math.abs(i) * 0.02], 0.02, IVORY, 4, NO);
  const jaw = K.bone('jaw', head, 0, -0.1, 0.17);
  ball(jaw, [0, -0.035, 0.035], 0.12, P, [1.15, 0.42, 0.6], {}, 8, 5);
  for (let i = -1; i <= 1; i++) spike(jaw, [i * 0.05, -0.02, 0.085 - Math.abs(i) * 0.015], [i * 0.05, 0.02, 0.085 - Math.abs(i) * 0.015], 0.018, IVORY, 4, NO);
  // flame crown (two flickering layers)
  const outer = K.node(head, 0, 0.1, -0.04), inner = K.node(head, 0, 0.1, -0.04);
  const flame = (bp: Part, col: string, r0: number, rr: number, hh: number, n: number, k: number) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + 0.3;
      const back = (1 - Math.cos(a)) / 2;
      const b: V3 = [Math.sin(a) * r0, 0.08 + 0.02 * back, Math.cos(a) * r0 * 0.85 - 0.02];
      spike(K.gp(bp, col, k), b, add3(b, [Math.sin(a) * 0.05, hh * (0.7 + 0.6 * back), -0.06 - 0.1 * back]), rr, col, 5, GL);
    }
    spike(K.gp(bp, col, k), [0, 0.12, -0.04], [0, 0.12 + hh * 1.5, -0.14], rr * 1.35, col, 5, GL);
  };
  flame(outer, S, 0.17, 0.075, 0.2, 7, 2.2);
  flame(inner, A, 0.1, 0.05, 0.14, 5, 2.8);
  K.wiggle(outer, { s: 0.09, rz: 0.06 }, 2.3);
  K.wiggle(inner, { s: 0.14, rx: 0.08 }, 3.1, 1.3);
}

function catHead(K: Kit, head: Part, o: { col: string; lite: string; eye: string; fang: number; snout?: number; ears?: number; dark: string }) {
  const sn = o.snout ?? 0;
  ball(head, [0, 0.01, 0], 0.105, o.col, [1.12, 0.88, 1.05], {}, 9, 7);
  if (sn > 0) tube(head, [[0, -0.02, 0.05], [0, -0.035, 0.12 + sn]], [0.058, 0.04], o.col, 6);
  ball(head, [0, -0.035, 0.09 + sn], 0.058, o.lite, [1.15, 0.78, 1]);
  ball(head, [0, -0.012, 0.142 + sn], 0.022, DARK, [1.3, 0.8, 0.8], NO, 6, 4);
  for (const s of [-1, 1]) {
    const eh = o.ears ?? 0.1;
    spike(head, [s * 0.062, 0.06, -0.015], [s * 0.1, 0.06 + eh, -0.035], 0.042, o.col, 4, {}, [0, 0, 1], 0.45);
    spike(head, [s * 0.064, 0.065, -0.005], [s * 0.094, 0.05 + eh * 0.85, -0.022], 0.024, o.dark, 4, NO, [0, 0, 1], 0.4);
    K.glowEye(head, [s * 0.05, 0.028, 0.088], 0.022, [s * 0.35, 0.1, 1], o.eye, 2.4, [1.2, 0.6, 0.8]);
    head.add(G.box(0.055, 0.016, 0.03), s * 0.05, 0.058, 0.088, o.dark, 0, 0, s * 0.35, 1, 1, 1, NO);
    if (o.fang > 0) spike(head, [s * 0.026, -0.052, 0.112 + sn], [s * 0.03, -0.052 - o.fang, 0.118 + sn], 0.012, IVORY, 4);
  }
  const jaw = K.bone('jaw', head, 0, -0.05, 0.035);
  ball(jaw, [0, -0.01, 0.055 + sn * 0.8], 0.05, o.lite, [1.05, 0.5, 1.25 + sn * 3], {}, 7, 4);
  return jaw;
}

function panther(K: Kit) {
  const { P, S, A } = K;
  const lite = tone(P, 0.25);
  const Q = quad(K, 0.36, 0.19, -0.21, 0.085);
  ball(K.body, [0, 0.43, 0.16], 0.155, P, [1, 1.05, 1.15], {}, 9, 7);
  ball(K.body, [0, 0.42, -0.2], 0.14, P, [1, 1, 1.15], {}, 9, 7);
  tube(K.body, [[0, 0.42, -0.2], [0, 0.4, -0.02], [0, 0.43, 0.16]], [0.125, 0.11, 0.13], P, 8);
  for (const [x, z] of [[0.05, 0.12], [-0.06, 0.02], [0.07, -0.08], [-0.05, -0.2], [0.02, -0.28], [-0.03, 0.2], [0.1, -0.2]]) {
    const y = 0.42 + Math.sqrt(Math.max(0, 0.021 - x * x)) + (Math.abs(z) < 0.1 ? -0.02 : 0);
    ball(K.body, [x, y, z], 0.032, S, [1.1, 0.35, 1.3], NO, 5, 3);
  }
  for (const [bp, , front] of quadLegs(Q)) quadLeg(bp, 0.36, 0.037, P, front, 'paw', lite);
  const neck = K.bone('neck', K.body, 0, 0.47, 0.27);
  tube(neck, [[0, -0.05, -0.05], [0, 0.05, 0.04], [0, 0.1, 0.08]], [0.095, 0.08, 0.07], P, 7);
  const head = K.bone('head', neck, 0, 0.12, 0.1);
  catHead(K, head, { col: P, lite, eye: vivid(A, '#e8ff70'), fang: 0.03 + Math.max(0, K.sc - 1) * 1.1, dark: S });
  const tail = K.bone('tail', K.body, 0, 0.45, -0.31);
  tube(tail, [[0, 0, 0], [0, 0.0, -0.12], [0, 0.08, -0.25], [0, 0.22, -0.31], [0, 0.31, -0.26]], [0.034, 0.03, 0.026, 0.022, 0.016], P, 6, {}, 2);
  ball(tail, [0, 0.31, -0.26], 0.028, S, [1, 1.2, 1], {}, 6, 4);
}

function wolf(K: Kit) {
  const { P, S, A } = K;
  const lite = tone(P, 0.3);
  const Q = quad(K, 0.38, 0.18, -0.2, 0.085);
  ball(K.body, [0, 0.46, 0.15], 0.17, P, [0.95, 1.1, 1.15], {}, 9, 7);
  ball(K.body, [0, 0.44, -0.19], 0.13, P, [1, 1, 1.2], {}, 9, 7);
  tube(K.body, [[0, 0.44, -0.19], [0, 0.42, 0.0], [0, 0.45, 0.15]], [0.115, 0.1, 0.13], P, 8);
  ball(K.body, [0, 0.38, 0.18], 0.12, lite, [1, 1, 0.9], NO);
  for (const [bp, , front] of quadLegs(Q)) quadLeg(bp, 0.38, 0.036, P, front, 'paw', lite);
  const neck = K.bone('neck', K.body, 0, 0.5, 0.27);
  tube(neck, [[0, -0.06, -0.06], [0, 0.04, 0.03], [0, 0.09, 0.08]], [0.1, 0.085, 0.07], P, 7);
  for (let i = 0; i < 7; i++) {
    const a = -1.2 + (i / 6) * 2.4;
    const b: V3 = [Math.sin(a) * 0.09, 0.02 + Math.cos(a) * 0.07, -0.02];
    spike(neck, b, add3(b, [Math.sin(a) * 0.08, Math.cos(a) * 0.04 - 0.02, -0.12]), 0.045, i % 2 ? S : P, 4);
  }
  const head = K.bone('head', neck, 0, 0.12, 0.1);
  catHead(K, head, { col: P, lite, eye: vivid(A, '#ffd040'), fang: 0.025, snout: 0.08, ears: 0.13, dark: S });
  const tail = K.bone('tail', K.body, 0, 0.47, -0.3);
  tube(tail, [[0, 0, 0], [0, -0.03, -0.1], [0, -0.1, -0.2], [0, -0.2, -0.25], [0, -0.28, -0.26]], [0.035, 0.065, 0.07, 0.05, 0.004], P, 7, {}, 2);
  tube(tail, [[0, -0.2, -0.25], [0, -0.28, -0.26], [0, -0.33, -0.25]], [0.05, 0.035, 0.0], S, 6);
}

function boar(K: Kit) {
  const { P, S, A } = K;
  const Q = quad(K, 0.23, 0.17, -0.18, 0.12);
  ball(K.body, [0, 0.37, -0.02], 0.26, P, [1, 0.92, 1.32], {}, 10, 8);
  for (let i = 0; i < 7; i++) {
    const z = 0.2 - i * 0.07;
    const y = 0.37 + 0.24 * Math.sqrt(Math.max(0, 1 - Math.pow(z / 0.34, 2)));
    spike(K.body, [0, y - 0.02, z], [0, y + 0.07, z - 0.07], 0.035, S, 4, {}, [1, 0, 0], 0.5);
  }
  for (const [bp, , front] of quadLegs(Q)) quadLeg(bp, 0.23, 0.048, P, front, 'hoof', DARK, false);
  const neck = K.bone('neck', K.body, 0, 0.38, 0.27);
  ball(neck, [0, 0, 0], 0.15, P, [1, 0.95, 0.9]);
  const head = K.bone('head', neck, 0, -0.01, 0.08);
  ball(head, [0, 0, 0.02], 0.15, P, [1, 0.92, 1.1], {}, 9, 7);
  const snoutC = mix(P, '#e08880', 0.35);
  tube(head, [[0, -0.03, 0.1], [0, -0.05, 0.22]], [0.075, 0.066], P, 7);
  head.add(G.cyl(0.064, 0.064, 0.03, 8), 0, -0.05, 0.232, snoutC, PI / 2 + 0.15, 0, 0);
  for (const s of [-1, 1]) {
    head.add(G.box(0.016, 0.026, 0.01), s * 0.022, -0.05, 0.25, DARK, 0.15, 0, 0, 1, 1, 1, NO);
    spike(head, [s * 0.08, 0.09, -0.02], [s * 0.17, 0.2, -0.06], 0.05, P, 4, {}, [0, 0.2, 1], 0.35);
    eyeDot(head, [s * 0.076, 0.05, 0.11], 0.022, [s * 0.5, 0.1, 0.85]);
    head.add(G.box(0.05, 0.015, 0.03), s * 0.076, 0.078, 0.11, tone(P, -0.4), 0, 0, s * 0.3, 1, 1, 1, NO);
  }
  const jaw = K.bone('jaw', head, 0, -0.08, 0.08);
  ball(jaw, [0, -0.012, 0.06], 0.075, P, [1, 0.5, 1.25], {}, 7, 5);
  for (const s of [-1, 1]) tube(jaw, [[s * 0.05, 0, 0.1], [s * 0.085, 0.05, 0.15], [s * 0.078, 0.12, 0.14]], [0.022, 0.016, 0.0], A, 5, {}, 2);
  const tail = K.bone('tail', K.body, 0, 0.44, -0.35);
  tube(tail, [[0, 0, 0], [0, 0.03, -0.05], [0.03, 0.06, -0.04], [0.02, 0.04, -0.01], [0.0, 0.05, -0.03]], [0.018, 0.016, 0.014, 0.012, 0.0], P, 5, {}, 2);
}

function bull(K: Kit) {
  const { P, S, A, M } = K;
  const lite = tone(P, 0.2);
  const Q = quad(K, 0.4, 0.21, -0.23, 0.12, 0.11);
  ball(K.body, [0, 0.52, 0.13], 0.24, P, [1, 1.05, 1.1], {}, 10, 8);
  ball(K.body, [0, 0.5, -0.23], 0.2, P, [1, 1, 1.15], {}, 9, 7);
  tube(K.body, [[0, 0.5, -0.23], [0, 0.48, -0.04], [0, 0.52, 0.13]], [0.19, 0.18, 0.21], P, 8);
  ball(K.body, [0, 0.68, 0.1], 0.14, tone(P, -0.12), [1, 0.8, 1.2]);
  for (const [bp, , front] of quadLegs(Q)) quadLeg(bp, 0.4, 0.052, P, front, 'hoof', DARK);
  const neck = K.bone('neck', K.body, 0, 0.58, 0.32);
  ball(neck, [0, 0, 0], 0.15, P, [1, 1, 1]);
  const head = K.bone('head', neck, 0, -0.01, 0.1);
  ball(head, [0, 0.02, 0.02], 0.14, P, [1.05, 1, 1.12], {}, 9, 7);
  ball(head, [0, -0.07, 0.13], 0.095, lite, [1.1, 0.78, 1]);
  head.add(G.torus(0.035, 0.009, 4, 10), 0, -0.1, 0.215, M, 0.2, 0, 0, 1, 1, 1, NO);
  for (const s of [-1, 1]) {
    head.add(G.box(0.02, 0.02, 0.01), s * 0.03, -0.06, 0.218, DARK, 0, 0, 0, 1, 1, 1, NO);
    tube(head, [[s * 0.1, 0.09, 0.0], [s * 0.21, 0.1, 0.0], [s * 0.29, 0.18, 0.04], [s * 0.29, 0.28, 0.1]], [0.042, 0.035, 0.025, 0.0], A, 6, {}, 2);
    spike(head, [s * 0.12, 0.04, -0.03], [s * 0.21, 0.02, -0.06], 0.04, P, 4, {}, [0, 1, 0], 0.4);
    K.glowEye(head, [s * 0.075, 0.05, 0.12], 0.02, [s * 0.5, 0, 1], '#ff5a30', 2.2);
  }
  head.add(G.box(0.2, 0.03, 0.05), 0, 0.09, 0.11, tone(P, -0.4), 0.3, 0, 0);
  const jaw = K.bone('jaw', head, 0, -0.1, 0.08);
  ball(jaw, [0, -0.02, 0.05], 0.07, lite, [1.05, 0.5, 1.15], {}, 7, 4);
  const tail = K.bone('tail', K.body, 0, 0.6, -0.4);
  tube(tail, [[0, 0, 0], [0, -0.12, -0.06], [0, -0.3, -0.07]], [0.02, 0.016, 0.014], P, 5);
  ball(tail, [0, -0.33, -0.07], 0.035, S, [1, 1.6, 1], {}, 6, 4);
}

function behemoth(K: Kit) {
  const { P, S, A } = K;
  const lite = tone(P, 0.15);
  const horn = vivid(A, '') === '' ? A : mix(A, IVORY, 0.4);
  const eye = vivid(A, '#ffd24a');
  const Q = quad(K, 0.42, 0.25, -0.27, 0.15, 0.14);
  ball(K.body, [0, 0.56, 0.16], 0.3, P, [1, 1, 1.05], {}, 10, 8);
  ball(K.body, [0, 0.52, -0.26], 0.24, P, [1, 1, 1.1], {}, 9, 7);
  tube(K.body, [[0, 0.52, -0.26], [0, 0.5, -0.05], [0, 0.56, 0.16]], [0.22, 0.2, 0.26], P, 8);
  for (let i = 0; i < 6; i++) {
    const z = 0.1 - i * 0.09;
    const y = 0.8 - i * 0.02 - (i > 3 ? 0.03 : 0);
    spike(K.body, [0, y - 0.05, z], [0, y + 0.07 - i * 0.008, z - 0.1], 0.05, S, 4, {}, [1, 0, 0], 0.5);
  }
  for (const [bp, , front] of quadLegs(Q)) quadLeg(bp, 0.42, 0.068, P, front, 'claw', CLAW);
  const neck = K.bone('neck', K.body, 0, 0.62, 0.4);
  ball(neck, [0, 0, -0.02], 0.18, P);
  // mane
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    const b: V3 = [Math.sin(a) * 0.14, 0.02 + Math.cos(a) * 0.13, -0.02];
    spike(neck, b, add3(b, [Math.sin(a) * 0.1, Math.cos(a) * 0.08 + 0.02, -0.18]), 0.07, i % 2 ? S : tone(S, 0.12), 4);
  }
  const head = K.bone('head', neck, 0, 0.0, 0.12);
  ball(head, [0, 0.02, 0.02], 0.16, P, [1.1, 0.9, 1.1], {}, 9, 7);
  ball(head, [0, -0.05, 0.14], 0.11, lite, [1.1, 0.75, 1]);
  head.add(G.box(0.05, 0.03, 0.03), 0, -0.03, 0.25, DARK, 0, 0, 0, 1, 1, 1, NO);
  head.add(G.box(0.26, 0.04, 0.07), 0, 0.1, 0.12, tone(P, -0.35), 0.3, 0, 0);
  for (const s of [-1, 1]) {
    K.glowEye(head, [s * 0.075, 0.06, 0.14], 0.024, [s * 0.4, 0, 1], eye, 2.6, [1.3, 0.6, 0.8]);
    tube(head, [[s * 0.1, 0.1, -0.02], [s * 0.2, 0.2, -0.12], [s * 0.3, 0.2, -0.26], [s * 0.34, 0.06, -0.3], [s * 0.33, -0.06, -0.2], [s * 0.3, -0.05, -0.07]], [0.058, 0.05, 0.042, 0.032, 0.02, 0.0], horn, 7, {}, 2);
    spike(head, [s * 0.05, -0.08, 0.2], [s * 0.05, -0.15, 0.21], 0.018, IVORY, 4);
  }
  const jaw = K.bone('jaw', head, 0, -0.1, 0.06);
  ball(jaw, [0, -0.02, 0.1], 0.09, lite, [1.1, 0.5, 1.25], {}, 7, 5);
  for (const s of [-1, 1]) spike(jaw, [s * 0.06, 0.0, 0.16], [s * 0.065, 0.06, 0.17], 0.018, IVORY, 4);
  const tail = K.bone('tail', K.body, 0, 0.6, -0.46);
  tube(tail, [[0, 0, 0], [0, -0.05, -0.15], [0.02, -0.18, -0.26], [0.04, -0.34, -0.3]], [0.05, 0.04, 0.03, 0.025], P, 6, {}, 2);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2;
    spike(tail, [0.04, -0.33, -0.3], [0.04 + Math.sin(a) * 0.06, -0.44, -0.3 + Math.cos(a) * 0.06], 0.035, S, 4);
  }
}

function dragonHead(K: Kit, head: Part, jaw: Part, o: { col: string; belly: string; horn: string; eye: string; frill?: string; scale?: number }) {
  const c = o.col;
  ball(head, [0, 0.02, 0], 0.1, c, [1.05, 0.85, 1.1], {}, 8, 6);
  tube(head, [[0, 0.0, 0.05], [0, -0.015, 0.23]], [0.075, 0.052], c, 6);
  head.add(G.box(0.17, 0.035, 0.06), 0, 0.075, 0.07, tone(c, -0.3), 0.3, 0, 0);
  for (const s of [-1, 1]) {
    K.glowEye(head, [s * 0.058, 0.045, 0.085], 0.02, [s * 0.5, 0.1, 1], o.eye, 2.6, [1.3, 0.6, 0.8]);
    head.add(G.box(0.012, 0.012, 0.01), s * 0.026, 0.012, 0.235, DARK, 0, 0, 0, 1, 1, 1, NO);
    tube(head, [[s * 0.05, 0.06, -0.03], [s * 0.09, 0.13, -0.14], [s * 0.1, 0.17, -0.27]], [0.028, 0.02, 0.0], o.horn, 5, {}, 2);
    if (o.frill) for (let i = 0; i < 3; i++) spike(head, [s * 0.08, 0.0 - i * 0.04, -0.04], [s * 0.18, 0.02 - i * 0.07, -0.12], 0.035, o.frill, 4, {}, [0, 0, 1], 0.4);
    for (let i = 0; i < 3; i++) spike(head, [s * 0.04, -0.035, 0.1 + i * 0.045], [s * 0.042, -0.07, 0.1 + i * 0.045], 0.012, IVORY, 3, NO);
  }
  tube(jaw, [[0, 0, 0], [0, -0.02, 0.19]], [0.052, 0.036], o.belly, 6);
  for (const s of [-1, 1]) spike(jaw, [s * 0.03, 0.0, 0.16], [s * 0.032, 0.04, 0.165], 0.012, IVORY, 3, NO);
}

function dragon(K: Kit) {
  const { P, S, A } = K;
  const horn = mix(A, IVORY, 0.3);
  const eye = vivid(A, '#ffd23a');
  const Q = quad(K, 0.4, 0.2, -0.22, 0.13);
  ball(K.body, [0, 0.5, 0.14], 0.22, P, [1, 1.05, 1.15], {}, 10, 8);
  ball(K.body, [0, 0.48, -0.2], 0.2, P, [1, 1, 1.15], {}, 9, 7);
  tube(K.body, [[0, 0.48, -0.2], [0, 0.46, -0.03], [0, 0.5, 0.14]], [0.18, 0.17, 0.2], P, 8);
  tube(K.body, [[0, 0.42, -0.22], [0, 0.4, -0.03], [0, 0.43, 0.18]], [0.16, 0.155, 0.17], S, 8, NO);
  for (let i = 0; i < 6; i++) {
    const z = 0.22 - i * 0.09;
    const y = 0.7 - Math.abs(z - 0.0) * 0.12;
    spike(K.body, [0, y - 0.04, z], [0, y + 0.07, z - 0.06], 0.04, A, 4, {}, [1, 0, 0], 0.45);
  }
  for (const [bp, , front] of quadLegs(Q)) quadLeg(bp, 0.4, 0.055, P, front, 'claw', CLAW);
  const neck = K.bone('neck', K.body, 0, 0.58, 0.28);
  tube(neck, [[0, -0.08, -0.08], [0, 0.1, 0.04], [0, 0.24, 0.08], [0, 0.36, 0.14]], [0.11, 0.09, 0.078, 0.07], P, 7, {}, 2);
  for (let i = 0; i < 3; i++) spike(neck, [0, 0.1 + i * 0.11, 0.0 + i * 0.04], [0, 0.14 + i * 0.11, -0.08 + i * 0.04], 0.03, A, 4, {}, [1, 0, 0], 0.45);
  const head = K.bone('head', neck, 0, 0.38, 0.17);
  const jaw = K.bone('jaw', head, 0, -0.05, 0.03);
  dragonHead(K, head, jaw, { col: P, belly: S, horn, eye });
  for (const s of [-1, 1]) {
    const w = K.bone(s < 0 ? 'wingR' : 'wingL', K.body, s * 0.12, 0.66, 0.12, 0, 0, s * 0.3);
    batWing(w, s, 0.62, P, tone(S, -0.1), CLAW);
  }
  const tail = K.bone('tail', K.body, 0, 0.5, -0.36);
  tube(tail, [[0, 0, 0], [0, -0.04, -0.18], [0, -0.14, -0.34], [0.06, -0.26, -0.48], [0.14, -0.32, -0.58]], [0.12, 0.085, 0.055, 0.032, 0.014], P, 7, {}, 2);
  membrane(tail, [[0.1, -0.31, -0.54], [0.2, -0.3, -0.58], [0.24, -0.33, -0.7], [0.15, -0.34, -0.66], [0.08, -0.34, -0.62]], A, 0.02, [0.15, -0.32, -0.61]);
  for (let i = 0; i < 3; i++) {
    const p = [[0, 0.1, -0.1], [0, 0.03, -0.26], [0.03, -0.1, -0.41]][i] as V3;
    spike(tail, p, add3(p, [0, 0.06, -0.06]), 0.03, A, 4, {}, [1, 0, 0], 0.45);
  }
}

function hydra(K: Kit) {
  const { P, S, A } = K;
  const eye = vivid(A, '#ffe040');
  const n = Math.max(2, Math.min(3, Math.round(K.v || 2)));
  const Q = quad(K, 0.3, 0.2, -0.22, 0.16);
  ball(K.body, [0, 0.42, 0.14], 0.25, P, [1, 0.95, 1.1], {}, 10, 8);
  ball(K.body, [0, 0.4, -0.2], 0.24, P, [1, 0.95, 1.15], {}, 10, 8);
  tube(K.body, [[0, 0.34, -0.2], [0, 0.32, -0.02], [0, 0.35, 0.16]], [0.2, 0.2, 0.2], S, 8, NO);
  for (let i = 0; i < 5; i++) {
    const z = 0.18 - i * 0.1;
    spike(K.body, [0, 0.62, z], [0, 0.72, z - 0.07], 0.045, A, 4, {}, [1, 0, 0], 0.4);
  }
  for (const [bp, , front] of quadLegs(Q)) quadLeg(bp, 0.3, 0.062, P, front, 'claw', CLAW);
  const neck = K.bone('neck', K.body, 0, 0.5, 0.32);
  const xs = n === 3 ? [0, -0.15, 0.15] : [-0.11, 0.11];
  let mainHead: Part | null = null, mainJaw: Part | null = null;
  xs.forEach((x, i) => {
    const up = x === 0 ? 0.08 : 0;
    const pts: V3[] = [[x * 0.5, -0.06, -0.06], [x * 1.3, 0.14 + up, 0.04], [x * 2.0, 0.3 + up, 0.02], [x * 2.3, 0.44 + up, 0.1]];
    tube(neck, pts, [0.09, 0.075, 0.066, 0.06], P, 7, {}, 2);
    spike(neck, lerp3(pts[1], pts[2], 0.5), add3(lerp3(pts[1], pts[2], 0.5), [0, 0.02, -0.1]), 0.03, A, 4, {}, [1, 0, 0], 0.4);
    const tip = add3(pts[3], [0, 0.02, 0.05]);
    let head: Part, jaw: Part;
    if (i === 0) {
      const sway = K.node(neck, tip[0], tip[1], tip[2]);
      K.wiggle(sway, { ry: 0.08, rx: 0.04 }, 0.23);
      head = mainHead = K.bone('head', sway, 0, 0, 0, 0, x * 1.4, 0);
      jaw = mainJaw = K.bone('jaw', head, 0, -0.05, 0.03);
    } else {
      head = K.node(neck, tip[0], tip[1], tip[2], 0, x * 1.8, 0);
      K.follow(head, mainHead!.obj, 1, 1, 1);
      K.wiggle(head, { ry: 0.1, rx: 0.05 }, 0.19 + i * 0.05, i * 2.1);
      jaw = K.node(head, 0, -0.05, 0.03);
      K.follow(jaw, mainJaw!.obj);
    }
    dragonHead(K, head, jaw, { col: P, belly: S, horn: tone(A, -0.1), eye, frill: A });
  });
  const tail = K.bone('tail', K.body, 0, 0.42, -0.4);
  tube(tail, [[0, 0, 0], [0, -0.06, -0.16], [0.02, -0.18, -0.3], [0.08, -0.3, -0.4]], [0.14, 0.09, 0.05, 0.01], P, 7, {}, 2);
}

function bird(K: Kit) {
  const { P, S, A } = K;
  const dark = tone(P, -0.25);
  const hips = K.bone('hips', K.body, 0, 0.38, 0);
  const torso = K.bone('torso', hips, 0, 0.02, 0);
  for (const s of [-1, 1]) {
    const leg = K.bone(s < 0 ? 'legR' : 'legL', hips, s * 0.075, 0, 0.02);
    ball(leg, [0, -0.04, 0], 0.075, P, [0.9, 1.3, 1], {}, 7, 5);
    tube(leg, [[0, -0.08, 0], [0, -0.18, -0.02]], [0.028, 0.024], A);
    const knee = K.bone(s < 0 ? 'kneeR' : 'kneeL', leg, 0, -0.18, -0.02);
    tube(knee, [[0, 0, 0], [0, -0.165, 0.03]], [0.024, 0.021], A);
    for (const tx of [-0.04, 0, 0.04]) {
      tube(knee, [[0, -0.165, 0.03], [tx, -0.175, 0.1]], [0.018, 0.012], A, 5);
      spike(knee, [tx, -0.175, 0.1], [tx * 1.1, -0.19, 0.135], 0.012, DARK, 4, NO);
    }
    tube(knee, [[0, -0.165, 0.03], [0, -0.18, -0.03]], [0.016, 0.0], DARK, 4);
  }
  ball(torso, [0, 0.14, 0], 0.19, P, [0.95, 1.25, 0.95], {}, 9, 7, [0.45, 0, 0]);
  ball(torso, [0, 0.14, 0.09], 0.14, S, [0.9, 1.2, 0.7], NO, 8, 6, [0.45, 0, 0]);
  const tail = K.bone('tail', torso, 0, 0.02, -0.13);
  for (let i = -2; i <= 2; i++) spike(tail, [i * 0.02, 0, 0], [i * 0.07, -0.14, -0.26], 0.05, i % 2 ? dark : P, 4, {}, [0, 1, 0.3], 0.3);
  for (const s of [-1, 1]) {
    const w = K.bone(s < 0 ? 'wingR' : 'wingL', torso, s * 0.12, 0.22, -0.03, 0, 0, s * 0.35);
    featherWing(w, s, { span: 0.62, col: P, col2: dark, n: 5, sec: 4 });
  }
  const neck = K.bone('neck', torso, 0, 0.28, 0.1);
  ball(neck, [0, 0, 0], 0.09, P, [1, 1.1, 1], {}, 7, 5);
  const head = K.bone('head', neck, 0, 0.07, 0.03);
  ball(head, [0, 0.02, 0], 0.095, S, [0.95, 0.95, 1.1], {}, 8, 6);
  tube(head, [[0, 0.03, 0.06], [0, 0.02, 0.15], [0, -0.035, 0.19]], [0.038, 0.024, 0.0], A, 5, {}, 2);
  const jaw = K.bone('jaw', head, 0, -0.015, 0.06);
  spike(jaw, [0, 0, 0], [0, -0.01, 0.075], 0.022, tone(A, -0.25), 5);
  for (const s of [-1, 1]) {
    K.glowEye(head, [s * 0.058, 0.04, 0.066], 0.02, [s * 0.7, 0.1, 0.7], vivid(A, '#ffd040'), 2.2);
    ball(head, [s * 0.062, 0.04, 0.074], 0.009, DARK, [1, 1, 1], NO, 4, 3);
    head.add(G.box(0.055, 0.02, 0.05), s * 0.056, 0.072, 0.062, tone(S, -0.3), 0, s * 0.5, s * 0.35);
  }
  for (let i = -1; i <= 1; i++) spike(head, [i * 0.025, 0.08, -0.02], [i * 0.06, 0.16 - Math.abs(i) * 0.03, -0.16], 0.035, i ? dark : S, 4, {}, [1, 0, 0], 0.45);
}

function squid(K: Kit) {
  const { P, S, A } = K;
  const lite = tone(P, 0.15);
  const head = K.bone('head', K.body, 0, 0.4, 0);
  ball(head, [0, 0.19, -0.09], 0.24, P, [1, 1.28, 1.05], {}, 10, 8, [-0.45, 0, 0]);
  ball(head, [0, 0.01, 0.02], 0.19, lite, [1.08, 0.85, 1], {}, 9, 7);
  for (const [x, y, z] of [[0.1, 0.32, -0.1], [-0.12, 0.26, -0.02], [0.0, 0.4, -0.2], [0.16, 0.18, -0.2], [-0.15, 0.36, -0.2], [0.05, 0.2, 0.06]] as V3[]) ball(head, [x, y, z], 0.035, S, [1, 1, 1], NO, 5, 4);
  for (const s of [-1, 1]) {
    ball(head, [s * 0.11, 0.07, 0.12], 0.072, S, [1, 1, 0.9], {}, 8, 6);
    K.glowEye(head, [s * 0.122, 0.07, 0.172], 0.045, [s * 0.4, 0, 1], vivid(A, '#ffcc40'), 1.8, [1, 0.4, 1]);
    head.add(G.box(0.05, 0.013, 0.01), s * 0.125, 0.07, 0.195, DARK, 0, s * 0.4, 0, 1, 1, 1, NO);
    ball(head, [s * 0.11, 0.11, 0.115], 0.078, tone(P, -0.12), [1.08, 0.55, 1.05], {}, 8, 5, [0.45, 0, s * 0.2]);
  }
  const jaw = K.bone('jaw', head, 0, -0.1, 0.12);
  const mind = (K.look.variant ?? 0) > 1 || K.sc >= 1.12;
  if (mind) for (const x of [-0.06, -0.02, 0.02, 0.06]) tube(jaw, [[x, 0, 0], [x * 1.2, -0.08, 0.04], [x * 1.1, -0.16, 0.03], [x * 0.9, -0.21, -0.01]], [0.024, 0.019, 0.013, 0.0], lite, 5, {}, 2);
  else tube(jaw, [[0, 0.02, -0.02], [0, -0.03, 0.03]], [0.035, 0.028], tone(P, -0.2), 6);
  const slots: Array<[BoneName, number]> = [['armL', 22], ['armR', -22], ['legFL', 67], ['legFR', -67], ['legBL', 112], ['legBR', -112], ['tail', 157], ['tail', -157]];
  let tailBone: Part | null = null;
  for (const [name, deg] of slots) {
    const a = (deg * PI) / 180;
    const dx = Math.sin(a), dz = Math.cos(a);
    const base: V3 = [dx * 0.1, 0.36, dz * 0.1];
    let bp: Part;
    if (name === 'tail') bp = tailBone ??= K.bone('tail', K.body, 0, 0.36, -0.1);
    else bp = K.bone(name, K.body, base[0], base[1], base[2]);
    const off: V3 = name === 'tail' ? [dx * 0.1, 0, dz * 0.1 + 0.1] : [0, 0, 0];
    const wig = K.node(bp, off[0], off[1], off[2]);
    K.wiggle(wig, { rx: 0.08 * dz, rz: -0.08 * dx }, 0.45, deg * 0.05);
    const pt = (r: number, y: number): V3 => [dx * r, y, dz * r];
    tube(wig, [pt(0, 0), pt(0.14, -0.2), pt(0.3, -0.31), pt(0.44, -0.3), pt(0.53, -0.2), pt(0.5, -0.13)], [0.062, 0.048, 0.034, 0.022, 0.012, 0.0], P, 6, {}, 2);
    for (const r of [0.2, 0.3, 0.4]) ball(wig, add3(pt(r, r < 0.25 ? -0.3 : -0.33), [0, 0.02, 0]), 0.014, S, [1, 0.6, 1], NO, 4, 3);
  }
}

function skeleton(K: Kit) {
  const { P, S, A, M, L } = K;
  const bone = P, joint = tone(P, -0.12), rag = S, eye = vivid(A, '#ff4020');
  const B = biped(K, { hipY: 0.42, hipX: 0.07, thigh: 0.19, headY: 0.33, shX: 0.14, shY: 0.29, upper: 0.14, fore: 0.13, splay: 0.18 });
  for (const [s, arm, elbow, hand, leg, knee] of limbs(B)) {
    tube(leg, [[0, -0.01, 0], [0, -0.18, 0]], [0.024, 0.02], bone, 5);
    ball(leg, [0, -0.19, 0], 0.032, joint, [1, 1, 1], {}, 6, 4);
    tube(knee, [[0, -0.01, 0], [0, -0.19, 0.0]], [0.021, 0.018], bone, 5);
    knee.add(G.box(0.06, 0.035, 0.11), 0, -0.21, 0.025, bone);
    ball(arm, [0, 0, 0], 0.034, joint, [1, 1, 1], {}, 6, 4);
    tube(arm, [[0, -0.01, 0], [0, -0.14, 0]], [0.02, 0.017], bone, 5);
    ball(elbow, [0, 0, 0], 0.025, joint, [1, 1, 1], {}, 5, 4);
    tube(elbow, [[0, 0, 0], [0, -0.12, 0]], [0.017, 0.015], bone, 5);
    hand.add(G.box(0.04, 0.05, 0.03), 0, -0.01, 0, bone);
    void s;
  }
  ball(B.hips, [0, 0, 0], 0.075, bone, [1.3, 0.6, 0.9], {}, 7, 5);
  B.hips.add(G.box(0.13, 0.15, 0.015), 0, -0.07, 0.065, rag, 0.12, 0, 0);
  B.hips.add(G.box(0.15, 0.13, 0.015), 0, -0.06, -0.065, rag, -0.12, 0, 0);
  B.hips.add(G.cyl(0.1, 0.1, 0.025, 7), 0, 0.03, 0, L, 0, 0, 0, 1, 1, 0.75, NO);
  tube(B.torso, [[0, 0, -0.02], [0, 0.1, -0.035], [0, 0.3, -0.02]], [0.02, 0.022, 0.02], joint, 5);
  const ribs: Array<[number, number]> = [[0.26, 0.1], [0.205, 0.106], [0.15, 0.096], [0.1, 0.078]];
  for (const [y, r] of ribs) B.torso.add(G.torus(r, 0.015, 3, 10), 0, y, 0.0, bone, PI / 2, 0, 0, 1, 0.75, 1);
  B.torso.add(G.box(0.03, 0.17, 0.02), 0, 0.19, 0.074, bone);
  tube(B.torso, [[-0.14, 0.29, 0], [0.14, 0.29, 0]], [0.018, 0.018], bone, 5);
  const h = B.head;
  tube(h, [[0, -0.04, 0], [0, 0.05, 0]], [0.018, 0.018], joint, 5);
  ball(h, [0, 0.14, -0.01], 0.125, bone, [1, 0.95, 1.05], {}, 9, 7);
  ball(h, [0, 0.07, 0.05], 0.08, bone, [1.05, 0.7, 0.9], {}, 8, 5);
  for (const s of [-1, 1]) {
    ball(h, [s * 0.047, 0.125, 0.1], 0.036, VOID, [1, 1.1, 0.6], NO, 6, 4);
    K.glowBall(h, [s * 0.047, 0.123, 0.112], 0.016, eye, [1, 1, 1], 3, 5, 4);
  }
  h.add(G.cone(0.016, 0.032, 3), 0, 0.085, 0.118, VOID, PI, 0, 0, 1, 1, 0.5, NO);
  h.add(G.box(0.08, 0.02, 0.02), 0, 0.048, 0.1, IVORY, 0, 0, 0, 1, 1, 1, NO);
  const jaw = K.bone('jaw', h, 0, 0.045, 0.02);
  jaw.add(G.box(0.1, 0.03, 0.08), 0, -0.02, 0.04, bone);
  jaw.add(G.box(0.075, 0.015, 0.015), 0, -0.002, 0.075, IVORY, 0, 0, 0, 1, 1, 1, NO);
  const rust = mix(M, '#8a5a3a', 0.35);
  if (K.sc >= 1.04) {
    h.add(G.hemi(0.135, 9, 4), 0, 0.15, -0.01, rust, -0.1, 0, 0, 1, 1, 1.05);
    h.add(G.torus(0.13, 0.014, 4, 12), 0, 0.15, -0.01, tone(rust, -0.2), PI / 2 - 0.1, 0, 0, 1, 1.05, 1, NO);
    if (K.sc >= 1.09) for (const s of [-1, 1]) tube(h, [[s * 0.11, 0.2, -0.01], [s * 0.2, 0.26, -0.02], [s * 0.22, 0.36, 0.0]], [0.028, 0.02, 0.0], IVORY, 5, {}, 2);
    B.armL.add(G.hemi(0.06, 7, 3), 0.01, 0.0, 0, rust, 0, 0, 0.35);
  }
  // rusty sword + battered buckler
  const hR = B.handR;
  tube(hR, [[0, -0.02, -0.06], [0, 0.0, 0.03]], [0.014, 0.014], L, 5);
  slab(hR, [0, 0.0, 0.04], [0, 0.005, 0.055], 0.13, 0.03, rust, [1, 0, 0]);
  const dir = vec([0, 0.28, 1]).normalize();
  const tipP = add3([0, 0.005, 0.05], dir, 0.44);
  slab(hR, [0, 0.005, 0.05], tipP, 0.048, 0.012, rust, [1, 0, 0]);
  spike(hR, tipP, add3(tipP, dir, 0.05), 0.024, rust, 4, {}, [1, 0, 0], 0.3);
  hR.add(G.box(0.014, 0.03, 0.06), 0.008, 0.07, 0.22, tone(rust, -0.25), -0.28, 0, 0, 1, 1, 1, NO);
  B.elbowL.add(G.cyl(0.1, 0.1, 0.02, 8), 0.04, -0.07, 0.02, '#6a4a30', 0, 0, PI / 2);
  B.elbowL.add(G.sph(0.03, 6, 4), 0.055, -0.07, 0.02, rust);
}

function ghost(K: Kit) {
  const { P, S, A } = K;
  const eye = vivid(A, '#e0ff80');
  const bob = K.float(HOVER.ghost!);
  const torso = K.bone('torso', bob, 0, 0.0, 0);
  torso.add(G.cyl(0.13, 0.25, 0.4, 9), 0, 0.22, 0, P);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * PI * 2;
    const b: V3 = [Math.sin(a) * 0.22, 0.05, Math.cos(a) * 0.22];
    spike(torso, b, [Math.sin(a) * 0.27, -0.1 + (i % 2) * 0.05, Math.cos(a) * 0.27], 0.07, i % 2 ? P : tone(P, -0.08), 4, {}, [Math.sin(a), 0, Math.cos(a)], 0.35);
  }
  const tail = K.bone('tail', torso, 0, 0.06, -0.1);
  const wisp = K.node(tail);
  K.wiggle(wisp, { ry: 0.25, rx: 0.08 }, 0.5);
  tube(wisp, [[0, 0.02, 0.02], [0, -0.1, -0.1], [0.04, -0.17, -0.26], [0.1, -0.18, -0.38]], [0.16, 0.1, 0.05, 0.0], P, 7, {}, 2);
  const head = K.bone('head', torso, 0, 0.47, 0);
  ball(head, [0, 0.02, -0.02], 0.19, P, [1, 1.05, 1.05], {}, 9, 7);
  spike(head, [0, 0.12, -0.08], [0, 0.26, -0.28], 0.1, P, 5);
  ball(head, [0, 0.0, 0.11], 0.13, VOID, [1, 1.1, 0.55], NO, 8, 6);
  head.add(G.torus(0.13, 0.03, 4, 10), 0, 0.0, 0.12, S, 0, 0, 0, 1, 1.15, 1);
  for (const s of [-1, 1]) K.glowEye(head, [s * 0.05, 0.02, 0.165], 0.03, [s * 0.2, 0, 1], eye, 2.8, [1, 0.5, 1.5]);
  const jaw = K.bone('jaw', head, 0, -0.06, 0.15);
  K.glowBall(jaw, [0, 0, 0], 0.022, eye, [1.4, 0.7, 0.4], 1.2, 6, 4);
  for (const s of [-1, 1]) {
    const arm = K.bone(s < 0 ? 'armR' : 'armL', torso, s * 0.15, 0.36, 0.02, -0.5, 0, s * 0.45);
    tube(arm, [[0, 0, 0], [0, -0.12, 0.02], [0, -0.22, 0.06]], [0.055, 0.065, 0.08], P, 7);
    for (let i = -1; i <= 1; i++) spike(arm, [i * 0.04, -0.23, 0.06], [i * 0.05, -0.3, 0.05], 0.035, P, 4);
    for (let i = -1; i <= 1; i++) tube(arm, [[i * 0.025, -0.22, 0.08], [i * 0.035, -0.28, 0.13], [i * 0.035, -0.33, 0.12]], [0.012, 0.009, 0.0], tone(S, 0.45), 4);
  }
}

function eye(K: Kit) {
  const { P, S, A } = K;
  const iris = vivid(A, '#40a0ff');
  const bob = K.float(HOVER.eye!);
  const head = K.bone('head', bob, 0, 0.3, 0);
  ball(head, [0, 0, 0], 0.25, P, [1, 1, 1], {}, 11, 9);
  ball(head, [0, 0.01, 0.13], 0.17, S, [1, 1, 0.75], {}, 10, 8);
  K.glowEye(head, [0, 0.01, 0.238], 0.092, [0, 0, 1], iris, 1.6, [1, 0.3, 1]);
  ball(head, [0, 0.01, 0.268], 0.046, DARK, [0.5, 1.15, 0.3], NO, 7, 5);
  head.add(G.box(0.025, 0.025, 0.01), 0.03, 0.05, 0.27, WHITE, 0, 0, 0, 1, 1, 1, NO);
  head.add(G.torus(0.165, 0.04, 4, 12, PI), 0, 0.012, 0.19, tone(P, -0.12), 0.18, 0, 0, 1, 1.05, 1);
  const jaw = K.bone('jaw', head, 0, 0.012, 0.19);
  jaw.add(G.torus(0.165, 0.036, 4, 12, PI), 0, 0, 0, tone(P, -0.12), -0.18, 0, PI, 1, 0.9, 1);
  for (const s of [-1, 1]) spike(head, [s * 0.1, 0.19, -0.04], [s * 0.15, 0.32, -0.12], 0.04, tone(P, -0.2), 4);
  for (const s of [-1, 1]) {
    const w = K.bone(s < 0 ? 'wingR' : 'wingL', head, s * 0.2, 0.08, -0.06, 0, 0, s * 0.3);
    batWing(w, s, 0.36, tone(P, -0.3), tone(P, -0.2), CLAW);
  }
  const tail = K.bone('tail', head, 0, -0.18, -0.12);
  const wig = K.node(tail);
  K.wiggle(wig, { rx: 0.12, rz: 0.1 }, 0.4);
  tube(wig, [[0, 0.02, 0.02], [0, -0.1, -0.06], [0.03, -0.2, -0.06], [0.06, -0.25, 0.0], [0.05, -0.23, 0.07]], [0.06, 0.045, 0.03, 0.018, 0.0], P, 6, {}, 2);
  for (const s of [-1, 1]) tube(wig, [[s * 0.08, 0.02, 0.06], [s * 0.1, -0.08, 0.07], [s * 0.13, -0.14, 0.03]], [0.03, 0.02, 0.0], P, 5, {}, 2);
}

function treant(K: Kit) {
  const { P, S, A } = K;
  const bark = P, barkD = tone(P, -0.3), leaf = S, leaf2 = tone(S, 0.18), eye = vivid(A, '#e8ff60');
  const B = biped(K, { hipY: 0.24, hipX: 0.09, thigh: 0.12, headY: 0.42, shX: 0.19, shY: 0.36, upper: 0.16, fore: 0.14, splay: 0.4 });
  for (const [s, arm, elbow, hand, leg, knee] of limbs(B)) {
    tube(leg, [[0, 0.03, 0], [s * 0.01, -0.12, 0.01]], [0.075, 0.065], bark, 6);
    tube(knee, [[0, 0, 0], [0, -0.09, 0]], [0.065, 0.075], bark, 6);
    for (const [x, z] of [[0, 1], [0.8, 0.5], [-0.8, 0.5], [0.3, -0.9]] as Array<[number, number]>) tube(knee, [[0, -0.08, 0], [x * 0.06, -0.11, z * 0.06], [x * 0.12, -0.115, z * 0.12]], [0.045, 0.028, 0.0], barkD, 5);
    tube(arm, [[0, 0, 0], [s * 0.02, -0.16, 0.02]], [0.055, 0.045], bark, 6);
    tube(elbow, [[0, 0, 0], [0, -0.14, 0.02]], [0.045, 0.034], bark, 6);
    for (const [dx, dz] of [[0.04, 0.04], [-0.04, 0.03], [0, -0.04]]) tube(hand, [[0, 0.01, 0], [dx, -0.06, dz], [dx * 1.6, -0.11, dz * 1.8]], [0.025, 0.016, 0.0], barkD, 4);
    arm.add(G.ico(0.08, 0), s * 0.03, 0.02, 0, leaf);
    elbow.add(G.ico(0.055, 0), s * 0.04, -0.05, -0.02, leaf2);
  }
  tube(B.torso, [[0, -0.05, 0], [0, 0.2, 0], [0, 0.42, 0]], [0.17, 0.15, 0.16], bark, 8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2 + 0.4;
    B.torso.add(G.box(0.03, 0.3, 0.03), Math.sin(a) * 0.155, 0.2, Math.cos(a) * 0.155, barkD, 0, a, 0, 1, 1, 1, NO);
  }
  ball(B.torso, [0.1, 0.32, 0.1], 0.07, leaf, [1.3, 0.5, 1], NO, 6, 4);
  const h = B.head;
  tube(h, [[0, -0.04, 0], [0, 0.16, 0]], [0.16, 0.14], bark, 8);
  for (const s of [-1, 1]) {
    ball(h, [s * 0.06, 0.06, 0.13], 0.045, VOID, [1.2, 0.85, 0.5], NO, 6, 4);
    K.glowEye(h, [s * 0.06, 0.058, 0.148], 0.02, [s * 0.3, 0, 1], eye, 2.6);
    h.add(G.box(0.08, 0.025, 0.04), s * 0.065, 0.105, 0.135, barkD, 0, 0, s * 0.3);
  }
  h.add(G.ico(0.03, 0), 0, 0.02, 0.16, barkD);
  ball(h, [0, -0.045, 0.14], 0.05, VOID, [1.4, 0.55, 0.45], NO, 6, 4);
  const jaw = K.bone('jaw', h, 0, -0.07, 0.13);
  jaw.add(G.box(0.1, 0.025, 0.04), 0, -0.01, 0.01, barkD);
  const leaves: Array<[number, number, number, number, number]> = [
    [0, 0.34, -0.02, 0.23, 1], [0.18, 0.26, 0.0, 0.15, 0], [-0.18, 0.27, -0.02, 0.15, 0], [0, 0.27, -0.18, 0.16, 0],
    [0.1, 0.46, 0.04, 0.13, 0], [-0.1, 0.44, -0.08, 0.14, 0], [0.08, 0.28, 0.14, 0.11, 0], [-0.09, 0.3, 0.12, 0.1, 0],
  ];
  leaves.forEach(([x, y, z, r, d], i) => h.add(G.ico(r, d), x, y, z, i % 2 ? leaf2 : leaf, i * 0.7, i, 0));
  tube(h, [[0, 0.14, 0], [0.05, 0.28, 0.02]], [0.06, 0.03], bark, 5);
  for (const [x, y, z] of [[0.12, 0.38, 0.1], [-0.16, 0.34, 0.06], [0.2, 0.2, 0.08], [-0.02, 0.5, 0.06]] as V3[]) ball(h, [x, y, z], 0.03, A, [1, 1, 1], {}, 5, 4);
}

function minotaur(K: Kit) {
  const { P, S, A, M, L } = K;
  const fur = P, lite = tone(P, 0.15), horn = A, eye = '#ff4a2a';
  const B = biped(K, { hipY: 0.42, hipX: 0.09, thigh: 0.2, headY: 0.37, shX: 0.22, shY: 0.3, upper: 0.16, fore: 0.14, splay: 0.22 });
  for (const [s, arm, elbow, hand, leg, knee] of limbs(B)) {
    tube(leg, [[0, 0.02, 0], [0, -0.1, 0.05], [0, -0.2, 0.03]], [0.078, 0.072, 0.06], fur, 7);
    tube(knee, [[0, 0, 0.03], [0, -0.1, -0.04], [0, -0.18, -0.02]], [0.055, 0.048, 0.042], fur, 6);
    knee.add(G.cyl(0.05, 0.062, 0.05, 6), 0, -0.195, -0.01, DARK);
    ball(arm, [s * 0.02, 0.0, 0], 0.09, fur, [1, 0.9, 1], {}, 7, 5);
    tube(arm, [[0, 0, 0], [0, -0.16, 0]], [0.07, 0.058], fur, 7);
    tube(elbow, [[0, 0, 0], [0, -0.13, 0.01]], [0.056, 0.05], fur, 7);
    elbow.add(G.cyl(0.062, 0.066, 0.07, 7), 0, -0.09, 0.005, M);
    ball(hand, [0, -0.02, 0.01], 0.058, tone(fur, -0.15), [1, 1, 1], {}, 7, 5);
  }
  B.hips.add(G.cyl(0.15, 0.19, 0.14, 8), 0, -0.04, 0, S, 0, 0, 0, 1, 1, 0.8);
  B.hips.add(G.box(0.12, 0.18, 0.02), 0, -0.1, 0.13, S, 0.08, 0, 0);
  B.hips.add(G.cyl(0.155, 0.155, 0.04, 8), 0, 0.03, 0, L, 0, 0, 0, 1, 1, 0.82, NO);
  B.hips.add(G.box(0.06, 0.05, 0.02), 0, 0.03, 0.13, M, 0, 0, 0, 1, 1, 1, NO);
  ball(B.torso, [0, 0.2, 0], 0.2, fur, [1.25, 1, 0.85], {}, 9, 7);
  ball(B.torso, [0, 0.06, 0.02], 0.14, lite, [1.1, 1, 0.8], {}, 8, 6);
  slab(B.torso, [-0.2, 0.3, 0.1], [0.16, 0.04, 0.16], 0.05, 0.02, L, [0, 0, 1], NO);
  tube(B.torso, [[0, 0.26, 0], [0, 0.4, 0.04]], [0.11, 0.1], fur, 7);
  const h = B.head;
  ball(h, [0, 0.08, 0.0], 0.13, fur, [1.05, 1, 1.05], {}, 9, 7);
  ball(h, [0, 0.03, 0.11], 0.09, lite, [1.05, 0.8, 1]);
  h.add(G.torus(0.034, 0.008, 4, 10), 0, -0.01, 0.195, M, 0.2, 0, 0, 1, 1, 1, NO);
  h.add(G.box(0.2, 0.035, 0.05), 0, 0.14, 0.1, tone(fur, -0.4), 0.3, 0, 0);
  for (const s of [-1, 1]) {
    h.add(G.box(0.02, 0.02, 0.01), s * 0.028, 0.035, 0.198, DARK, 0, 0, 0, 1, 1, 1, NO);
    K.glowEye(h, [s * 0.058, 0.1, 0.112], 0.02, [s * 0.4, 0, 1], eye, 2.6);
    tube(h, [[s * 0.1, 0.14, 0.0], [s * 0.22, 0.16, 0.0], [s * 0.3, 0.25, 0.04], [s * 0.31, 0.37, 0.09]], [0.045, 0.036, 0.025, 0.0], horn, 6, {}, 2);
    spike(h, [s * 0.12, 0.1, -0.02], [s * 0.21, 0.07, -0.04], 0.04, fur, 4, {}, [0, 1, 0], 0.4);
  }
  for (let i = -1; i <= 1; i++) spike(h, [i * 0.03, 0.19, 0.02], [i * 0.05, 0.26, 0.04], 0.03, S, 4);
  const jaw = K.bone('jaw', h, 0, 0.0, 0.1);
  ball(jaw, [0, -0.02, 0.03], 0.06, lite, [1.1, 0.5, 1], {}, 7, 4);
  // great axe
  const hR = B.handR;
  const D = vec([0, 0.3, 1]).normalize(), U = vec([0, 1, -0.3]).normalize();
  const hp = (a: number, u = 0, x = 0): V3 => [x, D.y * a + U.y * u, D.z * a + U.z * u];
  tube(hR, [hp(-0.14), hp(0.58)], [0.02, 0.02], L, 6);
  const H = 0.48;
  for (const sgn of [1, -1]) membrane(hR, [hp(H - 0.05, 0.02 * sgn), hp(H - 0.12, 0.2 * sgn), hp(H + 0.02, 0.25 * sgn), hp(H + 0.14, 0.18 * sgn), hp(H + 0.07, 0.02 * sgn)], M, 0.02, hp(H + 0.02, 0.12 * sgn));
  ball(hR, hp(H + 0.02), 0.035, tone(M, -0.3), [1, 1, 1], {}, 6, 4);
  spike(hR, hp(0.58), hp(0.68), 0.02, M, 4);
}

function malboro(K: Kit) {
  const { P, S, A } = K;
  const lite = tone(P, 0.15), dk = tone(P, -0.2), slime = vivid(A, '#e0e060');
  const torso = K.bone('torso', K.body);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2 + 0.2;
    const dx = Math.sin(a), dz = Math.cos(a);
    tube(torso, [[dx * 0.12, 0.2, dz * 0.12], [dx * 0.3, 0.05, dz * 0.3], [dx * 0.42, 0.02, dz * 0.42], [dx * 0.5, 0.05, dz * 0.5]], [0.06, 0.045, 0.03, 0.0], dk, 5, {}, 2);
  }
  const head = K.bone('head', torso, 0, 0.42, -0.02);
  ball(head, [0, 0.04, -0.02], 0.34, P, [1.08, 0.95, 1], {}, 11, 9);
  for (const [x, y, z, r] of [[0.2, 0.22, -0.1, 0.05], [-0.22, 0.18, -0.06, 0.045], [0.05, 0.33, -0.12, 0.055], [-0.1, 0.3, 0.08, 0.04], [0.27, 0.0, -0.1, 0.04], [-0.26, -0.05, 0.02, 0.04], [0.12, -0.2, -0.2, 0.045]] as Array<[number, number, number, number]>) {
    ball(head, [x, y, z], r, S, [1, 1, 1], NO, 5, 4);
  }
  for (const [x, y, z] of [[0.24, 0.16, 0.1], [-0.22, 0.22, 0.12], [0.0, 0.3, 0.15], [0.3, -0.12, 0.06], [-0.28, -0.14, 0.1]] as V3[]) head.add(G.ico(0.03, 0), x, y, z, lite);
  ball(head, [0, -0.03, 0.2], 0.24, MOUTH, [1.15, 0.7, 0.55], NO, 9, 6);
  head.add(G.torus(0.22, 0.045, 5, 14), 0, -0.02, 0.24, S, 0, 0, 0, 1.15, 0.72, 1);
  for (let i = 0; i < 7; i++) {
    const th = 0.25 + (i / 6) * (PI - 0.5);
    const p: V3 = [Math.cos(th) * 0.22, -0.02 + Math.sin(th) * 0.13, 0.25];
    spike(head, p, add3(p, [0, -0.08, 0.0]), 0.022, IVORY, 4, NO);
  }
  const jaw = K.bone('jaw', head, 0, -0.12, 0.12);
  for (let i = 0; i < 5; i++) {
    const th = PI + 0.4 + (i / 4) * (PI - 0.8);
    const p: V3 = [Math.cos(th) * 0.2, 0.1 + Math.sin(th) * 0.1, 0.13];
    spike(jaw, p, add3(p, [0, 0.07, 0.0]), 0.02, IVORY, 4, NO);
  }
  ball(jaw, [0, 0.03, 0.08], 0.12, tone(MOUTH, 0.3), [1.1, 0.35, 0.8], NO, 7, 4);
  K.glowBall(jaw, [0.07, -0.02, 0.15], 0.018, slime, [1, 1.8, 1], 1.4, 5, 4);
  K.glowBall(jaw, [-0.1, -0.03, 0.14], 0.014, slime, [1, 2.2, 1], 1.4, 5, 4);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2;
    const b: V3 = [Math.sin(a) * 0.08, 0.33, Math.cos(a) * 0.08 - 0.05];
    const tp = add3(b, [Math.sin(a) * 0.1, 0.14, Math.cos(a) * 0.1]);
    tube(head, [b, lerp3(b, tp, 0.5), tp], [0.02, 0.014, 0.008], lite, 4);
    ball(head, tp, 0.03, A, [1, 1, 1], {}, 5, 4);
  }
  const tentacle = (bp: Part, pts: V3[], r: number) => {
    const wig = K.node(bp);
    K.wiggle(wig, { rx: 0.15, rz: 0.12 }, 0.35 + Math.random() * 0.2, Math.random() * 6);
    tube(wig, pts, [r, r * 0.8, r * 0.55, 0.0], lite, 6, {}, 2);
  };
  for (const s of [-1, 1]) {
    const arm = K.bone(s < 0 ? 'armR' : 'armL', head, s * 0.3, 0.02, 0.1);
    tentacle(arm, [[0, 0, 0], [s * 0.14, 0.06, 0.06], [s * 0.24, 0.0, 0.14], [s * 0.26, -0.12, 0.2]], 0.05);
    const w = K.bone(s < 0 ? 'wingR' : 'wingL', head, s * 0.26, 0.2, -0.06);
    tentacle(w, [[0, 0, 0], [s * 0.12, 0.12, -0.04], [s * 0.18, 0.26, 0.0], [s * 0.13, 0.36, 0.06]], 0.045);
    const low = K.node(head, s * 0.28, -0.18, 0.02);
    tentacle(low, [[0, 0, 0], [s * 0.14, -0.04, 0.04], [s * 0.24, -0.14, 0.04], [s * 0.3, -0.2, 0.12]], 0.045);
  }
  const tail = K.bone('tail', head, 0, 0.1, -0.3);
  tentacle(tail, [[0, 0, 0], [0.06, 0.1, -0.12], [0.02, 0.24, -0.18], [-0.04, 0.32, -0.12]], 0.05);
  tentacle(tail, [[0, 0, 0], [-0.08, 0.02, -0.14], [-0.14, 0.1, -0.24], [-0.12, 0.2, -0.3]], 0.045);
}

function golem(K: Kit) {
  const { P, S, A } = K;
  const stone = P, stone2 = tone(P, -0.15), moss = S, rune = vivid(A, '#60e0ff');
  const B = biped(K, { hipY: 0.38, hipX: 0.13, thigh: 0.17, headY: 0.5, shX: 0.32, shY: 0.4, upper: 0.2, fore: 0.18, splay: 0.2 });
  for (const [s, arm, elbow, hand, leg, knee] of limbs(B)) {
    leg.add(G.dodec(0.1), 0, -0.08, 0, stone, 0, s, 0, 1, 1.1, 1);
    knee.add(G.dodec(0.095), 0, -0.08, 0.01, stone2, 0.4, 0, 0);
    knee.add(G.box(0.17, 0.08, 0.22), 0, -0.17, 0.03, stone);
    arm.add(G.dodec(0.15), s * 0.02, 0.0, 0, stone, 0.3, s, 0);
    ball(arm, [s * 0.02, 0.1, 0], 0.1, moss, [1.2, 0.4, 1.1], NO, 6, 4);
    arm.add(G.dodec(0.1), 0, -0.12, 0, stone2, 0, 0.5, 0);
    elbow.add(G.dodec(0.1), 0, -0.07, 0.02, stone, 0.5, 0, 0);
    hand.add(G.dodec(0.13), 0, -0.05, 0.02, stone2, 0, 0.3, 0.2);
    K.gp(elbow, rune).add(G.box(0.02, 0.1, 0.02), s * 0.06, -0.08, 0.07, rune, 0, 0, 0, 1, 1, 1, GL);
  }
  B.hips.add(G.dodec(0.15), 0, 0.02, 0, stone2, 0, 0, 0, 1.35, 0.7, 1);
  B.torso.add(G.dodec(0.3), 0, 0.28, 0, stone, 0.2, 0.3, 0, 1.2, 0.95, 0.85);
  ball(B.torso, [0.1, 0.52, -0.02], 0.12, moss, [1.4, 0.45, 1.2], NO, 6, 4);
  ball(B.torso, [-0.14, 0.48, 0.08], 0.08, moss, [1.2, 0.4, 1.2], NO, 6, 4);
  K.gp(B.torso, rune, 2.6).add(G.oct(0.06), 0, 0.3, 0.245, rune, 0, 0, 0, 1, 1.3, 0.35, GL);
  for (const s of [-1, 1]) K.gp(B.torso, rune, 2.6).add(G.box(0.12, 0.018, 0.02), s * 0.1, 0.3, 0.232, rune, 0, s * 0.35, s * 0.4, 1, 1, 1, GL);
  const h = B.head;
  h.add(G.box(0.17, 0.14, 0.16), 0, 0.03, 0.06, stone2, 0.05, 0, 0);
  h.add(G.box(0.2, 0.04, 0.06), 0, 0.09, 0.12, stone, 0.3, 0, 0);
  for (const s of [-1, 1]) K.gp(h, rune, 3).add(G.box(0.045, 0.018, 0.02), s * 0.045, 0.05, 0.14, rune, 0, 0, s * 0.2, 1, 1, 1, GL);
  const jaw = K.bone('jaw', h, 0, -0.03, 0.1);
  jaw.add(G.box(0.14, 0.04, 0.05), 0, -0.01, 0.03, stone);
}

function automaton(K: Kit) {
  const { P, S, A, M } = K;
  const brass = M, plate = P, dark = S, eye = vivid(A, '#ffa030');
  const B = biped(K, { hipY: 0.4, hipX: 0.1, thigh: 0.18, headY: 0.44, shX: 0.25, shY: 0.36, upper: 0.16, fore: 0.16, splay: 0.15 });
  for (const [s, arm, elbow, hand, leg, knee] of limbs(B)) {
    tube(leg, [[0, 0, 0], [0, -0.18, 0]], [0.035, 0.035], brass, 6);
    leg.add(G.cyl(0.062, 0.055, 0.1, 6), 0, -0.05, 0, plate);
    knee.add(G.cyl(0.05, 0.05, 0.13, 8), 0, 0, 0, dark, 0, 0, PI / 2);
    knee.add(G.box(0.1, 0.14, 0.11), 0, -0.09, 0.005, plate);
    tube(knee, [[0, -0.01, -0.06], [0, -0.15, -0.055]], [0.014, 0.014], brass, 5);
    knee.add(G.box(0.13, 0.05, 0.2), 0, -0.195, 0.03, dark);
    arm.add(G.box(0.14, 0.1, 0.16), s * 0.03, 0.02, 0, brass);
    tube(arm, [[0, 0, 0], [0, -0.16, 0]], [0.028, 0.028], brass, 6);
    arm.add(G.cyl(0.05, 0.045, 0.08, 6), 0, -0.1, 0, plate);
    elbow.add(G.cyl(0.045, 0.045, 0.11, 8), 0, 0, 0, dark, 0, 0, PI / 2);
    elbow.add(G.box(0.1, 0.15, 0.1), 0, -0.085, 0, plate);
    hand.add(G.box(0.1, 0.05, 0.09), 0, -0.02, 0, dark);
    for (const dz of [-0.03, 0.03]) hand.add(G.box(0.024, 0.07, 0.025), s * 0.035, -0.07, dz, brass);
    hand.add(G.box(0.024, 0.06, 0.025), -s * 0.035, -0.06, 0.0, brass);
  }
  B.hips.add(G.box(0.24, 0.1, 0.16), 0, 0.02, 0, dark);
  B.torso.add(G.cyl(0.1, 0.12, 0.08, 8), 0, 0.08, 0, dark);
  B.torso.add(G.box(0.36, 0.28, 0.26), 0, 0.25, 0, plate);
  B.torso.add(G.box(0.3, 0.06, 0.22), 0, 0.41, 0, brass);
  for (const [x, y] of [[-0.15, 0.36], [0.15, 0.36], [-0.15, 0.14], [0.15, 0.14], [0, 0.36]]) B.torso.add(G.sph(0.014, 4, 3), x, y, 0.133, brass, 0, 0, 0, 1, 1, 1, NO);
  for (let i = 0; i < 3; i++) B.torso.add(G.box(0.14, 0.018, 0.01), 0, 0.2 - i * 0.035, 0.131, DARK, 0, 0, 0, 1, 1, 1, NO);
  K.glowBall(B.torso, [0.09, 0.29, 0.133], 0.022, eye, [1, 1, 0.4], 2, 6, 4);
  for (const s of [-1, 1]) {
    B.torso.add(G.cyl(0.035, 0.035, 0.22, 6), s * 0.1, 0.44, -0.14, dark);
    B.torso.add(G.cyl(0.045, 0.035, 0.03, 6), s * 0.1, 0.56, -0.14, brass);
  }
  const h = B.head;
  h.add(G.box(0.17, 0.14, 0.16), 0, 0.07, 0.02, plate);
  h.add(G.hemi(0.085, 8, 3), 0, 0.14, 0.02, brass);
  h.add(G.torus(0.045, 0.012, 4, 10), 0, 0.08, 0.103, brass, 0, 0, 0, 1, 1, 1, NO);
  K.glowEye(h, [0, 0.08, 0.1], 0.035, [0, 0, 1], eye, 3, [1, 0.45, 1]);
  tube(h, [[0.05, 0.18, 0], [0.06, 0.28, -0.02]], [0.008, 0.008], dark, 4);
  ball(h, [0.06, 0.29, -0.02], 0.018, eye, [1, 1, 1], {}, 5, 4);
  const jaw = K.bone('jaw', h, 0, 0.02, 0.08);
  jaw.add(G.box(0.13, 0.04, 0.04), 0, -0.01, 0.01, dark);
  for (let i = -1; i <= 1; i++) jaw.add(G.box(0.012, 0.03, 0.01), i * 0.035, -0.01, 0.032, brass, 0, 0, 0, 1, 1, 1, NO);
}

function tome(K: Kit) {
  const { P, S, A } = K;
  const L = K.L, rune = vivid(A, '#e8c040');
  const bob = K.float(HOVER.tome!);
  const book = K.bone('torso', bob, 0, 0.12, 0, 0.5, 0, 0);
  book.add(G.cyl(0.035, 0.035, 0.44, 6), 0, -0.02, 0, L, PI / 2, 0, 0);
  for (const s of [-1, 1]) {
    const w = K.bone(s < 0 ? 'wingR' : 'wingL', book, s * 0.012, 0, 0, 0, 0, s * 0.28);
    w.add(G.box(0.3, 0.022, 0.44), s * 0.155, -0.02, 0, P);
    w.add(G.box(0.27, 0.05, 0.4), s * 0.145, 0.016, 0, S);
    for (let i = 0; i < 3; i++) w.add(G.box(0.004, 0.044, 0.39), s * (0.28 - i * 0.004), 0.016, 0, tone(S, -0.2), 0, 0, 0, 1, 1, 1, NO);
    for (const z of [-0.2, 0.2]) w.add(G.box(0.045, 0.03, 0.045), s * 0.285, -0.018, z, A, 0, 0, 0, 1, 1, 1, NO);
    for (let i = 0; i < 4; i++) w.add(G.box(0.16 - (i % 2) * 0.04, 0.004, 0.012), s * 0.15, 0.043, -0.13 + i * 0.05, tone(S, -0.55), 0, 0, 0, 1, 1, 1, NO);
    K.gp(w, rune, 2).add(G.torus(0.045, 0.007, 3, 12), s * 0.15, 0.044, 0.13, rune, PI / 2, 0, 0, 1, 1, 1, GL);
  }
  for (let i = 0; i < 3; i++) {
    const pg = K.node(book, 0, 0.04, 0, 0, 0, 0);
    pg.add(G.box(0.25, 0.006, 0.37), 0.13, 0, 0, tone(S, 0.08), 0, 0, 0, 1, 1, 1, { outline: true });
    K.drive(pg.obj, (t, o) => { o.rz += 0.3 + ((t * 0.35 + i / 3) % 1) * (PI - 0.6); });
  }
  const head = K.bone('head', book, 0, 0.09, 0.02, -0.5, 0, 0);
  ball(head, [0, 0, 0], 0.085, WHITE, [1, 1, 0.9], {}, 9, 7);
  K.glowEye(head, [0, 0.0, 0.07], 0.045, [0, 0, 1], rune, 1.6, [1, 0.3, 1]);
  ball(head, [0, 0.0, 0.085], 0.022, DARK, [0.45, 1.1, 0.35], NO, 6, 4);
  head.add(G.torus(0.082, 0.02, 4, 10, PI), 0, 0.004, 0.02, P, 0.35, 0, 0, 1, 1.05, 1);
  const jaw = K.bone('jaw', head, 0, 0.004, 0.02);
  jaw.add(G.torus(0.082, 0.018, 4, 10, PI), 0, 0, 0, P, -0.35, 0, PI, 1, 0.9, 1);
  const tail = K.bone('tail', book, 0, -0.03, -0.2);
  const rib = K.node(tail);
  K.wiggle(rib, { rx: 0.15, rz: 0.12 }, 0.45);
  for (const [x, c] of [[-0.04, '#b02030'], [0.04, A]] as Array<[number, string]>) slab(rib, [x, 0, 0], [x * 1.3, -0.26, -0.04], 0.028, 0.006, c, [0, 0, 1]);
  const ring = K.node(K.body, 0, -0.3, 0);
  K.spin(ring, 'ry', 0.4);
  K.gp(ring, rune, 1.4).add(G.torus(0.3, 0.008, 3, 28), 0, 0, 0, rune, PI / 2, 0, 0, 1, 1, 1, GL);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    K.gp(ring, rune, 1.4).add(G.box(0.05, 0.004, 0.02), Math.sin(a) * 0.27, 0, Math.cos(a) * 0.27, rune, 0, a, 0, 1, 1, 1, GL);
  }
}

function serpent(K: Kit) {
  const { P, S, A, M } = K;
  const eye = vivid(A, '#ffd040'), horn = mix(M, '#d8d0e0', 0.25);
  K.body.add(G.torus(0.3, 0.13, 7, 16), 0, 0.13, -0.05, P, PI / 2, 0, 0);
  K.body.add(G.torus(0.22, 0.11, 6, 14), 0.02, 0.33, -0.07, P, PI / 2 + 0.08, 0, 0.05);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    K.body.add(G.oct(0.045), Math.sin(a) * 0.3, 0.255, Math.cos(a) * 0.3 - 0.05, A, 0, a, 0, 1, 0.35, 1.3, NO);
  }
  const tail = K.bone('tail', K.body, 0.28, 0.1, -0.24);
  tube(tail, [[0, 0, 0], [0.12, 0.02, -0.08], [0.18, 0.08, -0.2], [0.14, 0.18, -0.26]], [0.09, 0.07, 0.04, 0.008], P, 7, {}, 2);
  spike(tail, [0.14, 0.18, -0.26], [0.1, 0.3, -0.26], 0.03, horn, 4);
  const torso = K.bone('torso', K.body, 0, 0.36, 0.08);
  const spine: V3[] = [[0, -0.12, -0.12], [0, 0.08, 0.0], [0, 0.28, 0.05], [0, 0.46, 0.02]];
  tube(torso, spine, [0.13, 0.12, 0.105, 0.095], P, 8, {}, 2);
  tube(torso, spine.map((p) => add3(p, [0, 0.01, 0.045])), [0.1, 0.095, 0.08, 0.07], S, 7, NO, 2);
  for (let i = 0; i < 4; i++) {
    const p = lerp3(spine[1], spine[3], i / 3);
    spike(torso, add3(p, [0, 0, -0.08]), add3(p, [0, 0.06, -0.2]), 0.035, horn, 4, {}, [1, 0, 0], 0.5);
  }
  const neck = K.bone('neck', torso, 0, 0.48, 0.02);
  const hood: V3[] = [[0, -0.1, 0], [0.12, -0.06, 0], [0.2, 0.06, -0.01], [0.19, 0.2, -0.02], [0.1, 0.28, -0.02], [0, 0.3, -0.02], [-0.1, 0.28, -0.02], [-0.19, 0.2, -0.02], [-0.2, 0.06, -0.01], [-0.12, -0.06, 0]];
  membrane(neck, hood, tone(P, -0.12), 0.03, [0, 0.1, -0.015]);
  for (const s of [-1, 1]) {
    K.glowBall(neck, [s * 0.12, 0.12, 0.005], 0.03, eye, [1, 1.3, 0.4], 1.6, 6, 4);
    spike(neck, [s * 0.18, 0.18, -0.02], [s * 0.3, 0.3, -0.06], 0.035, horn, 4);
    spike(neck, [s * 0.2, 0.06, -0.02], [s * 0.32, 0.04, -0.06], 0.03, horn, 4);
  }
  const head = K.bone('head', neck, 0, 0.1, 0.07);
  ball(head, [0, 0.0, 0.04], 0.1, P, [1.15, 0.72, 1.4], {}, 9, 7);
  for (const s of [-1, 1]) {
    K.glowEye(head, [s * 0.07, 0.03, 0.09], 0.022, [s * 0.5, 0.2, 1], eye, 2.8, [1.3, 0.6, 0.8]);
    head.add(G.box(0.07, 0.022, 0.04), s * 0.06, 0.06, 0.09, tone(P, -0.4), 0, 0, s * 0.35);
    tube(head, [[s * 0.06, 0.06, -0.02], [s * 0.1, 0.13, -0.12], [s * 0.1, 0.16, -0.24]], [0.028, 0.018, 0.0], horn, 5, {}, 2);
    spike(head, [s * 0.04, -0.03, 0.14], [s * 0.042, -0.1, 0.145], 0.012, IVORY, 4);
  }
  const jaw = K.bone('jaw', head, 0, -0.04, 0.02);
  ball(jaw, [0, -0.01, 0.07], 0.08, S, [1.05, 0.35, 1.3], {}, 7, 4);
  tube(jaw, [[0, 0.0, 0.14], [0, -0.01, 0.2], [0.02, -0.02, 0.23]], [0.008, 0.006, 0.0], '#c02030', 4);
  for (const s of [-1, 1]) {
    const arm = K.bone(s < 0 ? 'armR' : 'armL', torso, s * 0.13, 0.3, 0.04, 0, 0, s * 0.35);
    tube(arm, [[0, 0, 0], [0, -0.15, 0.02]], [0.045, 0.04], P, 6);
    const el = K.bone(s < 0 ? 'elbowR' : 'elbowL', arm, 0, -0.15, 0.02, -0.9, 0, 0);
    tube(el, [[0, 0, 0], [0, -0.14, 0]], [0.04, 0.034], P, 6);
    el.add(G.cyl(0.044, 0.048, 0.06, 6), 0, -0.1, 0, A);
    const hd = K.bone(s < 0 ? 'handR' : 'handL', el, 0, -0.15, 0);
    ball(hd, [0, -0.01, 0], 0.04, P, [1, 1, 1], {}, 6, 4);
    for (let i = -1; i <= 1; i++) spike(hd, [i * 0.025, -0.03, 0.01], [i * 0.035, -0.09, 0.03], 0.012, IVORY, 4);
  }
}

// ---------------------------------------------------------------- Umbral lords
function demonAries(K: Kit) {
  const { P, S, A, M, L } = K;
  const plate = M, plateD = tone(M, -0.35), skin = P, fire = '#ff7a2a', horn = '#d6c7a4';
  const B = biped(K, { hipY: 0.48, hipX: 0.1, thigh: 0.23, headY: 0.44, shX: 0.25, shY: 0.36, upper: 0.18, fore: 0.17, splay: 0.24 });
  for (const [s, arm, elbow, hand, leg, knee] of limbs(B)) {
    tube(leg, [[0, 0.02, 0], [0, -0.12, 0.05], [0, -0.23, 0.03]], [0.085, 0.078, 0.064], skin, 7);
    seg(leg, [0, -0.02, 0.01], [0, -0.17, 0.05], 0.1, 0.085, plate, 7);
    ball(knee, [0, 0, 0.05], 0.065, plate, [1, 1, 1], {}, 7, 5);
    spike(knee, [0, 0.0, 0.1], [0, 0.03, 0.18], 0.03, tone(plate, 0.2), 4);
    tube(knee, [[0, 0, 0.03], [0, -0.12, -0.05], [0, -0.22, -0.02]], [0.06, 0.05, 0.045], skin, 6);
    seg(knee, [0, -0.04, 0.0], [0, -0.17, -0.03], 0.07, 0.06, plate, 6);
    knee.add(G.cyl(0.055, 0.07, 0.05, 6), 0, -0.225, -0.015, DARK);
    tube(arm, [[0, 0, 0], [0, -0.18, 0]], [0.075, 0.064], skin, 7);
    arm.add(G.hemi(0.135, 9, 4), s * 0.03, 0.02, 0, plate, 0, 0, s * 0.35, 1, 0.85, 1.1);
    arm.add(G.torus(0.125, 0.018, 4, 12), s * 0.03, 0.02, 0, plateD, PI / 2, 0, -s * 0.35 * 0, 1, 1.1, 1, NO);
    spike(arm, [s * 0.08, 0.08, 0.02], [s * 0.18, 0.25, 0.0], 0.035, tone(plate, 0.25), 4);
    spike(arm, [s * 0.1, 0.06, -0.06], [s * 0.2, 0.18, -0.14], 0.03, tone(plate, 0.25), 4);
    tube(elbow, [[0, 0, 0], [0, -0.16, 0.01]], [0.062, 0.055], skin, 7);
    elbow.add(G.cyl(0.072, 0.078, 0.12, 7), 0, -0.1, 0.005, plate);
    ball(hand, [0, -0.02, 0], 0.066, plateD, [1, 1, 1], {}, 7, 5);
  }
  B.hips.add(G.cyl(0.15, 0.21, 0.17, 8), 0, -0.05, 0, plateD, 0, 0, 0, 1, 1, 0.8);
  B.hips.add(G.box(0.13, 0.26, 0.02), 0, -0.12, 0.15, S, 0.1, 0, 0);
  ball(B.hips, [0, 0.03, 0.15], 0.035, A, [1, 1, 0.5], NO, 6, 4);
  ball(B.torso, [0, 0.2, 0], 0.22, plate, [1.2, 1.05, 0.85], {}, 10, 8);
  B.torso.add(G.cyl(0.16, 0.19, 0.12, 8), 0, 0.03, 0, plateD, 0, 0, 0, 1, 1, 0.8);
  for (let i = 0; i < 2; i++) B.torso.add(G.torus(0.2 - i * 0.02, 0.012, 3, 12), 0, 0.12 - i * 0.05, 0, tone(plate, 0.15), PI / 2, 0, 0, 1.08, 0.8, 1, NO);
  K.gp(B.torso, fire, 3).add(G.oct(0.05), 0, 0.24, 0.19, fire, 0, 0, 0, 1, 1.3, 0.4, GL);
  B.torso.add(G.cyl(0.11, 0.16, 0.08, 8), 0, 0.38, 0, plateD);
  const cape = K.bone('cape', B.torso, 0, 0.36, -0.15);
  membrane(cape, [[-0.22, 0, 0.02], [0.22, 0, 0.02], [0.27, -0.3, -0.06], [0.22, -0.64, -0.12], [0.1, -0.54, -0.12], [0, -0.68, -0.14], [-0.1, -0.54, -0.12], [-0.22, -0.64, -0.12], [-0.27, -0.3, -0.06]], S, 0.02, [0, -0.3, -0.06]);
  const h = B.head;
  ball(h, [0, 0.1, 0], 0.14, plate, [1, 1.05, 1.08], {}, 9, 7);
  h.add(G.box(0.2, 0.13, 0.07), 0, 0.07, 0.1, plateD, 0.1, 0, 0);
  for (const s of [-1, 1]) K.gp(h, fire, 3.2).add(G.box(0.07, 0.022, 0.02), s * 0.045, 0.1, 0.14, fire, 0, 0, s * 0.3, 1, 1, 1, GL);
  h.add(G.box(0.03, 0.09, 0.22), 0, 0.23, -0.01, plateD);
  for (const s of [-1, 1]) {
    tube(h, [[s * 0.1, 0.16, -0.02], [s * 0.2, 0.24, -0.08], [s * 0.29, 0.21, -0.19], [s * 0.31, 0.07, -0.21], [s * 0.27, -0.03, -0.1], [s * 0.22, 0.0, 0.02], [s * 0.24, 0.07, 0.07]], [0.06, 0.056, 0.047, 0.038, 0.026, 0.014, 0.0], horn, 7, {}, 2);
  }
  K.gp(h, fire, 2.5).add(G.box(0.1, 0.03, 0.03), 0, 0.03, 0.1, fire, 0, 0, 0, 1, 1, 1, GL);
  const jaw = K.bone('jaw', h, 0, 0.03, 0.1);
  jaw.add(G.box(0.17, 0.05, 0.08), 0, -0.025, 0.02, plate);
  // flaming greatsword
  const hR = B.handR;
  tube(hR, [[0, -0.03, -0.1], [0, 0.0, 0.05]], [0.02, 0.02], L, 6);
  slab(hR, [0, 0.0, 0.055], [0, 0.005, 0.075], 0.2, 0.04, plate, [1, 0, 0]);
  const D = vec([0, 0.25, 1]).normalize();
  const b0: V3 = [0, 0.01, 0.08], b1 = add3(b0, D, 0.62);
  slab(hR, b0, b1, 0.1, 0.022, tone(M, -0.55), [1, 0, 0]);
  spike(hR, b1, add3(b1, D, 0.09), 0.05, tone(M, -0.55), 4, {}, [1, 0, 0], 0.25);
  slab(K.gp(hR, fire, 2.8), add3(b0, D, 0.04), add3(b1, D, 0.02), 0.03, 0.03, fire, [1, 0, 0], GL);
}

function demonScorpio(K: Kit) {
  const { P, S, A, M } = K;
  const skin = P, robe = S, chit = M, chitD = tone(M, -0.3), glow = vivid(A, '#c0ff40');
  const hips = K.bone('hips', K.body, 0, 0.42, 0);
  ball(hips, [0, 0.04, -0.06], 0.3, skin, [1.05, 0.9, 1.1], {}, 11, 9);
  ball(hips, [0, -0.03, 0.14], 0.2, tone(P, 0.12), [1.1, 0.8, 0.8], {}, 9, 6);
  for (const [x, y, z] of [[0.2, 0.0, 0.14], [-0.24, 0.06, 0.02], [0.1, -0.1, 0.2], [-0.12, -0.12, 0.16], [0.26, -0.06, -0.12]] as V3[]) K.glowBall(hips, [x, y, z], 0.022, glow, [1, 1, 1], 1.6, 5, 4);
  hips.add(G.cyl(0.25, 0.33, 0.2, 10), 0, 0.15, -0.05, robe, 0, 0, 0, 1, 1, 0.95);
  hips.add(G.torus(0.32, 0.018, 3, 14), 0, 0.055, -0.05, GOLD, PI / 2, 0, 0, 1, 0.95, 1, NO);
  const insectLeg = (lg: Part, s: number, dz: number) => {
    const j1: V3 = [s * 0.18, 0.2, dz * 0.3], j2: V3 = [s * 0.36, 0.08, dz * 0.55], ft: V3 = [s * 0.42, -0.38, dz * 0.7];
    tube(lg, [[0, 0, 0], j1], [0.045, 0.04], chit, 6);
    ball(lg, j1, 0.045, chitD, [1, 1, 1], {}, 6, 4);
    tube(lg, [j1, j2], [0.04, 0.034], chit, 6);
    ball(lg, j2, 0.038, chitD, [1, 1, 1], {}, 6, 4);
    tube(lg, [j2, ft], [0.034, 0.0], chitD, 6);
    spike(lg, lerp3(j1, j2, 0.4), add3(lerp3(j1, j2, 0.4), [0, 0.08, -0.02]), 0.018, glow, 4, NO);
  };
  const legSpec: Array<[BoneName, number, number, number]> = [['legFL', 1, 0.14, 0.4], ['legFR', -1, 0.14, 0.4], ['legBL', 1, -0.22, -0.4], ['legBR', -1, -0.22, -0.4]];
  for (const [n, s, z, dz] of legSpec) insectLeg(K.bone(n, hips, s * 0.22, -0.04, z), s, dz);
  for (const s of [-1, 1]) {
    const mid = K.node(hips, s * 0.25, -0.04, -0.04);
    insectLeg(mid, s, 0.02);
    K.follow(mid, K.bones[s > 0 ? 'legFR' : 'legFL']);
  }
  const torso = K.bone('torso', hips, 0, 0.22, 0.03);
  ball(torso, [0, 0.1, 0], 0.19, skin, [1.2, 1, 0.95], {}, 9, 7);
  torso.add(G.cyl(0.2, 0.24, 0.12, 9), 0, 0.02, 0, robe, 0, 0, 0, 1, 1, 0.9);
  torso.add(G.torus(0.17, 0.035, 4, 12), 0, 0.22, 0, tone(robe, 0.2), PI / 2, 0, 0, 1.1, 0.9, 1);
  const head = K.bone('head', torso, 0, 0.29, 0.04);
  ball(head, [0, 0.06, 0], 0.15, skin, [1.15, 1, 1], {}, 9, 7);
  ball(head, [0, -0.04, 0.06], 0.1, tone(P, 0.1), [1.35, 0.6, 1], {}, 8, 5);
  for (const s of [-1, 1]) {
    ball(head, [s * 0.055, 0.09, 0.125], 0.03, VOID, [1.2, 0.8, 0.5], NO, 5, 4);
    K.glowBall(head, [s * 0.055, 0.088, 0.135], 0.015, glow, [1, 1, 1], 3, 5, 4);
    head.add(G.box(0.07, 0.028, 0.04), s * 0.06, 0.125, 0.12, tone(P, -0.3), 0, 0, -s * 0.25);
  }
  head.add(G.box(0.14, 0.02, 0.02), 0, 0.02, 0.15, MOUTH, 0, 0, 0, 1, 1, 1, NO);
  const jaw = K.bone('jaw', head, 0, 0.02, 0.1);
  ball(jaw, [0, -0.02, 0.04], 0.07, tone(P, -0.08), [1.35, 0.45, 0.8], {}, 8, 5);
  for (const x of [-0.05, -0.015, 0.03]) spike(jaw, [x, 0.0, 0.085], [x, 0.03, 0.09], 0.012, '#d8d0a0', 4, NO);
  head.add(G.cyl(0.11, 0.1, 0.07, 8), 0, 0.2, -0.01, GOLD);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    spike(head, [Math.sin(a) * 0.1, 0.23, Math.cos(a) * 0.1 - 0.01], [Math.sin(a) * 0.12, 0.31, Math.cos(a) * 0.12 - 0.01], 0.025, GOLD, 4);
  }
  K.glowBall(head, [0, 0.2, 0.1], 0.02, glow, [1, 1.3, 0.6], 2.4, 5, 4);
  for (const s of [-1, 1]) {
    const arm = K.bone(s < 0 ? 'armR' : 'armL', torso, s * 0.2, 0.14, 0.02, 0, 0, s * 0.3);
    tube(arm, [[0, 0, 0], [s * 0.03, -0.14, 0.05]], [0.045, 0.04], chit, 6);
    const el = K.bone(s < 0 ? 'elbowR' : 'elbowL', arm, s * 0.03, -0.14, 0.05, -0.9, 0, 0);
    ball(el, [0, 0, 0], 0.04, chitD, [1, 1, 1], {}, 6, 4);
    tube(el, [[0, 0, 0], [0, -0.14, 0.02]], [0.04, 0.045], chit, 6);
    const hd = K.bone(s < 0 ? 'handR' : 'handL', el, 0, -0.15, 0.02);
    ball(hd, [0, -0.02, 0], 0.055, chit, [0.9, 1.2, 1], {}, 6, 4);
    tube(hd, [[0, -0.04, 0.02], [0, -0.1, 0.07], [0, -0.14, 0.04]], [0.03, 0.02, 0.0], chitD, 5);
    tube(hd, [[0, -0.04, -0.02], [0, -0.11, -0.03], [0, -0.15, 0.02]], [0.026, 0.018, 0.0], chitD, 5);
  }
  const tail = K.bone('tail', hips, 0, 0.12, -0.3);
  const tp: V3[] = [[0, 0, 0], [0, 0.12, -0.12], [0, 0.3, -0.18], [0, 0.48, -0.12], [0, 0.58, 0.0], [0, 0.56, 0.1]];
  tube(tail, tp, [0.08, 0.07, 0.06, 0.052, 0.045, 0.035], chit, 6, {}, 2);
  for (let i = 1; i < tp.length; i++) ball(tail, tp[i], 0.075 - i * 0.008, i % 2 ? chitD : chit, [1, 1, 1], {}, 6, 4);
  spike(K.gp(tail, glow, 2.4), [0, 0.56, 0.1], [0, 0.46, 0.22], 0.035, glow, 5, GL);
}

function demonCapricorn(K: Kit) {
  const { P, S, A, M } = K;
  const robe = P, skin = tone(S, 0.2), gold = M, fire = '#ff5a1a', fire2 = '#ffc040', hornC = '#3a2c28';
  const B = biped(K, { hipY: 0.5, hipX: 0.08, thigh: 0.24, headY: 0.46, shX: 0.2, shY: 0.38, upper: 0.19, fore: 0.18, splay: 0.16 });
  for (const [s, arm, elbow, hand, leg, knee] of limbs(B)) {
    tube(leg, [[0, 0, 0], [0, -0.24, 0.03]], [0.05, 0.04], skin, 6);
    tube(knee, [[0, 0, 0.03], [0, -0.12, -0.04], [0, -0.22, -0.01]], [0.04, 0.035, 0.03], skin, 6);
    knee.add(G.cyl(0.04, 0.052, 0.045, 6), 0, -0.235, -0.01, DARK);
    ball(arm, [s * 0.02, 0, 0], 0.07, robe, [1, 0.9, 1], {}, 7, 5);
    tube(arm, [[0, 0, 0], [0, -0.19, 0]], [0.045, 0.04], robe, 6);
    elbow.add(G.cyl(0.045, 0.085, 0.17, 7), 0, -0.08, 0, robe);
    elbow.add(G.cyl(0.087, 0.087, 0.02, 7), 0, -0.165, 0, gold, 0, 0, 0, 1, 1, 1, NO);
    ball(hand, [0, -0.02, 0], 0.035, skin, [1, 1.2, 1], {}, 6, 4);
    for (let i = -1; i <= 1; i++) spike(hand, [i * 0.02, -0.04, 0.01], [i * 0.03, -0.1, 0.03], 0.01, IVORY, 4, NO);
  }
  B.hips.add(G.cyl(0.14, 0.3, 0.46, 9), 0, -0.22, -0.01, robe, 0, 0, 0, 1, 1, 0.85);
  B.hips.add(G.cyl(0.303, 0.303, 0.04, 9), 0, -0.44, -0.01, gold, 0, 0, 0, 1, 1, 0.85, NO);
  B.hips.add(G.box(0.1, 0.44, 0.02), 0, -0.22, 0.2, S, 0.3, 0, 0);
  B.torso.add(G.cyl(0.13, 0.16, 0.36, 8), 0, 0.18, 0, robe, 0, 0, 0, 1, 1, 0.8);
  B.torso.add(G.cyl(0.13, 0.13, 0.03, 8), 0, 0.04, 0, A, 0, 0, 0, 1, 1, 0.82, NO);
  B.torso.add(G.cyl(0.21, 0.17, 0.08, 9), 0, 0.36, 0, gold);
  for (let i = 0; i < 5; i++) {
    const a = -1.1 + (i / 4) * 2.2;
    const b: V3 = [Math.sin(a) * 0.19, 0.38, -Math.cos(a) * 0.14];
    spike(B.torso, b, add3(b, [Math.sin(a) * 0.06, 0.2, -Math.cos(a) * 0.05]), 0.035, gold, 4);
  }
  const h = B.head;
  tube(h, [[0, -0.06, 0], [0, 0.06, 0.02]], [0.05, 0.045], skin, 6);
  ball(h, [0, 0.1, 0], 0.1, skin, [0.9, 1, 1.15], {}, 8, 6);
  tube(h, [[0, 0.11, 0.06], [0, 0.05, 0.2]], [0.065, 0.042], skin, 6);
  h.add(G.box(0.04, 0.02, 0.02), 0, 0.06, 0.205, DARK, 0, 0, 0, 1, 1, 1, NO);
  spike(h, [0, 0.03, 0.12], [0, -0.14, 0.1], 0.045, '#d8d0c0', 5);
  for (const s of [-1, 1]) {
    spike(h, [s * 0.08, 0.13, -0.01], [s * 0.21, 0.06, 0.02], 0.035, skin, 4, {}, [0, 1, 0], 0.4);
    K.glowEye(h, [s * 0.052, 0.13, 0.085], 0.02, [s * 0.5, 0, 1], fire2, 3, [1.4, 0.6, 0.7]);
    tube(h, [[s * 0.045, 0.17, 0.0], [s * 0.09, 0.3, -0.08], [s * 0.12, 0.38, -0.22], [s * 0.1, 0.36, -0.36], [s * 0.07, 0.28, -0.42]], [0.045, 0.04, 0.03, 0.016, 0.0], hornC, 7, {}, 2);
  }
  const crown = K.node(h, 0, 0.22, 0.0);
  K.wiggle(crown, { s: 0.12 }, 2.1);
  for (let i = -1; i <= 1; i++) spike(K.gp(crown, fire2, 2.6), [i * 0.03, 0, 0], [i * 0.04, 0.12 - Math.abs(i) * 0.04, -0.02], 0.025, fire2, 4, GL);
  const jaw = K.bone('jaw', h, 0, 0.06, 0.08);
  tube(jaw, [[0, 0, 0], [0, -0.02, 0.1]], [0.04, 0.03], skin, 6);
  // staff held upright
  const hR = B.handR;
  const up = vec([0, 1, 0.25]).normalize();
  const sb: V3 = add3([0, 0, 0.03], up, -0.4), st: V3 = add3([0, 0, 0.03], up, 0.62);
  tube(hR, [sb, st], [0.018, 0.022], '#2a1a14', 6);
  hR.add(G.torus(0.07, 0.014, 4, 10, PI * 1.3), st[0], st[1] + 0.06, st[2], gold, 0, 0, -PI * 0.15);
  K.glowBall(hR, add3(st, [0, 0.06, 0]), 0.04, fire2, [1, 1, 1], 3, 7, 5);
  const orb = K.node(B.handL, 0, -0.06, 0.08);
  K.wiggle(orb, { s: 0.15, ry: 0.4 }, 1.7);
  K.glowBall(orb, [0, 0, 0], 0.045, fire, [1, 1.3, 1], 2.4, 7, 5);
  spike(K.gp(orb, fire2, 2.6), [0, 0.02, 0], [0, 0.13, 0], 0.03, fire2, 5, GL);
  // flaming wings
  for (const s of [-1, 1]) {
    const w = K.bone(s < 0 ? 'wingR' : 'wingL', B.torso, s * 0.08, 0.32, -0.12, 0, 0, s * 0.35);
    batWing(w, s, 0.6, '#2a1a1a', fire, CLAW, GL, K.gp(w, fire, 1.5));
    const fl = K.node(w);
    K.wiggle(fl, { s: 0.08 }, 2.4, s);
    const sp = 0.6;
    const tips: V3[] = [[s * sp * 1.2, -sp * 0.12, -sp * 0.5], [s * sp * 0.94, -sp * 0.26, -sp * 0.76], [s * sp * 0.56, -sp * 0.22, -sp * 0.76], [s * sp * 0.25, -sp * 0.15, -sp * 0.6]];
    for (const t of tips) spike(K.gp(fl, fire2, 2.4), lerp3(t, [s * sp * 0.5, 0, -sp * 0.4], 0.15), add3(t, [s * 0.02, 0.1, -0.12]), 0.04, fire2, 4, GL);
  }
}

function demonLeo(K: Kit) {
  const { P, S, A, M } = K;
  const fur = P, mane = tone(P, -0.32), robe = S, gold = M, pale = A, eye = '#fff2b0';
  const B = biped(K, { hipY: 0.48, hipX: 0.1, thigh: 0.22, headY: 0.44, shX: 0.25, shY: 0.36, upper: 0.18, fore: 0.17, splay: 0.22 });
  for (const [s, arm, elbow, hand, leg, knee] of limbs(B)) {
    tube(leg, [[0, 0.02, 0], [0, -0.12, 0.05], [0, -0.22, 0.03]], [0.085, 0.078, 0.062], fur, 7);
    tube(knee, [[0, 0, 0.03], [0, -0.12, -0.05], [0, -0.2, -0.02]], [0.058, 0.05, 0.045], fur, 6);
    ball(knee, [0, -0.215, 0.02], 0.06, fur, [1, 0.55, 1.3], {}, 7, 5);
    for (let i = -1; i <= 1; i++) spike(knee, [i * 0.035, -0.225, 0.06], [i * 0.04, -0.245, 0.11], 0.014, CLAW, 4, NO);
    ball(arm, [s * 0.02, 0.02, 0], 0.1, fur, [1, 0.9, 1], {}, 7, 5);
    arm.add(G.hemi(0.13, 9, 4), s * 0.03, 0.03, 0, gold, 0, 0, s * 0.35, 1, 0.8, 1.1);
    tube(arm, [[0, 0, 0], [0, -0.18, 0]], [0.072, 0.062], fur, 7);
    tube(elbow, [[0, 0, 0], [0, -0.16, 0.01]], [0.06, 0.054], fur, 7);
    elbow.add(G.cyl(0.066, 0.072, 0.09, 7), 0, -0.1, 0.005, gold);
    ball(hand, [0, -0.02, 0], 0.062, fur, [1, 1, 1], {}, 7, 5);
  }
  B.hips.add(G.cyl(0.17, 0.26, 0.3, 9), 0, -0.12, 0, robe, 0, 0, 0, 1, 1, 0.82);
  B.hips.add(G.cyl(0.262, 0.262, 0.03, 9), 0, -0.26, 0, gold, 0, 0, 0, 1, 1, 0.82, NO);
  B.hips.add(G.box(0.14, 0.4, 0.02), 0, -0.14, 0.2, pale, 0.18, 0, 0);
  ball(B.torso, [0, 0.2, 0], 0.2, fur, [1.25, 1.05, 0.85], {}, 9, 7);
  B.torso.add(G.cyl(0.18, 0.2, 0.14, 9), 0, 0.05, 0, robe, 0, 0, 0, 1, 1, 0.82);
  slab(B.torso, [-0.18, 0.36, 0.08], [0.1, 0.02, 0.17], 0.07, 0.02, robe, [0, 0, 1]);
  slab(B.torso, [0.18, 0.36, 0.08], [0.02, 0.1, 0.17], 0.07, 0.02, robe, [0, 0, 1]);
  B.torso.add(G.cyl(0.1, 0.1, 0.06, 8), 0, 0.12, 0.0, gold, 0, 0, 0, 1.9, 1, 1.5, NO);
  // halo of spikes (a slowly turning sun-disc behind the head)
  const halo = K.node(B.torso, 0, 0.66, -0.22);
  K.spin(halo, 'rz', 0.25);
  K.gp(halo, pale, 1.8).add(G.torus(0.25, 0.016, 4, 24), 0, 0, 0, pale, 0, 0, 0, 1, 1, 1, GL);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    const r0 = 0.26, len = i % 2 ? 0.12 : 0.2;
    spike(K.gp(halo, pale, 1.8), [Math.sin(a) * r0, Math.cos(a) * r0, 0], [Math.sin(a) * (r0 + len), Math.cos(a) * (r0 + len), 0], 0.03, pale, 4, GL);
  }
  const h = B.head;
  ball(h, [0, 0.1, 0.01], 0.13, fur, [1.05, 1, 1.05], {}, 9, 7);
  ball(h, [0, 0.05, 0.11], 0.08, pale, [1.1, 0.8, 0.9]);
  h.add(G.cone(0.025, 0.03, 3), 0, 0.085, 0.185, DARK, PI + 0.4, 0, 0, 1.3, 1, 0.6, NO);
  h.add(G.box(0.19, 0.03, 0.05), 0, 0.15, 0.1, tone(fur, -0.35), 0.3, 0, 0);
  for (const s of [-1, 1]) {
    K.glowEye(h, [s * 0.055, 0.12, 0.115], 0.02, [s * 0.4, 0, 1], eye, 3, [1.4, 0.6, 0.7]);
    spike(h, [s * 0.03, 0.02, 0.15], [s * 0.032, -0.03, 0.155], 0.012, IVORY, 4, NO);
  }
  for (const [ring, rr, len, z] of [[12, 0.12, 0.17, -0.02], [10, 0.15, 0.2, -0.08]] as Array<[number, number, number, number]>) {
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * PI * 2 + (z < -0.05 ? 0.3 : 0);
      const b: V3 = [Math.sin(a) * rr, 0.1 + Math.cos(a) * rr, z];
      spike(h, b, add3(b, [Math.sin(a) * len, Math.cos(a) * len * 0.9 - 0.02, -0.1]), 0.065, i % 2 ? mane : tone(mane, 0.15), 4);
    }
  }
  const jaw = K.bone('jaw', h, 0, 0.02, 0.08);
  ball(jaw, [0, -0.01, 0.04], 0.055, pale, [1.1, 0.5, 1], {}, 7, 4);
  for (const s of [-1, 1]) spike(jaw, [s * 0.025, 0.0, 0.08], [s * 0.026, 0.035, 0.085], 0.01, IVORY, 4, NO);
  for (const s of [-1, 1]) {
    const w = K.bone(s < 0 ? 'wingR' : 'wingL', B.torso, s * 0.1, 0.34, -0.12, 0, 0, s * 0.4);
    featherWing(w, s, { span: 0.64, col: pale, col2: tone(pale, -0.16), tip: gold, n: 6, sec: 4 });
  }
  const tail = K.bone('tail', B.hips, 0, -0.05, -0.18);
  tube(tail, [[0, 0, 0], [0, -0.1, -0.12], [0.02, -0.2, -0.26], [0.05, -0.2, -0.38]], [0.03, 0.026, 0.022, 0.02], fur, 5, {}, 2);
  ball(tail, [0.05, -0.2, -0.4], 0.045, mane, [1, 1, 1.5], {}, 6, 4);
  // sword of judgement
  const hR = B.handR;
  tube(hR, [[0, -0.03, -0.09], [0, 0.0, 0.05]], [0.02, 0.02], '#3a2a1a', 6);
  slab(hR, [0, 0.0, 0.055], [0, 0.005, 0.075], 0.2, 0.04, gold, [1, 0, 0]);
  const D = vec([0, 0.28, 1]).normalize();
  const b0: V3 = [0, 0.01, 0.08], b1 = add3(b0, D, 0.58);
  slab(hR, b0, b1, 0.085, 0.02, WHITE, [1, 0, 0]);
  spike(hR, b1, add3(b1, D, 0.09), 0.043, WHITE, 4, {}, [1, 0, 0], 0.25);
  slab(K.gp(hR, eye, 2), add3(b0, D, 0.04), b1, 0.02, 0.026, eye, [1, 0, 0], GL);
}

// ---------------------------------------------------------------- seraphs
function seraphGemini(K: Kit) {
  const { P, S, A, M } = K;
  const robe = P, grey = S, pale = mix(A, '#f0f0ff', 0.45), eye = '#b8c8ff';
  const bob = K.float(HOVER.seraph!);
  const torso = K.bone('torso', bob, 0, 0.42, 0);
  torso.add(G.cyl(0.14, 0.28, 0.46, 9), 0, -0.2, 0, robe, 0, 0, 0, 1, 1, 0.85);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    const b: V3 = [Math.sin(a) * 0.25, -0.4, Math.cos(a) * 0.21];
    spike(torso, b, [Math.sin(a) * 0.28, -0.56 + (i % 2) * 0.06, Math.cos(a) * 0.24], 0.07, i % 3 ? robe : grey, 4, {}, [Math.sin(a), 0, Math.cos(a)], 0.35);
  }
  torso.add(G.cyl(0.13, 0.15, 0.24, 8), 0, 0.12, 0, robe, 0, 0, 0, 1, 1, 0.8);
  torso.add(G.cyl(0.12, 0.24, 0.12, 9), 0, 0.22, 0, grey, 0, 0, 0, 1, 1, 0.85);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2;
    const b: V3 = [Math.sin(a) * 0.22, 0.17, Math.cos(a) * 0.19];
    spike(torso, b, add3(b, [Math.sin(a) * 0.03, -0.1, Math.cos(a) * 0.03]), 0.05, grey, 4, NO);
  }
  const tail = K.bone('tail', torso, 0, -0.42, -0.06);
  const wisp = K.node(tail);
  K.wiggle(wisp, { ry: 0.2, rx: 0.08 }, 0.45);
  tube(wisp, [[0, 0.04, 0.04], [0, -0.1, -0.12], [0.03, -0.14, -0.3]], [0.17, 0.09, 0.0], robe, 7, {}, 2);
  const head = K.bone('head', torso, 0, 0.3, 0.01);
  ball(head, [0, 0.1, -0.02], 0.14, robe, [1, 1.08, 1.1], {}, 9, 7);
  spike(head, [0, 0.18, -0.08], [0, 0.3, -0.24], 0.08, robe, 5);
  ball(head, [0, 0.08, 0.05], 0.095, pale, [0.9, 1.05, 0.9], {}, 8, 6);
  ball(head, [0, 0.13, 0.03], 0.115, robe, [1.05, 0.7, 1.05], NO, 8, 5);
  for (const s of [-1, 1]) {
    ball(head, [s * 0.035, 0.09, 0.115], 0.024, VOID, [1.1, 1, 0.5], NO, 5, 4);
    K.glowBall(head, [s * 0.035, 0.089, 0.124], 0.011, eye, [1, 1, 1], 3.2, 5, 4);
  }
  head.add(G.box(0.04, 0.012, 0.01), 0, 0.03, 0.125, VOID, 0, 0, 0, 1, 1, 1, NO);
  const jaw = K.bone('jaw', head, 0, 0.03, 0.07);
  jaw.add(G.box(0.07, 0.03, 0.05), 0, -0.02, 0.0, pale);
  const halo = K.node(head, 0, 0.32, -0.06, -0.35, 0, 0.2);
  K.spin(halo, 'ry', 0.3);
  halo.add(G.torus(0.13, 0.014, 3, 16, PI * 1.6), 0, 0, 0, M, PI / 2, 0, 0);
  K.gp(halo, eye, 1.4).add(G.torus(0.13, 0.006, 3, 16, PI * 0.9), 0, -0.004, 0, eye, PI / 2, 0, 0.5, 1, 1, 1, GL);
  for (const s of [-1, 1]) {
    const arm = K.bone(s < 0 ? 'armR' : 'armL', torso, s * 0.15, 0.22, 0, 0, 0, s * 0.25);
    tube(arm, [[0, 0, 0], [0, -0.15, 0]], [0.05, 0.045], robe, 6);
    const el = K.bone(s < 0 ? 'elbowR' : 'elbowL', arm, 0, -0.15, 0, -0.4, 0, 0);
    el.add(G.cyl(0.045, 0.08, 0.15, 7), 0, -0.07, 0, robe);
    tube(el, [[0, -0.1, 0], [0, -0.17, 0.01]], [0.018, 0.016], pale, 4);
    const hd = K.bone(s < 0 ? 'handR' : 'handL', el, 0, -0.17, 0.01);
    for (let i = -1; i <= 1; i++) tube(hd, [[i * 0.015, 0, 0], [i * 0.022, -0.05, 0.02], [i * 0.022, -0.08, 0.0]], [0.009, 0.007, 0.0], pale, 4);
  }
  const hR = K.bones.handR!;
  const hRp = K.node(hR);
  const up = vec([0, 1, 0.3]).normalize();
  const top = add3([0, 0, 0.02], up, 0.72);
  tube(hRp, [add3([0, 0, 0.02], up, -0.36), top], [0.016, 0.016], M, 5);
  const Fw = vec([0, -0.25, 1]).normalize();
  const bp = (a: number, b: number): V3 => add3(add3(top, up, b), Fw, a);
  membrane(hRp, [bp(-0.03, 0.02), bp(0.12, 0.05), bp(0.3, 0.0), bp(0.44, -0.12), bp(0.28, -0.06), bp(0.12, -0.04), bp(-0.02, -0.04)], grey, 0.014, bp(0.12, 0.0));
  seg(K.gp(hRp, eye, 1.8), bp(0.1, -0.035), bp(0.4, -0.1), 0.006, 0.004, eye, 4, GL);
  for (const s of [-1, 1]) {
    const w = K.bone(s < 0 ? 'wingR' : 'wingL', torso, s * 0.08, 0.2, -0.1, 0, 0, s * 0.45);
    featherWing(w, s, { span: 0.7, col: robe, col2: tone(robe, 0.12), tip: grey, n: 6, sec: 4, droop: 0.2 });
  }
}

function seraphVirgo(K: Kit) {
  const { P, S, A, M } = K;
  const white = P, crim = S, gold = A, face = M, hair = tone(P, -0.04);
  const bob = K.float(HOVER.seraph!);
  const torso = K.bone('torso', bob, 0, 0.4, 0);
  torso.add(G.cyl(0.12, 0.3, 0.5, 10), 0, -0.23, 0, white, 0, 0, 0, 1, 1, 0.9);
  torso.add(G.cyl(0.302, 0.315, 0.05, 10), 0, -0.47, 0, crim, 0, 0, 0, 1, 1, 0.9);
  torso.add(G.cyl(0.125, 0.125, 0.05, 8), 0, 0.02, 0, crim, 0, 0, 0, 1, 1, 0.85);
  slab(torso, [0.04, 0.0, 0.1], [0.07, -0.3, 0.16], 0.04, 0.01, crim, [0, 0, 1]);
  torso.add(G.cyl(0.1, 0.12, 0.2, 8), 0, 0.13, 0, white, 0, 0, 0, 1, 1, 0.8);
  torso.add(G.torus(0.09, 0.016, 4, 12), 0, 0.23, 0, gold, PI / 2, 0, 0, 1.1, 0.9, 1, NO);
  const tail = K.bone('tail', torso, 0, -0.45, -0.1);
  const train = K.node(tail);
  K.wiggle(train, { ry: 0.15, rx: 0.06 }, 0.4);
  tube(train, [[0, 0.05, 0.04], [0, -0.06, -0.12], [0.02, -0.1, -0.32]], [0.2, 0.12, 0.0], white, 8, {}, 2);
  const head = K.bone('head', torso, 0, 0.26, 0);
  tube(head, [[0, -0.02, 0], [0, 0.05, 0]], [0.035, 0.035], face, 6);
  ball(head, [0, 0.12, 0.01], 0.1, face, [0.9, 1.1, 0.95], {}, 9, 7);
  for (const s of [-1, 1]) head.add(G.box(0.04, 0.008, 0.01), s * 0.035, 0.125, 0.098, '#6a5a5a', 0, 0, s * 0.15, 1, 1, 1, NO);
  K.gp(head, crim, 2.2).add(G.oct(0.014), 0, 0.17, 0.092, crim, 0, 0, 0, 1, 1.6, 0.6, GL);
  ball(head, [0, 0.15, -0.02], 0.11, hair, [1.02, 1, 1.05], {}, 9, 7);
  head.add(G.box(0.2, 0.26, 0.05), 0, 0.05, -0.09, hair, 0.1, 0, 0);
  for (const s of [-1, 1]) tube(head, [[s * 0.08, 0.12, -0.04], [s * 0.1, -0.02, -0.05], [s * 0.08, -0.16, -0.08]], [0.03, 0.025, 0.0], hair, 5, {}, 2);
  head.add(G.torus(0.1, 0.012, 4, 14), 0, 0.17, 0.0, gold, PI / 2 - 0.15, 0, 0, 1, 1, 1, NO);
  const jaw = K.bone('jaw', head, 0, 0.07, 0.08);
  jaw.add(G.box(0.03, 0.008, 0.01), 0, 0, 0.005, crim, 0, 0, 0, 1, 1, 1, NO);
  const halo = K.node(head, 0, 0.16, -0.14);
  K.spin(halo, 'rz', 0.4);
  K.gp(halo, gold, 2.2).add(G.torus(0.21, 0.014, 4, 24), 0, 0, 0, gold, 0, 0, 0, 1, 1, 1, GL);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    K.gp(halo, gold, 2.2).add(G.oct(0.022), Math.sin(a) * 0.21, Math.cos(a) * 0.21, 0, gold, 0, 0, -a, 1, 2, 0.6, GL);
  }
  for (const s of [-1, 1]) {
    const arm = K.bone(s < 0 ? 'armR' : 'armL', torso, s * 0.13, 0.2, 0, 0, 0, s * 0.4);
    tube(arm, [[0, 0, 0], [0, -0.14, 0]], [0.035, 0.03], white, 6);
    const el = K.bone(s < 0 ? 'elbowR' : 'elbowL', arm, 0, -0.14, 0, -0.5, 0, 0);
    el.add(G.cyl(0.03, 0.075, 0.15, 8), 0, -0.07, 0, white);
    el.add(G.cyl(0.076, 0.076, 0.02, 8), 0, -0.145, 0, crim, 0, 0, 0, 1, 1, 1, NO);
    const hd = K.bone(s < 0 ? 'handR' : 'handL', el, 0, -0.16, 0);
    ball(hd, [0, -0.02, 0.01], 0.03, face, [0.8, 1.3, 0.6], {}, 6, 4);
  }
  for (const s of [-1, 1]) {
    const w = K.bone(s < 0 ? 'wingR' : 'wingL', torso, s * 0.08, 0.2, -0.1, 0, 0, s * 0.5);
    featherWing(w, s, { span: 0.62, col: white, col2: tone(white, -0.1), tip: crim, n: 6, sec: 4 });
    const lw = K.node(torso, s * 0.07, 0.04, -0.1, 0, 0, -s * 0.3);
    K.follow(lw, w.obj, 0.6);
    featherWing(lw, s, { span: 0.44, col: white, col2: tone(white, -0.1), tip: crim, n: 5, sec: 3, droop: 0.25 });
  }
}

function seraphTrue(K: Kit) {
  const { P, S, A, M } = K;
  const crim = P, deep = S, gold = A, metal = M, core = '#fff0b8';
  const bob = K.float(HOVER.seraph!);
  const torso = K.bone('torso', bob, 0, 0.55, 0);
  tube(torso, [[0, -0.02, 0], [0, -0.22, -0.03], [0, -0.4, 0.02], [0, -0.55, 0.06]], [0.17, 0.12, 0.06, 0.0], crim, 8, {}, 2);
  for (const [y, r] of [[-0.12, 0.15], [-0.28, 0.11], [-0.42, 0.07]]) torso.add(G.torus(r, 0.02, 4, 12), 0, y, 0.0, metal, PI / 2 + 0.1, 0, 0, 1, 1, 1, NO);
  ball(torso, [0, 0.15, 0], 0.2, crim, [1.2, 1.1, 0.85], {}, 10, 8);
  for (let i = 0; i < 3; i++) torso.add(G.torus(0.2 - i * 0.02, 0.016, 3, 12, PI), 0, 0.08 + i * 0.07, 0.0, metal, 0, 0, PI, 1.15, 0.5 + i * 0.08, 1, NO);
  K.glowBall(torso, [0, 0.16, 0.14], 0.075, core, [1, 1, 1], 3.2, 9, 7);
  torso.add(G.torus(0.1, 0.02, 4, 14), 0, 0.16, 0.15, metal, 0, 0, 0);
  const cr = K.node(torso, 0, 0.16, 0.16);
  K.spin(cr, 'rz', 1.2);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2;
    spike(cr, [Math.sin(a) * 0.1, Math.cos(a) * 0.1, 0], [Math.sin(a) * 0.17, Math.cos(a) * 0.17, 0.03], 0.02, gold, 4);
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const b: V3 = [s * 0.12, 0.3 - i * 0.05, -0.12];
      spike(torso, b, add3(b, [s * (0.18 + i * 0.1), 0.34 - i * 0.12, -0.2]), 0.04, metal, 5);
    }
  }
  spike(torso, [0, 0.3, -0.14], [0, 0.72, -0.3], 0.045, metal, 5);
  const head = K.bone('head', torso, 0, 0.36, 0.02);
  tube(head, [[0, -0.06, 0], [0, 0.06, 0]], [0.06, 0.05], crim, 6);
  ball(head, [0, 0.12, 0], 0.11, metal, [0.9, 1.2, 1], {}, 9, 7);
  K.gp(head, core, 3.4).add(G.box(0.022, 0.1, 0.02), 0, 0.12, 0.098, core, 0, 0, 0, 1, 1, 1, GL);
  for (let i = 0; i < 7; i++) {
    const a = -0.9 + (i / 6) * 1.8;
    const b: V3 = [Math.sin(a) * 0.08, 0.2 + Math.cos(a) * 0.04, -0.02];
    spike(head, b, add3(b, [Math.sin(a) * 0.14, 0.14 + Math.cos(a) * 0.12 - Math.abs(a) * 0.05, -0.04]), 0.025, gold, 4);
  }
  const jaw = K.bone('jaw', head, 0, 0.05, 0.06);
  jaw.add(G.box(0.1, 0.04, 0.05), 0, -0.01, 0.01, tone(metal, -0.2));
  for (const [rx, ry, sp] of [[0, 0, 0.3], [0, PI / 2, -0.22]] as V3[]) {
    const ring = K.node(head, 0, 0.13, -0.12, rx, ry, 0);
    K.spin(ring, 'rz', sp);
    K.gp(ring, gold, 2.2).add(G.torus(0.26, 0.012, 3, 24), 0, 0, 0, gold, 0, 0, 0, 1, 1, 1, GL);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      K.gp(ring, gold, 2.2).add(G.oct(0.02), Math.sin(a) * 0.26, Math.cos(a) * 0.26, 0, gold, 0, 0, -a, 1, 2, 0.6, GL);
    }
  }
  for (const s of [-1, 1]) {
    const arm = K.bone(s < 0 ? 'armR' : 'armL', torso, s * 0.26, 0.26, 0, 0, 0, s * 0.3);
    arm.add(G.hemi(0.1, 8, 4), s * 0.02, 0.02, 0, metal, 0, 0, s * 0.4, 1, 0.9, 1.1);
    spike(arm, [s * 0.05, 0.06, 0], [s * 0.14, 0.24, -0.04], 0.03, gold, 4);
    tube(arm, [[0, 0, 0], [0, -0.2, 0]], [0.055, 0.045], crim, 6);
    const el = K.bone(s < 0 ? 'elbowR' : 'elbowL', arm, 0, -0.2, 0, -0.5, 0, 0);
    tube(el, [[0, 0, 0], [0, -0.18, 0.0]], [0.045, 0.05], deep, 6);
    el.add(G.cyl(0.055, 0.065, 0.13, 7), 0, -0.1, 0, metal);
    const hd = K.bone(s < 0 ? 'handR' : 'handL', el, 0, -0.19, 0);
    ball(hd, [0, 0, 0], 0.045, metal, [1, 1, 1], {}, 6, 4);
    for (let i = -1; i <= 1; i++) tube(hd, [[i * 0.03, -0.02, 0.01], [i * 0.04, -0.12, 0.05], [i * 0.035, -0.2, 0.03]], [0.014, 0.01, 0.0], gold, 4);
  }
  for (const s of [-1, 1]) {
    const w = K.bone(s < 0 ? 'wingR' : 'wingL', torso, s * 0.1, 0.3, -0.12, 0, 0, s * 0.55);
    featherWing(w, s, { span: 0.74, col: crim, col2: deep, tip: gold, n: 6, sec: 4 });
    const mw = K.node(torso, s * 0.1, 0.18, -0.13, 0, 0, s * 0.08);
    K.follow(mw, w.obj, 0.8);
    featherWing(mw, s, { span: 0.64, col: crim, col2: deep, tip: gold, n: 5, sec: 3 });
    const lw = K.node(torso, s * 0.09, 0.04, -0.11, 0, 0, -s * 0.38);
    K.follow(lw, w.obj, 0.6);
    featherWing(lw, s, { span: 0.5, col: crim, col2: deep, tip: gold, n: 5, sec: 3, droop: 0.25 });
  }
}

// ---------------------------------------------------------------------------
const BUILDERS: Record<MonsterShape, (K: Kit) => void> = {
  chocobo, goblin, bomb, panther, boar, skeleton, ghost, eye, treant, minotaur, malboro, behemoth, dragon, hydra,
  bird, squid, bull, wolf, golem, automaton, tome, serpent,
  demon: (K) => [demonAries, demonScorpio, demonCapricorn, demonLeo][Math.max(0, Math.min(3, (K.v || 1) - 1))](K),
  seraph: (K) => [seraphGemini, seraphVirgo, seraphTrue][Math.max(0, Math.min(2, (K.v || 1) - 1))](K),
};

/** Build a rigged, outlined monster model for a MonsterLook. */
export function buildMonster(look: MonsterLook, opts: { team?: number } = {}): UnitModel {
  const K = new Kit(look);
  (BUILDERS[look.shape] ?? goblin)(K);
  void opts.team;
  return K.finish(monsterHeight(look));
}
