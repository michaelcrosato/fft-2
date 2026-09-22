// Town services: outfitter (buy/sell), soldier office (recruit), tavern
// (rumours & errands), fur shop.
import type { Game } from '../../game/game';
import type { WorldNode, ItemDef } from '../../data/types';
import { ITEMS, ERRANDS, JOBS } from '../../data/db';
import { menu, toast, confirm } from '../widgets';
import { h } from '../dom';
import { overlay, unitPanel } from './common';
import { addItem, partyLevel } from '../../game/state';
import { canEquip, createGeneric, slotFor } from '../../game/roster';
import { audio } from '../../audio/audio';
import { Rng } from '../../core/rng';
import { input } from '../input';
import { STATUS } from '../../battle/status';

type Rumor = { id: string; title: string; text: string; towns: string[]; chapterMin: number; chapterMax?: number; needs?: string[] };
const rumorMods = import.meta.glob<{ rumors?: Rumor[] }>('../../data/misc/*.ts', { eager: true });
const RUMORS: Rumor[] = Object.values(rumorMods).flatMap((m) => m.rumors ?? []);

const CATS: Array<{ label: string; test: (i: ItemDef) => boolean }> = [
  { label: 'Weapons', test: (i) => i.kind === 'weapon' },
  { label: 'Shields', test: (i) => i.kind === 'shield' },
  { label: 'Headgear', test: (i) => i.kind === 'head' },
  { label: 'Armour & Robes', test: (i) => i.kind === 'body' },
  { label: 'Accessories', test: (i) => i.kind === 'accessory' },
  { label: 'Items', test: (i) => i.kind === 'consumable' || i.kind === 'throwable' },
];

export async function openShop(game: Game, node: WorldNode) {
  const s = game.state;
  const ov = overlay(`${node.name} Outfitter`);
  const gilBox = h('div.panel', { style: { right: '16px', top: '14px', padding: '4px 14px' } });
  ov.root.appendChild(gilBox);
  const upd = () => { gilBox.textContent = `${s.gil.toLocaleString()} gil`; };
  upd();
  audio.playMusic('town', { fade: 1 });
  try {
    for (;;) {
      const mode = await menu({ items: [{ label: 'Buy', value: 'buy' }, { label: 'Sell', value: 'sell' }, { label: 'Leave', value: 'leave' }], x: 16, y: 64, title: 'Outfitter', parent: ov.root }).promise;
      if (!mode || mode === 'leave') return;
      if (mode === 'buy') {
        for (;;) {
          const stock = [...ITEMS.values()].filter((i) => i.shopTier && i.shopTier <= s.tier && i.price > 0 && !i.rare);
          const cat = await menu({ items: CATS.map((c) => ({ label: c.label, value: c.label, disabled: !stock.some(c.test) })), x: 16, y: 64, title: 'Buy', parent: ov.root }).promise;
          if (!cat) break;
          const c = CATS.find((x) => x.label === cat)!;
          for (;;) {
            const list = stock.filter(c.test).sort((a, b) => a.price - b.price);
            let info: HTMLElement | null = null;
            const pick = await menu({
              items: list.map((it) => ({ label: it.name, value: it.id, right: `${it.price} · own ${s.inventory[it.id] ?? 0}`, disabled: it.price > s.gil ? 'Not enough gil' : false, desc: it.desc })),
              x: 16, y: 64, title: cat, parent: ov.root, showDesc: true, maxHeight: '62vh',
              onHover: (id) => { info?.remove(); const it = id ? ITEMS.get(id as string) : undefined; if (it) { info = itemPanel(game, it); ov.root.appendChild(info); } },
            }).promise;
            (info as HTMLElement | null)?.remove();
            if (!pick) break;
            const it = ITEMS.get(pick)!;
            const maxN = Math.min(99, Math.floor(s.gil / it.price));
            const n = await quantity(ov.root, it.name, maxN, it.price);
            if (n > 0) { s.gil -= it.price * n; addItem(s, it.id, n); audio.sfx('gil'); upd(); }
          }
        }
      }
      if (mode === 'sell') {
        for (;;) {
          const own = Object.entries(s.inventory).filter(([id, n]) => n > 0 && ITEMS.get(id)).map(([id, n]) => ({ it: ITEMS.get(id)!, n }));
          const pick = await menu({ items: own.map(({ it, n }) => ({ label: it.name, value: it.id, right: `×${n} · ${Math.floor(it.price / 2)}` })), x: 16, y: 64, title: 'Sell', parent: ov.root, maxHeight: '62vh' }).promise;
          if (!pick) break;
          const it = ITEMS.get(pick)!;
          const n = await quantity(ov.root, it.name, s.inventory[pick], Math.floor(it.price / 2));
          if (n > 0) { s.gil += Math.floor(it.price / 2) * n; addItem(s, pick, -n); audio.sfx('gil'); upd(); }
        }
      }
    }
  } finally { ov.close(); }
}

