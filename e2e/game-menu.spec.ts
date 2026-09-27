import { execFileSync } from 'node:child_process';
import { expect, type Page, type TestInfo, test } from '@playwright/test';
import type { Game } from '../src/game/game';
import {
  expectInViewport,
  expectNoOverlap,
  expectRendering,
  gameUrl,
  press,
  waitForUiText,
  watchErrors,
} from './helpers';

const systemMenu = (page: Page) => page.getByRole('dialog', { name: 'Game Menu', exact: true });
const playtime = (page: Page) => page.evaluate(() => (window as unknown as { __game: Game }).__game.state.playtime);

async function openMenu(page: Page, info: TestInfo) {
  await press(page, '.game-menu-button', info);
  await expect(systemMenu(page)).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/game-paused/);
}

async function resume(page: Page, info: TestInfo) {
  await press(page, '.game-menu-home .btn:has-text("Resume Game")', info);
  await expect(systemMenu(page)).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveClass(/game-paused/);
}

// the Menu's fullscreen entry is "Game Mode" where the browser has no fullscreen
const ENTER_FULLSCREEN = '.game-menu-home .btn:text-is("Fullscreen"), .game-menu-home .btn:text-is("Game Mode")';
const EXIT_FULLSCREEN = '.game-menu-home .btn:text-is("Exit Fullscreen"), .game-menu-home .btn:text-is("Exit Game Mode")';
const gameModeOn = /(?:^|\s)game-mode(?:\s|$)/;

async function assertTopLeft(page: Page, selector: string) {
  await expectInViewport(page, selector);
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`${selector} has no visible bounds`);
  expect(box.y).toBeLessThan(64);
  expect(box.x).toBeLessThan(100);
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
}

async function assertTopRight(page: Page, selector: string) {
  await expectInViewport(page, selector);
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`${selector} has no visible bounds`);
  const width = await page.evaluate(() => innerWidth);
  expect(box.y).toBeLessThan(64);
  expect(width - box.x - box.width).toBeLessThan(100);
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
}

test('Menu stays reachable during deployment, settings and help, then resumes the same selection', async ({
  page,
}, info) => {
  const errors = watchErrors(page);
  await page.goto(gameUrl(info, { test: 'battle', id: 'b_galwyn', quality: 'low' }));
  await waitForUiText(page, 'Begin Battle');
  await assertTopRight(page, '.game-menu-button');
  await expectNoOverlap(page, '.game-toolbar', '.battle-briefing');
  await expectNoOverlap(page, '.game-toolbar', '.camctl');
  const selected = await page.locator('.menu.deploy .item.sel').innerText();
  await openMenu(page, info);
  const pausedTime = await playtime(page);
  await page.waitForTimeout(700);
  expect(await playtime(page)).toBe(pausedTime);
  await press(page, '.game-menu-home .btn:has-text("Options")', info);
  const music = () => page.evaluate(() => (window as unknown as { __game: Game }).__game.options.music);
  const original = await music();
  await press(page, '.game-menu-shell .menu .item:has-text("Music volume")', info);
  await expect.poll(music).not.toBe(original);
  await press(page, '.game-menu-button', info); // the persistent control backs out of Options
  await expect(page.locator('.game-menu-home')).toBeVisible();
  await press(page, '.game-menu-home .btn:has-text("How to Play")', info);
  await expect(page.locator('.game-menu-shell .menu .title-plate')).toHaveText('Topics');
  await press(page, '.game-menu-button', info);
  await page.screenshot({ path: info.outputPath('mobile-game-menu.png') });
  await resume(page, info);
  await expect(page.locator('.menu.deploy .item.sel')).toHaveText(selected);
  await expect.poll(() => playtime(page)).toBeGreaterThan(pausedTime);
  await expectRendering(page);
  errors.assertClean();
});

