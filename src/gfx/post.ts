// Post-processing. Node pipeline (WebGPU / WebGL2 backends) with SSAO, bloom,
// tilt-shift-style depth of field, film grading and SMAA/FXAA. The WebGL1 path
// renders directly (tone mapping only).
import { THREE, NODES } from './three';
import { renderer, rinfo } from './renderer';
import type { Scene, Camera } from 'three/webgpu';
import { tagScenePass } from './styles/scenePass';
import { buildStyleGraph } from './styles/graph';
import { styleDebugView } from './styles/current';
import { NO_FRAME, type FramePlan, type StylePlan } from './styles/resolve';

export interface PostFX {
  render(): void;
  setFocus(distance: number, range?: number): void;
  setGrade(g: Partial<GradeParams>): void;
  /** flash the whole screen (lightning/summons) */
  flash(color: string, amount: number): void;
  setSize(): void;
  dispose(): void;
  /** the art style's graph key this pipeline was built for ('off' without a style) */
  readonly styleKey: string;
  /** take a new art style plan; false if it needs another pipeline (see restylePost) */
  setStyle(plan: StylePlan): boolean;
  /** the grade and focus in force, to carry over to a rebuilt pipeline */
  snapshot(): { grade: GradeParams; focus: [number, number] };
}

export interface GradeParams {
  exposure: number;
  saturation: number;
  contrast: number;
  warmth: number;      // -1 cool .. 1 warm
  vignette: number;
  grain: number;
  tint: [number, number, number];
  bloom: number;
  dofScale: number;
}

export const DEFAULT_GRADE: GradeParams = {
  exposure: 1.0, saturation: 1.08, contrast: 1.06, warmth: 0.18, vignette: 0.38, grain: 0.035,
  tint: [1, 1, 1], bloom: 0.55, dofScale: 1.0,
};

// Effect modules load on demand; import() shares one download per module.
const EFFECTS = {
  ssao: () => import('three/addons/tsl/display/SSAONode.js' as any),
  bloom: () => import('three/addons/tsl/display/BloomNode.js' as any),
  dof: () => import('three/addons/tsl/display/DepthOfFieldNode.js' as any),
  smaa: () => import('three/addons/tsl/display/SMAANode.js' as any),
  fxaa: () => import('three/addons/tsl/display/FXAANode.js' as any),
};

function loadEffects() {
  const s = rinfo.settings;
  return Promise.all([
    s.ao ? EFFECTS.ssao() : null,
    s.bloom ? EFFECTS.bloom() : null,
    s.dof ? EFFECTS.dof() : null,
    s.aa === 'none' ? null : EFFECTS[s.aa](),
  ]);
}

/** Start downloading the current quality's effects while the rest of the game loads. */
export function preloadPostEffects() {
  if (NODES) loadEffects().catch(() => { /* the first scene retries and reports it */ });
}

export async function createPost(scene: Scene, camera: Camera, style?: StylePlan): Promise<PostFX> {
  if (!NODES) return legacyPost(scene, camera);
  try {
    return await nodePost(scene, camera, style?.active ? style : null);
  } catch (e) {
    console.warn('[post] node pipeline failed, falling back to direct render', e);
    return legacyPost(scene, camera);
  }
}

/**
 * Without a grading pass (low quality, WebGL 1) lightning and summons flash an overlay above
 * the canvas instead, fading at the grading pass's rate.
 */
let flashEl: HTMLElement | null = null;
function overlayFlash(color: string, amount: number) {
  const host = renderer.domElement.parentElement;
  if (!host) return;
  if (!flashEl?.isConnected) {
    flashEl = document.createElement('div');
    flashEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0';
    host.appendChild(flashEl);
  }
  const el = flashEl;
  const a = Math.min(1, amount);
  el.style.transition = 'none';
  el.style.background = color;
  el.style.opacity = String(a);
  void el.offsetWidth; // start this flash's fade from full strength
  el.style.transition = `opacity ${a / 2.2}s linear`;
  el.style.opacity = '0';
}

