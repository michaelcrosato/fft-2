// Title → new game / continue → story & world map loop.
import type { Game } from './game';
import { newGame, saveGame, loadGame, listSaves, latestSave, partyLevel, addItem, type GameState } from './state';
import { NODES, EDGES, STORY, ERRANDS, JOBS, CHARACTERS, BATTLES, ITEMS } from '../data/db';
import type { BattleDef, UnitSpawn, WorldNode } from '../data/types';
import { WorldView } from '../scenes/worldmap';
import { buildHumanoid } from '../gfx/models/humanoid';
import { menu, toast, confirm, fade, say, titleCard } from '../ui/widgets';
import { h, uiRoot, sleep } from '../ui/dom';
import { input } from '../ui/input';
import { audio } from '../audio/audio';
import { renderer } from '../gfx/renderer';
import { Rng } from '../core/rng';
import { MapGrid } from '../battle/grid';
import { mapDef } from '../data/db';
import { zodiacFromDate, ZODIAC_NAMES, ZODIAC_GLYPH, ZODIAC_ORDER } from '../battle/zodiac';
import { addJp } from './roster';
import { openFormation } from '../ui/menus/formation';
import { openShop, openRecruit, openTavern, openFurShop } from '../ui/menus/town';
import { openChronicle } from '../ui/menus/chronicle';
import { openOptions, openSaveLoad } from '../ui/menus/system';

export const MONTHS = ZODIAC_ORDER.map((z) => ZODIAC_NAMES[z]);
export function dateText(day: number) { const d = day - 1; return `${MONTHS[Math.floor(d / 30) % 12]} ${(d % 30) + 1}`; }

// ============================================================================
//  Title
// ============================================================================
export async function runTitle(game: Game) {
  const world = new WorldView();
  await world.init();
  world.camDist = 60; world.camPitch = 0.75;
  world.focus('lesandre');
  let spin = 0;
  game.setScreen({ update: (dt) => { spin += dt * 0.03; world.camYaw = 0.35 + spin; world.update(dt); }, render: () => world.render(), resize: (w, hh) => world.resize(w, hh), dispose: () => world.dispose() });
  audio.playMusic('title', { fade: 2 });
  const logo = h('div', { style: { position: 'absolute', left: '50%', top: '14%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none', textShadow: '0 3px 12px #000, 0 0 30px rgba(0,0,0,.6)' } },
    h('div', { style: { fontFamily: 'Cinzel, serif', fontWeight: '700', fontSize: 'min(8vw, 64px)', letterSpacing: '0.12em', color: '#f4dc98' } }, 'FINAL FEALTY'),
    h('div', { style: { fontFamily: 'Cinzel, serif', fontWeight: '500', fontSize: 'min(4vw, 28px)', letterSpacing: '0.6em', color: '#efe3c6', marginTop: '-4px' } }, 'TACTICS'),
    h('div', { style: { width: '360px', maxWidth: '70vw', height: '2px', margin: '14px auto', background: 'linear-gradient(90deg, transparent, #c9a24a, transparent)' } }),
    h('div', { style: { fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: 'min(4vw, 20px)', color: '#e8d8b0' } }, 'The Chronicle of the Twelve Braves'),
  );
  uiRoot().appendChild(logo);
  const footer = h('div', { style: { position: 'absolute', bottom: '10px', width: '100%', textAlign: 'center', color: 'rgba(240,225,190,.6)', fontSize: '12px', pointerEvents: 'none' } }, 'A fan-made spiritual successor · three.js WebGPU · all names, words and music original');
  uiRoot().appendChild(footer);
  for (;;) {
    const hasSave = latestSave() !== null;
    const pick = await menu({ items: [
      ...(hasSave ? [{ label: 'Continue', value: 'continue' }] : []),
      { label: 'New Game', value: 'new' },
      { label: 'Load Game', value: 'load', disabled: !hasSave },
      { label: 'Options', value: 'options' },
    ], x: '50%', y: '58%', className: 'title-menu', cancelable: false }).promise;
    if (pick === 'options') { await openOptions(game); continue; }
    let state: GameState | null = null;
    if (pick === 'continue') state = loadGame(latestSave()!);
    if (pick === 'load') { const s = await openSaveLoad(game, 'load'); if (!s) continue; state = s; }
    if (pick === 'new') { state = await newGameSetup(); if (!state) continue; }
    if (!state) continue;
    logo.remove(); footer.remove();
    game.state = state;
    await fade('out', 0.8);
    game.setScreen(null);
    world.dispose();
    await fade('in', 0.1);
    await mainLoop(game);
    return;
  }
}

