// A DualSense over WebHID, for the game on a page of its own (Chrome and Edge on a computer). Inside
// 52in1 the game never opens the controller: 52in1 holds it and hands the extras over
// (window.AIHubSettings.dualsense), so this module is compiled out of the 52in1 package.
import { FILTERS, NOMINAL, calibrationOf, inputOf, outputReport, triggerBytes, type Calibration, type DsInput, type TriggerEffect } from './report';

interface HidReportEvent { reportId: number; data: DataView }
interface HidDevice extends EventTarget {
  opened: boolean; vendorId: number; productId: number;
  collections?: Array<{ outputReports?: Array<{ reportId: number }> }>;
  open(): Promise<void>; close(): Promise<void>;
  sendReport(id: number, data: Uint8Array): Promise<void>;
  receiveFeatureReport(id: number): Promise<DataView>;
}
interface Hid extends EventTarget { getDevices(): Promise<HidDevice[]>; requestDevice(o: { filters: typeof FILTERS }): Promise<HidDevice[]> }
const hid = (): Hid | null => (typeof navigator !== 'undefined' && (navigator as Navigator & { hid?: Hid }).hid) || null;
const isDualSense = (d: HidDevice) => FILTERS.some((f) => f.vendorId === d.vendorId && f.productId === d.productId);
const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

/** The colour the light bar shows when the game asks for none: the game's own gold. */
const RESTING = '#c9a24a';

export class HidDualSense {
  bus: 'usb' | 'bluetooth' = 'usb';
  latest: DsInput | null = null;
  private seq = 0;
  private cal: Calibration = NOMINAL;
  private want = { colour: RESTING, left: triggerBytes(null), right: triggerBytes(null) };
  private sent: { colour: string; left: Uint8Array; right: Uint8Array } | null = null;
  private queued = false;
  private onReport = (e: Event) => {
    const { reportId, data } = e as unknown as HidReportEvent;
    // the short Bluetooth report: asking for the calibration turns on the full one
    if (reportId === 0x01 && data.byteLength < 63 && this.bus === 'bluetooth') { this.device.receiveFeatureReport(0x05).catch(() => {}); return; }
    const input = inputOf(reportId, data, this.cal);
    if (input) this.latest = input;
  };

  constructor(readonly device: HidDevice, private onGone: () => void) {}

  get connected() { return this.device.opened; }

  async open(): Promise<this> {
    if (!this.device.opened) await this.device.open();
    this.bus = this.device.collections?.some((c) => c.outputReports?.some((r) => r.reportId === 0x31)) ? 'bluetooth' : 'usb';
    try { this.cal = calibrationOf(await this.device.receiveFeatureReport(0x05)); } catch { this.cal = NOMINAL; }
    this.device.addEventListener('inputreport', this.onReport);
    hid()?.addEventListener('disconnect', (e) => { if ((e as Event & { device?: HidDevice }).device === this.device) { this.sent = null; this.onGone(); } });
    // take the lights over from the start-up glow, light player 1, then the light bar and triggers as wanted
    await this.send({ reset: true, player: true });
    this.sent = null;
    this.update();
    return this;
  }

  light(colour: string | null) { this.want.colour = colour ?? RESTING; this.update(); }
  trigger(which: 'left' | 'right' | 'both', effect: TriggerEffect | null) {
    const bytes = triggerBytes(effect);
    if (which !== 'right') this.want.left = bytes;
    if (which !== 'left') this.want.right = bytes;
    this.update();
  }

  /** Let the triggers go and give the light back before closing. */
  async close() {
    this.want = { colour: RESTING, left: triggerBytes(null), right: triggerBytes(null) };
    await this.flush();
    this.device.removeEventListener('inputreport', this.onReport);
    await this.device.close().catch(() => {});
  }

  private async send(o: Omit<Parameters<typeof outputReport>[0], 'bus' | 'seq'>) {
    if (!this.device.opened) return;
    const { id, data } = outputReport({ bus: this.bus, seq: this.seq++, ...o });
    try { await this.device.sendReport(id, data); } catch { /* unplugged mid-report */ }
  }

  /** At most one report every 16 ms, carrying only what changed. */
  private update() {
    if (this.queued) return;
    this.queued = true;
    setTimeout(() => void this.flush(), 16);
  }
  private async flush() {
    this.queued = false;
    const was = this.sent, next = { ...this.want };
    const change: { colour?: string; left?: Uint8Array; right?: Uint8Array } = {};
    if (!was || was.colour !== next.colour) change.colour = next.colour;
    if (!was || !same(was.left, next.left)) change.left = next.left;
    if (!was || !same(was.right, next.right)) change.right = next.right;
    this.sent = next;
    if (Object.keys(change).length) await this.send(change);
  }
}

/** Whether the browser can open a controller over WebHID. */
export const webHidSupported = () => !!hid();

/**
 * Open a DualSense: one the player already allowed (`ask` false: no prompt, on start-up), or the
 * one they pick from the browser's list (`ask` true: only inside a click or key press).
 */
export async function openDualSense(ask: boolean, onGone: () => void): Promise<HidDualSense | null> {
  const h = hid();
  if (!h) return null;
  try {
    let dev = (await h.getDevices()).find(isDualSense);
    if (!dev && ask) dev = (await h.requestDevice({ filters: FILTERS }))[0];
    if (!dev) return null;
    return await new HidDualSense(dev, onGone).open();
  } catch {
    return null;
  }
}
