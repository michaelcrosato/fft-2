// ============================================================================
//  Throwables — shuriken and elemental orbs for the Ninja's Throw.
//  Thrown damage = Speed × WP. `specials.throwables()` sorts them by
//  look.model: 'shuriken' → shuriken category, anything else ('ball') → balls.
//
//  Shop tiers: 1 start · 2 Ch1 late · 3 Ch2 early · 4 Ch2 late · 5 Ch3 ·
//              6 Ch3 late · 7 Ch4 · 8 Ch4 late.
// ============================================================================
import type { ItemDef } from '../types';

export const items: ItemDef[] = [
  // ---- shuriken ----
  { id: 'shuriken', name: 'Shuriken', desc: 'A star of sharpened steel that spins as it flies and bites where it lands.', kind: 'throwable', price: 50, shopTier: 3, wp: 4, look: { model: 'shuriken', color: '#a0a4ac' } },
  { id: 'magicShuriken', name: 'Windmill Shuriken', desc: 'A four-armed dirk shaped like a windmill\'s sails; it slashes as it whirls.', kind: 'throwable', price: 300, shopTier: 4, wp: 7, look: { model: 'shuriken', color: '#c0c4d0', color2: '#6040a0' } },
  { id: 'nightfallStar', name: 'Nightfall Star', desc: 'A hooked cross-star of a famed shadow school, blackened so it is never seen before it strikes.', kind: 'throwable', price: 1000, shopTier: 6, wp: 10, look: { model: 'shuriken', color: '#202028', color2: '#8a1020' } },
  // ---- elemental orbs ----
  { id: 'flameOrb', name: 'Flame Orb', desc: 'A clay orb packed with fire-salts that bursts into flame on impact.', kind: 'throwable', price: 250, shopTier: 4, wp: 8, element: 'fire', look: { model: 'ball', color: '#d04020', glow: '#ff8040' } },
  { id: 'tideOrb', name: 'Tide Orb', desc: 'A glass orb holding a captive wave that crashes over whatever it strikes.', kind: 'throwable', price: 250, shopTier: 4, wp: 8, element: 'water', look: { model: 'ball', color: '#3070c0', glow: '#80c0ff' } },
  { id: 'stormOrb', name: 'Storm Orb', desc: 'A copper orb that hums with a bottled storm and cracks like thunder when it lands.', kind: 'throwable', price: 250, shopTier: 4, wp: 8, element: 'lightning', look: { model: 'ball', color: '#c0a030', glow: '#fff080' } },
];
