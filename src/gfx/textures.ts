// Procedural "hand-painted" textures drawn on canvas at startup, with normal
// maps derived from a height channel. Works on every backend.
import { THREE } from './three';
import { hash2 } from '../core/rng';
import type { Texture } from 'three/webgpu';
import { markShared } from './dispose';

export type TexId =
  | 'grass' | 'dirt' | 'cobble' | 'rock' | 'brick' | 'planks' | 'roof' | 'carpet' | 'moss'
  | 'sand' | 'snow' | 'marsh' | 'lava' | 'metal' | 'salt' | 'bones' | 'farm' | 'plaster'
  | 'stoneWall' | 'sandstone' | 'riverbed' | 'ice' | 'poison';

const SIZE = 256;
const cache = new Map<string, { map: Texture; normal: Texture; emissive?: Texture }>();

// ---------------------------------------------------------------------------
//  noise helpers
// ---------------------------------------------------------------------------
// Noise lattices: every pixel re-reads the same few thousand hashed corners, so each
// (seed, period) table is filled once per texture. Values match calling hash2 directly.
const lattices = new Map<number, Float64Array>();
function lattice(seed: number, period: number): Float64Array {
  const key = seed * 4096 + period;
  let t = lattices.get(key);
  if (!t) {
    t = new Float64Array(period * period);
    for (let j = 0; j < period; j++) for (let i = 0; i < period; i++) t[j * period + i] = hash2(i, j, seed);
    lattices.set(key, t);
  }
  return t;
}
function vnoise(x: number, y: number, t: Float64Array, period: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const x0 = ((xi % period) + period) % period, x1 = (((xi + 1) % period) + period) % period;
  const y0 = (((yi % period) + period) % period) * period, y1 = ((((yi + 1) % period) + period) % period) * period;
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  const a = t[y0 + x0], b = t[y0 + x1], c = t[y1 + x0], d = t[y1 + x1];
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
/** tileable fbm in [0,1] */
function fbm(x: number, y: number, seed: number, oct = 4, base = 4) {
  let v = 0, amp = 0.5, f = base, tot = 0;
  for (let i = 0; i < oct; i++) {
    v += vnoise((x / SIZE) * f, (y / SIZE) * f, lattice(seed + i * 17, f), f) * amp;
    tot += amp; amp *= 0.5; f *= 2;
  }
  return v / tot;
}

type RGB = [number, number, number];
const hex = (h: string): RGB => { const c = parseInt(h.slice(1), 16); return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; };
const lerp = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp255 = (v: number) => Math.max(0, Math.min(255, v | 0));

interface Painter {
  /** colour at pixel */
  color(x: number, y: number): RGB;
  /** height 0..1 used for the normal map */
  height(x: number, y: number): number;
  /** optional emissive (lava) */
  emissive?(x: number, y: number): RGB;
  /** normal strength */
  bump?: number;
}

/** Jittered feature point per cell, as offsets [x0, y0, x1, y1, …]. */
const cellPoints = new Map<number, Float64Array>();
function features(cells: number, seed: number): Float64Array {
  const key = seed * 4096 + cells;
  let t = cellPoints.get(key);
  if (!t) {
    t = new Float64Array(cells * cells * 2);
    for (let wy = 0; wy < cells; wy++) for (let wx = 0; wx < cells; wx++) {
      t[(wy * cells + wx) * 2] = hash2(wx, wy, seed);
      t[(wy * cells + wx) * 2 + 1] = hash2(wx, wy, seed + 7);
    }
    cellPoints.set(key, t);
  }
  return t;
}
type Cell = { d1: number; d2: number; id: number };
// colour, height and emissive usually ask for the same pixel's cell in turn
let lastCell: Cell = { d1: 0, d2: 0, id: 0 }, lastX = NaN, lastY = NaN, lastCells = NaN, lastSeed = NaN;
function cellular(x: number, y: number, cells: number, seed: number): Cell {
  if (x === lastX && y === lastY && cells === lastCells && seed === lastSeed) return lastCell;
  const pts = features(cells, seed);
  const fx = (x / SIZE) * cells, fy = (y / SIZE) * cells;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  let d1 = 9, d2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = ix + i, cy = iy + j;
    const wx = ((cx % cells) + cells) % cells, wy = ((cy % cells) + cells) % cells;
    const k = (wy * cells + wx) * 2;
    const px = cx + pts[k], py = cy + pts[k + 1];
    const d = Math.hypot(px - fx, py - fy);
    if (d < d1) { d2 = d1; d1 = d; id = wx * 131 + wy; } else if (d < d2) d2 = d;
  }
  lastX = x; lastY = y; lastCells = cells; lastSeed = seed;
  return (lastCell = { d1, d2, id });
}

