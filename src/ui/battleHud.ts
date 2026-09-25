// Battle HUD: unit cards, turn order, tile info, help bar, action preview.
import { h, uiRoot } from './dom';
import { bar } from './widgets';
import type { BattleUnit } from '../battle/unit';
import type { Battle, TargetPreview } from '../battle/battle';
import { STATUS } from '../battle/status';
import { ZODIAC_GLYPH, ZODIAC_NAMES, compatibility } from '../battle/zodiac';
import type { Cell } from '../battle/grid';
import { MapGrid } from '../battle/grid';
import { portrait, portraitCached } from '../gfx/portraits';
import { buildHumanoid } from '../gfx/models/humanoid';
import type { UnitModel } from '../gfx/models/rig';
import { ABILITIES } from '../data/db';
import { input } from './input';

import { getMonsterBuilder } from '../scenes/unitview';

export function unitPortraitKey(u: BattleUnit) { return (u.roster.charId ?? u.roster.uid) + ':' + u.roster.job; }

export function portraitFor(u: BattleUnit): Promise<string> {
  const key = unitPortraitKey(u);
  const bg = u.team === 0 ? '#3e5a7a' : u.team === 1 ? '#7a3a30' : '#3e6a44';
  return portrait(key, () => {
    const mb = getMonsterBuilder();
    if (u.job.monster && mb) return mb(u.job.monster);
    return buildHumanoid({ job: u.job.look, look: u.roster.look, gender: u.gender === 'f' ? 'f' : 'm', weapon: null, shield: null });
  }, bg);
}

export class BattleHud {
  root: HTMLElement;
  private cardA: HTMLElement | null = null;
  private cardB: HTMLElement | null = null;
  private at: HTMLElement | null = null;
  private tile: HTMLElement | null = null;
  private help: HTMLElement | null = null;
  private prev: HTMLElement | null = null;
  private helpSrc: string | (() => string) = '';
  private back: HTMLElement | null = null;
  private offDevice: () => void;
  showAT = true;

  constructor() {
    this.root = h('div.passthru', { style: { position: 'absolute', inset: '0' } });
    uiRoot().appendChild(this.root);
    // swap keyboard ↔ gamepad hints when the player changes device mid-prompt
    this.offDevice = input.onDevice(() => { if (typeof this.helpSrc === 'function') this.helpText(this.helpSrc); });
  }

  card(u: BattleUnit | null, which: 'a' | 'b', b?: Battle) {
    const old = which === 'a' ? this.cardA : this.cardB;
    old?.remove();
    if (!u) { if (which === 'a') this.cardA = null; else this.cardB = null; return; }
    const el = this.unitCard(u, b);
    el.style.position = 'absolute';
    el.style.bottom = '14px';
    if (which === 'a') el.style.left = '14px'; else el.style.right = '14px';
    this.root.appendChild(el);
    if (which === 'a') this.cardA = el; else this.cardB = el;
  }

  unitCard(u: BattleUnit, b?: Battle): HTMLElement {
    const por = h('div.portrait');
    const cached = portraitCached(unitPortraitKey(u));
    if (cached) por.style.backgroundImage = `url(${cached})`;
    else portraitFor(u).then((url) => { if (url) por.style.backgroundImage = `url(${url})`; });
    const statuses = [...u.statuses.keys()].filter((s) => !STATUS[s].hidden && s !== 'critical');
    const hero = b?.active;
    let compat = '';
    if (hero && hero !== u) {
      const c = compatibility(hero.zodiac, hero.gender, u.zodiac, u.gender);
      compat = c === 'best' ? '★ Best' : c === 'good' ? '◎ Good' : c === 'bad' ? '△ Bad' : c === 'worst' ? '✕ Worst' : '';
    }
    return h('div.panel.unitcard' + (u.team === 1 ? '.enemy' : ''), null,
      por,
      h('div.name', null, u.name, h('span.lv', null, `Lv ${u.level}`)),
      h('div.job', null, u.job.name + (u.boss ? ' · Boss' : '') + (!u.controlled && u.team === 0 ? ' · Guest' : '')),
      h('div', null,
        h('div.bars', null,
          h('span.lbl', null, 'HP'), bar('hp', u.hp, u.maxHp), h('span.num', null, `${u.hp}/${u.maxHp}`),
          h('span.lbl', null, 'MP'), bar('mp', u.mp, u.maxMp), h('span.num', null, `${u.mp}/${u.maxMp}`),
          h('span.lbl', null, 'CT'), bar('ct', Math.min(100, u.ct), 100), h('span.num', null, `${Math.min(100, Math.floor(u.ct))}/100`),
        ),
        h('div.meta', null,
          h('span.zodiac', { title: ZODIAC_NAMES[u.zodiac] }, ZODIAC_GLYPH[u.zodiac] + '︎'),
          h('span', null, 'Br ', h('b', null, String(u.brave))),
          h('span', null, 'Fa ', h('b', null, String(u.faith))),
          h('span', null, 'Mv ', h('b', null, String(u.move)), ' Jp ', h('b', null, String(u.jump))),
          compat ? h('span', null, compat) : null,
        ),
        statuses.length ? h('div.statuses', null, statuses.map((s) => h('span.status-chip', { style: { borderColor: STATUS[s].color }, title: STATUS[s].desc }, STATUS[s].icon + ' ' + STATUS[s].name))) : null,
      ),
    );
  }

