#!/usr/bin/env node
// Art style frame-time bench (docs/PLAN-ART-STYLES.md, Phase 9). Opens one battle's deployment with
// each configuration, orbits the camera, and reports the average frame time over a fixed window, and
// its cost against the first configuration (the None baseline). Software GL makes the numbers relative.
//
//   node tools/style-bench.mjs [--configs "none;style=boldCel;styleEnv=pixel&styleActors=none"]
//        [--quality medium] [--renderer webgl2] [--seconds 6] [--battle b_galwyn] [--webgpu] [--json FILE]
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const configs = opt('configs', 'none').split(';').map((s) => s.trim()).filter(Boolean);
const quality = opt('quality', 'medium');
const renderer = opt('renderer', 'webgl2');
const seconds = Number(opt('seconds', '6'));
const battle = opt('battle', 'b_galwyn');
const webgpu = args.includes('--webgpu');

if (!existsSync(join(ROOT, 'dist/index.html'))) { console.error('build first: npm run build'); process.exit(1); }
const port = await new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore', detached: true });
const base = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch({ args: webgpu ? ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader'] : [] });
const results = [];
try {
  for (let i = 0; i < 60; i++) { try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 250)); } }
  for (const cfg of configs) {
    const q = new URLSearchParams({ renderer, quality, test: 'battle', id: battle, lv: '8' });
    if (cfg !== 'none') for (const [k, v] of new URLSearchParams(cfg)) q.set(k, v);
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    let backend = '?';
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { const b = /\[renderer\] backend=(\w+)/.exec(m.text()); if (b) backend = b[1]; });
    await page.goto(base + '?' + q);
    const t0 = Date.now();
    while (!(await page.evaluate(() => !document.getElementById('loading') && (document.getElementById('ui')?.innerText ?? '').includes('Begin Battle')))) {
      if (Date.now() - t0 > 120_000) throw new Error('deployment never opened for ' + cfg);
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(2500); // shader compiles and the first frames settle
    const r = await page.evaluate(async (ms) => {
      const w = window;
      const f0 = w.__frames, t0 = performance.now();
      const cam = w.__game?.stage?.cam;
      await new Promise((done) => {
        const step = () => { cam?.orbitFree(0.01, 0); if (performance.now() - t0 < ms) requestAnimationFrame(step); else done(); };
        requestAnimationFrame(step);
      });
      const frames = w.__frames - f0, dt = performance.now() - t0;
      return { frames, ms: dt / Math.max(1, frames) };
    }, seconds * 1000);
    results.push({ config: cfg, msPerFrame: +r.ms.toFixed(1), fps: +(1000 / r.ms).toFixed(1), errors, backend });
    await page.close();
  }
} finally {
  await browser.close();
  try { process.kill(-server.pid); } catch { server.kill(); }
}
const ref = results[0]?.msPerFrame ?? 1;
console.log(`quality ${quality}, renderer ${renderer}${webgpu ? ' (webgpu flags)' : ''}, ${battle}, ${seconds}s each`);
for (const r of results) console.log(`${r.config.padEnd(40)} ${r.backend.padEnd(7)} ${String(r.msPerFrame).padStart(7)} ms  ${String(r.fps).padStart(5)} fps  ${r === results[0] ? 'baseline' : `${r.msPerFrame >= ref ? '+' : ''}${(((r.msPerFrame - ref) / ref) * 100).toFixed(0)}%`}${r.errors.length ? '  ERRORS ' + r.errors.join(' | ') : ''}`);
const json = opt('json', '');
if (json) writeFileSync(json, JSON.stringify({ quality, renderer, battle, seconds, results }, null, 2));
