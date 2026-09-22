import type { JobDef, StatMultipliers } from '../data/types';
import type { Rng } from '../core/rng';

/** Raw (hidden) stats, FFT-style: displayed = raw * jobMult / 1,638,400 */
export interface RawStats { hp: number; mp: number; sp: number; pa: number; ma: number; }

export const RAW_DIV = 1638400;

export function newRaw(gender: 'm' | 'f' | 'monster', rng: Rng): RawStats {
  if (gender === 'f') {
    return { hp: rng.int(458752, 491519), mp: rng.int(245760, 262143), sp: 98304, pa: 65536, ma: 81920 };
  }
  if (gender === 'monster') {
    return { hp: rng.int(540672, 573439), mp: rng.int(180224, 196607), sp: 98304, pa: 81920, ma: 65536 };
  }
  return { hp: rng.int(491520, 524287), mp: rng.int(229376, 245759), sp: 98304, pa: 81920, ma: 65536 };
}

/** apply one level of growth using the job's growth constants */
export function growRaw(raw: RawStats, level: number, g: StatMultipliers) {
  raw.hp += Math.floor(raw.hp / (g.hp + level));
  raw.mp += Math.floor(raw.mp / (g.mp + level));
  raw.sp += Math.floor(raw.sp / (g.sp + level));
  raw.pa += Math.floor(raw.pa / (g.pa + level));
  raw.ma += Math.floor(raw.ma / (g.ma + level));
}

/** level a fresh unit from 1 up to `to` using a job's growth */
export function levelRawTo(raw: RawStats, from: number, to: number, g: StatMultipliers) {
  for (let lv = from; lv < to; lv++) growRaw(raw, lv, g);
}

export function displayStats(raw: RawStats, job: JobDef) {
  const m = job.mult;
  return {
    hp: Math.max(1, Math.floor((raw.hp * m.hp) / RAW_DIV)),
    mp: Math.max(0, Math.floor((raw.mp * m.mp) / RAW_DIV)),
    speed: Math.max(1, Math.floor((raw.sp * m.sp) / RAW_DIV)),
    pa: Math.max(1, Math.floor((raw.pa * m.pa) / RAW_DIV)),
    ma: Math.max(1, Math.floor((raw.ma * m.ma) / RAW_DIV)),
  };
}

/** Job level thresholds (total JP earned in a job) */
export const JOB_LEVEL_JP = [0, 200, 400, 700, 1100, 1600, 2200, 3000];
export function jobLevel(totalJp: number) {
  let lv = 1;
  for (let i = 1; i < JOB_LEVEL_JP.length; i++) if (totalJp >= JOB_LEVEL_JP[i]) lv = i + 1;
  return lv;
}
export const MAX_JP = 9999;
export const MAX_LEVEL = 99;
