// The DualSense's reports, as pure functions (ported from 52in1's own driver, assets/js/ui/dualsense.js,
// which pins them down with tests). The reports follow Linux's hid-playstation driver: over USB the
// output report is 0x02 with the 47-byte common block; over Bluetooth it is 0x31, 77 bytes after the
// id, ending in a CRC-32 of 0xA2, the id and the rest. Calibration and the input report's layout are
// Linux's; the motion's axes are SDL's. Trigger effects are Sony's formats (Off, Feedback, Weapon,
// Vibration), packed as Nielk1's TriggerEffectGenerator (MIT) packs them, at the common block's 10
// and 21 as SDL's DS5EffectsState_t places them.

const SONY = 0x054c;
/** DualSense and DualSense Edge, for navigator.hid.requestDevice. */
export const FILTERS = [{ vendorId: SONY, productId: 0x0ce6 }, { vendorId: SONY, productId: 0x0df2 }];

const FLAG0_RIGHT_TRIGGER = 0x04;
const FLAG0_LEFT_TRIGGER = 0x08;
const FLAG1_LIGHTBAR = 0x04;
const FLAG1_PLAYER_LEDS = 0x10;
const FLAG2_LIGHTBAR_SETUP = 0x02;
const SETUP_LIGHT_OUT = 0x02;
/** The first player light, as the console lights it for player 1. */
const PLAYER_ONE = 0x04;
const RIGHT_AT = 10;
const LEFT_AT = 21;

let table: Uint32Array | null = null;
/** CRC-32 (IEEE), as Bluetooth output reports end. */
export function crc32(bytes: ArrayLike<number>): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const unit = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Math.max(0, Math.min(1, Number(n))) : fallback);
const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) || 0);
export const isColour = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export interface OutputOptions { bus: 'usb' | 'bluetooth'; seq?: number; colour?: string | null; player?: boolean | null; reset?: boolean; left?: Uint8Array | null; right?: Uint8Array | null }

/** An output report's id and the bytes after it: light bar, player light, triggers, and the start-up reset. */
export function outputReport({ bus, seq = 0, colour = null, player = null, reset = false, left = null, right = null }: OutputOptions): { id: number; data: Uint8Array } {
  const common = new Uint8Array(47);
  if (colour && isColour(colour)) { common[1] |= FLAG1_LIGHTBAR; [common[44], common[45], common[46]] = rgbOf(colour); }
  if (player !== null) { common[1] |= FLAG1_PLAYER_LEDS; common[43] = player ? PLAYER_ONE : 0; }
  if (reset) { common[38] |= FLAG2_LIGHTBAR_SETUP; common[41] = SETUP_LIGHT_OUT; }
  if (right) { common[0] |= FLAG0_RIGHT_TRIGGER; common.set(right.subarray(0, 11), RIGHT_AT); }
  if (left) { common[0] |= FLAG0_LEFT_TRIGGER; common.set(left.subarray(0, 11), LEFT_AT); }
  if (bus !== 'bluetooth') return { id: 0x02, data: common };
  const data = new Uint8Array(77);
  data[0] = (seq & 0x0f) << 4;
  data[1] = 0x10;
  data.set(common, 2);
  const crc = crc32([0xa2, 0x31, ...data.subarray(0, 73)]);
  new DataView(data.buffer).setUint32(73, crc, true);
  return { id: 0x31, data };
}

/** A trigger effect, as 52in1's catalogue defines them; numbers 0–1 of the travel and force. */
export interface TriggerEffect { kind: 'resist' | 'weapon' | 'vibrate'; from?: number; to?: number; strength?: number; frequency?: number }

