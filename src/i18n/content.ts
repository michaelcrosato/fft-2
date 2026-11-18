// Every player-facing text in the game's content (src/data), each under a line id. The build writes
// them into the game-lines block; at start-up localizeContent() swaps in the player's language (or a
// test language) in place, so the rest of the game reads its data as before.
import { STATUS } from '../battle/status';
import { ABILITIES, ARTEFACTS, BATTLES, CHARACTERS, CHRONICLE, ERRANDS, ITEMS, JOBS, MAPS, NODES, SCENES, SIDE, STORY } from '../data/db';
import { rumors } from '../data/misc/rumors';
import { ZODIAC_STONES } from '../data/misc/zodiacStones';
import type { SceneCmd } from '../data/types';
import { SOURCE_LANGUAGE } from './core';
import { contentText, isTestLanguage, lang } from './index';

export interface Field { id: string; get(): string; set(v: string): void; note?: string }

/** camelCase or any id → lowercase words joined by underscores. */
export const slug = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'x';
/** A short, stable hash of a line's text (FNV-1a, base 36). */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36).padStart(7, '0').slice(0, 7);
}

type Rec = Record<string | number, unknown>;
function prop(out: Field[], id: string, obj: Rec, key: string | number, note?: string) {
  const v = obj[key];
  if (typeof v !== 'string' || !v.trim()) return;
  out.push({ id, get: () => obj[key] as string, set: (x) => { obj[key] = x; }, note });
}

const MOOD: Record<string, string> = { shout: 'shouting', whisper: 'whispering', think: 'thinking to themself' };

function sceneLines(out: Field[], cmds: SceneCmd[], prefix: string, cast: Map<string, string>) {
  for (const c of cmds) {
    switch (c[0]) {
      case 'actor': {
        const opts = c[6];
        cast.set(c[1], opts?.name ?? CHARACTERS.get(c[2])?.name ?? JOBS.get(c[2])?.name ?? c[2]);
        if (opts?.name) prop(out, `${prefix}.extra_${slug(c[1])}`, opts as Rec, 'name', 'The name of a minor character in the scene.');
        break;
      }
      case 'say': {
        const who = cast.get(c[1]) ?? CHARACTERS.get(c[1])?.name ?? c[1];
        const mood = c[3]?.mood ? MOOD[c[3].mood] : undefined;
        prop(out, `${prefix}.${slug(c[1])}_${hash(c[2])}`, c as unknown as Rec, 2, `${who}${mood ? `, ${mood}` : ''}.`);
        break;
      }
      case 'narrate': prop(out, `${prefix}.narrate_${hash(c[1])}`, c as unknown as Rec, 1, 'Narration, read over a dark backdrop.'); break;
      case 'title':
        prop(out, `${prefix}.title_${hash(c[1])}`, c as unknown as Rec, 1, 'A chapter or title card.');
        if (c[2]) prop(out, `${prefix}.subtitle_${hash(c[2])}`, c as unknown as Rec, 2, 'The line under a chapter or title card.');
        break;
      case 'choice':
        prop(out, `${prefix}.choice_${hash(c[1])}`, c as unknown as Rec, 1, 'A question the player answers by choosing.');
        for (const opt of c[2]) { prop(out, `${prefix}.option_${hash(opt[0])}`, opt as unknown as Rec, 0, 'One answer the player can choose.'); sceneLines(out, opt[1], prefix, cast); }
        break;
      case 'if': sceneLines(out, c[2], prefix, cast); if (c[3]) sceneLines(out, c[3], prefix, cast); break;
    }
  }
}

