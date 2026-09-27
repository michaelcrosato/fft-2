import { expect, test } from '@playwright/test';
import { gameUrl, press, waitForUiText, watchErrors } from './helpers';

test('one Skip press completes the battle intro while dialogue is still typing', async ({ page }, info) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem('fft-fealty-options', JSON.stringify({ textSpeed: 0.01 }));
  });
  await page.goto(gameUrl(info, { test: 'battle', id: 'b_galwyn', quality: 'low' }));
  await waitForUiText(page, 'Begin Battle');
  await page.evaluate(() => {
    const game = (window as any).__game;
    const original = game.playBattleScript;
    game.playBattleScript = async function (...args: unknown[]) {
      await original.apply(this, args);
      (window as any).__introComplete = true;
    };
  });
  await press(page, '.menu .item:has-text("Begin Battle")', info);
  await expect(page.locator('.dialogue')).toBeVisible();
  await expect(page.locator('.dialogue .next')).toHaveCSS('visibility', 'hidden');
  await press(page, '.skipbtn', info);
  await expect.poll(() => page.evaluate(() => (window as any).__introComplete)).toBe(true);
  await expect(page.locator('.skipbtn, .dialogue')).toHaveCount(0);
  errors.assertClean();
});

test('Skip reaches a story choice and cannot make the decision for the player', async ({ page }, info) => {
  const errors = watchErrors(page);
  await page.goto(gameUrl(info, { test: 'scene', id: 'sc_mandrel_pre', quality: 'low' }));
  await expect(page.locator('.dialogue')).toBeVisible();
  await press(page, '.skipbtn', info);
  await waitForUiText(page, 'What will you do?');
  await press(page, '.skipbtn', info);
  await expect(page.locator('.menu .item')).toHaveCount(2);
  expect(await page.evaluate(() => {
    const flags = (window as any).__game.state.flags;
    return !!(flags.ch1_save_argan || flags.ch1_rout_brigade);
  })).toBe(false);
  await press(page, '.menu .item:has-text("Rout the enemy!")', info);
  await expect.poll(() => page.evaluate(() => (window as any).__game.state.flags.ch1_rout_brigade)).toBe(true);
  await expect(page.locator('.skipbtn')).toHaveCount(0);
  errors.assertClean();
});

test('Skip during portrait loading does not open another line or leave the actor talking', async ({ page }, info) => {
  const errors = watchErrors(page);
  // Intercept the first portrait request and press the real Skip control at the
  // asynchronous boundary. This deterministically exercises a slow-device race.
  await page.addInitScript(() => {
    let instance: any;
    Object.defineProperty(window, '__game', {
      configurable: true,
      get: () => instance,
      set(game) {
        instance = game;
        const original = game.charPortrait;
        let skipped = false;
        game.charPortrait = async function (...args: unknown[]) {
          if (!skipped) {
            skipped = true;
            (window as any).__skippedDuringPortrait = true;
            (document.querySelector('.skipbtn') as HTMLElement).click();
          }
          return original.apply(this, args);
        };
      },
    });
  });
  await page.goto(gameUrl(info, { test: 'scene', id: 'sc_pro_alazar', quality: 'low' }));
  await expect.poll(() => page.evaluate(() => (window as any).__skippedDuringPortrait)).toBe(true);
  await expect(page.locator('.skipbtn')).toHaveCount(0);
  await expect(page.locator('.dialogue')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__game.stage.views.get('alazar').anim.baseClip)).toBe('idle');
  errors.assertClean();
});