/** A trigger effect's 11 bytes in Sony's formats; null (or a force of 0) lets the trigger go. */
export function triggerBytes(effect: TriggerEffect | null, scale = 1): Uint8Array {
  const out = new Uint8Array(11);
  const force = effect ? unit(effect.strength, 1) * unit(scale, 0) : 0;
  if (!effect || !['resist', 'weapon', 'vibrate'].includes(effect.kind) || force <= 0) { out[0] = 0x05; return out; }
  const strength = Math.max(1, Math.min(8, Math.round(force * 8)));
  const zone = (n: unknown, fallback: number) => Math.round(unit(n, fallback) * 9);
  if (effect.kind === 'weapon') {
    const start = Math.max(2, Math.min(7, zone(effect.from, 0.3)));
    const end = Math.max(start + 1, Math.min(8, zone(effect.to, unit(effect.from, 0.3) + 0.3)));
    const zones = (1 << start) | (1 << end);
    out[0] = 0x25; out[1] = zones & 0xff; out[2] = zones >> 8; out[3] = strength - 1;
    return out;
  }
  const start = Math.min(9, zone(effect.from, 0));
  let active = 0, forces = 0;
  for (let i = start; i < 10; i++) { active |= 1 << i; forces |= (strength - 1) << (3 * i); }
  out[0] = effect.kind === 'vibrate' ? 0x26 : 0x21;
  out[1] = active & 0xff; out[2] = active >> 8;
  out[3] = forces & 0xff; out[4] = (forces >>> 8) & 0xff; out[5] = (forces >>> 16) & 0xff; out[6] = (forces >>> 24) & 0xff;
  if (effect.kind === 'vibrate') out[9] = Math.max(1, Math.min(255, Math.round(Number(effect.frequency) || 30)));
  return out;
}

export interface Calibration { gyro: number[]; accelBias: number[]; accel: number[] }
/** The sensors' nominal scale: ±2000 °/s and ±4 g over 16 bits. */
export const NOMINAL: Calibration = Object.freeze({ gyro: [1 / 16.4, 1 / 16.4, 1 / 16.4], accelBias: [0, 0, 0], accel: [1 / 8192, 1 / 8192, 1 / 8192] }) as Calibration;

/** The calibration from feature report 0x05, as hid-playstation reads it; an axis out of reason keeps NOMINAL's. */
export function calibrationOf(view: DataView | null): Calibration {
  if (!view || view.byteLength < 35) return NOMINAL;
  const at = view.byteLength >= 41 ? 1 : 0;
  const s16 = (o: number) => view.getInt16(at + o, true);
  const bias = [0, 2, 4].map(s16);
  const plus = [6, 10, 14].map(s16);
  const minus = [8, 12, 16].map(s16);
  const speed = s16(18) + s16(20);
  const gyro = [0, 1, 2].map((k) => {
    const span = Math.abs(plus[k] - bias[k]) + Math.abs(minus[k] - bias[k]);
    const scale = speed / span;
    return speed > 100 && span > 2000 && scale > 0.02 && scale < 0.2 ? scale : NOMINAL.gyro[k];
  });
  const accelBias: number[] = [], accel: number[] = [];
  for (const [k, o] of [22, 26, 30].entries()) {
    const high = s16(o), low = s16(o + 2), range = high - low;
    const ok = range > 8000 && range < 40000;
    accelBias.push(ok ? high - range / 2 : 0);
    accel.push(ok ? 2 / range : NOMINAL.accel[k]);
  }
  return { gyro, accelBias, accel };
}

export interface Vec3 { x: number; y: number; z: number }
export interface Touch { id: number; x: number; y: number }
export interface DsInput { gyro: Vec3; accel: Vec3; touches: Touch[] }

const round = (n: number, places = 3) => Math.round(n * 10 ** places) / 10 ** places;
/**
 * Motion and touches from an input report (`id`, a DataView of the bytes after it), or null for a
 * report without them. gyro: degrees a second (x tips the front up, y turns left, z rolls left);
 * accel: g; touches: each finger, 0–1 from the top left.
 */
export function inputOf(id: number, view: DataView, cal: Calibration = NOMINAL): DsInput | null {
  const at = id === 0x31 ? 1 : id === 0x01 && view.byteLength >= 63 ? 0 : -1;
  if (at < 0 || view.byteLength < at + 40) return null;
  const s16 = (o: number) => view.getInt16(at + o, true);
  const [gx, gy, gz] = [15, 17, 19].map((o, k) => round(s16(o) * cal.gyro[k], 2));
  const [ax, ay, az] = [21, 23, 25].map((o, k) => round((s16(o) - cal.accelBias[k]) * cal.accel[k]));
  const touches: Touch[] = [];
  for (const o of [32, 36]) {
    const contact = view.getUint8(at + o);
    if (contact & 0x80) continue;
    const middle = view.getUint8(at + o + 2);
    const x = view.getUint8(at + o + 1) | ((middle & 0x0f) << 8);
    const y = (middle >> 4) | (view.getUint8(at + o + 3) << 4);
    touches.push({ id: contact & 0x7f, x: round(unit(x / 1919)), y: round(unit(y / 1079)) });
  }
  return { gyro: { x: gx, y: gy, z: gz }, accel: { x: ax, y: ay, z: az }, touches };
}
