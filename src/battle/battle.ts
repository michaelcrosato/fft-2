// ============================================================================
//  Battle engine — headless, deterministic (seeded). The presentation layer
//  drives it through advance() / doMove() / doAction() / endTurn() and
//  animates the returned event lists.
// ============================================================================
import type {
  AbilityDef, BattleDef, EffectSpec, Element, EquipSlot, Facing, FormulaCtx, ItemDef, StatusId, Weather,
} from '../data/types';
import { ABILITIES, ITEMS, job as getJob } from '../data/db';
import { Rng } from '../core/rng';
import { DIRS, FACINGS, MapGrid, type Cell } from './grid';
import { BattleUnit } from './unit';
import { STATUS, BAD_CURABLE } from './status';
import { COMPAT_MULT, compatibility } from './zodiac';
import { weaponDamage, clampPct } from './formulas';
import { growRaw, jobLevel, MAX_LEVEL } from './stats';
import { addJp } from '../game/roster';
import { SPECIALS } from './specials';

// ---------------------------------------------------------------------------
//  Events
// ---------------------------------------------------------------------------
export interface HitInfo {
  uid: number;
  miss?: boolean;
  guard?: string;             // reaction name that blocked it
  dmg?: number;               // hp damage (negative = healed by absorb)
  heal?: number;
  mpDmg?: number;
  mpHeal?: number;
  crit?: boolean;
  add?: StatusId[];
  remove?: StatusId[];
  ko?: boolean;
  revive?: boolean;
  text?: string[];
  element?: Element;
  stolen?: string;
  broke?: string;
  knock?: [number, number];
}

export type BEvent =
  | { t: 'turn'; uid: number }
  | { t: 'move'; uid: number; path: Array<[number, number]>; teleport?: boolean }
  | { t: 'face'; uid: number; dir: Facing }
  | { t: 'act'; uid: number; ability: string; name: string; x: number; z: number; targets: number[]; anim?: string; vfx?: string; item?: string; mimic?: boolean }
  | { t: 'charge'; uid: number; ability: string; name: string; x: number; z: number; ct: number }
  | { t: 'chargeBreak'; uid: number }
  | { t: 'hits'; src: number; ability: string; hits: HitInfo[]; vfx?: string; color?: string; x: number; z: number }
  | { t: 'reaction'; uid: number; name: string }
  | { t: 'status'; uid: number; add?: StatusId[]; remove?: StatusId[] }
  | { t: 'hp'; uid: number; delta: number; reason?: string }
  | { t: 'mp'; uid: number; delta: number }
  | { t: 'ko'; uid: number }
  | { t: 'revive'; uid: number }
  | { t: 'koCount'; uid: number; n: number }
  | { t: 'crystal'; uid: number; kind: 'crystal' | 'chest' }
  | { t: 'pickup'; uid: number; kind: 'crystal' | 'chest' | 'find'; item?: string; learned?: string[]; x: number; z: number }
  | { t: 'text'; uid: number; text: string; color?: string }
  | { t: 'jumpUp'; uid: number }
  | { t: 'jumpDown'; uid: number; x: number; z: number }
  | { t: 'levelUp'; uid: number; level: number }
  | { t: 'teamChange'; uid: number; team: number }
  | { t: 'reveal'; uid: number }
  | { t: 'leave'; uid: number }
  | { t: 'script'; index: number }
  | { t: 'end'; result: 'victory' | 'defeat' };

export interface ActionOpts {
  /** item id for Item/Throw/Iaido skills */
  item?: string;
  /** Arithmancer composite */
  calc?: { attr: string; div: string; spell: string };
  /** internal: reaction/mimic depth */
  depth?: number;
  mimic?: boolean;
  noMp?: boolean;
}

export interface TargetPreview {
  uid: number;
  hit: number;
  dmg?: number;
  heal?: number;
  mp?: number;
  status?: string;
  ko?: boolean;
}

export interface BattleOptions {
  def: BattleDef;
  grid: MapGrid;
  units: BattleUnit[];
  inventory: Map<string, number>;
  seed?: number;
  /** gentle mode: fallen player units never crystallize */
  gentle?: boolean;
  weather?: Weather;
  gil?: { value: number };
}

export class Battle {
  readonly def: BattleDef;
  readonly grid: MapGrid;
  readonly units: BattleUnit[];
  readonly rng: Rng;
  readonly inventory: Map<string, number>;
  readonly gentle: boolean;
  weather: Weather;
  gil: { value: number };

  tick = 0;
  /** number of turns taken by the hero (story "rounds") */
  heroTurns = 0;
  active: BattleUnit | null = null;
  result: 'victory' | 'defeat' | null = null;
  /** gil and items gained during battle (steals, chests, moves) */
  loot: string[] = [];
  lootGil = 0;
  /** units invited (join after battle) */
  invited: BattleUnit[] = [];
  /** poached monsters → fur shop items */
  poached: string[] = [];
  /** crystals / chests on tiles */
  pickups = new Map<number, { kind: 'crystal' | 'chest'; unit: BattleUnit; item?: string }>();
  moveFind = new Map<number, [string, string]>();
  firedEvents = new Set<number>();
  /** the last action performed by the player side (for Mimic) */
  private pendingResolve: BattleUnit[] = [];
  private pendingTurns: BattleUnit[] = [];
  events: BEvent[] = [];
  heroSid: string | null = null;
  /** set by scripts: forced end */
  forced: 'victory' | 'defeat' | null = null;

  constructor(o: BattleOptions) {
    this.def = o.def;
    this.grid = o.grid;
    this.units = o.units;
    this.rng = new Rng(o.seed);
    this.inventory = o.inventory;
    this.gentle = !!o.gentle;
    this.weather = o.weather ?? o.def.weather ?? o.grid.def.weather ?? 'none';
    this.gil = o.gil ?? { value: 0 };
    for (const t of o.def.treasure ?? []) this.moveFind.set(this.grid.idx(t[0], t[1]), [t[2], t[3]]);
    for (const u of this.units) {
      u.ct = this.rng.int(0, 30) + u.speed * 2;
      this.updateCritical(u);
    }
  }

  // ------------------------------------------------------------------------
  //  Queries
  // ------------------------------------------------------------------------
  unit(uid: number) { return this.units.find((u) => u.uid === uid); }
  bySid(sid: string) { return this.units.find((u) => u.sid === sid); }
  get hero() { return this.heroSid ? this.bySid(this.heroSid) : undefined; }
  unitAt(x: number, z: number, includeDown = true): BattleUnit | undefined {
    return this.units.find((u) => !u.gone && !u.hidden && !u.jumping && u.x === x && u.z === z && (includeDown || u.alive) && !u.has('crystal') && !u.has('treasure'));
  }
  enemiesOf(u: BattleUnit) { return this.units.filter((o) => o.team !== u.team && !o.gone && !o.hidden); }
  alliesOf(u: BattleUnit) { return this.units.filter((o) => o.team === u.team && !o.gone && !o.hidden); }
  isAlly(a: BattleUnit, b: BattleUnit) { return a.team === b.team; }
  cellOf(u: BattleUnit) { return this.grid.cell(u.x, u.z)!; }
  heightOf(u: BattleUnit) {
    const c = this.cellOf(u);
    return c.h + (u.has('float') && c.depth > 0 ? c.depth : 0);
  }

  // ------------------------------------------------------------------------
  //  Clock
  // ------------------------------------------------------------------------
  /**
   * Advance the clock until something happens: a charged action resolves, a
   * unit's turn begins, or KO counters tick. Returns the events and, if a turn
   * began, the active unit.
   */
  advance(): { events: BEvent[]; unit: BattleUnit | null } {
    this.events = [];
    for (let guard = 0; guard < 20000; guard++) {
      if (this.result) return { events: this.flush(), unit: null };
      if (this.pendingResolve.length) {
        const u = this.pendingResolve.shift()!;
        if (u.jumping && u.alive) { this.resolveJump(u); this.checkEnd(); return { events: this.flush(), unit: null }; }
        if (u.charging && u.alive) {
          const ch = u.charging;
          u.charging = null; u.statuses.delete('charging');
          if (u.performing && ch.ability.perform) {
            // performances repeat until the performer acts again
            this.resolveAbility(u, ch.ability, ch.x, ch.z, { item: ch.item });
            u.charging = { ...ch, ctLeft: this.chargeTicks(u, ch.ability) };
          } else {
            let tx = ch.x, tz = ch.z;
            if (ch.targetUid) {
              const t = this.unit(ch.targetUid);
              if (t && !t.gone) { tx = t.x; tz = t.z; }
            }
            this.resolveAbility(u, ch.ability, tx, tz, { item: ch.item, calc: undefined });
          }
          this.checkEnd();
          const ev = this.flush();
          if (ev.length) return { events: ev, unit: null };
        }
        continue;
      }
      if (this.pendingTurns.length) {
        const u = this.pendingTurns.shift()!;
        if (u.ct < 100 || u.gone || u.has('crystal') || u.has('treasure')) continue;
        if (u.has('ko')) {
          this.koTurn(u);
          this.checkEnd();
          const ev = this.flush();
          if (ev.length) return { events: ev, unit: null };
          continue;
        }
        if (!u.canTakeTurn) continue;
        const ok = this.startTurn(u);
        this.checkEnd();
        if (ok && !this.result) return { events: this.flush(), unit: u };
        const ev = this.flush();
        if (ev.length) return { events: ev, unit: null };
        continue;
      }
      // ---- a new clocktick ----
      this.tick++;
      this.statusTick();
      for (const u of this.units) {
        if (u.gone || !u.alive) continue;
        if (u.has('stop') || u.has('petrify')) continue;
        if (u.charging) { if (--u.charging.ctLeft <= 0) this.pendingResolve.push(u); }
        else if (u.jumping) { if (--u.jumping.ctLeft <= 0) this.pendingResolve.push(u); }
      }
      for (const u of this.units) {
        if (u.gone || u.hidden || u.has('crystal') || u.has('treasure')) continue;
        if (u.has('ko')) { u.ct += 10; continue; }        // KO counter still advances on a fixed cadence
        if (u.has('stop') || u.has('petrify') || u.charging || u.jumping) continue;
        u.ct += u.speed;
      }
      this.pendingTurns = this.units
        .filter((u) => u.ct >= 100 && !u.gone && !u.hidden)
        .sort((a, b) => b.ct - a.ct || a.uid - b.uid);
      const ev = this.flush();
      if (ev.length) return { events: ev, unit: null };
    }
    throw new Error('Battle clock stalled');
  }

