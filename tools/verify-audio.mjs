// Run against a dev server: node tools/verify-audio.mjs http://127.0.0.1:5173
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.argv[2];
if (!base)
	throw new Error("Pass the URL of this game’s running Vite dev server.");
const manifest = JSON.parse(
	await readFile(
		new URL("../src/audio/manifest.json", import.meta.url),
		"utf8",
	),
);
const browser = await chromium.launch();
const output = new URL("./out/audio-verification/", import.meta.url);
await mkdir(output, { recursive: true });
try {
	const page = await browser.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	page.on("console", (m) => {
		if (m.type() === "error" || m.text().includes("[audio]"))
			errors.push(m.text());
	});
	await page.goto(new URL("audio-test.html", base).href);
	await page.locator("#unlock").click();
	await page.waitForFunction(() => window.audio?.unlocked);
	const decoded = [];
	// Decode every local file and inspect the actual samples, including each cue's excerpt.
	for (const [id, asset] of Object.entries(manifest.assets)) {
		const cues = Object.entries(manifest.sfx).filter(([, c]) => c.asset === id);
		const result = await page.evaluate(
			async ({ asset, cues }) => {
				const ctx = new AudioContext();
				try {
					const response = await fetch(new URL(asset.src, document.baseURI));
					if (!response.ok)
						throw new Error(`HTTP ${response.status}: ${asset.src}`);
					const buffer = await ctx.decodeAudioData(
						await response.arrayBuffer(),
					);
					const samples = buffer.getChannelData(0);
					const peak = (start, end) => {
						let max = 0;
						for (let i = start; i < end; i++)
							max = Math.max(max, Math.abs(samples[i]));
						return max;
					};
					return {
						duration: buffer.duration,
						peak: peak(0, samples.length),
						cues: cues.map(([name, c]) => ({
							name,
							peak: peak(
								Math.floor((c.offset ?? 0) * buffer.sampleRate),
								Math.min(
									samples.length,
									Math.floor(
										((c.offset ?? 0) + (c.duration ?? buffer.duration)) *
											buffer.sampleRate,
									),
								),
							),
						})),
					};
				} finally {
					await ctx.close();
				}
			},
			{ asset, cues },
		);
		assert.ok(result.peak > 0.0001, `${id} is silent`);
		assert.ok(
			Math.abs(result.duration - asset.duration) < 0.15,
			`${id} duration mismatch`,
		);
		for (const cue of result.cues)
			assert.ok(cue.peak > 0.0001, `${cue.name} excerpt is silent`);
		decoded.push({ id, ...result });
	}
	console.log(
		`Decoded ${decoded.length} files; every effect excerpt contains audio.`,
	);
	const playback = [];
	for (const id of Object.keys(manifest.music)) {
		await page.evaluate(
			(id) => audio.playMusic(id, { fade: 0, restart: true }),
			id,
		);
		await page.waitForFunction(
			(id) => audio.debug().track === id && audio.debug().time > 0.2,
			id,
		);
		await page.waitForFunction(() => {
			const b = new Float32Array(audio.analyser.fftSize);
			audio.analyser.getFloatTimeDomainData(b);
			return b.some((v) => Math.abs(v) > 0.0001);
		});
		playback.push(await page.evaluate(() => audio.debug()));
	}
	await page.locator("#stop").click();
	await page.waitForFunction(() => audio.debug().musicVoices === 0);
	await page
		.getByRole("button", { name: "SFX storm (voice limit)", exact: true })
		.click();
	await page.waitForFunction(() => audio.debug().sfxVoices > 2);
	assert.equal((await page.evaluate(() => audio.debug())).error, null);
	await page.waitForFunction(() => audio.debug().sfxVoices === 0);
	assert.deepEqual(errors, []);
	await page.screenshot({
		path: new URL("audition.png", output).pathname,
		fullPage: true,
	});
	await writeFile(
		new URL("results.json", output),
		JSON.stringify({ decoded, playback, errors }, null, 2),
	);
	console.log(
		`Played ${playback.length} music cues through the mixer; SFX stress and cleanup passed. No audio errors.`,
	);
} finally {
	await browser.close();
}