const EL_NAMES: Record<string, string> = { fire: 'Fire', ice: 'Ice', lightning: 'Lightning', water: 'Water', earth: 'Earth', wind: 'Wind', holy: 'Holy', dark: 'Dark' };

/** FFT-style shop detail: the item's numbers, then who in the company could use it and what it would change */
function itemPanel(game: Game, it: ItemDef): HTMLElement {
  const rows: Array<[string, string]> = [];
  const pct = (n?: number) => `${n ?? 0}%`;
  if (it.kind === 'weapon') { rows.push(['Weapon power', String(it.wp ?? 0)]); rows.push(['Weapon evade', pct(it.wev)]); if (it.range && it.range > 1) rows.push(['Range', String(it.range)]); }
  if (it.kind === 'shield') { rows.push(['Physical evade', pct(it.sev)]); rows.push(['Magic evade', pct(it.smev)]); }
  if (it.hp) rows.push(['HP', '+' + it.hp]);
  if (it.mp) rows.push(['MP', '+' + it.mp]);
  if (it.aev) rows.push(['Physical evade', pct(it.aev)]);
  if (it.amev) rows.push(['Magic evade', pct(it.amev)]);
  for (const [k, v] of Object.entries(it.stats ?? {})) rows.push([({ pa: 'PA', ma: 'MA', speed: 'Speed', move: 'Move', jump: 'Jump', brave: 'Brave', faith: 'Faith' } as Record<string, string>)[k] ?? k, (v! > 0 ? '+' : '') + v]);
  if (it.element) rows.push(['Element', EL_NAMES[it.element] ?? it.element]);
  if (it.twoHanded) rows.push(['Grip', 'Two hands']);
  const st = (l?: string[]) => (l ?? []).map((x) => STATUS[x as keyof typeof STATUS]?.name ?? x).join(', ');
  if (it.always?.length) rows.push(['Always', st(it.always)]);
  if (it.start?.length) rows.push(['On entering battle', st(it.start)]);
  if (it.immune?.length) rows.push(['Immune to', st(it.immune)]);
  const els = (l?: string[]) => (l ?? []).map((x) => EL_NAMES[x] ?? x).join(', ');
  if (it.absorb?.length) rows.push(['Absorbs', els(it.absorb)]);
  if (it.nullify?.length) rows.push(['Nullifies', els(it.nullify)]);
  if (it.halve?.length) rows.push(['Halves', els(it.halve)]);
  if (it.boost?.length) rows.push(['Strengthens', els(it.boost)]);
  if (it.onHit) rows.push(['On hit', `${it.onHit.chance}%: ${[st(it.onHit.status), it.onHit.spell ? 'casts ' + it.onHit.spell : '', it.onHit.cure?.length ? 'cures ' + st(it.onHit.cure) : ''].filter(Boolean).join(', ')}`]);
  if (it.healOnHit) rows.push(['On hit', 'heals instead of harming']);
  if (it.drain) rows.push(['On hit', 'drains HP']);
  const slots = slotFor(it);
  const users = game.state.roster.filter((u) => !u.errand && slots.some((sl) => canEquip(u, it, sl)));
  const cmp = (u: (typeof users)[number]) => {
    const cur = ITEMS.get(u.equip[slots[0]] ?? '');
    if (it.kind === 'weapon') { const d = (it.wp ?? 0) - (cur?.wp ?? 0); return d ? `WP ${d > 0 ? '+' : ''}${d}` : '='; }
    if (it.kind === 'head' || it.kind === 'body') { const d = (it.hp ?? 0) - (cur?.hp ?? 0); return d ? `HP ${d > 0 ? '+' : ''}${d}` : '='; }
    if (it.kind === 'shield') { const d = (it.sev ?? 0) - (cur?.sev ?? 0); return d ? `Ev ${d > 0 ? '+' : ''}${d}%` : '='; }
    return cur?.id === it.id ? 'equipped' : '';
  };
  const kindName = it.cat ? it.cat.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()) : it.kind === 'consumable' ? 'Consumable' : it.kind === 'throwable' ? 'Throwing weapon' : it.kind.replace(/^./, (c) => c.toUpperCase());
  return h('div.panel', { style: { right: '16px', top: '64px', width: 'min(420px, 44vw)', maxHeight: '78vh', overflowY: 'auto' } },
    h('div', { style: { fontFamily: 'Cinzel, serif', fontWeight: '700', fontSize: '1.15em' } }, it.name),
    h('div.muted', { style: { margin: '0 0 6px' } }, `${kindName} · ${it.price.toLocaleString()} gil`),
    ...rows.map(([k, v]) => h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '12px' } }, h('span', null, k), h('b', null, v))),
    slots.length ? h('div', { style: { marginTop: '8px', borderTop: '1px solid rgba(90,60,30,.25)', paddingTop: '6px' } },
      h('div.muted', null, users.length ? 'Can equip' : 'No one in the company can equip this'),
      ...users.slice(0, 10).map((u) => h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, h('span', null, `${u.name} · ${JOBS.get(u.job)?.name ?? u.job}`), h('span', null, cmp(u))))) : null,
  );
}