function painters(id: TexId): Painter {
  switch (id) {
    case 'grass': {
      const a = hex('#4f7d2f'), b = hex('#7fa843'), c = hex('#a8c060'), dark = hex('#3a5e22');
      return {
        color: (x, y) => {
          const n = fbm(x, y, 11, 5, 4);
          const blades = hash2(x, y >> 2, 3);
          let col = lerp(a, b, n);
          if (blades > 0.93) col = lerp(col, c, 0.7);
          if (blades < 0.05) col = lerp(col, dark, 0.6);
          const flower = hash2(x >> 2, y >> 2, 99);
          if (flower > 0.996) col = hash2(x >> 2, y >> 2, 5) > 0.5 ? [240, 230, 160] : [230, 150, 170];
          return col;
        },
        height: (x, y) => fbm(x, y, 11, 3, 8) * 0.6 + hash2(x, y >> 2, 3) * 0.4,
        bump: 1.2,
      };
    }
    case 'moss': {
      const a = hex('#4c5f3a'), b = hex('#7a8a52');
      return { color: (x, y) => lerp(a, b, fbm(x, y, 21, 5, 6)), height: (x, y) => fbm(x, y, 21, 4, 8), bump: 1.5 };
    }
    case 'dirt': case 'riverbed': case 'farm': {
      const a = hex(id === 'riverbed' ? '#8a7a5a' : '#7a5a3a'), b = hex(id === 'riverbed' ? '#b0a07a' : '#a07850'), peb = hex('#c0a888');
      return {
        color: (x, y) => {
          let col = lerp(a, b, fbm(x, y, 31, 5, 5));
          const c = cellular(x, y, 22, 5);
          if (c.d1 < 0.18 && hash2(c.id, 1, 2) > 0.6) col = lerp(col, peb, 0.55 - c.d1 * 2);
          if (id === 'farm') { const f = Math.sin((y / SIZE) * Math.PI * 16); col = lerp(col, [70, 50, 30], f > 0.6 ? 0.35 : 0); }
          return col;
        },
        height: (x, y) => { const c = cellular(x, y, 22, 5); return fbm(x, y, 31, 3, 8) * 0.5 + (c.d1 < 0.2 ? 0.5 - c.d1 * 2 : 0) + (id === 'farm' ? Math.sin((y / SIZE) * Math.PI * 16) * 0.3 : 0); },
        bump: 1.6,
      };
    }
    case 'cobble': {
      const a = hex('#8d8a82'), b = hex('#b7b2a4'), mortar = hex('#5e5a52');
      return {
        color: (x, y) => {
          const c = cellular(x, y, 7, 41);
          const edge = c.d2 - c.d1;
          let col = lerp(a, b, hash2(c.id, 3, 4) * 0.7 + fbm(x, y, 43, 3, 8) * 0.3);
          if (edge < 0.08) col = lerp(mortar, col, edge / 0.08);
          return col;
        },
        height: (x, y) => { const c = cellular(x, y, 7, 41); return Math.min(1, (c.d2 - c.d1) * 5) * 0.8 + fbm(x, y, 43, 3, 16) * 0.2; },
        bump: 2.4,
      };
    }
    case 'stoneWall': {
      const a = hex('#7f7b72'), b = hex('#a9a497'), mortar = hex('#4a463f');
      return {
        color: (x, y) => {
          const row = Math.floor((y / SIZE) * 4);
          const off = row % 2 ? 0.5 : 0;
          const bx = (x / SIZE) * 2 + off, by = (y / SIZE) * 4;
          const fx = bx - Math.floor(bx), fy = by - Math.floor(by);
          const idb = Math.floor(bx) * 7 + row * 13;
          let col = lerp(a, b, hash2(idb, row, 9) * 0.6 + fbm(x, y, 51, 4, 8) * 0.4);
          if (fx < 0.03 || fx > 0.97 || fy < 0.05 || fy > 0.95) col = mortar;
          return col;
        },
        height: (x, y) => {
          const row = Math.floor((y / SIZE) * 4);
          const off = row % 2 ? 0.5 : 0;
          const fx = ((x / SIZE) * 2 + off) % 1, fy = ((y / SIZE) * 4) % 1;
          const e = Math.min(fx, 1 - fx, fy * 0.5, (1 - fy) * 0.5);
          return Math.min(1, e * 12) * 0.8 + fbm(x, y, 51, 3, 16) * 0.2;
        },
        bump: 2.2,
      };
    }
    case 'brick': {
      const a = hex('#8a4a36'), b = hex('#b26a4c'), mortar = hex('#c8b89a');
      return {
        color: (x, y) => {
          const row = Math.floor((y / SIZE) * 8);
          const off = row % 2 ? 0.5 : 0;
          const bx = (x / SIZE) * 4 + off;
          const fx = bx - Math.floor(bx), fy = ((y / SIZE) * 8) % 1;
          let col = lerp(a, b, hash2(Math.floor(bx), row, 19) * 0.7 + fbm(x, y, 61, 3, 16) * 0.3);
          if (fx < 0.04 || fy < 0.1) col = mortar;
          return col;
        },
        height: (x, y) => {
          const row = Math.floor((y / SIZE) * 8);
          const off = row % 2 ? 0.5 : 0;
          const fx = ((x / SIZE) * 4 + off) % 1, fy = ((y / SIZE) * 8) % 1;
          return (fx < 0.04 || fy < 0.1) ? 0 : 0.8 + fbm(x, y, 61, 2, 16) * 0.2;
        },
        bump: 2,
      };
    }
    case 'planks': {
      const a = hex('#6e4a2c'), b = hex('#9c6c40'), gap = hex('#3a2616');
      return {
        color: (x, y) => {
          const plank = Math.floor((x / SIZE) * 6);
          const fx = ((x / SIZE) * 6) % 1;
          const grain = Math.sin((y / SIZE) * 60 + hash2(plank, 0, 3) * 20 + fbm(x, y, 71, 3, 4) * 8) * 0.5 + 0.5;
          let col = lerp(a, b, hash2(plank, 1, 7) * 0.5 + grain * 0.3);
          const seam = ((y / SIZE) + hash2(plank, 2, 8)) % 1;
          if (fx < 0.05 || seam < 0.012) col = gap;
          return col;
        },
        height: (x) => { const fx = ((x / SIZE) * 6) % 1; return fx < 0.05 ? 0 : 0.7; },
        bump: 1.4,
      };
    }
    case 'roof': {
      const a = hex('#8c3a26'), b = hex('#b8573a'), dark = hex('#4a1e14');
      return {
        color: (x, y) => {
          const row = Math.floor((y / SIZE) * 8);
          const off = row % 2 ? 0.5 : 0;
          const bx = (x / SIZE) * 6 + off;
          const fx = bx - Math.floor(bx), fy = ((y / SIZE) * 8) % 1;
          let col = lerp(a, b, hash2(Math.floor(bx), row, 23) * 0.6 + (1 - fy) * 0.3);
          const scallop = Math.abs(fx - 0.5) * 2;
          if (fy > 0.85 - scallop * scallop * 0.3) col = lerp(col, dark, 0.65);
          return col;
        },
        height: (x, y) => { const fy = ((y / SIZE) * 8) % 1; return 1 - fy; },
        bump: 2.2,
      };
    }
    case 'plaster': {
      const a = hex('#d8c9a8'), b = hex('#eadfc4'), beam = hex('#5a3a22');
      return {
        color: (x, y) => {
          let col = lerp(a, b, fbm(x, y, 81, 4, 6));
          const fx = (x / SIZE) % 0.5, fy = (y / SIZE);
          if (fx < 0.04 || fy < 0.04 || (Math.abs(fx - fy % 0.5) < 0.025)) col = beam;
          return col;
        },
        height: (x, y) => { const fx = (x / SIZE) % 0.5, fy = y / SIZE; return (fx < 0.04 || fy < 0.04) ? 1 : fbm(x, y, 81, 3, 12) * 0.4; },
        bump: 1.4,
      };
    }
    case 'rock': case 'sandstone': {
      const a = hex(id === 'rock' ? '#6e655a' : '#b4966a'), b = hex(id === 'rock' ? '#9a9080' : '#d8bb8a'), crack = hex(id === 'rock' ? '#3e3830' : '#80603c');
      return {
        color: (x, y) => {
          const strata = Math.sin((y / SIZE) * Math.PI * 10 + fbm(x, y, 91, 3, 4) * 6) * 0.5 + 0.5;
          let col = lerp(a, b, strata * 0.5 + fbm(x, y, 93, 5, 6) * 0.5);
          const c = cellular(x, y, 5, 97);
          if (c.d2 - c.d1 < 0.04) col = lerp(crack, col, (c.d2 - c.d1) / 0.04);
          return col;
        },
        height: (x, y) => { const c = cellular(x, y, 5, 97); return Math.min(1, (c.d2 - c.d1) * 6) * 0.6 + fbm(x, y, 93, 4, 8) * 0.4; },
        bump: 2.6,
      };
    }
    case 'carpet': {
      const a = hex('#7a1e22'), b = hex('#a3322c'), gold = hex('#d8a84a');
      return {
        color: (x, y) => {
          const u = x / SIZE, v = y / SIZE;
          let col = lerp(a, b, fbm(x, y, 101, 2, 32) * 0.4 + 0.3);
          const bord = Math.min(u, 1 - u, v, 1 - v);
          if (bord < 0.06 && bord > 0.03) col = gold;
          const dm = Math.abs(u - 0.5) + Math.abs(v - 0.5);
          if (Math.abs(dm - 0.28) < 0.015) col = gold;
          return col;
        },
        height: (x, y) => fbm(x, y, 101, 2, 64),
        bump: 0.6,
      };
    }
    case 'sand': {
      const a = hex('#c8a86a'), b = hex('#e6cf96');
      return {
        color: (x, y) => { const r = Math.sin((x / SIZE) * 30 + fbm(x, y, 111, 3, 3) * 10) * 0.5 + 0.5; return lerp(a, b, r * 0.35 + fbm(x, y, 113, 4, 8) * 0.65); },
        height: (x, y) => Math.sin((x / SIZE) * 30 + fbm(x, y, 111, 3, 3) * 10) * 0.5 + 0.5,
        bump: 0.8,
      };
    }
    case 'snow': case 'ice': {
      const a = hex(id === 'snow' ? '#d6e0ea' : '#9cc4d8'), b = hex(id === 'snow' ? '#ffffff' : '#d4ecf6');
      return { color: (x, y) => lerp(a, b, fbm(x, y, 121, 4, 5)), height: (x, y) => fbm(x, y, 121, 3, 6), bump: id === 'snow' ? 0.7 : 0.3 };
    }
    case 'marsh': case 'poison': {
      const a = hex(id === 'marsh' ? '#3e4a2a' : '#3a3252'), b = hex(id === 'marsh' ? '#6a6a3a' : '#6a4a7a');
      return { color: (x, y) => lerp(a, b, fbm(x, y, 131, 5, 5)), height: (x, y) => fbm(x, y, 131, 3, 6), bump: 0.8 };
    }
    case 'lava': {
      const crust = hex('#2a1a16'), crust2 = hex('#4a2a1e'), hot = hex('#ff7a1a');
      return {
        color: (x, y) => { const c = cellular(x, y, 6, 141); const e = c.d2 - c.d1; return e < 0.06 ? lerp(hot, crust2, e / 0.06) : lerp(crust, crust2, fbm(x, y, 143, 3, 8)); },
        emissive: (x, y) => { const c = cellular(x, y, 6, 141); const e = c.d2 - c.d1; return e < 0.07 ? lerp([255, 150, 40], [0, 0, 0], e / 0.07) : [0, 0, 0]; },
        height: (x, y) => { const c = cellular(x, y, 6, 141); return Math.min(1, (c.d2 - c.d1) * 8); },
        bump: 2.5,
      };
    }
    case 'metal': {
      const a = hex('#5a6068'), b = hex('#8a9098'), rivet = hex('#c0c4c8');
      return {
        color: (x, y) => {
          const u = (x / SIZE) % 0.5, v = (y / SIZE) % 0.5;
          let col = lerp(a, b, fbm(x, y, 151, 3, 8) * 0.5 + 0.25);
          if (u < 0.015 || v < 0.015) col = [40, 44, 50];
          if (Math.hypot(u - 0.05, v - 0.05) < 0.015 || Math.hypot(u - 0.45, v - 0.05) < 0.015) col = rivet;
          return col;
        },
        height: (x, y) => { const u = (x / SIZE) % 0.5, v = (y / SIZE) % 0.5; return u < 0.015 || v < 0.015 ? 0 : (Math.hypot(u - 0.05, v - 0.05) < 0.015 ? 1 : 0.6); },
        bump: 1.5,
      };
    }
    case 'salt': {
      const a = hex('#d8ccd0'), b = hex('#fff4f8');
      return { color: (x, y) => { const c = cellular(x, y, 9, 161); return lerp(a, b, 1 - c.d1); }, height: (x, y) => 1 - cellular(x, y, 9, 161).d1, bump: 1.8 };
    }
    case 'bones': {
      const a = hex('#5a5048'), b = hex('#7a6e60'), bone = hex('#d8d0bc');
      return {
        color: (x, y) => { let col = lerp(a, b, fbm(x, y, 171, 4, 6)); if (hash2(x >> 3, y >> 1, 173) > 0.985) col = bone; return col; },
        height: (x, y) => fbm(x, y, 171, 3, 8), bump: 1.2,
      };
    }
  }
  return { color: () => [128, 128, 128], height: () => 0.5 };
}

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}

