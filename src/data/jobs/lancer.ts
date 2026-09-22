import type { AbilityDef, JobDef } from '../types';

export const jobs: JobDef[] = [
  {
    id: 'lancer', name: 'Lancer', desc: 'A heavy knight of the spear who vaults high into the sky and falls upon the foe like a thunderbolt.',
    generic: true,
    requires: [{ job: 'thief', level: 3 }],
    skillset: { id: 'leap', name: 'Leap', desc: 'Soar out of reach and crash down upon a distant foe. Range grows as the Lancer masters the art.' },
    abilities: [
      'jump',
      'jumpH2', 'jumpH3', 'jumpH4', 'jumpH5', 'jumpH8',
      'jumpV2', 'jumpV3', 'jumpV4', 'jumpV5', 'jumpV6', 'jumpV7', 'jumpV8',
      'dragonSpirit', 'equipSpear', 'ignoreHeight',
    ],
    move: 3, jump: 4, cev: 15,
    mult: { hp: 120, mp: 50, sp: 100, pa: 120, ma: 50 },
    growth: { hp: 10, mp: 15, sp: 100, pa: 40, ma: 50 },
    equip: ['spear', 'shield', 'helmet', 'armor', 'robe'],
    look: {
      headgear: 'dragoonHelm', torso: 'plate', legs: 'armored', cape: 'long', shoulders: 'pauldrons',
      palette: { primary: '#1f3a6e', secondary: '#2a2f45', accent: '#9fb6d8', metal: '#8e9aae', leather: '#3a2a1e' },
      extras: ['gloves'],
      bulk: 1.05,
    },
  },
];

function hJump(n: number, jp: number): AbilityDef {
  return {
    id: `jumpH${n}`, name: `Horizontal Jump ${n}`, desc: `Leap may land up to ${n} tiles away.`,
    kind: 'action', jp, skillset: 'leap', special: 'passive', params: { value: n },
  };
}
function vJump(n: number, jp: number): AbilityDef {
  return {
    id: `jumpV${n}`, name: `Vertical Jump ${n}`, desc: `Leap may reach targets up to ${n}h above or below.`,
    kind: 'action', jp, skillset: 'leap', special: 'passive', params: { value: n },
  };
}

export const abilities: AbilityDef[] = [
  {
    id: 'jump', name: 'Jump', desc: 'Leap high out of harm\'s way and plunge onto the target tile. Lands after 50/Speed ticks; a spear strikes half again as hard.',
    kind: 'action', jp: 0, skillset: 'leap', special: 'jump', target: 'enemy',
    anim: 'jump', vfx: 'jumpImpact', color: '#cfd8ff', evadable: false, counterable: true, mimic: true,
    effects: [],
  },
  hJump(2, 150), hJump(3, 300), hJump(4, 450), hJump(5, 600), hJump(8, 900),
  vJump(2, 100), vJump(3, 200), vJump(4, 300), vJump(5, 400), vJump(6, 500), vJump(7, 600), vJump(8, 900),
  // ---- reaction / support / movement ----
  { id: 'dragonSpirit', name: 'Wyrm Spirit', desc: 'When struck, may gain Reraise.', kind: 'reaction', jp: 560, skillset: 'lancer' },
  { id: 'equipSpear', name: 'Equip Spears', desc: 'Allows any job to equip spears.', kind: 'support', jp: 400, skillset: 'lancer' },
  { id: 'ignoreHeight', name: 'Ignore Height', desc: 'Move to any height regardless of Jump.', kind: 'movement', jp: 700, skillset: 'lancer' },
];
