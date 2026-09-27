// Entry point: renderer bootstrap, loading screen, routing.
import './ui/style.css';
import { initRenderer, onRendererLost } from './gfx/renderer';
import { loadTSL } from './gfx/materials';
import { input } from './ui/input';
import { audio } from './audio/audio';
import { Game } from './game/game';
import { loadOptions, newGame, joinCharacter } from './game/state';
import { setLevel } from './game/roster';
import { getTexture, type TexId } from './gfx/textures';
import { loadMonsterBuilder } from './scenes/unitview';
import type { Backend } from './gfx/three';
import { toast } from './ui/widgets';
import { SIDE, NODES } from './data/db';
import { loading, paintLoading } from './ui/loading';

const q = new URLSearchParams(location.search);
// Debug URLs (README): throwaway test parties that autosave over the real save slots,
// so they run only on the dev server or a local `vite preview`, never on a deployed site.
const DEBUG_HOOKS = import.meta.env.DEV || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

function setLoad(p: number, msg?: string) {
  const bar = document.getElementById('loadbar');
  if (bar) bar.style.width = Math.round(p * 100) + '%';
  if (msg) { const m = document.getElementById('loadmsg'); if (m) m.textContent = msg; }
}
const tick = paintLoading;

async function boot() {
  await loading.begin('Waking the renderer…');
  const opts = loadOptions();
  input.init();
  window.addEventListener('gamepadconnected', (e) => toast(`🎮 Controller connected${/xbox|xinput/i.test(e.gamepad.id) ? ' (Xbox)' : /dualsense|dualshock|playstation|054c/i.test(e.gamepad.id) ? ' (PlayStation)' : ''}`));
  window.addEventListener('gamepaddisconnected', () => toast('Controller disconnected'));
  audio.setVolumes?.({ music: opts.music, sfx: opts.sfx });
  // pointerdown alone doesn't count as a user activation for iOS Safari audio; attachUnlock also listens to touchend/click
  audio.attachUnlock();
  setLoad(0.1, 'Waking the renderer…');
  const BACKENDS = ['webgpu', 'webgl2', 'webgl1'];
  const QUALITIES = ['ultra', 'high', 'medium', 'low', 'auto'];
  const qRenderer = q.get('renderer'), qQuality = q.get('quality');
  let pref = (qRenderer && BACKENDS.includes(qRenderer) ? qRenderer : opts.renderer !== 'auto' ? opts.renderer : 'auto') as Backend | 'auto';
  // the GPU device was lost more than once this session: stay on WebGL 2
  if (pref === 'auto' && lostCount() >= 2) pref = 'webgl2';
  await initRenderer(document.getElementById('app')!, pref, (qQuality && QUALITIES.includes(qQuality) ? qQuality : opts.quality) as never);
  onRendererLost(showRendererLost);
  await loadTSL();
  setLoad(0.3, 'Painting the land…');
  const texIds: TexId[] = ['grass', 'dirt', 'cobble', 'rock', 'brick', 'planks', 'roof', 'plaster', 'stoneWall', 'riverbed', 'sand', 'sandstone', 'moss', 'carpet', 'snow', 'marsh'];
  for (let i = 0; i < texIds.length; i++) { getTexture(texIds[i]); setLoad(0.3 + (0.5 * i) / texIds.length); if (i % 4 === 3) await tick(); }
  setLoad(0.85, 'Summoning beasts…');
  await loadMonsterBuilder();
  const game = new Game();
  setLoad(0.9, 'Opening the chronicle…');
  // The destination releases the loader after its real first frame is ready.

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
    game.state = newGame('Rhen', [4, 12]);
    game.state.chapter = Number(q.get('ch') ?? 4);
    game.state.roster.forEach((u) => setLevel(u, Number(q.get('lv') ?? 30)));
    const st = SIDE.find((x) => x.id === q.get('id'));
    if (st) { for (const c of st.needChar ?? []) joinCharacter(game.state, c); await game.runSide(st); }
    return true;
  }
  if (test === 'formation') {
    game.state = newGame('Rhen', [4, 12]);
    game.state.roster.forEach((u) => setLevel(u, Number(q.get('lv') ?? 12)));
    const { openFormation } = await import('./ui/menus/formation');
    const opened = openFormation(game);
    await loading.finish();
    await opened;
    return true;
  }
  if (test === 'chronicle') {
    game.state = newGame('Rhen', [4, 12]);
    const { openChronicle } = await import('./ui/menus/chronicle');
    const opened = openChronicle(game);
    await loading.finish();
    await opened;
    return true;
  }
  if (test === 'town') {
    // open one town service (shop | tavern | recruit | fur) at a node
    const town = await import('./ui/menus/town');
    game.state = newGame('Rhen', [4, 12]);
    game.state.chapter = Number(q.get('ch') ?? 1); game.state.tier = Number(q.get('tier') ?? 2); game.state.gil = 50000;
    const node = NODES.get(q.get('node') ?? 'galwyn')!;
    const which = q.get('open') ?? 'shop';
    await loading.finish();
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

const LOST_KEY = 'fft-fealty-gpu-lost';
function lostCount(): number { try { return Number(sessionStorage.getItem(LOST_KEY) ?? 0) || 0; } catch { return 0; } }

/** the GPU device / GL context is gone: the canvas can't recover, so offer a reload (progress is in the autosave) */
function showRendererLost() {
  try { sessionStorage.setItem(LOST_KEY, String(lostCount() + 1)); } catch { /* private mode */ }
  loading.fail(new Error('The graphics device stopped responding. Your last autosave is safe. Reload to continue.'));
}

// World-map actions also run from event handlers rather than the awaited story loop.
window.addEventListener('unhandledrejection', (event) => {
  if (loading.preparing) loading.fail(event.reason);
});

boot().catch((e) => {
  console.error(e);
  (window as any).__error = String(e?.stack ?? e);
  loading.fail(e);
});
