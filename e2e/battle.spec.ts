// Battle camera, gamepad and HUD layout checks on the first story battle.
import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { gameUrl, watchErrors, waitForUiText, uiText, press, expectNoHorizontalOverflow, expectInViewport, expectNoOverlap, installFakeGamepad, camState } from './helpers';

const BATTLE = { test: 'battle', id: 'b_galwyn', lv: 8 };
// headless browsers render in software: keep the scene light and the battle quick
const FAST = { ...BATTLE, quality: 'low' };

async function openDeployment(page: Page, info: TestInfo) {
  await page.goto(gameUrl(info, BATTLE));
  await waitForUiText(page, 'Begin Battle');
  await expect(page.locator('.camctl .cb')).toHaveCount(6);
}

const yawDelta = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

test('deployment: camera buttons are on screen and move the camera', async ({ page }, info) => {
  const w = watchErrors(page);
  await openDeployment(page, info);
  await expectInViewport(page, '.camctl');
  await expectNoOverlap(page, '.camctl', '.menu');
  await expectNoHorizontalOverflow(page);
  const c0 = (await camState(page))!;
  await press(page, '.camctl .cb[aria-label="Rotate right"]', info);
  await expect.poll(async () => yawDelta((await camState(page))!.yaw, c0.yaw)).toBeGreaterThan(1.2);
  await press(page, '.camctl .cb[aria-label="Tilt view"]', info);
  await expect.poll(async () => (await camState(page))!.pitch).toBeGreaterThan(c0.pitch + 0.2);
  // hold zoom-in
  const zin = page.locator('.camctl .cb[aria-label="Zoom in"]');
  await zin.dispatchEvent('pointerdown');
  await page.waitForTimeout(900);
  await zin.dispatchEvent('pointerup');
  await expect.poll(async () => (await camState(page))!.dist).toBeLessThan(c0.dist * 0.9);
  const c1 = (await camState(page))!;
  await press(page, '.camctl .cb[aria-label="Recenter"]', info);
  await expect.poll(async () => (await camState(page))!.dist).toBeGreaterThan(c1.dist * 1.05);
  await page.screenshot({ path: info.outputPath('deploy.png') });
  w.assertClean();
});

test('mouse: wheel zooms, right-drag pans, drag orbits', async ({ page }, info) => {
  test.skip(!!info.project.use.hasTouch, 'mouse only');
  const w = watchErrors(page);
  await openDeployment(page, info);
  const vp = page.viewportSize()!;
  const cx = vp.width * 0.6, cy = vp.height * 0.45;
  const c0 = (await camState(page))!;
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -400);
  await expect.poll(async () => (await camState(page))!.dist).toBeLessThan(c0.dist * 0.8);
  const c1 = (await camState(page))!;
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(cx - 120, cy - 60, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(async () => { const c = (await camState(page))!; return Math.hypot(c.x - c1.x, c.z - c1.z); }).toBeGreaterThan(1);
  // the deployment menu is still open: a right-drag is not "back"
  expect(await uiText(page)).toContain('Begin Battle');
  const c2 = (await camState(page))!;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 150, cy, { steps: 10 });
  await page.mouse.up();
  // settles on the nearest 45° diagonal, a quarter turn away
  await expect.poll(async () => yawDelta((await camState(page))!.yaw, c2.yaw)).toBeGreaterThan(1.2);
  w.assertClean();
});

test('gamepad: right stick orbits, triggers zoom, bumpers rotate', async ({ page }, info) => {
  const w = watchErrors(page);
  const pad = await installFakeGamepad(page);
  await openDeployment(page, info);
  const c0 = (await camState(page))!;
  await pad.hold(7, 1); // RT
  await expect.poll(async () => (await camState(page))!.dist, { timeout: 20_000 }).toBeLessThan(c0.dist * 0.85);
  await pad.hold(7, 0);
  await pad.axis(3, -1); // right stick up: lower, more horizontal view
  await expect.poll(async () => (await camState(page))!.pitch, { timeout: 20_000 }).toBeLessThan(c0.pitch - 0.1);
  await pad.axis(3, 0);
  const c1 = (await camState(page))!;
  await pad.axis(2, 1); // right stick right
  await expect.poll(async () => yawDelta((await camState(page))!.yaw, c1.yaw), { timeout: 20_000 }).toBeGreaterThan(0.3);
  await pad.axis(2, 0);
  // wait until the orbit has settled on its diagonal before measuring a 90° step
  let prev = NaN;
  await expect.poll(async () => { const y = (await camState(page))!.yaw; const still = Math.abs(y - prev) < 0.003; prev = y; return still; }, { timeout: 30_000, intervals: [400] }).toBe(true);
  const c2 = (await camState(page))!;
  await pad.tap(4); // LB
  await expect.poll(async () => yawDelta((await camState(page))!.yaw, c2.yaw), { timeout: 20_000 }).toBeGreaterThan(1.2);
  // A still works in the deployment menu (Begin Battle is preselected)
  await pad.tap(0);
  await expect.poll(async () => (await uiText(page)).includes('Begin Battle'), { timeout: 30_000 }).toBe(false);
  w.assertClean();
});

test('reaches the first player turn with a usable HUD', async ({ page }, info) => {
  const w = watchErrors(page);
  await page.addInitScript(() => { try { localStorage.setItem('fft-fealty-options', JSON.stringify({ battleSpeed: 2, textSpeed: 2.5 })); } catch { /* private mode */ } });
  await page.goto(gameUrl(info, FAST));
  await waitForUiText(page, 'Begin Battle');
  await press(page, '.menu .item:has-text("Begin Battle")', info);
  // skip the opening scene; wait for our first turn (enemies may act first)
  await expect.poll(async () => {
    const skip = page.locator('.btn.ghost:has-text("Skip")');
    if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 2000 }).catch(() => {});
    const t = await uiText(page);
    return t.includes('Move') && t.includes('Act') && t.includes('Wait');
  }, { timeout: 150_000, intervals: [1000] }).toBe(true);
  await expect(page.locator('.camctl')).toBeVisible();
  await expectInViewport(page, '.camctl');
  await expectInViewport(page, '.menu');
  await expectNoOverlap(page, '.camctl', '.menu');
  await expectNoOverlap(page, '.camctl', '.unitcard');
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: info.outputPath('turn.png') });
  w.assertClean();
});
