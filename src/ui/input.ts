// Unified input: keyboard, gamepad, mouse/touch. UI layers push handlers on a
// stack; only the top handler receives semantic actions. Analog gamepad state
// (sticks, triggers) is exposed in `input.pad` for continuous camera control.
import { loadOptions } from '../game/state';

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

// Standard-mapping gamepad buttons (Xbox names; PlayStation: A=✕ B=○ X=□ Y=△). Create (8) and
// Options (9) are handled apart: 52in1 opens its bar when both are held, and keeps PS (16) for itself.
const PAD_BUTTONS: Array<[number, Action]> = [
  [0, 'confirm'], [1, 'cancel'], [3, 'menu'],
  [4, 'rotL'], [5, 'rotR'], [10, 'tilt'], [11, 'recenter'],
  [12, 'up'], [13, 'down'], [14, 'left'], [15, 'right'],
  [17, 'turnList'], // a DualSense's touchpad press (Chrome, Edge)
];
const PAD_CREATE = 8, PAD_OPTIONS = 9;
const PAD_FAST = 2;             // hold X / □ to fast-forward
const PAD_LT = 6, PAD_RT = 7;   // analog zoom
const STICK_DEAD = 0.22;
const PAD_REPEAT_FIRST = 320, PAD_REPEAT_NEXT = 90;

const KB_LABEL: Partial<Record<Action, string>> = {
  confirm: 'Enter', cancel: 'Esc', menu: 'M', rotL: 'Q', rotR: 'E', zoomIn: '+', zoomOut: '−', tilt: 'R', recenter: 'F',
  turnList: 'Tab', fast: 'Shift', up: '↑', down: '↓', left: '←', right: '→',
};
/** The physical keys behind the letter labels above. */
const LETTER_CODE: Partial<Record<string, string>> = { menu: 'KeyM', rotL: 'KeyQ', rotR: 'KeyE', tilt: 'KeyR', recenter: 'KeyF' };
const PAD_LABEL: Partial<Record<string, string>> = {
  confirm: 'A', cancel: 'B', menu: 'Menu', rotL: 'LB', rotR: 'RB', zoomIn: 'RT', zoomOut: 'LT', tilt: 'LS', recenter: 'RS',
  turnList: 'View', fast: 'X', up: 'D-pad', down: 'D-pad', left: 'D-pad', right: 'D-pad',
  arrows: 'D-pad', updown: 'D-pad', orbit: 'RS', zoom: 'LT/RT',
};
/** PlayStation's own glyphs and names. */
const PS_LABEL: Partial<Record<string, string>> = {
  confirm: '✕', cancel: '○', menu: 'Options', rotL: 'L1', rotR: 'R1', zoomIn: 'R2', zoomOut: 'L2', tilt: 'L3', recenter: 'R3',
  turnList: 'Create', fast: '□', up: 'D-pad', down: 'D-pad', left: 'D-pad', right: 'D-pad',
  arrows: 'D-pad', updown: 'D-pad', orbit: 'R3 stick', zoom: 'L2/R2',
};
export type PadKind = 'playstation' | 'xbox' | 'generic';
/** Which family a controller belongs to, from its id. */
export function padKindOf(id: string): PadKind {
  // Xbox first: its id says "Xbox Wireless Controller"; PlayStation pads always carry Sony's 054c or their name
  if (/045e|xbox|xinput/i.test(id)) return 'xbox';
  if (/054c|dualsense|dualshock|playstation/i.test(id)) return 'playstation';
  return 'generic';
}
type Haptic = 'hit' | 'heavy' | 'crit' | 'ko' | 'spell' | 'level' | 'land'
  // a spell's impact, by its element
  | 'fire' | 'ice' | 'lightning' | 'water' | 'earth' | 'wind' | 'holy' | 'dark';
