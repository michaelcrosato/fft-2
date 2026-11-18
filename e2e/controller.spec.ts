// Every screen on a controller alone, with a simulated DualSense and with an Xbox pad: the title,
// Options and the Controller page, How to Play, the Language menu, deployment and a battle turn (menus,
// tile picking, facing, the Game Menu, the turn order), formation and equipment, the shop and the
// tavern, the world map and its menu, the Chronicle, a cutscene with a choice, the results, game over
// and the versus hand-over. Button glyphs follow the pad in hand.
import { execFileSync } from 'node:child_process';
import { test, expect, type Page } from '@playwright/test';
import { gameUrl, watchErrors, waitForUiText, uiText, installFakeGamepad, PAD_IDS } from './helpers';

const A = 0, B = 1, SQUARE = 2, Y = 3, CREATE = 8, OPTIONS = 9, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15, TOUCHPAD = 17;
void SQUARE; void LEFT; void Y;
const CONFIRM_GLYPH = { playstation: '✕', xbox: 'A' };

type Pad = Awaited<ReturnType<typeof installFakeGamepad>>;
const selected = (page: Page) => page.locator('#ui .menu .item.sel, body > .menu .item.sel').last();

/** Move the menu's cursor down (wrapping) until the selected row reads `text`. */
async function padTo(page: Page, pad: Pad, text: string | RegExp, max = 16) {
  for (let i = 0; i < max; i++) {
    const now = (await selected(page).textContent().catch(() => '')) ?? '';
    if (typeof text === 'string' ? now.includes(text) : text.test(now)) return;
    await pad.tap(DOWN);
  }
  throw new Error(`no menu row "${text}"`);
}

/** Past deployment and the opening scene, pressing only pad buttons, to the company's first turn. */
async function firstTurn(page: Page, pad: Pad) {
  await waitForUiText(page, 'Begin Battle', 150_000);
  await padTo(page, pad, 'Begin Battle');
  await pad.tap(A);
  await expect.poll(async () => {
    // Options holds Skip while a scene plays
    if (await page.locator('.skipbtn').isVisible().catch(() => false)) await pad.tap(OPTIONS);
    const t = await uiText(page);
    return t.includes('Move') && t.includes('Act') && t.includes('Wait');
  }, { timeout: 180_000, intervals: [1000] }).toBe(true);
}

/** Wait for `text`, skipping any scene on the way with Options (it holds Skip while a scene plays). */
async function skipUntil(page: Page, pad: Pad, text: string) {
  await expect.poll(async () => {
    if (await page.locator('.skipbtn').isVisible().catch(() => false)) await pad.tap(OPTIONS);
    return (await uiText(page)).toLowerCase().includes(text.toLowerCase());
  }, { timeout: 180_000, intervals: [1000] }).toBe(true);
}

/** A save on the world map (the same fixture the Game Mode tests use). */
async function savedCampaign(page: Page) {
  const state = JSON.parse(execFileSync(process.execPath, ['node_modules/.bin/vite-node', 'e2e/fixtures/game-mode-save.ts'], { encoding: 'utf8' }));
  await page.addInitScript((save) => { localStorage.setItem('fft-fealty-save-0', JSON.stringify(save)); }, state);
}

