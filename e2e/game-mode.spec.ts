import { execFileSync } from 'node:child_process';
import { expect, type Page, type TestInfo, test } from '@playwright/test';
import { expectInViewport, expectRendering, gameUrl, press, waitForUiText, watchErrors } from './helpers';

const prompt = (page: Page) => page.getByRole('dialog', { name: 'Fullscreen Game Mode?' });
const gameModeOn = /(?:^|\s)game-mode(?:\s|$)/;

async function savedCampaign(page: Page) {
  // Content uses import.meta.glob, so generate a real save through Vite's module runner.
  const state = JSON.parse(
    execFileSync(process.execPath, ['node_modules/.bin/vite-node', 'e2e/fixtures/game-mode-save.ts'], {
      encoding: 'utf8',
    }),
  );
  await page.addInitScript((save) => {
    localStorage.setItem('fft-fealty-save-0', JSON.stringify(save));
  }, state);
}

async function continueToPrompt(page: Page, info: TestInfo) {
  await page.goto(gameUrl(info, { quality: 'low' }));
  await waitForUiText(page, 'Continue');
  await press(page, '.title-menu .item:has-text("Continue")', info);
  await expect(prompt(page)).toBeVisible();
}

async function enable(page: Page, info: TestInfo) {
  await press(page, '.game-mode-prompt .btn:has-text("Enable Game Mode")', info);
  await expect(prompt(page)).toHaveCount(0);
  await expect(page.locator('html')).toHaveClass(gameModeOn);
}

/** The world map's Menu lists the fullscreen entry ("Exit Game Mode" where there is no fullscreen). */
async function exitFromWorldMenu(page: Page, info: TestInfo) {
  await press(page, '.btn:has-text("☰ Menu")', info);
  await press(page, '.menu .item:has-text("Exit Fullscreen"), .menu .item:has-text("Exit Game Mode")', info);
  await expect(page.locator('html')).not.toHaveClass(gameModeOn);
}

async function returnToTitle(page: Page, info: TestInfo) {
  await press(page, '.btn:has-text("☰ Menu")', info);
  await press(page, '.menu .item:has-text("Return to Title")', info);
  await press(page, '.prompt .menu .item:has-text("Return to title")', info);
  await waitForUiText(page, 'Continue');
}

// Controllable browser APIs exercise denial, legacy Safari, delayed promises and OS exits.
// A separate test below verifies actual fullscreen with a trusted user gesture.
async function browserAPIs(page: Page, mode: 'supported' | 'denied' | 'missing' | 'webkit') {
  await page.addInitScript((kind) => {
    const state = {
      element: null as Element | null,
      fullscreenRequests: 0,
      navigationUI: '',
      wakeRequests: 0,
      wakeReleases: 0,
      holdWake: false,
      resolveWake: () => {},
    };
    Object.assign(window, { __modeAPIs: state });
    const request = async (options?: FullscreenOptions) => {
      state.fullscreenRequests++;
      state.navigationUI = options?.navigationUI ?? '';
      if (kind === 'denied') throw new Error('Fullscreen denied');
      state.element = document.documentElement;
      document.dispatchEvent(new Event(kind === 'webkit' ? 'webkitfullscreenchange' : 'fullscreenchange'));
    };
    const exit = async () => {
      state.element = null;
      document.dispatchEvent(new Event(kind === 'webkit' ? 'webkitfullscreenchange' : 'fullscreenchange'));
    };
    Object.defineProperties(document, {
      fullscreenElement: { configurable: true, get: () => (kind === 'webkit' ? null : state.element) },
      fullscreenEnabled: { configurable: true, value: kind !== 'missing' && kind !== 'webkit' },
      exitFullscreen: { configurable: true, value: kind === 'webkit' ? undefined : exit },
      webkitFullscreenElement: { configurable: true, get: () => state.element },
      webkitFullscreenEnabled: { configurable: true, value: kind === 'webkit' },
      webkitExitFullscreen: { configurable: true, value: exit },
    });
    Object.defineProperties(HTMLElement.prototype, {
      requestFullscreen: { configurable: true, value: kind === 'missing' || kind === 'webkit' ? undefined : request },
      webkitRequestFullscreen: { configurable: true, value: kind === 'webkit' ? request : undefined },
    });
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => {
          state.wakeRequests++;
          if (kind === 'denied') throw new Error('Wake lock denied');
          if (state.holdWake)
            await new Promise<void>((resolve) => {
              state.resolveWake = resolve;
            });
          const sentinel = new EventTarget();
          return Object.assign(sentinel, {
            release: async () => {
              state.wakeReleases++;
              sentinel.dispatchEvent(new Event('release'));
            },
          });
        },
      },
    });
  }, mode);
}

