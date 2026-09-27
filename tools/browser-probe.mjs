// Exercise the actual production game, not just browser startup. Run via
// tools/browser-test.sh --probe, or after a build under an available X display.
import { mkdir } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { preview } from "vite";

const outputDir = "tools/out/compatibility/probe";
await mkdir(outputDir, { recursive: true });
const server = await preview({
	preview: {
		host: "127.0.0.1",
		port: Number(process.env.E2E_PORT ?? 4173),
		strictPort: true,
	},
});
const baseURL = server.resolvedUrls.local[0];
try {
	for (const type of [chromium, firefox, webkit]) {
		let browser;
		try {
			browser = await type.launch({ headless: false });
			for (const renderer of ["webgl2", "webgl1"]) {
				const page = await browser.newPage({
					viewport: { width: 1280, height: 720 },
				});
				const errors = [];
				let actualBackend;
				page.on("pageerror", (error) => errors.push(error.message));
				page.on("console", (message) => {
					actualBackend =
						/\[renderer\] backend=(\w+)/.exec(message.text())?.[1] ??
						actualBackend;
				});
				const capability = await page.evaluate((name) => {
					const gl = document
						.createElement("canvas")
						.getContext(name === "webgl1" ? "webgl" : name);
					return gl ? gl.getParameter(gl.VERSION) : null;
				}, renderer);
				if (!capability) throw new Error(`${renderer} context unavailable`);
				await page.goto(`${baseURL}?renderer=${renderer}&quality=low`);
				await page.locator(".title-menu").waitFor({ timeout: 90_000 });
				const initialFrame = await page.evaluate(() => window.__frames ?? 0);
				await page.waitForFunction(
					(initial) => (window.__frames ?? 0) > initial + 2,
					initialFrame,
					{ timeout: 30_000 },
				);
				const appError = await page.evaluate(() => window.__error ?? null);
				if (appError) errors.push(appError);
				if (errors.length) throw new Error(errors.join("\n"));
				if (actualBackend !== renderer)
					throw new Error(
						`Requested ${renderer}; app selected ${actualBackend}`,
					);
				await page.screenshot({
					path: `${outputDir}/${type.name()}-${renderer}.png`,
				});
				console.log(
					JSON.stringify({
						browser: type.name(),
						version: browser.version(),
						renderer,
						capability,
						title: true,
						framesAdvance: true,
					}),
				);
				await page.close();
			}
		} catch (error) {
			console.error(`${type.name()}: ${error.stack ?? error}`);
			process.exitCode = 1;
		} finally {
			await browser?.close();
		}
	}
} finally {
	await new Promise((resolve, reject) =>
		server.httpServer.close((error) => (error ? reject(error) : resolve())),
	);
}
