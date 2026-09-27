// Tactical AI: evaluates (move tile × ability × target tile) combinations using
// the engine's pure preview, then falls back to positioning.
import type { AbilityDef, Facing, StatusId } from '../data/types';
import { ABILITIES, ITEMS } from '../data/db';
import type { Battle, ActionOpts, TargetPreview } from './battle';
import type { BattleUnit } from './unit';
import { MapGrid, type Cell } from './grid';
import { STATUS } from './status';
import { throwables } from './specials';

export interface AiPlan {
  move?: [number, number];
  act?: { ability: AbilityDef; x: number; z: number; opts?: ActionOpts };
  /** act before moving (then move to `move`) */
  actFirst?: boolean;
  facing: Facing;
  score: number;
}

const BAD_VALUE: Partial<Record<StatusId, number>> = {
  ko: 100, petrify: 90, stop: 70, charm: 70, sleep: 55, confuse: 50, disable: 50, doom: 55, frog: 50,
  berserk: 25, immobilize: 25, silence: 35, blind: 25, slow: 40, poison: 20, chicken: 30, oil: 10,
  atheist: 15, undead: 10, vampire: 40,
};
const GOOD_VALUE: Partial<Record<StatusId, number>> = {
  haste: 45, protect: 30, shell: 25, regen: 30, reraise: 40, float: 8, reflect: 15, faith: 12, invisible: 20, wall: 50,
};

function manhattan(a: { x: number; z: number }, b: { x: number; z: number }) { return Math.abs(a.x - b.x) + Math.abs(a.z - b.z); }

/** path cost from every reachable cell to the nearest goal cell, for this unit's jump & terrain abilities */
function goalDistances(b: Battle, u: BattleUnit, goals: Array<[number, number]>): Map<number, number> {
  const out = new Map<number, number>();
  const p = { ...b.moveParams(u), move: 999, occupant: () => 0 as const };
  for (const [gx, gz] of goals) {
    // climbing is symmetric enough for a heuristic: search outward from the goal
    for (const [idx, n] of b.grid.moveRange(gx, gz, p)) if (!out.has(idx) || out.get(idx)! > n.cost) out.set(idx, n.cost);
  }
  return out;
}

