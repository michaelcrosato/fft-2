#!/usr/bin/env node
// Plays 52in1's session harness against the built game, the way 52in1 checks a game when it
// joins: parallel and moments at 1 and 2 players on a poor network, a player leaving, any shared
// world at 2 players and with a server copy, then the game opened outside a session.
// Usage: node tools/hub/run-harness.mjs [GAME_DIR=dist] [--only parallel|moments|shared-world|outside]
//                                       [--players 1,2] [--quality low] [--headed]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};
const positional = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
const gameDir = path.resolve(ROOT, positional[0] ?? 'dist');
const only = flag('--only', null);
const playerCounts = (flag('--players', '1,2') ?? '1,2').split(',').map(Number);
const quality = flag('--quality', process.env.HUB_QUALITY ?? 'low');
const headed = argv.includes('--headed');
const POOR = '&latency=150&jitter=50&loss=5&auto=1';

if (!existsSync(path.join(gameDir, 'index.html'))) {
  console.error(`✗ no ${path.relative(ROOT, gameDir)}/index.html: build the game first (npm run build)`);
  process.exit(1);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.wasm': 'application/wasm' };
/** The harness and its modules at the root, the game under /game/: one origin, as the harness needs. */
function serve() {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    let base = null, file = null;
    if (url.pathname.startsWith('/game/')) { base = gameDir; file = path.join(gameDir, decodeURIComponent(url.pathname.slice(6)) || 'index.html'); }
    else if (['/harness.html', '/bridge.js', '/round.js', '/session.js'].includes(url.pathname)) { base = HERE; file = path.join(HERE, url.pathname.slice(1)); }
    const inside = base && file && !path.relative(base, file).startsWith('..') && !path.isAbsolute(path.relative(base, file));
    if (inside && existsSync(file) && statSync(file).isFile()) {
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(readFileSync(file));
    } else {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** The online modes the page names (hub:multiplayer, else hub:session-mode). */
function onlineModes() {
  const html = readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  const meta = (name) => html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1] ?? null;
  if (meta('hub:session') !== '1') return [];
  const named = (meta('hub:multiplayer') ?? '').split(',').map((s) => s.trim().split(/\s+/)).filter((w) => ['parallel', 'ghost', 'shared-world', 'moments'].includes(w[0]));
  const modes = named.map(([where, how]) => ({ where, how: ['co-op', 'versus', 'other'].includes(how) ? how : null }));
  if (!modes.length && meta('hub:session-mode')) modes.push({ where: meta('hub:session-mode'), how: null });
  return modes;
}

function scenarios() {
  const out = [];
  for (const m of onlineModes()) {
    if (only && only !== m.where) continue;
    const pick = `&mode=${m.where}${m.how ? `&how=${m.how}` : ''}`;
    const counts = m.where === 'parallel' || m.where === 'moments' || m.where === 'ghost' ? playerCounts : [2];
    for (const n of counts) out.push({ name: `${m.where}${m.how ? ' ' + m.how : ''} · ${n} player${n > 1 ? 's' : ''}`, query: `players=${n}${pick}${POOR}` });
    if (m.where !== 'moments') out.push({ name: `${m.where}${m.how ? ' ' + m.how : ''} · host leaves`, query: `players=2${pick}${POOR}&scenario=host-leave` });
    if (m.where === 'shared-world') out.push({ name: `${m.where}${m.how ? ' ' + m.how : ''} · server copy`, query: `players=2${pick}${POOR}&scenario=server` });
  }
  return out;
}

async function harness(browser, origin, sc) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const game = encodeURIComponent(`game/index.html?quality=${quality}`);
  const t0 = Date.now();
  try {
    await page.goto(`${origin}/harness.html?game=${game}&${sc.query}`);
    await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 300_000, polling: 500 });
    const report = await page.evaluate(() => {
      const r = window.__hubCheck;
      return { pass: !!r?.pass, checks: (r?.checks ?? []).map((c) => ({ name: c.name, pass: c.pass, detail: c.detail })), log: (r?.log ?? []).slice(-40) };
    });
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`${report.pass ? '✓' : '✗'} ${sc.name} (${secs} s)`);
    for (const c of report.checks) if (!c.pass) console.log(`    ✗ ${c.name}${c.detail ? `: ${c.detail}` : ''}`);
    if (!report.pass) console.log(report.log.map((l) => `      ${l}`).join('\n'));
    return report.pass;
  } catch (e) {
    console.log(`✗ ${sc.name}: ${e.message.split('\n')[0]}`);
    return false;
  } finally {
    await page.close();
  }
}

/** Outside a session the game still boots to its title, with nothing in the console as an error. */
async function outside(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(`${origin}/game/index.html?quality=${quality}`);
    await page.waitForFunction(() => !!document.querySelector('.title-menu') || !!window.__error, null, { timeout: 120_000 });
    const failed = await page.evaluate(() => window.__error ?? null);
    const ok = !failed && !errors.length;
    console.log(`${ok ? '✓' : '✗'} outside a session: boots to the title${ok ? '' : ` — ${failed ?? errors.slice(0, 3).join(' | ')}`}`);
    return ok;
  } catch (e) {
    console.log(`✗ outside a session: ${e.message.split('\n')[0]}`);
    return false;
  } finally {
    await page.close();
  }
}

const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: !headed });
let pass = true;
try {
  const list = scenarios();
  if (!list.length && only !== 'outside') console.log('! the page names no online mode (hub:session 1 and hub:multiplayer): no rounds to play');
  for (const sc of list) pass = (await harness(browser, origin, sc)) && pass;
  if (!only || only === 'outside') pass = (await outside(browser, origin)) && pass;
} finally {
  await browser.close();
  server.close();
}
console.log(pass ? 'harness: PASS' : 'harness: FAIL');
process.exit(pass ? 0 : 1);
