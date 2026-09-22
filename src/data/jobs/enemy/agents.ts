// Enemy specialists: the Assassin (Cerise, Lida) and the Gun Knight (Barrick).
import type { AbilityDef, JobDef, WeaponType } from '../../types';
import { F } from '../../../battle/formulas';
import { gunPow, spellGun, wpOr } from './common';

const GUNS: WeaponType[] = ['gun', 'magicGun'];

export const jobs: JobDef[] = [
  // ---------------------------------------------------------------- Assassin
  {
    id: 'assassin', name: 'Assassin',
    desc: 'A killer trained in the silent arts of the noble houses\' shadow courts. Moves like smoke, and a single touch can stop a heart.',
    generic: false, gender: 'f',
    skillset: { id: 'silentArt', name: 'Silent Art', desc: 'Hand-seals, needles and a lethal kiss. Their success depends on the assassin\'s Speed.' },
    abilities: [
      'assassinShadowStitch', 'assassinKissOfDeath', 'assassinStoneSeal', 'assassinCharmWink',
      'assassinHeartStop', 'assassinNightshade',
    ],
    // steps between shadows rather than walking
    innate: ['teleport'],
    move: 5, jump: 7, cev: 30,
    mult: { hp: 175, mp: 120, sp: 130, pa: 160, ma: 95 },
    growth: { hp: 12, mp: 14, sp: 90, pa: 45, ma: 50 },
    equip: ['knife', 'ninjaBlade', 'bag', 'hat', 'ribbon', 'clothes'],
    immune: ['charm', 'petrify', 'doom', 'frog', 'chicken'],
    look: {
      headgear: 'veil', torso: 'leotard', legs: 'tights', cape: 'scarf', shoulders: 'none',
      palette: { primary: '#151319', secondary: '#7a1020', accent: '#c8303e', metal: '#8a8a96', leather: '#1c1016' },
      extras: ['belt', 'gloves'],
      bulk: 0.9,
    },
  },
  // ---------------------------------------------------------------- Gun Knight
  {
    id: 'gunKnight', name: 'Gun Knight',
    desc: 'A Sanctum Knight armed with relic guns of the Lost Age. The Church hoards such Artifice while it burns lesser heretics for far less.',
    generic: false,
    skillset: { id: 'gunArts', name: 'Gunnery', desc: 'Crippling aimed shots and element-charged volleys. Requires a gun.' },
    abilities: ['gunHobbleShot', 'gunWristShot', 'gunSealShot', 'gunBlazeShot', 'gunFrostShot', 'gunBoltShot', 'gunScattershot'],
    innate: ['defenseUp', 'magicDefenseUp'],
    move: 4, jump: 3, cev: 18,
    mult: { hp: 175, mp: 110, sp: 138, pa: 115, ma: 120 },
    growth: { hp: 11, mp: 14, sp: 90, pa: 45, ma: 50 },
    equip: ['gun', 'magicGun', 'knife', 'hat', 'clothes', 'robe'],
    immune: ['petrify', 'charm', 'confuse', 'frog', 'chicken', 'sleep', 'berserk', 'doom', 'stop'],
    look: {
      headgear: 'goggles', torso: 'coat', legs: 'pants', cape: 'short', shoulders: 'pads',
      palette: { primary: '#4a3a2c', secondary: '#2d3340', accent: '#2f4f8a', metal: '#9a8a6a', leather: '#2a1c12' },
      extras: ['belt', 'gloves', 'satchel'],
      bulk: 1.02,
    },
  },
];

