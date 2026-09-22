// Malik Galthane's Hell Knight — "Falsitas" (source: Malak's Un-Truth).
// Random strikes like Veritas, but powered by *doubt*: damage uses (100 - Faith) of both
// caster and target, and each strike may carry a curse.
import type { AbilityDef, Element, FormulaCtx, JobDef, StatusId, VfxId } from '../../types';

const SK = 'falsitas';

/** reversed-faith magic: MA * Q * (100 - Fc) * (100 - Ft) / 10000 */
const unfaith = (q: number) => (x: FormulaCtx) => Math.floor((x.c.ma * q * (100 - x.c.effFaith) * (100 - x.t.effFaith)) / 10000);

function falsity(id: string, name: string, jp: number, mp: number, hits: number, q: number, element: Element | undefined, status: StatusId, chance: number, vfx: VfxId, color: string, desc: string): AbilityDef {
  return {
    id, name, desc: `${desc} ${hits} strikes fall at random on foes in the area; stronger the less both sides believe.`, kind: 'action', jp, skillset: SK,
    range: 3, aoe: 3, aoeV: 3, mp, target: 'enemy', magic: true, element, enemiesOnly: true,
    anim: 'cast', vfx, color, mimic: false, triggersReaction: 'magic',
    special: 'randomStrikes', params: { hits },
    effects: [{ type: 'damage', formula: unfaith(q) }],
    statusChance: [{ status, chance }],
  };
}

export const jobs: JobDef[] = [
  {
    id: 'hellKnight', name: 'Hell Knight', desc: 'The Galthane heir, schooled in the inverted rites. His power grows as faith withers — his own and his foe\'s.',
    generic: false,
    unique: 'malik',
    gender: 'm',
    skillset: { id: SK, name: 'Falsitas', desc: 'Inverted heavenly strikes that rain at random and curse. Stronger with LOW Faith.' },
    abilities: ['falsitasNetherToll', 'falsitasHellflame', 'falsitasShardRain', 'falsitasAbyssMaw', 'falsitasHollowVault', 'falsitasHellfall'],
    move: 4, jump: 3, cev: 12,
    mult: { hp: 105, mp: 100, sp: 100, pa: 90, ma: 110 },
    growth: { hp: 11, mp: 13, sp: 100, pa: 55, ma: 48 },
    equip: ['knife', 'rod', 'staff', 'hat', 'clothes', 'robe'],
    look: {
      headgear: 'turban', torso: 'robe', legs: 'pants', cape: 'scarf', shoulders: 'none',
      palette: { primary: '#1e1428', secondary: '#4a2a5e', accent: '#b04ae0', leather: '#2a1e18' },
      extras: ['sash', 'bracers'],
    },
  },
];

export const abilities: AbilityDef[] = [
  falsity('falsitasNetherToll', 'Nether Toll', 150, 6, 3, 10, 'lightning', 'silence', 20, 'bolt', '#b080ff', 'Black lightning that steals the voice.'),
  falsity('falsitasHellflame', 'Hellflame', 200, 8, 4, 10, 'fire', 'confuse', 15, 'inferno', '#c040a0', 'Violet fire that clouds the mind.'),
  falsity('falsitasShardRain', 'Shard Rain', 250, 10, 4, 10, undefined, 'blind', 20, 'dark', '#8060a0', 'Splinters of black glass that blind.'),
  falsity('falsitasAbyssMaw', 'Abyss Maw', 300, 12, 5, 10, 'water', 'slow', 20, 'water', '#402060', 'A pit of black water drags at the limbs.'),
  falsity('falsitasHollowVault', 'Hollow Vault', 400, 14, 5, 10, 'dark', 'sleep', 15, 'dark', '#301040', 'The heavens turn inside out and swallow the light.'),
  falsity('falsitasHellfall', 'Hellfall', 500, 18, 6, 10, 'dark', 'doom', 10, 'meteor', '#6a2080', 'Burning stones fall from an upturned sky.'),
];
