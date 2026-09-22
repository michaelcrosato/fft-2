// A 3D stage built from a map: terrain, environment, camera, VFX, unit views,
// tile highlights and picking. Used by battles and cutscenes.
import { THREE } from '../gfx/three';
import { renderer } from '../gfx/renderer';
import { TerrainView, HS } from '../gfx/terrain';
import { Environment } from '../gfx/env';
import { TacticsCamera } from '../gfx/camera';
import { createPost, type PostFX } from '../gfx/post';
import { Vfx } from '../gfx/vfx';
import { tileMaterial } from '../gfx/materials';
import { MapGrid, type Cell } from '../battle/grid';
import type { EnvTime, MapDef, Weather } from '../data/types';
import { mapDef } from '../data/db';
import type { Scene, Mesh, Group, Vector3, Raycaster, Material } from 'three/webgpu';
import { UnitView, type UnitViewSpec } from './unitview';
import { GeoBuilder } from '../gfx/geo';
import { loadOptions } from '../game/state';

export type HighlightKind = 'move' | 'target' | 'aoe' | 'deploy' | 'cursor' | 'enemyMove' | 'path' | 'charge';
const HL_COLORS: Record<HighlightKind, string> = {
  move: '#4aa0ff', target: '#ff9a3a', aoe: '#ffd24a', deploy: '#5ad0ff', cursor: '#ffffff', enemyMove: '#ff5a4a', path: '#9fe8ff', charge: '#c890ff',
};

export class Stage {
  readonly scene: Scene;
  readonly grid: MapGrid;
  readonly def: MapDef;
  readonly terrain: TerrainView;
  env!: Environment;
  readonly cam: TacticsCamera;
  post!: PostFX;
  vfx!: Vfx;
  readonly views = new Map<number | string, UnitView>();
  private hl = new Map<string, Group>();
  private cursorMesh: Mesh;
  cursor: [number, number] = [0, 0];
  private ray: Raycaster;
  private disposed = false;
  private chargeMarks = new Map<number, Group>();
  timeScale = 1;
  private stormT = 4;

  constructor(mapId: string, opts: { time?: EnvTime; weather?: Weather } = {}) {
    this.def = mapDef(mapId);
    this.grid = new MapGrid(this.def);
    this.scene = new THREE.Scene();
    this.terrain = new TerrainView(this.grid);
    this.scene.add(this.terrain.group);
    this.env = new Environment(this.scene, this.terrain, this.def, opts.time);
    const el = renderer.domElement;
    this.cam = new TacticsCamera(el.clientWidth / Math.max(1, el.clientHeight));
    const span = Math.max(this.grid.w, this.grid.d);
    this.cam.minDist = span * 0.9;
    this.cam.maxDist = span * 4;
    this.cam.snap(this.terrain.center, span * 2.3);
    this.vfx = new Vfx(this.scene);
    this.vfx.setBounds(this.grid.w, this.grid.d, this.grid.maxHeight() * HS + 3);
    this.vfx.setWeather(opts.weather ?? this.def.weather ?? 'none');
    this.vfx.onShake = (a, t) => { if (loadOptions().camShake) this.cam.shake(a * 0.6, t); };
    this.ray = new THREE.Raycaster();
    // cursor: a bright frame
    this.cursorMesh = this.makeTileMesh([[0, 0]], tileMaterial('#ffffff', true, 0.9), 0.05);
    this.cursorMesh.visible = false;
    this.scene.add(this.cursorMesh);
  }

  async init() {
    this.post = await createPost(this.scene, this.cam.cam);
    this.post.setGrade({ warmth: this.env.mood.warmth, saturation: this.env.mood.saturation, exposure: this.env.mood.exposure });
    if (this.def.tint) { const c = new THREE.Color(this.def.tint); this.post.setGrade({ tint: [0.75 + c.r * 0.25, 0.75 + c.g * 0.25, 0.75 + c.b * 0.25] }); }
    this.vfx.onFlash = (c, a) => this.post.flash(c, a);
    this.bindCameraControls();
  }

