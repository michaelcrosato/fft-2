// Reusable UI widgets: menus, confirm, toast, dialogue boxes, narration,
// title cards, fades, banners, floating numbers, unit cards.
import { h, uiRoot, sleep } from './dom';
import { input, type Action } from './input';
import { audio } from '../audio/audio';

export interface MenuItem<T = string> {
  label: string;
  value: T;
  disabled?: boolean | string;
  right?: string;
  icon?: string;
  desc?: string;
  sep?: boolean;
}

export interface MenuOpts<T> {
  items: MenuItem<T>[];
  title?: string;
  x?: number | string;
  y?: number | string;
  right?: number | string;
  bottom?: number | string;
  className?: string;
  initial?: T | number;
  cancelable?: boolean;
  onHover?: (v: T | null, item?: MenuItem<T>) => void;
  /** return true to consume the action (e.g. left/right switching units) */
  onAction?: (a: Action, v: T | null) => boolean;
  showDesc?: boolean;
  parent?: HTMLElement;
  maxHeight?: string;
  /** tooltip for the corner close button of a cancelable menu (default "Back") */
  closeTitle?: string;
  /** touch: first tap only selects (default for menus with hover panels or descriptions) */
  tapSelects?: boolean;
  /** Reference lists: keep the selected page and list scroll position until Back. */
  keepOpenOnChoose?: boolean;
}

export interface MenuHandle<T> { promise: Promise<T | null>; close: () => void; el: HTMLElement; refresh: (items: MenuItem<T>[]) => void; }

