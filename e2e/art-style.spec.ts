// Options → Art Style (docs/PLAN-ART-STYLES.md): the page's rows and steps by keyboard and touch, values
// kept across a reload, Reset, the list box roles, and today's pipeline while no style is set.
import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { gameUrl, watchErrors, waitForUiText, expectNoHorizontalOverflow, press } from './helpers';

/** a battle's deployment with the Art Style page open over it (the ?test=artstyle route) */
async function openPage(page: Page, info: TestInfo, params: Record<string, string> = {}) {
  await page.goto(gameUrl(info, { quality: 'low', test: 'artstyle', ...params }));
  await waitForUiText(page, 'Begin Battle');
  await page.evaluate(() => { (window as any).__artStyle = (window as any).__openArtStyle(); });
  await expect(page.locator('.art-style [role=listbox]')).toHaveCount(1);
}

const row = (page: Page, label: string) => page.locator('.art-style [role=option]', { hasText: label }).first();
const value = (page: Page, label: string) => row(page, label).locator('.r');

/** focus a row with the arrow keys */
async function focusRow(page: Page, label: string) {
  for (let i = 0; i < 16; i++) {
    if (await row(page, label).getAttribute('aria-selected') === 'true') return;
    await page.keyboard.press('ArrowDown');
  }
  throw new Error('row not reached: ' + label);
}

