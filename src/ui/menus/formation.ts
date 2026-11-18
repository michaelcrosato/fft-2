// Formation: roster, job change, learning & setting abilities, equipment.
import type { Game } from '../../game/game';
import { menu, toast, confirm } from '../widgets';
import { h } from '../dom';
import { input } from '../input';
import { overlay, unitPanel, statDelta, elementName, statName, statChange } from './common';
import { JOBS, ABILITIES, ITEMS } from '../../data/db';
import type { EquipSlot, ItemDef } from '../../data/types';
import { availableJobs, jobUnlocked, supersededJob, learnAbility, canEquip, validateEquipment, validateAbilities, unitJobLevel, type RosterUnit } from '../../game/roster';
import { addItem } from '../../game/state';
import { audio } from '../../audio/audio';
import { BattleUnit } from '../../battle/unit';
import { fmtList, t } from '../../i18n';

export async function openFormation(game: Game, focus?: RosterUnit) {
  const s = game.state;
  const ov = overlay(t('formation.title'));
  const prevMusic = audio.currentMusic;
  audio.playMusic('formation', { fade: 1 });
  let detail = null as HTMLElement | null;
  const showDetail = (u: RosterUnit | null) => {
    detail?.remove();
    if (!u) return;
    detail = unitPanel(u);
    detail.classList.add('detail');
    detail.style.position = 'absolute'; detail.style.right = '16px'; detail.style.top = '64px';
    ov.root.appendChild(detail);
  };
  try {
    let last: string | undefined = focus?.uid;
    for (;;) {
      const items = s.roster.map((u) => ({ label: u.name, value: u.uid, right: t(u.errand ? 'formation.roster.job_level_away' : 'formation.roster.job_level', { job: JOBS.get(u.job)?.name ?? u.job, level: u.level }) }));
      const pick = await menu({ items, x: 16, y: 64, title: t('formation.party', { size: s.roster.length }), parent: ov.root, maxHeight: 'calc(70 * var(--vh))', initial: last, onHover: (uid) => showDetail(s.roster.find((r) => r.uid === uid) ?? null) }).promise;
      if (!pick) break;
      last = pick;
      const u = s.roster.find((r) => r.uid === pick)!;
      await unitMenu(game, u, ov.root, () => showDetail(u));
    }
  } finally {
    detail?.remove();
    ov.close();
    // back to whatever was playing (world map / town)
    if (prevMusic && prevMusic !== 'formation') audio.playMusic(prevMusic, { fade: 1 });
  }
}

async function unitMenu(game: Game, u: RosterUnit, parent: HTMLElement, refresh: () => void) {
  const s = game.state;
  for (;;) {
    refresh();
    const pick = await menu({ items: [
      { label: t('formation.unit.change_job'), value: 'job', disabled: u.gender === 'monster' ? t('formation.unit.monster_no_job') : false },
      { label: t('formation.unit.learn'), value: 'learn', disabled: u.gender === 'monster' ? t('formation.unit.monster_no_learn') : false },
      { label: t('formation.unit.set'), value: 'set', disabled: u.gender === 'monster' },
      { label: t('formation.unit.equipment'), value: 'equip', disabled: u.gender === 'monster' },
      { label: t('formation.unit.optimize'), value: 'optimize', disabled: u.gender === 'monster' },
      { label: t('formation.unit.rename'), value: 'rename', disabled: !!u.charId && u.charId !== 'rhen' },
      { label: t('formation.unit.dismiss'), value: 'dismiss', disabled: u.charId ? t('formation.unit.cannot_dismiss') : false },
    ], x: 16, y: 64, title: u.name, parent }).promise;
    if (!pick) return;
    if (pick === 'job') await jobMenu(game, u, parent, refresh);
    if (pick === 'learn') await learnMenu(u, parent, refresh);
    if (pick === 'set') await setAbilities(game, u, parent, refresh);
    if (pick === 'equip') await equipMenu(game, u, parent, refresh);
    if (pick === 'optimize') { optimize(game, u); audio.sfx('confirm'); toast(t('formation.optimized')); }
    if (pick === 'rename') {
      const n = await askName(parent, u.name);
      if (n && n.trim()) { u.name = n.trim().slice(0, 14); if (u.charId === 'rhen') s.heroName = u.name; }
    }
    if (pick === 'dismiss') {
      if (await confirm(t('formation.dismiss.ask', { name: u.name }), t('formation.unit.dismiss'), t('formation.dismiss.keep'), true)) {
        for (const id of Object.values(u.equip)) if (id) addItem(s, id, 1);
        s.roster = s.roster.filter((r) => r !== u);
        // an errand party no longer counts someone who has left
        for (const run of s.errands) run.units = run.units.filter((id) => id !== u.uid);
        s.errands = s.errands.filter((run) => run.units.length > 0);
        return;
      }
    }
  }
}