export function menu<T = string>(o: MenuOpts<T>): MenuHandle<T> {
  let items = o.items;
  const el = h('div.panel.menu' + (o.className ? '.' + o.className.split(' ').join('.') : ''));
  const pos = (k: string, v: number | string | undefined) => { if (v !== undefined) (el.style as any)[k] = typeof v === 'number' ? v + 'px' : v; };
  pos('left', o.x); pos('top', o.y); pos('right', o.right); pos('bottom', o.bottom);
  if (o.title) el.appendChild(h('div.title-plate', null, o.title));
  if (o.cancelable !== false) {
    // mouse and touch players need a visible way back (keyboard/gamepad use Esc / B)
    const close = h('button.mclose', { type: 'button', title: o.closeTitle ?? 'Back', 'aria-label': o.closeTitle ?? 'Back' }, '✕');
    close.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('cancel'); finish(null); });
    el.appendChild(close);
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); audio.sfx('cancel'); finish(null); });
  }
  const list = h('div.scroll');
  if (o.maxHeight) list.style.maxHeight = o.maxHeight;
  el.appendChild(list);
  const desc = h('div.desc');
  if (o.showDesc) el.appendChild(desc);
  let sel = -1;
  let rows: HTMLElement[] = [];
  // on touch, menus whose rows show details (hover panels, descriptions) select on the first tap and choose on the second
  const infoMenu = o.tapSelects ?? !!(o.onHover || o.showDesc);
  let lastPointer = '';
  let resolve!: (v: T | null) => void;
  const promise = new Promise<T | null>((r) => (resolve = r));
  let closed = false;
  const selectable = (i: number) => !!items[i] && !items[i].sep;
  const render = () => {
    list.innerHTML = '';
    rows = items.map((it, i) => {
      if (it.sep) return list.appendChild(h('div.sep')) as HTMLElement;
      const row = h('div.item' + (it.disabled ? '.disabled' : ''), {
        // Layout changes can emit pointerenter beneath a stationary cursor (notably WebKit).
        // Only mouse movement takes selection back from keyboard/gamepad; touch still selects on tap.
        onpointermove: (e: PointerEvent) => { if (e.pointerType === 'mouse') setSel(i, false); },
        onpointerdown: (e: PointerEvent) => { lastPointer = e.pointerType; },
        onclick: (e: MouseEvent) => {
          e.stopPropagation();
          if (lastPointer === 'touch' && infoMenu && i !== sel) { setSel(i); return; }
          setSel(i, false); choose();
        },
      }, it.icon ? h('span.ico', null, it.icon) : null, h('span.l', null, it.label), it.right ? h('span.r', null, it.right) : null);
      list.appendChild(row);
      return row;
    });
  };
  const setSel = (i: number, sound = true, force = false) => {
    if (!selectable(i)) return;
    if (i === sel && !force) return; // re-hovering the same row must not re-run onHover
    if (i !== sel && sound) audio.sfx('cursor');
    rows[sel]?.classList.remove('sel');
    sel = i;
    rows[sel]?.classList.add('sel');
    rows[sel]?.scrollIntoView?.({ block: 'nearest' });
    const it = items[sel];
    if (o.showDesc) desc.textContent = typeof it?.disabled === 'string' ? it.disabled : it?.desc ?? '';
    o.onHover?.(it ? it.value : null, it);
  };
  const choose = () => {
    const it = items[sel];
    if (!it || it.sep) return;
    if (it.disabled) { audio.sfx('error'); return; }
    audio.sfx('confirm');
    if (o.keepOpenOnChoose) return;
    finish(it.value);
  };
  const finish = (v: T | null) => {
    if (closed) return;
    closed = true;
    pop();
    el.remove();
    resolve(v);
  };
  render();
  let init = 0;
  if (typeof o.initial === 'number' && !items.some((it) => it.value === o.initial)) init = o.initial;
  else if (o.initial !== undefined) init = Math.max(0, items.findIndex((it) => it.value === o.initial));
  while (init < items.length && !selectable(init)) init++;
  // prefer an enabled entry when the requested one is disabled
  if (items[init]?.disabled) { const e = items.findIndex((it, i) => selectable(i) && !it.disabled); if (e >= 0) init = e; }
  setSel(Math.min(init, items.length - 1), false, true);
  if (sel < 0) sel = 0;
  const pop = input.push((a) => {
    if (o.onAction && o.onAction(a, items[sel]?.value ?? null)) return true;
    const n = items.length;
    if (!n && (a === 'up' || a === 'down' || a === 'confirm')) return true; // empty list (e.g. nothing to sell)
    switch (a) {
      case 'up': { let i = sel; do { i = (i - 1 + n) % n; } while (!selectable(i) && i !== sel); setSel(i); return true; }
      case 'down': { let i = sel; do { i = (i + 1) % n; } while (!selectable(i) && i !== sel); setSel(i); return true; }
      case 'confirm': choose(); return true;
      case 'cancel': if (o.cancelable !== false) { audio.sfx('cancel'); finish(null); } return true;
      default: return true;
    }
  });
  (o.parent ?? uiRoot()).appendChild(el);
  // now that the list is in the document, bring the initial choice into view
  rows[sel]?.scrollIntoView?.({ block: 'nearest' });
  return {
    promise, el, close: () => finish(null),
    refresh: (ni) => { items = ni; render(); setSel(Math.max(0, Math.min(sel, items.length - 1)), false, true); },
  };
}

/** yes/no prompt; `defaultNo` preselects No (for destructive choices) */
export async function confirm(text: string, yes = 'Yes', no = 'No', defaultNo = false): Promise<boolean> {
  // (.prompt stacks above full-screen menus like Formation or Save, which open prompts of their own)
  const wrap = h('div.panel.prompt', { style: { left: '50%', top: '40%', transform: 'translate(-50%,-50%)', maxWidth: 'min(520px, 92vw)', textAlign: 'center', padding: '16px 22px 8px' } }, h('div', { style: { marginBottom: '10px', fontSize: '1.1em' } }, text));
  uiRoot().appendChild(wrap);
  const m = menu({ items: [{ label: yes, value: true }, { label: no, value: false }], parent: wrap, className: 'inline', initial: !defaultNo });
  m.el.style.position = 'relative'; m.el.style.display = 'inline-block'; m.el.style.margin = '6px auto';
  const r = await m.promise;
  wrap.remove();
  return !!r;
}

