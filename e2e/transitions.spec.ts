import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import type { Game } from "../src/game/game";

type TestWindow = Window & {
	__releaseStage: () => void;
	__firstSceneFrame?: { actors: number; covered: string };
	__battleFrames: Array<{ actors: number; battle: boolean }>;
	__screenSwaps: string[];
	__actorBuildCovered: string[];
	__loadingReveals: number[];
};

import {
	expectInViewport,
	expectNoHorizontalOverflow,
	expectRendering,
	gameUrl,
	press,
	watchErrors,
} from "./helpers";

test("startup has visible feedback even before the game bundle downloads", async ({
	page,
}, info) => {
	const errors = watchErrors(page);
	let release!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route("**/assets/index-*.js", async (route) => {
		await gate;
		await route.continue();
	});
	try {
		await page.goto(gameUrl(info), { waitUntil: "commit" });
		await expect(page.locator("#loading")).toBeVisible();
		await expect(page.getByRole("status")).toHaveText(
			"Preparing the chronicle…",
		);
		await expect(page.locator(".loading-spinner")).toBeVisible();
		await expectInViewport(page, "#loadmsg");
		// WebKit's screenshot command waits for pending module requests. Assert the
		// visible DOM here, then capture this engine's loader during the scene test.
		if (info.project.name === "chromium")
			await page.screenshot({ path: info.outputPath("startup-loading.png") });
	} finally {
		release();
	}
	await expect(page.locator(".title-menu")).toBeVisible();
	await expect(page.locator("#loading")).toHaveCount(0);
	await expectRendering(page);
	await expectNoHorizontalOverflow(page);
	errors.assertClean();
});

test("a slow scene stays covered, Menu works, and actors exist before the first revealed frame", async ({
	page,
}, info) => {
	const errors = watchErrors(page);
	await page.addInitScript(() => {
		let game: Game;
		Object.defineProperty(window, "__game", {
			configurable: true,
			get: () => game,
			set(value) {
				game = value;
				const original = game.makeStage;
				game.makeStage = async function (
					...args: Parameters<Game["makeStage"]>
				) {
					const stage = await original.apply(this, args);
					const render = stage.render.bind(stage);
					stage.render = () => {
						const loader = document.getElementById("loading");
						(window as unknown as TestWindow).__firstSceneFrame ??= {
							actors: stage.views.size,
							covered: loader ? getComputedStyle(loader).opacity : "missing",
						};
						render();
					};
					await new Promise<void>((resolve) => {
						(window as unknown as TestWindow).__releaseStage = resolve;
					});
					return stage;
				};
			},
		});
	});
	await page.goto(gameUrl(info, { test: "scene", id: "sc_pro_alazar" }));
	await expect
		.poll(() =>
			page.evaluate(
				() => typeof (window as unknown as TestWindow).__releaseStage,
			),
		)
		.toBe("function");
	await expect(page.locator("#loading")).toHaveCSS("opacity", "1");
	await expect(page.locator("#loadmsg")).toHaveText(/Preparing/);
	await expect(page.locator(".loading-spinner")).toBeVisible();
	// Clearing scene UI must never clear the loading overlay.
	await page.evaluate(() => {
		document.getElementById("ui")?.replaceChildren();
	});
	await expect(page.locator("#loading")).toBeVisible();
	const spinner = () =>
		page
			.locator(".loading-spinner")
			.evaluate((el) => getComputedStyle(el).transform);
	const transform = await spinner();
	await expect.poll(spinner).not.toBe(transform);
	await page.screenshot({ path: info.outputPath("scene-loading.png") });
	await press(page, ".game-menu-button", info);
	await expect(
		page.getByRole("dialog", { name: "Game Menu", exact: true }),
	).toBeVisible();
	await press(page, '.game-menu-home .btn:has-text("Resume Game")', info);
	await page.evaluate(() => (window as unknown as TestWindow).__releaseStage());
	await expect(page.locator("#loading")).toHaveCount(0);
	await expect(page.locator(".dialogue")).toBeVisible();
	expect(
		await page.evaluate(
			() => (window as unknown as TestWindow).__firstSceneFrame,
		),
	).toEqual({
		actors: 1,
		covered: "1",
	});
	await expect(page.locator(".fade")).toHaveCSS("opacity", "0");
	await expectRendering(page);
	await expectNoHorizontalOverflow(page);
	await page.screenshot({ path: info.outputPath("scene-ready.png") });
	errors.assertClean();
});