/**
 * The in-game rename dialog (browser dialogs are not allowed): a text field, so phone keyboards and
 * IMEs work, with OK and Cancel. Enter, a phone keyboard's Done or A accepts; Esc or B cancels;
 * ↑↓ (D-pad) move between the field and the buttons. Resolves to what was typed, or null when cancelled.
 */
function askName(parent: HTMLElement, current: string): Promise<string | null> {
  const title = t('formation.unit.rename');
  const panel = h('div.panel.prompt', { role: 'dialog', 'aria-label': title, style: { left: '50%', top: '40%', transform: 'translate(-50%,-50%)', width: 'min(420px, 92vw)', textAlign: 'center' } },
    h('div.title-plate', null, title));
  const inp = h('input', { type: 'text', value: current, maxlength: '14', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'done', style: { fontFamily: 'EB Garamond, serif', fontSize: '1.4em', textAlign: 'center', width: '80%', padding: '4px 8px', margin: '8px 0', background: '#fbf4e2', border: '1px solid #8a6a3a', borderRadius: '4px', color: '#2b1d12' } }) as HTMLInputElement;
  // a form, so a phone keyboard's Done / Go key accepts the name too
  const form = h('form', null, h('label', { style: { display: 'block' } }, h('div.muted', null, t('formation.rename.label')), inp));
  panel.appendChild(form);
  // real buttons, so Tab reaches them from the name field
  const ok = h('button.btn', { type: 'button' }, t('menus.ok'));
  const cancel = h('button.btn.ghost', { type: 'button', style: { marginLeft: '10px' } }, t('menus.cancel'));
  panel.appendChild(h('div', { style: { marginTop: '10px' } }, ok, cancel));
  parent.appendChild(panel);
  const focusName = () => { if (panel.isConnected) { inp.focus(); inp.select(); } };
  // a key that chose Rename (Z) must not type into the field: focus once that key press is over.
  // Touch focuses at once, while the tap still counts, so the phone keyboard opens.
  if (input.lastDevice === 'kb') setTimeout(focusName, 0); else focusName();
  return new Promise<string | null>((resolve) => {
    let closed = false;
    const done = (v: string | null) => { if (closed) return; closed = true; pop(); panel.remove(); audio.sfx(v === null ? 'cancel' : 'confirm'); resolve(v); };
    form.addEventListener('submit', (e) => { e.preventDefault(); done(inp.value); });
    ok.onclick = () => done(inp.value);
    cancel.onclick = () => done(null);
    // gamepad / keyboard: ↑↓ between the field and the buttons, ←→ between the buttons, A accepts (or cancels on Cancel)
    const fields: HTMLElement[] = [inp, ok, cancel];
    let fi = 0;
    panel.addEventListener('focusin', (e) => { const i = fields.indexOf(e.target as HTMLElement); if (i >= 0) fi = i; });
    const focusField = (i: number) => { fi = (i + fields.length) % fields.length; fields[fi].focus(); };
    // (while the text field has focus, the input layer only forwards Enter/Escape; the pad always gets here)
    const pop = input.push((a) => {
      if (a === 'up' || a === 'down') { focusField(fi + (a === 'down' ? 1 : -1)); return true; }
      if ((a === 'left' || a === 'right') && fields[fi] !== inp) { focusField(fields[fi] === ok ? 2 : 1); return true; }
      if (a === 'confirm') done(fields[fi] === cancel ? null : inp.value);
      if (a === 'cancel') done(null);
      return true;
    }, !!parent.closest('.game-menu-shell'));
  });
}

