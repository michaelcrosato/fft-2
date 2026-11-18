// Content checks for one battle that need its map: deployment and the units its scripts name.
// tools/validate.ts runs them over every battle; tests/ run them on hand-made battles.
import { CHARACTERS } from '../src/data/db';
import type { MapGrid } from '../src/battle/grid';
import type { BattleDef, SceneCmd } from '../src/data/types';

/** Every command of a script, the branches of `if` and `choice` included. */
function* walk(cmds: SceneCmd[]): Generator<SceneCmd> {
  for (const c of cmds) {
    yield c;
    if (c[0] === 'if') { yield* walk(c[2]); if (c[3]) yield* walk(c[3]); }
    if (c[0] === 'choice') for (const [, sub] of c[2]) yield* walk(sub);
  }
}

/** Problems with a battle's deploy cells, its fixed hero cell and its `defect` commands, one line each. */
export function battleProblems(b: BattleDef, g: MapGrid): string[] {
  const out: string[] = [];
  const cells = b.deploy ?? g.def.deploy;
  const spawned = new Set(b.units.map((u) => u.at.join(',')));
  for (const [x, z] of cells) if (spawned.has(`${x},${z}`)) out.push(`battle ${b.id}: deploy cell ${x},${z} occupied by a spawn`);
  const at = b.heroAt;
  if (at && !(cells.some(([x, z]) => x === at[0] && z === at[1]) && g.cell(at[0], at[1])?.standable)) {
    out.push(`battle ${b.id}: hero cell ${at.join(',')} is not one of its standable deploy cells`);
  }
  const known = (id: string) => b.units.some((u) => (u.id ?? u.char) === id) || CHARACTERS.has(id);
  for (const e of b.events ?? []) {
    for (const c of walk(e.script)) {
      if (c[0] !== 'defect') continue;
      if (!known(c[1])) out.push(`battle ${b.id}: defect of unknown unit ${c[1]}`);
      if (![0, 1, 2].includes(c[2])) out.push(`battle ${b.id}: defect ${c[1]} to unknown team ${c[2]}`);
    }
  }
  return out;
}