async function quantity(parent: HTMLElement, name: string, max: number, unit: number): Promise<number> {
  if (max <= 0) return 0;
  let n = 1;
  const box = h('div.panel', { style: { left: '50%', top: '45%', transform: 'translate(-50%,-50%)', textAlign: 'center', minWidth: '280px' } });
  const txt = h('div', { style: { fontSize: '1.2em', margin: '6px 0' } });
  const upd = () => { txt.textContent = `${name} × ${n} — ${n * unit} gil`; };
  upd();
  box.appendChild(h('div.title-plate', null, 'Quantity'));
  box.appendChild(txt);
  box.appendChild(h('div.muted', null, '←→ ±1 · ↑↓ ±10 · Enter confirm'));
  const minus = h('span.btn', { style: { margin: '6px' } }, '−'), plus = h('span.btn', { style: { margin: '6px' } }, '+'), ok = h('span.btn', { style: { margin: '6px' } }, 'OK');
  box.appendChild(h('div', null, minus, ok, plus));
  parent.appendChild(box);
  return new Promise((resolve) => {
    const done = (v: number) => { pop(); box.remove(); resolve(v); };
    minus.onclick = () => { n = Math.max(1, n - 1); upd(); };
    plus.onclick = () => { n = Math.min(max, n + 1); upd(); };
    ok.onclick = () => done(n);
    const pop = input.push((a) => {
      if (a === 'left') { n = Math.max(1, n - 1); upd(); }
      if (a === 'right') { n = Math.min(max, n + 1); upd(); }
      if (a === 'up') { n = Math.min(max, n + 10); upd(); }
      if (a === 'down') { n = Math.max(1, n - 10); upd(); }
      if (a === 'confirm') done(n);
      if (a === 'cancel') done(0);
      return true;
    });
  });
}

