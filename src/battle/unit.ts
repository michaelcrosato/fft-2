import type { AbilityDef, AiMode, Element, EquipSlot, Facing, ItemDef, JobDef, StatusId, WeaponType } from '../data/types';
import { ABILITIES, ITEMS, job as getJob } from '../data/db';
import type { RosterUnit } from '../game/roster';
import { displayStats } from './stats';
import { STATUS } from './status';

export interface Charging {
  ability: AbilityDef;
  x: number;
  z: number;
  /** follows a unit (targeted unit) instead of a tile */
  targetUid?: number;
  ctLeft: number;
  item?: string;
  /** Arithmancer: pre-computed target list */
  targets?: number[];
}

let UID = 1;

export class BattleUnit {
  readonly uid = UID++;
  /** battle spawn id (named characters use their char id) */
  sid: string;
  roster: RosterUnit;
  /** 0 = player side, 1 = enemy, 2 = third faction */
  team: number;
  /** original team (charm flips `team` temporarily) */
  baseTeam: number;
  /** player controls this unit (guests are team 0 but AI controlled) */
  controlled: boolean;
  ai: AiMode = 'aggressive';
  job!: JobDef;
  name: string;

  maxHp = 1; hp = 1; maxMp = 0; mp = 0;
  baseSpeed = 6; basePa = 5; baseMa = 5;
  /** battle-long stat buffs (Accumulate, Yell, breaks) */
  buff = { pa: 0, ma: 0, speed: 0 };
  move = 4; jump = 3; cev = 5;
  brave = 60; faith = 60;
  /** brave/faith at battle start (permanent drift = 1/4 of the battle change) */
  startBrave = 60; startFaith = 60;

  x = 0; z = 0; facing: Facing = 'S';
  ct = 0;
  statuses = new Map<StatusId, number>();
  koCount = 3;
  doomCount = 3;
  charging: Charging | null = null;
  jumping: { x: number; z: number; ctLeft: number; targetUid?: number } | null = null;
  performing: AbilityDef | null = null;
  moved = false;
  acted = false;
  /** not on the field any more (crystal taken, fled, etc.) */
  gone = false;
  boss = false;
  vip = false;
  noLoot = false;
  /** boss HP multiplier (lifts the 999 cap) */
  hpMult = 1;
  hidden = false;
  /** exp/jp earned this battle for the results screen */
  expGained = 0;
  jpGained = 0;
  kills = 0;
  levelUps = 0;
  /** abilities learned from crystals during battle */
  crystalLearned: string[] = [];

  // equipment derived
  weapon: ItemDef | null = null;
  weapon2: ItemDef | null = null;
  shield: ItemDef | null = null;
  equipItems: ItemDef[] = [];
  absorb = new Set<Element>();
  halve = new Set<Element>();
  nullify = new Set<Element>();
  weak = new Set<Element>();
  boost = new Set<Element>();
  immune = new Set<StatusId>();
  always = new Set<StatusId>();

  constructor(roster: RosterUnit, team: number, controlled: boolean, sid?: string) {
    this.roster = roster;
    this.team = team;
    this.baseTeam = team;
    this.controlled = controlled;
    this.sid = sid ?? roster.charId ?? roster.uid;
    this.name = roster.name;
    this.recompute(true);
  }

  get isMonster() { return this.roster.gender === 'monster'; }
  get gender() { return this.roster.gender; }
  get level() { return this.roster.level; }
  get zodiac() { return this.roster.zodiac; }

