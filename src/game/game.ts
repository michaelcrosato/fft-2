// Top-level game orchestration: render loop, stage lifecycle, story steps,
// scenes, battles, deployment and results.
import { renderer, rinfo, refreshPixelRatio, setQuality, type Quality } from '../gfx/renderer';
import { THREE } from '../gfx/three';
import { Stage } from '../scenes/stage';
import { BattleController, preloadPortraits } from '../scenes/battleController';
import { runScene, type SceneHost } from '../scenes/cutscene';
import { UnitView, loadMonsterBuilder } from '../scenes/unitview';
import { BATTLES, SCENES, STORY, SIDE, CHARACTERS, JOBS, ITEMS, NODES, ABILITIES, CHRONICLE } from '../data/db';
import type { BattleDef, CharacterDef, Facing, JobDef, SceneDef, StoryStep, SideQuestStep, EnvTime, Weather } from '../data/types';
import { setupBattle, applyResults, type DeployChoice } from './setup';
import type { GameState, Options } from './state';
import { saveGame, joinCharacter, leaveCharacter, addItem, hero, loadOptions, partyLevel } from './state';
import type { RosterUnit } from './roster';
import { portrait } from '../gfx/portraits';
import { buildHumanoid } from '../gfx/models/humanoid';
import { fade, setFadeImmediate, menu, toast, confirm, titleCard } from '../ui/widgets';
import { h, uiRoot, sleep } from '../ui/dom';
import { input } from '../ui/input';
import { audio } from '../audio/audio';
import { BattleUnit } from '../battle/unit';
import { screenDir } from '../scenes/battleController';
import { Rng, hashStr } from '../core/rng';
import { randomLook } from './roster';
import { CameraControls } from '../ui/cameraControls';
import { backBtn, portraitFor } from '../ui/battleHud';

export interface Screen {
  update(dt: number): void;
  render(): void;
  resize?(w: number, h: number): void;
  dispose?(): void;
}

export class Game {
  state!: GameState;
  options: Options;
  screen: Screen | null = null;
  stage: Stage | null = null;
  private last = performance.now();
  private playStart = performance.now();
  /** registered by main: world map loop entry */
  worldMap: (() => Promise<void>) | null = null;
  titleScreen: (() => Promise<void>) | null = null;

  constructor() {
    this.options = loadOptions();
    renderer.setAnimationLoop(() => this.frame());
    window.addEventListener('resize', () => this.onResize());
    // the canvas can change size without a window resize (mobile toolbars, split view, rotation)
    const host = renderer.domElement.parentElement;
    if (host && typeof ResizeObserver === 'function') new ResizeObserver(() => this.onResize()).observe(host);
    this.watchDpr();
  }

  /** page zoom or a move to another monitor changes devicePixelRatio */
  private watchDpr() {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    mq.addEventListener?.('change', () => { refreshPixelRatio(); this.onResize(); this.watchDpr(); }, { once: true });
  }

  // automatic quality: if frames stay slow, step the preset down (only when the option is Auto)
  private perf = { t: 0, n: 0, slow: 0, steps: 0 };
  private autoQuality(rawDt: number) {
    if (this.options.quality !== 'auto' || this.perf.steps >= 2 || rawDt > 0.25 || document.hidden) return; // ignore loading hitches
    const p = this.perf;
    p.t += rawDt; p.n++;
    if (p.t < 4) return;
    const avg = p.t / p.n;
    p.t = 0; p.n = 0;
    p.slow = avg > 1 / 26 ? p.slow + 1 : 0;
    if (p.slow < 2) return; // ~8 s of sub-26 fps
    const order: Quality[] = ['ultra', 'high', 'medium', 'low'];
    const i = order.indexOf(rinfo.quality);
    if (i < 0 || i >= order.length - 1) { p.steps = 2; return; }
    p.slow = 0; p.steps++;
    setQuality(order[i + 1]);
    this.onResize();
    console.info(`[renderer] slow frames (${Math.round(1 / avg)} fps): quality → ${order[i + 1]}`);
  }

  private frame() {
    const now = performance.now();
    const rawDt = (now - this.last) / 1000;
    const dt = Math.min(0.05, rawDt);
    this.last = now;
    this.autoQuality(rawDt);
    if (this.state) this.state.playtime += dt;
    if (this.screen) { this.screen.update(dt); this.screen.render(); }
    (window as any).__frames = ((window as any).__frames ?? 0) + 1;
  }