test("battle deployment and battle start render behind loading feedback", async ({
	page,
}, info) => {
	const errors = watchErrors(page);
	await page.addInitScript(() => {
		let game: Game;
		(window as unknown as TestWindow).__battleFrames = [];
		Object.defineProperty(window, "__game", {
			configurable: true,
			get: () => game,
			set(value) {
				game = value;
				const original = game.makeStage;
				game.makeStage = async function (
					...args: Parameters<Game["makeStage"]>
				) {
					const stage = await original.apply(this, args);
					const render = stage.render.bind(stage);
					stage.render = () => {
						const loader = document.getElementById("loading");
						if (loader && getComputedStyle(loader).opacity === "1") {
							(window as unknown as TestWindow).__battleFrames.push({
								actors: stage.views.size,
								battle: !!game.currentBattle,
							});
						}
						render();
					};
					return stage;
				};
			},
		});
	});
	await page.goto(gameUrl(info, { test: "battle", id: "b_galwyn" }));
	await expect(page.locator(".menu.deploy")).toBeVisible();
	await expect(page.locator("#loading")).toHaveCount(0);
	expect(
		await page.evaluate(() =>
			(window as unknown as TestWindow).__battleFrames.some(
				(f) => !f.battle && f.actors > 1,
			),
		),
	).toBe(true);
	await press(page, '.menu .item:has-text("Begin Battle")', info);
	await expect
		.poll(() =>
			page.evaluate(() =>
				(window as unknown as TestWindow).__battleFrames.some(
					(f) => f.battle && f.actors > 1,
				),
			),
		)
		.toBe(true);
	await expect(page.locator("#loading")).toHaveCount(0);
	await expect(page.locator(".dialogue")).toBeVisible();
	await expectRendering(page);
	errors.assertClean();
});

test("a failed scene explains the failure and offers reload instead of an endless spinner", async ({
	page,
}, info) => {
	await page.addInitScript(() => {
		let game: Game;
		Object.defineProperty(window, "__game", {
			configurable: true,
			get: () => game,
			set(value) {
				game = value;
				const original = game.makeStage;
				game.makeStage = async function (
					...args: Parameters<Game["makeStage"]>
				) {
					await original.apply(this, args);
					throw new Error("Scene preparation failed for test");
				};
			},
		});
	});
	await page.goto(
		gameUrl(info, { test: "scene", id: "sc_pro_alazar", quality: "low" }),
	);
	await expect(page.getByRole("status")).toHaveText(
		"Unable to load: Scene preparation failed for test",
	);
	await expect(page.getByRole("button", { name: "Reload game" })).toBeVisible();
	await expect(page.locator(".loading-spinner")).toHaveCount(0);
});

test("chapter cards remain visible and subsequent actor setup stays covered", async ({
	page,
}, info) => {
	const errors = watchErrors(page);
	await page.addInitScript(() => {
		const w = window as unknown as TestWindow;
		w.__actorBuildCovered = [];
		let game: Game;
		Object.defineProperty(window, "__game", {
			configurable: true,
			get: () => game,
			set(value) {
				game = value;
				const makeStage = game.makeStage;
				game.makeStage = async function (
					...args: Parameters<Game["makeStage"]>
				) {
					const stage = await makeStage.apply(this, args);
					const addUnit = stage.addUnit;
					stage.addUnit = function (...unitArgs) {
						const loader = document.getElementById("loading");
						w.__actorBuildCovered.push(
							loader ? getComputedStyle(loader).opacity : "missing",
						);
						return addUnit.apply(this, unitArgs);
					};
					return stage;
				};
			},
		});
	});
	await page.goto(gameUrl(info, { test: "scene", id: "sc_pro_orvelle_pre" }));
	await expect(page.locator(".titlecard")).toBeVisible();
	await expect(page.locator("#loading")).toHaveCount(0);
	await expect(page.locator(".titlecard")).toHaveCSS("opacity", "1");
	await page.keyboard.press("Enter");
	await expect(page.locator(".dialogue")).toBeVisible();
	await expect(page.locator("#loading")).toHaveCount(0);
	const covered = await page.evaluate(
		() => (window as unknown as TestWindow).__actorBuildCovered,
	);
	expect(covered.length).toBeGreaterThan(1);
	expect(
		covered.every((opacity) => opacity === "1"),
		JSON.stringify(covered),
	).toBe(true);
	await expect(page.locator(".fade")).toHaveCSS("opacity", "0");
	errors.assertClean();
});

