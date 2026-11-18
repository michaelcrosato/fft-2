// What a DualSense's light bar says (AI Hub Catalogue v1: "health, a team, a warning"): the colour of
// the side whose unit is taking its turn, reddening as that unit weakens and pulsing when it is near
// death; gold for a victory, dark red for a defeat, lamplight on the world map. The title screen gives
// the light back to 52in1 (or the controller's own colour).
import { dualsense } from './index';

/** Player, enemy and third-party sides. */
const SIDE = ['#3b82f6', '#e0402f', '#2fbf5a'];
const MOOD = { world: '#e0a040', victory: '#f5c542', defeat: '#5c1414', town: '#d9b36a' } as const;
const RED = '#ff1a1a';

let pulse: ReturnType<typeof setInterval> | null = null;
function stopPulse() { if (pulse) { clearInterval(pulse); pulse = null; } }

const hex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
/** Blend two '#rrggbb' colours: t = 0 gives a, 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + ca.map((v, i) => hex(v + (cb[i] - v) * t)).join('');
}

/** The colour for a unit's turn: its side's, shading to red as its HP falls. */
export function turnColour(team: number, hp: number, maxHp: number): string {
  const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 1;
  return mix(SIDE[team] ?? SIDE[1], RED, Math.max(0, 1 - ratio) * 0.85);
}

/** A unit takes its turn: its side's colour, pulsing below a quarter of its HP. */
export function lightForTurn(team: number, hp: number, maxHp: number) {
  stopPulse();
  const colour = turnColour(team, hp, maxHp);
  dualsense.light(colour);
  if (maxHp > 0 && hp / maxHp <= 0.25 && dualsense.source) {
    let on = false;
    pulse = setInterval(() => { on = !on; dualsense.light(on ? colour : mix(colour, '#000000', 0.7)); }, 300);
  }
}

/** A mood for the moment: the world map, a town, a victory or a defeat. */
export function lightFor(mood: keyof typeof MOOD) { stopPulse(); dualsense.light(MOOD[mood]); }

/** Give the light back (the title screen, leaving the game). */
export function lightOff() { stopPulse(); dualsense.light(null); }
