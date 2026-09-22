// Procedural animation for rigged unit models. Each clip writes additive
// offsets on top of the rest pose every frame.
import type { Object3D } from 'three/webgpu';
import type { UnitModel, BoneName } from './rig';

export type ClipName =
  | 'idle' | 'walk' | 'run' | 'jump' | 'swing' | 'thrust' | 'shoot' | 'bow' | 'gun' | 'cast' | 'pray' | 'punch'
  | 'kick' | 'throw' | 'item' | 'dance' | 'sing' | 'talk' | 'steal' | 'charge' | 'draw' | 'summon' | 'roar'
  | 'breath' | 'bite' | 'claw' | 'spin' | 'guard' | 'hurt' | 'dodge' | 'ko' | 'dead' | 'kneel' | 'victory'
  | 'surprised' | 'nod' | 'shake' | 'bow2' | 'point' | 'laugh' | 'cry' | 'sit' | 'crouch' | 'float' | 'raise'
  | 'fall' | 'attack' | 'none';

interface Pose { [bone: string]: { rx?: number; ry?: number; rz?: number; px?: number; py?: number; pz?: number; s?: number } }

interface Clip {
  dur: number;           // seconds (one-shots); loops use it as period
  loop: boolean;
  /** fraction of dur where the "impact" happens */
  hit?: number;
  fn: (p: number, t: number, pose: Pose, m: UnitModel) => void;
}

const S = Math.sin, C = Math.cos, PI = Math.PI;
const env = (p: number, a: number, b: number) => (p < a ? p / a : p > b ? Math.max(0, (1 - p) / (1 - b)) : 1);
const smooth = (x: number) => x * x * (3 - 2 * x);
const seg = (p: number, a: number, b: number) => smooth(Math.min(1, Math.max(0, (p - a) / (b - a))));

function set(pose: Pose, bone: string, v: Pose[string]) { pose[bone] = { ...(pose[bone] ?? {}), ...v }; }

