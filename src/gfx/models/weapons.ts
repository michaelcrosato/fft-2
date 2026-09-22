// Weapon & shield models. Built along +Y (grip at origin); the socket rotates them forward.
import { THREE } from '../three';
import type { ItemDef } from '../../data/types';
import { BonePart, G, tone } from './rig';
import { propMaterial } from '../materials';
import type { Group } from 'three/webgpu';

export function buildWeapon(it: ItemDef): Group | null {
  const model = it.look?.model ?? it.cat ?? 'sword';
  const col = it.look?.color ?? '#c8ccd4';
  const col2 = it.look?.color2 ?? '#6a4424';
  const glow = it.look?.glow;
  const p = new BonePart('weapon', null, 0, 0, 0, 0.008);
  const blade = (w: number, len: number, t = 0.012) => {
    p.add(G.box(w, len, t), 0, len / 2 + 0.05, 0, col);
    p.add(G.cone(w * 0.72, w * 1.2, 4), 0, len + 0.05 + w * 0.5, 0, col, 0, Math.PI / 4, 0, 1, 1, t / w * 1.4);
    if (glow) p.add(G.box(w * 0.3, len * 0.9, t * 1.4), 0, len / 2 + 0.05, 0, glow, 0, 0, 0, 1, 1, 1, { glow: true, outline: false });
  };
  const hilt = (guard = 0.12) => {
    p.add(G.cyl(0.014, 0.014, 0.1, 6), 0, -0.02, 0, col2);
    p.add(G.box(guard, 0.02, 0.035), 0, 0.04, 0, '#c8a040');
    p.add(G.sph(0.018, 6, 4), 0, -0.075, 0, '#c8a040');
  };
  switch (model) {
    case 'knife': case 'ninjaBlade': hilt(0.07); blade(0.035, model === 'ninjaBlade' ? 0.24 : 0.17); break;
    case 'sword': hilt(); blade(0.045, 0.36); break;
    case 'knightSword': hilt(0.16); blade(0.055, 0.46, 0.014); break;
    case 'katana':
      p.add(G.cyl(0.014, 0.014, 0.12, 6), 0, -0.02, 0, col2);
      p.add(G.cyl(0.03, 0.03, 0.012, 8), 0, 0.045, 0, '#c8a040');
      p.add(G.box(0.03, 0.44, 0.01), 0.004, 0.27, 0, col, 0, 0, -0.04);
      if (glow) p.add(G.box(0.012, 0.4, 0.014), 0.004, 0.27, 0, glow, 0, 0, -0.04, 1, 1, 1, { glow: true, outline: false });
      break;
    case 'axe':
      p.add(G.cyl(0.016, 0.016, 0.42, 6), 0, 0.15, 0, col2);
      p.add(G.box(0.14, 0.12, 0.018), 0.06, 0.32, 0, col);
      p.add(G.cyl(0.07, 0.07, 0.018, 8, ), 0.13, 0.32, 0, col, Math.PI / 2, 0, 0, 1, 1, 1);
      break;
    case 'rod':
      p.add(G.cyl(0.014, 0.018, 0.42, 6), 0, 0.16, 0, col2);
      p.add(G.oct(0.045), 0, 0.41, 0, glow ?? col, 0, 0, 0, 1, 1.4, 1, { glow: !!glow });
      p.add(G.torus(0.035, 0.01, 4, 8), 0, 0.39, 0, '#c8a040', Math.PI / 2);
      break;
    case 'staff': case 'pole':
      p.add(G.cyl(0.016, 0.018, 0.9, 6), 0, 0.22, 0, col2);
      if (model === 'staff') { p.add(G.torus(0.05, 0.012, 4, 10), 0, 0.72, 0, col, 0, 0, 0); p.add(G.sph(0.03, 7, 5), 0, 0.72, 0, glow ?? '#f0f0d0', 0, 0, 0, 1, 1, 1, { glow: !!glow }); }
      else { p.add(G.cyl(0.022, 0.022, 0.05, 6), 0, 0.66, 0, col); p.add(G.cyl(0.022, 0.022, 0.05, 6), 0, -0.22, 0, col); }
      break;
    case 'flail':
      p.add(G.cyl(0.016, 0.016, 0.24, 6), 0, 0.06, 0, col2);
      p.add(G.cyl(0.004, 0.004, 0.14, 4), 0, 0.24, 0, '#888');
      p.add(G.ico(0.055, 0), 0, 0.33, 0, col);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; p.add(G.cone(0.012, 0.04, 4), Math.cos(a) * 0.055, 0.33, Math.sin(a) * 0.055, col, 0, 0, -Math.PI / 2 + a); }
      break;
    case 'gun': case 'magicGun':
      p.add(G.box(0.04, 0.09, 0.03), 0, 0.0, -0.01, col2, -0.3);
      p.add(G.cyl(0.018, 0.02, 0.26, 7), 0, 0.14, 0.02, col);
      p.add(G.box(0.04, 0.06, 0.035), 0, 0.05, 0.02, tone(col, -0.2));
      if (model === 'magicGun') p.add(G.oct(0.025), 0, 0.28, 0.02, glow ?? '#8af', 0, 0, 0, 1, 1, 1, { glow: true, outline: false });
      break;
    case 'crossbow':
      p.add(G.box(0.035, 0.3, 0.035), 0, 0.12, 0, col2);
      p.add(G.box(0.3, 0.025, 0.025), 0, 0.23, 0, col, 0, 0, 0);
      p.add(G.box(0.3, 0.004, 0.004), 0, 0.19, 0, '#e8e0d0', 0, 0, 0, 1, 1, 1, { outline: false });
      break;
    case 'bow':
      for (const s of [-1, 1]) p.add(G.box(0.022, 0.28, 0.022), 0, s * 0.13, 0.05, col2, s * 0.35);
      p.add(G.box(0.004, 0.52, 0.004), 0, 0, -0.005, '#f0e8d0', 0, 0, 0, 1, 1, 1, { outline: false });
      break;
    case 'harp': case 'instrument':
      p.add(G.torus(0.12, 0.018, 4, 10, Math.PI * 1.2), 0, 0.1, 0, col, 0, Math.PI / 2, 0);
      p.add(G.box(0.02, 0.22, 0.02), 0, 0.1, -0.06, col2);
      for (let i = 0; i < 5; i++) p.add(G.box(0.003, 0.18, 0.003), 0, 0.1, -0.04 + i * 0.022, '#f0e8d0', 0, 0, 0, 1, 1, 1, { outline: false });
      break;
    case 'book':
      p.add(G.box(0.14, 0.18, 0.05), 0, 0.06, 0, col);
      p.add(G.box(0.13, 0.17, 0.045), 0.006, 0.06, 0, '#f0e8d0', 0, 0, 0, 1, 1, 1, { outline: false });
      if (glow) p.add(G.box(0.05, 0.05, 0.052), 0, 0.08, 0, glow, 0, 0, 0, 1, 1, 1, { glow: true, outline: false });
      break;
    case 'spear':
      p.add(G.cyl(0.014, 0.016, 0.95, 6), 0, 0.2, 0, col2);
      p.add(G.cone(0.035, 0.16, 5), 0, 0.75, 0, col);
      p.add(G.box(0.1, 0.02, 0.02), 0, 0.67, 0, '#c8a040');
      if (glow) p.add(G.cone(0.02, 0.14, 5), 0, 0.76, 0, glow, 0, 0, 0, 1, 1, 1, { glow: true, outline: false });
      break;
    case 'bag':
      p.add(G.sph(0.07, 7, 5), 0, 0.02, 0, col, 0, 0, 0, 1, 1.1, 0.8);
      p.add(G.torus(0.03, 0.008, 4, 8), 0, 0.1, 0, col2);
      break;
    case 'cloth':
      p.add(G.box(0.05, 0.3, 0.004), 0, 0.14, 0, col, 0, 0, 0.2);
      break;
    case 'shuriken':
      for (let i = 0; i < 4; i++) p.add(G.cone(0.02, 0.07, 3), Math.cos(i * Math.PI / 2) * 0.03, 0, Math.sin(i * Math.PI / 2) * 0.03, col, 0, 0, i * Math.PI / 2 - Math.PI / 2);
      break;
    case 'ball':
      p.add(G.ico(0.06, 1), 0, 0.02, 0, col);
      break;
    default: hilt(); blade(0.045, 0.34);
  }
  const g = new THREE.Group();
  p.finish(propMaterial({ flat: true, roughness: 0.4, metal: 0.5 }), propMaterial({ flat: true, emissive: glow ?? '#ffffff', emissiveIntensity: 2.5 }));
  g.add(p.obj);
  // point forward
  g.rotation.x = Math.PI / 2;
  if (model === 'staff' || model === 'pole' || model === 'spear') g.rotation.x = Math.PI / 2 - 0.9;
  if (model === 'gun' || model === 'magicGun' || model === 'crossbow') g.rotation.x = Math.PI / 2;
  g.name = 'weapon:' + it.id;
  return g;
}

