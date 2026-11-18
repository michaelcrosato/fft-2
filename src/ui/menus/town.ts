// Town services: outfitter (buy/sell), soldier office (recruit), tavern
// (rumours & errands), fur shop.
import type { Game } from '../../game/game';
import type { WorldNode, ItemDef, ErrandDef, EquipCategory, ItemKind } from '../../data/types';
import { ITEMS, ERRANDS, JOBS, ABILITIES } from '../../data/db';
import { menu, toast, confirm } from '../widgets';
import { h } from '../dom';
import { overlay, unitPanel, elementName, statName } from './common';
import { fmtList, fmtNum, t } from '../../i18n';
import { addItem, partyLevel } from '../../game/state';
import { canEquip, createGeneric, slotFor } from '../../game/roster';
import { audio } from '../../audio/audio';
import { Rng } from '../../core/rng';
import { input } from '../input';
import { STATUS } from '../../battle/status';

type Rumor = { id: string; title: string; text: string; towns: string[]; chapterMin: number; chapterMax?: number; needs?: string[] };
const ERRAND_STAT: Record<ErrandDef['stat'], string> = { brave: 'menus.stat.brave', faith: 'menus.stat.faith', level: 'town.errand.level', pa: 'menus.stat.pa', ma: 'menus.stat.ma', speed: 'menus.stat.speed' };

const rumorMods = import.meta.glob<{ rumors?: Rumor[] }>('../../data/misc/*.ts', { eager: true });
const RUMORS: Rumor[] = Object.values(rumorMods).flatMap((m) => m.rumors ?? []);

// `line` names the category and is the menu's value
const CATS: Array<{ line: string; test: (i: ItemDef) => boolean }> = [
  { line: 'town.shop.weapons', test: (i) => i.kind === 'weapon' },
  { line: 'town.shop.shields', test: (i) => i.kind === 'shield' },
  { line: 'town.shop.headgear', test: (i) => i.kind === 'head' },
  { line: 'town.shop.armour', test: (i) => i.kind === 'body' },
  { line: 'town.shop.accessories', test: (i) => i.kind === 'accessory' },
  { line: 'town.shop.items', test: (i) => i.kind === 'consumable' || i.kind === 'throwable' },
];

