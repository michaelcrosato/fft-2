import { maps } from '../src/data/maps/ch1';
import { battles } from '../src/data/battles/ch1';
import { scenes } from '../src/data/scenes/ch1';
import { MapGrid } from '../src/battle/grid';
import type { SceneCmd } from '../src/data/types';
const grids = new Map(maps.map((m) => [m.id, new MapGrid(m)]));
const out: string[] = [];
function reach(g: MapGrid, starts: Array<[number, number]>, jump: number) {
  const seen = new Set<number>();
  const q: Array<[number, number]> = [];
  for (const s of starts) { seen.add(g.idx(s[0], s[1])); q.push(s); }
  while (q.length) {
    const [x, z] = q.shift()!;
    const c = g.cell(x, z)!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = g.cell(x + dx, z + dz);
      if (!n || !n.standable || Math.abs(n.h - c.h) > jump) continue;
      const i = g.idx(n.x, n.z); if (!seen.has(i)) { seen.add(i); q.push([n.x, n.z]); }
    }
  }
  return seen;
}
for (const m of maps) {
  const g = grids.get(m.id)!;
  const r = reach(g, m.deploy, 3);
  let stand = 0, unreach = 0; const bad: string[] = [];
  for (const c of g.cells) if (c.standable) { stand++; if (!r.has(g.idx(c.x, c.z))) { unreach++; bad.push(`${c.x},${c.z}`); } }
  out.push(`${m.id} ${g.w}x${g.d} maxH ${g.maxHeight()} standable ${stand} unreachable(j3) ${unreach}${unreach ? ' [' + bad.slice(0, 20).join(' ') + ']' : ''}`);
}
for (const b of battles) {
  const g = grids.get(b.map)!;
  const deploy = b.deploy ?? g.def.deploy;
  for (const j of [3, 4]) {
    const r = reach(g, deploy, j);
    const miss = b.units.filter((u) => !r.has(g.idx(u.at[0], u.at[1]))).map((u) => u.id ?? u.char);
    const tmiss = (b.treasure ?? []).filter((t) => !r.has(g.idx(t[0], t[1]))).map((t) => `${t[0]},${t[1]}`);
    if (miss.length || tmiss.length) out.push(`battle ${b.id} jump${j}: unreachable units ${miss.join(',')} treasure ${tmiss.join(',')}`);
  }
  // distances deploy -> enemies
  const md = Math.min(...b.units.filter((u) => u.team === 1 && !u.hidden).map((u) => Math.min(...deploy.map((d) => Math.abs(d[0] - u.at[0]) + Math.abs(d[1] - u.at[1])))));
  out.push(`battle ${b.id}: min deploy->enemy manhattan ${md}`);
}
let lines = 0;
function walk(cmds: SceneCmd[], sid: string, map: string | undefined) {
  let g = map ? grids.get(map) : undefined;
  for (const c of cmds) {
    if (c[0] === 'map') g = grids.get(c[1]);
    if (c[0] === 'say') { lines++; if (c[2].length > 180) out.push(`scene ${sid}: long line ${c[2].length}: ${c[2].slice(0, 50)}`); }
    if ((c[0] === 'actor' || c[0] === 'move') && g) {
      const x = c[0] === 'actor' ? c[3] : c[2], z = c[0] === 'actor' ? c[4] : c[3];
      const cell = g.cell(x as number, z as number);
      if (!cell || !cell.standable) out.push(`scene ${sid}: ${c[0]} ${c[1]} at ${x},${z} not standable`);
    }
    if (c[0] === 'choice') for (const [, sub] of c[2]) walk(sub, sid, undefined);
    if (c[0] === 'if') { walk(c[2], sid, undefined); if (c[3]) walk(c[3], sid, undefined); }
  }
}
for (const s of scenes) walk(s.cmds, s.id, s.map);
for (const b of battles) for (const e of b.events ?? []) walk(e.script, b.id, undefined);
out.push(`dialogue lines: ${lines}`);
console.log(out.join('\n'));
