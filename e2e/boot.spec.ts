// Boot, title screen and the start of a new game, in every browser/device project.
import { test, expect } from '@playwright/test';
import { gameUrl, watchErrors, waitForUiText, expectRendering, press, expectNoHorizontalOverflow, expectInViewport, installFakeGamepad } from './helpers';

test('boots to the title menu and renders', async ({ page }, info) => {
  const w = watchErrors(page);
  const backend = new Promise<string>((resolve) => page.on('console', (m) => { const r = /\[renderer\] backend=(\w+)/.exec(m.text()); if (r) resolve(r[1]); }));
  await page.goto(gameUrl(info));
  await waitForUiText(page, 'New Game');
  await expectRendering(page);
  const be = await backend;
  expect(['webgpu', 'webgl2', 'webgl1']).toContain(be);
  info.annotations.push({ type: 'renderer', description: be });
  await expectNoHorizontalOverflow(page);
  await expectInViewport(page, '.title-menu');
  await page.screenshot({ path: info.outputPath('title.png') });
  w.assertClean();
});

test('new game: the name field takes game keys as letters, then the story begins', async ({ page }, info) => {
  const w = watchErrors(page);
  await page.goto(gameUrl(info));
  await waitForUiText(page, 'New Game');
  await press(page, '.title-menu .item:has-text("New Game")', info);
  const name = page.locator('input:not([type=checkbox])').first();
  await expect(name).toBeVisible();
  await name.fill('');
  // Z, X, WASD and Space are game keys, but not while typing a name
  await name.pressSequentially('Zed Wax');
  await expect(page.getByText('Name your hero')).toBeVisible();
  await expect(name).toHaveValue('Zed Wax');
  await expectInViewport(page, '.btn:has-text("Begin the Tale")');
  await press(page, '.btn:has-text("Begin the Tale")', info);
  await expect(page.getByRole('dialog', { name: 'Fullscreen Game Mode?' })).toBeVisible();
  await expectInViewport(page, '.game-mode-prompt');
  await press(page, '.game-mode-prompt .btn:has-text("Play in Browser")', info);
  // the prologue opens with narration, a title card or dialogue
  await expect(page.locator('.narration, .titlecard, .dialogue').first()).toBeVisible({ timeout: 90_000 });
  w.assertClean();
});

test('gamepad drives the menus', async ({ page }, info) => {
  const w = watchErrors(page);
  const pad = await installFakeGamepad(page);
  await page.goto(gameUrl(info));
  await waitForUiText(page, 'New Game');
  const sel = () => page.locator('.title-menu .item.sel').textContent().catch(() => '');
  await expect(page.locator('.title-menu .item.sel')).toHaveText(/New Game/);
  // d-pad down twice (Load Game is disabled without saves, but can be highlighted)
  await pad.tap(13);
  await expect(page.locator('.title-menu .item.sel')).toHaveText(/Load Game/);
  await pad.tap(13);
  await expect(page.locator('.title-menu .item.sel')).toHaveText(/Options/);
  await pad.tap(0); // A
  await waitForUiText(page, 'Music volume');
  await pad.tap(1); // B backs out
  await expect(page.locator('.title-menu')).toBeVisible();
  // the left stick works like the d-pad
  await pad.axis(1, -1);
  await expect.poll(async () => /Options/.test((await sel()) ?? ''), { timeout: 30_000 }).toBe(false);
  await pad.axis(1, 0);
  w.assertClean();
});

test('after a scene fades in, taps and clicks still reach the 3D view', async ({ page }, info) => {
  const w = watchErrors(page);
  await page.goto(gameUrl(info, { test: 'scene', id: 'sc_pro_alazar', quality: 'low' }));
  await expect(page.locator('.dialogue, .narration').first()).toBeVisible({ timeout: 90_000 });
  const vp = page.viewportSize()!;
  // the fade layer stays in the DOM after fading; it must not catch pointer input
  const top = await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y) as HTMLElement | null; return el?.id || el?.className || el?.tagName; }, [vp.width / 2, vp.height * 0.3]);
  expect(await page.locator('.fade').count()).toBeGreaterThan(0);
  expect(top === 'gl' || /narration/.test(String(top)), `topmost element was ${top}`).toBe(true);
  w.assertClean();
});
