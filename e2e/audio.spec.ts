import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import type { AudioManifest } from "../src/audio/manifest";

const manifest: AudioManifest = JSON.parse(
	readFileSync(new URL("../src/audio/manifest.json", import.meta.url), "utf8"),
);

import { gameUrl, press, waitForUiText, watchErrors } from "./helpers";

declare global {
	interface Window {
		audioProbe: {
			media: HTMLMediaElement[];
			meters: AnalyserNode[];
			effectStarts: number;
		};
	}
}

test("placeholder music and effects play through the production mixer after a gesture", async ({
	page,
}, info) => {
	const errors = watchErrors(page);
	const audioWarnings: string[] = [];
	const audioRequests: string[] = [];
	page.on("console", (message) => {
		if (message.text().startsWith("[audio]"))
			audioWarnings.push(message.text());
	});
	page.on("request", (request) => {
		if (/\.(mp3|wav)(?:\?|$)/.test(request.url()))
			audioRequests.push(request.url());
	});
	// Observe the real browser audio nodes; do not replace their playback behavior.
	await page.addInitScript(() => {
		window.audioProbe = { media: [], meters: [], effectStarts: 0 };
		const media = AudioContext.prototype.createMediaElementSource;
		AudioContext.prototype.createMediaElementSource = function (element) {
			window.audioProbe.media.push(element);
			return media.call(this, element);
		};
		const analyser = AudioContext.prototype.createAnalyser;
		AudioContext.prototype.createAnalyser = function () {
			const node = analyser.call(this);
			window.audioProbe.meters.push(node);
			return node;
		};
		const start = AudioBufferSourceNode.prototype.start;
		AudioBufferSourceNode.prototype.start = function (...args) {
			window.audioProbe.effectStarts++;
			return start.apply(this, args);
		};
	});
	await page.goto(gameUrl(info, { quality: "low" }));
	await waitForUiText(page, "New Game");
	await press(page, '.title-menu .item:has-text("Options")', info);
	await waitForUiText(page, "Music volume");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.audioProbe.media.some((m) => !m.paused && m.currentTime > 0.2),
			),
		)
		.toBe(true);
	const titleFile = manifest.assets[manifest.music.title.asset].src;
	expect(await page.evaluate(() => window.audioProbe.media[0].src)).toContain(
		titleFile,
	);
	expect(await page.evaluate(() => window.audioProbe.media[0].loop)).toBe(true);
	await expect
		.poll(() =>
			page.evaluate(() => {
				const meter = window.audioProbe.meters[0];
				if (!meter) return 0;
				const samples = new Float32Array(meter.fftSize);
				meter.getFloatTimeDomainData(samples);
				return samples.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
			}),
		)
		.toBeGreaterThan(0.0001);
	await press(page, '.item:has-text("Music volume")', info);
	await expect
		.poll(() => page.evaluate(() => window.audioProbe.effectStarts))
		.toBeGreaterThan(0);
	expect(audioRequests.length).toBeGreaterThan(1);
	const origin = new URL(page.url()).origin;
	expect(audioRequests.every((url) => new URL(url).origin === origin)).toBe(
		true,
	);
	expect(audioWarnings).toEqual([]);
	errors.assertClean();
});