export const abilities: AbilityDef[] = [
  // ======================================================= Assassin — Silent Art
  {
    id: 'assassinShadowStitch', name: 'Shadow Stitch', kind: 'action', jp: 300, skillset: 'silentArt',
    desc: 'A black needle pins the shadow of a foe up to three tiles away, and the body cannot follow. (Stop; hit Speed + 60%)',
    range: 3, target: 'enemy', anim: 'throw', vfx: 'status', color: '#4a5cff',
    noReflect: true, hit: F.hitSp(60),
    effects: [{ type: 'status', add: ['stop'] }],
    ai: { debuff: true },
  },
  {
    id: 'assassinKissOfDeath', name: 'Kiss of Death', kind: 'action', jp: 900, skillset: 'silentArt',
    desc: 'A lover\'s kiss for an adjacent foe that stops the heart outright. Can be evaded; bosses resist. (Instant KO; hit Speed + 45%)',
    range: 1, target: 'enemy', anim: 'thrust', vfx: 'dark', color: '#c0104a',
    evadable: true, noReflect: true, hit: F.hitSp(45),
    effects: [{ type: 'special', id: 'instantKo' }],
    ai: { debuff: true },
  },
  {
    id: 'assassinStoneSeal', name: 'Stone Seal', kind: 'action', jp: 600, skillset: 'silentArt',
    desc: 'A hand-seal traced toward a foe up to three tiles away turns their flesh to grey stone. (Petrify; hit Speed + 45%)',
    range: 3, target: 'enemy', anim: 'cast', vfx: 'glyph', color: '#b4ac9c',
    noReflect: true, hit: F.hitSp(45),
    effects: [{ type: 'status', add: ['petrify'] }],
    ai: { debuff: true },
  },
  {
    id: 'assassinCharmWink', name: 'Charm Wink', kind: 'action', jp: 400, skillset: 'silentArt',
    desc: 'A glance from behind the veil at a foe up to three tiles away, and their loyalty is hers. (Charm; hit Speed + 55%)',
    range: 3, target: 'enemy', anim: 'talk', vfx: 'status', color: '#ff70b4',
    noReflect: true, hit: F.hitSp(55),
    effects: [{ type: 'status', add: ['charm'] }],
    ai: { debuff: true },
  },
  {
    id: 'assassinHeartStop', name: 'Heart Stop', kind: 'action', jp: 500, skillset: 'silentArt',
    desc: 'A pressure-point strike thrown from up to three tiles away; the heart counts down its last beats. (Doom; hit Speed + 50%)',
    range: 3, target: 'enemy', anim: 'cast', vfx: 'dark', color: '#902040',
    noReflect: true, hit: F.hitSp(50),
    effects: [{ type: 'status', add: ['doom'] }],
    ai: { debuff: true },
  },
  {
    id: 'assassinNightshade', name: 'Nightshade Needle', kind: 'action', jp: 250, skillset: 'silentArt',
    desc: 'A poisoned needle flicked at a foe up to four tiles away. Can be evaded. (Speed × weapon power (min 6), Poison 60%)',
    range: 4, target: 'enemy', anim: 'throw', vfx: 'shuriken', color: '#48a848',
    evadable: true, projectile: true, noReflect: true,
    effects: [{ type: 'damage', formula: (x) => x.c.speed * wpOr(x, 6) }],
    statusChance: [{ status: 'poison', chance: 60 }],
  },

  // ======================================================= Gun Knight — Gunnery
  {
    id: 'gunHobbleShot', name: 'Hobble Shot', kind: 'action', jp: 200, skillset: 'gunArts',
    desc: 'A shot to the knee. (Immobilize; hit Speed + 50%)',
    range: 'weapon', target: 'enemy', anim: 'gun', vfx: 'bullet', color: '#c8a880',
    requires: { weapon: GUNS }, projectile: true, noReflect: true, hit: F.hitSp(50),
    effects: [{ type: 'status', add: ['immobilize'] }],
    ai: { debuff: true },
  },
  {
    id: 'gunWristShot', name: 'Wrist Shot', kind: 'action', jp: 300, skillset: 'gunArts',
    desc: 'A shot to the sword-hand. (Disable; hit Speed + 50%)',
    range: 'weapon', target: 'enemy', anim: 'gun', vfx: 'bullet', color: '#c8a880',
    requires: { weapon: GUNS }, projectile: true, noReflect: true, hit: F.hitSp(50),
    effects: [{ type: 'status', add: ['disable'] }],
    ai: { debuff: true },
  },
  {
    id: 'gunSealShot', name: 'Seal Shot', kind: 'action', jp: 250, skillset: 'gunArts',
    desc: 'A bullet graven with a Glorian seal. Grazes the living but blasts the undead, and may turn them to stone. (WP² × 0.3 holy, WP² × 2 vs undead, WP counted 8–14; Petrify 25%; hit Speed + 70%)',
    range: 'weapon', target: 'enemy', element: 'holy', anim: 'gun', vfx: 'holy', color: '#fff4c0',
    requires: { weapon: GUNS }, projectile: true, noReflect: true, hit: F.hitSp(70),
    effects: [{ type: 'damage', element: 'holy', formula: (x) => gunPow(x.t.has('undead') ? 2 : 0.3)(x) }],
    statusChance: [{ status: 'petrify', chance: 25 }],
  },
  {
    id: 'gunBlazeShot', name: 'Blaze Shot', kind: 'action', jp: 400, skillset: 'gunArts',
    desc: 'The relic chamber vents a fire charge — usually a small one, sometimes a terrible one. Ignores Faith. (WP² fire, WP counted 8–14; × 1 / 1.4 / 2)',
    range: 'weapon', target: 'enemy', element: 'fire', anim: 'gun', vfx: 'flames', color: '#ff7a30',
    requires: { weapon: GUNS }, projectile: true, noReflect: true,
    effects: [{ type: 'damage', element: 'fire', formula: spellGun(1) }],
  },
  {
    id: 'gunFrostShot', name: 'Frost Shot', kind: 'action', jp: 400, skillset: 'gunArts',
    desc: 'The relic chamber vents an ice charge of uncertain strength. Ignores Faith. (WP² ice, WP counted 8–14; × 1 / 1.4 / 2)',
    range: 'weapon', target: 'enemy', element: 'ice', anim: 'gun', vfx: 'ice', color: '#90d8ff',
    requires: { weapon: GUNS }, projectile: true, noReflect: true,
    effects: [{ type: 'damage', element: 'ice', formula: spellGun(1) }],
  },
  {
    id: 'gunBoltShot', name: 'Bolt Shot', kind: 'action', jp: 400, skillset: 'gunArts',
    desc: 'The relic chamber vents a lightning charge of uncertain strength. Ignores Faith. (WP² lightning, WP counted 8–14; × 1 / 1.4 / 2)',
    range: 'weapon', target: 'enemy', element: 'lightning', anim: 'gun', vfx: 'bolt', color: '#fff080',
    requires: { weapon: GUNS }, projectile: true, noReflect: true,
    effects: [{ type: 'damage', element: 'lightning', formula: spellGun(1) }],
  },
  {
    id: 'gunScattershot', name: 'Scattershot', kind: 'action', jp: 500, skillset: 'gunArts',
    desc: 'A spray of shot that peppers a small area. Can be evaded. (WP² × 0.5 to each unit, WP counted 8–14)',
    range: 'weapon', aoe: 2, aoeV: 2, target: 'enemy', anim: 'gun', vfx: 'bullet', color: '#e0c090',
    requires: { weapon: GUNS }, evadable: true, noReflect: true,
    effects: [{ type: 'damage', formula: gunPow(0.5) }],
  },
];