  private onResize() {
    const el = renderer.domElement.parentElement!;
    renderer.setSize(el.clientWidth, el.clientHeight);
    this.screen?.resize?.(el.clientWidth, el.clientHeight);
  }

  setScreen(s: Screen | null) {
    if (this.screen && this.screen !== s) this.screen.dispose?.();
    this.screen = s;
    this.onResize();
  }

  // ============================================================ stages
  async makeStage(mapId: string, opts: { time?: EnvTime; weather?: Weather } = {}): Promise<Stage> {
    const st = new Stage(mapId, opts);
    await st.init();
    if (this.stage && this.stage !== st) { const old = this.stage; this.stage = null; if (this.screen === (old as unknown as Screen)) this.screen = null; old.dispose(); }
    this.stage = st;
    this.setScreen({
      update: (dt) => st.update(dt),
      render: () => st.render(),
      resize: (w, hh) => st.resize(w, hh),
      dispose: () => {},
    });
    return st;
  }

  disposeStage() {
    if (this.stage) { this.stage.dispose(); this.stage = null; }
    this.setScreen(null);
  }

  // ============================================================ actors
  private charSpec(id: string, opts: { job?: string; team?: number; name?: string } = {}, actorId?: string): { spec: ConstructorParameters<typeof UnitView>[0]; name: string; charId?: string } | null {
    const c: CharacterDef | undefined = CHARACTERS.get(id);
    if (c) {
      const jobId = opts.job ?? this.rosterFor(c.id)?.job ?? c.job;
      const job = JOBS.get(c.monster && jobId === c.job ? c.monster : jobId) ?? JOBS.get(c.job)!;
      const r = this.rosterFor(c.id);
      const eq = r?.equip ?? c.equip ?? {};
      return {
        spec: { job, look: c.look, gender: c.gender, weapon: eq.rhand ? ITEMS.get(eq.rhand) : null, shield: eq.lhand ? ITEMS.get(eq.lhand) : null, team: opts.team ?? 0 },
        name: c.id === 'rhen' ? this.state.heroName : c.name,
        charId: c.id,
      };
    }
    const j: JobDef | undefined = JOBS.get(id);
    if (!j) return null;
    // extras get a varied but stable appearance from their actor id
    const rng = new Rng(hashStr(actorId ?? id));
    const gender: 'm' | 'f' = j.gender ?? (rng.pct(35) ? 'f' : 'm');
    return { spec: { job: j, look: randomLook(gender, rng), gender, team: opts.team ?? 1 }, name: opts.name ?? j.name };
  }

  rosterFor(charId: string): RosterUnit | undefined { return this.state?.roster.find((r) => r.charId === charId); }

