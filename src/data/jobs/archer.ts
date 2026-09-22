import type { AbilityDef, JobDef } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'archer', name: 'Archer', desc: 'A marksman of the levy. Draws and holds the string to loose an arrow of terrible weight.',
    generic: true,
    requires: [{ job: 'squire', level: 2 }],
    skillset: { id: 'aim', name: 'Aim', desc: 'Take careful aim at a single panel, trading time for power.' },
    abilities: [
      'aim1', 'aim2', 'aim3', 'aim4', 'aim5', 'aim7', 'aim10', 'aim20',
      'speedSave', 'arrowGuard', 'equipCrossbow', 'concentrate', 'jump1',
    ],
    move: 3, jump: 3, cev: 10,
    mult: { hp: 100, mp: 65, sp: 100, pa: 110, ma: 80 },
    growth: { hp: 11, mp: 16, sp: 100, pa: 45, ma: 50 },
    equip: ['bow', 'crossbow', 'shield', 'hat', 'ribbon', 'clothes'],
    look: {
      headgear: 'featherCap', torso: 'jerkin', legs: 'pants', cape: 'short', shoulders: 'pads',
      palette: { primary: '#4f6b3a', secondary: '#7a5a3a', accent: '#d8c27a', leather: '#5a3b24' },
      extras: ['quiver', 'belt', 'bracers', 'feather'],
      bulk: 0.95,
    },
  },
];

/** Aim +k: (PA + k) * WP — the longer the draw, the heavier the shot. Targets a panel, not a unit. */
function aim(k: number, jp: number, ct: number): AbilityDef {
  return {
    id: `aim${k}`, name: `Aim +${k}`,
    desc: `Hold the draw for ${ct} ticks, then loose a shot that strikes as though Physical Attack were ${k} higher.`,
    kind: 'action', jp, skillset: 'aim',
    range: 'weapon', target: 'enemy', ct, projectile: true, evadable: true, counterable: true, triggersReaction: 'physical',
    anim: 'bow', vfx: 'arrow', color: k >= 10 ? '#ffd27a' : '#e8e0c8', mimic: true,
    effects: [{ type: 'damage', formula: F.aim(k) }],
  };
}

export const abilities: AbilityDef[] = [
  aim(1, 100, 4),
  aim(2, 150, 5),
  aim(3, 200, 6),
  aim(4, 250, 8),
  aim(5, 300, 10),
  aim(7, 400, 14),
  aim(10, 600, 20),
  aim(20, 1000, 35),
  // ---- reaction / support / movement ----
  { id: 'speedSave', name: 'Speed Save', desc: 'When wounded, the blood quickens: Speed may rise by 1.', kind: 'reaction', jp: 800, skillset: 'archer' },
  { id: 'arrowGuard', name: 'Arrow Guard', desc: 'Swat aside bow and crossbow bolts, Brave percent of the time.', kind: 'reaction', jp: 450, skillset: 'archer' },
  { id: 'equipCrossbow', name: 'Equip Crossbows', desc: 'Allows any job to wield crossbows.', kind: 'support', jp: 350, skillset: 'archer' },
  { id: 'concentrate', name: 'Concentrate', desc: 'Physical attacks ignore the target\'s evasion.', kind: 'support', jp: 400, skillset: 'archer' },
  { id: 'jump1', name: 'Jump +1', desc: 'Increases Jump by 1.', kind: 'movement', jp: 200, skillset: 'archer', params: { jump: 1 } },
];
