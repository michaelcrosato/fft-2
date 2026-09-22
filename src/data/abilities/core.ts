import type { AbilityDef } from '../types';
import { F } from '../../battle/formulas';

/** Commands every unit has. */
export const abilities: AbilityDef[] = [
  {
    id: 'attack', name: 'Attack', desc: 'Strike with the equipped weapon.', kind: 'action', jp: 0,
    range: 'weapon', evadable: true, anim: 'swing', vfx: 'slash', mimic: true, counterable: true,
    triggersReaction: 'physical',
    effects: [{ type: 'damage', formula: F.weapon() }],
  },
  {
    id: 'defendCmd', name: 'Defend', desc: 'Brace for impact, doubling evasion until your next turn.', kind: 'action', jp: 0,
    range: 0, shape: 'self', target: 'self', anim: 'guard', vfx: 'guard',
    effects: [{ type: 'status', add: ['defending'] }],
  },
];
