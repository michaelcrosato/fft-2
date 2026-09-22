import type { Facing, MapDef } from '../data/types';

export interface Cell {
  x: number;
  z: number;
  /** top surface height in h units (for water: the floor under the water) */
  h: number;
  terrain: string;
  /** water depth in h (0 = dry) */
  depth: number;
  slope?: Facing;
  flags: string;
  standable: boolean;
  targetable: boolean;
  hole: boolean;
}

export const DIRS: Record<Facing, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
export const FACINGS: Facing[] = ['N', 'E', 'S', 'W'];

const UNSTANDABLE_FLAGS = /[TPDRS]/;

export function parseToken(tok: string, x: number, z: number): Cell {
  if (tok === '.' || tok === '') {
    return { x, z, h: 0, terrain: '.', depth: 0, flags: '', standable: false, targetable: false, hole: true };
  }
  const m = /^(-?\d+(?:\.\d+)?)([a-zA-Z.])([A-Z]*)(?:\/([nesw]))?([A-Z]*)$/.exec(tok);
  if (!m) throw new Error(`Bad map token "${tok}" at ${x},${z}`);
  const h = parseFloat(m[1]);
  const terrain = m[2];
  const flags = (m[3] || '') + (m[5] || '');
  const slope = m[4] ? (m[4].toUpperCase() as Facing) : undefined;
  let depth = 0;
  if (terrain === 'w') depth = 0.5;
  else if (terrain === 'W') depth = 1.5;
  else if (terrain === 'm' || terrain === 'p') depth = 0.25;
  const blocked = terrain === 'x' || UNSTANDABLE_FLAGS.test(flags);
  return {
    x, z, h, terrain, depth, slope, flags,
    standable: !blocked,
    targetable: terrain !== 'x',
    hole: false,
  };
}

export interface PathNode { x: number; z: number; cost: number; prev: number; }

export interface MoveParams {
  move: number;
  jump: number;
  fly?: boolean;
  ignoreHeight?: boolean;
  float?: boolean;
  waterWalk?: boolean;
  swim?: boolean;
  lavaWalk?: boolean;
  /** returns 0 free, 1 = ally (can pass, can't stop), 2 = enemy (blocks) */
  occupant: (x: number, z: number) => 0 | 1 | 2;
}

export class MapGrid {
  readonly w: number;
  readonly d: number;
  readonly cells: Cell[];
  readonly def: MapDef;

  constructor(def: MapDef) {
    this.def = def;
    const rows = def.rows.map((r) => r.trim().split(/\s+/));
    this.d = rows.length;
    this.w = Math.max(...rows.map((r) => r.length));
    this.cells = [];
    for (let z = 0; z < this.d; z++) {
      for (let x = 0; x < this.w; x++) {
        this.cells.push(parseToken(rows[z][x] ?? '.', x, z));
      }
    }
  }

  inBounds(x: number, z: number) { return x >= 0 && z >= 0 && x < this.w && z < this.d; }
  cell(x: number, z: number): Cell | undefined { return this.inBounds(x, z) ? this.cells[z * this.w + x] : undefined; }
  idx(x: number, z: number) { return z * this.w + x; }

  /** Height a unit's feet are at (water surface for floaters). */
  standHeight(c: Cell, floating = false) {
    return floating && c.depth > 0 ? c.h + c.depth : c.h;
  }

  maxHeight() { let m = 0; for (const c of this.cells) if (!c.hole && c.h > m) m = c.h; return m; }

  /**
   * Movement range: Dijkstra over grid with FFT-like rules
   *  - climbing/dropping limited by Jump (unless fly/ignoreHeight)
   *  - horizontal leaps over lower tiles up to floor(jump/2)
   *  - deep water costs 2 (unless swim/float/waterWalk)
   *  - enemies block, allies can be passed through
   */
  moveRange(sx: number, sz: number, p: MoveParams): Map<number, PathNode> {
    const out = new Map<number, PathNode>();
    const start = this.cell(sx, sz);
    if (!start) return out;
    const startIdx = this.idx(sx, sz);
    out.set(startIdx, { x: sx, z: sz, cost: 0, prev: -1 });
    const open: number[] = [startIdx];
    const heightOf = (c: Cell) => (p.float || p.waterWalk) && c.depth >= 1 ? c.h + c.depth : c.h;
    while (open.length) {
      // pick lowest cost (small grids => linear scan is fine)
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (out.get(open[i])!.cost < out.get(open[bi])!.cost) bi = i;
      const cur = open.splice(bi, 1)[0];
      const node = out.get(cur)!;
      const cc = this.cells[cur];
      for (const f of FACINGS) {
        const [dx, dz] = DIRS[f];
        // walk / fly one step
        const tryStep = (nx: number, nz: number, extraCost: number, leap: boolean) => {
          const nc = this.cell(nx, nz);
          if (!nc || nc.hole || !nc.standable) return false;
          if (nc.terrain === 'l' && !p.lavaWalk && !p.float && !p.fly) { /* lava walkable but hurts — allowed */ }
          const occ = p.occupant(nx, nz);
          if (occ === 2 && !p.fly) return false;
          const dh = heightOf(nc) - heightOf(cc);
          if (!p.fly && !p.ignoreHeight && Math.abs(dh) > p.jump) return false;
          let cost = node.cost + 1 + extraCost;
          if (nc.terrain === 'W' && !p.swim && !p.float && !p.waterWalk && !p.fly) cost += 1;
          if (cost > p.move) return false;
          const ni = this.idx(nx, nz);
          const prev = out.get(ni);
          if (!prev || prev.cost > cost) {
            out.set(ni, { x: nx, z: nz, cost, prev: cur });
            if (!open.includes(ni)) open.push(ni);
          }
          return true;
        };
        tryStep(cc.x + dx, cc.z + dz, 0, false);
        // horizontal leaps
        if (!p.fly) {
          const maxLeap = Math.floor(p.jump / 2);
          for (let k = 1; k <= maxLeap; k++) {
            // intermediate tiles 1..k must be lower than the current tile (or holes)
            let ok = true;
            for (let j = 1; j <= k; j++) {
              const ic = this.cell(cc.x + dx * j, cc.z + dz * j);
              if (!ic) { ok = false; break; }
              if (!ic.hole && heightOf(ic) >= heightOf(cc)) { ok = false; break; }
              if (!ic.hole && ic.standable && j === k) { /* would be reachable normally */ }
            }
            if (!ok) break;
            // only meaningful when the intermediate tile itself was a drop too deep to walk
            const mid = this.cell(cc.x + dx, cc.z + dz)!;
            if (!mid.hole && Math.abs(heightOf(mid) - heightOf(cc)) <= p.jump && mid.standable) break;
            tryStep(cc.x + dx * (k + 1), cc.z + dz * (k + 1), k, true);
          }
        }
      }
    }
    // remove tiles occupied by anyone (can't end on them), except start
    for (const [i, n] of out) {
      if (i === startIdx) continue;
      if (p.occupant(n.x, n.z) !== 0) out.delete(i);
    }
    return out;
  }

