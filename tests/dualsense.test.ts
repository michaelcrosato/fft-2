// The DualSense: report bytes (vectors from 52in1's own driver tests, scripts/dualsense.test.mjs),
// the facade over window.AIHubSettings, and the controller rules 52in1 sets.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FILTERS, NOMINAL, calibrationOf, crc32, inputOf, outputReport, triggerBytes } from '../src/ui/dualsense/report';

describe('DualSense reports', () => {
  it('CRC-32 is the IEEE one, as a Bluetooth report ends', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(crc32([])).toBe(0);
  });

  it('over USB: report 0x02, the 47-byte common block, light bar and player light flagged', () => {
    const { id, data } = outputReport({ bus: 'usb', colour: '#3b82f6', player: true });
    expect(id).toBe(0x02);
    expect(data.length).toBe(47);
    expect(data[1]).toBe(0x04 | 0x10);
    expect([data[44], data[45], data[46]]).toEqual([0x3b, 0x82, 0xf6]);
    expect(data[43]).toBe(0x04);
    expect(outputReport({ bus: 'usb' }).data[1]).toBe(0);
    const reset = outputReport({ bus: 'usb', reset: true }).data;
    expect([reset[38], reset[41]]).toEqual([0x02, 0x02]);
  });

  it('over Bluetooth: report 0x31, a sequence tag, the block at 2 and a CRC of 0xA2, the id and the rest', () => {
    const { id, data } = outputReport({ bus: 'bluetooth', seq: 5, colour: '#e8443a' });
    expect(id).toBe(0x31);
    expect(data.length).toBe(77);
    expect(data[0]).toBe(0x50);
    expect(data[1]).toBe(0x10);
    expect([data[46], data[47], data[48]]).toEqual([0xe8, 0x44, 0x3a]);
    expect(new DataView(data.buffer).getUint32(73, true)).toBe(crc32([0xa2, 0x31, ...data.subarray(0, 73)]));
    expect(outputReport({ bus: 'bluetooth', seq: 21 }).data[0]).toBe(0x50);
  });

  it('asks the browser for DualSense and DualSense Edge only', () => {
    expect(FILTERS.map((f) => [f.vendorId, f.productId])).toEqual([[0x054c, 0x0ce6], [0x054c, 0x0df2]]);
  });

  it('packs trigger effects in Sony\'s formats, and lets a trigger go as Off', () => {
    for (const e of [null, { kind: 'explode' } as never, { kind: 'resist', strength: 0 } as const]) expect([...triggerBytes(e)]).toEqual([0x05, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const resist = triggerBytes({ kind: 'resist', from: 0.5, strength: 1 });
    expect(resist[0]).toBe(0x21);
    expect(resist[1] | (resist[2] << 8)).toBe(0b1111100000);
    const forces = (resist[3] | (resist[4] << 8) | (resist[5] << 16) | (resist[6] << 24)) >>> 0;
    for (let zone = 0; zone < 10; zone++) expect((forces >>> (3 * zone)) & 7).toBe(zone >= 5 ? 7 : 0);
    const weapon = triggerBytes({ kind: 'weapon', from: 0.3, to: 0.6, strength: 0.5 });
    expect([weapon[0], weapon[1] | (weapon[2] << 8), weapon[3]]).toEqual([0x25, (1 << 3) | (1 << 5), 3]);
    const vib = triggerBytes({ kind: 'vibrate', from: 0, strength: 1, frequency: 40 });
    expect([vib[0], vib[1] | (vib[2] << 8), vib[9]]).toEqual([0x26, 0x3ff, 40]);
    const { data } = outputReport({ bus: 'usb', left: resist, right: weapon });
    expect(data[0]).toBe(0x04 | 0x08);
    expect([...data.subarray(10, 21)]).toEqual([...weapon]);
    expect([...data.subarray(21, 32)]).toEqual([...resist]);
  });

  it('reads motion and touches from USB and Bluetooth input reports', () => {
    const report = (bus: 'usb' | 'bluetooth', fill: (s16: (o: number, n: number) => void, u8: (o: number, n: number) => void) => void) => {
      const at = bus === 'bluetooth' ? 1 : 0;
      const view = new DataView(new Uint8Array(bus === 'bluetooth' ? 77 : 63).buffer);
      fill((o, n) => view.setInt16(at + o, n, true), (o, n) => view.setUint8(at + o, n));
      return view;
    };
    for (const bus of ['usb', 'bluetooth'] as const) {
      const view = report(bus, (s16, u8) => { [164, -328, 0].forEach((n, k) => s16(15 + 2 * k, n)); [0, 8192, -4096].forEach((n, k) => s16(21 + 2 * k, n)); u8(32, 0x80); u8(36, 0x80); });
      const input = inputOf(bus === 'bluetooth' ? 0x31 : 0x01, view)!;
      expect(input.gyro).toEqual({ x: 10, y: -20, z: 0 });
      expect(input.accel).toEqual({ x: 0, y: 1, z: -0.5 });
      expect(input.touches).toEqual([]);
    }
    const touch = report('usb', (_s, u8) => { u8(32, 3); u8(33, 0x7f); u8(34, 0x07); u8(35, 0x00); u8(36, 4); u8(37, 0xc0); u8(38, 0xc3); u8(39, 0x21); });
    expect(inputOf(0x01, touch)!.touches).toEqual([{ id: 3, x: 1, y: 0 }, { id: 4, x: 0.5, y: 0.5 }]);
    expect(inputOf(0x01, new DataView(new Uint8Array(9).buffer))).toBeNull();
  });

  it('reads the calibration, keeping the nominal scale for an axis out of reason', () => {
    expect(calibrationOf(null)).toBe(NOMINAL);
    const bytes = new Uint8Array(41);
    const view = new DataView(bytes.buffer);
    bytes[0] = 0x05;
    const put = (o: number, n: number) => view.setInt16(1 + o, n, true);
    [6, 10, 14].forEach((o) => put(o, 8800));
    [8, 12, 16].forEach((o) => put(o, -8800));
    put(18, 540); put(20, 540);
    [22, 26, 30].forEach((o) => { put(o, 8192); put(o + 2, -8192); });
    const cal = calibrationOf(view);
    expect(cal.gyro[0]).toBeCloseTo(1080 / 17600);
    expect(cal.accel[0]).toBeCloseTo(2 / 16384);
  });
});

// ---------------------------------------------------------------- the facade, inside 52in1
describe('the DualSense inside 52in1', () => {
  const calls: Array<[string, unknown, unknown?]> = [];
  let settings: Record<string, unknown>;
  beforeEach(() => {
    vi.resetModules();
    calls.length = 0;
    settings = {
      music: 1, effects: 1,
      dualsense: {
        connected: true, lightbar: true, triggers: true, motion: true, touchpad: true, aim: true,
        gyro: { x: 1, y: 30, z: 0 }, accel: { x: 0, y: 1, z: 0 }, touches: [{ id: 1, x: 0.2, y: 0.5 }],
        light: (c: unknown) => calls.push(['light', c]),
        trigger: (w: unknown, e: unknown) => calls.push(['trigger', w, e]),
      },
      addEventListener() {},
    };
    vi.stubGlobal('window', { AIHubSettings: settings, localStorage: { getItem: () => null, setItem() {} } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('uses 52in1\'s controller, only for what the player allows, and never offers to open one itself', async () => {
    const { dualsense } = await import('../src/ui/dualsense');
    expect(dualsense.inHub).toBe(true);
    expect(dualsense.source).toBe('hub');
    expect(dualsense.canConnect).toBe(false);
    dualsense.light('#3b82f6');
    dualsense.light('#3b82f6'); // unchanged: not sent again
    dualsense.trigger('right', { kind: 'resist', from: 0.1, strength: 0.5 });
    expect(calls).toEqual([['light', '#3b82f6'], ['trigger', 'right', { kind: 'resist', from: 0.1, strength: 0.5 }]]);
    // motion: 'auto' follows 52in1's Motion aim
    expect(dualsense.gyro()).toEqual({ x: 1, y: 30, z: 0 });
    expect(dualsense.touches()).toHaveLength(1);
    (settings.dualsense as Record<string, unknown>).aim = false;
    expect(dualsense.gyro()).toBeNull();
    (settings.dualsense as Record<string, unknown>).lightbar = false;
    dualsense.light('#ff0000');
    expect(calls).toHaveLength(2); // the player keeps the light bar from games
    (settings.dualsense as Record<string, unknown>).connected = false;
    expect(dualsense.source).toBeNull();
    expect(dualsense.caps).toEqual({ lightbar: false, triggers: false, motion: false, touchpad: false });
  });
});

// ---------------------------------------------------------------- 52in1's buttons
describe('controller rules', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gives Create and Options held together no meaning, leaves PS alone, and shows the right glyphs', async () => {
    vi.resetModules();
    const pressed = new Set<number>();
    const pad = { connected: true, id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', axes: [0, 0, 0, 0], get buttons() { return Array.from({ length: 18 }, (_, i) => ({ pressed: pressed.has(i), value: pressed.has(i) ? 1 : 0 })); } };
    const listeners: Record<string, Array<(e: unknown) => void>> = {};
    const on = (t: string, f: (e: unknown) => void) => { (listeners[t] ??= []).push(f); };
    vi.stubGlobal('window', { addEventListener: on, setTimeout: () => 0, localStorage: { getItem: () => null, setItem() {} } });
    vi.stubGlobal('document', { addEventListener: on, hidden: false, body: { classList: { add() {} } } });
    vi.stubGlobal('navigator', { getGamepads: () => [pad] });
    const { input, padKindOf } = await import('../src/ui/input');
    const got: string[] = [];
    input.push((a) => { got.push(a); return true; });
    const poll = () => (input as unknown as { pollPad(): void }).pollPad();
    const press = (...b: number[]) => { for (const x of b) pressed.add(x); poll(); };
    const release = (...b: number[]) => { for (const x of b) pressed.delete(x); poll(); };
    poll();
    press(9); release(9);
    expect(got).toEqual(['menu']); // Options alone opens the menu
    press(8); release(8);
    expect(got).toEqual(['menu', 'turnList']); // Create alone: the turn order, on release
    got.length = 0;
    press(8); press(9); release(9); release(8);
    expect(got).toEqual([]); // the pair is 52in1's
    press(16); release(16);
    expect(got).toEqual([]); // PS is 52in1's
    press(17); release(17);
    expect(got).toEqual(['turnList']); // the touchpad press
    expect(input.padKind).toBe('playstation');
    expect(input.label('confirm')).toBe('✕');
    expect(padKindOf('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)')).toBe('xbox');
  });
});