export function planTurn(b: Battle, u: BattleUnit): AiPlan {
  const enemies = b.units.filter((o) => o.team !== u.team && o.active && !o.hidden && !o.gone && !o.jumping);
  const allies = b.units.filter((o) => o.team === u.team && !o.gone && !o.hidden);
  const faceNearest = (x: number, z: number): Facing => {
    let best: BattleUnit | null = null, bd = 1e9;
    for (const e of enemies) { const d = Math.abs(e.x - x) + Math.abs(e.z - z); if (d < bd) { bd = d; best = e; } }
    return best ? MapGrid.faceToward(x, z, best.x, best.z, u.facing) : u.facing;
  };

  // ---- status-driven behaviour ----
  if (u.has('chicken')) return flee(b, u, enemies, faceNearest);
  // cowards keep their distance once a foe draws near or they are hurt
  if (u.ai === 'coward' && (u.hp < u.maxHp * 0.6 || enemies.some((e) => Math.abs(e.x - u.x) + Math.abs(e.z - u.z) <= 4))) return flee(b, u, enemies, faceNearest);
  // ---- reach objectives: allies head for the goal when the way is clear (or it is close) ----
  const vic = b.def.victory;
  if (vic.type === 'reach' && u.team === 0 && !u.moved && u.canMove) {
    const cells = b.moveRange(u);
    const onGoal = cells.find((c) => vic.cells.some(([x, z]) => x === c.x && z === c.z));
    if (onGoal) return { move: [onGoal.x, onGoal.z], facing: u.facing, score: 999 };
    if (!enemies.length) {
      // walking distance to the goal (walls, cliffs and water make straight-line distance a trap)
      const dist = goalDistances(b, u, vic.cells);
      let best = cells[0], bd = 1e9;
      for (const c of cells) {
        const d = dist.get(b.grid.idx(c.x, c.z)) ?? 1e6 + Math.min(...vic.cells.map(([x, z]) => Math.abs(c.x - x) + Math.abs(c.z - z)));
        if (d < bd) { bd = d; best = c; }
      }
      if (best) return { move: [best.x, best.z], facing: u.facing, score: 1 };
    }
  }
  // a performance lands only while the performer waits: moving or acting would restart it
  if (u.performing && !u.critical) return { facing: u.facing, score: 0 };
  // Vampire, like Confuse, strikes at friend and foe alike
  const confused = u.has('confuse') || u.has('vampire');
  const berserk = u.has('berserk') || u.ai === 'berserk';

  const startX = u.x, startZ = u.z;
  const moveCells: Cell[] = !u.moved && u.canMove ? b.moveRange(u) : [b.cellOf(u)];
  if (!moveCells.some((c) => c.x === startX && c.z === startZ)) moveCells.push(b.cellOf(u));

  // abilities available
  let abilities: Array<{ a: AbilityDef; opts?: ActionOpts }> = [];
  if (!u.acted && u.canAct) {
    for (const g of b.commandGroups(u)) {
      for (const a of g.abilities) {
        if (b.unusableReason(u, a)) continue;
        if (a.special === 'calc') continue; // arithmancy handled below
        if (u.performing && a.perform) continue; // singing again would restart the charge
        if (berserk && a.id !== 'attack') continue;
        if (a.special === 'throw') {
          const list = throwables(b, String(a.params?.cat ?? 'shuriken'), u);
          const best = list.sort((p, q) => (ITEMS.get(q)?.wp ?? 0) - (ITEMS.get(p)?.wp ?? 0))[0];
          if (best) abilities.push({ a, opts: { item: best } });
          continue;
        }
        abilities.push({ a });
      }
    }
    // Arithmancer: try combos
    const calcCmd = [...b.commandGroups(u).flatMap((g) => g.abilities)].find((a) => a.special === 'calc');
    if (calcCmd && !b.unusableReason(u, calcCmd)) {
      const attrs = u.roster.learned.filter((id) => id.startsWith('calcAttr')).map((id) => String(ABILITIES.get(id)?.params?.value));
      const divs = u.roster.learned.filter((id) => id.startsWith('calcDiv')).map((id) => String(ABILITIES.get(id)?.params?.value));
      const spells = u.roster.learned.map((id) => ABILITIES.get(id)).filter((a): a is AbilityDef => !!a && !!a.calc);
      for (const attr of attrs) for (const div of divs) for (const sp of spells.slice(0, 12)) abilities.push({ a: calcCmd, opts: { calc: { attr, div, spell: sp.id } } });
    }
  }
  if (confused) {
    // strike at whoever is in weapon reach (friend or foe), then stagger somewhere at random
    const atk = ABILITIES.get('attack');
    const mv = b.rng.pick(moveCells);
    const reach = atk && !u.acted && u.canAct ? new Set(b.targetCells(u, atk).map((c) => b.grid.idx(c.x, c.z))) : new Set<number>();
    const pool = b.units.filter((o) => o.alive && !o.gone && !o.hidden && o !== u && reach.has(b.grid.idx(o.x, o.z)));
    if (pool.length && atk && b.rng.pct(60)) {
      const t = b.rng.pick(pool);
      return { move: [mv.x, mv.z], act: { ability: atk, x: t.x, z: t.z }, actFirst: true, facing: u.facing, score: 0 };
    }
    return { move: [mv.x, mv.z], facing: b.rng.pick(['N', 'E', 'S', 'W'] as Facing[]), score: 0 };
  }

  // ---- evaluate ----
  let best: AiPlan = { facing: u.facing, score: 0 };
  const unitCells = new Set<number>();
  for (const o of b.units) if (!o.gone && !o.hidden && !o.jumping) unitCells.add(b.grid.idx(o.x, o.z));
  // prune positions: nearest to action for large move sets
  let positions = moveCells;
  if (positions.length > 40) {
    const scoreP = (c: Cell) => Math.min(...enemies.map((e) => manhattan(c, e)), 99);
    positions = [...positions].sort((p, q) => scoreP(p) - scoreP(q)).slice(0, 36);
    if (!positions.some((c) => c.x === startX && c.z === startZ)) positions.push(b.cellOf(u));
  }
  const support = u.ai === 'support';
  const guard = u.ai === 'guard' || u.ai === 'defensive';
  const want = rangedPreference(b, u);
  // Arithmeticks targets by attribute, not position: score each combination once
  // (except by height, where the caster's own tile can change who is hit)
  const calcScores = new Map<string, number>();
  for (const pos of positions) {
    if (guard && manhattan(pos, { x: startX, z: startZ }) > 2 && enemies.every((e) => manhattan(e, pos) > 5)) continue;
    const ox = u.x, oz = u.z;
    u.x = pos.x; u.z = pos.z;
    // positional pressure: close in on the enemy (or hold a healer's distance)
    let near = 99;
    for (const e of enemies) near = Math.min(near, manhattan(e, pos));
    const posScore = guard ? 0 : support ? -Math.max(0, near - want - 1) * 0.9 : -Math.max(0, near - want) * 1.4;
    for (const { a, opts } of abilities) {
      if (b.deepWaterBlocks(u, a, pos)) continue;
      let cells: Cell[];
      if (opts?.calc) cells = [pos];
      else cells = b.targetCells(u, a, pos.x, pos.z);
      const aoe = a.aoe ?? 1;
      const shapeAll = a.shape === 'all' || a.shape === 'allAllies' || a.shape === 'allEnemies' || a.shape === 'self' || a.range === 0;
      for (const c of cells) {
        if (!shapeAll && aoe <= 1 && !unitCells.has(b.grid.idx(c.x, c.z))) continue;
        if (!shapeAll && aoe > 1) {
          // skip cells with no unit nearby
          let near = false;
          for (const o of b.units) if (!o.gone && !o.hidden && manhattan(o, c) < aoe) { near = true; break; }
          if (!near) continue;
        }
        const effect = opts?.calc ? ABILITIES.get(opts.calc.spell) ?? a : a;
        const calcKey = opts?.calc ? `${opts.calc.attr}|${opts.calc.div}|${opts.calc.spell}|${opts.calc.attr === 'height' ? `${pos.h}:${pos.depth}` : ''}` : '';
        let s = calcScores.get(calcKey) ?? scoreAction(b, u, effect, b.previewAction(u, a, c.x, c.z, opts), support);
        if (calcKey) calcScores.set(calcKey, s);
        if (s <= 0.5) continue;
        const ct = opts?.calc ? 0 : b.chargeTicks(u, a);
        if (ct > 0) s *= aoe > 1 ? 0.75 : 0.85;
        if (ct > 6) s *= 0.8;
        s -= (b.mpCost(u, a) / Math.max(1, u.maxMp)) * 6;
        // positional safety: prefer not standing next to many enemies when fragile
        const threat = enemies.filter((e) => manhattan(e, pos) <= e.move + 1).length;
        if (u.critical || support) s -= threat * 3;
        // prefer attacking from behind (the evasion already reflects it) and not moving needlessly
        if (pos.x !== startX || pos.z !== startZ) s -= 0.5;
        s += posScore;
        // abilities that cost the caster HP
        if (a.effects?.some((e) => e.type === 'special' && e.id === 'wish')) s -= Math.min(80, ((u.maxHp / 5) / Math.max(1, u.hp)) * 70);
        if (s > best.score) {
          best = {
            move: pos.x !== startX || pos.z !== startZ ? [pos.x, pos.z] : undefined,
            act: { ability: a, x: c.x, z: c.z, opts },
            facing: MapGrid.faceToward(pos.x, pos.z, c.x, c.z, u.facing),
            score: s,
          };
        }
      }
    }
    u.x = ox; u.z = oz;
  }

  if (best.act) {
    // act from current tile and then reposition? only for supports that are already in range
    if (!best.move && !u.moved && u.canMove && (support || u.critical)) {
      const safe = safest(b, u, moveCells, enemies);
      if (safe && (safe.x !== u.x || safe.z !== u.z)) { best.actFirst = true; best.move = [safe.x, safe.z]; best.facing = faceNearest(safe.x, safe.z); }
    }
    return best;
  }

  // ---- no worthwhile action: reposition ----
  if (!u.moved && u.canMove) {
    const target = support || u.critical ? safest(b, u, moveCells, enemies) : approach(b, u, moveCells, enemies, guard ? { x: startX, z: startZ } : null);
    if (target) return { move: [target.x, target.z], facing: faceNearest(target.x, target.z), score: 0 };
  }
  return { facing: faceNearest(u.x, u.z), score: 0 };
}

