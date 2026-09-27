import { h } from './dom';

/** Kept outside #ui so scenes and world-map overlays cannot remove the controls. */
export function gameToolbar(): HTMLElement {
  let bar = document.getElementById('game-controls');
  if (!bar) {
    bar = h('div.game-toolbar', { id: 'game-controls', role: 'toolbar', 'aria-label': 'Game controls' });
    document.body.appendChild(bar);
  }
  return bar;
}

export function syncGameToolbar() {
  const visible = !!gameToolbar().querySelector('button:not([hidden])');
  document.documentElement.classList.toggle('game-controls-visible', visible);
}

const noClickFocus = (e: MouseEvent) => e.preventDefault();

export function addGameControl(button: HTMLElement): () => void {
  // a mouse click must not leave focus here, or the next Enter/Space would press it again
  // instead of reaching the game (keyboard Tab focus still works); re-adding is a no-op
  button.addEventListener('mousedown', noClickFocus);
  gameToolbar().appendChild(button);
  syncGameToolbar();
  return () => {
    button.remove();
    syncGameToolbar();
  };
}
