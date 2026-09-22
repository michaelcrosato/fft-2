import type { ItemDef } from '../types';

export const items: ItemDef[] = [
  { id: 'potion', name: 'Potion', desc: 'A draught brewed from healing herbs. Restores 30 HP.', kind: 'consumable', price: 50, shopTier: 1, use: 'usePotion', look: { color: '#5fc7ff' } },
  { id: 'hiPotion', name: 'Hi-Potion', desc: 'A concentrated tonic. Restores 70 HP.', kind: 'consumable', price: 200, shopTier: 2, use: 'useHiPotion', look: { color: '#39e0c0' } },
  { id: 'xPotion', name: 'X-Potion', desc: 'An apothecary\'s masterwork. Restores 150 HP.', kind: 'consumable', price: 700, shopTier: 4, use: 'useXPotion', look: { color: '#ffd84a' } },
  { id: 'ether', name: 'Ether', desc: 'Distilled starlight. Restores 20 MP.', kind: 'consumable', price: 200, shopTier: 2, use: 'useEther', look: { color: '#b88cff' } },
  { id: 'hiEther', name: 'Hi-Ether', desc: 'Restores 50 MP.', kind: 'consumable', price: 600, shopTier: 4, use: 'useHiEther', look: { color: '#e08cff' } },
  { id: 'elixir', name: 'Elixir', desc: 'A legendary panacea. Fully restores HP and MP.', kind: 'consumable', price: 0, rare: true, use: 'useElixir', look: { color: '#ffe9a8', glow: '#fff4c0' } },
  { id: 'antidote', name: 'Antidote', desc: 'Cures Poison.', kind: 'consumable', price: 50, shopTier: 1, use: 'useAntidote', look: { color: '#8fd35a' } },
  { id: 'eyeDrop', name: 'Eye Drops', desc: 'Cures Blind.', kind: 'consumable', price: 50, shopTier: 1, use: 'useEyeDrop', look: { color: '#9fd6ff' } },
  { id: 'echoHerb', name: 'Echo Herb', desc: 'A bitter herb that restores the voice. Cures Silence.', kind: 'consumable', price: 50, shopTier: 1, use: 'useEchoHerb', look: { color: '#c8e6a0' } },
  { id: 'maidensKiss', name: "Maiden's Kiss", desc: 'Cures Toad.', kind: 'consumable', price: 60, shopTier: 2, use: 'useMaidensKiss', look: { color: '#ff9fc4' } },
  { id: 'softener', name: 'Softener', desc: 'A salve that turns stone back to flesh. Cures Stone.', kind: 'consumable', price: 100, shopTier: 2, use: 'useSoftener', look: { color: '#d8c8b0' } },
  { id: 'holyWater', name: 'Holy Water', desc: 'Blessed water. Cures Undead and Vampire.', kind: 'consumable', price: 2000, shopTier: 3, use: 'useHolyWater', look: { color: '#f4f8ff' } },
  { id: 'remedy', name: 'Remedy', desc: 'Cures most ailments.', kind: 'consumable', price: 350, shopTier: 3, use: 'useRemedy', look: { color: '#ffb35a' } },
  { id: 'phoenixDown', name: 'Phoenix Down', desc: 'A tail feather of the firebird. Revives a fallen ally.', kind: 'consumable', price: 300, shopTier: 1, use: 'usePhoenixDown', look: { color: '#ff6a3a' } },
];