  // ============================================================ scenes
  async playScene(id: string | undefined, battleHooks?: SceneHost['battle']): Promise<void> {
    if (!id) return;
    const def: SceneDef | undefined = SCENES.get(id);
    if (!def) { console.warn('missing scene', id); return; }
    if (def.music) audio.playMusic(def.music, { fade: 1.5 });
    const actors = new Map<string, { view: UnitView; name: string; charId?: string; job?: string }>();
    const ensureStage = async (mapId: string | undefined, opts: { time?: EnvTime; weather?: Weather }) => {
      if (!mapId) {
        if (!this.stage) {
          // narration-only: black screen
          this.setScreen({ update: () => {}, render: () => { renderer.setClearColor(0x000000, 1); renderer.clear(); } });
        }
        return;
      }
      await fade('out', 0.4);
      actors.clear();
      await this.makeStage(mapId, opts);
      this.stage!.cam.snap(this.stage!.terrain.center, Math.max(this.stage!.grid.w, this.stage!.grid.d) * 2.2);
      await fade('in', 0.6);
    };
    if (def.map) await ensureStage(def.map, { time: def.time, weather: def.weather });
    else if (!this.stage) await ensureStage(undefined, {});
    const game = this;
    const host: SceneHost = {
      stage: () => game.stage!,
      changeMap: async (mapId, opts) => { await ensureStage(mapId, opts); },
      actor: (aid) => actors.get(aid)?.view ?? game.stage?.views.get(aid),
      spawn: (aid, who, x, z, facing, opts) => {
        if (!game.stage) return undefined;
        const s = game.charSpec(who, opts, aid);
        if (!s) { console.warn('unknown actor', who); return undefined; }
        game.stage.removeUnit(aid);
        const v = game.stage.addUnit(aid, s.spec, x, z, facing);
        v.marker.visible = false;
        if (opts.hidden) v.root.visible = false;
        actors.set(aid, { view: v, name: opts.name ?? s.name, charId: s.charId, job: opts.job });
        return v;
      },
      despawn: (aid) => { game.stage?.removeUnit(aid); actors.delete(aid); },
      nameOf: (aid) => {
        const a = actors.get(aid);
        if (a) return a.name;
        const c = CHARACTERS.get(aid);
        if (c) return c.id === 'rhen' ? game.state.heroName : c.name;
        return battleHooks ? (game.currentBattle?.bySid(aid)?.name ?? aid) : aid;
      },
      portraitOf: async (aid) => {
        const a = actors.get(aid);
        const charId = a?.charId ?? (CHARACTERS.has(aid) ? aid : undefined);
        const bu = game.currentBattle?.bySid(aid);
        if (charId) return game.charPortrait(charId, a?.job);
        if (bu) {
          return portraitFor(bu);
        }
        // generic actor: portrait from its job's outfit
        const v = a?.view;
        if (v) {
          const spec = v.spec;
          if (spec.job.monster) {
            const { getMonsterBuilder } = await import('../scenes/unitview');
            const mb = getMonsterBuilder();
            return mb ? portrait('job:' + spec.job.id, () => mb(spec.job.monster), '#5a4a3a') : null;
          }
          return portrait('actor:' + aid + ':' + spec.job.id, () => buildHumanoid({ job: spec.job.look, look: spec.look, gender: spec.gender === 'f' ? 'f' : 'm' }), spec.team === 1 ? '#6a3a30' : '#4a5a6a');
        }
        return null;
      },
      setFlag: (f, v) => { game.state.flags[f] = v; },
      getFlag: (f) => !!game.state.flags[f],
      join: (c) => { joinCharacter(game.state, c); toast(`${CHARACTERS.get(c)?.name ?? c} joins the party!`); audio.sfx('levelUp'); },
      leave: (c) => leaveCharacter(game.state, c),
      item: (i, n) => { addItem(game.state, i, n); toast(`Obtained ${ITEMS.get(i)?.name ?? i}${n > 1 ? ' ×' + n : ''}`); },
      gil: (n) => { game.state.gil = Math.max(0, game.state.gil + n); if (n > 0) toast(`Received ${n} gil`); },
      chronicle: (cid) => { if (!game.state.chronicle.includes(cid)) game.state.chronicle.push(cid); },
      heroName: () => game.state.heroName,
      battle: battleHooks,
    };
    await runScene(def.cmds, host);
  }

  async charPortrait(charId: string, job?: string): Promise<string | null> {
    const c = CHARACTERS.get(charId);
    if (!c) return null;
    const jid = job ?? this.rosterFor(charId)?.job ?? c.job;
    const j = JOBS.get(jid) ?? JOBS.get(c.job)!;
    const bg = c.color ?? '#4a5a6a';
    if (j.monster) {
      const { getMonsterBuilder } = await import('../scenes/unitview');
      const mb = getMonsterBuilder();
      if (mb) return portrait(charId + ':' + jid, () => mb(j.monster), bg);
      return null;
    }
    return portrait(charId + ':' + jid, () => buildHumanoid({ job: j.look, look: c.look, gender: c.gender === 'f' ? 'f' : 'm' }), bg);
  }

  // ============================================================ battles
  currentBattle: import('../battle/battle').Battle | null = null;

  /** Run a battle including deployment. Returns 'victory' | 'defeat' | 'retreat'. */
  async runBattle(battleId: string): Promise<'victory' | 'defeat'> {
    const def: BattleDef | undefined = BATTLES.get(battleId);
    if (!def) { console.warn('missing battle', battleId); return 'victory'; }
    await loadMonsterBuilder();
    for (;;) {
      // the engine writes EXP, JP, learned abilities and stolen/broken gear straight into the
      // roster; a lost attempt must not keep them (inventory and gil are only applied on victory)
      const snapshot = JSON.stringify(this.state.roster);
      const res = await this.battleOnce(def);
      if (res === 'victory') return res;
      this.state.roster = JSON.parse(snapshot);
      // defeat → game over prompt
      const retry = await this.gameOver();
      if (!retry) return 'defeat';
    }
  }