function scoreAction(b: Battle, u: BattleUnit, a: AbilityDef, prev: TargetPreview[], support: boolean): number {
  let s = 0;
  for (const p of prev) {
    const t = b.unit(p.uid)!;
    const ally = t.team === u.team;
    const hit = p.hit / 100;
    if (p.dmg) {
      const frac = Math.min(1, p.dmg / Math.max(1, t.hp));
      let v = frac * 60 + (p.dmg >= t.hp ? 45 : 0);
      if (t.boss) v *= 1.2;
      if (t.vip) v *= 1.2;
      if (!t.alive) v = 0;
      s += (ally ? -1.4 : 1) * v * hit * (t.hp > 0 ? 1 : 0);
    }
    if (p.heal) {
      if (t.has('ko')) {
        // raising the leader (whose fall loses the day) or a ward comes first
        let v = 70;
        if (ally && (t.vip || (t.team === 0 && t.sid === b.heroSid))) v = 170;
        else if (ally && t.koCount <= 1) v = 95;
        s += (ally ? 1 : -1) * v * hit;
      }
      else {
        const missing = t.maxHp - t.hp;
        const eff = Math.min(missing, p.heal) / t.maxHp;
        s += (ally ? 1 : -1.2) * eff * (t.critical ? 90 : 55) * hit * (support ? 1.3 : 1);
      }
    }
    if (p.ko && !p.dmg) s += (ally ? -1.5 : 1) * 95 * hit;
    if (p.mp) s += (ally ? -0.5 : 0.5) * Math.min(1, p.mp / Math.max(1, t.maxMp)) * 25 * hit * (t.maxMp > 20 ? 1 : 0.2);
    if (p.status) {
      for (const e of a.effects ?? []) {
        if (e.type !== 'status' || !e.add?.length) continue;
        // "one of these" lists land a single status: average their value
        const div = e.all || e.add.length <= 1 ? 1 : e.add.length;
        for (const st of e.add) {
          if (t.has(st) || t.immune.has(st)) continue;
          const bad = STATUS[st].bad;
          const v = (bad ? BAD_VALUE[st] ?? 15 : GOOD_VALUE[st] ?? 10) / div;
          if (bad) s += (ally ? -1.2 : 1) * v * hit * (t.alive ? 1 : 0);
          else s += (ally ? 1 : -1) * v * hit * (support ? 1.2 : 0.8);
        }
      }
      for (const st of (a.effects ?? []).flatMap((e) => (e.type === 'status' ? e.remove ?? [] : []))) {
        if (!t.has(st)) continue;
        const bad = STATUS[st].bad;
        const v = (bad ? BAD_VALUE[st] : GOOD_VALUE[st]) ?? 10;
        s += (bad === ally ? 1 : -1) * v * hit * 0.8;
      }
      for (const e of a.effects ?? []) {
        if (e.type === 'stat') {
          // self/ally buffs have diminishing returns; debuffs on foes are worth more
          const stacked = e.stat === 'pa' || e.stat === 'ma' || e.stat === 'speed' ? Math.abs(t.buff[e.stat]) : 0;
          const base = e.stat === 'brave' || e.stat === 'faith' ? 0.5 : 3;
          const v = Math.min(14, Math.abs(e.amount) * base) / (1 + stacked);
          s += (ally === e.amount > 0 ? 1 : -1) * v * hit;
        }
        if (e.type === 'breakEquip') { const slot = b.shieldSlot(t, e.slot); if (t.roster.equip[slot] && !t.hasSupport('maintenance')) s += (ally ? -1 : 1) * 18 * hit; }
        if (e.type === 'steal') {
          const has = e.slot === 'gil' || e.slot === 'exp' ? !t.isMonster : e.slot === 'any' ? Object.keys(t.roster.equip).length > 0 : !!t.roster.equip[b.shieldSlot(t, e.slot)];
          if (has && !t.hasSupport('maintenance')) s += (ally ? -1 : 1) * 14 * hit;
        }
        if (e.type === 'invite' && t.recruitable) s += (ally ? 0 : 30) * hit;
        if (e.type === 'ct' && e.set !== undefined) s += (ally === e.set > 50 ? 1 : -1) * 25 * hit;
      }
    }
  }
  return s;
}

