#!/usr/bin/env node
// Art style screenshot matrix (docs/PLAN-ART-STYLES.md). Serves the production build with
// `vite preview`, opens each scene with the style URL overrides, and writes PNGs plus an index
// page to tools/out/styles/<label>/. Look at every image.
//
//   node tools/style-shots.mjs [--build] [--label NAME] [--styles none,boldCel] [--modes both,env,actors]
//        [--scenes galwyn,night,interior,storm,void,world,cutscene] [--extra "lights=1&lamps=0"]
//        [--quality medium] [--renderer webgl2] [--webgpu] [--orbit N] [--size 1280x720]
//
// Modes: both = ?style=ID; env = the environment only; actors = characters & objects only;
// mix:A/B = environment A with characters B (e.g. --modes mix:pixel/boldCel).
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes('--' + name);

/** a battle is shot during the player's first move choice: units, team rings, the move range and the cursor */
const SCENES = {
  galwyn: { q: { test: 'battle', id: 'b_galwyn', lv: 8 }, battle: true, note: 'day, town' },
  night: { q: { test: 'battle', id: 'b_ziekhold', lv: 12 }, battle: true, note: 'night, embers' },
  interior: { q: { test: 'battle', id: 'b_vepar', lv: 20 }, battle: true, note: 'interior, chapel' },
  storm: { q: { test: 'battle', id: 'b_golgrand', lv: 18 }, battle: true, note: 'storm, rain' },
  void: { q: { test: 'battle', id: 'b_necropolis', lv: 40 }, battle: true, note: 'void, motes' },
  dawn: { q: { test: 'battle', id: 'b_finneth', lv: 30 }, battle: true, note: 'dawn, river' },
  world: { q: {}, title: true, note: 'title over the world map' },
  cutscene: { q: { test: 'scene', id: 'sc_galwyn_post' }, scene: true, note: 'cutscene' },
};

