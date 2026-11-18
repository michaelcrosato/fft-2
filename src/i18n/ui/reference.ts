// The Chronicle's field references: the Bestiary's monster pages and the Atlas's place pages,
// written from the game's own data (src/game/reference.ts). Each page is plain text in short
// paragraphs; a heading line (Arts, Poaching, Services…) starts some of them.
import type { Lines } from '../core';

export const lines: Lines = {
  'reference.none': 'None',

  // elements, in the Bestiary's lists of weaknesses and resistances
  'reference.element.fire': 'fire',
  'reference.element.ice': 'ice',
  'reference.element.lightning': 'lightning',
  'reference.element.water': 'water',
  'reference.element.earth': 'earth',
  'reference.element.wind': 'wind',
  'reference.element.holy': 'holy',
  'reference.element.dark': 'dark',

  // a monster's page in the Bestiary
  'reference.monster.stats': 'Move {move} · Jump {jump} · Class evasion {evasion}%',
  'reference.monster.innate': 'Innate abilities: {abilities}',
  'reference.monster.weak': 'Weak to: {elements}',
  'reference.monster.absorbs': 'Absorbs: {elements}',
  'reference.monster.halves': 'Halves: {elements}',
  'reference.monster.nullifies': 'Nullifies: {elements}',
  'reference.monster.permanent': 'Permanent statuses: {statuses}',
  'reference.monster.immune': 'Status immunity: {statuses}',
  'reference.monster.arts': 'Arts',
  'reference.monster.art_secret': '{ability} — secret art, Lv {level}',
  'reference.monster.art_level': '{ability} — Lv {level}',
  'reference.monster.secret_rule': 'Allied secret arts require the listed level and a living ally with {beast_lore} within three tiles. Enemy monsters can use them at the listed level without that ally.',
  'reference.monster.poaching': 'Poaching',
  'reference.monster.poach_common': 'Common: {item}',
  'reference.monster.poach_rare': 'Rare: {item}',
  'reference.monster.poach_rule': 'A killing blow from a unit with {poach} sends eligible spoils to the {fur_shop}. Poaching removes the monster.',
  'reference.monster.recruitment': 'Recruitment',
  'reference.monster.no_recruit': 'This species refuses recruitment.',
  'reference.monster.recruit_rule': 'Unnamed foes can be Invited through {speechcraft} with {beast_speech}, or Tamed at critical HP. Bosses, protected units and named characters refuse.',
  'reference.monster.habitats': 'Habitats on known roads — Chapter {chapter}',
  'reference.monster.no_habitats': 'No current random encounters recorded on the roads you have unlocked.',
  'reference.monster.habitats_note': 'These are possible encounters, not guaranteed spawns; story battles have their own formations.',

  // kinds of place, in the Atlas
  'reference.kind.town': 'town',
  'reference.kind.castle': 'castle',
  'reference.kind.field': 'field',
  'reference.kind.special': 'special',
  'reference.kind.dungeon': 'dungeon',

  // a place's page in the Atlas
  'reference.place.heading': '{region} · {kind}',
  'reference.place.services': 'Services',
  'reference.place.no_services': 'No town services.',
  'reference.place.roads': 'Connected roads',
  'reference.place.no_roads': 'No connected roads unlocked yet.',
  'reference.place.encounters': 'Wild encounters — Chapter {chapter}',
  'reference.place.encounters_note': 'These are possible opponents while travelling, not a fixed battle formation.',
  'reference.place.no_encounters': 'No random encounter table here for this chapter. Story or optional battles may still take place.',
};

const ELEMENT_NOTE = 'An element (of magic and attacks), in a lowercase list after a label such as "Weak to:" in the Bestiary.';
const KIND_NOTE = 'A kind of place, after its region at the top of its page in the Atlas, the Chronicle\'s list of places.';

export const notes: Record<string, string> = {
  'reference.none': 'In the Bestiary, after a label such as "Weak to:" or "Rare:" when the list is empty.',
  'reference.element.fire': ELEMENT_NOTE, 'reference.element.ice': ELEMENT_NOTE, 'reference.element.lightning': ELEMENT_NOTE,
  'reference.element.water': ELEMENT_NOTE, 'reference.element.earth': ELEMENT_NOTE, 'reference.element.wind': ELEMENT_NOTE,
  'reference.element.holy': ELEMENT_NOTE, 'reference.element.dark': ELEMENT_NOTE,
  'reference.monster.stats': 'A monster\'s numbers in the Bestiary: how far it moves, how high it jumps and its class evasion, a percentage.',
  'reference.monster.innate': '{abilities} is a list of the monster\'s passive abilities, or "None".',
  'reference.monster.weak': '{elements} is a list of reference.element lines, or "None".',
  'reference.monster.absorbs': 'Elements whose attacks heal the monster. {elements} is a list, or "None".',
  'reference.monster.halves': 'Elements whose attacks do half damage. {elements} is a list, or "None".',
  'reference.monster.nullifies': 'Elements whose attacks do no damage. {elements} is a list, or "None".',
  'reference.monster.permanent': 'Statuses the monster always has. {statuses} is a list of status names, or "None".',
  'reference.monster.immune': 'Statuses that never affect the monster. {statuses} is a list of status names, or "None".',
  'reference.monster.arts': 'A heading in the Bestiary: the monster\'s special attacks follow, one per paragraph.',
  'reference.monster.art_secret': '{ability} is the name of a monster\'s special attack; {level} the level the monster needs to use it.',
  'reference.monster.art_level': '{ability} is the name of a monster\'s special attack; {level} the level the monster needs to use it.',
  'reference.monster.secret_rule': '{beast_lore} is the name of a support ability.',
  'reference.monster.poaching': 'A heading in the Bestiary. Poaching: a unit with the Poach ability skins the monster it defeats for spoils.',
  'reference.monster.poach_common': 'The usual spoil from poaching this monster; {item} is an item\'s name, or "None".',
  'reference.monster.poach_rare': 'The rare spoil from poaching this monster; {item} is an item\'s name, or "None".',
  'reference.monster.poach_rule': '{poach} is the name of the Poach ability; {fur_shop} the name of the shop that sells the spoils.',
  'reference.monster.recruitment': 'A heading in the Bestiary: whether the monster can join the company.',
  'reference.monster.recruit_rule': '"Invited" and "Tamed" refer to the abilities Invite and Tame. {speechcraft} is the name of a command list; {beast_speech} the name of a support ability.',
  'reference.monster.habitats': 'A heading in the Bestiary: the places the monster may be met. {chapter} is the story\'s current chapter number.',
  'reference.monster.habitats_note': 'After the list of places a monster may be met.',
  'reference.kind.town': KIND_NOTE, 'reference.kind.castle': KIND_NOTE, 'reference.kind.field': KIND_NOTE,
  'reference.kind.special': KIND_NOTE, 'reference.kind.dungeon': KIND_NOTE,
  'reference.place.heading': 'The first line of a place\'s page in the Atlas. {region} is the region of the kingdom; {kind} one of the reference.kind lines.',
  'reference.place.services': 'A heading in the Atlas: the shops and offices of a place follow.',
  'reference.place.roads': 'A heading in the Atlas: the places a road leads to follow, one per line.',
  'reference.place.encounters': 'A heading in the Atlas: the monsters and foes that may attack travellers here. {chapter} is the story\'s current chapter number.',
  'reference.place.encounters_note': 'After the list of foes that may attack travellers at a place.',
};