/** Every content field players read, in a fixed order. */
export function contentFields(): Field[] {
  const out: Field[] = [];
  for (const j of JOBS.values()) {
    const k = `job.${slug(j.id)}`;
    prop(out, `${k}.name`, j as unknown as Rec, 'name', j.monster ? 'A kind of monster.' : 'A job (character class).');
    prop(out, `${k}.desc`, j as unknown as Rec, 'desc');
    prop(out, `${k}.skillset_name`, j.skillset as unknown as Rec, 'name', 'The name of a job\'s command list in battle.');
    prop(out, `${k}.skillset_desc`, j.skillset as unknown as Rec, 'desc');
  }
  for (const a of ABILITIES.values()) {
    prop(out, `ability.${slug(a.id)}.name`, a as unknown as Rec, 'name', `An ability (${a.kind}).`);
    prop(out, `ability.${slug(a.id)}.desc`, a as unknown as Rec, 'desc');
  }
  for (const i of ITEMS.values()) {
    prop(out, `item.${slug(i.id)}.name`, i as unknown as Rec, 'name', `An item (${i.kind}).`);
    prop(out, `item.${slug(i.id)}.desc`, i as unknown as Rec, 'desc');
  }
  for (const s of Object.values(STATUS)) {
    const kind = `A ${s.bad ? 'harmful' : 'helpful'} status effect in battle`;
    prop(out, `status.${slug(s.id)}.name`, s as unknown as Rec, 'name', s.hidden ? `${kind}, rarely shown.` : `${kind}. Pops up over units and labels them on unit cards; keep it short.`);
    prop(out, `status.${slug(s.id)}.desc`, s as unknown as Rec, 'desc', s.hidden ? `What this ${s.bad ? 'harmful' : 'helpful'} status effect means; rarely shown.` : 'What a status effect does: a tooltip on unit cards, and the Field Manual.');
  }
  for (const c of CHARACTERS.values()) {
    const k = `character.${slug(c.id)}`;
    prop(out, `${k}.name`, c as unknown as Rec, 'name', 'A character\'s name.');
    prop(out, `${k}.full_name`, c as unknown as Rec, 'fullName', 'A character\'s full name.');
    prop(out, `${k}.title`, c as unknown as Rec, 'title', `${c.name}'s title or role.`);
    for (const entry of c.bio) prop(out, `${k}.bio_${hash(entry[1])}`, entry as unknown as Rec, 1, `From ${c.name}'s biography in the Chronicle.`);
  }
  for (const m of MAPS.values()) {
    prop(out, `map.${slug(m.id)}.name`, m as unknown as Rec, 'name', 'A battlefield or scene location.');
    prop(out, `map.${slug(m.id)}.desc`, m as unknown as Rec, 'desc');
  }
  for (const b of BATTLES.values()) {
    const k = `battle.${slug(b.id)}`;
    prop(out, `${k}.name`, b as unknown as Rec, 'name', 'A battle\'s name, shown before it starts.');
    prop(out, `${k}.hint`, b as unknown as Rec, 'hint', 'A tip shown on the deployment screen.');
    b.units.forEach((u, i) => prop(out, `${k}.unit_${slug(u.id ?? String(i))}`, u as unknown as Rec, 'name', 'A soldier\'s name or rank in this battle.'));
    (b.events ?? []).forEach((e, i) => sceneLines(out, e.script, `${k}.event${i}`, new Map()));
  }
  for (const s of SCENES.values()) sceneLines(out, s.cmds, `scene.${slug(s.id)}`, new Map());
  for (const st of STORY) prop(out, `story.${slug(st.id)}.objective`, st as unknown as Rec, 'objective', 'The current objective, shown on the world map.');
  for (const q of SIDE) prop(out, `side.${slug(q.id)}.objective`, q as unknown as Rec, 'objective', 'A side quest\'s objective.');
  for (const n of NODES.values()) {
    prop(out, `place.${slug(n.id)}.name`, n as unknown as Rec, 'name', 'A place on the world map.');
    // one line per region, shared by every place in it
    prop(out, `region.${slug(n.region)}`, n as unknown as Rec, 'region', 'A region of the kingdom.');
    prop(out, `place.${slug(n.id)}.desc`, n as unknown as Rec, 'desc');
  }
  for (const e of ERRANDS.values()) {
    prop(out, `errand.${slug(e.id)}.title`, e as unknown as Rec, 'title', 'A tavern errand\'s title.');
    prop(out, `errand.${slug(e.id)}.desc`, e as unknown as Rec, 'desc');
    prop(out, `errand.${slug(e.id)}.report`, e as unknown as Rec, 'report', 'What the company reports when the errand succeeds.');
  }
  for (const a of ARTEFACTS.values()) {
    prop(out, `artefact.${slug(a.id)}.name`, a as unknown as Rec, 'name', 'An artefact the company finds.');
    prop(out, `artefact.${slug(a.id)}.desc`, a as unknown as Rec, 'desc');
  }
  for (const c of CHRONICLE.values()) {
    prop(out, `chronicle.${slug(c.id)}.title`, c as unknown as Rec, 'title', 'An entry in the Chronicle, the game\'s record of events.');
    prop(out, `chronicle.${slug(c.id)}.text`, c as unknown as Rec, 'text');
  }
  for (const r of rumors) {
    prop(out, `rumor.${slug(r.id)}.title`, r as unknown as Rec, 'title', 'A rumour heard in a tavern.');
    prop(out, `rumor.${slug(r.id)}.text`, r as unknown as Rec, 'text');
  }
  for (const z of ZODIAC_STONES) {
    prop(out, `stone.${slug(z.sign)}.where`, z as unknown as Rec, 'where', 'Where the company won this Zodiac Stone.');
    prop(out, `stone.${slug(z.sign)}.lore`, z as unknown as Rec, 'lore');
  }
  return out;
}

/** Shown text → its original, so the typewriter keeps the original line's timing. */
export const SOURCE_OF = new Map<string, string>();

let localized = false;
/** Put the player's language into the content, once, before anything is shown. */
export function localizeContent(): void {
  if (localized || (lang === SOURCE_LANGUAGE && !isTestLanguage)) return;
  localized = true;
  for (const f of contentFields()) {
    const original = f.get();
    const shown = contentText(f.id, original);
    if (shown !== original) { f.set(shown); SOURCE_OF.set(shown, original); }
  }
}