export const CLIPS: Record<ClipName, Clip> = {
  none: { dur: 1, loop: true, fn: () => {} },
  idle: {
    dur: 2.4, loop: true, fn: (p, t, pose, m) => {
      const b = S(p * PI * 2);
      set(pose, 'body', { py: b * 0.008 });
      set(pose, 'torso', { rx: b * 0.02 });
      set(pose, 'head', { rx: -b * 0.02, ry: S(t * 0.4) * 0.08 });
      set(pose, 'armR', { rz: -b * 0.03 }); set(pose, 'armL', { rz: b * 0.03 });
      if (m.kind === 'monster') { set(pose, 'jaw', { rx: Math.max(0, b) * 0.1 }); set(pose, 'tail', { ry: S(t * 1.3) * 0.3 }); set(pose, 'wingL', { rz: b * 0.2 }); set(pose, 'wingR', { rz: -b * 0.2 }); }
    },
  },
  walk: {
    dur: 0.62, loop: true, fn: (p, t, pose, m) => {
      const a = S(p * PI * 2);
      const bob = Math.abs(C(p * PI * 2));
      set(pose, 'body', { py: bob * 0.03 });
      set(pose, 'legR', { rx: a * 0.6 }); set(pose, 'legL', { rx: -a * 0.6 });
      set(pose, 'kneeR', { rx: Math.max(0, -a) * 0.8 }); set(pose, 'kneeL', { rx: Math.max(0, a) * 0.8 });
      set(pose, 'armR', { rx: -a * 0.5 }); set(pose, 'armL', { rx: a * 0.5 });
      set(pose, 'torso', { ry: a * 0.08, rx: 0.06 });
      // quadrupeds
      set(pose, 'legFL', { rx: a * 0.6 }); set(pose, 'legBR', { rx: a * 0.6 });
      set(pose, 'legFR', { rx: -a * 0.6 }); set(pose, 'legBL', { rx: -a * 0.6 });
      set(pose, 'wingL', { rz: a * 0.6 }); set(pose, 'wingR', { rz: -a * 0.6 });
      set(pose, 'tail', { ry: a * 0.3 });
      void m; void t;
    },
  },
  run: { dur: 0.45, loop: true, fn: (p, t, pose, m) => CLIPS.walk.fn(p, t, pose, m) },
  jump: {
    dur: 0.5, loop: false, fn: (p, t, pose) => {
      const crouch = p < 0.25 ? p / 0.25 : p > 0.8 ? (1 - p) / 0.2 : 0;
      set(pose, 'body', { py: -crouch * 0.06 });
      set(pose, 'legR', { rx: -crouch * 0.6 }); set(pose, 'legL', { rx: -crouch * 0.6 });
      set(pose, 'kneeR', { rx: crouch * 1.2 }); set(pose, 'kneeL', { rx: crouch * 1.2 });
      const air = p > 0.25 && p < 0.8 ? 1 : 0;
      set(pose, 'armR', { rx: -air * 1.2, rz: -air * 0.4 }); set(pose, 'armL', { rx: -air * 1.2, rz: air * 0.4 });
    },
  },
  swing: {
    dur: 0.62, loop: false, hit: 0.5, fn: (p, t, pose) => {
      const up = seg(p, 0, 0.35), down = seg(p, 0.38, 0.52), rec = seg(p, 0.7, 1);
      const arm = -2.5 * up + 2.9 * down;
      set(pose, 'armR', { rx: arm * (1 - rec), rz: -0.2 * up * (1 - rec) });
      set(pose, 'elbowR', { rx: -0.6 * up * (1 - down) });
      set(pose, 'torso', { ry: (0.35 * up - 0.6 * down) * (1 - rec), rx: 0.18 * down * (1 - rec) });
      set(pose, 'body', { pz: 0.06 * down * (1 - rec) });
      set(pose, 'legR', { rx: -0.3 * down * (1 - rec) }); set(pose, 'legL', { rx: 0.25 * down * (1 - rec) });
    },
  },
  attack: { dur: 0.62, loop: false, hit: 0.5, fn: (p, t, pose, m) => (m.kind === 'monster' ? CLIPS.bite.fn(p, t, pose, m) : CLIPS.swing.fn(p, t, pose, m)) },
  thrust: {
    dur: 0.55, loop: false, hit: 0.45, fn: (p, t, pose) => {
      const back = seg(p, 0, 0.3), fwd = seg(p, 0.32, 0.45), rec = seg(p, 0.65, 1);
      const k = (1 - rec);
      set(pose, 'armR', { rx: (-1.2 * back - 0.4 * fwd) * k });
      set(pose, 'elbowR', { rx: (-1.2 * back + 1.1 * fwd) * k });
      set(pose, 'body', { pz: (-0.05 * back + 0.14 * fwd) * k });
      set(pose, 'torso', { rx: 0.2 * fwd * k, ry: -0.2 * back * k });
    },
  },
  shoot: { dur: 0.9, loop: false, hit: 0.7, fn: (p, t, pose, m) => CLIPS.bow.fn(p, t, pose, m) },
  bow: {
    dur: 0.9, loop: false, hit: 0.7, fn: (p, t, pose) => {
      const raise = seg(p, 0, 0.25), draw = seg(p, 0.25, 0.65), rec = seg(p, 0.8, 1);
      const k = 1 - rec;
      set(pose, 'armL', { rx: -1.55 * raise * k, rz: 0.1 * k });
      set(pose, 'elbowL', { rx: 0.2 * k });
      set(pose, 'armR', { rx: -1.5 * raise * k, rz: 0.4 * draw * k });
      set(pose, 'elbowR', { rx: -1.6 * draw * k });
      set(pose, 'torso', { ry: -0.5 * raise * k });
      set(pose, 'head', { ry: 0.4 * raise * k });
    },
  },
  gun: {
    dur: 0.8, loop: false, hit: 0.6, fn: (p, t, pose) => {
      const raise = seg(p, 0, 0.3), kick = p > 0.6 && p < 0.7 ? 1 : 0, rec = seg(p, 0.8, 1);
      const k = 1 - rec;
      set(pose, 'armR', { rx: (-1.5 * raise - 0.25 * kick) * k });
      set(pose, 'elbowR', { rx: 0.25 * k });
      set(pose, 'armL', { rx: -1.2 * raise * k, rz: -0.4 * raise * k });
      set(pose, 'torso', { ry: -0.15 * k, rx: -0.05 * kick });
    },
  },
  cast: {
    dur: 1.0, loop: true, hit: 0.6, fn: (p, t, pose) => {
      const w = S(t * 6) * 0.08;
      set(pose, 'armR', { rx: -2.3 + w, rz: -0.35 }); set(pose, 'armL', { rx: -2.3 - w, rz: 0.35 });
      set(pose, 'elbowR', { rx: -0.3 }); set(pose, 'elbowL', { rx: -0.3 });
      set(pose, 'body', { py: 0.03 + S(t * 3) * 0.015 });
      set(pose, 'head', { rx: -0.2 });
    },
  },
  summon: { dur: 1.0, loop: true, hit: 0.6, fn: (p, t, pose, m) => { CLIPS.cast.fn(p, t, pose, m); set(pose, 'body', { py: 0.07 + S(t * 3) * 0.02 }); } },
  pray: {
    dur: 1.2, loop: true, hit: 0.6, fn: (p, t, pose) => {
      set(pose, 'armR', { rx: -1.1, rz: 0.45 }); set(pose, 'armL', { rx: -1.1, rz: -0.45 });
      set(pose, 'elbowR', { rx: -1.1 }); set(pose, 'elbowL', { rx: -1.1 });
      set(pose, 'head', { rx: 0.3 });
      set(pose, 'body', { py: S(t * 2) * 0.01 });
    },
  },
  punch: {
    dur: 0.45, loop: false, hit: 0.4, fn: (p, t, pose) => {
      const wind = seg(p, 0, 0.25), hit = seg(p, 0.28, 0.4), rec = seg(p, 0.6, 1);
      const k = 1 - rec;
      set(pose, 'armR', { rx: (-0.4 * wind - 1.2 * hit) * k });
      set(pose, 'elbowR', { rx: (-1.8 * wind + 1.7 * hit) * k });
      set(pose, 'torso', { ry: (0.4 * wind - 0.7 * hit) * k });
      set(pose, 'body', { pz: 0.1 * hit * k });
      set(pose, 'armL', { rx: -0.8 * k, rz: 0.2 }); set(pose, 'elbowL', { rx: -1.4 * k });
    },
  },
  kick: {
    dur: 0.55, loop: false, hit: 0.45, fn: (p, t, pose) => {
      const up = seg(p, 0.1, 0.45), rec = seg(p, 0.6, 1);
      set(pose, 'legR', { rx: -1.4 * up * (1 - rec) }); set(pose, 'kneeR', { rx: 0.3 * (1 - up) * (1 - rec) });
      set(pose, 'torso', { rx: -0.2 * up * (1 - rec) });
      set(pose, 'armR', { rz: -0.8 * up * (1 - rec) }); set(pose, 'armL', { rz: 0.8 * up * (1 - rec) });
    },
  },
  throw: {
    dur: 0.6, loop: false, hit: 0.45, fn: (p, t, pose) => {
      const back = seg(p, 0, 0.3), fwd = seg(p, 0.3, 0.45), rec = seg(p, 0.6, 1);
      const k = 1 - rec;
      set(pose, 'armR', { rx: (-2.6 * back + 2.4 * fwd) * k, rz: -0.3 * back * k });
      set(pose, 'torso', { ry: (0.5 * back - 0.8 * fwd) * k });
      set(pose, 'legL', { rx: -0.3 * fwd * k });
    },
  },
  item: {
    dur: 0.7, loop: false, hit: 0.55, fn: (p, t, pose) => {
      const reach = seg(p, 0.1, 0.45), rec = seg(p, 0.7, 1);
      const k = 1 - rec;
      set(pose, 'armR', { rx: -1.3 * reach * k });
      set(pose, 'elbowR', { rx: -0.2 * k });
      set(pose, 'torso', { rx: 0.1 * reach * k });
    },
  },
  dance: {
    dur: 1.4, loop: true, hit: 0.5, fn: (p, t, pose) => {
      set(pose, 'body', { ry: p * PI * 2, py: Math.abs(S(p * PI * 4)) * 0.05 });
      set(pose, 'armR', { rx: -2.6, rz: -0.4 + S(t * 5) * 0.3 }); set(pose, 'armL', { rx: -1.2 + S(t * 5) * 0.4, rz: 0.9 });
      set(pose, 'legR', { rx: S(t * 5) * 0.3 }); set(pose, 'legL', { rx: -S(t * 5) * 0.3 });
    },
  },
  sing: {
    dur: 1.6, loop: true, hit: 0.5, fn: (p, t, pose) => {
      set(pose, 'armR', { rx: -1.0, rz: -0.8 + S(t * 3) * 0.2 }); set(pose, 'armL', { rx: -0.9, rz: 0.5 }); set(pose, 'elbowL', { rx: -1.3 });
      set(pose, 'head', { rx: -0.25 + S(t * 3) * 0.05, rz: S(t * 1.5) * 0.12 });
      set(pose, 'body', { py: S(t * 3) * 0.012, rz: S(t * 1.5) * 0.04 });
    },
  },
  talk: {
    dur: 0.9, loop: true, hit: 0.5, fn: (p, t, pose) => {
      set(pose, 'armR', { rx: -0.9 - S(t * 5) * 0.25, rz: -0.3 }); set(pose, 'elbowR', { rx: -0.8 });
      set(pose, 'head', { rx: S(t * 7) * 0.06 });
    },
  },
  steal: {
    dur: 0.6, loop: false, hit: 0.45, fn: (p, t, pose) => {
      const dash = seg(p, 0.1, 0.4), rec = seg(p, 0.65, 1);
      const k = 1 - rec;
      set(pose, 'body', { pz: 0.25 * dash * k });
      set(pose, 'torso', { rx: 0.4 * dash * k });
      set(pose, 'armR', { rx: -1.4 * dash * k });
    },
  },
  charge: {
    dur: 0.8, loop: true, fn: (p, t, pose) => {
      set(pose, 'body', { py: -0.04 });
      set(pose, 'legR', { rx: -0.4 }); set(pose, 'legL', { rx: 0.3 }); set(pose, 'kneeR', { rx: 0.6 }); set(pose, 'kneeL', { rx: 0.5 });
      set(pose, 'torso', { rx: 0.25 });
      set(pose, 'armR', { rx: -0.6 + S(t * 12) * 0.03 });
    },
  },
  draw: {
    dur: 0.9, loop: false, hit: 0.55, fn: (p, t, pose) => {
      const crouch = seg(p, 0, 0.35), slash = seg(p, 0.45, 0.58), rec = seg(p, 0.75, 1);
      const k = 1 - rec;
      set(pose, 'body', { py: -0.05 * crouch * k });
      set(pose, 'armR', { rx: (0.2 * crouch - 1.8 * slash) * k, rz: (0.6 * crouch - 1.2 * slash) * k });
      set(pose, 'torso', { ry: (0.6 * crouch - 1.0 * slash) * k });
      set(pose, 'legR', { rx: -0.5 * crouch * k }); set(pose, 'kneeR', { rx: 0.7 * crouch * k });
    },
  },
  roar: {
    dur: 0.9, loop: false, hit: 0.5, fn: (p, t, pose) => {
      const up = seg(p, 0, 0.3), rec = seg(p, 0.7, 1);
      const k = up * (1 - rec);
      set(pose, 'head', { rx: -0.5 * k }); set(pose, 'jaw', { rx: 0.7 * k });
      set(pose, 'body', { rx: -0.15 * k, py: 0.04 * k });
      set(pose, 'armR', { rx: -1.8 * k, rz: -0.8 * k }); set(pose, 'armL', { rx: -1.8 * k, rz: 0.8 * k });
      set(pose, 'wingL', { rz: 0.9 * k }); set(pose, 'wingR', { rz: -0.9 * k });
    },
  },
  breath: {
    dur: 1.1, loop: false, hit: 0.55, fn: (p, t, pose) => {
      const back = seg(p, 0, 0.35), fwd = seg(p, 0.4, 0.55), rec = seg(p, 0.8, 1);
      const k = 1 - rec;
      set(pose, 'head', { rx: (-0.5 * back + 0.5 * fwd) * k }); set(pose, 'jaw', { rx: 0.8 * fwd * k });
      set(pose, 'neck', { rx: (-0.3 * back + 0.4 * fwd) * k });
      set(pose, 'body', { pz: 0.05 * fwd * k });
    },
  },
  bite: {
    dur: 0.6, loop: false, hit: 0.5, fn: (p, t, pose) => {
      const lunge = seg(p, 0.2, 0.48), rec = seg(p, 0.65, 1);
      const k = 1 - rec;
      set(pose, 'body', { pz: 0.22 * lunge * k, rx: 0.1 * lunge * k });
      set(pose, 'head', { rx: 0.25 * lunge * k }); set(pose, 'jaw', { rx: (0.7 * seg(p, 0.1, 0.35) - 0.7 * lunge) * k });
      set(pose, 'neck', { rx: 0.3 * lunge * k });
      set(pose, 'armR', { rx: -1.6 * lunge * k }); set(pose, 'armL', { rx: -1.6 * lunge * k });
    },
  },
  claw: {
    dur: 0.55, loop: false, hit: 0.45, fn: (p, t, pose, m) => {
      CLIPS.bite.fn(p, t, pose, m);
      const s = seg(p, 0.2, 0.45) * (1 - seg(p, 0.65, 1));
      set(pose, 'legFR', { rx: -1.2 * s }); set(pose, 'armR', { rx: -2.0 * s });
    },
  },
  spin: {
    dur: 0.7, loop: false, hit: 0.5, fn: (p, t, pose) => {
      set(pose, 'body', { ry: seg(p, 0.1, 0.8) * PI * 2 });
      set(pose, 'armR', { rz: -1.3 * env(p, 0.2, 0.8) }); set(pose, 'armL', { rz: 1.3 * env(p, 0.2, 0.8) });
    },
  },
  guard: {
    dur: 1, loop: true, fn: (p, t, pose) => {
      set(pose, 'armL', { rx: -1.2, rz: -0.3 }); set(pose, 'elbowL', { rx: -1.0 });
      set(pose, 'armR', { rx: -0.6 }); set(pose, 'body', { py: -0.02 });
      set(pose, 'legR', { rx: 0.2 }); set(pose, 'legL', { rx: -0.25 }); set(pose, 'kneeL', { rx: 0.3 });
    },
  },
  hurt: {
    dur: 0.45, loop: false, fn: (p, t, pose) => {
      const k = S(Math.min(1, p) * PI);
      set(pose, 'body', { pz: -0.08 * k, rx: -0.25 * k });
      set(pose, 'head', { rx: -0.35 * k });
      set(pose, 'armR', { rx: -0.6 * k, rz: -0.4 * k }); set(pose, 'armL', { rx: -0.6 * k, rz: 0.4 * k });
    },
  },
  dodge: {
    dur: 0.4, loop: false, fn: (p, t, pose) => {
      const k = S(Math.min(1, p) * PI);
      set(pose, 'body', { px: 0.12 * k, py: 0.04 * k, rz: -0.2 * k });
    },
  },
  ko: {
    dur: 0.8, loop: false, fn: (p, t, pose) => {
      const f = seg(p, 0, 0.6);
      set(pose, 'body', { rx: -1.45 * f, py: 0.14 * f * (1 - f) * 4 * 0.25 + 0.05 * f, pz: -0.2 * f });
      set(pose, 'armR', { rx: -2.6 * f, rz: -0.6 * f }); set(pose, 'armL', { rx: -2.4 * f, rz: 0.7 * f });
      set(pose, 'head', { rz: 0.4 * f });
      set(pose, 'legR', { rx: 0.2 * f }); set(pose, 'legL', { rx: -0.15 * f });
    },
  },
  dead: { dur: 1, loop: true, fn: (p, t, pose, m) => CLIPS.ko.fn(1, t, pose, m) },
  fall: { dur: 0.8, loop: false, fn: (p, t, pose, m) => CLIPS.ko.fn(p, t, pose, m) },
  kneel: {
    dur: 2.4, loop: true, fn: (p, t, pose) => {
      const b = S(p * PI * 2);
      set(pose, 'body', { py: -0.1 });
      set(pose, 'legR', { rx: -1.3 }); set(pose, 'kneeR', { rx: 1.4 });
      set(pose, 'legL', { rx: 0.3 }); set(pose, 'kneeL', { rx: 1.7 });
      set(pose, 'torso', { rx: 0.35 + b * 0.03 });
      set(pose, 'head', { rx: 0.25 });
      set(pose, 'armR', { rx: -0.4 }); set(pose, 'elbowR', { rx: -0.6 });
      set(pose, 'armL', { rx: -0.2, rz: 0.3 });
    },
  },
  victory: {
    dur: 1.2, loop: true, fn: (p, t, pose) => {
      const h = Math.abs(S(p * PI * 2));
      set(pose, 'body', { py: h * 0.08 });
      set(pose, 'armR', { rx: -2.9, rz: -0.2 }); set(pose, 'elbowR', { rx: -0.1 });
      set(pose, 'armL', { rz: 0.5 });
      set(pose, 'head', { rx: -0.2 });
    },
  },
  raise: {
    dur: 1.2, loop: true, fn: (p, t, pose) => {
      set(pose, 'armR', { rx: -2.9, rz: -0.1 }); set(pose, 'elbowR', { rx: 0 });
      set(pose, 'head', { rx: -0.25 });
    },
  },
  surprised: {
    dur: 0.6, loop: false, fn: (p, t, pose) => {
      const h = S(Math.min(1, p / 0.5) * PI);
      set(pose, 'body', { py: h * 0.1 });
      set(pose, 'armR', { rx: -0.6, rz: -0.9 * h }); set(pose, 'armL', { rx: -0.6, rz: 0.9 * h });
      set(pose, 'head', { rx: -0.2 * h });
    },
  },
  nod: { dur: 0.7, loop: false, fn: (p, t, pose) => set(pose, 'head', { rx: S(p * PI * 2) * 0.3 }) },
  shake: { dur: 0.8, loop: false, fn: (p, t, pose) => set(pose, 'head', { ry: S(p * PI * 4) * 0.35 }) },
  bow2: {
    dur: 1.2, loop: false, fn: (p, t, pose) => {
      const k = S(Math.min(1, p) * PI);
      set(pose, 'torso', { rx: 0.7 * k }); set(pose, 'head', { rx: 0.3 * k });
      set(pose, 'armR', { rx: -0.6 * k, rz: 0.5 * k }); set(pose, 'elbowR', { rx: -1.2 * k });
    },
  },
  point: {
    dur: 1.0, loop: true, fn: (p, t, pose) => {
      set(pose, 'armR', { rx: -1.55, rz: -0.15 }); set(pose, 'elbowR', { rx: 0 });
      set(pose, 'torso', { ry: -0.15 });
    },
  },
  laugh: {
    dur: 0.5, loop: true, fn: (p, t, pose) => {
      set(pose, 'torso', { rx: -0.15 + S(p * PI * 2) * 0.05 });
      set(pose, 'head', { rx: -0.3 + S(p * PI * 4) * 0.06 });
      set(pose, 'armR', { rx: -0.3, rz: 0.4 }); set(pose, 'elbowR', { rx: -1.2 });
      set(pose, 'armL', { rx: -0.3, rz: -0.4 }); set(pose, 'elbowL', { rx: -1.2 });
    },
  },
  cry: {
    dur: 1.4, loop: true, fn: (p, t, pose) => {
      set(pose, 'head', { rx: 0.45 + S(t * 9) * 0.02 });
      set(pose, 'torso', { rx: 0.25 });
      set(pose, 'armR', { rx: -1.4, rz: 0.4 }); set(pose, 'elbowR', { rx: -1.7 });
      set(pose, 'armL', { rx: -1.4, rz: -0.4 }); set(pose, 'elbowL', { rx: -1.7 });
      set(pose, 'body', { py: S(t * 9) * 0.004 });
    },
  },
  sit: {
    dur: 3, loop: true, fn: (p, t, pose) => {
      set(pose, 'body', { py: -0.2 });
      set(pose, 'legR', { rx: -1.5 }); set(pose, 'legL', { rx: -1.5 });
      set(pose, 'kneeR', { rx: 1.5 }); set(pose, 'kneeL', { rx: 1.5 });
      set(pose, 'armR', { rx: -0.5 }); set(pose, 'armL', { rx: -0.5 });
      set(pose, 'torso', { rx: S(p * PI * 2) * 0.02 });
    },
  },
  crouch: {
    dur: 2, loop: true, fn: (p, t, pose) => {
      set(pose, 'body', { py: -0.12 });
      set(pose, 'legR', { rx: -1.1 }); set(pose, 'legL', { rx: -0.9 });
      set(pose, 'kneeR', { rx: 2.0 }); set(pose, 'kneeL', { rx: 1.8 });
      set(pose, 'torso', { rx: 0.4 });
    },
  },
  float: {
    dur: 2.2, loop: true, fn: (p, t, pose) => {
      set(pose, 'body', { py: 0.2 + S(p * PI * 2) * 0.05 });
      set(pose, 'legR', { rx: 0.2 }); set(pose, 'legL', { rx: 0.1 }); set(pose, 'kneeR', { rx: 0.4 }); set(pose, 'kneeL', { rx: 0.3 });
      set(pose, 'armR', { rz: -0.5 }); set(pose, 'armL', { rz: 0.5 });
    },
  },
};

