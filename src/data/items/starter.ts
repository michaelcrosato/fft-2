import type { ItemDef } from '../types';

// Starter equipment used by early recruits. (Full catalogue lives in the other item files.)
export const items: ItemDef[] = [
  { id: 'dagger', name: 'Dagger', desc: 'A plain steel knife.', kind: 'weapon', cat: 'knife', price: 100, shopTier: 1, wp: 3, wev: 5, range: 1, dualOk: true, look: { model: 'knife', color: '#c8ccd4' } },
  { id: 'broadsword', name: 'Broadsword', desc: 'A soldier\'s simple blade.', kind: 'weapon', cat: 'sword', price: 200, shopTier: 1, wp: 4, wev: 5, range: 1, dualOk: true, twoHandOk: true, look: { model: 'sword', color: '#d0d4dc' } },
  { id: 'leatherCap', name: 'Leather Cap', desc: 'A cap of boiled leather.', kind: 'head', cat: 'hat', price: 150, shopTier: 1, hp: 8, look: { color: '#7a5634' } },
  { id: 'clothes', name: 'Travel Clothes', desc: 'Sturdy homespun garments.', kind: 'body', cat: 'clothes', price: 150, shopTier: 1, hp: 5, look: { color: '#8a7a5a' } },
];
