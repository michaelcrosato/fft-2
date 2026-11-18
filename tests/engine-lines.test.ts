// The battle engine's words go through the game's lines (src/i18n/ui/engine.ts), status names and
// descriptions are content, and zodiac signs have one helper. Game logic must never read that
// text, so a battle played in another language behaves exactly as in English.
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UI_LINES } from '../src/i18n/ui';
import { buildLines } from '../src/i18n/extract';
import type { StatKey } from '../src/data/types';

/** The engine's modules, loaded afresh: the language is picked when src/i18n is first loaded. */
async function engine() {
  vi.resetModules();
  const { Battle } = await import('../src/battle/battle');
  const { MapGrid } = await import('../src/battle/grid');
  const { BattleUnit } = await import('../src/battle/unit');
  const { STATUS } = await import('../src/battle/status');
  const { zodiacName } = await import('../src/battle/zodiac');
  const { createGeneric } = await import('../src/game/roster');
  const { Rng } = await import('../src/core/rng');
  const { ABILITIES, mapDef } = await import('../src/data/db');
  const { localizeContent } = await import('../src/i18n/content');
  const { lang } = await import('../src/i18n');
  const rng = new Rng(42);
  const mk = (team: number, x: number, z: number, lhand?: string) => {
    const r = createGeneric({ gender: 'm', level: 20, job: 'squire', rng });
    r.equip = { rhand: 'broadsword', head: 'leatherCap', body: 'clothes', ...(lhand ? { lhand } : {}) };
    const u = new BattleUnit(r, team, team === 0);
    u.x = x; u.z = z; u.facing = team === 0 ? 'N' : 'S';
    return u;
  };
  /** A blinded swordsman swings at a foe with a shield: many misses, some blocked, some evaded. */
  const swings = (n: number) => {
    const attacker = mk(0, 3, 8), foe = mk(1, 3, 7, 'escutcheon');
    const def = { id: 't', name: 't', map: 'training', units: [], victory: { type: 'defeatAll' } } as never;
    const b = new Battle({ def, grid: new MapGrid(mapDef('training')), units: [attacker, foe], inventory: new Map(), seed: 7 });
    b.addStatus(attacker, 'blind');
    const out = [];
    for (let i = 0; i < n; i++) {
      foe.hp = foe.maxHp; foe.statuses.delete('ko'); foe.x = 3; foe.z = 7;
      out.push(b.hitUnit(attacker, foe, ABILITIES.get('attack')!, {}, []));
    }
    return { b, attacker, foe, hits: out };
  };
  return { lang, STATUS, ABILITIES, zodiacName, localizeContent, swings };
}

/** Play the page as if the hub had asked for German, with a few lines translated. */
function german(lines: Record<string, string>) {
  vi.stubGlobal('location', { search: '?lang=de', pathname: '/' });
  const block = { textContent: JSON.stringify({ de: { lines } }) };
  vi.stubGlobal('document', { getElementById: (id: string) => (id === 'game-translations' ? block : null), documentElement: null });
}

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('the battle engine\'s words', () => {
  it('names every line it uses, and every stat and weapon kind it fills in', () => {
    const ids = new Set<string>();
    for (const file of readdirSync('src/battle')) {
      for (const m of readFileSync(`src/battle/${file}`, 'utf8').matchAll(/\bline\('([a-z0-9_.]+)'/g)) ids.add(m[1]);
    }
    expect(ids.size).toBeGreaterThan(40);
    for (const id of ids) expect(UI_LINES[id], id).toBeDefined();
    const stats: StatKey[] = ['hp', 'mp', 'speed', 'pa', 'ma', 'move', 'jump', 'brave', 'faith'];
    for (const s of stats) expect(UI_LINES[`menus.stat.${s}`], s).toBeDefined();
    for (const cat of ['sword', 'knightSword']) expect(UI_LINES[`town.item.cat.${cat.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())}`], cat).toBeDefined();
  });

  it('puts status names and descriptions and the engine lines in the game-lines block', () => {
    const { block, conflicts } = buildLines();
    expect(conflicts).toEqual([]);
    expect(block.lines['status.poison.name']).toBe('Poison');
    expect(block.lines['status.poison.desc']).toBe('Loses HP at the end of every turn.');
    expect(block.lines['engine.guard.blocked']).toBe('Blocked');
    expect(block.notes?.['status.poison.name']).toMatch(/status effect/);
  });

  it('keeps the English it showed before', async () => {
    const e = await engine();
    expect(e.lang).toBe('en');
    const { b, attacker, foe, hits } = e.swings(200);
    const blocked = hits.filter((h) => h.guardKind === 'blocked');
    expect(blocked.length).toBeGreaterThan(0);
    for (const h of blocked) expect(h.guard).toBe('Blocked');
    for (const h of hits.filter((x) => x.guardKind === 'evaded')) expect(h.guard).toBeUndefined();
    expect(b.unusableReason(attacker, { ...e.ABILITIES.get('attack')!, mp: 999 })).toBe('Not enough MP');
    expect(b.previewOn(attacker, foe, e.ABILITIES.get('assassinNightshade')!).status).toBe('Poison 60%');
    expect(e.zodiacName('serpentarius')).toBe('Serpentarius');
  });

  it('plays a battle in another language exactly as in English, and shows its words', async () => {
    const english = (await engine()).swings(200).hits;
    german({
      'engine.guard.blocked': 'Abgewehrt',
      'engine.unusable.mp': 'Zu wenig MP',
      'engine.preview.status_chance': '{status} ({chance} %)',
      'status.poison.name': 'Gift',
      'hud.zodiac.aries': 'Widder',
    });
    const e = await engine();
    expect(e.lang).toBe('de');
    e.localizeContent();
    // a status name is content: swapped in place, so the engine's preview reads it in German
    expect(e.STATUS.poison.name).toBe('Gift');
    expect(e.STATUS.poison.desc).toBe('Loses HP at the end of every turn.'); // untranslated: the original
    const { b, attacker, foe, hits } = e.swings(200);
    // the same blows land, miss, are blocked or evaded: only the words differ
    expect(hits.map((h) => [h.miss, h.guardKind, h.dmg])).toEqual(english.map((h) => [h.miss, h.guardKind, h.dmg]));
    for (const h of hits.filter((x) => x.guardKind === 'blocked')) expect(h.guard).toBe('Abgewehrt');
    expect(b.unusableReason(attacker, { ...e.ABILITIES.get('attack')!, mp: 999 })).toBe('Zu wenig MP');
    expect(b.previewOn(attacker, foe, e.ABILITIES.get('assassinNightshade')!).status).toBe('Gift (60 %)');
    expect(e.zodiacName('aries')).toBe('Widder');
    expect(e.zodiacName('taurus')).toBe('Taurus');
  });
});