  private async battleOnce(def: BattleDef): Promise<'victory' | 'defeat'> {
    audio.playMusic('formation', { fade: 1 });
    const stage = this.stage && this.stage.def.id === def.map ? this.stage : await this.makeStage(def.map, { time: def.time, weather: def.weather });
    // remove scene actors
    for (const k of [...stage.views.keys()]) stage.removeUnit(k);
    // show enemies during deployment
    const pre = setupBattle(this.state, def, []);
    for (const u of pre.battle.units) if (!u.hidden) this.addBattleView(stage, u);
    const party = await this.deploy(stage, def, pre.battle);
    for (const k of [...stage.views.keys()]) stage.removeUnit(k);
    if (!party) return 'defeat';
    const setup = setupBattle(this.state, def, party);
    const b = setup.battle;
    (b as any).gentle = this.options.gentle;
    this.currentBattle = b;
    for (const u of b.units) { const v = this.addBattleView(stage, u); if (u.hidden) v.root.visible = false; }
    preloadPortraits(b);
    audio.playMusic(def.music ?? 'battle1', { fade: 1.2 });
    if (def.victory.type === 'reach' && stage.def.theme !== 'dungeon') stage.markGoal(def.victory.cells);
    const ctrl = new BattleController(stage, b, {
      runScript: async (index) => {
        const ev = def.events?.[index];
        if (!ev) { b.scriptDone(index); return; }
        const hooks: SceneHost['battle'] = {
          reveal: async (sid) => { const u = b.units.find((o) => o.sid === sid && o.hidden); if (!u) return; b.scriptReveal(sid); const v = stage.views.get(u.uid); if (v) { v.place(u.x, u.z, u.facing); v.root.visible = true; await stage.vfx.play('teleport', v.chest, v.root.position.clone(), '#ffffff'); } },
          retreat: async (sid) => { const u = b.bySid(sid); if (!u) return; b.scriptRetreat(sid); const v = stage.views.get(u.uid); if (v) { await stage.vfx.play('teleport', v.chest, v.root.position.clone(), '#c8c0ff'); v.root.visible = false; } },
          end: (r) => { b.forced = r; },
          heal: (sid) => {
            const list = sid === '*' || sid === 'party' ? b.units.filter((o) => o.baseTeam === 0 && !o.gone && !o.has('crystal') && !o.has('treasure')) : [b.bySid(sid)].filter((o): o is NonNullable<typeof o> => !!o);
            for (const u of list) { if (u.has('ko')) b.revive(u, 1); u.hp = u.maxHp; u.mp = u.maxMp; const v = stage.views.get(u.uid); if (v) { v.revive(); stage.vfx.play('healBig', v.chest, v.root.position.clone()); } }
          },
          status: (sid, s, on) => { const u = b.bySid(sid); if (!u) return; if (on) b.addStatus(u, s); else u.statuses.delete(s); },
        };
        // map battle unit sids to their views for the script
        try { await this.playBattleScript(ev.script, b, stage, hooks); } finally { b.scriptDone(index); }
        b.checkEnd();
      },
    });
    if ((window as any).__forceWin || (window as any).__quickWin) { (window as any).__forceWin = false; b.forced = 'victory'; b.checkEnd(); console.warn('[autoplay] forced victory in ' + def.id); }
    const result = await ctrl.run();
    ctrl.dispose();
    this.currentBattle = null;
    if (result === 'victory') {
      audio.playMusic('victory', { fade: 0.3, loop: false } as any);
      await this.victoryPose(stage, b);
      const { lost } = applyResults(this.state, b, setup);
      this.state.battlesWon++;
      this.state.flags[def.id] = true;
      if (def.rewards?.gil) this.state.gil += def.rewards.gil;
      for (const it of def.rewards?.items ?? []) addItem(this.state, it, 1);
      await this.resultsScreen(b, def, lost);
      for (const k of [...stage.views.keys()]) stage.removeUnit(k);
      return 'victory';
    }
    audio.playMusic('defeat', { fade: 0.5, loop: false } as any);
    await sleep(1500);
    return 'defeat';
  }

