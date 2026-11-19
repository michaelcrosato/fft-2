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
};