test('Continue and Load always ask; declining, returning to title, and cancelling a load work', async ({
  page,
}, info) => {
  const errors = watchErrors(page);
  await savedCampaign(page);
  await browserAPIs(page, 'supported');
  await continueToPrompt(page, info);
  await expectInViewport(page, '.game-mode-prompt');
  await enable(page, info);
  await expect(page.locator('.world-status')).toBeVisible();
  await returnToTitle(page, info);
  await expect(page.locator('html')).not.toHaveClass(gameModeOn);
  await press(page, '.title-menu .item:has-text("Continue")', info);
  await expect(prompt(page)).toBeVisible();
  await press(page, '.game-mode-prompt .btn:has-text("Play in Browser")', info);
  await expect(page.locator('.world-status')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(gameModeOn);
  await returnToTitle(page, info);
  await press(page, '.title-menu .item:has-text("Load Game")', info);
  await press(page, '.menu .mclose', info);
  await expect(prompt(page)).toHaveCount(0);
  await press(page, '.title-menu .item:has-text("Load Game")', info);
  await press(page, '.menu .item:has-text("Mode Tester")', info);
  await expect(prompt(page)).toBeVisible();
  await press(page, '.game-mode-prompt .btn:has-text("Play in Browser")', info);
  await expect(page.locator('.world-status')).toBeVisible();
  // Loading a chronicle from within a running campaign asks too.
  await press(page, '.btn:has-text("☰ Menu")', info);
  await press(page, '.menu .item:has-text("Load")', info);
  await press(page, '.menu .item:has-text("Mode Tester")', info);
  await expect(prompt(page)).toBeVisible();
  await press(page, '.game-mode-prompt .btn:has-text("Play in Browser")', info);
  await expectRendering(page);
  errors.assertClean();
});

for (const kind of ['denied', 'missing', 'webkit'] as const) {
  test(`Game Mode handles ${kind} fullscreen and cleans up its protections`, async ({ page }, info) => {
    const errors = watchErrors(page);
    await savedCampaign(page);
    await browserAPIs(page, kind);
    await continueToPrompt(page, info);
    if (kind === 'missing') await expect(prompt(page)).toContainText('Fullscreen is unavailable');
    await enable(page, info);
    if (kind !== 'webkit') {
      await expect(page.locator('.toast')).toContainText('fullscreen is unavailable');
      await expect(page.locator('.toast')).toHaveCSS('animation-duration', '6.5s');
      await expectInViewport(page, '.toast');
    }
    await expect(page.locator('.world-status')).toBeVisible();
    await expectInViewport(page, '.game-menu-button');
    // Only touches starting on the outer edge are reserved, and only while enabled.
    const touchPrevented = (x: number) =>
      page.evaluate((clientX) => {
        const e = new Event('touchstart', { bubbles: true, cancelable: true });
        Object.defineProperty(e, 'touches', { value: [{ clientX }] });
        document.dispatchEvent(e);
        return e.defaultPrevented;
      }, x);
    expect(await touchPrevented(1)).toBe(true);
    expect(await touchPrevented(100)).toBe(false);
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { __modeAPIs: { wakeRequests: number } }).__modeAPIs.wakeRequests),
      )
      .toBe(1);
    if (kind === 'denied') await page.keyboard.press('Escape');
    else await exitFromWorldMenu(page, info);
    await expect(page.locator('html')).not.toHaveClass(gameModeOn);
    expect(await touchPrevented(1)).toBe(false);
    expect(
      await page.evaluate(
        () => (window as unknown as { __modeAPIs: { wakeReleases: number } }).__modeAPIs.wakeReleases,
      ),
    ).toBe(kind === 'denied' ? 0 : 1);
    await expectRendering(page);
    errors.assertClean();
  });
}

