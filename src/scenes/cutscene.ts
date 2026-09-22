// Cutscene script interpreter (story scenes and mid-battle scripts).
import type { SceneCmd, Facing, StatusId, EnvTime, Weather } from '../data/types';
import { say, narrate, titleCard, fade, menu } from '../ui/widgets';
import type { Stage } from './stage';
import type { UnitView } from './unitview';
import type { ClipName } from '../gfx/models/anim';
import { THREE } from '../gfx/three';
import { audio } from '../audio/audio';
import { h, uiRoot } from '../ui/dom';
import { input } from '../ui/input';

export interface SceneHost {
  stage(): Stage;
  changeMap(mapId: string, opts: { time?: EnvTime; weather?: Weather }): Promise<void>;
  actor(id: string): UnitView | undefined;
  spawn(id: string, charOrJob: string, x: number, z: number, facing: Facing, opts: { job?: string; team?: number; name?: string; hidden?: boolean }): UnitView | undefined;
  despawn(id: string): void;
  nameOf(id: string): string;
  portraitOf(id: string): Promise<string | null>;
  setFlag(f: string, v: boolean | number): void;
  getFlag(f: string): boolean;
  join(c: string): void;
  leave(c: string): void;
  item(id: string, n: number): void;
  gil(n: number): void;
  chronicle(id: string): void;
  heroName(): string;
  battle?: {
    reveal(id: string): Promise<void>;
    retreat(id: string): Promise<void>;
    end(r: 'victory' | 'defeat'): void;
    heal(id: string): void;
    status(id: string, s: StatusId, on: boolean): void;
  };
}

const EMOTE_TEXT: Record<string, string> = { '!': '!', '?': '?', '...': '…', note: '♪', anger: '💢', sweat: '💧', heart: '♥', zzz: 'z z', tear: '💧' };

export function fillText(t: string, host: SceneHost) { return t.replace(/\{hero\}/g, host.heroName()); }

let skipAll = false;

export async function runScene(cmds: SceneCmd[], host: SceneHost): Promise<void> {
  skipAll = !!(window as any).__autoPlay;
  // skip button
  const skip = h('div.btn.ghost', { style: { position: 'absolute', right: '14px', top: '12px', color: '#efe3c6', borderColor: 'rgba(240,210,140,.4)', fontSize: '0.8em', padding: '3px 10px' }, onclick: () => { skipAll = true; input.dispatch('confirm'); } }, 'Skip ⏭');
  uiRoot().appendChild(skip);
  try {
    await runCmds(cmds, host);
  } finally {
    skip.remove();
  }
}

async function runCmds(cmds: SceneCmd[], host: SceneHost): Promise<void> {
  for (const c of cmds) {
    await runCmd(c, host);
  }
}

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, skipAll ? 0 : ms / (input.fast ? 3 : 1))); }

