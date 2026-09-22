// Battle-map terrain: turns a MapGrid into a textured diorama with baked AO,
// grass lips, slopes, water, windows, grass blades and props.
import { THREE, NODES } from './three';
import { MapGrid, type Cell } from '../battle/grid';
import { GeoBuilder, hexRgb, mat } from './geo';
import { terrainMaterial, waterMaterial, grassMaterial, propMaterial } from './materials';
import type { TexId } from './textures';
import type { MapTheme } from '../data/types';
import { hash2 } from '../core/rng';
import { buildProp, PropBuckets } from './props';
import type { Group, Mesh, Vector3 } from 'three/webgpu';
import { rinfo } from './renderer';

export const HS = 0.4;        // world units per height step (h)
export const LIP = 0.09;       // grass lip thickness

type C3 = [number, number, number];

function topTex(t: string, theme: MapTheme): TexId {
  switch (t) {
    case 'g': return 'grass';
    case 'd': return theme === 'desert' ? 'sand' : 'dirt';
    case 's': return 'cobble';
    case 'r': return theme === 'desert' ? 'sandstone' : 'rock';
    case 'n': return 'sand';
    case 'i': return 'snow';
    case 'w': case 'W': return 'riverbed';
    case 'm': return 'marsh';
    case 'p': return 'poison';
    case 'l': return 'lava';
    case 'b': return 'cobble';
    case 'o': return 'planks';
    case 't': return 'roof';
    case 'c': return 'carpet';
    case 'k': return 'moss';
    case 'f': return 'farm';
    case 'a': return 'metal';
    case 'y': return 'salt';
    case 'u': return 'bones';
    case 'x': return 'rock';
    default: return 'dirt';
  }
}

function sideTex(t: string, theme: MapTheme): TexId {
  const castle = theme === 'castle' || theme === 'church' || theme === 'ruins' || theme === 'dungeon' || theme === 'cave' || theme === 'mine';
  switch (t) {
    case 'g': case 'd': case 'f': case 'm': case 'p': case 'u': case 'w': case 'W': return theme === 'desert' ? 'sandstone' : 'dirt';
    case 's': return 'stoneWall';
    case 'b': return castle ? 'stoneWall' : 'brick';
    case 'r': case 'x': case 'l': return theme === 'desert' ? 'sandstone' : 'rock';
    case 'n': return 'sandstone';
    case 'i': return 'rock';
    case 'o': return 'planks';
    case 't': return 'plaster';
    case 'c': return 'stoneWall';
    case 'k': return 'stoneWall';
    case 'a': return 'metal';
    case 'y': return 'salt';
    default: return 'dirt';
  }
}

function lipTex(t: string): TexId | null {
  if (t === 'g') return 'grass';
  if (t === 'k') return 'moss';
  if (t === 'i') return 'snow';
  if (t === 'n') return 'sand';
  return null;
}

export class TerrainView {
  readonly grid: MapGrid;
  readonly group: Group;
  readonly base: number;
  readonly theme: MapTheme;
  /** meshes that receive raycasts for tile picking */
  readonly pickMeshes: Mesh[] = [];
  /** light sources placed by props (torches, lamps) */
  readonly lights: Array<{ pos: Vector3; color: string; intensity: number; flicker: boolean }> = [];
  readonly windowMeshes: Mesh[] = [];
  private cellTopCache = new Map<number, number>();

  constructor(grid: MapGrid) {
    this.grid = grid;
    this.theme = grid.def.theme;
    this.group = new THREE.Group();
    this.group.name = 'terrain';
    let minH = Infinity;
    for (const c of grid.cells) if (!c.hole) minH = Math.min(minH, c.h);
    if (!isFinite(minH)) minH = 0;
    this.base = minH * HS - 1.6;
    this.build();
  }

