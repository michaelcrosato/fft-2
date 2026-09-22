// Formation: roster, job change, learning & setting abilities, equipment.
import type { Game } from '../../game/game';
import { menu, toast, confirm } from '../widgets';
import { h } from '../dom';
import { overlay, unitPanel, statDelta } from './common';
import { JOBS, ABILITIES, ITEMS } from '../../data/db';
import type { EquipSlot, ItemDef } from '../../data/types';
import { availableJobs, jobUnlocked, supersededJob, learnAbility, canEquip, validateEquipment, validateAbilities, unitJobLevel, type RosterUnit } from '../../game/roster';
import { addItem } from '../../game/state';
import { audio } from '../../audio/audio';
import { BattleUnit } from '../../battle/unit';

export async function openFormation(game: Game, focus?: RosterUnit) {
  const s = game.state;
  const ov = overlay('Formation');
  audio.playMusic('formation', { fade: 1 });
  let detail = null as HTMLElement | null;
  const showDetail = (u: RosterUnit | null) => {
    detail?.remove();
    if (!u) return;
    detail = unitPanel(u);
    detail.style.position = 'absolute'; detail.style.right = '16px'; detail.style.top = '64px';
    ov.root.appendChild(detail);
  };
  try {
    let last: string | undefined = focus?.uid;
    for (;;) {
      const items = s.roster.map((u) => ({ label: u.name, value: u.uid, right: `${JOBS.get(u.job)?.name ?? u.job} Lv${u.level}${u.errand ? ' (away)' : ''}` }));
      const pick = await menu({ items, x: 16, y: 64, title: `Party ${s.roster.length}`, parent: ov.root, maxHeight: '70vh', initial: last, onHover: (uid) => showDetail(s.roster.find((r) => r.uid === uid) ?? null) }).promise;
      if (!pick) break;
      last = pick;
      const u = s.roster.find((r) => r.uid === pick)!;
      await unitMenu(game, u, ov.root, () => showDetail(u));
    }
  } finally {
    detail?.remove();
    ov.close();
  }
}

async function unitMenu(game: Game, u: RosterUnit, parent: HTMLElement, refresh: () => void) {
  const s = game.state;
  for (;;) {
    refresh();
    const pick = await menu({ items: [
      { label: 'Change Job', value: 'job', disabled: u.gender === 'monster' ? 'Monsters cannot change job' : false },
      { label: 'Learn Abilities', value: 'learn', disabled: u.gender === 'monster' ? 'Monsters learn by growing' : false },
      { label: 'Set Abilities', value: 'set', disabled: u.gender === 'monster' },
      { label: 'Equipment', value: 'equip', disabled: u.gender === 'monster' },
      { label: 'Optimize Gear', value: 'optimize', disabled: u.gender === 'monster' },
      { label: 'Rename', value: 'rename', disabled: !!u.charId && u.charId !== 'rhen' },
      { label: 'Dismiss', value: 'dismiss', disabled: u.charId ? 'Cannot dismiss' : false },
    ], x: 16, y: 64, title: u.name, parent }).promise;
    if (!pick) return;
    if (pick === 'job') await jobMenu(game, u, parent, refresh);
    if (pick === 'learn') await learnMenu(u, parent, refresh);
    if (pick === 'set') await setAbilities(u, parent, refresh);
    if (pick === 'equip') await equipMenu(game, u, parent, refresh);
    if (pick === 'optimize') { optimize(game, u); audio.sfx('confirm'); toast('Equipment optimized'); }
    if (pick === 'rename') {
      const n = prompt('New name', u.name);
      if (n && n.trim()) { u.name = n.trim().slice(0, 14); if (u.charId === 'rhen') s.heroName = u.name; }
    }
    if (pick === 'dismiss') {
      if (await confirm(`Dismiss ${u.name}? They will leave the company forever.`)) {
        for (const id of Object.values(u.equip)) if (id) addItem(s, id, 1);
        s.roster = s.roster.filter((r) => r !== u);
        return;
      }
    }
  }
}

