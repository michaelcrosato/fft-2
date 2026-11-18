// 52in1 sessions: the round's card over the field, the countdown, the result, and what goes to the
// hub's scoreboard (progress label and stat names), all in the player's language.
import type { Lines } from '../core';

export const lines: Lines = {
  'session.waiting': 'Waiting for every player…',
  'session.go': 'Go!',
  'session.trial_goal': 'Defeat every foe, as quickly as you can.',
  'session.cleared': 'Cleared!',
  'session.failed': 'Not this time',
  'session.time_up': 'Time!',
  'session.defeated': 'Defeated',
  'session.progress': '{count} of {total} foes down',
  'session.stat.turns': 'Turns',
  'session.stat.foes': 'Foes defeated',
  'session.stat.foes_value': '{count} of {total}',
  'session.stat.damage': 'Damage dealt',
  'session.stat.allies': 'Allies standing',
  'session.moment.archer_strike': 'Knock out the enemy archer this turn. Strike from the side or behind: a blow from the front can miss.',
  'session.moment.spell_break': 'Defeat the wizard before his spell lands. A unit gathering a spell cannot dodge.',
  'session.moment.bell_tower': 'Climb to the top of the stone tower in one move.',
  'session.moment.hold_the_gate': 'Keep the wounded squire standing until time runs out.',
  'session.moment.last_chest': 'Open the treasure chest before it is lost: move onto it this turn.',
};

export const notes: Record<string, string> = {
  'session.waiting': 'Shown over the battlefield until 52in1 starts the round for all players at once.',
  'session.go': 'The end of the countdown (3, 2, 1, Go!), very large.',
  'session.failed': 'A one-turn puzzle was not solved in time. Short and kind.',
  'session.progress': 'Sent to 52in1\'s scoreboard beside the player\'s name; at most 24 characters.',
  'session.stat.foes_value': 'A stat\'s value on 52in1\'s results, such as "3 of 5".',
};

export const max: Record<string, number> = { 'session.progress': 24, 'session.go': 8, 'session.cleared': 14, 'session.failed': 16, 'session.time_up': 10, 'session.defeated': 14 };
