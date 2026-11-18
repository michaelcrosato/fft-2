// Battle HUD: unit cards, turn order, tile info, help bar, action preview.
import { dir, fmtNum, t, type Part } from '../i18n';
import { h, uiRoot } from './dom';
import { bar } from './widgets';
import type { BattleUnit } from '../battle/unit';
import type { Battle, TargetPreview } from '../battle/battle';
import { STATUS } from '../battle/status';
import { ZODIAC_GLYPH, compatibility } from '../battle/zodiac';
import type { Cell } from '../battle/grid';
import { MapGrid } from '../battle/grid';
import { portrait, portraitCached } from '../gfx/portraits';
import { buildHumanoid } from '../gfx/models/humanoid';
import type { UnitModel } from '../gfx/models/rig';
import { ABILITIES, CHARACTERS } from '../data/db';
import { input } from './input';

import { enemyPalette, getMonsterBuilder } from '../scenes/unitview';

/** the backdrop follows the current side; the colours follow the model, which keeps its starting side's palette */
export function unitPortraitKey(u: BattleUnit) { return `${u.roster.charId ?? u.roster.uid}:${u.roster.job}:${u.baseTeam}:${u.team}`; }

export function portraitFor(u: BattleUnit): Promise<string> {
  const key = unitPortraitKey(u);
  const bg = u.team === 0 ? '#3e5a7a' : u.team === 1 ? '#7a3a30' : '#3e6a44';
  return portrait(key, () => {
    const mb = getMonsterBuilder();
    if (u.job.monster && mb) return mb(u.job.monster, { team: u.baseTeam });
    // the same look and recolour as the battle model (Game.addBattleView / UnitView)
    const look = (u.roster.charId ? CHARACTERS.get(u.roster.charId)?.look : undefined) ?? u.roster.look;
    return buildHumanoid({
      job: u.job.look, look, gender: u.gender === 'f' ? 'f' : 'm', weapon: null, shield: null, team: u.baseTeam,
      palette: look.outfit?.palette ? undefined : enemyPalette(u.job, u.baseTeam),
    });
  }, bg);
}

type HelpSrc = string | Part[] | (() => string | Part[]);

/** Terrain letter → the line naming it (tile info). */
const TERRAIN: Record<string, string> = {
  g: 'hud.terrain.grass', d: 'hud.terrain.soil', s: 'hud.terrain.stone', r: 'hud.terrain.rock', n: 'hud.terrain.sand', i: 'hud.terrain.snow',
  w: 'hud.terrain.shallows', W: 'hud.terrain.deep_water', m: 'hud.terrain.marsh', p: 'hud.terrain.poison_marsh', l: 'hud.terrain.lava',
  b: 'hud.terrain.masonry', o: 'hud.terrain.timber', t: 'hud.terrain.roof', c: 'hud.terrain.carpet', k: 'hud.terrain.moss',
  f: 'hud.terrain.farmland', a: 'hud.terrain.iron', y: 'hud.terrain.salt', u: 'hud.terrain.barrow_soil', x: 'hud.terrain.impassable',
};

