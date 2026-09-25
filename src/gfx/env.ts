// Lighting, sky, backdrop scenery, fog and flickering point lights per map mood.
import { THREE } from './three';
import type { EnvTime, MapDef, MapTheme } from '../data/types';
import { GeoBuilder, mat } from './geo';
import { propMaterial } from './materials';
import type { TerrainView } from './terrain';
import { HS } from './terrain';
import { rinfo } from './renderer';
import type { Scene, DirectionalLight, HemisphereLight, Mesh, Group, PointLight, Color, Object3D } from 'three/webgpu';
import { hash2 } from '../core/rng';

interface Mood {
  sun: string; sunI: number; elev: number; azim: number;
  hemiSky: string; hemiGround: string; hemiI: number;
  skyTop: string; skyHorizon: string; skyBottom: string;
  fog: string; fogNear: number; fogFar: number;
  exposure: number; warmth: number; saturation: number;
  stars?: boolean; windows?: boolean;
}

export const MOODS: Record<EnvTime, Mood> = {
  day: { sun: '#fff0d8', sunI: 3.3, elev: 52, azim: 140, hemiSky: '#c4dcf4', hemiGround: '#6a5a44', hemiI: 1.15, skyTop: '#3f76c4', skyHorizon: '#a9c6de', skyBottom: '#6f8494', fog: '#9fb8cc', fogNear: 60, fogFar: 170, exposure: 1.0, warmth: 0.18, saturation: 1.08 },
  dawn: { sun: '#ffb484', sunI: 2.6, elev: 16, azim: 100, hemiSky: '#e0c0d0', hemiGround: '#5a4a44', hemiI: 1.0, skyTop: '#5a6aa8', skyHorizon: '#f4b890', skyBottom: '#8a7a8a', fog: '#e0b8a8', fogNear: 36, fogFar: 110, exposure: 1.02, warmth: 0.3, saturation: 1.05 },
  dusk: { sun: '#ff9458', sunI: 2.4, elev: 11, azim: 250, hemiSky: '#a88aa8', hemiGround: '#4a3a3a', hemiI: 0.95, skyTop: '#2e336e', skyHorizon: '#f08a58', skyBottom: '#5a4050', fog: '#c08070', fogNear: 34, fogFar: 105, exposure: 1.05, warmth: 0.35, saturation: 1.1, windows: true },
  night: { sun: '#8fb0ff', sunI: 1.1, elev: 42, azim: 210, hemiSky: '#34466e', hemiGround: '#1a1a24', hemiI: 0.62, skyTop: '#060a1a', skyHorizon: '#1c2848', skyBottom: '#0a0e18', fog: '#1a2440', fogNear: 30, fogFar: 95, exposure: 1.25, warmth: -0.25, saturation: 0.95, stars: true, windows: true },
  overcast: { sun: '#e4e6ea', sunI: 1.5, elev: 60, azim: 160, hemiSky: '#c0c8d0', hemiGround: '#5a5a58', hemiI: 1.45, skyTop: '#8a96a4', skyHorizon: '#c4ccd4', skyBottom: '#8a9098', fog: '#b4bcc4', fogNear: 30, fogFar: 95, exposure: 1.0, warmth: 0.0, saturation: 0.9 },
  interior: { sun: '#ffe2b8', sunI: 0.8, elev: 65, azim: 120, hemiSky: '#6a5a4a', hemiGround: '#2a2018', hemiI: 0.7, skyTop: '#140e0a', skyHorizon: '#2a1e16', skyBottom: '#0a0806', fog: '#1a120c', fogNear: 30, fogFar: 80, exposure: 1.3, warmth: 0.35, saturation: 1.0, windows: true },
  storm: { sun: '#b8c4d8', sunI: 1.2, elev: 50, azim: 200, hemiSky: '#5a6a80', hemiGround: '#2a2a30', hemiI: 0.9, skyTop: '#1e2430', skyHorizon: '#4a5462', skyBottom: '#2a2e36', fog: '#3a4450', fogNear: 25, fogFar: 85, exposure: 1.15, warmth: -0.15, saturation: 0.85, windows: true },
  void: { sun: '#ff6a5a', sunI: 1.8, elev: 35, azim: 190, hemiSky: '#5a2a6a', hemiGround: '#1a0a1a', hemiI: 0.8, skyTop: '#0a0414', skyHorizon: '#4a1438', skyBottom: '#0a0410', fog: '#2a0e28', fogNear: 30, fogFar: 100, exposure: 1.2, warmth: 0.1, saturation: 1.15, stars: true },
};