  /** Recompute derived stats from roster + job + equipment. */
  recompute(fill = false) {
    const r = this.roster;
    this.job = getJob(r.job);
    const j = this.job;
    let hp: number, mp: number, sp: number, pa: number, ma: number;
    {
      const d = displayStats(r.raw, j);
      hp = d.hp; mp = d.mp; sp = d.speed; pa = d.pa; ma = d.ma;
    }
    this.equipItems = [];
    this.absorb.clear(); this.halve.clear(); this.nullify.clear(); this.weak.clear(); this.boost.clear();
    this.immune.clear(); this.always.clear();
    for (const e of j.absorb ?? []) this.absorb.add(e);
    for (const e of j.halve ?? []) this.halve.add(e);
    for (const e of j.nullify ?? []) this.nullify.add(e);
    for (const e of j.weak ?? []) this.weak.add(e);
    for (const s of j.immune ?? []) this.immune.add(s);
    for (const s of j.always ?? []) this.always.add(s);
    this.weapon = null; this.weapon2 = null; this.shield = null;
    let move = j.move, jump = j.jump, brave = 0, faith = 0;
    const slots: EquipSlot[] = ['rhand', 'lhand', 'head', 'body', 'accessory'];
    for (const s of slots) {
      const id = r.equip[s];
      if (!id) continue;
      const it = ITEMS.get(id);
      if (!it) continue;
      this.equipItems.push(it);
      if (it.kind === 'weapon') { if (!this.weapon) this.weapon = it; else this.weapon2 = it; }
      if (it.kind === 'shield') this.shield = it;
      hp += it.hp ?? 0; mp += it.mp ?? 0;
      const st = it.stats ?? {};
      pa += st.pa ?? 0; ma += st.ma ?? 0; sp += st.speed ?? 0;
      move += st.move ?? 0; jump += st.jump ?? 0; brave += st.brave ?? 0; faith += st.faith ?? 0;
      for (const e of it.absorb ?? []) this.absorb.add(e);
      for (const e of it.halve ?? []) this.halve.add(e);
      for (const e of it.nullify ?? []) this.nullify.add(e);
      for (const e of it.weak ?? []) this.weak.add(e);
      for (const e of it.boost ?? []) this.boost.add(e);
      for (const s2 of it.immune ?? []) this.immune.add(s2);
      for (const s2 of it.always ?? []) this.always.add(s2);
    }
    // movement abilities
    const mv = this.movementAbility();
    if (mv) {
      const p = mv.params ?? {};
      move += Number(p.move ?? 0);
      jump += Number(p.jump ?? 0);
    }
    const sup = this.supportAbility();
    if (sup?.id === 'maintenance') { /* handled in break/steal */ }
    this.maxHp = this.hpMult > 1 ? Math.min(9999, Math.max(1, Math.floor(hp * this.hpMult))) : Math.min(999, Math.max(1, hp));
    this.maxMp = Math.min(999, Math.max(0, mp));
    this.baseSpeed = Math.max(1, sp);
    this.basePa = Math.max(1, pa);
    this.baseMa = Math.max(1, ma);
    this.move = Math.max(1, move);
    this.jump = Math.max(1, jump);
    this.cev = j.cev;
    if (fill) {
      this.hp = this.maxHp; this.mp = this.maxMp;
      this.brave = Math.max(0, Math.min(100, r.brave + brave));
      this.faith = Math.max(0, Math.min(100, r.faith + faith));
      this.startBrave = r.brave; this.startFaith = r.faith;
      for (const s2 of this.always) this.statuses.set(s2, 0);
      for (const it of this.equipItems) for (const s2 of it.start ?? []) this.statuses.set(s2, STATUS[s2].ticks);
    } else {
      this.hp = Math.min(this.hp, this.maxHp); this.mp = Math.min(this.mp, this.maxMp);
    }
  }

  // ---- effective stats ----
  get speed() {
    let s = this.baseSpeed + this.buff.speed;
    if (this.has('haste')) s = Math.floor(s * 1.5);
    if (this.has('slow')) s = Math.floor(s / 2);
    return Math.max(1, s);
  }
  get pa() {
    let p = this.basePa + this.buff.pa;
    if (this.has('frog') || this.has('chicken')) p = Math.max(1, Math.floor(p / 2));
    return Math.max(1, p);
  }
  get ma() {
    let m = this.baseMa + this.buff.ma;
    if (this.has('frog')) m = Math.max(1, Math.floor(m / 2));
    return Math.max(1, m);
  }
  /** faith used in magic formulas */
  get effFaith() {
    if (this.has('faith')) return 100;
    if (this.has('atheist')) return 0;
    return this.faith;
  }

