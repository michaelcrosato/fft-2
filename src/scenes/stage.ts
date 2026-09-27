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
import { input, type Action } from '../ui/input';
import { releaseTree } from '../gfx/dispose';
import { audio } from '../audio/audio';
import { gameClock } from '../core/gameClock';

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
  private hl = new Map<string, Mesh>();
  private cursorMesh: Mesh;
  cursor: [number, number] = [0, 0];
  private ray: Raycaster;
  private disposed = false;
  private chargeMarks = new Map<number, Mesh>();
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
    // close enough to read a single unit, far enough to see the largest maps whole
    this.cam.minDist = Math.min(7, span * 0.9);
    this.cam.maxDist = Math.max(span * 4, 30);
    this.cam.bounds = { minX: -this.grid.w / 2 - 1, maxX: this.grid.w / 2 + 1, minZ: -this.grid.d / 2 - 1, maxZ: this.grid.d / 2 + 1 };
    this.cam.snap(this.terrain.center, span * 2.3);
    this.vfx = new Vfx(this.scene);
    this.vfx.setBounds(this.grid.w, this.grid.d, this.grid.maxHeight() * HS + 3);
    this.vfx.setWeather(opts.weather ?? this.def.weather ?? 'none');
    this.vfx.onShake = (a, t) => this.shake(a * 0.6, t);
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
  /** player camera control (drag, wheel, pinch, gamepad sticks/triggers); off for cinematic-only stages */
  userCamera = true;
  private stickOrbit = false;

  /**
   * Pointer camera controls on the canvas:
   *  - left-drag / one-finger drag: orbit (snaps to the nearest 45° diagonal on release)
   *  - right- or middle-drag, Shift+drag, two-finger drag: pan
   *  - wheel, trackpad pinch, two-finger pinch: zoom
   * Short clicks/taps are left alone for tile picking.
   */
  private bindCameraControls() {
    const el = renderer.domElement;
    const pts = new Map<number, { x: number; y: number; sx: number; sy: number }>();
    let mode: 'none' | 'orbit' | 'pan' | 'pinch' = 'none';
    let button = 0;
    let pinchD = 0, midX = 0, midY = 0;
    const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
    const down = (e: PointerEvent) => {
      if (!this.userCamera) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
      // keep receiving moves/ups if the pointer leaves the canvas mid-drag
      if (e.pointerType === 'mouse') { try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ } }
      if (pts.size === 1) { mode = 'none'; button = e.shiftKey ? 2 : e.button; }
      if (pts.size === 2) { if (mode === 'orbit') this.cam.settleYaw(); mode = 'pinch'; const t = two(); pinchD = t.d; midX = t.mx; midY = t.my; }
    };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (mode === 'pinch') {
        if (pts.size < 2) return;
        const t = two();
        if (pinchD > 0 && t.d > 0) this.cam.zoom(pinchD / t.d);
        this.cam.panPixels(t.mx - midX, t.my - midY, el.clientHeight);
        pinchD = t.d; midX = t.mx; midY = t.my;
        return;
      }
      if (mode === 'none') {
        if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 10) return;
        mode = button === 1 || button === 2 ? 'pan' : 'orbit';
      }
      if (mode === 'orbit') this.cam.orbitFree(-dx * 0.006, dy * 0.004);
      else if (mode === 'pan') this.cam.panPixels(dx, dy, el.clientHeight);
    };
    const up = (e: PointerEvent) => {
      if (!pts.delete(e.pointerId)) return;
      if (mode === 'orbit') this.cam.settleYaw();
      if (pts.size === 1) {
        // the finger left on the glass must travel again before it orbits
        const [p] = [...pts.values()]; p.sx = p.x; p.sy = p.y;
      }
      mode = pts.size === 0 ? 'none' : mode === 'pinch' ? 'none' : mode;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault(); // ctrl+wheel (trackpad pinch) would zoom the whole page
      if (!this.userCamera) return;
      const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      const k = e.ctrlKey ? 0.01 : 0.0015;
      this.cam.zoom(Math.exp(Math.max(-0.4, Math.min(0.4, px * k))));
    };
    // desktop Safari reports trackpad pinch as gesture events instead of ctrl+wheel
    let gScale = 1;
    const gStart = (e: Event) => { e.preventDefault(); gScale = 1; };
    const gChange = (e: Event) => {
      e.preventDefault();
      const sc = (e as Event & { scale?: number }).scale ?? 1;
      if (this.userCamera && pts.size < 2 && sc > 0) this.cam.zoom(gScale / sc);
      gScale = sc;
    };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('gesturestart', gStart); el.addEventListener('gesturechange', gChange);
    this.unbind.push(() => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel); el.removeEventListener('gesturestart', gStart); el.removeEventListener('gesturechange', gChange);
      input.analogCamera = false;
    });
  }

  /** gamepad: right stick orbits/tilts, triggers zoom (read every frame) */
  private analogCamera(dt: number) {
    const p = input.pad;
    if (!this.userCamera || !p.connected || this.cam.animating) return;
    if (p.rx || p.ry) { this.cam.orbitFree(p.rx * dt * 2.4, p.ry * dt * 1.3); this.stickOrbit = this.stickOrbit || Math.abs(p.rx) > 0.05; }
    else if (this.stickOrbit) { this.stickOrbit = false; this.cam.settleYaw(); }
    const z = p.rt - p.lt;
    if (z) this.cam.zoom(Math.exp(-z * dt * 1.8));
  }

  /** shared camera keys/buttons: rotate, tilt, zoom, recenter. True if handled. */
  cameraAction(a: Action): boolean {
    switch (a) {
      case 'rotL': this.cam.rotate(-1); return true;
      case 'rotR': this.cam.rotate(1); return true;
      case 'tilt': this.cam.togglePitch(); return true;
      case 'zoomIn': this.cam.zoom(0.85); return true;
      case 'zoomOut': this.cam.zoom(1.18); return true;
      case 'recenter': this.cam.recenter(); return true;
      default: return false;
    }
  }

  /** screen shake (respects the option) plus a controller rumble */
  shake(amp: number, time: number) {
    if (loadOptions().camShake) this.cam.shake(amp, time);
    input.rumble(Math.min(1, amp * 2.2), Math.min(400, time * 700));
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
  // Highlights, the cursor and charge markers are persistent meshes that are hidden, not destroyed, and
  // get a new geometry when their tiles change: freeing a mesh also frees its GPU pipeline, and the
  // renderer would rebuild it (a 3-7 ms hitch) on every cursor step.
  private tileGeo(cells: Array<[number, number]>, lift = 0.03) {
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
    return b.build();
  }
  private makeTileMesh(cells: Array<[number, number]>, mat: Material, lift = 0.03): Mesh {
    const m = new THREE.Mesh(this.tileGeo(cells, lift), mat);
    m.renderOrder = 4;
    return m;
  }
  /** show `cells` on the persistent mesh `m` (created on first use) */
  private tiles(m: Mesh | undefined, cells: Array<[number, number]>, mat: Material, lift: number): Mesh {
    if (!m) { m = this.makeTileMesh(cells, mat, lift); this.scene.add(m); }
    else { const old = m.geometry; m.geometry = this.tileGeo(cells, lift); old.dispose(); if (m.material !== mat) m.material = mat; }
    m.visible = true;
    return m;
  }

  highlight(kind: HighlightKind, cells: Array<[number, number]> | Cell[], id: string = kind) {
    const list = cells.map((c: any) => (Array.isArray(c) ? c : [c.x, c.z])) as Array<[number, number]>;
    if (!list.length) { this.clearHighlight(id); return; }
    const mat = tileMaterial(HL_COLORS[kind], kind !== 'path', kind === 'aoe' ? 0.7 : 0.5);
    this.hl.set(id, this.tiles(this.hl.get(id), list, mat, kind === 'aoe' ? 0.045 : 0.035));
  }
  clearHighlight(id?: string) {
    if (id) { const m = this.hl.get(id); if (m) m.visible = false; return; }
    for (const m of this.hl.values()) m.visible = false;
  }
  /** is highlight `id` currently shown */
  isHighlighted(id: string) { return !!this.hl.get(id)?.visible; }

  setCursor(x: number, z: number, visible = true) {
    this.cursor = [x, z];
    const c = this.grid.cell(x, z);
    if (!c) { this.cursorMesh.visible = false; return; }
    this.tiles(this.cursorMesh, [[x, z]], this.cursorMesh.material as Material, 0.06);
    this.cursorMesh.visible = visible;
  }
  hideCursor() { this.cursorMesh.visible = false; }

  /** persistent goal marker (reach objectives) — survives clearHighlight() */
  markGoal(cells: Array<[number, number]>) {
    this.scene.add(this.makeTileMesh(cells, tileMaterial('#ffd24a', true, 0.75), 0.05));
  }

  /** persistent marker for charged spell targets */
  markCharge(uid: number, cells: Array<[number, number]>) {
    this.chargeMarks.set(uid, this.tiles(this.chargeMarks.get(uid), cells, tileMaterial(HL_COLORS.charge, true, 0.35), 0.04));
  }
  unmarkCharge(uid: number) { const m = this.chargeMarks.get(uid); if (m) m.visible = false; }

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
    // set every frame: when stages swap, the old one's dispose() runs after the new one's init()
    input.analogCamera = this.userCamera;
    this.analogCamera(dt);
    this.cam.update(dt);
    this.vfx.update(sdt, this.cam.cam);
    // storms: distant lightning
    if (this.env.time === 'storm') {
      this.stormT -= dt;
      if (this.stormT <= 0) {
        this.stormT = 5 + Math.random() * 9;
        this.post.flash('#e8f0ff', 0.45);
        this.env.lightning();
        gameClock.schedule(() => audio.sfx('thunderclap', { volume: 0.6 }), 250 + Math.random() * 600);
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
    releaseTree(this.scene); // highlights, goal markers, environment, lights' shadow maps
  }
}