function legacyPost(scene: Scene, camera: Camera): PostFX {
  const grade = { ...DEFAULT_GRADE };
  return {
    render: () => renderer.render(scene, camera),
    setFocus: () => {},
    setGrade: (g) => { Object.assign(grade, g); if (g.exposure !== undefined) renderer.toneMappingExposure = g.exposure; },
    flash: overlayFlash,
    setSize: () => {},
    dispose: () => {},
    // no node pipeline: no art styles (the Art Style page says so)
    styleKey: 'off',
    setStyle: () => true,
    snapshot: () => ({ grade: { ...grade }, focus: [30, 14] }),
  };
}

/**
 * Give a live scene a new art style: the same pipeline when only uniforms change, else a new one with
 * the old grade and focus (the old one is disposed). The caller stores the result.
 */
export async function restylePost(old: PostFX, scene: Scene, camera: Camera, plan: StylePlan): Promise<PostFX> {
  if (old.setStyle(plan)) return old;
  const snap = old.snapshot();
  const next = await createPost(scene, camera, plan);
  next.setGrade(snap.grade);
  next.setFocus(snap.focus[0], snap.focus[1]);
  old.dispose();
  return next;
}

/** walk a node graph and dispose every node that owns a render target (RTT and pass nodes) */
function disposeRenderTargetNodes(root: unknown) {
  const seen = new Set<unknown>();
  const visit = (n: any) => {
    if (!n || typeof n !== 'object' || seen.has(n) || !n.isNode) return;
    seen.add(n);
    for (const c of n.getChildren?.() ?? []) visit(c);
    if (n.isRTTNode || n.isPassNode) n.dispose?.();
  };
  visit(root);
}

