// Menus on every device: backing out with ✕, cancelling dialogs, phone layouts, gamepad-only forms.
import { test, expect } from '@playwright/test';
import { gameUrl, watchErrors, waitForUiText, uiText, press, expectInViewport, expectNoOverlap, installFakeGamepad } from './helpers';

/**
 * Choose a menu row. On touch, info lists (with a detail panel) select on the first tap and choose on
 * the second — unless the row was already highlighted, when one tap chooses. `opened` tells them apart.
 */
async function choose(row: import('@playwright/test').Locator, opened: () => Promise<boolean>, info: import('@playwright/test').TestInfo) {
  if (!info.project.use.hasTouch) { await row.click(); return; }
  await row.tap();
  await row.page().waitForTimeout(400);
  if (!(await opened())) await row.tap();
}

test('shop: the quantity dialog cancels and ✕ backs out of every level', async ({ page }, info) => {
  const w = watchErrors(page);
  await page.goto(gameUrl(info, { test: 'town', open: 'shop', node: 'galwyn', quality: 'low' }));
  await waitForUiText(page, 'Outfitter');
  const gil = () => page.evaluate(() => (window as any).__game.state.gil as number);
  const g0 = await gil();
  await press(page, '.menu .item:has-text("Buy")', info);
  await waitForUiText(page, 'Weapons');
  await press(page, '.menu .item:has-text("Weapons")', info);
  // first affordable weapon → quantity dialog
  const item = page.locator('.menu .item:not(.disabled)').first();
  await expect(item).toBeVisible();
  const cancel = page.locator('.btn:has-text("Cancel")');
  await choose(item, () => cancel.isVisible(), info);
  await expect(cancel).toBeVisible();
  await expectInViewport(page, '.btn:has-text("Cancel")');
  await press(page, '.btn:has-text("Cancel")', info);
  await expect(page.locator('.btn:has-text("Cancel")')).toHaveCount(0);
  expect(await gil()).toBe(g0);
  // ✕ closes the item list, then the category list, then the shop
  for (const title of ['Weapons', 'Buy', 'Outfitter']) {
    await expect(page.locator('.menu .title-plate', { hasText: title }).last()).toBeVisible();
    await press(page, '.menu .mclose', info);
  }
  await expect.poll(async () => (await page.locator('.menu').count())).toBe(0);
  w.assertClean();
});

test('formation: the party list stays usable and panels never cover it', async ({ page }, info) => {
  const w = watchErrors(page);
  await page.goto(gameUrl(info, { test: 'formation', quality: 'low' }));
  await waitForUiText(page, /party/i); // (title plates are upper-cased by CSS, and innerText follows it)
  const first = page.locator('.menu .item').first();
  await expect(first).toBeVisible();
  await choose(first, async () => (await uiText(page)).includes('Change Job'), info);
  await waitForUiText(page, 'Change Job');
  await expectInViewport(page, '.menu');
  await expectNoOverlap(page, '.menu', '.panel.detail');
  await press(page, '.menu .mclose', info);
  await waitForUiText(page, /party/i);
  await expect(page.locator('.menu .title-plate', { hasText: 'Party' })).toBeVisible();
  w.assertClean();
});

test('new game with only a gamepad: birthday, gentle mode, begin', async ({ page }, info) => {
  test.skip(!!info.project.use.hasTouch, 'desktop pad');
  const w = watchErrors(page);
  const pad = await installFakeGamepad(page);
  await page.goto(gameUrl(info, { quality: 'low' }));
  await waitForUiText(page, 'New Game');
  await pad.tap(0); // A on New Game
  await waitForUiText(page, 'Name your hero');
  const month = page.locator('select').first(), gentle = page.locator('input[type=checkbox]');
  await pad.tap(13); // ↓ to the month
  await pad.tap(15); await pad.tap(15); // → → March
  await expect(month).toHaveValue('3');
  await pad.tap(13); await pad.tap(13); // ↓ day, ↓ gentle
  await pad.tap(0); // A ticks the box
  await expect(gentle).toBeChecked();
  await pad.tap(13); // ↓ Begin the Tale
  await pad.tap(0);
  await expect(page.locator('.narration, .titlecard, .dialogue').first()).toBeVisible({ timeout: 90_000 });
  expect(await page.evaluate(() => (window as any).__game.options.gentle)).toBe(true);
  expect(await uiText(page)).not.toContain('Name your hero');
  w.assertClean();
});