  /** world-space centre of a tile (top surface) */
  tileCenter(x: number, z: number, out = new THREE.Vector3()): Vector3 {
    const c = this.grid.cell(x, z);
    const h = c ? c.h : 0;
    return out.set(x - this.grid.w / 2 + 0.5, h * HS, z - this.grid.d / 2 + 0.5);
  }
  /** world Y of the standing surface (water floor for waders) */
  surfaceY(x: number, z: number, floating = false) {
    const c = this.grid.cell(x, z);
    if (!c) return 0;
    return (c.h + (floating ? c.depth : 0)) * HS;
  }
  worldToCell(wx: number, wz: number): [number, number] {
    return [Math.floor(wx + this.grid.w / 2), Math.floor(wz + this.grid.d / 2)];
  }
  get center(): Vector3 { return new THREE.Vector3(0, (this.grid.maxHeight() * HS) / 2, 0); }

  private cornerH(c: Cell, corner: number): number {
    let h = c.h;
    if (c.slope) {
      const up = 0.25;
      // corners: 0 NW, 1 NE, 2 SE, 3 SW
      const north = corner === 0 || corner === 1, east = corner === 1 || corner === 2;
      switch (c.slope) {
        case 'N': h += north ? up : -up; break;
        case 'S': h += north ? -up : up; break;
        case 'E': h += east ? up : -up; break;
        case 'W': h += east ? -up : up; break;
      }
    }
    return h * HS;
  }

