// Renderer bootstrap with graceful fallback: WebGPU → WebGL2 → WebGL1.
import { setThree, THREE, BACKEND, hasWebGPU, hasWebGL2, hasWebGL1, type Backend, type ThreeNS } from './three';

export type Quality = 'ultra' | 'high' | 'medium' | 'low';

export interface QualitySettings {
  pixelRatio: number;
  shadowSize: number;
  ao: boolean;
  bloom: boolean;
  dof: boolean;
  aa: 'smaa' | 'fxaa' | 'none';
  grass: number;       // grass density multiplier
  particles: number;   // particle budget multiplier
  grading: boolean;
}

export const QUALITY: Record<Quality, QualitySettings> = {
  ultra: { pixelRatio: 2, shadowSize: 4096, ao: true, bloom: true, dof: true, aa: 'smaa', grass: 1.0, particles: 1.0, grading: true },
  high: { pixelRatio: 1.5, shadowSize: 2048, ao: true, bloom: true, dof: true, aa: 'smaa', grass: 0.8, particles: 0.8, grading: true },
  medium: { pixelRatio: 1.25, shadowSize: 2048, ao: false, bloom: true, dof: false, aa: 'fxaa', grass: 0.5, particles: 0.6, grading: true },
  low: { pixelRatio: 1, shadowSize: 1024, ao: false, bloom: false, dof: false, aa: 'fxaa', grass: 0.25, particles: 0.4, grading: false },
};

export interface RendererInfo {
  backend: Backend;
  quality: Quality;
  settings: QualitySettings;
  mobile: boolean;
}

export const isMobile = () =>
  typeof navigator !== 'undefined' &&
  (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 900));

// The renderer is typed as the WebGPURenderer API; the legacy WebGLRenderer shares the subset we use.
export type AnyRenderer = InstanceType<ThreeNS['WebGPURenderer']>;

export let renderer: AnyRenderer;
export let rinfo: RendererInfo;

function pickQuality(backend: Backend, mobile: boolean, saved?: Quality | 'auto'): Quality {
  if (saved && saved !== 'auto') return saved;
  if (backend === 'webgl1') return 'low';
  if (mobile) return backend === 'webgpu' ? 'medium' : 'low';
  const cores = navigator.hardwareConcurrency ?? 4;
  if (backend === 'webgpu') return cores >= 8 ? 'ultra' : 'high';
  return cores >= 8 ? 'high' : 'medium';
}

/**
 * Create the renderer. `pref` can force a backend (via ?renderer=webgl2 etc.).
 */
export async function initRenderer(container: HTMLElement, pref: Backend | 'auto' = 'auto', savedQuality?: Quality | 'auto'): Promise<RendererInfo> {
  const mobile = isMobile();
  const order: Backend[] = pref === 'auto' ? ['webgpu', 'webgl2', 'webgl1'] : [pref, 'webgpu', 'webgl2', 'webgl1'].filter((v, i, a) => a.indexOf(v) === i) as Backend[];
  let lastErr: unknown = null;
  for (const b of order) {
    try {
      if (b === 'webgpu' && !hasWebGPU()) continue;
      if (b === 'webgl2' && !hasWebGL2()) continue;
      if (b === 'webgl1' && !hasWebGL1()) continue;
      if (b === 'webgl1') {
        const legacy = (await import('three-legacy')) as unknown as ThreeNS & { WebGL1Renderer?: unknown; WebGLRenderer: new (o: object) => AnyRenderer };
        setThree(legacy, 'webgl1');
        const Ctor = (legacy.WebGL1Renderer ?? legacy.WebGLRenderer) as unknown as new (o: object) => AnyRenderer;
        renderer = new Ctor({ antialias: true, powerPreference: 'high-performance' });
      } else {
        const ns = (await import('three/webgpu')) as unknown as ThreeNS;
        setThree(ns, b);
        const r = new ns.WebGPURenderer({ antialias: false, forceWebGL: b === 'webgl2', powerPreference: 'high-performance' } as never);
        await r.init();
        const be = (r as unknown as { backend: { isWebGPUBackend?: boolean } }).backend;
        if (b === 'webgpu' && !be.isWebGPUBackend) {
          // WebGPURenderer silently fell back to WebGL2
          setThree(ns, 'webgl2');
        }
        renderer = r;
      }
      const backend = BACKEND;
      const quality = pickQuality(backend, mobile, savedQuality);
      const settings = QUALITY[quality];
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.pixelRatio));
      renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = backend === 'webgl1' ? THREE.PCFSoftShadowMap : THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.id = 'gl';
      container.appendChild(renderer.domElement);
      rinfo = { backend, quality, settings, mobile };
      console.info(`[renderer] backend=${backend} quality=${quality}`);
      return rinfo;
    } catch (e) {
      console.warn(`[renderer] ${b} failed`, e);
      lastErr = e;
    }
  }
  throw new Error('No WebGPU / WebGL support available: ' + String(lastErr));
}

export function setQuality(q: Quality) {
  rinfo.quality = q;
  rinfo.settings = QUALITY[q];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, rinfo.settings.pixelRatio));
}