  private async playBattleScript(script: import('../data/types').SceneCmd[], b: import('../battle/battle').Battle, stage: Stage, hooks: SceneHost['battle']) {
    const game = this;
    // a retreat immediately followed by a reveal is a transformation: the new form appears where the old one stood
    const origReveal = hooks!.reveal, origRetreat = hooks!.retreat;
    let lastRetreat: { x: number; z: number; facing: Facing } | null = null;
    hooks = {
      ...hooks!,
      retreat: async (sid) => { const u = b.bySid(sid); if (u) lastRetreat = { x: u.x, z: u.z, facing: u.facing }; await origRetreat(sid); },
      reveal: async (sid) => {
        const u = b.units.find((o) => o.sid === sid && o.hidden);
        if (u && lastRetreat && !b.unitAt(lastRetreat.x, lastRetreat.z)) { u.x = lastRetreat.x; u.z = lastRetreat.z; u.facing = lastRetreat.facing; stage.post.flash('#ffffff', 0.5); stage.cam.shake(0.3, 0.6); }
        lastRetreat = null;
        await origReveal(sid);
      },
    };
    const host: SceneHost = {
      stage: () => stage,
      changeMap: async () => {},
      actor: (aid) => { const u = b.bySid(aid) ?? b.units.find((o) => o.roster.charId === aid); return u ? stage.views.get(u.uid) : undefined; },
      spawn: () => undefined,
      despawn: () => {},
      nameOf: (aid) => { const u = b.bySid(aid) ?? b.units.find((o) => o.roster.charId === aid); return u?.name ?? CHARACTERS.get(aid)?.name ?? aid; },
      portraitOf: async (aid) => {
        const u = b.bySid(aid) ?? b.units.find((o) => o.roster.charId === aid);
        if (u?.roster.charId) return game.charPortrait(u.roster.charId, u.roster.job);
        if (u) return portraitFor(u);
        return CHARACTERS.has(aid) ? game.charPortrait(aid) : null;
      },
      setFlag: (f, v) => { game.state.flags[f] = v; },
      getFlag: (f) => !!game.state.flags[f],
      join: (c) => joinCharacter(game.state, c),
      leave: (c) => leaveCharacter(game.state, c),
      item: (i, n) => addItem(game.state, i, n),
      gil: (n) => { game.state.gil += n; },
      chronicle: (cid) => { if (!game.state.chronicle.includes(cid)) game.state.chronicle.push(cid); },
      heroName: () => game.state.heroName,
      battle: hooks,
    };
    await runScene(script, host);
  }

  addBattleView(stage: Stage, u: BattleUnit): UnitView {
    const r = u.roster;
    const c = r.charId ? CHARACTERS.get(r.charId) : undefined;
    const look = c?.look ?? r.look;
    const v = stage.addUnit(u.uid, {
      job: u.job, look, gender: u.gender, weapon: u.weapon, weapon2: u.weapon2, shield: u.shield, team: u.team, guest: u.team === 0 && !u.controlled,
    }, u.x, u.z, u.facing);
    return v;
  }

  private async victoryPose(stage: Stage, b: import('../battle/battle').Battle) {
    for (const u of b.units) {
      const v = stage.views.get(u.uid);
      if (v && u.team === 0 && u.alive) v.anim.setBase('victory');
    }
    await titleCardQuick('Victory!');
    await sleep(900);
  }