export class Animator {
  readonly model: UnitModel;
  private base: ClipName = 'idle';
  private oneShot: { clip: ClipName; t: number; speed: number; resolve?: () => void; hitCb?: () => void; hitDone: boolean } | null = null;
  private t = 0;
  private pose: Pose = {};
  /** extra per-frame offsets (e.g. hover for float status) */
  hover = 0;

  constructor(model: UnitModel) { this.model = model; }

  setBase(c: ClipName) { if (this.base !== c) { this.base = c; } }
  get baseClip() { return this.base; }

  /** play a one-shot; resolves at the end. onHit fires at the clip's impact point */
  play(c: ClipName, opts: { speed?: number; onHit?: () => void } = {}): Promise<void> {
    const clip = CLIPS[c] ?? CLIPS.swing;
    if (clip.loop) { this.setBase(c); opts.onHit?.(); return Promise.resolve(); }
    if (this.oneShot?.resolve) this.oneShot.resolve();
    return new Promise((resolve) => {
      this.oneShot = { clip: c, t: 0, speed: opts.speed ?? 1, resolve, hitCb: opts.onHit, hitDone: false };
    });
  }

  hitTime(c: ClipName) { const clip = CLIPS[c]; return clip ? clip.dur * (clip.hit ?? 0.5) : 0.3; }

