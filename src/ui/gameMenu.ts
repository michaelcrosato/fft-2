import { gameClock } from '../core/gameClock';
import type { Game } from '../game/game';
import { dir, t } from '../i18n';
import { h } from './dom';
import { fullscreenLabel, gameMode, toggleFullscreen } from './gameMode';
import { addGameControl, gameToolbar, syncGameToolbar } from './gameToolbar';
import { input } from './input';
import { inSession } from './hub';
import { openOptions } from './menus/system';

let menuButton: HTMLButtonElement | null = null;
let contextMenu: (() => boolean) | null = null;

export function setGameMenuVisible(visible: boolean) {
  if (menuButton) menuButton.hidden = !visible;
  syncGameToolbar();
}

/** The map keeps its party/save/load menu; busy scenes fall back to the system menu. */
export function setContextMenu(open: () => boolean): () => void {
  contextMenu = open;
  return () => {
    if (contextMenu === open) contextMenu = null;
  };
}

export function installGameMenu(game: Game) {
  let dialog: HTMLDialogElement | null = null;
  let back: (() => void) | null = null;
  menuButton = h(
    'button.btn.game-menu-button',
    {
      type: 'button',
      'aria-label': t('gamemenu.heading'),
      onclick: () => {
        if (dialog) {
          back?.();
          return;
        }
        if (!contextMenu?.()) open();
      },
    },
    t('gamemenu.button'),
  ) as HTMLButtonElement;
  const button = menuButton;
  addGameControl(button);
  // the Menu key/button works like the ☰ button wherever it is shown; cutscenes keep it for Skip
  input.menuShortcut = () => {
    if (button.hidden || !button.isConnected || document.querySelector('.skipbtn')) return false;
    button.click();
    return true;
  };

  function open() {
    const shell = h('dialog.game-menu-shell', { 'aria-label': t('gamemenu.heading'), tabindex: '-1' }) as HTMLDialogElement;
    shell.dir = dir;
    dialog = shell;
    const resume = gameClock.pause();
    document.documentElement.classList.add('game-paused');
    const bar = gameToolbar();
    const view = h('div.panel.game-menu-home');
    shell.append(view, bar);
    document.body.appendChild(shell);
    let childOpen = false;
    let confirming = false;
    let closed = false;
    let fullscreen: HTMLButtonElement | null = null;
    const offMode = gameMode.onChange(() => { if (fullscreen) fullscreen.textContent = fullscreenLabel(); });
    const close = () => {
      if (closed) return;
      closed = true;
      pop();
      offMode();
      document.body.appendChild(bar);
      shell.close();
      shell.remove();
      dialog = null;
      back = null;
      button.textContent = t('gamemenu.button');
      button.setAttribute('aria-label', t('gamemenu.heading'));
      // Do not leave a focused toolbar button capturing Enter from gameplay.
      button.blur();
      document.documentElement.classList.remove('game-paused');
      resume();
    };
    back = () => {
      if (childOpen) input.dispatch('cancel');
      else if (confirming) home();
      else close();
    };
    const action = (label: string, run: () => void) => h('button.btn', { type: 'button', onclick: run }, label);
    const focusFirst = () => view.querySelector<HTMLButtonElement>('button')?.focus();
    const submenu = async (show: (parent: HTMLElement) => Promise<void>) => {
      if (childOpen) return;
      childOpen = true;
      view.hidden = true;
      button.textContent = t('gamemenu.button_back');
      button.setAttribute('aria-label', t('common.back'));
      shell.focus();
      try {
        await show(shell);
      } finally {
        childOpen = false;
        view.hidden = false;
        button.textContent = t('gamemenu.button_resume');
        button.setAttribute('aria-label', t('gamemenu.resume'));
        focusFirst();
      }
    };
    const quit = () => {
      confirming = true;
      button.textContent = t('gamemenu.button_back');
      button.setAttribute('aria-label', t('common.back'));
      view.replaceChildren(
        h('h2', null, t('gamemenu.quit_question')),
        h('p', null, t('gamemenu.quit_warning')),
        action(t('gamemenu.keep_playing'), home),
        action(t('gamemenu.return_to_title'), () => {
          gameMode.exit();
          // A fresh title cleanly cancels every pending battle/cutscene task without saving a partial turn.
          const destination = new URL(location.href);
          for (const key of ['test', 'auto', 'autoplay', 'quickwin']) destination.searchParams.delete(key);
          location.replace(destination.pathname + destination.search);
        }),
      );
      focusFirst();
    };
    function home() {
      confirming = false;
      fullscreen = action(fullscreenLabel(), toggleFullscreen) as HTMLButtonElement;
      button.textContent = t('gamemenu.button_resume');
      button.setAttribute('aria-label', t('gamemenu.resume'));
      view.replaceChildren(
        h('h2', null, t('gamemenu.heading')),
        h('p.muted', null, t('gamemenu.paused')),
        action(t('gamemenu.resume'), close),
        fullscreen,
        action(t('gamemenu.options'), () => {
          void submenu((parent) => openOptions(game, parent));
        }),
        action(t('gamemenu.how_to_play'), () => {
          void submenu(async (parent) => {
            const { openHelp } = await import('./menus/help');
            await openHelp(parent);
          });
        }),
        // in a 52in1 session the hub starts and ends rounds: nothing to quit to
        ...(inSession() ? [] : [action(t('gamemenu.return_to_title'), quit)]),
      );
      focusFirst();
    }
    const pop = input.push((a) => {
      if (childOpen) return true;
      if (a === 'cancel' || a === 'menu') {
        back?.();
        return true;
      }
      const buttons = [...view.querySelectorAll<HTMLButtonElement>('button')];
      const selected = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (['up', 'down', 'left', 'right'].includes(a)) {
        const step = a === 'up' || a === 'left' ? -1 : 1;
        buttons[(selected + step + buttons.length) % buttons.length]?.focus();
      }
      if (a === 'confirm') (buttons[selected] ?? buttons[0])?.click();
      return true;
    }, true);
    shell.addEventListener('cancel', (e) => {
      e.preventDefault();
      back?.();
    });
    shell.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') e.stopPropagation();
      if (e.key === 'Escape') e.preventDefault(); // the input layer backs out once, not again via native cancel
    });
    home();
    shell.showModal();
    focusFirst();
  }
}
