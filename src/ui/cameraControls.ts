// On-screen battle camera buttons: rotate, zoom (hold to keep zooming), tilt, recenter.
// Mouse, keyboard and gamepad users have the same controls on keys/sticks; these make
// them discoverable and give touch players a way to do everything without gestures.
import { h, uiRoot } from './dom';
import type { Stage } from '../scenes/stage';

const svg = (d: string) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  rotL: svg('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 3v5h5"/>'),
  rotR: svg('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3v5h-5"/>'),
  zoomIn: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6"/>'),
  zoomOut: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M7.5 10.5h6"/>'),
  tilt: svg('<path d="M3 19h18"/><path d="M6 19l6-12 6 12"/><path d="M12 3v2"/>'),
  recenter: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
};

export class CameraControls {
  readonly el: HTMLElement;
  private raf = 0;
  private stopHold: (() => void) | null = null;
  private onBlur = () => this.stopHold?.();
  private onVisibilityChange = () => { if (document.hidden) this.stopHold?.(); };

  constructor(private stage: Stage) {
    const btn = (id: keyof typeof ICONS, label: string, kb: string, act: () => void, hold = false) => {
      const b = h('button.cb', { type: 'button', title: `${label} (${kb})`, 'aria-label': label, html: ICONS[id] });
      if (hold) {
        // hold to zoom smoothly; a tap still zooms one step
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.hold(id === 'zoomIn' ? -1 : 1); });
        for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => this.stopHold?.());
      } else b.addEventListener('click', (e) => { e.stopPropagation(); b.blur(); act(); });
      // never keep focus: Enter/Space must keep going to the game's menus, not re-press this button
      b.addEventListener('mousedown', (e) => e.preventDefault());
      return b;
    };
    const cam = () => this.stage.cam;
    this.el = h('div.camctl', { role: 'toolbar', 'aria-label': 'Camera' },
      btn('rotL', 'Rotate left', 'Q', () => cam().rotate(-1)),
      btn('rotR', 'Rotate right', 'E', () => cam().rotate(1)),
      btn('zoomIn', 'Zoom in', '+ / wheel', () => {}, true),
      btn('zoomOut', 'Zoom out', '− / wheel', () => {}, true),
      btn('tilt', 'Tilt view', 'R', () => cam().togglePitch()),
      btn('recenter', 'Recenter', 'F', () => cam().recenter()),
    );
    uiRoot().appendChild(this.el);
    // A release in another app/tab may never reach the original button.
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private hold(dir: 1 | -1) {
    this.stopHold?.();
    let last = performance.now();
    const t0 = last;
    this.stage.cam.zoom(dir < 0 ? 0.9 : 1.11);
    const tick = () => {
      const now = performance.now();
      if (now - t0 > 250) this.stage.cam.zoom(Math.exp(dir * ((now - last) / 1000) * 1.5));
      last = now;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    this.stopHold = () => { cancelAnimationFrame(this.raf); this.stopHold = null; };
  }

  dispose() {
    this.stopHold?.();
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.el.remove();
  }
}
