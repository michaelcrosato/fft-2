// Online versus (52in1 shared-world versus 2): two players, each on their own device, command the two
// sides of one battle in lockstep. Every copy, the host's and a server's included, runs the same
// deterministic battle from the hub's seed; on each unit's turn only the copy whose player owns that
// side acts, and it sends what it did (a move, an action, a facing) to the others, which play it back.
// Each turn comes with a hash of the field as it began; the host's turns also bring that field, so a copy
// that drifted takes the host's before it plays the turn. A copy waiting for a turn says so in its beat
// (every second), and the copy that played it sends it again: the relay drops what a tab misses while its
// connection is down. The host reports the standings with AIHub.finish when the battle ends, a player
// leaves, or time is up.
import type { Game } from './game';
import type { Battle } from '../battle/battle';
import type { BattleUnit } from '../battle/unit';
import type { AiPlan } from '../battle/ai';
import type { Facing } from '../data/types';
import { ABILITIES } from '../data/db';
import { presetBattle } from './trial';
import { versusPreset } from './versus';
import { TRIALS } from '../data/battles/trials';
import { BattleController } from '../scenes/battleController';
import { audio } from '../audio/audio';
import { h, uiRoot } from '../ui/dom';
import { dir, t } from '../i18n';

/** What a copy sends: a beat every second (with the turn it waits for, if any), and each turn it plays,
 *  with the hash of the field as the turn began (and, from the host, that field). */
export type Wire =
  | { k: 'beat'; n: number; want: number }
  | { k: 'turn'; n: number; plan: WirePlan; s: string; units?: WireUnit[] };
export interface WirePlan {
  mv?: [number, number];
  act?: { id: string; x: number; z: number; item?: string; calc?: { attr: string; div: string; spell: string } };
  actFirst?: boolean;
  f?: Facing;
}
export interface WireUnit { i: number; hp: number; mp: number; x: number; z: number; ct: number; facing: Facing; team: number; gone: boolean; statuses: Array<[string, number]> }

export interface OnlineHub {
  me: number;
  host: number;
  isHost: boolean;
  players: Array<{ id: number; name: string; color: string }>;
  server?: boolean;
  send(data: unknown, opts?: { to?: number; reliable?: boolean }): boolean;
  on(type: string, fn: (...args: never[]) => void): () => void;
  finish(outcome: Record<string, unknown>): void;
  rng(label: string): () => number;
}

/** The field in a few characters: where everyone stands and how they fare. Equal on every copy in step. */
export function fieldHash(b: Battle): string {
  let h = 2166136261;
  const mix = (n: number) => { h ^= n & 0xffff; h = Math.imul(h, 16777619); h ^= n >>> 16; h = Math.imul(h, 16777619); };
  // units by their place in the battle, not their ids (a page counts ids from its first unit)
  for (const [i, u] of b.units.entries()) {
    mix(i); mix(u.hp); mix(u.mp); mix(u.x * 64 + u.z); mix(u.team); mix(u.gone ? 1 : 0); mix(Math.round(u.ct * 16)); mix(u.facing.charCodeAt(0));
    for (const [s, n] of u.statuses) { for (let i = 0; i < s.length; i++) mix(s.charCodeAt(i)); mix(n); }
  }
  return (h >>> 0).toString(36);
}

/** Records what the local player's units do in a turn, at the engine's three doors. */
export function recordTurns(b: Battle, isLocal: (u: BattleUnit) => boolean, sent: (plan: WirePlan) => void) {
  let unit: BattleUnit | null = null;
  let plan: WirePlan = {};
  const doMove = b.doMove.bind(b), doAction = b.doAction.bind(b), endTurn = b.endTurn.bind(b);
  const flush = () => { if (unit) { const p = plan; unit = null; plan = {}; sent(p); } };
  b.doMove = (u, x, z) => {
    const ev = doMove(u, x, z);
    if (u === unit) { plan.mv = [x, z]; if (b.result) flush(); }
    return ev;
  };
  b.doAction = (u, a, x, z, opts = {}) => {
    const ev = doAction(u, a, x, z, opts);
    if (u === unit) {
      plan.act = { id: a.id, x, z, ...(opts.item ? { item: opts.item } : {}), ...(opts.calc ? { calc: opts.calc } : {}) };
      if (!plan.mv) plan.actFirst = true;
      if (b.result) flush();
    }
    return ev;
  };
  b.endTurn = (u, facing) => {
    if (u === unit) plan.f = facing;
    const ev = endTurn(u, facing);
    if (u === unit) flush();
    return ev;
  };
  return {
    /** Send a turn of ours that ended some other way than the engine's doors. */
    flush,
    /** A turn begins: record it when it is one of ours. */
    begin(u: BattleUnit) { flush(); if (isLocal(u)) { unit = u; plan = {}; } },
  };
}

