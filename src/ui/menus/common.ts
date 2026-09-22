// Shared helpers for full-screen menus.
import { h, uiRoot } from '../dom';
import type { RosterUnit } from '../../game/roster';
import { previewStats, unitJobLevel } from '../../game/roster';
import { JOBS, ITEMS, ABILITIES, CHARACTERS } from '../../data/db';
import { BattleUnit } from '../../battle/unit';
import { portrait } from '../../gfx/portraits';
import { buildHumanoid } from '../../gfx/models/humanoid';
import { getMonsterBuilder } from '../../scenes/unitview';
import { ZODIAC_GLYPH, ZODIAC_NAMES } from '../../battle/zodiac';
import { bar } from '../widgets';

export function overlay(title: string): { root: HTMLElement; close: () => void } {
  const root = h('div.screen', { style: { zIndex: '5' } }, h('div.screen-bg'));
  const head = h('div', { style: { position: 'relative', padding: '14px 20px 0', fontFamily: 'Cinzel, serif', fontWeight: '700', fontSize: '1.4em', color: '#f4dc98', letterSpacing: '0.12em', textShadow: '0 2px 6px #000' } }, title);
  root.appendChild(head);
  uiRoot().appendChild(root);
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
      h('div', { style: { fontFamily: 'Cinzel, serif', fontWeight: '700', fontSize: '1.2em' } }, u.name, h('span.muted', { style: { marginLeft: '10px', fontSize: '0.75em' } }, `${ZODIAC_GLYPH[u.zodiac]}︎ ${ZODIAC_NAMES[u.zodiac]}`)),
      h('div.muted', null, `${j.name} · Lv ${u.level} · Job Lv ${unitJobLevel(u, jobId)} · JP ${u.jp[jobId] ?? 0}`),
      h('div.bars', { style: { marginTop: '6px', maxWidth: '300px' } },
        h('span.lbl', null, 'HP'), bar('hp', bu.maxHp, bu.maxHp), h('span.num', null, String(bu.maxHp)),
        h('span.lbl', null, 'MP'), bar('mp', bu.maxMp, bu.maxMp), h('span.num', null, String(bu.maxMp)),
        h('span.lbl', null, 'EXP'), bar('ct', u.exp, 100), h('span.num', null, `${u.exp}/100`),
      ),
      h('div.grid2', { style: { marginTop: '6px', fontSize: '0.9em' } },
        h('div.kv', null, h('span', null, 'Move / Jump'), h('span', null, `${bu.move} / ${bu.jump}`)),
        h('div.kv', null, h('span', null, 'Speed'), h('span', null, String(bu.speed))),
        h('div.kv', null, h('span', null, 'PA / MA'), h('span', null, `${bu.pa} / ${bu.ma}`)),
        h('div.kv', null, h('span', null, 'Brave / Faith'), h('span', null, `${u.brave} / ${u.faith}`)),
        h('div.kv', null, h('span', null, 'Evade'), h('span', null, `${bu.cev}%`)),
        h('div.kv', null, h('span', null, 'Weapon power'), h('span', null, String(bu.weapon?.wp ?? 0))),
      ),
    ),
    h('div', { style: { gridColumn: '1 / span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', fontSize: '0.9em' } },
      h('div', null, h('h3', null, 'Equipment'), eq('rhand', 'Right hand'), eq('lhand', 'Left hand'), eq('head', 'Head'), eq('body', 'Body'), eq('accessory', 'Accessory')),
      h('div', null, h('h3', null, 'Abilities'),
        h('div.kv', null, h('span', null, 'Primary'), h('span', null, j.skillset.name)),
        h('div.kv', null, h('span', null, 'Secondary'), h('span', null, u.secondary ? JOBS.get(u.secondary)?.skillset.name ?? '—' : '—')),
        h('div.kv', null, h('span', null, 'Reaction'), h('span', null, ab(u.reaction))),
        h('div.kv', null, h('span', null, 'Support'), h('span', null, ab(u.support))),
        h('div.kv', null, h('span', null, 'Movement'), h('span', null, ab(u.movement))),
      ),
    ),
  );
}

export function statDelta(u: RosterUnit, jobId: string): string {
  const a = previewStats(u, u.job), b = previewStats(u, jobId);
  const d = (k: keyof typeof a, label: string) => { const x = b[k] - a[k]; return x ? `${label}${x > 0 ? '+' : ''}${x}` : ''; };
  return [d('hp', 'HP'), d('mp', 'MP'), d('speed', 'Sp'), d('pa', 'PA'), d('ma', 'MA')].filter(Boolean).join(' ');
}
