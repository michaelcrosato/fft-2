// Releasing GPU resources.
// In three r186's renderer (WebGPU and WebGL2 backends alike) a render object is only freed
// when its Object3D or its material fires 'dispose'; disposing the geometry alone keeps the
// render object — and through it the whole old scene — alive. Materials and textures that
// live in module caches are flagged `userData.shared` and are left alone.
import type { Object3D, Material, Texture } from 'three/webgpu';

const TEX_KEYS = ['map', 'normalMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'bumpMap', 'lightMap', 'envMap', 'specularMap'];

/** flag a cached material/texture so releaseTree() never disposes it */
export function markShared<T extends Material | Texture>(x: T): T { x.userData.shared = true; return x; }

export function disposeMaterial(m: Material | null | undefined) {
  if (!m || m.userData?.shared) return;
  for (const k of TEX_KEYS) {
    const t = (m as unknown as Record<string, Texture | null | undefined>)[k];
    if (t && !t.userData?.shared) t.dispose();
  }
  m.dispose();
}

/**
 * Free everything under `root`: the renderer's per-object state, geometries, lights' shadow
 * maps, and (unless `materials` is false) materials and their textures that aren't shared.
 */
export function releaseTree(root: Object3D, materials = true) {
  root.traverse((o) => {
    const any = o as Object3D & { geometry?: { dispose(): void }; material?: Material | Material[]; isSprite?: boolean; isLight?: boolean; dispose?: () => void };
    (o as unknown as { dispatchEvent(e: { type: string }): void }).dispatchEvent({ type: 'dispose' });
    // Three.js sprites all share one quad. A removed badge does not own that geometry.
    if (!any.isSprite) any.geometry?.dispose();
    if (materials && any.material) for (const m of Array.isArray(any.material) ? any.material : [any.material]) disposeMaterial(m);
    if (any.isLight) any.dispose?.();
  });
}