/** A plan from the wire as the engine takes it. */
export function planOf(u: BattleUnit, w: WirePlan): AiPlan {
  const ability = w.act ? ABILITIES.get(w.act.id) : undefined;
  return {
    move: w.mv,
    act: w.act && ability ? { ability, x: w.act.x, z: w.act.z, opts: { ...(w.act.item ? { item: w.act.item } : {}), ...(w.act.calc ? { calc: w.act.calc } : {}) } } : undefined,
    actFirst: w.actFirst,
    facing: w.f ?? u.facing,
    score: 0,
  };
}

/** Seat 0 (red in 52in1) leads the red company (side 1), seat 1 (blue) the blue one (side 0): the same
 *  swap both ways. */
export const seatOf = (side: number) => (side === 0 ? 1 : 0);
export const sideOfSeat = seatOf;
/** Which company a unit fights for: 0 blue (the engine's team 0), 1 red. */
export const sideOf = (u: BattleUnit) => (u.baseTeam === 0 ? 0 : 1);

/** Each side's score: foes downed first, then damage dealt. */
export function sideScore(b: Battle, side: number): number {
  return b.units.filter((u) => sideOf(u) !== side).reduce((s, u) => s + (!u.active || u.gone ? 10000 : 0) + Math.max(0, u.maxHp - u.hp), 0);
}

/** AIHub.finish's outcome: the winning side first, or else the higher score; a tie shares the place. */
export function standingsFor(b: Battle, seatIds: number[], winner: number | null) {
  const idOf = (side: number) => seatIds[seatOf(side)];
  const sides = [0, 1].filter((side) => idOf(side) !== undefined);
  const scores = Object.fromEntries(sides.map((side) => [idOf(side), sideScore(b, side)]));
  const order = winner !== null ? [winner, 1 - winner] : [0, 1].sort((x, y) => sideScore(b, y) - sideScore(b, x));
  const ids = order.map(idOf).filter((id): id is number => id !== undefined);
  const standings = winner === null && sideScore(b, 0) === sideScore(b, 1) ? [ids] : ids.map((id) => [id]);
  return { standings, scores };
}

/** The side that wins when the player in `seatIds` with id `left` goes: the one still there. */
export function winnerOnLeave(seatIds: number[], left: number): number | null {
  const seat = seatIds.indexOf(left);
  return seat < 0 ? null : sideOfSeat(1 - seat);
}

export function snapshot(b: Battle): WireUnit[] {
  return b.units.map((u, i) => ({ i, hp: u.hp, mp: u.mp, x: u.x, z: u.z, ct: u.ct, facing: u.facing, team: u.team, gone: u.gone, statuses: [...u.statuses] }));
}
export function applySnapshot(b: Battle, units: WireUnit[]) {
  for (const s of units) {
    const u = b.units[s.i];
    if (!u) continue;
    u.hp = s.hp; u.mp = s.mp; u.x = s.x; u.z = s.z; u.ct = s.ct; u.facing = s.facing; u.team = s.team; u.gone = s.gone;
    u.statuses = new Map(s.statuses as Array<[never, number]>);
  }
}

/** The round's card over the field (session.ts draws it): the countdown, then the result. */
export interface RoundCard { count(n: number | null): void; close(): void; result(text: string): void }
export interface OnlineUi {
  /** The round's card over the field, as the other session rounds have it. */
  card(name: string, goal: string): RoundCard;
  /** Everything is loaded: tell the hub. */
  ready(): void;
  /** The countdown on the hub's clock; false when the round ended before play began. */
  countdown(card: RoundCard): Promise<boolean>;
  /** The player's round is over: the field stands still under the result. */
  stop(): void;
  /** Called when the hub ends the round. */
  onEnd(fn: () => void): void;
}

