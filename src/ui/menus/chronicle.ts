// The Chronicle: events, persons, artefacts, errands — the game's "brave story".
import type { Game } from '../../game/game';
import { CHRONICLE, CHARACTERS, ARTEFACTS, ERRANDS, JOBS } from '../../data/db';
import { menu } from '../widgets';
import { h } from '../dom';
import { overlay } from './common';
import { input } from '../input';
import { ZODIAC_STONES } from '../../data/misc/zodiacStones';
import { ZODIAC_NAMES, ZODIAC_GLYPH } from '../../battle/zodiac';
import { atlasEntries, bestiaryEntries, locationReference, monsterReference } from '../../game/reference';
import { fmtNum, t } from '../../i18n';

export async function openChronicle(game: Game) {
  const s = game.state;
  const ov = overlay(t('chronicle.screen_heading'));
  let body = null as HTMLElement | null;
  let textPane = null as HTMLElement | null;
  let shownTitle = '';
  const show = (title: string, text: string) => {
    if (body && shownTitle === title && textPane?.textContent === text) return;
    shownTitle = title;
    body?.remove();
    textPane = h('div', { role: 'region', 'aria-label': title, style: { whiteSpace: 'pre-wrap', lineHeight: '1.55', marginTop: '6px', fontSize: '1.02em', overflowY: 'auto', minHeight: '0' } }, text);
    body = h('div.panel.detail.titled', { style: { right: '16px', top: '64px', width: 'min(620px, 58vw)', maxHeight: 'calc(78 * var(--vh))', display: 'flex', flexDirection: 'column' } },
      h('div.title-plate', null, title),
      h('div.muted', { style: { fontSize: '.82em', flexShrink: '0' } }, t(input.lastDevice === 'pad' ? 'chronicle.scroll_hint_pad' : 'chronicle.scroll_hint')), textPane);
    ov.root.appendChild(body);
  };
  /** a browsable list: entries show on hover/choose; only Back returns to the sections */
  const browse = async (o: Parameters<typeof menu<string>>[0]) => {
    await menu({ ...o, keepOpenOnChoose: true, onAction: (a) => {
      if (a !== 'left' && a !== 'right' && a !== 'prev' && a !== 'next') return false;
      textPane?.scrollBy({ top: (a === 'left' || a === 'prev' ? -1 : 1) * Math.max(80, textPane.clientHeight * 0.7) });
      return true;
    } }).promise;
  };
  try {
    for (;;) {
      const sec = await menu({ items: [{ label: t('chronicle.section.events'), value: 'events' }, { label: t('chronicle.section.persons'), value: 'persons' }, { label: t('chronicle.section.bestiary'), value: 'bestiary', right: fmtNum(bestiaryEntries().length) }, { label: t('chronicle.section.atlas'), value: 'atlas' }, { label: t('chronicle.section.artefacts'), value: 'artefacts' }, { label: t('chronicle.section.stones'), value: 'stones', right: t('chronicle.stones_held', { held: ZODIAC_STONES.filter((z) => s.flags[z.flag]).length, total: 13 }) }, { label: t('chronicle.section.errands'), value: 'errands' }, { label: t('chronicle.section.records'), value: 'records' }], x: 16, y: 64, title: t('chronicle.menu_heading'), parent: ov.root }).promise;
      if (!sec) return;
      if (sec === 'bestiary') {
        const list = bestiaryEntries();
        await browse({ items: list.map((j) => ({ label: j.name, value: j.id })), x: 16, y: 64, title: t('chronicle.section.bestiary'), parent: ov.root, maxHeight: 'calc(70 * var(--vh))', onHover: (id) => {
          const j = list.find((entry) => entry.id === id);
          if (j) show(j.name, monsterReference(j, s));
        } });
      }
      if (sec === 'atlas') {
        const list = atlasEntries(s);
        await browse({ items: list.length ? list.map((n) => ({ label: n.name, value: n.id })) : [{ label: t('chronicle.empty.atlas'), value: '', disabled: true }], x: 16, y: 64, title: t('chronicle.section.atlas'), parent: ov.root, maxHeight: 'calc(70 * var(--vh))', onHover: (id) => {
          const n = list.find((entry) => entry.id === id);
          if (n) show(n.name, locationReference(n, s));
        } });
      }
      if (sec === 'events') {
        const list = [...CHRONICLE.values()].filter((e) => s.chronicle.includes(e.id) || s.flags[e.id]).sort((a, b) => a.chapter - b.chapter);
        await browse({ items: list.length ? list.map((e) => ({ label: e.title, value: e.id })) : [{ label: t('chronicle.empty.events'), value: '', disabled: true }], x: 16, y: 64, title: t('chronicle.section.events'), parent: ov.root, maxHeight: 'calc(70 * var(--vh))', onHover: (id) => { const e = CHRONICLE.get(id as string); if (e) show(e.title, e.text); } });
      }
      if (sec === 'persons') {
        const met = new Set([...s.met, ...s.roster.filter((r) => r.charId).map((r) => r.charId!)]);
        const list = [...CHARACTERS.values()].filter((c) => met.has(c.id) || c.bio.some(([f]) => f && s.flags[f]));
        await browse({ items: list.map((c) => ({ label: c.id === 'rhen' ? s.heroName : c.name, value: c.id })), x: 16, y: 64, title: t('chronicle.section.persons'), parent: ov.root, maxHeight: 'calc(70 * var(--vh))', onHover: (id) => {
          const c = CHARACTERS.get(id as string);
          if (!c) return;
          const bio = c.bio.filter(([f]) => !f || s.flags[f]).map(([, t]) => t.replace(/\{hero\}/g, () => s.heroName)).join('\n\n');
          const name = c.id === 'rhen' ? s.heroName : c.fullName ?? c.name;
          show(c.title ? t('chronicle.person_heading', { name, role: c.title }) : name, `${JOBS.get(c.job)?.name ?? ''}\n\n${bio || '…'}`);
        } });
      }
      if (sec === 'artefacts') {
        const list = s.artefacts.map((id) => ARTEFACTS.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof ARTEFACTS.get>>[];
        await browse({ items: list.length ? list.map((a) => ({ label: a.name, value: a.id })) : [{ label: t('chronicle.empty.artefacts'), value: '', disabled: true }], x: 16, y: 64, title: t('chronicle.artefacts_heading'), parent: ov.root, maxHeight: 'calc(70 * var(--vh))', onHover: (id) => { const a = ARTEFACTS.get(id as string); if (a) show(a.name, a.desc); } });
      }
      if (sec === 'stones') {
        await browse({
          items: ZODIAC_STONES.map((z) => ({ label: `${ZODIAC_GLYPH[z.sign]}  ${s.flags[z.flag] ? ZODIAC_NAMES[z.sign] : t('chronicle.stone_unknown')}`, value: z.sign, disabled: !s.flags[z.flag] })),
          x: 16, y: 64, title: t('chronicle.section.stones'), parent: ov.root, maxHeight: 'calc(70 * var(--vh))',
          onHover: (id) => { const z = ZODIAC_STONES.find((q) => q.sign === id); if (z && s.flags[z.flag]) show(t('chronicle.stone_heading', { glyph: ZODIAC_GLYPH[z.sign], sign: ZODIAC_NAMES[z.sign] }), `${z.lore}\n\n${t('chronicle.stone_found', { where: z.where })}`); },
        });
      }
      if (sec === 'errands') {
        const list = s.errandsDone.map((id) => ERRANDS.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof ERRANDS.get>>[];
        await browse({ items: list.length ? list.map((e) => ({ label: e.title, value: e.id })) : [{ label: t('chronicle.empty.errands'), value: '', disabled: true }], x: 16, y: 64, title: t('chronicle.section.errands'), parent: ov.root, maxHeight: 'calc(70 * var(--vh))', onHover: (id) => { const e = ERRANDS.get(id as string); if (e) show(e.title, e.report); } });
      }
      if (sec === 'records') {
        const hrs = Math.floor(s.playtime / 3600), mins = Math.floor((s.playtime % 3600) / 60);
        show(t('chronicle.section.records'), [
          t('chronicle.records.play_time', { hours: hrs, minutes: mins }),
          t('chronicle.records.days', { count: s.day }),
          t('chronicle.records.battles', { count: s.battlesWon }),
          t('chronicle.records.company', { count: s.roster.length }),
          t('chronicle.records.errands', { count: s.errandsDone.length }),
          t('chronicle.records.artefacts', { count: s.artefacts.length }),
          t('chronicle.records.rumours', { count: s.rumorsRead.length }),
        ].join('\n'));
        // closes on a key/button or a tap anywhere
        await new Promise<void>((resolve) => {
          const close = () => { pop(); ov.root.removeEventListener('click', close); resolve(); };
          const pop = input.push((a) => { if (a === 'confirm' || a === 'cancel') close(); return true; });
          setTimeout(() => ov.root.addEventListener('click', close), 0);
        });
      }
      body?.remove(); body = null;
    }
  } finally { body?.remove(); ov.close(); }
}