  private flush() { const e = this.events; this.events = []; return e; }
  emit(e: BEvent) { this.events.push(e); }

  private statusTick() {
    for (const u of this.units) {
      if (u.gone || !u.alive) continue;
      if (u.has('stop') && u.statuses.get('stop')! > 0) {
        // stop only counts down itself
        const t = u.statuses.get('stop')! - 1;
        if (t <= 0) { u.statuses.delete('stop'); this.emit({ t: 'status', uid: u.uid, remove: ['stop'] }); }
        else u.statuses.set('stop', t);
        continue;
      }
      const expired: StatusId[] = [];
      for (const [s, t] of u.statuses) {
        if (t <= 0 || u.always.has(s)) continue;
        const n = t - 1;
        if (n <= 0) expired.push(s); else u.statuses.set(s, n);
      }
      for (const s of expired) u.statuses.delete(s);
      if (expired.length) this.emit({ t: 'status', uid: u.uid, remove: expired });
    }
  }

  private koTurn(u: BattleUnit) {
    u.ct = 0;
    if (u.has('reraise')) {
      u.statuses.delete('reraise');
      this.revive(u, 0.1);
      return;
    }
    u.koCount--;
    this.emit({ t: 'koCount', uid: u.uid, n: u.koCount });
    if (u.koCount <= 0) {
      if (u.has('undead') && this.rng.pct(50)) { this.revive(u, 1); this.emit({ t: 'text', uid: u.uid, text: 'Rises again!', color: '#9f9' }); return; }
      if (u.team === 0 && (this.gentle || u.vip || u.sid === this.heroSid)) {
        // gentle mode / story guests: retreat instead of crystallizing
        if (u.sid === this.heroSid || u.vip) return; // handled by defeat check
        u.gone = true; this.emit({ t: 'leave', uid: u.uid });
        return;
      }
      const kind: 'crystal' | 'chest' = u.noLoot ? 'crystal' : this.rng.pct(50) ? 'crystal' : 'chest';
      u.statuses.set(kind === 'crystal' ? 'crystal' : 'treasure', 0);
      u.statuses.delete('ko');
      if (!u.noLoot) {
        const item = kind === 'chest' ? this.chestItem(u) : undefined;
        this.pickups.set(this.grid.idx(u.x, u.z), { kind, unit: u, item });
      }
      this.emit({ t: 'crystal', uid: u.uid, kind });
    }
  }

  private chestItem(u: BattleUnit): string {
    const pool = u.equipItems.filter((i) => i.price > 0).map((i) => i.id);
    if (pool.length && this.rng.pct(60)) return this.rng.pick(pool);
    const consum = ['potion', 'hiPotion', 'ether', 'phoenixDown', 'antidote', 'eyeDrop', 'remedy'].filter((i) => ITEMS.has(i));
    return consum.length ? this.rng.pick(consum) : 'potion';
  }

  private startTurn(u: BattleUnit): boolean {
    this.active = u;
    u.moved = false; u.acted = false;
    if (u.has('defending')) { u.statuses.delete('defending'); this.emit({ t: 'status', uid: u.uid, remove: ['defending'] }); }
    if (u.sid === this.heroSid) this.heroTurns++;
    this.emit({ t: 'turn', uid: u.uid });
    if (u.has('doom')) {
      u.doomCount--;
      this.emit({ t: 'text', uid: u.uid, text: `Doom ${Math.max(0, u.doomCount)}`, color: '#c4f' });
      if (u.doomCount <= 0) { u.statuses.delete('doom'); this.knockOut(u); u.ct = 0; this.active = null; return false; }
    }
    if (u.has('invisible') && false) u.statuses.delete('invisible');
    // performing units keep performing only if they wait; the UI/AI decides
    this.fireEvents();
    return true;
  }

  /** Predict the next n turns (AT list). Pure simulation on copies of ct values. */
  turnOrder(n = 12): Array<{ uid: number; kind: 'turn' | 'charge' }> {
    const ct = new Map<number, number>();
    const ch = new Map<number, number>();
    for (const u of this.units) {
      ct.set(u.uid, u.ct);
      if (u.charging) ch.set(u.uid, u.charging.ctLeft);
      else if (u.jumping) ch.set(u.uid, u.jumping.ctLeft);
    }
    const out: Array<{ uid: number; kind: 'turn' | 'charge' }> = [];
    if (this.active) out.push({ uid: this.active.uid, kind: 'turn' });
    for (let t = 0; t < 400 && out.length < n; t++) {
      for (const [uid, left] of ch) {
        const nl = left - 1;
        if (nl <= 0) { out.push({ uid, kind: 'charge' }); ch.delete(uid); } else ch.set(uid, nl);
      }
      const ready: BattleUnit[] = [];
      for (const u of this.units) {
        if (!u.canTakeTurn || u.gone || u.hidden) continue;
        if (ch.has(u.uid)) continue;
        if (u === this.active && t === 0) { ct.set(u.uid, 0); }
        const v = ct.get(u.uid)! + u.speed;
        ct.set(u.uid, v);
        if (v >= 100) ready.push(u);
      }
      ready.sort((a, b) => ct.get(b.uid)! - ct.get(a.uid)! || a.uid - b.uid);
      for (const u of ready) { out.push({ uid: u.uid, kind: 'turn' }); ct.set(u.uid, Math.min(60, ct.get(u.uid)! - 100)); }
    }
    return out.slice(0, n);
  }

  // ------------------------------------------------------------------------
  //  Movement
  // ------------------------------------------------------------------------
  moveParams(u: BattleUnit) {
    return {
      move: u.move,
      jump: u.jump,
      fly: u.hasMovement('fly') || !!u.job.flying,
      ignoreHeight: u.hasMovement('ignoreHeight'),
      float: u.has('float') || u.hasMovement('float'),
      waterWalk: u.hasMovement('waterWalk'),
      swim: u.hasMovement('swim') || u.hasMovement('moveInWater') || u.hasMovement('anyGround'),
      lavaWalk: u.hasMovement('lavaWalk'),
      occupant: (x: number, z: number): 0 | 1 | 2 => {
        const o = this.unitAt(x, z);
        if (!o || o === u) return 0;
        if (!o.alive) return 1;             // KO'd bodies can't be stood on but don't block
        return this.isAlly(o, u) ? 1 : 2;
      },
    };
  }

  moveRange(u: BattleUnit): Cell[] {
    if (!u.canMove) return [this.cellOf(u)];
    if (u.hasMovement('teleport')) {
      const out: Cell[] = [];
      for (const c of this.grid.diamond(u.x, u.z, u.move + 3)) if (c.standable && (!this.unitAt(c.x, c.z) || (c.x === u.x && c.z === u.z))) out.push(c);
      return out;
    }
    const r = this.grid.moveRange(u.x, u.z, this.moveParams(u));
    return [...r.values()].map((n) => this.grid.cell(n.x, n.z)!);
  }

  pathFor(u: BattleUnit, x: number, z: number): Array<[number, number]> {
    const p = this.moveParams(u);
    const all = this.grid.moveRange(u.x, u.z, { ...p, occupant: (xx, zz) => (p.occupant(xx, zz) === 2 ? 2 : 0) });
    const path = this.grid.pathTo(all, x, z);
    return path.length ? path : [[u.x, u.z], [x, z]];
  }

  doMove(u: BattleUnit, x: number, z: number): BEvent[] {
    this.events = [];
    if (u.moved) return [];
    const target = this.grid.cell(x, z);
    if (!target || !target.standable) return [];
    if (u.performing) this.stopPerforming(u);
    const inRange = this.moveRange(u).some((c) => c.x === x && c.z === z);
    if (!inRange) return [];
    if (u.hasMovement('teleport')) {
      const d = Math.abs(u.x - x) + Math.abs(u.z - z);
      const chance = d <= u.move ? 100 : 100 - (d - u.move) * 25;
      u.moved = true;
      if (!this.rng.pct(chance)) { this.emit({ t: 'text', uid: u.uid, text: 'Teleport failed', color: '#aaf' }); return this.flush(); }
      this.emit({ t: 'move', uid: u.uid, path: [[u.x, u.z], [x, z]], teleport: true });
      this.placeUnit(u, x, z);
    } else {
      const path = this.pathFor(u, x, z);
      this.emit({ t: 'move', uid: u.uid, path });
      if (path.length >= 2) {
        const [px, pz] = path[path.length - 2];
        u.facing = MapGrid.faceToward(px, pz, x, z, u.facing);
      }
      const tiles = Math.max(0, path.length - 1);
      this.placeUnit(u, x, z);
      u.moved = true;
      if (tiles > 0) {
        if (u.hasMovement('moveHpUp')) this.heal(u, Math.max(1, Math.floor(u.maxHp / 10)), 'Move-HP Up');
        if (u.hasMovement('moveMpUp')) this.healMp(u, Math.max(1, Math.floor(u.maxMp / 10)));
        if (u.hasMovement('moveGetExp')) this.gainExp(u, tiles);
        if (u.hasMovement('moveGetJp')) this.gainJp(u, tiles, false);
      }
    }
    u.moved = true;
    this.fireEvents();
    this.checkEnd();
    return this.flush();
  }