export function toast(text: string, ms = 2200) {
  const t = h('div.panel.toast', null, text);
  uiRoot().appendChild(t);
  setTimeout(() => t.remove(), ms);
}

// ---------------------------------------------------------------------------
//  Dialogue
// ---------------------------------------------------------------------------
export interface SayOpts { mood?: 'normal' | 'shout' | 'whisper' | 'think'; pos?: 'top' | 'bottom'; portrait?: string | null; speed?: number; auto?: number }

let dlgEl: HTMLElement | null = null;

let skipHook: (() => void) | null = null;
/** set while a cutscene runs: the menu action (Start / Y / M) skips it from any line, narration or card */
export function setSkipHook(fn: (() => void) | null) { skipHook = fn; }

export function say(speaker: string, text: string, o: SayOpts = {}): Promise<void> {
  closeDialogue();
  const portrait = o.portrait ? h('div.portrait', { style: { backgroundImage: `url(${o.portrait})` } }) : null;
  const txt = h('div.text');
  const next = h('div.next');
  next.style.visibility = 'hidden';
  const box = h('div.panel.dialogue' + (o.pos === 'top' ? '.top' : '') + (portrait ? '' : '.noportrait') + (o.mood && o.mood !== 'normal' ? '.' + o.mood : ''), null,
    portrait, h('div', null, speaker ? h('div.speaker', null, speaker) : null, txt), next);
  uiRoot().appendChild(box);
  dlgEl = box;
  return new Promise((resolve) => {
    let shown = 0;
    let done = false;
    const cps = 55 * (o.speed ?? 1);
    let acc = 0;
    let last = performance.now();
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      acc += ((now - last) / 1000) * cps * (input.fast ? 4 : 1);
      last = now;
      const n = Math.min(text.length, Math.floor(acc));
      if (n > shown) {
        if (n - shown >= 1 && (n % 3 === 0)) audio.sfx('textBlip', { volume: 0.25 });
        shown = n; txt.textContent = text.slice(0, shown);
      }
      if (shown >= text.length) { done = true; next.style.visibility = 'visible'; if (o.auto) setTimeout(finish, o.auto); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const finish = () => { pop(); box.removeEventListener('click', onClick); gl?.removeEventListener('pointerdown', onDown); gl?.removeEventListener('pointerup', onUp); cancelAnimationFrame(raf); resolve(); };
    const advance = () => {
      if (!done) { shown = text.length; txt.textContent = text; done = true; next.style.visibility = 'visible'; cancelAnimationFrame(raf); return; }
      audio.sfx('cursor', { volume: 0.5 });
      finish();
    };
    const onClick = () => advance();
    box.addEventListener('click', onClick);
    // a tap or click on the scene advances too (a drag still moves the camera)
    const gl = document.getElementById('gl');
    let downAt: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => { if (downAt && e.button === 0 && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 10) advance(); downAt = null; };
    gl?.addEventListener('pointerdown', onDown); gl?.addEventListener('pointerup', onUp);
    // allow clicking anywhere to advance
    const pop = input.push((a) => {
      if (a === 'menu' && skipHook) { skipHook(); if (!done) advance(); advance(); return true; }
      if (a === 'confirm' || a === 'cancel') advance();
      return true;
    });
    if (input.fast) setTimeout(() => { if (!done) advance(); }, 250);
  });
}

export function closeDialogue() { dlgEl?.remove(); dlgEl = null; }

export async function narrate(text: string): Promise<void> {
  closeDialogue();
  const p = h('p');
  const el = h('div.narration', null, p);
  el.style.opacity = '0';
  el.style.transition = 'opacity 0.6s';
  uiRoot().appendChild(el);
  await sleep(30);
  el.style.opacity = '1';
  // reveal text word by word
  const words = text.split(/(\s+)/);
  let i = 0;
  await new Promise<void>((resolve) => {
    let done = false;
    const t = setInterval(() => {
      if (i >= words.length) { clearInterval(t); done = true; return; }
      p.textContent += words[i++];
    }, input.fast ? 5 : 45);
    const pop = input.push((a) => {
      if (a === 'menu' && skipHook) { skipHook(); clearInterval(t); done = true; pop(); el.removeEventListener('click', click); resolve(); return true; }
      if (a !== 'confirm' && a !== 'cancel') return true;
      if (!done) { clearInterval(t); p.textContent = text; done = true; i = words.length; return true; }
      pop(); el.removeEventListener('click', click); resolve(); return true;
    });
    const click = () => input.dispatch('confirm');
    el.addEventListener('click', click);
  });
  el.style.opacity = '0';
  await sleep(450);
  el.remove();
}

export async function titleCard(t1: string, t2?: string, hold = 2600): Promise<void> {
  const el = h('div.titlecard', null, h('div.t1', null, t1), h('div.rule'), t2 ? h('div.t2', null, t2) : null);
  el.style.opacity = '0'; el.style.transition = 'opacity 0.9s';
  uiRoot().appendChild(el);
  await sleep(30);
  el.style.opacity = '1';
  audio.sfx('bell', { volume: 0.6 });
  await new Promise<void>((resolve) => {
    const t = setTimeout(done, hold + 900);
    const pop = input.push((a) => { if (a === 'menu' && skipHook) skipHook(); if (a === 'confirm' || a === 'cancel' || (a === 'menu' && skipHook)) done(); return true; });
    function done() { clearTimeout(t); pop(); resolve(); }
  });
  el.style.opacity = '0';
  await sleep(900);
  el.remove();
}

let fadeEl: HTMLElement | null = null;
export async function fade(dir: 'in' | 'out', secs = 0.6, color = '#000') {
  if (!fadeEl) { fadeEl = h('div.fade'); uiRoot().appendChild(fadeEl); }
  fadeEl.style.background = color;
  fadeEl.style.transition = `opacity ${secs}s`;
  fadeEl.style.opacity = dir === 'out' ? '1' : '0';
  uiRoot().appendChild(fadeEl); // keep on top
  await sleep(secs * 1000 + 30);
}
export function setFadeImmediate(v: number) { if (!fadeEl) { fadeEl = h('div.fade'); uiRoot().appendChild(fadeEl); } fadeEl.style.transition = 'none'; fadeEl.style.opacity = String(v); }

// ---------------------------------------------------------------------------
//  Battle HUD bits
// ---------------------------------------------------------------------------
export function banner(text: string, enemy = false, ms = 1400): Promise<void> {
  const b = h('div.banner' + (enemy ? '.enemy' : ''), null, text);
  b.style.opacity = '0'; b.style.transition = 'opacity 0.18s';
  uiRoot().appendChild(b);
  requestAnimationFrame(() => (b.style.opacity = '1'));
  return new Promise((r) => setTimeout(() => { b.style.opacity = '0'; setTimeout(() => { b.remove(); r(); }, 200); }, ms));
}

export function floater(x: number, y: number, text: string, cls: string, delay = 0) {
  setTimeout(() => {
    const f = h('div.floater.' + cls, null, text);
    f.style.left = x + 'px'; f.style.top = y + 'px';
    uiRoot().appendChild(f);
    const t0 = performance.now();
    const dur = 1100;
    const step = () => {
      const t = (performance.now() - t0) / dur;
      if (t >= 1) { f.remove(); return; }
      const bounce = t < 0.25 ? Math.sin((t / 0.25) * Math.PI) * 18 : 0;
      f.style.transform = `translate(-50%, ${-50 - bounce - t * 30}%)`;
      f.style.top = (y - bounce - t * 26) + 'px';
      f.style.opacity = String(t > 0.75 ? (1 - t) / 0.25 : 1);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, delay);
}

export function bar(kind: 'hp' | 'mp' | 'ct', v: number, max: number): HTMLElement {
  const pct = Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100));
  return h('div.bar.' + kind + (kind === 'hp' && pct <= 20 ? '.low' : ''), null, h('i', { style: { width: pct + '%' } }));
}
