import { afterEach, beforeEach, expect, it, vi } from "vitest";

type Handler = (e: Partial<PointerEvent>) => void;
function target() {
	const on: Record<string, Handler> = {};
	return {
		on,
		addEventListener: (type: string, f: Handler) => { on[type] = f; },
		removeEventListener: (type: string) => { delete on[type]; },
	};
}
const at = (pointerId: number, clientX: number, clientY: number) => ({ pointerId, clientX, clientY }) as PointerEvent;

let win: ReturnType<typeof target>;
beforeEach(() => {
	vi.resetModules();
	win = target();
	vi.stubGlobal("window", win);
});
afterEach(() => vi.unstubAllGlobals());

it("counts a still press and release as a tap, but not drags, stray releases or pinches", async () => {
	const { tapTracker } = await import("../src/ui/taps");
	const el = target();
	const taps = tapTracker(el as unknown as HTMLElement);
	el.on.pointerdown(at(1, 100, 100));
	expect(taps.tap(at(1, 104, 103))).toBe(true);
	el.on.pointerdown(at(1, 100, 100));
	expect(taps.tap(at(1, 140, 100))).toBe(false); // dragging the camera
	expect(taps.tap(at(2, 100, 100))).toBe(false); // released over the map after pressing a HUD button
	el.on.pointerdown(at(1, 100, 100));
	el.on.pointerdown(at(2, 300, 300));
	expect(taps.tap(at(1, 100, 100))).toBe(false); // the fingers of a pinch
	expect(taps.tap(at(2, 300, 300))).toBe(false);
	el.on.pointerdown(at(3, 100, 100));
	expect(taps.tap(at(3, 100, 100))).toBe(true); // a new gesture after the pinch
	taps.dispose();
	expect(el.on.pointerdown).toBeUndefined();
});

it("ignores the second click of a double-click that opened the picker, not a tap elsewhere", async () => {
	const { tapTracker } = await import("../src/ui/taps");
	tapTracker(target() as unknown as HTMLElement).dispose(); // installs the release watcher
	win.on.pointerup(at(1, 50, 50)); // the menu item's click
	const el = target();
	const taps = tapTracker(el as unknown as HTMLElement);
	el.on.pointerdown(at(1, 51, 50));
	expect(taps.tap(at(1, 51, 50))).toBe(false);
	el.on.pointerdown(at(1, 400, 200));
	expect(taps.tap(at(1, 400, 200))).toBe(true);
});
