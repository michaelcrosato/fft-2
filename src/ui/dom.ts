// Tiny DOM helpers.
import { gameClock } from '../core/gameClock';
type Child = Node | string | number | null | undefined | false | Child[];

export function h<K extends keyof HTMLElementTagNameMap>(tag: K | string, attrs: Record<string, unknown> | null = null, ...children: Child[]): HTMLElement {
  const [t, ...cls] = tag.split('.');
  const el = document.createElement(t || 'div');
  if (cls.length) el.className = cls.join(' ');
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className += (el.className ? ' ' : '') + String(v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (k === 'html') el.innerHTML = String(v);
      else el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el: HTMLElement, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

export function uiRoot(): HTMLElement { return document.getElementById('ui')!; }

export function clear(el: HTMLElement) { while (el.firstChild) el.removeChild(el.firstChild); }

export const sleep = (ms: number) => gameClock.sleep(ms);

export function nextFrame() { return new Promise<void>((r) => requestAnimationFrame(() => r())); }
