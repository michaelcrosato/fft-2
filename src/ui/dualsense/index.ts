// A DualSense's extras, one way for the whole game (AI Hub Catalogue v1, *Settings and the DualSense*):
//  - inside 52in1, through window.AIHubSettings.dualsense: 52in1 holds the controller and hands over
//    what the player allows (light bar, adaptive triggers, motion, touchpad);
//  - on a page of its own, over WebHID, once the player connects it from Options (Chrome and Edge on
//    a computer). The WebHID code is compiled out of the 52in1 package.
// Every extra adds to a control that works without it, and each obeys its own option.
import { loadOptions } from '../../game/state';
import type { DsInput, Touch, TriggerEffect, Vec3 } from './report';
import type { HidDualSense } from './webhid';

export type { TriggerEffect, Touch, Vec3 };

interface HubDualSense {
  connected?: boolean; lightbar?: boolean; triggers?: boolean; motion?: boolean; touchpad?: boolean; aim?: boolean;
  gyro?: Vec3; accel?: Vec3; touches?: Touch[];
  light?(colour: string | null): void;
  trigger?(which: 'left' | 'right' | 'both', effect: TriggerEffect | null): void;
}
interface HubSettings { dualsense?: HubDualSense; addEventListener?(type: 'change', fn: () => void): void }
const hubSettings = (): HubSettings | undefined => (typeof window !== 'undefined' ? (window as Window & { AIHubSettings?: HubSettings }).AIHubSettings : undefined);

export interface Caps { lightbar: boolean; triggers: boolean; motion: boolean; touchpad: boolean }
const NONE: Caps = { lightbar: false, triggers: false, motion: false, touchpad: false };

class DualSense {
  private hid: HidDualSense | null = null;
  private listeners = new Set<() => void>();
  private lastLight: string | null | undefined = undefined;
  private lastTrigger = new Map<string, string>();
  private watched = false;

  /** True inside 52in1, which sets the DualSense up in its own Settings. */
  get inHub() { return !!hubSettings(); }
  private get hub() { return hubSettings()?.dualsense; }

  /** Where the extras come from right now. */
  get source(): 'hub' | 'webhid' | null {
    if (this.hub?.connected) return 'hub';
    if (this.hid?.connected) return 'webhid';
    return null;
  }
  get bus(): 'usb' | 'bluetooth' | null { return this.hid?.connected ? this.hid.bus : null; }

  /** What the player allows the game to use. */
  get caps(): Caps {
    const src = this.source;
    if (src === 'hub') { const h = this.hub!; return { lightbar: !!h.lightbar, triggers: !!h.triggers, motion: !!h.motion, touchpad: !!h.touchpad }; }
    if (src === 'webhid') return { lightbar: true, triggers: true, motion: true, touchpad: true };
    return NONE;
  }

  /** Whether Options can offer to connect one over WebHID (never inside 52in1, never in its package). */
  get canConnect(): boolean {
    return !__HUB_PACKAGE__ && !this.inHub && typeof navigator !== 'undefined' && 'hid' in navigator;
  }

  onChange(fn: () => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private changed() { this.lastLight = undefined; this.lastTrigger.clear(); for (const fn of this.listeners) fn(); }

  /** On start-up: follow 52in1's settings; reconnect a controller the player already allowed. */
  async init() {
    const h = hubSettings();
    if (h?.addEventListener && !this.watched) { this.watched = true; h.addEventListener('change', () => this.changed()); }
    if (!__HUB_PACKAGE__ && this.canConnect) await this.open(false);
  }

  /** Options → DualSense → Connect: the browser's own list, inside the click or key press. */
  async connect(): Promise<boolean> {
    if (__HUB_PACKAGE__ || !this.canConnect) return false;
    return this.open(true);
  }

  private async open(ask: boolean): Promise<boolean> {
    if (__HUB_PACKAGE__) return false;
    const { openDualSense } = await import('./webhid');
    const dev = await openDualSense(ask, () => { this.hid = null; this.changed(); });
    if (dev) { this.hid = dev; this.changed(); }
    return !!dev;
  }

  /** Colour the light bar ('#rrggbb'), or give it back with null. Sent only when it changes. */
  light(colour: string | null) {
    if (!loadOptions().dsLight) colour = null;
    if (colour === this.lastLight) return;
    this.lastLight = colour;
    const src = this.source;
    if (src === 'hub' && this.caps.lightbar) this.hub!.light?.(colour);
    else if (src === 'webhid') this.hid!.light(colour);
  }

  /** An adaptive trigger's effect, or null to let it go. */
  trigger(which: 'left' | 'right' | 'both', effect: TriggerEffect | null) {
    if (!loadOptions().dsTriggers) effect = null;
    const key = JSON.stringify(effect);
    if (this.lastTrigger.get(which) === key) return;
    this.lastTrigger.set(which, key);
    if (which === 'both') { this.lastTrigger.set('left', key); this.lastTrigger.set('right', key); }
    const src = this.source;
    if (src === 'hub' && this.caps.triggers) this.hub!.trigger?.(which, effect);
    else if (src === 'webhid') this.hid!.trigger(which, effect);
  }

  /** How fast the controller turns (°/s), when the motion camera may use it; read every frame. */
  gyro(): Vec3 | null {
    const o = loadOptions().motion;
    const src = this.source;
    if (src === 'hub') {
      const h = this.hub!;
      const on = o === 'on' || (o === 'auto' && !!h.aim);
      return on && h.motion && h.gyro ? h.gyro : null;
    }
    if (src === 'webhid' && o === 'on') return this.hid!.latest?.gyro ?? null;
    return null;
  }

  /** The fingers on the touchpad (0–1 from its top left), when touchpad gestures are on. */
  touches(): Touch[] {
    if (!loadOptions().touchpad) return [];
    const src = this.source;
    if (src === 'hub') return this.caps.touchpad ? this.hub!.touches ?? [] : [];
    if (src === 'webhid') return (this.hid!.latest as DsInput | null)?.touches ?? [];
    return [];
  }
}

export const dualsense = new DualSense();
