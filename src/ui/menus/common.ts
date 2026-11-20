// Shared helpers for full-screen menus.
import { fmtNum, t } from '../../i18n';
import { h, uiRoot } from '../dom';
import type { RosterUnit } from '../../game/roster';
import { previewStats, unitJobLevel } from '../../game/roster';
import { JOBS, ITEMS, ABILITIES, CHARACTERS } from '../../data/db';
import { BattleUnit } from '../../battle/unit';
import { portrait } from '../../gfx/portraits';
import { buildHumanoid } from '../../gfx/models/humanoid';
import { getMonsterBuilder } from '../../scenes/unitview';
import { ZODIAC_GLYPH, zodiacName } from '../../battle/zodiac';
import { bar } from '../widgets';
import type { Element } from '../../data/types';

const STAT_LINES: Record<string, string> = {
  hp: 'menus.stat.hp', mp: 'menus.stat.mp', pa: 'menus.stat.pa', ma: 'menus.stat.ma', speed: 'menus.stat.speed',
  move: 'menus.stat.move', jump: 'menus.stat.jump', brave: 'menus.stat.brave', faith: 'menus.stat.faith',
};
/** A stat's name (pa → PA, speed → Speed); an unknown key shows as it is. */
export function statName(key: string): string {
  const id = Object.prototype.hasOwnProperty.call(STAT_LINES, key) ? STAT_LINES[key] : undefined;
  return id ? t(id) : key;
}

const ELEMENT_LINES: Record<Element, string> = {
  fire: 'menus.element.fire', ice: 'menus.element.ice', lightning: 'menus.element.lightning', water: 'menus.element.water',
  earth: 'menus.element.earth', wind: 'menus.element.wind', holy: 'menus.element.holy', dark: 'menus.element.dark',
};
/** An element's name (fire → Fire); an unknown id shows as it is. */
export function elementName(id: string): string {
  const line = Object.prototype.hasOwnProperty.call(ELEMENT_LINES, id) ? ELEMENT_LINES[id as Element] : undefined;
  return line ? t(line) : id;
}

/** A stat change written tight: HP+12, Sp-1. */
export function statChange(stat: string, change: number): string {
  return change < 0 ? t('menus.stat_down', { stat, amount: -change }) : t('menus.stat_up', { stat, amount: change });
}

export function overlay(title: string, parent = uiRoot()): { root: HTMLElement; close: () => void } {
  const root = h('div.screen', { style: { zIndex: '5' } }, h('div.screen-bg'));
  const head = h('div.screen-title', { style: { position: 'relative', padding: '14px 20px 0', fontFamily: 'Cinzel, serif', fontWeight: '700', fontSize: '1.4em', color: '#f4dc98', letterSpacing: '0.12em', textShadow: '0 2px 6px #000' } }, title);
  root.appendChild(head);
  parent.appendChild(root);
  return { root, close: () => root.remove() };
}

export function rosterPortrait(u: RosterUnit): Promise<string> {
  const key = (u.charId ?? u.uid) + ':' + u.job;
  const j = JOBS.get(u.job)!;
  const c = u.charId ? CHARACTERS.get(u.charId) : undefined;
  return portrait(key, () => {
    const mb = getMonsterBuilder();
    if (j.monster && mb) return mb(j.monster);
    return buildHumanoid({ job: j.look, look: c?.look ?? u.look, gender: u.gender === 'f' ? 'f' : 'm' });
  }, u.charId ? c?.color ?? '#4a5a6a' : '#3e5a7a');
}

