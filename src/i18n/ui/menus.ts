// Words shared by the full-screen menus (Formation and the town services): the unit panel, stat
// names, elements, number formats and the OK / Cancel buttons.
import type { Lines } from '../core';

export const lines: Lines = {
  'menus.ok': 'OK',
  'menus.cancel': 'Cancel',

  // number formats
  'menus.percent': '{value}%',
  'menus.bonus': '+{value}',
  'menus.stat_up': '{stat}+{amount}',
  'menus.stat_down': '{stat}-{amount}',
  'menus.out_of': '{value}/{max}',

  // stats
  'menus.stat.hp': 'HP',
  'menus.stat.mp': 'MP',
  'menus.stat.exp': 'EXP',
  'menus.stat.sp': 'Sp',
  'menus.stat.pa': 'PA',
  'menus.stat.ma': 'MA',
  'menus.stat.speed': 'Speed',
  'menus.stat.move': 'Move',
  'menus.stat.jump': 'Jump',
  'menus.stat.brave': 'Brave',
  'menus.stat.faith': 'Faith',
  'menus.stat.weapon_power': 'Weapon power',

  // the unit panel (Formation, Soldier Office)
  'menus.unit.summary': '{job} · Lv {level} · Job Lv {job_level} · JP {jp}',
  'menus.unit.move_jump': 'Move / Jump',
  'menus.unit.move_jump_value': '{move} / {jump}',
  'menus.unit.pa_ma': 'PA / MA',
  'menus.unit.pa_ma_value': '{pa} / {ma}',
  'menus.unit.brave_faith': 'Brave / Faith',
  'menus.unit.brave_faith_value': '{brave} / {faith}',
  'menus.unit.evade': 'Evade',
  'menus.unit.equipment': 'Equipment',
  'menus.unit.right_hand': 'Right hand',
  'menus.unit.left_hand': 'Left hand',
  'menus.unit.head': 'Head',
  'menus.unit.body': 'Body',
  'menus.unit.accessory': 'Accessory',
  'menus.unit.abilities': 'Abilities',

  // ability slots
  'menus.ability.primary': 'Primary',
  'menus.ability.secondary': 'Secondary',
  'menus.ability.reaction': 'Reaction',
  'menus.ability.support': 'Support',
  'menus.ability.movement': 'Movement',

  // elements
  'menus.element.fire': 'Fire',
  'menus.element.ice': 'Ice',
  'menus.element.lightning': 'Lightning',
  'menus.element.water': 'Water',
  'menus.element.earth': 'Earth',
  'menus.element.wind': 'Wind',
  'menus.element.holy': 'Holy',
  'menus.element.dark': 'Dark',
};

export const notes: Record<string, string> = {
  'menus.ok': 'Button: accept (the quantity in a shop, a new name).',
  'menus.cancel': 'Button: close the dialog without changing anything.',
  'menus.percent': 'A percentage, e.g. an evade chance. {value} is a number.',
  'menus.bonus': 'A bonus a piece of gear gives, e.g. +20 HP. {value} is a number.',
  'menus.stat_up': 'A stat going up, written tight: "HP+12". {stat} is a short stat name, {amount} a number.',
  'menus.stat_down': 'A stat going down, written tight: "Sp-1". {stat} is a short stat name, {amount} a number.',
  'menus.out_of': 'Progress shown as a fraction: experience 45/100.',
  'menus.stat.hp': 'Hit points. Also a very short label beside a bar (room for about 3 letters).',
  'menus.stat.mp': 'Magic points. Also a very short label beside a bar (room for about 3 letters).',
  'menus.stat.exp': 'Experience points. A very short label beside a bar (room for about 3 letters).',
  'menus.stat.sp': 'Short for Speed, in a tight list of stat changes ("Sp+1").',
  'menus.stat.pa': 'Physical Attack, abbreviated.',
  'menus.stat.ma': 'Magic Attack, abbreviated.',
  'menus.stat.speed': 'A unit\'s speed: how soon its turns come round.',
  'menus.stat.move': 'How many tiles a unit can walk in a turn.',
  'menus.stat.jump': 'How high a unit can climb or drop in one step.',
  'menus.stat.brave': 'A unit\'s courage, a stat from 0 to 100.',
  'menus.stat.faith': 'A unit\'s faith, a stat from 0 to 100: how strongly magic affects it.',
  'menus.unit.summary': 'Under a unit\'s name: {job} is the job name, {level} the unit\'s level, {job_level} its level in that job, {jp} its job points (JP) in that job.',
  'menus.unit.move_jump_value': 'The values for "Move / Jump"; keep them in the same order as that label.',
  'menus.unit.pa_ma_value': 'The values for "PA / MA"; keep them in the same order as that label.',
  'menus.unit.brave_faith_value': 'The values for "Brave / Faith"; keep them in the same order as that label.',
  'menus.unit.equipment': 'A heading over the gear a unit wears.',
  'menus.unit.abilities': 'A heading over the abilities a unit has set.',
  'menus.ability.primary': 'The command list of the unit\'s own job.',
  'menus.ability.secondary': 'A second command list, borrowed from another job.',
  'menus.ability.reaction': 'An ability that triggers by itself when the unit is hit.',
  'menus.ability.support': 'An ability that is always on.',
  'menus.ability.movement': 'An ability that changes how the unit moves.',
  'menus.element.fire': 'An element of magic and weapons.',
};

export const max: Record<string, number> = {
  'menus.ok': 10,
  'menus.cancel': 12,
  'menus.stat.hp': 3,
  'menus.stat.mp': 3,
  'menus.stat.exp': 3,
};