  update(dt: number) {
    this.t += dt;
    const pose: Pose = (this.pose = {});
    const m = this.model;
    const base = CLIPS[this.base];
    if (!this.oneShot || this.oneShot && !['ko', 'fall'].includes(this.oneShot.clip)) {
      base.fn((this.t / base.dur) % 1, this.t, pose, m);
    }
    if (this.oneShot) {
      const o = this.oneShot;
      o.t += dt * o.speed;
      const clip = CLIPS[o.clip];
      const p = Math.min(1, o.t / clip.dur);
      const shotPose: Pose = {};
      clip.fn(p, o.t, shotPose, m);
      // blend in/out quickly
      const w = Math.min(1, p / 0.08, (1 - p) / 0.08 + (o.clip === 'ko' || o.clip === 'fall' ? 1 : 0));
      for (const [bone, v] of Object.entries(shotPose)) {
        const cur = (pose[bone] ??= {});
        for (const k of Object.keys(v) as Array<keyof typeof v>) {
          const a = (cur[k] as number) ?? 0;
          (cur as any)[k] = a * (1 - w) + (v[k] as number) * w;
        }
      }
      if (!o.hitDone && p >= (clip.hit ?? 0.5)) { o.hitDone = true; o.hitCb?.(); }
      if (p >= 1) {
        this.oneShot = null;
        if (o.clip === 'ko' || o.clip === 'fall') this.base = 'dead';
        o.resolve?.();
      }
    }
    if (this.hover) set(pose, 'body', { py: ((pose.body?.py as number) ?? 0) + this.hover + Math.sin(this.t * 2.2) * 0.04 });
    this.apply(pose);
  }

  private apply(pose: Pose) {
    const m = this.model;
    for (const [bone, rest] of m.rest) {
      const name = bone.name as BoneName;
      const v = pose[name];
      bone.rotation.set(rest.rx + (v?.rx ?? 0), rest.ry + (v?.ry ?? 0), rest.rz + (v?.rz ?? 0));
      bone.position.set(rest.px + (v?.px ?? 0), rest.py + (v?.py ?? 0), rest.pz + (v?.pz ?? 0));
      if (v?.s !== undefined) bone.scale.setScalar(rest.sx * v.s);
    }
  }
}

export function boneOf(m: UnitModel, n: BoneName): Object3D | undefined { return m.bones[n]; }
