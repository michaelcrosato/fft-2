// Hot-seat versus: the title's Versus entry, a field, the hand-over screen between the two players,
// and the battle menu of whichever side moves first.
import { test, expect } from '@playwright/test';
import { gameUrl, watchErrors, waitForUiText, press } from './helpers';

test('versus: pick a field, hand the controller over, and command a unit', async ({ page }, info) => {
  test.setTimeout(240_000);
  const w = watchErrors(page);
  await page.goto(gameUrl(info, { quality: 'low' }));
  await waitForUiText(page, 'New Game');
  await press(page, '.title-menu .item:has-text("Versus")', info);
  await press(page, '.title-menu .item:has-text("Trial of the Barley Road")', info);
  const handover = page.locator('.versus-handover');
  await expect(handover).toBeVisible({ timeout: 120_000 });
  await expect(handover).toContainText(/Player [12]/);
  // the battle stays out of reach until the next player is ready
  await page.keyboard.press('Escape');
  await expect(handover).toBeVisible();
  await press(page, '.versus-handover .btn', info);
  await expect(handover).toHaveCount(0);
  await expect(page.locator('#ui .item:has-text("Move")').first()).toBeVisible({ timeout: 30_000 });
  w.assertClean();
});