  private placeUnit(u: BattleUnit, x: number, z: number) {
    u.x = x; u.z = z;
    const idx = this.grid.idx(x, z);
    // pickups: crystals/chests (player side only picks up)
    const pk = this.pickups.get(idx);
    if (pk && u.alive) {
      this.pickups.delete(idx);
      pk.unit.gone = true;
      if (pk.kind === 'crystal') {
        const learned: string[] = [];
        if (!u.isMonster) {
          for (const a of pk.unit.roster.learned) {
            const d = ABILITIES.get(a);
            if (!d || u.knows(a)) continue;
            if (d.kind === 'action' && getJob(pk.unit.roster.job).unique) continue;
            if (getJob(pk.unit.roster.job).monster) continue;
            u.roster.learned.push(a); u.crystalLearned.push(a); learned.push(a);
          }
        }
        if (!learned.length) { this.heal(u, u.maxHp, 'Crystal'); this.healMp(u, u.maxMp); }
        this.emit({ t: 'pickup', uid: u.uid, kind: 'crystal', learned, x, z });
      } else {
        const it = pk.item ?? 'potion';
        if (u.team === 0) { this.loot.push(it); this.addItem(it, 1); }
        this.emit({ t: 'pickup', uid: u.uid, kind: 'chest', item: it, x, z });
      }
    }
    const mf = this.moveFind.get(idx);
    if (mf && u.team === 0 && u.hasMovement('moveFind')) {
      this.moveFind.delete(idx);
      const it = this.rng.pct(u.brave) ? mf[0] : mf[1];
      if (ITEMS.has(it)) { this.loot.push(it); this.addItem(it, 1); this.emit({ t: 'pickup', uid: u.uid, kind: 'find', item: it, x, z }); }
    }
  }

  addItem(id: string, n: number) { this.inventory.set(id, (this.inventory.get(id) ?? 0) + n); }
  takeItem(id: string): boolean {
    const n = this.inventory.get(id) ?? 0;
    if (n <= 0) return false;
    if (n === 1) this.inventory.delete(id); else this.inventory.set(id, n - 1);
    return true;
  }

  // ------------------------------------------------------------------------
  //  Ability lists & targeting
  // ------------------------------------------------------------------------
  /** Command groups for the unit's action menu */
  commandGroups(u: BattleUnit): Array<{ id: string; name: string; abilities: AbilityDef[] }> {
    const out: Array<{ id: string; name: string; abilities: AbilityDef[] }> = [];
    const attack = ABILITIES.get('attack');
    if (attack) out.push({ id: 'attack', name: 'Attack', abilities: [attack] });
    if (u.isMonster) {
      const acts = u.monsterActions().filter((a) => a.id !== 'attack');
      out.push({ id: 'monster', name: u.job.skillset.name, abilities: acts });
      return out;
    }
    const prim = u.job;
    out.push({ id: prim.id, name: prim.skillset.name, abilities: u.skillsetActions(prim.id) });
    const sec = u.roster.secondary;
    if (sec && sec !== prim.id) {
      const sj = getJob(sec);
      const acts = u.skillsetActions(sec);
      if (acts.length) out.push({ id: sj.id, name: sj.skillset.name, abilities: acts });
    }
    if (u.hasSupport('defend')) { const d = ABILITIES.get('defendCmd'); if (d) out.push({ id: 'defend', name: 'Defend', abilities: [d] }); }
    return out;
  }

  /** Why an ability can't be used right now (undefined = usable) */
  unusableReason(u: BattleUnit, a: AbilityDef): string | undefined {
    const mp = this.mpCost(u, a);
    if (mp > u.mp) return 'Not enough MP';
    if (a.magic && u.has('silence')) return 'Silenced';
    if (u.has('frog') && a.id !== 'attack' && a.id !== 'frogSpell') return 'Toads can only croak';
    if (a.requires?.weapon && !a.requires.weapon.includes(u.weaponType())) return 'Needs ' + a.requires.weapon.join('/');
    if (a.requires?.notWeapon && a.requires.notWeapon.includes(u.weaponType())) return 'Wrong weapon';
    if (a.consumes && !(this.inventory.get(a.consumes) ?? 0)) return 'None in stock';
    if (a.requires?.item && !(this.inventory.get(a.requires.item) ?? 0)) return 'None in stock';
    const sp = a.special ? SPECIALS[a.special] : undefined;
    if (sp?.usable) { const r = sp.usable(this, u, a); if (r) return r; }
    const c = this.cellOf(u);
    if (c.terrain === 'W' && !u.hasMovement('swim') && !u.hasMovement('moveInWater') && !u.has('float') && a.id !== 'attack') return 'In deep water';
    return undefined;
  }

  mpCost(u: BattleUnit, a: AbilityDef) {
    let mp = a.mp ?? 0;
    if (u.hasSupport('halfMp')) mp = Math.ceil(mp / 2);
    return mp;
  }

  chargeTicks(u: BattleUnit, a: AbilityDef) {
    let ct = a.ct ?? 0;
    if (a.id === 'jump' || a.special === 'jump') return Math.max(1, Math.floor(50 / u.speed));
    if (u.hasSupport('nonCharge') && !a.perform) return 0;
    if (u.hasSupport('shortCharge')) ct = Math.floor(ct / 2);
    return ct;
  }

  abilityRange(u: BattleUnit, a: AbilityDef): { r: number; min: number; v: number; line: boolean } {
    const sp = a.special ? SPECIALS[a.special] : undefined;
    if (sp?.range) return sp.range(this, u, a);
    if (a.range === 'weapon') {
      const w = u.weapon;
      const cat = w?.cat;
      const r = w?.range ?? 1;
      if (cat === 'spear') return { r: 2, min: 1, v: 3, line: true };
      if (cat === 'bow' || cat === 'crossbow' || cat === 'gun' || cat === 'magicGun') return { r, min: cat === 'bow' ? 3 : 1, v: 99, line: false };
      if (cat === 'instrument' || cat === 'book' || cat === 'pole') return { r: Math.max(1, r), min: 1, v: 3, line: r > 1 };
      return { r: Math.max(1, r), min: 1, v: 3, line: false };
    }
    let r = a.range ?? 1;
    if (a.consumes && ITEMS.get(a.consumes)?.kind === 'consumable') r = u.hasSupport('throwItem') || u.job.id === 'chemist' ? 4 : 1;
    const v = a.rangeV ?? (a.magic ? 99 : r <= 1 ? 3 : 99);
    return { r, min: a.rangeMin ?? 0, v, line: a.shape === 'line' && (a.aoe ?? 1) <= 1 };
  }

  /** Cells the ability's center may be placed on */
  targetCells(u: BattleUnit, a: AbilityDef, fromX = u.x, fromZ = u.z): Cell[] {
    const rr = this.abilityRange(u, a);
    const shape = a.shape ?? 'diamond';
    if (shape === 'self' || rr.r === 0) return [this.grid.cell(fromX, fromZ)!];
    if (shape === 'all' || shape === 'allAllies' || shape === 'allEnemies') return [this.grid.cell(fromX, fromZ)!];
    let r = rr.r;
    const fh = this.grid.cell(fromX, fromZ)!.h;
    let cells: Cell[];
    if (rr.line) cells = this.grid.lines(fromX, fromZ, r, Math.max(1, rr.min));
    else if (shape === 'line') {
      // directional lines: choose one of the 4 adjacent cells as the "direction"
      cells = FACINGS.map((f) => this.grid.cell(fromX + DIRS[f][0], fromZ + DIRS[f][1])).filter((c): c is Cell => !!c && !c.hole);
      return cells;
    } else {
      // bows: +1 range per 2h above target
      if (a.range === 'weapon' && u.weapon?.cat === 'bow') r += 2;
      cells = this.grid.diamond(fromX, fromZ, r, rr.min);
    }
    const out: Cell[] = [];
    const spc = a.special ? SPECIALS[a.special] : undefined;
    if (spc?.targetFilter) cells = cells.filter((c) => spc.targetFilter!(this, u, a, c));
    const isBow = a.range === 'weapon' && u.weapon?.cat === 'bow';
    const straight = a.range === 'weapon' && (u.weapon?.cat === 'gun' || u.weapon?.cat === 'crossbow');
    for (const c of cells) {
      const dh = c.h - fh;
      if (Math.abs(dh) > rr.v) continue;
      if (isBow) {
        const d = Math.abs(c.x - fromX) + Math.abs(c.z - fromZ);
        const bonus = Math.max(0, Math.floor(-dh / 2));
        if (d > rr.r + bonus) continue;
      }
      if (straight && !this.grid.lineOfFire(fromX, fromZ, fh, c.x, c.z, c.h)) continue;
      out.push(c);
    }
    return out;
  }

  /** Cells affected when the ability is centred on (x,z) */
  aoeCells(u: BattleUnit, a: AbilityDef, x: number, z: number): Cell[] {
    const shape = a.shape ?? 'diamond';
    const center = this.grid.cell(x, z);
    if (!center) return [];
    if (shape === 'all' || shape === 'allAllies' || shape === 'allEnemies') {
      return this.units.filter((o) => !o.gone && !o.hidden && !o.jumping).map((o) => this.cellOf(o));
    }
    if (shape === 'line') {
      const dx = Math.sign(x - u.x), dz = Math.sign(z - u.z);
      const len = a.aoe ?? 8;
      const out: Cell[] = [];
      for (let k = 1; k <= len; k++) {
        const c = this.grid.cell(u.x + dx * k, u.z + dz * k);
        if (!c) break;
        if (!c.hole) out.push(c);
      }
      return out;
    }
    const size = a.aoe ?? 1;
    if (size <= 1) return [center];
    const v = a.aoeV ?? 3;
    const cells = this.grid.diamond(x, z, size - 1);
    const sp = a.special ? SPECIALS[a.special] : undefined;
    const excludeSelf = shape === 'ring';
    return cells.filter((c) => Math.abs(c.h - center.h) <= v && !(excludeSelf && c.x === u.x && c.z === u.z) && (!sp?.aoeFilter || sp.aoeFilter(this, u, a, c)));
  }

  /** Units affected when centred on (x,z) */
  affectedUnits(u: BattleUnit, a: AbilityDef, x: number, z: number, opts: ActionOpts = {}): BattleUnit[] {
    if (opts.calc) return this.calcTargets(u, opts.calc);
    const cells = this.aoeCells(u, a, x, z);
    const set = new Set(cells.map((c) => this.grid.idx(c.x, c.z)));
    let targets = this.units.filter((o) => !o.gone && !o.hidden && !o.jumping && !o.has('crystal') && !o.has('treasure') && set.has(this.grid.idx(o.x, o.z)));
    const shape = a.shape ?? 'diamond';
    if (shape === 'allAllies' || a.alliesOnly) targets = targets.filter((o) => this.isAlly(o, u));
    if (shape === 'allEnemies' || a.enemiesOnly) targets = targets.filter((o) => !this.isAlly(o, u));
    if (a.target === 'ko') targets = targets.filter((o) => o.has('ko'));
    else if (a.target !== 'any' && !this.affectsKo(a)) targets = targets.filter((o) => o.alive);
    if (a.target === 'self') targets = targets.filter((o) => o === u);
    return targets;
  }

