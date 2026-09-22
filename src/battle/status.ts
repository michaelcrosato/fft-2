import type { StatusId } from '../data/types';

export interface StatusInfo {
  id: StatusId;
  name: string;
  desc: string;
  /** default duration in clockticks; 0 = until removed */
  ticks: number;
  /** negative statuses are cured by Esuna/Remedy style effects and considered debuffs by AI */
  bad: boolean;
  color: string;
  icon: string;
  /** statuses this one cancels on application */
  cancels?: StatusId[];
  /** blocks being given this status */
  blockedBy?: StatusId[];
  /** unit cannot take turns */
  noTurn?: boolean;
  noMove?: boolean;
  noAct?: boolean;
  /** physical evasion is zero for units with this status */
  noEvade?: boolean;
  /** unit counts as out of the fight for victory checks */
  out?: boolean;
  /** show in status list */
  hidden?: boolean;
}

const S: StatusInfo[] = [
  { id: 'ko', name: 'KO', desc: 'Fallen. Crystallizes after three turns unless revived.', ticks: 0, bad: true, color: '#777', icon: '✝', noTurn: true, noEvade: true, out: true },
  { id: 'crystal', name: 'Crystal', desc: 'Became a crystal. Lost forever.', ticks: 0, bad: true, color: '#8ff', icon: '◆', noTurn: true, out: true, hidden: true },
  { id: 'treasure', name: 'Treasure', desc: 'Left a treasure chest behind.', ticks: 0, bad: true, color: '#fc6', icon: '▣', noTurn: true, out: true, hidden: true },
  { id: 'undead', name: 'Undead', desc: 'Healing harms; may rise again from KO.', ticks: 0, bad: true, color: '#9a7', icon: '☠' },
  { id: 'petrify', name: 'Stone', desc: 'Turned to stone. Out of the fight until cured.', ticks: 0, bad: true, color: '#999', icon: '▲', noTurn: true, noEvade: true, out: true, cancels: ['charging', 'performing'] },
  { id: 'confuse', name: 'Confuse', desc: 'Acts at random against friend and foe.', ticks: 0, bad: true, color: '#c9f', icon: '?', cancels: ['charging', 'performing'] },
  { id: 'blind', name: 'Blind', desc: 'Physical attacks rarely hit.', ticks: 0, bad: true, color: '#555', icon: '◐' },
  { id: 'silence', name: 'Silence', desc: 'Cannot cast spells.', ticks: 0, bad: true, color: '#aab', icon: '✕', cancels: ['charging'] },
  { id: 'oil', name: 'Oil', desc: 'Doused in oil. Fire deals double damage.', ticks: 0, bad: true, color: '#653', icon: '●' },
  { id: 'frog', name: 'Toad', desc: 'Turned into a toad. Weak and can only croak.', ticks: 0, bad: true, color: '#6b3', icon: '♣', cancels: ['charging', 'performing'] },
  { id: 'chicken', name: 'Chicken', desc: 'Lost all courage. Flees until brave returns.', ticks: 0, bad: true, color: '#fe8', icon: '♨', cancels: ['charging', 'performing'] },
  { id: 'poison', name: 'Poison', desc: 'Loses HP at the end of every turn.', ticks: 36, bad: true, color: '#8c4', icon: '☣', cancels: ['regen'] },
  { id: 'regen', name: 'Regen', desc: 'Recovers HP at the end of every turn.', ticks: 36, bad: false, color: '#6e9', icon: '✚', cancels: ['poison'] },
  { id: 'protect', name: 'Protect', desc: 'Physical damage reduced by a third.', ticks: 32, bad: false, color: '#fd6', icon: '⛨' },
  { id: 'shell', name: 'Shell', desc: 'Magical damage reduced by a third.', ticks: 32, bad: false, color: '#6cf', icon: '◈' },
  { id: 'haste', name: 'Haste', desc: 'Speed is increased by half.', ticks: 32, bad: false, color: '#f96', icon: '»', cancels: ['slow'] },
  { id: 'slow', name: 'Slow', desc: 'Speed is halved.', ticks: 24, bad: true, color: '#69c', icon: '«', cancels: ['haste'] },
  { id: 'stop', name: 'Stop', desc: 'Time has stopped for this unit.', ticks: 20, bad: true, color: '#48f', icon: '■', noTurn: true, noEvade: true, cancels: ['charging', 'performing'] },
  { id: 'sleep', name: 'Sleep', desc: 'Sleeping. Wakes when struck.', ticks: 60, bad: true, color: '#88c', icon: 'z', noTurn: true, noEvade: true, cancels: ['charging', 'performing'] },
  { id: 'immobilize', name: 'Immobile', desc: 'Legs bound — cannot move.', ticks: 24, bad: true, color: '#a86', icon: '⊥', noMove: true },
  { id: 'disable', name: 'Disabled', desc: 'Arms bound — cannot act.', ticks: 24, bad: true, color: '#a68', icon: '⊘', noAct: true, cancels: ['charging', 'performing'] },
  { id: 'reflect', name: 'Reflect', desc: 'Reflects most spells back at the caster.', ticks: 32, bad: false, color: '#dff', icon: '◇' },
  { id: 'float', name: 'Float', desc: 'Hovers above the ground. Immune to earth.', ticks: 0, bad: false, color: '#cef', icon: '☁' },
  { id: 'invisible', name: 'Vanish', desc: 'Unseen. Attacks always hit; broken by acting.', ticks: 0, bad: false, color: '#bbf', icon: '◌' },
  { id: 'berserk', name: 'Berserk', desc: 'Attacks wildly with increased power.', ticks: 0, bad: true, color: '#e44', icon: '‼', cancels: ['charging', 'performing'] },
  { id: 'charm', name: 'Charm', desc: 'Fights for the other side.', ticks: 32, bad: true, color: '#f7b', icon: '♥', cancels: ['charging', 'performing'] },
  { id: 'faith', name: 'Faith', desc: 'Faith is treated as 100.', ticks: 32, bad: false, color: '#ffd', icon: '✧', cancels: ['atheist'] },
  { id: 'atheist', name: 'Doubt', desc: 'Faith is treated as 0. Magic hardly affects the unit.', ticks: 32, bad: true, color: '#bb9', icon: '∅', cancels: ['faith'] },
  { id: 'doom', name: 'Doom', desc: 'Falls when the countdown reaches zero.', ticks: 0, bad: true, color: '#c4f', icon: '⌛' },
  { id: 'reraise', name: 'Reraise', desc: 'Revives automatically after falling.', ticks: 0, bad: false, color: '#ff9', icon: '☀' },
  { id: 'critical', name: 'Critical', desc: 'HP is dangerously low.', ticks: 0, bad: true, color: '#f55', icon: '!', hidden: true },
  { id: 'defending', name: 'Defending', desc: 'Braced to defend: evasion is doubled.', ticks: 0, bad: false, color: '#aaa', icon: '⛉' },
  { id: 'charging', name: 'Charging', desc: 'Preparing an action.', ticks: 0, bad: false, color: '#fff', icon: '…', noEvade: true, hidden: false },
  { id: 'performing', name: 'Performing', desc: 'Singing or dancing.', ticks: 0, bad: false, color: '#fcf', icon: '♪', noEvade: true },
  { id: 'jumping', name: 'Airborne', desc: 'High in the air, about to land.', ticks: 0, bad: false, color: '#ccf', icon: '↑', noTurn: false },
  { id: 'vampire', name: 'Vampire', desc: 'Thirsts for blood. Attacks allies and foes alike.', ticks: 0, bad: true, color: '#903', icon: '⚰' },
  { id: 'wall', name: 'Wall', desc: 'Fortified: damage and spells are blocked.', ticks: 0, bad: false, color: '#ccc', icon: '▦' },
];

export const STATUS: Record<StatusId, StatusInfo> = Object.fromEntries(S.map((s) => [s.id, s])) as Record<StatusId, StatusInfo>;

export const BAD_CURABLE: StatusId[] = ['petrify', 'confuse', 'blind', 'silence', 'oil', 'frog', 'chicken', 'poison', 'slow', 'stop', 'sleep', 'immobilize', 'disable', 'berserk', 'charm', 'doom', 'atheist', 'vampire'];
