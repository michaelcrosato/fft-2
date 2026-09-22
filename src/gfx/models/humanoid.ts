// Procedural chibi humanoid: job outfit + personal look + equipment → rigged,
// outlined low-poly model.
import { THREE } from '../three';
import type { CharLook, ItemDef, JobLook, Palette } from '../../data/types';
import { BonePart, G, snapshotRest, tone, type UnitModel, type BoneName } from './rig';
import { propMaterial } from '../materials';
import type { Object3D, Mesh } from 'three/webgpu';
import { buildWeapon, buildShield } from './weapons';

export interface HumanoidSpec {
  job: JobLook;
  look: CharLook;
  gender: 'm' | 'f';
  weapon?: ItemDef | null;
  weapon2?: ItemDef | null;
  shield?: ItemDef | null;
  /** head item shown instead of job headgear when it's a helmet/hat */
  headItem?: ItemDef | null;
  team?: number;
  /** override palette (e.g. enemy recolour) */
  palette?: Palette;
}

const SKIN_DEFAULT = '#f0cfae';

export function buildHumanoid(spec: HumanoidSpec): UnitModel {
  const job: JobLook = { ...spec.job, ...(spec.look.outfit ?? {}), palette: { ...spec.job.palette, ...(spec.look.outfit?.palette ?? {}), ...(spec.palette ?? {}) } } as JobLook;
  const pal = job.palette;
  const P = pal.primary, S = pal.secondary, A = pal.accent;
  const M = pal.metal ?? '#b8bcc6';
  const L = pal.leather ?? '#5a3b24';
  const skin = spec.look.skin ?? SKIN_DEFAULT;
  const hair = spec.look.hair ?? '#5a3a24';
  const female = spec.gender === 'f';
  const bulk = (job.bulk ?? 1) * (spec.look.bulk ?? 1);
  const height = spec.look.height ?? 1;
  const armored = job.torso === 'armor' || job.torso === 'plate' || job.torso === 'mail';
  const robed = job.torso === 'robe' || job.torso === 'cassock' || job.torso === 'gown' || job.legs === 'robe' || job.legs === 'gown';

  const root = new THREE.Group();
  root.name = 'unit';
  const bones: Partial<Record<BoneName, Object3D>> = { root };
  const parts: BonePart[] = [];
  const mk = (name: BoneName, parent: Object3D, x = 0, y = 0, z = 0) => { const p = new BonePart(name, parent, x, y, z); parts.push(p); bones[name] = p.obj; return p; };

  // ---- skeleton ----
  const body = mk('body', root);
  body.obj.scale.setScalar(height);
  const hips = mk('hips', body.obj, 0, 0.30, 0);
  const torso = mk('torso', hips.obj, 0, 0, 0);
  const head = mk('head', torso.obj, 0, 0.31, 0);
  const shoulderX = female ? 0.155 : 0.17 * bulk;
  const armR = mk('armR', torso.obj, -shoulderX, 0.255, 0);
  const armL = mk('armL', torso.obj, shoulderX, 0.255, 0);
  const elbowR = mk('elbowR', armR.obj, 0, -0.12, 0);
  const elbowL = mk('elbowL', armL.obj, 0, -0.12, 0);
  const handR = mk('handR', elbowR.obj, 0, -0.13, 0.01);
  const handL = mk('handL', elbowL.obj, 0, -0.13, 0.01);
  const hipX = female ? 0.068 : 0.075;
  const legR = mk('legR', hips.obj, -hipX, 0, 0);
  const legL = mk('legL', hips.obj, hipX, 0, 0);
  const kneeR = mk('kneeR', legR.obj, 0, -0.14, 0);
  const kneeL = mk('kneeL', legL.obj, 0, -0.14, 0);
  const cape = job.cape && job.cape !== 'none' ? mk('cape', torso.obj, 0, 0.29, -0.09) : null;

  // ---- legs ----
  const legCol = job.legs === 'armored' ? M : job.legs === 'tights' ? S : S;
  const bootCol = armored ? tone(M, -0.15) : L;
  for (const [leg, knee] of [[legR, kneeR], [legL, kneeL]] as const) {
    const bare = job.torso === 'leotard' && job.legs !== 'pants';
    const thighCol = bare ? skin : legCol;
    if (job.legs === 'hakama') {
      leg.add(G.cyl(0.06, 0.085, 0.16, 7), 0, -0.07, 0, S);
      knee.add(G.cyl(0.085, 0.1, 0.12, 7), 0, -0.05, 0, S);
    } else if (!robed || job.legs === 'pants') {
      leg.add(G.cyl(0.05 * bulk, 0.045 * bulk, 0.15, 7), 0, -0.07, 0, thighCol);
      knee.add(G.cyl(0.042 * bulk, 0.038 * bulk, 0.1, 7), 0, -0.05, 0, job.legs === 'shorts' ? skin : thighCol);
      if (job.legs === 'armored') knee.add(G.box(0.07, 0.05, 0.03), 0, 0.0, 0.035, tone(M, 0.15));
    } else {
      knee.add(G.cyl(0.036, 0.036, 0.08, 6), 0, -0.05, 0, legCol);
    }
    // boot
    knee.add(G.box(0.085, 0.07, 0.13), 0, -0.13, 0.018, bootCol);
    knee.add(G.box(0.09, 0.02, 0.14), 0, -0.155, 0.02, tone(bootCol, -0.3), 0, 0, 0, 1, 1, 1, { outline: false });
  }

  // ---- torso ----
  const tw = (female ? 0.24 : 0.27) * bulk, td = 0.17 * bulk;
  const chestCol = armored ? M : P;
  // pelvis/waist
  torso.add(G.box(tw * 0.92, 0.1, td * 0.95), 0, 0.03, 0, robed ? P : S);
  if (female && !armored) torso.add(G.box(tw * 0.9, 0.12, td), 0, 0.2, 0.0, chestCol); // bust shaping
  torso.add(G.cyl(tw * 0.55, tw * 0.5, 0.22, 8), 0, 0.17, 0, chestCol, 0, Math.PI / 8, 0, 1, 1, td / tw * 1.9);
  if (job.torso === 'plate' || job.torso === 'armor') {
    torso.add(G.box(tw * 0.8, 0.14, 0.05), 0, 0.19, td * 0.5, tone(M, 0.2));
    torso.add(G.box(tw * 0.3, 0.08, 0.02), 0, 0.2, td * 0.55, A, 0, 0, 0, 1, 1, 1, { outline: false });
  } else if (job.torso === 'mail') {
    torso.add(G.box(tw * 1.02, 0.2, td * 1.02), 0, 0.14, 0, tone(M, -0.1));
  } else if (job.torso === 'vest' || job.torso === 'jerkin') {
    torso.add(G.box(tw * 1.04, 0.2, td * 1.04), 0, 0.15, -0.005, job.torso === 'jerkin' ? L : A);
    torso.add(G.box(0.05, 0.2, 0.02), 0, 0.15, td * 0.52, P, 0, 0, 0, 1, 1, 1, { outline: false });
  } else if (job.torso === 'gi' || job.torso === 'kimono') {
    torso.add(G.box(0.03, 0.2, 0.02), 0.03, 0.16, td * 0.52, A, 0, 0, 0.5, 1, 1, 1, { outline: false });
    torso.add(G.box(0.03, 0.2, 0.02), -0.03, 0.16, td * 0.52, A, 0, 0, -0.5, 1, 1, 1, { outline: false });
  } else if (job.torso === 'apron') {
    torso.add(G.box(tw * 0.8, 0.3, 0.02), 0, 0.08, td * 0.52, '#e8e0d0');
  } else {
    // tunic/coat/robe collar & trim
    torso.add(G.box(tw * 0.5, 0.035, td * 0.6), 0, 0.29, 0.02, A, 0, 0, 0, 1, 1, 1, { outline: false });
  }
  // belt
  if (job.extras?.includes('belt') || job.extras?.includes('sash') || !robed) {
    const beltCol = job.extras?.includes('sash') ? A : L;
    torso.add(G.box(tw * 0.96, 0.035, td * 1.0), 0, 0.075, 0, beltCol, 0, 0, 0, 1, 1, 1, { outline: false });
    torso.add(G.box(0.04, 0.03, 0.02), 0, 0.075, td * 0.52, '#d8b860', 0, 0, 0, 1, 1, 1, { outline: false });
  }
  // lower garment: skirts / robes / coats / tunic flaps
  const skirt = (len: number, top: number, bot: number, col: string) => torso.add(G.cyl(top, bot, len, 9), 0, 0.03 - len / 2, 0, col, 0, 0, 0, 1, 1, 0.8);
  switch (job.torso) {
    case 'robe': case 'cassock': case 'gown':
      skirt(0.28, tw * 0.52, tw * 0.78, P);
      torso.add(G.cyl(tw * 0.79, tw * 0.79, 0.025, 9), 0, -0.25, 0, A, 0, 0, 0, 1, 1, 0.8, { outline: false });
      break;
    case 'dress':
      skirt(0.2, tw * 0.5, tw * 0.8, P);
      break;
    case 'coat':
      skirt(0.2, tw * 0.52, tw * 0.66, P);
      break;
    case 'tunic': case 'armor': case 'plate': case 'mail': case 'jerkin': case 'gi':
      if (job.legs !== 'hakama') skirt(0.08, tw * 0.5, tw * 0.58, armored ? tone(M, -0.1) : P);
      break;
    case 'kimono':
      skirt(0.12, tw * 0.5, tw * 0.62, P);
      break;
    default: break;
  }
  if (job.legs === 'skirt') skirt(0.14, tw * 0.5, tw * 0.7, S);
  if (job.legs === 'gown') skirt(0.3, tw * 0.5, tw * 0.82, S);
  if (job.legs === 'hakama') skirt(0.1, tw * 0.52, tw * 0.62, S);

  // ---- shoulders ----
  const sh = job.shoulders ?? 'none';
  if (sh !== 'none') {
    for (const [arm, sgn] of [[armR, -1], [armL, 1]] as const) {
      if (sh === 'pads') arm.add(G.box(0.1, 0.05, 0.12), sgn * 0.01, 0.02, 0, A);
      if (sh === 'pauldrons') arm.add(G.hemi(0.075, 8, 4), sgn * 0.01, 0.0, 0, tone(M, 0.1), 0, 0, sgn * 0.3, 1, 0.8, 1.1);
      if (sh === 'fur') arm.add(G.ico(0.07, 0), sgn * 0.01, 0.02, 0, '#d8c8a8', 0, 0, 0, 1, 0.7, 1.1);
      if (sh === 'spikes') { arm.add(G.hemi(0.07, 8, 4), 0, 0, 0, tone(M, -0.2)); arm.add(G.cone(0.025, 0.09, 5), sgn * 0.03, 0.06, 0, tone(M, 0.3), 0, 0, -sgn * 0.6); }
    }
  }

  // ---- arms ----
  const sleeve = armored ? M : job.torso === 'leotard' || job.torso === 'gi' && female ? skin : job.torso === 'vest' ? S : P;
  const wide = job.torso === 'kimono' || job.torso === 'robe' || job.torso === 'cassock';
  const gloves = job.extras?.includes('gloves') || armored;
  for (const [arm, elbow, hand] of [[armR, elbowR, handR], [armL, elbowL, handL]] as const) {
    arm.add(G.cyl(0.043 * bulk, 0.038 * bulk, 0.13, 7), 0, -0.06, 0, sleeve);
    elbow.add(wide ? G.cyl(0.04, 0.07, 0.12, 7) : G.cyl(0.036 * bulk, 0.034 * bulk, 0.12, 7), 0, -0.06, 0, wide ? P : sleeve);
    if (job.extras?.includes('bracers')) elbow.add(G.cyl(0.042, 0.042, 0.06, 7), 0, -0.08, 0, L);
    hand.add(G.sph(0.037, 7, 5), 0, 0, 0, gloves ? (armored ? tone(M, -0.1) : L) : skin);
  }

  // ---- head ----
  const hr = 0.18;
  const shadowFace = !!job.shadowFace;
  head.add(G.sph(hr, 12, 9), 0, hr * 0.95, 0.0, shadowFace ? '#141018' : skin, 0, 0, 0, 1, 0.95, 0.96);
  if (!shadowFace) {
    // face: eyes, brows, blush, nose hint
    const eyeCol = spec.look.eyes ?? '#2a1e18';
    for (const s of [-1, 1]) {
      head.add(G.box(0.032, female ? 0.052 : 0.044, 0.02), s * 0.062, hr * 0.9, hr * 0.9, eyeCol, 0, 0, 0, 1, 1, 1, { outline: false });
      head.add(G.box(0.012, 0.014, 0.01), s * 0.056, hr * 0.94, hr * 0.94, '#ffffff', 0, 0, 0, 1, 1, 1, { outline: false });
      head.add(G.box(0.05, 0.012, 0.012), s * 0.062, hr * 1.14, hr * 0.86, tone(hair, -0.2), 0, 0, s * (female ? -0.1 : 0.15), 1, 1, 1, { outline: false });
      if (female) head.add(G.box(0.03, 0.012, 0.005), s * 0.09, hr * 0.72, hr * 0.9, '#f0a0a0', 0, 0, 0, 1, 1, 1, { outline: false });
    }
    head.add(G.box(0.03, 0.008, 0.01), 0, hr * 0.62, hr * 0.93, tone(skin, -0.35), 0, 0, 0, 1, 1, 1, { outline: false });
    // beard
    const beard = spec.look.beard ?? 'none';
    if (beard === 'full') head.add(G.sph(hr * 0.8, 9, 6), 0, hr * 0.55, hr * 0.28, hair, 0.3, 0, 0, 1, 0.8, 0.8);
    if (beard === 'goatee') head.add(G.cone(0.04, 0.09, 6), 0, hr * 0.35, hr * 0.78, hair, Math.PI, 0, 0);
    if (beard === 'mustache') head.add(G.box(0.1, 0.02, 0.02), 0, hr * 0.68, hr * 0.95, hair, 0, 0, 0, 1, 1, 1, { outline: false });
    if (beard === 'stubble') head.add(G.sph(hr * 0.98, 10, 6, ), 0, hr * 0.84, 0.012, tone(skin, -0.15), 0.35, 0, 0, 1, 0.55, 0.96, { outline: false });
  } else {
    // glowing eyes in the dark
    for (const s of [-1, 1]) head.add(G.sph(0.028, 6, 4), s * 0.055, hr * 0.9, hr * 0.92, '#ffd84a', 0, 0, 0, 1, 1.2, 0.6, { outline: false, glow: true });
  }

  // ---- hair ----
  const headgear = job.headgear;
  const hideHair = ['fullHelm', 'ninjaHood', 'hood', 'cowl', 'mitre'].includes(headgear) || shadowFace;
  if (!hideHair) buildHair(head, spec.look.hairStyle ?? (female ? 'long' : 'short'), hair, hr, female, headgear !== 'none');

  // ---- headgear ----
  buildHeadgear(head, headgear, pal, hr, hair);

  // ---- cape ----
  if (cape) {
    const cCol = job.cape === 'tabard' ? A : job.cape === 'scarf' ? A : pal.accent === P ? S : (job.palette.secondary ?? A);
    const capeCol = job.cape === 'mantle' ? P : cCol;
    switch (job.cape) {
      case 'long': cape.add(G.box(tw * 1.2, 0.5, 0.025), 0, -0.25, -0.01, capeCol, 0.08); cape.add(G.box(tw * 1.25, 0.05, 0.05), 0, 0, 0.0, tone(capeCol, -0.15)); break;
      case 'short': cape.add(G.box(tw * 1.15, 0.26, 0.025), 0, -0.13, -0.01, capeCol, 0.1); break;
      case 'mantle': cape.add(G.cyl(tw * 0.6, tw * 0.95, 0.2, 9), 0, -0.07, 0.09, capeCol, 0, 0, 0, 1, 1, 0.8); break;
      case 'scarf': cape.add(G.torus(0.09, 0.03, 5, 10), 0, 0.02, 0.1, A, Math.PI / 2); cape.add(G.box(0.05, 0.2, 0.02), 0.04, -0.08, -0.01, A, 0.2); break;
      case 'tabard': torso.add(G.box(tw * 0.55, 0.36, 0.015), 0, 0.02, td * 0.52, A, 0, 0, 0, 1, 1, 1, { outline: false }); break;
    }
  }

  // ---- extras ----
  const ex = job.extras ?? [];
  if (ex.includes('satchel')) torso.add(G.box(0.1, 0.1, 0.06), tw * 0.5, 0.02, 0.05, L);
  if (ex.includes('quiver')) { torso.add(G.cyl(0.04, 0.04, 0.3, 7), 0.06, 0.2, -td * 0.7, L, 0.3, 0, -0.4); for (let i = 0; i < 3; i++) torso.add(G.cone(0.015, 0.05, 4), 0.1 + i * 0.015, 0.37, -td * 0.85, '#e8e0d0', 0.3, 0, -0.4); }
  if (ex.includes('scarf')) torso.add(G.torus(0.09, 0.028, 5, 10), 0, 0.3, 0.0, A, Math.PI / 2);
  if (ex.includes('bells')) for (const s of [-1, 1]) torso.add(G.sph(0.025, 6, 4), s * 0.09, 0.06, td * 0.5, '#e8c040');
  if (ex.includes('book')) torso.add(G.box(0.1, 0.12, 0.04), -tw * 0.5, 0.03, 0.03, '#6a2a2a');
  if (ex.includes('wings')) for (const s of [-1, 1]) torso.add(G.box(0.3, 0.2, 0.015), s * 0.14, 0.26, -td * 0.7, '#f4f0ff', 0, s * 0.5, s * -0.4);
  if (ex.includes('halo')) head.add(G.torus(0.13, 0.012, 4, 16), 0, hr * 2.25, 0, '#fff0a0', Math.PI / 2, 0, 0, 1, 1, 1, { outline: false, glow: true });
  if (ex.includes('mask')) head.add(G.box(0.2, 0.08, 0.03), 0, hr * 0.92, hr * 0.92, '#f4f0e8', 0, 0, 0, 1, 1, 1, { outline: false });
  if (ex.includes('feather')) head.add(G.cone(0.03, 0.22, 5), hr * 0.5, hr * 1.9, -0.05, '#e04a3a', -0.5, 0, -0.5, 1, 1, 0.3);
  if (ex.includes('tail')) hips.add(G.cone(0.03, 0.3, 5), 0, 0.0, -0.1, hair, -2.2, 0, 0);

  // ---- equipment ----
  const weaponSocket = new THREE.Group();
  weaponSocket.name = 'weaponSocket';
  handR.obj.add(weaponSocket);
  const shieldSocket = new THREE.Group();
  shieldSocket.name = 'shieldSocket';
  elbowL.obj.add(shieldSocket);
  shieldSocket.position.set(0.04, -0.07, 0.02);
  const offSocket = new THREE.Group();
  handL.obj.add(offSocket);
  if (spec.weapon) {
    const w = buildWeapon(spec.weapon);
    if (w) {
      if (spec.weapon.cat === 'bow' || spec.weapon.cat === 'instrument' || spec.weapon.cat === 'book') { offSocket.add(w); w.rotation.x = 0; }
      else weaponSocket.add(w);
    }
  }
  if (spec.weapon2) { const w2 = buildWeapon(spec.weapon2); if (w2) offSocket.add(w2); }
  if (spec.shield) { const s = buildShield(spec.shield); if (s) shieldSocket.add(s); }

  // ---- materials ----
  const material = propMaterial({ flat: true, roughness: 0.78 });
  const glowMat = propMaterial({ flat: true, emissive: '#ffd84a', emissiveIntensity: 3 });
  const meshes: Mesh[] = [];
  for (const p of parts) meshes.push(...p.finish(material, glowMat));

  // rest pose: arms slightly out
  armR.obj.rotation.z = -0.12; armL.obj.rotation.z = 0.12;
  elbowR.obj.rotation.x = -0.25; elbowL.obj.rotation.x = -0.25;

  const model: UnitModel = {
    root, bones, rest: new Map(), height: 1.0 * height, kind: 'humanoid', meshes,
    weaponSocket, shieldSocket,
    dispose() { root.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); }); },
  };
  snapshotRest(model);
  return model;
}

