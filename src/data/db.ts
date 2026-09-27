// Central content registry. Every file under src/data/<folder>/ is auto-collected
// (import.meta.glob), so new content files need no manual registration.
// A content module may export any of these arrays (in any folder):
//   jobs, monsters, abilities, items, characters, maps, battles, scenes, story,
//   side, nodes, edges, shopStock, errands, artefacts, chronicle
import type {
  AbilityDef, ArtefactDef, BattleDef, CharacterDef, ChronicleEvent, ErrandDef, ItemDef,
  JobDef, MapDef, SceneDef, ShopStock, SideQuestStep, StoryStep, WorldEdge, WorldNode,
} from './types';

type Mod = Record<string, unknown>;
const all = import.meta.glob<Mod>(
  ['./jobs/**/*.ts', './abilities/**/*.ts', './items/**/*.ts', './monsters/**/*.ts', './characters/**/*.ts',
   './maps/**/*.ts', './battles/**/*.ts', './scenes/**/*.ts', './story/**/*.ts', './world/**/*.ts', './misc/**/*.ts'],
  { eager: true },
);

function collect<T>(key: string): T[] {
  const out: T[] = [];
  for (const path of Object.keys(all).sort()) {
    const v = all[path][key];
    if (Array.isArray(v)) out.push(...(v as T[]));
  }
  return out;
}

/** Ids defined more than once; the later definition replaces the earlier one. The validator rejects these. */
export const DUPLICATE_IDS: string[] = [];

function index<T extends { id: string }>(arr: T[], kind: string): Map<string, T> {
  const m = new Map<string, T>();
  for (const a of arr) {
    if (m.has(a.id)) { console.warn(`[db] duplicate ${kind} id: ${a.id}`); DUPLICATE_IDS.push(`${kind} ${a.id}`); }
    m.set(a.id, a);
  }
  return m;
}

export const JOBS = index<JobDef>([...collect<JobDef>('jobs'), ...collect<JobDef>('monsters')], 'job');
export const ABILITIES = index<AbilityDef>(collect<AbilityDef>('abilities'), 'ability');
export const ITEMS = index<ItemDef>(collect<ItemDef>('items'), 'item');
export const CHARACTERS = index<CharacterDef>(collect<CharacterDef>('characters'), 'character');
export const MAPS = index<MapDef>(collect<MapDef>('maps'), 'map');
export const BATTLES = index<BattleDef>(collect<BattleDef>('battles'), 'battle');
export const SCENES = index<SceneDef>(collect<SceneDef>('scenes'), 'scene');
export const STORY: StoryStep[] = collect<StoryStep>('story');
export const SIDE: SideQuestStep[] = collect<SideQuestStep>('side');
export const NODES = index<WorldNode>(collect<WorldNode>('nodes'), 'node');
export const EDGES: WorldEdge[] = collect<WorldEdge>('edges');
export const SHOP_STOCK: ShopStock[] = collect<ShopStock>('shopStock');
export const ERRANDS = index<ErrandDef>(collect<ErrandDef>('errands'), 'errand');
export const ARTEFACTS = index<ArtefactDef>(collect<ArtefactDef>('artefacts'), 'artefact');
export const CHRONICLE = index<ChronicleEvent>(collect<ChronicleEvent>('chronicle'), 'chronicle');

export function job(id: string): JobDef {
  const j = JOBS.get(id);
  if (!j) throw new Error(`Unknown job ${id}`);
  return j;
}
export function ability(id: string): AbilityDef {
  const a = ABILITIES.get(id);
  if (!a) throw new Error(`Unknown ability ${id}`);
  return a;
}
export function mapDef(id: string): MapDef {
  const m = MAPS.get(id);
  if (!m) throw new Error(`Unknown map ${id}`);
  return m;
}

/** Generic job ids in job-tree order */
export function genericJobs(): JobDef[] {
  return [...JOBS.values()].filter((j) => j.generic && !j.monster);
}
