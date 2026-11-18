// Chronicle reference pages use the same definitions as battles and travel.
// Keep changing stats, encounter tables and item names out of handwritten lore.

import { STATUS } from '../battle/status';
import { ABILITIES, EDGES, ITEMS, JOBS, NODES } from '../data/db';
import type { Element, JobDef, WorldNode } from '../data/types';
import { compare, fmtList, t } from '../i18n';
import type { GameState } from './state';

type Progress = Pick<GameState, 'chapter' | 'unlocked'>;
const words = (values: readonly string[] | undefined) =>
  values?.length ? fmtList([...values]) : t('reference.none');
const namedAbility = (id: string) => ABILITIES.get(id)?.name ?? id;
const elements = (ids: readonly Element[] | undefined) =>
  words(ids?.map((id) => t(`reference.element.${id}`)));

/** Ordinary families only: unique allies and story bosses belong in Persons. */
export function bestiaryEntries(): JobDef[] {
  return [...JOBS.values()]
    .filter((j) => j.monster && j.family && j.poach)
    .sort((a, b) => compare(a.name, b.name));
}

export function atlasEntries(progress: Progress): WorldNode[] {
  return [...NODES.values()]
    .filter((n) => progress.unlocked.includes(n.id))
    .sort(
      (a, b) =>
        compare(a.region, b.region) || compare(a.name, b.name),
    );
}

function currentPools(node: WorldNode, chapter: number) {
  const pools = node.random?.pools ?? [];
  // Travel picks the last eligible table, falling back to the first table.
  const pool =
    pools
      .filter(
        (p) =>
          chapter >= p.chapterMin &&
          (p.chapterMax === undefined || chapter <= p.chapterMax),
      )
      .at(-1) ?? pools[0];
  return pool ? [pool] : [];
}

export function monsterReference(monster: JobDef, progress: Progress): string {
  const skills = monster.monsterSkills ?? [];
  const arts = skills.map(([id, level], index) => {
    const ability = ABILITIES.get(id);
    const name = ability?.name ?? id;
    const secret = index === skills.length - 1 && level > 1;
    const title = secret
      ? t('reference.monster.art_secret', { ability: name, level })
      : level > 1
        ? t('reference.monster.art_level', { ability: name, level })
        : name;
    return `${title}\n${ability?.desc ?? ''}`;
  });
  const habitats = atlasEntries(progress)
    .filter((n) =>
      currentPools(n, progress.chapter).some((p) =>
        p.units.some((u) => u.job === monster.id),
      ),
    )
    .map((n) => n.name);
  const passives = [
    monster.mReaction,
    monster.mSupport,
    monster.mMovement,
    ...(monster.innate ?? []),
  ]
    .filter((id): id is string => !!id)
    .map(namedAbility);
  const statuses = (ids: JobDef['immune']) =>
    words(ids?.map((id) => STATUS[id].name));
  const loot = monster.poach?.map((id) => ITEMS.get(id)?.name ?? id);
  return [
    monster.desc,
    `${monster.skillset.name}\n${monster.skillset.desc}`,
    [
      t('reference.monster.stats', { move: monster.move, jump: monster.jump, evasion: monster.cev }),
      t('reference.monster.innate', { abilities: words(passives) }),
    ].join('\n'),
    [
      t('reference.monster.weak', { elements: elements(monster.weak) }),
      t('reference.monster.absorbs', { elements: elements(monster.absorb) }),
      t('reference.monster.halves', { elements: elements(monster.halve) }),
      t('reference.monster.nullifies', { elements: elements(monster.nullify) }),
      t('reference.monster.permanent', { statuses: statuses(monster.always) }),
      t('reference.monster.immune', { statuses: statuses(monster.immune) }),
    ].join('\n'),
    `${t('reference.monster.arts')}\n${arts.join('\n\n')}`,
    t('reference.monster.secret_rule', { beast_lore: namedAbility('monsterSkill') }),
    [
      t('reference.monster.poaching'),
      t('reference.monster.poach_common', { item: loot?.[0] ?? t('reference.none') }),
      t('reference.monster.poach_rare', { item: loot?.[1] ?? t('reference.none') }),
      t('reference.monster.poach_rule', { poach: namedAbility('poach'), fur_shop: t('flow.place.fur_shop') }),
    ].join('\n'),
    `${t('reference.monster.recruitment')}\n${monster.noInvite
      ? t('reference.monster.no_recruit')
      : t('reference.monster.recruit_rule', { speechcraft: JOBS.get('orator')?.skillset.name ?? 'orator', beast_speech: namedAbility('monsterTalk') })}`,
    [
      t('reference.monster.habitats', { chapter: progress.chapter }),
      habitats.length ? fmtList(habitats) : t('reference.monster.no_habitats'),
      t('reference.monster.habitats_note'),
    ].join('\n'),
  ].join('\n\n');
}

export function locationReference(node: WorldNode, progress: Progress): string {
  // the same names as the place's own menu (flow.ts)
  const services = [
    node.shop && t('flow.place.outfitter'),
    node.tavern && t('flow.place.tavern'),
    node.guild && t('flow.place.soldier_office'),
    node.furShop && t('flow.place.fur_shop'),
  ].filter(Boolean);
  const roads = EDGES.flatMap((e) =>
    e.a === node.id ? [e.b] : e.b === node.id ? [e.a] : [],
  )
    .filter((id) => progress.unlocked.includes(id))
    .map((id) => NODES.get(id)?.name ?? id);
  const encounters = [
    ...new Set(
      currentPools(node, progress.chapter).flatMap((p) =>
        p.units.map((u) => JOBS.get(u.job)?.name ?? u.job),
      ),
    ),
  ];
  return [
    `${t('reference.place.heading', { region: node.region, kind: t(`reference.kind.${node.kind}`) })}\n\n${node.desc}`,
    `${t('reference.place.services')}\n${services.length ? services.join(' · ') : t('reference.place.no_services')}`,
    `${t('reference.place.roads')}\n${roads.length ? roads.join('\n') : t('reference.place.no_roads')}`,
    `${t('reference.place.encounters', { chapter: progress.chapter })}\n${encounters.length ? `${fmtList(encounters)}\n${t('reference.place.encounters_note')}` : t('reference.place.no_encounters')}`,
  ].join('\n\n');
}