export function getTexture(id: TexId): { map: Texture; normal: Texture; emissive?: Texture } {
  const hit = cache.get(id);
  if (hit) return hit;
  const p = painters(id);
  const [cc, cx] = makeCanvas();
  const [nc, nx] = makeCanvas();
  const img = cx.createImageData(SIZE, SIZE);
  const nimg = nx.createImageData(SIZE, SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  let eimg: ImageData | null = null;
  let ec: HTMLCanvasElement | null = null, ex: CanvasRenderingContext2D | null = null;
  if (p.emissive) { [ec, ex] = makeCanvas(); eimg = ex.createImageData(SIZE, SIZE); }
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const c = p.color(x, y);
      // painterly dither
      const d = (hash2(x, y, 777) - 0.5) * 10;
      img.data[i * 4] = clamp255(c[0] + d); img.data[i * 4 + 1] = clamp255(c[1] + d); img.data[i * 4 + 2] = clamp255(c[2] + d); img.data[i * 4 + 3] = 255;
      heights[i] = p.height(x, y);
      if (eimg && p.emissive) { const e = p.emissive(x, y); eimg.data[i * 4] = e[0]; eimg.data[i * 4 + 1] = e[1]; eimg.data[i * 4 + 2] = e[2]; eimg.data[i * 4 + 3] = 255; }
    }
  }
  const bump = p.bump ?? 1;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const row = y * SIZE, left = (x + SIZE - 1) % SIZE, right = (x + 1) % SIZE;
      const dx = (heights[row + right] - heights[row + left]) * bump;
      const dy = (heights[((y + 1) % SIZE) * SIZE + x] - heights[((y + SIZE - 1) % SIZE) * SIZE + x]) * bump;
      let nX = -dx, nY = -dy, nZ = 1;
      const l = Math.hypot(nX, nY, nZ);
      nX /= l; nY /= l; nZ /= l;
      const i = (y * SIZE + x) * 4;
      nimg.data[i] = (nX * 0.5 + 0.5) * 255; nimg.data[i + 1] = (-nY * 0.5 + 0.5) * 255; nimg.data[i + 2] = (nZ * 0.5 + 0.5) * 255; nimg.data[i + 3] = 255;
    }
  }
  cx.putImageData(img, 0, 0);
  nx.putImageData(nimg, 0, 0);
  const map = new THREE.CanvasTexture(cc);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  const normal = new THREE.CanvasTexture(nc);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.anisotropy = 8;
  let emissive: Texture | undefined;
  if (ex && eimg && ec) {
    ex.putImageData(eimg, 0, 0);
    emissive = new THREE.CanvasTexture(ec);
    emissive.colorSpace = THREE.SRGBColorSpace;
    emissive.wrapS = emissive.wrapT = THREE.RepeatWrapping;
  }
  lattices.clear();
  cellPoints.clear();
  const res = { map, normal, emissive };
  for (const t of [map, normal, emissive]) if (t) markShared(t);
  cache.set(id, res);
  return res;
}
