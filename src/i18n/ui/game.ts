// Battles from the outside: deployment, the briefing's victory condition, the victory banner, the
// spoils of battle, the game-over menu and the notices scenes raise (src/game/game.ts).
import type { Lines } from '../core';

export const lines: Lines = {
  // loading messages
  'game.loading.view': 'Preparing the view…',
  'game.loading.next_scene': 'Preparing the next scene…',
  'game.loading.scene': 'Preparing the scene…',
  'game.loading.battlefield': 'Preparing the battlefield…',
  'game.loading.company': 'Preparing your company…',

  // notices
  'game.toast.joins': '{name} joins the party!',
  'game.toast.obtained': 'Obtained {item}',
  'game.toast.obtained_many': 'Obtained {item} ×{count}',
  'game.toast.gil': { one: 'Received {count} gil', other: 'Received {count} gil' },
  'game.toast.autosave_failed': 'Autosave failed: this browser is not keeping saved games.',

  // deployment
  'game.deploy.title': 'Deploy {placed}/{max}',
  'game.deploy.job_level': '{job} Lv{level}',
  'game.deploy.begin': 'Begin Battle',
  'game.deploy.hero_must_lead': '{name} must lead the battle.',
  'game.deploy.hero_fixed': '{name} starts this battle where the story places them.',
  'game.deploy.full': { one: 'Only {count} may deploy.', other: 'Only {count} may deploy.' },
  'game.deploy.reposition': 'Reposition',
  'game.deploy.withdraw': 'Withdraw',
  'game.deploy.must_fight': 'Must fight in this battle',

  // the briefing's victory condition
  'game.victory.defeat_all': 'Victory: defeat all enemies',
  'game.victory.defeat': 'Victory: defeat {names}',
  'game.victory.defeat_any': 'Victory: defeat {names}',
  'game.victory.survive': { one: 'Victory: survive {count} turn', other: 'Victory: survive {count} turns' },
  'game.victory.reach': 'Victory: reach the objective',

  // after the battle
  'game.victory_banner': 'Victory!',
  'game.results.title': 'Spoils of Battle',
  'game.results.level_up': '{name} — Lv {level} ▲',
  'game.results.exp_jp': 'EXP +{exp} · JP +{jp}',
  'game.results.gil': 'Gil',
  'game.results.gil_gained': '+{gil}',
  'game.results.items': 'Items',
  'game.results.crystals': 'Crystals: {list}',
  'game.results.crystal_entry': '{name}: {ability}',
  'game.results.joined': 'Joined: {names}',
  'game.results.poached': 'Poached: {items}',
  'game.results.lost': { one: '{count} soul was lost to the crystals.', other: '{count} souls were lost to the crystals.' },
  'game.results.defected': { one: '{count} soldier left the company for the enemy.', other: '{count} soldiers left the company for the enemy.' },
  'game.results.hatched': { one: 'An egg hatched: a young {monsters} joins the company!', other: 'Eggs hatched: young {monsters} join the company!' },

  // game over
  'game.over.title': 'Your Tale Ends Here',
  'game.over.subtitle': 'The chronicle falls silent…',
  'game.over.menu_title': 'Game Over',
  'game.over.retry': 'Retry the battle',
  'game.over.return_title': 'Return to title',
};

export const notes: Record<string, string> = {
  'game.loading.company': 'While the party\'s soldiers are placed on the battlefield.',
  'game.toast.joins': 'A notice in a story scene. {name} is the character who joins.',
  'game.toast.obtained': 'A notice in a story scene. {item} is an item\'s name.',
  'game.toast.obtained_many': 'A notice in a story scene. {item} is an item\'s name; {count} how many were obtained (2 or more).',
  'game.toast.gil': 'A notice in a story scene. Gil is the game\'s money; {count} the amount.',
  'game.toast.autosave_failed': 'Shown once, when the browser refuses to store the game (private browsing, storage full).',
  'game.deploy.title': 'Heading of the list of soldiers before a battle. {placed} is how many are on the field; {max} the most allowed.',
  'game.deploy.job_level': 'Beside a soldier\'s name in the deployment list: {job} is their job (character class); {level} their level.',
  'game.deploy.begin': 'Ends deployment and starts the battle.',
  'game.deploy.hero_must_lead': '{name} is the hero, as the player named them. The hero has to be on the field.',
  'game.deploy.hero_fixed': 'Why the hero cannot be moved before this battle: the story sets their starting tile. {name} is the hero, as the player named them.',
  'game.deploy.full': '{count} is the most soldiers this battle allows on the field.',
  'game.deploy.reposition': 'Move a placed soldier to another starting tile.',
  'game.deploy.withdraw': 'Take a placed soldier off the field.',
  'game.deploy.must_fight': 'Why a soldier cannot be withdrawn: the story needs them in this battle.',
  'game.victory.defeat_all': 'The battle\'s goal, shown under its name before it starts.',
  'game.victory.defeat': 'The battle\'s goal. {names} is a list of the foes to defeat (all of them).',
  'game.victory.defeat_any': 'The battle\'s goal. {names} lists foes joined by "or": defeating any one of them wins.',
  'game.victory.survive': 'The battle\'s goal. {count} is a number of turns.',
  'game.victory.reach': 'The battle\'s goal: get a unit to the marked tile.',
  'game.victory_banner': 'A large banner when a battle is won.',
  'game.results.title': 'The heading of the results screen after a battle.',
  'game.results.level_up': 'A soldier on the results screen. {name} is their name; {level} their new level; the triangle marks a level gained.',
  'game.results.exp_jp': 'What a soldier earned in the battle: EXP (experience) and JP (job points), both numbers.',
  'game.results.gil': 'Gil is the game\'s money: the label for how much the battle earned.',
  'game.results.gil_gained': 'The money a battle earned, after the Gil label.',
  'game.results.items': 'The label for the items the battle earned.',
  'game.results.crystals': 'Abilities soldiers learned from the crystals of fallen units. {list} is a list of game.results.crystal_entry lines.',
  'game.results.crystal_entry': '{name} is a soldier; {ability} the ability they learned.',
  'game.results.joined': '{names} is a list of soldiers who joined the company after being invited in battle.',
  'game.results.poached': '{items} is a list of monster spoils sent to the Fur Shop.',
  'game.results.lost': 'Fallen soldiers who were not revived in time turned to crystal and are gone for good.',
  'game.results.defected': 'Soldiers who were won over by the enemy during the battle.',
  'game.results.hatched': '{monsters} is a list of monster kinds (one per egg) that hatched from the company\'s monsters\' eggs.',
  'game.over.title': 'A title card when the party is defeated.',
  'game.over.subtitle': 'Under "Your Tale Ends Here".',
  'game.over.retry': 'Fight the lost battle again from its start.',
};

export const max: Record<string, number> = {
  'game.victory_banner': 16,
  'game.deploy.begin': 20,
  'game.deploy.reposition': 16,
  'game.deploy.withdraw': 16,
  'game.over.retry': 24,
  'game.over.return_title': 24,
};