  private affectsKo(a: AbilityDef) {
    return (a.effects ?? []).some((e) => e.type === 'revive') || a.target === 'ko';
  }

  calcTargets(u: BattleUnit, calc: { attr: string; div: string; spell: string }): BattleUnit[] {
    const val = (o: BattleUnit) => {
      switch (calc.attr) {
        case 'ct': return Math.floor(o.ct);
        case 'level': return o.level;
        case 'exp': return o.roster.exp;
        case 'height': return Math.floor(this.heightOf(o));
        default: return 0;
      }
    };
    const isPrime = (n: number) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
    const test = (n: number) => {
      switch (calc.div) {
        case 'prime': return isPrime(n);
        case '5': return n % 5 === 0;
        case '4': return n % 4 === 0;
        case '3': return n % 3 === 0;
        default: return false;
      }
    };
    return this.units.filter((o) => !o.gone && !o.hidden && o.alive && !o.jumping && test(val(o)));
  }

  // ------------------------------------------------------------------------
  //  Actions
  // ------------------------------------------------------------------------
  doAction(u: BattleUnit, a: AbilityDef, x: number, z: number, opts: ActionOpts = {}): BEvent[] {
    this.events = [];
    if (u.acted && !opts.mimic) return [];
    if (u.performing) this.stopPerforming(u);
    if (u.has('invisible') && !a.id.startsWith('wait')) { u.statuses.delete('invisible'); this.emit({ t: 'status', uid: u.uid, remove: ['invisible'] }); }
    const mp = opts.noMp ? 0 : this.mpCost(u, a);
    if (u.mp < mp) return [];
    const ct = opts.calc ? 0 : this.chargeTicks(u, a);
    u.acted = true;
    if (x !== u.x || z !== u.z) {
      const f = MapGrid.faceToward(u.x, u.z, x, z, u.facing);
      if (f !== u.facing) { u.facing = f; this.emit({ t: 'face', uid: u.uid, dir: f }); }
    }
    const sp = a.special ? SPECIALS[a.special] : undefined;
    if (sp?.start) {
      // specials like Jump handle their own flow
      u.mp -= mp;
      if (mp) this.emit({ t: 'mp', uid: u.uid, delta: -mp });
      sp.start(this, u, a, x, z, opts);
      this.checkEnd();
      return this.flush();
    }
    if (ct > 0) {
      u.mp -= mp;
      if (mp) this.emit({ t: 'mp', uid: u.uid, delta: -mp });
      if (a.consumes && !a.perform) this.takeItem(a.consumes);
      const tgt = this.unitAt(x, z);
      // spells aimed at a unit follow that unit only if it is a single-target spell
      const follow = (a.aoe ?? 1) <= 1 && tgt && !a.projectile ? tgt.uid : undefined;
      u.charging = { ability: a, x, z, targetUid: follow, ctLeft: ct, item: opts.item };
      u.statuses.set('charging', 0);
      if (a.perform) { u.performing = a; u.statuses.set('performing', 0); }
      this.emit({ t: 'charge', uid: u.uid, ability: a.id, name: a.name, x, z, ct });
      this.checkEnd();
      return this.flush();
    }
    u.mp -= mp;
    if (mp) this.emit({ t: 'mp', uid: u.uid, delta: -mp });
    if (a.consumes) this.takeItem(a.consumes);
    this.resolveAbility(u, a, x, z, opts);
    if (!opts.depth && !opts.mimic) this.triggerMimics(u, a, x, z, opts);
    this.fireEvents();
    this.checkEnd();
    return this.flush();
  }

  stopPerforming(u: BattleUnit) {
    u.performing = null;
    u.charging = null;
    u.statuses.delete('performing'); u.statuses.delete('charging');
    this.emit({ t: 'status', uid: u.uid, remove: ['performing'] });
  }

  /** Main resolution: compute targets, hits, effects, reactions, rewards */
  resolveAbility(u: BattleUnit, a: AbilityDef, x: number, z: number, opts: ActionOpts = {}) {
    if (!u.alive && !a.perform) return;
    const sp = a.special ? SPECIALS[a.special] : undefined;
    let targets = this.affectedUnits(u, a, x, z, opts);
    const spell = opts.calc ? ABILITIES.get(opts.calc.spell) : undefined;
    const eff = spell ?? a;
    this.emit({
      t: 'act', uid: u.uid, ability: eff.id, name: opts.calc ? `${a.name}: ${eff.name}` : eff.name, x, z,
      targets: targets.map((t) => t.uid), anim: a.anim, vfx: eff.vfx, item: opts.item, mimic: opts.mimic,
    });
    if (sp?.resolve) {
      sp.resolve(this, u, a, x, z, targets, opts);
      this.afterAction(u, a, targets);
      return;
    }
    const hits: HitInfo[] = [];
    const reactQueue: Array<() => void> = [];
    for (let t of targets) {
      // reflect
      if (eff.magic && !eff.noReflect && t.has('reflect') && t !== u) {
        this.emit({ t: 'text', uid: t.uid, text: 'Reflect', color: '#dff' });
        const bounce = this.reflectTarget(u, t);
        if (!bounce) { hits.push({ uid: t.uid, miss: true, guard: 'Reflect' }); continue; }
        t = bounce;
      }
      const h = this.hitUnit(u, t, eff, opts, reactQueue);
      hits.push(h);
    }
    this.emit({ t: 'hits', src: u.uid, ability: eff.id, hits, vfx: eff.vfx, color: eff.color, x, z });
    this.afterHits(u, hits);
    for (const r of reactQueue) r();
    this.afterAction(u, a, targets);
  }

  private reflectTarget(caster: BattleUnit, from: BattleUnit): BattleUnit | undefined {
    // bounce toward the caster's side: prefer the caster itself
    if (caster.alive && !caster.has('reflect')) return caster;
    return undefined;
  }

  /** hit chance (percent) and whether evasion applies */
  hitChance(c: BattleUnit, t: BattleUnit, a: AbilityDef, wp: number): number {
    const ctx = this.ctx(c, t, wp);
    let p = 100;
    if (a.hit) p = clampPct(a.hit(ctx) * ctx.zodiac);
    if (a.magic && a.hit) {
      const ev = t.evasion();
      p = Math.floor((p * (100 - ev.smev) * (100 - ev.amev)) / 10000);
    }
    if (a.evadable && t !== c) {
      if (c.has('invisible') || c.hasSupport('concentrate')) return clampPct(p);
      if (!this.canEvade(t)) return clampPct(p);
      const ev = t.evasion();
      const side = MapGrid.relativeSide(t, c.x, c.z);
      let cev = side === 'front' ? ev.cev : 0;
      let sev = side === 'back' ? 0 : ev.sev;
      let aev = ev.aev;
      let wev = side === 'front' && t.hasReaction('weaponGuard') ? ev.wev : 0;
      let mult = 1;
      if (t.has('defending')) mult *= 2;
      if (t.hasReaction('reflexes')) mult *= 2;
      cev *= mult; sev *= mult; aev *= mult; wev *= mult;
      let hit = p * (100 - Math.min(95, cev)) / 100 * (100 - Math.min(95, sev)) / 100 * (100 - Math.min(95, aev)) / 100 * (100 - Math.min(95, wev)) / 100;
      if (c.has('blind')) hit /= 2;
      p = hit;
    }
    return clampPct(p);
  }

  canEvade(t: BattleUnit) {
    for (const s of t.statuses.keys()) if (STATUS[s].noEvade) return false;
    return !t.has('ko');
  }

  ctx(c: BattleUnit, t: BattleUnit, wp: number): FormulaCtx {
    const comp = compatibility(c.zodiac, c.gender, t.zodiac, t.gender);
    return { c, t, wp, zodiac: c === t ? 1 : COMPAT_MULT[comp], rng: this.rng, battle: this, dh: this.heightOf(c) - this.heightOf(t) };
  }

  /** weapon power used by a skill: thrown/drawn item or equipped weapon */
  wpFor(c: BattleUnit, a: AbilityDef, opts: ActionOpts): number {
    const itemId = opts.item ?? a.consumes;
    if (itemId) { const it = ITEMS.get(itemId); if (it?.wp) return it.wp; }
    let wp = c.weapon?.wp ?? 0;
    if (c.hasSupport('twoHands') && c.weapon && (c.weapon.twoHandOk ?? true) && !c.shield && !c.weapon2) wp *= 2;
    return wp;
  }

  isPhysical(a: AbilityDef) { return !a.magic && (a.evadable || a.id === 'attack' || a.anim === 'swing' || a.anim === 'thrust' || a.anim === 'punch' || a.anim === 'kick' || a.anim === 'shoot' || a.anim === 'throw' || a.anim === 'jump'); }