async function newGameSetup(): Promise<GameState | null> {
  const panel = h('div.panel', { style: { left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(460px, 92vw)', textAlign: 'center' } },
    h('div.title-plate', null, 'A New Chronicle'),
    h('h2', null, 'Name your hero'));
  const inp = h('input', { value: 'Rhen', maxlength: '12', style: { fontFamily: 'EB Garamond, serif', fontSize: '1.4em', textAlign: 'center', width: '70%', padding: '4px 8px', background: '#fbf4e2', border: '1px solid #8a6a3a', borderRadius: '4px', color: '#2b1d12' } }) as HTMLInputElement;
  panel.appendChild(inp);
  panel.appendChild(h('h2', { style: { marginTop: '14px' } }, 'Date of birth'));
  const monthSel = h('select', { style: { fontSize: '1.1em', marginRight: '8px' } }, ...['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => h('option', { value: String(i + 1) }, m))) as HTMLSelectElement;
  const daySel = h('select', { style: { fontSize: '1.1em' } }, ...Array.from({ length: 31 }, (_, i) => h('option', { value: String(i + 1) }, String(i + 1)))) as HTMLSelectElement;
  monthSel.value = '1'; daySel.value = '1';
  const zod = h('div', { style: { fontSize: '1.2em', margin: '8px 0' } });
  const upd = () => { const z = zodiacFromDate(+monthSel.value, +daySel.value); zod.textContent = `${ZODIAC_GLYPH[z]}︎ ${ZODIAC_NAMES[z]}`; };
  monthSel.onchange = upd; daySel.onchange = upd; upd();
  panel.appendChild(h('div', null, monthSel, daySel));
  panel.appendChild(zod);
  panel.appendChild(h('div.muted', { style: { fontSize: '0.85em' } }, 'Your sign shapes your compatibility with friend and foe alike.'));
  const gentle = h('input', { type: 'checkbox' }) as HTMLInputElement;
  panel.appendChild(h('label', { style: { display: 'block', margin: '10px 0', fontSize: '0.95em' } }, gentle, ' Gentle mode — fallen allies retreat instead of turning to crystal'));
  const ok = h('span.btn', null, 'Begin the Tale');
  const back = h('span.btn.ghost', { style: { marginLeft: '10px' } }, 'Back');
  panel.appendChild(h('div', { style: { marginTop: '10px' } }, ok, back));
  uiRoot().appendChild(panel);
  inp.focus();
  const r = await new Promise<boolean>((resolve) => {
    ok.onclick = () => resolve(true);
    back.onclick = () => resolve(false);
    const pop = input.push((a, e) => { if (e && (e.target as HTMLElement)?.tagName === 'INPUT' && a !== 'confirm') return false; if (a === 'confirm') resolve(true); if (a === 'cancel') resolve(false); return true; });
    ok.addEventListener('click', () => pop()); back.addEventListener('click', () => pop());
    const done = (v: boolean) => { pop(); resolve(v); };
    void done;
  });
  panel.remove();
  if (!r) return null;
  audio.sfx('confirm');
  const s = newGame(inp.value.trim() || 'Rhen', [+monthSel.value, +daySel.value]);
  const { loadOptions, saveOptions } = await import('./state');
  const o = loadOptions(); o.gentle = gentle.checked; saveOptions(o);
  return s;
}

// ============================================================================
//  Main loop: story chain + world map
// ============================================================================
export async function mainLoop(game: Game) {
  game.options = (await import('./state')).loadOptions();
  for (;;) {
    // run steps that trigger immediately (no location, chained)
    const ok = await runImmediate(game);
    if (!ok) { await returnToTitle(game); return; }
    if (!STORY[game.state.storyIndex] && game.state.flags.game_complete) {
      await credits(game);
      await returnToTitle(game);
      return;
    }
    const res = await worldLoop(game);
    if (res === 'title') { await returnToTitle(game); return; }
  }
}

async function returnToTitle(game: Game) {
  await fade('out', 0.6);
  game.disposeStage();
  uiRoot().innerHTML = '';
  await fade('in', 0.1);
  await runTitle(game);
}

async function runImmediate(game: Game): Promise<boolean> {
  for (;;) {
    const st = STORY[game.state.storyIndex];
    if (!st) return true;
    if (st.at && !(st.chain && prevChained(game))) return true;
    const ok = await game.runStep(st);
    if (!ok) return false;
    game.autosave();
  }
}
function prevChained(game: Game) { const prev = STORY[game.state.storyIndex - 1]; return !!prev?.chain; }

// ---------------------------------------------------------------- routing
function neighbours(id: string, unlocked: Set<string>): string[] {
  const out: string[] = [];
  for (const e of EDGES) {
    if (e.a === id && unlocked.has(e.b)) out.push(e.b);
    if (e.b === id && unlocked.has(e.a)) out.push(e.a);
  }
  return out;
}
function route(from: string, to: string, unlocked: Set<string>): string[] | null {
  const prev = new Map<string, string>();
  const q = [from];
  const seen = new Set([from]);
  while (q.length) {
    const c = q.shift()!;
    if (c === to) break;
    for (const n of neighbours(c, unlocked)) if (!seen.has(n)) { seen.add(n); prev.set(n, c); q.push(n); }
  }
  if (!seen.has(to)) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0])!);
  return path;
}

function markerStates(game: Game) {
  const s = game.state;
  const states = new Map<string, 'hidden' | 'town' | 'field' | 'story' | 'side' | 'visited'>();
  const step = STORY[s.storyIndex];
  for (const n of NODES.values()) {
    if (!s.unlocked.includes(n.id)) { states.set(n.id, 'hidden'); continue; }
    if (step?.at === n.id) states.set(n.id, 'story');
    else if (game.sideStepsAt(n.id).length) states.set(n.id, 'side');
    else states.set(n.id, n.kind === 'town' || n.kind === 'castle' ? 'town' : n.kind === 'field' ? 'field' : 'visited');
  }
  return states;
}

// ---------------------------------------------------------------- world loop
async function worldLoop(game: Game): Promise<'title' | 'continue'> {
  const s = game.state;
  const world = new WorldView();
  await world.init();
  const hero = s.roster.find((r) => r.charId === 'rhen') ?? s.roster[0];
  const hjob = JOBS.get(hero.job)!;
  world.setParty(buildHumanoid({ job: hjob.look, look: CHARACTERS.get('rhen')?.look ?? hero.look, gender: 'm', weapon: hero.equip.rhand ? ITEMS.get(hero.equip.rhand) : null }));
  if (!s.unlocked.includes(s.location)) s.unlocked.push(s.location);
  world.placeParty(s.location);
  world.setMarkerStates(markerStates(game));
  game.disposeStage();
  game.setScreen({ update: (dt) => world.update(dt), render: () => world.render(), resize: (w, hh) => world.resize(w, hh), dispose: () => world.dispose() });
  audio.playMusic(s.chapter >= 3 ? 'worldmap' : 'worldmap', { fade: 1.5 });
  const hud = h('div.passthru', { style: { position: 'absolute', inset: '0' } });
  uiRoot().appendChild(hud);
  const top = h('div.panel', { style: { left: '12px', top: '12px', padding: '6px 14px', fontSize: '0.9em' } });
  const label = h('div.panel', { style: { display: 'none', padding: '3px 12px', fontFamily: 'Cinzel, serif', fontWeight: '700', transform: 'translate(-50%, -100%)', pointerEvents: 'none' } });
  hud.appendChild(top); hud.appendChild(label);
  const refreshTop = () => {
    const step = STORY[s.storyIndex];
    top.innerHTML = '';
    top.appendChild(h('div', null, h('b', null, dateText(s.day)), ` · ${s.gil.toLocaleString()} gil · Party Lv ${partyLevel(s)} · Chapter ${['Prologue', 'I', 'II', 'III', 'IV'][s.chapter] ?? s.chapter}`));
    top.appendChild(h('div.muted', null, step ? `Objective: ${step.objective}` : 'The tale is complete.'));
  };
  refreshTop();
  const el = renderer.domElement;
  let hovered: string | null = null;
  const showLabel = (id: string | null) => {
    hovered = id; world.hover(id);
    if (!id) { label.style.display = 'none'; return; }
    const p = world.screenOf(id);
    if (!p) return;
    label.style.display = 'block'; label.style.left = p.x + 'px'; label.style.top = p.y + 'px';
    label.textContent = NODES.get(id)?.name ?? id;
  };
  let busy = false;
  let result: 'title' | 'continue' | null = null;
  const cleanupFns: Array<() => void> = [];
  const goTo = async (target: string) => {
    if (busy) return;
    busy = true;
    showLabel(null);
    try {
      const unlocked = new Set(s.unlocked);
      if (target !== s.location) {
        const r = route(s.location, target, unlocked);
        if (!r) { toast('No known road leads there.'); return; }
        await world.travel(r, async (nodeId) => {
          s.location = nodeId;
          advanceDay(game, 1);
          refreshTop();
          const step = STORY[s.storyIndex];
          // stop early at story nodes on the way
          if (step?.at === nodeId && nodeId !== target) return false;
          return true;
        });
      }
      // arrival
      const res = await nodeMenu(game, world, s.location);
      if (res === 'rebuild' || res === 'title') { result = res === 'title' ? 'title' : 'continue'; return; }
      world.setMarkerStates(markerStates(game));
      refreshTop();
    } finally { busy = false; }
  };
  const onMove = (e: PointerEvent) => { if (busy) return; const id = world.pickNode(e.clientX, e.clientY); if (id !== hovered) showLabel(id); };
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: PointerEvent) => {
    if (!down || busy) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 8) return;
    const id = world.pickNode(e.clientX, e.clientY);
    if (id) goTo(id);
  };
  const onWheel = (e: WheelEvent) => { world.camDist = Math.max(14, Math.min(70, world.camDist * (e.deltaY > 0 ? 1.1 : 0.9))); };
  el.addEventListener('pointermove', onMove); el.addEventListener('pointerdown', onDown); el.addEventListener('pointerup', onUp); el.addEventListener('wheel', onWheel, { passive: true });
  cleanupFns.push(() => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointerup', onUp); el.removeEventListener('wheel', onWheel); });
  // keyboard: cycle through neighbour nodes, confirm to travel, menu key for party menu
  let sel = s.location;
  const pop = input.push((a) => {
    if (busy) return true;
    const unlocked = new Set(s.unlocked);
    if (a === 'left' || a === 'right' || a === 'up' || a === 'down') {
      const list = [...unlocked].filter((id) => NODES.has(id));
      const cur = NODES.get(sel)!;
      const dir = a === 'left' ? [-1, 0] : a === 'right' ? [1, 0] : a === 'up' ? [0, -1] : [0, 1];
      let best: string | null = null, bs = 1e9;
      for (const id of list) {
        if (id === sel) continue;
        const n = NODES.get(id)!;
        const dx = n.pos[0] - cur.pos[0], dy = n.pos[1] - cur.pos[1];
        const along = dx * dir[0] + dy * dir[1];
        if (along <= 0) continue;
        const off = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
        const sc = along + off * 2;
        if (sc < bs) { bs = sc; best = id; }
      }
      if (best) { sel = best; world.focus(sel); showLabel(sel); audio.sfx('cursor', { volume: 0.5 }); }
      return true;
    }
    if (a === 'confirm') { goTo(sel); return true; }
    if (a === 'menu' || a === 'cancel') { openWorldMenu(); return true; }
    if (a === 'zoomIn') { world.camDist = Math.max(14, world.camDist * 0.85); return true; }
    if (a === 'zoomOut') { world.camDist = Math.min(70, world.camDist * 1.15); return true; }
    if (a === 'rotL') { world.camYaw -= 0.4; return true; }
    if (a === 'rotR') { world.camYaw += 0.4; return true; }
    return true;
  });
  cleanupFns.push(pop);
  const menuBtn = h('span.btn', { style: { position: 'absolute', right: '12px', top: '12px' }, onclick: () => openWorldMenu() }, '☰ Menu');
  hud.appendChild(menuBtn);
  const openWorldMenu = async () => {
    if (busy) return;
    busy = true;
    try {
      const pick = await menu({ items: [
        { label: 'Formation', value: 'formation' }, { label: 'Chronicle', value: 'chronicle' }, { label: 'Save', value: 'save' }, { label: 'Load', value: 'load' },
        { label: 'Options', value: 'options' }, { label: 'Return to Title', value: 'title' },
      ], right: 14, y: 60, title: 'Menu' }).promise;
      if (pick === 'formation') await openFormation(game);
      if (pick === 'chronicle') await openChronicle(game);
      if (pick === 'save') await openSaveLoad(game, 'save');
      if (pick === 'load') { const st = await openSaveLoad(game, 'load'); if (st) { game.state = st; result = 'continue'; } }
      if (pick === 'options') await openOptions(game);
      if (pick === 'title' && await confirm('Return to the title screen? Unsaved progress will be lost.')) result = 'title';
      refreshTop();
    } finally { busy = false; }
  };
  // welcome: if the current story step is here, offer it immediately
  const stepHere = STORY[s.storyIndex];
  if (stepHere?.at === s.location) { busy = false; goTo(s.location); }
  else if ((window as any).__autoPlay && stepHere?.at) {
    if (!s.unlocked.includes(stepHere.at)) { console.warn('[autoplay] story node locked: ' + stepHere.at + ' (step ' + stepHere.id + ')'); s.unlocked.push(stepHere.at); world.setMarkerStates(markerStates(game)); }
    const r = route(s.location, stepHere.at, new Set(s.unlocked));
    if (!r) { console.warn('[autoplay] no route to ' + stepHere.at + ' — teleporting'); s.location = stepHere.at; world.placeParty(s.location); }
    goTo(stepHere.at);
  }
  while (!result) await sleep(100);
  for (const f of cleanupFns) f();
  hud.remove();
  game.setScreen(null);
  return result;
}

