// From settings to a style plan (docs/PLAN-ART-STYLES.md, Phase 2): what the frame needs (outputs,
// steps), each layer's parameters, the frame-wide overrides and the light rig. Pure: no three.js, so the
// unit tests cover it. Each style's preset lives in presets.ts.
import { IMPLEMENTED_STYLES, layerStyles, type StyleId, type StyleSettings } from './types';
import { PRESETS, type PresetContext } from './presets';

export type Rgb = [number, number, number];
export type Quality = 'ultra' | 'high' | 'medium' | 'low';
export type Backend = 'webgpu' | 'webgl2' | 'webgl1';

/** banded light (nodes/band.ts) */
export interface BandPlan { bands: number; softness: number; floor: number; tint: Rgb; highlight: -1 | 0 | 1 }
/** outlines (nodes/edges.ts): `fill` darkens the surface's own colour instead of drawing `color` */
export interface EdgePlan { width: number; color: Rgb; fill: number; opacity: number; creases: number; wobble: number }
/** display-space colour: saturation and contrast multipliers, desaturation toward a tint */
export interface ColorPlan { saturation: number; contrast: number; wash: number; washTint: Rgb }
/** world-anchored hatching in the dark bands, and paper grain (nodes/hatch.ts) */
export interface HatchPlan { density: number; darkness: number; paper: number; paperTint: Rgb }
/** Kuwahara brush and canvas grain (nodes/paint.ts) */
export interface PaintPlan { radius: number; canvas: number; haze: number }
/** pixel cells, palette and dither (nodes/pixel.ts) */
export interface PixelPlan { cell: number; levels: number; dither: number; outline: number }

export interface LayerPlan {
  style: StyleId;
  /** 0–1; 0 means the layer is drawn as today */
  strength: number;
  band?: BandPlan;
  edges?: EdgePlan;
  color?: ColorPlan;
  hatch?: HatchPlan;
  paint?: PaintPlan;
  pixel?: PixelPlan;
}

/** frame-wide effects, from the Environment's style (Decision 5): multipliers on today's values */
export interface FramePlan { ao: boolean; dof: number; grain: number; vignette: number; bloom: number }

export interface StylePlan {
  /** false: draw exactly today's frame (None/None, or styles unavailable) */
  active: boolean;
  /** why styles can't run here */
  unavailable?: 'webgl1';
  env: LayerPlan;
  actors: LayerPlan;
  frame: FramePlan;
  /** overlays take Pixel Art's cells (the Environment is Pixel Art) */
  overlayPixel: boolean;
  /** the light rig: 'today' keeps each scene's own lights; 1 sun, 2 sun and rim, 3 sun, rim and a front fill */
  lights: 'today' | 1 | 2 | 3;
  /** lamp lights at most (point lights from map props) */
  lamps: number;
  /** what the post graph is built from: a change of key rebuilds the pipeline, anything else is uniforms */
  key: string;
}

export const NO_FRAME: FramePlan = { ao: true, dof: 1, grain: 1, vignette: 1, bloom: 1 };
const NONE: LayerPlan = { style: 'none', strength: 0 };

/** the lamps each quality allows when the setting is Auto (env.ts) */
export const LAMP_CAP: Record<Quality, number> = { low: 2, medium: 4, high: 8, ultra: 8 };

export interface ResolveContext { quality: Quality; backend: Backend; mobile?: boolean }

function layerPlan(style: StyleId, strength: number, s: StyleSettings, ctx: ResolveContext): LayerPlan {
  if (style === 'none' || strength <= 0 || !IMPLEMENTED_STYLES.has(style)) return NONE;
  const preset = PRESETS[style];
  if (!preset) return NONE;
  const pc: PresetContext = { strength, bands: s.styleBands, outline: s.styleOutline, quality: ctx.quality, mobile: !!ctx.mobile };
  return { style, strength, ...preset.layer(pc) };
}

/** the steps a layer needs, in a stable order (part of the graph key) */
export function stepsOf(l: LayerPlan): string[] {
  return (['band', 'color', 'paint', 'hatch', 'edges', 'pixel'] as const).filter((k) => l[k] !== undefined);
}

export function resolveStyle(s: StyleSettings, ctx: ResolveContext): StylePlan {
  const ls = layerStyles(s);
  const lampSetting = s.lamps === 'auto' ? LAMP_CAP[ctx.quality] : s.lamps;
  const envStyle = IMPLEMENTED_STYLES.has(ls.env.style) ? ls.env.style : 'none';
  const ownLights = PRESETS[envStyle]?.lights ?? 'today';
  const lights = s.lights === 'auto' ? ownLights : s.lights;
  const base = { frame: NO_FRAME, overlayPixel: false, lights, lamps: lampSetting };
  if (ctx.backend === 'webgl1') return { active: false, unavailable: 'webgl1', env: NONE, actors: NONE, ...base, key: 'off' };
  const env = layerPlan(ls.env.style, ls.env.strength, s, ctx);
  const actors = layerPlan(ls.actors.style, ls.actors.strength, s, ctx);
  const active = env.style !== 'none' || actors.style !== 'none';
  if (!active) return { active: false, env, actors, ...base, key: 'off' };
  const frame = env.style !== 'none' ? { ...NO_FRAME, ...PRESETS[env.style]?.frame?.(env.strength) } : NO_FRAME;
  const overlayPixel = env.pixel !== undefined;
  const key = [`env:${stepsOf(env).join(',')}`, `actors:${stepsOf(actors).join(',')}`, `ao:${frame.ao}`, `dof:${frame.dof > 0}`, `ovpx:${overlayPixel}`].join('|');
  return { active, env, actors, frame, overlayPixel, lights, lamps: lampSetting, key };
}