async function runCmd(c: SceneCmd, host: SceneHost): Promise<void> {
  const st = () => host.stage();
  switch (c[0]) {
    case 'narrate': if (!skipAll) await narrate(fillText(c[1], host)); return;
    case 'title': if (!skipAll) await titleCard(fillText(c[1], host), c[2] ? fillText(c[2], host) : undefined); return;
    case 'map': await host.changeMap(c[1], c[2] ?? {}); return;
    case 'actor': {
      const [, id, who, x, z, facing, opts] = c;
      host.spawn(id, who, x, z, facing ?? 'S', opts ?? {});
      return;
    }
    case 'remove': host.despawn(c[1]); return;
    case 'hide': { const v = host.actor(c[1]); if (v) v.root.visible = false; return; }
    case 'show': { const v = host.actor(c[1]); if (v) v.root.visible = true; return; }
    case 'move': {
      const [, id, x, z, opts] = c;
      const v = host.actor(id);
      if (!v) return;
      const path = straightPath(v.x, v.z, x, z, st());
      const p = v.walk(path, skipAll ? 20 : opts?.run ? 1.6 : 1);
      if (opts?.wait === false) return;
      await p;
      return;
    }
    case 'face': {
      const [, id, f] = c;
      const v = host.actor(id);
      if (!v) return;
      if (f === 'N' || f === 'S' || f === 'E' || f === 'W') v.face(f);
      else { const o = host.actor(f); if (o) v.faceToward(o.root.position); }
      await sleep(120);
      return;
    }
    case 'say': {
      if (skipAll) return;
      const [, id, text, opts] = c;
      const v = host.actor(id);
      if (v) st().cam.focus(v.root.position.clone().add(new THREE.Vector3(0, 0.6, 0)));
      if (v && v.anim.baseClip === 'idle') v.anim.setBase('talk');
      const portrait = await host.portraitOf(id);
      await say(host.nameOf(id), fillText(text, host), { mood: opts?.mood, pos: opts?.pos, portrait });
      if (v && v.anim.baseClip === 'talk') v.anim.setBase('idle');
      return;
    }
    case 'anim': {
      const [, id, anim, opts] = c;
      const v = host.actor(id);
      if (!v) return;
      const map: Record<string, ClipName> = { idle: 'idle', walk: 'walk', kneel: 'kneel', bow: 'bow2', nod: 'nod', shake: 'shake', surprised: 'surprised', attack: 'swing', cast: 'cast', fall: 'fall', dead: 'dead', jump: 'jump', raise: 'raise', point: 'point', laugh: 'laugh', cry: 'cry', hurt: 'hurt', pray: 'pray', sit: 'sit', crouch: 'crouch', victory: 'victory', guard: 'guard', shoot: 'bow', throw: 'throw', float: 'float' };
      const clip = map[anim] ?? 'idle';
      const loops = ['idle', 'walk', 'kneel', 'dead', 'raise', 'point', 'laugh', 'cry', 'pray', 'sit', 'crouch', 'victory', 'guard', 'cast', 'float'];
      if (loops.includes(clip)) { v.anim.setBase(clip); if (opts?.wait) await sleep(800); }
      else { const p = v.anim.play(clip); if (opts?.wait !== false) await p; if (clip === 'fall') v.anim.setBase('dead'); }
      return;
    }
    case 'emote': {
      if (skipAll) return;
      const v = host.actor(c[1]);
      if (!v) return;
      const p = st().toScreen(v.head.add(new THREE.Vector3(0, 0.25, 0)));
      const el = h('div.floater.info', { style: { left: p.x + 'px', top: p.y + 'px', fontSize: '2em' } }, EMOTE_TEXT[c[2]] ?? c[2]);
      uiRoot().appendChild(el);
      audio.sfx(c[2] === '!' ? 'confirm' : 'cursor', { volume: 0.6 });
      await sleep(700);
      el.remove();
      return;
    }
    case 'camera': {
      const o = c[1];
      let target: import('three/webgpu').Vector3 | undefined;
      if (typeof o.at === 'string') { const v = host.actor(o.at); if (v) target = v.root.position.clone().add(new THREE.Vector3(0, 0.5, 0)); }
      else if (Array.isArray(o.at)) target = st().tileWorld(o.at[0], o.at[1]).add(new THREE.Vector3(0, 0.4, 0));
      const cam = st().cam;
      const span = Math.max(st().grid.w, st().grid.d);
      await cam.moveTo({
        target, time: skipAll ? 0.01 : o.time ?? 1,
        dist: o.zoom !== undefined ? span * 2.3 / Math.max(0.3, o.zoom) : undefined,
        yaw: o.rot !== undefined ? Math.PI / 4 + (o.rot * Math.PI) / 180 : undefined,
        pitch: o.tilt !== undefined ? (o.tilt * Math.PI) / 180 : undefined,
      });
      return;
    }
    case 'wait': await sleep(c[1] * 1000); return;
    case 'fade': await fade(c[1], skipAll ? 0.05 : c[2] ?? 0.8, c[3]); return;
    case 'music': if (c[1]) audio.playMusic(c[1], { fade: 1.2 }); else audio.stopMusic(1.2); return;
    case 'sfx': audio.sfx(c[1]); return;
    case 'vfx': {
      const [, id, at] = c;
      let p: import('three/webgpu').Vector3 | undefined;
      if (typeof at === 'string') p = host.actor(at)?.root.position.clone();
      else p = st().tileWorld(at[0], at[1]);
      if (p) await st().vfx.play(id as any, p.clone().add(new THREE.Vector3(0, 0.6, 0)), p);
      return;
    }
    case 'flag': host.setFlag(c[1], c[2] ?? true); return;
    case 'choice': {
      const [, prompt, opts] = c;
      if (skipAll) { if (opts[0]) await runCmds(opts[0][1], host); return; }
      const box = h('div.panel', { style: { left: '50%', top: '30%', transform: 'translateX(-50%)', textAlign: 'center', padding: '12px 22px' } }, h('div', { style: { fontSize: '1.15em', marginBottom: '6px' } }, fillText(prompt, host)));
      uiRoot().appendChild(box);
      const m = menu({ items: opts.map(([label], i) => ({ label: fillText(label, host), value: i })), parent: box, cancelable: false });
      m.el.style.position = 'relative';
      const pick = await m.promise;
      box.remove();
      if (pick !== null) await runCmds(opts[pick][1], host);
      return;
    }
    case 'join': host.join(c[1]); return;
    case 'leave': host.leave(c[1]); return;
    case 'item': host.item(c[1], c[2] ?? 1); return;
    case 'gil': host.gil(c[1]); return;
    case 'shake': st().cam.shake(c[1], c[2] ?? 0.5); return;
    case 'flash': st().post.flash(c[1] ?? '#ffffff', c[2] ?? 0.8); return;
    case 'weather': st().vfx.setWeather(c[1]); return;
    case 'time': return; // time-of-day changes require a map rebuild; ignored mid-scene
    case 'chronicle': host.chronicle(c[1]); return;
    case 'if': { const [, f, a, b] = c; await runCmds(host.getFlag(f) ? a : b ?? [], host); return; }
    case 'reveal': await host.battle?.reveal(c[1]); return;
    case 'retreat': await host.battle?.retreat(c[1]); return;
    case 'battleEnd': host.battle?.end(c[1]); return;
    case 'heal': host.battle?.heal(c[1]); return;
    case 'status': host.battle?.status(c[1], c[2], c[3]); return;
  }
}

/** simple L-shaped path for scripted walking (actors walk regardless of obstacles) */
function straightPath(x0: number, z0: number, x1: number, z1: number, stage: Stage): Array<[number, number]> {
  const path: Array<[number, number]> = [[x0, z0]];
  let x = x0, z = z0;
  while (x !== x1) { x += Math.sign(x1 - x); path.push([x, z]); }
  while (z !== z1) { z += Math.sign(z1 - z); path.push([x, z]); }
  void stage;
  return path;
}
