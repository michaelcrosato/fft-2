// Visual wrapper for a unit on the field: model + animator + team marker,
// walking/jumping along paths, facing, KO/crystal/chest transforms.
import { THREE } from '../gfx/three';
import type { Facing, ItemDef, JobDef, CharLook } from '../data/types';
import { buildHumanoid } from '../gfx/models/humanoid';
import { Animator, type ClipName } from '../gfx/models/anim';
import type { UnitModel } from '../gfx/models/rig';
import type { TerrainView } from '../gfx/terrain';
import { HS } from '../gfx/terrain';
import type { Group, Mesh, Object3D, Vector3 } from 'three/webgpu';
import { audio } from '../audio/audio';

let buildMonsterFn: ((look: any, opts?: any) => UnitModel) | null = null;
// optional module (glob returns {} when the file doesn't exist)
const monsterMods = import.meta.glob('../gfx/models/monsters.ts');
export async function loadMonsterBuilder() {
  try {
    const f = monsterMods['../gfx/models/monsters.ts'];
    if (f) { const mod: any = await f(); buildMonsterFn = mod.buildMonster ?? null; }
  } catch { buildMonsterFn = null; }
}
export function getMonsterBuilder() { return buildMonsterFn; }

export const FACING_ROT: Record<Facing, number> = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };
export const TEAM_COLORS = ['#4a8ef0', '#e0402a', '#48c060'];

export interface UnitViewSpec {
  job: JobDef;
  look: CharLook;
  gender: 'm' | 'f' | 'monster';
  weapon?: ItemDef | null;
  weapon2?: ItemDef | null;
  shield?: ItemDef | null;
  team: number;
  guest?: boolean;
  name?: string;
}

/** enemy palette variation so opposing generics read differently */
function enemyPalette(job: JobDef, team: number) {
  if (team === 0) return undefined;
  const p = job.look.palette;
  const shift = (hex: string, amt: number) => {
    const c = new THREE.Color(hex);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL((hsl.h + amt + 1) % 1, Math.min(1, hsl.s * 1.05), hsl.l * 0.9);
    return '#' + c.getHexString();
  };
  if (team === 1) return { ...p, primary: shift(p.primary, 0.47), secondary: shift(p.secondary, 0.1), accent: shift(p.accent, 0.5) };
  return { ...p, primary: shift(p.primary, 0.25), accent: shift(p.accent, 0.3) };
}

export class UnitView {
  readonly root: Group;
  readonly model: UnitModel;
  readonly anim: Animator;
  readonly marker: Mesh;
  readonly spec: UnitViewSpec;
  x = 0; z = 0;
  facing: Facing = 'S';
  private targetRot = 0;
  private terrain: TerrainView;
  private crystalObj: Object3D | null = null;
  floating = false;
  team: number;
  koCounter: HTMLElement | null = null;