const label = opt('label', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
const styles = opt('styles', 'none').split(',').filter(Boolean);
const modes = opt('modes', 'both').split(',').filter(Boolean);
const scenes = opt('scenes', 'galwyn,night,interior,storm,void,world,cutscene').split(',').filter(Boolean);
const extra = opt('extra', '');
const quality = opt('quality', 'medium');
const renderer = opt('renderer', 'webgl2');
const orbit = Number(opt('orbit', '0'));
const [W, H] = opt('size', '1280x720').split('x').map(Number);
const out = join(ROOT, 'tools/out/styles', label);
mkdirSync(out, { recursive: true });

function styleParams(style, mode) {
  if (mode.startsWith('mix:')) { const [e, a] = mode.slice(4).split('/'); return { styleEnv: e, styleActors: a }; }
  if (style === 'none') return {};
  if (mode === 'env') return { styleEnv: style, styleActors: 'none' };
  if (mode === 'actors') return { styleEnv: 'none', styleActors: style };
  return { style };
}

function freePort() {
  return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}

async function waitFor(page, pred, timeout, what) {
  const t0 = Date.now();
  for (;;) {
    if (await page.evaluate(pred).catch(() => false)) return;
    if (Date.now() - t0 > timeout) throw new Error('timed out waiting for ' + what);
    await page.waitForTimeout(300);
  }
}
const uiHas = (text) => `(() => !document.getElementById('loading') && (document.getElementById('ui')?.innerText ?? '').includes(${JSON.stringify(text)}))()`;

async function main() {
  if (flag('build') || !existsSync(join(ROOT, 'dist/index.html'))) execSync('npx vite build --logLevel warn', { cwd: ROOT, stdio: 'inherit' });
  const port = await freePort();
  const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore', detached: true });
  const base = `http://127.0.0.1:${port}/`;
  // --webgpu: headless Chromium's WebGPU through SwiftShader's Vulkan (use with --renderer webgpu)
  const browser = await chromium.launch({ args: flag('webgpu') ? ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader'] : [] });
  const rows = [];
  try {
    for (let i = 0; i < 60; i++) { try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 250)); } }
    for (const style of styles) for (const mode of (style === 'none' ? ['both'] : modes)) for (const sc of scenes) {
      const def = SCENES[sc];
      if (!def) throw new Error('unknown scene ' + sc);
      const q = new URLSearchParams({ renderer, quality, ...def.q, ...styleParams(style, mode) });
      for (const [k, v] of new URLSearchParams(extra)) q.set(k, v);
      const name = `${style}-${mode.replace(/[:/]/g, '_')}-${sc}`;
      const page = await browser.newPage({ viewport: { width: W, height: H } });
      // the stored quality, not Auto: automatic quality would lighten the style or lower the preset mid-run
      await page.addInitScript((q) => { try { localStorage.setItem('fft-fealty-options', JSON.stringify({ quality: q })); } catch { /* none */ } }, quality);
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error' && !/GL Driver|ReadPixels|preload/i.test(m.text())) errors.push(m.text().slice(0, 200)); });
      const t0 = Date.now();
      try {
        await page.goto(base + '?' + q);
        if (def.battle) {
          await waitFor(page, uiHas('Begin Battle'), 120_000, 'deployment');
          await page.keyboard.press('Enter');
          // battle-start dialogue: advance it until the first command menu (Move, Act, Wait) opens
          const menuOpen = `(() => { const t = document.getElementById('ui')?.innerText ?? ''; return t.includes('Move') && t.includes('Act') && t.includes('Wait'); })()`;
          for (let t1 = Date.now(); !(await page.evaluate(menuOpen)); ) {
            if (Date.now() - t1 > 180_000) throw new Error('timed out waiting for the command menu');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(700);
          }
          await page.waitForTimeout(400);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1500);
        } else if (def.title) {
          await waitFor(page, uiHas('New Game'), 120_000, 'the title');
          await page.waitForTimeout(1500);
        } else {
          await waitFor(page, `(() => !document.getElementById('loading'))()`, 120_000, 'the scene');
          await page.waitForTimeout(2500);
        }
        if (flag('webgpu')) {
          // headless screenshots miss a WebGPU canvas: read it back inside a frame, while it is current
          const url = await page.evaluate(() => new Promise((res) => {
            const w = window;
            const target = w.__game?.stage ?? w.__game?.screen;
            const post = target?.post;
            if (!post) { res(''); return; }
            const orig = post.render;
            post.render = function () { orig.call(this); post.render = orig; res(document.getElementById('gl')?.toDataURL('image/png') ?? ''); };
          }));
          writeFileSync(join(out, name + '.png'), Buffer.from(String(url).split(',')[1] ?? '', 'base64'));
        } else await page.screenshot({ path: join(out, name + '.png') });
        const frames = [];
        for (let f = 0; f < orbit; f++) {
          await page.evaluate(() => { const c = window.__game?.stage?.cam; c?.orbitFree(0.035, 0); });
          await page.waitForTimeout(120);
          const fn = `${name}-orbit${String(f).padStart(2, '0')}.png`;
          await page.screenshot({ path: join(out, fn) });
          frames.push(fn);
        }
        rows.push({ name, style, mode, sc, note: def.note, ms: Date.now() - t0, errors, frames });
        console.log(`${name.padEnd(40)} ${((Date.now() - t0) / 1000).toFixed(1)}s ${errors.length ? 'ERRORS: ' + errors.join(' | ') : ''}`);
      } catch (e) {
        await page.screenshot({ path: join(out, name + '-FAILED.png') }).catch(() => {});
        rows.push({ name, style, mode, sc, note: def.note, ms: Date.now() - t0, errors: [...errors, String(e.message ?? e)], frames: [], failed: true });
        console.log(`${name.padEnd(40)} FAILED: ${e.message ?? e}`);
      } finally { await page.close(); }
    }
  } finally {
    await browser.close();
    try { process.kill(-server.pid); } catch { server.kill(); }
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  writeFileSync(join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Style shots ${esc(label)}</title>
<style>body{font:14px system-ui;background:#1b1b1f;color:#ddd;margin:16px}figure{display:inline-block;margin:6px;vertical-align:top}img{width:420px;display:block}figcaption{max-width:420px}.e{color:#f77}</style>
${rows.map((r) => `<figure><img src="${esc(r.failed ? r.name + '-FAILED' : r.name)}.png"><figcaption>${esc(r.name)} · ${esc(r.note)} · ${(r.ms / 1000).toFixed(1)}s${r.errors.length ? `<div class=e>${esc(r.errors.join(' | '))}</div>` : ''}</figcaption></figure>`).join('\n')}`);
  writeFileSync(join(out, 'report.json'), JSON.stringify(rows, null, 2));
  console.log(`\n${rows.length} shots, ${rows.filter((r) => r.failed || r.errors.length).length} with problems → ${out}/index.html`);
  if (rows.some((r) => r.failed)) process.exitCode = 1;
}
main().catch((e) => { console.error(e); process.exit(1); });