test('cutscene Menu pauses text and toggles fullscreen; Skip sits top-left, Menu top-right', async ({
  page,
}, info) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem('fft-fealty-options', JSON.stringify({ textSpeed: 0.02 }));
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: async () => {
        throw new Error('Fullscreen unavailable on this device');
      },
    });
  });
  await page.goto(gameUrl(info, { test: 'scene', id: 'sc_pro_alazar', quality: 'low' }));
  await expect(page.locator('.dialogue')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip cutscene' })).toBeVisible();
  await openMenu(page, info);
  const text = await page.locator('.dialogue .text').innerText();
  const pausedTime = await playtime(page);
  await page.waitForTimeout(1200);
  await expect(page.locator('.dialogue .text')).toHaveText(text);
  expect(await playtime(page)).toBe(pausedTime);
  await expect(page.locator('.skipbtn')).toBeHidden();
  // The Menu switches Game Mode directly (this browser refuses fullscreen, so only its protections apply)
  await press(page, ENTER_FULLSCREEN, info);
  await expect(page.locator('html')).toHaveClass(gameModeOn);
  await press(page, EXIT_FULLSCREEN, info);
  await expect(page.locator('html')).not.toHaveClass(gameModeOn);
  await expect(systemMenu(page)).toBeVisible();
  // Options still offers the Game Mode prompt, and the Menu entry follows it
  await press(page, '.game-menu-home .btn:has-text("Options")', info);
  await press(page, '.game-menu-shell .menu .item:has-text("Game Mode")', info);
  await press(page, '.game-mode-prompt .btn:has-text("Enable Game Mode")', info);
  await expect(page.locator('.game-mode-prompt')).toHaveCount(0);
  await expect(page.locator('html')).toHaveClass(gameModeOn);
  await press(page, '.game-menu-button', info);
  await expect(page.locator(EXIT_FULLSCREEN)).toBeVisible();
  await resume(page, info);
  await expect(page.locator('.skipbtn')).toBeVisible();
  await assertTopLeft(page, '.skipbtn');
  await assertTopRight(page, '.game-menu-button');
  await expectNoOverlap(page, '.skipbtn', '.game-menu-button');
  await expectInViewport(page, '.game-toolbar');
  const skip = await page.locator('.skipbtn').evaluate((el) => {
    const style = getComputedStyle(el),
      box = el.getBoundingClientRect();
    return { background: style.backgroundColor, color: style.color, width: box.width, height: box.height };
  });
  expect(['rgb(33, 24, 15)', 'rgb(73, 48, 25)']).toContain(skip.background);
  expect(skip.color).toBe('rgb(255, 241, 206)');
  expect(skip.width).toBeGreaterThanOrEqual(44);
  expect(skip.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: info.outputPath('cutscene-controls.png') });
  await press(page, '.skipbtn', info);
  await expect(page.locator('.skipbtn, .dialogue')).toHaveCount(0);
  await expect(page.locator('.game-menu-button')).toBeVisible();
  await expect(systemMenu(page)).toHaveCount(0);
  await openMenu(page, info);
  await press(page, EXIT_FULLSCREEN, info);
  await expect(page.locator('html')).not.toHaveClass(gameModeOn);
  await resume(page, info);
  errors.assertClean();
});

test('Menu pauses active AI turns without losing battle state', async ({ page }, info) => {
  const errors = watchErrors(page);
  await page.goto(gameUrl(info, { test: 'battle', id: 'b_galwyn', auto: 1, quality: 'low' }));
  await expect(page.locator('.dialogue')).toBeVisible();
  await press(page, '.skipbtn', info);
  await expect(page.locator('.skipbtn')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => !!(window as unknown as { __game: Game }).__game.currentBattle?.active))
    .toBe(true);
  await openMenu(page, info);
  const battleState = () =>
    page.evaluate(() => {
      const b = (window as unknown as { __game: Game }).__game.currentBattle;
      return JSON.stringify({
        active: b?.active?.uid,
        units: b?.units.map((u) => [u.uid, u.hp, u.mp, u.ct, u.x, u.z, u.moved, u.acted]),
      });
    });
  const pausedState = await battleState();
  await page.waitForTimeout(1200);
  expect(await battleState()).toBe(pausedState);
  await resume(page, info);
  await expect.poll(battleState).not.toBe(pausedState);
  await expect(page.locator('.game-menu-button')).toBeVisible();
  errors.assertClean();
});

