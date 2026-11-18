// Formation: the party list, a unit's menu, job change, learning and setting abilities, equipment
// and renaming a unit.
import type { Lines } from '../core';

export const lines: Lines = {
  'formation.title': 'Formation',
  'formation.party': 'Party {size}',
  'formation.roster.job_level': '{job} Lv{level}',
  'formation.roster.job_level_away': '{job} Lv{level} (away)',

  // a unit's menu
  'formation.unit.change_job': 'Change Job',
  'formation.unit.learn': 'Learn Abilities',
  'formation.unit.set': 'Set Abilities',
  'formation.unit.equipment': 'Equipment',
  'formation.unit.optimize': 'Optimize Gear',
  'formation.unit.rename': 'Rename',
  'formation.unit.dismiss': 'Dismiss',
  'formation.unit.monster_no_job': 'Monsters cannot change job',
  'formation.unit.monster_no_learn': 'Monsters learn by growing',
  'formation.unit.cannot_dismiss': 'Cannot dismiss',
  'formation.optimized': 'Equipment optimized',

  // renaming a unit
  'formation.rename.label': 'New name',

  // dismissing a unit
  'formation.dismiss.ask': 'Dismiss {name}? They will leave the company forever.',
  'formation.dismiss.keep': 'Keep',

  // jobs
  'formation.job.title': 'Jobs',
  'formation.job.requirement': '{job} {level}',
  'formation.job.requires': 'Requires {jobs}',
  'formation.job.men_only': 'Men only',
  'formation.job.women_only': 'Women only',
  'formation.job.level_jp': 'Lv{level} {jp}JP',
  'formation.job.no_change': 'No change',
  'formation.job.changed': '{name}\'s job is now {job}.',

  // learning abilities
  'formation.learn.title': 'Learn from…',
  'formation.learn.jp': '{jp} JP',
  'formation.learn.skillset': '{skillset} — {jp} JP',
  'formation.learn.reaction': 'R · {ability}',
  'formation.learn.support': 'S · {ability}',
  'formation.learn.movement': 'M · {ability}',
  'formation.learn.learned': 'Learned',
  'formation.learn.already': 'Already learned',
  'formation.learn.not_enough_jp': 'Not enough JP',
  'formation.learn.learned_toast': 'Learned {ability}',

  // setting abilities
  'formation.none': '— None —',
  'formation.secondary.skills': { one: '{count} skill', other: '{count} skills' },

  // equipment
  'formation.slot.rhand': 'Right Hand',
  'formation.slot.lhand': 'Left Hand',
  'formation.slot.head': 'Head',
  'formation.slot.body': 'Body',
  'formation.slot.accessory': 'Accessory',
  'formation.equip.remove': '— Remove —',
  'formation.equip.owned': '×{amount}',
  'formation.equip.desc': '{stats} — {desc}',
  'formation.item.wp': 'WP {value}',
  'formation.item.evade': 'Ev {value}%',
  'formation.item.phys_evade': 'PhysEv {value}%',
  'formation.item.mag_evade': 'MagEv {value}%',
};

export const notes: Record<string, string> = {
  'formation.title': 'Screen title: arranging the company\'s soldiers, their jobs, abilities and gear.',
  'formation.party': 'Title of the list of soldiers. {size} is how many soldiers the company has.',
  'formation.roster.job_level': 'Beside a soldier\'s name: {job} is the job name, {level} the soldier\'s level (Lv).',
  'formation.roster.job_level_away': 'As above, for a soldier who is away on an errand.',
  'formation.unit.set': 'Menu choice, and the title of the menu that picks a unit\'s secondary, reaction, support and movement abilities.',
  'formation.unit.equipment': 'Menu choice, and the title of the menu that changes a unit\'s gear.',
  'formation.unit.optimize': 'Menu choice: put the best gear the company owns on the unit.',
  'formation.unit.rename': 'Menu choice, and the title of the dialog that renames a unit.',
  'formation.unit.dismiss': 'Menu choice, and the button that confirms it: the soldier leaves the company.',
  'formation.unit.monster_no_job': 'Why a monster can\'t use "Change Job".',
  'formation.unit.monster_no_learn': 'Why a monster can\'t use "Learn Abilities": monsters gain abilities as they level up.',
  'formation.unit.cannot_dismiss': 'Why a story character can\'t be dismissed.',
  'formation.rename.label': 'Label of the text field where the player types a unit\'s new name.',
  'formation.dismiss.ask': 'Question. {name} is the soldier\'s name. "They" refers to that one soldier.',
  'formation.dismiss.keep': 'Button: keep the soldier (don\'t dismiss them).',
  'formation.job.requirement': 'One requirement for a job: {job} is another job\'s name, {level} the level needed in it.',
  'formation.job.requires': 'Why a job is locked. {jobs} is a list of requirements like "Squire 2 and Chemist 3".',
  'formation.job.men_only': 'Why a job is locked: only men can take it.',
  'formation.job.women_only': 'Why a job is locked: only women can take it.',
  'formation.job.level_jp': 'Beside a job: the unit\'s level in it (Lv) and its job points (JP) in it.',
  'formation.job.no_change': 'Changing to this job would change none of the unit\'s stats.',
  'formation.job.changed': '{name} is the unit\'s name, {job} the new job\'s name.',
  'formation.learn.title': 'Title of the list of jobs whose abilities a unit can learn.',
  'formation.learn.jp': 'Job points (JP): what learning abilities costs. {jp} is a number.',
  'formation.learn.skillset': 'Title: {skillset} is a job\'s command list, {jp} the job points the unit has in that job.',
  'formation.learn.reaction': 'An ability in the list to learn; R marks a reaction ability.',
  'formation.learn.support': 'An ability in the list to learn; S marks a support ability.',
  'formation.learn.movement': 'An ability in the list to learn; M marks a movement ability.',
  'formation.learn.learned': 'Beside an ability the unit already knows.',
  'formation.learn.learned_toast': 'Notice: the unit learned the ability {ability}.',
  'formation.none': 'Choice: no ability in this slot.',
  'formation.secondary.skills': 'Beside a command list: how many of its skills the unit knows.',
  'formation.slot.rhand': 'An equipment slot, in a menu.',
  'formation.equip.remove': 'Choice: take off what is in this slot.',
  'formation.equip.owned': 'Beside an item: how many the company has.',
  'formation.equip.desc': '{stats} is a short list of the item\'s numbers, {desc} its description.',
  'formation.item.wp': 'Weapon power (WP), in a tight list.',
  'formation.item.evade': 'Evasion (Ev), in a tight list.',
  'formation.item.phys_evade': 'Physical evasion, in a tight list.',
  'formation.item.mag_evade': 'Magic evasion, in a tight list.',
};

export const max: Record<string, number> = {
  'formation.unit.change_job': 18,
  'formation.unit.learn': 18,
  'formation.unit.set': 18,
  'formation.unit.equipment': 18,
  'formation.unit.optimize': 18,
  'formation.unit.rename': 18,
  'formation.unit.dismiss': 18,
  'formation.dismiss.keep': 12,
};