  turnList(b: Battle) {
    this.at?.remove();
    if (!this.showAT) { this.at = null; return; }
    const order = b.turnOrder(10);
    const rows = order.map((o, i) => {
      const u = b.unit(o.uid);
      if (!u) return null;
      const cls = u.team === 0 ? (u.controlled ? 'ally' : 'guest') : u.team === 1 ? 'enemy' : 'guest';
      const ch = o.kind === 'charge' ? u.charging?.ability.name ?? (u.jumping ? 'Jump' : 'Action') : '';
      return h('div.row.' + cls + (i === 0 ? '.now' : ''), null, h('span.dot'), h('span', null, u.name), ch ? h('span.kind', null, ch) : null);
    });
    this.at = h('div.panel.atlist', null, h('div.title-plate', null, 'Turn Order'), ...rows);
    this.root.appendChild(this.at);
  }

  tileInfo(c: Cell | null) {
    this.tile?.remove();
    if (!c) { this.tile = null; return; }
    const names: Record<string, string> = { g: 'Grass', d: 'Soil', s: 'Stone', r: 'Rock', n: 'Sand', i: 'Snow', w: 'Shallows', W: 'Deep Water', m: 'Marsh', p: 'Poison Marsh', l: 'Lava', b: 'Masonry', o: 'Timber', t: 'Roof', c: 'Carpet', k: 'Moss', f: 'Farmland', a: 'Iron', y: 'Salt', u: 'Barrow Soil', x: 'Impassable' };
    this.tile = h('div.panel.tileinfo', null, `${names[c.terrain] ?? 'Ground'} · ${c.h}h`, h('span.muted', null, ` (${MapGrid.terrainGroup(c.terrain)})`));
    this.root.appendChild(this.tile);
  }

  /** help bar; pass a function to have it re-rendered when the input device changes */
  helpText(src: string | (() => string)) {
    this.helpSrc = src;
    this.help?.remove();
    const html = typeof src === 'function' ? src() : src;
    if (!html) { this.help = null; return; }
    this.help = h('div.helpbar', { html });
    this.root.appendChild(this.help);
  }

  /** on-screen Back while picking a tile or surveying (mouse and touch players have no Esc key) */
  backButton(on: boolean, label = 'Back') {
    this.back?.remove(); this.back = null;
    if (!on) return;
    this.back = backBtn(label);
    this.root.appendChild(this.back);
  }

  preview(b: Battle, caster: BattleUnit, abilityId: string, prevs: TargetPreview[]) {
    this.prev?.remove();
    if (!prevs.length) { this.prev = null; return; }
    const a = ABILITIES.get(abilityId);
    const lines = prevs.slice(0, 4).map((p) => {
      const t = b.unit(p.uid)!;
      return h('div', { style: { marginTop: '4px' } },
        h('div.line', null, h('b', null, t.name), h('span.hit', null, `${p.hit}%`)),
        p.dmg !== undefined ? h('div.line', null, h('span', null, 'Damage'), h('span.bad', null, `${p.dmg}${p.ko ? ' (KO)' : ''}`)) : null,
        p.heal !== undefined ? h('div.line', null, h('span', null, 'Restore'), h('span.good', null, `${p.heal}`)) : null,
        p.mp !== undefined ? h('div.line', null, h('span', null, 'MP'), h('span', null, `${p.mp}`)) : null,
        p.status ? h('div.muted', null, p.status) : null,
      );
    });
    const ct = a ? b.chargeTicks(caster, a) : 0;
    this.prev = h('div.panel.preview', null,
      h('div.title-plate', null, a?.name ?? 'Action'),
      ct > 0 ? h('div.muted', null, `Charge: ${ct} ticks`) : null,
      ...lines,
      prevs.length > 4 ? h('div.muted', null, `+${prevs.length - 4} more`) : null);
    this.root.appendChild(this.prev);
  }
  clearPreview() { this.prev?.remove(); this.prev = null; }

  dispose() { this.offDevice(); this.root.remove(); }
}

/** a Back button that sends the same 'cancel' as Esc / gamepad B to whatever is listening */
export function backBtn(label = 'Back'): HTMLElement {
  const b = h('button.btn.hudback', { type: 'button' }, '‹ ' + label);
  b.addEventListener('click', (e) => { e.stopPropagation(); input.dispatch('cancel'); });
  return b;
}
