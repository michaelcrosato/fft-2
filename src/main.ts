// Entry point: renderer bootstrap, loading screen, routing.
import './ui/style.css';
import { initRenderer, rinfo, onRendererLost } from './gfx/renderer';
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
    await openFormation(game);
    return true;
  }
  if (test === 'town') {
    // open one town service (shop | tavern | recruit | fur) at a node
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

const LOST_KEY = 'fft-fealty-gpu-lost';
function lostCount(): number { try { return Number(sessionStorage.getItem(LOST_KEY) ?? 0) || 0; } catch { return 0; } }

/** the GPU device / GL context is gone: the canvas can't recover, so offer a reload (progress is in the autosave) */
function showRendererLost() {
  try { sessionStorage.setItem(LOST_KEY, String(lostCount() + 1)); } catch { /* private mode */ }
  const box = document.createElement('div');
  box.className = 'panel';
  Object.assign(box.style, { left: '50%', top: '50%', transform: 'translate(-50%,-50%)', maxWidth: 'min(460px, 92vw)', textAlign: 'center', zIndex: '60' });
  box.innerHTML = '<h2>The picture was lost</h2><p>The graphics device stopped responding (a driver reset, or the browser reclaimed it). Your last autosave is safe.</p>';
  const btn = document.createElement('button');
  btn.className = 'btn'; btn.type = 'button'; btn.textContent = 'Reload';
  btn.onclick = () => location.reload();
  box.appendChild(btn);
  document.getElementById('ui')?.appendChild(box);
  input.push((a) => { if (a === 'confirm' || a === 'menu') location.reload(); return true; }); // gamepad A / Enter
}

boot().catch((e) => {
  console.error(e);
  (window as any).__error = String(e?.stack ?? e);
  const m = document.getElementById('loadmsg');
  if (m) m.textContent = 'Failed to start: ' + (e?.message ?? e);
});
