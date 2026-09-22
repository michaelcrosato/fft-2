// Rana Galthane's Heaven Knight — "Veritas" (source: Rafa's Truth).
// Faith-scaled strikes that fall at random on enemies inside the area (special 'randomStrikes').
import type { AbilityDef, Element, JobDef, VfxId } from '../../types';
import { F } from '../../../battle/formulas';

const SK = 'veritas';

function verity(id: string, name: string, jp: number, mp: number, hits: number, q: number, element: Element, vfx: VfxId, color: string, desc: string): AbilityDef {
  return {
    id, name, desc: `${desc} ${hits} strikes fall at random on foes in the area.`, kind: 'action', jp, skillset: SK,
    range: 3, aoe: 3, aoeV: 3, mp, target: 'enemy', magic: true, element, enemiesOnly: true,
    anim: 'cast', vfx, color, mimic: false, triggersReaction: 'magic',
    special: 'randomStrikes', params: { hits },
    effects: [{ type: 'damage', formula: F.magic(q) }],
  };
}

export const jobs: JobDef[] = [
  {
    id: 'heavenKnight', name: 'Heaven Knight', desc: 'An assassin of the Galthane line trained to call down the truth of the heavens. Her strikes fall where fate wills.',
    generic: false,
    unique: 'rana',
    gender: 'f',
    skillset: { id: SK, name: 'Veritas', desc: 'Heavenly strikes that rain at random upon the foe. Stronger with high Faith.' },
    abilities: ['veritasHeavensToll', 'veritasWrathflame', 'veritasAdamantRain', 'veritasWyrmDeluge', 'veritasFirmament', 'veritasHeavenfall'],
    move: 4, jump: 3, cev: 12,
    mult: { hp: 95, mp: 110, sp: 100, pa: 80, ma: 115 },
    growth: { hp: 12, mp: 12, sp: 100, pa: 60, ma: 45 },
    equip: ['knife', 'rod', 'staff', 'hat', 'clothes', 'robe'],
    look: {
      headgear: 'circlet', torso: 'robe', legs: 'pants', cape: 'scarf', shoulders: 'none',
      palette: { primary: '#6a3a8a', secondary: '#2a1a34', accent: '#e0c060', leather: '#3a2a20' },
      extras: ['sash', 'bracers'],
    },
  },
];

export const abilities: AbilityDef[] = [
  verity('veritasHeavensToll', "Heaven's Toll", 150, 6, 3, 8, 'lightning', 'thunder', '#fff27a', 'The bells of heaven ring as lightning.'),
  verity('veritasWrathflame', 'Wrathflame', 200, 8, 4, 8, 'fire', 'flames', '#ff8a3a', 'Six-armed wrath made flame.'),
  verity('veritasAdamantRain', 'Adamant Rain', 250, 10, 4, 8, 'wind', 'wind', '#d8f4ff', 'A storm of diamond blades borne on the wind.'),
  verity('veritasWyrmDeluge', 'Wyrm Deluge', 300, 12, 5, 8, 'water', 'water', '#4aa8ff', 'A serpent of water rises from an unseen pit.'),
  verity('veritasFirmament', 'Firmament', 400, 14, 5, 8, 'holy', 'holy', '#fffbe0', 'The vault of heaven opens and pours down light.'),
  verity('veritasHeavenfall', 'Heavenfall', 500, 18, 6, 8, 'earth', 'meteor', '#d8a060', 'The sky-warden hurls stones from the firmament.'),
];
