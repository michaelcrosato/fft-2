// Menus are list boxes whose row in focus is aria-selected and spoken through a polite live region.
import { test, expect } from '@playwright/test';
import { gameUrl, watchErrors, waitForUiText } from './helpers';

test('the title menu is a list box, and the row in focus is spoken', async ({ page }, info) => {
  const w = watchErrors(page);
  await page.goto(gameUrl(info, { quality: 'low' }));
  await waitForUiText(page, 'New Game');
  const box = page.locator('.title-menu [role=listbox]');
  await expect(box).toHaveCount(1);
  await expect(box.locator('[role=option][aria-selected=true]')).toContainText('New Game');
  await expect(page.locator('.sr-only[aria-live=polite]')).toContainText('New Game');
  await page.keyboard.press('ArrowDown');
  await expect(box.locator('[role=option][aria-selected=true]')).not.toContainText('New Game');
  await expect(page.locator('.sr-only[aria-live=polite]')).not.toContainText('New Game');
  w.assertClean();
});
