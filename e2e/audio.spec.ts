import { expect, test } from '@playwright/test';
import { gameUrl, press, waitForUiText, watchErrors } from './helpers';

declare global {
  interface Window {
    audioProbe: { oscillators: number; buffers: number; meters: AnalyserNode[] };
  }
}

test('the original score and effects play through the production mixer after a gesture, with nothing downloaded', async ({ page }, info) => {
  const errors = watchErrors(page);
  const audioWarnings: string[] = [];
  const audioRequests: string[] = [];
  page.on('console', (message) => { if (message.text().startsWith('[audio]')) audioWarnings.push(message.text()); });
  page.on('request', (request) => { if (/\.(mp3|wav|ogg|m4a|aac|flac|opus)(?:\?|$)/.test(request.url())) audioRequests.push(request.url()); });
  // Count the real synthesis nodes the engine starts; do not change how they play.
  await page.addInitScript(() => {
    window.audioProbe = { oscillators: 0, buffers: 0, meters: [] };
    const osc = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) { window.audioProbe.oscillators++; return osc.apply(this, args); };
    const buf = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) { window.audioProbe.buffers++; return buf.apply(this, args); };
    const analyser = AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser = function () { const node = analyser.call(this); window.audioProbe.meters.push(node); return node; };
  });
  await page.goto(gameUrl(info, { quality: 'low' }));
  await waitForUiText(page, 'New Game');
  // the first gesture unlocks the context, and the title theme starts
  await press(page, '.title-menu .item:has-text("Options")', info);
  await waitForUiText(page, 'Music volume');
  await expect.poll(() => page.evaluate(() => window.audioProbe.oscillators + window.audioProbe.buffers), { timeout: 20_000 }).toBeGreaterThan(10);
  // something actually reaches the speakers
  await expect.poll(() => page.evaluate(() => {
    const m = window.audioProbe.meters[0];
    if (!m) return 0;
    const d = new Float32Array(m.fftSize);
    m.getFloatTimeDomainData(d);
    return d.reduce((p, v) => Math.max(p, Math.abs(v)), 0);
  }), { timeout: 20_000 }).toBeGreaterThan(0.001);
  // menu sounds play as rendered buffers
  const before = await page.evaluate(() => window.audioProbe.buffers);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => window.audioProbe.buffers)).toBeGreaterThan(before);
  expect(audioRequests, 'no audio files are downloaded').toEqual([]);
  expect(audioWarnings).toEqual([]);
  errors.assertClean();
});