export async function openRecruit(game: Game, node: WorldNode) {
  const s = game.state;
  const ov = overlay(`${node.name} Soldier Office`);
  const rng = new Rng(s.seed + s.day * 17 + node.pos[0]);
  const lv = Math.max(1, partyLevel(s) - 2);
  const cands = Array.from({ length: 4 }, (_, i) => createGeneric({ gender: i % 2 ? 'f' : 'm', level: lv + rng.int(-1, 1), rng, job: i % 3 === 2 ? 'chemist' : 'squire' }));
  for (const c of cands) { c.equip = c.job === 'chemist' ? { rhand: 'dagger', body: 'clothes' } : { rhand: 'broadsword', body: 'clothes' }; }
  const cost = 600 + lv * 150;
  let detail = null as HTMLElement | null;
  try {
    for (;;) {
      if (s.roster.length >= 24) { toast('Your company is full (24).'); return; }
      const pick = await menu({
        items: cands.map((c) => ({ label: c.name, value: c.uid, right: `${c.gender === 'm' ? '♂' : '♀'} Lv${c.level} Br${c.brave} Fa${c.faith}`, disabled: s.gil < cost ? `Costs ${cost} gil` : false })),
        x: 16, y: 64, title: `Recruit — ${cost} gil`, parent: ov.root,
        onHover: (uid) => { detail?.remove(); const c = cands.find((x) => x.uid === uid); if (c) { detail = unitPanel(c); detail.style.position = 'absolute'; detail.style.right = '16px'; detail.style.top = '64px'; ov.root.appendChild(detail); } },
      }).promise;
      if (!pick) return;
      const c = cands.find((x) => x.uid === pick)!;
      if (await confirm(`Hire ${c.name} for ${cost} gil?`)) {
        s.gil -= cost; s.roster.push(c); cands.splice(cands.indexOf(c), 1);
        audio.sfx('gil'); toast(`${c.name} joins the company.`);
        if (!cands.length) return;
      }
    }
  } finally { detail?.remove(); ov.close(); }
}

