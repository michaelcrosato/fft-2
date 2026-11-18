// Hot-seat versus: two players on one device, taking turns (the title menu's Versus).
import type { Lines } from '../core';

export const lines: Lines = {
  'versus.title_entry': 'Versus (2 players)',
  'versus.field': 'Choose the field',
  'versus.subtitle': 'Player 1 leads the blue company, Player 2 the red',
  'versus.handover.title': 'Player {player}',
  'versus.handover.text': 'Your company\'s turn. Take the controller, then press {key:confirm} when the other player cannot see the screen.',
  'versus.handover.ready': 'Ready',
  'versus.winner': 'Player {player} wins!',
  'versus.rematch': 'Rematch',
  'versus.exit': 'Back to the title',
};

export const notes: Record<string, string> = {
  'versus.title_entry': 'A title-menu entry: two people play against each other on one device.',
  'versus.handover.title': 'Shown full screen when the turn passes to the other player, in their colour.',
};

export const max: Record<string, number> = { 'versus.title_entry': 24, 'versus.handover.ready': 14, 'versus.rematch': 16 };
