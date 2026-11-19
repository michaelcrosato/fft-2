// The art style in force now: the stored options, the URL's overrides for this visit, the renderer.
// Scenes ask for currentStylePlan() when they build their post-processing, and subscribe with
// onStyleChange() to restyle when the Art Style page changes something.
import { loadOptions } from '../../game/state';
import { rinfo } from '../renderer';
import { BACKEND } from '../three';
import { normalizeStyleSettings, withUrlOverrides, type StyleSettings } from './types';
import { resolveStyle, type StylePlan } from './resolve';

let urlOverrides = true;

/** the settings for this frame: stored options, then the URL's overrides until the player sets a style */
export function currentStyleSettings(): StyleSettings {
  const s = normalizeStyleSettings(loadOptions() as unknown as Record<string, unknown>);
  return urlOverrides && typeof location !== 'undefined' ? withUrlOverrides(s, location.search) : s;
}

/** the player changed the settings on the page: from now on the stored ones count, not the URL's */
export function dropUrlOverrides() { urlOverrides = false; }

/** ?styleDebug=layer|id|albedo|overlay|edges: a developer's view of the tagged scene pass */
export function styleDebugView(): string | null {
  if (typeof location === 'undefined') return null;
  const v = new URLSearchParams(location.search).get('styleDebug');
  return v && ['layer', 'id', 'albedo', 'overlay', 'edges'].includes(v) ? v : null;
}

export function currentStylePlan(): StylePlan {
  const plan = resolveStyle(currentStyleSettings(), { quality: rinfo?.quality ?? 'medium', backend: BACKEND, mobile: rinfo?.mobile });
  const debug = styleDebugView();
  if (debug && !plan.unavailable) return { ...plan, active: true, key: plan.key + '|debug:' + debug };
  return plan;
}

const listeners = new Set<() => void | Promise<void>>();
/** call `cb` when the art style settings change; returns the unsubscribe function */
export function onStyleChange(cb: () => void | Promise<void>): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
/** the settings changed (the Art Style page): every live scene restyles; resolves when all have */
export async function styleChanged(): Promise<void> {
  await Promise.all([...listeners].map((cb) => Promise.resolve(cb()).catch((e) => console.warn('[styles] restyle failed', e))));
}

/**
 * Serialize a scene's restyles: one at a time, the latest settings winning. `apply` builds and swaps in
 * the new post-processing; it is skipped once `alive()` is false.
 */
export function restyler(apply: () => Promise<void>, alive: () => boolean): () => Promise<void> {
  let running: Promise<void> | null = null;
  let again = false;
  return () => {
    if (running) { again = true; return running; }
    running = (async () => {
      do { again = false; if (alive()) await apply(); } while (again && alive());
    })().finally(() => { running = null; });
    return running;
  };
}
