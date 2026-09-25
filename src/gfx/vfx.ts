// Visual effects: pooled billboard particles (additive + alpha) and transient
// meshes (rings, pillars, glyphs, bolts, beams, shards, meteors). Recipes cover
// every VfxId referenced by ability data.
import { THREE } from './three';
import type { VfxId, Weather } from '../data/types';
import { rinfo } from './renderer';
import type { Scene, Camera, InstancedMesh, Vector3, Object3D, Material, Texture } from 'three/webgpu';
import { markShared, releaseTree } from './dispose';

interface P {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  life: number; max: number; s0: number; s1: number;
  r0: number; g0: number; b0: number; r1: number; g1: number; b1: number;
  grav: number; drag: number; stretch: number; spin: number; rot: number;
}

function softTexture(kind: 'soft' | 'spark' | 'ring' | 'glyph' | 'streak' | 'note' | 'flake' | 'leaf'): Texture {
  const c = document.createElement('canvas');
  const S = kind === 'glyph' ? 256 : 64;
  c.width = c.height = S;
  const x = c.getContext('2d')!;
  const cx = S / 2;
  if (kind === 'soft') {
    const g = x.createRadialGradient(cx, cx, 0, cx, cx, cx);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
  } else if (kind === 'spark') {
    const g = x.createRadialGradient(cx, cx, 0, cx, cx, cx);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.15, 'rgba(255,255,255,0.9)'); g.addColorStop(0.4, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(cx, 4); x.lineTo(cx, S - 4); x.moveTo(4, cx); x.lineTo(S - 4, cx); x.stroke();
  } else if (kind === 'ring') {
    x.strokeStyle = 'white'; x.lineWidth = 5; x.shadowColor = 'white'; x.shadowBlur = 8;
    x.beginPath(); x.arc(cx, cx, cx - 8, 0, Math.PI * 2); x.stroke();
  } else if (kind === 'glyph') {
    x.strokeStyle = 'white'; x.shadowColor = 'white'; x.shadowBlur = 6;
    x.lineWidth = 3; x.beginPath(); x.arc(cx, cx, cx - 6, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 2; x.beginPath(); x.arc(cx, cx, cx - 22, 0, Math.PI * 2); x.stroke();
    x.beginPath();
    for (let i = 0; i <= 12; i++) { const a = (i * 5 * Math.PI * 2) / 12; const px = cx + Math.cos(a) * (cx - 24), py = cx + Math.sin(a) * (cx - 24); i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.stroke();
    x.font = 'bold 16px serif'; x.fillStyle = 'white'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const glyphs = '♈♉♊♋♌♍♎♏♐♑♒♓';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x.fillText(glyphs[i], cx + Math.cos(a) * (cx - 14), cx + Math.sin(a) * (cx - 14)); }
  } else if (kind === 'streak') {
    const g = x.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(cx - 3, 0, 6, S);
  } else if (kind === 'note') {
    x.fillStyle = 'white'; x.font = 'bold 48px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('♪', cx, cx);
  } else if (kind === 'flake') {
    x.strokeStyle = 'white'; x.lineWidth = 3;
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; x.beginPath(); x.moveTo(cx + Math.cos(a) * 26, cx + Math.sin(a) * 26); x.lineTo(cx - Math.cos(a) * 26, cx - Math.sin(a) * 26); x.stroke(); }
  } else if (kind === 'leaf') {
    x.fillStyle = 'white'; x.beginPath(); x.ellipse(cx, cx, 24, 11, 0.6, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

class Pool {
  readonly mesh: InstancedMesh;
  readonly ps: P[] = [];
  readonly cap: number;
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private col = new THREE.Color();
  private spinQ = new THREE.Quaternion();
  private zAxis = new THREE.Vector3(0, 0, 1); // (THREE is only bound at runtime: no module-level three objects)
  private lastN = -1;
  constructor(scene: Scene, cap: number, tex: Texture, additive: boolean) {
    this.cap = cap;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false, side: THREE.DoubleSide, fog: false });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    for (let i = 0; i < cap; i++) this.mesh.setColorAt(i, new THREE.Color(0, 0, 0));
    this.mesh.count = 0;
    scene.add(this.mesh);
  }
  spawn(p: Partial<P> & { x: number; y: number; z: number }) {
    if (this.ps.length >= this.cap) this.ps.pop(); // full: drop one (order doesn't matter; shift() is O(n))
    this.ps.push({ vx: 0, vy: 0, vz: 0, life: 0, max: 1, s0: 0.2, s1: 0.0, r0: 1, g0: 1, b0: 1, r1: 1, g1: 1, b1: 1, grav: 0, drag: 0, stretch: 0, spin: 0, rot: 0, ...p } as P);
  }
  update(dt: number, cam: Camera) {
    let n = 0;
    const camQ = cam.quaternion;
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i];
      p.life += dt;
      if (p.life >= p.max) { this.ps[i] = this.ps[this.ps.length - 1]; this.ps.pop(); i--; continue; } // swap-remove
      p.vy -= p.grav * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vy *= d; p.vz *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.rot += p.spin * dt;
      const t = p.life / p.max;
      const size = p.s0 + (p.s1 - p.s0) * t;
      const fadeIn = Math.min(1, t * 8), fadeOut = t > 0.7 ? (1 - t) / 0.3 : 1;
      const a = fadeIn * fadeOut;
      this.q.copy(camQ);
      if (p.spin) this.q.multiply(this.spinQ.setFromAxisAngle(this.zAxis, p.rot));
      let sy = size;
      if (p.stretch) {
        const sp = Math.hypot(p.vx, p.vy, p.vz);
        sy = size + sp * p.stretch;
      }
      this.s.set(size, sy, size);
      this.v.set(p.x, p.y, p.z);
      this.m4.compose(this.v, this.q, this.s);
      this.mesh.setMatrixAt(n, this.m4);
      this.col.setRGB((p.r0 + (p.r1 - p.r0) * t) * a, (p.g0 + (p.g1 - p.g0) * t) * a, (p.b0 + (p.b1 - p.b0) * t) * a);
      this.mesh.setColorAt(n, this.col);
      n++;
    }
    this.mesh.count = n;
    this.mesh.visible = n > 0;
    // idle pools upload nothing; busy ones only their live range
    if (n === 0 && this.lastN === 0) return;
    this.lastN = n;
    const im = this.mesh.instanceMatrix as typeof this.mesh.instanceMatrix & { clearUpdateRanges?: () => void; addUpdateRange?: (s: number, c: number) => void };
    im.clearUpdateRanges?.(); if (n) im.addUpdateRange?.(0, n * 16);
    im.needsUpdate = true;
    const ic = this.mesh.instanceColor as (typeof im) | null;
    if (ic) { ic.clearUpdateRanges?.(); if (n) ic.addUpdateRange?.(0, n * 3); ic.needsUpdate = true; }
  }
  dispose() { this.mesh.removeFromParent(); releaseTree(this.mesh); }
}

