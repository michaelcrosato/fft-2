// The Chronicle: events, persons, artefacts, errands — the game's "brave story".
import type { Game } from '../../game/game';
import { CHRONICLE, CHARACTERS, ARTEFACTS, ERRANDS, JOBS } from '../../data/db';
import { menu } from '../widgets';
import { h } from '../dom';
import { overlay } from './common';
import { input } from '../input';
import { ZODIAC_STONES } from '../../data/misc/zodiacStones';
import { ZODIAC_NAMES, ZODIAC_GLYPH } from '../../battle/zodiac';

export async function openChronicle(game: Game) {
  const s = game.state;
  const ov = overlay('The Chronicle');
  let body = null as HTMLElement | null;
  const show = (title: string, text: string) => {
    body?.remove();
    body = h('div.panel', { style: { right: '16px', top: '64px', width: 'min(620px, 58vw)', maxHeight: '78vh', overflowY: 'auto' } },
      h('div.title-plate', null, title), h('div', { style: { whiteSpace: 'pre-wrap', lineHeight: '1.55', marginTop: '6px', fontSize: '1.02em' } }, text));
    ov.root.appendChild(body);
  };
  try {
    for (;;) {
      const sec = await menu({ items: [{ label: 'Events', value: 'events' }, { label: 'Persons', value: 'persons' }, { label: 'Artefacts & Wonders', value: 'artefacts' }, { label: 'Zodiac Stones', value: 'stones', right: `${ZODIAC_STONES.filter((z) => s.flags[z.flag]).length}/13` }, { label: 'Errands', value: 'errands' }, { label: 'Records', value: 'records' }], x: 16, y: 64, title: 'Chronicle', parent: ov.root }).promise;
      if (!sec) return;
      if (sec === 'events') {
        const list = [...CHRONICLE.values()].filter((e) => s.chronicle.includes(e.id) || s.flags[e.id]).sort((a, b) => a.chapter - b.chapter);
        await menu({ items: list.length ? list.map((e) => ({ label: e.title, value: e.id })) : [{ label: 'Nothing recorded yet', value: '', disabled: true }], x: 16, y: 64, title: 'Events', parent: ov.root, maxHeight: '70vh', onHover: (id) => { const e = CHRONICLE.get(id as string); if (e) show(e.title, e.text); } }).promise;
      }
      if (sec === 'persons') {
        const met = new Set([...s.met, ...s.roster.filter((r) => r.charId).map((r) => r.charId!)]);
        const list = [...CHARACTERS.values()].filter((c) => met.has(c.id) || c.bio.some(([f]) => f && s.flags[f]));
        await menu({ items: list.map((c) => ({ label: c.id === 'rhen' ? s.heroName : c.name, value: c.id })), x: 16, y: 64, title: 'Persons', parent: ov.root, maxHeight: '70vh', onHover: (id) => {
          const c = CHARACTERS.get(id as string);
          if (!c) return;
          const bio = c.bio.filter(([f]) => !f || s.flags[f]).map(([, t]) => t.replace(/\{hero\}/g, s.heroName)).join('\n\n');
          show(`${c.id === 'rhen' ? s.heroName : c.fullName ?? c.name}${c.title ? ' — ' + c.title : ''}`, `${JOBS.get(c.job)?.name ?? ''}\n\n${bio || '…'}`);
        } }).promise;
      }
      if (sec === 'artefacts') {
        const list = s.artefacts.map((id) => ARTEFACTS.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof ARTEFACTS.get>>[];
        await menu({ items: list.length ? list.map((a) => ({ label: a.name, value: a.id })) : [{ label: 'None found — send parties on errands', value: '', disabled: true }], x: 16, y: 64, title: 'Artefacts', parent: ov.root, maxHeight: '70vh', onHover: (id) => { const a = ARTEFACTS.get(id as string); if (a) show(a.name, a.desc); } }).promise;
      }
      if (sec === 'stones') {
        await menu({
          items: ZODIAC_STONES.map((z) => ({ label: `${ZODIAC_GLYPH[z.sign]}  ${s.flags[z.flag] ? ZODIAC_NAMES[z.sign] : '— unknown —'}`, value: z.sign, disabled: !s.flags[z.flag] })),
          x: 16, y: 64, title: 'Zodiac Stones', parent: ov.root, maxHeight: '70vh',
          onHover: (id) => { const z = ZODIAC_STONES.find((q) => q.sign === id); if (z && s.flags[z.flag]) show(`${ZODIAC_GLYPH[z.sign]} The Stone of ${ZODIAC_NAMES[z.sign]}`, `${z.lore}\n\nFound: ${z.where}.`); },
        }).promise;
      }
      if (sec === 'errands') {
        const list = s.errandsDone.map((id) => ERRANDS.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof ERRANDS.get>>[];
        await menu({ items: list.length ? list.map((e) => ({ label: e.title, value: e.id })) : [{ label: 'No errands completed', value: '', disabled: true }], x: 16, y: 64, title: 'Errands', parent: ov.root, maxHeight: '70vh', onHover: (id) => { const e = ERRANDS.get(id as string); if (e) show(e.title, e.report); } }).promise;
      }
      if (sec === 'records') {
        const hrs = Math.floor(s.playtime / 3600), mins = Math.floor((s.playtime % 3600) / 60);
        show('Records', `Play time: ${hrs}h ${mins}m\nDays travelled: ${s.day}\nBattles won: ${s.battlesWon}\nCompany size: ${s.roster.length}\nErrands completed: ${s.errandsDone.length}\nArtefacts found: ${s.artefacts.length}\nRumours heard: ${s.rumorsRead.length}`);
        await new Promise<void>((resolve) => { const pop = input.push((a) => { if (a === 'confirm' || a === 'cancel') { pop(); resolve(); } return true; }); });
      }
      body?.remove(); body = null;
    }
  } finally { body?.remove(); ov.close(); }
}
