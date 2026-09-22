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
  (window as any).__game = game;
  setLoad(1, `Ready (${rinfo.backend})`);
  const ld = document.getElementById('loading')!;
  ld.style.opacity = '0';
  setTimeout(() => ld.remove(), 700);

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
    return;
  }
  if (test === 'battle') {
    game.state = newGame('Rhen', [4, 12]);
    game.state.roster.forEach((u) => setLevel(u, Number(q.get('lv') ?? 5)));
    await game.runBattle(q.get('id') ?? 'b_galwyn');
    return;
  }
  if (test === 'scene') {
    game.state = newGame('Rhen', [4, 12]);
    await game.playScene(q.get('id') ?? '');
    return;
  }
  const { runTitle } = await import('./game/flow');
  await runTitle(game);
}

boot().catch((e) => {
  console.error(e);
  (window as any).__error = String(e?.stack ?? e);
  const m = document.getElementById('loadmsg');
  if (m) m.textContent = 'Failed to start: ' + (e?.message ?? e);
});