test("skipping chapter cards does not flash an empty scene or restart the loader", async ({
	page,
}, info) => {
	const errors = watchErrors(page);
	await page.addInitScript(() => {
		const w = window as unknown as TestWindow & { __game?: Game };
		w.__loadingReveals = [];
		new MutationObserver((changes) => {
			for (const change of changes)
				for (const node of change.removedNodes) {
					if (node instanceof HTMLElement && node.id === "loading")
						w.__loadingReveals.push(w.__game?.stage?.views.size ?? 0);
				}
		}).observe(document, { childList: true, subtree: true });
	});
	await page.goto(
		gameUrl(info, { test: "scene", id: "sc_pro_orvelle_pre", autoplay: 1 }),
	);
	await expect
		.poll(() =>
			page.evaluate(
				() => (window as unknown as TestWindow).__loadingReveals.length,
			),
		)
		.toBeGreaterThan(0);
	await expect(page.locator(".skipbtn")).toHaveCount(0);
	await expect(page.locator("#loading")).toHaveCount(0);
	const reveals = await page.evaluate(
		() => (window as unknown as TestWindow).__loadingReveals,
	);
	expect(reveals).toHaveLength(1);
	expect(reveals[0]).toBeGreaterThan(1);
	errors.assertClean();
});

test("saved games and repeated world-map/title swaps stay covered and release input", async ({
	page,
}, info) => {
	const errors = watchErrors(page);
	const save = JSON.parse(
		execFileSync(
			process.execPath,
			["node_modules/.bin/vite-node", "e2e/fixtures/game-mode-save.ts"],
			{ encoding: "utf8" },
		),
	);
	await page.addInitScript((state) => {
		localStorage.setItem("fft-fealty-save-0", JSON.stringify(state));
		const w = window as unknown as TestWindow;
		w.__screenSwaps = [];
		let game: Game;
		Object.defineProperty(window, "__game", {
			configurable: true,
			get: () => game,
			set(value) {
				game = value;
				const original = game.setScreen;
				game.setScreen = function (screen) {
					const loader = document.getElementById("loading");
					w.__screenSwaps.push(
						loader ? getComputedStyle(loader).opacity : "missing",
					);
					original.call(this, screen);
				};
			},
		});
	}, save);
	await page.goto(gameUrl(info));
	for (let visit = 0; visit < 2; visit++) {
		await expect(page.locator(".title-menu")).toBeVisible();
		await expect(page.locator("#loading")).toHaveCount(0);
		await press(page, '.title-menu .item:has-text("Continue")', info);
		await press(
			page,
			'.game-mode-prompt .btn:has-text("Play in Browser")',
			info,
		);
		await expect(page.locator(".world-status")).toBeVisible();
		await expect(page.locator("#loading")).toHaveCount(0);
		await expectRendering(page);
		await page.screenshot({
			path: info.outputPath(`world-visit-${visit}.png`),
		});
		await press(page, ".game-menu-button", info);
		await press(page, '.menu .item:has-text("Return to Title")', info);
		await press(page, '.prompt .menu .item:has-text("Return to title")', info);
	}
	await expect(page.locator(".title-menu")).toBeVisible();
	await expect(page.locator("#loading")).toHaveCount(0);
	const swaps = await page.evaluate(
		() => (window as unknown as TestWindow).__screenSwaps,
	);
	expect(swaps.length).toBeGreaterThanOrEqual(5);
	expect(
		swaps.every((opacity) => opacity === "1"),
		JSON.stringify(swaps),
	).toBe(true);
	errors.assertClean();
});