function approach(b: Battle, u: BattleUnit, cells: Cell[], enemies: BattleUnit[], anchor: { x: number; z: number } | null): Cell | null {
  if (!enemies.length) return null;
  // BFS distance field from enemies across walkable tiles (jump-limited)
  const dist = new Map<number, number>();
  const q: Array<[number, number]> = [];
  for (const e of enemies) { const i = b.grid.idx(e.x, e.z); dist.set(i, 0); q.push([e.x, e.z]); }
  while (q.length) {
    const [x, z] = q.shift()!;
    const c = b.grid.cell(x, z)!;
    const d = dist.get(b.grid.idx(x, z))!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = b.grid.cell(x + dx, z + dz);
      if (!n || !n.standable) continue;
      if (Math.abs(n.h - c.h) > u.jump && !u.job.flying) continue;
      const ni = b.grid.idx(n.x, n.z);
      if (dist.has(ni)) continue;
      dist.set(ni, d + 1);
      q.push([n.x, n.z]);
    }
  }
  let best: Cell | null = null, bd = 1e9;
  const rangeWant = rangedPreference(b, u);
  for (const c of cells) {
    let d = dist.get(b.grid.idx(c.x, c.z)) ?? 50 + Math.min(...enemies.map((e) => manhattan(e, c)));
    let score = Math.abs(d - rangeWant);
    if (anchor) score += manhattan(c, anchor) * 0.5;
    if (score < bd || (score === bd && c.h > (best?.h ?? -1))) { bd = score; best = c; }
  }
  return best;
}