  private build() {
    const g = this.grid;
    const theme = this.theme;
    const W = g.w, D = g.d;
    const ox = -W / 2, oz = -D / 2;
    const buckets = new Map<TexId, GeoBuilder>();
    const B = (t: TexId) => { let b = buckets.get(t); if (!b) { b = new GeoBuilder(); buckets.set(t, b); } return b; };
    const water = new GeoBuilder();
    const windows = new GeoBuilder();
    const cellAt = (x: number, z: number) => { const c = g.cell(x, z); return c && !c.hole ? c : undefined; };

    const cornerXZ = (x: number, z: number, corner: number): [number, number] => {
      const x0 = ox + x, z0 = oz + z;
      switch (corner) { case 0: return [x0, z0]; case 1: return [x0 + 1, z0]; case 2: return [x0 + 1, z0 + 1]; default: return [x0, z0 + 1]; }
    };

    // AO at a top corner: how much higher are the cells around it
    const cornerAO = (c: Cell, corner: number) => {
      const dx = corner === 1 || corner === 2 ? 1 : -1;
      const dz = corner === 2 || corner === 3 ? 1 : -1;
      let occ = 0;
      for (const [nx, nz] of [[c.x + dx, c.z], [c.x, c.z + dz], [c.x + dx, c.z + dz]]) {
        const n = cellAt(nx, nz);
        if (!n) continue;
        const diff = (n.h - c.h) * HS;
        if (diff > 0.05) occ += Math.min(1, diff / 0.8) * 0.16;
      }
      if (c.flags.includes('T') || c.flags.includes('P')) occ += 0.12;
      return Math.max(0.45, 1 - occ);
    };

    for (const c of g.cells) {
      if (c.hole) continue;
      const tt = topTex(c.terrain, theme);
      // --- top ---
      const corners = [0, 1, 2, 3].map((k) => {
        const [x, z] = cornerXZ(c.x, c.z, k);
        return [x, this.cornerH(c, k), z] as C3;
      });
      const tint = 0.92 + hash2(c.x, c.z, 5) * 0.12;
      const cols = [3, 2, 1, 0].map((k) => { const a = cornerAO(c, k) * tint; return [a, a, a] as C3; });
      const uv = (p: C3): [number, number] => [p[0] * 0.5, p[2] * 0.5];
      B(tt).quad(corners[3], corners[2], corners[1], corners[0], [uv(corners[3]), uv(corners[2]), uv(corners[1]), uv(corners[0])], cols);
      if (c.terrain === 'x') {
        // void pillar gets a subtle dark top
      }
      // --- sides ---
      const sides: Array<{ dx: number; dz: number; a: number; b: number; na: number; nb: number }> = [
        { dx: 1, dz: 0, a: 2, b: 1, na: 3, nb: 0 },
        { dx: -1, dz: 0, a: 0, b: 3, na: 1, nb: 2 },
        { dx: 0, dz: 1, a: 3, b: 2, na: 0, nb: 1 },
        { dx: 0, dz: -1, a: 1, b: 0, na: 2, nb: 3 },
      ];
      const st = sideTex(c.terrain, theme);
      const lt = lipTex(c.terrain);
      for (const s of sides) {
        const n = cellAt(c.x + s.dx, c.z + s.dz);
        const topA = this.cornerH(c, s.a), topB = this.cornerH(c, s.b);
        const outer = !n;
        const botA = n ? Math.min(topA, this.cornerH(n, s.na)) : this.base;
        const botB = n ? Math.min(topB, this.cornerH(n, s.nb)) : this.base;
        if (topA - botA < 0.001 && topB - botB < 0.001) continue;
        const [ax, az] = cornerXZ(c.x, c.z, s.a);
        const [bx, bz] = cornerXZ(c.x, c.z, s.b);
        const alongA = s.dx !== 0 ? az : ax, alongB = s.dx !== 0 ? bz : bx;
        const dir = s.dx !== 0 ? -s.dx : s.dz; // keep uv orientation consistent
        const shadeY = (y: number, bot: number, top: number) => {
          if (outer) { const t = (y - this.base) / Math.max(0.01, top - this.base); return 0.32 + 0.68 * Math.pow(Math.max(0, t), 0.8); }
          const t = Math.min(1, (y - bot) / 0.7);
          return 0.55 + 0.45 * t;
        };
        const wall = (tex: TexId, yA0: number, yB0: number, yA1: number, yB1: number) => {
          if (yA1 - yA0 < 0.0005 && yB1 - yB0 < 0.0005) return;
          const pa0: C3 = [ax, yA0, az], pb0: C3 = [bx, yB0, bz], pb1: C3 = [bx, yB1, bz], pa1: C3 = [ax, yA1, az];
          const u0 = alongA * 0.5 * dir, u1 = alongB * 0.5 * dir;
          const shA0 = shadeY(yA0, botA, topA), shB0 = shadeY(yB0, botB, topB), shB1 = shadeY(yB1, botB, topB), shA1 = shadeY(yA1, botA, topA);
          const t2 = tint * (s.dx > 0 || s.dz < 0 ? 0.94 : 1);
          B(tex).quad(pa0, pb0, pb1, pa1, [[u0, yA0 * 0.5], [u1, yB0 * 0.5], [u1, yB1 * 0.5], [u0, yA1 * 0.5]],
            [[shA0 * t2, shA0 * t2, shA0 * t2], [shB0 * t2, shB0 * t2, shB0 * t2], [shB1 * t2, shB1 * t2, shB1 * t2], [shA1 * t2, shA1 * t2, shA1 * t2]]);
        };
        if (lt && Math.min(topA - botA, topB - botB) > LIP * 1.5) {
          wall(st, botA, botB, topA - LIP, topB - LIP);
          wall(lt, topA - LIP, topB - LIP, topA, topB);
        } else {
          wall(st, botA, botB, topA, topB);
        }
        // windows & doors on buildings
        const wallH = Math.min(topA - botA, topB - botB);
        if ((c.terrain === 't' || (c.terrain === 'b' && (theme === 'town' || theme === 'castle'))) && wallH >= 0.9 && !outer) {
          const r = hash2(c.x * 3 + s.dx, c.z * 3 + s.dz, 71);
          const mx = (ax + bx) / 2, mz = (az + bz) / 2;
          const nx = s.dx * 0.012, nz = s.dz * 0.012;
          const bot = Math.max(botA, botB);
          const top = Math.min(topA, topB);
          if (r > 0.35) {
            const wy = bot + (top - bot) * 0.62;
            this.addWindow(windows, mx + nx, wy, mz + nz, s.dx, s.dz, c.terrain === 'b' ? 0.18 : 0.26, c.terrain === 'b' ? 0.34 : 0.3, c.terrain === 'b');
          }
          if (r < 0.28 && c.terrain === 't' && n && n.standable && top - bot > 0.8) {
            this.addDoor(windows, mx + nx, bot, mz + nz, s.dx, s.dz);
          }
        }
      }
      // --- water surface ---
      if (c.depth >= 0.5 || c.terrain === 'l') {
        if (c.terrain !== 'l') {
          const y = (c.h + c.depth) * HS - 0.03;
          const shoreAt = (k: number) => {
            const dx = k === 1 || k === 2 ? 1 : -1, dz = k === 2 || k === 3 ? 1 : -1;
            let s = 0;
            for (const [nx, nz] of [[c.x + dx, c.z], [c.x, c.z + dz], [c.x + dx, c.z + dz]]) {
              const n = cellAt(nx, nz);
              if (n && n.depth < 0.5 && n.h * HS > y - 0.2) s = 1;
            }
            return s;
          };
          const p = [0, 1, 2, 3].map((k) => { const [x, z] = cornerXZ(c.x, c.z, k); return [x, y, z] as C3; });
          const one: C3 = [1, 1, 1];
          water.quad(p[3], p[2], p[1], p[0], [[0, 0], [1, 0], [1, 1], [0, 1]], [one, one, one, one], [0, 1, 0]);
          for (const k of [3, 2, 1, 3, 1, 0]) water.pushExtra('shore', 1, shoreAt(k));
          // water walls at map edge
          for (const s of sides) {
            const n = cellAt(c.x + s.dx, c.z + s.dz);
            if (n && (n.depth >= 0.5 || n.h * HS >= y)) continue;
            const [ax, az] = cornerXZ(c.x, c.z, s.a);
            const [bx, bz] = cornerXZ(c.x, c.z, s.b);
            const bot = n ? n.h * HS : c.h * HS;
            water.quad([ax, bot, az], [bx, bot, bz], [bx, y, bz], [ax, y, az], [[0, 0], [1, 0], [1, 1], [0, 1]], [one, one, one, one]);
            for (let i = 0; i < 6; i++) water.pushExtra('shore', 1, 0.3);
          }
        }
      }
    }

    for (const [tex, b] of buckets) {
      if (!b.count) continue;
      const mesh = new THREE.Mesh(b.build(), terrainMaterial(tex, { roughness: tex === 'metal' ? 0.5 : tex === 'snow' || tex === 'ice' ? 0.6 : 0.92, metal: tex === 'metal' ? 0.6 : 0 }));
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.name = 'terrain:' + tex;
      this.group.add(mesh);
      this.pickMeshes.push(mesh);
    }
    if (water.count) {
      const kind = this.grid.cells.some((c) => c.terrain === 'p') ? 'poison' : 'water';
      const wm = new THREE.Mesh(water.build(), waterMaterial(kind));
      wm.receiveShadow = true;
      wm.renderOrder = 2;
      wm.name = 'water';
      this.group.add(wm);
      this.pickMeshes.push(wm);
    }
    if (windows.count) {
      const night = this.grid.def.time === 'night' || this.grid.def.time === 'dusk' || this.grid.def.time === 'storm';
      const wm = new THREE.Mesh(windows.build(), propMaterial({ flat: true, roughness: 0.6, emissive: night ? '#ffb452' : '#000000', emissiveIntensity: night ? 1.0 : 0 }));
      wm.castShadow = false;
      wm.receiveShadow = true;
      this.group.add(wm);
      this.windowMeshes.push(wm);
    }
    this.buildGrass();
    this.buildProps();
  }