export async function openShop(game: Game, node: WorldNode) {
  const s = game.state;
  const ov = overlay(t('town.shop.title', { town: node.name }));
  const gilBox = h('div.panel', { style: { right: '16px', top: '14px', padding: '4px 14px' } });
  ov.root.appendChild(gilBox);
  const upd = () => { gilBox.textContent = t('town.gil', { gil: s.gil }); };
  upd();
  audio.playMusic('town', { fade: 1 });
  try {
    for (;;) {
      const mode = await menu({ items: [{ label: t('town.shop.buy'), value: 'buy' }, { label: t('town.shop.sell'), value: 'sell' }, { label: t('town.leave'), value: 'leave' }], x: 16, y: 64, title: t('town.shop.outfitter'), parent: ov.root }).promise;
      if (!mode || mode === 'leave') return;
      if (mode === 'buy') {
        for (;;) {
          const stock = [...ITEMS.values()].filter((i) => i.shopTier && i.shopTier <= s.tier && i.price > 0 && !i.rare);
          const cat = await menu({ items: CATS.map((c) => ({ label: t(c.line), value: c.line, disabled: !stock.some(c.test) })), x: 16, y: 64, title: t('town.shop.buy'), parent: ov.root }).promise;
          if (!cat) break;
          const c = CATS.find((x) => x.line === cat)!;
          for (;;) {
            const list = stock.filter(c.test).sort((a, b) => a.price - b.price);
            let info: HTMLElement | null = null;
            const pick = await menu({
              items: list.map((it) => ({ label: it.name, value: it.id, right: t('town.shop.price_owned', { price: it.price, owned: s.inventory[it.id] ?? 0 }), disabled: it.price > s.gil ? t('town.not_enough_gil') : false, desc: it.desc })),
              x: 16, y: 64, title: t(c.line), parent: ov.root, showDesc: true, maxHeight: 'calc(62 * var(--vh))',
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
          if (!own.length) { toast(t('town.shop.nothing_to_sell')); break; }
          // priceless rarities (quest rewards, artefact-grade gear) can't be sold off for nothing by accident
          const pick = await menu({ items: own.map(({ it, n }) => ({ label: it.name, value: it.id, right: it.price > 0 ? t('town.shop.sell_price', { owned: n, price: Math.floor(it.price / 2) }) : t('town.shop.sell_no_price', { owned: n }), disabled: it.price > 0 ? false : t('town.shop.too_rare') })), x: 16, y: 64, title: t('town.shop.sell'), parent: ov.root, maxHeight: 'calc(62 * var(--vh))' }).promise;
          if (!pick) break;
          const it = ITEMS.get(pick)!;
          const n = await quantity(ov.root, it.name, s.inventory[pick], Math.floor(it.price / 2));
          if (n > 0) { s.gil += Math.floor(it.price / 2) * n; addItem(s, pick, -n); audio.sfx('gil'); upd(); }
        }
      }
    }
  } finally { ov.close(); }
}

const KIND_LINES: Record<ItemKind, string> = {
  weapon: 'town.item.kind.weapon', shield: 'town.item.kind.shield', head: 'town.item.kind.head', body: 'town.item.kind.body', accessory: 'town.item.kind.accessory',
  consumable: 'town.item.kind.consumable', throwable: 'town.item.kind.throwable', key: 'town.item.kind.key', loot: 'town.item.kind.loot',
};
const CAT_LINES: Record<EquipCategory, string> = {
  fist: 'town.item.cat.fist', knife: 'town.item.cat.knife', ninjaBlade: 'town.item.cat.ninja_blade', sword: 'town.item.cat.sword',
  knightSword: 'town.item.cat.knight_sword', katana: 'town.item.cat.katana', axe: 'town.item.cat.axe', rod: 'town.item.cat.rod',
  staff: 'town.item.cat.staff', flail: 'town.item.cat.flail', gun: 'town.item.cat.gun', magicGun: 'town.item.cat.magic_gun',
  crossbow: 'town.item.cat.crossbow', bow: 'town.item.cat.bow', instrument: 'town.item.cat.instrument', book: 'town.item.cat.book',
  spear: 'town.item.cat.spear', pole: 'town.item.cat.pole', bag: 'town.item.cat.bag', cloth: 'town.item.cat.cloth',
  shield: 'town.item.cat.shield', helmet: 'town.item.cat.helmet', hat: 'town.item.cat.hat', ribbon: 'town.item.cat.ribbon',
  armor: 'town.item.cat.armor', clothes: 'town.item.cat.clothes', robe: 'town.item.cat.robe', mantle: 'town.item.cat.mantle',
  armlet: 'town.item.cat.armlet', ring: 'town.item.cat.ring', shoes: 'town.item.cat.shoes', perfume: 'town.item.cat.perfume',
};

/** FFT-style shop detail: the item's numbers, then who in the company could use it and what it would change */
function itemPanel(game: Game, it: ItemDef): HTMLElement {
  const rows: Array<[string, string]> = [];
  const pct = (n?: number) => t('menus.percent', { value: n ?? 0 });
  if (it.kind === 'weapon') { rows.push([t('menus.stat.weapon_power'), fmtNum(it.wp ?? 0)]); rows.push([t('town.item.weapon_evade'), pct(it.wev)]); if (it.range && it.range > 1) rows.push([t('town.item.range'), fmtNum(it.range)]); }
  if (it.kind === 'shield') { rows.push([t('town.item.physical_evade'), pct(it.sev)]); rows.push([t('town.item.magic_evade'), pct(it.smev)]); }
  if (it.hp) rows.push([t('menus.stat.hp'), t('menus.bonus', { value: it.hp })]);
  if (it.mp) rows.push([t('menus.stat.mp'), t('menus.bonus', { value: it.mp })]);
  if (it.aev) rows.push([t('town.item.physical_evade'), pct(it.aev)]);
  if (it.amev) rows.push([t('town.item.magic_evade'), pct(it.amev)]);
  for (const [k, v] of Object.entries(it.stats ?? {})) rows.push([statName(k), v! > 0 ? t('menus.bonus', { value: v! }) : fmtNum(v!)]);
  if (it.element) rows.push([t('town.item.element'), elementName(it.element)]);
  if (it.twoHanded) rows.push([t('town.item.grip'), t('town.item.two_hands')]);
  const st = (l?: string[]) => fmtList((l ?? []).map((x) => STATUS[x as keyof typeof STATUS]?.name ?? x));
  if (it.always?.length) rows.push([t('town.item.always'), st(it.always)]);
  if (it.start?.length) rows.push([t('town.item.on_battle_start'), st(it.start)]);
  if (it.immune?.length) rows.push([t('town.item.immune'), st(it.immune)]);
  const els = (l?: string[]) => fmtList((l ?? []).map(elementName));
  if (it.absorb?.length) rows.push([t('town.item.absorbs'), els(it.absorb)]);
  if (it.nullify?.length) rows.push([t('town.item.nullifies'), els(it.nullify)]);
  if (it.halve?.length) rows.push([t('town.item.halves'), els(it.halve)]);
  if (it.boost?.length) rows.push([t('town.item.strengthens'), els(it.boost)]);
  if (it.onHit) {
    const effects = [st(it.onHit.status), it.onHit.spell ? t('town.item.casts', { spell: ABILITIES.get(it.onHit.spell)?.name ?? it.onHit.spell }) : '', it.onHit.cure?.length ? t('town.item.cures', { statuses: st(it.onHit.cure) }) : ''].filter(Boolean);
    rows.push([t('town.item.on_hit'), t('town.item.on_hit_chance', { chance: it.onHit.chance, effects: fmtList(effects) })]);
  }
  if (it.healOnHit) rows.push([t('town.item.on_hit'), t('town.item.heals')]);
  if (it.drain) rows.push([t('town.item.on_hit'), t('town.item.drains')]);
  const slots = slotFor(it);
  const users = game.state.roster.filter((u) => !u.errand && slots.some((sl) => canEquip(u, it, sl)));
  const cmp = (u: (typeof users)[number]) => {
    const cur = ITEMS.get(u.equip[slots[0]] ?? '');
    const diff = (d: number, up: string, down: string) => (d > 0 ? t(up, { amount: d }) : d < 0 ? t(down, { amount: -d }) : '=');
    if (it.kind === 'weapon') return diff((it.wp ?? 0) - (cur?.wp ?? 0), 'town.item.wp_up', 'town.item.wp_down');
    if (it.kind === 'head' || it.kind === 'body') return diff((it.hp ?? 0) - (cur?.hp ?? 0), 'town.item.hp_up', 'town.item.hp_down');
    if (it.kind === 'shield') return diff((it.sev ?? 0) - (cur?.sev ?? 0), 'town.item.evade_up', 'town.item.evade_down');
    return cur?.id === it.id ? t('town.item.equipped') : '';
  };
  const kindLine = it.cat ? CAT_LINES[it.cat] : KIND_LINES[it.kind];
  const kindName = kindLine ? t(kindLine) : it.cat ?? it.kind;
  return h('div.panel.detail', { style: { right: '16px', top: '64px', width: 'min(420px, 44vw)', maxHeight: 'calc(78 * var(--vh))', overflowY: 'auto' } },
    h('div', { style: { fontFamily: 'Cinzel, serif', fontWeight: '700', fontSize: '1.15em' } }, it.name),
    h('div.muted', { style: { margin: '0 0 6px' } }, t('town.item.kind_price', { kind: kindName, price: it.price })),
    ...rows.map(([k, v]) => h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '12px' } }, h('span', null, k), h('b', null, v))),
    slots.length ? h('div', { style: { marginTop: '8px', borderTop: '1px solid rgba(90,60,30,.25)', paddingTop: '6px' } },
      h('div.muted', null, users.length ? t('town.item.can_equip') : t('town.item.no_one_can_equip')),
      ...users.slice(0, 10).map((u) => h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, h('span', null, t('town.item.user', { name: u.name, job: JOBS.get(u.job)?.name ?? u.job })), h('span', null, cmp(u))))) : null,
  );
}

