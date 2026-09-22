// Turn a BattleDef + the player's chosen party into a running Battle:
// resolves levels, creates enemy/guest roster units, auto-equips generics and
// gives them sensible abilities for their level.
import type { BattleDef, EquipSlot, ItemDef, JobDef, UnitSpawn, StatusId } from '../data/types';
import { ABILITIES, CHARACTERS, ITEMS, JOBS, job as getJob, mapDef } from '../data/db';
import { Battle } from '../battle/battle';
import { MapGrid } from '../battle/grid';
import { BattleUnit } from '../battle/unit';
import { Rng } from '../core/rng';
import { createCharacter, createGeneric, createMonster, canEquip, type RosterUnit } from './roster';
import { partyLevel, loadOptions, type GameState } from './state';
import { STATUS } from '../battle/status';

export function resolveLevel(level: number | string, pl: number): number {
  if (typeof level === 'number') return Math.max(1, Math.min(99, level));
  const n = parseInt(level, 10);
  return Math.max(1, Math.min(99, pl + (isNaN(n) ? 0 : n)));
}

const BOSS_IMMUNE: StatusId[] = ['ko', 'petrify', 'stop', 'charm', 'confuse', 'doom', 'frog', 'chicken', 'sleep', 'berserk', 'disable', 'immobilize', 'undead', 'vampire', 'invisible'];

/** best equipment for a job at a shop tier */
export function autoEquip(u: RosterUnit, tier: number, rng: Rng, boss = false) {
  const j = getJob(u.job);
  if (j.monster || u.gender === 'monster') return;
  const maxTier = Math.min(8, tier + (boss ? 1 : 0));
  const pool = [...ITEMS.values()].filter((it) => (it.shopTier ?? 99) <= maxTier || (boss && it.rare && (it.shopTier ?? 0) === 0 && rng.pct(0)));
  const pickBest = (cands: ItemDef[], score: (i: ItemDef) => number) => {
    if (!cands.length) return undefined;
    const sorted = [...cands].sort((a, b) => score(b) - score(a));
    return rng.pick(sorted.slice(0, Math.min(3, sorted.length)));
  };
  const slotOk = (it: ItemDef, slot: EquipSlot) => canEquip(u, it, slot, u.job);
  if (!u.equip.rhand) {
    const w = pickBest(pool.filter((it) => it.kind === 'weapon' && slotOk(it, 'rhand')), (i) => (i.wp ?? 0) + (i.shopTier ?? 0) * 0.5);
    if (w) u.equip.rhand = w.id;
  }
  const rh = u.equip.rhand ? ITEMS.get(u.equip.rhand) : undefined;
  if (!u.equip.lhand && !(rh?.twoHanded)) {
    const s = pickBest(pool.filter((it) => it.kind === 'shield' && slotOk(it, 'lhand')), (i) => (i.sev ?? 0) + (i.smev ?? 0) * 0.5);
    if (s) u.equip.lhand = s.id;
  }
  if (!u.equip.head) {
    const h = pickBest(pool.filter((it) => it.kind === 'head' && slotOk(it, 'head')), (i) => (i.hp ?? 0) + (i.mp ?? 0) * 0.5);
    if (h) u.equip.head = h.id;
  }
  if (!u.equip.body) {
    const b = pickBest(pool.filter((it) => it.kind === 'body' && slotOk(it, 'body')), (i) => (i.hp ?? 0) + (i.mp ?? 0) * 0.5);
    if (b) u.equip.body = b.id;
  }
  if (!u.equip.accessory && rng.pct(boss ? 90 : 45)) {
    const acc = pool.filter((it) => it.kind === 'accessory' && slotOk(it, 'accessory') && (!it.gender || it.gender === u.gender));
    if (acc.length) u.equip.accessory = rng.pick(acc).id;
  }
}

