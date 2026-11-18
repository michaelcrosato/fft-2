// The in-game Menu (src/ui/gameMenu.ts): the ☰ Menu button in the top-right corner and the
// pause menu it opens.
import type { Lines } from '../core';

export const lines: Lines = {
  'gamemenu.button': '☰ Menu',
  'gamemenu.button_back': '‹ Back',
  'gamemenu.button_resume': '▶ Resume',
  'gamemenu.heading': 'Game Menu',
  'gamemenu.paused': 'Game paused',
  'gamemenu.resume': 'Resume Game',
  'gamemenu.options': 'Options',
  'gamemenu.how_to_play': 'How to Play',
  'gamemenu.return_to_title': 'Return to Title',
  'gamemenu.quit_question': 'Return to title?',
  'gamemenu.quit_warning': 'Progress since your last save will be lost.',
  'gamemenu.keep_playing': 'Keep Playing',
};

export const notes: Record<string, string> = {
  'gamemenu.button': 'The small button in the corner of the screen that opens the Game Menu. Keep the ☰ icon at the start.',
  'gamemenu.button_back': 'The same button while a menu inside the Game Menu is open: it goes back one step. Keep the ‹ arrow at the start.',
  'gamemenu.button_resume': 'The same button while the Game Menu is open: it closes the menu and resumes play. Keep the ▶ icon at the start.',
  'gamemenu.heading': 'The heading of the pause menu, also its name for screen readers.',
  'gamemenu.return_to_title': 'Leaves the game for the title screen.',
  'gamemenu.quit_question': 'Asked before leaving the game for the title screen.',
  'gamemenu.keep_playing': 'Answers the question "Return to title?": stay in the game.',
};

export const max: Record<string, number> = {
  'gamemenu.button': 12,
  'gamemenu.button_back': 12,
  'gamemenu.button_resume': 12,
};