test('Options enables Game Mode; browser exits and delayed wake locks release cleanly', async ({ page }, info) => {
  const errors = watchErrors(page);
  await browserAPIs(page, 'supported');
  await page.goto(gameUrl(info, { quality: 'low' }));
  await waitForUiText(page, 'New Game');
  await press(page, '.title-menu .item:has-text("Options")', info);
  await press(page, '.menu .item:has-text("Game Mode")', info);
  await enable(page, info);
  await expect(page.locator('.menu .item:has-text("Game Mode")')).toContainText('Fullscreen');
  expect(await page.locator('.menu .scroll').evaluate((el) => getComputedStyle(el).overscrollBehavior)).toBe('none');
  expect(await page.locator('.menu .scroll').evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto');
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __modeAPIs: { wakeRequests: number } }).__modeAPIs.wakeRequests),
    )
    .toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __modeAPIs: { wakeReleases: number } }).__modeAPIs.wakeReleases),
    )
    .toBe(1);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __modeAPIs: { wakeRequests: number } }).__modeAPIs.wakeRequests),
    )
    .toBe(2);
  await page.evaluate(() => document.exitFullscreen());
  await expect(page.locator('html')).not.toHaveClass(gameModeOn);
  await expect(page.locator('.menu .item:has-text("Game Mode")')).toContainText('Off');
  await page.evaluate(() => {
    (window as unknown as { __modeAPIs: { holdWake: boolean } }).__modeAPIs.holdWake = true;
  });
  await press(page, '.menu .item:has-text("Game Mode")', info);
  await enable(page, info);
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __modeAPIs: { wakeRequests: number } }).__modeAPIs.wakeRequests),
    )
    .toBe(3);
  await press(page, '.menu .item:has-text("Game Mode")', info);
  await expect(page.locator('html')).not.toHaveClass(gameModeOn);
  await page.evaluate(() => {
    (window as unknown as { __modeAPIs: { resolveWake: () => void } }).__modeAPIs.resolveWake();
  });
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __modeAPIs: { wakeReleases: number } }).__modeAPIs.wakeReleases),
    )
    .toBe(3);
  errors.assertClean();
});

test('trusted keyboard input enters real fullscreen for a new campaign and the Menu leaves it', async ({
  page,
}, info) => {
  test.skip(
    !!info.project.use.hasTouch,
    'Device emulation cannot verify operating-system fullscreen behavior; API variants are covered above.',
  );
  const errors = watchErrors(page);
  await page.goto(gameUrl(info, { quality: 'low' }));
  await waitForUiText(page, 'New Game');
  await press(page, '.title-menu .item:has-text("New Game")', info);
  await press(page, '.btn:has-text("Begin the Tale")', info);
  await expect(prompt(page)).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Play in Browser', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Enable Game Mode', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe('HTML');
  await expect(page.locator('.narration, .titlecard, .dialogue').first()).toBeVisible();
  await expectRendering(page);
  await page.screenshot({ path: info.outputPath('fullscreen-campaign.png') });
  await page.locator('.game-menu-button').click();
  await page.getByRole('button', { name: 'Exit Fullscreen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
  await expect(page.locator('html')).not.toHaveClass(gameModeOn);
  await page.locator('.game-menu-home .btn:has-text("Resume Game")').click();
  errors.assertClean();
});
