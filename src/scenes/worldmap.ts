// 3D world map of Ivaldis: procedural relief built around the story nodes,
// roads, forests, sea, miniature towns/castles, node markers and a walking
// party token.
import { THREE } from '../gfx/three';
import { renderer, rinfo } from '../gfx/renderer';
import { createPost, type PostFX } from '../gfx/post';
import { GeoBuilder, hexRgb, mat } from '../gfx/geo';
import { propMaterial, waterMaterial } from '../gfx/materials';
import { NODES, EDGES } from '../data/db';
import type { WorldNode } from '../data/types';
import { hash2 } from '../core/rng';
import { Vfx } from '../gfx/vfx';
import type { Scene, PerspectiveCamera, Group, Mesh, Vector3, Raycaster, Object3D } from 'three/webgpu';
import { buildHumanoid } from '../gfx/models/humanoid';
import { Animator } from '../gfx/models/anim';
import type { UnitModel } from '../gfx/models/rig';
import { releaseTree } from '../gfx/dispose';
import { fovFor } from '../gfx/camera';

const S = 0.6;            // world units per map unit
const SIZE = 110;         // map extent in map units (0..100 + margin)

function vnoise(x: number, y: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
}
function fbm(x: number, y: number, seed: number, oct = 4) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += vnoise(x * f, y * f, seed + i) * amp; amp *= 0.5; f *= 2; }
  return v;
}

export interface NodeMarker { node: WorldNode; obj: Object3D; ring: Mesh; pos: Vector3 }

