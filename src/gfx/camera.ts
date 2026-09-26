// Tactical diorama camera: orbits a target in 90° steps (smoothly), two pitch
// presets, free orbit, pan, zoom, follow, cinematic moves and screen shake.
import { THREE } from './three';
import type { PerspectiveCamera, Vector3 } from 'three/webgpu';

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class TacticsCamera {
  readonly cam: PerspectiveCamera;
  target: Vector3;
  yaw = Math.PI / 4;          // 45° iso
  pitch = 0.62;               // ~35°
  dist = 30;
  private goal = { yaw: Math.PI / 4, pitch: 0.62, dist: 30, target: null as Vector3 | null };
  private anim: { from: { yaw: number; pitch: number; dist: number; target: Vector3 }; to: { yaw: number; pitch: number; dist: number; target: Vector3 }; t: number; dur: number; resolve: () => void } | null = null;
  private shakeT = 0;
  private shakeAmp = 0;
  minDist = 14;
  maxDist = 60;
  /** discrete rotation index 0..3 */
  rotIndex = 0;
  highAngle = false;
  /** pan limits for the look-at point (world x/z), set from the map size */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null = null;
  /** where recenter() returns to: the last point the game focused on, at the default distance */
  private home = { target: null as Vector3 | null, dist: 30 };

  constructor(aspect: number) {
    this.cam = new THREE.PerspectiveCamera(fovFor(aspect), aspect, 0.5, 400);
    this.target = new THREE.Vector3();
    this.goal.target = this.target.clone();
    this.apply();
  }

  setAspect(a: number) { this.cam.aspect = a; this.cam.fov = fovFor(a); this.cam.updateProjectionMatrix(); }

  /** snap everything (no animation) */
  snap(target: Vector3, dist?: number) {
    this.target.copy(target);
    this.goal.target = target.clone();
    this.home.target = target.clone();
    // tall screens: frame a little closer so tiles stay big enough to tap (pan/zoom reach the rest)
    if (dist && this.cam.aspect < 0.8) dist = Math.max(this.minDist, dist * 0.8);
    if (dist) { this.dist = dist; this.goal.dist = dist; this.home.dist = dist; }
    this.apply();
  }

  focus(target: Vector3) { this.goal.target = target.clone(); this.home.target = target.clone(); }
  /** true while a scripted cinematic move is playing */
  get animating() { return this.anim !== null; }
  rotate(dir: 1 | -1) {
    this.settleYaw(); // a half-finished free orbit snaps first, so presets stay on the 45° diagonals
    this.rotIndex = (this.rotIndex + dir + 4) % 4;
    this.goal.yaw += (dir * Math.PI) / 2;
  }
  togglePitch() {
    this.highAngle = !this.highAngle;
    this.goal.pitch = this.highAngle ? 1.05 : 0.62;
  }
  zoom(f: number) { if (isFinite(f) && f > 0) this.goal.dist = Math.max(this.minDist, Math.min(this.maxDist, this.goal.dist * f)); }
  orbitFree(dYaw: number, dPitch: number) {
    this.goal.yaw += dYaw;
    this.goal.pitch = Math.max(0.3, Math.min(1.35, this.goal.pitch + dPitch));
    this.highAngle = this.goal.pitch > 0.85;
  }
  /** move the look-at point in screen terms: +right = screen right, +fwd = into the screen (world units on the ground) */
  pan(right: number, fwd: number) {
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const t = (this.goal.target ??= this.target.clone());
    t.x += c * right - s * fwd;
    t.z += -s * right - c * fwd;
    if (this.bounds) {
      t.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, t.x));
      t.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, t.z));
    }
  }
  /** pan by a screen-space drag in pixels (the ground follows the pointer) */
  panPixels(dx: number, dy: number, viewH: number) {
    const perPx = (2 * this.dist * Math.tan((this.cam.fov * Math.PI) / 360)) / Math.max(1, viewH);
    this.pan(-dx * perPx, (dy * perPx) / Math.max(0.35, Math.sin(this.pitch)));
  }
  /** back to the last focused point at the default distance and pitch preset */
  recenter() {
    if (this.home.target) this.goal.target = this.home.target.clone();
    this.goal.dist = Math.max(this.minDist, Math.min(this.maxDist, this.home.dist));
    this.goal.pitch = this.highAngle ? 1.05 : 0.62;
    this.settleYaw();
  }
  /** nearest 90° snap after free orbit */
  settleYaw() {
    const q = Math.PI / 2;
    const base = Math.PI / 4;
    this.goal.yaw = Math.round((this.goal.yaw - base) / q) * q + base;
    this.rotIndex = (((Math.round((this.goal.yaw - base) / q)) % 4) + 4) % 4;
  }

  /** cinematic tween; resolves when finished */
  moveTo(opts: { target?: Vector3; yaw?: number; pitch?: number; dist?: number; time?: number }): Promise<void> {
    return new Promise((resolve) => {
      const to = {
        yaw: opts.yaw ?? this.goal.yaw,
        pitch: opts.pitch ?? this.goal.pitch,
        dist: opts.dist ?? this.goal.dist,
        target: opts.target?.clone() ?? (this.goal.target ?? this.target).clone(),
      };
      this.anim = { from: { yaw: this.yaw, pitch: this.pitch, dist: this.dist, target: this.target.clone() }, to, t: 0, dur: Math.max(0.01, opts.time ?? 1), resolve };
      this.goal = { ...to, target: to.target.clone() };
    });
  }

  shake(amp = 0.25, time = 0.35) { this.shakeAmp = Math.max(this.shakeAmp, amp); this.shakeT = Math.max(this.shakeT, time); }

  update(dt: number) {
    if (this.anim) {
      const a = this.anim;
      a.t += dt;
      const k = ease(Math.min(1, a.t / a.dur));
      this.yaw = a.from.yaw + (a.to.yaw - a.from.yaw) * k;
      this.pitch = a.from.pitch + (a.to.pitch - a.from.pitch) * k;
      this.dist = a.from.dist + (a.to.dist - a.from.dist) * k;
      this.target.lerpVectors(a.from.target, a.to.target, k);
      if (a.t >= a.dur) { this.anim = null; a.resolve(); }
    } else {
      const s = 1 - Math.pow(0.001, dt);   // framerate independent smoothing
      this.yaw += (this.goal.yaw - this.yaw) * s;
      this.pitch += (this.goal.pitch - this.pitch) * s;
      this.dist += (this.goal.dist - this.dist) * s;
      if (this.goal.target) this.target.lerp(this.goal.target, s * 0.9);
    }
    if (this.shakeT > 0) this.shakeT -= dt;
    this.apply();
  }

  private apply() {
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const x = Math.sin(this.yaw) * cp * this.dist;
    const z = Math.cos(this.yaw) * cp * this.dist;
    const y = sp * this.dist;
    this.cam.position.set(this.target.x + x, this.target.y + y, this.target.z + z);
    if (this.shakeT > 0) {
      const a = this.shakeAmp * Math.min(1, this.shakeT * 3);
      this.cam.position.x += (Math.random() - 0.5) * a;
      this.cam.position.y += (Math.random() - 0.5) * a;
    }
    this.cam.lookAt(this.target);
  }

  /** screen-relative grid direction for "up" arrow given current rotation */
  gridDir(key: 'up' | 'down' | 'left' | 'right'): [number, number] {
    // camera looks from +x+z quadrant at yaw 45°: screen-up ≈ -z (north) rotated by rotIndex
    const dirs: Array<[number, number]> = [[0, -1], [-1, 0], [0, 1], [1, 0]]; // up for rot 0..3
    const k = Math.round((this.yaw - Math.PI / 4) / (Math.PI / 2));
    const r = ((k % 4) + 4) % 4;
    const idx = { up: 0, left: 1, down: 2, right: 3 }[key];
    const d = dirs[(idx + r) % 4];
    // yaw 45° means up-arrow moves diagonally on screen; choose the axis more aligned with screen-up
    return d;
  }
}

/** vertical FOV that keeps at least the landscape horizontal view on tall (portrait) screens */
export function fovFor(aspect: number, BASE = 24, REF = 1.5) {
  if (aspect >= REF) return BASE;
  const half = Math.atan(Math.tan((BASE * Math.PI) / 360) * REF);
  return Math.min(62, (Math.atan(Math.tan(half) / aspect) * 360) / Math.PI);
}