  /** Apply one ability to one target. Pushes reactions into the queue. */
  hitUnit(c: BattleUnit, t: BattleUnit, a: AbilityDef, opts: ActionOpts, react: Array<() => void>): HitInfo {
    const h: HitInfo = { uid: t.uid };
    const wp = this.wpFor(c, a, opts);
    const physical = this.isPhysical(a);
    const depth = opts.depth ?? 0;
    // ---- pre-emptive reactions ----
    if (t !== c && this.canReact(t) && depth === 0 && !this.isAlly(c, t)) {
      const reactAb = t.reactionAbility();
      const rid = reactAb?.id;
      const adjacent = Math.abs(c.x - t.x) + Math.abs(c.z - t.z) <= 1;
      const byBow = a.id === 'attack' && (c.weapon?.cat === 'bow' || c.weapon?.cat === 'crossbow');
      if (rid === 'bladeGrasp' && physical && a.evadable && !byBow && this.rng.pct(t.brave)) { h.miss = true; h.guard = reactAb!.name; this.emit({ t: 'reaction', uid: t.uid, name: reactAb!.name }); return h; }
      if (rid === 'arrowGuard' && byBow && this.rng.pct(t.brave)) { h.miss = true; h.guard = reactAb!.name; this.emit({ t: 'reaction', uid: t.uid, name: reactAb!.name }); return h; }
      if (rid === 'catch' && a.anim === 'throw' && opts.item && this.rng.pct(t.brave)) {
        h.miss = true; h.guard = reactAb!.name; this.emit({ t: 'reaction', uid: t.uid, name: reactAb!.name });
        if (t.team === 0) this.addItem(opts.item, 1);
        return h;
      }
      if (rid === 'fingerGuard' && a.skillset === 'orator' && this.rng.pct(t.brave)) { h.miss = true; h.guard = reactAb!.name; this.emit({ t: 'reaction', uid: t.uid, name: reactAb!.name }); return h; }
      if (rid === 'firstStrike' && physical && adjacent && a.id === 'attack' && this.rng.pct(t.brave)) {
        this.emit({ t: 'reaction', uid: t.uid, name: reactAb!.name });
        this.counterAttack(t, c);
        h.miss = true; h.guard = reactAb!.name;
        return h;
      }
    }
    // ---- hit roll ----
    const chance = this.hitChance(c, t, a, wp);
    if (!this.rng.pct(chance)) {
      h.miss = true;
      if (a.evadable && t.shield && this.rng.pct(50)) h.guard = 'Blocked';
      else if (a.evadable) h.guard = 'Evaded';
      return h;
    }
    // ---- effects ----
    const ctx = this.ctx(c, t, wp);
    const effects: EffectSpec[] = a.effects ?? [];
    let dealtHp = 0;
    const wasAlive = t.alive;
    for (const e of effects) {
      switch (e.type) {
        case 'damage': {
          const stat = e.stat ?? 'hp';
          let base = e.formula(ctx);
          const el = e.element ?? a.element ?? (a.id === 'attack' ? c.weapon?.element : undefined);
          let dmg = this.modifyDamage(c, t, a, base, el, physical, ctx.zodiac, h);
          if (a.id === 'attack' && c.weapon2 && !opts.depth) {
            // dual wield: second strike
            const d2 = this.modifyDamage(c, t, a, weaponDamage(c, c.weapon2, this.rng), c.weapon2.element, true, ctx.zodiac, h);
            dmg += d2;
          }
          if (dmg < 0) {
            // absorbed
            if (stat === 'hp') { this.heal(t, -dmg, undefined, false); h.heal = (h.heal ?? 0) - dmg; }
            else { this.healMp(t, -dmg); h.mpHeal = -dmg; }
          } else if (stat === 'hp') {
            if (t.hasReaction('mpSwitch') && t.mp >= dmg && this.canReact(t) && this.rng.pct(t.brave)) {
              t.mp -= dmg; h.mpDmg = (h.mpDmg ?? 0) + dmg; this.emit({ t: 'reaction', uid: t.uid, name: t.reactionAbility()!.name });
            } else {
              const real = this.damage(t, dmg);
              h.dmg = (h.dmg ?? 0) + real; dealtHp += real;
              if (t.has('sleep')) { t.statuses.delete('sleep'); (h.remove ??= []).push('sleep'); }
              if (t.has('confuse') && physical) { t.statuses.delete('confuse'); (h.remove ??= []).push('confuse'); }
              if (t.has('charm') && physical) { this.unCharm(t); (h.remove ??= []).push('charm'); }
              if (e.drain) { this.heal(c, real, undefined, false); }
            }
          } else {
            const real = Math.min(t.mp, dmg);
            t.mp -= real; h.mpDmg = (h.mpDmg ?? 0) + real;
            if (e.drain) this.healMp(c, real);
          }
          if (el) h.element = el;
          break;
        }
        case 'heal': {
          const stat = e.stat ?? 'hp';
          let amt = Math.floor(e.formula(ctx) * ctx.zodiac);
          if (a.magic && c.hasSupport('magicAttackUp')) amt = Math.floor(amt * 4 / 3);
          amt = Math.min(999, Math.max(0, amt));
          if (stat === 'hp') {
            if (t.has('undead')) { const real = this.damage(t, amt); h.dmg = (h.dmg ?? 0) + real; }
            else if (t.alive) { this.heal(t, amt, undefined, false); h.heal = (h.heal ?? 0) + amt; }
          } else if (t.alive) { this.healMp(t, amt); h.mpHeal = (h.mpHeal ?? 0) + amt; }
          break;
        }
        case 'revive': {
          if (t.has('ko')) {
            if (t.has('undead')) break;
            this.revive(t, e.pct, false); h.revive = true; h.heal = t.hp;
          } else if (t.has('undead') && t.alive) {
            this.knockOut(t); h.ko = true;
          }
          break;
        }
        case 'status': {
          const add: StatusId[] = [];
          const rem: StatusId[] = [];
          for (const s of e.remove ?? []) {
            if (t.has(s) && !t.always.has(s)) { t.statuses.delete(s); rem.push(s); if (s === 'charm') this.unCharm(t); }
          }
          const list = e.add ?? [];
          const pick = e.all || list.length <= 1 ? list : [this.rng.pick(list)];
          for (const s of pick) if (this.addStatus(t, s)) add.push(s);
          if (add.length) (h.add ??= []).push(...add);
          if (rem.length) (h.remove ??= []).push(...rem);
          if (!add.length && !rem.length && !effects.some((x) => x.type === 'damage' || x.type === 'heal')) h.text = [...(h.text ?? []), 'No effect'];
          break;
        }
        case 'stat': {
          const amt = e.amount;
          switch (e.stat) {
            case 'brave': t.brave = Math.max(0, Math.min(100, t.brave + amt)); this.checkChicken(t); break;
            case 'faith': t.faith = Math.max(0, Math.min(100, t.faith + amt)); break;
            case 'pa': t.buff.pa = Math.max(-t.basePa + 1, t.buff.pa + amt); break;
            case 'ma': t.buff.ma = Math.max(-t.baseMa + 1, t.buff.ma + amt); break;
            case 'speed': t.buff.speed = Math.max(-t.baseSpeed + 1, t.buff.speed + amt); break;
            case 'hp': this.heal(t, amt); break;
            case 'mp': this.healMp(t, amt); break;
            default: break;
          }
          const lbl: Record<string, string> = { brave: 'Brave', faith: 'Faith', pa: 'PA', ma: 'MA', speed: 'Speed', hp: 'HP', mp: 'MP', move: 'Move', jump: 'Jump' };
          (h.text ??= []).push(`${lbl[e.stat]} ${amt >= 0 ? '+' : ''}${amt}`);
          break;
        }
        case 'ct': {
          if (e.set !== undefined) t.ct = e.set;
          if (e.add !== undefined) t.ct = Math.max(0, t.ct + e.add);
          (h.text ??= []).push(e.set !== undefined && e.set >= 100 ? 'Quick!' : e.set === 0 ? 'CT 0' : `CT ${e.add! > 0 ? '+' : ''}${e.add ?? ''}`);
          break;
        }
        case 'breakEquip': {
          const id = t.roster.equip[e.slot];
          if (!id) { (h.text ??= []).push('Nothing to break'); break; }
          if (t.hasSupport('maintenance')) { (h.text ??= []).push('Maintained'); break; }
          delete t.roster.equip[e.slot];
          t.recompute(false);
          h.broke = id;
          (h.text ??= []).push(`${ITEMS.get(id)?.name ?? id} broken!`);
          break;
        }
        case 'steal': {
          this.doSteal(c, t, e.slot, h);
          break;
        }
        case 'invite': {
          if (t.boss || t.vip || t.roster.charId || t.job.noInvite) { (h.text ??= []).push('Refused'); break; }
          if (t.team !== c.team) {
            t.team = c.team; t.baseTeam = c.team; t.controlled = c.team === 0; t.statuses.delete('charm');
            if (c.team === 0) this.invited.push(t);
            this.emit({ t: 'teamChange', uid: t.uid, team: t.team });
            (h.text ??= []).push('Joins your cause!');
          }
          break;
        }
        case 'knockback': {
          this.knockback(c, t, h);
          break;
        }
        case 'special': {
          const s = SPECIALS[e.id];
          s?.effect?.(this, c, t, a, h, opts);
          break;
        }
      }
    }
    // ---- status chance riders (e.g. poison on hit) ----
    for (const sc of a.statusChance ?? []) {
      if (!t.alive && sc.status !== 'ko') continue;
      if (this.rng.pct((sc.chance ?? 100) * ctx.zodiac)) {
        if (sc.remove) { if (t.has(sc.status)) { t.statuses.delete(sc.status); (h.remove ??= []).push(sc.status); } }
        else if (this.addStatus(t, sc.status)) (h.add ??= []).push(sc.status);
      }
    }
    // weapon on-hit statuses
    if (a.id === 'attack' && c.weapon?.onHit && t.alive) {
      const oh = c.weapon.onHit;
      if (this.rng.pct(oh.chance)) {
        for (const s of oh.status ?? []) if (this.addStatus(t, s)) (h.add ??= []).push(s);
      }
    }
    if (wasAlive && !t.alive && t.has('ko')) h.ko = true;
    // ---- poach / train ----
    if (h.ko && t.isMonster && c.hasSupport('poach') && t.team !== c.team && t.job.poach) {
      const [common, rare] = t.job.poach;
      const it = this.rng.pct(12) ? rare : common;
      this.poached.push(it);
      t.gone = true;
      (h.text ??= []).push('Poached!');
    }
    // ---- queue post-hit reactions ----
    if (t !== c && !this.isAlly(c, t) && depth === 0) {
      const rid = t.reactionAbility()?.id;
      if (rid && this.canReact(t)) {
        react.push(() => this.postReaction(t, c, a, dealtHp, physical, h));
      }
    }
    if (t.alive && dealtHp > 0 && physical && h.crit && this.rng.pct(50)) this.knockback(c, t, h);
    return h;
  }

