// Visual test bed: ?map=<id>&renderer=webgpu|webgl2|webgl1&time=<EnvTime>
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
import { Animator, type ClipName } from './gfx/models/anim';
import type { Backend } from './gfx/three';

const q = new URLSearchParams(location.search);
(async () => {
  const app = document.getElementById('app')!;
  await initRenderer(app, (q.get('renderer') as Backend) ?? 'auto', (q.get('quality') as any) ?? undefined);
  await loadTSL();
  const scene = new THREE.Scene();
  const mapId = q.get('map') ?? 'training';
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
  const info = document.getElementById('info')!;
  info.textContent = `${rinfo.backend} / ${rinfo.quality} / ${mapId}`;
  window.addEventListener('resize', () => { renderer.setSize(app.clientWidth, app.clientHeight); cam.setAspect(app.clientWidth / app.clientHeight); });
  let last = performance.now();
  let frames = 0; let acc = 0;
  const loop = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (const a of anims) {
      a.update(dt);
      if (!['idle', 'walk', 'cast', 'dance'].includes(a.baseClip) && Math.random() < 0.01) a.play(a.baseClip);
    }
    env.update(dt);
    cam.update(dt);
    post.setFocus(cam.dist, 18);
    post.render();
    frames++; acc += dt;
    if (acc > 1) { info.textContent = `${rinfo.backend} / ${rinfo.quality} / ${mapId} / ${Math.round(frames / acc)} fps`; frames = 0; acc = 0; }
    (window as any).__frames = ((window as any).__frames ?? 0) + 1;
  };
  renderer.setAnimationLoop(loop);
  (window as any).__ready = true;
  (window as any).__cam = cam;
  void HS; void CHARACTERS;
})().catch((e) => { document.getElementById('info')!.textContent = 'ERROR: ' + e.message; console.error(e); (window as any).__error = String(e.stack ?? e); });
