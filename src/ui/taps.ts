// Tells a deliberate tap or click on the 3D view apart from camera gestures and stray input.

/** the most recent release anywhere: the click or tap that opened a picker */
let lastRelease = { x: NaN, y: NaN, t: -Infinity };
let watching = false;

/**
 * A release completes a tap only if its own press started on `el`, moved at most `slop` pixels,
 * and no other pointer joined in (a pinch). A press on the same spot as the click that opened the
 * picker, within `repeatMs`, is the second half of a double-click (or double-tap) on a menu item.
 */
export function tapTracker(el: HTMLElement, slop = 10, repeatMs = 400) {
  if (!watching) {
    watching = true;
    window.addEventListener('pointerup', (e) => { lastRelease = { x: e.clientX, y: e.clientY, t: performance.now() }; }, true);
  }
  const opener = lastRelease;
  const downs = new Map<number, { x: number; y: number; repeat: boolean }>();
  let multi = false;
  const down = (e: PointerEvent) => {
    if (!downs.size) multi = false;
    const repeat = performance.now() - opener.t < repeatMs && Math.hypot(e.clientX - opener.x, e.clientY - opener.y) <= slop;
    downs.set(e.pointerId, { x: e.clientX, y: e.clientY, repeat });
    if (downs.size > 1) multi = true;
  };
  const cancel = (e: PointerEvent) => { downs.delete(e.pointerId); };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointercancel', cancel);
  return {
    /** call from pointerup: true if this release completes a tap */
    tap(e: PointerEvent): boolean {
      const d = downs.get(e.pointerId);
      downs.delete(e.pointerId);
      return !!d && !d.repeat && !multi && Math.hypot(e.clientX - d.x, e.clientY - d.y) <= slop;
    },
    dispose() {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointercancel', cancel);
    },
  };
}