  modifyDamage(c: BattleUnit, t: BattleUnit, a: AbilityDef, base: number, el: Element | undefined, physical: boolean, zodiac: number, h: HitInfo, preview = false): number {
    let d = base * zodiac;
    if (physical) {
      if (c.hasSupport('attackUp')) d = d * 4 / 3;
      if (c.has('berserk')) d = d * 1.5;
      if (t.has('protect')) d = d * 2 / 3;
      if (t.hasSupport('defenseUp')) d = d * 2 / 3;
      if (t.has('sleep') || t.has('charging') || t.has('frog') || t.has('chicken')) d = d * 1.5;
      if (!preview && a.id === 'attack' && this.rng.pct(5)) { d = d * 1.5; h.crit = true; }
    } else if (a.magic) {
      if (c.hasSupport('magicAttackUp')) d = d * 4 / 3;
      if (t.has('shell')) d = d * 2 / 3;
      if (t.hasSupport('magicDefenseUp')) d = d * 2 / 3;
    }
    if (el) {
      if (c.boost.has(el)) d *= 1.25;
      if (this.weather === 'rain' && !c.hasMovement('anyWeather')) { if (el === 'fire') d *= 0.75; if (el === 'lightning') d *= 1.25; }
      if (this.weather === 'snow' && el === 'ice') d *= 1.25;
      if (el === 'fire' && t.has('oil')) { d *= 2; if (!preview) { t.statuses.delete('oil'); (h.remove ??= []).push('oil'); } }
      if (el === 'earth' && t.has('float')) return 0;
      if (t.nullify.has(el)) return 0;
      if (t.weak.has(el)) d *= 2;
      if (t.halve.has(el)) d /= 2;
      if (t.absorb.has(el)) return -Math.min(999, Math.max(1, Math.floor(d)));
    }
    return Math.min(999, Math.max(0, Math.floor(d)));
  }

  // ------------------------------------------------------------------------
  //  Previews (pure — used by the targeting UI and the AI)
  // ------------------------------------------------------------------------
  private previewRng = new Rng(777);

  previewAction(u: BattleUnit, a: AbilityDef, x: number, z: number, opts: ActionOpts = {}): TargetPreview[] {
    const eff = opts.calc ? ABILITIES.get(opts.calc.spell) ?? a : a;
    const targets = this.affectedUnits(u, a, x, z, opts);
    return targets.map((t) => this.previewOn(u, t, eff, opts));
  }

  previewOn(c: BattleUnit, t: BattleUnit, a: AbilityDef, opts: ActionOpts = {}): TargetPreview {
    const wp = this.wpFor(c, a, opts);
    const p: TargetPreview = { uid: t.uid, hit: this.hitChance(c, t, a, wp) };
    const sp = a.special ? SPECIALS[a.special] : undefined;
    if (a.special === 'jump') {
      let base = weaponDamage(c, c.weapon, null, { avg: true });
      if (c.weapon?.cat === 'spear') base = Math.floor(base * 1.5);
      p.dmg = this.modifyDamage(c, t, a, base, c.weapon?.element, true, this.ctx(c, t, wp).zodiac, { uid: t.uid }, true);
      p.hit = 100;
      return p;
    }
    const ctx: FormulaCtx = { ...this.ctx(c, t, wp), rng: this.previewRng };
    const physical = this.isPhysical(a);
    const dummy: HitInfo = { uid: t.uid };
    const status: string[] = [];
    for (const e of a.effects ?? []) {
      switch (e.type) {
        case 'damage': {
          this.previewRng = new Rng(777);
          const el = e.element ?? a.element ?? (a.id === 'attack' ? c.weapon?.element : undefined);
          let base = a.id === 'attack' ? weaponDamage(c, c.weapon, null, { avg: true }) : e.formula(ctx);
          let d = this.modifyDamage(c, t, a, base, el, physical, ctx.zodiac, dummy, true);
          if (a.id === 'attack' && c.weapon2) d += this.modifyDamage(c, t, a, weaponDamage(c, c.weapon2, null, { avg: true }), c.weapon2.element, true, ctx.zodiac, dummy, true);
          if ((e.stat ?? 'hp') === 'hp') { if (d < 0) p.heal = (p.heal ?? 0) - d; else p.dmg = (p.dmg ?? 0) + d; }
          else p.mp = (p.mp ?? 0) + d;
          break;
        }
        case 'heal': {
          const amt = Math.min(999, Math.floor(e.formula(ctx) * ctx.zodiac));
          if ((e.stat ?? 'hp') === 'hp') { if (t.has('undead')) p.dmg = (p.dmg ?? 0) + amt; else p.heal = (p.heal ?? 0) + amt; }
          else p.mp = -(amt);
          break;
        }
        case 'revive': if (t.has('ko')) { p.heal = Math.floor(t.maxHp * e.pct); status.push('Revive'); } else if (t.has('undead')) p.ko = true; break;
        case 'status':
          for (const s of e.add ?? []) if (!t.has(s) && !t.immune.has(s)) status.push(STATUS[s].name);
          for (const s of e.remove ?? []) if (t.has(s)) status.push('-' + STATUS[s].name);
          break;
        case 'stat': status.push(`${e.stat} ${e.amount > 0 ? '+' : ''}${e.amount}`); break;
        case 'special':
          if (e.id === 'instantKo') { if (!t.boss) { p.ko = true; status.push('KO'); } }
          else if (e.id === 'gravity') { if (!t.boss) p.dmg = Math.floor(t.hp * Number(a.params?.pct ?? 0.25)); }
          else if (e.id === 'fullRestore') p.heal = t.maxHp - t.hp;
          else if (e.id === 'wish') p.heal = Math.floor(c.maxHp / 5) * 2;
          break;
        case 'steal': status.push('Steal'); break;
        case 'breakEquip': status.push('Break'); break;
        case 'invite': status.push('Invite'); break;
        case 'ct': status.push(e.set !== undefined ? `CT ${e.set}` : `CT ${e.add}`); break;
        default: break;
      }
    }
    for (const sc of a.statusChance ?? []) status.push(`${STATUS[sc.status].name} ${sc.chance ?? 100}%`);
    if (p.dmg !== undefined && p.dmg >= t.hp && t.alive) p.ko = true;
    if (status.length) p.status = status.join(', ');
    void sp;
    return p;
  }

  canReact(t: BattleUnit) {
    if (!t.alive) return false;
    for (const s of ['sleep', 'stop', 'petrify', 'confuse', 'charm', 'berserk', 'frog', 'chicken', 'disable'] as StatusId[]) if (t.has(s)) return false;
    if (t.jumping) return false;
    return true;
  }

  private postReaction(t: BattleUnit, c: BattleUnit, a: AbilityDef, dealt: number, physical: boolean, h: HitInfo) {
    const r = t.reactionAbility();
    if (!r || !this.canReact(t) && !['dragonSpirit'].includes(r.id)) return;
    const brave = () => this.rng.pct(t.brave);
    const say = () => this.emit({ t: 'reaction', uid: t.uid, name: r.name });
    const adjacent = Math.abs(c.x - t.x) + Math.abs(c.z - t.z) <= Math.max(1, this.abilityRange(t, ABILITIES.get('attack')!).r);
    switch (r.id) {
      case 'counter':
        if (physical && dealt > 0 && c.alive && adjacent && brave()) { say(); this.counterAttack(t, c); }
        break;
      case 'counterTackle':
        if (physical && dealt > 0 && c.alive && Math.abs(c.x - t.x) + Math.abs(c.z - t.z) === 1 && brave()) {
          say();
          const dash = ABILITIES.get('dash');
          if (dash) this.subAction(t, dash, c.x, c.z);
          else this.counterAttack(t, c);
        }
        break;
      case 'counterMagic':
        if (a.magic && c.alive && t.mp >= (a.mp ?? 0) && brave()) {
          say();
          t.mp -= a.mp ?? 0;
          this.subAction(t, a, c.x, c.z);
        }
        break;
      case 'counterFlood':
        if (physical && dealt > 0 && c.alive && brave()) {
          say();
          const geo = ABILITIES.get('geomancy');
          if (geo) this.subAction(t, geo, c.x, c.z);
        }
        break;
      case 'autoPotion':
        if (dealt > 0 && t.alive && brave()) {
          const pot = ['xPotion', 'hiPotion', 'potion'].find((p) => (this.inventory.get(p) ?? 0) > 0 && t.team === 0) ?? (t.team !== 0 ? 'potion' : undefined);
          if (pot) {
            say();
            if (t.team === 0) this.takeItem(pot);
            const amt = pot === 'xPotion' ? 150 : pot === 'hiPotion' ? 70 : 30;
            this.heal(t, amt, ITEMS.get(pot)?.name);
          }
        }
        break;
      case 'hpRestore':
        if (t.critical && brave()) { say(); this.heal(t, t.maxHp, r.name); }
        break;
      case 'mpRestore':
        if (t.critical && brave()) { say(); this.healMp(t, t.maxMp); }
        break;
      case 'criticalQuick':
        if (t.critical && brave()) { say(); t.ct = 100; this.emit({ t: 'text', uid: t.uid, text: 'Quick!', color: '#ff9' }); }
        break;
      case 'regenerator':
        if (dealt > 0 && brave()) { say(); if (this.addStatus(t, 'regen')) this.emit({ t: 'status', uid: t.uid, add: ['regen'] }); }
        break;
      case 'speedSave':
        if (dealt > 0 && brave()) { say(); t.buff.speed++; this.emit({ t: 'text', uid: t.uid, text: 'Speed +1', color: '#9cf' }); }
        break;
      case 'paSave':
        if (dealt > 0 && brave()) { say(); t.buff.pa++; this.emit({ t: 'text', uid: t.uid, text: 'PA +1', color: '#f96' }); }
        break;
      case 'maSave':
        if (dealt > 0 && brave()) { say(); t.buff.ma++; this.emit({ t: 'text', uid: t.uid, text: 'MA +1', color: '#c9f' }); }
        break;
      case 'braveUp':
        if (dealt > 0 && brave()) { say(); t.brave = Math.min(100, t.brave + 3); this.emit({ t: 'text', uid: t.uid, text: 'Brave +3', color: '#fc6' }); }
        break;
      case 'faithUp':
        if (dealt > 0 && brave()) { say(); t.faith = Math.min(100, t.faith + 3); this.emit({ t: 'text', uid: t.uid, text: 'Faith +3', color: '#ffd' }); }
        break;
      case 'caution':
        if (dealt > 0 && brave()) { say(); t.statuses.set('defending', 0); this.emit({ t: 'status', uid: t.uid, add: ['defending'] }); }
        break;
      case 'absorbMp':
        if (a.magic && (a.mp ?? 0) > 0 && brave()) { say(); this.healMp(t, a.mp ?? 0); }
        break;
      case 'dragonSpirit':
        if (dealt > 0 && brave()) { say(); if (this.addStatus(t, 'reraise')) this.emit({ t: 'status', uid: t.uid, add: ['reraise'] }); }
        break;
      case 'bonecrusher':
        if (t.critical && c.alive && adjacent && brave()) {
          say();
          const d = this.damage(c, Math.min(999, t.maxHp));
          this.emit({ t: 'hits', src: t.uid, ability: 'bonecrusher', hits: [{ uid: c.uid, dmg: d, ko: !c.alive }], x: c.x, z: c.z, vfx: 'slash' });
          this.afterHits(t, [{ uid: c.uid, dmg: d, ko: !c.alive }]);
        }
        break;
      case 'sunkenState':
        if (dealt > 0 && brave()) { say(); t.statuses.set('invisible', 0); this.emit({ t: 'status', uid: t.uid, add: ['invisible'] }); }
        break;
      case 'damageSplit':
        if (dealt > 1 && c.alive && brave()) {
          say();
          const half = Math.floor(dealt / 2);
          this.heal(t, half, undefined);
          const d = this.damage(c, half);
          this.emit({ t: 'hp', uid: c.uid, delta: -d, reason: r.name });
        }
        break;
      case 'distribute':
        if (dealt > 0 && brave()) {
          say();
          for (const o of this.alliesOf(t)) if (o !== t && o.alive && Math.abs(o.x - t.x) + Math.abs(o.z - t.z) <= 3) this.heal(o, Math.max(1, Math.floor(dealt / 4)), r.name);
        }
        break;
      case 'gilSnapper':
        if (dealt > 0 && t.team === 0 && brave()) { say(); this.gil.value += dealt; this.lootGil += dealt; this.emit({ t: 'text', uid: t.uid, text: `+${dealt} gil`, color: '#fd6' }); }
        break;
      default: break;
    }
  }

