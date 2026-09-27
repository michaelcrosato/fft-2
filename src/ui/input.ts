// Unified input: keyboard, gamepad, mouse/touch. UI layers push handlers on a
// stack; only the top handler receives semantic actions. Analog gamepad state
// (sticks, triggers) is exposed in `input.pad` for continuous camera control.
export type Action =
  | 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'menu' | 'info'
  | 'rotL' | 'rotR' | 'zoomIn' | 'zoomOut' | 'tilt' | 'recenter' | 'prev' | 'next' | 'turnList' | 'fast';

export type Device = 'kb' | 'mouse' | 'touch' | 'pad';

export interface Handler { (a: Action, e?: KeyboardEvent): boolean | void }

const KEYMAP: Record<string, Action> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Enter: 'confirm', Space: 'confirm', KeyZ: 'confirm', NumpadEnter: 'confirm',
  Escape: 'cancel', Backspace: 'cancel', KeyX: 'cancel',
  KeyQ: 'rotL', KeyE: 'rotR', KeyR: 'tilt', Equal: 'zoomIn', Minus: 'zoomOut', NumpadAdd: 'zoomIn', NumpadSubtract: 'zoomOut',
  KeyF: 'recenter', KeyC: 'recenter', Home: 'recenter',
  Tab: 'turnList', KeyI: 'info', KeyM: 'menu', BracketLeft: 'prev', BracketRight: 'next', PageUp: 'prev', PageDown: 'next',
};
/** actions that auto-repeat while a key/button is held */
const REPEATS = new Set<Action>(['up', 'down', 'left', 'right', 'zoomIn', 'zoomOut', 'prev', 'next']);
/** keys the browser would otherwise act on (scrolling, focus change, history back) */
const PREVENT = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'PageUp', 'PageDown', 'Home']);

// Standard-mapping gamepad buttons (Xbox names; PlayStation: A=✕ B=○ X=□ Y=△).
const PAD_BUTTONS: Array<[number, Action]> = [
  [0, 'confirm'], [1, 'cancel'], [3, 'menu'], [9, 'menu'], [8, 'turnList'],
  [4, 'rotL'], [5, 'rotR'], [10, 'tilt'], [11, 'recenter'],
  [12, 'up'], [13, 'down'], [14, 'left'], [15, 'right'],
];
const PAD_FAST = 2;             // hold X / □ to fast-forward
const PAD_LT = 6, PAD_RT = 7;   // analog zoom
const STICK_DEAD = 0.22;
const PAD_REPEAT_FIRST = 320, PAD_REPEAT_NEXT = 90;

const KB_LABEL: Partial<Record<Action, string>> = {
  confirm: 'Enter', cancel: 'Esc', menu: 'M', rotL: 'Q', rotR: 'E', zoomIn: '+', zoomOut: '−', tilt: 'R', recenter: 'F',
  turnList: 'Tab', fast: 'Shift', up: '↑', down: '↓', left: '←', right: '→',
};
const PAD_LABEL: Partial<Record<Action, string>> = {
  confirm: 'A', cancel: 'B', menu: 'Start', rotL: 'LB', rotR: 'RB', zoomIn: 'RT', zoomOut: 'LT', tilt: 'L3', recenter: 'R3',
  turnList: 'View', fast: 'X', up: 'D-pad', down: 'D-pad', left: 'D-pad', right: 'D-pad',
};

function editable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

const dz = (v: number) => { const a = Math.abs(v); return a < STICK_DEAD ? 0 : Math.sign(v) * Math.min(1, (a - STICK_DEAD) / (1 - STICK_DEAD)); };

export interface PadState { connected: boolean; lx: number; ly: number; rx: number; ry: number; lt: number; rt: number }

class InputManager {
  private stack: Handler[] = [];
  private modalStack: Handler[] = [];
  private padPrev: boolean[] = [];
  private padRepeat = new Map<number, number>();
  private kbFast = false;
  private padFast = false;
  private deviceListeners = new Set<(d: Device) => void>();
  touch = false;
  lastDevice: Device = 'mouse';
  /** analog gamepad state (dead-zoned, merged across connected pads), refreshed every poll (~12 ms) */
  readonly pad: PadState = { connected: false, lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0 };
  /**
   * Set while a 3D view reads the right stick and triggers itself (battle camera).
   * Otherwise the triggers send discrete zoom actions and a right-stick flick rotates.
   */
  analogCamera = false;

  /** true while fast-forward is held (Shift or gamepad X) */
  get fast() { return this.kbFast || this.padFast; }

