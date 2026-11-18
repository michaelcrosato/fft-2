// AI Hub Languages v1's test languages: every line of the game comes from the lines block, so the
// title and a battle show only accented (en-XA), wide (zh-XC) or right-to-left (ar-XB) text.
import { test, expect } from '@playwright/test';
import { gameUrl, watchErrors } from './helpers';

for (const lang of ['en-XA', 'zh-XC', 'ar-XB']) {
  test(`${lang}: the title menu comes from the lines`, async ({ page }, info) => {
    test.setTimeout(240_000);
    const w = watchErrors(page);
    await page.goto(gameUrl(info, { lang, quality: 'low' }));
    await expect(page.locator('.title-menu')).toBeVisible({ timeout: 120_000 });
    expect(await page.evaluate(() => document.documentElement.lang)).toBe(lang);
    const menu = await page.locator('.title-menu').innerText();
    // no plain English left in the title menu
    for (const word of ['New Game', 'Load Game', 'Options', 'Versus']) expect(menu).not.toContain(word);
    if (lang === 'ar-XB') expect(await page.locator('#ui').getAttribute('dir')).toBe('rtl');
    await page.screenshot({ path: info.outputPath(`title-${lang}.png`) });
    w.assertClean();
  });
}