/** detailed unit panel used by formation & recruit screens */
export function unitPanel(u: RosterUnit, jobOverride?: string): HTMLElement {
  const jobId = jobOverride ?? u.job;
  const j = JOBS.get(jobId)!;
  const tmp = { ...u, job: jobId };
  const bu = new BattleUnit(tmp as RosterUnit, 0, true);
  const por = h('div.portrait', { style: { width: '120px', height: '140px', borderRadius: '6px', border: '2px solid #5b3d20', backgroundSize: 'cover', backgroundPosition: 'center', background: '#3a2c20' } });
  rosterPortrait(tmp as RosterUnit).then((url) => { if (url) { por.style.backgroundImage = `url(${url})`; por.style.backgroundSize = 'cover'; } });
  const eq = (slot: 'rhand' | 'lhand' | 'head' | 'body' | 'accessory', label: string) => h('div.kv', null, h('span', null, label), h('span', null, u.equip[slot] ? ITEMS.get(u.equip[slot]!)?.name ?? '-' : '—'));
  const ab = (id: string | undefined) => (id ? ABILITIES.get(id)?.name ?? id : '—');
  return h('div.panel', { style: { position: 'relative', display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 16px', minWidth: 'min(560px, 92vw)' } },
    por,
    h('div', null,
      h('div', { style: { fontFamily: 'Cinzel, serif', fontWeight: '700', fontSize: '1.2em' } }, u.name, h('span.muted', { style: { marginLeft: '10px', fontSize: '0.75em' } }, `${ZODIAC_GLYPH[u.zodiac]}︎ ${zodiacName(u.zodiac)}`)),
      h('div.muted', null, t('menus.unit.summary', { job: j.name, level: u.level, job_level: unitJobLevel(u, jobId), jp: u.jp[jobId] ?? 0 })),
      h('div.bars', { style: { marginTop: '6px', maxWidth: '300px' } },
        h('span.lbl', null, t('menus.stat.hp')), bar('hp', bu.maxHp, bu.maxHp), h('span.num', null, fmtNum(bu.maxHp)),
        h('span.lbl', null, t('menus.stat.mp')), bar('mp', bu.maxMp, bu.maxMp), h('span.num', null, fmtNum(bu.maxMp)),
        h('span.lbl', null, t('menus.stat.exp')), bar('ct', u.exp, 100), h('span.num', null, t('menus.out_of', { value: u.exp, max: 100 })),
      ),
      h('div.grid2', { style: { marginTop: '6px', fontSize: '0.9em' } },
        h('div.kv', null, h('span', null, t('menus.unit.move_jump')), h('span', null, t('menus.unit.move_jump_value', { move: bu.move, jump: bu.jump }))),
        h('div.kv', null, h('span', null, t('menus.stat.speed')), h('span', null, fmtNum(bu.speed))),
        h('div.kv', null, h('span', null, t('menus.unit.pa_ma')), h('span', null, t('menus.unit.pa_ma_value', { pa: bu.pa, ma: bu.ma }))),
        h('div.kv', null, h('span', null, t('menus.unit.brave_faith')), h('span', null, t('menus.unit.brave_faith_value', { brave: u.brave, faith: u.faith }))),
        h('div.kv', null, h('span', null, t('menus.unit.evade')), h('span', null, t('menus.percent', { value: bu.cev }))),
        h('div.kv', null, h('span', null, t('menus.stat.weapon_power')), h('span', null, fmtNum(bu.weapon?.wp ?? 0))),
      ),
    ),
    h('div', { style: { gridColumn: '1 / span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', fontSize: '0.9em' } },
      h('div', null, h('h3', null, t('menus.unit.equipment')), eq('rhand', t('menus.unit.right_hand')), eq('lhand', t('menus.unit.left_hand')), eq('head', t('menus.unit.head')), eq('body', t('menus.unit.body')), eq('accessory', t('menus.unit.accessory'))),
      h('div', null, h('h3', null, t('menus.unit.abilities')),
        h('div.kv', null, h('span', null, t('menus.ability.primary')), h('span', null, j.skillset.name)),
        h('div.kv', null, h('span', null, t('menus.ability.secondary')), h('span', null, u.secondary ? JOBS.get(u.secondary)?.skillset.name ?? '—' : '—')),
        h('div.kv', null, h('span', null, t('menus.ability.reaction')), h('span', null, ab(u.reaction))),
        h('div.kv', null, h('span', null, t('menus.ability.support')), h('span', null, ab(u.support))),
        h('div.kv', null, h('span', null, t('menus.ability.movement')), h('span', null, ab(u.movement))),
      ),
    ),
  );
}

export function statDelta(u: RosterUnit, jobId: string): string {
  const a = previewStats(u, u.job), b = previewStats(u, jobId);
  const d = (k: keyof typeof a, label: string) => { const x = b[k] - a[k]; return x ? statChange(label, x) : ''; };
  return [d('hp', t('menus.stat.hp')), d('mp', t('menus.stat.mp')), d('speed', t('menus.stat.sp')), d('pa', t('menus.stat.pa')), d('ma', t('menus.stat.ma'))].filter(Boolean).join(' ');
}
