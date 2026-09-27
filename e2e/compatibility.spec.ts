import { expect, test } from '@playwright/test';
import {
  expectInViewport,
  expectNoHorizontalOverflow,
  expectNoOverlap,
  expectRendering,
  gameUrl,
  press,
  waitForUiText,
  watchErrors,
} from './helpers';

test('falls back to WebGL 1 when modern graphics APIs are unavailable', async ({
  page,
}, info) => {
  const errors = watchErrors(page);
  let backend = '';
  page.on('console', (message) => {
    const match = /\[renderer\] backend=(\w+)/.exec(message.text());
    if (match) backend = match[1];
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', {
      configurable: true,
      value: undefined,
    });
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind,
      ...args
    ) {
      if (kind === 'webgl2') return null;
      return Reflect.apply(getContext, this, [kind, ...args]);
    } as typeof getContext;
  });
  await page.goto(
    gameUrl(info, {
      test: 'battle',
      id: 'b_galwyn',
      quality: 'low',
      renderer: 'webgpu',
    }),
  );
  await waitForUiText(page, 'Begin Battle');
  await expectRendering(page);
  expect(backend).toBe('webgl1');
  await expect(page.locator('#gl')).toBeVisible();
  await expectInViewport(page, '.camctl');
  errors.assertClean();
});

test('denied browser storage still permits a new game and options', async ({
  page,
}, info) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem']) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value() {
          throw new DOMException('Storage is disabled', 'SecurityError');
        },
      });
    }
  });
  await page.goto(gameUrl(info, { quality: 'low' }));
  await waitForUiText(page, 'New Game');
  await press(page, '.title-menu .item:has-text("Options")', info);
  await waitForUiText(page, 'Gentle mode');
  await press(page, '.menu .item:has-text("Gentle mode")', info);
  await expect(
    page.locator('.menu .item:has-text("Gentle mode")'),
  ).toContainText('On');
  await press(page, '.menu .mclose', info);
  await press(page, '.title-menu .item:has-text("New Game")', info);
  await expect(page.getByText('Name your hero')).toBeVisible();
  await press(page, '.btn:has-text("Begin the Tale")', info);
  await press(page, '.game-mode-prompt .btn:has-text("Play in Browser")', info);
  await expect(
    page.locator('.narration, .titlecard, .dialogue').first(),
  ).toBeVisible();
  errors.assertClean();
});

test('reference menus remain usable after portrait and landscape resizing', async ({
  page,
  browserName,
}, info) => {
  const errors = watchErrors(page);
  await page.goto(gameUrl(info, { test: 'chronicle', quality: 'low' }));
  await waitForUiText(page, 'Bestiary');
  await press(page, '.menu .item:has-text("Bestiary")', info);
  await waitForUiText(page, 'Class evasion');
  for (const viewport of [
    { width: 375, height: 667 },
    { width: 667, height: 375 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    if (browserName === 'webkit' && info.project.use.isMobile) {
      // Mobile WebKit emulation can retain the previous device-width after
      // setViewportSize resets screen size. This also reproduces on a blank
      // page. Reparse the unchanged viewport declaration; don't alter app CSS.
      await page.evaluate(() => {
        const meta = document.querySelector<HTMLMetaElement>(
          'meta[name="viewport"]',
        );
        if (meta) meta.setAttribute('content', meta.content);
      });
    }
    await expect
      .poll(() => page.evaluate(() => innerWidth))
      .toBe(viewport.width);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.clientWidth))
      .toBe(viewport.width);
    await expectInViewport(page, '.menu');
    await expectInViewport(page, '.panel.detail');
    await expectNoOverlap(page, '.menu', '.panel.detail');
    await expectNoHorizontalOverflow(page);
    const pane = page.getByRole('region');
    await pane.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.keyboard.press('PageDown');
    await expect
      .poll(() => pane.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0);
  }
  await press(page, '.menu .mclose', info);
  await waitForUiText(page, 'Atlas of Ivaldis');
  errors.assertClean();
});

test('held camera zoom stops when the window loses focus or the tab is hidden', async ({
  page,
}, info) => {
  const errors = watchErrors(page);
  await page.goto(
    gameUrl(info, { test: 'battle', id: 'b_galwyn', quality: 'low' }),
  );
  await waitForUiText(page, 'Begin Battle');
  const zoom = page.getByRole('button', { name: 'Zoom out', exact: true });
  for (const interruption of ['blur', 'hidden'] as const) {
    const result = await zoom.evaluate(async (button, reason) => {
      const camera = (window as any).__game.stage.cam;
      const originalZoom = camera.zoom;
      let commands = 0;
      camera.zoom = function (factor: number) {
        commands++;
        return originalZoom.call(this, factor);
      };
      const hiddenDescriptor = Object.getOwnPropertyDescriptor(
        document,
        'hidden',
      );
      try {
        button.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerType: 'touch',
            bubbles: true,
            cancelable: true,
          }),
        );
        const initialCommands = commands;
        if (reason === 'blur') window.dispatchEvent(new Event('blur'));
        else {
          Object.defineProperty(document, 'hidden', {
            configurable: true,
            value: true,
          });
          document.dispatchEvent(new Event('visibilitychange'));
          // Returning to the tab must not resume the old press.
          Object.defineProperty(document, 'hidden', {
            configurable: true,
            value: false,
          });
          document.dispatchEvent(new Event('visibilitychange'));
        }
        await new Promise((resolve) => setTimeout(resolve, 350));
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        return { initialCommands, commands };
      } finally {
        button.dispatchEvent(new PointerEvent('pointercancel'));
        camera.zoom = originalZoom;
        if (hiddenDescriptor)
          Object.defineProperty(document, 'hidden', hiddenDescriptor);
        else Reflect.deleteProperty(document, 'hidden');
      }
    }, interruption);
    expect(result.initialCommands).toBe(1);
    expect(
      result.commands,
      `${interruption} must cancel the pending hold`,
    ).toBe(1);
  }
  errors.assertClean();
});
