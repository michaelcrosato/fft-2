// Drives a Battle: player turns (menus, tile picking, facing), AI turns, and
// animates the engine's event stream on the Stage.
import type { Battle, BEvent, HitInfo, ActionOpts } from '../battle/battle';
import type { BattleUnit } from '../battle/unit';
import type { AbilityDef, Facing, AnimKind } from '../data/types';
import { ABILITIES, ITEMS, JOBS } from '../data/db';
import { planTurn } from '../battle/ai';
import { MapGrid, FACINGS } from '../battle/grid';
import { STATUS } from '../battle/status';
import type { Stage } from './stage';
import { UnitView } from './unitview';
import { BattleHud, portraitFor } from '../ui/battleHud';
import { menu, banner, floater, confirm, toast, type MenuItem } from '../ui/widgets';
import { input, type Action } from '../ui/input';
import { renderer } from '../gfx/renderer';
import { audio } from '../audio/audio';
import { throwables } from '../battle/specials';
import type { ClipName } from '../gfx/models/anim';
import { THREE } from '../gfx/three';
import { h, uiRoot } from '../ui/dom';
import { loadOptions } from '../game/state';

const ANIM_MAP: Partial<Record<AnimKind, ClipName>> = {
  swing: 'swing', thrust: 'thrust', shoot: 'bow', bow: 'bow', gun: 'gun', cast: 'cast', pray: 'pray', punch: 'punch', kick: 'kick',
  throw: 'throw', item: 'item', jump: 'jump', dance: 'dance', sing: 'sing', talk: 'talk', steal: 'steal', charge: 'charge',
  draw: 'draw', summon: 'summon', roar: 'roar', breath: 'breath', bite: 'bite', claw: 'claw', spin: 'spin', guard: 'guard', none: 'none',
};

const SFX_FOR_VFX: Record<string, string> = {
  slash: 'swing', sword: 'swing', impact: 'hit', punch: 'hit', pierce: 'hit', arrow: 'arrow', bullet: 'gun', stone: 'throw', shuriken: 'throw',
  flames: 'fire', inferno: 'fire', ice: 'ice', glacier: 'ice', blizzard: 'ice', bolt: 'bolt', thunder: 'thunderclap', water: 'water', quake: 'earth', sand: 'earth',
  wind: 'wind', holy: 'holy', dark: 'dark', drain: 'dark', gravity: 'dark', poison: 'poison', meteor: 'meteor', flare: 'explosion', explosion: 'explosion', ultima: 'explosion',
  breath: 'fire', beam: 'magic', lava: 'fire', ivy: 'earth', heal: 'heal', healBig: 'heal', revive: 'heal', phoenix: 'heal', potion: 'item', elixir: 'heal',
  buff: 'buff', buffRed: 'buff', buffBlue: 'buff', guard: 'buff', debuff: 'debuff', status: 'status', time: 'time', teleport: 'time', steal: 'steal',
  song: 'song', dance: 'dance', talk: 'magic', summon: 'summon', glyph: 'magic', sparkleGreen: 'heal', jumpImpact: 'hitHeavy',
};

export interface ControllerHooks {
  runScript(index: number): Promise<void>;
}

export class BattleController {
  readonly stage: Stage;
  readonly b: Battle;
  readonly hud: BattleHud;
  private hooks: ControllerHooks;
  private auras = new Map<number, () => void>();
  private speed = 1;
  private autoAll = false;

  constructor(stage: Stage, b: Battle, hooks: ControllerHooks) {
    this.stage = stage;
    this.b = b;
    this.hooks = hooks;
    this.hud = new BattleHud();
    this.speed = loadOptions().battleSpeed;
  }

  view(uid: number) { return this.stage.views.get(uid); }
  private wait(ms: number) { return new Promise<void>((r) => setTimeout(r, ms / (this.speed * (input.fast ? 3 : 1)))); }

  // ================================================================ main loop
  async run(): Promise<'victory' | 'defeat'> {
    this.syncAll();
    // opening events (start triggers)
    this.b.fireEvents();
    const start = this.b.events.splice(0);
    await this.playEvents(start);
    let guard = 0;
    while (!this.b.result && guard++ < 100000) {
      const { events, unit } = this.b.advance();
      await this.playEvents(events);
      if (this.b.result) break;
      if (!unit) continue;
      this.hud.turnList(this.b);
      const forcedAi = unit.has('confuse') || unit.has('berserk') || unit.has('charm') || unit.has('chicken') || unit.has('vampire');
      if (unit.controlled && unit.team === 0 && !forcedAi && !this.autoAll && !(window as any).__autoBattle) await this.playerTurn(unit);
      else await this.aiTurn(unit);
      this.syncAll();
    }
    this.hud.card(null, 'a'); this.hud.card(null, 'b'); this.hud.helpText(''); this.hud.clearPreview();
    this.stage.clearHighlight(); this.stage.hideCursor();
    return this.b.result ?? 'defeat';
  }