export class Environment {
  readonly scene: Scene;
  sun!: DirectionalLight;
  hemi!: HemisphereLight;
  sky!: Mesh;
  backdrop!: Group;
  mood!: Mood;
  time: EnvTime;
  private points: Array<{ light: PointLight; base: number; flicker: boolean; seed: number }> = [];
  private spinners: Object3D[] = [];
  private t = 0;
  /** lightning light: always in the scene (intensity 0 at rest) — adding/removing lights recompiles every lit shader */
  private flashLight: import('three/webgpu').DirectionalLight | null = null;
  private flashT = 0;

  constructor(scene: Scene, terrain: TerrainView, def: MapDef, time?: EnvTime) {
    this.scene = scene;
    this.time = time ?? def.time;
    this.build(terrain, def);
  }

  private build(terrain: TerrainView, def: MapDef) {
    const m = (this.mood = MOODS[this.time] ?? MOODS.day);
    const scene = this.scene;
    const span = Math.max(terrain.grid.w, terrain.grid.d);
    // sun
    const sun = (this.sun = new THREE.DirectionalLight(m.sun, m.sunI));
    const el = (m.elev * Math.PI) / 180, az = (m.azim * Math.PI) / 180;
    const dist = span * 1.5 + 10;
    sun.position.set(Math.cos(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.sin(az) * Math.cos(el) * dist);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = true;
    const sz = rinfo?.settings.shadowSize ?? 2048;
    sun.shadow.mapSize.set(sz, sz);
    const half = span * 0.8 + 3;
    const cam = sun.shadow.camera;
    cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
    cam.near = 1; cam.far = dist * 2.5;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.025;
    (sun.shadow as any).radius = 3;
    scene.add(sun, sun.target);
    if (this.time === 'storm') this.addFlashLight();
    // fill
    this.hemi = new THREE.HemisphereLight(m.hemiSky, m.hemiGround, m.hemiI);
    scene.add(this.hemi);
    // soft rim/back light for readability of characters
    const rim = new THREE.DirectionalLight(m.hemiSky, 0.35);
    rim.position.set(-sun.position.x, sun.position.y * 0.6, -sun.position.z);
    scene.add(rim);
    // sky dome with vertex-colour gradient
    const skyGeo = new THREE.SphereGeometry(160, 32, 16);
    const cols: number[] = [];
    const top = new THREE.Color(m.skyTop), hor = new THREE.Color(m.skyHorizon), bot = new THREE.Color(m.skyBottom);
    const pos = skyGeo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 160;
      const c = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.55)) : hor.clone().lerp(bot, Math.min(1, -y * 2.5));
      cols.push(c.r, c.g, c.b);
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.sky.renderOrder = -10;
    scene.add(this.sky);
    scene.background = new THREE.Color(m.skyHorizon);
    scene.fog = new THREE.Fog(m.fog, m.fogNear + span, m.fogFar + span);
    if (m.stars) this.addStars();
    this.backdrop = new THREE.Group();
    this.buildBackdrop(def.backdrop ?? defaultBackdrop(def.theme), terrain, def.theme);
    scene.add(this.backdrop);
    // point lights from props (limit for performance)
    const maxLights = rinfo?.quality === 'low' ? 2 : rinfo?.quality === 'medium' ? 4 : 8;
    const lights = [...terrain.lights].slice(0, maxLights);
    const dim = this.time === 'day' || this.time === 'overcast' ? 0.35 : 1;
    for (const l of lights) {
      const pl = new THREE.PointLight(l.color, l.intensity * dim, 5.5, 1.6);
      pl.position.copy(l.pos);
      scene.add(pl);
      this.points.push({ light: pl, base: l.intensity * dim, flicker: l.flicker, seed: Math.random() * 100 });
    }
    // animated props (windmills etc.)
    terrain.group.traverse((o: any) => { if (o.userData?.spin || o.userData?.waterfall) this.spinners.push(o); });
  }

  private addStars() {
    const n = 900;
    const p: number[] = [];
    for (let i = 0; i < n; i++) {
      const u = Math.random(), v = Math.random() * 0.45 + 0.05;
      const th = u * Math.PI * 2, ph = Math.acos(1 - v);
      p.push(Math.sin(ph) * Math.cos(th) * 150, Math.cos(ph) * 150, Math.sin(ph) * Math.sin(th) * 150);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: '#dfe8ff', size: 0.6, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.9 }));
    pts.renderOrder = -9;
    this.scene.add(pts);
    // moon
    const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), new THREE.MeshBasicMaterial({ color: '#f4f0e0', fog: false }));
    moon.position.set(-60, 70, -90);
    this.scene.add(moon);
  }

  private buildBackdrop(kind: string, terrain: TerrainView, theme: MapTheme) {
    const b = new GeoBuilder();
    const R = Math.max(terrain.grid.w, terrain.grid.d) * 1.5 + 55;
    const baseY = terrain.base - 10;
    const hazeCol = this.mood.fog;
    const mix = (a: string, t: number) => { const c = new THREE.Color(a).lerp(new THREE.Color(hazeCol), t); return '#' + c.getHexString(); };
    const ring = (n: number, fn: (a: number, i: number) => void) => { for (let i = 0; i < n; i++) fn((i / n) * Math.PI * 2 + hash2(i, 3, 7) * 0.2, i); };
    switch (kind) {
      case 'mountains': case 'snowpeaks': {
        ring(26, (a, i) => {
          const r = R + hash2(i, 1, 1) * 25;
          const h = 16 + hash2(i, 2, 2) * 22;
          const col = kind === 'snowpeaks' ? mix('#8a98a8', 0.35) : mix(theme === 'desert' ? '#a88a64' : '#5a6e62', 0.45);
          b.add(new THREE.ConeGeometry(8 + hash2(i, 4, 4) * 6, h, 5), mat(Math.cos(a) * r, baseY + h / 2, Math.sin(a) * r, 0, hash2(i, 5, 5) * 3, 0), col, 0.1);
          if (kind === 'snowpeaks' || h > 22) b.add(new THREE.ConeGeometry((8 + hash2(i, 4, 4) * 6) * 0.35, h * 0.35, 5), mat(Math.cos(a) * r, baseY + h - h * 0.175, Math.sin(a) * r, 0, hash2(i, 5, 5) * 3, 0), mix('#f0f4f8', 0.2), 0.05);
        });
        ring(40, (a, i) => {
          const r = R - 6 + hash2(i, 9, 9) * 6;
          const h = 3 + hash2(i, 8, 8) * 4;
          b.add(new THREE.ConeGeometry(4 + hash2(i, 7, 7) * 3, h, 5), mat(Math.cos(a) * r, baseY + h / 2, Math.sin(a) * r, 0, i, 0), mix('#4a6a44', 0.3), 0.1);
        });
        break;
      }
      case 'forest': {
        ring(90, (a, i) => {
          const r = R - 8 + hash2(i, 1, 3) * 16;
          const h = 5 + hash2(i, 2, 3) * 5;
          b.add(new THREE.ConeGeometry(1.6, h, 6), mat(Math.cos(a) * r, baseY + 2 + h / 2, Math.sin(a) * r, 0, 0, 0), mix(i % 2 ? '#2e5a34' : '#3a6a3a', 0.35), 0.1);
        });
        break;
      }
      case 'city': case 'castle': case 'cathedral': {
        ring(34, (a, i) => {
          const r = R - 4 + hash2(i, 1, 5) * 12;
          const w = 2.5 + hash2(i, 2, 5) * 3, h = 3 + hash2(i, 3, 5) * (kind === 'city' ? 5 : 9);
          const wall = mix(kind === 'city' ? '#c8b89a' : '#9a948a', 0.4);
          b.add(new THREE.BoxGeometry(w, h, w), mat(Math.cos(a) * r, baseY + 3 + h / 2, Math.sin(a) * r, 0, -a, 0), wall, 0.08);
          const roof = kind === 'city' ? '#8c3a26' : '#4a5a6a';
          if (kind === 'cathedral' && i % 5 === 0) b.add(new THREE.ConeGeometry(w * 0.6, h * 1.4, 4), mat(Math.cos(a) * r, baseY + 3 + h + h * 0.7, Math.sin(a) * r, 0, Math.PI / 4, 0), mix(roof, 0.4), 0.05);
          else b.add(new THREE.ConeGeometry(w * 0.75, h * 0.5, 4), mat(Math.cos(a) * r, baseY + 3 + h + h * 0.25, Math.sin(a) * r, 0, Math.PI / 4 - a, 0), mix(roof, 0.4), 0.05);
        });
        b.add(new THREE.CylinderGeometry(R + 20, R + 20, 3, 32), mat(0, baseY + 1.5, 0), mix('#6a7a5a', 0.5), 0);
        break;
      }
      case 'sea': {
        const sea = new THREE.Mesh(new THREE.CircleGeometry(150, 48), propMaterial({ flat: false, roughness: 0.25 }));
        const g = sea.geometry;
        const c = new THREE.Color(mix('#2a6a8a', 0.2));
        const colsA: number[] = [];
        for (let i = 0; i < g.getAttribute('position').count; i++) colsA.push(c.r, c.g, c.b);
        g.setAttribute('color', new THREE.Float32BufferAttribute(colsA, 3));
        sea.rotation.x = -Math.PI / 2;
        sea.position.y = terrain.base + 0.6;
        sea.receiveShadow = true;
        this.backdrop.add(sea);
        break;
      }
      case 'clouds': {
        ring(60, (a, i) => {
          const r = R - 10 + hash2(i, 1, 9) * 30;
          const s = 3 + hash2(i, 2, 9) * 5;
          b.add(new THREE.IcosahedronGeometry(s, 1), mat(Math.cos(a) * r, baseY - 2 + hash2(i, 3, 9) * 6, Math.sin(a) * r, 0, 0, 0, 1, 0.45, 1), mix('#ffffff', 0.25), 0.05);
        });
        break;
      }
      case 'desert': {
        ring(30, (a, i) => {
          const r = R + hash2(i, 1, 11) * 20;
          b.add(new THREE.SphereGeometry(10 + hash2(i, 2, 11) * 8, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(Math.cos(a) * r, baseY, Math.sin(a) * r, 0, 0, 0, 1, 0.35, 1), mix('#d8b880', 0.35), 0.05);
        });
        break;
      }
      case 'cavern': {
        ring(40, (a, i) => {
          const r = R - 12 + hash2(i, 1, 13) * 6;
          const h = 20 + hash2(i, 2, 13) * 10;
          b.add(new THREE.CylinderGeometry(4, 6, h, 6), mat(Math.cos(a) * r, baseY + h / 2, Math.sin(a) * r, 0, i, 0), mix('#2a2420', 0.5), 0.15);
        });
        break;
      }
      case 'void': {
        // shattered stone adrift in the abyss
        ring(40, (a, i) => {
          const r = R * 0.5 + hash2(i, 1, 17) * R * 0.7;
          const s = 1 + hash2(i, 2, 17) * 3.5;
          const y = baseY + 2 + hash2(i, 3, 17) * 30;
          b.add(new THREE.IcosahedronGeometry(s, 0), mat(Math.cos(a) * r, y, Math.sin(a) * r, i, i * 2, 0, 1, 0.55 + hash2(i, 4, 17) * 0.9, 1), mix(i % 3 ? '#6a5470' : '#8a5a60', 0.15), 0.1);
          if (i % 4 === 0) b.add(new THREE.ConeGeometry(s * 0.7, s * 2.2, 5), mat(Math.cos(a) * r, y - s * 1.2, Math.sin(a) * r, Math.PI, i, 0), mix('#2a1e30', 0.2), 0.1);
        });
        // the abyssal vortex far below the arena
        const disc = new THREE.Mesh(new THREE.CircleGeometry(140, 64), new THREE.MeshBasicMaterial({ map: vortexTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.6 }));
        disc.rotation.x = -Math.PI / 2;
        disc.position.y = baseY - 22;
        disc.renderOrder = -8;
        disc.userData.spin = 0.06;
        this.backdrop.add(disc);
        this.spinners.push(disc);
        break;
      }
      default: break;
    }
    if (b.count) {
      const mesh = new THREE.Mesh(b.build(), propMaterial({ flat: true, roughness: 1 }));
      mesh.receiveShadow = false;
      (mesh.material as any).fog = true;
      this.backdrop.add(mesh);
    }
  }

  update(dt: number) {
    this.t += dt;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0 && this.flashLight) this.flashLight.intensity = 0; }
    for (const p of this.points) {
      if (!p.flicker) continue;
      const f = 0.85 + Math.sin(this.t * 13 + p.seed) * 0.06 + Math.sin(this.t * 23.7 + p.seed * 2) * 0.05 + (Math.random() - 0.5) * 0.06;
      p.light.intensity = p.base * f;
    }
    for (const s of this.spinners) {
      if ((s as any).userData.spin) s.rotation.z += dt * (s as any).userData.spin;
    }
  }

  /** brief lightning / spell flash light */
  lightning() {
    if (!this.flashLight) this.addFlashLight();
    this.flashLight!.position.set(Math.random() * 20 - 10, 30, Math.random() * 20 - 10);
    this.flashLight!.intensity = 6;
    this.flashT = 0.09;
  }
  private addFlashLight() {
    this.flashLight = new THREE.DirectionalLight('#dfe8ff', 0);
    this.flashLight.position.set(0, 30, 0);
    this.scene.add(this.flashLight);
  }
}

