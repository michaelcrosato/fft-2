// 52in1 sessions (AI Hub Session Protocol v1, tools/hub/README.md). The session client in the page's
// head sets window.AIHub; in a session the game skips the title, menus and story and opens straight
// into the round the hub deals:
// - parallel: a Trial (src/data/battles/trials.ts), the same short battle for every player; the
//   quickest victory wins, and foes defeated rank the rest;
// - moments: one Moment (src/data/battles/moments.ts), a one-turn puzzle cleared or failed in seconds.
import type { Game } from './game';
import type { Battle } from '../battle/battle';
import type { BattleUnit } from '../battle/unit';
import { TRIALS } from '../data/battles/trials';
import { MOMENTS, type MomentDef } from '../data/battles/moments';
import { presetBattle, presetMoment, type PresetBattle } from './trial';
import { loadOptions, saveOptions } from './state';
import { BattleController } from '../scenes/battleController';
import { audio } from '../audio/audio';
import { gameClock } from '../core/gameClock';
import { input } from '../ui/input';
import { h, uiRoot } from '../ui/dom';
import { setGameMenuVisible } from '../ui/gameMenu';
import { dir, fmtNum, t } from '../i18n';

export interface HubInfo {
  me: number;
  players: Array<{ id: number; name: string; color: string }>;
  mode: string;
  round: number;
  limitMs: number;
  seed: number;
  moment?: string;
}

interface AIHubApi {
  active: boolean;
  connect(opts: { mode: string[]; seats: [number, number] }): Promise<HubInfo | null>;
  ready(): void;
  time(): number;
  rng(label: string): () => number;
  on(type: string, fn: (...args: never[]) => void): () => void;
  progress(p: { score: number; label?: string }): void;
  result(outcome: Record<string, unknown>): void;
  fail(message: string): void;
}

const hub = (): AIHubApi | null => (typeof window !== 'undefined' ? ((window as unknown as { AIHub?: AIHubApi }).AIHub ?? null) : null);

let joining: Promise<HubInfo | null> | null = null;
/**
 * Join the round, first thing at boot: the client says hello until the hub answers (or gives up
 * after ten seconds and the game plays as it does on its own). Null outside a session.
 */
export function joinSession(): Promise<HubInfo | null> {
  const api = hub();
  if (!api?.active) return Promise.resolve(null);
  return (joining ??= api.connect({ mode: ['parallel', 'moments'], seats: [1, 4] }).catch(() => null));
}

/** The game cannot run here (no renderer): the hub sits this player out. */
export function failSession(message: string) {
  const api = hub();
  if (api?.active) api.fail(message);
}

/** A moment's goal line: session.moment.<id with underscores>. */
export const momentLine = (id: string) => `session.moment.${id.replace(/-/g, '_')}`;