interface Transient { obj: Object3D; life: number; max: number; tick: (t: number, dt: number, o: Object3D) => void }

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export class Vfx {
  readonly scene: Scene;
  private add: Pool;
  private sparks: Pool;
  private notes: Pool;
  private flakes: Pool;
  private leaves: Pool;
  private dust: Pool;
  private transients: Transient[] = [];
  private tex: Record<string, Texture> = {};
  private weather: Weather = 'none';
  private weatherAcc = 0;
  private bounds = { w: 12, d: 12, top: 6 };
  budget: number;
  /** called for screen flashes & shakes */
  onFlash: (color: string, amt: number) => void = () => {};
  onShake: (amp: number, t: number) => void = () => {};

  constructor(scene: Scene) {
    this.scene = scene;
    this.budget = rinfo?.settings.particles ?? 1;
    const cap = (n: number) => Math.max(64, Math.floor(n * this.budget));
    // owned by this Vfx (freed in dispose); flagged shared so short-lived effects using them don't free them
    const own = (t: Texture) => { this.ownTex.push(t); return markShared(t); };
    this.tex.soft = own(softTexture('soft'));
    this.tex.spark = own(softTexture('spark'));
    this.tex.ring = own(softTexture('ring'));
    this.tex.glyph = own(softTexture('glyph'));
    this.tex.streak = own(softTexture('streak'));
    this.add = new Pool(scene, cap(3000), this.tex.soft, true);
    this.sparks = new Pool(scene, cap(1200), this.tex.spark, true);
    this.notes = new Pool(scene, cap(120), own(softTexture('note')), true);
    this.flakes = new Pool(scene, cap(900), own(softTexture('flake')), true);
    this.leaves = new Pool(scene, cap(300), own(softTexture('leaf')), false);
    this.dust = new Pool(scene, cap(1400), this.tex.streak, true);
  }
  private ownTex: Texture[] = [];

  setBounds(w: number, d: number, top: number) { this.bounds = { w, d, top }; }
  setWeather(w: Weather) { this.weather = w; }

  update(dt: number, cam: Camera) {
    this.ambient(dt);
    this.add.update(dt, cam); this.sparks.update(dt, cam); this.notes.update(dt, cam); this.flakes.update(dt, cam); this.leaves.update(dt, cam); this.dust.update(dt, cam);
    for (let i = 0; i < this.transients.length; i++) {
      const tr = this.transients[i];
      tr.life += dt;
      const t = Math.min(1, tr.life / tr.max);
      tr.tick(t, dt, tr.obj);
      if (tr.life >= tr.max) {
        this.scene.remove(tr.obj);
        releaseTree(tr.obj);
        this.transients.splice(i, 1); i--;
      }
    }
  }

  private ambient(dt: number) {
    const w = this.weather;
    if (w === 'none') return;
    const { w: W, d: D, top } = this.bounds;
    const rate = { rain: 260, snow: 70, fog: 6, sand: 90, ash: 30, leaves: 6, embers: 26, motes: 20 }[w] ?? 0;
    this.weatherAcc += dt * rate * this.budget;
    while (this.weatherAcc >= 1) {
      this.weatherAcc -= 1;
      const x = rand(-W / 2 - 2, W / 2 + 2), z = rand(-D / 2 - 2, D / 2 + 2);
      switch (w) {
        case 'rain': this.dust.spawn({ x, y: top + 6, z, vx: -1.5, vy: -18, vz: -0.6, max: 0.6, s0: 0.035, s1: 0.035, stretch: 0.045, r0: 0.45, g0: 0.5, b0: 0.6, r1: 0.45, g1: 0.5, b1: 0.6 }); break;
        case 'snow': this.flakes.spawn({ x, y: top + 5, z, vx: rand(-0.3, 0.3), vy: -rand(0.5, 1.0), vz: rand(-0.3, 0.3), max: 9, s0: 0.08, s1: 0.06, spin: rand(-1, 1), r0: 0.9, g0: 0.95, b0: 1, r1: 0.9, g1: 0.95, b1: 1 }); break;
        case 'sand': this.add.spawn({ x: -W / 2 - 3, y: rand(0, top), z, vx: rand(4, 7), vy: rand(-0.2, 0.3), vz: rand(-0.5, 0.5), max: 3.5, s0: 0.5, s1: 0.9, r0: 0.25, g0: 0.19, b0: 0.1, r1: 0.1, g1: 0.08, b1: 0.04 }); break;
        case 'ash': this.add.spawn({ x, y: top + 3, z, vx: rand(-0.2, 0.2), vy: -rand(0.2, 0.5), vz: rand(-0.2, 0.2), max: 10, s0: 0.05, s1: 0.04, r0: 0.25, g0: 0.24, b0: 0.24, r1: 0.1, g1: 0.1, b1: 0.1 }); break;
        case 'embers': this.sparks.spawn({ x, y: rand(0, 1), z, vx: rand(-0.3, 0.3), vy: rand(0.6, 1.4), vz: rand(-0.3, 0.3), max: rand(3, 6), s0: 0.08, s1: 0.02, r0: 1.6, g0: 0.6, b0: 0.15, r1: 0.8, g1: 0.1, b1: 0 }); break;
        case 'motes': this.add.spawn({ x, y: rand(0, top), z, vx: rand(-0.1, 0.1), vy: rand(0.05, 0.2), vz: rand(-0.1, 0.1), max: rand(4, 8), s0: 0.09, s1: 0.03, r0: 0.9, g0: 0.8, b0: 1.3, r1: 0.4, g1: 0.3, b1: 0.8 }); break;
        case 'fog': this.add.spawn({ x, y: rand(0.2, 1.5), z, vx: rand(0.1, 0.3), vy: 0, vz: rand(-0.1, 0.1), max: 12, s0: 3.5, s1: 5, r0: 0.07, g0: 0.075, b0: 0.08, r1: 0.05, g1: 0.05, b1: 0.06 }); break;
        case 'leaves': this.leaves.spawn({ x, y: top + 2, z, vx: rand(0.2, 0.8), vy: -rand(0.3, 0.6), vz: rand(-0.3, 0.3), max: 10, s0: 0.1, s1: 0.1, spin: rand(-2, 2), r0: 0.6, g0: 0.45, b0: 0.12, r1: 0.5, g1: 0.3, b1: 0.1 }); break;
      }
    }
  }

  private addTransient(obj: Object3D, max: number, tick: Transient['tick']) {
    this.scene.add(obj);
    this.transients.push({ obj, life: 0, max, tick });
  }

  // ---------------------------------------------------------------- primitives
  burst(at: Vector3, color: string, n = 30, speed = 2, size = 0.25, life = 0.7, opts: { up?: number; grav?: number; pool?: 'add' | 'sparks'; spread?: number } = {}) {
    const c = new THREE.Color(color);
    const pool = opts.pool === 'sparks' ? this.sparks : this.add;
    const count = Math.floor(n * this.budget);
    for (let i = 0; i < count; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(rand(-1, 1));
      const sp = speed * rand(0.4, 1);
      pool.spawn({
        x: at.x + rand(-0.05, 0.05) * (opts.spread ?? 1), y: at.y, z: at.z + rand(-0.05, 0.05) * (opts.spread ?? 1),
        vx: Math.sin(ph) * Math.cos(th) * sp, vy: Math.abs(Math.cos(ph)) * sp * (opts.up ?? 1), vz: Math.sin(ph) * Math.sin(th) * sp,
        max: life * rand(0.7, 1.2), s0: size, s1: size * 0.2, r0: c.r * 1.6, g0: c.g * 1.6, b0: c.b * 1.6, r1: c.r * 0.5, g1: c.g * 0.5, b1: c.b * 0.5,
        grav: opts.grav ?? 0, drag: 2,
      });
    }
  }

  rise(at: Vector3, color: string, n = 24, height = 1.6, radius = 0.45, life = 1.2, size = 0.12) {
    const c = new THREE.Color(color);
    for (let i = 0; i < Math.floor(n * this.budget); i++) {
      const a = Math.random() * Math.PI * 2, r = radius * Math.sqrt(Math.random());
      this.sparks.spawn({ x: at.x + Math.cos(a) * r, y: at.y + rand(0, 0.3), z: at.z + Math.sin(a) * r, vx: 0, vy: height / life * rand(0.6, 1.2), vz: 0, max: life * rand(0.6, 1), s0: size, s1: size * 0.3, r0: c.r * 1.8, g0: c.g * 1.8, b0: c.b * 1.8, r1: c.r, g1: c.g, b1: c.b });
    }
  }

  ring(at: Vector3, color: string, r0 = 0.2, r1 = 1.4, life = 0.6, y = 0.05, vertical = false) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.tex.ring, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
    m.position.set(at.x, at.y + y, at.z);
    if (!vertical) m.rotation.x = -Math.PI / 2;
    this.addTransient(m, life, (t, dt, o: any) => { const s = (r0 + (r1 - r0) * Math.sqrt(t)) * 2; o.scale.set(s, s, s); o.material.opacity = 1 - t; });
  }

  glyph(at: Vector3, color: string, size = 1.6, life = 1.4) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.tex.glyph, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.position.set(at.x, at.y + 0.04, at.z);
    m.rotation.x = -Math.PI / 2;
    this.addTransient(m, life, (t, dt, o: any) => { const s = size * (t < 0.2 ? t / 0.2 : 1); o.scale.set(s, s, s); o.rotation.z += dt * 0.8; o.material.opacity = t > 0.75 ? (1 - t) / 0.25 : 1; });
  }

  pillar(at: Vector3, color: string, radius = 0.45, height = 5, life = 0.9) {
    const g = new THREE.CylinderGeometry(radius, radius, height, 16, 1, true);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide, opacity: 0.7 }));
    m.position.set(at.x, at.y + height / 2, at.z);
    this.addTransient(m, life, (t, dt, o: any) => { const s = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) * 0.8; o.scale.set(s, 1, s); o.material.opacity = 0.75 * (1 - t); });
  }

  bolt(from: Vector3, to: Vector3, color = '#cfe4ff', life = 0.35, width = 0.06) {
    const pts: Vector3[] = [];
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const p = from.clone().lerp(to, i / n);
      if (i > 0 && i < n) { p.x += rand(-0.25, 0.25); p.z += rand(-0.25, 0.25); p.y += rand(-0.1, 0.1); }
      pts.push(p);
    }
    const grp = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = a.distanceTo(b);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(width, width, len, 4), mat);
      seg.position.copy(a).lerp(b, 0.5);
      seg.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
      grp.add(seg);
    }
    this.addTransient(grp, life, (t, dt, o: any) => { mat.opacity = t < 0.5 ? 1 : (1 - t) * 2; o.visible = Math.random() > 0.15; });
    this.burst(to, color, 18, 3, 0.2, 0.4, { pool: 'sparks' });
  }

  beam(from: Vector3, to: Vector3, color: string, width = 0.15, life = 0.6) {
    const len = from.distanceTo(to);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(width, width, len, 10, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
    m.position.copy(from).lerp(to, 0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), to.clone().sub(from).normalize());
    this.addTransient(m, life, (t, dt, o: any) => { const s = t < 0.1 ? t / 0.1 : 1 - t; o.scale.set(s, 1, s); o.material.opacity = 1 - t; });
  }

  shards(at: Vector3, color: string, n = 8, size = 0.35, life = 1.1) {
    const grp = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.2 });
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(size * 0.25, size * rand(1, 2), 4), mat);
      const a = (i / n) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25);
      s.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
      grp.add(s);
    }
    grp.position.copy(at);
    this.addTransient(grp, life, (t, dt, o: any) => { const k = t < 0.2 ? t / 0.2 : 1; o.scale.set(k, k, k); mat.opacity = t > 0.7 ? (1 - t) / 0.3 * 0.85 : 0.85; });
  }

  rocks(at: Vector3, color = '#8a7a64', n = 10, life = 1.1) {
    const grp = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
    const bits: Array<{ m: any; v: Vector3 }> = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.06, 0.16), 0), mat);
      m.position.set(rand(-0.4, 0.4), 0, rand(-0.4, 0.4));
      grp.add(m);
      bits.push({ m, v: V(rand(-1, 1), rand(2.5, 4.5), rand(-1, 1)) });
    }
    grp.position.copy(at);
    this.addTransient(grp, life, (t, dt) => { for (const b of bits) { b.v.y -= 9.8 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.x += dt * 5; if (b.m.position.y < 0) { b.m.position.y = 0; b.v.set(0, 0, 0); } } });
    this.onShake(0.25, 0.5);
  }

  /** travelling projectile; resolves on arrival */
  projectile(from: Vector3, to: Vector3, kind: 'arrow' | 'bullet' | 'stone' | 'shuriken' | 'orb', color = '#ffffff', speed = 14, arc = 0.8): Promise<void> {
    return new Promise((resolve) => {
      let obj: Object3D;
      if (kind === 'arrow') {
        const g = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4), new THREE.MeshStandardMaterial({ color: '#8a6a44' }));
        shaft.rotation.x = Math.PI / 2;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), new THREE.MeshStandardMaterial({ color: '#c8ccd4' }));
        tip.rotation.x = Math.PI / 2; tip.position.z = 0.28;
        g.add(shaft, tip);
        obj = g;
      } else if (kind === 'stone') obj = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ color: '#8a8478', flatShading: true }));
      else if (kind === 'shuriken') obj = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), new THREE.MeshStandardMaterial({ color: '#c8ccd4', metalness: 0.8, roughness: 0.3 }));
      else obj = new THREE.Mesh(new THREE.SphereGeometry(kind === 'bullet' ? 0.04 : 0.12, 8, 6), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
      const dist = from.distanceTo(to);
      const dur = Math.max(0.12, dist / speed);
      const h = kind === 'bullet' ? 0 : arc * dist * 0.15;
      const prev = from.clone();
      this.addTransient(obj, dur, (t, dt, o) => {
        const p = from.clone().lerp(to, t);
        p.y += Math.sin(t * Math.PI) * h;
        o.position.copy(p);
        if (kind === 'arrow' || kind === 'bullet') o.lookAt(p.clone().add(p.clone().sub(prev)));
        if (kind === 'shuriken') { o.rotation.y += dt * 30; }
        if (kind === 'orb') this.add.spawn({ x: p.x, y: p.y, z: p.z, max: 0.3, s0: 0.25, s1: 0, r0: 1.5, g0: 1.2, b0: 1.2, r1: 0.5, g1: 0.3, b1: 0.3 });
        prev.copy(p);
        if (t >= 1) resolve();
      });
      if (kind === 'bullet') { this.burst(from, '#ffd080', 10, 2, 0.15, 0.2, { pool: 'sparks' }); this.onFlash('#fff2c0', 0.08); }
    });
  }

  /** a persistent charging aura; returns stop() */
  chargeAura(at: () => Vector3, color: string): () => void {
    let alive = true;
    const c = new THREE.Color(color);
    const tick = () => {
      if (!alive) return;
      const p = at();
      for (let i = 0; i < Math.ceil(2 * this.budget); i++) {
        const a = Math.random() * Math.PI * 2;
        this.sparks.spawn({ x: p.x + Math.cos(a) * 0.45, y: p.y + rand(0, 0.2), z: p.z + Math.sin(a) * 0.45, vx: -Math.cos(a) * 0.3, vy: rand(0.8, 1.4), vz: -Math.sin(a) * 0.3, max: 0.8, s0: 0.08, s1: 0.02, r0: c.r * 2, g0: c.g * 2, b0: c.b * 2, r1: c.r, g1: c.g, b1: c.b });
      }
      setTimeout(tick, 60);
    };
    tick();
    return () => { alive = false; };
  }

  // ---------------------------------------------------------------- recipes
  /**
   * Play a named effect. `from` = caster chest, `to` = target point (ground).
   * Resolves at the moment of impact.
   */
  async play(id: VfxId | string | undefined, from: Vector3, to: Vector3, color?: string, big = false): Promise<void> {
    const c = color ?? defaultColor(id);
    const at = to.clone();
    const chest = at.clone().add(V(0, 0.55, 0));
    const S = big ? 1.6 : 1;
    switch (id) {
      case 'slash': case 'sword':
        this.arc(chest, c, S);
        this.burst(chest, '#fff4d0', 14, 2.5, 0.12, 0.3, { pool: 'sparks' });
        return;
      case 'impact': case 'punch':
        this.burst(chest, c, 20, 2.2, 0.18, 0.35, { pool: 'sparks' });
        this.ring(chest, c, 0.1, 0.7, 0.3, 0, true);
        return;
      case 'pierce':
        this.beam(chest.clone().add(V(0, 0, 0)), chest.clone().add(to.clone().sub(from).setY(0).normalize().multiplyScalar(0.6)), c, 0.04, 0.25);
        this.burst(chest, '#fff4d0', 10, 2, 0.12, 0.3, { pool: 'sparks' });
        return;
      case 'arrow': await this.projectile(from, chest, 'arrow', c, 16, 1.2); this.burst(chest, '#fff4d0', 8, 1.5, 0.1, 0.25, { pool: 'sparks' }); return;
      case 'bullet': await this.projectile(from, chest, 'bullet', '#ffe0a0', 40, 0); this.burst(chest, '#ffd080', 10, 2, 0.1, 0.25, { pool: 'sparks' }); return;
      case 'stone': await this.projectile(from, chest, 'stone', c, 11, 1.6); this.burst(chest, '#c8b898', 10, 1.5, 0.1, 0.3); return;
      case 'shuriken': await this.projectile(from, chest, 'shuriken', c, 15, 0.5); this.burst(chest, '#e0e8ff', 10, 1.8, 0.1, 0.25, { pool: 'sparks' }); return;
      case 'jumpImpact':
        this.ring(at, '#e8e0c8', 0.2, 1.6, 0.5); this.rocks(at, '#8a7a64', 8, 0.9); this.burst(chest, '#fff4d0', 20, 3, 0.15, 0.4, { pool: 'sparks' });
        return;
      case 'flames': case 'inferno': {
        const n = id === 'inferno' ? 3 : 1;
        this.glyph(at, '#ff7a30', 1.2 * S, 0.9);
        for (let k = 0; k < n; k++) {
          setTimeout(() => {
            this.burst(at.clone().add(V(rand(-0.3, 0.3) * (n > 1 ? 2 : 0), 0.2, rand(-0.3, 0.3) * (n > 1 ? 2 : 0))), '#ff6a20', 50 * S, 1.8, 0.4, 0.9, { up: 2.2, grav: -1.5 });
            this.burst(at, '#ffd060', 25, 1.2, 0.25, 0.6, { up: 2.5, pool: 'sparks' });
          }, k * 150);
        }
        this.onFlash('#ff9040', 0.12 * S);
        await wait(250);
        return;
      }
      case 'ice': case 'glacier': case 'blizzard':
        this.shards(at, '#9fdcff', id === 'glacier' ? 12 : 7, id === 'glacier' ? 0.6 : 0.4, 1.2);
        this.burst(chest, '#bfe8ff', 30, 2, 0.18, 0.8, { pool: 'sparks' });
        if (id === 'blizzard') for (let i = 0; i < 40; i++) this.flakes.spawn({ x: at.x + rand(-1, 1), y: at.y + rand(1, 2.5), z: at.z + rand(-1, 1), vx: rand(-1, 1), vy: -2, vz: rand(-1, 1), max: 1, s0: 0.1, s1: 0.05, r0: 1, g0: 1, b0: 1.2, r1: 0.6, g1: 0.8, b1: 1 });
        this.onFlash('#bfe8ff', 0.1);
        await wait(200);
        return;
      case 'bolt': case 'thunder': {
        const strikes = id === 'thunder' ? 3 : 1;
        for (let k = 0; k < strikes; k++) {
          setTimeout(() => {
            const off = strikes > 1 ? V(rand(-0.8, 0.8), 0, rand(-0.8, 0.8)) : V(0, 0, 0);
            this.bolt(at.clone().add(off).add(V(rand(-0.5, 0.5), 7, rand(-0.5, 0.5))), at.clone().add(off).add(V(0, 0.3, 0)), '#dce8ff', 0.3, 0.05 * S);
            this.onFlash('#e8f0ff', 0.35);
            this.onShake(0.12, 0.2);
          }, k * 120);
        }
        await wait(100);
        return;
      }
      case 'water':
        this.burst(at.clone().add(V(0, 0.2, 0)), '#4aa8d8', 45, 2.4, 0.22, 0.8, { up: 2, grav: 7 });
        this.ring(at, '#8fd8ff', 0.2, 1.3, 0.6);
        await wait(150);
        return;
      case 'quake': case 'sand':
        this.rocks(at, id === 'sand' ? '#c8a86a' : '#8a7a64', 12, 1.2);
        this.ring(at, '#c8b898', 0.3, 2.0 * S, 0.7);
        this.burst(at, id === 'sand' ? '#e0c890' : '#a89878', 30, 1.5, 0.45, 1.2, { up: 0.6 });
        await wait(150);
        return;
      case 'wind':
        for (let i = 0; i < 60 * this.budget; i++) {
          const a = (i / 60) * Math.PI * 6;
          this.add.spawn({ x: at.x + Math.cos(a) * 0.6, y: at.y + i * 0.03, z: at.z + Math.sin(a) * 0.6, vx: -Math.sin(a) * 2, vy: 1.2, vz: Math.cos(a) * 2, max: 0.9, s0: 0.2, s1: 0.05, r0: 0.7, g0: 1.0, b0: 0.8, r1: 0.3, g1: 0.5, b1: 0.4 });
        }
        await wait(200);
        return;
      case 'holy':
        this.pillar(at, '#fff4c0', 0.55 * S, 7, 1.0);
        this.glyph(at, '#ffe890', 1.8 * S, 1.2);
        this.rise(at, '#fff0b0', 40, 3, 0.7, 1.2, 0.15);
        this.onFlash('#fffbe8', 0.4);
        await wait(250);
        return;
      case 'dark': case 'drain': case 'gravity':
        this.glyph(at, '#a060ff', 1.6 * S, 1.1);
        for (let i = 0; i < 50 * this.budget; i++) {
          const a = Math.random() * Math.PI * 2, r = rand(0.8, 1.4) * S;
          this.add.spawn({ x: chest.x + Math.cos(a) * r, y: chest.y + rand(-0.5, 0.8), z: chest.z + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.8, vy: 0, vz: -Math.sin(a) * r * 1.8, max: 0.55, s0: 0.3, s1: 0.05, r0: 0.5, g0: 0.1, b0: 0.9, r1: 0.1, g1: 0, b1: 0.3 });
        }
        if (id === 'drain') setTimeout(() => this.stream(chest, from, '#c060ff'), 350);
        await wait(350);
        return;
      case 'poison':
        this.burst(chest, '#7ad040', 30, 1.0, 0.35, 1.2, { up: 1.2, grav: -0.5 });
        this.burst(chest, '#c080ff', 12, 0.8, 0.2, 1.0, { up: 1, pool: 'sparks' });
        await wait(150);
        return;
      case 'meteor': {
        const start = at.clone().add(V(-3, 12, -3));
        await this.projectile(start, at, 'orb', '#ff8040', 18, 0);
        this.burst(at, '#ff7030', 90 * S, 4, 0.5, 1.2, { up: 1.5 });
        this.rocks(at, '#4a3a30', 14, 1.4);
        this.ring(at, '#ffb060', 0.3, 3 * S, 0.8);
        this.onFlash('#ffb070', 0.6); this.onShake(0.5, 0.8);
        return;
      }
      case 'flare': case 'explosion': case 'ultima': {
        const col = id === 'ultima' ? '#a0c8ff' : id === 'flare' ? '#ffd8a0' : '#ff9a40';
        this.glyph(at, col, 2.2 * S, 1.3);
        await wait(250);
        this.burst(chest, col, 120 * S, 4.5, 0.45, 1.0);
        this.burst(chest, '#ffffff', 40, 3, 0.3, 0.5, { pool: 'sparks' });
        this.ring(at, col, 0.2, 3.2 * S, 0.8);
        this.ring(chest, col, 0.2, 2.4 * S, 0.7, 0, true);
        this.onFlash(id === 'ultima' ? '#d8e8ff' : '#fff0d0', 0.75); this.onShake(0.45, 0.6);
        return;
      }
      case 'breath': {
        const dir = at.clone().sub(from).setY(0).normalize();
        for (let i = 0; i < 80 * this.budget; i++) {
          const spread = V(rand(-0.4, 0.4), rand(-0.2, 0.3), rand(-0.4, 0.4));
          const v = dir.clone().multiplyScalar(rand(4, 7)).add(spread.multiplyScalar(2));
          const cc = new THREE.Color(c);
          this.add.spawn({ x: from.x, y: from.y, z: from.z, vx: v.x, vy: v.y, vz: v.z, max: rand(0.5, 0.8), s0: 0.15, s1: 0.6, r0: cc.r * 1.8, g0: cc.g * 1.8, b0: cc.b * 1.8, r1: cc.r * 0.3, g1: cc.g * 0.3, b1: cc.b * 0.3, drag: 1.5 });
        }
        await wait(300);
        this.burst(chest, c, 30, 2, 0.3, 0.6);
        return;
      }
      case 'beam': case 'lava':
        if (id === 'beam') this.beam(from, chest, c, 0.12 * S, 0.5);
        else { this.burst(at, '#ff5a10', 60, 2.5, 0.35, 1, { up: 2.5, grav: 6 }); this.ring(at, '#ff8a30', 0.2, 1.5, 0.6); }
        this.burst(chest, c, 20, 2, 0.2, 0.4, { pool: 'sparks' });
        await wait(150);
        return;
      case 'ivy':
        for (let i = 0; i < 6; i++) this.burst(at.clone().add(V(rand(-0.4, 0.4), 0, rand(-0.4, 0.4))), '#4a9a3a', 10, 1.5, 0.2, 0.9, { up: 3, grav: 3 });
        this.ring(at, '#6ac050', 0.2, 1.2, 0.8);
        await wait(200);
        return;
      case 'heal': case 'healBig': case 'sparkleGreen':
        this.rise(at, c, id === 'healBig' ? 60 : 32, 1.8, 0.5, 1.2, 0.13);
        this.ring(at, c, 0.1, 0.9, 0.7);
        if (id === 'healBig') this.glyph(at, c, 1.6, 1.2);
        await wait(250);
        return;
      case 'revive': case 'phoenix':
        this.pillar(at, id === 'phoenix' ? '#ffb060' : '#fff4c0', 0.4, 4, 1.1);
        this.rise(at, id === 'phoenix' ? '#ff8040' : '#fff0b0', 50, 2.4, 0.5, 1.4, 0.16);
        this.onFlash('#fff4d8', 0.2);
        await wait(400);
        return;
      case 'buff': case 'buffRed': case 'buffBlue': case 'guard':
        this.ring(at, c, 0.5, 0.5, 0.9, 0.1);
        for (let k = 0; k < 3; k++) setTimeout(() => this.ring(at, c, 0.45, 0.45, 0.6, 0.2 + k * 0.4), k * 120);
        this.rise(at, c, 20, 1.6, 0.45, 1.0, 0.1);
        await wait(250);
        return;
      case 'debuff': case 'status':
        this.burst(chest.clone().add(V(0, 0.6, 0)), c, 26, 0.9, 0.22, 1.0, { up: -0.5, grav: 2 });
        this.ring(chest, c, 0.6, 0.2, 0.6, 0.3);
        await wait(250);
        return;
      case 'time':
        this.glyph(at, c, 1.4, 1.0);
        this.ring(chest, c, 0.2, 1.1, 0.7, 0, true);
        this.burst(chest, c, 20, 1.2, 0.15, 0.8, { pool: 'sparks' });
        await wait(250);
        return;
      case 'teleport':
        this.pillar(at, c, 0.35, 2.5, 0.6);
        this.rise(at, c, 30, 2, 0.4, 0.6, 0.1);
        await wait(200);
        return;
      case 'steal':
        this.burst(chest, '#ffe070', 14, 1.5, 0.12, 0.4, { pool: 'sparks' });
        setTimeout(() => this.stream(chest, from, '#ffe070'), 150);
        await wait(150);
        return;
      case 'song': case 'dance':
        for (let i = 0; i < 16; i++) this.notes.spawn({ x: at.x + rand(-0.6, 0.6), y: at.y + rand(0.4, 1.2), z: at.z + rand(-0.6, 0.6), vx: rand(-0.3, 0.3), vy: rand(0.6, 1.2), vz: rand(-0.3, 0.3), max: 1.5, s0: 0.22, s1: 0.15, r0: 1.4, g0: 1.2, b0: 1.6, r1: 0.6, g1: 0.4, b1: 0.8 });
        this.ring(at, c, 0.3, 1.2, 0.8);
        await wait(250);
        return;
      case 'talk':
        this.ring(chest.clone().add(V(0, 0.3, 0)), c, 0.1, 0.8, 0.5, 0, true);
        this.burst(chest.clone().add(V(0, 0.5, 0)), c, 12, 0.8, 0.15, 0.7, { pool: 'sparks' });
        await wait(150);
        return;
      case 'summon': {
        this.glyph(at, c, 3.6, 2.0);
        this.pillar(at, c, 1.4, 8, 1.4);
        this.onFlash(c, 0.35);
        await wait(700);
        this.burst(chest, c, 120 * S, 4, 0.5, 1.2);
        this.ring(at, c, 0.5, 3.8, 0.9);
        this.onFlash('#ffffff', 0.5); this.onShake(0.4, 0.6);
        return;
      }
      case 'glyph':
        this.glyph(at, c, 1.5, 1.0);
        this.burst(chest, c, 20, 1.2, 0.18, 0.6, { pool: 'sparks' });
        await wait(200);
        return;
      case 'potion': case 'elixir':
        this.rise(at, id === 'elixir' ? '#ffe8a0' : c, 26, 1.4, 0.4, 1.0, 0.12);
        this.burst(chest, '#ffffff', 10, 1, 0.12, 0.5, { pool: 'sparks' });
        await wait(200);
        return;
      case 'none': case undefined: return;
      default:
        this.burst(chest, c, 24, 1.8, 0.2, 0.5);
        await wait(120);
    }
  }

  /** weapon arc swoosh */
  arc(at: Vector3, color: string, s = 1) {
    const g = new THREE.TorusGeometry(0.42 * s, 0.03, 4, 16, Math.PI * 0.9);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
    m.position.copy(at);
    m.rotation.set(rand(-0.6, 0.6), rand(0, Math.PI), rand(-0.8, 0.8));
    this.addTransient(m, 0.28, (t, dt, o: any) => { o.rotation.z += dt * 14; o.material.opacity = 1 - t; const k = 0.8 + t * 0.4; o.scale.set(k, k, k); });
  }

  /** particles streaming from a to b (drain, steal) */
  stream(a: Vector3, b: Vector3, color: string) {
    const c = new THREE.Color(color);
    for (let i = 0; i < 24 * this.budget; i++) {
      const d = b.clone().sub(a);
      const t = rand(0.5, 0.9);
      this.sparks.spawn({ x: a.x + rand(-0.1, 0.1), y: a.y + rand(-0.1, 0.1), z: a.z + rand(-0.1, 0.1), vx: d.x / t, vy: d.y / t + rand(-0.3, 0.3), vz: d.z / t, max: t, s0: 0.12, s1: 0.04, r0: c.r * 2, g0: c.g * 2, b0: c.b * 2, r1: c.r, g1: c.g, b1: c.b });
    }
  }

  /** crystal / treasure / level-up style celebratory sparkle */
  sparkle(at: Vector3, color = '#fff0a0') { this.rise(at, color, 30, 1.5, 0.35, 1.2, 0.12); }

  dispose() {
    for (const tr of this.transients) { this.scene.remove(tr.obj); releaseTree(tr.obj); }
    this.transients = [];
    for (const p of [this.add, this.sparks, this.notes, this.flakes, this.leaves, this.dust]) p.dispose();
    for (const t of this.ownTex) t.dispose();
    this.ownTex = [];
  }
}

function wait(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

export function defaultColor(id: string | undefined): string {
  switch (id) {
    case 'flames': case 'inferno': return '#ff7a30';
    case 'ice': case 'glacier': case 'blizzard': return '#9fdcff';
    case 'bolt': case 'thunder': return '#dce8ff';
    case 'water': return '#4aa8d8';
    case 'holy': return '#fff0b0';
    case 'dark': case 'drain': case 'gravity': return '#a060ff';
    case 'poison': return '#8ad040';
    case 'heal': case 'healBig': case 'sparkleGreen': return '#8cff9c';
    case 'buffRed': return '#ff8a6a';
    case 'buffBlue': return '#7ab8ff';
    case 'buff': return '#ffe08a';
    case 'debuff': case 'status': return '#c890ff';
    case 'time': return '#b8a0ff';
    case 'summon': return '#ffd070';
    case 'song': return '#ffb8e8';
    case 'dance': return '#ff90c8';
    case 'slash': case 'sword': return '#f4f8ff';
    default: return '#fff0c8';
  }
}

export type { Material };
