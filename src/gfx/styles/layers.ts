// Art style layers (docs/PLAN-ART-STYLES.md, *Layers*). A scene builder tags its root object with
// setStyleLayer(); children inherit the tag. The scene pass reads it per object (styles/scenePass.ts)
// and writes it into the frame's data buffer, so the styles can treat each layer on its own.
import type { Object3D } from 'three/webgpu';

export type StyleLayer = 'interface' | 'env' | 'actors' | 'effects';

/** codes as written into the data buffer; interface (0) is also what an untagged object gets */
export const LAYER_CODE: Record<StyleLayer, number> = { interface: 0, env: 1, actors: 2, effects: 3 };

/** Tag `obj` and everything under it (unless a child carries its own tag). Returns `obj`. */
export function setStyleLayer<T extends Object3D>(obj: T, layer: StyleLayer): T {
  obj.userData.styleLayer = layer;
  return obj;
}

/** the nearest object at or above `o` that carries a style layer */
export function styleRoot(o: Object3D | null): Object3D | null {
  for (let p = o; p; p = p.parent) if (p.userData?.styleLayer) return p;
  return null;
}

export function styleLayerOf(o: Object3D): StyleLayer {
  return (styleRoot(o)?.userData.styleLayer as StyleLayer | undefined) ?? 'interface';
}

/** Overlays are drawn into their own buffer and laid over the styled frame: interface, effects (spells and
 *  weather share particle pools), and any additive glow. */
export function isOverlay(layer: StyleLayer, additive: boolean): boolean {
  return additive || layer === 'interface' || layer === 'effects';
}

/** 5-bit object id (1–31) of a tagged root, so outlines can find the border between two units */
export function objectId(root: Object3D | null): number {
  return root ? ((root.id * 37) % 31) + 1 : 0;
}

/** layer and object id packed into one byte (layer × 32 + id), as stored in the data buffer's blue channel */
export function packTag(layer: number, id: number): number {
  return layer * 32 + id;
}
export function unpackTag(byte: number): { layer: number; id: number } {
  return { layer: Math.floor(byte / 32), id: byte % 32 };
}
