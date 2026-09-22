// Tactical diorama camera: orbits a target in 90° steps (smoothly), two pitch
// presets, zoom, follow, cinematic moves and screen shake.
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
    if (dist) { this.dist = dist; this.goal.dist = dist; }
    this.apply();
  }

  focus(target: Vector3) { this.goal.target = target.clone(); }
  rotate(dir: 1 | -1) {
    this.rotIndex = (this.rotIndex + dir + 4) % 4;
    this.goal.yaw += (dir * Math.PI) / 2;
  }
  togglePitch() {
    this.highAngle = !this.highAngle;
    this.goal.pitch = this.highAngle ? 1.05 : 0.62;
  }
  zoom(f: number) { this.goal.dist = Math.max(this.minDist, Math.min(this.maxDist, this.goal.dist * f)); }
  orbitFree(dYaw: number, dPitch: number) {
    this.goal.yaw += dYaw;
    this.goal.pitch = Math.max(0.25, Math.min(1.35, this.goal.pitch + dPitch));
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
function fovFor(aspect: number) {
  const BASE = 24, REF = 1.5;
  if (aspect >= REF) return BASE;
  const half = Math.atan(Math.tan((BASE * Math.PI) / 360) * REF);
  return Math.min(62, (Math.atan(Math.tan(half) / aspect) * 360) / Math.PI);
}