export class WorldView {
  readonly scene: Scene;
  readonly cam: PerspectiveCamera;
  post!: PostFX;
  vfx: Vfx;
  readonly markers = new Map<string, NodeMarker>();
  private heights: Float32Array;
  private res = 160;
  party!: { model: UnitModel; anim: Animator; root: Group };
  private camTarget = new THREE.Vector3();
  private camGoal = new THREE.Vector3();
  camDist = 34;
  camYaw = 0.35;
  camPitch = 0.95;
  private ray: Raycaster;
  private roads: Group;
  private t = 0;
  private hoverNode: string | null = null;
  private pulse: string | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    const el = renderer.domElement;
    this.cam = new THREE.PerspectiveCamera(32, el.clientWidth / Math.max(1, el.clientHeight), 0.5, 500);
    this.ray = new THREE.Raycaster();
    this.heights = new Float32Array(this.res * this.res);
    this.roads = new THREE.Group();
    this.buildLand();
    this.buildLights();
    this.vfx = new Vfx(this.scene);
    this.vfx.setBounds(SIZE * S, SIZE * S, 6);
  }

  async init() {
    this.post = await createPost(this.scene, this.cam);
    this.post.setGrade({ warmth: 0.25, saturation: 1.1, vignette: 0.45 });
  }

  /** map (0..100) → world */
  toWorld(p: [number, number]): Vector3 {
    const x = (p[0] - 50) * S, z = (p[1] - 50) * S;
    return new THREE.Vector3(x, this.heightAt(p[0], p[1]), z);
  }

  heightAt(mx: number, my: number): number {
    const r = this.res;
    const fx = ((mx + 5) / SIZE) * (r - 1), fy = ((my + 5) / SIZE) * (r - 1);
    const x0 = Math.max(0, Math.min(r - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(r - 2, Math.floor(fy)));
    const tx = Math.min(1, Math.max(0, fx - x0)), ty = Math.min(1, Math.max(0, fy - y0));
    const h = (x: number, y: number) => this.heights[y * r + x];
    const a = h(x0, y0) * (1 - tx) + h(x0 + 1, y0) * tx;
    const b = h(x0, y0 + 1) * (1 - tx) + h(x0 + 1, y0 + 1) * tx;
    return Math.max(0.05, a * (1 - ty) + b * ty);
  }

  private rawHeight(mx: number, my: number, nodes: WorldNode[]): number {
    // land mass = union of blobs around nodes + noise; mountains from ridge noise away from nodes
    let land = 0;
    let near = 99;
    for (const n of nodes) {
      const d = Math.hypot(mx - n.pos[0], my - n.pos[1]);
      land = Math.max(land, Math.exp(-(d * d) / (2 * 14 * 14)));
      near = Math.min(near, d);
    }
    const n1 = fbm(mx * 0.06, my * 0.06, 7);
    const coast = land * 1.25 + (n1 - 0.5) * 0.7 - 0.28;
    if (coast < 0) return coast * 3;
    const ridge = 1 - Math.abs(fbm(mx * 0.05 + 10, my * 0.05, 19) * 2 - 1);
    const mountain = Math.max(0, ridge - 0.62) * 11 * Math.min(1, Math.max(0, (near - 5) / 9));
    return 0.3 + coast * 1.4 + fbm(mx * 0.2, my * 0.2, 3) * 0.6 + mountain;
  }

  private buildLand() {
    const nodes = [...NODES.values()];
    const r = this.res;
    for (let y = 0; y < r; y++) for (let x = 0; x < r; x++) {
      const mx = (x / (r - 1)) * SIZE - 5, my = (y / (r - 1)) * SIZE - 5;
      this.heights[y * r + x] = this.rawHeight(mx, my, nodes);
    }
    // flatten around nodes so settlements sit on plateaus
    const b = new GeoBuilder();
    const col = (h: number, mx: number, my: number): [number, number, number] => {
      const n = fbm(mx * 0.3, my * 0.3, 55);
      if (h < 0.05) return hexRgb('#c8b27a');
      if (h < 0.35) return hexRgb(n > 0.5 ? '#b8a870' : '#c0b07a');
      if (h < 2.2) return hexRgb(n > 0.55 ? '#5f8f3a' : n > 0.45 ? '#6f9c42' : '#7aa64c');
      if (h < 3.2) return hexRgb(n > 0.5 ? '#7a7a5a' : '#8a8468');
      if (h < 4.6 + n * 0.8) return hexRgb(n > 0.5 ? '#8e8a84' : '#7e7a74');
      return hexRgb(n > 0.5 ? '#e8eef4' : '#d8e0ea');
    };
    const vx = (x: number, y: number) => {
      const mx = (x / (r - 1)) * SIZE - 5, my = (y / (r - 1)) * SIZE - 5;
      const h = Math.max(-1.5, this.heights[y * r + x]);
      return { p: [(mx - 50) * S, h * 1.0, (my - 50) * S] as [number, number, number], c: col(h, mx, my) };
    };
    for (let y = 0; y < r - 1; y++) for (let x = 0; x < r - 1; x++) {
      const a = vx(x, y), bb = vx(x + 1, y), c = vx(x + 1, y + 1), d = vx(x, y + 1);
      // two flat-shaded triangles
      b.tri(d.p, c.p, bb.p, avg(d.c, c.c, bb.c));
      b.tri(d.p, bb.p, a.p, avg(d.c, bb.c, a.c));
    }
    const land = new THREE.Mesh(b.build(), propMaterial({ flat: true, roughness: 0.95 }));
    land.receiveShadow = true; land.castShadow = true;
    this.scene.add(land);
    // sea
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * S * 3, SIZE * S * 3, 1, 1), waterMaterial('water'));
    const sg = sea.geometry;
    const cnt = sg.getAttribute('position').count;
    sg.setAttribute('shore', new THREE.Float32BufferAttribute(new Array(cnt).fill(0), 1));
    sea.rotation.x = -Math.PI / 2; sea.position.y = 0.02;
    sea.receiveShadow = true;
    this.scene.add(sea);
    // forests & rocks
    const f = new GeoBuilder();
    for (let i = 0; i < 2600; i++) {
      const mx = hash2(i, 1, 91) * 100, my = hash2(i, 2, 91) * 100;
      const h = this.heightAt(mx, my);
      if (h < 0.5 || h > 3.2) continue;
      const fv = fbm(mx * 0.08, my * 0.08, 71);
      if (fv < 0.52) continue;
      if (nodes.some((n) => Math.hypot(n.pos[0] - mx, n.pos[1] - my) < 3.2)) continue;
      const w = this.toWorld([mx, my]);
      const s = 0.35 + hash2(i, 3, 5) * 0.3;
      const pine = fv > 0.62;
      if (pine) f.add(new THREE.ConeGeometry(0.28 * s * 2, 0.9 * s * 2, 5), mat(w.x, w.y + 0.45 * s * 2, w.z), h > 2.5 ? '#3a5a44' : '#2f5a30', 0.15, { sway: 0.5 });
      else f.add(new THREE.IcosahedronGeometry(0.34 * s * 2, 0), mat(w.x, w.y + 0.42 * s * 2, w.z), '#4a7a30', 0.2, { sway: 0.4 });
      f.add(new THREE.CylinderGeometry(0.03, 0.05, 0.3, 4), mat(w.x, w.y + 0.12, w.z), '#5a3e28', 0, { sway: 0 });
    }
    const fm = new THREE.Mesh(f.build(), propMaterial({ flat: true, sway: 0.05 }));
    fm.castShadow = true; fm.receiveShadow = true;
    this.scene.add(fm);
    // roads (flat ribbons following the terrain)
    const rb = new GeoBuilder();
    const roadCol = hexRgb('#b89a6a');
    for (const e of EDGES) {
      const a = NODES.get(e.a), c = NODES.get(e.b);
      if (!a || !c) continue;
      const steps = Math.ceil(Math.hypot(c.pos[0] - a.pos[0], c.pos[1] - a.pos[1]) * 1.5);
      const dx = c.pos[0] - a.pos[0], dy = c.pos[1] - a.pos[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * 0.35, ny = (dx / len) * 0.35;
      // slight curve
      const bend = (hash2(a.pos[0] | 0, c.pos[1] | 0, 3) - 0.5) * 6;
      const pt = (t: number) => { const b2 = Math.sin(t * Math.PI) * bend; return [a.pos[0] + dx * t + (-dy / len) * b2, a.pos[1] + dy * t + (dx / len) * b2] as [number, number]; };
      for (let i = 0; i < steps; i++) {
        const p0 = pt(i / steps), p1 = pt((i + 1) / steps);
        const q = (p: [number, number], s2: number): [number, number, number] => { const w = this.toWorld([p[0] + nx * s2, p[1] + ny * s2]); return [w.x, Math.max(0.08, w.y) + 0.06, w.z]; };
        const one = roadCol;
        rb.quad(q(p0, -1), q(p1, -1), q(p1, 1), q(p0, 1), [[0, 0], [1, 0], [1, 1], [0, 1]], [one, one, one, one], [0, 1, 0]);
      }
    }
    const roads = new THREE.Mesh(rb.build(), propMaterial({ flat: true, roughness: 1, side: 'double' }));
    roads.receiveShadow = true;
    this.roads.add(roads);
    this.scene.add(this.roads);
    // settlements & markers
    for (const n of nodes) this.addNode(n);
  }

  private addNode(n: WorldNode) {
    const g = new THREE.Group();
    const p = this.toWorld(n.pos);
    g.position.copy(p);
    const b = new GeoBuilder();
    const hs = (k: number) => hash2(n.pos[0] | 0, n.pos[1] | 0, k);
    if (n.kind === 'town') {
      for (let i = 0; i < 7; i++) {
        const a = hs(i) * Math.PI * 2, r = 0.3 + hs(i + 9) * 0.9;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const hh = 0.25 + hs(i + 3) * 0.25;
        b.add(new THREE.BoxGeometry(0.34, hh, 0.3), mat(x, hh / 2, z, 0, a, 0), '#e0d2b0');
        b.add(new THREE.ConeGeometry(0.28, 0.24, 4), mat(x, hh + 0.12, z, 0, a + Math.PI / 4, 0), i % 3 ? '#a8472e' : '#5a6a8a');
      }
      b.add(new THREE.CylinderGeometry(0.1, 0.12, 0.8, 6), mat(0, 0.4, 0), '#c8bca0');
      b.add(new THREE.ConeGeometry(0.14, 0.3, 6), mat(0, 0.95, 0), '#6a3a28');
    } else if (n.kind === 'castle') {
      b.add(new THREE.BoxGeometry(1.2, 0.5, 1.0), mat(0, 0.25, 0), '#b0a898');
      for (const [x, z] of [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]]) {
        b.add(new THREE.CylinderGeometry(0.16, 0.18, 0.9, 7), mat(x, 0.45, z), '#a8a090');
        b.add(new THREE.ConeGeometry(0.2, 0.32, 7), mat(x, 1.06, z), '#3a4a6a');
      }
      b.add(new THREE.BoxGeometry(0.5, 1.2, 0.5), mat(0, 0.6, 0), '#bab2a2');
      b.add(new THREE.ConeGeometry(0.4, 0.5, 4), mat(0, 1.45, 0, 0, Math.PI / 4, 0), '#3a4a6a');
    } else if (n.kind === 'special' || n.kind === 'dungeon') {
      b.add(new THREE.BoxGeometry(0.7, 0.55, 0.9), mat(0, 0.27, 0), '#d8d0c0');
      b.add(new THREE.ConeGeometry(0.55, 0.4, 4), mat(0, 0.75, 0, 0, Math.PI / 4, 0), '#6a4a3a');
      b.add(new THREE.BoxGeometry(0.2, 0.9, 0.2), mat(0.35, 0.45, -0.3), '#d0c8b8');
      b.add(new THREE.ConeGeometry(0.16, 0.36, 4), mat(0.35, 1.08, -0.3, 0, Math.PI / 4, 0), '#6a4a3a');
    } else {
      // field: standing stones / banner
      b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 5), mat(0, 0.45, 0), '#6a5a44');
      b.add(new THREE.BoxGeometry(0.02, 0.3, 0.36), mat(0, 0.72, 0.18), '#8a3a2a');
    }
    const m = new THREE.Mesh(b.build(), propMaterial({ flat: true }));
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    // marker ring (colour set per state)
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 32), new THREE.MeshBasicMaterial({ color: '#4aa0ff', transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    ring.renderOrder = 3;
    g.add(ring);
    this.scene.add(g);
    this.markers.set(n.id, { node: n, obj: g, ring, pos: p.clone() });
  }

  private buildLights() {
    const sun = new THREE.DirectionalLight('#fff0d8', 3.0);
    sun.position.set(30, 45, 25);
    sun.castShadow = true;
    const sz = rinfo?.settings.shadowSize ?? 2048; // follows the quality preset (4096 costs ~64 MB)
    sun.shadow.mapSize.set(sz, sz);
    const c = sun.shadow.camera;
    c.left = -40; c.right = 40; c.top = 40; c.bottom = -40; c.near = 1; c.far = 150;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun, new THREE.HemisphereLight('#c8dcf0', '#6a5a40', 1.2));
    this.scene.background = new THREE.Color('#9fb8cc');
    this.scene.fog = new THREE.Fog('#9fb8cc', 60, 140);
    // sky dome
    const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 24, 12), new THREE.MeshBasicMaterial({ color: '#8fb0d0', side: THREE.BackSide, fog: false }));
    this.scene.add(sky);
    // soft clouds drifting
    const cl = new GeoBuilder();
    for (let i = 0; i < 22; i++) {
      const x = (hash2(i, 1, 33) - 0.5) * 100, z = (hash2(i, 2, 33) - 0.5) * 100;
      for (let k = 0; k < 4; k++) cl.add(new THREE.IcosahedronGeometry(0.7 + hash2(i, k, 4) * 0.8, 1), mat(x + k * 0.9, 17 + hash2(i, 5, 3) * 3, z + (k % 2) * 0.6, 0, 0, 0, 1, 0.45, 1), '#ffffff', 0.04);
    }
    const clouds = new THREE.Mesh(cl.build(), propMaterial({ flat: true, roughness: 1, transparent: true, opacity: 0.6 }));
    clouds.castShadow = true;
    clouds.name = 'clouds';
    this.scene.add(clouds);
  }

  setParty(model: UnitModel) {
    const root = new THREE.Group();
    root.add(model.root);
    model.root.scale.setScalar(1.2);
    this.scene.add(root);
    this.party = { model, anim: new Animator(model), root };
  }

  placeParty(nodeId: string) {
    const m = this.markers.get(nodeId);
    if (!m || !this.party) return;
    this.party.root.position.copy(m.pos);
    this.camGoal.copy(m.pos);
  }

  /** walk the party along a list of node ids */
  async travel(route: string[], onArrive: (nodeId: string) => Promise<boolean>) {
    if (!this.party) return;
    for (let i = 1; i < route.length; i++) {
      const a = this.markers.get(route[i - 1])!, b = this.markers.get(route[i])!;
      this.party.anim.setBase('walk');
      const dur = Math.max(0.6, a.pos.distanceTo(b.pos) / 5);
      const dir = b.pos.clone().sub(a.pos);
      this.party.model.root.rotation.y = Math.atan2(dir.x, dir.z);
      await new Promise<void>((resolve) => {
        const t0 = performance.now();
        const step = () => {
          const t = Math.min(1, (performance.now() - t0) / 1000 / dur);
          const p = a.pos.clone().lerp(b.pos, t);
          p.y = this.heightAt(a.node.pos[0] + (b.node.pos[0] - a.node.pos[0]) * t, a.node.pos[1] + (b.node.pos[1] - a.node.pos[1]) * t) + 0.08;
          this.party.root.position.copy(p);
          this.camGoal.copy(p);
          if (t < 1) requestAnimationFrame(step); else resolve();
        };
        requestAnimationFrame(step);
      });
      this.party.anim.setBase('idle');
      const cont = await onArrive(route[i]);
      if (!cont) return;
    }
  }

  setMarkerStates(states: Map<string, 'hidden' | 'town' | 'field' | 'story' | 'side' | 'visited'>) {
    for (const [id, m] of this.markers) {
      const s = states.get(id) ?? 'hidden';
      m.obj.visible = s !== 'hidden';
      const mat = m.ring.material as any;
      mat.color.set(s === 'story' ? '#ff4a3a' : s === 'side' ? '#ffcf4a' : s === 'town' ? '#4aa0ff' : s === 'field' ? '#54d060' : '#c8c0a0');
      (m.ring as any).userData.pulse = s === 'story' || s === 'side';
    }
  }

  focus(nodeId: string) { const m = this.markers.get(nodeId); if (m) this.camGoal.copy(m.pos); }
  hover(nodeId: string | null) { this.hoverNode = nodeId; }

  pickNode(clientX: number, clientY: number): string | null {
    const el = renderer.domElement;
    const r = el.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.cam);
    let best: string | null = null, bd = 1.6;
    for (const [id, m] of this.markers) {
      if (!m.obj.visible) continue;
      const d = this.ray.ray.distanceToPoint(m.pos.clone().add(new THREE.Vector3(0, 0.4, 0)));
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  }

  screenOf(nodeId: string) {
    const m = this.markers.get(nodeId);
    if (!m) return null;
    const v = m.pos.clone().add(new THREE.Vector3(0, 1.6, 0)).project(this.cam);
    const el = renderer.domElement;
    const r = el.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  update(dt: number) {
    this.t += dt;
    this.camTarget.lerp(this.camGoal, 1 - Math.pow(0.02, dt));
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    this.cam.position.set(this.camTarget.x + Math.sin(this.camYaw) * cp * this.camDist, this.camTarget.y + sp * this.camDist, this.camTarget.z + Math.cos(this.camYaw) * cp * this.camDist);
    this.cam.lookAt(this.camTarget);
    for (const [id, m] of this.markers) {
      const pulse = (m.ring as any).userData.pulse;
      const s = (pulse ? 1 + Math.sin(this.t * 4) * 0.18 : 1) * (id === this.hoverNode ? 1.3 : 1);
      m.ring.scale.set(s, s, s);
    }
    this.clouds ??= this.scene.getObjectByName('clouds') ?? null;
    if (this.clouds) { this.clouds.position.x = ((this.t * 0.6) % 60) - 30; }
    if (this.party) this.party.anim.update(dt);
    this.vfx.update(dt, this.cam);
    this.post.setFocus(this.camDist, this.camDist * 0.7);
  }
  render() { this.post.render(); }
  resize(w: number, h: number) { this.cam.aspect = w / Math.max(1, h); this.cam.fov = fovFor(this.cam.aspect, 32); this.cam.updateProjectionMatrix(); }
  private clouds: Object3D | null = null;
  dispose() { this.post.dispose(); this.vfx.dispose(); releaseTree(this.scene); }
}

function avg(a: number[], b: number[], c: number[]): [number, number, number] {
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
}

export function heroModel(look: any, job: any): UnitModel {
  return buildHumanoid({ job, look, gender: 'm' });
}
