// Shared words: loading, dialogs, notices, the game's name.
import type { Lines } from '../core';

export const lines: Lines = {
  'common.game_name': 'Final Fealty Tactics',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.back': 'Back',
  'common.close': 'Close',
  'common.continue': 'Continue',
  'common.loading.title': 'Loading…',
  'common.loading.label': 'Loading game',
  'common.loading.start': 'Preparing the chronicle…',
  'common.loading.renderer': 'Waking the renderer…',
  'common.loading.land': 'Painting the land…',
  'common.loading.beasts': 'Summoning beasts…',
  'common.loading.chronicle': 'Opening the chronicle…',
  'common.loading.failed_title': 'Unable to continue',
  'common.loading.failed': 'Unable to load: {error}',
  'common.loading.reload': 'Reload game',
  'common.gpu_lost': 'The graphics device stopped responding. Your last autosave is safe. Reload to continue.',
  'common.pad.connected': 'Controller connected',
  'common.pad.connected_xbox': 'Controller connected (Xbox)',
  'common.pad.connected_playstation': 'Controller connected (PlayStation)',
  'common.pad.disconnected': 'Controller disconnected',
  'common.skip': 'Skip',
  'common.skip_label': 'Skip cutscene',
  'common.toolbar_label': 'Game controls',
  'common.tale_told': 'The tale is told.',
};

export const notes: Record<string, string> = {
  'common.game_name': 'The game\'s title. Keep it as written unless your language would translate a title like this.',
  'common.loading.failed': '{error} is a technical message from the browser, shown as it is.',
  'common.tale_told': 'Shown in the save list when the story is complete.',
};

export const max: Record<string, number> = { 'common.yes': 10, 'common.no': 10, 'common.back': 12, 'common.skip': 10 };