  /** reconstruct path from a moveRange result */
  pathTo(range: Map<number, PathNode>, x: number, z: number, keepAll?: Map<number, PathNode>): Array<[number, number]> {
    const path: Array<[number, number]> = [];
    const src = keepAll ?? range;
    let n = src.get(this.idx(x, z));
    let guard = 0;
    while (n && guard++ < 200) {
      path.unshift([n.x, n.z]);
      if (n.prev < 0) break;
      n = src.get(n.prev);
    }
    return path;
  }

  /** Unfiltered path search that keeps occupied intermediate nodes (for animation). */
  moveRangeAll(sx: number, sz: number, p: MoveParams) {
    const occ = p.occupant;
    // same as moveRange but don't delete occupied tiles
    const res = this.moveRange(sx, sz, { ...p, occupant: (x, z) => (occ(x, z) === 2 ? 2 : 0) });
    return res;
  }

  /** tiles within manhattan range of (x,z) honouring min range */
  diamond(x: number, z: number, r: number, rMin = 0): Cell[] {
    const out: Cell[] = [];
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.abs(dx) + Math.abs(dz);
        if (d > r || d < rMin) continue;
        const c = this.cell(x + dx, z + dz);
        if (c && !c.hole && c.targetable) out.push(c);
      }
    }
    return out;
  }

  /** straight lines in four directions (spears, lines) */
  lines(x: number, z: number, r: number, rMin = 1): Cell[] {
    const out: Cell[] = [];
    for (const f of FACINGS) {
      const [dx, dz] = DIRS[f];
      for (let k = rMin; k <= r; k++) {
        const c = this.cell(x + dx * k, z + dz * k);
        if (c && !c.hole && c.targetable) out.push(c);
      }
    }
    return out;
  }

  /**
   * Line of fire for straight projectiles (guns/crossbows). Samples the segment between the
   * shooter's chest and the target's chest and fails if terrain pokes above it.
   */
  lineOfFire(ax: number, az: number, ah: number, bx: number, bz: number, bh: number): boolean {
    const steps = Math.max(Math.abs(bx - ax), Math.abs(bz - az)) * 4;
    if (steps <= 4) return true;
    const y0 = ah + 1.2, y1 = bh + 1.0;
    for (let i = 2; i < steps - 1; i++) {
      const t = i / steps;
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const c = this.cell(Math.round(x), Math.round(z));
      if (!c || c.hole) continue;
      if ((c.x === ax && c.z === az) || (c.x === bx && c.z === bz)) continue;
      const y = y0 + (y1 - y0) * t;
      if (c.h > y + 0.25) return false;
    }
    return true;
  }

  /** facing from a to b */
  static faceToward(ax: number, az: number, bx: number, bz: number, fallback: Facing = 'S'): Facing {
    const dx = bx - ax, dz = bz - az;
    if (dx === 0 && dz === 0) return fallback;
    if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 'E' : 'W';
    if (Math.abs(dz) > Math.abs(dx)) return dz > 0 ? 'S' : 'N';
    return dz > 0 ? 'S' : 'N';
  }

  /** relative position of attacker to target, considering target facing: front/side/back */
  static relativeSide(target: { x: number; z: number; facing: Facing }, ax: number, az: number): 'front' | 'side' | 'back' {
    const dx = ax - target.x, dz = az - target.z;
    const [fx, fz] = DIRS[target.facing];
    const dot = dx * fx + dz * fz;
    const cross = Math.abs(dx * fz - dz * fx);
    if (dot > 0 && dot >= cross) return 'front';
    if (dot < 0 && -dot >= cross) return 'back';
    return 'side';
  }

  /** geomancy element per terrain */
  static terrainGroup(t: string): string {
    switch (t) {
      case 'd': case 'f': return 'soil';
      case 'w': case 'W': return 'water';
      case 'g': case 'k': return 'grass';
      case 's': case 'b': case 'u': return 'stone';
      case 'r': return 'rock';
      case 'o': case 'c': return 'wood';
      case 'm': case 'p': return 'marsh';
      case 'n': case 'y': return 'sand';
      case 'i': return 'snow';
      case 't': return 'roof';
      case 'l': case 'a': return 'lava';
      default: return 'soil';
    }
  }
}