/** give a generic unit abilities appropriate to its level */
export function autoAbilities(u: RosterUnit, rng: Rng, opts: { secondary?: boolean } = {}) {
  const j = getJob(u.job);
  if (j.monster) return;
  const budget = 150 + u.level * 55;
  const learn = (jobId: string, kinds: string[], limit: number) => {
    const jd = JOBS.get(jobId);
    if (!jd) return [];
    const list = jd.abilities.map((a) => ABILITIES.get(a)).filter((a) => a && kinds.includes(a.kind) && a.jp <= budget && a.special !== 'passive');
    const got: string[] = [];
    for (const a of rng.shuffle([...list])) {
      if (!a || got.length >= limit) break;
      if (a.consumes && !['potion', 'hiPotion', 'phoenixDown', 'ether', 'antidote', 'eyeDrop', 'remedy', 'xPotion'].includes(a.consumes)) continue;
      got.push(a.id);
    }
    return got;
  };
  const acts = learn(j.id, ['action'], 3 + Math.floor(u.level / 6));
  for (const a of acts) if (!u.learned.includes(a)) u.learned.push(a);
  // passive components (jump ranges, arithmancy) for their job
  for (const a of j.abilities) { const d = ABILITIES.get(a); if (d?.special === 'passive' && d.jp <= budget && rng.pct(60)) u.learned.push(a); }
  if (opts.secondary !== false && u.level >= 4 && !u.secondary && rng.pct(70)) {
    const cands = [...JOBS.values()].filter((jj) => jj.generic && !jj.monster && jj.id !== j.id && (!jj.gender || jj.gender === u.gender) && jj.abilities.length && (jj.requires ?? []).length <= (u.level > 20 ? 4 : u.level > 10 ? 2 : 1));
    if (cands.length) {
      const sec = rng.pick(cands);
      const sa = learn(sec.id, ['action'], 2 + Math.floor(u.level / 10));
      if (sa.length) { u.secondary = sec.id; for (const a of sa) if (!u.learned.includes(a)) u.learned.push(a); }
    }
  }
  const rsm = (kind: 'reaction' | 'support' | 'movement', pct: number) => {
    if (u[kind] || !rng.pct(pct)) return;
    const all = [...ABILITIES.values()].filter((a) => a.kind === kind && a.jp <= budget && a.jp > 0 && !['equipChange', 'jpBoost', 'expBoost', 'moveGetExp', 'moveGetJp', 'poach', 'train', 'moveFind', 'monsterTalk'].includes(a.id));
    if (!all.length) return;
    const a = rng.pick(all);
    u[kind] = a.id;
    if (!u.learned.includes(a.id)) u.learned.push(a.id);
  };
  rsm('reaction', 40 + u.level * 2);
  rsm('support', 25 + u.level * 2);
  rsm('movement', 15 + u.level * 2);
  // equip supports shouldn't be random nonsense for jobs that already equip everything
}

export interface DeployChoice { unit: RosterUnit; x: number; z: number }

export interface BattleSetup {
  battle: Battle;
  grid: MapGrid;
  /** roster units of enemies/guests created for this battle (for invite/crystal) */
  temp: RosterUnit[];
}

export function spawnRoster(sp: UnitSpawn, pl: number, tier: number, rng: Rng): RosterUnit {
  const level = resolveLevel(sp.level, pl);
  let r: RosterUnit;
  if (sp.char) {
    r = createCharacter(sp.char, level, rng, level);
    if (sp.job) {
      r.job = sp.job;
      const jj = getJob(sp.job);
      for (const a of jj.abilities) if (ABILITIES.get(a)?.kind === 'action' && !r.learned.includes(a)) r.learned.push(a);
    }
  } else {
    const jobId = sp.job ?? 'squire';
    const j = getJob(jobId);
    if (j.monster) {
      r = createMonster(jobId, level, rng);
    } else {
      const gender = sp.gender ?? (j.gender ? j.gender : rng.pct(50) ? 'm' : 'f');
      r = createGeneric({ gender, level, job: jobId, rng, brave: sp.brave, faith: sp.faith, zodiac: sp.zodiac });
      if (j.unique || !j.generic) for (const a of j.abilities) if (ABILITIES.get(a)?.kind === 'action') r.learned.push(a);
    }
  }
  if (sp.name) r.name = sp.name;
  if (sp.brave !== undefined) r.brave = sp.brave;
  if (sp.faith !== undefined) r.faith = sp.faith;
  if (sp.zodiac) r.zodiac = sp.zodiac;
  if (sp.equip) r.equip = { ...r.equip, ...sp.equip };
  if (sp.secondary) r.secondary = sp.secondary;
  for (const k of ['reaction', 'support', 'movement'] as const) { const v = sp[k]; if (v) { r[k] = v; if (!r.learned.includes(v)) r.learned.push(v); } }
  for (const a of sp.learned ?? []) if (!r.learned.includes(a)) r.learned.push(a);
  const j = getJob(r.job);
  if (!j.monster) {
    if (!sp.char || !CHARACTERS.get(sp.char)?.equip || Object.keys(r.equip).length < 2) autoEquip(r, tier, rng, !!sp.boss);
    if (!sp.char && !sp.learned) autoAbilities(r, rng);
    else if (sp.char && !r.secondary && !sp.secondary) {
      // named characters get a sensible secondary if they have none
    }
  }
  return r;
}

