// Game Mode (src/ui/gameMode.ts): fullscreen and protection against browser gestures, offered
// each time a campaign starts or loads, and toggled from the Menu.
import type { Lines } from '../core';

export const lines: Lines = {
  'gamemode.on_fullscreen': 'Fullscreen on. Exit from the Menu or with Esc.',
  'gamemode.on_without_fullscreen': 'Game Mode protections on; fullscreen is unavailable. You can retry from the Menu with a tap or key press. Exit from the Menu or with Esc.',
  'gamemode.fullscreen': 'Fullscreen',
  'gamemode.exit_fullscreen': 'Exit Fullscreen',
  'gamemode.game_mode': 'Game Mode',
  'gamemode.exit_game_mode': 'Exit Game Mode',
  'gamemode.prompt.question': 'Fullscreen Game Mode?',
  'gamemode.prompt.explain': 'Hide browser controls, reduce accidental edge swipes and keep the screen awake while you play, where supported.',
  'gamemode.prompt.how_to_exit': 'Exit anytime from the Menu or with Esc. Your device may still allow system gestures.',
  'gamemode.prompt.no_fullscreen': 'Fullscreen is unavailable in this browser. Game Mode can still reduce accidental browser gestures.',
  'gamemode.prompt.enable': 'Enable Game Mode',
  'gamemode.prompt.decline': 'Play in Browser',
};

const ESC = 'Esc is the Escape key of a keyboard, which leaves fullscreen in every browser: write it as keyboards in your language label it. The Menu is the ☰ Menu button.';

export const notes: Record<string, string> = {
  'gamemode.on_fullscreen': `A notice once Game Mode starts in fullscreen. ${ESC}`,
  'gamemode.on_without_fullscreen': `A notice once Game Mode starts where the browser refused fullscreen. ${ESC}`,
  'gamemode.fullscreen': 'A button in the Menu: enters fullscreen Game Mode.',
  'gamemode.exit_fullscreen': 'A button in the Menu: leaves fullscreen Game Mode.',
  'gamemode.game_mode': 'A button in the Menu where the browser has no fullscreen: turns Game Mode on. Game Mode is fullscreen plus protection against browser gestures that would leave the game.',
  'gamemode.exit_game_mode': 'A button in the Menu where the browser has no fullscreen: turns Game Mode off.',
  'gamemode.prompt.question': 'The question asked as a campaign starts: play in fullscreen Game Mode?',
  'gamemode.prompt.how_to_exit': ESC,
  'gamemode.prompt.enable': 'Answers "Fullscreen Game Mode?": yes.',
  'gamemode.prompt.decline': 'Answers "Fullscreen Game Mode?": no, play in the browser window as it is.',
};