async function jobMenu(game: Game, u: RosterUnit, parent: HTMLElement, refresh: () => void) {
  // the classic job-tree order, the unit's own unique calling first
  const TREE = ['squire', 'chemist', 'knight', 'archer', 'monk', 'priest', 'wizard', 'timeMage', 'summoner', 'thief', 'orator', 'mystic', 'geomancer', 'lancer', 'samurai', 'ninja', 'arithmancer', 'bard', 'dancer', 'mime'];
  const rank = (id: string) => { const i = TREE.indexOf(id); return i < 0 ? -1 : i; };
  const all = [...JOBS.values()].filter((j) => !j.monster && (j.generic || j.unique === u.charId) && !supersededJob(u, j)).sort((a, b) => rank(a.id) - rank(b.id));
  const items = all.map((j) => {
    const ok = jobUnlocked(u, j);
    const req = (j.requires ?? []).map((r) => `${JOBS.get(r.job)?.name ?? r.job} ${r.level}`).join(', ');
    return { label: j.name, value: j.id, disabled: ok ? false : j.gender && j.gender !== u.gender ? `${j.gender === 'm' ? 'Men' : 'Women'} only` : `Requires ${req}`, right: ok ? `Lv${unitJobLevel(u, j.id)} ${u.jp[j.id] ?? 0}JP` : '🔒', desc: j.desc };
  });
  const pick = await menu({ items, x: 16, y: 64, title: 'Jobs', parent, showDesc: true, maxHeight: '62vh', initial: u.job, onHover: (jid) => {
    if (!jid) return;
    const panel = parent.querySelector('.job-delta');
    panel?.remove();
    const d = statDelta(u, jid as string);
    const el = h('div.panel.job-delta', { style: { right: '16px', bottom: '16px' } }, h('b', null, JOBS.get(jid as string)?.name ?? ''), h('div', null, d || 'No change'));
    parent.appendChild(el);
  } }).promise;
  parent.querySelector('.job-delta')?.remove();
  if (!pick || pick === u.job) return;
  u.job = pick;
  const removed = validateEquipment(u);
  for (const id of removed) addItem(game.state, id, 1);
  validateAbilities(u);
  audio.sfx('jobUp');
  toast(`${u.name} is now a ${JOBS.get(pick)?.name}.`);
  refresh();
}

async function learnMenu(u: RosterUnit, parent: HTMLElement, refresh: () => void) {
  for (;;) {
    const jobs = availableJobs(u).filter((j) => j.abilities.length);
    const jid = await menu({ items: jobs.map((j) => ({ label: j.name, value: j.id, right: `${u.jp[j.id] ?? 0} JP` })), x: 16, y: 64, title: 'Learn from…', parent, initial: u.job, maxHeight: '62vh' }).promise;
    if (!jid) return;
    for (;;) {
      const j = JOBS.get(jid)!;
      const list = j.abilities.map((a) => ABILITIES.get(a)).filter((a) => !!a) as NonNullable<ReturnType<typeof ABILITIES.get>>[];
      const items = list.filter((a) => a.jp > 0).map((a) => {
        const known = u.learned.includes(a.id);
        const kind = a.kind === 'action' ? '' : a.kind === 'reaction' ? 'R · ' : a.kind === 'support' ? 'S · ' : 'M · ';
        return { label: (known ? '✓ ' : '') + kind + a.name, value: a.id, right: known ? 'Learned' : `${a.jp} JP`, disabled: known ? 'Already learned' : (u.jp[jid] ?? 0) < a.jp ? 'Not enough JP' : false, desc: a.desc };
      });
      const pick = await menu({ items, x: 16, y: 64, title: `${j.skillset.name} — ${u.jp[jid] ?? 0} JP`, parent, showDesc: true, maxHeight: '60vh' }).promise;
      if (!pick) break;
      if (learnAbility(u, jid, pick)) { audio.sfx('learn'); toast(`Learned ${ABILITIES.get(pick)?.name}`); refresh(); }
    }
  }
}

async function setAbilities(u: RosterUnit, parent: HTMLElement, refresh: () => void) {
  for (;;) {
    refresh();
    const ab = (id?: string) => (id ? ABILITIES.get(id)?.name ?? id : '—');
    const slot = await menu({ items: [
      { label: 'Secondary', value: 'secondary', right: u.secondary ? JOBS.get(u.secondary)?.skillset.name ?? '' : '—' },
      { label: 'Reaction', value: 'reaction', right: ab(u.reaction) },
      { label: 'Support', value: 'support', right: ab(u.support) },
      { label: 'Movement', value: 'movement', right: ab(u.movement) },
    ], x: 16, y: 64, title: 'Set Abilities', parent }).promise;
    if (!slot) return;
    if (slot === 'secondary') {
      const bu = new BattleUnit(u, 0, true);
      const opts = [...JOBS.values()].filter((j) => j.id !== u.job && !j.monster && bu.skillsetActions(j.id).some((a) => u.learned.includes(a.id)));
      const pick = await menu({ items: [{ label: '— None —', value: '' }, ...opts.map((j) => ({ label: j.skillset.name, value: j.id, right: `${bu.skillsetActions(j.id).filter((a) => u.learned.includes(a.id)).length} skills` }))], x: 16, y: 64, title: 'Secondary', parent, maxHeight: '60vh' }).promise;
      if (pick !== null) u.secondary = pick || undefined;
    } else {
      const kind = slot as 'reaction' | 'support' | 'movement';
      const opts = u.learned.map((id) => ABILITIES.get(id)).filter((a) => a && a.kind === kind) as NonNullable<ReturnType<typeof ABILITIES.get>>[];
      const pick = await menu({ items: [{ label: '— None —', value: '' }, ...opts.map((a) => ({ label: a.name, value: a.id, desc: a.desc }))], x: 16, y: 64, title: slot[0].toUpperCase() + slot.slice(1), parent, showDesc: true, maxHeight: '60vh' }).promise;
      if (pick !== null) {
        u[kind] = pick || undefined;
        const removed = validateEquipment(u);
        for (const id of removed) addItem((window as any).__game.state, id, 1);
      }
    }
    audio.sfx('confirm');
  }
}