test('rows step by keyboard, persist across a reload, and Reset restores them', async ({ page }, info) => {
  test.skip(!!info.project.use.hasTouch, 'keyboard');
  const w = watchErrors(page);
  await openPage(page, info);
  await expect(page.locator('.art-style [role=option][aria-selected=true]')).toContainText('Same style everywhere');
  await expect(value(page, 'Same style everywhere')).toHaveText('On');
  await page.keyboard.press('Enter');
  await expect(value(page, 'Same style everywhere')).toHaveText('Off');
  await expect(row(page, 'Characters & objects')).toBeVisible();
  // left and right step the focused row without leaving the list
  await focusRow(page, 'Lamps');
  await page.keyboard.press('ArrowRight');
  await expect(value(page, 'Lamps')).toHaveText('Off');
  await page.keyboard.press('ArrowRight');
  await expect(value(page, 'Lamps')).toHaveText('2');
  await focusRow(page, 'Light sources');
  await page.keyboard.press('ArrowLeft');
  await expect(value(page, 'Light sources')).toHaveText('3: sun, rim and front fill');
  // the list box speaks the focused row
  await expect(page.locator('.sr-only[aria-live=polite]')).toContainText('Light sources');
  // stored: a reload opens the page as it was left
  await page.reload();
  await waitForUiText(page, 'Begin Battle');
  await page.evaluate(() => { (window as any).__artStyle = (window as any).__openArtStyle(); });
  await expect(value(page, 'Same style everywhere')).toHaveText('Off');
  await expect(value(page, 'Lamps')).toHaveText('2');
  await expect(value(page, 'Light sources')).toHaveText('3: sun, rim and front fill');
  await focusRow(page, 'Reset to defaults');
  await page.keyboard.press('Enter');
  await expect(value(page, 'Same style everywhere')).toHaveText('On');
  await expect(value(page, 'Lamps')).toHaveText(/^Auto/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fft-fealty-options') ?? '{}'));
  expect(stored).toMatchObject({ styleLinked: true, styleEnv: 'none', lights: 'auto', lamps: 'auto' });
  w.assertClean();
});

test('a tap steps a row, and the page fits the screen', async ({ page }, info) => {
  const w = watchErrors(page);
  await openPage(page, info);
  await expectNoHorizontalOverflow(page);
  const box = await page.locator('.art-style .menu').boundingBox();
  const vp = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
  await press(page, '.art-style [role=option]:has-text("Outlines")', info);
  await expect(value(page, 'Outlines')).toHaveText('None');
  w.assertClean();
});

test('with no style the frame is drawn by today\'s pipeline', async ({ page }, info) => {
  const w = watchErrors(page);
  await page.goto(gameUrl(info, { quality: 'low', test: 'battle', id: 'b_galwyn', lv: 8 }));
  await waitForUiText(page, 'Begin Battle');
  expect(await page.evaluate(() => (window as any).__game?.stage?.post?.styleKey)).toBe('off');
  w.assertClean();
});

test('from the title: Options → Art Style previews over the world map, and Light sources change the rig', async ({ page }, info) => {
  const w = watchErrors(page);
  await page.goto(gameUrl(info, { quality: 'low' }));
  await waitForUiText(page, 'New Game');
  await press(page, '.title-menu .item:has-text("Options")', info);
  await press(page, '#ui .menu .item:has-text("Art Style")', info);
  await expect(page.locator('.art-style [role=listbox]')).toHaveCount(1);
  await expect(page.locator('html')).toHaveClass(/art-style-preview/);
  const rigCount = () => page.evaluate(() => (window as any).__world?.rig?.count);
  expect(await rigCount()).toBe(1); // the world map: the sun alone today
  await press(page, '.art-style [role=option]:has-text("Light sources")', info);
  await expect(value(page, 'Light sources')).toHaveText('1: sun');
  await press(page, '.art-style [role=option]:has-text("Light sources")', info);
  await expect(value(page, 'Light sources')).toHaveText('2: sun and rim');
  await expect.poll(rigCount).toBe(2);
  await expectNoHorizontalOverflow(page);
  w.assertClean();
});

test('in a battle: Menu → Options → Art Style shows the paused scene, and the rig follows the setting', async ({ page }, info) => {
  const w = watchErrors(page);
  await page.goto(gameUrl(info, { quality: 'low', test: 'battle', id: 'b_galwyn', lv: 8 }));
  await waitForUiText(page, 'Begin Battle');
  await press(page, '.game-menu-button', info);
  await expect(page.locator('html')).toHaveClass(/game-paused/);
  await press(page, '.game-menu-home .btn:has-text("Options")', info);
  await press(page, '.game-menu-shell .menu .item:has-text("Art Style")', info);
  await expect(page.locator('.game-menu-shell .art-style [role=listbox]')).toHaveCount(1);
  // the shell steps aside so the scene shows beside the panel
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.game-menu-shell')!).backgroundColor)).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  const rig = () => page.evaluate(() => (window as any).__game?.stage?.env?.rig?.count);
  expect(await rig()).toBe(2);
  const lights = '.game-menu-shell .art-style [role=option]:has-text("Light sources")';
  await press(page, lights, info);
  await expect.poll(rig).toBe(1);
  await press(page, lights, info);
  await press(page, lights, info);
  await expect.poll(rig).toBe(3);
  // leaving the page restores the menu's backdrop
  await press(page, '.game-menu-button', info);
  await expect(page.locator('html')).not.toHaveClass(/art-style-preview/);
  w.assertClean();
});

test('a style on one layer builds that layer\'s steps only, and the page shows it', async ({ page }, info) => {
  const w = watchErrors(page);
  const key = () => page.evaluate(() => (window as any).__game?.stage?.post?.styleKey as string);
  await page.goto(gameUrl(info, { quality: 'low', test: 'battle', id: 'b_galwyn', lv: 8, styleEnv: 'boldCel', styleActors: 'none' }));
  await waitForUiText(page, 'Begin Battle');
  expect(await key()).toContain('env:band,color,edges|actors:|');
  await page.goto(gameUrl(info, { quality: 'low', test: 'artstyle', styleEnv: 'none', styleActors: 'boldCel' }));
  await waitForUiText(page, 'Begin Battle');
  expect(await key()).toContain('env:|actors:band,color,edges|');
  await page.evaluate(() => { (window as any).__artStyle = (window as any).__openArtStyle(); });
  await expect(value(page, 'Characters & objects')).toHaveText('Bold Cel');
  await expect(value(page, 'Environment')).toHaveText('None');
  // linking the layers takes the environment's style for both
  await press(page, '.art-style [role=option]:has-text("Same style everywhere")', info);
  await expect.poll(key).toBe('off');
  w.assertClean();
});