/** Run the round: one battle field, both players' companies, until the hub ends it. */
export async function onlineVersus(game: Game, hub: OnlineHub, ui: OnlineUi) {
  const players = hub.players.slice(0, 2);
  const seatIds = players.map((p) => p.id);
  // each side follows its player's colour in 52in1 (seatOf)
  const mySeat = seatIds.indexOf(hub.me);
  const mySide = mySeat < 0 ? -1 : sideOfSeat(mySeat);
  const field = Math.floor(hub.rng('deal')() * TRIALS.length) % TRIALS.length;
  const preset = versusPreset(field);
  const def = preset.battle;
  const stage = await game.makeStage(def.map, { time: def.time, weather: def.weather });
  const { setup } = presetBattle(preset, Math.floor(hub.rng('battle')() * 2 ** 32));
  const b = setup.battle;
  for (const u of b.units) u.controlled = true;
  for (const u of b.units) game.addBattleView(stage, u);
  audio.playMusic(def.music ?? 'battle1', { fade: 1.2 });
  const mine = (u: BattleUnit) => mySide >= 0 && sideOf(u) === mySide;
  const debug = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);

  // the wire: turns are numbered alike on every copy, since every copy runs the same battle
  let n = 0;
  let taken = 0; // the last turn played back here
  let started = { s: '', units: undefined as WireUnit[] | undefined };
  const arrived = new Map<number, Extract<Wire, { k: 'turn' }>>();
  const waiting = new Map<number, (w: Extract<Wire, { k: 'turn' }> | null) => void>();
  const sentLog = new Map<number, Wire>();
  let over = false;
  const send = (w: Wire, to?: number) => { if (!over) hub.send(w, to === undefined ? undefined : { to }); };
  hub.on('message', ((data: Wire, from: number) => {
    if (!data || typeof data !== 'object') return;
    if (data.k === 'turn') {
      if (data.n <= taken) return; // sent again, and already played
      const wait = waiting.get(data.n);
      if (wait) { waiting.delete(data.n); wait(data); } else arrived.set(data.n, data);
    } else if (data.k === 'beat' && data.want > 0) {
      // a copy missed a turn this one played: send it again
      const again = sentLog.get(data.want);
      if (again) send(again, from);
    }
  }) as never);
  const beat = setInterval(() => send({ k: 'beat', n, want: waiting.size ? Math.min(...waiting.keys()) : 0 }), 1000);
  const recorder = recordTurns(b, mine, (plan) => {
    const w: Wire = { k: 'turn', n, plan, s: started.s, ...(started.units ? { units: started.units } : {}) };
    sentLog.set(n, w);
    sentLog.delete(n - 40);
    send(w);
  });
  /** A turn from the wire, played on this copy from the field it began on: the host's, when they differ. */
  let mended = 0;
  const starts = new Map<number, string>();
  const take = (u: BattleUnit, w: Extract<Wire, { k: 'turn' }>): AiPlan => {
    taken = w.n;
    if (w.units && w.s !== fieldHash(b)) { applySnapshot(b, w.units); ctrl.syncAll(); mended++; }
    return planOf(u, w.plan);
  };

  // a waiting line while the other player decides
  const note = h('div.online-wait', { dir, role: 'status', style: { position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', padding: '6px 14px', borderRadius: '6px', background: 'rgba(20,14,8,.78)', color: '#f4dc98', fontFamily: 'EB Garamond, serif', fontSize: 'min(4.2vw, 19px)', pointerEvents: 'none', display: 'none', zIndex: '30' } });
  uiRoot().appendChild(note);
  const waitFor = (u: BattleUnit) => { const p = players[seatOf(sideOf(u))]; note.textContent = t('online.waiting', { name: p?.name ?? '' }); note.style.display = ''; };

  const ctrl = new BattleController(stage, b, {
    runScript: async (index) => { b.scriptDone(index); },
    onTurn: (u) => {
      recorder.flush(); // under the last turn's number, with the field it began on
      n++;
      // the field as this turn begins, sent with it when it is ours (the host's whole field, to mend a drift)
      if (mine(u)) started = { s: fieldHash(b), units: hub.isHost ? snapshot(b) : undefined };
      if (debug) starts.set(n, fieldHash(b));
      recorder.begin(u);
      note.style.display = 'none';
    },
    human: mine,
    planFor: (u) => {
      if (mine(u)) return null;
      waitFor(u);
      const ready = arrived.get(n);
      if (ready) { arrived.delete(n); return Promise.resolve(take(u, ready)); }
      return new Promise<AiPlan | null>((resolve) => waiting.set(n, (w) => resolve(w ? take(u, w) : null)));
    },
  });

  // on a local test server the harness's scripts can compare the copies' fields, turn by turn
  if (debug) (window as unknown as { __online?: unknown }).__online = { turn: () => n, hash: () => fieldHash(b), side: mySide, starts, mended: () => mended };

  let card: RoundCard | null = null;
  /** The round is over here: the result on the card when there is a winner (a battle won, a player gone). */
  const finish = (winner: number | null) => {
    if (over) return;
    over = true;
    clearInterval(beat);
    note.style.display = 'none';
    for (const wait of waiting.values()) wait(null);
    if (card && winner !== null) card.result(mySide < 0 ? t('online.winner', { name: players[seatOf(winner)]?.name ?? '' }) : t(mySide === winner ? 'online.won' : 'online.lost'));
    if (hub.isHost) hub.finish(standingsFor(b, seatIds, winner));
  };
  hub.on('time-up', () => finish(b.result ? (b.result === 'victory' ? 0 : 1) : null));
  hub.on('leave', ((e: { id: number }) => { const w = winnerOnLeave(seatIds, e.id); if (w !== null) finish(w); }) as never);
  ui.onEnd(() => { over = true; clearInterval(beat); note.style.display = 'none'; for (const wait of waiting.values()) wait(null); });

  card = ui.card(def.name, mySide < 0 ? t('online.goal_server') : t(mySide === 0 ? 'online.goal_blue' : 'online.goal_red'));
  await game.present();
  ui.ready();
  if (!(await ui.countdown(card)) || over) return; // a player gone during the countdown: the card keeps the result
  const result = await ctrl.run();
  finish(result === 'victory' ? 0 : 1);
  ui.stop();
}
