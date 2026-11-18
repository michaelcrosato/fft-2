#!/usr/bin/env node
// The three screenshots 52in1 shows for the game (AI Hub Catalogue v1, *Covers*): 640 × 480 baseline
// JPEGs at quality 58, from a 960 × 720 window at a device scale factor of 2/3.
//   0.jpg  the title screen
//   1.jpg  a battle: a unit's turn, its move range on the field
//   2.jpg  the story: a scene with a character speaking
// Usage: npm run build && node tools/covers.mjs [--quality high]   → tools/out/covers/
// Look at each frame before handing it in.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'tools', 'out', 'covers');
const argv = process.argv.slice(2);
const quality = argv.includes('--quality') ? argv[argv.indexOf('--quality') + 1] : 'high';

if (!existsSync(path.join(DIST, 'index.html'))) { console.error('✗ no dist/index.html: run npm run build first'); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const file = path.join(DIST, decodeURIComponent(url.pathname) === '/' ? 'index.html' : decodeURIComponent(url.pathname));
  if (!path.relative(DIST, file).startsWith('..') && existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else res.writeHead(404).end();
});
// localhost: the game's test routes (?test=battle) open a battle straight away
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function page(query) {
  const p = await browser.newPage({ viewport: { width: 960, height: 720 }, deviceScaleFactor: 2 / 3 });
  p.on('pageerror', (e) => console.warn('  page error:', e.message));
  await p.goto(`${origin}/?renderer=webgl2&quality=${quality}&${query}`);
  return p;
}
const shot = async (p, name) => { await p.screenshot({ path: path.join(OUT, name), type: 'jpeg', quality: 58 }); console.log(`✓ ${path.relative(ROOT, path.join(OUT, name))}`); };
const settle = (p, ms = 2500) => p.waitForTimeout(ms);
const gone = (p) => p.locator('#loading').waitFor({ state: 'detached', timeout: 180_000 });
/** Past deployment and the opening scene, to the company's first turn. */
async function firstTurn(p) {
  const begin = p.locator('.menu .item:has-text("Begin Battle")').first();
  await begin.waitFor({ timeout: 180_000 });
  await settle(p, 800);
  await begin.click();
  for (let i = 0; i < 240; i++) {
    const skip = p.locator('.skipbtn');
    if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 5000 }).catch(() => {});
    const text = await p.evaluate(() => document.getElementById('ui')?.innerText ?? '');
    if (text.includes('Move') && text.includes('Act') && text.includes('Wait')) return;
    await p.waitForTimeout(1000);
  }
  throw new Error('no first turn');
}

try {
  // 0: the title, the world turning behind the logo
  {
    const p = await page('');
    await p.locator('.title-menu').waitFor({ timeout: 180_000 });
    await gone(p);
    await settle(p, 4000);
    await shot(p, '0.jpg');
    await p.close();
  }
  // 1: a battle in the canal market: the first unit's move range
  {
    const p = await page('test=battle&id=b_galwyn&lv=6');
    await firstTurn(p);
    const move = p.locator('#ui .item:has-text("Move")').first();
    await move.waitFor({ timeout: 180_000 });
    await settle(p, 1500);
    await move.click();
    await settle(p, 2500);
    await shot(p, '1.jpg');
    await p.close();
  }
  // 2: the story: a scene on the plains, a character speaking
  {
    const p = await page('test=scene&id=sc_mandrel_pre');
    const box = p.locator('.dialogue').first();
    await box.waitFor({ timeout: 180_000 });
    await settle(p, 4500);
    await shot(p, '2.jpg');
    await p.close();
  }
} finally {
  await browser.close();
  server.close();
}
