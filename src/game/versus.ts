// Hot-seat versus: two players on one device, taking turns. Player 1 leads the blue company, Player 2
// the red one, on a Trial's field; a hand-over screen comes up whenever the controller changes hands.
// From the title menu (Versus); Rematch plays the same field again.
import type { Game } from './game';
import type { BattleDef, UnitSpawn } from '../data/types';
import type { BattleUnit } from '../battle/unit';
import { TRIALS } from '../data/battles/trials';
import { presetBattle, type PresetBattle } from './trial';
import { BattleController } from '../scenes/battleController';
import { audio } from '../audio/audio';
import { input } from '../ui/input';
import { h, uiRoot } from '../ui/dom';
import { menu, titleCard } from '../ui/widgets';
import { setGameMenuVisible } from '../ui/gameMenu';
import { dir, t, tParts, type Part } from '../i18n';

/** Player 2's company: the field's company again (a fair mirror), on the foes' side, with names of its own. */
const RIVALS = ['Roderick', 'Tamsin', 'Hal', 'Brigid'];
/** The colours of the two sides, as their units' rings show them. */
const SIDES = [{ colour: '#3b82f6' }, { colour: '#e8443a' }];

export function versusPreset(field: number): PresetBattle {
  const trial = TRIALS[field % TRIALS.length];
  const company = trial.company;
  const spots = trial.battle.units.map((u) => u.at);
  const rivals: UnitSpawn[] = company.map((sp, i) => ({
    ...sp, id: `p2_${i}`, team: 1, name: RIVALS[i % RIVALS.length], at: spots[i % spots.length], facing: trial.battle.units[i % spots.length].facing,
  }));
  const battle: BattleDef = { id: `versus_${trial.battle.id}`, name: trial.battle.name, map: trial.battle.map, music: 'battle1', time: trial.battle.time, units: rivals, victory: { type: 'defeatAll' }, deploy: company.map((c) => c.at) };
  return { battle, company: company.map((sp, i) => ({ ...sp, id: `p1_${i}` })), items: trial.items };
}

/** The versus menu: pick a field, play, then Rematch or Exit. */
export async function runVersus(game: Game): Promise<void> {
  setGameMenuVisible(true);
  const field = await pickField();
  if (field === null) return;
  for (let round = 0; ; round++) {
    const winner = await versusBattle(game, field, round);
    const again = await menu({
      items: [{ label: t('versus.rematch'), value: 'again' }, { label: t('versus.exit'), value: 'exit' }],
      x: '50%', y: '62%', title: t('versus.winner', { player: winner + 1 }), cancelable: false,
    }).promise;
    clearCard();
    if (again !== 'again') return;
  }
}

async function pickField(): Promise<number | null> {
  const pick = await menu({
    items: [...TRIALS.map((tr, i) => ({ label: tr.battle.name, value: String(i) })), { label: t('common.back'), value: 'back' }],
    x: '50%', y: '40%', title: t('versus.field'), className: 'title-menu',
  }).promise;
  return pick === null || pick === 'back' ? null : Number(pick);
}

/** One battle: 0 when Player 1 wins, 1 when Player 2 does. */
async function versusBattle(game: Game, field: number, round: number): Promise<0 | 1> {
  const preset = versusPreset(field);
  const def = preset.battle;
  const stage = await game.makeStage(def.map, { time: def.time, weather: def.weather });
  const { setup } = presetBattle(preset, 1000 + field * 97 + round * 7919);
  const b = setup.battle;
  // both sides are played by people
  for (const u of b.units) u.controlled = true;
  for (const u of b.units) game.addBattleView(stage, u);
  audio.playMusic(def.music ?? 'battle1', { fade: 1.2 });
  await game.present();
  await titleCard(def.name, t('versus.subtitle'), 1800);
  let side: 0 | 1 | null = null;
  const ctrl = new BattleController(stage, b, {
    runScript: async (index) => { b.scriptDone(index); },
    human: (u: BattleUnit) => u.controlled,
    beforeHumanTurn: async (u: BattleUnit) => {
      const next = u.baseTeam === 0 ? 0 : 1;
      if (next === side) return;
      side = next;
      await handOver(next);
    },
  });
  const result = await ctrl.run();
  ctrl.dispose();
  const winner: 0 | 1 = result === 'victory' ? 0 : 1;
  audio.playMusic('victory', { fade: 0.3, loop: false } as never);
  for (const u of b.units) { const v = stage.views.get(u.uid); if (v && u.alive && (u.baseTeam === 0) === (winner === 0)) v.anim.setBase('victory'); }
  showCard(t('versus.winner', { player: winner + 1 }), SIDES[winner].colour);
  return winner;
}

let card: HTMLElement | null = null;
function clearCard() { card?.remove(); card = null; }
function showCard(text: string, colour: string) {
  clearCard();
  card = h('div.versus-card', { dir, style: { position: 'absolute', left: '0', right: '0', top: '22%', textAlign: 'center', pointerEvents: 'none', fontFamily: 'Cinzel, serif', fontWeight: '700', fontSize: 'min(9vw, 64px)', color: colour, textShadow: '0 3px 12px #000, 0 0 30px rgba(0,0,0,.7)' } }, text);
  uiRoot().appendChild(card);
}

const kbd = (parts: Part[]) => parts.map((p) => (typeof p === 'string' ? p : h('kbd', null, input.label(p.key))));

/** Whose turn it is: the next player takes the controller and confirms. */
function handOver(player: 0 | 1): Promise<void> {
  return new Promise((resolve) => {
    audio.sfx('turn');
    const go = h('button.btn', { type: 'button' }, t('versus.handover.ready')) as HTMLButtonElement;
    const panel = h('div.panel.versus-handover', {
      dir, role: 'dialog', 'aria-modal': 'true',
      style: { position: 'fixed', inset: '0', zIndex: '60', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', background: 'rgba(7,6,10,.88)', textAlign: 'center', padding: '16px' },
    },
      h('div', { style: { fontFamily: 'Cinzel, serif', fontWeight: '700', fontSize: 'min(9vw, 56px)', color: SIDES[player].colour } }, t('versus.handover.title', { player: player + 1 })),
      h('p', { style: { maxWidth: '30em', fontSize: 'min(4.5vw, 20px)' } }, ...kbd(tParts('versus.handover.text', { player: player + 1 }))),
      go,
    );
    uiRoot().appendChild(panel);
    const done = () => { pop(); panel.remove(); resolve(); };
    go.addEventListener('click', done);
    // every key and button the next player might press goes to the hand-over, never to the battle
    const pop = input.push((a) => { if (a === 'confirm') done(); return true; });
    setTimeout(() => go.focus(), 0);
  });
}
