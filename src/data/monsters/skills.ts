// ============================================================================
//  Monster skills — every technique wielded by the beasts of Ivaldis.
//
//  Monsters never learn abilities with JP: each species lists its skills in
//  JobDef.monsterSkills (see bestiary.ts). All skills here are `kind: 'action'`,
//  `jp: 0`, and carry their family id as `skillset`.
//
//  Area notation from the old bestiaries, "(2v1) R0", maps to:
//    aoe 2 (a tile and its four neighbours), aoeV 1, range 0 (centred on self).
//  Self-centred bursts that spare the user use shape 'ring'.
//  "MA + 40 = %" hit rates use F.hitMaNoFaith(40) — beast arts ignore Faith.
// ============================================================================
import type { AbilityDef, FormulaCtx, StatusId } from '../types';
import { F } from '../../battle/formulas';

type Fx = (x: FormulaCtx) => number;

/** Bare-fanged strike: [PA * Brave / 100] * PA (the classic monster attack). */
const paBr = (mult = 1): Fx => (x) => Math.max(1, Math.floor(Math.floor((x.c.pa * x.c.brave) / 100) * x.c.pa * mult));
/** PA * (1..n) — wild, swinging blows. */
const paRand = (n: number): Fx => (x) => x.c.pa * x.rng.int(1, n);
/** MA * [MA / 2] — the many-headed serpents' strikes. */
const maHalfMa: Fx = (x) => x.c.ma * Math.floor(x.c.ma / 2);

/** Bomb HP captured just before its own blast KOs it (see `detonate`). */
const preBlastHp = new WeakMap<object, number>();
/** Self: 999 (the bomb is destroyed). Others: maxHP/2 + (maxHP - HP before the blast). */
const detonation: Fx = (x) => {
  if (x.c.alive) preBlastHp.set(x.c, x.c.hp);
  if (x.t === x.c) return 999;
  const hp = x.c.alive ? x.c.hp : preBlastHp.get(x.c) ?? x.c.maxHp;
  return Math.max(1, Math.floor(x.c.maxHp / 2) + (x.c.maxHp - hp));
};

/** Shared defaults for every monster skill. */
function skill(family: string, a: Omit<AbilityDef, 'kind' | 'jp' | 'skillset'>): AbilityDef {
  return { kind: 'action', jp: 0, skillset: family, ...a };
}

const FOUL_BREATH: StatusId[] = ['petrify', 'blind', 'confuse', 'silence', 'poison', 'oil', 'frog', 'sleep'];