// ---------------------------------------------------------------------------
function buildHair(head: BonePart, style: string, col: string, hr: number, female: boolean, hat: boolean) {
  const dark = tone(col, -0.15);
  const cap = () => head.add(G.sph(hr * 1.06, 11, 8, ), 0, hr * 1.02, -0.012, col, 0, 0, 0, 1, 0.98, 1.02);
  const fringe = () => {
    for (let i = -2; i <= 2; i++) head.add(G.cone(0.045, 0.1, 5), i * 0.045, hr * 1.5, hr * 0.8, i % 2 ? col : dark, 0.2 + Math.abs(i) * 0.05, 0, i * 0.18);
  };
  // back-of-head cap covering upper half (cut look)
  switch (style) {
    case 'bald': head.add(G.sph(hr * 1.01, 10, 7), 0, hr * 0.97, -0.004, tone(col, 0.1), 0, 0, 0, 1, 0.95, 0.97, { outline: false }); break;
    case 'short': cap(); fringe(); break;
    case 'slick': cap(); head.add(G.box(0.2, 0.04, 0.12), 0, hr * 1.7, hr * 0.3, col, -0.3); break;
    case 'spiky':
      cap();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        head.add(G.cone(0.055, 0.2, 5), Math.sin(a) * hr * 0.7, hr * 1.5 + Math.cos(a) * 0.02, Math.cos(a) * hr * 0.6 - 0.04, i % 2 ? col : dark, -Math.cos(a) * 0.9 - 0.3, 0, Math.sin(a) * 0.9);
      }
      head.add(G.cone(0.06, 0.24, 5), 0, hr * 1.95, -0.02, col, -0.3, 0, 0);
      fringe();
      break;
    case 'wild': case 'shaggy':
      cap();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; head.add(G.ico(0.06, 0), Math.sin(a) * hr * 0.9, hr * (1.2 + (i % 3) * 0.15), Math.cos(a) * hr * 0.8 - 0.03, i % 2 ? col : dark); }
      fringe();
      break;
    case 'curly':
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r2 = i % 2 ? 0.85 : 1.0; head.add(G.ico(0.07, 0), Math.sin(a) * hr * r2, hr * (1.35 + (i % 4) * 0.12), Math.cos(a) * hr * r2 * 0.9 - 0.02, i % 3 ? col : dark); }
      head.add(G.ico(0.12, 1), 0, hr * 1.8, -0.02, col);
      break;
    case 'long':
      cap(); fringe();
      head.add(G.box(hr * 1.9, hr * 1.9, 0.08), 0, hr * 0.55, -hr * 0.75, col, 0.05);
      for (const s of [-1, 1]) head.add(G.box(0.07, hr * 1.4, 0.1), s * hr * 0.92, hr * 0.7, -0.02, col);
      break;
    case 'ponytail':
      cap(); fringe();
      head.add(G.sph(0.05, 6, 4), 0, hr * 1.5, -hr * 0.95, dark);
      head.add(G.cone(0.07, 0.34, 6), 0, hr * 0.95, -hr * 1.15, col, Math.PI + 0.35, 0, 0);
      break;
    case 'braid':
      cap(); fringe();
      for (let i = 0; i < 5; i++) head.add(G.sph(0.045 - i * 0.004, 6, 5), 0, hr * (1.2 - i * 0.28), -hr * (1.0 + i * 0.05), i % 2 ? col : dark);
      break;
    case 'bob':
      cap(); fringe();
      for (const s of [-1, 1]) head.add(G.box(0.08, hr * 1.1, hr * 1.4), s * hr * 0.9, hr * 0.85, -0.03, col);
      head.add(G.box(hr * 1.8, hr * 1.0, 0.08), 0, hr * 0.95, -hr * 0.85, col);
      break;
    case 'bun':
      cap(); fringe();
      head.add(G.sph(0.08, 8, 6), 0, hr * 1.85, -hr * 0.55, col);
      break;
    case 'twintails':
      cap(); fringe();
      for (const s of [-1, 1]) head.add(G.cone(0.06, 0.32, 6), s * hr * 1.05, hr * 0.8, -hr * 0.3, col, Math.PI, 0, -s * 0.35);
      break;
    case 'mohawk':
      head.add(G.sph(hr * 1.0, 10, 7), 0, hr * 0.97, -0.005, tone(col, 0.3), 0, 0, 0, 1, 0.95, 0.97, { outline: false });
      for (let i = 0; i < 5; i++) head.add(G.box(0.04, 0.12, 0.06), 0, hr * (1.85 - Math.abs(i - 2) * 0.08), hr * (0.6 - i * 0.35), col);
      break;
    case 'topknot':
      cap();
      head.add(G.cyl(0.035, 0.04, 0.1, 6), 0, hr * 2.05, -hr * 0.15, dark, -0.3);
      break;
    case 'crest':
      cap(); fringe();
      head.add(G.cone(0.08, 0.26, 5), 0, hr * 1.7, hr * 0.55, col, 1.2, 0, 0);
      head.add(G.box(hr * 1.7, hr * 1.1, 0.08), 0, hr * 0.95, -hr * 0.85, col);
      break;
    default: cap(); fringe();
  }
  void female; void hat;
}