  constructor(spec: UnitViewSpec, terrain: TerrainView) {
    this.spec = spec;
    this.team = spec.team;
    this.terrain = terrain;
    this.root = new THREE.Group();
    if (spec.job.monster && buildMonsterFn) {
      this.model = buildMonsterFn(spec.job.monster, { team: spec.team });
    } else if (spec.job.monster) {
      // fallback until monster builder exists: a simple creature from humanoid parts
      this.model = buildHumanoid({ job: { ...spec.job.look, palette: spec.job.monster.palette }, look: { hairStyle: 'wild', hair: spec.job.monster.palette.secondary, skin: spec.job.monster.palette.primary }, gender: 'm' });
    } else {
      this.model = buildHumanoid({
        job: spec.job.look, look: spec.look, gender: spec.gender === 'f' ? 'f' : 'm',
        weapon: spec.weapon, weapon2: spec.weapon2, shield: spec.shield, team: spec.team,
        palette: spec.look.outfit?.palette ? undefined : enemyPalette(spec.job, spec.team),
      });
    }
    this.root.add(this.model.root);
    this.anim = new Animator(this.model);
    if ((this.model as any).hover) this.anim.hover = 0.25;
    // team marker: soft glowing ring under the feet
    const ringGeo = new THREE.RingGeometry(0.3, 0.4, 28);
    const ringMat = new THREE.MeshBasicMaterial({ color: TEAM_COLORS[spec.guest ? 2 : spec.team] ?? '#fff', transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    this.marker = new THREE.Mesh(ringGeo, ringMat);
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.03;
    this.marker.renderOrder = 3;
    this.root.add(this.marker);
    // blob shadow for grounding
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; blob.renderOrder = 2;
    this.root.add(blob);
  }

  setTeam(team: number, guest = false) {
    this.team = team;
    (this.marker.material as any).color.set(TEAM_COLORS[guest ? 2 : team] ?? '#fff');
  }

  worldPos(x: number, z: number): Vector3 {
    const p = this.terrain.tileCenter(x, z);
    const c = this.terrain.grid.cell(x, z);
    if (c && c.depth > 0 && !this.floating) p.y += 0; // wade in water
    if (c && this.floating && c.depth > 0) p.y += c.depth * HS;
    return p;
  }

  place(x: number, z: number, facing?: Facing) {
    this.x = x; this.z = z;
    this.root.position.copy(this.worldPos(x, z));
    if (facing) { this.facing = facing; this.targetRot = FACING_ROT[facing]; this.model.root.rotation.y = this.targetRot; }
  }

  face(f: Facing, instant = false) {
    this.facing = f;
    this.targetRot = FACING_ROT[f];
    if (instant) this.model.root.rotation.y = this.targetRot;
  }

  faceToward(p: Vector3) {
    const d = p.clone().sub(this.root.position);
    if (Math.abs(d.x) < 0.01 && Math.abs(d.z) < 0.01) return;
    this.targetRot = Math.atan2(d.x, d.z);
  }

  get chest(): Vector3 { return this.root.position.clone().add(new THREE.Vector3(0, 0.55 * this.model.height, 0)); }
  get head(): Vector3 { return this.root.position.clone().add(new THREE.Vector3(0, 1.15 * this.model.height, 0)); }

  update(dt: number) {
    this.anim.update(dt);
    // smooth rotation (shortest arc)
    let r = this.model.root.rotation.y;
    let d = this.targetRot - r;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    r += d * Math.min(1, dt * 12);
    this.model.root.rotation.y = r;
    if (this.crystalObj) this.crystalObj.rotation.y += dt * 0.8;
  }

  /** walk along a path of cells; hops for height changes */
  async walk(path: Array<[number, number]>, speed = 1) {
    if (path.length < 2) return;
    this.anim.setBase('walk');
    for (let i = 1; i < path.length; i++) {
      const [ax, az] = path[i - 1], [bx, bz] = path[i];
      const a = this.worldPos(ax, az), b = this.worldPos(bx, bz);
      this.faceToward(b);
      const dh = b.y - a.y;
      const dist = Math.hypot(bx - ax, bz - az);
      const hop = Math.abs(dh) > 0.15 || dist > 1.2;
      const dur = (hop ? 0.36 + Math.abs(dh) * 0.12 + (dist - 1) * 0.18 : 0.26) / speed;
      if (hop) audio.sfx('jump', { volume: 0.35 });
      await this.tween(dur, (t) => {
        const p = a.clone().lerp(b, t);
        if (hop) p.y += Math.sin(t * Math.PI) * (0.35 + Math.max(0, dh) * 0.9 + (dist - 1) * 0.3) + (dh > 0 ? 0 : 0);
        this.root.position.copy(p);
      });
      if (hop) audio.sfx('land', { volume: 0.3 });
      else if (i % 2 === 0) audio.sfx('step', { volume: 0.18 });
    }
    const [lx, lz] = path[path.length - 1];
    this.x = lx; this.z = lz;
    this.anim.setBase(this.baseIdle());
  }

  /** teleport shimmer */
  async blinkTo(x: number, z: number) {
    await this.tween(0.25, (t) => this.root.scale.setScalar(1 - t));
    this.place(x, z);
    await this.tween(0.25, (t) => this.root.scale.setScalar(t));
    this.root.scale.setScalar(1);
  }

  async leapUp() {
    this.anim.play('jump');
    const p0 = this.root.position.clone();
    await this.tween(0.45, (t) => { this.root.position.y = p0.y + t * t * 14; });
    this.root.visible = false;
  }

  async landOn(x: number, z: number) {
    this.place(x, z);
    this.root.visible = true;
    const p = this.root.position.clone();
    await this.tween(0.3, (t) => { this.root.position.y = p.y + (1 - t) * (1 - t) * 14; });
    this.root.position.y = p.y;
  }

  async knockTo(x: number, z: number) {
    const a = this.root.position.clone(), b = this.worldPos(x, z);
    await this.tween(0.25, (t) => { const p = a.clone().lerp(b, t); p.y += Math.sin(t * Math.PI) * 0.25; this.root.position.copy(p); });
    this.x = x; this.z = z;
  }

  baseIdle(): ClipName { return 'idle'; }

  setCritical(on: boolean) {
    if (this.anim.baseClip === 'dead') return;
    this.anim.setBase(on ? 'kneel' : 'idle');
  }

  async ko() {
    await this.anim.play('ko');
    this.anim.setBase('dead');
    this.marker.visible = false;
  }

  revive() {
    this.anim.setBase('idle');
    this.marker.visible = true;
  }

  becomeCrystal(kind: 'crystal' | 'chest') {
    this.model.root.visible = false;
    this.marker.visible = false;
    let obj: Object3D;
    if (kind === 'crystal') {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: this.team === 0 ? '#7ab8ff' : '#ff8a7a', emissive: this.team === 0 ? '#3a6ad8' : '#c83a2a', emissiveIntensity: 1.4, transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.3 }));
      m.scale.set(1, 1.6, 1);
      m.position.y = 0.55;
      obj = m;
    } else {
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.36), new THREE.MeshStandardMaterial({ color: '#8a5a2a', roughness: 0.8 }));
      box.position.y = 0.15;
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 8, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#9a6a32', roughness: 0.8 }));
      lid.rotation.z = Math.PI / 2; lid.position.y = 0.3;
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.38), new THREE.MeshStandardMaterial({ color: '#d8b040', metalness: 0.7, roughness: 0.3 }));
      band.position.y = 0.26;
      g.add(box, lid, band);
      obj = g;
    }
    this.crystalObj = obj;
    this.root.add(obj);
  }

  removeCrystal() {
    if (this.crystalObj) { this.root.remove(this.crystalObj); this.crystalObj = null; }
    this.root.visible = false;
  }

  tween(dur: number, fn: (t: number) => void): Promise<void> {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const step = () => {
        const t = Math.min(1, (performance.now() - t0) / 1000 / dur);
        fn(t);
        if (t >= 1) resolve(); else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  dispose() { this.model.dispose(); }
}