  // ============================================================ deployment
  private async deploy(stage: Stage, def: BattleDef, preview: import('../battle/battle').Battle): Promise<DeployChoice[] | null> {
    const cells = (def.deploy ?? stage.def.deploy).filter(([x, z]) => stage.grid.cell(x, z)?.standable && !preview.unitAt(x, z));
    const max = Math.min(def.maxDeploy ?? 5, cells.length);
    const avail = this.state.roster.filter((r) => !r.errand);
    const heroU = hero(this.state);
    // default selection: hero + highest level others
    const forced = avail.filter((r) => r.charId && (def.forced ?? []).includes(r.charId));
    const chosen: RosterUnit[] = [heroU, ...forced.filter((r) => r !== heroU), ...avail.filter((r) => r !== heroU && !forced.includes(r) && !(def.units.some((u) => u.char && u.char === r.charId))).sort((a, b) => b.level - a.level)].slice(0, max);
    const placements = new Map<RosterUnit, [number, number]>();
    chosen.forEach((r, i) => placements.set(r, cells[i]));
    const views = new Map<RosterUnit, UnitView>();
    const refreshViews = () => {
      for (const [r, v] of views) { if (!placements.has(r)) { stage.removeUnit('dep:' + r.uid); views.delete(r); } }
      for (const [r, [x, z]] of placements) {
        let v = views.get(r);
        if (!v) {
          const bu = new BattleUnit(r, 0, true);
          v = stage.addUnit('dep:' + r.uid, { job: bu.job, look: r.charId ? CHARACTERS.get(r.charId)?.look ?? r.look : r.look, gender: r.gender, weapon: bu.weapon, weapon2: bu.weapon2, shield: bu.shield, team: 0 }, x, z, 'N');
          views.set(r, v);
        }
        v.place(x, z, 'N');
      }
    };
    refreshViews();
    stage.highlight('deploy', cells);
    stage.cam.snap(stage.tileWorld(cells[0][0], cells[0][1]), Math.max(stage.grid.w, stage.grid.d) * 2.1);
    if (def.hint) toast(def.hint, 4000);
    const briefing = h('div.panel', { style: { left: '50%', top: '10px', transform: 'translateX(-50%)', textAlign: 'center', padding: '6px 18px' } },
      h('h2', null, def.name), h('div.muted', null, victoryText(def)));
    uiRoot().appendChild(briefing);
    const camUi = new CameraControls(stage);
    let lastPick: string | undefined;
    try {
      for (;;) {
        if ((window as any).__autoBattle) break;
        const items = [
          ...avail.map((r) => ({ label: `${placements.has(r) ? '◆' : '◇'} ${r.name}`, value: 'u:' + r.uid, right: `${JOBS.get(r.job)?.name ?? r.job} Lv${r.level}`, disabled: r === heroU ? false : false })),
          { label: '', value: 'sep', sep: true },
          { label: 'Begin Battle', value: 'go' },
        ];
        const pick = await menu({ items, x: 14, y: '12%', title: `Deploy ${placements.size}/${max}`, maxHeight: 'calc(60 * var(--vh))', cancelable: false, initial: lastPick ?? 'go', onAction: (a) => stageKeys(stage, a) }).promise;
        lastPick = pick ?? undefined;
        if (pick === 'go') {
          if (!placements.has(heroU)) { toast(`${heroU.name} must lead the battle.`); continue; }
          break;
        }
        if (!pick || !pick.startsWith('u:')) continue;
        const r = avail.find((x) => 'u:' + x.uid === pick)!;
        if (placements.has(r)) {
          if (r === heroU) {
            // move the hero to another cell
            const cell = await this.pickDeployCell(stage, cells);
            if (cell) { const other = [...placements.entries()].find(([, c]) => c[0] === cell[0] && c[1] === cell[1]); if (other) placements.set(other[0], placements.get(r)!); placements.set(r, cell); }
          } else {
            const act = await menu({ items: [{ label: 'Reposition', value: 'pos' }, { label: 'Withdraw', value: 'out', disabled: forced.includes(r) ? 'Must fight in this battle' : false }], x: 260, y: '30%', title: r.name }).promise;
            if (act === 'out') placements.delete(r);
            if (act === 'pos') { const cell = await this.pickDeployCell(stage, cells); if (cell) { const other = [...placements.entries()].find(([, c]) => c[0] === cell[0] && c[1] === cell[1]); if (other) placements.set(other[0], placements.get(r)!); placements.set(r, cell); } }
          }
        } else {
          if (placements.size >= max) { toast(`Only ${max} may deploy.`); continue; }
          const free = cells.find((c) => ![...placements.values()].some((p) => p[0] === c[0] && p[1] === c[1]));
          if (free) placements.set(r, free);
        }
        refreshViews();
      }
    } finally {
      briefing.remove();
      camUi.dispose();
      stage.clearHighlight();
    }
    const out: DeployChoice[] = [...placements.entries()].map(([unit, [x, z]]) => ({ unit, x, z }));
    for (const r of views.keys()) stage.removeUnit('dep:' + r.uid);
    return out;
  }

