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
