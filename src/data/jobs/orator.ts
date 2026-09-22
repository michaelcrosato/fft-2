import type { AbilityDef, JobDef } from '../types';
import { F } from '../../battle/formulas';

export const jobs: JobDef[] = [
  {
    id: 'orator', name: 'Orator', desc: 'A silver-tongued envoy who wins battles with words: flattery, threat, sermon and the occasional pistol.',
    generic: true,
    requires: [{ job: 'mystic', level: 2 }],
    skillset: { id: 'speechcraft', name: 'Speechcraft', desc: 'Sway hearts and minds within earshot. Swayed by MA and the stars.' },
    abilities: [
      'invite', 'persuade', 'praise', 'intimidate', 'preach', 'enlighten', 'condemn', 'beg', 'insult', 'mimicDarrow',
      'fingerGuard', 'monsterTalk', 'equipGun', 'train',
    ],
    innate: ['monsterTalk'],
    move: 3, jump: 3, cev: 5,
    mult: { hp: 80, mp: 70, sp: 100, pa: 75, ma: 75 },
    growth: { hp: 11, mp: 18, sp: 100, pa: 55, ma: 50 },
    equip: ['gun', 'knife', 'hat', 'ribbon', 'clothes', 'robe'],
    look: {
      headgear: 'tricorn', torso: 'coat', legs: 'pants', cape: 'short', shoulders: 'none',
      palette: { primary: '#7a1f35', secondary: '#efe4c8', accent: '#d4b16a', leather: '#4a2f22' },
      extras: ['sash', 'book'],
    },
  },
];

/**
 * Speechcraft defaults. Every Speechcraft ability uses the job id as its skillset
 * so the Finger Guard reaction ("Deaf Ear") can recognise it. Instant, 3 panels, (MA + base)%.
 */
const O = {
  kind: 'action', skillset: 'orator', range: 3, rangeV: 3, anim: 'talk', vfx: 'talk', mimic: true, target: 'enemy',
} as const;

export const abilities: AbilityDef[] = [
  {
    ...O, id: 'invite', name: 'Invite', desc: 'Offer a foe better wages and a cause worth the name. They join your company. Success: MA + 20 %.', jp: 100,
    enemiesOnly: true, color: '#ffe6a0',
    hit: F.hitTalk(20),
    effects: [{ type: 'invite' }],
  },
  {
    ...O, id: 'persuade', name: 'Persuade', desc: 'Talk the target into second thoughts: their CT falls to 0. Success: MA + 30 %.', jp: 100,
    color: '#c8d8ff',
    hit: F.hitTalk(30),
    effects: [{ type: 'ct', set: 0 }], ai: { debuff: true },
  },
  {
    ...O, id: 'praise', name: 'Praise', desc: 'Words of honest praise: Brave +4 (a quarter of it lasting). Success: MA + 50 %.', jp: 200,
    target: 'ally', color: '#ffcf6a',
    hit: F.hitTalk(50),
    effects: [{ type: 'stat', stat: 'brave', amount: 4 }], ai: { buff: true },
  },
  {
    ...O, id: 'intimidate', name: 'Intimidate', desc: 'A cold promise of what comes next: Brave −20 (a quarter of it lasting). Success: MA + 90 %.', jp: 200,
    color: '#ff7a5a',
    hit: F.hitTalk(90),
    effects: [{ type: 'stat', stat: 'brave', amount: -20 }], ai: { debuff: true },
  },
  {
    ...O, id: 'preach', name: 'Preach', desc: 'A sermon on the mercy of Saint Auren: Faith +4 (a quarter of it lasting). Success: MA + 50 %.', jp: 200,
    target: 'ally', color: '#fff6c8',
    hit: F.hitTalk(50),
    effects: [{ type: 'stat', stat: 'faith', amount: 4 }], ai: { buff: true },
  },
  {
    ...O, id: 'enlighten', name: 'Enlighten', desc: 'Reason laid bare against dogma: Faith −20 (a quarter of it lasting). Success: MA + 90 %.', jp: 200,
    color: '#b8b8a0',
    hit: F.hitTalk(90),
    effects: [{ type: 'stat', stat: 'faith', amount: -20 }], ai: { debuff: true },
  },
  {
    ...O, id: 'condemn', name: 'Condemn', desc: 'Pronounce sentence upon the target, who falls when the count runs out (Doom). Success: MA + 30 %.', jp: 500,
    vfx: 'dark', color: '#b04aff',
    hit: F.hitTalk(30),
    effects: [{ type: 'status', add: ['doom'] }], ai: { debuff: true },
  },
  {
    ...O, id: 'beg', name: 'Beg', desc: 'A pitiful tale, well told: the foe presses gil into your hand. Success: MA + 40 %.', jp: 100,
    enemiesOnly: true, vfx: 'steal', color: '#ffe27a',
    hit: F.hitTalk(40),
    effects: [{ type: 'steal', slot: 'gil' }],
  },
  {
    ...O, id: 'insult', name: 'Insult', desc: 'An insult so cutting the target loses all reason (Berserk). Success: MA + 40 %.', jp: 300,
    color: '#ff4a4a',
    hit: F.hitTalk(40),
    effects: [{ type: 'status', add: ['berserk'] }], ai: { debuff: true },
  },
  {
    ...O, id: 'mimicDarrow', name: 'Mimic Darrow', desc: 'Recite old Master Darrow\'s lecture on the history of tithes. Everyone nearby falls asleep. Success: MA + 40 %.', jp: 300,
    aoe: 2, aoeV: 0, color: '#a8a8ff',
    hit: F.hitTalk(40),
    effects: [{ type: 'status', add: ['sleep'] }], ai: { debuff: true },
  },
  // ---- reaction / support / movement ----
  { id: 'fingerGuard', name: 'Deaf Ear', desc: 'Pay no heed to silver tongues: blocks Speechcraft Brave percent of the time.', kind: 'reaction', jp: 300, skillset: 'orator' },
  { id: 'monsterTalk', name: 'Beast Speech', desc: 'Speechcraft works on monsters.', kind: 'support', jp: 100, skillset: 'orator' },
  { id: 'equipGun', name: 'Equip Guns', desc: 'Allows any job to wield guns.', kind: 'support', jp: 750, skillset: 'orator' },
  { id: 'train', name: 'Tame', desc: 'A monster brought to critical HP by this unit may be won over to your side.', kind: 'support', jp: 450, skillset: 'orator' },
];
