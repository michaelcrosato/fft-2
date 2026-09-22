// "How to Play" — rules primer & controls.
import { menu } from '../widgets';
import { h } from '../dom';
import { overlay } from './common';

const TOPICS: Array<[string, string]> = [
  ['Controls', `Keyboard: arrows/WASD move the cursor, Enter/Space confirm, Esc/Backspace go back. Q/E rotate the camera, R toggles a high angle, +/- zoom, Tab shows the turn order, Shift fast-forwards animations and text.

Mouse: hover a tile to inspect it, click to confirm, right-click to go back, drag to orbit the camera (it snaps to the nearest corner), wheel to zoom.

Touch: tap a tile to select it and tap again to confirm. Drag with one finger to orbit, pinch to zoom. All menus are tappable.

Gamepad: D-pad/stick to move, A confirm, B back, Y menu, X info, LB/RB rotate, LT/RT zoom.`],
  ['Turns & CT', `Every unit has a Charge Time (CT) gauge. Each clocktick it fills by the unit's Speed; at 100 the unit acts.

On your turn you may Move and Act once each, in either order, then choose a facing. Moving and acting costs the full 100 CT; doing only one leaves 20 CT in reserve, and simply Waiting leaves 40 — so waiting brings your next turn sooner.

Spells and some arts must charge before they resolve. The Turn Order list (Tab) shows when charged actions will land — a slow spell aimed at a quick foe may strike empty ground.`],
  ['Height & Facing', `Terrain height matters. A unit can climb or drop as many steps as its Jump, and can leap small gaps. Archers shoot farther from high ground.

Units can evade attacks that come from the front; shields also guard the flanks. From behind, only accessories help. Strike from the side or back, and end your turns facing danger.`],
  ['Brave & Faith', `Brave governs how often reaction abilities trigger and how hard bare fists and knight's swords hit. A unit whose Brave falls below 10 turns chicken.

Faith sets the power of magic — both the spells a unit casts and the spells it suffers. High Faith makes a fine healer and a fragile target.

Speechcraft can raise or lower both. A quarter of any change made in battle becomes permanent.`],
  ['The Zodiac', `Everyone is born under one of the twelve signs. Signs a triangle apart are Good together (+25%); signs a square apart are Bad (−25%). Opposite signs are Best (+50%) between a man and a woman, Worst (−50%) between two of the same sex. Monsters count as neither.

Compatibility affects damage, healing and the success of most abilities. It is shown on a target's card.`],
  ['Jobs & JP', `Every action earns Job Points in the unit's current job, and a quarter of that spills over to allies in the same job. Spend JP in Formation → Learn Abilities.

Job levels unlock new jobs: Squire and Chemist lead to Knight, Archer, Cleric and Wizard, and on through twenty classes. Each unit carries its job's skillset, one secondary skillset, and one reaction, support and movement ability learned in any job.`],
  ['Falling in Battle', `A unit reduced to 0 HP collapses; a counter above them counts down three of their turns. Revive them before it runs out, or they become a crystal (or leave a chest) and are lost forever.

Stepping onto an enemy's crystal teaches you the abilities they knew. Gentle mode (Options) lets fallen allies retreat instead of crystallizing.`],
  ['Towns & Travel', `Travel along roads on the world map; each stop is a day. Green sites may hold wandering foes. Towns offer an Outfitter, a Soldier Office for recruits, and a Tavern with rumours and errands.

Errands send idle soldiers away for some days in exchange for gil, JP and discoveries recorded in the Chronicle. Poach monsters with the Poach support to stock the Fur Shop.`],
  ['Monsters', `Monsters can be recruited with the Orator's Invite (they need Beast Speech to understand you). Monsters in your company sometimes lay eggs after a victory. They cannot change jobs or equipment, but they learn their secret techniques as they grow.`],
];

export async function openHelp() {
  const ov = overlay('How to Play');
  let body = null as HTMLElement | null;
  const show = (i: number) => {
    body?.remove();
    const [title, text] = TOPICS[i];
    body = h('div.panel', { style: { right: '16px', top: '64px', width: 'min(620px, 60vw)', maxHeight: '78vh', overflowY: 'auto' } }, h('div.title-plate', null, title), h('div', { style: { whiteSpace: 'pre-wrap', lineHeight: '1.55', marginTop: '6px' } }, text));
    ov.root.appendChild(body);
  };
  try {
    await menu({ items: TOPICS.map(([t], i) => ({ label: t, value: i })), x: 16, y: 64, title: 'Topics', parent: ov.root, onHover: (i) => show(i as number) }).promise;
  } finally { body?.remove(); ov.close(); }
}
