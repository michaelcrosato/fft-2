import type { Gender, Zodiac } from '../data/types';

export const ZODIAC_ORDER: Zodiac[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

export const ZODIAC_NAMES: Record<Zodiac, string> = {
  aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer', leo: 'Leo', virgo: 'Virgo',
  libra: 'Libra', scorpio: 'Scorpio', sagittarius: 'Sagittarius', capricorn: 'Capricorn',
  aquarius: 'Aquarius', pisces: 'Pisces', serpentarius: 'Serpentarius',
};

export const ZODIAC_GLYPH: Record<Zodiac, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍', libra: '♎',
  scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓', serpentarius: '⛎',
};

export type Compat = 'best' | 'good' | 'neutral' | 'bad' | 'worst';

export function compatibility(a: Zodiac, ga: Gender, b: Zodiac, gb: Gender): Compat {
  if (a === 'serpentarius' || b === 'serpentarius') return 'neutral';
  const ia = ZODIAC_ORDER.indexOf(a), ib = ZODIAC_ORDER.indexOf(b);
  let d = Math.abs(ia - ib); if (d > 6) d = 12 - d;
  if (d === 4) return 'good';
  if (d === 3) return 'bad';
  if (d === 6) {
    if (ga === 'monster' || gb === 'monster') return 'bad';
    return ga !== gb ? 'best' : 'worst';
  }
  return 'neutral';
}

export const COMPAT_MULT: Record<Compat, number> = { best: 1.5, good: 1.25, neutral: 1, bad: 0.75, worst: 0.5 };

export function zodiacFromDate(month: number, day: number): Zodiac {
  // month 1..12
  const md = month * 100 + day;
  if (md >= 1221 || md <= 120) return 'capricorn';
  if (md <= 220) return 'aquarius';
  if (md <= 320) return 'pisces';
  if (md <= 420) return 'aries';
  if (md <= 520) return 'taurus';
  if (md <= 620) return 'gemini';
  if (md <= 720) return 'cancer';
  if (md <= 820) return 'leo';
  if (md <= 920) return 'virgo';
  if (md <= 1020) return 'libra';
  if (md <= 1120) return 'scorpio';
  return 'sagittarius';
}