  private pickDeployCell(stage: Stage, cells: Array<[number, number]>): Promise<[number, number] | null> {
    return new Promise((resolve) => {
      let i = 0;
      const set = () => { stage.setCursor(cells[i][0], cells[i][1]); stage.focusTile(cells[i][0], cells[i][1]); };
      set();
      const back = backBtn();
      uiRoot().appendChild(back);
      const el = renderer.domElement;
      const valid = new Set(cells.map((c) => c.join(',')));
      let downAt: { x: number; y: number } | null = null;
      const onDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY }; };
      const onUp = (e: PointerEvent) => {
        const moved = downAt ? Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) : 0;
        downAt = null;
        if (e.button !== 0 || moved > 10) return; // a drag moves the camera
        const c = stage.pickCell(e.clientX, e.clientY); if (c && valid.has(c.join(','))) { done(c); }
      };
      const pop = input.push((a) => {
        if (stageKeys(stage, a)) return true;
        if (a === 'up' || a === 'down' || a === 'left' || a === 'right') {
          const [dx, dz] = screenDir(stage.cam.yaw, a);
          const cur = cells[i];
          const cand = cells.map((c, k) => ({ k, d: (c[0] - cur[0]) * dx + (c[1] - cur[1]) * dz, off: Math.abs((c[0] - cur[0]) * dz) + Math.abs((c[1] - cur[1]) * dx) })).filter((c) => c.d > 0).sort((p, q) => p.d + p.off * 2 - (q.d + q.off * 2));
          if (cand.length) { i = cand[0].k; set(); audio.sfx('cursor', { volume: 0.4 }); }
          return true;
        }
        if (a === 'confirm') { done(cells[i]); return true; }
        if (a === 'cancel') { done(null); return true; }
        return true;
      });
      function done(c: [number, number] | null) { pop(); back.remove(); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointerdown', onDown); stage.hideCursor(); resolve(c); }
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointerup', onUp);
    });
  }

  // ============================================================ results & game over
  private async resultsScreen(b: import('../battle/battle').Battle, def: BattleDef, lost: number) {
    const party = b.units.filter((u) => u.baseTeam === 0 && u.controlled);
    const rows = party.map((u) => h('div.kv', null, h('span', null, `${u.name}${u.levelUps ? ` — Lv ${u.level} ▲` : ''}`), h('span', null, `EXP +${u.expGained} · JP +${u.jpGained}`)));
    const loot = [...b.loot, ...(def.rewards?.items ?? [])].map((i) => ITEMS.get(i)?.name ?? i);
    const learned = party.flatMap((u) => u.crystalLearned.map((a) => `${u.name}: ${ABILITIES.get(a)?.name ?? a}`));
    const panel = h('div.panel', { style: { left: '50%', top: '50%', transform: 'translate(-50%,-50%)', minWidth: '420px', maxWidth: '92vw' } },
      h('div.title-plate', null, 'Spoils of Battle'),
      h('h2', null, def.name),
      ...rows,
      h('div', { style: { height: '8px' } }),
      h('div.kv', null, h('span', null, 'Gil'), h('span.gold-text', null, `+${(def.rewards?.gil ?? 0) + b.lootGil}`)),
      loot.length ? h('div.kv', null, h('span', null, 'Items'), h('span', null, loot.join(', '))) : null,
      learned.length ? h('div.muted', null, 'Crystals: ' + learned.join('; ')) : null,
      b.invited.length ? h('div.good', null, `Joined: ${b.invited.map((u) => u.name).join(', ')}`) : null,
      b.poached.length ? h('div.muted', null, `Poached: ${b.poached.map((i) => ITEMS.get(i)?.name ?? i).join(', ')}`) : null,
      lost ? h('div.bad', null, `${lost} ${lost === 1 ? 'soul was' : 'souls were'} lost to the crystals.`) : null,
      (this.state as any).__eggs?.length ? h('div.good', null, `An egg hatched: a young ${(this.state as any).__eggs.join(', ')} joins the company!`) : null,
      h('div', { style: { textAlign: 'center', marginTop: '10px' } }, h('span.btn', null, 'Continue')),
    );
    uiRoot().appendChild(panel);
    if ((window as any).__autoPlay) { await sleep(600); panel.remove(); return; }
    await new Promise<void>((resolve) => { const pop = input.push((a) => { if (a === 'confirm' || a === 'cancel') { pop(); resolve(); } return true; }); panel.addEventListener('click', () => { pop(); resolve(); }); });
    panel.remove();
  }

  private async gameOver(): Promise<boolean> {
    if ((window as any).__autoPlay) {
      const w = window as any;
      w.__defeats = (w.__defeats ?? 0) + 1;
      console.warn('[autoplay] defeat #' + w.__defeats);
      if (w.__defeats % 3 === 0) { w.__forceWin = true; }
      return true;
    }
    await titleCard('Your Tale Ends Here', 'The chronicle falls silent…', 1600);
    const pick = await menu({ items: [{ label: 'Retry the battle', value: 'retry' }, { label: 'Return to title', value: 'title' }], x: '42%', y: '45%', title: 'Game Over', cancelable: false }).promise;
    return pick === 'retry';
  }

  // ============================================================ story
  currentStep(): StoryStep | undefined { return STORY[this.state.storyIndex]; }

  /** run the current story step (assumes the party is at step.at) */
  async runStep(step: StoryStep): Promise<boolean> {
    if (step.chapter !== undefined) this.state.chapter = Math.max(this.state.chapter, step.chapter);
    await this.playScene(step.pre);
    if (step.battle) {
      const r = await this.runBattle(step.battle);
      if (r === 'defeat') return false;
      this.state.flags[step.battle] = true;
    }
    await this.playScene(step.post);
    for (const f of step.flags ?? []) this.state.flags[f] = true;
    for (const n of step.unlock ?? []) if (!this.state.unlocked.includes(n)) this.state.unlocked.push(n);
    for (const c of step.join ?? []) joinCharacter(this.state, c);
    if (step.tier) this.state.tier = Math.max(this.state.tier, step.tier);
    if (step.moveTo) this.state.location = step.moveTo;
    else if (step.at) this.state.location = step.at;
    if (CHRONICLE.has(step.battle ?? '') && !this.state.chronicle.includes(step.battle!)) this.state.chronicle.push(step.battle!);
    this.state.flags[step.id] = true;
    this.state.storyIndex++;
    this.applyFlagEffects();
    return true;
  }

  /** consequences of flags that need engine changes (e.g. Rhosyn becoming human) */
  applyFlagEffects() {
    const s = this.state;
    if (s.flags.sq_nevel) {
      const r = s.roster.find((u) => u.charId === 'rhosyn');
      if (r && r.gender === 'monster' && JOBS.has('dragonKin')) {
        r.gender = 'f'; r.job = 'dragonKin';
        for (const a of JOBS.get('dragonKin')!.abilities) if (ABILITIES.get(a)?.kind === 'action' && !r.learned.includes(a)) r.learned.push(a);
      }
    }
    if (s.flags.learn_twelvefold) {
      for (const u of s.roster) if (u.job === 'summoner' && !u.learned.includes('twelvefold') && ABILITIES.has('twelvefold')) u.learned.push('twelvefold');
    }
  }

  /** run story steps that chain immediately (no `at`, or chain flag) */
  async runChainedSteps(): Promise<boolean> {
    for (;;) {
      const st = this.currentStep();
      if (!st) return true;
      if (st.at && st.at !== this.state.location) return true;
      if (st.at && st.at === this.state.location && !(this as any).__autoRunAtLocation) return true;
      const ok = await this.runStep(st);
      if (!ok) return false;
      this.autosave();
    }
  }

  sideStepsAt(node: string): SideQuestStep[] {
    const s = this.state;
    return SIDE.filter((q) => q.at === node && !s.sideDone.includes(q.id) &&
      q.needs.every((f) => !!s.flags[f]) &&
      (q.chapterMin === undefined || s.chapter >= q.chapterMin) && (q.chapterMax === undefined || s.chapter <= q.chapterMax) &&
      (q.needChar ?? []).every((c) => s.roster.some((r) => r.charId === c)));
  }

  async runSide(q: SideQuestStep): Promise<boolean> {
    await this.playScene(q.pre);
    if (q.battle) {
      const r = await this.runBattle(q.battle);
      if (r === 'defeat') return false;
    }
    await this.playScene(q.post);
    for (const f of q.flags) this.state.flags[f] = true;
    for (const n of q.unlock ?? []) if (!this.state.unlocked.includes(n)) this.state.unlocked.push(n);
    if (!q.repeat) this.state.sideDone.push(q.id);
    this.applyFlagEffects();
    this.autosave();
    return true;
  }

  autosave() { saveGame(this.state, 7); }
}

function victoryText(def: BattleDef): string {
  const v = def.victory;
  switch (v.type) {
    case 'defeatAll': return 'Victory: defeat all enemies';
    case 'defeat': return `Victory: defeat ${v.ids.join(', ')}`;
    case 'defeatAny': return `Victory: defeat ${v.ids.join(' or ')}`;
    case 'survive': return `Victory: survive ${v.turns} turns`;
    case 'reach': return 'Victory: reach the objective';
  }
}

function stageKeys(stage: Stage, a: import('../ui/input').Action): boolean {
  return stage.cameraAction(a);
}

async function titleCardQuick(text: string) {
  const el = h('div.banner', { style: { top: '40%', fontSize: '2.2em', padding: '10px 60px' } }, text);
  uiRoot().appendChild(el);
  audio.sfx('victory');
  await sleep(1400);
  el.remove();
}

export type { Facing };
void THREE; void rinfo; void confirm; void setFadeImmediate; void NODES; void partyLevel;
