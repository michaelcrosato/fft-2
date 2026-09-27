import { STORY } from '../../src/data/db';
import { newGame } from '../../src/game/state';

// A completed chronicle resumes on the world map without timed cutscenes.
const state = newGame('Mode Tester', [4, 12]);
state.storyIndex = STORY.length;
state.flags.game_complete = true;
state.flags.credits_seen = true;
state.savedAt = Date.now();
process.stdout.write(JSON.stringify(state));
