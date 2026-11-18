// AI Hub Languages v1 (https://52in1.com/lib/hub/languages.md), as pure functions: the game's
// lines, filled blanks, plural forms, the three test languages, choosing a language and cutting
// text for the typewriter. index.ts wires them to the page.

/** A line: plain text with {blanks}, or plural forms picked by {count}. */
export type Line = string | Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many' | 'other', string>>;
export type Lines = Record<string, Line>;
export interface Block {
  version: 1;
  language: string;
  lines: Lines;
  notes?: Record<string, string>;
  max?: Record<string, number>;
  names: string[];
  brief: string;
}
/** game-translations: one entry per language code. */
export type Translations = Record<string, { by?: string; names?: Record<string, string>; lines?: Lines }>;

export const SOURCE_LANGUAGE = 'en';
/** The test languages, chosen only by ?lang=. */
export const FAKE = ['en-XA', 'zh-XC', 'ar-XB'];
/** Written right to left. */
export const RTL = /^(ar|fa|ur|he|ps|sd|ug|yi|ckb|dv)\b/i;
/** Arabic script: letters join, so a typewriter reveals whole words. */
export const JOINED = /^(ar|fa|ur|ps|sd|ug|ckb)\b/i;
export const ID = /^[a-z0-9_]+(\.[a-z0-9_]+)*$/;

const own = <T>(o: unknown, k: string): T | undefined =>
  o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k) ? (o as Record<string, T>)[k] : undefined;

/** A line usable as text: a non-empty string, or plural forms that are all strings. */
export function usable(v: unknown): v is Line {
  return (typeof v === 'string' && v !== '') || (!!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).length > 0 && Object.values(v).every((s) => typeof s === 'string'));
}

/**
 * The language to show: ?lang=, the player's saved choice, the browser's languages, the game's own.
 * A code matches in full, then the same language in the same writing system, then the same language.
 */
export function pickLanguage(available: string[], asked: string | null, saved: string | null, browser: readonly string[]): string {
  if (asked && FAKE.includes(asked)) return asked;
  const parts = (code: string): [string, string] | [] => {
    try { const l = new Intl.Locale(code).maximize(); return [l.language, l.script ?? '']; } catch { return []; }
  };
  for (const want of [asked, saved, ...browser].filter((x): x is string => !!x)) {
    const [language, script] = parts(want);
    const hit = available.find((a) => a.toLowerCase() === want.toLowerCase())
      || available.find((a) => { const p = parts(a); return p[0] === language && p[1] === script; })
      || available.find((a) => parts(a)[0] === language);
    if (hit) return hit;
  }
  return SOURCE_LANGUAGE;
}

/** A language's name in that language, for the Language menu: Español latinoamericano, 繁體中文. */
export function languageName(code: string): string {
  let name = code;
  try { name = new Intl.DisplayNames([code], { type: 'language' }).of(code) || code; } catch { /* unknown code */ }
  return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
}

const HAN_SET = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}　-〿＀-￯]/u;
/** Width for `max`: whole letters, a Chinese, Japanese or Korean character counting two; tags count nothing. */
export function width(line: string): number {
  const text = line.replace(/\{[^{}]*\}/g, '');
  const letters = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text)].map((s) => s.segment) : Array.from(text);
  return letters.reduce((n, g) => n + (HAN_SET.test(g) ? 2 : 1), 0);
}

/** A test language made from a line before its blanks are filled. */
export function fake(lang: string, line: string, max?: number): string {
  const HAN = '的一是不了人我在有他这中大来上国个到说们为子和你地出道也时年得就那要下以生会自着去之过家学对';
  const ARABIC = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
  const ACCENT: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', n: 'ñ', c: 'ç', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', N: 'Ñ' };
  const out = line.split(/(\{[^{}]*\})/).map((part, i) => {
    if (i % 2) return part;
    if (lang === 'zh-XC') return part
      .replace(/[\p{L}\p{M}]+/gu, (w) => Array.from({ length: Math.ceil([...w].length / 2) }, (_, k) => HAN[(w.codePointAt(k)! * 7 + k) % HAN.length]).join(''))
      .replace(/[,.!?:;]/g, (p) => '，。！？：；'[',.!?:;'.indexOf(p)]).replace(/[ \t]+/g, '');
    if (lang === 'ar-XB') return part.replace(/\p{L}\p{M}*/gu, (c) => ARABIC[c.codePointAt(0)! % ARABIC.length]);
    return part.replace(/[aeiounc]/gi, (c) => ACCENT[c] || c);
  }).join('');
  if (lang !== 'en-XA') return out;
  if (max) return '[' + out + '·'.repeat(Math.max(0, max - width(out) - 2)) + ']';
  return out.split('\n').map((p) => '[' + p + ' ' + '·'.repeat(Math.ceil(width(p) * 0.4)) + ']').join('\n');
}

