// Battle camera, gamepad and HUD layout checks on the first story battle.
import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { gameUrl, watchErrors, waitForUiText, uiText, press, expectNoHorizontalOverflow, expectInViewport, expectNoOverlap, installFakeGamepad, camState } from './helpers';

const BATTLE = { test: 'battle', id: 'b_galwyn', lv: 8 };
// headless browsers render in software: keep the scene light and the battle quick
const FAST = { ...BATTLE, quality: 'low' };

async function openDeployment(page: Page, info: TestInfo) {
  await page.goto(gameUrl(info, BATTLE));
  await waitForUiText(page, 'Begin Battle');
  await expect(page.locator('.camctl .cb')).toHaveCount(6);
}

const yawDelta = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

test('deployment: camera buttons are on screen and move the camera', async ({ page }, info) => {
  const w = watchErrors(page);
  await openDeployment(page, info);
  await expectInViewport(page, '.camctl');
  await expectNoOverlap(page, '.camctl', '.menu');
  await expectNoHorizontalOverflow(page);
  const c0 = (await camState(page))!;
  await press(page, '.camctl .cb[aria-label="Rotate right"]', info);
  await expect.poll(async () => yawDelta((await camState(page))!.yaw, c0.yaw)).toBeGreaterThan(1.2);
  await press(page, '.camctl .cb[aria-label="Tilt view"]', info);
  await expect.poll(async () => (await camState(page))!.pitch).toBeGreaterThan(c0.pitch + 0.2);
  // hold zoom-in
  const zin = page.locator('.camctl .cb[aria-label="Zoom in"]');
  await zin.dispatchEvent('pointerdown');
  await page.waitForTimeout(900);
  await zin.dispatchEvent('pointerup');
  await expect.poll(async () => (await camState(page))!.dist).toBeLessThan(c0.dist * 0.9);
  const c1 = (await camState(page))!;
  await press(page, '.camctl .cb[aria-label="Recenter"]', info);
  await expect.poll(async () => (await camState(page))!.dist).toBeGreaterThan(c1.dist * 1.05);
  await page.screenshot({ path: info.outputPath('deploy.png') });
  w.assertClean();
});

test('mouse: wheel zooms, right-drag pans, drag orbits', async ({ page }, info) => {
  test.skip(!!info.project.use.hasTouch, 'mouse only');
  const w = watchErrors(page);
  await openDeployment(page, info);
  const vp = page.viewportSize()!;
  const cx = vp.width * 0.6, cy = vp.height * 0.45;
  const c0 = (await camState(page))!;
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -400);
  await expect.poll(async () => (await camState(page))!.dist).toBeLessThan(c0.dist * 0.8);
  const c1 = (await camState(page))!;
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(cx - 120, cy - 60, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(async () => { const c = (await camState(page))!; return Math.hypot(c.x - c1.x, c.z - c1.z); }).toBeGreaterThan(1);
  // the deployment menu is still open: a right-drag is not "back"
  expect(await uiText(page)).toContain('Begin Battle');
  const c2 = (await camState(page))!;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 150, cy, { steps: 10 });
  await page.mouse.up();
  // settles on the nearest 45° diagonal, a quarter turn away
  await expect.poll(async () => yawDelta((await camState(page))!.yaw, c2.yaw)).toBeGreaterThan(1.2);
  w.assertClean();
});

test('gamepad: right stick orbits, triggers zoom, bumpers rotate', async ({ page }, info) => {
  const w = watchErrors(page);
  const pad = await installFakeGamepad(page);
  await openDeployment(page, info);
  const c0 = (await camState(page))!;
  await pad.hold(7, 1); // RT
  await expect.poll(async () => (await camState(page))!.dist, { timeout: 20_000 }).toBeLessThan(c0.dist * 0.85);
  await pad.hold(7, 0);
  await pad.axis(3, -1); // right stick up: lower, more horizontal view
  await expect.poll(async () => (await camState(page))!.pitch, { timeout: 20_000 }).toBeLessThan(c0.pitch - 0.1);
  await pad.axis(3, 0);
  const c1 = (await camState(page))!;
  await pad.axis(2, 1); // right stick right
  await expect.poll(async () => yawDelta((await camState(page))!.yaw, c1.yaw), { timeout: 20_000 }).toBeGreaterThan(0.3);
  await pad.axis(2, 0);
  // wait until the orbit has settled on its diagonal before measuring a 90° step
  let prev = NaN;
  await expect.poll(async () => { const y = (await camState(page))!.yaw; const still = Math.abs(y - prev) < 0.003; prev = y; return still; }, { timeout: 30_000, intervals: [400] }).toBe(true);
  const c2 = (await camState(page))!;
  await pad.tap(4); // LB
  await expect.poll(async () => yawDelta((await camState(page))!.yaw, c2.yaw), { timeout: 20_000 }).toBeGreaterThan(1.2);
  // A still works in the deployment menu (Begin Battle is preselected)
  await pad.tap(0);
  await expect.poll(async () => (await uiText(page)).includes('Begin Battle'), { timeout: 30_000 }).toBe(false);
  w.assertClean();
});