export class BattleHud {
  root: HTMLElement;
  private cardA: HTMLElement | null = null;
  private cardB: HTMLElement | null = null;
  private at: HTMLElement | null = null;
  private tile: HTMLElement | null = null;
  private help: HTMLElement | null = null;
  private prev: HTMLElement | null = null;
  private helpSrc: HelpSrc = '';
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
    if (!u) { if (which === 'a') this.cardA = null; else { this.cardB = null; this.placePreview(); } return; }
    const el = this.unitCard(u, b);
    el.style.position = 'absolute';
    el.style.bottom = '14px';
    if (which === 'a') el.style.left = '14px'; else el.style.right = '14px';
    this.root.appendChild(el);
    if (which === 'a') this.cardA = el; else { this.cardB = el; this.placePreview(); }
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
      compat = c === 'best' ? t('hud.compat.best') : c === 'good' ? t('hud.compat.good') : c === 'bad' ? t('hud.compat.bad') : c === 'worst' ? t('hud.compat.worst') : '';
    }
    return h('div.panel.unitcard' + (u.team === 1 ? '.enemy' : ''), null,
      por,
      h('div.name', null, u.name, h('span.lv', null, t('hud.card.level', { level: u.level }))),
      // the job, then the tags that apply, as separate labels
      h('div.job', null, [u.job.name, u.boss ? t('hud.card.boss') : '', !u.controlled && u.team === 0 ? t('hud.card.guest') : ''].filter(Boolean).join(' · ')),
      h('div', null,
        h('div.bars', null,
          h('span.lbl', null, t('hud.hp')), bar('hp', u.hp, u.maxHp), h('span.num', null, t('hud.bar_value', { value: u.hp, max: u.maxHp })),
          h('span.lbl', null, t('hud.mp')), bar('mp', u.mp, u.maxMp), h('span.num', null, t('hud.bar_value', { value: u.mp, max: u.maxMp })),
          h('span.lbl', null, t('hud.ct')), bar('ct', Math.min(100, u.ct), 100), h('span.num', null, t('hud.bar_value', { value: Math.min(100, Math.floor(u.ct)), max: 100 })),
        ),
        h('div.meta', null,
          h('span.zodiac', { title: t(`hud.zodiac.${u.zodiac}`) }, ZODIAC_GLYPH[u.zodiac] + '︎'),
          h('span', null, t('hud.card.brave') + ' ', h('b', null, fmtNum(u.brave))),
          h('span', null, t('hud.card.faith') + ' ', h('b', null, fmtNum(u.faith))),
          h('span', null, t('hud.card.move') + ' ', h('b', null, fmtNum(u.move)), ' ' + t('hud.card.jump') + ' ', h('b', null, fmtNum(u.jump))),
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
      const ch = o.kind === 'charge' ? u.charging?.ability.name ?? (u.jumping ? t('hud.turn.jump') : t('hud.action')) : '';
      return h('div.row.' + cls + (i === 0 ? '.now' : ''), null, h('span.dot'), h('span', null, u.name), ch ? h('span.kind', null, ch) : null);
    });
    this.at = h('div.panel.atlist', null, h('div.title-plate', null, t('hud.turn.title')), ...rows);
    this.root.appendChild(this.at);
  }

  tileInfo(c: Cell | null) {
    this.tile?.remove();
    if (!c) { this.tile = null; return; }
    const terrain = t(TERRAIN[c.terrain] ?? 'hud.terrain.ground');
    this.tile = h('div.panel.tileinfo', null, t('hud.tile.info', { terrain, height: c.h }), h('span.muted', null, ' ' + t('hud.tile.group', { group: t(`hud.geomancy.${MapGrid.terrainGroup(c.terrain)}`) })));
    this.root.appendChild(this.tile);
  }

  /** help bar; pass a function to have it re-rendered when the input device changes */
  /** The help bar: a line (from tParts) whose {key:…} controls are drawn as key caps. */
  helpText(src: HelpSrc) {
    this.helpSrc = src;
    this.help?.remove();
    const parts = typeof src === 'function' ? src() : src;
    const list = typeof parts === 'string' ? (parts ? [parts] : []) : parts;
    if (!list.length) { this.help = null; return; }
    this.help = h('div.helpbar');
    this.help.dir = dir;
    for (const p of list) this.help.append(typeof p === 'string' ? p : h('kbd', null, input.label(p.key)));
    this.root.appendChild(this.help);
  }

  /** on-screen Back while picking a tile or surveying (mouse and touch players have no Esc key) */
  backButton(on: boolean, label = t('common.back')) {
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
      const tu = b.unit(p.uid)!;
      return h('div', { style: { marginTop: '4px' } },
        h('div.line', null, h('b', null, tu.name), h('span.hit', null, t('hud.preview.hit', { hit: p.hit }))),
        p.dmg !== undefined ? h('div.line', null, h('span', null, t('hud.preview.damage')), h('span.bad', null, p.ko ? t('hud.preview.damage_ko', { dmg: p.dmg }) : fmtNum(p.dmg))) : null,
        p.heal !== undefined ? h('div.line', null, h('span', null, t('hud.preview.restore')), h('span.good', null, fmtNum(p.heal))) : null,
        p.mp !== undefined ? h('div.line', null, h('span', null, t('hud.mp')), h('span', null, fmtNum(p.mp))) : null,
        p.status ? h('div.muted', null, p.status) : null,
      );
    });
    const ct = a ? b.chargeTicks(caster, a) : 0;
    this.prev = h('div.panel.preview', null,
      h('div.title-plate', null, a?.name ?? t('hud.action')),
      ct > 0 ? h('div.muted', null, t('hud.preview.charge', { count: ct })) : null,
      ...lines,
      prevs.length > 4 ? h('div.muted', null, t('hud.preview.more', { count: prevs.length - 4 })) : null);
    this.root.appendChild(this.prev);
    this.placePreview();
  }
  clearPreview() { this.prev?.remove(); this.prev = null; }

  /** The preview stands clear above the target's card, however tall the card grows (status rows, small windows). */
  private placePreview() {
    const prev = this.prev, card = this.cardB;
    if (!prev) return;
    prev.style.bottom = '';
    if (!card?.isConnected) return;
    const c = card.getBoundingClientRect(), p = prev.getBoundingClientRect(), root = this.root.getBoundingClientRect();
    const sideBySide = p.right <= c.left || p.left >= c.right;
    if (!sideBySide && p.bottom > c.top - 8) prev.style.bottom = `${Math.round(root.bottom - c.top + 10)}px`;
  }

  dispose() { this.offDevice(); this.root.remove(); }
}

/** a Back button that sends the same 'cancel' as Esc / gamepad B to whatever is listening */
export function backBtn(label = t('common.back')): HTMLElement {
  const b = h('button.btn.hudback', { type: 'button' }, '‹ ' + label);
  b.addEventListener('click', (e) => { e.stopPropagation(); input.dispatch('cancel'); });
  return b;
}