/** Short, distinct pulses: [strong motor, weak motor, ms, delay ms]. */
const HAPTICS: Record<Haptic, Array<[number, number, number, number]>> = {
  hit: [[0.3, 0.5, 60, 0]],
  heavy: [[0.85, 0.5, 120, 0]],
  crit: [[1, 0.9, 90, 0], [0.4, 0.8, 60, 120]],
  ko: [[0.7, 0.3, 90, 0], [0.7, 0.3, 110, 170]],
  spell: [[0.15, 0.75, 140, 0]],
  level: [[0, 0.35, 60, 0], [0, 0.55, 60, 100], [0, 0.8, 90, 200]],
  land: [[0.55, 0.15, 55, 0]],
  // spells by element: fire swells, ice snaps, lightning crackles, water rolls, earth rumbles low,
  // wind brushes past, holy rings, darkness throbs
  fire: [[0.2, 0.5, 70, 0], [0.45, 0.8, 110, 80]],
  ice: [[0, 0.9, 45, 0]],
  lightning: [[0.1, 0.9, 30, 0], [0.1, 0.9, 30, 60], [0.3, 1, 40, 120]],
  water: [[0.25, 0.45, 160, 0]],
  earth: [[0.9, 0.1, 180, 0]],
  wind: [[0, 0.35, 220, 0]],
  holy: [[0, 0.6, 60, 0], [0, 0.4, 120, 90]],
  dark: [[0.6, 0.2, 90, 0], [0.6, 0.2, 90, 200]],
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
    this.readLayout();
    window.addEventListener('keydown', (e) => {
      // keys that pick or cancel an IME conversion (typing a name in Japanese, Chinese…) are not game input
      if (e.isComposing || e.keyCode === 229) return;
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
    // fall between two frames when the game renders slowly (low-end phones, software GL).
    // Until a controller shows up, a few checks a second are enough (and spare phone batteries).
    let timer = 0;
    const loop = () => { this.pollPad(); timer = window.setTimeout(loop, this.pad.connected ? 12 : 250); };
    window.addEventListener('gamepadconnected', () => { clearTimeout(timer); loop(); });
    loop();
  }

  push(h: Handler, modal = false): () => void {
    const stack = modal ? this.modalStack : this.stack;
    stack.push(h);
    return () => { const i = stack.lastIndexOf(h); if (i >= 0) stack.splice(i, 1); };
  }

  /** M / Start / Y outside modal layers: the pause menu (registered by the Game Menu) */
  menuShortcut: (() => boolean) | null = null;

  dispatch(a: Action, e?: KeyboardEvent) {
    if (a === 'menu' && !this.modalStack.length && this.menuShortcut?.()) return;
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
    return `<kbd>${this.label(a)}</kbd>`;
  }

  /**
   * The key or button that does an action on the device in use, as plain text: what a {key:…}
   * tag in a line shows. Besides the actions, `arrows`, `updown` and `orbit` name groups of controls.
   */
  label(a: string): string {
    if (this.lastDevice === 'pad') return (this.padGlyphs() === 'playstation' ? PS_LABEL : PAD_LABEL)[a] ?? a;
    const table: Record<string, string | undefined> = { ...KB_LABEL, arrows: '←↑→↓', updown: '↑↓', orbit: 'drag', zoom: '+/−' };
    // letter keys are read by their place on the keyboard: name them as this keyboard's layout prints them
    const code = LETTER_CODE[a];
    const local = code ? this.layout?.get(code) : undefined;
    return local ? local.toLocaleUpperCase() : table[a] ?? a;
  }

  /** The keyboard's layout (Chrome, Edge): KeyQ prints A on AZERTY. Null where the browser does not say. */
  private layout: Map<string, string> | null = null;
  private readLayout() {
    const kb = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
    kb?.getLayoutMap?.().then((m) => { this.layout = m; }).catch(() => { /* not allowed here (a frame without permission) */ });
  }

  /** Which glyphs to show for a controller: the Button prompts option, else the family in hand. */
  padGlyphs(): 'playstation' | 'xbox' {
    const o = loadOptions().buttonPrompts;
    if (o === 'playstation' || o === 'xbox') return o;
    return this.padKind === 'playstation' ? 'playstation' : 'xbox';
  }

  /** short controller rumble (only while the player is using a gamepad), scaled by the Vibration option */
  rumble(strength = 0.4, ms = 140, weak = strength * 0.6) {
    if (this.lastDevice !== 'pad') return;
    const k = loadOptions().vibration;
    if (!(k > 0)) return;
    for (const p of this.pads()) {
      const act = (p as Gamepad & { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } }).vibrationActuator;
      try { act?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strength * k), weakMagnitude: Math.min(1, weak * k) })?.catch(() => {}); } catch { /* unsupported */ }
    }
  }

  /** A short, distinct haptic pattern for a moment of play (any controller that rumbles). */
  haptic(kind: Haptic) {
    for (const [strong, weak, ms, delay] of HAPTICS[kind]) {
      if (delay) setTimeout(() => this.rumble(strong, ms, weak), delay); else this.rumble(strong, ms, weak);
    }
  }

  private pads(): Gamepad[] {
    try { return [...(navigator.getGamepads?.() ?? [])].filter((p): p is Gamepad => !!p && p.connected); } catch { return []; }
  }

  private padResync = false;
  /** the controller family last used, for its button glyphs */
  padKind: PadKind = 'xbox';
  /** Create was pressed with Options during this hold: the pair belongs to 52in1, so Create does nothing */
  private createSpoiled = false;
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
      if (p.buttons.some((b) => b.pressed) || p.axes.some((a) => Math.abs(a) > 0.5)) this.padKind = padKindOf(p.id);
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
    // Options opens the menu, unless Create is held: 52in1 opens its own bar with the pair.
    const create = !!pressed[PAD_CREATE], options = !!pressed[PAD_OPTIONS];
    edge(PAD_OPTIONS, options && !create, 'menu');
    // Create shows the turn order when it is let go, unless Options was pressed while it was held.
    if (this.padResync) { this.createSpoiled = create; }
    else if (create) { if (options) this.createSpoiled = true; }
    else if (this.padPrev[PAD_CREATE]) { if (!this.createSpoiled) { this.setDevice('pad'); this.dispatch('turnList'); } this.createSpoiled = false; }
    this.padPrev[PAD_CREATE] = create;
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
