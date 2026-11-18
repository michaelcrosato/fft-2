import { describe, expect, it } from 'vitest';
import { FAKE, ID, fake, pickLanguage, pieces, translator, width, type Block } from '../src/i18n/core';
import { contentFields } from '../src/i18n/content';
import { buildLines } from '../src/i18n/extract';
import { UI_DUPLICATES, UI_LINES, UI_MAX } from '../src/i18n/ui';
// 52in1's own checker for the block
import { linesProblems } from '../tools/hub/catalogue-check.mjs';

const source: Block = {
  version: 1, language: 'en', names: [], brief: 'b',
  lines: {
    'menu.start': 'Start',
    'hud.lives': { zero: 'No lives left', one: '{count} life left', other: '{count} lives left' },
    'help.jump': 'Press {key:jump} to jump, {player}.',
    'gold': 'Gold: {n}',
  },
  max: { 'menu.start': 12 },
};
const label = (a: string) => (a === 'jump' ? 'Space' : a);

describe('lines', () => {
  it('fills blanks, picks plural forms, formats numbers and names controls', () => {
    const T = translator('en', source, {}, label);
    expect(T.t('menu.start')).toBe('Start');
    expect(T.t('hud.lives', { count: 0 })).toBe('No lives left');
    expect(T.t('hud.lives', { count: 1 })).toBe('1 life left');
    expect(T.t('hud.lives', { count: 3 })).toBe('3 lives left');
    expect(T.t('gold', { n: 12500 })).toBe('Gold: 12,500');
    expect(T.t('help.jump', { player: 'Rhen' })).toBe('Press Space to jump, Rhen.');
    expect(T.parts('help.jump', { player: 'Rhen' })).toEqual(['Press ', { key: 'jump' }, ' to jump, Rhen.']);
    expect(T.t('missing.line')).toBe('missing.line');
  });

  it('uses a translation, and shows the original for a missing, empty or broken one (critical)', () => {
    const T = translator('de', source, { de: { lines: { 'menu.start': 'Starten', gold: '', 'hud.lives': { one: 7 } as never } } }, label);
    expect(T.t('menu.start')).toBe('Starten');
    expect(T.t('gold', { n: 12500 })).toBe('Gold: 12,500'); // empty translation → original (formatted in its own language)
    expect(T.t('hud.lives', { count: 2 })).toBe('2 lives left'); // broken plural forms → original
    expect(T.t('help.jump', { player: 'R' })).toBe('Press Space to jump, R.'); // missing → original
    expect(T.content('item.x.name', 'Potion')).toBe('Potion');
    const D = translator('de', source, { de: { lines: { 'item.x.name': 'Trank' } } }, label);
    expect(D.content('item.x.name', 'Potion')).toBe('Trank');
  });

  it('isolates filled values in right-to-left languages', () => {
    const T = translator('ar', source, { ar: { lines: { gold: 'ذهب: {n}' } } }, label);
    expect(T.dir).toBe('rtl');
    const FSI = String.fromCharCode(0x2068), PDI = String.fromCharCode(0x2069);
    expect(T.t('gold', { n: 5 })).toBe(`ذهب: ${FSI}${new Intl.NumberFormat('ar').format(5)}${PDI}`);
  });

  it('makes the three test languages from the original lines', () => {
    const XA = translator('en-XA', source, {}, label);
    expect(XA.t('menu.start')).toMatch(/^\[Stárt·+\]$/);
    expect(width(XA.t('menu.start'))).toBe(12); // exactly its max
    expect(XA.t('help.jump', { player: 'Rhen' })).toMatch(/^\[Préss Space tó júmp, Rhen\. ·+\]$/);
    const ZH = translator('zh-XC', source, {}, label);
    expect(ZH.t('menu.start')).not.toMatch(/[A-Za-z ]/);
    const AR = translator('ar-XB', source, {}, label);
    expect(AR.dir).toBe('rtl');
    expect(AR.t('menu.start')).toMatch(/^[؀-ۿ]+$/);
    expect(fake('en-XA', '{hero} waits')).toContain('{hero}');
  });

  it('chooses the language in the hub\'s order and matching rules', () => {
    const have = ['en', 'es-419', 'zh-Hans', 'zh-Hant', 'pt-BR'];
    expect(pickLanguage(have, 'es-419', null, [])).toBe('es-419');
    expect(pickLanguage(have, null, 'pt-BR', ['es-MX'])).toBe('pt-BR');
    expect(pickLanguage(have, null, null, ['es-MX'])).toBe('es-419');
    expect(pickLanguage(have, null, null, ['zh-TW'])).toBe('zh-Hant');
    expect(pickLanguage(have, null, null, ['pt-PT'])).toBe('pt-BR');
    expect(pickLanguage(have, null, null, ['fr'])).toBe('en');
    for (const code of FAKE) expect(pickLanguage(have, code, 'es-419', [])).toBe(code);
  });

  it('cuts a line into whole letters for the typewriter (whole words in Arabic script)', () => {
    // whole letters: no piece starts with a combining mark, and together they are the line
    const hindi = pieces('hi', 'नमस्ते दुनिया');
    expect(hindi.join('')).toBe('नमस्ते दुनिया');
    expect(hindi.some((p) => /^\p{M}/u.test(p))).toBe(false);
    expect(hindi.length).toBeLessThan([...'नमस्ते दुनिया'].length);
    expect(pieces('ar', 'مرحبا بك')).toEqual(['مرحبا', ' ', 'بك']);
    expect(pieces('en', 'Hi {hero}!')).toEqual(['H', 'i', ' ', '{hero}', '!']);
    expect(width('你好ab')).toBe(6);
  });
});

describe('the game\'s lines', () => {
  it('UI lines have valid ids, no duplicates, plain text and balanced tags', () => {
    expect(UI_DUPLICATES).toEqual([]);
    for (const [id, line] of Object.entries(UI_LINES)) {
      expect(id, id).toMatch(ID);
      for (const s of typeof line === 'string' ? [line] : Object.values(line)) {
        expect(s, id).not.toMatch(/<[a-z/!]/i);
        expect(s.split('{').length, id).toBe(s.split('}').length);
      }
      if (typeof line !== 'string') { expect(line.one, id).toBeDefined(); expect(line.other, id).toBeDefined(); }
    }
    for (const [id, m] of Object.entries(UI_MAX)) expect(width(String(UI_LINES[id] ?? '')), `${id} is wider than its max`).toBeLessThanOrEqual(m);
  });

  it('builds a game-lines block that 52in1\'s checker accepts', () => {
    const { block, conflicts } = buildLines();
    expect(conflicts).toEqual([]);
    const { problems } = linesProblems(JSON.stringify(block).replace(/</g, '\\u003c'), { lang: 'en' });
    expect(problems).toEqual([]);
    const ids = Object.keys(block.lines);
    expect(ids.filter((id) => id.startsWith('scene.')).length).toBeGreaterThan(2500);
    expect(ids.filter((id) => id.startsWith('ability.')).length).toBeGreaterThan(1000);
    expect(block.names).toContain('Ivaldis');
    expect(block.brief.length).toBeGreaterThan(500);
  });

  it('every content field can be swapped and restored in place', () => {
    const fields = contentFields();
    expect(fields.length).toBeGreaterThan(6000);
    for (const f of fields) {
      const original = f.get();
      f.set(fake('en-XA', original));
      expect(f.get()).not.toBe(original);
      f.set(original);
      expect(f.get()).toBe(original);
    }
  });
});
