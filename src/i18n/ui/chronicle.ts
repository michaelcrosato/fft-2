// The Chronicle's screen (src/ui/menus/chronicle.ts): its sections, headings and records.
// Its entries (events, persons, artefacts…) are content lines from src/data. Content uses
// chronicle.<entry>.title and chronicle.<entry>.text, so no line here ends in .title or .text.
import type { Lines } from '../core';

export const lines: Lines = {
  'chronicle.screen_heading': 'The Chronicle',
  'chronicle.menu_heading': 'Chronicle',
  'chronicle.scroll_hint': 'Scroll text: {key:left}/{key:right} · Page Up/Down · wheel · swipe',
  'chronicle.scroll_hint_pad': 'Scroll text: {key:arrows} ←/→',
  'chronicle.section.events': 'Events',
  'chronicle.section.persons': 'Persons',
  'chronicle.section.bestiary': 'Bestiary',
  'chronicle.section.atlas': 'Atlas of Ivaldis',
  'chronicle.section.artefacts': 'Artefacts & Wonders',
  'chronicle.section.stones': 'Zodiac Stones',
  'chronicle.section.errands': 'Errands',
  'chronicle.section.records': 'Records',
  'chronicle.stones_held': '{held}/{total}',
  'chronicle.artefacts_heading': 'Artefacts',
  'chronicle.empty.events': 'Nothing recorded yet',
  'chronicle.empty.atlas': 'No places recorded yet',
  'chronicle.empty.artefacts': 'None found — send parties on errands',
  'chronicle.empty.errands': 'No errands completed',
  'chronicle.person_heading': '{name} — {role}',
  'chronicle.stone_unknown': '— unknown —',
  'chronicle.stone_heading': '{glyph} The Stone of {sign}',
  'chronicle.stone_found': 'Found: {where}.',
  'chronicle.records.play_time': 'Play time: {hours}h {minutes}m',
  'chronicle.records.days': { one: 'Days travelled: {count}', other: 'Days travelled: {count}' },
  'chronicle.records.battles': { one: 'Battles won: {count}', other: 'Battles won: {count}' },
  'chronicle.records.company': { one: 'Company size: {count}', other: 'Company size: {count}' },
  'chronicle.records.errands': { one: 'Errands completed: {count}', other: 'Errands completed: {count}' },
  'chronicle.records.artefacts': { one: 'Artefacts found: {count}', other: 'Artefacts found: {count}' },
  'chronicle.records.rumours': { one: 'Rumours heard: {count}', other: 'Rumours heard: {count}' },
};

const RECORD = 'One of the company\'s records: a label and a number. The plural forms let the label agree with the number where your language needs it.';

export const notes: Record<string, string> = {
  'chronicle.screen_heading': 'The title of the Chronicle screen: the in-game history book of the company\'s deeds and discoveries.',
  'chronicle.menu_heading': 'The heading of the list of the Chronicle\'s sections.',
  'chronicle.scroll_hint': 'How to scroll an entry\'s text: the keys, the mouse wheel or a swipe. Page Up/Down are keyboard keys: write them as keyboards in your language label them.',
  'chronicle.scroll_hint_pad': 'How to scroll an entry\'s text with a gamepad: {key:arrows} is the D-pad, pressed left or right.',
  'chronicle.section.persons': 'The people the company has met, with their biographies.',
  'chronicle.section.bestiary': 'The monsters of Ivaldis, with notes on each.',
  'chronicle.section.atlas': 'The places the company knows, with notes on each. Ivaldis is the kingdom.',
  'chronicle.section.artefacts': 'Rare objects the company has found on errands.',
  'chronicle.section.errands': 'Tavern errands: small jobs the company sends soldiers on.',
  'chronicle.section.records': 'The company\'s statistics: play time, battles won and so on.',
  'chronicle.stones_held': 'Beside Zodiac Stones: how many of the stones the company holds, out of all of them.',
  'chronicle.empty.artefacts': 'Shown when no artefacts have been found: errands are how the company finds them.',
  'chronicle.person_heading': 'A person\'s name and their title or role (for example "Princess of Ivaldis").',
  'chronicle.stone_unknown': 'In place of the name of a Zodiac Stone the company has not found yet.',
  'chronicle.stone_heading': '{glyph} is the sign\'s symbol (♈); {sign} is the zodiac sign\'s name (Aries).',
  'chronicle.stone_found': '{where} is where the company won the stone, for example "The rooftops of Riverain".',
  'chronicle.records.play_time': 'The time played, in hours (h) and minutes (m).',
  'chronicle.records.days': RECORD,
  'chronicle.records.battles': RECORD,
  'chronicle.records.company': `${RECORD} The company size is the number of soldiers in it.`,
  'chronicle.records.errands': RECORD,
  'chronicle.records.artefacts': RECORD,
  'chronicle.records.rumours': `${RECORD} Rumours are heard in taverns.`,
};