  private unbind: Array<() => void> = [];
  /** drag = orbit (snaps to 90° on release), wheel/pinch = zoom */
  private bindCameraControls() {
    const el = renderer.domElement;
    const pts = new Map<number, { x: number; y: number }>();
    let dragging = false;
    let pinch0 = 0;
    const down = (e: PointerEvent) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragging = false; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); } };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (pts.size === 1) {
        if (!dragging && Math.hypot(dx, dy) > 10) dragging = true;
        if (dragging && (e.buttons & 1 || e.pointerType === 'touch')) { this.cam.orbitFree(-dx * 0.006, dy * 0.004); p.x = e.clientX; p.y = e.clientY; }
      } else if (pts.size === 2) {
        p.x = e.clientX; p.y = e.clientY;
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0 > 0) { this.cam.zoom(pinch0 / d); pinch0 = d; }
      }
    };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (dragging && pts.size === 0) { this.cam.settleYaw(); dragging = false; } };
    const wheel = (e: WheelEvent) => { this.cam.zoom(e.deltaY > 0 ? 1.1 : 0.9); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('wheel', wheel, { passive: true });
    this.unbind.push(() => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('wheel', wheel); });
  }

  // ------------------------------------------------------------ units
  addUnit(key: number | string, spec: UnitViewSpec, x: number, z: number, facing: 'N' | 'E' | 'S' | 'W' = 'S'): UnitView {
    const v = new UnitView(spec, this.terrain);
    v.place(x, z, facing);
    this.scene.add(v.root);
    this.views.set(key, v);
    return v;
  }
  removeUnit(key: number | string) {
    const v = this.views.get(key);
    if (!v) return;
    this.scene.remove(v.root);
    v.dispose();
    this.views.delete(key);
  }

  // ------------------------------------------------------------ highlights
  private makeTileMesh(cells: Array<[number, number]>, mat: Material, lift = 0.03): Mesh {
    const b = new GeoBuilder();
    const one: [number, number, number] = [1, 1, 1];
    for (const [x, z] of cells) {
      const c = this.grid.cell(x, z);
      if (!c || c.hole) continue;
      const p = this.terrain.tileCenter(x, z);
      const y = (c.h + (c.depth >= 0.5 ? c.depth : 0)) * HS + lift;
      const s = 0.47;
      const cy = (dx: number, dz: number) => this.terrain.sampleTop(c, dx + 0.5, dz + 0.5) + (c.depth >= 0.5 ? c.depth * HS : 0) + lift;
      const yy = c.slope ? null : y;
      b.quad(
        [p.x - s, yy ?? cy(-s, s), p.z + s], [p.x + s, yy ?? cy(s, s), p.z + s], [p.x + s, yy ?? cy(s, -s), p.z - s], [p.x - s, yy ?? cy(-s, -s), p.z - s],
        [[0, 0], [1, 0], [1, 1], [0, 1]], [one, one, one, one], [0, 1, 0],
      );
    }
    const m = new THREE.Mesh(b.build(), mat);
    m.renderOrder = 4;
    return m;
  }

  highlight(kind: HighlightKind, cells: Array<[number, number]> | Cell[], id: string = kind) {
    this.clearHighlight(id);
    const list = cells.map((c: any) => (Array.isArray(c) ? c : [c.x, c.z])) as Array<[number, number]>;
    if (!list.length) return;
    const g = new THREE.Group();
    g.add(this.makeTileMesh(list, tileMaterial(HL_COLORS[kind], kind !== 'path', kind === 'aoe' ? 0.7 : 0.5), kind === 'aoe' ? 0.045 : 0.035));
    this.scene.add(g);
    this.hl.set(id, g);
  }
  clearHighlight(id?: string) {
    if (id) { const g = this.hl.get(id); if (g) { this.scene.remove(g); g.traverse((o: any) => o.geometry?.dispose?.()); this.hl.delete(id); } return; }
    for (const k of [...this.hl.keys()]) this.clearHighlight(k);
  }

  setCursor(x: number, z: number, visible = true) {
    this.cursor = [x, z];
    const c = this.grid.cell(x, z);
    if (!c) { this.cursorMesh.visible = false; return; }
    this.scene.remove(this.cursorMesh);
    this.cursorMesh.geometry.dispose();
    this.cursorMesh = this.makeTileMesh([[x, z]], tileMaterial('#ffffff', true, 0.9), 0.06);
    this.cursorMesh.visible = visible;
    this.scene.add(this.cursorMesh);
  }
  hideCursor() { this.cursorMesh.visible = false; }

  /** persistent marker for charged spell targets */
  markCharge(uid: number, cells: Array<[number, number]>) {
    this.unmarkCharge(uid);
    const g = new THREE.Group();
    g.add(this.makeTileMesh(cells, tileMaterial(HL_COLORS.charge, true, 0.35), 0.04));
    this.scene.add(g);
    this.chargeMarks.set(uid, g);
  }
  unmarkCharge(uid: number) { const g = this.chargeMarks.get(uid); if (g) { this.scene.remove(g); this.chargeMarks.delete(uid); } }

  // ------------------------------------------------------------ picking & projection
  pickCell(clientX: number, clientY: number): [number, number] | null {
    const el = renderer.domElement;
    const r = el.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.cam.cam);
    const hits = this.ray.intersectObjects(this.terrain.pickMeshes, false);
    for (const h of hits) {
      // nudge into the surface along the ray/normal to find the cell
      const p = h.point.clone();
      const n = h.face?.normal;
      if (n && Math.abs(n.y) < 0.5) p.addScaledVector(n, -0.02);
      const [x, z] = this.terrain.worldToCell(p.x, p.z);
      if (this.grid.cell(x, z) && !this.grid.cell(x, z)!.hole) return [x, z];
    }
    return null;
  }

  toScreen(p: Vector3): { x: number; y: number; visible: boolean } {
    const v = p.clone().project(this.cam.cam);
    const el = renderer.domElement;
    const r = el.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, visible: v.z < 1 };
  }

  tileWorld(x: number, z: number): Vector3 { return this.terrain.tileCenter(x, z); }

  focusTile(x: number, z: number) { const p = this.terrain.tileCenter(x, z); p.y += 0.4; this.cam.focus(p); }

  // ------------------------------------------------------------ frame
  update(dt: number) {
    if (this.disposed) return;
    const sdt = dt * this.timeScale;
    for (const v of this.views.values()) v.update(sdt);
    this.env.update(sdt);
    this.cam.update(dt);
    this.vfx.update(sdt, this.cam.cam);
    // storms: distant lightning
    if (this.env.time === 'storm') {
      this.stormT -= dt;
      if (this.stormT <= 0) {
        this.stormT = 5 + Math.random() * 9;
        this.post.flash('#e8f0ff', 0.45);
        this.env.lightning();
        setTimeout(() => import('../audio/audio').then((m) => m.audio.sfx('thunderclap', { volume: 0.6 })), 250 + Math.random() * 600);
      }
    }
    // focus DOF on the camera target
    this.post.setFocus(this.cam.dist, Math.max(10, this.cam.dist * 0.55));
  }
  render() { if (!this.disposed) this.post.render(); }

  resize(w: number, h: number) { this.cam.setAspect(w / Math.max(1, h)); this.post.setSize(); }

  dispose() {
    this.disposed = true;
    for (const f of this.unbind) f();
    this.vfx.dispose();
    this.post.dispose();
    for (const k of [...this.views.keys()]) this.removeUnit(k);
    this.terrain.dispose();
    this.scene.traverse((o: any) => { o.geometry?.dispose?.(); });
  }
}