async function jobMenu(game: Game, u: RosterUnit, parent: HTMLElement, refresh: () => void) {
  // the classic job-tree order, the unit's own unique calling first
  const TREE = ['squire', 'chemist', 'knight', 'archer', 'monk', 'priest', 'wizard', 'timeMage', 'summoner', 'thief', 'orator', 'mystic', 'geomancer', 'lancer', 'samurai', 'ninja', 'arithmancer', 'bard', 'dancer', 'mime'];
  const rank = (id: string) => { const i = TREE.indexOf(id); return i < 0 ? -1 : i; };
  // generic jobs, plus the unit's own unique calling (generic units have none: `undefined === undefined` let enemy jobs in)
  const all = [...JOBS.values()].filter((j) => !j.monster && (j.generic || (!!j.unique && j.unique === u.charId)) && !supersededJob(u, j)).sort((a, b) => rank(a.id) - rank(b.id));
  const items = all.map((j) => {
    const ok = jobUnlocked(u, j);
    const req = fmtList((j.requires ?? []).map((r) => t('formation.job.requirement', { job: JOBS.get(r.job)?.name ?? r.job, level: r.level })));
    return { label: j.name, value: j.id, disabled: ok ? false : j.gender && j.gender !== u.gender ? t(j.gender === 'm' ? 'formation.job.men_only' : 'formation.job.women_only') : t('formation.job.requires', { jobs: req }), right: ok ? t('formation.job.level_jp', { level: unitJobLevel(u, j.id), jp: u.jp[j.id] ?? 0 }) : '🔒', desc: j.desc };
  });
  const pick = await menu({ items, x: 16, y: 64, title: t('formation.job.title'), parent, showDesc: true, maxHeight: 'calc(62 * var(--vh))', initial: u.job, onHover: (jid) => {
    if (!jid) return;
    const panel = parent.querySelector('.job-delta');
    panel?.remove();
    const d = statDelta(u, jid as string);
    const el = h('div.panel.job-delta', { style: { right: '16px', bottom: '16px' } }, h('b', null, JOBS.get(jid as string)?.name ?? ''), h('div', null, d || t('formation.job.no_change')));
    parent.appendChild(el);
  } }).promise;
  parent.querySelector('.job-delta')?.remove();
  if (!pick || pick === u.job) return;
  u.job = pick;
  const removed = validateEquipment(u);
  for (const id of removed) addItem(game.state, id, 1);
  validateAbilities(u);
  audio.sfx('jobUp');
  toast(t('formation.job.changed', { name: u.name, job: JOBS.get(pick)?.name ?? pick }));
  refresh();
}

const KIND_LINES: Record<string, string> = { reaction: 'formation.learn.reaction', support: 'formation.learn.support', movement: 'formation.learn.movement' };