function buildHeadgear(head: BonePart, hg: string, pal: Palette, hr: number, hair: string) {
  const P = pal.primary, S = pal.secondary, A = pal.accent, M = pal.metal ?? '#b8bcc6', L = pal.leather ?? '#5a3b24';
  const top = hr * 1.9;
  switch (hg) {
    case 'none': break;
    case 'hood': case 'cowl':
      head.add(G.sph(hr * 1.22, 11, 8), 0, hr * 1.0, -0.03, P, 0, 0, 0, 1, 1.02, 1.05);
      head.add(G.cone(hr * 0.5, hr * 0.8, 6), 0, hr * 1.9, -hr * 0.55, P, -0.9);
      head.add(G.torus(hr * 0.92, 0.025, 4, 14), 0, hr * 0.98, hr * 0.42, A, 0, 0, 0, 1, 1.05, 0.7, { outline: false });
      break;
    case 'wizardHat':
      head.add(G.cyl(hr * 1.95, hr * 1.95, 0.03, 14), 0, hr * 1.58, 0, P, 0.06);
      head.add(G.cone(hr * 1.05, hr * 2.4, 9), 0, hr * 2.6, -0.02, P, -0.12);
      head.add(G.cone(hr * 0.4, hr * 0.8, 7), 0, hr * 3.85, -0.2, P, -0.9);
      head.add(G.cyl(hr * 1.07, hr * 1.07, 0.05, 12), 0, hr * 1.66, 0, A, 0.06, 0, 0, 1, 1, 1, { outline: false });
      break;
    case 'helm':
      head.add(G.hemi(hr * 1.14, 10, 5), 0, hr * 1.12, -0.005, M);
      head.add(G.box(0.03, 0.1, 0.03), 0, hr * 1.0, hr * 1.08, tone(M, -0.1));
      head.add(G.torus(hr * 1.1, 0.02, 4, 14), 0, hr * 1.12, 0, tone(M, -0.2), Math.PI / 2, 0, 0, 1, 1, 1, { outline: false });
      break;
    case 'fullHelm':
      head.add(G.cyl(hr * 1.12, hr * 1.05, hr * 1.9, 10), 0, hr * 0.98, 0, M);
      head.add(G.hemi(hr * 1.12, 10, 4), 0, hr * 1.92, 0, M);
      head.add(G.box(hr * 1.4, 0.03, 0.05), 0, hr * 1.05, hr * 1.02, '#101018', 0, 0, 0, 1, 1, 1, { outline: false });
      head.add(G.box(0.025, hr * 0.8, 0.05), 0, hr * 0.7, hr * 1.02, tone(M, -0.25), 0, 0, 0, 1, 1, 1, { outline: false });
      head.add(G.box(0.05, 0.08, hr * 1.8), 0, hr * 2.02, 0, A);
      break;
    case 'bandana': case 'headband':
      head.add(G.torus(hr * 1.04, hg === 'bandana' ? 0.035 : 0.02, 4, 14), 0, hr * 1.35, 0.0, A, Math.PI / 2 - 0.12, 0, 0);
      if (hg === 'bandana') { head.add(G.box(0.03, 0.14, 0.04), 0.03, hr * 1.1, -hr * 1.05, A, 0.5, 0, 0.3); head.add(G.box(0.03, 0.12, 0.04), -0.03, hr * 1.12, -hr * 1.05, A, 0.4, 0, -0.3); }
      break;
    case 'featherCap':
      head.add(G.hemi(hr * 1.1, 10, 4), 0, hr * 1.35, -0.01, P, -0.15);
      head.add(G.cone(hr * 0.6, hr * 0.4, 8), 0, hr * 2.0, -0.02, P, -0.2);
      head.add(G.cone(0.035, 0.34, 5), hr * 0.7, hr * 1.9, -0.05, A, -0.7, 0, -0.5, 1, 1, 0.35);
      break;
    case 'circlet': case 'tiara':
      head.add(G.torus(hr * 1.02, 0.015, 4, 16), 0, hr * 1.4, 0, '#e0c060', Math.PI / 2 - 0.15, 0, 0, 1, 1, 1, { outline: false });
      head.add(G.oct(0.03), 0, hr * 1.48, hr * 0.98, hg === 'tiara' ? '#e04a6a' : '#4ac0e0', 0, 0, 0, 1, 1, 1, { glow: true, outline: false });
      break;
    case 'turban':
      head.add(G.torus(hr * 0.9, 0.07, 6, 12), 0, hr * 1.45, 0, P, Math.PI / 2);
      head.add(G.torus(hr * 0.75, 0.065, 6, 12), 0, hr * 1.65, -0.01, tone(P, -0.1), Math.PI / 2);
      head.add(G.sph(hr * 0.7, 9, 6), 0, hr * 1.6, 0, P);
      head.add(G.oct(0.035), 0, hr * 1.55, hr * 0.95, A, 0, 0, 0, 1, 1, 1, { glow: true, outline: false });
      break;
    case 'ninjaHood':
      head.add(G.sph(hr * 1.15, 11, 8), 0, hr * 0.98, -0.01, P);
      head.add(G.box(hr * 1.5, 0.06, 0.05), 0, hr * 1.02, hr * 1.02, '#e8c8a8', 0, 0, 0, 1, 1, 1, { outline: false });
      head.add(G.box(0.03, 0.18, 0.03), 0.02, hr * 1.2, -hr * 1.15, A, 0.4, 0, 0.3);
      break;
    case 'kabuto':
      head.add(G.hemi(hr * 1.18, 10, 5), 0, hr * 1.12, -0.01, M);
      head.add(G.cyl(hr * 1.35, hr * 1.5, 0.08, 10), 0, hr * 1.1, -0.04, tone(M, -0.2), 0.2);
      head.add(G.torus(hr * 0.5, 0.02, 4, 10, Math.PI), 0, hr * 1.9, hr * 0.7, '#e0c060', 0, 0, 0, 1, 1, 1, { outline: false });
      break;
    case 'dragoonHelm':
      head.add(G.hemi(hr * 1.16, 10, 5), 0, hr * 1.1, -0.01, M);
      head.add(G.cone(hr * 0.35, hr * 1.2, 6), 0, hr * 1.4, hr * 1.0, M, Math.PI / 2 + 0.3, 0, 0);
      for (const s of [-1, 1]) head.add(G.box(0.02, 0.18, 0.12), s * hr * 1.05, hr * 1.7, -0.04, A, -0.4, 0, s * 0.5);
      head.add(G.box(hr * 1.4, 0.03, 0.05), 0, hr * 1.0, hr * 1.05, '#101018', 0, 0, 0, 1, 1, 1, { outline: false });
      break;
    case 'jesterCap':
      head.add(G.hemi(hr * 1.1, 10, 4), 0, hr * 1.3, 0, P);
      for (const s of [-1, 1]) { head.add(G.cone(0.06, 0.3, 6), s * hr * 1.0, hr * 1.9, 0, s < 0 ? P : S, 0, 0, s * 1.0); head.add(G.sph(0.03, 6, 4), s * hr * 1.9, hr * 1.85, 0, '#e8c040'); }
      break;
    case 'crown':
      head.add(G.cyl(hr * 0.95, hr * 0.95, 0.09, 8), 0, hr * 1.7, 0, '#e0b840');
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; head.add(G.cone(0.025, 0.07, 4), Math.sin(a) * hr * 0.9, hr * 1.82, Math.cos(a) * hr * 0.9, '#e0b840'); }
      head.add(G.oct(0.03), 0, hr * 1.72, hr * 0.95, '#d02040', 0, 0, 0, 1, 1, 1, { glow: true, outline: false });
      break;
    case 'veil':
      head.add(G.sph(hr * 1.12, 10, 8), 0, hr * 1.05, -0.03, S, 0, 0, 0, 1, 1, 1.02);
      head.add(G.box(hr * 1.8, hr * 1.6, 0.03), 0, hr * 0.5, -hr * 0.95, S, 0.1);
      head.add(G.torus(hr * 1.02, 0.015, 4, 16), 0, hr * 1.35, 0, A, Math.PI / 2 - 0.15, 0, 0, 1, 1, 1, { outline: false });
      break;
    case 'beret':
      head.add(G.sph(hr * 1.15, 10, 6), 0.03, hr * 1.55, -0.02, P, 0.2, 0, -0.2, 1, 0.45, 1);
      head.add(G.cyl(0.015, 0.015, 0.05, 5), 0.03, hr * 1.85, -0.02, P);
      break;
    case 'mitre':
      head.add(G.cyl(hr * 1.05, hr * 1.05, hr * 0.5, 10), 0, hr * 1.35, 0, P);
      head.add(G.cone(hr * 1.05, hr * 1.6, 4), 0, hr * 2.4, 0, P, 0, Math.PI / 4, 0, 1, 1, 0.6);
      head.add(G.box(0.03, hr * 1.4, 0.02), 0, hr * 2.0, hr * 0.62, A, 0, 0, 0, 1, 1, 1, { outline: false });
      head.add(G.box(hr * 0.9, 0.03, 0.02), 0, hr * 2.1, hr * 0.6, A, 0, 0, 0, 1, 1, 1, { outline: false });
      break;
    case 'goggles':
      head.add(G.torus(hr * 1.04, 0.018, 4, 14), 0, hr * 1.42, 0, L, Math.PI / 2 - 0.2);
      for (const s of [-1, 1]) head.add(G.cyl(0.04, 0.04, 0.035, 8), s * 0.06, hr * 1.5, hr * 0.95, '#8ac8e8', Math.PI / 2 - 0.3, 0, 0, 1, 1, 1, { glow: false });
      break;
    case 'hornHelm':
      head.add(G.sph(hr * 1.2, 10, 8), 0, hr * 1.02, -0.02, P);
      for (const s of [-1, 1]) head.add(G.cone(0.05, 0.3, 6), s * hr * 0.9, hr * 1.9, -0.02, A, 0, 0, -s * 0.6);
      head.add(G.torus(hr * 0.92, 0.025, 4, 14), 0, hr * 0.98, hr * 0.42, A, 0, 0, 0, 1, 1.05, 0.7, { outline: false });
      break;
    case 'wingedHelm':
      head.add(G.hemi(hr * 1.14, 10, 5), 0, hr * 1.12, 0, M);
      for (const s of [-1, 1]) head.add(G.box(0.02, 0.16, 0.14), s * hr * 1.1, hr * 1.5, -0.03, '#f4f0e8', -0.5, 0, s * 0.6);
      break;
    case 'tricorn':
      head.add(G.cyl(hr * 1.6, hr * 1.6, 0.03, 3), 0, hr * 1.6, 0, P, 0, Math.PI, 0);
      head.add(G.cyl(hr * 0.9, hr * 1.0, hr * 0.4, 9), 0, hr * 1.78, 0, P);
      head.add(G.cone(0.03, 0.3, 5), hr * 0.5, hr * 1.95, -0.08, A, -0.6, 0, -0.4, 1, 1, 0.35);
      break;
    case 'straw':
      head.add(G.cone(hr * 2.1, hr * 1.2, 12), 0, hr * 1.95, 0, '#d8c070');
      head.add(G.torus(hr * 1.02, 0.025, 4, 14), 0, hr * 1.55, 0, A, Math.PI / 2);
      break;
    default: break;
  }
  void S; void hair;
}