export function defaultBackdrop(theme: MapTheme): NonNullable<MapDef['backdrop']> {
  switch (theme) {
    case 'plains': case 'mountain': case 'river': return 'mountains';
    case 'forest': case 'swamp': return 'forest';
    case 'town': return 'city';
    case 'castle': return 'castle';
    case 'church': return 'cathedral';
    case 'desert': return 'desert';
    case 'snow': return 'snowpeaks';
    case 'coast': return 'sea';
    case 'airship': return 'clouds';
    case 'cave': case 'mine': case 'dungeon': case 'volcano': return 'cavern';
    case 'ruins': return 'mountains';
    default: return 'void';
  }
}

export { HS };
export type { Color };

let vortexTex: import('three/webgpu').Texture | null = null;
/** spiral-armed glow for the void backdrop */
function vortexTexture() {
  if (vortexTex) return vortexTex;
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  rg.addColorStop(0, 'rgba(255,170,110,0.9)');
  rg.addColorStop(0.08, 'rgba(200,60,60,0.55)');
  rg.addColorStop(0.3, 'rgba(90,14,70,0.28)');
  rg.addColorStop(0.7, 'rgba(30,4,40,0.1)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'lighter';
  for (let arm = 0; arm < 5; arm++) {
    for (let k = 0; k < 260; k++) {
      const t = k / 260;
      const r = t * S * 0.48;
      const a = arm * (Math.PI * 2 / 5) + t * 7.5;
      const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
      const w = 2 + t * 9;
      const alpha = (1 - t) * (1 - t) * 0.09;
      g.fillStyle = `rgba(${255 - t * 90 | 0},${110 - t * 80 | 0},${120 + t * 60 | 0},${alpha})`;
      g.beginPath(); g.arc(x, y, w, 0, Math.PI * 2); g.fill();
    }
  }
  vortexTex = new THREE.CanvasTexture(c);
  vortexTex.colorSpace = THREE.SRGBColorSpace;
  return vortexTex;
}