  // ================================================================ sync visuals with engine state
  syncAll() {
    for (const u of this.b.units) {
      const v = this.view(u.uid);
      if (!v) continue;
      if (u.gone && !u.has('crystal') && !u.has('treasure')) { v.root.visible = false; continue; }
      if (u.hidden) { v.root.visible = false; continue; }
      if (u.jumping) continue;
      v.root.visible = true;
      if (u.alive) {
        if (v.anim.baseClip === 'dead') v.revive();
        const perf = u.performing ? (u.performing.anim === 'dance' ? 'dance' : 'sing') : null;
        const want: ClipName = u.has('petrify') || u.has('stop') ? 'none' : u.charging ? (perf ?? (u.charging.ability.anim === 'charge' ? 'charge' : 'cast')) : u.has('sleep') ? 'crouch' : u.critical ? 'kneel' : u.has('defending') ? 'guard' : 'idle';
        v.anim.setBase(want);
        v.anim.hover = u.has('float') ? 0.28 : (v.model as any).hover ? 0.25 : 0;
      }
      // tints & status badges
      v.setTint(u.has('petrify') ? '#9a9a9a' : u.has('stop') ? '#8ab0ff' : u.has('frog') ? '#7ad06a' : u.has('undead') && !u.job.monster ? '#b8c8a8' : u.has('invisible') ? '#d8d8ff' : null);
      const icons = u.alive ? [...u.statuses.keys()].filter((s) => !STATUS[s].hidden && !['critical', 'charging', 'performing', 'jumping', 'defending'].includes(s) && !u.always.has(s)).map((s) => STATUS[s].icon) : [];
      v.setBadges(icons);
      if (!u.charging && this.auras.has(u.uid)) { this.auras.get(u.uid)!(); this.auras.delete(u.uid); this.stage.unmarkCharge(u.uid); }
      if (v.team !== u.team) v.setTeam(u.team, u.team === 0 && !u.controlled);
    }
  }

  // ================================================================ player turn
  private async playerTurn(u: BattleUnit) {
    const v = this.view(u.uid)!;
    this.stage.focusTile(u.x, u.z);
    this.hud.card(u, 'a', this.b);
    audio.sfx('turn');
    const startX = u.x, startZ = u.z;
    for (;;) {
      if (this.b.result) return;
      this.hud.card(u, 'a', this.b);
      this.hud.helpText('<kbd>↑↓</kbd> choose · <kbd>Enter</kbd> confirm · <kbd>Q</kbd>/<kbd>E</kbd> rotate · <kbd>Tab</kbd> turn order');
      const items: MenuItem<string>[] = [
        { label: 'Move', value: 'move', disabled: u.moved || !u.canMove, icon: '➤' },
        { label: 'Act', value: 'act', disabled: u.acted || !u.canAct, icon: '⚔' },
        { label: 'Wait', value: 'wait', icon: '⌛' },
        { label: 'Status', value: 'status', icon: '☰' },
        { label: 'Auto-Battle', value: 'auto', icon: '⚙' },
      ];
      const m = menu({ items, x: 14, y: '46%', title: u.name, cancelable: true, onAction: (a) => this.globalKeys(a) });
      const choice = await m.promise;
      if (choice === null) {
        // undo move if nothing else done
        if (u.moved && !u.acted && (u.x !== startX || u.z !== startZ) && loadOptions().confirmMoves) {
          // FFT doesn't allow undo; we allow a free look instead
        }
        await this.freeLook(u);
        continue;
      }
      if (choice === 'move') {
        const cells = this.b.moveRange(u);
        const dest = await this.pickTile({ cells: cells.map((c) => [c.x, c.z] as [number, number]), kind: 'move', from: u, help: 'Choose a destination' });
        this.stage.clearHighlight();
        if (!dest) continue;
        const ev = this.b.doMove(u, dest[0], dest[1]);
        await this.playEvents(ev);
        this.hud.card(u, 'a', this.b);
        if (u.acted) break;
        continue;
      }
      if (choice === 'act') {
        const done = await this.actMenu(u);
        if (done) { this.syncAll(); if (u.moved || !u.canMove || this.b.result) break; }
        continue;
      }
      if (choice === 'wait') break;
      if (choice === 'status') { await this.statusView(u); continue; }
      if (choice === 'auto') {
        const all = await confirm('Let this unit act on its own for the rest of the battle?', 'This unit', 'Cancel');
        if (all) { u.controlled = false; u.ai = 'aggressive'; await this.aiTurn(u); return; }
        continue;
      }
    }
    if (this.b.result) return;
    const facing = await this.pickFacing(u);
    const ev = this.b.endTurn(u, facing);
    await this.playEvents(ev);
    this.hud.clearPreview();
    this.hud.card(null, 'b');
  }

  private globalKeys(a: Action): boolean {
    switch (a) {
      case 'rotL': this.stage.cam.rotate(-1); return true;
      case 'rotR': this.stage.cam.rotate(1); return true;
      case 'tilt': this.stage.cam.togglePitch(); return true;
      case 'zoomIn': this.stage.cam.zoom(0.85); return true;
      case 'zoomOut': this.stage.cam.zoom(1.18); return true;
      case 'turnList': this.hud.showAT = !this.hud.showAT; this.hud.turnList(this.b); return true;
      default: return false;
    }
  }

