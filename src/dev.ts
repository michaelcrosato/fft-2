// Visual test bed: ?map=<id>&renderer=webgpu|webgl2|webgl1&time=<EnvTime>
// Monster gallery: ?gallery=monsters[&only=<job ids or shapes, comma list>][&cols=n]
//   [&zoom=<camera distance>][&yaw=<rad>][&pitch=<rad>][&face=<rad>][&clip=<ClipName>][&labels=0]
//   [&target=x,y,z]
import { initRenderer, renderer, rinfo } from './gfx/renderer';
import { THREE } from './gfx/three';
import { loadTSL } from './gfx/materials';
import { TerrainView, HS } from './gfx/terrain';
import { Environment } from './gfx/env';
import { TacticsCamera } from './gfx/camera';
import { createPost } from './gfx/post';
import { MapGrid } from './battle/grid';
import { MAPS, JOBS, ITEMS, CHARACTERS } from './data/db';
import { buildHumanoid } from './gfx/models/humanoid';
import { buildMonster, monsterHeight } from './gfx/models/monsters';
import { Animator, CLIPS, type ClipName } from './gfx/models/anim';
import type { UnitModel } from './gfx/models/rig';
import type { Backend } from './gfx/three';
import type { Object3D } from 'three/webgpu';
import type { JobDef, MonsterShape, Palette } from './data/types';

const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => (q.has(k) ? parseFloat(q.get(k)!) : d);

function triCount(m: UnitModel): number {
  let n = 0;
  m.root.traverse((o: any) => { if (o.isMesh) n += o.geometry.getAttribute('position').count / 3; });
  return n;
}