test('reaches the first player turn with a usable HUD', async ({ page }, info) => {
  const w = watchErrors(page);
  await page.addInitScript(() => { try { localStorage.setItem('fft-fealty-options', JSON.stringify({ battleSpeed: 2, textSpeed: 2.5 })); } catch { /* private mode */ } });
  await page.goto(gameUrl(info, FAST));
  await waitForUiText(page, 'Begin Battle');
  await press(page, '.menu .item:has-text("Begin Battle")', info);
  // skip the opening scene; wait for our first turn (enemies may act first)
  await expect.poll(async () => {
    const skip = page.locator('.btn.ghost:has-text("Skip")');
    if (await skip.isVisible().catch(() => false)) {
      // Software-rendered WebKit may need several frames for actionability.
      // Use the device's real interaction mode and allow the tap/click to land.
      await (info.project.use.hasTouch ? skip.tap({ timeout: 10_000 }) : skip.click({ timeout: 10_000 })).catch(() => {});
    }
    const t = await uiText(page);
    return t.includes('Move') && t.includes('Act') && t.includes('Wait');
  }, { timeout: 150_000, intervals: [1000] }).toBe(true);
  await expect(page.locator('.camctl')).toBeVisible();
  await expectInViewport(page, '.camctl');
  await expectInViewport(page, '.menu');
  await expectNoOverlap(page, '.camctl', '.menu');
  await expectNoOverlap(page, '.camctl', '.unitcard');
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: info.outputPath('turn.png') });
  w.assertClean();
});

test('a whole turn by touch or mouse: move, wait, face', async ({ page }, info) => {
  const w = watchErrors(page);
  await page.addInitScript(() => { try { localStorage.setItem('fft-fealty-options', JSON.stringify({ battleSpeed: 2, textSpeed: 2.5 })); } catch { /* private mode */ } });
  await page.goto(gameUrl(info, FAST));
  await waitForUiText(page, 'Begin Battle');
  await press(page, '.menu .item:has-text("Begin Battle")', info);
  await expect.poll(async () => {
    const skip = page.locator('.btn.ghost:has-text("Skip")');
    if (await skip.isVisible().catch(() => false)) {
      await (info.project.use.hasTouch ? skip.tap({ timeout: 10_000 }) : skip.click({ timeout: 10_000 })).catch(() => {});
    }
    const t = await uiText(page);
    return t.includes('Move') && t.includes('Act') && t.includes('Wait');
  }, { timeout: 150_000, intervals: [1000] }).toBe(true);
  const active = () => page.evaluate(() => { const b = (window as any).__game.currentBattle; const u = b.active; return { uid: u.uid, x: u.x, z: u.z }; });
  const u0 = await active();
  await press(page, '.menu .item:has-text("Move")', info);
  await expect(page.locator('.hudback')).toBeVisible();
  // the camera glides to the unit first; measure tile positions once it has settled
  let prev = '';
  await expect.poll(async () => { const c = (await camState(page))!; const k = [c.x, c.z, c.yaw, c.dist].map((v) => v.toFixed(2)).join(); const still = k === prev; prev = k; return still; }, { timeout: 30_000, intervals: [500] }).toBe(true);
  // a reachable tile away from the unit, and where it is on screen
  const target = await page.evaluate(() => {
    const g = (window as any).__game, b = g.currentBattle, u = b.active, st = g.stage;
    const cells = b.moveRange(u).filter((c: any) => (c.x !== u.x || c.z !== u.z) && !b.unitAt(c.x, c.z));
    cells.sort((p: any, q: any) => (Math.abs(q.x - u.x) + Math.abs(q.z - u.z)) - (Math.abs(p.x - u.x) + Math.abs(p.z - u.z)));
    for (const c of cells.slice(0, 12)) {
      const s = st.toScreen(st.tileWorld(c.x, c.z));
      if (s.visible && s.x > 40 && s.y > 40 && s.x < innerWidth - 40 && s.y < innerHeight - 160) {
        const hit = st.pickCell(s.x, s.y);
        if (hit && hit[0] === c.x && hit[1] === c.z) return { x: c.x, z: c.z, sx: s.x, sy: s.y };
      }
    }
    return null;
  });
  test.skip(!target, 'no unobstructed tile on screen at this camera angle');
  const tapTile = async () => { if (info.project.use.hasTouch) await page.touchscreen.tap(target!.sx, target!.sy); else await page.mouse.click(target!.sx, target!.sy); };
  await tapTile();
  if (info.project.use.hasTouch) { await page.waitForTimeout(400); await tapTile(); } // touch: the first tap only moves the cursor
  await expect.poll(async () => { const u = await active(); return u.x === target!.x && u.z === target!.z; }, { timeout: 60_000 }).toBe(true);
  expect((await active()).uid).toBe(u0.uid);
  // back at the command menu: Move is spent, Wait ends the turn after choosing a facing
  await waitForUiText(page, 'Wait');
  await press(page, '.menu .item:has-text("Wait")', info);
  const facing = () => page.evaluate(() => (window as any).__game.stage.isHighlighted('facing'));
  await expect.poll(facing, { timeout: 60_000 }).toBe(true);
  // Back from the facing step returns to the command menu (the turn isn't over yet)
  await press(page, '.hudback', info);
  await expect.poll(facing, { timeout: 30_000 }).toBe(false);
  await waitForUiText(page, 'Wait');
  expect((await active()).uid).toBe(u0.uid);
  await press(page, '.menu .item:has-text("Wait")', info);
  await expect.poll(facing, { timeout: 60_000 }).toBe(true);
  const nb = await page.evaluate(() => { const g = (window as any).__game, u = g.currentBattle.active, st = g.stage; const s = st.toScreen(st.tileWorld(u.x + (u.x > 0 ? -1 : 1), u.z)); return s; });
  if (info.project.use.hasTouch) await page.touchscreen.tap(nb.x, nb.y); else await page.mouse.click(nb.x, nb.y);
  await expect.poll(() => page.evaluate(() => (window as any).__game.stage.isHighlighted('facing')), { timeout: 30_000 }).toBe(false);
  w.assertClean();
});