  /** returns true if an action was performed */
  private async actMenu(u: BattleUnit): Promise<boolean> {
    const groups = this.b.commandGroups(u);
    for (;;) {
      const g = await menu({
        items: groups.map((gr) => ({ label: gr.name, value: gr.id, disabled: gr.abilities.length === 0 ? 'Nothing learned' : false })),
        x: 14, y: '46%', title: 'Act', onAction: (a) => this.globalKeys(a),
      }).promise;
      if (g === null) return false;
      const grp = groups.find((x) => x.id === g)!;
      let ability: AbilityDef | null;
      if (grp.abilities.length === 1 && (grp.id === 'attack' || grp.id === 'defend')) ability = grp.abilities[0];
      else {
        const pick = await menu({
          items: grp.abilities.map((a) => {
            const reason = this.b.unusableReason(u, a);
            const mp = this.b.mpCost(u, a);
            const stock = a.consumes ? ` ×${this.b.inventory.get(a.consumes) ?? 0}` : '';
            return { label: a.name, value: a.id, disabled: reason ?? false, right: mp ? `${mp} MP` : stock || (a.ct ? `CT ${this.b.chargeTicks(u, a)}` : ''), desc: a.desc };
          }),
          x: 14, y: '30%', title: grp.name, showDesc: true, maxHeight: '48vh', onAction: (a) => this.globalKeys(a),
        }).promise;
        if (pick === null) continue;
        ability = ABILITIES.get(pick) ?? null;
      }
      if (!ability) continue;
      const opts: ActionOpts = {};
      // sub-choices
      if (ability.special === 'throw') {
        const list = throwables(this.b, String(ability.params?.cat ?? 'shuriken'));
        const it = await menu({ items: list.map((id) => ({ label: ITEMS.get(id)?.name ?? id, value: id, right: `WP ${ITEMS.get(id)?.wp ?? 0} ×${this.b.inventory.get(id)}` })), x: 14, y: '30%', title: 'Throw' }).promise;
        if (!it) continue;
        opts.item = it;
      }
      if (ability.special === 'calc') {
        const c = await this.calcMenu(u);
        if (!c) continue;
        opts.calc = c;
      }
      const ok = await this.targetAndAct(u, ability, opts);
      if (ok) return true;
    }
  }

  private async calcMenu(u: BattleUnit): Promise<ActionOpts['calc'] | null> {
    const learned = (p: string) => u.roster.learned.filter((id) => id.startsWith(p)).map((id) => ABILITIES.get(id)!).filter(Boolean);
    const attr = await menu({ items: learned('calcAttr').map((a) => ({ label: a.name, value: String(a.params?.value) })), x: 14, y: '30%', title: 'Attribute' }).promise;
    if (!attr) return null;
    const div = await menu({ items: learned('calcDiv').map((a) => ({ label: a.name, value: String(a.params?.value) })), x: 14, y: '30%', title: 'Divisor' }).promise;
    if (!div) return null;
    const spells = u.roster.learned.map((id) => ABILITIES.get(id)).filter((a): a is AbilityDef => !!a && !!a.calc);
    const sp = await menu({ items: spells.map((a) => ({ label: a.name, value: a.id, desc: a.desc })), x: 14, y: '30%', title: 'Spell', showDesc: true, maxHeight: '48vh' }).promise;
    if (!sp) return null;
    return { attr, div, spell: sp };
  }

  private async targetAndAct(u: BattleUnit, a: AbilityDef, opts: ActionOpts): Promise<boolean> {
    let cells: Array<[number, number]>;
    if (opts.calc) cells = [[u.x, u.z]];
    else cells = this.b.targetCells(u, a).map((c) => [c.x, c.z] as [number, number]);
    if (!cells.length) { toast('No valid targets'); return false; }
    const selfOnly = a.shape === 'self' || a.range === 0 && (a.aoe ?? 1) <= 1 || a.shape === 'all' || a.shape === 'allAllies' || a.shape === 'allEnemies' || !!opts.calc;
    const pickOpts = {
      cells, kind: 'target' as const, from: u, help: `${a.name}: choose a target`,
      hover: (x: number, z: number) => {
        const aoe = opts.calc ? this.b.calcTargets(u, opts.calc).map((t) => [t.x, t.z] as [number, number]) : this.b.aoeCells(u, a, x, z).map((c) => [c.x, c.z] as [number, number]);
        this.stage.highlight('aoe', aoe);
        const prev = this.b.previewAction(u, a, x, z, opts);
        this.hud.preview(this.b, u, opts.calc?.spell ?? a.id, prev);
        const t = this.b.unitAt(x, z);
        this.hud.card(t && t !== u ? t : null, 'b', this.b);
      },
    };
    let target: [number, number] | null;
    if (selfOnly && cells.length === 1) {
      pickOpts.hover(cells[0][0], cells[0][1]);
      target = (await this.confirmHere(`Use ${a.name}?`)) ? cells[0] : null;
    } else target = await this.pickTile(pickOpts);
    this.stage.clearHighlight(); this.hud.clearPreview(); this.hud.card(null, 'b');
    if (!target) return false;
    const ev = this.b.doAction(u, a, target[0], target[1], opts);
    await this.playEvents(ev);
    return true;
  }