function advanceDay(game: Game, n: number) {
  const s = game.state;
  s.day += n;
  // errands
  for (const run of [...s.errands]) {
    if (s.day < run.due) continue;
    const e = ERRANDS.get(run.id);
    s.errands = s.errands.filter((r) => r !== run);
    const units = s.roster.filter((u) => run.units.includes(u.uid));
    for (const u of units) u.errand = undefined;
    if (!e) continue;
    // success chance from stat emphasis
    const score = units.reduce((acc, u) => acc + (e.stat === 'brave' ? u.brave : e.stat === 'faith' ? u.faith : e.stat === 'level' ? u.level * 3 : 60) + ((e.jobs ?? []).includes(u.job) ? 25 : 0), 0) / Math.max(1, units.length);
    const ok = new Rng().pct(Math.min(95, 40 + score * 0.6 + units.length * 8));
    if (ok) {
      s.gil += e.reward.gil;
      for (const u of units) { addJp(u, u.job, e.reward.jp ?? 100); u.exp += 30; }
      if (e.reward.item) addItem(s, e.reward.item, 1);
      if (e.reward.artefact && !s.artefacts.includes(e.reward.artefact)) s.artefacts.push(e.reward.artefact);
      if (e.reward.flag) s.flags[e.reward.flag] = true;
      if (e.reward.unlock && NODES.has(e.reward.unlock) && !s.unlocked.includes(e.reward.unlock)) s.unlocked.push(e.reward.unlock);
      s.errandsDone.push(e.id);
      toast(`Errand complete: ${e.title} (+${e.reward.gil} gil)`, 3500);
    } else {
      toast(`Errand failed: ${e.title}. The party returns empty-handed.`, 3500);
    }
  }
  // birthdays: small brave bump
}