export async function openTavern(game: Game, node: WorldNode) {
  const s = game.state;
  const ov = overlay(`${node.name} Tavern`);
  audio.playMusic('tavern', { fade: 1 });
  try {
    for (;;) {
      const pick = await menu({ items: [{ label: 'Rumours', value: 'rumors' }, { label: 'Errands', value: 'errands' }, { label: 'Errands underway', value: 'away' }, { label: 'Leave', value: 'leave' }], x: 16, y: 64, title: 'Tavern', parent: ov.root }).promise;
      if (!pick || pick === 'leave') { audio.playMusic('town', { fade: 1 }); return; }
      if (pick === 'rumors') {
        for (;;) {
          const list = RUMORS.filter((r) => r.towns.includes(node.id) || r.towns.includes('*') || !r.towns.length).filter((r) => s.chapter >= r.chapterMin && (r.chapterMax === undefined || s.chapter <= r.chapterMax) && (r.needs ?? []).every((f) => s.flags[f]));
          if (!list.length) { toast('The tavern is quiet tonight.'); break; }
          const r = await menu({ items: list.map((x) => ({ label: (s.rumorsRead.includes(x.id) ? '' : '• ') + x.title, value: x.id })), x: 16, y: 64, title: 'Rumours', parent: ov.root, maxHeight: '62vh' }).promise;
          if (!r) break;
          const rm = list.find((x) => x.id === r)!;
          if (!s.rumorsRead.includes(rm.id)) s.rumorsRead.push(rm.id);
          if (rm.id && rm.needs === undefined) s.flags['rumor_' + rm.id] = true;
          await readText(ov.root, rm.title, rm.text);
        }
      }
      if (pick === 'errands') {
        const list = [...ERRANDS.values()].filter((e) => e.towns.includes(node.id) && s.chapter >= e.chapterMin && (e.chapterMax === undefined || s.chapter <= e.chapterMax) && (e.needs ?? []).every((f) => s.flags[f]) && !s.errandsDone.includes(e.id) && !s.errands.some((r) => r.id === e.id));
        if (!list.length) { toast('No errands posted here now.'); continue; }
        const eid = await menu({ items: list.map((e) => ({ label: e.title, value: e.id, right: `${e.fee} gil · ${e.days}d`, desc: `${e.desc}  (Reward ~${e.reward.gil} gil${e.reward.jp ? `, ${e.reward.jp} JP` : ''})` })), x: 16, y: 64, title: 'Errands', parent: ov.root, showDesc: true, maxHeight: '60vh' }).promise;
        if (!eid) continue;
        const e = ERRANDS.get(eid)!;
        if (s.gil < e.fee) { toast('You cannot afford the fee.'); continue; }
        const avail = s.roster.filter((u) => !u.errand && !u.charId && u.gender !== 'monster');
        if (!avail.length) { toast('No free generic soldiers to send (story characters must stay).'); continue; }
        const chosen: string[] = [];
        for (;;) {
          const u = await menu({ items: [...avail.map((x) => ({ label: (chosen.includes(x.uid) ? '◆ ' : '◇ ') + x.name, value: x.uid, right: `${JOBS.get(x.job)?.name} Br${x.brave} Fa${x.faith}` })), { label: `Send ${chosen.length} (fee ${e.fee})`, value: '__go', disabled: !chosen.length }], x: 16, y: 64, title: `Send on: ${e.title}`, parent: ov.root, maxHeight: '60vh' }).promise;
          if (!u) break;
          if (u === '__go') {
            s.gil -= e.fee;
            s.errands.push({ id: e.id, units: [...chosen], start: s.day, due: s.day + e.days });
            for (const uid of chosen) { const r = s.roster.find((x) => x.uid === uid); if (r) r.errand = e.id; }
            toast(`${chosen.length} set out: ${e.title}. Return in ${e.days} days.`);
            break;
          }
          if (chosen.includes(u)) chosen.splice(chosen.indexOf(u), 1); else if (chosen.length < 3) chosen.push(u);
        }
      }
      if (pick === 'away') {
        if (!s.errands.length) { toast('No one is away.'); continue; }
        await menu({ items: s.errands.map((r) => ({ label: ERRANDS.get(r.id)?.title ?? r.id, value: r.id, right: `${Math.max(0, r.due - s.day)} days left` })), x: 16, y: 64, title: 'Underway', parent: ov.root }).promise;
      }
    }
  } finally { ov.close(); }
}

async function readText(parent: HTMLElement, title: string, text: string) {
  const box = h('div.panel', { style: { left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(640px, 92vw)', maxHeight: '70vh', overflowY: 'auto' } },
    h('div.title-plate', null, title), h('div', { style: { whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: '1.05em', marginTop: '6px' } }, text));
  parent.appendChild(box);
  await new Promise<void>((resolve) => { const pop = input.push((a) => { if (a === 'confirm' || a === 'cancel') { pop(); resolve(); } return true; }); box.addEventListener('click', () => input.dispatch('confirm')); });
  box.remove();
}

export async function openFurShop(game: Game, node: WorldNode) {
  const s = game.state;
  const ov = overlay(`${node.name} Fur Shop`);
  try {
    for (;;) {
      const list = Object.entries(s.furStock).filter(([id, n]) => n > 0 && ITEMS.get(id));
      if (!list.length) { toast('Bring the spoils of the hunt — poach monsters with the Poach support ability.', 3500); return; }
      const pick = await menu({ items: list.map(([id, n]) => { const it = ITEMS.get(id)!; const price = Math.max(100, it.price || 500); return { label: it.name, value: id, right: `${price} · stock ${n}`, disabled: s.gil < price ? 'Not enough gil' : false, desc: it.desc }; }), x: 16, y: 64, title: 'Fur Shop', parent: ov.root, showDesc: true }).promise;
      if (!pick) return;
      const it = ITEMS.get(pick)!;
      const price = Math.max(100, it.price || 500);
      s.gil -= price; s.furStock[pick]--; addItem(s, pick, 1); audio.sfx('gil');
    }
  } finally { ov.close(); }
}
