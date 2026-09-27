// Chronicle reference pages use the same definitions as battles and travel.
// Keep changing stats, encounter tables and item names out of handwritten lore.

import { STATUS } from '../battle/status';
import { ABILITIES, EDGES, ITEMS, JOBS, NODES } from '../data/db';
import type { JobDef, WorldNode } from '../data/types';
import type { GameState } from './state';

type Progress = Pick<GameState, 'chapter' | 'unlocked'>;
const words = (values: readonly string[] | undefined) =>
  values?.length ? values.join(', ') : 'None';
const namedAbility = (id: string) => ABILITIES.get(id)?.name ?? id;

/** Ordinary families only: unique allies and story bosses belong in Persons. */
export function bestiaryEntries(): JobDef[] {
  return [...JOBS.values()]
    .filter((j) => j.monster && j.family && j.poach)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function atlasEntries(progress: Progress): WorldNode[] {
  return [...NODES.values()]
    .filter((n) => progress.unlocked.includes(n.id))
    .sort(
      (a, b) =>
        a.region.localeCompare(b.region) || a.name.localeCompare(b.name),
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
    const secret = index === skills.length - 1 && level > 1;
    return `${ability?.name ?? id}${secret ? ` — secret art, Lv ${level}` : level > 1 ? ` — Lv ${level}` : ''}\n${ability?.desc ?? ''}`;
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
    `Move ${monster.move} · Jump ${monster.jump} · Class evasion ${monster.cev}%\nInnate abilities: ${words(passives)}`,
    `Weak to: ${words(monster.weak)}\nAbsorbs: ${words(monster.absorb)}\nHalves: ${words(monster.halve)}\nNullifies: ${words(monster.nullify)}\nPermanent statuses: ${statuses(monster.always)}\nStatus immunity: ${statuses(monster.immune)}`,
    `Arts\n${arts.join('\n\n')}`,
    'Allied secret arts require the listed level and a living ally with Beast Lore within three tiles. Enemy monsters can use them at the listed level without that ally.',
    `Poaching\nCommon: ${loot?.[0] ?? 'None'}\nRare: ${loot?.[1] ?? 'None'}\nA killing blow from a unit with Poach sends eligible spoils to the Fur Shop. Poaching removes the monster.`,
    `Recruitment\n${monster.noInvite ? 'This species refuses recruitment.' : 'Unnamed foes can be Invited through Speechcraft with Beast Speech, or Tamed at critical HP. Bosses, protected units and named characters refuse.'}`,
    `Habitats on known roads — Chapter ${progress.chapter}\n${habitats.length ? habitats.join(', ') : 'No current random encounters recorded on the roads you have unlocked.'}\nThese are possible encounters, not guaranteed spawns; story battles have their own formations.`,
  ].join('\n\n');
}

export function locationReference(node: WorldNode, progress: Progress): string {
  const services = [
    node.shop && 'Outfitter',
    node.tavern && 'Tavern',
    node.guild && 'Soldier Office',
    node.furShop && 'Fur Shop',
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
    `${node.region} · ${node.kind}\n\n${node.desc}`,
    `Services\n${services.length ? services.join(' · ') : 'No town services.'}`,
    `Connected roads\n${roads.length ? roads.join('\n') : 'No connected roads unlocked yet.'}`,
    `Wild encounters — Chapter ${progress.chapter}\n${encounters.length ? `${encounters.join(', ')}\nThese are possible opponents while travelling, not a fixed battle formation.` : 'No random encounter table here for this chapter. Story or optional battles may still take place.'}`,
  ].join('\n\n');
}