  /** A reaction/secondary action performed immediately (no JP, no further reactions) */
  subAction(u: BattleUnit, a: AbilityDef, x: number, z: number) {
    const targets = this.affectedUnits(u, a, x, z);
    this.emit({ t: 'act', uid: u.uid, ability: a.id, name: a.name, x, z, targets: targets.map((t) => t.uid), anim: a.anim, vfx: a.vfx });
    const hits: HitInfo[] = [];
    for (const t of targets) hits.push(this.hitUnit(u, t, a, { depth: 1 }, []));
    this.emit({ t: 'hits', src: u.uid, ability: a.id, hits, vfx: a.vfx, color: a.color, x, z });
    this.afterHits(u, hits);
  }

  counterAttack(t: BattleUnit, c: BattleUnit) {
    const atk = ABILITIES.get('attack');
    if (!atk || !c.alive) return;
    const f = MapGrid.faceToward(t.x, t.z, c.x, c.z, t.facing);
    t.facing = f;
    this.emit({ t: 'face', uid: t.uid, dir: f });
    this.subAction(t, atk, c.x, c.z);
  }

  private afterHits(src: BattleUnit, hits: HitInfo[]) {
    for (const h of hits) {
      const u = this.unit(h.uid);
      if (!u) continue;
      this.updateCritical(u);
      if (h.ko && src.team !== u.team) { src.kills++; src.roster.kills++; }
    }
  }

  private afterAction(u: BattleUnit, a: AbilityDef, targets: BattleUnit[]) {
    if (a.id === 'defendCmd' || a.id.startsWith('wait')) return;
    // EXP & JP
    if (u.team === 0 || u.controlled) {
      let exp = 0;
      if (targets.length) {
        const t = targets.reduce((m, o) => (o.level > m.level ? o : m), targets[0]);
        exp = Math.max(1, 10 + (t.level - u.level));
        if (targets.some((o) => !o.alive && o.team !== u.team)) exp += 10;
      } else exp = 5;
      this.gainExp(u, exp);
      this.gainJp(u, this.jpForAction(u), true);
    }
  }

  jpForAction(u: BattleUnit) {
    const jl = jobLevel(u.roster.totalJp[u.roster.job] ?? 0);
    return 8 + jl * 2 + Math.floor(u.level / 4);
  }

  gainExp(u: BattleUnit, n: number) {
    if (u.isMonster && u.team !== 0) return;
    if (u.team !== 0) return;
    let amt = Math.min(99, n);
    if (u.hasSupport('expBoost')) amt = Math.floor(amt * 1.5);
    u.expGained += amt;
    u.roster.exp += amt;
    while (u.roster.exp >= 100 && u.roster.level < MAX_LEVEL) {
      u.roster.exp -= 100;
      const oldMax = u.maxHp, oldMp = u.maxMp;
      growRaw(u.roster.raw, u.roster.level, u.job.growth);
      u.roster.level++;
      u.levelUps++;
      u.recompute(false);
      u.hp = Math.min(u.maxHp, u.hp + (u.maxHp - oldMax));
      u.mp = Math.min(u.maxMp, u.mp + (u.maxMp - oldMp));
      this.emit({ t: 'levelUp', uid: u.uid, level: u.roster.level });
    }
  }

  gainJp(u: BattleUnit, n: number, spill: boolean) {
    if (u.team !== 0 || u.isMonster) return;
    let amt = n;
    if (u.hasSupport('jpBoost')) amt = Math.floor(amt * 1.5);
    u.jpGained += amt;
    addJp(u.roster, u.roster.job, amt);
    if (spill) {
      const share = Math.floor(amt / 4);
      if (share > 0) for (const o of this.units) if (o !== u && o.team === 0 && !o.isMonster && !o.gone) addJp(o.roster, u.roster.job, share);
    }
  }

  // ------------------------------------------------------------------------
  //  HP / status primitives
  // ------------------------------------------------------------------------
  damage(t: BattleUnit, n: number): number {
    if (t.has('wall')) return 0;
    const real = Math.max(0, Math.min(t.hp, Math.floor(n)));
    t.hp -= real;
    if (t.hp <= 0) this.knockOut(t);
    else this.updateCritical(t);
    return real;
  }

  heal(t: BattleUnit, n: number, reason?: string, emit = true) {
    if (!t.alive) return 0;
    const real = Math.max(0, Math.min(t.maxHp - t.hp, Math.floor(n)));
    t.hp += real;
    this.updateCritical(t);
    if (emit) this.emit({ t: 'hp', uid: t.uid, delta: real, reason });
    return real;
  }

  healMp(t: BattleUnit, n: number) {
    if (!t.alive) return 0;
    const real = Math.max(0, Math.min(t.maxMp - t.mp, Math.floor(n)));
    t.mp += real;
    if (real) this.emit({ t: 'mp', uid: t.uid, delta: real });
    return real;
  }

  knockOut(t: BattleUnit) {
    t.hp = 0;
    const keep: StatusId[] = ['undead', 'reraise'];
    for (const s of [...t.statuses.keys()]) if (!keep.includes(s) && !t.always.has(s)) t.statuses.delete(s);
    t.statuses.set('ko', 0);
    t.koCount = 3;
    t.charging = null; t.performing = null; t.jumping = null;
    if (t.team !== t.baseTeam) { t.team = t.baseTeam; }
    this.emit({ t: 'ko', uid: t.uid });
  }

  revive(t: BattleUnit, pct: number, emit = true) {
    if (!t.has('ko')) return;
    t.statuses.delete('ko');
    t.hp = Math.max(1, Math.floor(t.maxHp * pct));
    t.koCount = 3;
    this.updateCritical(t);
    if (emit) this.emit({ t: 'revive', uid: t.uid });
    else this.emit({ t: 'revive', uid: t.uid });
  }

  addStatus(t: BattleUnit, s: StatusId): boolean {
    if (t.immune.has(s)) return false;
    if (s === 'ko') { if (!t.alive) return false; this.knockOut(t); return true; }
    if (!t.alive) return false;
    if (t.has(s) && s !== 'doom') return false;
    const info = STATUS[s];
    for (const c of info.cancels ?? []) {
      if (c === 'charging' && t.charging) { t.charging = null; t.statuses.delete('charging'); this.emit({ t: 'chargeBreak', uid: t.uid }); }
      if (c === 'performing' && t.performing) { t.performing = null; t.statuses.delete('performing'); }
      if (t.has(c) && !t.always.has(c)) t.statuses.delete(c);
    }
    if (s === 'charm') { t.team = t.baseTeam === 0 ? 1 : 0; this.emit({ t: 'teamChange', uid: t.uid, team: t.team }); }
    if (s === 'doom') t.doomCount = 3;
    if (s === 'petrify' && t.team === 0) { /* stone counts as out */ }
    if (s === 'chicken') t.brave = Math.min(t.brave, 9);
    t.statuses.set(s, info.ticks);
    return true;
  }

  unCharm(t: BattleUnit) {
    t.statuses.delete('charm');
    if (t.team !== t.baseTeam) { t.team = t.baseTeam; this.emit({ t: 'teamChange', uid: t.uid, team: t.team }); }
  }

  checkChicken(t: BattleUnit) {
    if (t.brave < 10 && !t.has('chicken')) { this.addStatus(t, 'chicken'); this.emit({ t: 'status', uid: t.uid, add: ['chicken'] }); }
    else if (t.brave >= 10 && t.has('chicken')) { t.statuses.delete('chicken'); this.emit({ t: 'status', uid: t.uid, remove: ['chicken'] }); }
  }

  updateCritical(u: BattleUnit) {
    if (u.alive && u.critical) u.statuses.set('critical', 0);
    else u.statuses.delete('critical');
  }

  knockback(c: BattleUnit, t: BattleUnit, h: HitInfo) {
    if (!t.alive || t.boss) return;
    const dx = Math.sign(t.x - c.x), dz = Math.sign(t.z - c.z);
    const [kx, kz] = Math.abs(t.x - c.x) >= Math.abs(t.z - c.z) ? [dx, 0] : [0, dz];
    if (!kx && !kz) return;
    const dest = this.grid.cell(t.x + kx, t.z + kz);
    const from = this.cellOf(t);
    if (!dest || !dest.standable || this.unitAt(dest.x, dest.z)) return;
    if (dest.h - from.h > 1) return;
    h.knock = [dest.x, dest.z];
    const fall = from.h - dest.h;
    this.placeUnit(t, dest.x, dest.z);
    if (fall > t.jump && t.alive) {
      const d = this.damage(t, Math.floor(t.maxHp * Math.min(0.5, 0.1 * fall)));
      if (d) this.emit({ t: 'hp', uid: t.uid, delta: -d, reason: 'Fall' });
    }
  }