export type Values = Record<string, string | number>;
/** A piece of a line: text, or the control for an action (the game draws it as a key cap or button). */
export type Part = string | { key: string };
/** Unicode first-strong isolate and pop: a filled-in value can't scramble a right-to-left sentence. */
const FSI = String.fromCharCode(0x2068), PDI = String.fromCharCode(0x2069);

export interface Translator {
  lang: string;
  dir: 'ltr' | 'rtl';
  /** A line in the player's language with its tags filled; a missing or broken translation shows the original. */
  t(id: string, values?: Values): string;
  /** The same line cut at its {key:action} tags, so the game can draw each control as a key cap. */
  parts(id: string, values?: Values): Part[];
  /** Whether a line exists. */
  has(id: string): boolean;
  /** The text a content field shows: its translation (by line id) or the original, or the test language made from it. */
  content(id: string, original: string): string;
}

/**
 * `source` is the game's own lines, `translations` the game-translations block (often empty),
 * `controlLabel` the game's own label for an action on the device in use.
 */
export function translator(lang: string, source: Block, translations: Translations, controlLabel: (action: string) => string): Translator {
  const dir: 'ltr' | 'rtl' = RTL.test(lang) ? 'rtl' : 'ltr';
  const isFake = FAKE.includes(lang);
  const table = own<Lines>(own(translations, lang), 'lines') ?? {};
  const textLangOf = (translated: boolean) => (translated ? lang : source.language);
  const isolate = (s: string) => (dir === 'rtl' ? FSI + s + PDI : s);
  const fill = (line: string, values: Values, textLang: string) =>
    line.replace(/\{key:(\w+)\}/g, (_tag, action: string) => isolate(controlLabel(action))).replace(/\{(\w+)\}/g, (tag, name: string) => {
      if (!Object.prototype.hasOwnProperty.call(values, name)) return tag;
      const v = values[name];
      let text = String(v);
      if (typeof v === 'number') { try { text = new Intl.NumberFormat(textLang).format(v); } catch { /* keep */ } }
      return isolate(text);
    });
  const pickForm = (line: Line, values: Values, textLang: string): string => {
    if (typeof line === 'string') return line;
    const n = Number(values.count ?? 0);
    let form: string | undefined;
    try { form = own<string>(line, new Intl.PluralRules(textLang).select(n)); } catch { /* unknown locale */ }
    return (n === 0 && line.zero) || form || line.other || Object.values(line).find((s) => typeof s === 'string') || '';
  };
  /** The line's text in the player's language, plural form picked, test language applied; null when missing. */
  const raw = (id: string, values: Values): { text: string; textLang: string; translated: boolean } | null => {
    const tr = own<unknown>(table, id);
    const translated = !isFake && usable(tr);
    const line: Line | undefined = translated ? (tr as Line) : own<Line>(source.lines, id);
    if (!usable(line)) return null;
    const textLang = textLangOf(translated);
    let text = pickForm(line, values, textLang);
    if (isFake) text = fake(lang, text, own<number>(source.max, id));
    return { text, textLang, translated };
  };
  // an untranslated line in a language of the other direction keeps its own direction
  const wrapDir = (text: string, translated: boolean) => (!translated && !isFake && RTL.test(source.language) !== (dir === 'rtl') ? FSI + text + PDI : text);
  return {
    lang,
    dir,
    has: (id) => usable(own(source.lines, id)),
    t(id, values = {}) {
      const r = raw(id, values);
      return r ? wrapDir(fill(r.text, values, r.textLang), r.translated) : id;
    },
    parts(id, values = {}) {
      const r = raw(id, values);
      if (!r) return [id];
      return r.text.split(/\{key:(\w+)\}/).map((piece, i): Part => (i % 2 ? { key: piece } : fill(piece, values, r.textLang))).filter((p) => p !== '');
    },
    content(id, original) {
      if (isFake) return fake(lang, original);
      const tr = own<unknown>(table, id);
      return typeof tr === 'string' && tr !== '' ? tr : original;
    },
  };
}

/** What a typewriter reveals one step at a time: whole letters (whole words in Arabic script). A {tag} is one step. */
export function pieces(lang: string, line: string): string[] {
  const seg = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(lang, { granularity: JOINED.test(lang) ? 'word' : 'grapheme' }) : null;
  return line.split(/(\{[^{}]*\})/).flatMap((part, i) => (i % 2 ? [part] : seg ? [...seg.segment(part)].map((s) => s.segment) : Array.from(part))).filter((p) => p !== '');
}

/** Write a block for a <script type="application/json">: every < as <, so no line can end it early. */
export const blockJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
