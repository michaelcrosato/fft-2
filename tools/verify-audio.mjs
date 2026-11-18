#!/usr/bin/env node
// Renders every music cue and sound effect through the real engine (an OfflineAudioContext in
// headless Chromium) and checks it: no clipping, sensible loudness, no DC offset, no click where a
// looped body starts again, and faster than real time. Writes tools/out/audio-verification/report.json.
// Usage: npm run audio:verify [-- --only battle1,hit] [--seconds 40] [--low]   (--low: the phones' lighter synthesis)
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools', 'out', 'audio-verification');
const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1].split(',') : null;
const maxSeconds = argv.includes('--seconds') ? Number(argv[argv.indexOf('--seconds') + 1]) : 45;
const low = argv.includes('--low');

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch();
const page = await browser.newPage();
const failures = [];
const report = { music: {}, sfx: {} };
try {
  await page.goto(`${url}audio-test.html`);
  await page.waitForFunction(() => typeof window.renderOffline === 'function' && !!window.audio, null, { timeout: 60_000 });
  const cues = await page.evaluate(() => ({ music: window.audio.trackIds, sfx: window.audio.sfxIds }));
  for (const kind of ['music', 'sfx']) {
    for (const id of cues[kind]) {
      if (only && !only.includes(id)) continue;
      const r = await page.evaluate(async ({ kind, id, maxSeconds, low }) => {
        const song = kind === 'music' ? window.audio.song(id) : null;
        const lead = window.OFFLINE_LEAD;
        const intro = lead + (song?.intro ? (song.intro.beats * 60) / (song.intro.bpm ?? song.bpm) : 0);
        const body = song ? (song.body.beats * 60) / (song.body.bpm ?? song.bpm) : 0;
        // a looping song renders past its first seam; a once-song renders whole
        const seconds = kind === 'music' ? Math.min(maxSeconds, song.once ? intro - lead + body + 3 : intro - lead + body + 4) : 0;
        const t0 = performance.now();
        const b = await window.renderOffline(kind, id, seconds, { sampleRate: 44100, low });
        const ms = performance.now() - t0;
        let peak = 0, sum = 0, dc = 0, n = 0, nan = 0;
        const jumps = [];
        for (let c = 0; c < b.numberOfChannels; c++) {
          const d = b.getChannelData(c);
          let worst = 0;
          for (let i = 0; i < d.length; i++) {
            const v = d[i];
            if (!Number.isFinite(v)) { nan++; continue; }
            const a = Math.abs(v);
            if (a > peak) peak = a;
            sum += v * v; dc += v; n++;
            if (i) worst = Math.max(worst, Math.abs(v - d[i - 1]));
          }
          jumps.push(worst);
        }
        // the seam: the largest sample-to-sample step within 10 ms of the body's restart, against the
        // same moment of the first pass (the same notes start there, without a click)
        let seam = null;
        if (song && !song.once && intro + body < lead + seconds) {
          const w = Math.round(0.01 * b.sampleRate);
          const stepNear = (t) => {
            const at = Math.round(t * b.sampleRate);
            let m = 0;
            for (let c = 0; c < b.numberOfChannels; c++) {
              const d = b.getChannelData(c);
              for (let i = Math.max(1, at - w); i < Math.min(d.length, at + w); i++) m = Math.max(m, Math.abs(d[i] - d[i - 1]));
            }
            return m;
          };
          seam = stepNear(intro + body) / Math.max(1e-4, stepNear(intro), Math.max(...jumps) * 0.05);
        }
        const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
        return { seconds: b.duration, renderMs: Math.round(ms), peakDb: db(peak), rmsDb: db(Math.sqrt(sum / Math.max(1, n))), dc: dc / Math.max(1, n), nan, seam };
      }, { kind, id, maxSeconds, low });
      report[kind][id] = r;
      const problems = [];
      if (r.nan) problems.push(`${r.nan} non-finite samples`);
      if (r.peakDb > -0.1) problems.push(`clips (peak ${r.peakDb.toFixed(2)} dBFS)`);
      if (kind === 'music' && (r.rmsDb < -34 || r.rmsDb > -12)) problems.push(`loudness ${r.rmsDb.toFixed(1)} dB RMS, outside −34…−12`);
      if (kind === 'sfx' && r.peakDb < -24) problems.push(`nearly silent (peak ${r.peakDb.toFixed(1)} dBFS)`);
      if (Math.abs(r.dc) > 0.01) problems.push(`DC offset ${r.dc.toFixed(4)}`);
      if (r.seam !== null && r.seam > 3) problems.push(`a click at the loop seam (${r.seam.toFixed(2)}× the first pass)`);
      if (kind === 'music' && r.renderMs > r.seconds * 1000 * 0.75) problems.push(`too slow to render: ${r.renderMs} ms for ${r.seconds.toFixed(1)} s`);
      const line = `${problems.length ? '✗' : '✓'} ${kind} ${id.padEnd(12)} ${r.seconds.toFixed(1).padStart(5)} s · peak ${r.peakDb.toFixed(1).padStart(6)} dB · rms ${r.rmsDb.toFixed(1).padStart(6)} dB · ${String(r.renderMs).padStart(5)} ms${r.seam !== null ? ` · seam ${r.seam.toFixed(2)}` : ''}`;
      console.log(problems.length ? `${line}\n    ${problems.join('; ')}` : line);
      if (problems.length) failures.push(`${kind} ${id}: ${problems.join('; ')}`);
    }
  }
} finally {
  await browser.close();
  await server.close();
}
mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ when: new Date().toISOString(), failures, ...report }, null, 2));
console.log(failures.length ? `\n${failures.length} cue(s) failed` : '\nall cues pass');
process.exit(failures.length ? 1 : 0);