test('Return to Title asks before leaving a battle and restores a clean title screen', async ({ page }, info) => {
  const errors = watchErrors(page);
  await page.goto(gameUrl(info, { test: 'battle', id: 'b_galwyn', quality: 'low' }));
  await waitForUiText(page, 'Begin Battle');
  await openMenu(page, info);
  await press(page, '.game-menu-home .btn:has-text("Return to Title")', info);
  await expect(systemMenu(page)).toContainText('Progress since your last save will be lost.');
  await press(page, '.game-menu-home .btn:has-text("Keep Playing")', info);
  await expect(page.locator('.game-menu-home .btn:has-text("Resume Game")')).toBeVisible();
  await expect(page.locator('.menu.deploy')).toBeAttached();
  await press(page, '.game-menu-home .btn:has-text("Return to Title")', info);
  await press(page, '.game-menu-home .btn:has-text("Return to Title")', info);
  await expect(page.locator('.title-menu')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('test')).toBe(false);
  await expect(systemMenu(page)).toHaveCount(0);
  await expect(page.locator('.game-menu-button')).toBeHidden();
  await expect(page.locator('html')).not.toHaveClass(/game-paused/);
  errors.assertClean();
});

test('the Menu enters and leaves real fullscreen and stays open', async ({
  page,
}, info) => {
  test.skip(!!info.project.use.hasTouch, 'Native fullscreen needs a desktop browser, not phone emulation.');
  const errors = watchErrors(page);
  await page.goto(gameUrl(info, { test: 'battle', id: 'b_galwyn', quality: 'low' }));
  await waitForUiText(page, 'Begin Battle');
  await openMenu(page, info);
  await press(page, ENTER_FULLSCREEN, info);
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe('HTML');
  await expect(systemMenu(page)).toBeVisible();
  await assertTopRight(page, '.game-menu-button');
  await press(page, EXIT_FULLSCREEN, info);
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
  await expect(systemMenu(page)).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/game-paused/);
  await resume(page, info);
  await expect(page.locator('.menu.deploy')).toBeVisible();
  errors.assertClean();
});

test('Menu stays usable while the party travels on the world map', async ({ page }, info) => {
  const errors = watchErrors(page);
  const state = JSON.parse(
    execFileSync(process.execPath, ['node_modules/.bin/vite-node', 'e2e/fixtures/game-mode-save.ts'], {
      encoding: 'utf8',
    }),
  ) as Game['state'];
  state.unlocked = ['orvelle', 'murondel'];
  await page.addInitScript((save) => {
    localStorage.setItem('fft-fealty-save-0', JSON.stringify(save));
  }, state);
  await page.goto(gameUrl(info, { quality: 'low' }));
  await waitForUiText(page, 'Continue');
  await press(page, '.title-menu .item:has-text("Continue")', info);
  await press(page, '.game-mode-prompt .btn:has-text("Play in Browser")', info);
  await expect(page.locator('.world-status')).toBeVisible();
  await expect(page.locator('#loading')).toHaveCount(0);
  await page.keyboard.press('ArrowUp'); // the only other unlocked node is north of Orvelle
  await waitForUiText(page, 'Murondel');
  // Start travel and pause in the same browser task. With software rendering,
  // a Playwright click round trip can otherwise take longer than the journey.
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
    document.querySelector<HTMLButtonElement>('.game-menu-button')?.click();
  });
  await expect(systemMenu(page)).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/game-paused/);
  const location = () => page.evaluate(() => (window as unknown as { __game: Game }).__game.state.location);
  expect(await location()).toBe('orvelle');
  // Longer than the whole journey: pausing must stop its independent RAF movement, too.
  await page.waitForTimeout(5000);
  expect(await location()).toBe('orvelle');
  await resume(page, info);
  await expect.poll(location).toBe('murondel');
  await expect(page.locator('.game-menu-button')).toBeVisible();
  errors.assertClean();
});