  private addWindow(b: GeoBuilder, x: number, y: number, z: number, dx: number, dz: number, w: number, h: number, arched: boolean) {
    // frame (wood) + dark pane + sill, facing (dx,dz)
    const ry = Math.atan2(dx, dz);
    const frame = arched ? '#6a6258' : '#4a2e1a';
    const pane = '#1a2230';
    b.add(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.04), mat(x, y, z, 0, ry, 0), frame);
    b.add(new THREE.BoxGeometry(w, h, 0.05), mat(x + dx * 0.012, y, z + dz * 0.012, 0, ry, 0), pane);
    // mullions
    b.add(new THREE.BoxGeometry(0.025, h, 0.06), mat(x + dx * 0.02, y, z + dz * 0.02, 0, ry, 0), frame);
    b.add(new THREE.BoxGeometry(w, 0.025, 0.06), mat(x + dx * 0.02, y, z + dz * 0.02, 0, ry, 0), frame);
    b.add(new THREE.BoxGeometry(w + 0.14, 0.035, 0.1), mat(x + dx * 0.03, y - h / 2 - 0.04, z + dz * 0.03, 0, ry, 0), frame);
    if (!arched && hash2(Math.round(x * 10), Math.round(z * 10), 3) > 0.5) {
      // shutters
      b.add(new THREE.BoxGeometry(w * 0.45, h + 0.04, 0.03), mat(x + Math.cos(ry) * (w * 0.75), y, z - Math.sin(ry) * (w * 0.75), 0, ry, 0), '#3e5a3a');
      b.add(new THREE.BoxGeometry(w * 0.45, h + 0.04, 0.03), mat(x - Math.cos(ry) * (w * 0.75), y, z + Math.sin(ry) * (w * 0.75), 0, ry, 0), '#3e5a3a');
    }
  }

  private addDoor(b: GeoBuilder, x: number, y: number, z: number, dx: number, dz: number) {
    const ry = Math.atan2(dx, dz);
    b.add(new THREE.BoxGeometry(0.42, 0.62, 0.04), mat(x, y + 0.31, z, 0, ry, 0), '#3a2414');
    b.add(new THREE.BoxGeometry(0.34, 0.56, 0.05), mat(x + dx * 0.01, y + 0.28, z + dz * 0.01, 0, ry, 0), '#6a4424');
    b.add(new THREE.BoxGeometry(0.05, 0.05, 0.06), mat(x + dx * 0.03 + Math.cos(ry) * 0.1, y + 0.3, z + dz * 0.03 - Math.sin(ry) * 0.1, 0, ry, 0), '#c8a040');
  }

  private buildGrass() {
    const dens = rinfo?.settings.grass ?? 1;
    if (dens <= 0) return;
    const b = new GeoBuilder();
    const g = this.grid;
    const ox = -g.w / 2, oz = -g.d / 2;
    const base: C3 = hexRgb('#35561f'), tip: C3 = hexRgb('#9cc25a'), tipDry: C3 = hexRgb('#c8c070');
    for (const c of g.cells) {
      if (c.hole || (c.terrain !== 'g' && c.terrain !== 'm' && c.terrain !== 'k')) continue;
      const tall = c.flags.includes('G');
      const n = Math.round((tall ? 40 : c.terrain === 'g' ? 16 : 6) * dens);
      for (let i = 0; i < n; i++) {
        const r1 = hash2(c.x * 131 + i, c.z * 71, 11), r2 = hash2(c.x * 17, c.z * 191 + i, 13), r3 = hash2(i, c.x + c.z * 57, 17);
        const px = ox + c.x + 0.04 + r1 * 0.92, pz = oz + c.z + 0.04 + r2 * 0.92;
        const py = this.sampleTop(c, px - (ox + c.x), pz - (oz + c.z));
        const h = (tall ? 0.28 : 0.1) + r3 * (tall ? 0.22 : 0.12);
        const ang = r3 * Math.PI * 2;
        const w = 0.035;
        const ca = Math.cos(ang) * w, sa = Math.sin(ang) * w;
        const lean = (r1 - 0.5) * 0.08;
        const tc = r2 > 0.8 ? tipDry : tip;
        // blade = one triangle; uv.y = height factor (used for wind)
        b.vertex(px - ca, py, pz - sa, 0, 1, 0, 0, 0, base[0], base[1], base[2]);
        b.vertex(px + ca, py, pz + sa, 0, 1, 0, 1, 0, base[0], base[1], base[2]);
        b.vertex(px + lean, py + h, pz + lean * 0.5, 0, 1, 0, 0.5, 1, tc[0], tc[1], tc[2]);
      }
      if (c.flags.includes('F')) {
        for (let i = 0; i < 7; i++) {
          const r1 = hash2(c.x * 7 + i, c.z * 5, 21), r2 = hash2(c.x * 3, c.z * 11 + i, 23);
          const px = ox + c.x + 0.1 + r1 * 0.8, pz = oz + c.z + 0.1 + r2 * 0.8;
          const py = this.sampleTop(c, px - (ox + c.x), pz - (oz + c.z)) + 0.1;
          const col = hexRgb(['#f2e27a', '#e88aa8', '#f4f4f4', '#9ab8f0', '#f0a050'][(i + c.x) % 5]);
          const s = 0.05;
          b.vertex(px - s, py, pz, 0, 1, 0, 0, 0.8, col[0], col[1], col[2]);
          b.vertex(px + s, py, pz, 0, 1, 0, 1, 0.8, col[0], col[1], col[2]);
          b.vertex(px, py + s * 0.8, pz + s, 0, 1, 0, 0.5, 1, col[0], col[1], col[2]);
        }
      }
    }
    if (!b.count) return;
    const m = new THREE.Mesh(b.build(), grassMaterial());
    m.receiveShadow = true;
    m.castShadow = false;
    m.name = 'grass';
    this.group.add(m);
  }

  /** height of the top surface at local offset (0..1) inside cell */
  sampleTop(c: Cell, fx: number, fz: number) {
    const h0 = this.cornerH(c, 0), h1 = this.cornerH(c, 1), h2 = this.cornerH(c, 2), h3 = this.cornerH(c, 3);
    const top = h0 + (h1 - h0) * fx, bot = h3 + (h2 - h3) * fx;
    return top + (bot - top) * fz;
  }

  private buildProps() {
    const g = this.grid;
    const buckets = new PropBuckets();
    const flagMap: Record<string, string> = { T: 'tree', P: 'pine', D: 'deadTree', B: 'bush', R: 'boulder', C: 'crate', K: 'barrel', L: 'lamp', S: 'statue', M: 'mushroom', X: 'grave' };
    for (const c of g.cells) {
      if (c.hole) continue;
      for (const f of c.flags) {
        const type = flagMap[f];
        if (!type) continue;
        const p = this.tileCenter(c.x, c.z);
        const off = type === 'crate' || type === 'barrel' || type === 'lamp' || type === 'mushroom' || type === 'grave' ? 0.3 : 0;
        const a = hash2(c.x, c.z, 41) * Math.PI * 2;
        const px = p.x + Math.cos(a) * off, pz = p.z + Math.sin(a) * off;
        buildProp(buckets, type, px, p.y, pz, a, 0.85 + hash2(c.x, c.z, 43) * 0.3, this.theme, undefined, this.lights);
      }
    }
    for (const d of g.def.decor ?? []) {
      const p = this.tileCenter(d.at[0], d.at[1]);
      buildProp(buckets, d.type, p.x, p.y + (d.y ?? 0) * HS, p.z, d.rot ?? 0, d.scale ?? 1, this.theme, d.color, this.lights);
    }
    for (const m of buckets.meshes()) this.group.add(m);
  }

  dispose() {
    this.group.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); });
  }
}

export function nodesAvailable() { return NODES; }
