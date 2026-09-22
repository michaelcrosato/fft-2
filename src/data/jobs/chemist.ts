import type { AbilityDef, JobDef, StatusId } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'chemist', name: 'Chemist', desc: 'An apothecary who knows the virtue of every draught. Can hurl items across the field.',
    generic: true,
    skillset: { id: 'items', name: 'Items', desc: 'Use restorative items from the party stock.' },
    abilities: [
      'usePotion', 'useHiPotion', 'useXPotion', 'useEther', 'useHiEther', 'useElixir', 'useAntidote', 'useEyeDrop',
      'useEchoHerb', 'useMaidensKiss', 'useSoftener', 'useHolyWater', 'useRemedy', 'usePhoenixDown',
      'autoPotion', 'throwItem', 'maintenance', 'equipChange', 'moveFind',
    ],
    innate: ['throwItem'],
    move: 3, jump: 3, cev: 5,
    mult: { hp: 80, mp: 75, sp: 100, pa: 75, ma: 80 },
    growth: { hp: 12, mp: 16, sp: 100, pa: 75, ma: 50 },
    equip: ['knife', 'gun', 'hat', 'clothes'],
    look: {
      headgear: 'beret', torso: 'coat', legs: 'pants', cape: 'none',
      palette: { primary: '#c9b27a', secondary: '#5b6f4a', accent: '#8a2f2a', leather: '#5a3b24' },
      extras: ['satchel', 'belt'],
    },
  },
];

function useItem(id: string, name: string, itemId: string, jp: number, desc: string, eff: AbilityDef['effects'], extra: Partial<AbilityDef> = {}): AbilityDef {
  return {
    id, name, desc, kind: 'action', jp, skillset: 'items', range: 1, target: 'ally', anim: 'item', vfx: 'potion',
    consumes: itemId, effects: eff, mimic: true, ...extra,
  };
}
const cure = (s: StatusId[]) => [{ type: 'status' as const, remove: s }];

export const abilities: AbilityDef[] = [
  useItem('usePotion', 'Potion', 'potion', 30, 'Restores 30 HP.', [{ type: 'heal', formula: F.fixed(30) }], { ai: { heal: true } }),
  useItem('useHiPotion', 'Hi-Potion', 'hiPotion', 200, 'Restores 70 HP.', [{ type: 'heal', formula: F.fixed(70) }], { ai: { heal: true } }),
  useItem('useXPotion', 'X-Potion', 'xPotion', 300, 'Restores 150 HP.', [{ type: 'heal', formula: F.fixed(150) }], { ai: { heal: true } }),
  useItem('useEther', 'Ether', 'ether', 300, 'Restores 20 MP.', [{ type: 'heal', stat: 'mp', formula: F.fixed(20) }]),
  useItem('useHiEther', 'Hi-Ether', 'hiEther', 400, 'Restores 50 MP.', [{ type: 'heal', stat: 'mp', formula: F.fixed(50) }]),
  useItem('useElixir', 'Elixir', 'elixir', 900, 'Fully restores HP and MP.', [{ type: 'special', id: 'fullRestore' }], { vfx: 'elixir', ai: { heal: true } }),
  useItem('useAntidote', 'Antidote', 'antidote', 70, 'Cures Poison.', cure(['poison'])),
  useItem('useEyeDrop', 'Eye Drops', 'eyeDrop', 80, 'Cures Blind.', cure(['blind'])),
  useItem('useEchoHerb', 'Echo Herb', 'echoHerb', 120, 'Cures Silence.', cure(['silence'])),
  useItem('useMaidensKiss', "Maiden's Kiss", 'maidensKiss', 200, 'Cures Toad.', cure(['frog'])),
  useItem('useSoftener', 'Softener', 'softener', 250, 'Cures Stone.', cure(['petrify']), { target: 'any' }),
  useItem('useHolyWater', 'Holy Water', 'holyWater', 400, 'Cures Undead and Vampire.', cure(['undead', 'vampire'])),
  useItem('useRemedy', 'Remedy', 'remedy', 700, 'Cures most ailments.', cure(['petrify', 'confuse', 'blind', 'silence', 'oil', 'frog', 'poison', 'sleep'])),
  useItem('usePhoenixDown', 'Phoenix Down', 'phoenixDown', 90, 'Revives a fallen ally with a little HP. Fells the undead.', [{ type: 'revive', pct: 0.25 }], { target: 'ko', vfx: 'phoenix', ai: { revive: true } }),
  // ---- R/S/M ----
  { id: 'autoPotion', name: 'Auto-Potion', desc: 'When damaged, automatically drinks the best potion in stock.', kind: 'reaction', jp: 400, skillset: 'chemist' },
  { id: 'throwItem', name: 'Throw Items', desc: 'Items can be used on targets up to four tiles away.', kind: 'support', jp: 350, skillset: 'chemist' },
  { id: 'maintenance', name: 'Safeguard', desc: 'Equipment cannot be stolen or broken.', kind: 'support', jp: 250, skillset: 'chemist' },
  { id: 'equipChange', name: 'Reequip', desc: 'Allows changing equipment during battle.', kind: 'support', jp: 0, skillset: 'chemist' },
  { id: 'moveFind', name: 'Treasure Hunter', desc: 'Find hidden items by ending movement on their tile.', kind: 'movement', jp: 100, skillset: 'chemist' },
];
