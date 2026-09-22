// Screenshot helper: node tools/shot.mjs <url> <out.png> [waitFrames=60] [backendFlags=webgpu|webgl]
import { chromium } from 'playwright';
const [url, out, waitFrames = '40', w = '1280', h = '720'] = process.argv.slice(2);
const b = await chromium.launch({ headless: true, channel: process.env.CH || undefined, args: ['--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || m.text().startsWith('[')) logs.push(`${m.type()}: ${m.text()}`.slice(0, 400)); });
p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await p.goto(url, { waitUntil: 'load', timeout: 120000 });
const t0 = Date.now();
while (Date.now() - t0 < 240000) {
  const st = await p.evaluate(() => ({ f: window.__frames ?? 0, e: window.__error ?? null }));
  if (st.e) { logs.push('ERR ' + st.e); break; }
  if (st.f >= +waitFrames) break;
  await p.waitForTimeout(500);
}
await p.screenshot({ path: out });
console.log(logs.slice(0, 40).join('\n'));
console.log('frames', await p.evaluate(() => window.__frames ?? 0), 'time', ((Date.now() - t0) / 1000).toFixed(1) + 's');
await b.close();