for (const kind of ['playstation', 'xbox'] as const) {
  test.describe(`${kind} pad`, () => {
    test.skip(({ isMobile }) => isMobile, 'desktop pads');
    test.setTimeout(300_000);

    test('title, Options, the Controller page and How to Play', async ({ page }, info) => {
      const w = watchErrors(page);
      const pad = await installFakeGamepad(page, kind);
      await page.goto(gameUrl(info, { quality: 'low' }));
      await waitForUiText(page, 'New Game');
      await padTo(page, pad, 'Options');
      await pad.tap(A);
      await waitForUiText(page, 'Music volume');
      await padTo(page, pad, 'Controller');
      await pad.tap(A);
      await waitForUiText(page, 'Button prompts');
      expect(await uiText(page)).toContain('Not connected');
      await padTo(page, pad, 'Vibration');
      await pad.tap(A); // High → Low
      await expect(selected(page)).toContainText('Low');
      await pad.tap(B);
      await waitForUiText(page, 'Music volume');
      await padTo(page, pad, 'How to Play');
      await pad.tap(A);
      await waitForUiText(page, 'Before the Battle');
      await pad.tap(B);
      await waitForUiText(page, 'Music volume');
      await pad.tap(B);
      await expect(page.locator('.title-menu')).toBeVisible();
      w.assertClean();
    });

    test('a battle: deployment, a turn with tile picking and facing, the Game Menu and the turn order', async ({ page }, info) => {
      const w = watchErrors(page);
      const pad = await installFakeGamepad(page, kind);
      await page.goto(gameUrl(info, { test: 'battle', id: 'b_galwyn', lv: 8, quality: 'low' }));
      await firstTurn(page, pad);
      // the help bar shows this pad's buttons
      await expect.poll(() => page.locator('#ui kbd').allTextContents(), { timeout: 30_000 }).toContain(CONFIRM_GLYPH[kind]);
      // Move: pick a tile with the d-pad, then back out to the menu
      await padTo(page, pad, 'Move');
      await pad.tap(A);
      await pad.tap(UP);
      await pad.tap(B);
      await expect.poll(() => uiText(page), { timeout: 30_000 }).toContain('Wait');
      // Options opens the Game Menu, Circle / B closes it
      await pad.tap(OPTIONS);
      await expect(page.locator('.game-menu-shell')).toBeVisible();
      await pad.tap(B);
      await expect(page.locator('.game-menu-shell')).toHaveCount(0);
      // the turn order: Create (View) on release; on a DualSense the touchpad's click too
      await pad.tap(CREATE);
      if (kind === 'playstation') await pad.tap(TOUCHPAD);
      // Wait, then face east and confirm: the turn passes
      await padTo(page, pad, 'Wait');
      await pad.tap(A);
      await pad.tap(RIGHT);
      await pad.tap(A);
      // the turn passed: the facing step is gone and the battle goes on
      await page.waitForTimeout(2000);
      expect(await page.evaluate(() => (window as any).__game.currentBattle?.result ?? null)).toBeNull();
      w.assertClean();
    });

    test('results after a victory, and game over after a defeat', async ({ page }, info) => {
      const w = watchErrors(page);
      const pad = await installFakeGamepad(page, kind);
      await page.goto(gameUrl(info, { test: 'battle', id: 'b_galwyn', lv: 8, quality: 'low', quickwin: 1 }));
      await waitForUiText(page, 'Begin Battle', 150_000);
      await pad.tap(A);
      await skipUntil(page, pad, 'Spoils of Battle');
      await pad.tap(A);
      await expect.poll(() => uiText(page), { timeout: 30_000 }).not.toContain('Spoils of Battle');
      // a lost battle: the game over menu, by pad
      await page.goto(gameUrl(info, { test: 'battle', id: 'b_galwyn', lv: 8, quality: 'low' }));
      await firstTurn(page, pad);
      await page.evaluate(() => { const b = (window as any).__game.currentBattle; b.forced = 'defeat'; });
      await padTo(page, pad, 'Wait');
      await pad.tap(A);
      await pad.tap(A);
      await skipUntil(page, pad, 'Retry the battle');
      await padTo(page, pad, 'Retry the battle');
      await pad.tap(A);
      await waitForUiText(page, 'Begin Battle', 150_000);
      w.assertClean();
    });

    test('formation and equipment', async ({ page }, info) => {
      const w = watchErrors(page);
      const pad = await installFakeGamepad(page, kind);
      await page.goto(gameUrl(info, { test: 'formation', lv: 12, quality: 'low' }));
      await waitForUiText(page, 'Formation');
      const before = await uiText(page);
      await pad.tap(A); // the first unit
      await expect.poll(() => uiText(page), { timeout: 30_000 }).not.toBe(before);
      await padTo(page, pad, /Equipment/);
      await pad.tap(A);
      await pad.tap(DOWN);
      await pad.tap(B);
      // renaming takes a pad too: the field opens, and B backs out of it
      await padTo(page, pad, 'Rename');
      await pad.tap(A);
      await expect(page.locator('input[type=text]')).toBeVisible();
      await pad.tap(B);
      await expect(page.locator('input[type=text]')).toHaveCount(0);
      await pad.tap(B);
      await pad.tap(B);
      w.assertClean();
    });

    test('the shop and the tavern', async ({ page }, info) => {
      const w = watchErrors(page);
      const pad = await installFakeGamepad(page, kind);
      await page.goto(gameUrl(info, { test: 'town', open: 'shop', quality: 'low' }));
      await waitForUiText(page, 'Outfitter');
      await pad.tap(A);
      await pad.tap(DOWN);
      await pad.tap(B);
      await pad.tap(B);
      await page.goto(gameUrl(info, { test: 'town', open: 'tavern', quality: 'low' }));
      await waitForUiText(page, 'Tavern');
      await pad.tap(DOWN);
      await pad.tap(A);
      await pad.tap(B);
      await pad.tap(B);
      w.assertClean();
    });

    test('the world map, its Menu and the Chronicle', async ({ page }, info) => {
      const w = watchErrors(page);
      await savedCampaign(page);
      const pad = await installFakeGamepad(page, kind);
      await page.goto(gameUrl(info, { quality: 'low' }));
      await waitForUiText(page, 'Continue');
      await padTo(page, pad, 'Continue');
      await pad.tap(A);
      await expect(page.getByRole('dialog', { name: 'Fullscreen Game Mode?' })).toBeVisible();
      await pad.tap(DOWN); // Play in Browser
      await pad.tap(A);
      await expect(page.locator('.world-status')).toBeVisible({ timeout: 120_000 });
      await pad.tap(UP); // the next place on the map
      await pad.tap(OPTIONS); // the world's Menu
      await padTo(page, pad, 'Chronicle');
      await pad.tap(A);
      await waitForUiText(page, 'Chronicle');
      await pad.tap(RIGHT); // the next section
      // Circle / B backs out, a level at a time, to the map
      for (let i = 0; i < 6 && !(await page.locator('.world-status').isVisible()); i++) await pad.tap(B);
      await expect(page.locator('.world-status')).toBeVisible();
      w.assertClean();
    });

    test('a cutscene with a choice', async ({ page }, info) => {
      const w = watchErrors(page);
      const pad = await installFakeGamepad(page, kind);
      await page.goto(gameUrl(info, { test: 'scene', id: 'sc_mandrel_pre', quality: 'low' }));
      await expect(page.locator('.dialogue, .narration').first()).toBeVisible({ timeout: 120_000 });
      // A advances the lines until the choice comes up
      await expect.poll(async () => {
        if (await page.locator('#ui .menu .item').count() >= 2) return true;
        await pad.tap(A);
        return false;
      }, { timeout: 180_000, intervals: [500] }).toBe(true);
      const choice = await selected(page).textContent();
      await pad.tap(DOWN);
      await expect(selected(page)).not.toHaveText(choice ?? '');
      await pad.tap(A);
      await expect.poll(() => page.locator('#ui .menu .item').count(), { timeout: 30_000 }).toBe(0);
      w.assertClean();
    });

    test('versus: the hand-over takes the next player\'s Cross / A', async ({ page }, info) => {
      const w = watchErrors(page);
      const pad = await installFakeGamepad(page, kind);
      await page.goto(gameUrl(info, { quality: 'low' }));
      await waitForUiText(page, 'New Game');
      await padTo(page, pad, 'Versus');
      await pad.tap(A);
      await padTo(page, pad, 'Trial of the Barley Road');
      await pad.tap(A);
      const handover = page.locator('.versus-handover');
      await expect(handover).toBeVisible({ timeout: 150_000 });
      await pad.tap(B); // not for the battle behind it
      await expect(handover).toBeVisible();
      await pad.tap(A);
      await expect(handover).toHaveCount(0);
      await expect.poll(() => uiText(page), { timeout: 30_000 }).toContain('Move');
      w.assertClean();
    });

    test('the Language menu, once there is a second language', async ({ page }, info) => {
      const w = watchErrors(page);
      // a stand-in translation block, as a translated build would carry
      await page.route('**/*', async (route) => {
        const res = await route.fetch();
        const type = res.headers()['content-type'] ?? '';
        if (!type.includes('text/html')) return route.fulfill({ response: res });
        const body = (await res.text()).replace('</head>', '<script type="application/json" id="game-translations">{"fr":{"lines":{"flow.title.new_game":"Nouvelle partie"}}}</script></head>');
        return route.fulfill({ response: res, body });
      });
      const pad = await installFakeGamepad(page, kind);
      await page.goto(gameUrl(info, { quality: 'low' }));
      await waitForUiText(page, 'New Game');
      await padTo(page, pad, 'Language');
      await pad.tap(A);
      await padTo(page, pad, /fran/i);
      // choosing a language restarts the game in it: press A without waiting on the old page
      await Promise.all([page.waitForEvent('load', { timeout: 120_000 }), page.evaluate('window.__taps[0] = 2')]);
      await expect.poll(() => page.evaluate(() => document.documentElement.lang), { timeout: 120_000 }).toBe('fr');
      await waitForUiText(page, 'Nouvelle partie');
      w.assertClean();
    });
  });
}

test('the pads are told apart by their ids', async () => {
  expect(PAD_IDS.playstation).toMatch(/054c/);
  expect(PAD_IDS.xbox).toMatch(/045e/);
});