  init() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { this.kbFast = true; this.setDevice('kb'); return; }
      // leave browser/OS shortcuts (reload, zoom, close tab…) alone
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      let a: Action | undefined = KEYMAP[e.code];
      // typing in a text field: only Enter / Escape reach the game
      if (editable(e.target)) a = e.code === 'Enter' || e.code === 'NumpadEnter' ? 'confirm' : e.code === 'Escape' ? 'cancel' : undefined;
      // a focused <button> is pressed natively by Enter/Space; don't also send a confirm
      if ((e.target as HTMLElement | null)?.tagName === 'BUTTON' && (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space')) return;
      if (!a) return;
      this.setDevice('kb');
      if (PREVENT.has(e.code) && !editable(e.target)) e.preventDefault();
      if (e.repeat && !REPEATS.has(a)) return; // a held Enter must not click through several menus
      this.dispatch(a, e);
    });
    window.addEventListener('keyup', (e) => { if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.kbFast = false; });
    // keys released while the window was in the background never send keyup
    // (a pad button still held when focus returns must be released before it counts again)
    const reset = () => { this.kbFast = false; this.padFast = false; this.padResync = true; this.padRepeat.clear(); };
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
    window.addEventListener('pointerdown', (e) => {
      this.setDevice(e.pointerType === 'touch' ? 'touch' : 'mouse');
      if (e.pointerType === 'touch' && !this.touch) { this.touch = true; document.body.classList.add('touch'); }
    }, { capture: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    // iOS Safari: stop page pinch-zoom (the game handles pinch itself; touch-action covers other browsers)
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    // poll on a short timer rather than per rendered frame: a quick button tap (~50 ms) must not
    // fall between two frames when the game renders slowly (low-end phones, software GL)
    window.setInterval(() => this.pollPad(), 12);
  }

  push(h: Handler, modal = false): () => void {
    const stack = modal ? this.modalStack : this.stack;
    stack.push(h);
    return () => { const i = stack.lastIndexOf(h); if (i >= 0) stack.splice(i, 1); };
  }

  dispatch(a: Action, e?: KeyboardEvent) {
    const stack = this.modalStack.length ? this.modalStack : this.stack;
    for (let i = stack.length - 1; i >= 0; i--) {
      const r = stack[i](a, e);
      if (r !== false) return; // consumed (handlers return false to pass through)
    }
  }

  /** subscribe to the active input device changing (e.g. to swap button hints) */
  onDevice(cb: (d: Device) => void): () => void { this.deviceListeners.add(cb); return () => this.deviceListeners.delete(cb); }
  private setDevice(d: Device) {
    if (d === this.lastDevice) return;
    this.lastDevice = d;
    for (const cb of this.deviceListeners) cb(d);
  }

  /** `<kbd>` label for an action on the current device (help bars) */
  hint(a: Action): string {
    const l = (this.lastDevice === 'pad' ? PAD_LABEL : KB_LABEL)[a] ?? a;
    return `<kbd>${l}</kbd>`;
  }

  /** short controller rumble (only while the player is using a gamepad) */
  rumble(strength = 0.4, ms = 140) {
    if (this.lastDevice !== 'pad') return;
    for (const p of this.pads()) {
      const act = (p as Gamepad & { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } }).vibrationActuator;
      try { act?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strength), weakMagnitude: Math.min(1, strength * 0.6) })?.catch(() => {}); } catch { /* unsupported */ }
    }
  }

  private pads(): Gamepad[] {
    try { return [...(navigator.getGamepads?.() ?? [])].filter((p): p is Gamepad => !!p && p.connected); } catch { return []; }
  }

  private padResync = false;
  private pollPad() {
    if (typeof document !== 'undefined' && document.hidden) return; // a background tab takes no input
    const pads = this.pads();
    const st = this.pad;
    st.connected = pads.length > 0;
    if (!pads.length) { st.lx = st.ly = st.rx = st.ry = st.lt = st.rt = 0; this.padFast = false; return; }
    // merge every connected pad (whichever the player picked up)
    const pressed: boolean[] = [];
    const value: number[] = [];
    let lx = 0, ly = 0, rx = 0, ry = 0;
    const big = (a: number, b: number) => (Math.abs(b) > Math.abs(a) ? b : a);
    for (const p of pads) {
      p.buttons.forEach((b, i) => { pressed[i] = pressed[i] || b.pressed; value[i] = Math.max(value[i] ?? 0, b.value ?? (b.pressed ? 1 : 0)); });
      lx = big(lx, dz(p.axes[0] ?? 0)); ly = big(ly, dz(p.axes[1] ?? 0));
      rx = big(rx, dz(p.axes[2] ?? 0)); ry = big(ry, dz(p.axes[3] ?? 0));
    }
    const trig = (i: number) => { const v = value[i] ?? 0; return v < 0.08 ? 0 : v; };
    st.lx = lx; st.ly = ly; st.rx = rx; st.ry = ry; st.lt = trig(PAD_LT); st.rt = trig(PAD_RT);
    const now = performance.now();
    const edge = (key: number, down: boolean, a: Action) => {
      if (this.padResync) { this.padPrev[key] = down; return; }
      if (down && !this.padPrev[key]) { this.setDevice('pad'); this.dispatch(a); this.padRepeat.set(key, now + PAD_REPEAT_FIRST); }
      else if (down && REPEATS.has(a) && now > (this.padRepeat.get(key) ?? Infinity)) { this.dispatch(a); this.padRepeat.set(key, now + PAD_REPEAT_NEXT); }
      this.padPrev[key] = down;
    };
    for (const [b, a] of PAD_BUTTONS) edge(b, !!pressed[b], a);
    this.padFast = !!pressed[PAD_FAST];
    if (this.padFast) this.setDevice('pad');
    // left stick doubles as the d-pad
    const stick = Math.max(Math.abs(lx), Math.abs(ly)) < 0.55 ? null : Math.abs(lx) > Math.abs(ly) ? (lx > 0 ? 'right' : 'left') : (ly > 0 ? 'down' : 'up');
    for (const d of ['up', 'down', 'left', 'right'] as const) edge(100 + ['up', 'down', 'left', 'right'].indexOf(d), stick === d, d);
    if (!this.analogCamera) {
      // no 3D view is reading the analog camera controls: turn them into discrete actions
      edge(PAD_LT + 200, st.lt > 0.5, 'zoomOut');
      edge(PAD_RT + 200, st.rt > 0.5, 'zoomIn');
      edge(300, rx < -0.6, 'rotL');
      edge(301, rx > 0.6, 'rotR');
    } else {
      for (const k of [PAD_LT + 200, PAD_RT + 200, 300, 301]) this.padPrev[k] = true; // no stale edge when control returns
    }
    if (Math.abs(rx) + Math.abs(ry) + st.lt + st.rt > 0.3) this.setDevice('pad');
    this.padResync = false;
  }
}

export const input = new InputManager();