// ---------------------------------------------------------------- node menu
async function nodeMenu(game: Game, world: WorldView, nodeId: string): Promise<'stay' | 'rebuild' | 'title'> {
  const s = game.state;
  const node = NODES.get(nodeId)!;
  const step = STORY[s.storyIndex];
  // story event here: auto-offer
  for (;;) {
    const sides = game.sideStepsAt(nodeId);
    const items: Array<{ label: string; value: string; right?: string; disabled?: boolean | string }> = [];
    const stepHere = STORY[s.storyIndex];
    if (stepHere?.at === nodeId) items.push({ label: `▶ ${stepHere.objective}`, value: 'story' });
    for (const q of sides) items.push({ label: `✦ ${q.objective ?? 'A curious matter'}`, value: 'side:' + q.id });
    if (node.shop) items.push({ label: 'Outfitter', value: 'shop' });
    if (node.guild) items.push({ label: 'Soldier Office', value: 'recruit' });
    if (node.tavern) items.push({ label: 'Tavern', value: 'tavern' });
    if (node.furShop) items.push({ label: 'Fur Shop', value: 'fur' });
    if (node.kind === 'field' && node.random) items.push({ label: 'Seek Battle', value: 'fight' });
    items.push({ label: 'Formation', value: 'formation' });
    items.push({ label: 'Save', value: 'save' });
    items.push({ label: 'Depart', value: 'leave' });
    const info = h('div.panel', { style: { left: '50%', top: '12px', transform: 'translateX(-50%)', maxWidth: 'min(640px, 90vw)', textAlign: 'center', padding: '6px 16px' } }, h('h2', null, node.name), h('div.muted', null, node.desc));
    uiRoot().appendChild(info);
    if (node.kind === 'town' || node.kind === 'castle') audio.playMusic('town', { fade: 1.2 });
    const auto = (window as any).__autoPlay && stepHere?.at === nodeId;
    const m = menu({ items, x: 14, y: '28%', title: node.region, cancelable: true });
    if (auto) m.close();
    const pick = auto ? 'story' : await m.promise;
    info.remove();
    if (pick === null || pick === 'leave') { audio.playMusic('worldmap', { fade: 1.2 }); return 'stay'; }
    if (pick === 'story' && stepHere) {
      const ok = await game.runStep(stepHere);
      game.autosave();
      if (!ok) return 'title';
      // continue chained steps
      for (;;) {
        const nx = STORY[s.storyIndex];
        if (!nx || (nx.at && !stepHere.chain && !(nx.chain && STORY[s.storyIndex - 1]?.chain))) break;
        if (nx.at && nx.at !== s.location && !STORY[s.storyIndex - 1]?.chain) break;
        const ok2 = await game.runStep(nx);
        game.autosave();
        if (!ok2) return 'title';
      }
      return 'rebuild';
    }
    if (pick.startsWith('side:')) {
      const q = sides.find((x) => 'side:' + x.id === pick);
      if (q) { const ok = await game.runSide(q); if (!ok) return 'title'; return 'rebuild'; }
    }
    if (pick === 'fight') {
      const def = randomBattleDef(game, node);
      if (def) {
        BATTLES.set(def.id, def);
        const r = await game.runBattle(def.id);
        BATTLES.delete(def.id);
        if (r === 'defeat') return 'title';
        game.autosave();
        return 'rebuild';
      }
    }
    if (pick === 'shop') await openShop(game, node);
    if (pick === 'recruit') await openRecruit(game, node);
    if (pick === 'tavern') await openTavern(game, node);
    if (pick === 'fur') await openFurShop(game, node);
    if (pick === 'formation') await openFormation(game);
    if (pick === 'save') await openSaveLoad(game, 'save');
    void step; void world;
  }
}

