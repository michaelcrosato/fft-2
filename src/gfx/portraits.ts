// Character portraits rendered from the actual 3D models (head & shoulders)
// into an off-screen render target, read back and composited on a painted
// backdrop. Cached as data URLs.
import { THREE, BACKEND } from './three';
import { renderer } from './renderer';
import type { UnitModel } from './models/rig';
import { Animator } from './models/anim';

// width must be a multiple of 64 px: WebGPU pads readback rows to 256 bytes
const W = 192, H = 224;
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

let rt: any = null;
let scene: any = null;
let cam: any = null;

function setup() {
  if (rt) return;
  // the legacy WebGL1 renderer can only read back its own WebGLRenderTarget
  const RT = BACKEND === 'webgl1' && (THREE as any).WebGLRenderTarget ? (THREE as any).WebGLRenderTarget : THREE.RenderTarget;
  rt = new RT(W, H, { type: THREE.UnsignedByteType, samples: BACKEND === 'webgl1' ? 0 : 4 } as any);
  scene = new THREE.Scene();
  const key = new THREE.DirectionalLight('#fff4e0', 3.2);
  key.position.set(1.2, 2.2, 3);
  const rim = new THREE.DirectionalLight('#b8d0ff', 2.2);
  rim.position.set(-2, 1.5, -2);
  scene.add(key, rim, new THREE.HemisphereLight('#d8e0f0', '#5a4a3a', 1.3));
  cam = new THREE.PerspectiveCamera(26, W / H, 0.1, 20);
}

export function portraitCached(key: string): string | undefined { return cache.get(key); }

/** Render (or fetch cached) portrait. `bg` = backdrop tint. */
export function portrait(key: string, build: () => UnitModel, bg = '#5a4a3a'): Promise<string> {
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const p = pending.get(key);
  if (p) return p;
  const job = queue.then(() => render(key, build, bg)).catch((e) => { console.warn('[portrait]', e); return ''; });
  queue = job;
  pending.set(key, job);
  return job;
}

async function render(key: string, build: () => UnitModel, bg: string): Promise<string> {
  setup();
  const model = build();
  const anim = new Animator(model);
  anim.update(0.3);
  model.root.rotation.y = 0.35;
  scene.add(model.root);
  model.root.updateMatrixWorld(true);
  // frame the head
  const head = model.bones.head;
  const target = new THREE.Vector3();
  if (head) head.getWorldPosition(target); else target.set(0, 0.8, 0);
  target.y += 0.12 * (model.kind === 'monster' ? 1.5 : 1);
  const dist = model.kind === 'monster' ? 2.4 * model.height : 1.55;
  cam.position.set(target.x + 0.25, target.y + 0.05, target.z + dist);
  cam.lookAt(target.x, target.y - 0.05, target.z);
  const prevTarget = renderer.getRenderTarget();
  const prevTone = renderer.toneMapping;
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, cam);
  let pixels: Uint8Array;
  if ((renderer as any).readRenderTargetPixelsAsync) pixels = new Uint8Array(await (renderer as any).readRenderTargetPixelsAsync(rt, 0, 0, W, H));
  else { pixels = new Uint8Array(W * H * 4); (renderer as any).readRenderTargetPixels(rt, 0, 0, W, H, pixels); }
  renderer.setRenderTarget(prevTarget);
  renderer.toneMapping = prevTone;
  scene.remove(model.root);
  model.dispose();

  // compose
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(W * 0.45, H * 0.35, 10, W * 0.5, H * 0.5, W * 0.85);
  const base = new THREE.Color(bg);
  g.addColorStop(0, '#' + base.clone().lerp(new THREE.Color('#fff4d8'), 0.45).getHexString());
  g.addColorStop(0.6, '#' + base.getHexString());
  g.addColorStop(1, '#' + base.clone().lerp(new THREE.Color('#000000'), 0.55).getHexString());
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  // painterly speckle
  for (let i = 0; i < 380; i++) { x.fillStyle = `rgba(255,240,210,${Math.random() * 0.05})`; x.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 5, 1 + Math.random() * 3); }
  const img = x.createImageData(W, H);
  const flip = BACKEND !== 'webgpu';
  const toS = (v: number) => {
    const l = v / 255;
    // filmic-ish curve then sRGB encode
    const t = (l * (2.51 * l + 0.03)) / (l * (2.43 * l + 0.59) + 0.14);
    const s = t <= 0.0031308 ? t * 12.92 : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, s * 255));
  };
  for (let yy = 0; yy < H; yy++) {
    const sy = flip ? H - 1 - yy : yy;
    for (let xx = 0; xx < W; xx++) {
      const si = (sy * W + xx) * 4, di = (yy * W + xx) * 4;
      img.data[di] = toS(pixels[si]); img.data[di + 1] = toS(pixels[si + 1]); img.data[di + 2] = toS(pixels[si + 2]); img.data[di + 3] = pixels[si + 3];
    }
  }
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  tmp.getContext('2d')!.putImageData(img, 0, 0);
  x.drawImage(tmp, 0, 0);
  // vignette
  const v = x.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  pending.delete(key);
  return url;
}