function rangedPreference(b: Battle, u: BattleUnit) {
  const w = u.weapon?.cat;
  if (w === 'bow' || w === 'crossbow' || w === 'gun') return 3;
  if (u.ai === 'support') return 4;
  if (u.job.id === 'wizard' || u.job.id === 'priest' || u.job.id === 'timeMage' || u.job.id === 'summoner') return 3;
  return 1;
}

function safest(b: Battle, u: BattleUnit, cells: Cell[], enemies: BattleUnit[]): Cell | null {
  let best: Cell | null = null, bs = -1e9;
  for (const c of cells) {
    let s = 0;
    for (const e of enemies) s += Math.min(8, manhattan(c, e));
    // stay near allies
    for (const a of b.units) if (a.team === u.team && a !== u && a.alive) s -= Math.max(0, manhattan(c, a) - 3) * 0.5;
    s += c.h * 0.3;
    if (s > bs) { bs = s; best = c; }
  }
  return best;
}

function flee(b: Battle, u: BattleUnit, enemies: BattleUnit[], face: (x: number, z: number) => Facing): AiPlan {
  const cells = !u.moved && u.canMove ? b.moveRange(u) : [b.cellOf(u)];
  const t = safest(b, u, cells, enemies);
  return { move: t && (t.x !== u.x || t.z !== u.z) ? [t.x, t.z] : undefined, facing: t ? face(t.x, t.z) : u.facing, score: 0 };
}