  private async confirmHere(text: string): Promise<boolean> {
    const r = await menu({ items: [{ label: 'Execute', value: true }, { label: 'Cancel', value: false }], x: 14, y: '46%', title: text }).promise;
    return !!r;
  }

  // ================================================================ tile picking
  pickTile(o: { cells: Array<[number, number]>; kind: 'move' | 'target' | 'deploy'; from?: BattleUnit; help?: string; hover?: (x: number, z: number) => void; allowAny?: boolean }): Promise<[number, number] | null> {
    const st = this.stage;
    st.highlight(o.kind, o.cells);
    const valid = new Set(o.cells.map(([x, z]) => x + ',' + z));
    let cx = o.from?.x ?? o.cells[0][0], cz = o.from?.z ?? o.cells[0][1];
    if (!valid.has(cx + ',' + cz) && o.cells.length) [cx, cz] = o.cells[0];
    const el = renderer.domElement;
    this.hud.helpText(`${o.help ?? ''} · <kbd>Enter</kbd>/click confirm · <kbd>Esc</kbd>/right-click back`);
    return new Promise((resolve) => {
      const update = () => {
        st.setCursor(cx, cz);
        st.focusTile(cx, cz);
        this.hud.tileInfo(st.grid.cell(cx, cz) ?? null);
        if (valid.has(cx + ',' + cz)) o.hover?.(cx, cz);
        else { st.clearHighlight('aoe'); this.hud.clearPreview(); }
        const t = this.b.unitAt(cx, cz);
        if (!o.hover) this.hud.card(t && t !== o.from ? t : null, 'b', this.b);
        if (o.kind === 'move') {
          const path = valid.has(cx + ',' + cz) && o.from ? this.b.pathFor(o.from, cx, cz) : [];
          st.highlight('path', path, 'pathLine');
        }
      };
      const finish = (r: [number, number] | null) => {
        pop();
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointerdown', onDown);
        st.clearHighlight(o.kind); st.clearHighlight('pathLine'); st.clearHighlight('aoe');
        st.hideCursor();
        this.hud.tileInfo(null);
        resolve(r);
      };
      const tryConfirm = () => {
        if (!valid.has(cx + ',' + cz)) { audio.sfx('error'); return; }
        audio.sfx('confirm');
        finish([cx, cz]);
      };
      const pop = input.push((a) => {
        if (this.globalKeys(a)) return true;
        const dirKey = a === 'up' || a === 'down' || a === 'left' || a === 'right' ? a : null;
        if (dirKey) {
          const [dx, dz] = screenDir(this.stage.cam.yaw, dirKey);
          const nx = cx + dx, nz = cz + dz;
          if (st.grid.cell(nx, nz)) { cx = nx; cz = nz; audio.sfx('cursor', { volume: 0.4 }); update(); }
          return true;
        }
        if (a === 'confirm') { tryConfirm(); return true; }
        if (a === 'cancel') { audio.sfx('cancel'); finish(null); return true; }
        return true;
      });
      let downAt: { x: number; y: number; t: number } | null = null;
      let lastTap = '';
      const onDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; if (e.button === 2) { audio.sfx('cancel'); finish(null); } };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        const c = st.pickCell(e.clientX, e.clientY);
        if (c && (c[0] !== cx || c[1] !== cz)) { cx = c[0]; cz = c[1]; st.setCursor(cx, cz); this.hud.tileInfo(st.grid.cell(cx, cz) ?? null); if (valid.has(cx + ',' + cz)) o.hover?.(cx, cz); else { st.clearHighlight('aoe'); this.hud.clearPreview(); } if (o.kind === 'move' && o.from) st.highlight('path', valid.has(cx + ',' + cz) ? this.b.pathFor(o.from, cx, cz) : [], 'pathLine'); if (!o.hover) { const t = this.b.unitAt(cx, cz); this.hud.card(t && t !== o.from ? t : null, 'b', this.b); } }
      };
      const onUp = (e: PointerEvent) => {
        if (!downAt || e.button !== 0) return;
        const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
        downAt = null;
        if (moved > 10) return; // drag = camera
        const c = st.pickCell(e.clientX, e.clientY);
        if (!c) return;
        const key = c[0] + ',' + c[1];
        if (e.pointerType === 'touch' && key !== lastTap) { lastTap = key; cx = c[0]; cz = c[1]; update(); return; }
        cx = c[0]; cz = c[1];
        update();
        tryConfirm();
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointerdown', onDown);
      update();
    });
  }

  pickFacing(u: BattleUnit): Promise<Facing> {
    const v = this.view(u.uid)!;
    let f = u.facing;
    // arrow tiles around the unit
    const around = FACINGS.map((d) => { const [dx, dz] = d === 'N' ? [0, -1] : d === 'S' ? [0, 1] : d === 'E' ? [1, 0] : [-1, 0]; return { d, x: u.x + dx, z: u.z + dz }; }).filter((c) => this.stage.grid.cell(c.x, c.z));
    this.stage.highlight('move', around.map((c) => [c.x, c.z] as [number, number]), 'facing');
    this.hud.helpText('Choose facing · <kbd>←↑→↓</kbd> or click · <kbd>Enter</kbd> end turn');
    const el = renderer.domElement;
    return new Promise((resolve) => {
      const set = (d: Facing) => { f = d; v.face(d); };
      const finish = () => { pop(); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointermove', onMove); this.stage.clearHighlight('facing'); this.hud.helpText(''); audio.sfx('confirm'); resolve(f); };
      const pop = input.push((a) => {
        if (this.globalKeys(a)) return true;
        if (a === 'up' || a === 'down' || a === 'left' || a === 'right') {
          const [dx, dz] = screenDir(this.stage.cam.yaw, a);
          set(dx > 0 ? 'E' : dx < 0 ? 'W' : dz > 0 ? 'S' : 'N');
          audio.sfx('cursor', { volume: 0.4 });
          return true;
        }
        if (a === 'confirm' || a === 'cancel') { finish(); return true; }
        return true;
      });
      const dirAt = (e: PointerEvent): Facing | null => {
        const c = this.stage.pickCell(e.clientX, e.clientY);
        if (!c) return null;
        if (c[0] === u.x && c[1] === u.z) return null;
        return MapGrid.faceToward(u.x, u.z, c[0], c[1], f);
      };
      const onMove = (e: PointerEvent) => { if (e.pointerType === 'touch') return; const d = dirAt(e); if (d && d !== f) set(d); };
      const onUp = (e: PointerEvent) => { if (e.button !== 0) return; const d = dirAt(e); if (d) { set(d); } finish(); };
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointermove', onMove);
    });
  }

  /** look around the map (cancel from main menu) */
  private async freeLook(u: BattleUnit) {
    const cells: Array<[number, number]> = this.stage.grid.cells.filter((c) => !c.hole).map((c) => [c.x, c.z]);
    this.stage.clearHighlight();
    await new Promise<void>((resolve) => {
      let cx = u.x, cz = u.z;
      const upd = () => {
        this.stage.setCursor(cx, cz); this.stage.focusTile(cx, cz);
        const t = this.b.unitAt(cx, cz);
        this.hud.card(t && t !== u ? t : null, 'b', this.b);
        this.hud.tileInfo(this.stage.grid.cell(cx, cz) ?? null);
        if (t && t.alive && t !== u) this.stage.highlight(t.team === u.team ? 'move' : 'enemyMove', this.b.moveRange(t).map((c) => [c.x, c.z] as [number, number]), 'look');
        else this.stage.clearHighlight('look');
      };
      this.hud.helpText('Survey the field · <kbd>Esc</kbd> return');
      const el = renderer.domElement;
      const onMove = (e: PointerEvent) => { const c = this.stage.pickCell(e.clientX, e.clientY); if (c && (c[0] !== cx || c[1] !== cz)) { cx = c[0]; cz = c[1]; upd(); } };
      const pop = input.push((a) => {
        if (this.globalKeys(a)) return true;
        if (a === 'up' || a === 'down' || a === 'left' || a === 'right') { const [dx, dz] = screenDir(this.stage.cam.yaw, a); if (this.stage.grid.cell(cx + dx, cz + dz)) { cx += dx; cz += dz; upd(); } return true; }
        if (a === 'cancel' || a === 'confirm') { pop(); el.removeEventListener('pointermove', onMove); this.stage.clearHighlight(); this.stage.hideCursor(); this.hud.card(null, 'b'); this.hud.tileInfo(null); this.stage.focusTile(u.x, u.z); resolve(); return true; }
        return true;
      });
      el.addEventListener('pointermove', onMove);
      upd();
      void cells;
    });
  }

  private async statusView(u: BattleUnit) {
    const card = this.hud.unitCard(u, this.b);
    const r = u.roster;
    const extra = h('div', { style: { fontSize: '0.85em', marginTop: '6px' } },
      h('div.kv', null, h('span', null, 'Speed / PA / MA'), h('span', null, `${u.speed} / ${u.pa} / ${u.ma}`)),
      h('div.kv', null, h('span', null, 'Weapon'), h('span', null, u.weapon ? `${u.weapon.name} (WP ${u.weapon.wp ?? 0})` : 'Bare hands')),
      h('div.kv', null, h('span', null, 'Secondary'), h('span', null, r.secondary ? JOBS.get(r.secondary)?.skillset.name ?? '-' : '-')),
      h('div.kv', null, h('span', null, 'Reaction'), h('span', null, u.reactionAbility()?.name ?? '-')),
      h('div.kv', null, h('span', null, 'Support'), h('span', null, u.supportAbility()?.name ?? '-')),
      h('div.kv', null, h('span', null, 'Movement'), h('span', null, u.movementAbility()?.name ?? '-')),
    );
    card.appendChild(h('div', { style: { gridColumn: '1 / span 2' } }, extra));
    card.style.left = '50%'; card.style.top = '50%'; card.style.transform = 'translate(-50%, -50%)';
    uiRoot().appendChild(card);
    await new Promise<void>((resolve) => { const pop = input.push((a) => { if (a === 'confirm' || a === 'cancel') { pop(); card.removeEventListener('click', cl); resolve(); } return true; }); const cl = () => input.dispatch('cancel'); card.addEventListener('click', cl); });
    card.remove();
  }

  // ================================================================ AI turn
  private async aiTurn(u: BattleUnit) {
    this.stage.focusTile(u.x, u.z);
    this.hud.card(u, 'a', this.b);
    await this.wait(250);
    const plan = planTurn(this.b, u);
    const doMove = async () => {
      if (!plan.move || u.moved) return;
      this.stage.highlight(u.team === 0 ? 'move' : 'enemyMove', this.b.moveRange(u).map((c) => [c.x, c.z] as [number, number]));
      await this.wait(380);
      this.stage.clearHighlight();
      const ev = this.b.doMove(u, plan.move[0], plan.move[1]);
      await this.playEvents(ev);
    };
    const doAct = async () => {
      if (!plan.act || this.b.result || u.acted || !u.alive) return;
      const a = plan.act.ability;
      const cells = plan.act.opts?.calc ? this.b.calcTargets(u, plan.act.opts.calc).map((t) => [t.x, t.z] as [number, number]) : this.b.aoeCells(u, a, plan.act.x, plan.act.z).map((c) => [c.x, c.z] as [number, number]);
      this.stage.highlight('aoe', cells);
      this.stage.focusTile(plan.act.x, plan.act.z);
      await this.wait(420);
      this.stage.clearHighlight();
      const ev = this.b.doAction(u, a, plan.act.x, plan.act.z, plan.act.opts);
      await this.playEvents(ev);
    };
    if (plan.actFirst) { await doAct(); await doMove(); } else { await doMove(); await doAct(); }
    if (this.b.result) return;
    const ev = this.b.endTurn(u, plan.facing);
    await this.playEvents(ev);
    await this.wait(120);
  }

  // ================================================================ event playback
  async playEvents(events: BEvent[]) {
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.t === 'act') {
        // pair with the following hits event
        let hits: Extract<BEvent, { t: 'hits' }> | undefined;
        for (let j = i + 1; j < events.length; j++) {
          const n = events[j];
          if (n.t === 'hits' && n.src === e.uid) { hits = n; events.splice(j, 1); break; }
          if (n.t === 'act') break;
        }
        await this.playAct(e, hits);
        continue;
      }
      await this.playOne(e);
    }
    this.syncAll();
    this.hud.turnList(this.b);
  }

  private async playOne(e: BEvent) {
    const st = this.stage;
    switch (e.t) {
      case 'turn': return;
      case 'move': {
        const v = this.view(e.uid);
        if (!v) return;
        if (e.teleport) { st.vfx.play('teleport', v.chest, v.root.position.clone(), '#b8a0ff'); await v.blinkTo(e.path[e.path.length - 1][0], e.path[e.path.length - 1][1]); return; }
        st.focusTile(e.path[e.path.length - 1][0], e.path[e.path.length - 1][1]);
        await v.walk(e.path, this.speed * (input.fast ? 2 : 1));
        return;
      }
      case 'face': this.view(e.uid)?.face(e.dir); return;
      case 'charge': {
        const u = this.b.unit(e.uid); const v = this.view(e.uid);
        if (!u || !v) return;
        await banner(`${u.name}: ${e.name}`, u.team === 1, 900 / this.speed);
        const a = ABILITIES.get(e.ability);
        const col = a?.color ?? '#c8a0ff';
        this.auras.set(e.uid, st.vfx.chargeAura(() => v.root.position.clone(), col));
        if (a) st.markCharge(e.uid, this.b.aoeCells(u, a, e.x, e.z).map((c) => [c.x, c.z]));
        audio.sfx('charge');
        return;
      }
      case 'chargeBreak': { this.auras.get(e.uid)?.(); this.auras.delete(e.uid); st.unmarkCharge(e.uid); const v = this.view(e.uid); if (v) this.float(v, 'Interrupted', 'info'); return; }
      case 'hits': await this.playHits(e); return;
      case 'reaction': { const u = this.b.unit(e.uid); if (u) { audio.sfx('buff', { volume: 0.5 }); await banner(`${u.name}: ${e.name}`, u.team === 1, 700 / this.speed); } return; }
      case 'status': {
        const v = this.view(e.uid);
        if (!v) return;
        for (const s of e.add ?? []) this.float(v, STATUS[s]?.name ?? s, 'status');
        for (const s of e.remove ?? []) if (!STATUS[s]?.hidden && s !== 'charging' && s !== 'performing') this.float(v, `-${STATUS[s]?.name ?? s}`, 'info');
        return;
      }
      case 'hp': { const v = this.view(e.uid); if (v && e.delta) { this.float(v, (e.delta > 0 ? '+' : '') + e.delta + (e.reason ? ` ${e.reason}` : ''), e.delta > 0 ? 'heal' : 'dmg'); if (e.delta > 0) st.vfx.play('heal', v.chest, v.root.position.clone()); else v.anim.play('hurt'); await this.wait(350); } return; }
      case 'mp': { const v = this.view(e.uid); if (v && e.delta > 0) this.float(v, `+${e.delta} MP`, 'mp'); return; }
      case 'ko': { const v = this.view(e.uid); if (v) { audio.sfx('ko'); await v.ko(); } return; }
      case 'revive': { const v = this.view(e.uid); if (v) { v.revive(); st.vfx.play('revive', v.chest, v.root.position.clone()); this.float(v, 'Revived', 'heal'); await this.wait(400); } return; }
      case 'koCount': { const v = this.view(e.uid); if (v) { this.float(v, String(e.n), 'info'); await this.wait(350); } return; }
      case 'crystal': {
        const v = this.view(e.uid);
        if (!v) return;
        audio.sfx('crystal');
        st.vfx.sparkle(v.root.position.clone(), e.kind === 'crystal' ? '#9fd8ff' : '#ffd070');
        v.becomeCrystal(e.kind);
        await this.wait(600);
        return;
      }
      case 'pickup': {
        const v = this.view(e.uid);
        const pk = [...st.views.entries()].find(([k, vv]) => vv !== v && vv.x === e.x && vv.z === e.z && !vv.model.root.visible);
        if (pk) pk[1].removeCrystal();
        if (v) st.vfx.sparkle(v.root.position.clone(), e.kind === 'crystal' ? '#9fd8ff' : '#ffd070');
        audio.sfx(e.kind === 'crystal' ? 'learn' : 'chest');
        if (e.kind === 'crystal') {
          if (e.learned?.length) toast(`Learned: ${e.learned.map((a) => ABILITIES.get(a)?.name ?? a).slice(0, 4).join(', ')}${e.learned.length > 4 ? '…' : ''}`, 3000);
          else toast('The crystal restores HP and MP');
        } else if (e.item) toast(`Found ${ITEMS.get(e.item)?.name ?? e.item}!`);
        await this.wait(600);
        return;
      }
      case 'text': { const v = this.view(e.uid); if (v) this.float(v, e.text, 'info'); await this.wait(250); return; }
      case 'jumpUp': { const v = this.view(e.uid); if (v) { audio.sfx('jump'); await v.leapUp(); } return; }
      case 'jumpDown': { const v = this.view(e.uid); if (v) { st.focusTile(e.x, e.z); await v.landOn(e.x, e.z); audio.sfx('hitHeavy'); } return; }
      case 'levelUp': { const v = this.view(e.uid); if (v) { this.float(v, 'Level Up!', 'crit'); st.vfx.rise(v.root.position.clone(), '#ffe070', 30, 2, 0.4, 1.2, 0.12); audio.sfx('levelUp'); await this.wait(500); } return; }
      case 'teamChange': { const v = this.view(e.uid); const u = this.b.unit(e.uid); if (v && u) { v.setTeam(u.team, u.team === 0 && !u.controlled); this.float(v, u.team === 0 ? 'Ally!' : 'Turned!', 'status'); } return; }
      case 'reveal': { const v = this.view(e.uid); const u = this.b.unit(e.uid); if (v && u) { v.place(u.x, u.z, u.facing); v.root.visible = true; st.vfx.play('teleport', v.chest, v.root.position.clone(), '#ffffff'); } return; }
      case 'leave': { const v = this.view(e.uid); if (v) { await v.tween(0.4, (t) => v.root.scale.setScalar(1 - t)); v.root.visible = false; v.root.scale.setScalar(1); } return; }
      case 'script': await this.hooks.runScript(e.index); this.syncAll(); return;
      case 'end': return;
    }
  }

  private async playAct(e: Extract<BEvent, { t: 'act' }>, hits?: Extract<BEvent, { t: 'hits' }>) {
    const st = this.stage;
    const u = this.b.unit(e.uid);
    const v = this.view(e.uid);
    if (!u || !v) { if (hits) await this.playHits(hits); return; }
    const a = ABILITIES.get(e.ability);
    // stop charge aura
    this.auras.get(e.uid)?.(); this.auras.delete(e.uid); st.unmarkCharge(e.uid);
    const target = st.tileWorld(e.x, e.z);
    if (e.x !== u.x || e.z !== u.z) v.faceToward(target);
    const isAttack = e.ability === 'attack';
    if (!isAttack || u.team !== 0) banner(e.name, u.team === 1, 1000 / this.speed);
    if (e.mimic) await this.wait(150);
    // choose clip
    let clip: ClipName = (a?.anim && ANIM_MAP[a.anim]) || 'swing';
    const w = u.weapon?.cat;
    if (isAttack) clip = w === 'bow' || w === 'crossbow' ? 'bow' : w === 'gun' || w === 'magicGun' ? 'gun' : w === 'spear' ? 'thrust' : w === 'fist' || !w ? 'punch' : v.model.kind === 'monster' ? 'bite' : 'swing';
    let vfxId = e.vfx ?? a?.vfx;
    if (isAttack) vfxId = w === 'bow' || w === 'crossbow' ? 'arrow' : w === 'gun' ? 'bullet' : w === 'magicGun' ? 'beam' : w === 'fist' || !w ? 'punch' : 'slash';
    const col = a?.color;
    const big = (a?.aoe ?? 1) >= 3 || a?.special === 'summon' || /summon/i.test(a?.skillset ?? '');
    const sfx = SFX_FOR_VFX[vfxId ?? ''] ?? 'magic';
    const cast = clip === 'cast' || clip === 'summon' || clip === 'pray' || clip === 'sing' || clip === 'dance';
    if (cast) { v.anim.setBase(clip); audio.sfx('magic', { volume: 0.6 }); await this.wait(550); }
    let impact: Promise<void> = Promise.resolve();
    const from = v.chest;
    const fireVfx = () => {
      if (sfx) audio.sfx(sfx);
      if (a?.special === 'jump') return;
      impact = st.vfx.play(vfxId, from, target, col, big);
    };
    if (cast) { fireVfx(); v.anim.setBase('idle'); }
    else await v.anim.play(clip, { onHit: fireVfx, speed: this.speed * (input.fast ? 2 : 1) });
    await impact;
    if (hits) await this.playHits(hits);
    this.syncAll();
  }

  private async playHits(e: Extract<BEvent, { t: 'hits' }>) {
    const st = this.stage;
    let delay = 0;
    const tasks: Array<Promise<void>> = [];
    for (const hInfo of e.hits) {
      const v = this.view(hInfo.uid);
      if (!v) continue;
      tasks.push(this.showHit(v, hInfo, delay));
      delay += 90;
    }
    if (e.hits.some((x) => x.crit)) { audio.sfx('crit'); st.cam.shake(0.18, 0.25); }
    await Promise.all(tasks);
    await this.wait(250);
  }

  private async showHit(v: UnitView, hi: HitInfo, delay: number) {
    await new Promise((r) => setTimeout(r, delay));
    const u = this.b.unit(hi.uid);
    if (hi.miss) {
      audio.sfx(hi.guard === 'Blocked' ? 'block' : 'miss');
      this.float(v, hi.guard && hi.guard !== 'Evaded' ? hi.guard : 'Miss', 'miss');
      v.anim.play(hi.guard === 'Blocked' ? 'guard' : 'dodge');
      return;
    }
    if (hi.dmg) {
      audio.sfx(hi.dmg > (u?.maxHp ?? 100) * 0.3 ? 'hitHeavy' : 'hit');
      this.float(v, String(hi.dmg), hi.crit ? 'crit' : 'dmg');
      if (!hi.ko) v.anim.play('hurt');
    }
    if (hi.heal) this.float(v, '+' + hi.heal, 'heal', 120);
    if (hi.mpDmg) this.float(v, `${hi.mpDmg} MP`, 'mp', 160);
    if (hi.mpHeal) this.float(v, `+${hi.mpHeal} MP`, 'mp', 160);
    let d = 260;
    for (const s of hi.add ?? []) { if (s !== 'ko') this.float(v, STATUS[s]?.name ?? s, 'status', d); d += 180; }
    for (const s of hi.remove ?? []) { if (s !== 'critical') this.float(v, '-' + (STATUS[s]?.name ?? s), 'info', d); d += 180; }
    for (const t of hi.text ?? []) { this.float(v, t, 'info', d); d += 200; }
    if (hi.stolen) audio.sfx('steal');
    if (hi.knock) await v.knockTo(hi.knock[0], hi.knock[1]);
    if (hi.ko) { audio.sfx('ko'); await v.ko(); }
    if (hi.revive) v.revive();
  }

  private float(v: UnitView, text: string, cls: string, delay = 0) {
    const p = this.stage.toScreen(v.head);
    if (!p.visible) return;
    floater(p.x, p.y, text, cls, delay);
  }

  dispose() {
    for (const s of this.auras.values()) s();
    this.auras.clear();
    this.hud.dispose();
  }
}

/** Map a screen-relative arrow to a grid direction given camera yaw */
export function screenDir(yaw: number, key: 'up' | 'down' | 'left' | 'right'): [number, number] {
  // camera looks toward -(sin yaw, cos yaw); screen-up in world = that direction
  const fwd = new THREE.Vector2(-Math.sin(yaw), -Math.cos(yaw));
  const right = new THREE.Vector2(-fwd.y, fwd.x);
  const v = key === 'up' ? fwd : key === 'down' ? fwd.clone().multiplyScalar(-1) : key === 'right' ? right : right.clone().multiplyScalar(-1);
  // snap to the grid axis most aligned (bias slightly toward x on ties)
  if (Math.abs(v.x) >= Math.abs(v.y)) return [Math.sign(v.x), 0];
  return [0, Math.sign(v.y)];
}

export async function preloadPortraits(b: Battle) {
  for (const u of b.units) portraitFor(u);
}