/** Play the round the hub dealt, report it, and stay on its last frame until the hub removes the game. */
export async function runSession(game: Game, info: HubInfo) {
  const api = hub()!;
  let over = false;
  let frozen = false;
  const freezers: Array<() => void> = [];
  let still = false;
  // nothing moves and no input lands: the battle's clock stops under a cover that takes every touch
  const standStill = () => {
    if (still) return;
    still = true;
    gameClock.pause();
    input.push(() => true);
    uiRoot().appendChild(h('div.session-freeze', { style: { position: 'fixed', inset: '0', zIndex: '9000' } }));
  };
  // `end`: no input, no sound, nothing sent; the hub shows its results over the game
  const freeze = () => {
    if (frozen) return;
    frozen = true;
    freezers.forEach((f) => f());
    standStill();
    audio.dispose();
  };
  api.on('end', freeze);

  // the round's own settings (the client gave the game a storage of its own): quicker battles
  const o = loadOptions();
  o.battleSpeed = 1.5;
  saveOptions(o);
  game.options = o;

  const moment: MomentDef | null = info.mode === 'moments' ? (MOMENTS.find((m) => m.id === info.moment) ?? MOMENTS[0]) : null;
  const preset: PresetBattle = moment ?? TRIALS[Math.floor(api.rng('deal')() * TRIALS.length) % TRIALS.length];
  const seed = Math.floor(api.rng(moment ? moment.id : 'battle')() * 2 ** 32);
  const def = preset.battle;
  const stage = await game.makeStage(def.map, { time: def.time, weather: def.weather });
  const { setup } = moment ? presetMoment(moment, seed) : presetBattle(preset, seed);
  const b = setup.battle;
  for (const u of b.units) {
    const v = game.addBattleView(stage, u);
    if (u.hidden) v.root.visible = false;
    if (u.has('treasure')) v.becomeCrystal('chest');
  }
  if (moment?.cells) stage.markGoal(moment.cells);
  else if (def.victory.type === 'reach') stage.markGoal(def.victory.cells);
  audio.playMusic(def.music ?? 'battle1', { fade: 1.2 });

  const goal = moment ? t(momentLine(moment.id)) : t('session.trial_goal');
  const card = sessionCard(def.name, goal);
  await game.present();
  setGameMenuVisible(true);
  api.ready();

  // the countdown, on the hub's clock: play begins on every device at once
  await new Promise<void>((resolve) => {
    const step = () => {
      if (frozen) return resolve();
      const now = api.time();
      card.count(now === -Infinity ? null : now < 0 ? Math.ceil(-now / 1000) : 0);
      if (now >= 0) return resolve();
      requestAnimationFrame(step);
    };
    step();
  });
  setTimeout(() => card.close(), 900);
  if (frozen) return;

  const time = () => Math.max(0, Math.round(api.time()));
  const foes = b.units.filter((u) => u.baseTeam !== 0 && !u.hidden && u.active);
  const startHp = new Map(foes.map((u) => [u.uid, u.hp]));
  const down = (u: BattleUnit) => !u.active || u.gone;
  const report = (outcome: Record<string, unknown>, banner: string) => {
    if (over) return;
    over = true;
    api.result(outcome);
    // the player's round is over: the field stands still under the result until the hub ends it
    card.result(banner);
    standStill();
  };

  let turns = 0;
  let sessionTurns = 0;
  const hooks = {
    runScript: async (index: number) => { b.scriptDone(index); },
    onTurn: (u: BattleUnit) => {
      sessionTurns++;
      if (u.baseTeam === 0 && u.controlled) turns++;
      // a moment's turn has passed without clearing it
      if (moment && moment.kind !== 'defend' && sessionTurns > 1 && !momentCleared(moment, b)) lose();
    },
  };

  // ---------------------------------------------------------------- Trials
  const trialScore = () => {
    const downed = foes.filter(down).length;
    const removed = foes.reduce((s, u) => s + (down(u) ? startHp.get(u.uid)! : Math.max(0, startHp.get(u.uid)! - u.hp)), 0);
    return { downed, removed, score: downed * 10000 + removed };
  };
  const trialStats = () => {
    const { downed, removed } = trialScore();
    const allies = b.units.filter((u) => u.baseTeam === 0 && u.controlled && u.active && !u.gone).length;
    return {
      [t('session.stat.turns')]: fmtNum(turns),
      [t('session.stat.foes')]: t('session.stat.foes_value', { count: fmtNum(downed), total: fmtNum(foes.length) }),
      [t('session.stat.damage')]: fmtNum(removed),
      [t('session.stat.allies')]: fmtNum(allies),
    };
  };
  const trialProgress = () => {
    if (over || moment) return;
    const { downed, score } = trialScore();
    api.progress({ score, label: t('session.progress', { count: fmtNum(downed), total: fmtNum(foes.length) }) });
  };
  const progressTimer = setInterval(trialProgress, 1000);
  freezers.push(() => clearInterval(progressTimer));

  // ---------------------------------------------------------------- Moments
  function win() { if (moment) report({ won: true, time: time() }, t('session.cleared')); }
  function lose() { if (moment) report({ won: false, time: time() }, t('session.failed')); }
  const watch = setInterval(() => {
    if (over || !moment) return;
    if (momentCleared(moment, b)) win();
    else if (b.result === 'defeat') lose();
  }, 100);
  freezers.push(() => clearInterval(watch));

  api.on('time-up', () => {
    if (over) return;
    if (moment) {
      // a moment to defend is cleared by lasting; any other is failed by running out of time
      if (moment.kind === 'defend' && b.result !== 'defeat') win();
      else lose();
    } else report({ score: trialScore().score, stats: trialStats() }, t('session.time_up'));
  });

  const ctrl = new BattleController(stage, b, hooks);
  trialProgress();
  const result = await ctrl.run();
  if (moment) {
    if (result === 'victory' || momentCleared(moment, b)) win();
    else lose();
  } else if (result === 'victory') report({ time: time(), stats: trialStats() }, t('game.victory_banner'));
  else report({ score: trialScore().score, stats: trialStats() }, t('session.defeated'));
}

/** True once the moment's goal is met. */
export function momentCleared(m: MomentDef, b: Battle): boolean {
  if (m.kind === 'defeat') { const t = b.bySid(m.target!); return !t || !t.active || t.gone; }
  if (m.kind === 'defend') return false;
  const u = b.bySid(m.first);
  return !!u && (m.cells ?? []).some(([x, z]) => u.x === x && u.z === z);
}

/** The round's card over the field: the battle's name and goal, the countdown, then the result. */
function sessionCard(name: string, goal: string) {
  const count = h('div', { style: { fontFamily: 'Cinzel, serif', fontSize: 'min(18vw, 140px)', fontWeight: '700', color: '#f4dc98', lineHeight: '1', minHeight: '1em' } }, '');
  const status = h('div', { style: { fontSize: 'min(4.5vw, 22px)', color: '#efe3c6', marginTop: '10px' } }, t('session.waiting'));
  const root = h('div.session-card', {
    dir,
    role: 'status',
    style: { position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none', textShadow: '0 3px 12px #000, 0 0 30px rgba(0,0,0,.7)', zIndex: '40', padding: '16px' },
  },
    h('div', { style: { fontFamily: 'Cinzel, serif', fontSize: 'min(6vw, 34px)', color: '#f4dc98', letterSpacing: '0.06em' } }, name),
    h('div', { style: { fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 'min(4.6vw, 24px)', color: '#efe3c6', margin: '6px 0 18px', maxWidth: '36em' } }, goal),
    count, status,
  );
  uiRoot().appendChild(root);
  let last: number | null | undefined;
  return {
    count(n: number | null) {
      if (n === last) return;
      last = n;
      if (n === null) { count.textContent = ''; status.textContent = t('session.waiting'); return; }
      status.textContent = '';
      count.textContent = n > 0 ? fmtNum(n) : t('session.go');
      if (n > 0) audio.sfx('cursor'); else audio.sfx('confirm');
    },
    close() { root.style.transition = 'opacity .4s'; root.style.opacity = '0'; setTimeout(() => { if (!root.dataset.result) root.remove(); }, 450); },
    result(text: string) {
      root.dataset.result = '1';
      root.style.transition = ''; root.style.opacity = '1';
      root.replaceChildren(h('div', { style: { fontFamily: 'Cinzel, serif', fontSize: 'min(12vw, 84px)', fontWeight: '700', color: '#f4dc98' } }, text));
      if (!root.isConnected) uiRoot().appendChild(root);
    },
  };
}
