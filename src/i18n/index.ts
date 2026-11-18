// The game's words in the player's language (AI Hub Languages v1). UI lines live in ui/*.ts and
// go through t(); content (names, descriptions, dialogue) lives in src/data and is swapped in place
// by localizeContent() (content.ts). The build writes both into the page's game-lines block.
import { FAKE, SOURCE_LANGUAGE, languageName, pickLanguage, pieces as cut, translator, type Block, type Translations, type Values } from './core';
import { UI_LINES, UI_MAX } from './ui';

const hasDom = typeof document !== 'undefined';
function block<T>(id: string): T | null {
  if (!hasDom) return null;
  try { return JSON.parse(document.getElementById(id)?.textContent ?? '') as T; } catch { return null; }
}
const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const SAVED_KEY = typeof location !== 'undefined' ? 'lang:' + location.pathname : 'lang:/';
function saved(): string | null { try { return localStorage.getItem(SAVED_KEY); } catch { return null; } }

const SOURCE: Block = { version: 1, language: SOURCE_LANGUAGE, lines: UI_LINES, max: UI_MAX, names: [], brief: '' };
const TRANSLATIONS: Translations = block<Translations>('game-translations') ?? {};
const AVAILABLE = [SOURCE_LANGUAGE, ...Object.keys(TRANSLATIONS).filter((k) => k !== SOURCE_LANGUAGE)];
const asked = params.get('lang');

/** The language the game shows. */
export const lang = pickLanguage(AVAILABLE, asked, saved(), typeof navigator !== 'undefined' ? navigator.languages ?? [] : []);
/** True for the three test languages (?lang=en-XA, zh-XC, ar-XB). */
export const isTestLanguage = FAKE.includes(lang);
/** The language the hub chose in the address: the game's own Language menu then stays away. */
export const langFromAddress = !!asked;

let controlLabelFn = (action: string) => action;
/** The game's own label for an action on the device in use (the input layer sets it). */
export function setControlLabel(fn: (action: string) => string) { controlLabelFn = fn; }

const T = translator(lang, SOURCE, TRANSLATIONS, (a) => controlLabelFn(a));
/** Text direction of the language shown: set it where text is drawn. */
export const dir = T.dir;
/** A UI line in the player's language, its blanks filled. */
export const t = (id: string, values?: Values) => T.t(id, values);
/** A UI line cut at its {key:action} tags, for drawing controls as key caps. */
export const tParts = (id: string, values?: Values) => T.parts(id, values);
export type { Part, Values } from './core';
/** A content field's text in the player's language (content.ts uses it). */
export const contentText = (id: string, original: string) => T.content(id, original);

if (hasDom && document.documentElement) document.documentElement.lang = lang;

/** The languages the game has, for the Language menu. */
export const languages = () => AVAILABLE.slice();
export { languageName };
/** The Language menu's choice: saved, then the game restarts in it. */
export function chooseLanguage(code: string) {
  try { localStorage.setItem(SAVED_KEY, code); } catch { /* blocked storage: the reload still asks the browser */ }
  location.reload();
}

/** HTML written in the page with data-line gets its line. */
export function fillPage(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-line]')) { el.textContent = t(el.dataset.line!); el.dir = dir; }
}

/** What the typewriter reveals one step at a time. */
export const pieces = (line: string) => cut(lang, line);

// Intl needs a real locale: the test languages format as their base language.
const intlLang = isTestLanguage ? lang.slice(0, 2) : lang;
export const fmtNum = (n: number) => { try { return new Intl.NumberFormat(intlLang).format(n); } catch { return String(n); } };
export const fmtDate = (ms: number) => { try { return new Intl.DateTimeFormat(intlLang, { dateStyle: 'medium', timeStyle: 'short' }).format(ms); } catch { return new Date(ms).toISOString(); } };
/** A list in the player's language: "A, B, and C" (or "A or B" with type 'disjunction', "A, B, C" with style 'narrow'). */
export const fmtList = (items: string[], opts: Intl.ListFormatOptions = {}) => { try { return new Intl.ListFormat(intlLang, { style: 'long', type: 'conjunction', ...opts }).format(items); } catch { return items.join(', '); } };
/** Capitals in the player's language (Turkish i → İ). */
export const upper = (s: string) => s.toLocaleUpperCase(intlLang);
/** Sort names as the player's language does. */
export const compare = (a: string, b: string) => a.localeCompare(b, intlLang);