export function setupBattle(state: GameState, def: BattleDef, party: DeployChoice[], opts: { seed?: number; difficulty?: 'easy' | 'normal' | 'hard' } = {}): BattleSetup {
  const rng = new Rng(opts.seed ?? state.seed + state.battlesWon * 7919 + state.day);
  const grid = new MapGrid(mapDef(def.map));
  const diff = (opts as { difficulty?: string }).difficulty ?? loadOptions().difficulty ?? 'normal';
  const pl = Math.max(1, partyLevel(state) + (diff === 'easy' ? -3 : diff === 'hard' ? 1 : -1));
  const hpScale: number = diff === 'easy' ? 0.8 : diff === 'hard' ? 1.1 : 0.9;
  const units: BattleUnit[] = [];
  const temp: RosterUnit[] = [];
  for (const p of party) {
    const bu = new BattleUnit(p.unit, 0, true, p.unit.charId ?? p.unit.uid);
    bu.x = p.x; bu.z = p.z; bu.facing = faceTowardEnemies(def, p.x, p.z);
    units.push(bu);
  }
  for (const sp of def.units) {
    const r = spawnRoster(sp, pl, state.tier, rng);
    temp.push(r);
    const team = sp.team ?? 1;
    const bu = new BattleUnit(r, team, false, sp.id ?? sp.char ?? r.uid);
    bu.x = sp.at[0]; bu.z = sp.at[1];
    bu.facing = sp.facing ?? (team === 0 ? 'N' : 'S');
    bu.ai = sp.ai ?? (JOBS.get(r.job)?.id === 'chemist' || JOBS.get(r.job)?.id === 'priest' ? 'support' : 'aggressive');
    bu.boss = !!sp.boss;
    bu.vip = !!sp.vip;
    bu.noLoot = !!sp.noLoot || !!sp.char;
    bu.hidden = !!sp.hidden;
    if (sp.boss) for (const s of BOSS_IMMUNE) bu.immune.add(s);
    if (sp.hpMult || (hpScale !== 1 && team !== 0)) { bu.hpMult = (sp.hpMult ?? 1) * (team !== 0 ? hpScale : 1); bu.recompute(false); bu.hp = bu.maxHp; }
    for (const s of sp.statuses ?? []) bu.statuses.set(s, STATUS[s]?.ticks ?? 0);
    units.push(bu);
  }
  const inv = new Map<string, number>(Object.entries(state.inventory));
  const gil = { value: state.gil };
  const battle = new Battle({ def, grid, units, inventory: inv, seed: rng.int(1, 1e9), gentle: !!loadGentle(state), gil });
  battle.heroSid = 'rhen';
  return { battle, grid, temp };
}

function loadGentle(state: GameState) { return (state as any).__gentle ?? false; }

function faceTowardEnemies(def: BattleDef, x: number, z: number) {
  const foes = def.units.filter((u) => (u.team ?? 1) !== 0);
  if (!foes.length) return 'N' as const;
  const cx = foes.reduce((s, u) => s + u.at[0], 0) / foes.length;
  const cz = foes.reduce((s, u) => s + u.at[1], 0) / foes.length;
  return MapGrid.faceToward(x, z, Math.round(cx), Math.round(cz), 'N');
}

/** Apply battle results back to the game state (inventory, gil, brave/faith drift, crystals, invites). */
export function applyResults(state: GameState, b: Battle, setup: BattleSetup) {
  state.inventory = Object.fromEntries(b.inventory);
  state.gil = b.gil.value;
  const lostUids: string[] = [];
  for (const u of b.units) {
    if (u.baseTeam !== 0 || !u.controlled) continue;
    const r = u.roster;
    // permanent brave/faith drift: a quarter of the in-battle change
    r.brave = clamp(r.brave + Math.trunc((u.brave - u.startBrave) / 4), 1, 97);
    r.faith = clamp(r.faith + Math.trunc((u.faith - u.startFaith) / 4), 1, 97);
    if ((u.has('crystal') || u.has('treasure')) && !b.gentle && r.charId !== 'rhen') lostUids.push(r.uid);
  }
  state.roster = state.roster.filter((r) => !lostUids.includes(r.uid));
  for (const inv of b.invited) {
    const r = inv.roster;
    r.errand = undefined;
    if (!state.roster.some((x) => x.uid === r.uid)) state.roster.push(r);
  }
  for (const p of b.poached) state.furStock[p] = (state.furStock[p] ?? 0) + 1;
  // monsters in the company sometimes lay eggs after a victory
  if (b.result === 'victory') {
    const rng = new Rng(state.seed + state.day * 97 + state.battlesWon);
    const eggs: RosterUnit[] = [];
    for (const r of state.roster) {
      if (r.gender !== 'monster' || r.charId || state.roster.length + eggs.length >= 24) continue;
      const j = JOBS.get(r.job);
      if (!j || j.noEgg || !rng.pct(8)) continue;
      const baby = createMonster(r.job, Math.max(1, Math.floor(r.level * 0.6)), rng);
      eggs.push(baby);
    }
    state.roster.push(...eggs);
    (state as any).__eggs = eggs.map((e) => e.name);
  }
  void setup;
  return { lost: lostUids.length };
}

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

export function rosterJob(u: RosterUnit): JobDef { return getJob(u.job); }
