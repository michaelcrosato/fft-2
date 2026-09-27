import { validateAudioAssets } from './audio-assets';
// Cross-reference validator for all content. Run: npm run validate
import {
  ABILITIES, ITEMS, JOBS, CHARACTERS, MAPS, BATTLES, SCENES, STORY, SIDE, NODES, EDGES, SHOP_STOCK, ERRANDS, ARTEFACTS, CHRONICLE,
} from '../src/data/db';
import { rumors } from '../src/data/misc/rumors';
import { ZODIAC_STONES } from '../src/data/misc/zodiacStones';
import { MapGrid } from '../src/battle/grid';
import type { SceneCmd } from '../src/data/types';

const errors: string[] = validateAudioAssets();
const warns: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warns.push(m);
const producedFlags = new Set<string>([...BATTLES.keys(), ...STORY.map((s) => s.id)]);
const recordedEvents = new Set<string>();
for (const step of [...STORY, ...SIDE]) for (const flag of step.flags ?? []) producedFlags.add(flag);
for (const e of ERRANDS.values()) if (e.reward.flag) producedFlags.add(e.reward.flag);
for (const r of rumors) if (r.needs === undefined) producedFlags.add('rumor_' + r.id);

// ---- jobs & abilities ----
for (const j of JOBS.values()) {
  for (const a of j.abilities) if (!ABILITIES.has(a)) err(`job ${j.id}: unknown ability ${a}`);
  for (const a of j.innate ?? []) if (!ABILITIES.has(a)) err(`job ${j.id}: unknown innate ${a}`);
  for (const r of j.requires ?? []) if (!JOBS.has(r.job)) err(`job ${j.id}: requires unknown job ${r.job}`);
  for (const [a] of j.monsterSkills ?? []) if (!ABILITIES.has(a)) err(`monster ${j.id}: unknown skill ${a}`);
  for (const k of ['mReaction', 'mSupport', 'mMovement'] as const) { const v = j[k]; if (v && !ABILITIES.has(v)) err(`monster ${j.id}: unknown ${k} ${v}`); }
  if (j.poach) for (const p of j.poach) if (!ITEMS.has(p)) err(`monster ${j.id}: unknown poach item ${p}`);
  if (!j.monster && !j.look) err(`job ${j.id}: missing look`);
}
for (const a of ABILITIES.values()) {
  if (a.consumes && !ITEMS.has(a.consumes)) err(`ability ${a.id}: consumes unknown item ${a.consumes}`);
  if (a.requires?.item && !ITEMS.has(a.requires.item)) err(`ability ${a.id}: requires unknown item ${a.requires.item}`);
  if (a.kind === 'action' && !a.effects?.length && !a.special) warn(`ability ${a.id}: action without effects/special`);
}
for (const it of ITEMS.values()) {
  if (it.use && !ABILITIES.has(it.use)) err(`item ${it.id}: unknown use ability ${it.use}`);
  if (it.onHit?.spell && !ABILITIES.has(it.onHit.spell)) err(`item ${it.id}: unknown onHit spell ${it.onHit.spell}`);
  if ((it.kind === 'weapon' || it.kind === 'shield' || it.kind === 'head' || it.kind === 'body') && !it.cat) err(`item ${it.id}: missing cat`);
}
// ---- characters ----
for (const c of CHARACTERS.values()) {
  if (!JOBS.has(c.job)) err(`character ${c.id}: unknown job ${c.job}`);
  for (const [slot, id] of Object.entries(c.equip ?? {})) if (id && !ITEMS.has(id)) err(`character ${c.id}: unknown ${slot} item ${id}`);
  for (const a of [c.reaction, c.support, c.movement, ...(c.learned ?? [])]) if (a && !ABILITIES.has(a)) err(`character ${c.id}: unknown ability ${a}`);
  if (c.secondary && !JOBS.has(c.secondary)) err(`character ${c.id}: unknown secondary job ${c.secondary}`);
  if (c.monster && !JOBS.has(c.monster)) err(`character ${c.id}: unknown monster ${c.monster}`);
}
// ---- maps ----
const grids = new Map<string, MapGrid>();
for (const m of MAPS.values()) {
  try {
    const g = new MapGrid(m);
    grids.set(m.id, g);
    const widths = m.rows.map((r) => r.trim().split(/\s+/).length);
    if (new Set(widths).size > 1) err(`map ${m.id}: ragged rows ${widths.join(',')}`);
    for (const [x, z] of m.deploy) { const c = g.cell(x, z); if (!c || !c.standable) err(`map ${m.id}: deploy cell ${x},${z} not standable`); }
    if (m.deploy.length < 5) warn(`map ${m.id}: only ${m.deploy.length} deploy cells`);
    for (const d of m.decor ?? []) if (!g.cell(d.at[0], d.at[1])) err(`map ${m.id}: decor ${d.type} out of bounds ${d.at}`);
  } catch (e) { err(`map ${m.id}: ${(e as Error).message}`); }
}
// ---- battles ----
for (const b of BATTLES.values()) {
  const g = grids.get(b.map);
  if (!g) { err(`battle ${b.id}: unknown map ${b.map}`); continue; }
  const occupied = new Set<string>();
  for (const u of b.units) {
    if (u.char && !CHARACTERS.has(u.char)) err(`battle ${b.id}: unknown char ${u.char}`);
    if (!u.char && (!u.job || !JOBS.has(u.job))) err(`battle ${b.id}: unit ${u.id ?? '?'} unknown job ${u.job}`);
    const c = g.cell(u.at[0], u.at[1]);
    if (!c || !c.standable) err(`battle ${b.id}: unit ${u.id ?? u.char ?? u.job} at ${u.at} not standable`);
    const k = u.at.join(',');
    if (occupied.has(k) && !u.hidden) err(`battle ${b.id}: two units at ${k}`);
    occupied.add(k);
    for (const [slot, id] of Object.entries(u.equip ?? {})) if (id && !ITEMS.has(id)) err(`battle ${b.id}: unknown ${slot} item ${id}`);
    for (const a of [u.reaction, u.support, u.movement, ...(u.learned ?? [])]) if (a && !ABILITIES.has(a)) err(`battle ${b.id}: unknown ability ${a}`);
    if (u.secondary && !JOBS.has(u.secondary)) err(`battle ${b.id}: unknown secondary ${u.secondary}`);
  }
  for (const [x, z] of b.deploy ?? g.def.deploy) {
    if (occupied.has(`${x},${z}`)) err(`battle ${b.id}: deploy cell ${x},${z} occupied by a spawn`);
  }
  const v = b.victory;
  if (v.type === 'defeat' || v.type === 'defeatAny') for (const id of v.ids) if (!b.units.some((u) => (u.id ?? u.char) === id)) err(`battle ${b.id}: victory id ${id} not in units`);
  for (const id of b.protect ?? []) if (!b.units.some((u) => (u.id ?? u.char) === id) && !CHARACTERS.has(id)) err(`battle ${b.id}: protect id ${id} not in units or cast`);
  for (const t of b.treasure ?? []) { if (!ITEMS.has(t[2])) err(`battle ${b.id}: unknown treasure ${t[2]}`); if (!ITEMS.has(t[3])) err(`battle ${b.id}: unknown treasure ${t[3]}`); }
  for (const e of b.events ?? []) checkCmds(e.script, `battle ${b.id} event`);
}
// ---- scenes ----
function checkCmds(cmds: SceneCmd[], where: string) {
  for (const c of cmds) {
    switch (c[0]) {
      case 'map': if (!MAPS.has(c[1])) err(`${where}: unknown map ${c[1]}`); break;
      case 'actor': if (!CHARACTERS.has(c[2]) && !JOBS.has(c[2])) err(`${where}: actor ${c[1]} unknown char/job ${c[2]}`); break;
      case 'join': case 'leave': if (!CHARACTERS.has(c[1])) err(`${where}: unknown character ${c[1]}`); break;
      case 'item': if (!ITEMS.has(c[1])) err(`${where}: unknown item ${c[1]}`); break;
      case 'flag': producedFlags.add(c[1]); break;
      case 'chronicle':
        if (!CHRONICLE.has(c[1])) err(`${where}: unknown Chronicle event ${c[1]}`);
        recordedEvents.add(c[1]);
        break;
      case 'choice': for (const [, sub] of c[2]) checkCmds(sub, where); break;
      case 'if': checkCmds(c[2], where); if (c[3]) checkCmds(c[3], where); break;
      case 'say': if (c[2].length > 260) warn(`${where}: long line (${c[2].length}) "${c[2].slice(0, 40)}…"`); break;
    }
  }
}
for (const s of SCENES.values()) {
  if (s.map && !MAPS.has(s.map)) err(`scene ${s.id}: unknown map ${s.map}`);
  checkCmds(s.cmds, `scene ${s.id}`);
}
// ---- story ----
for (const st of [...STORY, ...SIDE]) {
  if (st.at && !NODES.has(st.at)) err(`story ${st.id}: unknown node ${st.at}`);
  if (st.pre && !SCENES.has(st.pre)) err(`story ${st.id}: unknown pre scene ${st.pre}`);
  if (st.post && !SCENES.has(st.post)) err(`story ${st.id}: unknown post scene ${st.post}`);
  if (st.battle && !BATTLES.has(st.battle)) err(`story ${st.id}: unknown battle ${st.battle}`);
  for (const n of st.unlock ?? []) if (!NODES.has(n)) err(`story ${st.id}: unlocks unknown node ${n}`);
}
for (const e of EDGES) { if (!NODES.has(e.a)) err(`edge: unknown node ${e.a}`); if (!NODES.has(e.b)) err(`edge: unknown node ${e.b}`); }
for (const n of NODES.values()) for (const m of n.random?.maps ?? []) if (!MAPS.has(m)) err(`node ${n.id}: unknown random map ${m}`);
for (const n of NODES.values()) for (const p of n.random?.pools ?? []) for (const u of p.units) if (!JOBS.has(u.job)) err(`node ${n.id}: unknown random job ${u.job}`);
for (const s of SHOP_STOCK) for (const i of s.items) if (!ITEMS.has(i)) err(`shopStock tier ${s.tier}: unknown item ${i}`);
for (const e of ERRANDS.values()) { for (const t of e.towns) if (!NODES.has(t)) err(`errand ${e.id}: unknown town ${t}`); if (e.reward.item && !ITEMS.has(e.reward.item)) err(`errand ${e.id}: unknown item ${e.reward.item}`); }

