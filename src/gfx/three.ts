// Runtime-selected three.js namespace.
//  - 'webgpu'  : three/webgpu (WebGPURenderer on a WebGPU device) — primary
//  - 'webgl2'  : three/webgpu (WebGPURenderer with forceWebGL → WebGL2 backend)
//  - 'webgl1'  : three-legacy (three r162 WebGLRenderer, the last with WebGL1 support)
// All scene code must reference `THREE.X` through this live binding (never
// `import * as THREE from 'three'`) so the same code builds scenes for either library.
export type ThreeNS = typeof import('three/webgpu');
export type Backend = 'webgpu' | 'webgl2' | 'webgl1';

// eslint-disable-next-line import/no-mutable-exports
export let THREE: ThreeNS = null as unknown as ThreeNS;
export let BACKEND: Backend = 'webgpu';
/** node materials / TSL available (webgpu + webgl2 backends) */
export let NODES = true;

export function setThree(ns: ThreeNS, backend: Backend) {
  THREE = ns;
  BACKEND = backend;
  NODES = backend !== 'webgl1';
}

export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as Navigator & { gpu?: unknown }).gpu;
}

export function hasWebGL2(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch { return false; }
}

export function hasWebGL1(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch { return false; }
}
