// Shared helpers for the end-to-end specs.
import { expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Headless Chromium's software WebGPU (SwiftShader) loses its device on many machines,
 * so Chromium runs the WebGL 2 path unless E2E_RENDERER says otherwise (e.g. on a real GPU).
 * Firefox and WebKit pick their backend on their own, as players' browsers do.
 */
export function gameUrl(info: TestInfo, params: Record<string, string | number> = {}): string {
  const q = new URLSearchParams();
  // Optional fast regression pass after the default-quality graphics sweep.
  // Omit E2E_QUALITY to exercise each device's normal quality selection.
  if (process.env.E2E_QUALITY) q.set('quality', process.env.E2E_QUALITY);
  const forced = process.env.E2E_RENDERER;
  if (forced) q.set('renderer', forced);
  else if (info.project.use.browserName === 'chromium' || info.project.use.defaultBrowserType === 'chromium') q.set('renderer', 'webgl2');
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  const s = q.toString();
  return s ? '?' + s : './';
}

/** browser noise that says nothing about the game */
const NOISE = [
  /GL Driver Message/i, /GPU stall due to ReadPixels/i, /PCFSoftShadowMap has been removed/i, /powerPreference option is currently ignored/i,
  /Depth texture comparison requests/i, /was preloaded using link preload but not used/i, /WebGL warning/i, /Automatic fallback to software WebGL/i,
];

/** collect page errors and console errors; call `assertClean()` at the end of a test */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (NOISE.some((r) => r.test(t))) return;
    errors.push('console.error: ' + t.slice(0, 300));
  });
  return {
    errors,
    assertClean() { expect(errors, errors.join('\n')).toEqual([]); },
  };
}

export const uiText = (page: Page) => page.evaluate(() => document.getElementById('ui')?.innerText ?? '');

/** wait until the #ui overlay shows some text */
export async function waitForUiText(page: Page, text: string | RegExp, timeout = 90_000) {
  await expect.poll(async () => { const t = await uiText(page); return typeof text === 'string' ? t.includes(text) : text.test(t); }, { timeout, intervals: [250, 500, 1000] }).toBe(true);
}

/** the game's frame counter (window.__frames) is advancing */
export async function expectRendering(page: Page) {
  const f0 = await page.evaluate(() => (window as any).__frames ?? 0);
  await expect.poll(() => page.evaluate(() => (window as any).__frames ?? 0), { timeout: 30_000 }).toBeGreaterThan(f0 + 2);
  expect(await page.evaluate(() => (window as any).__error ?? null)).toBeNull();
}

/** a click on desktop, a tap on touch profiles */
export async function press(page: Page, selector: string, info: TestInfo) {
  const loc = page.locator(selector).first();
  if (info.project.use.hasTouch) await loc.tap(); else await loc.click();
}

/** the page never scrolls sideways */
export async function expectNoHorizontalOverflow(page: Page) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(r.sw, `document is ${r.sw}px wide in a ${r.iw}px viewport`).toBeLessThanOrEqual(r.iw + 1);
}

/** element's box lies inside the viewport */
export async function expectInViewport(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} has no box`).not.toBeNull();
  const vp = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);
}

/** boxes of two elements don't overlap */
export async function expectNoOverlap(page: Page, a: string, b: string) {
  const [ba, bb] = await Promise.all([page.locator(a).first().boundingBox(), page.locator(b).first().boundingBox()]);
  if (!ba || !bb) return;
  const overlap = ba.x < bb.x + bb.width && bb.x < ba.x + ba.width && ba.y < bb.y + bb.height && bb.y < ba.y + ba.height;
  expect(overlap, `${a} ${JSON.stringify(ba)} overlaps ${b} ${JSON.stringify(bb)}`).toBe(false);
}

/**
 * Install a fake standard-mapping gamepad before the page loads. Drive it with
 * `pad.tap(i)` (one clean press), `pad.hold(i, v)`, `pad.axis(i, v)` from the test.
 */
export async function installFakeGamepad(page: Page) {
  await page.addInitScript(() => {
    const pad = {
      id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    (window as any).__pad = pad;
    // taps: pressed for exactly one poll of the game, released on the next (2 → pressed, 1 → released, 0 → done)
    const taps: Record<number, number> = {};
    (window as any).__taps = taps;
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => {
        for (const k of Object.keys(taps)) {
          const i = Number(k);
          if (taps[i] === 2) { pad.buttons[i].pressed = true; pad.buttons[i].value = 1; taps[i] = 1; }
          else if (taps[i] === 1) { pad.buttons[i].pressed = false; pad.buttons[i].value = 0; taps[i] = 0; }
        }
        return [pad, null, null, null];
      },
    });
  });
  const set = (fn: string) => page.evaluate(fn);
  return {
    /** one clean press + release as seen by the game's poll loop, however slowly the page runs */
    async tap(i: number) {
      await set(`window.__taps[${i}] = 2;`);
      await expect.poll(() => page.evaluate((k) => (window as any).__taps[k], i), { timeout: 30_000 }).toBe(0);
    },
    /** hold a button until `check` passes (the page may be too busy to poll in a fixed window), then release */
    async pressUntil(i: number, check: () => Promise<boolean>, timeout = 30_000) {
      await set(`window.__pad.buttons[${i}].pressed = true; window.__pad.buttons[${i}].value = 1;`);
      const t0 = Date.now();
      while (!(await check()) && Date.now() - t0 < timeout) await page.waitForTimeout(100);
      await set(`window.__pad.buttons[${i}].pressed = false; window.__pad.buttons[${i}].value = 0;`);
      await page.waitForTimeout(1200); // let the release be seen before the next press
    },
    async hold(i: number, value = 1) { await set(`window.__pad.buttons[${i}].pressed = ${value > 0.5}; window.__pad.buttons[${i}].value = ${value};`); },
    async axis(i: number, v: number) { await set(`window.__pad.axes[${i}] = ${v};`); },
  };
}

/** the battle camera's current state (localhost debug hook window.__game) */
export const camState = (page: Page) => page.evaluate(() => {
  const c = (window as any).__game?.stage?.cam;
  return c ? { yaw: c.yaw as number, pitch: c.pitch as number, dist: c.dist as number, x: c.target.x as number, z: c.target.z as number } : null;
});