  doSteal(c: BattleUnit, t: BattleUnit, slot: EquipSlot | 'gil' | 'exp' | 'any', h: HitInfo) {
    if (slot === 'gil') {
      const amt = Math.floor(t.level * c.speed * 2 + this.rng.int(10, 60));
      if (c.team === 0) { this.gil.value += amt; this.lootGil += amt; }
      (h.text ??= []).push(`Stole ${amt} gil`);
      return;
    }
    if (slot === 'exp') {
      const amt = Math.min(t.roster.exp, 30 + this.rng.int(0, 40));
      t.roster.exp -= amt;
      this.gainExp(c, amt);
      (h.text ??= []).push(`Stole ${amt} EXP`);
      return;
    }
    if (t.hasSupport('maintenance')) { (h.text ??= []).push('Maintained'); return; }
    let s: EquipSlot | undefined = slot === 'any' ? (['accessory', 'head', 'body', 'lhand', 'rhand'] as EquipSlot[]).find((x) => t.roster.equip[x]) : slot;
    if (!s) { (h.text ??= []).push('Nothing to steal'); return; }
    const id = t.roster.equip[s];
    if (!id) { (h.text ??= []).push('Nothing to steal'); return; }
    delete t.roster.equip[s];
    t.recompute(false);
    if (c.team === 0) { this.loot.push(id); this.addItem(id, 1); }
    h.stolen = id;
    (h.text ??= []).push(`Stole ${ITEMS.get(id)?.name ?? id}!`);
  }

  // ------------------------------------------------------------------------
  //  Jump (Lancer)
  // ------------------------------------------------------------------------
  beginJump(u: BattleUnit, x: number, z: number) {
    const t = this.unitAt(x, z, false);
    u.jumping = { x, z, ctLeft: this.chargeTicks(u, ABILITIES.get('jump') ?? ({ id: 'jump' } as AbilityDef)), targetUid: t?.uid };
    u.statuses.set('jumping', 0);
    this.emit({ t: 'jumpUp', uid: u.uid });
  }

  private resolveJump(u: BattleUnit) {
    const j = u.jumping!;
    u.jumping = null;
    u.statuses.delete('jumping');
    // land on the target tile if free, else nearest free
    let lx = j.x, lz = j.z;
    const occupant = this.unitAt(lx, lz);
    const target = occupant && occupant !== u ? occupant : undefined;
    if (target) {
      // land adjacent
      const opts = FACINGS.map((f) => [lx + DIRS[f][0], lz + DIRS[f][1]] as [number, number])
        .filter(([x, z]) => { const c = this.grid.cell(x, z); return c && c.standable && !this.unitAt(x, z); });
      if (opts.length) [lx, lz] = opts.sort((a, b) => (Math.abs(a[0] - u.x) + Math.abs(a[1] - u.z)) - (Math.abs(b[0] - u.x) + Math.abs(b[1] - u.z)))[0];
      else { lx = u.x; lz = u.z; }
    }
    this.emit({ t: 'jumpDown', uid: u.uid, x: lx, z: lz });
    const hits: HitInfo[] = [];
    if (target && target.alive) {
      const a = ABILITIES.get('jump')!;
      const h: HitInfo = { uid: target.uid };
      let base = weaponDamage(u, u.weapon, this.rng);
      if (u.weapon?.cat === 'spear') base = Math.floor(base * 1.5);
      const ctx = this.ctx(u, target, u.weapon?.wp ?? 0);
      const dmg = this.modifyDamage(u, target, a, base, u.weapon?.element, true, ctx.zodiac, h);
      const real = this.damage(target, dmg);
      h.dmg = real;
      if (!target.alive) h.ko = true;
      hits.push(h);
    }
    this.placeUnit(u, lx, lz);
    this.emit({ t: 'hits', src: u.uid, ability: 'jump', hits, x: lx, z: lz, vfx: 'jumpImpact' });
    this.afterHits(u, hits);
    this.afterAction(u, ABILITIES.get('jump') ?? ({ id: 'jump' } as AbilityDef), target ? [target] : []);
  }

  // ------------------------------------------------------------------------
  //  Mimic (Mime)
  // ------------------------------------------------------------------------
  private triggerMimics(u: BattleUnit, a: AbilityDef, x: number, z: number, opts: ActionOpts) {
    if (!a.mimic || u.job.id === 'mime') return;
    for (const m of this.units) {
      if (m === u || m.team !== u.team || m.job.id !== 'mime' || !m.alive || !m.canAct || m.charging || m.has('stop') || m.has('sleep')) continue;
      // mirror the action relative to the mime's position
      const tx = m.x + (x - u.x), tz = m.z + (z - u.z);
      const c = this.grid.cell(tx, tz);
      if (!c || c.hole) continue;
      this.emit({ t: 'text', uid: m.uid, text: 'Mimic!', color: '#fcf' });
      this.resolveAbility(m, a, tx, tz, { ...opts, mimic: true, depth: 1 });
    }
  }

  // ------------------------------------------------------------------------
  //  End of turn
  // ------------------------------------------------------------------------
  endTurn(u: BattleUnit, facing?: Facing): BEvent[] {
    this.events = [];
    if (facing && facing !== u.facing) { u.facing = facing; this.emit({ t: 'face', uid: u.uid, dir: facing }); }
    if (u.alive) {
      if (u.has('poison')) { const d = this.damage(u, Math.max(1, Math.floor(u.maxHp / 8))); this.emit({ t: 'hp', uid: u.uid, delta: -d, reason: 'Poison' }); }
      if (u.has('regen') && u.alive) this.heal(u, Math.max(1, Math.floor(u.maxHp / 8)), 'Regen');
      const c = this.cellOf(u);
      if (c.terrain === 'l' && !u.has('float') && !u.hasMovement('lavaWalk') && !u.job.flying && u.alive) {
        const d = this.damage(u, Math.max(1, Math.floor(u.maxHp / 10)));
        this.emit({ t: 'hp', uid: u.uid, delta: -d, reason: 'Lava' });
      }
      if (c.terrain === 'p' && !u.has('float') && u.alive && this.addStatus(u, 'poison')) this.emit({ t: 'status', uid: u.uid, add: ['poison'] });
    }
    const cost = u.moved && u.acted ? 100 : u.moved || u.acted ? 80 : 60;
    u.ct = Math.min(60, Math.max(0, u.ct - cost));
    this.active = null;
    this.fireEvents();
    this.checkEnd();
    return this.flush();
  }

  // ------------------------------------------------------------------------
  //  Victory / defeat & scripted events
  // ------------------------------------------------------------------------
  checkEnd() {
    if (this.result) return;
    if (this.forced) { this.result = this.forced; this.emit({ t: 'end', result: this.result }); return; }
    const hero = this.hero;
    if (hero && hero.has('ko') && hero.koCount <= 0) { this.result = 'defeat'; }
    if (hero && (hero.has('crystal') || hero.has('treasure'))) this.result = 'defeat';
    for (const id of this.def.protect ?? []) {
      const p = this.bySid(id);
      if (p && (p.has('ko') || p.has('petrify') || p.gone && !p.alive)) { this.result = 'defeat'; }
    }
    const players = this.units.filter((u) => u.baseTeam === 0 && !u.hidden && !u.gone);
    if (!this.result && players.length && players.every((u) => !u.active || (u.team !== 0 && u.has('charm')))) {
      if (players.every((u) => !u.active)) this.result = 'defeat';
    }
    if (!this.result) {
      const v = this.def.victory;
      const enemies = this.units.filter((u) => u.baseTeam !== 0 && u.team !== 0 && !u.hidden);
      switch (v.type) {
        case 'defeatAll':
          if (enemies.every((u) => !u.active || u.gone)) this.result = 'victory';
          break;
        case 'defeat':
          if (v.ids.every((id) => { const t = this.bySid(id); return !t || !t.active || t.gone; })) this.result = 'victory';
          break;
        case 'defeatAny':
          if (v.ids.some((id) => { const t = this.bySid(id); return t && (!t.active || t.gone); })) this.result = 'victory';
          break;
        case 'survive':
          if (this.heroTurns > v.turns) this.result = 'victory';
          break;
        case 'reach':
          if (players.some((u) => u.active && v.cells.some(([x, z]) => u.x === x && u.z === z))) this.result = 'victory';
          break;
      }
    }
    if (this.result) this.emit({ t: 'end', result: this.result });
  }

  /** evaluate mid-battle event triggers */
  fireEvents() {
    const evs = this.def.events ?? [];
    for (let i = 0; i < evs.length; i++) {
      if (this.firedEvents.has(i)) continue;
      const w = evs[i].when;
      let hit = false;
      if ('start' in w) hit = true;
      else if ('turn' in w) hit = this.heroTurns >= w.turn;
      else if ('hpBelow' in w) {
        const u = this.bySid(w.hpBelow[0]);
        hit = !!u && !u.hidden && (u.hp / u.maxHp) * 100 < w.hpBelow[1];
      } else if ('ko' in w) {
        const u = this.bySid(w.ko);
        hit = !!u && !u.alive;
      } else if ('enemiesLeft' in w) {
        hit = this.units.filter((u) => u.team !== 0 && u.active && !u.hidden).length <= w.enemiesLeft;
      }
      if (hit) { this.firedEvents.add(i); this.emit({ t: 'script', index: i }); }
    }
  }

  // ---- script hooks (called by the presentation while running a battle script) ----
  scriptReveal(sid: string) {
    const u = this.units.find((o) => o.sid === sid && o.hidden);
    if (!u) return;
    u.hidden = false;
    const c = this.grid.cell(u.x, u.z);
    if (this.unitAt(u.x, u.z) && this.unitAt(u.x, u.z) !== u || !c?.standable) {
      // find nearest free cell
      const free = this.grid.diamond(u.x, u.z, 4).filter((cc) => cc.standable && !this.unitAt(cc.x, cc.z));
      if (free.length) { u.x = free[0].x; u.z = free[0].z; }
    }
    u.ct = 50;
  }
  scriptRetreat(sid: string) {
    const u = this.bySid(sid);
    if (!u) return;
    u.gone = true;
    u.charging = null;
  }
}
