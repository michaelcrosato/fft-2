// AI Hub Languages v1's test languages, swept over the title, a new game, Options, the Controller and Art Style
// page, a cutscene, a battle turn with the Game Menu, and the Chronicle:
// - en-XA: every visible line is bracketed, so text outside […] did not come from the lines
//   (player-typed and generated unit names, key names and numbers aside);
// - zh-XC: wide text fits: no menu row, panel or page overflows sideways;
// - ar-XB: dialogue and menus run right to left.
import { test, expect, type Page } from '@playwright/test';
import { gameUrl, watchErrors, expectNoHorizontalOverflow } from './helpers';

const LANGS = ['en-XA', 'zh-XC', 'ar-XB'] as const;
type Lang = typeof LANGS[number];

/** Words of plain English left on screen outside the brackets (en-XA), names and key labels aside. */
async function englishLeft(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const roots = [document.getElementById('ui'), ...document.querySelectorAll('dialog, .game-menu-shell, .narration')];
    const text = roots.filter(Boolean).map((r) => (r as HTMLElement).innerText).join('\n');
    const names = new Set<string>();
    const g = (window as any).__game;
    for (const u of g?.state?.roster ?? []) names.add(u.name);
    for (const u of g?.currentBattle?.units ?? []) if (!u.roster?.charId) names.add(u.name);
    const KEYS = ['Enter', 'Esc', 'Tab', 'Shift', 'Space', 'Home', 'WebGL', 'WebGPU', 'Rhen'];
    const outside = text.replace(/\[[^\]]*\]/g, ' ');
    const words = outside.match(/[A-Za-z][A-Za-z'’-]{2,}/g) ?? [];
    // names may be drawn in capitals (CSS), so they are matched whatever their case
    const named = new Set([...names].flatMap((n) => n.split(/\s+/).map((x) => x.toLowerCase())));
    return words.filter((w) => !KEYS.some((k) => k.toLowerCase() === w.toLowerCase()) && !named.has(w.toLowerCase()));
  });
}

/** Pieces of text wider than the room they are given: a row's label or value, a title plate, a line of dialogue, a name, a button. */
async function overflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>('#ui .menu .item .l, #ui .menu .item .r, #ui .title-plate, #ui .dialogue .text, #ui .unitcard .name, #ui .unitcard .job, #ui .btn, .game-menu-shell .btn')]
    .filter((el) => el.offsetParent !== null && el.scrollWidth > el.clientWidth + 2)
    .map((el) => `${el.className}: ${el.innerText.slice(0, 40)}`));
}

async function check(page: Page, lang: Lang, where: string) {
  if (lang === 'en-XA') expect(await englishLeft(page), `${where}: English outside the lines`).toEqual([]);
  if (lang === 'zh-XC') {
    expect(await overflowing(page), `${where}: wide text overflows`).toEqual([]);
    await expectNoHorizontalOverflow(page);
  }
  if (lang === 'ar-XB') {
    expect(await page.locator('#ui').getAttribute('dir')).toBe('rtl');
    for (const sel of ['#ui .menu', '#ui .dialogue']) {
      const dirs = await page.locator(sel).evaluateAll((els) => els.map((e) => getComputedStyle(e).direction));
      expect(dirs.every((d) => d === 'rtl'), `${where}: ${sel} is not right to left`).toBe(true);
    }
  }
}

/** The title's rows, whatever the language: by position. */
const titleRow = (page: Page, i: number) => page.locator('.title-menu .item').nth(i);