async function quantity(parent: HTMLElement, name: string, max: number, unit: number): Promise<number> {
  if (max <= 0) return 0;
  let n = 1;
  const box = h('div.panel', { style: { left: '50%', top: '45%', transform: 'translate(-50%,-50%)', textAlign: 'center', minWidth: '280px' } });
  const txt = h('div', { style: { fontSize: '1.2em', margin: '6px 0' } });
  const upd = () => { txt.textContent = t('town.qty.line', { item: name, amount: n, gil: n * unit }); };
  upd();
  box.appendChild(h('div.title-plate', null, t('town.qty.title')));
  box.appendChild(txt);
  box.appendChild(h('div.muted', null, input.lastDevice === 'pad' ? t('town.qty.hint_pad') : input.lastDevice === 'touch' ? '' : t('town.qty.hint_keys')));
  const minus = h('span.btn', { style: { margin: '6px' } }, '−'), plus = h('span.btn', { style: { margin: '6px' } }, '+'), ok = h('span.btn', { style: { margin: '6px' } }, t('menus.ok'));
  const cancel = h('span.btn.ghost', { style: { margin: '6px' } }, t('menus.cancel'));
  box.appendChild(h('div', null, minus, ok, plus));
  box.appendChild(h('div', null, cancel));
  parent.appendChild(box);
  return new Promise((resolve) => {
    const done = (v: number) => { pop(); box.remove(); resolve(v); };
    minus.onclick = () => { n = Math.max(1, n - 1); upd(); };
    plus.onclick = () => { n = Math.min(max, n + 1); upd(); };
    ok.onclick = () => done(n);
    cancel.onclick = () => done(0);
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
  const ov = overlay(t('town.recruit.title', { town: node.name }));
  const rng = new Rng(s.seed + s.day * 17 + node.pos[0]);
  const lv = Math.max(1, partyLevel(s) - 2);
  const cands = Array.from({ length: 4 }, (_, i) => createGeneric({ gender: i % 2 ? 'f' : 'm', level: Math.max(1, lv + rng.int(-1, 1)), rng, job: i % 3 === 2 ? 'chemist' : 'squire' }));
  for (const c of cands) { c.equip = c.job === 'chemist' ? { rhand: 'dagger', body: 'clothes' } : { rhand: 'broadsword', body: 'clothes' }; }
  const cost = 600 + lv * 150;
  let detail = null as HTMLElement | null;
  try {
    for (;;) {
      if (s.roster.length >= 24) { toast(t('town.recruit.full', { max: 24 })); return; }
      const pick = await menu({
        items: cands.map((c) => ({ label: c.name, value: c.uid, right: t('town.recruit.stats', { sex: c.gender === 'm' ? '♂' : '♀', level: c.level, brave: c.brave, faith: c.faith }), disabled: s.gil < cost ? t('town.recruit.costs', { gil: cost }) : false })),
        x: 16, y: 64, title: t('town.recruit.menu_title', { gil: cost }), parent: ov.root,
        onHover: (uid) => { detail?.remove(); const c = cands.find((x) => x.uid === uid); if (c) { detail = unitPanel(c); detail.classList.add('detail'); detail.style.position = 'absolute'; detail.style.right = '16px'; detail.style.top = '64px'; ov.root.appendChild(detail); } },
      }).promise;
      if (!pick) return;
      const c = cands.find((x) => x.uid === pick)!;
      if (await confirm(t('town.recruit.hire_ask', { name: c.name, gil: cost }))) {
        s.gil -= cost; s.roster.push(c); cands.splice(cands.indexOf(c), 1);
        audio.sfx('gil'); toast(t('town.recruit.joined', { name: c.name }));
        if (!cands.length) return;
      }
    }
  } finally { detail?.remove(); ov.close(); }
}

export async function openTavern(game: Game, node: WorldNode) {
  const s = game.state;
  const ov = overlay(t('town.tavern.title', { town: node.name }));
  audio.playMusic('tavern', { fade: 1 });
  try {
    for (;;) {
      const pick = await menu({ items: [{ label: t('town.tavern.rumours'), value: 'rumors' }, { label: t('town.tavern.errands'), value: 'errands' }, { label: t('town.tavern.underway'), value: 'away' }, { label: t('town.leave'), value: 'leave' }], x: 16, y: 64, title: t('town.tavern.tavern'), parent: ov.root }).promise;
      if (!pick || pick === 'leave') { audio.playMusic('town', { fade: 1 }); return; }
      if (pick === 'rumors') {
        for (;;) {
          const list = RUMORS.filter((r) => r.towns.includes(node.id) || r.towns.includes('*') || !r.towns.length).filter((r) => s.chapter >= r.chapterMin && (r.chapterMax === undefined || s.chapter <= r.chapterMax) && (r.needs ?? []).every((f) => s.flags[f]));
          if (!list.length) { toast(t('town.tavern.quiet')); break; }
          const r = await menu({ items: list.map((x) => ({ label: (s.rumorsRead.includes(x.id) ? '' : '• ') + x.title, value: x.id })), x: 16, y: 64, title: t('town.tavern.rumours'), parent: ov.root, maxHeight: 'calc(62 * var(--vh))' }).promise;
          if (!r) break;
          const rm = list.find((x) => x.id === r)!;
          if (!s.rumorsRead.includes(rm.id)) s.rumorsRead.push(rm.id);
          if (rm.id && rm.needs === undefined) s.flags['rumor_' + rm.id] = true;
          await readText(ov.root, rm.title, rm.text);
        }
      }
      if (pick === 'errands') {
        const list = [...ERRANDS.values()].filter((e) => e.towns.includes(node.id) && s.chapter >= e.chapterMin && (e.chapterMax === undefined || s.chapter <= e.chapterMax) && (e.needs ?? []).every((f) => s.flags[f]) && !s.errandsDone.includes(e.id) && !s.errands.some((r) => r.id === e.id));
        if (!list.length) { toast(t('town.errand.none')); continue; }
        const eid = await menu({ items: list.map((e) => ({ label: e.title, value: e.id, right: t('town.errand.fee_days', { fee: e.fee, days: e.days }), desc: t(e.reward.jp ? 'town.errand.desc_jp' : 'town.errand.desc', { desc: e.desc, gil: e.reward.gil, jp: e.reward.jp ?? 0, stat: t(ERRAND_STAT[e.stat]) }) })), x: 16, y: 64, title: t('town.tavern.errands'), parent: ov.root, showDesc: true, maxHeight: 'calc(60 * var(--vh))' }).promise;
        if (!eid) continue;
        const e = ERRANDS.get(eid)!;
        if (s.gil < e.fee) { toast(t('town.errand.cannot_afford')); continue; }
        const avail = s.roster.filter((u) => !u.errand && !u.charId && u.gender !== 'monster');
        if (!avail.length) { toast(t('town.errand.no_soldiers')); continue; }
        const chosen: string[] = [];
        for (;;) {
          const u = await menu({ items: [...avail.map((x) => ({ label: (chosen.includes(x.uid) ? '◆ ' : '◇ ') + x.name, value: x.uid, right: t('town.errand.unit_stats', { job: JOBS.get(x.job)?.name ?? x.job, brave: x.brave, faith: x.faith }) })), { label: t('town.errand.send', { count: chosen.length, fee: e.fee }), value: '__go', disabled: !chosen.length }], x: 16, y: 64, title: t('town.errand.send_on', { errand: e.title }), parent: ov.root, maxHeight: 'calc(60 * var(--vh))' }).promise;
          if (!u) break;
          if (u === '__go') {
            s.gil -= e.fee;
            s.errands.push({ id: e.id, units: [...chosen], start: s.day, due: s.day + e.days });
            for (const uid of chosen) { const r = s.roster.find((x) => x.uid === uid); if (r) r.errand = e.id; }
            toast(t('town.errand.set_out', { soldiers: chosen.length, errand: e.title, count: e.days }));
            break;
          }
          if (chosen.includes(u)) chosen.splice(chosen.indexOf(u), 1); else if (chosen.length < 3) chosen.push(u);
        }
      }
      if (pick === 'away') {
        if (!s.errands.length) { toast(t('town.errand.no_one_away')); continue; }
        await menu({ items: s.errands.map((r) => ({ label: ERRANDS.get(r.id)?.title ?? r.id, value: r.id, right: t('town.errand.days_left', { count: Math.max(0, r.due - s.day) }) })), x: 16, y: 64, title: t('town.errand.underway'), parent: ov.root }).promise;
      }
    }
  } finally { ov.close(); }
}

async function readText(parent: HTMLElement, title: string, text: string) {
  const box = h('div.panel', { style: { left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(640px, 92vw)', maxHeight: 'calc(70 * var(--vh))', overflowY: 'auto' } },
    h('div.title-plate', null, title), h('div', { style: { whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: '1.05em', marginTop: '6px' } }, text));
  parent.appendChild(box);
  await new Promise<void>((resolve) => { const pop = input.push((a) => { if (a === 'confirm' || a === 'cancel') { pop(); resolve(); } return true; }); box.addEventListener('click', () => input.dispatch('confirm')); });
  box.remove();
}

export async function openFurShop(game: Game, node: WorldNode) {
  const s = game.state;
  const ov = overlay(t('town.fur.title', { town: node.name }));
  try {
    for (;;) {
      const list = Object.entries(s.furStock).filter(([id, n]) => n > 0 && ITEMS.get(id));
      if (!list.length) { toast(t('town.fur.empty', { ability: ABILITIES.get('poach')?.name ?? 'poach' }), 3500); return; }
      const pick = await menu({ items: list.map(([id, n]) => { const it = ITEMS.get(id)!; const price = Math.max(100, it.price || 500); return { label: it.name, value: id, right: t('town.fur.price_stock', { price, stock: n }), disabled: s.gil < price ? t('town.not_enough_gil') : false, desc: it.desc }; }), x: 16, y: 64, title: t('town.fur.fur_shop'), parent: ov.root, showDesc: true }).promise;
      if (!pick) return;
      const it = ITEMS.get(pick)!;
      const price = Math.max(100, it.price || 500);
      s.gil -= price; s.furStock[pick]--; addItem(s, pick, 1); audio.sfx('gil');
    }
  } finally { ov.close(); }
}