async function nodePost(scene: Scene, camera: Camera, style: StylePlan | null): Promise<PostFX> {
  const TSL = await import('three/tsl');
  const {
    pass, mrt, output, normalView, uniform, vec3, vec4, float, Fn, mix, dot, smoothstep, screenUV, time, hash,
    renderOutput, sample, builtinAOContext, packNormalToRGB, unpackRGBToNormal, clamp, max,
  } = TSL as any;
  const s = rinfo.settings;
  // an art style's frame-wide overrides (Decision 5): no SSAO, less depth of field, grain, vignette or bloom
  const frame: FramePlan = style?.frame ?? NO_FRAME;
  const useAO = s.ao && frame.ao, useDof = s.dof && frame.dof > 0;
  // fetch the effects together rather than one round trip after another
  const [ssaoMod, bloomMod, dofMod, aaMod] = await loadEffects();
  const pipeline = new THREE.RenderPipeline(renderer as any);
  pipeline.outputColorTransform = false;

  const u = {
    exposure: uniform(DEFAULT_GRADE.exposure),
    saturation: uniform(DEFAULT_GRADE.saturation),
    contrast: uniform(DEFAULT_GRADE.contrast),
    warmth: uniform(DEFAULT_GRADE.warmth),
    vignette: uniform(DEFAULT_GRADE.vignette),
    grain: uniform(DEFAULT_GRADE.grain),
    tint: uniform(new THREE.Vector3(1, 1, 1)),
    flashColor: uniform(new THREE.Vector3(1, 1, 1)),
    flashAmt: uniform(0),
    focus: uniform(30),
    focalLength: uniform(14),
    bokeh: uniform(1.2),
  };
  // multipliers from the art style's frame plan (only in a styled graph, so None draws today's shader)
  const fm = style ? { grain: uniform(frame.grain), vignette: uniform(frame.vignette), dof: uniform(frame.dof) } : null;
  const grade = { ...DEFAULT_GRADE };
  const focus: [number, number] = [30, 14];

  // ---- scene pass (+ optional AO pre-pass) ----
  const scenePass = pass(scene, camera);
  // every node that owns render targets; RenderPipeline.dispose() frees only its own quad
  const owned: any[] = [scenePass];
  // an art style: the tagged scene pass (styles/scenePass.ts) and the style's own graph (styles/graph.ts)
  const styled = style ? tagScenePass(TSL, scenePass) : null;
  const graph = style && styled ? buildStyleGraph(TSL, style, { styled, scene, camera, debug: styleDebugView() }) : null;
  let aoNode: any = null;
  if (useAO) {
    const prePass = pass(scene, camera);
    owned.push(prePass);
    prePass.name = 'prepass';
    prePass.transparent = false;
    prePass.setMRT(mrt({ output: packNormalToRGB(normalView) }));
    const nt = prePass.getTexture('output');
    nt.type = THREE.UnsignedByteType;
    const prePassNormal = sample((uv: any) => unpackRGBToNormal(prePass.getTextureNode().sample(uv)));
    const prePassDepth = prePass.getTextureNode('depth');
    aoNode = ssaoMod.ssao(prePassDepth, prePassNormal, camera);
    owned.push(aoNode);
    aoNode.resolutionScale = rinfo.quality === 'ultra' ? 1 : 0.5;
    if (aoNode.radius) aoNode.radius.value = 0.55;
    if (aoNode.intensity) aoNode.intensity.value = 1.6;
    scenePass.contextNode = builtinAOContext(aoNode.getTextureNode().sample(screenUV).r);
  }
  let color: any = scenePass.getTextureNode('output');
  // banded light and the overlays laid over, in linear light before bloom
  if (graph) color = graph.linear(color);

  // ---- bloom (HDR threshold) ----
  let bloomNode: any = null;
  if (s.bloom) {
    bloomNode = bloomMod.bloom(color, DEFAULT_GRADE.bloom * frame.bloom, 0.45, 0.82);
    owned.push(bloomNode);
    color = color.add(bloomNode);
  }

  // ---- depth of field (miniature / diorama feel) ----
  if (useDof) {
    color = dofMod.dof(color, scenePass.getViewZNode(), u.focus, u.focalLength, fm ? u.bokeh.mul(fm.dof) : u.bokeh);
    owned.push(color);
  }

  // ---- tone map, then grade in display space ----
  let out: any = renderOutput(color.mul(u.exposure));
  if (s.grading && !graph) {
    const grade = Fn(([c]: any[]) => {
      let col = c.rgb.toVar();
      // warmth: push reds up, blues down
      col = col.mul(vec3(float(1).add(u.warmth.mul(0.08)), float(1).add(u.warmth.mul(0.02)), float(1).sub(u.warmth.mul(0.09))));
      col = col.mul(u.tint);
      // contrast (s-curve around mid grey)
      col = col.sub(0.5).mul(u.contrast).add(0.5);
      // saturation
      const l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, u.saturation);
      // subtle split toning: warm highlights, cool shadows
      col = mix(col.mul(vec3(0.96, 0.99, 1.05)), col, smoothstep(0.0, 0.5, l));
      // vignette
      const d = screenUV.sub(0.5).mul(vec3(1.0, 0.85, 0).xy).length();
      col = col.mul(float(1).sub(smoothstep(0.35, 0.95, d).mul(u.vignette)));
      // film grain
      const px = screenUV.mul(vec3(1920, 1080, 0).xy).floor();
      const g = hash(px.x.add(px.y.mul(4096)).add(hash(time.mul(60).floor()).mul(1e6))).sub(0.5).mul(u.grain);
      col = col.add(g);
      // flash
      col = mix(col, u.flashColor, u.flashAmt);
      return vec4(clamp(col, 0, 1), c.a);
    });
    out = grade(out);
  }

  else if (s.grading && graph && fm) {
    // a styled frame: the colour grade, the style's display steps, then vignette, grain and flash on top
    const gradeColor = Fn(([c]: any[]) => {
      let col = c.rgb.toVar();
      col = col.mul(vec3(float(1).add(u.warmth.mul(0.08)), float(1).add(u.warmth.mul(0.02)), float(1).sub(u.warmth.mul(0.09))));
      col = col.mul(u.tint);
      col = col.sub(0.5).mul(u.contrast).add(0.5);
      const l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, u.saturation);
      col = mix(col.mul(vec3(0.96, 0.99, 1.05)), col, smoothstep(0.0, 0.5, l));
      return vec4(col, c.a);
    });
    const gradeFinish = Fn(([c]: any[]) => {
      let col = c.rgb.toVar();
      const d = screenUV.sub(0.5).mul(vec3(1.0, 0.85, 0).xy).length();
      col = col.mul(float(1).sub(smoothstep(0.35, 0.95, d).mul(u.vignette.mul(fm.vignette))));
      const px = screenUV.mul(vec3(1920, 1080, 0).xy).floor();
      const g = hash(px.x.add(px.y.mul(4096)).add(hash(time.mul(60).floor()).mul(1e6))).sub(0.5).mul(u.grain.mul(fm.grain));
      col = col.add(g);
      col = mix(col, u.flashColor, u.flashAmt);
      return vec4(clamp(col, 0, 1), c.a);
    });
    out = gradeFinish(graph.display(gradeColor(out)));
  } else if (graph) {
    out = graph.display(out);
  }
  const preAA = out;

  // ---- anti-aliasing ----
  if (s.aa === 'smaa') {
    out = aaMod.smaa(out);
    owned.push(out);
  } else if (s.aa === 'fxaa') {
    out = aaMod.fxaa(out);
    owned.push(out);
  }
  // Pixel Art cells come after anti-aliasing, sampled from before it, so they stay crisp
  if (graph) out = graph.final(preAA, out);
  if (graph?.debug) out = graph.debug;
  pipeline.outputNode = out;

  let flashT = 0;
  let last = performance.now();
  let bloomMul = frame.bloom;
  let disposed = false;
  return {
    styleKey: style?.key ?? 'off',
    render() {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (flashT > 0) { flashT = Math.max(0, flashT - dt * 2.2); u.flashAmt.value = flashT; }
      pipeline.render();
    },
    setFocus(distance: number, range = 14) {
      focus[0] = distance; focus[1] = range;
      u.focus.value = distance;
      u.focalLength.value = range;
    },
    setGrade(g) {
      Object.assign(grade, g);
      if (g.exposure !== undefined) u.exposure.value = g.exposure;
      if (g.saturation !== undefined) u.saturation.value = g.saturation;
      if (g.contrast !== undefined) u.contrast.value = g.contrast;
      if (g.warmth !== undefined) u.warmth.value = g.warmth;
      if (g.vignette !== undefined) u.vignette.value = g.vignette;
      if (g.grain !== undefined) u.grain.value = g.grain;
      if (g.tint) u.tint.value.set(g.tint[0], g.tint[1], g.tint[2]);
      if (g.bloom !== undefined && bloomNode) bloomNode.strength.value = g.bloom * bloomMul;
      if (g.dofScale !== undefined) u.bokeh.value = 1.2 * g.dofScale;
    },
    flash(colorHex: string, amount: number) {
      if (!s.grading) { overlayFlash(colorHex, amount); return; }
      const c = new THREE.Color(colorHex);
      u.flashColor.value.set(c.r, c.g, c.b);
      flashT = Math.min(1, amount);
      u.flashAmt.value = flashT;
    },
    setSize() { /* pipeline tracks renderer size */ },
    setStyle(plan: StylePlan) {
      const key = plan.active ? plan.key : 'off';
      if (key !== (style?.key ?? 'off')) return false;
      if (!plan.active || !graph || !fm) return true;
      graph.update(plan);
      fm.grain.value = plan.frame.grain; fm.vignette.value = plan.frame.vignette; fm.dof.value = plan.frame.dof;
      bloomMul = plan.frame.bloom;
      if (bloomNode) bloomNode.strength.value = grade.bloom * bloomMul;
      return true;
    },
    snapshot() { return { grade: { ...grade, tint: [...grade.tint] as [number, number, number] }, focus: [focus[0], focus[1]] }; },
    dispose() {
      // a restyle that loses a race with a scene change may dispose twice
      if (disposed) return;
      disposed = true;
      // effects like FXAA/SMAA/DOF wrap their input in hidden render-to-texture nodes with full-screen targets
      disposeRenderTargetNodes(pipeline.outputNode);
      pipeline.dispose?.();
      for (const n of owned) n?.dispose?.();
      owned.length = 0;
    },
  };
}