(async () => {
  const app = document.getElementById('app')!;
  await initRenderer(app, (q.get('renderer') as Backend) ?? 'auto', (q.get('quality') as any) ?? undefined);
  await loadTSL();
  const scene = new THREE.Scene();
  const gallery = q.get('gallery');
  const mapId = gallery ? 'gallery' : (q.get('map') ?? 'training');
  const def = MAPS.get(mapId)!;
  const grid = new MapGrid(def);
  const terrain = new TerrainView(grid);
  scene.add(terrain.group);
  const env = new Environment(scene, terrain, def, (q.get('time') as any) ?? undefined);
  const cam = new TacticsCamera(app.clientWidth / app.clientHeight);
  cam.snap(terrain.center, Math.max(grid.w, grid.d) * 2.4);
  const post = await createPost(scene, cam.cam);
  post.setGrade({ warmth: env.mood.warmth, saturation: env.mood.saturation, exposure: env.mood.exposure });
  const anims: Animator[] = [];
  const info = document.getElementById('info')!;
  let status = `${rinfo.backend} / ${rinfo.quality} / ${mapId}`;
  const labels: Array<{ el: HTMLDivElement; obj: Object3D; h: number }> = [];
  let cycle: ((dt: number) => void) | null = null;

  if (gallery === 'monsters') {
    // ---------------------------------------------------------------- monster gallery
    const only = q.get('only')?.split(',').filter(Boolean);
    // shapes no job uses yet get a stand-in entry so every builder is on show
    const extra: JobDef[] = ([
      ['wolf', 'Wolf', { primary: '#7a7f8a', secondary: '#3a3d45', accent: '#ffd040' }],
      ['bull', 'Bull', { primary: '#6a4a36', secondary: '#3a2a20', accent: '#efe6cf', metal: '#c8a040' }],
      ['golem', 'Golem', { primary: '#8a8478', secondary: '#5a7a3a', accent: '#60e0ff' }],
    ] as Array<[MonsterShape, string, Palette]>).map(([shape, name, palette]) => ({ id: `x_${shape}`, name, monster: { shape, palette, scale: shape === 'golem' ? 1.3 : 1 } }) as unknown as JobDef);
    const all = [...JOBS.values()].filter((j) => j.monster);
    for (const e of extra) if (!all.some((j) => j.monster!.shape === e.monster!.shape)) all.push(e);
    const list = all.filter((j) => !only || only.includes(j.id) || only.includes(j.monster!.shape));
    const cols = Math.max(1, Math.round(num('cols', Math.ceil(Math.sqrt(list.length)))));
    const rows = Math.ceil(list.length / cols);
    const sp = num('spacing', Math.min(2.4, 13 / Math.max(cols, rows)));
    const base = terrain.tileCenter(0, 0).y;
    const face = num('face', Math.PI / 4 + 0.5);
    const forced = q.get('clip') as ClipName | null;
    const seq: ClipName[] = ['idle', 'walk', 'bite', 'idle', 'roar', 'walk', 'breath', 'idle'];
    let total = 0;
    const slots: Array<{ a: Animator; i: number; t: number }> = [];
    list.forEach((j, i) => {
      const m = buildMonster(j.monster!, { team: 1 });
      const c = i % cols, r = Math.floor(i / cols);
      m.root.position.set((c - (cols - 1) / 2) * sp, base, (r - (rows - 1) / 2) * sp);
      m.root.rotation.y = face;
      scene.add(m.root);
      const a = new Animator(m);
      a.setBase('idle');
      anims.push(a);
      slots.push({ a, i, t: (i * 0.37) % 2.5 });
      const tris = triCount(m);
      total += tris;
      console.log(`[gallery] ${j.id} ${j.monster!.shape} v${j.monster!.variant ?? '-'} tris=${tris}`);
      if (q.get('labels') !== '0') {
        const el = document.createElement('div');
        el.className = 'lbl';
        el.textContent = `${j.name} · ${j.monster!.shape}${j.monster!.variant ? j.monster!.variant : ''} · ${(tris / 1000).toFixed(1)}k`;
        document.body.appendChild(el);
        labels.push({ el, obj: m.root, h: monsterHeight(j.monster!) + 0.15 });
      }
    });
    (window as any).__tris = total;
    status += ` / ${list.length} monsters / ${(total / 1000).toFixed(1)}k tris`;
    const extent = Math.max(cols, rows) * sp;
    const tgt = q.get('target')?.split(',').map(Number);
    const center = tgt && tgt.length === 3 ? new THREE.Vector3(tgt[0], tgt[1], tgt[2]) : new THREE.Vector3(0, base + 0.6, 0);
    cam.snap(center, num('zoom', Math.max(6, extent * 2.3)));
    const dyaw = num('yaw', cam.yaw) - cam.yaw, dpitch = num('pitch', cam.pitch) - cam.pitch;
    cam.orbitFree(dyaw, dpitch);
    cam.yaw += dyaw; cam.pitch += dpitch;
    cycle = (dt) => {
      for (const s of slots) {
        if (forced) {
          if (CLIPS[forced].loop) s.a.setBase(forced);
          else if ((s.t += dt) > CLIPS[forced].dur + 0.6) { s.t = 0; void s.a.play(forced); }
          continue;
        }
        s.t += dt;
        if (s.t < 2.5) continue;
        s.t = 0;
        s.i = (s.i + 1) % seq.length;
        const c = seq[s.i];
        if (CLIPS[c].loop) s.a.setBase(c); else void s.a.play(c);
      }
    };
  } else {
    const jobs = (q.get('jobs') ?? 'squire,chemist,knight,wizard,priest,archer,monk,thief,ninja,samurai,lancer,dancer').split(',');
    const clips: ClipName[] = ['idle', 'walk', 'swing', 'cast', 'idle', 'bow', 'punch', 'steal', 'idle', 'draw', 'thrust', 'dance'];
    const cells = def.deploy.concat([[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5]]);
    jobs.forEach((jid, i) => {
      const j = JOBS.get(jid);
      if (!j) return;
      const female = i % 3 === 1;
      const weapon = [...ITEMS.values()].find((it) => it.kind === 'weapon' && j.equip.includes(it.cat as any));
      const shield = j.equip.includes('shield') ? [...ITEMS.values()].find((it) => it.kind === 'shield') : undefined;
      const m = buildHumanoid({ job: j.look, look: { hairStyle: female ? 'ponytail' : 'spiky', hair: ['#e0c070', '#5a3a24', '#222', '#a0522d'][i % 4], skin: ['#f0cfae', '#d9a877', '#c68c5c'][i % 3] }, gender: female ? 'f' : 'm', weapon, shield });
      const c = cells[i % cells.length];
      const p = terrain.tileCenter(c[0], c[1]);
      m.root.position.copy(p);
      m.root.rotation.y = Math.PI / 4 + (i % 4) * 0.5;
      scene.add(m.root);
      const a = new Animator(m);
      a.setBase(clips[i % clips.length]);
      anims.push(a);
    });
    cycle = () => {
      for (const a of anims) if (!['idle', 'walk', 'cast', 'dance'].includes(a.baseClip) && Math.random() < 0.01) a.play(a.baseClip);
    };
  }
  info.textContent = status;
  window.addEventListener('resize', () => { renderer.setSize(app.clientWidth, app.clientHeight); cam.setAspect(app.clientWidth / app.clientHeight); });
  let last = performance.now();
  let frames = 0; let acc = 0;
  const v = new THREE.Vector3();
  const loop = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    cycle?.(dt);
    for (const a of anims) a.update(dt);
    env.update(dt);
    cam.update(dt);
    post.setFocus(cam.dist, 18);
    post.render();
    if (labels.length) {
      const w = app.clientWidth, h = app.clientHeight;
      for (const l of labels) {
        v.copy(l.obj.position); v.y += l.h;
        v.project(cam.cam);
        l.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
      }
    }
    frames++; acc += dt;
    if (acc > 1) { info.textContent = `${status} / ${Math.round(frames / acc)} fps`; frames = 0; acc = 0; }
    (window as any).__frames = ((window as any).__frames ?? 0) + 1;
  };
  renderer.setAnimationLoop(loop);
  (window as any).__ready = true;
  (window as any).__cam = cam;
  void HS; void CHARACTERS;
})().catch((e) => { document.getElementById('info')!.textContent = 'ERROR: ' + e.message; console.error(e); (window as any).__error = String(e.stack ?? e); });