async function learnMenu(u: RosterUnit, parent: HTMLElement, refresh: () => void) {
  for (;;) {
    const jobs = availableJobs(u).filter((j) => j.abilities.length);
    const jid = await menu({ items: jobs.map((j) => ({ label: j.name, value: j.id, right: t('formation.learn.jp', { jp: u.jp[j.id] ?? 0 }) })), x: 16, y: 64, title: t('formation.learn.title'), parent, initial: u.job, maxHeight: 'calc(62 * var(--vh))' }).promise;
    if (!jid) return;
    for (;;) {
      const j = JOBS.get(jid)!;
      const list = j.abilities.map((a) => ABILITIES.get(a)).filter((a) => !!a) as NonNullable<ReturnType<typeof ABILITIES.get>>[];
      const items = list.filter((a) => a.jp > 0).map((a) => {
        const known = u.learned.includes(a.id);
        // action abilities show their name alone; the others are marked R, S or M
        const name = a.kind === 'action' ? a.name : t(KIND_LINES[a.kind] ?? 'formation.learn.movement', { ability: a.name });
        return { label: (known ? '✓ ' : '') + name, value: a.id, right: known ? t('formation.learn.learned') : t('formation.learn.jp', { jp: a.jp }), disabled: known ? t('formation.learn.already') : (u.jp[jid] ?? 0) < a.jp ? t('formation.learn.not_enough_jp') : false, desc: a.desc };
      });
      const pick = await menu({ items, x: 16, y: 64, title: t('formation.learn.skillset', { skillset: j.skillset.name, jp: u.jp[jid] ?? 0 }), parent, showDesc: true, maxHeight: 'calc(60 * var(--vh))' }).promise;
      if (!pick) break;
      if (learnAbility(u, jid, pick)) { audio.sfx('learn'); toast(t('formation.learn.learned_toast', { ability: ABILITIES.get(pick)?.name ?? pick })); refresh(); }
    }
  }
}

const ABILITY_SLOT_LINES = { secondary: 'menus.ability.secondary', reaction: 'menus.ability.reaction', support: 'menus.ability.support', movement: 'menus.ability.movement' } as const;

async function setAbilities(game: Game, u: RosterUnit, parent: HTMLElement, refresh: () => void) {
  for (;;) {
    refresh();
    const ab = (id?: string) => (id ? ABILITIES.get(id)?.name ?? id : '—');
    const slot = await menu({ items: [
      { label: t(ABILITY_SLOT_LINES.secondary), value: 'secondary', right: u.secondary ? JOBS.get(u.secondary)?.skillset.name ?? '' : '—' },
      { label: t(ABILITY_SLOT_LINES.reaction), value: 'reaction', right: ab(u.reaction) },
      { label: t(ABILITY_SLOT_LINES.support), value: 'support', right: ab(u.support) },
      { label: t(ABILITY_SLOT_LINES.movement), value: 'movement', right: ab(u.movement) },
    ], x: 16, y: 64, title: t('formation.unit.set'), parent }).promise;
    if (!slot) return;
    if (slot === 'secondary') {
      const bu = new BattleUnit(u, 0, true);
      const opts = [...JOBS.values()].filter((j) => j.id !== u.job && !j.monster && bu.skillsetActions(j.id).some((a) => u.learned.includes(a.id)));
      const pick = await menu({ items: [{ label: t('formation.none'), value: '' }, ...opts.map((j) => ({ label: j.skillset.name, value: j.id, right: t('formation.secondary.skills', { count: bu.skillsetActions(j.id).filter((a) => u.learned.includes(a.id)).length }) }))], x: 16, y: 64, title: t(ABILITY_SLOT_LINES.secondary), parent, maxHeight: 'calc(60 * var(--vh))' }).promise;
      if (pick !== null) u.secondary = pick || undefined;
    } else {
      const kind = slot as 'reaction' | 'support' | 'movement';
      const opts = u.learned.map((id) => ABILITIES.get(id)).filter((a) => a && a.kind === kind) as NonNullable<ReturnType<typeof ABILITIES.get>>[];
      const pick = await menu({ items: [{ label: t('formation.none'), value: '' }, ...opts.map((a) => ({ label: a.name, value: a.id, desc: a.desc }))], x: 16, y: 64, title: t(ABILITY_SLOT_LINES[kind]), parent, showDesc: true, maxHeight: 'calc(60 * var(--vh))' }).promise;
      if (pick !== null) {
        u[kind] = pick || undefined;
        const removed = validateEquipment(u);
        for (const id of removed) addItem(game.state, id, 1);
      }
    }
    audio.sfx('confirm');
  }
}