// ---------------------------------------------------------------- random battles
export function randomBattleDef(game: Game, node: WorldNode): BattleDef | null {
  const s = game.state;
  const r = node.random;
  if (!r || !r.maps.length) return null;
  const rng = new Rng(s.seed + s.day * 131 + node.pos[0] * 7);
  const mapId = rng.pick(r.maps);
  let md;
  try { md = mapDef(mapId); } catch { return null; }
  const grid = new MapGrid(md);
  const pools = r.pools.filter((p) => s.chapter >= p.chapterMin && (p.chapterMax === undefined || s.chapter <= p.chapterMax));
  const pool = pools.length ? pools[pools.length - 1] : r.pools[0];
  if (!pool) return null;
  const n = rng.int(pool.count[0], pool.count[1]);
  // enemy cells: far from deploy cells
  const dep = md.deploy;
  const cells = grid.cells.filter((c) => c.standable && !c.hole && !dep.some(([x, z]) => x === c.x && z === c.z))
    .map((c) => ({ c, d: Math.min(...dep.map(([x, z]) => Math.abs(x - c.x) + Math.abs(z - c.z))) }))
    .filter((o) => o.d >= 5).sort((a, b) => b.d - a.d);
  const units: UnitSpawn[] = [];
  const used = new Set<string>();
  for (let i = 0; i < n && cells.length; i++) {
    const u = rng.weighted(pool.units, (x) => x.weight ?? 1);
    const pick = cells[Math.min(cells.length - 1, rng.int(0, Math.min(cells.length - 1, 10)))];
    if (used.has(pick.c.x + ',' + pick.c.z)) { i--; cells.splice(cells.indexOf(pick), 1); continue; }
    used.add(pick.c.x + ',' + pick.c.z);
    units.push({ job: u.job, gender: u.gender, level: `+${rng.int(-1, 2)}`, at: [pick.c.x, pick.c.z], team: 1 });
  }
  return {
    id: 'rand_' + node.id + '_' + s.day, name: node.name, map: mapId, music: rng.pick(['battle1', 'battle2']),
    units, victory: { type: 'defeatAll' }, rewards: { gil: 100 + partyLevel(s) * 20 }, scaled: true,
  };
}

// ---------------------------------------------------------------- credits
async function credits(game: Game) {
  audio.playMusic('credits', { fade: 2 });
  const lines = [
    'FINAL FEALTY TACTICS', 'The Chronicle of the Twelve Braves', '',
    'A tale of fealty and its price.', '', 'Story, systems, code, models, music', 'written procedurally for the browser', '',
    'Rendered with three.js — WebGPU, WebGL 2, WebGL 1', '', 'Inspired by the war-drama tactics games of old,', 'with love and respect.', '',
    `Played by ${game.state.heroName}'s company`, `Days on the road: ${game.state.day}`, `Battles won: ${game.state.battlesWon}`, '', 'Thank you for playing.',
  ];
  const el = h('div.narration', null, h('div', { style: { whiteSpace: 'pre-line', fontStyle: 'normal', fontFamily: 'Cinzel, serif', lineHeight: '2' } }, lines.join('\n')));
  uiRoot().appendChild(el);
  await new Promise<void>((resolve) => { const pop = input.push((a) => { if (a === 'confirm' || a === 'cancel') { pop(); resolve(); } return true; }); });
  el.remove();
  await titleCard('Fin', 'Your chronicle has been saved.');
  saveGame(game.state, 0);
}

export { say, CHARACTERS };