const SLOT_NAMES: Record<EquipSlot, string> = { rhand: 'Right Hand', lhand: 'Left Hand', head: 'Head', body: 'Body', accessory: 'Accessory' };

function itemScore(it: ItemDef) {
  return (it.wp ?? 0) * 3 + (it.hp ?? 0) * 0.2 + (it.mp ?? 0) * 0.15 + (it.sev ?? 0) + (it.smev ?? 0) * 0.5 + (it.aev ?? 0) + (it.amev ?? 0) * 0.5 +
    ((it.stats?.pa ?? 0) + (it.stats?.ma ?? 0)) * 4 + (it.stats?.speed ?? 0) * 6 + ((it.stats?.move ?? 0) + (it.stats?.jump ?? 0)) * 5 + (it.always?.length ?? 0) * 6 + (it.price ?? 0) / 2000;
}

function describe(it: ItemDef): string {
  const p: string[] = [];
  if (it.wp) p.push(`WP ${it.wp}`);
  if (it.wev) p.push(`Ev ${it.wev}%`);
  if (it.hp) p.push(`HP+${it.hp}`);
  if (it.mp) p.push(`MP+${it.mp}`);
  if (it.sev) p.push(`PhysEv ${it.sev}%`);
  if (it.smev) p.push(`MagEv ${it.smev}%`);
  if (it.aev) p.push(`Ev ${it.aev}%`);
  for (const [k, v] of Object.entries(it.stats ?? {})) p.push(`${k}+${v}`);
  if (it.element) p.push(it.element);
  return p.join(' · ');
}

export async function equipMenu(game: Game, u: RosterUnit, parent: HTMLElement, refresh: () => void) {
  const s = game.state;
  for (;;) {
    refresh();
    const slot = await menu({ items: (Object.keys(SLOT_NAMES) as EquipSlot[]).map((k) => ({ label: SLOT_NAMES[k], value: k, right: u.equip[k] ? ITEMS.get(u.equip[k]!)?.name ?? '' : '—' })), x: 16, y: 64, title: 'Equipment', parent }).promise;
    if (!slot) return;
    const sl = slot as EquipSlot;
    const cands = Object.entries(s.inventory).filter(([id, n]) => n > 0 && ITEMS.get(id) && canEquip(u, ITEMS.get(id)!, sl)).map(([id]) => ITEMS.get(id)!);
    cands.sort((a, b) => itemScore(b) - itemScore(a));
    const pick = await menu({ items: [
      { label: '— Remove —', value: '__none', disabled: !u.equip[sl] },
      ...cands.map((it) => ({ label: it.name, value: it.id, right: `×${s.inventory[it.id]}`, desc: `${describe(it)} — ${it.desc}` })),
    ], x: 16, y: 64, title: SLOT_NAMES[sl], parent, showDesc: true, maxHeight: '60vh' }).promise;
    if (!pick) continue;
    const old = u.equip[sl];
    if (old) addItem(s, old, 1);
    if (pick === '__none') delete u.equip[sl];
    else {
      addItem(s, pick, -1);
      u.equip[sl] = pick;
      const it = ITEMS.get(pick)!;
      if (it.twoHanded && sl === 'rhand' && u.equip.lhand) { addItem(s, u.equip.lhand, 1); delete u.equip.lhand; }
    }
    audio.sfx('item');
  }
}

export function optimize(game: Game, u: RosterUnit) {
  const s = game.state;
  for (const sl of ['rhand', 'lhand', 'head', 'body', 'accessory'] as EquipSlot[]) {
    const cur = u.equip[sl] ? ITEMS.get(u.equip[sl]!) : undefined;
    if (sl === 'lhand') {
      const rh = u.equip.rhand ? ITEMS.get(u.equip.rhand) : undefined;
      if (rh?.twoHanded) continue;
    }
    const cands = Object.entries(s.inventory).filter(([id, n]) => n > 0 && ITEMS.get(id) && canEquip(u, ITEMS.get(id)!, sl)).map(([id]) => ITEMS.get(id)!)
      .filter((it) => sl !== 'lhand' || it.kind === 'shield');
    const best = cands.sort((a, b) => itemScore(b) - itemScore(a))[0];
    if (best && (!cur || itemScore(best) > itemScore(cur))) {
      if (cur) addItem(s, cur.id, 1);
      addItem(s, best.id, -1);
      u.equip[sl] = best.id;
    }
  }
}