// ---- lore and optional-content references ----
const checkFlags = (flags: string[], where: string) => {
  for (const flag of flags) if (flag && !producedFlags.has(flag)) err(`${where}: flag ${flag} is never set by content`);
};
for (const e of ERRANDS.values()) {
  if (e.reward.artefact && !ARTEFACTS.has(e.reward.artefact)) err(`errand ${e.id}: unknown artefact ${e.reward.artefact}`);
  if (e.reward.unlock && !NODES.has(e.reward.unlock)) err(`errand ${e.id}: unknown destination ${e.reward.unlock}`);
  for (const j of e.jobs ?? []) if (!JOBS.has(j)) err(`errand ${e.id}: unknown favoured job ${j}`);
  checkFlags(e.needs ?? [], `errand ${e.id}`);
}
for (const r of rumors) {
  for (const town of r.towns) if (town !== '*' && !NODES.get(town)?.tavern) err(`rumour ${r.id}: no tavern at ${town}`);
  checkFlags(r.needs ?? [], `rumour ${r.id}`);
}
for (const q of SIDE) {
  checkFlags(q.needs, `side quest ${q.id}`);
  for (const c of q.needChar ?? []) if (!CHARACTERS.has(c)) err(`side quest ${q.id}: unknown required character ${c}`);
}
for (const c of CHARACTERS.values()) checkFlags(c.bio.map(([f]) => f), `biography ${c.id}`);
for (const e of CHRONICLE.values()) if (!producedFlags.has(e.id) && !recordedEvents.has(e.id)) err(`Chronicle ${e.id}: no unlock in content`);
for (const stone of ZODIAC_STONES) checkFlags([stone.flag], `stone ${stone.sign}`);

console.log(`Content: ${JOBS.size} jobs, ${ABILITIES.size} abilities, ${ITEMS.size} items, ${CHARACTERS.size} characters, ${MAPS.size} maps, ${BATTLES.size} battles, ${SCENES.size} scenes, ${STORY.length} story steps, ${SIDE.length} side steps, ${NODES.size} nodes, ${ERRANDS.size} errands`);
for (const w of warns.slice(0, 60)) console.log('warn:', w);
if (warns.length > 60) console.log(`… ${warns.length - 60} more warnings`);
for (const e of errors) console.log('ERROR:', e);
console.log(errors.length ? `${errors.length} errors` : 'OK — no errors');
process.exit(errors.length ? 1 : 0);
