// Each art style's preset (docs/PLAN-ART-STYLES.md, *The styles*): what the style does at a given
// strength, its frame-wide overrides when it is on the Environment, and its own light sources.
// The style phases add their presets here; resolve.ts reads them.
import type { BandChoice, OutlineChoice, StyleId } from './types';
import type { FramePlan, LayerPlan, Quality } from './resolve';

export interface PresetContext {
  /** 0–1 */
  strength: number;
  bands: BandChoice;
  outline: OutlineChoice;
  quality: Quality;
  mobile: boolean;
}

export interface StylePreset {
  /** the layer's steps and their parameters at this strength (without style/strength) */
  layer(c: PresetContext): Omit<LayerPlan, 'style' | 'strength'>;
  /** frame-wide multipliers when this style is on the Environment */
  frame?(strength: number): Partial<FramePlan>;
  /** the style's own light sources (the Light sources setting's Auto) */
  lights: 'today' | 1 | 2 | 3;
}

/** linear interpolation of a parameter from 0% to 100% strength */
export const at = (s: number, from: number, to: number) => from + (to - from) * s;

/** outline width in CSS pixels for a setting, or the style's own */
export function outlineWidth(o: OutlineChoice, own: number): number {
  return o === 'auto' ? own : o === 'off' ? 0 : o === 'thin' ? 1 : o === 'medium' ? 2.5 : 4;
}

export function bandCount(b: BandChoice, own: number): number {
  return b === 'auto' ? own : b;
}

export const PRESETS: Partial<Record<StyleId, StylePreset>> = {
  none: { layer: () => ({}), lights: 'today' },

  // Bold Cel: thick black outlines on silhouettes and creases, two flat tones with a hard edge,
  // a highlight band, strong colour, shadows shifted toward blue-violet. The sun alone by default.
  boldCel: {
    lights: 1,
    layer: (c) => {
      const s = c.strength;
      return {
        band: { bands: bandCount(c.bands, 2), softness: at(s, 0.08, 0.006), floor: at(s, 0.66, 0.42), tint: [0.66, 0.64, 0.98], highlight: 1 },
        color: { saturation: at(s, 1, 1.32), contrast: at(s, 1, 1.08), wash: 0, washTint: [1, 1, 1] },
        edges: { width: outlineWidth(c.outline, at(s, 1.5, 3.5)), color: [0.03, 0.025, 0.04], fill: 0, opacity: 1, creases: 0.7, wobble: 0 },
      };
    },
    frame: (s) => ({ ao: false, grain: 1 - s * 0.8 }),
  },

  // Bright Toon: two tones with a soft edge, cool blue-violet shadows lifted off black, warm light,
  // bright saturated colour, no black outlines (coloured ones if the player asks), a little more
  // bloom. Sun, rim and a front fill by default.
  brightToon: {
    lights: 3,
    layer: (c) => {
      const s = c.strength;
      return {
        band: { bands: bandCount(c.bands, 2), softness: at(s, 0.1, 0.035), floor: at(s, 0.78, 0.6), tint: [0.6, 0.68, 1.08], litTint: [1.05, 1.0, 0.93], highlight: 0 },
        color: { saturation: at(s, 1, 1.22), contrast: at(s, 1, 1.03), wash: 0, washTint: [1, 1, 1] },
        edges: { width: outlineWidth(c.outline, 0), color: [0.05, 0.06, 0.12], fill: 0.85, opacity: 0.9, creases: 0.2, wobble: 0 },
      };
    },
    frame: (s) => ({ ao: false, bloom: 1 + s * 0.2 }),
  },

  // Pixel Art: the view in square cells (2–6 CSS px), a small palette (7 down to 4 steps per channel)
  // with a 4×4 Bayer dither, a one-cell dark outline, three hard light bands under it. No depth of
  // field or grain on a pixel environment: they would blur or speckle the cells.
  pixel: {
    lights: 2,
    layer: (c) => {
      const s = c.strength;
      const outline = c.outline === 'off' ? 0 : c.outline === 'thin' ? 0.4 : c.outline === 'medium' ? 0.6 : c.outline === 'thick' ? 0.85 : at(s, 0.3, 0.7);
      return {
        band: { bands: bandCount(c.bands, 3), softness: 0.01, floor: 0.5, tint: [0.72, 0.72, 0.96], highlight: 1 },
        pixel: { cell: Math.round(at(s, 2, 6) * (c.mobile ? 0.8 : 1) * 2) / 2, levels: Math.round(at(s, 7, 4)), dither: 0.8, outline },
      };
    },
    frame: () => ({ ao: false, dof: 0, grain: 0 }),
  },

  // Ink Wash: brush lines that wobble and taper, anchored to the world; cross-hatching in the dark
  // bands, in world space; paper grain; colour washed toward sepia ink. The sun alone by default.
  inkWash: {
    lights: 1,
    layer: (c) => {
      const s = c.strength;
      return {
        band: { bands: bandCount(c.bands, 3), softness: 0.02, floor: at(s, 0.7, 0.55), tint: [0.95, 0.92, 0.9], highlight: -1 },
        color: { saturation: at(s, 1, 0.55), contrast: at(s, 1, 1.1), wash: at(s, 0, 0.45), washTint: [1.04, 0.97, 0.86] },
        hatch: { density: c.quality === 'low' ? 5 : 7, darkness: at(s, 0, 0.85), paper: at(s, 0, 1), paperTint: [0.98, 0.93, 0.83] },
        edges: { width: outlineWidth(c.outline, at(s, 1, 3)), color: [0.06, 0.05, 0.07], fill: 0, opacity: 0.95, creases: 0.8, wobble: at(s, 0, 0.9) },
      };
    },
    frame: () => ({ ao: false, dof: 0, grain: 0, vignette: 0.5 }),
  },

  // Flat Paint (after Sable, the owner's reference): flat fields of colour, one soft step to shadow
  // lifted off black with a warm/cool shift, thin dark line art (a near-black shade of the fill), a
  // Kuwahara brush that settles textures into fields, canvas grain and layered distance haze.
  flatPaint: {
    lights: 2,
    layer: (c) => {
      const s = c.strength;
      const brush = c.quality === 'low' ? 2.5 : c.quality === 'medium' ? 3.5 : 4.5;
      return {
        band: { bands: bandCount(c.bands, 2), softness: 0.03, floor: at(s, 0.85, 0.66), tint: [0.84, 0.82, 1.0], litTint: [1.04, 1.0, 0.95], highlight: -1 },
        color: { saturation: at(s, 1, 0.94), contrast: at(s, 1, 0.94), wash: 0, washTint: [1, 1, 1] },
        paint: { radius: at(s, 1, brush), canvas: at(s, 0, 0.8), haze: at(s, 0, 1) },
        edges: { width: outlineWidth(c.outline, at(s, 0.8, 1.5)), color: [0.08, 0.07, 0.09], fill: 0.65, opacity: 0.9, creases: 0.45, wobble: 0 },
      };
    },
    frame: (s) => ({ ao: false, grain: 1 - s, dof: 1 - s * 0.5 }),
  },
};