const SLOT_NAMES: Record<EquipSlot, string> = { rhand: 'formation.slot.rhand', lhand: 'formation.slot.lhand', head: 'formation.slot.head', body: 'formation.slot.body', accessory: 'formation.slot.accessory' };

function itemScore(it: ItemDef) {
  return (it.wp ?? 0) * 3 + (it.hp ?? 0) * 0.2 + (it.mp ?? 0) * 0.15 + (it.sev ?? 0) + (it.smev ?? 0) * 0.5 + (it.aev ?? 0) + (it.amev ?? 0) * 0.5 +
    ((it.stats?.pa ?? 0) + (it.stats?.ma ?? 0)) * 4 + (it.stats?.speed ?? 0) * 6 + ((it.stats?.move ?? 0) + (it.stats?.jump ?? 0)) * 5 + (it.always?.length ?? 0) * 6 + (it.price ?? 0) / 2000;
}

function describe(it: ItemDef): string {
  const p: string[] = [];
  if (it.wp) p.push(t('formation.item.wp', { value: it.wp }));
  if (it.wev) p.push(t('formation.item.evade', { value: it.wev }));
  if (it.hp) p.push(statChange(t('menus.stat.hp'), it.hp));
  if (it.mp) p.push(statChange(t('menus.stat.mp'), it.mp));
  if (it.sev) p.push(t('formation.item.phys_evade', { value: it.sev }));
  if (it.smev) p.push(t('formation.item.mag_evade', { value: it.smev }));
  if (it.aev) p.push(t('formation.item.evade', { value: it.aev }));
  for (const [k, v] of Object.entries(it.stats ?? {})) p.push(statChange(statName(k), v ?? 0));
  if (it.element) p.push(elementName(it.element));
  return p.join(' · ');
}

export async function equipMenu(game: Game, u: RosterUnit, parent: HTMLElement, refresh: () => void) {
  const s = game.state;
  for (;;) {
    refresh();
    const slot = await menu({ items: (Object.keys(SLOT_NAMES) as EquipSlot[]).map((k) => ({ label: t(SLOT_NAMES[k]), value: k, right: u.equip[k] ? ITEMS.get(u.equip[k]!)?.name ?? '' : '—' })), x: 16, y: 64, title: t('formation.unit.equipment'), parent }).promise;
    if (!slot) return;
    const sl = slot as EquipSlot;
    // nothing goes in the off hand while the main hand grips a two-handed weapon
    const twoHanded = sl === 'lhand' && !!(u.equip.rhand && ITEMS.get(u.equip.rhand)?.twoHanded);
    const cands = twoHanded ? [] : Object.entries(s.inventory).filter(([id, n]) => n > 0 && ITEMS.get(id) && canEquip(u, ITEMS.get(id)!, sl)).map(([id]) => ITEMS.get(id)!);
    cands.sort((a, b) => itemScore(b) - itemScore(a));
    const pick = await menu({ items: [
      { label: t('formation.equip.remove'), value: '__none', disabled: !u.equip[sl] },
      ...cands.map((it) => ({ label: it.name, value: it.id, right: t('formation.equip.owned', { amount: s.inventory[it.id] }), desc: t('formation.equip.desc', { stats: describe(it), desc: it.desc }) })),
    ], x: 16, y: 64, title: t(SLOT_NAMES[sl]), parent, showDesc: true, maxHeight: 'calc(60 * var(--vh))' }).promise;
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
    for (const id of validateEquipment(u)) addItem(s, id, 1);
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
  // e.g. a new two-handed weapon and the old shield: hand back whatever no longer fits
  for (const id of validateEquipment(u)) addItem(s, id, 1);
}
