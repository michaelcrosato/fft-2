// Unified input: keyboard, gamepad, mouse/touch. UI layers push handlers on a
// stack; only the top handler receives semantic actions.
export type Action =
  | 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'menu' | 'info'
  | 'rotL' | 'rotR' | 'zoomIn' | 'zoomOut' | 'tilt' | 'prev' | 'next' | 'turnList' | 'fast';

export interface Handler { (a: Action, e?: KeyboardEvent): boolean | void }

const KEYMAP: Record<string, Action> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Enter: 'confirm', Space: 'confirm', KeyZ: 'confirm', NumpadEnter: 'confirm',
  Escape: 'cancel', Backspace: 'cancel', KeyX: 'cancel',
  KeyQ: 'rotL', KeyE: 'rotR', KeyR: 'tilt', Equal: 'zoomIn', Minus: 'zoomOut', NumpadAdd: 'zoomIn', NumpadSubtract: 'zoomOut',
  Tab: 'turnList', KeyI: 'info', KeyC: 'info', KeyM: 'menu', BracketLeft: 'prev', BracketRight: 'next', PageUp: 'prev', PageDown: 'next',
  ShiftLeft: 'fast', ShiftRight: 'fast',
};

class InputManager {
  private stack: Handler[] = [];
  private held = new Set<string>();
  private padPrev: boolean[] = [];
  private padRepeat = new Map<number, number>();
  /** true while fast-forward key is held */
  fast = false;
  touch = false;
  lastDevice: 'kb' | 'mouse' | 'touch' | 'pad' = 'mouse';

  init() {
    window.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      this.lastDevice = 'kb';
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { this.fast = true; return; }
      if (!a) return;
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Backspace') e.preventDefault();
      this.dispatch(a, e);
    });
    window.addEventListener('keyup', (e) => { if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.fast = false; this.held.delete(e.code); });
    window.addEventListener('pointerdown', (e) => {
      this.lastDevice = e.pointerType === 'touch' ? 'touch' : 'mouse';
      if (e.pointerType === 'touch' && !this.touch) { this.touch = true; document.body.classList.add('touch'); }
    }, { capture: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    const poll = () => { this.pollPad(); requestAnimationFrame(poll); };
    requestAnimationFrame(poll);
  }

  push(h: Handler): () => void {
    this.stack.push(h);
    return () => { const i = this.stack.lastIndexOf(h); if (i >= 0) this.stack.splice(i, 1); };
  }

  dispatch(a: Action, e?: KeyboardEvent) {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const r = this.stack[i](a, e);
      if (r !== false) return; // consumed (handlers return false to pass through)
    }
  }

  private pollPad() {
    const pads = navigator.getGamepads?.() ?? [];
    const p = pads.find((x) => x && x.connected);
    if (!p) return;
    const map: Array<[number, Action]> = [[12, 'up'], [13, 'down'], [14, 'left'], [15, 'right'], [0, 'confirm'], [1, 'cancel'], [3, 'menu'], [2, 'info'], [4, 'rotL'], [5, 'rotR'], [6, 'zoomOut'], [7, 'zoomIn'], [8, 'turnList'], [9, 'menu']];
    const now = performance.now();
    for (const [b, a] of map) {
      const down = !!p.buttons[b]?.pressed;
      if (down && !this.padPrev[b]) { this.lastDevice = 'pad'; this.dispatch(a); this.padRepeat.set(b, now + 380); }
      else if (down && ['up', 'down', 'left', 'right'].includes(a) && now > (this.padRepeat.get(b) ?? Infinity)) { this.dispatch(a); this.padRepeat.set(b, now + 90); }
      this.padPrev[b] = down;
    }
    // left stick as dpad
    const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
    const stick = Math.abs(ax) > 0.6 ? (ax > 0 ? 'right' : 'left') : Math.abs(ay) > 0.6 ? (ay > 0 ? 'down' : 'up') : null;
    const key = 100;
    if (stick && !this.padPrev[key]) { this.dispatch(stick as Action); this.padRepeat.set(key, now + 380); }
    else if (stick && now > (this.padRepeat.get(key) ?? Infinity)) { this.dispatch(stick as Action); this.padRepeat.set(key, now + 110); }
    this.padPrev[key] = !!stick;
    this.fast = this.fast || !!p.buttons[7]?.pressed && false;
  }
}

export const input = new InputManager();