  has(s: StatusId) { return this.statuses.has(s); }
  get alive() { return !this.has('ko') && !this.has('crystal') && !this.has('treasure') && !this.gone; }
  /** counts as active for victory checks */
  get active() {
    if (!this.alive) return false;
    for (const s of this.statuses.keys()) if (STATUS[s].out) return false;
    return true;
  }
  get canTakeTurn() {
    if (!this.alive || this.hidden) return false;
    for (const s of this.statuses.keys()) if (STATUS[s].noTurn) return false;
    return true;
  }
  get canMove() { return !this.has('immobilize') && !this.jumping; }
  get canAct() { return !this.has('disable') && !this.jumping; }

  // ---- abilities ----
  knows(id: string) { return this.roster.learned.includes(id) || ABILITIES.get(id)?.jp === 0; }

  reactionAbility(): AbilityDef | undefined {
    const id = this.roster.reaction ?? this.job.mReaction;
    return id ? ABILITIES.get(id) : undefined;
  }
  supportAbility(): AbilityDef | undefined {
    const id = this.roster.support ?? this.job.mSupport;
    return id ? ABILITIES.get(id) : undefined;
  }
  movementAbility(): AbilityDef | undefined {
    const id = this.roster.movement ?? this.job.mMovement;
    return id ? ABILITIES.get(id) : undefined;
  }
  hasReaction(id: string) { return this.reactionAbility()?.id === id; }
  hasSupport(id: string) { return this.supportAbility()?.id === id || (this.job.innate ?? []).includes(id); }
  hasMovement(id: string) { return this.movementAbility()?.id === id || (this.job.innate ?? []).includes(id); }

  /** action abilities usable from a job's skillset */
  skillsetActions(jobId: string): AbilityDef[] {
    const j = getJob(jobId);
    const out: AbilityDef[] = [];
    for (const a of j.abilities) {
      const d = ABILITIES.get(a);
      if (!d || d.kind !== 'action' || d.special === 'passive') continue;
      if (this.knows(a)) out.push(d);
    }
    // abilities of this skillset learned outside the job list (e.g. the ultimate summon from a quest)
    for (const id of this.roster.learned) {
      const d = ABILITIES.get(id);
      if (d && d.kind === 'action' && d.skillset === j.skillset.id && !out.includes(d) && d.special !== 'passive') out.push(d);
    }
    return out;
  }

  /** monster skills (fixed list) */
  monsterActions(): AbilityDef[] {
    const known = new Set(this.roster.learned);
    for (const [a, lv] of this.job.monsterSkills ?? []) if (lv <= this.level) known.add(a);
    return [...known].map((a) => ABILITIES.get(a)).filter((a): a is AbilityDef => !!a && a.kind === 'action' && a.special !== 'passive');
  }

  weaponType(): WeaponType {
    return (this.weapon?.cat as WeaponType) ?? 'fist';
  }

  /** evasion values */
  evasion() {
    let sev = 0, smev = 0, aev = 0, amev = 0, wev = 0;
    for (const it of this.equipItems) {
      if (it.kind === 'shield') { sev += it.sev ?? 0; smev += it.smev ?? 0; }
      if (it.kind === 'weapon') wev = Math.max(wev, it.wev ?? 0);
      aev += it.aev ?? 0; amev += it.amev ?? 0;
    }
    return { cev: this.cev, sev, smev, aev, amev, wev };
  }

  get critical() { return this.hp > 0 && this.hp <= Math.floor(this.maxHp / 5); }
}
