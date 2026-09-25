// Entry point: renderer bootstrap, loading screen, routing.
import './ui/style.css';
import { initRenderer, rinfo } from './gfx/renderer';
import { loadTSL } from './gfx/materials';
import { input } from './ui/input';
import { audio } from './audio/audio';
import { Game } from './game/game';
import { loadOptions, newGame } from './game/state';
import { setLevel } from './game/roster';
import { getTexture, type TexId } from './gfx/textures';
import { loadMonsterBuilder } from './scenes/unitview';
import type { Backend } from './gfx/three';

const q = new URLSearchParams(location.search);
// Debug URLs (README): throwaway test parties that autosave over the real save slots,
// so they run only on the dev server or a local `vite preview`, never on a deployed site.
const DEBUG_HOOKS = import.meta.env.DEV || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

function setLoad(p: number, msg?: string) {
  const bar = document.getElementById('loadbar');
  if (bar) bar.style.width = Math.round(p * 100) + '%';
  if (msg) { const m = document.getElementById('loadmsg'); if (m) m.textContent = msg; }
}
const tick = () => new Promise((r) => setTimeout(r, 0));

async function boot() {
  const opts = loadOptions();
  input.init();
  audio.setVolumes?.({ music: opts.music, sfx: opts.sfx });
  const unlock = () => { audio.unlock(); };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });
  setLoad(0.1, 'Waking the renderer…');
  const pref = (q.get('renderer') as Backend | null) ?? (opts.renderer !== 'auto' ? opts.renderer : 'auto');
  await initRenderer(document.getElementById('app')!, pref, (q.get('quality') as any) ?? opts.quality);
  await loadTSL();
  setLoad(0.3, 'Painting the land…');
  const texIds: TexId[] = ['grass', 'dirt', 'cobble', 'rock', 'brick', 'planks', 'roof', 'plaster', 'stoneWall', 'riverbed', 'sand', 'sandstone', 'moss', 'carpet', 'snow', 'marsh'];
  for (let i = 0; i < texIds.length; i++) { getTexture(texIds[i]); setLoad(0.3 + (0.5 * i) / texIds.length); await tick(); }
  setLoad(0.85, 'Summoning beasts…');
  await loadMonsterBuilder();
  const game = new Game();
  setLoad(1, `Ready (${rinfo.backend})`);
  const ld = document.getElementById('loading')!;
  ld.style.opacity = '0';
  setTimeout(() => ld.remove(), 700);

  if (DEBUG_HOOKS && (await runDebugHooks(game))) return;
  const { runTitle } = await import('./game/flow');
  await runTitle(game);
}

/** Handles ?test= / ?auto / ?autoplay / ?quickwin; true if a test route ran instead of the title screen. */
async function runDebugHooks(game: Game): Promise<boolean> {
  (window as any).__game = game;
  const test = q.get('test');
  if (q.get('auto')) (window as any).__autoBattle = true;
  if (q.get('autoplay')) { (window as any).__autoPlay = true; (window as any).__autoBattle = true; }
  // integration runs: win every battle at once to exercise the whole story flow
  if (q.get('quickwin')) (window as any).__quickWin = true;
  if (test === 'campaign') {
    // headless-ish full playthrough for integration testing
    game.state = newGame('Rhen', [4, 12]);
    if (q.get('lv')) game.state.roster.forEach((u) => setLevel(u, Number(q.get('lv'))));
    if (q.get('step')) game.state.storyIndex = Number(q.get('step'));
    const { mainLoop } = await import('./game/flow');
    await mainLoop(game);
    return true;
  }
  if (test === 'battle') {
    game.state = newGame('Rhen', [4, 12]);
    game.state.roster.forEach((u) => setLevel(u, Number(q.get('lv') ?? 5)));
    await game.runBattle(q.get('id') ?? 'b_galwyn');
    return true;
  }
  if (test === 'side') {
    // play one side-quest step (scenes + battle) in isolation
    const { SIDE } = await import('./data/db');
    game.state = newGame('Rhen', [4, 12]);
    game.state.chapter = Number(q.get('ch') ?? 4);
    game.state.roster.forEach((u) => setLevel(u, Number(q.get('lv') ?? 30)));
    const st = SIDE.find((x) => x.id === q.get('id'));
    if (st) { for (const c of st.needChar ?? []) (await import('./game/state')).joinCharacter(game.state, c); await game.runSide(st); }
    return true;
  }
  if (test === 'formation') {
    game.state = newGame('Rhen', [4, 12]);
    game.state.roster.forEach((u) => setLevel(u, Number(q.get('lv') ?? 12)));
    const { openFormation } = await import('./ui/menus/formation');
    await openFormation(game);
    return true;
  }
  if (test === 'town') {
    // open one town service (shop | tavern | recruit | fur) at a node
    const { NODES } = await import('./data/db');
    const town = await import('./ui/menus/town');
    game.state = newGame('Rhen', [4, 12]);
    game.state.chapter = Number(q.get('ch') ?? 1); game.state.tier = Number(q.get('tier') ?? 2); game.state.gil = 50000;
    const node = NODES.get(q.get('node') ?? 'galwyn')!;
    const which = q.get('open') ?? 'shop';
    if (which === 'shop') await town.openShop(game, node);
    if (which === 'tavern') await town.openTavern(game, node);
    if (which === 'recruit') await town.openRecruit(game, node);
    if (which === 'fur') await town.openFurShop(game, node);
    return true;
  }
  if (test === 'scene') {
    game.state = newGame('Rhen', [4, 12]);
    await game.playScene(q.get('id') ?? '');
    return true;
  }
  return false;
}

boot().catch((e) => {
  console.error(e);
  (window as any).__error = String(e?.stack ?? e);
  const m = document.getElementById('loadmsg');
  if (m) m.textContent = 'Failed to start: ' + (e?.message ?? e);
});
