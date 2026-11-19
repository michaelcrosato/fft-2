// Art style ids and settings (docs/PLAN-ART-STYLES.md, *The settings*). No three.js here: the options
// (src/game/state.ts) and the tests use these without a renderer.

export const STYLE_IDS = ['none', 'boldCel', 'brightToon', 'inkWash', 'pixel', 'flatPaint'] as const;
export type StyleId = (typeof STYLE_IDS)[number];

/** the styles the game offers so far (each phase of the plan adds one) */
export const IMPLEMENTED_STYLES: ReadonlySet<StyleId> = new Set<StyleId>(['none', 'boldCel', 'brightToon', 'pixel']);

export const BAND_CHOICES = ['auto', 2, 3, 4, 5] as const;
export type BandChoice = (typeof BAND_CHOICES)[number];
export const OUTLINE_CHOICES = ['auto', 'off', 'thin', 'medium', 'thick'] as const;
export type OutlineChoice = (typeof OUTLINE_CHOICES)[number];
export const LIGHT_CHOICES = ['auto', 1, 2, 3] as const;
export type LightChoice = (typeof LIGHT_CHOICES)[number];
export const LAMP_CHOICES = ['auto', 0, 2, 4, 8] as const;
export type LampChoice = (typeof LAMP_CHOICES)[number];

/** the art style settings as stored in Options (flat keys, like the others) */
export interface StyleSettings {
  styleLinked: boolean;
  styleEnv: StyleId;
  styleActors: StyleId;
  styleEnvStrength: number;
  styleActorsStrength: number;
  styleBands: BandChoice;
  styleOutline: OutlineChoice;
  lights: LightChoice;
  lamps: LampChoice;
}

export const DEFAULT_STYLE_SETTINGS: StyleSettings = {
  styleLinked: true, styleEnv: 'none', styleActors: 'none', styleEnvStrength: 0.8, styleActorsStrength: 0.8,
  styleBands: 'auto', styleOutline: 'auto', lights: 'auto', lamps: 'auto',
};

/** strength is stored in tenths */
export const roundStrength = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 10) / 10;

/** Clean stored values: anything unknown falls back to the default (old saves have none of these keys). */
export function normalizeStyleSettings(raw: Record<string, unknown>): StyleSettings {
  const out = { ...DEFAULT_STYLE_SETTINGS };
  const pick = <T,>(key: keyof StyleSettings, values: readonly T[]) => (values.includes(raw[key] as T) ? (raw[key] as T) : undefined);
  out.styleLinked = typeof raw.styleLinked === 'boolean' ? raw.styleLinked : out.styleLinked;
  out.styleEnv = pick('styleEnv', STYLE_IDS) ?? out.styleEnv;
  out.styleActors = pick('styleActors', STYLE_IDS) ?? out.styleActors;
  for (const k of ['styleEnvStrength', 'styleActorsStrength'] as const) {
    const v = raw[k];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1) out[k] = roundStrength(v);
  }
  out.styleBands = pick('styleBands', BAND_CHOICES) ?? out.styleBands;
  out.styleOutline = pick('styleOutline', OUTLINE_CHOICES) ?? out.styleOutline;
  out.lights = pick('lights', LIGHT_CHOICES) ?? out.lights;
  out.lamps = pick('lamps', LAMP_CHOICES) ?? out.lamps;
  return out;
}

/**
 * The settings for this visit: the stored ones with the URL's overrides on top, unsaved (like ?quality=):
 * ?style= (both layers), ?styleEnv=, ?styleActors=, ?styleStrength= (0–100), ?styleBands=, ?styleOutline=,
 * ?lights=, ?lamps=.
 */
export function withUrlOverrides(s: StyleSettings, search: string): StyleSettings {
  const q = new URLSearchParams(search);
  const out = { ...s };
  const id = (v: string | null) => (v && (STYLE_IDS as readonly string[]).includes(v) ? (v as StyleId) : null);
  const both = id(q.get('style'));
  if (both) { out.styleLinked = true; out.styleEnv = both; out.styleActors = both; }
  const env = id(q.get('styleEnv')), act = id(q.get('styleActors'));
  if (env || act) { out.styleLinked = false; if (env) out.styleEnv = env; if (act) out.styleActors = act; }
  const st = q.get('styleStrength');
  if (st !== null && st !== '' && Number.isFinite(+st)) out.styleEnvStrength = out.styleActorsStrength = roundStrength(+st / 100);
  const num = (k: string) => { const v = q.get(k); return v === null ? undefined : v === 'auto' ? 'auto' : Number(v); };
  const b = num('styleBands'); if (b !== undefined && (BAND_CHOICES as readonly unknown[]).includes(b)) out.styleBands = b as BandChoice;
  const o = q.get('styleOutline'); if (o && (OUTLINE_CHOICES as readonly string[]).includes(o)) out.styleOutline = o as OutlineChoice;
  const l = num('lights'); if (l !== undefined && (LIGHT_CHOICES as readonly unknown[]).includes(l)) out.lights = l as LightChoice;
  const lp = num('lamps'); if (lp !== undefined && (LAMP_CHOICES as readonly unknown[]).includes(lp)) out.lamps = lp as LampChoice;
  return out;
}

/** each layer's style and strength, linked or not */
export function layerStyles(s: StyleSettings): { env: { style: StyleId; strength: number }; actors: { style: StyleId; strength: number } } {
  const env = { style: s.styleEnv, strength: s.styleEnvStrength };
  return { env, actors: s.styleLinked ? { ...env } : { style: s.styleActors, strength: s.styleActorsStrength } };
}