export function buildShield(it: ItemDef): Group | null {
  const model = it.look?.model ?? 'roundShield';
  const col = it.look?.color ?? '#8a9aa8';
  const col2 = it.look?.color2 ?? '#c8a040';
  const p = new BonePart('shield', null, 0, 0, 0, 0.008);
  switch (model) {
    case 'buckler': p.add(G.cyl(0.08, 0.08, 0.02, 10), 0, 0, 0, col, Math.PI / 2); p.add(G.sph(0.025, 6, 4), 0, 0, 0.015, col2); break;
    case 'kiteShield':
      p.add(G.box(0.18, 0.2, 0.02), 0, 0.03, 0, col);
      p.add(G.cone(0.09, 0.14, 4), 0, -0.14, 0, col, Math.PI, Math.PI / 4, 0, 1, 1, 0.16);
      p.add(G.box(0.03, 0.26, 0.022), 0, -0.02, 0.004, col2, 0, 0, 0, 1, 1, 1, { outline: false });
      p.add(G.box(0.15, 0.03, 0.022), 0, 0.05, 0.004, col2, 0, 0, 0, 1, 1, 1, { outline: false });
      break;
    case 'towerShield': p.add(G.box(0.22, 0.38, 0.025), 0, 0, 0, col); p.add(G.box(0.24, 0.03, 0.03), 0, 0.17, 0, col2); p.add(G.box(0.24, 0.03, 0.03), 0, -0.17, 0, col2); break;
    default: p.add(G.cyl(0.12, 0.12, 0.022, 12), 0, 0, 0, col, Math.PI / 2); p.add(G.torus(0.12, 0.012, 4, 14), 0, 0, 0, col2); p.add(G.sph(0.03, 6, 4), 0, 0, 0.015, col2);
  }
  const g = new THREE.Group();
  p.finish(propMaterial({ flat: true, roughness: 0.45, metal: 0.4 }));
  g.add(p.obj);
  g.rotation.y = Math.PI / 2; // face outward (left side)
  g.name = 'shield:' + it.id;
  return g;
}