export const abilities: AbilityDef[] = [
  // ==========================================================================
  //  Kwehbo — "Kwehbo Arts"
  // ==========================================================================
  skill('kwehbo', {
    id: 'beakJab', name: 'Beak Jab', desc: 'A hard, darting peck at an adjacent foe.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'bite', vfx: 'pierce', color: '#f2c94c',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('kwehbo', {
    id: 'kwehCure', name: 'Kweh Cure', desc: 'A soothing warble that mends the wounds of the kwehbo and every ally beside it.',
    range: 0, aoe: 2, aoeV: 2, target: 'ally', alliesOnly: true, anim: 'roar', vfx: 'heal', color: '#f7e27a',
    effects: [{ type: 'heal', formula: F.ma(3) }], ai: { heal: true },
  }),
  skill('kwehbo', {
    id: 'kwehCleanse', name: 'Kweh Cleanse', desc: 'A bright trill that shakes off blindness, stone, stillness and venom from the kwehbo and its neighbours.',
    range: 0, aoe: 2, aoeV: 2, target: 'ally', alliesOnly: true, anim: 'roar', vfx: 'sparkleGreen', color: '#fff4a8',
    hit: F.hitMaNoFaith(65),
    effects: [{ type: 'status', remove: ['blind', 'disable', 'immobilize', 'petrify', 'stop', 'silence', 'poison'] }],
    ai: { heal: true },
  }),
  skill('kwehbo', {
    id: 'kwehBall', name: 'Kweh Ball', desc: 'Spits a hard pellet of grit and feathers at a foe up to four tiles away.',
    range: 4, target: 'enemy', evadable: true, anim: 'breath', vfx: 'stone', color: '#e8d9a8',
    effects: [{ type: 'damage', formula: F.paHalfPa() }],
  }),
  skill('kwehbo', {
    id: 'kwehMeteor', name: 'Kweh Meteor', desc: 'With a piercing cry the kwehbo calls a burning star down upon a single foe.',
    range: 5, target: 'enemy', anim: 'roar', vfx: 'meteor', color: '#ffb347',
    effects: [{ type: 'damage', formula: F.ma(4) }],
  }),

  // ==========================================================================
  //  Goblins — "Goblin Tricks"
  // ==========================================================================
  skill('goblin', {
    id: 'goblinTackle', name: 'Tackle', desc: 'The goblin hurls its whole wiry body at an adjacent foe.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'charge', vfx: 'impact',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('goblin', {
    id: 'eyeGouge', name: 'Eye Gouge', desc: 'Filthy claws rake at the eyes, leaving the foe Blind.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'claw', vfx: 'status', color: '#3a3a3a',
    hit: F.hitMaNoFaith(45),
    effects: [{ type: 'status', add: ['blind'] }],
  }),
  skill('goblin', {
    id: 'gobPunch', name: 'Gob Punch', desc: 'A haymaker fuelled by spite: deals damage equal to the HP the goblin has lost.',
    range: 1, rangeV: 1, target: 'enemy', evadable: true, anim: 'punch', vfx: 'punch', color: '#c0e070',
    hit: F.hitMaNoFaith(35),
    effects: [{ type: 'damage', formula: F.casterMissingHp() }],
  }),
  skill('goblin', {
    id: 'turnPunch', name: 'Turn Punch', desc: 'The goblin whirls with fists outflung, pummelling everyone standing beside it.',
    range: 0, aoe: 2, aoeV: 1, shape: 'ring', target: 'enemy', anim: 'punch', vfx: 'impact',
    effects: [{ type: 'damage', formula: F.paHalfPa() }],
  }),
  skill('goblin', {
    id: 'mutilate', name: 'Mutilate', desc: 'A frenzy of teeth and nails that tears away three quarters of the foe\'s max HP and feeds it to the goblin.',
    range: 1, rangeV: 1, target: 'enemy', evadable: true, anim: 'bite', vfx: 'drain', color: '#b02020',
    hit: F.hitMaNoFaith(30),
    effects: [{ type: 'damage', formula: F.pctMaxHp(0.75), drain: true }],
  }),

  // ==========================================================================
  //  Bombs — "Bomb Arts"
  // ==========================================================================
  skill('bomb', {
    id: 'bombBite', name: 'Bite', desc: 'Searing jaws snap at an adjacent foe.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'bite', vfx: 'pierce', color: '#ffb060',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('bomb', {
    // The bomb stands inside its own blast: it takes 999 and is destroyed.
    // Others take half the bomb's max HP plus the HP it has already lost. The
    // formula runs before each hit lands, so the bomb's pre-blast HP is
    // snapshotted while it still lives — the result is the same whether the
    // engine resolves the bomb first or last among the targets.
    id: 'detonate', name: 'Detonate', desc: 'The bomb swells and bursts, scorching all within two tiles and drenching them in Oil. The more it has been hurt, the greater the blast. The bomb is destroyed.',
    range: 0, aoe: 3, aoeV: 3, target: 'enemy', anim: 'charge', vfx: 'explosion', color: '#ff7a2a',
    effects: [
      { type: 'damage', formula: detonation },
      { type: 'status', add: ['oil'] },
    ],
  }),
  skill('bomb', {
    id: 'smallBomb', name: 'Small Bomb', desc: 'Spits a fizzing ember that bursts against an adjacent foe.',
    range: 1, rangeV: 1, target: 'enemy', evadable: true, anim: 'breath', vfx: 'explosion', color: '#ffd060',
    effects: [{ type: 'damage', formula: F.ma(4) }],
  }),
  skill('bomb', {
    id: 'flameAttack', name: 'Flame Attack', desc: 'Hurls a gout of fire at a foe up to three tiles away.',
    range: 3, target: 'enemy', element: 'fire', evadable: true, anim: 'breath', vfx: 'flames', color: '#ff6a2a',
    effects: [{ type: 'damage', formula: F.ma(3), element: 'fire' }],
  }),
  skill('bomb', {
    id: 'bombSpark', name: 'Spark', desc: 'Crackling sparks leap from the bomb\'s hide, striking everything within two tiles.',
    range: 0, aoe: 3, aoeV: 1, shape: 'ring', target: 'enemy', anim: 'spin', vfx: 'bolt', color: '#fff27a',
    effects: [{ type: 'damage', formula: F.ma(2) }],
  }),

  // ==========================================================================
  //  Panthers — "Panther Arts"
  // ==========================================================================
  skill('panther', {
    id: 'pantherScratch', name: 'Scratch', desc: 'Raking claws, quick as a heartbeat.',
    range: 1, rangeV: 3, target: 'enemy', evadable: true, anim: 'claw', vfx: 'slash', color: '#f0e0c0',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('panther', {
    id: 'poisonNail', name: 'Poison Nail', desc: 'Claws slick with venom leave the foe Poisoned.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'claw', vfx: 'poison', color: '#8cc44a',
    hit: F.hitMaNoFaith(40),
    effects: [{ type: 'status', add: ['poison'] }],
  }),
  skill('panther', {
    id: 'catKick', name: 'Cat Kick', desc: 'A savage hind-leg kick of wildly varying force that can send the foe sprawling.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'kick', vfx: 'impact',
    effects: [{ type: 'damage', formula: paRand(8) }, { type: 'knockback', tiles: 1 }],
  }),
  skill('panther', {
    id: 'blaster', name: 'Blaster', desc: 'A baleful glare from up to three tiles away that freezes the foe in time or turns it to stone.',
    range: 3, target: 'enemy', evadable: true, anim: 'roar', vfx: 'beam', color: '#b8a0ff',
    hit: F.hitMaNoFaith(30),
    effects: [{ type: 'status', add: ['stop', 'petrify'] }],
  }),
  skill('panther', {
    id: 'bloodDrain', name: 'Blood Drain', desc: 'Fangs sink deep, draining a quarter of the foe\'s max HP. The bitten may rise with a thirst of their own.',
    range: 1, rangeV: 1, target: 'enemy', evadable: true, anim: 'bite', vfx: 'drain', color: '#a01830',
    effects: [{ type: 'damage', formula: F.pctMaxHp(0.25), drain: true }],
    statusChance: [{ status: 'vampire', chance: 25 }],
  }),

  // ==========================================================================
  //  Squid — "Abyssal Arts"
  // ==========================================================================
  skill('squid', {
    id: 'squidTentacle', name: 'Tentacle', desc: 'A heavy, sucker-lined limb lashes an adjacent foe.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'claw', vfx: 'impact', color: '#c080d0',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('squid', {
    id: 'blackInk', name: 'Black Ink', desc: 'A cloud of stinging ink sprayed up to two tiles away blinds all it touches.',
    range: 2, aoe: 3, aoeV: 2, target: 'enemy', evadable: true, anim: 'breath', vfx: 'dark', color: '#1a1a2a',
    hit: F.hitMaNoFaith(50),
    effects: [{ type: 'status', add: ['blind'] }],
  }),
  skill('squid', {
    id: 'dissonance', name: 'Dissonance', desc: 'An eerie, warbling wail that strips away Float, Haste, Protect, Shell, Regen, Reraise, Vanish, Faith and Reflect from all nearby.',
    range: 0, aoe: 3, aoeV: 1, shape: 'ring', target: 'enemy', anim: 'roar', vfx: 'debuff', color: '#9ad0e0',
    effects: [{ type: 'status', remove: ['float', 'haste', 'protect', 'regen', 'shell', 'reraise', 'invisible', 'faith', 'reflect'] }],
  }),
  skill('squid', {
    id: 'mindBlast', name: 'Mind Blast', desc: 'A psychic lash that leaves its victims Confused or Berserk.',
    range: 3, aoe: 2, aoeV: 1, target: 'enemy', anim: 'cast', vfx: 'status', color: '#d080ff',
    hit: F.hitMaNoFaith(35),
    effects: [{ type: 'status', add: ['confuse', 'berserk'] }],
  }),
  skill('squid', {
    id: 'levelBlast', name: 'Level Blast', desc: 'Leeches away hard-won experience, lowering the foe\'s PA and MA by 1.',
    range: 4, target: 'enemy', anim: 'cast', vfx: 'debuff', color: '#8060c0',
    hit: F.hitMaNoFaith(60),
    effects: [{ type: 'stat', stat: 'pa', amount: -1 }, { type: 'stat', stat: 'ma', amount: -1 }],
  }),

  // ==========================================================================
  //  Skeletons — "Bone Arts"
  // ==========================================================================
  skill('skeleton', {
    id: 'knifeHand', name: 'Knife Hand', desc: 'Fleshless fingers held flat as a blade stab at an adjacent foe.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'thrust', vfx: 'slash', color: '#e8e0c8',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('skeleton', {
    id: 'thunderSoul', name: 'Thunder Soul', desc: 'Calls a restless spirit of storm down upon a foe up to three tiles away.',
    range: 3, target: 'enemy', element: 'lightning', anim: 'cast', vfx: 'bolt', color: '#fff080',
    effects: [{ type: 'damage', formula: F.ma(2), element: 'lightning' }],
  }),
  skill('skeleton', {
    id: 'aquaSoul', name: 'Aqua Soul', desc: 'Calls a drowned spirit to crash over a foe up to three tiles away.',
    range: 3, target: 'enemy', element: 'water', anim: 'cast', vfx: 'water', color: '#5aa0e0',
    effects: [{ type: 'damage', formula: F.ma(2), element: 'water' }],
  }),
  skill('skeleton', {
    id: 'iceSoul', name: 'Ice Soul', desc: 'Calls a spirit frozen in its grave to chill a foe up to three tiles away.',
    range: 3, target: 'enemy', element: 'ice', anim: 'cast', vfx: 'ice', color: '#a0e8ff',
    effects: [{ type: 'damage', formula: F.ma(2), element: 'ice' }],
  }),
  skill('skeleton', {
    id: 'windSoul', name: 'Wind Soul', desc: 'Calls a howling spirit of the gale to flay a foe up to three tiles away.',
    range: 3, target: 'enemy', element: 'wind', anim: 'cast', vfx: 'wind', color: '#c8f0d8',
    effects: [{ type: 'damage', formula: F.ma(3), element: 'wind' }],
  }),

  // ==========================================================================
  //  Ghosts — "Phantom Arts"
  // ==========================================================================
  skill('ghost', {
    id: 'throwSpirit', name: 'Throw Spirit', desc: 'Hurls a shrieking fragment of its own soul at a foe up to three tiles away.',
    range: 3, target: 'enemy', evadable: true, anim: 'throw', vfx: 'dark', color: '#a0e0ff',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('ghost', {
    id: 'sleepTouch', name: 'Sleep Touch', desc: 'A cold caress that lulls the foe into Sleep.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'claw', vfx: 'status', color: '#8888cc',
    hit: F.hitMaNoFaith(40),
    effects: [{ type: 'status', add: ['sleep'] }],
  }),
  skill('ghost', {
    id: 'greaseTouch', name: 'Grease Touch', desc: 'A clammy touch that leaves the foe slick with grave-fat. Oiled victims burn doubly.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'claw', vfx: 'status', color: '#6b5a33',
    hit: F.hitMaNoFaith(50),
    effects: [{ type: 'status', add: ['oil'] }],
  }),
  skill('ghost', {
    id: 'drainTouch', name: 'Drain Touch', desc: 'Siphons a third of the foe\'s max HP into the phantom\'s own shade.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'claw', vfx: 'drain', color: '#80ffb0',
    hit: F.hitMaNoFaith(60),
    effects: [{ type: 'damage', formula: F.pctMaxHp(0.34), drain: true }],
  }),
  skill('ghost', {
    id: 'zombieTouch', name: 'Zombie Touch', desc: 'The grave\'s own chill seeps into the foe, rendering it Undead.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'claw', vfx: 'dark', color: '#6a8a5a',
    hit: F.hitMaNoFaith(45),
    effects: [{ type: 'status', add: ['undead'] }],
  }),

  // ==========================================================================
  //  Eyes — "Gaze Arts"
  // ==========================================================================
  skill('eye', {
    id: 'wingAttack', name: 'Wing Attack', desc: 'A buffeting blow of leathery wings.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'swing', vfx: 'impact', color: '#d8c8e0',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('eye', {
    id: 'lookOfFright', name: 'Look of Fright', desc: 'A stare of such naked malice that the foe\'s Brave falls by 10.',
    range: 3, target: 'enemy', evadable: true, anim: 'roar', vfx: 'debuff', color: '#e0a040',
    hit: F.hitMaNoFaith(40),
    effects: [{ type: 'stat', stat: 'brave', amount: -10 }],
  }),
  skill('eye', {
    id: 'lookOfDevil', name: 'Look of Devil', desc: 'A gaze from the pit that may turn the foe to stone, stop it in time, bind its arms, silence it or blind it.',
    range: 3, target: 'enemy', evadable: true, anim: 'roar', vfx: 'status', color: '#c03050',
    hit: F.hitMaNoFaith(35),
    effects: [{ type: 'status', add: ['petrify', 'stop', 'disable', 'silence', 'blind'] }],
  }),
  skill('eye', {
    id: 'graveChill', name: 'Grave Chill', desc: 'Marks the foe with the cold of the tomb; when the count runs out, it falls.',
    range: 3, target: 'enemy', anim: 'cast', vfx: 'dark', color: '#6040a0',
    hit: F.hitMaNoFaith(40),
    effects: [{ type: 'status', add: ['doom'] }],
  }),
  skill('eye', {
    id: 'eyeCircle', name: 'Circle', desc: 'Traces a hex-circle about a foe up to four tiles away, lowering its MA by 2.',
    range: 4, target: 'enemy', anim: 'cast', vfx: 'glyph', color: '#a040ff',
    hit: F.hitMaNoFaith(55),
    effects: [{ type: 'stat', stat: 'ma', amount: -2 }],
  }),

  // ==========================================================================
  //  Birds — "Talon Arts"
  // ==========================================================================
  skill('bird', {
    id: 'talonRake', name: 'Talon Rake', desc: 'Swoops and rakes an adjacent foe with hooked talons.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'claw', vfx: 'slash', color: '#f0d8a0',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('bird', {
    id: 'featherBomb', name: 'Feather Bomb', desc: 'Looses a volley of razor-edged quills that burst upon a foe up to three tiles away.',
    range: 3, target: 'enemy', anim: 'spin', vfx: 'explosion', color: '#f4f0e0',
    effects: [{ type: 'damage', formula: F.ma(2) }],
  }),
  skill('bird', {
    id: 'shineLover', name: 'Shine Lover', desc: 'The bird cannot resist a glint of coin, and snatches gil from an adjacent foe\'s purse.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'steal', vfx: 'steal', color: '#ffd700',
    hit: F.hitSp(200),
    effects: [{ type: 'steal', slot: 'gil' }],
  }),
  skill('bird', {
    id: 'stoneBeak', name: 'Beak', desc: 'A peck laced with the basilisk\'s curse, turning the foe to stone.',
    range: 1, rangeV: 1, target: 'enemy', evadable: true, anim: 'bite', vfx: 'status', color: '#9a9a9a',
    hit: F.hitMaNoFaith(37),
    effects: [{ type: 'status', add: ['petrify'] }],
  }),
  skill('bird', {
    id: 'cripplingPeck', name: 'Crippling Peck', desc: 'Pecks at sinew and tendon, lowering the foe\'s PA by 2.',
    range: 1, rangeV: 1, target: 'enemy', evadable: true, anim: 'bite', vfx: 'debuff', color: '#c84030',
    hit: F.hitMaNoFaith(45),
    effects: [{ type: 'stat', stat: 'pa', amount: -2 }],
  }),

  // ==========================================================================
  //  Boars — "Tusk Arts"
  // ==========================================================================
  skill('boar', {
    id: 'straightDash', name: 'Straight Dash', desc: 'Head down, the boar charges into an adjacent foe.',
    range: 1, rangeV: 1, target: 'enemy', evadable: true, anim: 'charge', vfx: 'impact',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('boar', {
    id: 'oink', name: 'Oink', desc: 'A hearty, nudging snort that rouses a fallen ally with 70% of its HP.',
    range: 1, target: 'ko', anim: 'roar', vfx: 'revive', color: '#ffb0b0',
    hit: F.hitPa(70),
    effects: [{ type: 'revive', pct: 0.7 }], ai: { revive: true },
  }),
  skill('boar', {
    id: 'grunt', name: 'Grunt', desc: 'A low, rumbling grunt of such contentment that the foe beside it nods off to Sleep.',
    range: 1, rangeV: 2, target: 'enemy', anim: 'roar', vfx: 'status', color: '#8888cc',
    effects: [{ type: 'status', add: ['sleep'] }],
  }),
  skill('boar', {
    id: 'snoutHook', name: 'Snout Hook', desc: 'Hooks the foe with a guileless snout and leads it along, Charmed.',
    range: 1, rangeV: 2, target: 'enemy', anim: 'charge', vfx: 'status', color: '#ff77bb',
    hit: F.hitMaNoFaith(40),
    effects: [{ type: 'status', add: ['charm'] }],
  }),
  skill('boar', {
    id: 'offering', name: 'Offering', desc: 'The boar gives of its own vigour to an adjacent ally: restores a quarter of its HP and raises PA and MA by 1.',
    range: 1, target: 'ally', anim: 'roar', vfx: 'buff', color: '#ffe0a0',
    effects: [
      { type: 'heal', formula: F.pctMaxHp(0.25) },
      { type: 'stat', stat: 'pa', amount: 1 },
      { type: 'stat', stat: 'ma', amount: 1 },
    ],
    ai: { buff: true },
  }),

  // ==========================================================================
  //  Treants — "Grove Arts"
  // ==========================================================================
  skill('treant', {
    id: 'leafDance', name: 'Leaf Dance', desc: 'A whirl of knife-edged leaves strikes everyone beside the tree.',
    range: 0, aoe: 2, aoeV: 1, shape: 'ring', target: 'enemy', anim: 'spin', vfx: 'wind', color: '#6ab04c',
    effects: [{ type: 'damage', formula: F.ma(3) }],
  }),
  skill('treant', {
    id: 'protectSpirit', name: 'Protect Spirit', desc: 'The grove\'s spirit hardens bark over the tree and its neighbours, granting Protect.',
    range: 0, aoe: 2, aoeV: 1, target: 'ally', alliesOnly: true, anim: 'pray', vfx: 'buff', color: '#ffdd66',
    hit: F.hitMaNoFaith(45),
    effects: [{ type: 'status', add: ['protect'] }], ai: { buff: true },
  }),
  skill('treant', {
    id: 'calmSpirit', name: 'Calm Spirit', desc: 'The grove\'s spirit stills the air about the tree and its neighbours, granting Shell.',
    range: 0, aoe: 2, aoeV: 1, target: 'ally', alliesOnly: true, anim: 'pray', vfx: 'buffBlue', color: '#66ccff',
    hit: F.hitMaNoFaith(45),
    effects: [{ type: 'status', add: ['shell'] }], ai: { buff: true },
  }),
  skill('treant', {
    id: 'spiritOfLife', name: 'Spirit of Life', desc: 'Green sap-light wells up from the roots, restoring HP to the tree and its neighbours.',
    range: 0, aoe: 2, aoeV: 1, target: 'ally', alliesOnly: true, anim: 'pray', vfx: 'heal', color: '#8fe08f',
    effects: [{ type: 'heal', formula: F.ma(2) }], ai: { heal: true },
  }),
  skill('treant', {
    id: 'magicSpirit', name: 'Magic Spirit', desc: 'The old wood shares its quiet strength, restoring MP to the tree and its neighbours.',
    range: 0, aoe: 2, aoeV: 1, target: 'ally', alliesOnly: true, anim: 'pray', vfx: 'sparkleGreen', color: '#b0a0ff',
    effects: [{ type: 'heal', stat: 'mp', formula: F.ma(1) }], ai: { heal: true },
  }),

  // ==========================================================================
  //  Minotaurs — "Horned Arts"
  // ==========================================================================
  skill('minotaur', {
    id: 'gore', name: 'Gore', desc: 'Lowers its horns and tosses an adjacent foe.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'charge', vfx: 'pierce', color: '#e0d0b0',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('minotaur', {
    id: 'gatherPower', name: 'Gather Power', desc: 'Stamps and snorts, working itself into a fury. Raises its own PA by 2.',
    range: 0, shape: 'self', target: 'self', anim: 'roar', vfx: 'buffRed',
    effects: [{ type: 'stat', stat: 'pa', amount: 2 }], ai: { buff: true, score: 10 },
  }),
  skill('minotaur', {
    id: 'wildSwing', name: 'Wild Swing', desc: 'Swings its great arms in a circle, battering everyone beside it.',
    range: 0, aoe: 2, aoeV: 1, shape: 'ring', target: 'enemy', anim: 'swing', vfx: 'impact',
    effects: [{ type: 'damage', formula: F.paHalfPa() }],
  }),
  skill('minotaur', {
    id: 'blowFire', name: 'Blow Fire', desc: 'Snorts a roaring cloud of flame over an area up to three tiles away.',
    range: 3, aoe: 3, aoeV: 2, target: 'enemy', element: 'fire', anim: 'breath', vfx: 'flames', color: '#ff7040',
    effects: [{ type: 'damage', formula: F.ma(4), element: 'fire' }],
  }),
  skill('minotaur', {
    id: 'earthshaker', name: 'Earthshaker', desc: 'Stamps so hard the ground heaves, striking everyone within two tiles with earth.',
    range: 0, aoe: 3, aoeV: 1, shape: 'ring', target: 'enemy', element: 'earth', anim: 'roar', vfx: 'quake', color: '#a08050',
    effects: [{ type: 'damage', formula: F.ma(3), element: 'earth' }],
  }),

  // ==========================================================================
  //  Mawblooms — "Bloom Arts"
  // ==========================================================================
  skill('malboro', {
    id: 'mawTentacle', name: 'Tentacle', desc: 'A thorny vine-tentacle whips an adjacent foe.',
    range: 1, rangeV: 1, target: 'enemy', evadable: true, anim: 'claw', vfx: 'ivy', color: '#6a9a3a',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('malboro', {
    id: 'mawLick', name: 'Lick', desc: 'A slimy lick leaves a glossy film that turns spells aside (Reflect).',
    range: 1, rangeV: 1, target: 'any', anim: 'bite', vfx: 'status', color: '#ddffff',
    effects: [{ type: 'status', add: ['reflect'] }],
  }),
  skill('malboro', {
    id: 'mawGoo', name: 'Goo', desc: 'Spatters an adjacent foe with glue-thick sap, rooting it in place.',
    range: 1, rangeV: 1, target: 'enemy', anim: 'breath', vfx: 'poison', color: '#7aa050',
    effects: [{ type: 'status', add: ['immobilize'] }],
  }),
  skill('malboro', {
    id: 'foulBreath', name: 'Foul Breath', desc: 'A reeking exhalation that washes over everything within two tiles, bringing stone, blindness, madness, silence, venom, oil, toad-shape or sleep.',
    range: 0, aoe: 3, aoeV: 1, shape: 'ring', target: 'enemy', anim: 'breath', vfx: 'poison', color: '#6b8e23',
    effects: [{ type: 'status', add: FOUL_BREATH }],
    statusChance: FOUL_BREATH.map((status) => ({ status, chance: 20 })),
  }),
  skill('malboro', {
    id: 'sporeBlight', name: 'Spore Blight', desc: 'Seeds an adjacent foe with ravening spores. It is Poisoned, and falls when the count of Doom runs out.',
    range: 1, rangeV: 1, target: 'enemy', anim: 'breath', vfx: 'poison', color: '#9acd32',
    hit: F.hitMaNoFaith(20),
    effects: [{ type: 'status', add: ['doom', 'poison'], all: true }],
  }),

  // ==========================================================================
  //  Behemoths — "Behemoth Arts"
  // ==========================================================================
  skill('behemoth', {
    id: 'hornThrust', name: 'Horn Thrust', desc: 'Drives its great horns into an adjacent foe.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'charge', vfx: 'pierce', color: '#e0d0b0',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('behemoth', {
    id: 'dreadRoar', name: 'Dread Roar', desc: 'A roar at point-blank range that batters the foe and may stop its heart outright.',
    range: 1, rangeV: 1, target: 'enemy', evadable: true, anim: 'roar', vfx: 'impact', color: '#c0a0ff',
    effects: [{ type: 'damage', formula: F.paHalfPa() }],
    statusChance: [{ status: 'ko', chance: 12 }],
  }),
  skill('behemoth', {
    id: 'gigaflare', name: 'Gigaflare', desc: 'Gathers a sun between its horns and looses it over an area up to four tiles away.',
    range: 4, aoe: 3, aoeV: 1, target: 'enemy', anim: 'roar', vfx: 'flare', color: '#ff6a00',
    effects: [{ type: 'damage', formula: F.ma(7) }],
  }),
  skill('behemoth', {
    id: 'hurricane', name: 'Hurricane', desc: 'A roar that becomes a gale, tearing away a third of the max HP of all caught in it.',
    range: 4, aoe: 3, aoeV: 2, target: 'enemy', element: 'wind', anim: 'roar', vfx: 'wind', color: '#c8f0d8',
    effects: [{ type: 'damage', formula: F.pctMaxHp(0.34), element: 'wind' }],
  }),
  skill('behemoth', {
    id: 'starflare', name: 'Starflare', desc: 'The wounded beast calls down the wrath of the stars: deals damage equal to the HP it has lost to all in the area.',
    range: 4, aoe: 3, aoeV: 1, target: 'enemy', anim: 'roar', vfx: 'ultima', color: '#b0c0ff',
    effects: [{ type: 'damage', formula: F.casterMissingHp() }],
  }),

  // ==========================================================================
  //  Dragons — "Dragon Arts"
  // ==========================================================================
  skill('dragon', {
    id: 'dragonDash', name: 'Dash', desc: 'The dragon lunges bodily into an adjacent foe.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'charge', vfx: 'impact',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('dragon', {
    id: 'tailSwing', name: 'Tail Swing', desc: 'A sweep of the great tail, its force as wild as the sea, that may hurl the foe aside.',
    range: 1, rangeV: 2, target: 'enemy', evadable: true, anim: 'spin', vfx: 'impact',
    effects: [{ type: 'damage', formula: paRand(15) }, { type: 'knockback', tiles: 1 }],
  }),
  skill('dragon', {
    id: 'iceBreath', name: 'Ice Breath', desc: 'Freezing breath that scours the two tiles before the dragon.',
    range: 1, aoe: 2, aoeV: 2, shape: 'line', target: 'enemy', element: 'ice', anim: 'breath', vfx: 'breath', color: '#9ee7ff',
    effects: [{ type: 'damage', formula: F.ma(5), element: 'ice' }],
  }),
  skill('dragon', {
    id: 'fireBreath', name: 'Fire Breath', desc: 'Scorching breath that engulfs the two tiles before the dragon.',
    range: 1, aoe: 2, aoeV: 2, shape: 'line', target: 'enemy', element: 'fire', anim: 'breath', vfx: 'breath', color: '#ff6a3a',
    effects: [{ type: 'damage', formula: F.ma(5), element: 'fire' }],
  }),
  skill('dragon', {
    id: 'thunderBreath', name: 'Thunder Breath', desc: 'Crackling breath that lashes the two tiles before the dragon with lightning.',
    range: 1, aoe: 2, aoeV: 2, shape: 'line', target: 'enemy', element: 'lightning', anim: 'breath', vfx: 'breath', color: '#ffe96a',
    effects: [{ type: 'damage', formula: F.ma(5), element: 'lightning' }],
  }),
  // ---- holy-dragon arts (not innate to any wild species; for storied dragons) ----
  skill('dragon', {
    id: 'holyBreath', name: 'Holy Breath', desc: 'Radiant breath that sears the two tiles before the dragon with holy light.',
    range: 1, aoe: 2, aoeV: 2, shape: 'line', target: 'enemy', element: 'holy', anim: 'breath', vfx: 'breath', color: '#fff4c0',
    effects: [{ type: 'damage', formula: F.ma(5), element: 'holy' }],
  }),
  skill('dragon', {
    id: 'dragonsCharm', name: "Dragon's Charm", desc: 'The ancient gaze of a wyrm, before which a foe up to three tiles away forgets its allegiance.',
    range: 3, target: 'enemy', anim: 'roar', vfx: 'status', color: '#ff99cc',
    hit: F.hitMaNoFaith(40),
    effects: [{ type: 'status', add: ['charm'] }],
  }),
  skill('dragon', {
    id: 'magicBarrier', name: 'Magic Barrier', desc: 'Spreads its wings over itself and its neighbours, granting Protect and Shell.',
    range: 0, aoe: 2, aoeV: 2, target: 'ally', alliesOnly: true, anim: 'roar', vfx: 'guard', color: '#c0e0ff',
    effects: [{ type: 'status', add: ['protect', 'shell'], all: true }], ai: { buff: true },
  }),

  // ==========================================================================
  //  Hydras — "Hydra Arts"
  // ==========================================================================
  skill('hydra', {
    id: 'tripleAttack', name: 'Triple Attack', desc: 'Every head bites at once, striking the chosen foe and any enemy beside it.',
    range: 1, rangeV: 2, aoe: 2, aoeV: 2, target: 'enemy', enemiesOnly: true, evadable: true, anim: 'bite', vfx: 'slash', color: '#e0e060',
    effects: [{ type: 'damage', formula: paBr() }],
  }),
  skill('hydra', {
    id: 'tripleBreath', name: 'Triple Breath', desc: 'Three heads breathe three ways at once, tearing half the max HP from every foe within two tiles.',
    range: 0, aoe: 3, aoeV: 2, shape: 'ring', target: 'enemy', enemiesOnly: true, anim: 'breath', vfx: 'breath', color: '#c0ffb0',
    effects: [{ type: 'damage', formula: F.pctMaxHp(0.5) }],
  }),
  skill('hydra', {
    id: 'tripleFlame', name: 'Triple Flame', desc: 'Three gouts of fire fall at random among the foes in an area up to four tiles away.',
    range: 4, aoe: 2, aoeV: 1, target: 'enemy', element: 'fire', anim: 'breath', vfx: 'flames', color: '#ff6a2a',
    special: 'randomStrikes', params: { hits: 3 },
    effects: [{ type: 'damage', formula: maHalfMa, element: 'fire' }],
  }),
  skill('hydra', {
    id: 'tripleThunder', name: 'Triple Thunder', desc: 'Three bolts fall at random among the foes in an area up to four tiles away.',
    range: 4, aoe: 2, aoeV: 1, target: 'enemy', element: 'lightning', anim: 'breath', vfx: 'thunder', color: '#fff080',
    special: 'randomStrikes', params: { hits: 3 },
    effects: [{ type: 'damage', formula: maHalfMa, element: 'lightning' }],
  }),
  skill('hydra', {
    id: 'darkWhisper', name: 'Dark Whisper', desc: 'Six whispers of the void fall at random among the foes in an area; each may bring Sleep, or death.',
    range: 4, aoe: 2, aoeV: 1, target: 'enemy', element: 'dark', anim: 'breath', vfx: 'dark', color: '#8040a0',
    special: 'randomStrikes', params: { hits: 6 },
    effects: [{ type: 'damage', formula: maHalfMa, element: 'dark' }],
    statusChance: [{ status: 'sleep', chance: 15 }, { status: 'ko', chance: 6 }],
  }),
];
