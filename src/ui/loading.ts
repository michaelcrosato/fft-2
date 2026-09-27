import { h } from "./dom";
import { input } from "./input";

/** Yield through a browser paint, not just a microtask, before expensive work. */
export const paintLoading = () =>
	new Promise<void>((resolve) => {
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
	});
const delay = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

class LoadingScreen {
	private el: HTMLElement | null = null;
	private pop: (() => void) | null = null;
	private finishing: Promise<void> | null = null;
	private failed = false;
	/** Suppress expensive rendering of the outgoing/half-built scene. */
	preparing = false;

	async begin(message: string) {
		if (this.finishing) await this.finishing;
		this.preparing = true;
		let fresh = false;
		if (!this.el) {
			this.el = document.getElementById("loading");
			if (!this.el) {
				fresh = true;
				this.el = h(
					"div.loading",
					{ id: "loading", style: { opacity: "0" } },
					h("div.loading-spinner", { "aria-hidden": "true" }),
					h("div.loading-title", null, "Loading…"),
					h("div", { id: "loadmsg", role: "status", "aria-live": "polite" }),
				);
				document.body.appendChild(this.el);
			}
			// Outside #ui so clearing menus or scripted fades cannot remove the loader.
			this.el.setAttribute("aria-label", "Loading game");
			document.getElementById("app")?.setAttribute("aria-busy", "true");
			this.pop = input.push(() => true, true);
		}
		this.message(message);
		await paintLoading();
		if (fresh) {
			this.el.style.opacity = "1";
			await delay(180);
		}
		await paintLoading();
	}

	message(text: string) {
		if (this.failed) return;
		const label = this.el?.querySelector("#loadmsg");
		if (label) label.textContent = text;
	}

	async finish() {
		if (this.failed) return;
		if (this.finishing) return this.finishing;
		const el = this.el ?? document.getElementById("loading");
		if (!el) return;
		this.finishing = (async () => {
			this.preparing = false;
			await paintLoading();
			if (this.failed) return;
			el.style.opacity = "0";
			await delay(
				matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220,
			);
			if (this.failed) return;
			el.remove();
			this.el = null;
			this.pop?.();
			this.pop = null;
			document.getElementById("app")?.removeAttribute("aria-busy");
		})();
		try {
			await this.finishing;
		} finally {
			this.finishing = null;
		}
	}

	fail(error: unknown) {
		this.failed = true;
		this.preparing = true;
		this.el ??=
			document.getElementById("loading") ??
			h(
				"div.loading",
				{ id: "loading" },
				h("div.loading-title", null, "Unable to continue"),
				h("div", { id: "loadmsg", role: "alert" }),
			);
		const el = this.el;
		if (!el.isConnected) document.body.appendChild(el);
		el.style.opacity = "1";
		el.querySelector(".loading-spinner")?.remove();
		el.querySelector(".bar")?.remove();
		const label = el.querySelector("#loadmsg");
		if (label)
			label.textContent = `Unable to load: ${error instanceof Error ? error.message : String(error)}`;
		el.querySelector("button")?.remove();
		this.pop?.();
		this.pop = input.push((action) => {
			if (action === "confirm") location.reload();
			return true;
		}, true);
		const button = h(
			"button.btn",
			{ type: "button", onclick: () => location.reload() },
			"Reload game",
		);
		el.appendChild(button);
		button.focus();
	}
}

export const loading = new LoadingScreen();
