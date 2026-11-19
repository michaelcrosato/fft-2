// Online versus (52in1 shared-world versus 2): the card, the waiting line and the result.
import type { Lines } from '../core';

export const lines: Lines = {
  'online.goal_blue': 'You lead the blue company. Defeat the red one.',
  'online.goal_red': 'You lead the red company. Defeat the blue one.',
  'online.goal_server': 'Two companies meet on the field.',
  'online.waiting': '{name} is deciding…',
  'online.won': 'Victory!',
  'online.lost': 'Defeated',
  'online.winner': '{name} wins!',
};

export const notes: Record<string, string> = {
  'online.waiting': 'Shown while the other player takes their turn. {name} is the player\'s name, chosen in 52in1.',
  'online.winner': 'Shown on a copy with no player of its own. {name} is the winning player\'s name, chosen in 52in1.',
};

export const max: Record<string, number> = { 'online.won': 14, 'online.lost': 14 };