for (const lang of LANGS) {
  test.describe(lang, () => {
    test.setTimeout(300_000);

    test('the title, a new game, Options and the Controller page', async ({ page }, info) => {
      const w = watchErrors(page);
      await page.goto(gameUrl(info, { lang, quality: 'low' }));
      await expect(page.locator('.title-menu')).toBeVisible({ timeout: 150_000 });
      await expect(page.locator('#loading')).toHaveCount(0, { timeout: 60_000 });
      expect(await page.evaluate(() => document.documentElement.lang)).toBe(lang);
      for (const word of ['New Game', 'Load Game', 'Options', 'Versus']) expect(await page.locator('.title-menu').innerText()).not.toContain(word);
      await check(page, lang, 'title');
      await page.screenshot({ path: info.outputPath(`title-${lang}.png`) });
      // Options (the row after Versus), then its Controller page
      await titleRow(page, 3).click();
      await expect(page.locator('.menu .title-plate').first()).toBeVisible();
      await check(page, lang, 'Options');
      const rows = page.locator('#ui .menu .item');
      const n = await rows.count();
      await rows.nth(n - 3).click(); // Controller, before How to Play and Back
      await expect.poll(async () => (await page.locator('#ui .menu .item').count()) !== n, { timeout: 30_000 }).toBe(true);
      await check(page, lang, 'Controller');
      await page.keyboard.press('Escape');
      // the Art Style page (after Graphics quality: fifth row from the end)
      await expect.poll(async () => page.locator('#ui .menu .item').count(), { timeout: 30_000 }).toBe(n);
      await rows.nth(n - 5).click();
      await expect(page.locator('.art-style [role=listbox]')).toHaveCount(1, { timeout: 30_000 });
      await check(page, lang, 'Art Style');
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      // a new game: the naming screen
      await titleRow(page, 0).click();
      await expect(page.locator('input:not([type=checkbox])').first()).toBeVisible();
      await check(page, lang, 'new game');
      await page.screenshot({ path: info.outputPath(`new-game-${lang}.png`) });
      w.assertClean();
    });

    test('a cutscene', async ({ page }, info) => {
      const w = watchErrors(page);
      await page.goto(gameUrl(info, { lang, test: 'scene', id: 'sc_mandrel_pre', quality: 'low' }));
      const box = page.locator('.dialogue').first();
      await expect(box).toBeVisible({ timeout: 150_000 });
      // the whole line typed out
      await expect(page.locator('.dialogue .next')).toBeVisible({ timeout: 30_000 });
      await check(page, lang, 'cutscene');
      await page.screenshot({ path: info.outputPath(`scene-${lang}.png`) });
      w.assertClean();
    });

    test('a battle turn and the Game Menu', async ({ page }, info) => {
      const w = watchErrors(page);
      await page.goto(gameUrl(info, { lang, test: 'battle', id: 'b_galwyn', lv: 8, quality: 'low' }));
      // deployment
      await expect(page.locator('#ui .menu .item').first()).toBeVisible({ timeout: 150_000 });
      await expect(page.locator('#loading')).toHaveCount(0, { timeout: 60_000 });
      await check(page, lang, 'deployment');
      // Begin Battle is preselected
      await page.keyboard.press('Enter');
      // the opening scene skipped, up to the first turn's command menu
      await expect.poll(async () => {
        const skip = page.locator('.skipbtn');
        if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 5000 }).catch(() => {});
        return (await page.locator('#ui .menu .item').count()) >= 4 && (await page.locator('#ui .unitcard').count()) > 0;
      }, { timeout: 180_000, intervals: [1000] }).toBe(true);
      await page.waitForTimeout(1000);
      await check(page, lang, 'battle turn');
      await page.screenshot({ path: info.outputPath(`battle-${lang}.png`) });
      await page.locator('.game-menu-button').click();
      await expect(page.locator('.game-menu-shell')).toBeVisible();
      await check(page, lang, 'Game Menu');
      w.assertClean();
    });

    test('the Chronicle', async ({ page }, info) => {
      const w = watchErrors(page);
      await page.goto(gameUrl(info, { lang, test: 'chronicle', quality: 'low' }));
      await expect(page.locator('#ui .menu .item').first()).toBeVisible({ timeout: 150_000 });
      await expect(page.locator('#loading')).toHaveCount(0, { timeout: 60_000 });
      await check(page, lang, 'Chronicle');
      await page.screenshot({ path: info.outputPath(`chronicle-${lang}.png`) });
      w.assertClean();
    });
  });
}
