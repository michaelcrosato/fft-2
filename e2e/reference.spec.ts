import { expect, test } from '@playwright/test';
import {
  expectInViewport,
  expectNoOverlap,
  gameUrl,
  press,
  waitForUiText,
  watchErrors,
} from './helpers';

test('Chronicle: bestiary details and unlocked atlas remain readable', async ({
  page,
}, info) => {
  const errors = watchErrors(page);
  await page.goto(gameUrl(info, { test: 'chronicle', quality: 'low' }));
  await waitForUiText(page, 'Bestiary');
  await press(page, '.menu .item:has-text("Bestiary")', info);
  await waitForUiText(page, 'Class evasion');
  expect(await page.locator('.menu .item').count()).toBe(48);
  await expect(page.locator('.panel.detail')).toContainText('Poaching');
  await expect(page.locator('.panel.detail')).toContainText('Beast Lore');
  await expectInViewport(page, '.panel.detail');
  await expectNoOverlap(page, '.menu', '.panel.detail');
  const text = page.locator('.panel.detail > div').last();
  await page.keyboard.press('PageDown');
  await expect
    .poll(() => text.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await text.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(page.locator('.panel.detail')).toContainText(
    'Habitats on known roads',
  );
  await press(page, '.menu .mclose', info);
  await press(page, '.menu .item:has-text("Atlas of Ivaldis")', info);
  await waitForUiText(page, 'Connected roads');
  expect(await page.locator('.menu .item').count()).toBe(2);
  await expect(page.locator('.menu')).not.toContainText('Airship');
  await expect(page.locator('.panel.detail')).toContainText('Outfitter');
  await expectInViewport(page, '.panel.detail');
  await expectNoOverlap(page, '.menu', '.panel.detail');
  await press(page, '.menu .mclose', info);
  await press(page, '.menu .mclose', info);
  await expect(page.locator('.panel.detail')).toHaveCount(0);
  errors.assertClean();
});

test('How to Play: job requirements and cures are accessible and scrollable', async ({
  page,
}, info) => {
  const errors = watchErrors(page);
  await page.goto(gameUrl(info, { quality: 'low' }));
  await waitForUiText(page, 'Options');
  await press(page, '.menu .item:has-text("Options")', info);
  await waitForUiText(page, 'How to Play');
  await press(page, '.menu .item:has-text("How to Play")', info);
  await waitForUiText(page, 'Before the Battle');
  await press(page, '.menu .item:has-text("Job Unlocks")', info);
  await expect(page.getByRole('region', { name: 'Job Unlocks' })).toContainText(
    'Mimic',
  );
  const jobText = page.getByRole('region', { name: 'Job Unlocks' });
  await page.keyboard.press('PageDown');
  await expect
    .poll(() => jobText.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  const scroll = await jobText.evaluate((el) => el.scrollTop);
  await page.keyboard.press('Enter');
  await expect.poll(() => jobText.evaluate((el) => el.scrollTop)).toBe(scroll);
  await expectInViewport(page, '.panel.detail');
  await expectNoOverlap(page, '.menu', '.panel.detail');
  await press(page, '.menu .item:has-text("Cures & Dispel")', info);
  await expect(
    page.getByRole('region', { name: 'Cures & Dispel' }),
  ).toContainText('Remedy');
  await press(page, '.menu .item:has-text("Recruiting Monsters")', info);
  await expect(
    page.getByRole('region', { name: 'Recruiting Monsters' }),
  ).toContainText('Beast Lore');
  await press(page, '.menu .mclose', info);
  await waitForUiText(page, 'How to Play');
  await press(page, '.menu .mclose', info);
  await waitForUiText(page, 'New Game');
  errors.assertClean();
});
